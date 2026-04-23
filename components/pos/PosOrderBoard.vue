<script setup lang="ts">
import { useOrdersStore } from '~/stores/orders'
import PosOrderCard from './PosOrderCard.vue'
import type { OrderStatus } from '~/types'

const ordersStore = useOrdersStore()

const columns: { title: string; status: OrderStatus; color: string }[] = [
  { title: 'Pending', status: 'pending', color: 'bg-red-500' },
  { title: 'Preparing', status: 'preparing', color: 'bg-orange-500' },
  { title: 'Ready for Pickup', status: 'ready', color: 'bg-green-500' }
]

const getOrdersByStatus = (status: OrderStatus) => {
  return ordersStore.activeOrders.filter(o => o.status === status)
}
</script>

<template>
  <div class="grid grid-cols-1 md:grid-cols-3 gap-6 h-[calc(100vh-140px)]">
    <div 
      v-for="column in columns" 
      :key="column.status" 
      class="flex flex-col bg-gray-50 dark:bg-gray-950/50 rounded-3xl border border-gray-100 dark:border-gray-800/50 overflow-hidden"
    >
      <!-- Column Header -->
      <div class="p-5 border-b border-gray-200 dark:border-gray-800 flex justify-between items-center bg-gray-100/50 dark:bg-gray-900/50">
        <div class="flex items-center gap-3">
          <div :class="['w-2 h-2 rounded-full', column.color]"></div>
          <h2 class="text-sm font-black uppercase trackingest text-gray-900 dark:text-white">{{ column.title }}</h2>
        </div>
        <span class="bg-gray-200 dark:bg-gray-800 text-gray-500 dark:text-gray-400 text-[10px] font-black px-2 py-0.5 rounded-full">
          {{ getOrdersByStatus(column.status).length }}
        </span>
      </div>

      <!-- Column Content -->
      <div class="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
        <TransitionGroup
          enter-active-class="transform transition duration-500 ease-out"
          enter-from-class="opacity-0 -translate-y-4"
          enter-to-class="opacity-100 translate-y-0"
          leave-active-class="transform transition duration-300 ease-in absolute"
          leave-from-class="opacity-100 scale-100"
          leave-to-class="opacity-0 scale-95"
          move-class="transition duration-500"
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
          class="h-32 flex items-center justify-center border-2 border-dashed border-gray-200 dark:border-gray-800 rounded-2xl"
        >
          <p class="text-gray-400 dark:text-gray-600 text-xs font-bold uppercase tracking-widest">No orders</p>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.custom-scrollbar::-webkit-scrollbar {
  width: 4px;
}
.custom-scrollbar::-webkit-scrollbar-track {
  background: transparent;
}
.custom-scrollbar::-webkit-scrollbar-thumb {
  @apply bg-gray-200 dark:bg-gray-800;
  border-radius: 10px;
}
</style>
