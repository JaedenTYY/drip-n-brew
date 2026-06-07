import { defineEventHandler, readBody, createError } from 'h3'
import { createClient } from '@supabase/supabase-js'
import type { Database } from '~/types/supabase'

/**
 * Server route to handle marking an order as READY.
 * Triggers both WhatsApp and Email notifications.
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
    // 1. Fetch Order & Items with Product details
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('*, items:order_items(*, product:products(*))')
      .eq('id', orderId)
      .single()

    if (orderError || !order) {
      throw createError({ statusCode: 404, statusMessage: 'Order not found.' })
    }

    // 2. Perform Atomic Update to 'ready' (Protects against double-clicks)
    if (order.status !== 'ready' && order.status !== 'completed') {
      const { data: updatedRows, error: updateError } = await supabase
        .from('orders')
        .update({ status: 'ready' } as any)
        .eq('id', orderId)
        .neq('status', 'ready')
        .neq('status', 'completed')
        .select('id')

      if (updateError) throw createError({ statusCode: 500, statusMessage: 'DB Update Failed' })

      // If no rows were updated, another request beat us to it (race condition)
      if (!updatedRows || updatedRows.length === 0) {
        console.warn(`[POS] Race condition prevented: Order ${orderId} was already updated.`)
        return { success: true, message: 'Order already processed by another request.' }
      }
    }

    // --- NOTIFICATION DEDUPLICATION (Send exactly ONCE) ---
    const storage = useStorage('cache')
    const cooldownKey = `notification:cooldown:${orderId}`
    const hasAlreadyNotified = await storage.getItem(cooldownKey)

    if (hasAlreadyNotified) {
      console.log(`[WhatsApp API] Order ${orderId} already notified. Skipping duplicate send.`)
      return { success: true, message: 'Status updated, notifications skipped (already sent once).' }
    }

    // Set Cooldown for 24 hours (86400 seconds) so it never resends for this order's lifespan
    await storage.setItem(cooldownKey, true, { ttl: 86400 })

    // 3. Prepare Notification Data
    const { customer_name: customerName, phone: customerPhone, email: customerEmail } = order
    const shortOrderId = orderId.slice(-6).toUpperCase()
    const safeItems = order.items || []

    const formattedItemsText = safeItems.map((item: any) => 
      `${item.quantity}x ${item.product?.name || 'Drink'}`
    ).join('\n')

        // --- WHATSAPP NOTIFICATION ---
    let whatsappSent = false
    if (customerPhone && config.whatsappToken && config.whatsappPhoneId) {
      // E.164 Formatting Safety Net for Legacy Data
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
                  { type: 'text', text: formattedItemsText },
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
        } else {
          whatsappSent = true
        }
      } catch (wsErr: any) {
        console.error('[WhatsApp] Error:', wsErr.message)
      }
    }

    // --- EMAIL NOTIFICATION ---
    // (Email logic removed as per request)
    let emailSent = false

    return { 
      success: true, 
      message: 'Order marked as READY.', 
      notified: { whatsapp: whatsappSent, email: emailSent } 
    }

  } catch (err: any) {
    throw createError({ statusCode: 500, statusMessage: err.message })
  }
})
