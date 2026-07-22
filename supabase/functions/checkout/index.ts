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

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Missing Supabase environment variables')
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey)

    // 1. DB Write
    // Note: We use the admin client to ensure we have permission to trigger order_seq logic
    const { data: order, error: orderError } = await supabaseAdmin
      .from('orders')
      .insert({
        customer_name: details.name,
        phone: details.phone,
        email: details.email,
        promo_code: details.promoCode || null,
        total_price: details.totalPrice,
        order_type: details.orderType || 'Dine In',
        status: 'pending'
      })
      .select().single()

    if (orderError) {
      console.error('[DB Error] Order Insert Failed:', orderError)
      throw new Error(`Database error: ${orderError.message}`)
    }

    const orderItems = items.map((item: any) => ({
      order_id: order.id,
      product_id: item.id,
      quantity: item.quantity,
      unit_price: item.price,
      customizations: item.customizations || {}
    }))
    await supabaseAdmin.from('order_items').insert(orderItems)

    // 2. PCO Sync (Background)
    let pcoResult: any = { status: 'skipped' }
    if (details.survey) {
      pcoResult = { status: 'background_sync_initiated' }
      const pcoSyncTask = async () => {
        try {
          const appId = Deno.env.get('PCO_APP_ID')
          const secret = Deno.env.get('PCO_SECRET')
          if (!appId || !secret) {
            console.error('[PCO] Missing PCO credentials')
            return
          }
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

          // 0. Determine Name and Phone (Prioritize Newcomer Data)
          let nameToSync = details.name
          const trimmedNewcomerName = details.survey?.newcomerName?.trim()
          if (trimmedNewcomerName) {
            nameToSync = trimmedNewcomerName
          }

          let phoneToSync = details.phone
          if (details.survey?.newcomerPhone) {
            let cleanNewcomer = details.survey.newcomerPhone.replace(/\D/g, '')
            if (cleanNewcomer.startsWith('01')) {
              cleanNewcomer = '60' + cleanNewcomer.substring(1)
            } else if (cleanNewcomer.startsWith('1') && !cleanNewcomer.startsWith('601')) {
              cleanNewcomer = '60' + cleanNewcomer
            }
            phoneToSync = cleanNewcomer
          }

          // --- Step A: Search ---
          const search = await pcoFetch(`/people?where[search_name_or_email]=${encodeURIComponent(details.email)}&include=field_data`)
          let personId = search.data?.[0]?.id
          const existingFields = search.included || []
          
          if (!personId) {
            // --- Step B: Create ---
            const create = await pcoFetch('/people', 'POST', {
              data: {
                type: 'Person',
                attributes: {
                  first_name: nameToSync.trim().split(/\s+/)[0],
                  last_name: nameToSync.trim().split(/\s+/).slice(1).join(' ') || 'Newcomer'
                }
              }
            })
            personId = create.data.id
            
            await pcoFetch(`/people/${personId}/emails`, 'POST', {
              data: { type: 'Email', attributes: { address: details.email, location: 'Home' } }
            }).catch(e => console.error('[PCO WARN] Email add failed:', e.message))
          }

          // --- Step B.5: Add Phone ---
          if (phoneToSync) {
            await pcoFetch(`/people/${personId}/phone_numbers`, 'POST', {
              data: {
                type: 'PhoneNumber',
                attributes: { number: phoneToSync, location: 'Mobile' }
              }
            }).catch(e => console.error('[PCO WARN] Phone add failed (possibly exists):', e.message))
          }

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
              }).catch(e => console.error(`[PCO ERROR] Field PATCH ${f.name} failed:`, e.message))
            } else {
              await pcoFetch(`/people/${personId}/field_data`, 'POST', {
                data: {
                  type: 'FieldData',
                  attributes: { value: f.value },
                  relationships: { field_definition: { data: { type: 'FieldDefinition', id: f.id } } }
                }
              }).catch(e => console.error(`[PCO ERROR] Field POST ${f.name} failed:`, e.message))
            }
          }

          // --- Step D: Note ---
          const noteContent = [
            'COFFEE SHOP SURVEY RESULTS',
            '--------------------------',
            `Checkout Name: ${details.name || 'N/A'}`,
            `Survey Name: ${details.survey.newcomerName || 'N/A'}`,
            `Invited By: ${details.survey.invitedBy || 'N/A'}`,
            `Phone Used: ${phoneToSync || 'N/A'}`,
            `Looking for Church: ${details.survey.lookingForChurch ? 'Yes' : 'No'}`,
            `Interested in Jesus: ${details.survey.knowMoreAboutJesus ? 'Yes' : 'No'}`
          ].join('\n')

          const categoryId = Deno.env.get('PCO_NOTE_CATEGORY_ID') || '10763'

          const notePayload: any = {
            data: {
              type: 'Note',
              attributes: { 
                note: noteContent,
                note_category_id: parseInt(categoryId) 
              }
            }
          }

          await pcoFetch(`/people/${personId}/notes`, 'POST', notePayload)
            .catch(e => console.error('[PCO ERROR] Note creation failed:', e.message))

        } catch (err: any) {
          console.error('[PCO ERROR] Sync failed:', err.message)
        }
      }

      // Run asynchronously using EdgeRuntime if available, else fire and forget
      if (typeof EdgeRuntime !== 'undefined' && typeof EdgeRuntime.waitUntil === 'function') {
        EdgeRuntime.waitUntil(pcoSyncTask())
      } else {
        pcoSyncTask()
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
