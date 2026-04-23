import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '~/types/supabase'

/**
 * Composable to access the centralized Supabase client.
 * 
 * We use this rather than direct imports to ensure we are using the 
 * single, typed instance provided by the Nuxt application context.
 */
export const useSupabase = () => {
  const { $supabase } = useNuxtApp()

  // Return the typed client directly
  return $supabase as SupabaseClient<Database>
}
