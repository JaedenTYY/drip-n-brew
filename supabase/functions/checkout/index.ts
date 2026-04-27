import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.42.0"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  console.log('[Checkout] Request received')

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Missing Supabase environment variables')
    }

    const body = await req.json()
    const { details, items } = body

    if (!details || !items) {
      throw new Error('Missing details or items in request body')
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey)

    // --- PART 1: DB WRITE ---
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

    // --- PART 2: PCO SYNC & GMAIL (Handled Safely) ---
    const integrationStatus = { pco: { success: false, error: null }, email: { success: false, error: null } }

    try {
      if (details.survey) {
        console.log('[Checkout] Starting PCO Sync...')
        await syncWithPCO(details)
        integrationStatus.pco.success = true
      }
    } catch (err) {
      console.error('[PCO Error]', err.message)
      integrationStatus.pco.error = err.message
    }

    // Email is currently problematic with SMTP on Deno 2.0. 
    // We log it and let the order succeed.
    console.log('[Checkout] Order processing complete.')

    return new Response(
      JSON.stringify({ success: true, order, debug: integrationStatus }),
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
  const noteCategoryId = Deno.env.get('PCO_NOTE_CATEGORY_ID') || '10763'
  
  if (!appId || !secret) throw new Error('Missing PCO Credentials')

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

  // 4. Update Custom Fields
  const fieldMapping = [
    { id: Deno.env.get('PCO_FIELD_INVITED_BY'), value: details.survey.invitedBy, type: 'string' },
    { id: Deno.env.get('PCO_FIELD_LOOKING_FOR_CHURCH'), value: details.survey.lookingForChurch, type: 'boolean' },
    { id: Deno.env.get('PCO_FIELD_INTERESTED_IN_JESUS'), value: details.survey.knowMoreAboutJesus, type: 'boolean' }
  ]

  for (const f of fieldMapping) {
    if (!f.id || f.value === undefined || f.value === '') continue
    const val = f.type === 'boolean' ? String(!!f.value) : String(f.value)
    
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

  // 5. Create Note (Strict JSON:API)
  await pcoFetch(`/people/${personId}/notes`, 'POST', {
    data: {
      type: 'Note',
      attributes: { note: 'Drip & Brew Newcomer Survey Submitted' },
      relationships: {
        note_category: {
          data: { type: 'NoteCategory', id: noteCategoryId }
        }
      }
    }
  })
}
