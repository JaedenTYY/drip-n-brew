import type { ShopStatusConfig, DaySchedule } from '~/types'

const TIMEZONE = 'Asia/Kuala_Lumpur'

/**
 * Default 7-day operating schedule.
 * Only Sunday is enabled by default, matching Drip & Brew's primary operating day.
 */
export const getDefaultShopStatus = (): ShopStatusConfig => ({
  manual_override: null,
  schedule: [
    { day: 0, label: 'Sunday', enabled: true, open_time: '08:30', close_time: '13:00' },
    { day: 1, label: 'Monday', enabled: false, open_time: '08:30', close_time: '13:00' },
    { day: 2, label: 'Tuesday', enabled: false, open_time: '08:30', close_time: '13:00' },
    { day: 3, label: 'Wednesday', enabled: false, open_time: '08:30', close_time: '13:00' },
    { day: 4, label: 'Thursday', enabled: false, open_time: '08:30', close_time: '13:00' },
    { day: 5, label: 'Friday', enabled: false, open_time: '08:30', close_time: '13:00' },
    { day: 6, label: 'Saturday', enabled: false, open_time: '08:30', close_time: '13:00' }
  ],
  updated_at: new Date(0).toISOString()
})

/**
 * Extracts the current date ('YYYY-MM-DD'), day of week (0-6), and 24-hour time ('HH:mm')
 * in Malaysia Time (Asia/Kuala_Lumpur), ensuring consistent evaluation across client and server.
 */
export const getMYTTimeContext = (now = new Date()) => {
  const dateStr = now.toLocaleDateString('en-CA', { timeZone: TIMEZONE }) // 'YYYY-MM-DD'

  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: TIMEZONE,
    weekday: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  }).formatToParts(now)

  const weekdayMap: Record<string, number> = {
    Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6
  }
  const weekdayStr = parts.find(p => p.type === 'weekday')?.value || 'Sun'
  const dayOfWeek = weekdayMap[weekdayStr] ?? 0

  let hour = parts.find(p => p.type === 'hour')?.value || '00'
  if (hour === '24') hour = '00'
  const minute = parts.find(p => p.type === 'minute')?.value || '00'
  const currentHM = `${hour}:${minute}`

  return { dateStr, dayOfWeek, currentHM }
}

/**
 * Pure function that evaluates whether the shop is currently open.
 * Priority 1: Same-day manual override (`manual_override.date === today`).
 * Priority 2: Today's recurring schedule window (`open_time <= currentHM < close_time`).
 */
export const evaluateShopOpen = (config: ShopStatusConfig | null | undefined, now = new Date()): boolean => {
  const safeConfig = config?.schedule ? config : getDefaultShopStatus()
  const { dateStr, dayOfWeek, currentHM } = getMYTTimeContext(now)

  if (safeConfig.manual_override && safeConfig.manual_override.date === dateStr) {
    return safeConfig.manual_override.status === 'open'
  }

  const todaySchedule = safeConfig.schedule.find(d => d.day === dayOfWeek)
  if (!todaySchedule || !todaySchedule.enabled) return false

  return currentHM >= todaySchedule.open_time && currentHM < todaySchedule.close_time
}

/**
 * Formats a 24h 'HH:mm' string into human-readable 12h time (e.g., '8:30 AM').
 */
export const formatTime12h = (hm: string): string => {
  if (!hm || !hm.includes(':')) return hm
  const [hStr, mStr] = hm.split(':')
  const h = parseInt(hStr, 10)
  const suffix = h >= 12 ? 'PM' : 'AM'
  const hour12 = h % 12 === 0 ? 12 : h % 12
  return `${hour12}:${mStr} ${suffix}`
}

let realtimeChannel: any = null
let clockInterval: ReturnType<typeof setInterval> | null = null
let visibilityListenerAttached = false

/**
 * Reactive composable for managing and reading Drip & Brew's operating status.
 */
