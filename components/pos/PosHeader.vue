<script setup lang="ts">
import { useSupabase } from '~/composables/useSupabase'
import { useTheme } from '~/composables/useTheme'

const props = defineProps<{
  activePage: 'dashboard' | 'menu' | 'history'
}>()

const supabase = useSupabase()
const { isDark, toggleTheme } = useTheme()

const handleLogout = async () => {
  await supabase.auth.signOut()
  navigateTo('/pos/login')
}
</script>

<template>
  <header class="flex-shrink-0 px-4 sm:px-6 py-4 sm:py-5 flex items-center justify-between border-b border-gray-100 dark:border-gray-800 bg-white dark:bg-black transition-colors duration-300">
    <div class="flex items-center gap-2 sm:gap-4">
      <NuxtLink to="/pos" class="flex items-center gap-2 sm:gap-4 group">
        <!-- Logo container refined with double border and full image visibility -->
        <div class="h-10 w-10 sm:h-12 sm:w-12 flex items-center justify-center rounded-xl sm:rounded-2xl bg-white shadow-md border-[3px] border-white ring-1 ring-gray-200 dark:ring-gray-700 overflow-hidden group-hover:scale-105 transition-all">
           <div class="w-full h-full border border-gray-50 dark:border-transparent rounded-lg sm:rounded-xl overflow-hidden flex items-center justify-center">
              <img src="/logo.png" class="h-full w-full object-contain p-0.5" alt="Drip & Brew Logo" />
           </div>
        </div>
        <div class="hidden xs:block">
          <h1 class="text-sm sm:text-xl font-black uppercase italic tracking-tighter text-gray-900 dark:text-white leading-none">Drip & Brew</h1>
          <p class="text-[7px] sm:text-[9px] font-bold text-gray-500 uppercase tracking-[0.2em] mt-0.5 sm:mt-1">POS System</p>
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
