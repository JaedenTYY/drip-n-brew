import { defineEventHandler } from 'h3'
import { createClient } from '@supabase/supabase-js'

export default defineEventHandler(async () => {
  const config = useRuntimeConfig()
  const supabase = createClient(config.public.supabaseUrl, config.supabaseServiceKey)
  
  try {
    const { data } = await supabase
      .from('settings')
      .select('value')
      .eq('key', 'category_order')
      .single()
      
    return data?.value || []
  } catch (err) {
    return []
  }
})
