import { createClient } from '@supabase/supabase-js'
import type { Database } from '~/types/supabase'

/**
 * Nuxt 3 Plugin to initialize the Supabase client.
 * 
 * FIX: Nuxt Context Error during background token refresh.
 * We use a custom adapter that relies on standard document.cookie for the client,
 * avoiding the Nuxt `useCookie` composable which throws errors outside of setup functions.
 */
export default defineNuxtPlugin(() => {
  const config = useRuntimeConfig()

  const supabaseUrl = (config.public.supabaseUrl as string || '').trim().replace(/^["'](.+)["']$/, '$1').replace(/\/$/, '')
  const supabaseKey = (config.public.supabaseKey as string || '').trim().replace(/^["'](.+)["']$/, '$1')

  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Supabase configuration missing.')
  }

  // Safe Cookie Adapter
  // This uses standard web APIs on the client, avoiding Nuxt Context requirements.
  const cookieStorage = {
    getItem: (key: string): string | null => {
      if (typeof document === 'undefined') return null;
      const match = document.cookie.match(new RegExp('(^| )' + key + '=([^;]+)'));
      if (match) {
        try {
          return decodeURIComponent(match[2]);
        } catch {
          return match[2];
        }
      }
      return null;
    },
    setItem: (key: string, value: string): void => {
      if (typeof document === 'undefined') return;
      // Session cookie: no expires/max-age. Path=/ ensures it's available everywhere.
      document.cookie = `${key}=${encodeURIComponent(value)}; path=/; samesite=lax`;
    },
    removeItem: (key: string): void => {
      if (typeof document === 'undefined') return;
      document.cookie = `${key}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT`;
    }
  }

  const supabase = createClient<Database>(supabaseUrl, supabaseKey, {
    auth: {
      storage: cookieStorage,
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true
    }
  })

  return {
    provide: {
      supabase
    }
  }
})
