<script setup lang="ts">
import { useSupabase } from '~/composables/useSupabase'
import { useTheme } from '~/composables/useTheme'

useHead({
  title: 'Login'
})

// Define this page to use our auth middleware
definePageMeta({
  layout: false, // Often POS logins use a clean, focused layout
  middleware: 'auth'
})

const supabase = useSupabase()
const { isDark } = useTheme()
const email = ref('')
const password = ref('')
const isLoading = ref(false)
const errorMessage = ref<string | null>(null)

const handleLogin = async () => {
  isLoading.value = true
  errorMessage.value = null

  try {
    const { error } = await supabase.auth.signInWithPassword({
      email: email.value,
      password: password.value,
    })

    if (error) throw error

    // On success, the middleware will handle the redirect, 
    // but we can also trigger it manually for a faster feel.
    navigateTo('/pos')
  } catch (err: any) {
    errorMessage.value = err.message || 'Invalid login credentials.'
  } finally {
    isLoading.value = false
  }
}
</script>

<template>
  <div class="min-h-screen bg-white dark:bg-black flex flex-col items-center justify-center p-6 transition-colors duration-300">
    <div class="w-full max-w-md">
      <!-- POS Brand -->
      <div class="text-center mb-10 flex flex-col items-center">
        <!-- Re-designed Logo Container for Login -->
        <div class="h-24 w-24 flex items-center justify-center rounded-[2rem] bg-white shadow-2xl border-[4px] border-white ring-1 ring-gray-100 dark:ring-gray-800 overflow-hidden mb-6 transition-all duration-700 hover:scale-110">
           <img src="/favicon.ico" class="h-full w-full object-contain p-1" alt="Drip & Brew Logo" />
        </div>
        <h1 class="text-3xl font-black text-gray-900 dark:text-white tracking-tight uppercase italic leading-none">Drip & Brew</h1>
        <p class="text-orange-600 mt-3 font-black uppercase text-[10px] tracking-[0.3em]">Barista Portal</p>
      </div>

      <!-- Login Card -->
      <div class="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 p-8 rounded-[2.5rem] shadow-2xl transition-colors duration-300">
        <form @submit.prevent="handleLogin" class="space-y-6">
          <div>
            <label for="email" class="block text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-[0.2em] mb-2.5 ml-1">Email Address</label>
            <input
              id="email"
              v-model="email"
              type="email"
              required
              class="w-full bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-2xl px-5 py-4 text-gray-900 dark:text-white focus:ring-2 focus:ring-orange-600 focus:border-transparent outline-none transition-all placeholder:text-gray-300 dark:placeholder:text-gray-600"
              placeholder="barista@dripbrew.com"
            />
          </div>

          <div>
            <label for="password" class="block text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-[0.2em] mb-2.5 ml-1">Password</label>
            <input
              id="password"
              v-model="password"
              type="password"
              required
              class="w-full bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-2xl px-5 py-4 text-gray-900 dark:text-white focus:ring-2 focus:ring-orange-600 focus:border-transparent outline-none transition-all placeholder:text-gray-300 dark:placeholder:text-gray-600"
              placeholder="••••••••"
            />
          </div>

          <div v-if="errorMessage" class="p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-[11px] text-red-600 dark:text-red-400 font-bold uppercase tracking-wider">
            ⚠️ {{ errorMessage }}
          </div>

          <button
            type="submit"
            :disabled="isLoading"
            class="w-full bg-orange-600 text-white py-5 rounded-2xl font-black uppercase tracking-widest hover:bg-orange-700 transition-all active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-3 shadow-xl shadow-orange-900/20"
          >
            <svg v-if="isLoading" class="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            {{ isLoading ? 'Authenticating...' : 'Sign In' }}
          </button>
        </form>
      </div>

      <p class="text-center mt-10 text-gray-300 dark:text-gray-700 text-[10px] uppercase tracking-[0.2em] font-black italic">
        &copy; 2026 Harvest Generation
      </p>
    </div>
  </div>
</template>

<style scoped>
* {
  @apply transition-colors duration-200;
}
</style>
