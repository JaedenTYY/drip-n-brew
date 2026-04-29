import { defineEventHandler, readBody } from 'h3'
import nodemailer from 'nodemailer'

/**
 * Server route to handle sending inventory status alerts to the configured mailing list.
 */
export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  try {
    const body = await readBody(event)
    const { recipients, itemName, previousQty, newQty, delta, notes, expiryDate, updatedBy } = body

    if (!recipients) {
      return { success: false, error: 'No recipients configured' }
    }

    // 1. Authenticate with Gmail
    const user = config.gmailUser
    const pass = config.gmailAppPassword

    if (!user || !pass) {
      console.error('[Inventory Email] GMAIL configuration missing')
      return { success: false, error: 'Email service config missing' }
    }

    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: { user, pass }
    })

    const isIncrease = delta > 0
    const deltaText = isIncrease ? `+${delta}` : delta

    // 3. Send the Email
    await transporter.sendMail({
      from: `"Drip & Brew Inventory" <${user}>`,
      to: recipients,
      subject: `📦 Inventory Alert: ${itemName} updated by ${updatedBy}`,
      priority: 'high',
      html: `
        <div style="font-family: sans-serif; max-width: 500px; margin: 0 auto; padding: 30px; border: 1px solid #eeeeee; border-radius: 20px;">
          <h1 style="font-size: 18px; font-weight: 900; text-transform: uppercase; letter-spacing: 0.1em; color: #ea580c; margin-bottom: 20px; border-bottom: 2px solid #ea580c; padding-bottom: 10px;">
            Stock Adjustment Alert
          </h1>
          
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="padding: 8px 0; color: #888888; font-size: 11px; text-transform: uppercase; font-weight: 900;">Item</td>
              <td style="padding: 8px 0; font-weight: 900; font-size: 14px; text-align: right; text-transform: uppercase;">${itemName}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #888888; font-size: 11px; text-transform: uppercase; font-weight: 900;">Status Change</td>
              <td style="padding: 8px 0; font-weight: 900; font-size: 14px; text-align: right; color: ${isIncrease ? '#16a34a' : '#dc2626'}">${previousQty} ➔ ${newQty} (${deltaText})</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #888888; font-size: 11px; text-transform: uppercase; font-weight: 900;">Updated By</td>
              <td style="padding: 8px 0; font-weight: 900; font-size: 14px; text-align: right;">${updatedBy}</td>
            </tr>
            ${expiryDate ? `
            <tr>
              <td style="padding: 8px 0; color: #888888; font-size: 11px; text-transform: uppercase; font-weight: 900;">Nearest Expiry</td>
              <td style="padding: 8px 0; font-weight: 900; font-size: 14px; text-align: right; color: #ea580c;">${expiryDate}</td>
            </tr>
            ` : ''}
          </table>

          <div style="margin-top: 20px; padding: 15px; background-color: #f9fafb; border-radius: 12px; border: 1px solid #f1f5f9;">
            <p style="margin: 0 0 5px 0; font-size: 10px; font-weight: 900; color: #aaaaaa; text-transform: uppercase;">Barista Notes</p>
            <p style="margin: 0; font-size: 12px; font-weight: 600; color: #333333;">${notes || 'No additional notes provided.'}</p>
          </div>

          <p style="margin-top: 30px; font-size: 10px; color: #bbbbbb; text-align: center; text-transform: uppercase; letter-spacing: 0.1em;">
            Sent automatically by Drip & Brew POS
          </p>
        </div>
      `
    })

    console.log('[Inventory Email] Success: Alert sent to', recipients)
    return { success: true }

  } catch (err: any) {
    console.error('[Inventory Email] Global Error:', err.message)
    return { success: false, error: err.message }
  }
})
