<script setup lang="ts">
import ProductManager from '~/components/pos/ProductManager.vue'
import PromoManager from '~/components/pos/PromoManager.vue'
import { useSupabase } from '~/composables/useSupabase'
import { useTheme } from '~/composables/useTheme'

useHead({
  title: 'Menu Management'
})

definePageMeta({
  middleware: 'auth'
})

const supabase = useSupabase()
const { isDark, toggleTheme } = useTheme()

const handleLogout = async () => {
  await supabase.auth.signOut()
  navigateTo('/pos/login')
}
</script>

<template>
  <div class="min-h-screen bg-white dark:bg-black text-gray-900 dark:text-white p-6 transition-colors duration-300">
    <!-- Header -->
    <header class="flex items-center justify-between mb-10 max-w-6xl mx-auto">
      <div class="flex items-center gap-4">
        <NuxtLink to="/pos" class="h-12 w-12 flex items-center justify-center rounded-2xl bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 text-gray-900 dark:text-white hover:border-orange-500 transition-all group shadow-sm">
          <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6 group-hover:-translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M15 19l-7-7 7-7" />
          </svg>
        </NuxtLink>
        <div>
          <h1 class="text-2xl font-black uppercase italic tracking-tighter text-orange-600">POS Management</h1>
          <p class="text-[10px] font-bold text-gray-500 uppercase tracking-[0.2em]">Inventory & Discounts</p>
        </div>
      </div>

      <div class="flex items-center gap-4">
        <button 
          @click="toggleTheme"
          class="flex items-center justify-center w-10 h-10 rounded-xl border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900 text-gray-500 dark:text-gray-400 hover:border-orange-500 transition-all"
        >
          <svg v-if="isDark" xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364-6.364l-.707.707M6.343 17.657l-.707.707m12.728 0l-.707-.707M6.343 6.343l-.707-.707M12 8a4 4 0 100 8 4 4 0 000-8z" /></svg>
          <svg v-else xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" /></svg>
        </button>

        <NuxtLink to="/pos/history" class="bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest hover:text-orange-500 transition-all">History</NuxtLink>
        <NuxtLink to="/pos" class="bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest hover:text-orange-500 transition-all">Orders</NuxtLink>
        <button @click="handleLogout" class="bg-gray-50 dark:bg-gray-900 hover:bg-red-500/10 hover:text-red-500 border border-gray-200 dark:border-gray-800 px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all">Logout</button>
      </div>
    </header>

    <!-- CMS Content: Vertical Stacked Layout -->
    <main class="max-w-6xl mx-auto space-y-16 pb-20">
      <!-- Section 1: Products -->
      <section class="animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div class="mb-6 flex items-center gap-4">
          <div class="h-1.5 w-1.5 bg-orange-600 rounded-full"></div>
          <h2 class="text-xs font-black uppercase tracking-[0.3em] text-gray-400">Inventory Management</h2>
        </div>
        <ProductManager />
      </section>

      <!-- Section 2: Discounts (Moved to Below) -->
      <section class="animate-in fade-in slide-in-from-bottom-4 duration-700 delay-100 border-t border-gray-100 dark:border-gray-900 pt-16">
        <div class="mb-6 flex items-center gap-4">
          <div class="h-1.5 w-1.5 bg-orange-600 rounded-full"></div>
          <h2 class="text-xs font-black uppercase tracking-[0.3em] text-gray-400">Discount & Promo Engine</h2>
        </div>
        <div class="max-w-2xl">
          <PromoManager />
        </div>
      </section>
    </main>
  </div>
</template>

<style>
* { @apply transition-colors duration-200; }
</style>
