import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.42.0"
import { SmtpClient } from "https://deno.land/x/smtp@v0.7.0/mod.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // 1. Handle CORS Preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { details, items } = await req.json()

    // Initialize Supabase Admin Client using service_role key
    // This allows the function to write to the DB bypassing RLS
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // --- PART 1: SUPABASE DATABASE WRITE ---
    const { data: order, error: orderError } = await supabaseAdmin
      .from('orders')
      .insert({
        customer_name: details.name,
        phone: details.phone,
        email: details.email,
        promo_code: details.promoCode,
        total_price: details.totalPrice,
        status: 'pending'
      })
      .select().single()

    if (orderError) throw new Error(`DB Order Error: ${orderError.message}`)

    const orderItems = items.map((item: any) => ({
      order_id: order.id,
      product_id: item.id,
      quantity: item.quantity,
      unit_price: item.price,
      customizations: item.customizations || {}
    }))

    const { error: itemsError } = await supabaseAdmin.from('order_items').insert(orderItems)
    if (itemsError) throw new Error(`DB Items Error: ${itemsError.message}`)

    // --- PART 2: PCO SYNC & GMAIL (Async Background) ---
    // We execute these and catch errors internally so they don't block the order completion
    try {
      if (details.survey) {
        await syncWithPCO(details)
      }
      await sendGmail(details, items, order.id)
    } catch (integrationErr) {
      console.error('[Integration Error] PCO or Email failed:', integrationErr.message)
      // Non-fatal: the order is already saved in the DB
    }

    return new Response(
      JSON.stringify({ success: true, order }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    )

  } catch (err) {
    console.error('[Fatal Error]', err.message)
    return new Response(
      JSON.stringify({ error: err.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    )
  }
})

async function syncWithPCO(details: any) {
  const appId = Deno.env.get('PCO_APP_ID')
  const secret = Deno.env.get('PCO_SECRET')
  const auth = btoa(`${appId}:${secret}`)
  const PCO_BASE = 'https://api.planningcenteronline.com/people/v2'

  const pcoFetch = async (url: string, method = 'GET', body?: any) => {
    const res = await fetch(`${PCO_BASE}${url}`, {
      method,
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/vnd.api+json',
        'Accept': 'application/vnd.api+json'
      },
      body: body ? JSON.stringify(body) : undefined
    })
    const text = await res.text()
    if (!res.ok) throw new Error(`PCO API ${res.status}: ${text}`)
    return JSON.parse(text)
  }

  // 1. Search Person
  const search = await pcoFetch(`/people?where[email]=${encodeURIComponent(details.email)}&include=field_data`)
  let personId = search.data?.[0]?.id
  const existingFields = search.included || []

  if (!personId) {
    // 2. Create Person
    const create = await pcoFetch('/people', 'POST', {
      data: {
        type: 'Person',
        attributes: {
          first_name: details.name.split(' ')[0],
          last_name: details.name.split(' ').slice(1).join(' ') || 'Newcomer'
        }
      }
    })
    personId = create.data.id
    
    // 3. Add Email
    await pcoFetch(`/people/${personId}/emails`, 'POST', {
      data: { type: 'Email', attributes: { address: details.email, location: 'Home' } }
    })
  }

  // 4. Update Custom Fields (Selection/Boolean handling)
  const fields = [
    { id: Deno.env.get('PCO_FIELD_INVITED_BY'), value: details.survey.invitedBy, type: 'text' },
    { id: Deno.env.get('PCO_FIELD_LOOKING_FOR_CHURCH'), value: !!details.survey.lookingForChurch, type: 'bool' },
    { id: Deno.env.get('PCO_FIELD_INTERESTED_IN_JESUS'), value: !!details.survey.knowMoreAboutJesus, type: 'bool' }
  ]

  for (const f of fields) {
    if (!f.id || f.value === undefined || f.value === '') continue
    const val = f.type === 'bool' ? String(f.value) : String(f.value)
    
    const existing = existingFields.find((e: any) => 
      e.type === 'FieldDatum' && e.relationships?.field_definition?.data?.id === f.id
    )

    if (existing) {
      await pcoFetch(`/field_data/${existing.id}`, 'PATCH', {
        data: { type: 'FieldData', id: existing.id, attributes: { value: val } }
      })
    } else {
      await pcoFetch(`/people/${personId}/field_data`, 'POST', {
        data: {
          type: 'FieldData',
          attributes: { value: val },
          relationships: { field_definition: { data: { type: 'FieldDefinition', id: f.id } } }
        }
      })
    }
  }

  // 5. Create Note with required Category
  await pcoFetch(`/people/${personId}/notes`, 'POST', {
    data: {
      type: 'Note',
      attributes: { note: 'Drip & Brew Newcomer Survey Submitted' },
      relationships: {
        note_category: { data: { type: 'NoteCategory', id: Deno.env.get('PCO_NOTE_CATEGORY_ID') } }
      }
    }
  })
}

async function sendGmail(details: any, items: any, orderId: string) {
  const user = Deno.env.get('GMAIL_USER')
  const pass = Deno.env.get('GMAIL_APP_PASSWORD')
  if (!user || !pass) return

  const client = new SmtpClient()
  await client.connectTLS({
    hostname: "smtp.gmail.com",
    port: 465,
    username: user,
    password: pass,
  })

  // Basic HTML item summary
  const itemsHtml = items.map((i: any) => `<li>${i.quantity}x ${i.name}</li>`).join('')

  await client.send({
    from: user,
    to: details.email,
    subject: `Order Ready! [${orderId}]`,
    content: `Hi ${details.name}, your order ${orderId} is confirmed.`,
    html: `
      <div style="font-family: sans-serif; max-width: 500px; margin: auto;">
        <h1 style="color: #ea580c;">Drip & Brew Order Confirmed!</h1>
        <p>Hi <strong>${details.name}</strong>,</p>
        <p>Your handcrafted order is being prepared by our baristas.</p>
        <div style="background: #f8fafc; padding: 20px; border-radius: 12px; margin: 20px 0;">
          <h3 style="margin-top: 0;">Order Summary</h3>
          <ul>${itemsHtml}</ul>
          <p style="margin-bottom: 0;"><strong>Total: RM${details.totalPrice.toFixed(2)}</strong></p>
        </div>
        <p style="font-size: 12px; color: #94a3b8;">Order Ref: ${orderId}</p>
      </div>
    `,
  })
  await client.close()
}
