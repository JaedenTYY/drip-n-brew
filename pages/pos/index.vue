<script setup lang="ts">
import { useOrdersStore } from '~/stores/orders'
import { useSupabase } from '~/composables/useSupabase'
import PosOrderBoard from '~/components/pos/PosOrderBoard.vue'
import { useTheme } from '~/composables/useTheme'

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
  <div class="min-h-screen bg-white dark:bg-black text-gray-900 dark:text-white p-6 transition-colors duration-300">
    <!-- POS Header -->
    <header class="flex items-center justify-between mb-10">
      <div class="flex items-center gap-4">
        <div class="h-12 w-12 flex items-center justify-center rounded-2xl bg-orange-600 text-white shadow-lg shadow-orange-900/20 overflow-hidden">
          <!-- Replace the SVG below with your Church Logo <img> tag -->
          <!-- <img src="/church-logo.png" class="h-full w-full object-cover" alt="Church Logo" /> -->
          <svg xmlns="http://www.w3.org/2000/svg" class="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
        </div>
        <div>
          <h1 class="text-2xl font-black uppercase italic tracking-tighter">Drip & Brew POS</h1>
          <p class="text-[10px] font-bold text-gray-500 uppercase tracking-[0.2em]">Active Pipeline</p>
        </div>
      </div>

      <div class="flex items-center gap-4 md:gap-6">
        <!-- Theme Toggle -->
        <button 
          @click="toggleTheme"
          class="flex items-center justify-center w-10 h-10 rounded-xl border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900 text-gray-500 dark:text-gray-400 hover:border-orange-500 transition-all"
          :title="isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'"
        >
          <svg v-if="isDark" xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364-6.364l-.707.707M6.343 17.657l-.707.707m12.728 0l-.707-.707M6.343 6.343l-.707-.707M12 8a4 4 0 100 8 4 4 0 000-8z" />
          </svg>
          <svg v-else xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
          </svg>
        </button>

        <div class="hidden md:flex flex-col items-end">
          <span class="text-xs font-black uppercase text-gray-400">Station 01</span>
          <span class="text-[10px] font-bold text-green-500 uppercase">System Live</span>
        </div>
        
        <NuxtLink 
          to="/pos/history"
          class="bg-gray-50 dark:bg-gray-900 hover:border-orange-500 border border-gray-200 dark:border-gray-800 px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all"
        >
          History
        </NuxtLink>

        <NuxtLink 
          to="/pos/menu"
          class="bg-gray-50 dark:bg-gray-900 hover:border-orange-500 border border-gray-200 dark:border-gray-800 px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all"
        >
          Menu
        </NuxtLink>

        <button 
          @click="handleLogout"
          class="bg-gray-50 dark:bg-gray-900 hover:bg-red-900/20 hover:text-red-500 border border-gray-200 dark:border-gray-800 px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all"
        >
          Logout
        </button>
      </div>
    </header>

    <!-- Main Order Board -->
    <div v-if="ordersStore.isLoading && ordersStore.activeOrders.length === 0" class="flex flex-col items-center justify-center h-[calc(100vh-200px)]">
      <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600 mb-4"></div>
      <p class="text-gray-500 font-bold uppercase tracking-widest text-xs">Synchronizing orders...</p>
    </div>

    <div v-else-if="ordersStore.error" class="flex flex-col items-center justify-center h-[calc(100vh-200px)] text-center">
      <p class="text-red-500 font-black mb-4 uppercase">Sync Error: {{ ordersStore.error }}</p>
      <button @click="ordersStore.fetchActiveOrders" class="bg-orange-600 px-8 py-3 rounded-xl font-black uppercase tracking-widest">Retry Connection</button>
    </div>

    <PosOrderBoard v-else />
  </div>
</template>

<style>
/* Base transitions for background and text colors */
* {
  @apply transition-colors duration-200;
}
</style>
