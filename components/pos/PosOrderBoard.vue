<script setup lang="ts">
import draggable from 'vuedraggable'
import { useOrdersStore } from '~/stores/orders'
import PosOrderCard from './PosOrderCard.vue'
import type { Order, OrderStatus } from '~/types'

const ordersStore = useOrdersStore()

const columns: { title: string; status: OrderStatus }[] = [
  { title: 'Pending', status: 'pending' },
  { title: 'Preparing', status: 'preparing' },
  { title: 'Ready', status: 'ready' }
]

const emit = defineEmits<{
  (e: 'edit', order: Order): void
}>()

/**
 * Handle Drag and Drop Change
 * When an item is moved between columns, vuedraggable triggers a 'change' event
 * on the destination column with an 'added' property.
 */
const handleDragChange = (event: any, newStatus: OrderStatus) => {
  if (event.added) {
    const order = event.added.element as Order
    console.log(`[POS Board] Dragging Order #${order.order_number} to ${newStatus}`)
    ordersStore.updateOrderStatus(order.id, newStatus)
  }
}

/**
 * Helper to get orders for a specific status.
 * vuedraggable works best with a local reactive copy or a computed that it can 'read'
 * while we handle the actual state mutation in the 'change' event.
 */
const getOrdersByStatus = (status: OrderStatus) => {
  return ordersStore.activeOrders.filter(o => o.status === status)
}
</script>

<template>
  <!-- 
    Main board container 
    Removed h-full and overflow-hidden to allow natural page scrolling.
  -->
  <div class="flex flex-col lg:flex-row gap-4 w-full">
    <div 
      v-for="column in columns" 
      :key="column.status" 
      class="flex flex-col flex-1 min-w-0 bg-gray-50/60 dark:bg-gray-900/60 rounded-xl border border-gray-200 dark:border-gray-800"
    >
      <!-- Column Header: Sticky below the PosHeader -->
      <div class="px-4 py-3 border-b border-gray-200 dark:border-gray-800 flex justify-between items-center bg-white dark:bg-gray-900 flex-shrink-0 sticky top-[84px] z-40 rounded-t-xl">
        <div class="flex items-center gap-3 sm:gap-4">
          <svg v-if="column.status === 'pending'" aria-hidden="true" class="h-5 w-5 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.8">
              <path stroke-linecap="round" stroke-linejoin="round" d="M4 4h16v11l-3 5H7l-3-5V4Z" />
              <path stroke-linecap="round" stroke-linejoin="round" d="M4 14h5l2 3h2l2-3h5" />
            </svg>
            <svg v-else-if="column.status === 'preparing'" aria-hidden="true" class="h-5 w-5 text-orange-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.8">
              <path stroke-linecap="round" stroke-linejoin="round" d="M3 8h14v6a6 6 0 0 1-6 6H9a6 6 0 0 1-6-6V8Z" />
              <path stroke-linecap="round" stroke-linejoin="round" d="M17 9h2a3 3 0 0 1 0 6h-2M6 4h9" />
            </svg>
            <svg v-else aria-hidden="true" class="h-5 w-5 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.8">
              <path stroke-linecap="round" stroke-linejoin="round" d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9ZM10 21h4" />
            </svg>
          <div>
            <h2 class="text-[10px] sm:text-xs font-black uppercase tracking-[0.2em] text-gray-900 dark:text-white leading-none">{{ column.title }}</h2>
          </div>
        </div>
        <span class="bg-gray-900 dark:bg-white text-white dark:text-gray-900 text-[10px] font-black min-w-6 h-6 px-1.5 flex items-center justify-center rounded-md">
          {{ getOrdersByStatus(column.status).length }}
        </span>
      </div>

      <!-- Column Content: Draggable Zone -->
      <draggable
        :list="getOrdersByStatus(column.status)"
        group="orders"
        item-key="id"
        class="flex-1 p-3 sm:p-4 space-y-3 sm:space-y-4 relative min-h-[200px]"
        ghost-class="opacity-50"
        drag-class="scale-105 shadow-md z-[100]"
        :animation="300"
        @change="handleDragChange($event, column.status)"
      >
        <template #item="{ element: order }">
          <div class="cursor-grab active:cursor-grabbing">
            <PosOrderCard
              :order="order"
              @update-status="ordersStore.updateOrderStatus"
              @edit="emit('edit', $event)"
            />
          </div>
        </template>

        <!-- Empty State (Shows when no items) -->
        <template #header>
          <div 
            v-if="getOrdersByStatus(column.status).length === 0"
            class="h-24 flex items-center justify-center border border-dashed border-gray-200 dark:border-gray-700 rounded-lg mb-3 pointer-events-none"
          >
            <p class="text-gray-400 dark:text-gray-500 text-[10px] font-bold uppercase tracking-wider">No orders</p>
          </div>
        </template>
      </draggable>
    </div>
  </div>
</template>

<style scoped>
/* Ensure columns don't collapse */
.flex-1 {
  min-height: 200px;
}
</style>
