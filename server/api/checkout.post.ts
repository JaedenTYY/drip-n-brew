import { defineEventHandler, readBody, createError } from 'h3'
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
      order
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

  // 0. Determine Name and Phone (Prioritize Newcomer Data)
  let nameToSync = name
  if (survey?.newcomerName) {
    nameToSync = survey.newcomerName
  }

  let phoneToSync = phone
  if (survey?.newcomerPhone) {
    let cleanNewcomer = survey.newcomerPhone.replace(/\D/g, '')
    if (cleanNewcomer.startsWith('01')) {
      cleanNewcomer = '60' + cleanNewcomer.substring(1)
    } else if (cleanNewcomer.startsWith('1') && !cleanNewcomer.startsWith('601')) {
      cleanNewcomer = '60' + cleanNewcomer
    }
    phoneToSync = cleanNewcomer
  }

  // 1. Lookup Person and their existing Field Data
  const searchResult = await pcoRequest(`/people?where[search_name_or_email]=${encodeURIComponent(email)}&include=field_data`)
  let personId = searchResult.data?.[0]?.id
  let existingFields = searchResult.included || []

  if (personId) {
    if (debug) console.log(`[DEBUG] Found existing PCO person: ${personId}`)
  } else {
    // 2. Create Person
    const createResult = await pcoRequest('/people', 'POST', {
      data: {
        type: 'Person',
        attributes: {
          first_name: nameToSync.split(' ')[0],
          last_name: nameToSync.split(' ').slice(1).join(' ') || 'Newcomer'
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
    }).catch(e => {
      if (debug) console.warn('[PCO WARN] Email add failed:', e.message)
    })
  }

  // 4. Update Phone (Non-blocking)
  if (phoneToSync) {
    await pcoRequest(`/people/${personId}/phone_numbers`, 'POST', {
      data: {
        type: 'PhoneNumber',
        attributes: { number: phoneToSync, location: 'Mobile' }
      }
    }).catch(e => {
      // Ignore 422 for phone if it already exists
      if (debug) console.warn('[PCO WARN] Phone add failed (possibly exists):', e.message)
    })
  }

  // 5. Custom Fields Mapping (Intelligent Sync)
  const fieldMapping = [
    { id: config.pcoFieldInvitedBy, value: survey.invitedBy, type: 'string' },
    { id: config.pcoFieldLookingForChurch, value: survey.lookingForChurch, type: 'boolean' },
    { id: config.pcoFieldInterestedInJesus, value: survey.knowMoreAboutJesus, type: 'boolean' }
  ]

  for (const field of fieldMapping) {
    if (!field.id || field.value === undefined || field.value === '') continue

    const finalValue = field.type === 'boolean' ? String(!!field.value) : String(field.value)
    
    // Check if this specific field definition already has a value for this person
    const existingEntry = existingFields.find((f: any) => 
      f.type === 'FieldDatum' && 
      f.relationships?.field_definition?.data?.id === field.id
    )

    if (existingEntry) {
      // UPDATE existing value
      if (debug) console.log(`[DEBUG] Patching existing field: ${field.id}`)
      await pcoRequest(`/field_data/${existingEntry.id}`, 'PATCH', {
        data: {
          type: 'FieldData',
          id: existingEntry.id,
          attributes: { value: finalValue }
        }
      }).catch(e => console.error(`[PCO ERROR] Field PATCH ${field.id} failed:`, e.message))
    } else {
      // CREATE new value
      if (debug) console.log(`[DEBUG] Posting new field: ${field.id}`)
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
      }).catch(e => console.error(`[PCO ERROR] Field POST ${field.id} failed:`, e.message))
    }
  }

  // 6. Create Backup Note
  const noteContent = [
    'COFFEE SHOP SURVEY RESULTS',
    '--------------------------',
    `Checkout Name: ${name || 'N/A'}`,
    `Survey Name: ${survey.newcomerName || 'N/A'}`,
    `Invited By: ${survey.invitedBy || 'N/A'}`,
    `Phone Used: ${phoneToSync || 'N/A'}`,
    `Looking for Church: ${survey.lookingForChurch ? 'Yes' : 'No'}`,
    `Interested in Jesus: ${survey.knowMoreAboutJesus ? 'Yes' : 'No'}`
  ].join('\n')

  const notePayload: any = {
    data: {
      type: 'Note',
      attributes: { note: noteContent }
    }
  }

  if (config.pcoNoteCategoryId) {
    notePayload.data.relationships = {
      note_category: {
        data: { type: 'NoteCategory', id: config.pcoNoteCategoryId }
      }
    }
  }

  await pcoRequest(`/people/${personId}/notes`, 'POST', notePayload)
    .catch(e => console.error('[PCO ERROR] Note creation failed:', e.message))

  if (debug) console.log(`[DEBUG] PCO sync completed for person: ${personId}`)
}
