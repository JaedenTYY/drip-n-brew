<script setup lang="ts">
import { useOrdersStore } from '~/stores/orders'
import PosOrderCard from './PosOrderCard.vue'
import type { OrderStatus } from '~/types'

const ordersStore = useOrdersStore()

const columns: { title: string; status: OrderStatus; color: string; icon: string }[] = [
  { title: 'Pending', status: 'pending', color: 'bg-red-500', icon: '📥' },
  { title: 'Preparing', status: 'preparing', color: 'bg-orange-500', icon: '☕' },
  { title: 'Ready', status: 'ready', color: 'bg-green-500', icon: '🔔' }
]

const getOrdersByStatus = (status: OrderStatus) => {
  return ordersStore.activeOrders.filter(o => o.status === status)
}
</script>

<template>
  <!-- Main board container -->
  <div class="flex flex-col lg:flex-row gap-8 h-full overflow-hidden">
    <div 
      v-for="column in columns" 
      :key="column.status" 
      class="flex flex-col flex-1 bg-white/40 dark:bg-gray-900/40 rounded-[2.5rem] border border-gray-100 dark:border-gray-800 overflow-hidden shadow-inner"
    >
      <!-- Column Header -->
      <div class="p-6 border-b border-gray-100 dark:border-gray-800 flex justify-between items-center bg-white/80 dark:bg-gray-900/80 backdrop-blur-md">
        <div class="flex items-center gap-4">
          <div class="text-xl">{{ column.icon }}</div>
          <div>
            <h2 class="text-xs font-black uppercase tracking-[0.2em] text-gray-900 dark:text-white leading-none">{{ column.title }}</h2>
            <p class="text-[8px] font-bold text-gray-400 uppercase tracking-widest mt-1">Pipeline Section</p>
          </div>
        </div>
        <span class="bg-gray-900 dark:bg-white text-white dark:text-gray-900 text-[10px] font-black px-3 py-1 rounded-full shadow-lg">
          {{ getOrdersByStatus(column.status).length }}
        </span>
      </div>

      <!-- Column Content -->
      <div class="flex-1 overflow-y-auto p-5 space-y-5 custom-scrollbar bg-[#fcfcfc]/50 dark:bg-transparent relative">
        <!-- 
          SIMPLIFIED SNAPPY TRANSITIONS
          Removed scale and heavy translate for a more "grounded" feel.
          Shortened durations for professional POS speed.
        -->
        <TransitionGroup
          enter-active-class="transition duration-300 ease-out"
          enter-from-class="opacity-0 translate-x-4"
          enter-to-class="opacity-100 translate-x-0"
          leave-active-class="transition duration-200 ease-in absolute w-[calc(100%-40px)] z-0"
          leave-from-class="opacity-100"
          leave-to-class="opacity-0 -translate-x-4"
          move-class="transition duration-400 ease-in-out"
        >
          <PosOrderCard
            v-for="order in getOrdersByStatus(column.status)"
            :key="order.id"
            :order="order"
            @update-status="ordersStore.updateOrderStatus"
          />
        </TransitionGroup>

        <!-- Empty State -->
        <div 
          v-if="getOrdersByStatus(column.status).length === 0"
          class="h-40 flex flex-col items-center justify-center border-2 border-dashed border-gray-100 dark:border-gray-800 rounded-[2rem] opacity-50"
        >
          <div class="w-10 h-10 rounded-full bg-gray-50 dark:bg-gray-800 flex items-center justify-center mb-3">
            <div class="w-1.5 h-1.5 rounded-full bg-gray-200 dark:bg-gray-700 animate-pulse"></div>
          </div>
          <p class="text-gray-400 dark:text-gray-500 text-[9px] font-black uppercase tracking-[0.2em]">Ready for intake</p>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.custom-scrollbar::-webkit-scrollbar {
  width: 5px;
}
.custom-scrollbar::-webkit-scrollbar-track {
  background: transparent;
}
.custom-scrollbar::-webkit-scrollbar-thumb {
  @apply bg-gray-200 dark:bg-gray-800 rounded-full;
}
</style>
