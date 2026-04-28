<script setup lang="ts">
import { useSupabase } from '~/composables/useSupabase'
import { useTheme } from '~/composables/useTheme'
import { useOrdersStore } from '~/stores/orders'

const props = defineProps<{
  activePage: 'dashboard' | 'menu' | 'history' | 'inventory' | 'reports'
}>()

const supabase = useSupabase()
const ordersStore = useOrdersStore()
const { isDark, toggleTheme } = useTheme()

const handleLogout = async () => {
  await supabase.auth.signOut()
  navigateTo('/pos/login')
}
</script>

<template>
  <header class="flex-shrink-0 px-4 sm:px-6 py-4 sm:py-5 flex items-center justify-between border-b border-gray-100 dark:border-gray-800 bg-white dark:bg-black transition-colors duration-300">
    <div class="flex items-center gap-2 sm:gap-4">
      <NuxtLink to="/pos" class="flex items-center group">
        <!-- Static Branding (No hover unveil for POS) -->
        <div class="flex items-center gap-3 transition-all duration-300">
          <!-- The Fire Icon -->
          <div class="flex h-10 w-10 sm:h-12 sm:w-12 items-center justify-center transition-transform duration-500 group-hover:scale-110 group-hover:rotate-6">
             <img src="/favicon.ico" class="h-8 w-8 sm:h-10 sm:w-10 object-contain" alt="Drip & Brew Logo" />
          </div>

          <!-- The Static Info -->
          <div class="whitespace-nowrap">
            <div class="flex flex-col">
              <div class="flex items-center gap-2">
                <span class="text-xs sm:text-sm font-black text-orange-600 uppercase italic tracking-tighter leading-none">Drip & Brew</span>
                
                <!-- Connection Status Badge: Always visible -->
                <div 
                  class="flex items-center gap-1.5 px-2 py-0.5 rounded-full border transition-all duration-500"
                  :class="ordersStore.connectionStatus === 'connected' ? 'bg-green-50 dark:bg-green-950/20 border-green-100 dark:border-green-900/50' : 'bg-orange-50 dark:bg-orange-950/20 border-orange-100 dark:border-orange-900/50'"
                >
                  <div class="relative flex h-1.5 w-1.5">
                    <span v-if="ordersStore.connectionStatus === 'connected'" class="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                    <span class="relative inline-flex rounded-full h-1.5 w-1.5" :class="ordersStore.connectionStatus === 'connected' ? 'bg-green-500' : 'bg-orange-500 animate-pulse'"></span>
                  </div>
                  <span class="text-[7px] font-black uppercase tracking-widest text-gray-500 dark:text-gray-400">Live</span>
                </div>
              </div>
              <p class="text-[7px] sm:text-[9px] font-bold text-gray-900 dark:text-white uppercase tracking-[0.2em] mt-0.5 sm:mt-1">POS System</p>
            </div>
          </div>
        </div>
      </NuxtLink>
    </div>

    <div class="flex items-center gap-1.5 sm:gap-3">
      <!-- Theme Toggle -->
      <button 
        @click="toggleTheme"
        class="flex items-center justify-center w-8 h-8 sm:w-9 sm:h-9 rounded-lg sm:rounded-xl border border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-900 text-gray-500 dark:text-gray-400 hover:border-orange-500 transition-all shadow-sm"
      >
        <svg v-if="isDark" xmlns="http://www.w3.org/2000/svg" class="h-3.5 w-3.5 sm:h-4 sm:w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364-6.364l-.707.707M6.343 17.657l-.707.707m12.728 0l-.707-.707M6.343 6.343l-.707-.707M12 8a4 4 0 100 8 4 4 0 000-8z" />
        </svg>
        <svg v-else xmlns="http://www.w3.org/2000/svg" class="h-3.5 w-3.5 sm:h-4 sm:w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
        </svg>
      </button>

      <div class="h-5 w-[1px] bg-gray-100 dark:bg-gray-800 mx-0.5 sm:mx-1"></div>

      <!-- Navigation Links -->
      <div class="flex items-center gap-1 sm:gap-2">
        <NuxtLink 
          to="/pos"
          :class="[
            'px-2.5 sm:px-4 py-1.5 sm:py-2 rounded-lg sm:rounded-xl text-[8px] sm:text-[10px] font-black uppercase tracking-widest transition-all border-2',
            activePage === 'dashboard' 
              ? 'bg-orange-600 border-orange-600 text-white shadow-lg shadow-orange-900/20' 
              : 'bg-white dark:bg-gray-900 border-gray-50 dark:border-gray-800 text-gray-400 hover:border-orange-500/50'
          ]"
        >
          Orders
        </NuxtLink>

        <NuxtLink 
          to="/pos/inventory"
          :class="[
            'px-2.5 sm:px-4 py-1.5 sm:py-2 rounded-lg sm:rounded-xl text-[8px] sm:text-[10px] font-black uppercase tracking-widest transition-all border-2',
            activePage === 'inventory' 
              ? 'bg-orange-600 border-orange-600 text-white shadow-lg shadow-orange-900/20' 
              : 'bg-white dark:bg-gray-900 border-gray-50 dark:border-gray-800 text-gray-400 hover:border-orange-500/50'
          ]"
        >
          Stock
        </NuxtLink>

        <NuxtLink 
          to="/pos/history"
          :class="[
            'px-2.5 sm:px-4 py-1.5 sm:py-2 rounded-lg sm:rounded-xl text-[8px] sm:text-[10px] font-black uppercase tracking-widest transition-all border-2',
            activePage === 'history' 
              ? 'bg-orange-600 border-orange-600 text-white shadow-lg shadow-orange-900/20' 
              : 'bg-white dark:bg-gray-900 border-gray-50 dark:border-gray-800 text-gray-400 hover:border-orange-500/50'
          ]"
        >
          History
        </NuxtLink>

        <NuxtLink 
          to="/pos/reports"
          :class="[
            'px-2.5 sm:px-4 py-1.5 sm:py-2 rounded-lg sm:rounded-xl text-[8px] sm:text-[10px] font-black uppercase tracking-widest transition-all border-2',
            activePage === 'reports' 
              ? 'bg-orange-600 border-orange-600 text-white shadow-lg shadow-orange-900/20' 
              : 'bg-white dark:bg-gray-900 border-gray-50 dark:border-gray-800 text-gray-400 hover:border-orange-500/50'
          ]"
        >
          Reports
        </NuxtLink>

        <NuxtLink 
          to="/pos/menu"
          :class="[
            'px-2.5 sm:px-4 py-1.5 sm:py-2 rounded-lg sm:rounded-xl text-[8px] sm:text-[10px] font-black uppercase tracking-widest transition-all border-2',
            activePage === 'menu' 
              ? 'bg-orange-600 border-orange-600 text-white shadow-lg shadow-orange-900/20' 
              : 'bg-white dark:bg-gray-900 border-gray-50 dark:border-gray-800 text-gray-400 hover:border-orange-500/50'
          ]"
        >
          Menu
        </NuxtLink>
      </div>

      <button 
        @click="handleLogout"
        class="bg-gray-50 dark:bg-gray-950/50 hover:bg-red-500/10 hover:text-red-500 border border-gray-100 dark:border-gray-800 px-3 sm:px-5 py-1.5 sm:py-2 rounded-lg sm:rounded-xl text-[8px] sm:text-[10px] font-black uppercase tracking-widest transition-all text-gray-400 ml-1 sm:ml-2"
      >
        Log Out
      </button>
    </div>
  </header>
</template>

<style scoped>
@media (max-width: 350px) {
  .xs\:block { display: none !important; }
}
</style>
