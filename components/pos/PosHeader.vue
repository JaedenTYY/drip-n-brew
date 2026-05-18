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
                
                <!-- Status Badge -->
                <div 
                  class="flex items-center gap-1.5 px-2 py-0.5 rounded-full border transition-all duration-500"
                  :class="ordersStore.connectionStatus === 'connected' ? 'bg-green-50 dark:bg-green-950/20 border-green-100 dark:border-green-900/50' : 'bg-orange-50 dark:bg-orange-950/20 border-orange-100 dark:border-orange-900/50'"
                >
                  <div class="relative flex h-1.5 w-1.5">
                    <span class="relative inline-flex rounded-full h-1.5 w-1.5" :class="ordersStore.connectionStatus === 'connected' ? 'bg-green-500' : 'bg-orange-500'"></span>
                  </div>
                  <span class="text-[7px] font-bold uppercase tracking-widest text-gray-500 dark:text-gray-400">
                    {{ ordersStore.connectionStatus === 'connected' ? 'Online' : 'Offline' }}
                  </span>
                </div>
              </div>
              <p class="text-[7px] sm:text-[9px] font-bold text-gray-900 dark:text-white uppercase tracking-[0.2em] mt-0.5 sm:mt-1">POS</p>
            </div>
          </div>
        </div>
      </NuxtLink>
    </div>

    <div class="flex items-center gap-3 sm:gap-6">
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

      <div class="h-5 w-[1px] bg-gray-100 dark:bg-gray-800 mx-1 sm:mx-2"></div>

      <!-- Navigation Links -->
      <nav class="flex items-center gap-4 sm:gap-8">
        <NuxtLink 
          v-for="link in [
            { to: '/pos', label: 'Orders', id: 'dashboard' },
            { to: '/pos/inventory', label: 'Stock', id: 'inventory' },
            { to: '/pos/history', label: 'History', id: 'history' },
            { to: '/pos/reports', label: 'Reports', id: 'reports' },
            { to: '/pos/menu', label: 'Menu', id: 'menu' }
          ]"
          :key="link.to"
          :to="link.to"
          class="group relative py-1"
        >
          <span 
            class="text-[9px] sm:text-[11px] font-black uppercase tracking-[0.2em] transition-colors duration-300"
            :class="activePage === link.id ? 'text-orange-600' : 'text-gray-400 group-hover:text-gray-900 dark:group-hover:text-white'"
          >
            {{ link.label }}
          </span>
          <div 
            class="absolute -bottom-1 left-0 h-[2px] bg-orange-600 transition-all duration-300"
            :class="activePage === link.id ? 'w-full' : 'w-0 group-hover:w-full'"
          ></div>
        </NuxtLink>
      </nav>

      <div class="h-5 w-[1px] bg-gray-100 dark:bg-gray-800 mx-1 sm:mx-2"></div>

      <button 
        @click="handleLogout"
        class="group relative py-1 ml-1"
      >
        <span class="text-[9px] sm:text-[11px] font-black uppercase tracking-[0.2em] text-gray-400 group-hover:text-red-500 transition-colors duration-300">
          Log Out
        </span>
        <div class="absolute -bottom-1 left-0 w-0 group-hover:w-full h-[2px] bg-red-500 transition-all duration-300"></div>
      </button>
    </div>
  </header>
</template>

<style scoped>
@media (max-width: 350px) {
  .xs\:block { display: none !important; }
}
</style>
