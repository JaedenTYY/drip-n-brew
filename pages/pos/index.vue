<script setup lang="ts">
import { useOrdersStore } from '~/stores/orders'
import { useSupabase } from '~/composables/useSupabase'
import PosOrderBoard from '~/components/pos/PosOrderBoard.vue'
import { useTheme } from '~/composables/useTheme'

useHead({
  title: 'Dashboard'
})

definePageMeta({
  middleware: 'auth'
})

const ordersStore = useOrdersStore()
const supabase = useSupabase()
const { isDark, toggleTheme } = useTheme()

const handleLogout = async () => {
  await supabase.auth.signOut()
  navigateTo('/pos/login')
}

onMounted(() => {
  ordersStore.fetchActiveOrders()
  ordersStore.initializeRealtime()
})

onUnmounted(() => {
  ordersStore.cleanupRealtime()
})
</script>

<template>
  <div class="h-screen flex flex-col overflow-hidden transition-colors duration-300">
    <!-- POS Header -->
    <header class="flex-shrink-0 px-6 py-5 flex items-center justify-between border-b border-gray-100 dark:border-gray-800 bg-white dark:bg-black">
      <div class="flex items-center gap-4">
        <div class="h-10 w-10 flex items-center justify-center rounded-xl bg-orange-600 text-white shadow-lg shadow-orange-600/20 overflow-hidden">
          <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
        </div>
        <div>
          <h1 class="text-xl font-black uppercase italic tracking-tighter text-gray-900 dark:text-white leading-none">Drip & Brew POS</h1>
          <p class="text-[9px] font-bold text-gray-500 uppercase tracking-[0.2em] mt-1">Active Pipeline</p>
        </div>
      </div>

      <div class="flex items-center gap-3">
        <!-- Theme Toggle -->
        <button 
          @click="toggleTheme"
          class="flex items-center justify-center w-9 h-9 rounded-xl border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900 text-gray-500 dark:text-gray-400 hover:border-orange-600 transition-all"
          :title="isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'"
        >
          <svg v-if="isDark" xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364-6.364l-.707.707M6.343 17.657l-.707.707m12.728 0l-.707-.707M6.343 6.343l-.707-.707M12 8a4 4 0 100 8 4 4 0 000-8z" />
          </svg>
          <svg v-else xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
          </svg>
        </button>

        <NuxtLink 
          to="/pos/history"
          class="bg-gray-50 dark:bg-gray-900 hover:border-orange-600 border border-gray-200 dark:border-gray-800 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all text-gray-700 dark:text-gray-300"
        >
          History
        </NuxtLink>

        <NuxtLink 
          to="/pos/menu"
          class="bg-gray-50 dark:bg-gray-900 hover:border-orange-600 border border-gray-200 dark:border-gray-800 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all text-gray-700 dark:text-gray-300"
        >
          Menu
        </NuxtLink>

        <button 
          @click="handleLogout"
          class="bg-gray-50 dark:bg-gray-900 hover:bg-red-500/10 hover:text-red-500 border border-gray-200 dark:border-gray-800 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all text-gray-700 dark:text-gray-300"
        >
          Logout
        </button>
      </div>
    </header>

    <!-- Main Order Board Area -->
    <main class="flex-1 overflow-hidden p-6 bg-gray-100/50 dark:bg-black">
      <div v-if="ordersStore.isLoading && ordersStore.activeOrders.length === 0" class="h-full flex flex-col items-center justify-center">
        <div class="animate-spin rounded-full h-10 w-10 border-b-2 border-orange-600 mb-4"></div>
        <p class="text-gray-500 font-bold uppercase tracking-widest text-[10px]">Syncing Pipeline...</p>
      </div>

      <div v-else-if="ordersStore.error" class="h-full flex flex-col items-center justify-center text-center">
        <p class="text-red-500 font-black mb-4 uppercase text-sm">Sync Error: {{ ordersStore.error }}</p>
        <button @click="ordersStore.fetchActiveOrders" class="bg-orange-600 px-8 py-3 rounded-xl font-black uppercase tracking-widest text-xs text-white">Retry Connection</button>
      </div>

      <PosOrderBoard v-else />
    </main>
  </div>
</template>

<style>
/* Base transitions for background and text colors */
* {
  @apply transition-colors duration-200;
}
</style>
