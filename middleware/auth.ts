import { useSupabase } from '~/composables/useSupabase'

/**
 * Route Middleware: Protects POS routes from unauthenticated access.
 * 
 * SECURITY AUDIT UPDATE:
 * Now relies on session-isolated Supabase auth (configured in plugins/supabase.ts).
 */
export default defineNuxtRouteMiddleware(async (to, from) => {
  const supabase = useSupabase()
  
  // 1. Get the current Supabase session
  // Since storage is now sessionStorage, this will naturally be null 
  // if the user hasn't logged in during THIS browser session/tab.
  const { data: { session } } = await supabase.auth.getSession()

  const isLoginPage = to.path === '/pos/login'

  // 2. Redirect if not authenticated
  if (!session && !isLoginPage) {
    return navigateTo('/pos/login')
  }

  // 3. Redirect if already authenticated and hitting login page
  if (session && isLoginPage) {
    return navigateTo('/pos')
  }
})
