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

    // 2. Perform the Update to 'ready' (Core state change must always happen)
    if (order.status !== 'ready' && order.status !== 'completed') {
      const { error: updateError } = await supabase
        .from('orders')
        .update({ status: 'ready' } as any)
        .eq('id', orderId)

      if (updateError) throw createError({ statusCode: 500, statusMessage: 'DB Update Failed' })
    }

    // --- NOTIFICATION COOLDOWN ---
    const storage = useStorage('cache')
    const cooldownKey = `notification:cooldown:${orderId}`
    const hasRecentlyNotified = await storage.getItem(cooldownKey)

    if (hasRecentlyNotified) {
      return { success: true, message: 'Status updated, notifications skipped (cooldown).' }
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

    // --- EMAIL NOTIFICATION (Premium Upgrade) ---
    let emailSent = false
    if (customerEmail && config.gmailUser && config.gmailAppPassword) {
      try {
        const transporter = nodemailer.createTransport({
          service: 'gmail',
          auth: { user: config.gmailUser, pass: config.gmailAppPassword }
        })

        // Build items HTML with customization support
        const itemsHtml = safeItems.map((item: any) => {
          const productName = item.product?.name || 'Handcrafted Drink'
          
          // Robust customizations parsing (consistent with premium template logic)
          const custObj = item.customizations || {}
          const customizationList = typeof custObj === 'object' ? Object.values(custObj).filter(v => !!v) : []
          const customizations = customizationList.length > 0 ? customizationList.join(' • ') : ''
            
          return `
            <div style="padding: 12px 0; border-bottom: 1px solid #f0f0f0;">
              <p style="margin: 0; font-family: sans-serif; font-size: 15px; font-weight: 800; color: #000000; text-transform: uppercase; letter-spacing: -0.01em;">
                ${item.quantity || 1}x ${productName}
              </p>
              ${customizations ? `<p style="margin: 4px 0 0 0; font-family: sans-serif; font-size: 11px; font-weight: 700; color: #ea580c; text-transform: uppercase; letter-spacing: 0.05em;">${customizations}</p>` : ''}
            </div>
          `
        }).join('')

        const formattedTotal = new Intl.NumberFormat('en-MY', {
          style: 'currency',
          currency: 'MYR'
        }).format(order.total_price || 0)

        const displayOrderId = order.order_number ? `#${order.order_number}` : shortOrderId

        await transporter.sendMail({
          from: `"Drip & Brew" <${config.gmailUser}>`,
          to: customerEmail,
          subject: `❗ Your Drip & Brew order is ready! ☕`,
          priority: 'high',
          headers: {
            'X-Priority': '1',
            'Importance': 'high'
          },
          html: `
            <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 40px 20px; color: #000000; background-color: #ffffff;">
              
              <div style="border-bottom: 4px solid #000000; padding-bottom: 20px; margin-bottom: 30px; text-align: center;">
                <h1 style="margin: 0; font-size: 32px; font-weight: 900; font-style: italic; text-transform: uppercase; letter-spacing: -0.05em;">
                  Drip & Brew
                </h1>
              </div>

              <h2 style="font-size: 24px; font-weight: 900; margin: 0 0 10px 0; letter-spacing: -0.02em;">Hi ${customerName},</h2>
              <p style="font-size: 16px; color: #666666; line-height: 1.5; margin: 0 0 30px 0;">
                Your handcrafted order is ready for pickup! Come by the counter and let our baristas know you're here.
              </p>

              <div style="background-color: #ffffff; border: 2px solid #000000; border-radius: 20px; padding: 25px; margin-bottom: 30px;">
                <p style="margin: 0 0 15px 0; font-size: 10px; font-weight: 900; color: #aaaaaa; text-transform: uppercase; letter-spacing: 0.2em;">Order Summary</p>
                
                ${itemsHtml}

                <div style="margin-top: 20px; padding-top: 15px; text-align: right;">
                  <span style="font-size: 12px; font-weight: 900; text-transform: uppercase; margin-right: 10px; color: #aaaaaa;">Total Paid</span>
                  <span style="font-size: 24px; font-weight: 900; color: #ea580c;">${formattedTotal}</span>
                </div>
              </div>

              <div style="text-align: center; border-top: 1px solid #f0f0f0; padding-top: 30px;">
                <p style="margin: 0; font-size: 12px; font-weight: 800; text-transform: uppercase; color: #aaaaaa;">
                  Thank you for choosing <br/>
                  <span style="color: #000000; font-size: 14px;">Drip & Brew</span>
                </p>
                <p style="margin: 20px 0 0 0; font-size: 9px; color: #dddddd; text-transform: uppercase; letter-spacing: 0.1em;">Ref: ${displayOrderId}</p>
              </div>
            </div>
          `
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
