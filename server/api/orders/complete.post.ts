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

    // 2. Perform Atomic Update (Protects against double-clicks)
    const { data: updatedRows, error: updateError } = await supabase
      .from('orders')
      .update({ status: 'completed' } as any)
      .eq('id', orderId)
      .neq('status', 'completed')
      .select('id')

    if (updateError) {
      throw createError({ statusCode: 500, statusMessage: 'Database update failed.' })
    }

    if (!updatedRows || updatedRows.length === 0) {
      console.warn(`[POS] Race condition prevented: Order ${orderId} is already completed.`)
      return { success: true, message: 'Order already completed by another request.', notified: false }
    }

    // --- RATE LIMITING & DEDUPLICATION (Send exactly ONCE) ---
    const storage = useStorage('cache')
    const cooldownKey = `whatsapp:cooldown:${orderId}`
    const hasAlreadyNotified = await storage.getItem(cooldownKey)

    if (hasAlreadyNotified) {
      console.warn(`[WhatsApp API] Rate limit hit: Skipping notification for ${orderId} (Already sent once)`)
      return { success: true, message: 'Status updated, notification skipped (already sent once).' }
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
      // Set Cooldown: Mark this order as "notified" for the next 24 hours
      // This guarantees the message is only ever sent once per order, even if toggled back and forth.
      await storage.setItem(cooldownKey, true, { ttl: 86400 }) // 86400 seconds = 24 hours

      let cleanPhone = customerPhone.replace(/\D/g, '')
      if (cleanPhone.startsWith('01')) {
        cleanPhone = '60' + cleanPhone.substring(1)
      } else if (cleanPhone.startsWith('1') && !cleanPhone.startsWith('601')) {
        cleanPhone = '60' + cleanPhone
      }

      try {
        const whatsappUrl = `https://graph.facebook.com/v19.0/${config.whatsappPhoneId}/messages`
        const payload = {
          messaging_product: 'whatsapp',
          to: cleanPhone,
          type: 'template',
          template: {
            name: 'order_ready',
            language: { code: 'en' },
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
      statusCode: 500,
      statusMessage: 'Internal Server Error'
    })
  }
})