export const useShopStatus = () => {
  const supabase = useSupabase()
  const shopConfig = useState<ShopStatusConfig>('shop_status_config', () => getDefaultShopStatus())
  const now = useState<Date>('shop_status_now', () => new Date())
  const isLoaded = useState<boolean>('shop_status_loaded', () => false)
  const isSaving = ref(false)

  const isShopOpen = computed(() => evaluateShopOpen(shopConfig.value, now.value))

  /**
   * Returns true if a manual override is actively governing today's status.
   */
  const hasActiveOverrideToday = computed(() => {
    const { dateStr } = getMYTTimeContext(now.value)
    return Boolean(shopConfig.value.manual_override && shopConfig.value.manual_override.date === dateStr)
  })

  /**
   * Human-readable summary of when the shop opens next (or closes today).
   */
  const statusSummary = computed(() => {
    const { dateStr, dayOfWeek, currentHM } = getMYTTimeContext(now.value)
    const cfg = shopConfig.value

    if (cfg.manual_override && cfg.manual_override.date === dateStr) {
      return cfg.manual_override.status === 'open'
        ? 'Open (Manual Override)'
        : 'Closed for Today'
    }

    const todaySchedule = cfg.schedule.find(d => d.day === dayOfWeek)
    if (isShopOpen.value && todaySchedule) {
      return `Open until ${formatTime12h(todaySchedule.close_time)}`
    }

    // If closed, find next opening window
    if (todaySchedule?.enabled && currentHM < todaySchedule.open_time) {
      return `Opens today at ${formatTime12h(todaySchedule.open_time)}`
    }

    for (let offset = 1; offset <= 7; offset++) {
      const nextDayIndex = (dayOfWeek + offset) % 7
      const candidate = cfg.schedule.find(d => d.day === nextDayIndex)
      if (candidate?.enabled) {
        const dayLabel = offset === 1 ? 'Tomorrow' : candidate.label
        return `Opens ${dayLabel} at ${formatTime12h(candidate.open_time)}`
      }
    }

    return 'Currently Closed'
  })

  /**
   * Fetches the shop status via our server API (which uses the service role key
   * to bypass RLS restrictions on the `settings` table for anonymous storefront users).
   */
  const fetchShopStatus = async () => {
    try {
      const data = await $fetch<ShopStatusConfig>('/api/settings/shop-status', {
        query: { t: Date.now() }
      })

      if (data && Array.isArray(data.schedule)) {
        shopConfig.value = data
      }
    } catch {
      // Fallback to default schedule on network error
    } finally {
      isLoaded.value = true
      now.value = new Date()
    }
  }

  /**
   * Initializes Realtime subscription, visibility sync, and 15-second poll on the client.
   */
  const initShopStatusSync = () => {
    if (!process.client) return

    // Always fetch fresh status when a page mounts
    fetchShopStatus()

    if (!clockInterval) {
      clockInterval = setInterval(() => {
        fetchShopStatus()
      }, 15000)
    }

    if (!visibilityListenerAttached && typeof window !== 'undefined') {
      visibilityListenerAttached = true
      window.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') {
          fetchShopStatus()
        }
      })
      window.addEventListener('focus', () => {
        fetchShopStatus()
      })
    }

    if (!realtimeChannel) {
      realtimeChannel = supabase
        .channel('shop-status-sync')
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'settings', filter: 'key=eq.shop_status' },
          (payload: any) => {
            if (payload.new?.value) {
              shopConfig.value = payload.new.value as ShopStatusConfig
              now.value = new Date()
            }
          }
        )
        .subscribe()
    }
  }

  /**
   * Saves updated ShopStatusConfig via the authenticated POS server endpoint.
   */
  const saveShopStatus = async (nextConfig: ShopStatusConfig) => {
    isSaving.value = true
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) throw new Error('Authentication required')

      const res: any = await $fetch('/api/settings/shop-status', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${session.access_token}`
        },
        body: nextConfig
      })

      if (!res.success) {
        throw new Error(res.error || 'Failed to update shop status')
      }

      shopConfig.value = res.data
      now.value = new Date()
      return { success: true }
    } catch (err: any) {
      return { success: false, error: err.message }
    } finally {
      isSaving.value = false
    }
  }

  /**
   * POS Quick Action: Force Open or Force Close for today, or clear override to resume Auto Schedule.
   */
  const setManualOverride = async (mode: 'open' | 'closed' | 'auto') => {
    const { dateStr } = getMYTTimeContext(new Date())
    const nextConfig: ShopStatusConfig = {
      ...shopConfig.value,
      manual_override: mode === 'auto' ? null : { status: mode, date: dateStr },
      updated_at: new Date().toISOString()
    }
    return await saveShopStatus(nextConfig)
  }

  /**
   * POS Action: Save updated 7-day recurring schedule.
   */
  const updateSchedule = async (schedule: DaySchedule[]) => {
    const nextConfig: ShopStatusConfig = {
      ...shopConfig.value,
      schedule,
      updated_at: new Date().toISOString()
    }
    return await saveShopStatus(nextConfig)
  }

  return {
    shopConfig,
    isShopOpen,
    isLoaded,
    isSaving,
    hasActiveOverrideToday,
    statusSummary,
    fetchShopStatus,
    initShopStatusSync,
    setManualOverride,
    updateSchedule,
    formatTime12h
  }
}
