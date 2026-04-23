<script setup lang="ts">
import { useOrdersStore } from '~/stores/orders'
import PosHeader from '~/components/pos/PosHeader.vue'

useHead({
  title: 'Order History'
})

definePageMeta({
  middleware: 'auth'
})

const ordersStore = useOrdersStore()

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

const confirmDelete = async (orderId: string, customerName: string) => {
  if (confirm(`Are you sure you want to permanently delete the order for "${customerName}"? This action cannot be undone.`)) {
    await ordersStore.deleteOrder(orderId)
  }
}
</script>

<template>
  <div class="min-h-dvh bg-white dark:bg-black text-gray-900 dark:text-white transition-colors duration-300">
    <!-- Unified POS Header -->
    <PosHeader active-page="history" />

    <!-- History List -->
    <div class="max-w-5xl mx-auto py-12 px-6">
      <div v-if="ordersStore.isLoading && ordersStore.historyOrders.length === 0" class="flex flex-col items-center justify-center py-20">
        <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600 mb-4"></div>
        <p class="text-gray-500 font-bold uppercase tracking-widest text-xs">Loading history...</p>
      </div>

      <div v-else-if="ordersStore.historyOrders.length === 0" class="text-center py-20 bg-gray-50 dark:bg-black/50 rounded-3xl border border-gray-100 dark:border-gray-800/50">
        <p class="text-gray-500 font-bold uppercase tracking-widest text-sm">No completed orders found.</p>
      </div>

      <div v-else class="space-y-4">
        <div 
          v-for="order in ordersStore.historyOrders" 
          :key="order.id"
          class="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-3xl p-6 flex flex-wrap items-center justify-between gap-6 hover:border-orange-600/50 transition-all group shadow-sm"
        >
          <div class="flex items-center gap-6">
            <div class="h-14 w-14 rounded-2xl bg-green-500/10 flex items-center justify-center text-green-500">
              <svg xmlns="http://www.w3.org/2000/svg" class="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            
            <div>
              <div class="flex items-center gap-3">
                <h3 class="text-lg font-black uppercase italic tracking-tight text-gray-900 dark:text-white">{{ order.customer_name }}</h3>
                <span v-if="order.promo_code" class="text-[10px] font-black bg-orange-600 text-white px-2 py-0.5 rounded uppercase tracking-tighter shadow-sm">{{ order.promo_code }}</span>
              </div>
              <p class="text-xs text-gray-500 font-bold uppercase tracking-widest mt-1">{{ formatDate(order.created_at) }}</p>
            </div>
          </div>

          <div class="flex-1 min-w-[200px]">
            <div class="flex flex-wrap gap-2">
              <div 
                v-for="item in order.items" 
                :key="item.id"
                class="bg-gray-50 dark:bg-gray-800 px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-tight flex items-center gap-2 text-gray-700 dark:text-gray-300 border border-gray-100 dark:border-gray-700"
              >
                <span class="text-orange-600">{{ item.quantity }}x</span>
                <span>{{ item.product?.name }}</span>
                <span v-if="item.customizations?.temperature" class="opacity-50 text-[8px]">{{ item.customizations.temperature }}</span>
              </div>
            </div>
          </div>

          <div class="flex items-center gap-6">
            <div class="text-right">
              <p class="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Total Paid</p>
              <p class="text-2xl font-black text-orange-600 tracking-tighter italic">RM{{ order.total_price.toFixed(2) }}</p>
            </div>
            
            <button 
              @click="confirmDelete(order.id, order.customer_name)"
              class="p-3 rounded-xl bg-gray-50 dark:bg-gray-800 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all opacity-0 group-hover:opacity-100"
              title="Delete Order History"
            >
              <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
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
