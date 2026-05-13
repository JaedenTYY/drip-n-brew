import { defineEventHandler, readBody, createError } from 'h3'
import nodemailer from 'nodemailer'

/**
 * Server route to handle sending order completion emails via Gmail/Nodemailer.
 * This Approach uses a premium, Big-Tech style HTML template.
 */
export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  
  try {
    const body = await readBody(event)
    
    // HCI & BIG-TECH TIP: Resilience
    // We map both snake_case (from DB) and camelCase (from API) to ensure this utility works everywhere.
    const customerEmail = body.customerEmail || body.email
    const customerName = body.customerName || body.customer_name
    const items = body.items || []
    const totalPrice = body.totalPrice || body.total_price
    const orderId = body.orderId || body.id

    console.log(`[Email Server] Processing notification for Order: ${orderId}`)

    if (!customerEmail || !customerName) {
      console.warn('[Email Server] Validation Failed: Missing email or name', { customerEmail, customerName })
      return { success: false, error: 'Missing customer details (email/name)' }
    }

    // 1. Authenticate with Gmail
    const user = config.gmailUser
    const pass = config.gmailAppPassword

    if (!user || !pass) {
      console.error('[Email Server] CRITICAL: GMAIL credentials missing in runtimeConfig')
      return { success: false, error: 'Email service not configured on server' }
    }

    // Recommended SMTP settings for Gmail to increase deliverability
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: { user, pass }
    })

    // 2. Build the Items HTML with smarter data detection
    const safeItems = Array.isArray(items) ? items : []
    const itemsHtml = safeItems.map((item: any) => {
      // Handle both raw products and joined order_items
      const productName = item.name || item.product?.name || 'Handcrafted Drink'
      
      // Robust customizations parsing (handles null/undefined/objects)
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
    }).format(totalPrice || 0)

    // 3. Dispatch the Email
    const mailOptions = {
      from: `"Drip & Brew" <${user}>`,
      to: customerEmail,
      subject: `❗ Your Drip & Brew order is ready! ☕`,
      priority: 'high' as const,
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
            <p style="margin: 20px 0 0 0; font-size: 9px; color: #dddddd; text-transform: uppercase; letter-spacing: 0.1em;">Ref: ${orderId?.toString().toUpperCase() || 'N/A'}</p>
          </div>
        </div>
      `
    }

    const info = await transporter.sendMail(mailOptions)
    console.log('[Email Server] Success: Email sent!', info.messageId)
    
    return { success: true, messageId: info.messageId }

  } catch (err: any) {
    console.error('[Email Server] FATAL ERROR:', err.message)
    // BIG-TECH TIP: Don't reveal internal stack traces to clients, but log them for the dev.
    throw createError({
      statusCode: 500,
      statusMessage: `Email Dispatch Failed: ${err.message}`
    })
  }
})
