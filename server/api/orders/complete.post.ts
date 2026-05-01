import { defineEventHandler, readBody, createError } from 'h3'
import { createClient } from '@supabase/supabase-js'
import type { Database } from '~/types/supabase'

/**
 * Server route to handle order completion with Rate Limiting.
 * Layer 1: Status Check (Prevents re-notifying already completed orders)
 * Layer 2: Temporal Cooldown (Prevents API bombing/spam)
 */
export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  const body = await readBody(event)
  const { orderId } = body

  if (!orderId) {
    throw createError({ statusCode: 400, statusMessage: 'Order ID required.' })
  }

  // --- RATE LIMITING & DEDUPLICATION ---
  // We use Nitro's built-in storage to track "Notification Cooldowns"
  // This prevents the same order from triggering multiple WhatsApps in a short window.
  const storage = useStorage('cache')
  const cooldownKey = `whatsapp:cooldown:${orderId}`
  const hasRecentlyNotified = await storage.getItem(cooldownKey)

  if (hasRecentlyNotified) {
    console.warn(`[WhatsApp API] Rate limit hit: Skipping notification for ${orderId} (Cooldown active)`)
    return { success: true, message: 'Status updated, notification skipped (cooldown).' }
  }

  const supabase = createClient<Database>(
    config.public.supabaseUrl,
    config.supabaseServiceKey || config.public.supabaseKey
  )

  try {
    // 1. Fetch Current Status FIRST (The "Deduplication" Layer)
    // We check if it's already completed to avoid redundant API credits usage.
    const { data: currentOrder, error: fetchError } = await supabase
      .from('orders')
      .select('status, customer_name, phone')
      .eq('id', orderId)
      .single()

    if (fetchError || !currentOrder) {
      throw createError({ statusCode: 404, statusMessage: 'Order not found.' })
    }

    if (currentOrder.status === 'completed') {
      console.log(`[POS] Order ${orderId} is already completed. Skipping notification.`)
      return { success: true, message: 'Order already completed.', notified: false }
    }

    // 2. Perform the Update
    const { error: updateError } = await supabase
      .from('orders')
      .update({ status: 'completed' } as any)
      .eq('id', orderId)

    if (updateError) {
      throw createError({ statusCode: 500, statusMessage: 'Database update failed.' })
    }

    // 3. Fetch Items & Trigger WhatsApp
    const { data: items } = await supabase
      .from('order_items')
      .select('quantity, product:products(name)')
      .eq('order_id', orderId)

    const customerName = currentOrder.customer_name
    const customerPhone = currentOrder.phone
    const shortOrderId = orderId.slice(-6).toUpperCase()

    const formattedItems = (items || []).map((item: any) => {
      const productName = item.product?.name || 'Drink'
      return `${item.quantity}x ${productName}`
    }).join('\n')

    if (customerPhone && config.whatsappToken && config.whatsappPhoneId) {
      // Set Cooldown: Mark this order as "notified" for the next 5 minutes
      // This protects against UI bugs or rapid status toggling.
      await storage.setItem(cooldownKey, true, { ttl: 300 }) // 300 seconds = 5 mins

      const cleanPhone = customerPhone.replace(/\D/g, '')

      try {
        const whatsappUrl = `https://graph.facebook.com/v19.0/${config.whatsappPhoneId}/messages`
        const payload = {
          messaging_product: 'whatsapp',
          to: cleanPhone,
          type: 'template',
          template: {
            name: 'order_ready_detailed',
            language: { code: 'en_US' },
            components: [
              {
                type: 'body',
                parameters: [
                  { type: 'text', text: customerName },
                  { type: 'text', text: formattedItems },
                  { type: 'text', text: shortOrderId }
                ]
              }
            ]
          }
        }

        const wsResponse = await fetch(whatsappUrl, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${config.whatsappToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(payload)
        })

        if (!wsResponse.ok) {
          const wsResult = await wsResponse.json()
          console.error('[WhatsApp API] Delivery Failed:', wsResult)
        }
      } catch (wsErr: any) {
        console.error('[WhatsApp API] Network Error:', wsErr.message)
      }
    }

    return { 
      success: true, 
      message: 'Order completed and notification triggered.',
      notified: !!customerPhone 
    }

  } catch (err: any) {
    throw createError({
      statusCode: err.statusCode || 500,
      statusMessage: err.statusMessage || 'Internal Server Error'
    })
  }
})
