import { useSupabase } from '~/composables/useSupabase'

/**
 * Route Middleware: Protects POS routes from unauthenticated access.
 * 
 * In Nuxt 3, middleware runs on BOTH server-side (initial load) 
 * and client-side (navigation).
 */
export default defineNuxtRouteMiddleware(async (to, from) => {
  const supabase = useSupabase()

  // 1. Check if a session exists
  const { data: { session } } = await supabase.auth.getSession()

  // 2. If no session exists and we are NOT on the login page, redirect to login
  if (!session && to.path !== '/pos/login') {
    return navigateTo('/pos/login')
  }

  // 3. If a session exists and we ARE on the login page, redirect to the dashboard
  if (session && to.path === '/pos/login') {
    return navigateTo('/pos')
  }
})
