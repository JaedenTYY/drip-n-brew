import { defineEventHandler } from 'h3'
import { createClient } from '@supabase/supabase-js'
import type { Database } from '~/types/supabase'

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  
  try {
    const supabase = createClient<Database>(config.public.supabaseUrl, config.supabaseServiceKey)
    const { data, error } = await supabase
      .from('inventory_items')
      .select('*')
      .order('name', { ascending: true })

    if (error) throw error

    return { success: true, data }
  } catch (err: any) {
    console.error('[Shared Inventory API] Error:', err.message)
    return { success: false, error: err.message }
  }
})
