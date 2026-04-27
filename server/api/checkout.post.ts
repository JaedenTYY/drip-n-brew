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
          console.error('[PCO Sync Error] Background sync failed:', err.message)
        })
      )
    }

    return {
      success: true,
      order
    }

  } catch (err: any) {
    console.error('[Checkout API] Fatal Error:', err.message)
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
  const auth = Buffer.from(`${config.pcoAppId}:${config.pcoSecret}`).toString('base64')
  const baseUrl = 'https://api.planningcenteronline.com/people/v2'

  console.log(`[PCO Sync] Starting multi-step sync for: ${email}`)

  try {
    // 1. Lookup: Check if the person already exists to avoid 422 duplicates
    const lookupResponse = await fetch(`${baseUrl}/people?where[email]=${encodeURIComponent(email)}`, {
      headers: { 'Authorization': `Basic ${auth}` }
    })
    
    const lookupData = await lookupResponse.json()
    let personId = null

    if (lookupData.data && lookupData.data.length > 0) {
      personId = lookupData.data[0].id
      console.log(`[PCO Sync] Found existing person with ID: ${personId}`)
    } else {
      // 2. Create the Person record if they don't exist
      const personResponse = await fetch(`${baseUrl}/people`, {
        method: 'POST',
        headers: { 'Authorization': `Basic ${auth}`, 'Content-Type': 'application/json' },
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

      if (!personResponse.ok) {
        const err = await personResponse.json()
        throw new Error(`Person Creation Failed: ${JSON.stringify(err)}`)
      }

      const personData = await personResponse.json()
      personId = personData.data.id
      console.log(`[PCO Sync] New person created with ID: ${personId}`)

      // 3. Add Email (Only for new persons)
      await fetch(`${baseUrl}/people/${personId}/emails`, {
        method: 'POST',
        headers: { 'Authorization': `Basic ${auth}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          data: {
            type: 'Email',
            attributes: { address: email, location: 'Home' }
          }
        })
      })
    }

    // 4. Add/Update Phone Number (Separate Resource)
    if (phone) {
      await fetch(`${baseUrl}/people/${personId}/phone_numbers`, {
        method: 'POST',
        headers: { 'Authorization': `Basic ${auth}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          data: {
            type: 'PhoneNumber',
            attributes: { number: phone, location: 'Mobile' }
          }
        })
      })
    }

    // 4. Update Custom Fields (The "Reporting" way)
    // Note: For PCO 'Yes/No' field types, the API often expects the strings 'true' or 'false'.
    // We explicitly convert our booleans to these strings to satisfy PCO's validation.
    const customFields = [
      { id: config.pcoFieldInvitedBy, value: survey.invitedBy || '', name: 'Invited By', isBoolean: false },
      { id: config.pcoFieldLookingForChurch, value: !!survey.lookingForChurch, name: 'Looking for Church', isBoolean: true },
      { id: config.pcoFieldInterestedInJesus, value: !!survey.knowMoreAboutJesus, name: 'Interested in Jesus', isBoolean: true }
    ]

    for (const field of customFields) {
      if (field.id) {
        // Convert boolean to PCO-compatible string 'true'/'false'
        const finalValue = field.isBoolean ? String(field.value) : field.value

        // Only skip if it's a text field and it's empty. 
        // We ALWAYS send boolean fields (even if false) to meet your 'must mean no' requirement.
        if (!field.isBoolean && finalValue === '') continue

        console.log(`[PCO Sync] Updating ${field.name} (ID: ${field.id}) to: ${finalValue}`)
        
        const fieldResponse = await fetch(`${baseUrl}/people/${personId}/field_data`, {
          method: 'POST',
          headers: { 'Authorization': `Basic ${auth}`, 'Content-Type': 'application/json' },
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
        })

        if (fieldResponse.ok) {
          console.log(`[PCO Sync] Success: ${field.name}`)
        } else {
          const fieldErr = await fieldResponse.json()
          console.error(`[PCO Sync Error] ${field.name} Failed:`, JSON.stringify(fieldErr))
        }
      }
    }

    // 5. Fallback Note (The "Safety Net")
    // If the Custom Fields have any mapping issues, the data is still saved here.
    const backupNote = `
COFFEE SHOP SURVEY RESULTS
--------------------------
Invited By: ${survey.invitedBy || 'N/A'}
Looking for Church: ${survey.lookingForChurch ? 'Yes' : 'No'}
Interested in Jesus: ${survey.knowMoreAboutJesus ? 'Yes' : 'No'}
    `
    await fetch(`${baseUrl}/people/${personId}/notes`, {
      method: 'POST',
      headers: { 'Authorization': `Basic ${auth}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        data: {
          type: 'Note',
          attributes: { note: backupNote }
        }
      })
    })

    console.log(`[PCO Sync] Successfully completed all sync steps for ${email}`)


  } catch (err: any) {
    throw err
  }
}
