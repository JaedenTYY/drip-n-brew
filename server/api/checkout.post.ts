import { defineEventHandler, readBody, createError } from 'h3'
import { createClient } from '@supabase/supabase-js'
import type { Database } from '~/types/supabase'

/**
 * Server-side checkout handler.
 * Orchestrates Supabase order creation and PCO integration.
 */
export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  const body = await readBody(event)
  const { details, items } = body

  console.log('[Checkout API] Received order request', { customer: details.email })

  // 1. Initialize Supabase Admin/Server Client
  // Note: We use the public key here as we are just proxying, 
  // but in a production environment with RLS, you'd use a service_role key.
  const supabase = createClient<Database>(
    config.public.supabaseUrl,
    config.public.supabaseKey
  )

  try {
    // 2. Create the Order in Supabase
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .insert({
        customer_name: details.name,
        phone: details.phone,
        email: details.email,
        promo_code: details.promoCode,
        total_price: details.totalPrice,
        status: 'pending'
      })
      .select()
      .single()

    if (orderError) throw orderError

    // 3. Create Order Items
    const orderItems = items.map((item: any) => ({
      order_id: order.id,
      product_id: item.id,
      quantity: item.quantity,
      unit_price: item.price,
      customizations: item.customizations || {}
    }))

    const { error: itemsError } = await supabase
      .from('order_items')
      .insert(orderItems)

    if (itemsError) throw itemsError

    // 4. PCO Integration (Handled as a Background Task)
    if (details.survey) {
      // event.waitUntil is the enterprise standard for Nuxt/Nitro background tasks.
      // It ensures the cloud provider (Vercel/Netlify) doesn't kill the function 
      // before the PCO sync completes, even after the response is sent to the user.
      event.waitUntil(
        syncWithPlanningCenter(details, config).catch(err => {
          console.error('[PCO Sync Error] Background sync failed:', err.stack || err.message)
        })
      )
    }

    return {
      success: true,
      order
    }

  } catch (err: any) {
    console.error('[Checkout API] Fatal Error:', err.stack || err.message)
    throw createError({
      statusCode: 500,
      statusMessage: err.message || 'Internal Server Error'
    })
  }
})

/**
 * Sends newcomer data to Planning Center Online API.
 * Uses Basic Auth with App ID and Secret.
 */
