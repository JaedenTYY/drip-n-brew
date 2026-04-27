import { defineEventHandler, readBody, createError, useRuntimeConfig } from 'h3'
import { createClient } from '@supabase/supabase-js'
import type { Database } from '~/types/supabase'

/**
 * 'Claude-level' Robust Checkout API
 * - Built for Vercel Serverless environment.
 * - Mandatory pre-flight validation.
 * - JSON:API compliant PCO integration.
 * - Leak-proof background processing.
 */

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  const debug = config.debugMode

  // 1. Mandatory Pre-flight Validation
  const requiredKeys = [
    'public.supabaseUrl', 
    'public.supabaseKey', 
    'pcoAppId', 
    'pcoSecret'
  ]
  const missingKeys = requiredKeys.filter(key => {
    const val = key.split('.').reduce((o, i) => (o as any)?.[i], config)
    return !val
  })

  if (missingKeys.length > 0) {
    console.error('[CRITICAL] Missing Configuration Keys:', missingKeys)
    throw createError({
      statusCode: 500,
      statusMessage: `Configuration Error: Missing ${missingKeys.join(', ')}. Check Vercel Env Vars.`
    })
  }

  const body = await readBody(event)
  const { details, items } = body

  if (debug) {
    console.log('[DEBUG] Checkout Request received:', JSON.stringify({ details, itemCount: items?.length }, null, 2))
  }

  // 2. Initialize Supabase Client
  // Using globalThis to ensure availability across Edge/Node contexts
  const supabase = createClient<Database>(
    config.public.supabaseUrl,
    config.public.supabaseKey
  )

  try {
    // 3. Create the Order in Supabase
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

    // 4. Create Order Items
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

    // 5. PCO Integration (Background Task)
    if (details.survey) {
      // event.waitUntil ensures the function doesn't terminate before PCO sync is done.
      // We pass a cloned config or specific values to avoid reference leaks if necessary.
      event.waitUntil(
        syncWithPlanningCenter(details, config)
          .then(() => {
            if (debug) console.log('[DEBUG] PCO Sync background task completed successfully.')
          })
          .catch(err => {
            console.error('[PCO ERROR] Background sync failed:', err.message)
            if (debug) console.error(err.stack)
          })
      )
    }

    return {
      success: true,
      orderId: order.id
    }

  } catch (err: any) {
    console.error('[FATAL] Checkout API failure:', err.message)
    throw createError({
      statusCode: 500,
      statusMessage: debug ? `Fatal: ${err.message}` : 'Internal Server Error'
    })
  }
})

/**
 * Robust Base64 Helper for Edge/Node compatibility
 */
function safeBase64(str: string): string {
  try {
    if (typeof Buffer !== 'undefined') return Buffer.from(str).toString('base64')
    if (typeof btoa !== 'undefined') return btoa(str)
  } catch (e) {
    throw new Error('Base64 encoding failed: No supported method found.')
  }
  throw new Error('Base64 encoding failed.')
}

/**
 * Planning Center Online Sync Logic
 * Strictly JSON:API compliant
 */
async function syncWithPlanningCenter(details: any, config: any) {
  const debug = config.debugMode
  const { name, email, phone, survey } = details
  const auth = safeBase64(`${config.pcoAppId}:${config.pcoSecret}`)

  const PCO_BASE = 'https://api.planningcenteronline.com/people/v2'
  const JSON_API_TYPE = 'application/vnd.api+json'
  
  const headers = {
    'Authorization': `Basic ${auth}`,
    'Content-Type': JSON_API_TYPE,
    'Accept': JSON_API_TYPE
  }

  const pcoRequest = async (path: string, method = 'GET', body?: any) => {
    const url = path.startsWith('http') ? path : `${PCO_BASE}${path}`
    const res = await fetch(url, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined
    })

    if (!res.ok) {
      const errText = await res.text()
      throw new Error(`PCO API ${res.status} ${method} ${path}: ${errText}`)
    }
    return res.json()
  }

  if (debug) console.log(`[DEBUG] Starting PCO sync for ${email}`)

  // 1. Lookup Person
  const searchResult = await pcoRequest(`/people?where[email]=${encodeURIComponent(email)}`)
  let personId = searchResult.data?.[0]?.id

  if (personId) {
    if (debug) console.log(`[DEBUG] Found existing PCO person: ${personId}`)
  } else {
    // 2. Create Person
    const createResult = await pcoRequest('/people', 'POST', {
      data: {
        type: 'Person',
        attributes: {
          first_name: name.split(' ')[0],
          last_name: name.split(' ').slice(1).join(' ') || 'Newcomer'
        }
      }
    })
    personId = createResult.data.id
    if (debug) console.log(`[DEBUG] Created new PCO person: ${personId}`)

    // 3. Add Email
    await pcoRequest(`/people/${personId}/emails`, 'POST', {
      data: {
        type: 'Email',
        attributes: { address: email, location: 'Home' }
      }
    })
  }

  // 4. Update Phone (Non-blocking)
  if (phone) {
    await pcoRequest(`/people/${personId}/phone_numbers`, 'POST', {
      data: {
        type: 'PhoneNumber',
        attributes: { number: phone, location: 'Mobile' }
      }
    }).catch(e => console.warn('[PCO WARN] Phone add failed:', e.message))
  }

  // 5. Custom Fields Mapping
  const fieldMapping = [
    { id: config.pcoFieldInvitedBy, value: survey.invitedBy, type: 'string' },
    { id: config.pcoFieldLookingForChurch, value: survey.lookingForChurch, type: 'boolean' },
    { id: config.pcoFieldInterestedInJesus, value: survey.knowMoreAboutJesus, type: 'boolean' }
  ]

  for (const field of fieldMapping) {
    if (!field.id || field.value === undefined || field.value === '') continue

    const finalValue = field.type === 'boolean' ? String(!!field.value) : String(field.value)
    
    await pcoRequest(`/people/${personId}/field_data`, 'POST', {
      data: {
        type: 'FieldData',
        attributes: { value: finalValue },
        relationships: {
          field_definition: {
            data: { type: 'FieldDefinition', id: field.id }
          }
        }
      }
    }).catch(e => console.error(`[PCO ERROR] Field ${field.id} failed:`, e.message))
  }

  // 6. Create Backup Note (Includes Category ID for strict PCO accounts)
  const noteContent = [
    'COFFEE SHOP SURVEY RESULTS',
    '--------------------------',
    `Invited By: ${survey.invitedBy || 'N/A'}`,
    `Looking for Church: ${survey.lookingForChurch ? 'Yes' : 'No'}`,
    `Interested in Jesus: ${survey.knowMoreAboutJesus ? 'Yes' : 'No'}`
  ].join('\n')

  const notePayload: any = {
    data: {
      type: 'Note',
      attributes: { note: noteContent }
    }
  }

  // Inject category relationship if ID is provided in .env
  if (config.pcoNoteCategoryId) {
    notePayload.data.relationships = {
      note_category: {
        data: { type: 'NoteCategory', id: config.pcoNoteCategoryId }
      }
    }
  }

  await pcoRequest(`/people/${personId}/notes`, 'POST', notePayload)
    .catch(e => console.error('[PCO ERROR] Note creation failed (likely missing note_category_id):', e.message))

  if (debug) console.log(`[DEBUG] PCO sync completed for person: ${personId}`)
}
