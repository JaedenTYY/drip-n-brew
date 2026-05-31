import { defineEventHandler, readBody } from 'h3'
import nodemailer from 'nodemailer'
import { createClient } from '@supabase/supabase-js'
import type { Database } from '~/types/supabase'

/**
 * Server route to handle sending inventory status alerts.
 */
export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  
  try {
    const body = await readBody(event)
    const { recipients, itemName, previousQty, newQty, delta, notes, expiryDate, updatedBy } = body

    if (!recipients) return { success: false, error: 'No recipients' }

    // --- 1. Data Fetching ---
    const supabase = createClient<Database>(config.public.supabaseUrl, config.supabaseServiceKey)
    const { data: analytics } = await supabase.rpc('get_weekly_analytics').limit(1)
    const stats = analytics?.[0]

    // --- 2. Email Prep ---
    const currency = new Intl.NumberFormat('en-MY', { style: 'currency', currency: 'MYR' })
    const summary = {
      dateRange: stats ? getWeekRange(stats.date) : 'New Week',
      orders: stats?.total_orders_count || 0,
      grossOrder: currency.format(stats?.gross_sales || 0),
      sales: currency.format(stats?.net_sales || 0),
      cupsSold: stats?.total_cups_sold || 0
    }

    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: { user: config.gmailUser, pass: config.gmailAppPassword }
    })

    const isIncrease = delta > 0
    const deltaText = isIncrease ? `+${delta}` : delta

    await transporter.sendMail({
      from: `"Drip & Brew Inventory" <${config.gmailUser}>`,
      to: recipients,
      subject: `📦 Inventory Alert: ${itemName} updated by ${updatedBy}`,
      priority: 'high',
      html: `
        <div style="font-family: sans-serif; max-width: 500px; margin: 0 auto; padding: 30px; border: 1px solid #eeeeee; border-radius: 20px;">
          <h1 style="font-size: 18px; font-weight: 900; color: #ea580c; border-bottom: 2px solid #ea580c; padding-bottom: 10px; text-transform: uppercase;">Stock Alert</h1>
          
          <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
            ${row('Item', itemName)}
            ${row('Status Change', `${previousQty} ➔ ${newQty} (${deltaText})`, isIncrease ? '#16a34a' : '#dc2626')}
            ${row('Updated By', updatedBy)}
            ${expiryDate ? row('Nearest Expiry', expiryDate, '#ea580c') : ''}
          </table>

          <div style="padding: 15px; background-color: #f9fafb; border-radius: 12px; border: 1px solid #f1f5f9; margin-bottom: 25px;">
            <p style="margin: 0 0 5px 0; font-size: 10px; font-weight: 900; color: #aaaaaa; text-transform: uppercase;">Notes</p>
            <p style="margin: 0; font-size: 12px; font-weight: 600; color: #333333;">${notes || 'None'}</p>
          </div>

          <div style="border-top: 1px dashed #dddddd; padding-top: 15px;">
            <p style="margin: 0 0 10px 0; font-size: 10px; font-weight: 900; color: #888888; text-transform: uppercase;">Weekly Performance</p>
            <table style="width: 100%; border-collapse: separate; border-spacing: 5px;">
              <tr>
                ${card('Week Range', summary.dateRange)}
                ${card('Orders', summary.orders)}
              </tr>
              <tr>
                ${card('Gross Orders', summary.grossOrder)}
                ${card('Sales', summary.sales)}
              </tr>
              <tr>
                ${card('Cups Sold', summary.cupsSold, true)}
              </tr>
            </table>
          </div>
        </div>
      `
    })

    return { success: true }
  } catch (err: any) {
    console.error('[Alert Email] Error:', err.message)
    return { success: false, error: err.message }
  }
})

// --- Helpers ---
function getWeekRange(dateStr: string) {
  const start = new Date(dateStr)
  const end = new Date(start)
  end.setDate(start.getDate() + 6)
  const f = (d: Date) => d.toLocaleDateString('en-MY', { month: 'short', day: 'numeric', timeZone: 'Asia/Kuala_Lumpur' })
  return `${f(start)} - ${f(end)}`
}

function row(label: string, value: string, color = '#1e293b') {
  return `
    <tr>
      <td style="padding: 8px 0; color: #888888; font-size: 11px; text-transform: uppercase; font-weight: 900;">${label}</td>
      <td style="padding: 8px 0; font-weight: 900; font-size: 14px; text-align: right; color: ${color};">${value}</td>
    </tr>
  `
}

function card(label: string, value: string | number, wide = false) {
  return `
    <td style="background: #f8fafc; padding: 10px; border-radius: 8px; width: ${wide ? '100%' : '50%'};" ${wide ? 'colspan="2"' : ''}>
      <p style="margin: 0; font-size: 9px; color: #64748b; font-weight: 800; text-transform: uppercase;">${label}</p>
      <p style="margin: 0; font-size: 12px; font-weight: 900; color: #1e293b;">${value}</p>
    </td>
  `
}
