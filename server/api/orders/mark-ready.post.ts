import { defineEventHandler, readBody, createError } from 'h3'
import { createClient } from '@supabase/supabase-js'
import nodemailer from 'nodemailer'
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

  // --- RATE LIMITING ---
  const storage = useStorage('cache')
  const cooldownKey = `notification:cooldown:${orderId}`
  const hasRecentlyNotified = await storage.getItem(cooldownKey)

  if (hasRecentlyNotified) {
    return { success: true, message: 'Status updated, notifications skipped (cooldown).' }
  }

  const supabase = createClient<Database>(
    config.public.supabaseUrl,
    config.public.supabaseKey
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

    // 2. Perform the Update to 'ready'
    if (order.status !== 'ready' && order.status !== 'completed') {
      const { error: updateError } = await supabase
        .from('orders')
        .update({ status: 'ready' } as any)
        .eq('id', orderId)

      if (updateError) throw createError({ statusCode: 500, statusMessage: 'DB Update Failed' })
    }

    // Set Cooldown
    await storage.setItem(cooldownKey, true, { ttl: 300 })

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
            name: 'order_ready_detailed',
            language: { code: 'en_US' },
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

        await fetch(whatsappUrl, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${config.whatsappToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(payload)
        })
        whatsappSent = true
      } catch (wsErr: any) {
        console.error('[WhatsApp] Error:', wsErr.message)
      }
    }

    // --- EMAIL NOTIFICATION (Legacy Support) ---
    let emailSent = false
    if (customerEmail && config.gmailUser && config.gmailAppPassword) {
      try {
        const transporter = nodemailer.createTransport({
          service: 'gmail',
          auth: { user: config.gmailUser, pass: config.gmailAppPassword }
        })

        const itemsHtml = safeItems.map((item: any) => `
          <div style="padding: 10px 0; border-bottom: 1px solid #eee;">
            <strong>${item.quantity}x ${item.product?.name || 'Drink'}</strong>
          </div>
        `).join('')

        await transporter.sendMail({
          from: `"Drip & Brew" <${config.gmailUser}>`,
          to: customerEmail,
          subject: `☕ Your order is ready at Drip & Brew!`,
          html: `<div style="font-family: sans-serif; max-width: 400px;">
            <h2>Hi ${customerName},</h2>
            <p>Your order is ready for pickup!</p>
            <div style="background: #f9f9f9; padding: 20px; border-radius: 10px;">
              ${itemsHtml}
            </div>
            <p style="color: #888; font-size: 10px; margin-top: 20px;">Ref: ${shortOrderId}</p>
          </div>`
        })
        emailSent = true
      } catch (emErr: any) {
        console.error('[Email] Error:', emErr.message)
      }
    }

    return { 
      success: true, 
      message: 'Order marked as READY.', 
      notified: { whatsapp: whatsappSent, email: emailSent } 
    }

  } catch (err: any) {
    throw createError({ statusCode: 500, statusMessage: err.message })
  }
})