async function syncWithPlanningCenter(details: any, config: any) {
  const { name, email, phone, survey } = details
  
  // 1. Robust Credential Logging
  const appId = config.pcoAppId
  const secret = config.pcoSecret
  console.log('[PCO Sync] Validating Runtime Config:', {
    hasAppId: !!appId,
    appIdPrefix: appId ? appId.substring(0, 4) + '...' : 'null',
    hasSecret: !!secret,
    secretPrefix: secret ? secret.substring(0, 4) + '...' : 'null'
  })

  if (!appId || !secret) {
    throw new Error(`PCO Sync aborted: Missing credentials (AppID: ${!!appId}, Secret: ${!!secret}). Ensure NUXT_PCO_APP_ID and NUXT_PCO_SECRET are set.`)
  }

  // 2. Buffer availability check (Edge Runtime Support)
  let auth: string
  try {
    const credentials = `${appId}:${secret}`
    if (typeof Buffer !== 'undefined') {
      auth = Buffer.from(credentials).toString('base64')
    } else if (typeof btoa !== 'undefined') {
      auth = btoa(credentials)
    } else {
      throw new Error('No base64 encoding method available (Buffer/btoa)')
    }
  } catch (authErr: any) {
    console.error('[PCO Sync Error] Auth Encoding Failed:', authErr.stack)
    throw authErr
  }

  const baseUrl = 'https://api.planningcenteronline.com/people/v2'
  const baseHeaders = { 
    'Authorization': `Basic ${auth}`,
    'Content-Type': 'application/json'
  }

  /**
   * Helper for robust API calls with full error body logging
   */
  const pcoFetch = async (url: string, options: any = {}) => {
    const response = await fetch(url, {
      ...options,
      headers: { ...baseHeaders, ...options.headers }
    })
    
    if (!response.ok) {
      let errorBody = ''
      try {
        errorBody = await response.text()
      } catch (e) {
        errorBody = '(could not parse error body)'
      }
      console.error(`[PCO API Failure] ${options.method || 'GET'} ${url}`, {
        status: response.status,
        statusText: response.statusText,
        error: errorBody
      })
      throw new Error(`PCO API ${response.status}: ${errorBody}`)
    }
    return response
  }

  console.log(`[PCO Sync] Starting multi-step sync for: ${email}`)

  try {
    // 1. Lookup: Check if the person already exists
    const lookupResponse = await pcoFetch(`${baseUrl}/people?where[email]=${encodeURIComponent(email)}`)
    const lookupData = await lookupResponse.json()
    let personId = null

    if (lookupData.data && lookupData.data.length > 0) {
      personId = lookupData.data[0].id
      console.log(`[PCO Sync] Found existing person: ${personId}`)
    } else {
      // 2. Create the Person record
      const personResponse = await pcoFetch(`${baseUrl}/people`, {
        method: 'POST',
        body: JSON.stringify({
          data: {
            type: 'Person',
            attributes: {
              first_name: name.split(' ')[0],
              last_name: name.split(' ').slice(1).join(' ') || 'Newcomer'
            }
          }
        })
      })

      const personData = await personResponse.json()
      personId = personData.data.id
      console.log(`[PCO Sync] Created new person: ${personId}`)

      // 3. Add Email (Only for new persons)
      await pcoFetch(`${baseUrl}/people/${personId}/emails`, {
        method: 'POST',
        body: JSON.stringify({
          data: {
            type: 'Email',
            attributes: { address: email, location: 'Home' }
          }
        })
      })
    }

    // 4. Add/Update Phone Number
    if (phone) {
      await pcoFetch(`${baseUrl}/people/${personId}/phone_numbers`, {
        method: 'POST',
        body: JSON.stringify({
          data: {
            type: 'PhoneNumber',
            attributes: { number: phone, location: 'Mobile' }
          }
        })
      }).catch(err => console.warn('[PCO Sync Warning] Phone sync failed (non-fatal):', err.message))
    }

    // 5. Update Custom Fields
    const customFields = [
      { id: config.pcoFieldInvitedBy, value: survey.invitedBy || '', name: 'Invited By', isBoolean: false },
      { id: config.pcoFieldLookingForChurch, value: !!survey.lookingForChurch, name: 'Looking for Church', isBoolean: true },
      { id: config.pcoFieldInterestedInJesus, value: !!survey.knowMoreAboutJesus, name: 'Interested in Jesus', isBoolean: true }
    ]

    for (const field of customFields) {
      if (field.id) {
        const finalValue = field.isBoolean ? String(field.value) : field.value
        if (!field.isBoolean && finalValue === '') continue

        console.log(`[PCO Sync] Updating ${field.name} (ID: ${field.id})`)
        
        await pcoFetch(`${baseUrl}/people/${personId}/field_data`, {
          method: 'POST',
          body: JSON.stringify({
            data: {
              type: 'FieldData',
              attributes: { value: finalValue },
              relationships: {
                field_definition: {
                  data: { type: 'FieldDefinition', id: field.id }
                }
              }
            }
          })
        }).catch(err => console.error(`[PCO Sync Error] ${field.name} update failed:`, err.message))
      }
    }

    // 6. Add Backup Note
    const backupNote = `COFFEE SHOP SURVEY RESULTS\n--------------------------\nInvited By: ${survey.invitedBy || 'N/A'}\nLooking for Church: ${survey.lookingForChurch ? 'Yes' : 'No'}\nInterested in Jesus: ${survey.knowMoreAboutJesus ? 'Yes' : 'No'}`
    
    await pcoFetch(`${baseUrl}/people/${personId}/notes`, {
      method: 'POST',
      body: JSON.stringify({
        data: {
          type: 'Note',
          attributes: { note: backupNote }
        }
      })
    })

    console.log(`[PCO Sync] Successfully sync completed for ${email}`)

  } catch (err: any) {
    console.error('[PCO Sync Fatal] Step-by-step sync failed:', err.stack || err.message)
    throw err
  }
}
