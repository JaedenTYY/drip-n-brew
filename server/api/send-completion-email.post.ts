import { defineEventHandler, readBody } from 'h3'
import nodemailer from 'nodemailer'

/**
 * Server route to handle sending order completion emails via Gmail/Nodemailer.
 * This approach bypasses domain verification requirements for testing.
 */
export default defineEventHandler(async (event) => {
  try {
    const body = await readBody(event)
    const { customerEmail, customerName, items, totalPrice, orderId } = body

    console.log(`[Email Server] Processing Order: ${orderId} for ${customerEmail}`)

    if (!customerEmail || !customerName) {
      return { success: false, error: 'Missing customer details' }
    }

    // 1. Authenticate with Gmail
    // Ensure you have added these to your .env file
    const user = process.env.GMAIL_USER
    const pass = process.env.GMAIL_APP_PASSWORD

    if (!user || !pass) {
      console.error('[Email Server] GMAIL_USER or GMAIL_APP_PASSWORD missing')
      return { success: false, error: 'Email service config missing' }
    }

    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: { user, pass }
    })

    // 2. Build the Items HTML
    const safeItems = Array.isArray(items) ? items : []
    const itemsHtml = safeItems.map((item: any) => {
      const customizationList = item.customizations ? Object.values(item.customizations) : []
      const customizations = customizationList.length > 0 ? customizationList.join(' • ') : ''
        
        return `
          <div style="padding: 12px 0; border-bottom: 1px solid #f0f0f0;">
            <p style="margin: 0; font-family: sans-serif; font-size: 16px; font-weight: 800; color: #000000; text-transform: uppercase;">
              ${item.quantity || 1}x ${item.name || 'Drink'}
            </p>
            ${customizations ? `<p style="margin: 4px 0 0 0; font-family: sans-serif; font-size: 12px; color: #888888; text-transform: uppercase; letter-spacing: 0.05em;">${customizations}</p>` : ''}
          </div>
        `
      }).join('')

      const formattedTotal = new Intl.NumberFormat('en-MY', {
        style: 'currency',
        currency: 'MYR'
      }).format(totalPrice || 0)

      // 3. Send the Email
      await transporter.sendMail({
        from: `"Drip & Brew" <${user}>`,
      to: customerEmail,
      subject: `❗ Your Drip & Brew order is ready! ☕`,
      // BIG-TECH TIP: We use priority headers to make the email stand out.
      // While we can't force a "Star", this is the professional equivalent.
      priority: 'high',
      headers: {
        'X-Priority': '1 (Highest)',
        'X-MSMail-Priority': 'High',
        'Importance': 'High'
      },
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 40px 20px; color: #000000; background-color: #ffffff;">
          <!-- Header -->
          <div style="border-bottom: 4px solid #000000; padding-bottom: 20px; margin-bottom: 30px; text-align: center;">
            <h1 style="margin: 0; font-size: 32px; font-weight: 900; font-style: italic; text-transform: uppercase; letter-spacing: -0.05em;">
              Drip & Brew
            </h1>
          </div>

          <h2 style="font-size: 24px; font-weight: 900; margin: 0 0 10px 0; letter-spacing: -0.02em;">Hi ${customerName},</h2>
          <p style="font-size: 16px; color: #666666; line-height: 1.5; margin: 0 0 30px 0;">
            Your handcrafted order is ready for pickup! Come by the counter and let our baristas know you're here.
          </p>

          <!-- Items Hero Section -->
          <div style="background-color: #ffffff; border: 2px solid #000000; border-radius: 20px; padding: 25px; margin-bottom: 30px;">
            <p style="margin: 0 0 15px 0; font-size: 10px; font-weight: 900; color: #aaaaaa; text-transform: uppercase; letter-spacing: 0.2em;">Order Summary</p>
            
            ${itemsHtml}

            <div style="margin-top: 20px; padding-top: 15px; text-align: right;">
              <span style="font-size: 12px; font-weight: 900; text-transform: uppercase; margin-right: 10px; color: #aaaaaa;">Total Paid</span>
              <span style="font-size: 24px; font-weight: 900; color: #ea580c;">${formattedTotal}</span>
            </div>
          </div>

          <!-- Footer -->
          <div style="text-align: center; border-top: 1px solid #f0f0f0; padding-top: 30px;">
            <p style="margin: 0; font-size: 12px; font-weight: 800; text-transform: uppercase; color: #aaaaaa;">
              Thank you for choosing <br/>
              <span style="color: #000000; font-size: 14px;">Drip & Brew</span>
            </p>
            <p style="margin: 20px 0 0 0; font-size: 9px; color: #dddddd; text-transform: uppercase; letter-spacing: 0.1em;">Ref: ${orderId}</p>
          </div>
        </div>
      `
    })

    console.log('[Email Server] Success: Email sent to', customerEmail)
    return { success: true }

  } catch (err: any) {
    console.error('[Email Server] Global Error:', err.message)
    return { success: false, error: err.message }
  }
})
