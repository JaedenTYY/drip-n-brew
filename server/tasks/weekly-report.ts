
import { createClient } from '@supabase/supabase-js'
import type { Database } from '~/types/supabase'
import type { InventoryItem } from '~/types'

export default defineTask({
  meta: {
    name: 'weekly-report',
    description: 'Sends the weekly inventory status report.'
  },
  async run({ payload, context }: { payload: any; context: any }) {
    const config = useRuntimeConfig()
    
    try {
      console.log('[Task] Starting weekly-report...')
      const supabase = createClient<Database>(config.public.supabaseUrl, config.supabaseServiceKey)
      
      // 1. Fetch settings to get mailing list
      const { data: settingsData, error: settingsError } = await supabase
        .from('settings')
        .select('*')
        .eq('key', 'inventory_config')
        .single()
        
      if (settingsError || !settingsData) {
        console.error('[Task] Could not fetch settings or no settings found.', settingsError)
        return { result: 'failed', error: 'No settings' }
      }
      
      // Dynamic Scheduling Check
      const klDateStr = new Date().toLocaleString("en-US", { timeZone: "Asia/Kuala_Lumpur" })
      const klDate = new Date(klDateStr)
      const currentDay = klDate.getDay() // 0 = Sunday
      const currentHour = klDate.getHours()
      const currentMinute = klDate.getMinutes()

      const targetDay = settingsData.value?.report_day ?? 0
      const [targetHourStr, targetMinuteStr] = (settingsData.value?.report_time || "16:30").split(':')
      const targetHour = parseInt(targetHourStr, 10)
      const targetMinute = parseInt(targetMinuteStr, 10)

      if (currentDay !== targetDay || currentHour !== targetHour || currentMinute !== targetMinute) {
        console.log(`[Task] Skipping. Current time (Day ${currentDay}, ${currentHour}:${currentMinute}) does not match target (Day ${targetDay}, ${targetHour}:${targetMinute}).`)
        return { result: 'skipped', reason: 'Not the scheduled time' }
      }
      
      const mailingList = settingsData.value?.mailing_list
      if (!mailingList) {
        console.log('[Task] No mailing list configured. Skipping report.')
        return { result: 'skipped', reason: 'No mailing list' }
      }

      // 2. Fetch inventory items
      const { data: items, error: itemsError } = await supabase
        .from('inventory_items')
        .select('*')
        .order('name', { ascending: true })
        
      if (itemsError || !items) {
        console.error('[Task] Failed to fetch inventory items.', itemsError)
        return { result: 'failed', error: 'Failed to fetch items' }
      }

      // 3. Send email using the existing API endpoint
      // Note: During local dev or cron environments, we don't have a reliable window.location.origin,
      // so we construct a placeholder or fallback URL. If you deploy to a specific domain, consider adding a NUXT_PUBLIC_SITE_URL env variable.
      const siteUrl = config.public.siteUrl || 'https://drip-n-brew.com'
      const inventoryLink = `${siteUrl}/shared-stock`

      await $fetch('/api/send-inventory-report', {
        method: 'POST',
        body: {
          recipients: mailingList,
          items: items as InventoryItem[],
          senderEmail: 'System (Cron)',
          inventoryLink
        }
      })
      
      console.log('[Task] Weekly report sent successfully.')
      return { result: 'success' }
    } catch (err: any) {
      console.error('[Task] Unhandled error during weekly-report:', err)
      return { result: 'failed', error: err.message }
    }
  }
})
