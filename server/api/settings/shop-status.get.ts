import { defineEventHandler } from 'h3'
import { createClient } from '@supabase/supabase-js'
import { getDefaultShopStatus } from '~/composables/useShopStatus'

export default defineEventHandler(async () => {
  const config = useRuntimeConfig()
  const supabase = createClient(
    config.public.supabaseUrl,
    config.supabaseServiceKey || config.public.supabaseKey
  )

  try {
    const { data } = await supabase
      .from('settings')
      .select('value')
      .eq('key', 'shop_status')
      .single()

    return data?.value || getDefaultShopStatus()
  } catch {
    return getDefaultShopStatus()
  }
})
