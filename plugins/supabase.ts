import { createClient } from '@supabase/supabase-js'
import type { Database } from '~/types/supabase'

/**
 * Nuxt 3 Plugin to initialize the Supabase client.
 * This ensures the client is created once and available throughout the app context
 * on both the server and client sides.
 */
export default defineNuxtPlugin(() => {
  const config = useRuntimeConfig()

  // 1. Clean up the URL: Trim whitespace and remove surrounding quotes (common .env mistakes)
  let supabaseUrl = (config.public.supabaseUrl as string || '').trim().replace(/^["'](.+)["']$/, '$1').replace(/\/$/, '')
  const supabaseKey = (config.public.supabaseKey as string || '').trim().replace(/^["'](.+)["']$/, '$1')

  // 2. Validation check
  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Supabase configuration missing. Please check your .env file for SUPABASE_URL and SUPABASE_KEY.')
  }

  // 3. Ensure it starts with a protocol
  if (!supabaseUrl.startsWith('http')) {
    throw new Error(`Invalid Supabase URL: "${supabaseUrl}". It must start with http:// or https://`)
  }

  const supabase = createClient<Database>(supabaseUrl, supabaseKey)

  return {
    provide: {
      supabase
    }
  }
})
