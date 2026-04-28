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

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    const body = await req.json()
    const { details, items } = body

    const supabaseAdmin = createClient(supabaseUrl!, supabaseServiceKey!)

    // 1. DB Write
    const { data: order, error: orderError } = await supabaseAdmin
      .from('orders')
      .insert({
        customer_name: details.name,
        phone: details.phone,
        email: details.email,
        promo_code: details.promoCode,
        total_price: details.totalPrice,
        order_type: details.orderType || 'Dine In', // New Field
        status: 'pending'
      })
      .select().single()

    if (orderError) throw orderError

    const orderItems = items.map((item: any) => ({
      order_id: order.id,
      product_id: item.id,
      quantity: item.quantity,
      unit_price: item.price,
      customizations: item.customizations || {}
    }))
    await supabaseAdmin.from('order_items').insert(orderItems)

    // 2. PCO Sync (Verbose)
    const pcoResult = { success: false, personId: null, error: null, steps: [] as string[] }
    
    if (details.survey) {
      try {
        const appId = Deno.env.get('PCO_APP_ID')
        const secret = Deno.env.get('PCO_SECRET')
        const auth = btoa(`${appId}:${secret}`)
        const PCO_BASE = 'https://api.planningcenteronline.com/people/v2'

        const pcoFetch = async (url: string, method = 'GET', body?: any) => {
          const res = await fetch(`${PCO_BASE}${url}`, {
            method,
            headers: {
              'Authorization': `Basic ${auth}`,
              'Content-Type': 'application/vnd.api+json'
            },
            body: body ? JSON.stringify(body) : undefined
          })
          const text = await res.text()
          if (!res.ok) throw new Error(`PCO API ${res.status}: ${text}`)
          return JSON.parse(text)
        }

        // --- Step A: Search ---
        const search = await pcoFetch(`/people?where[search_name_or_email]=${encodeURIComponent(details.email)}&include=field_data`)
        let personId = search.data?.[0]?.id
        const existingFields = search.included || []
        
        if (personId) {
          pcoResult.steps.push(`Found existing person: ${personId}`)
        } else {
          // --- Step B: Create ---
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
          pcoResult.steps.push(`Created new person: ${personId}`)
          
          await pcoFetch(`/people/${personId}/emails`, 'POST', {
            data: { type: 'Email', attributes: { address: details.email, location: 'Home' } }
          })
        }
        
        pcoResult.personId = personId

        // --- Step C: Fields ---
        const fieldMapping = [
          { id: Deno.env.get('PCO_FIELD_INVITED_BY'), value: details.survey.invitedBy, name: 'Invited By' },
          { id: Deno.env.get('PCO_FIELD_LOOKING_FOR_CHURCH'), value: String(!!details.survey.lookingForChurch), name: 'Church' },
          { id: Deno.env.get('PCO_FIELD_INTERESTED_IN_JESUS'), value: String(!!details.survey.knowMoreAboutJesus), name: 'Jesus' }
        ]

        for (const f of fieldMapping) {
          if (!f.id || f.value === undefined || f.value === '') continue
          
          const existing = existingFields.find((e: any) => 
            e.type === 'FieldDatum' && e.relationships?.field_definition?.data?.id === f.id
          )

          if (existing) {
            await pcoFetch(`/field_data/${existing.id}`, 'PATCH', {
              data: { type: 'FieldData', id: existing.id, attributes: { value: f.value } }
            })
            pcoResult.steps.push(`Updated field ${f.name}`)
          } else {
            await pcoFetch(`/people/${personId}/field_data`, 'POST', {
              data: {
                type: 'FieldData',
                attributes: { value: f.value },
                relationships: { field_definition: { data: { type: 'FieldDefinition', id: f.id } } }
              }
            })
            pcoResult.steps.push(`Created field ${f.name}`)
          }
        }

        // --- Step D: Note ---
        await pcoFetch(`/people/${personId}/notes`, 'POST', {
          data: {
            type: 'Note',
            attributes: { 
              note: 'Coffee Shop Newcomer Survey',
              note_category_id: parseInt(Deno.env.get('PCO_NOTE_CATEGORY_ID') || '10763')
            }
          }
        })
        pcoResult.steps.push('Note created')
        pcoResult.success = true

      } catch (err) {
        pcoResult.error = err.message
      }
    }

    return new Response(
      JSON.stringify({ success: true, order, pco: pcoResult }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    )

  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { headers: corsHeaders, status: 500 })
  }
})
