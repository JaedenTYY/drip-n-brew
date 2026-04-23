<script setup lang="ts">
import { useOrdersStore } from '~/stores/orders'
import { useTheme } from '~/composables/useTheme'
import { useSupabase } from '~/composables/useSupabase'

useHead({
  title: 'Order History'
})

definePageMeta({
  middleware: 'auth'
})
...

const ordersStore = useOrdersStore()
const { isDark, toggleTheme } = useTheme()
const supabase = useSupabase()

const handleLogout = async () => {
  await supabase.auth.signOut()
  navigateTo('/pos/login')
}

onMounted(() => {
  ordersStore.fetchOrderHistory()
})

const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleString('en-MY', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  })
}
</script>

<template>
  <div class="min-h-screen bg-white dark:bg-black text-gray-900 dark:text-white p-6 transition-colors duration-300">
    <!-- Header -->
    <header class="flex items-center justify-between mb-10">
      <div class="flex items-center gap-4">
        <NuxtLink to="/pos" class="h-12 w-12 flex items-center justify-center rounded-2xl bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 text-gray-900 dark:text-white hover:border-orange-500 transition-all group">
          <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6 group-hover:-translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M15 19l-7-7 7-7" />
          </svg>
        </NuxtLink>
        <div>
          <h1 class="text-2xl font-black uppercase italic tracking-tighter text-orange-600">Order History</h1>
          <p class="text-[10px] font-bold text-gray-500 uppercase tracking-[0.2em]">Archived Completions</p>
        </div>
      </div>

      <div class="flex items-center gap-4">
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

        <NuxtLink to="/pos" class="bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest hover:text-orange-500 transition-all">
          Back to Orders
        </NuxtLink>
        <button 
          @click="handleLogout"
          class="bg-gray-50 dark:bg-gray-900 hover:bg-red-900/20 hover:text-red-500 border border-gray-200 dark:border-gray-800 px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all"
        >
          Logout
        </button>
      </div>
    </header>

    <!-- History List -->
    <div class="max-w-5xl mx-auto">
      <div v-if="ordersStore.isLoading && ordersStore.historyOrders.length === 0" class="flex flex-col items-center justify-center py-20">
        <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600 mb-4"></div>
        <p class="text-gray-500 font-bold uppercase tracking-widest text-xs">Loading history...</p>
      </div>

      <div v-else-if="ordersStore.historyOrders.length === 0" class="text-center py-20 bg-gray-50 dark:bg-gray-950/50 rounded-3xl border border-gray-100 dark:border-gray-800/50">
        <p class="text-gray-500 font-bold uppercase tracking-widest text-sm">No completed orders found.</p>
      </div>

      <div v-else class="space-y-4">
        <div 
          v-for="order in ordersStore.historyOrders" 
          :key="order.id"
          class="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-3xl p-6 flex flex-wrap items-center justify-between gap-6 hover:border-orange-500/50 transition-all"
        >
          <div class="flex items-center gap-6">
            <div class="h-14 w-14 rounded-2xl bg-green-500/10 flex items-center justify-center text-green-500">
              <svg xmlns="http://www.w3.org/2000/svg" class="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            
            <div>
              <div class="flex items-center gap-3">
                <h3 class="text-lg font-black uppercase italic tracking-tight">{{ order.customer_name }}</h3>
                <span v-if="order.promo_code" class="text-[10px] font-black bg-orange-500 text-white px-2 py-0.5 rounded uppercase tracking-tighter">PROMO: {{ order.promo_code }}</span>
              </div>
              <p class="text-xs text-gray-500 font-bold uppercase tracking-widest mt-1">{{ formatDate(order.created_at) }}</p>
            </div>
          </div>

          <div class="flex-1 min-w-[200px]">
            <div class="flex flex-wrap gap-2">
              <div 
                v-for="item in order.items" 
                :key="item.id"
                class="bg-gray-50 dark:bg-gray-800 px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-tight flex items-center gap-2"
              >
                <span class="text-orange-600">{{ item.quantity }}x</span>
                <span>{{ item.product?.name }}</span>
                <span v-if="item.customizations?.temperature" class="opacity-50 text-[8px]">{{ item.customizations.temperature }}</span>
              </div>
            </div>
          </div>

          <div class="text-right">
            <p class="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Total Paid</p>
            <p class="text-2xl font-black text-orange-600 tracking-tighter italic">RM{{ order.total_price.toFixed(2) }}</p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
* {
  @apply transition-colors duration-200;
}
</style>
