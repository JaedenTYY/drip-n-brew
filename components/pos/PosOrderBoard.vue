<script setup lang="ts">
import { useOrdersStore } from '~/stores/orders'
import PosOrderCard from './PosOrderCard.vue'
import type { Order, OrderStatus } from '~/types'

const ordersStore = useOrdersStore()

const columns: { title: string; status: OrderStatus; color: string; icon: string }[] = [
  { title: 'Pending', status: 'pending', color: 'bg-red-500', icon: '📥' },
  { title: 'Preparing', status: 'preparing', color: 'bg-orange-500', icon: '☕' },
  { title: 'Ready', status: 'ready', color: 'bg-green-500', icon: '🔔' }
]

const emit = defineEmits<{
  (e: 'edit', order: Order): void
}>()

const getOrdersByStatus = (status: OrderStatus) => {
  return ordersStore.activeOrders.filter(o => o.status === status)
}
</script>

<template>
  <!-- 
    Main board container 
    w-full h-full ensures it stretches to its parent (main tag).
  -->
  <div class="flex flex-col lg:flex-row gap-4 sm:gap-8 w-full h-full overflow-hidden">
    <div 
      v-for="column in columns" 
      :key="column.status" 
      class="flex flex-col flex-1 min-w-0 bg-white/40 dark:bg-gray-900/40 rounded-[2.5rem] border border-gray-100 dark:border-gray-800 overflow-hidden shadow-inner"
    >
      <!-- Column Header -->
      <div class="p-4 sm:p-6 border-b border-gray-100 dark:border-gray-800 flex justify-between items-center bg-white/80 dark:bg-gray-900/80 backdrop-blur-md flex-shrink-0">
        <div class="flex items-center gap-3 sm:gap-4">
          <div class="text-lg sm:text-xl">{{ column.icon }}</div>
          <div>
            <h2 class="text-[10px] sm:text-xs font-black uppercase tracking-[0.2em] text-gray-900 dark:text-white leading-none">{{ column.title }}</h2>
            <p class="text-[7px] sm:text-[8px] font-bold text-gray-400 uppercase tracking-widest mt-1">Pipeline Section</p>
          </div>
        </div>
        <span class="bg-gray-900 dark:bg-white text-white dark:text-gray-900 text-[9px] sm:text-[10px] font-black px-2.5 sm:px-3 py-0.5 sm:py-1 rounded-full shadow-lg">
          {{ getOrdersByStatus(column.status).length }}
        </span>
      </div>

      <!-- Column Content -->
      <div class="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4 sm:space-y-5 custom-scrollbar bg-[#fcfcfc]/50 dark:bg-transparent relative">
        <TransitionGroup
          enter-active-class="transition duration-300 ease-out"
          enter-from-class="opacity-0 translate-x-4"
          enter-to-class="opacity-100 translate-x-0"
          leave-active-class="transition duration-200 ease-in absolute w-[calc(100%-32px)] sm:w-[calc(100%-40px)] z-0"
          leave-from-class="opacity-100"
          leave-to-class="opacity-0 -translate-x-4"
          move-class="transition duration-400 ease-in-out"
        >
          <PosOrderCard
            v-for="order in getOrdersByStatus(column.status)"
            :key="order.id"
            :order="order"
            @update-status="ordersStore.updateOrderStatus"
            @edit="emit('edit', $event)"
          />
        </TransitionGroup>

        <!-- Empty State -->
        <div 
          v-if="getOrdersByStatus(column.status).length === 0"
          class="h-32 sm:h-40 flex flex-col items-center justify-center border-2 border-dashed border-gray-100 dark:border-gray-800 rounded-[2rem] opacity-50"
        >
          <div class="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-gray-50 dark:bg-gray-800 flex items-center justify-center mb-3">
            <div class="w-1 h-1 sm:w-1.5 sm:h-1.5 rounded-full bg-gray-200 dark:bg-gray-700 animate-pulse"></div>
          </div>
          <p class="text-gray-400 dark:text-gray-500 text-[8px] sm:text-[9px] font-black uppercase tracking-[0.2em]">Ready for intake</p>
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
