<script setup lang="ts">
import type { Order, OrderStatus } from '~/types'

const props = defineProps<{
  order: Order
}>()

const emit = defineEmits<{
  (e: 'update-status', orderId: string, status: OrderStatus): void
}>()

/**
 * Helper to get time elapsed since order placement.
 */
const timeAgo = ref('')
let timer: any = null

const updateTimer = () => {
  const diff = Date.now() - new Date(props.order.created_at).getTime()
  const mins = Math.floor(diff / 60000)
  timeAgo.value = mins === 0 ? 'Just now' : `${mins}m ago`
}

onMounted(() => {
  updateTimer()
  timer = setInterval(updateTimer, 60000)
})

onUnmounted(() => {
  if (timer) clearInterval(timer)
})

const getNextStatus = (current: OrderStatus): OrderStatus | null => {
  if (current === 'pending') return 'preparing'
  if (current === 'preparing') return 'ready'
  if (current === 'ready') return 'completed'
  return null
}
</script>

<template>
  <div 
    class="bg-white dark:bg-gray-900 border-2 rounded-[1.5rem] p-5 shadow-sm transition-all duration-300"
    :class="[
      order.status === 'pending' ? 'border-red-100 dark:border-red-950/30' : 
      order.status === 'preparing' ? 'border-orange-100 dark:border-orange-950/30' : 
      'border-green-100 dark:border-green-950/30'
    ]"
  >
    <!-- Card Header: Customer & Time -->
    <div class="flex items-start justify-between mb-4">
      <div>
        <h3 class="text-lg font-black uppercase italic tracking-tighter text-gray-900 dark:text-white leading-none">
          {{ order.customer_name }}
        </h3>
        <p class="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest mt-1.5 flex items-center gap-1.5">
          <svg xmlns="http://www.w3.org/2000/svg" class="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          {{ timeAgo }}
        </p>
      </div>
      <div v-if="order.promo_code" class="bg-orange-600 text-white text-[8px] font-black px-2 py-1 rounded-lg uppercase shadow-lg shadow-orange-900/20">
        {{ order.promo_code }}
      </div>
    </div>

    <!-- Order Items -->
    <div class="space-y-2 mb-6">
      <div 
        v-for="item in order.items" 
        :key="item.id"
        class="flex items-start gap-3 bg-gray-50 dark:bg-gray-800/50 p-2.5 rounded-xl border border-gray-100 dark:border-gray-800"
      >
        <span class="text-sm font-black text-orange-600 tabular-nums">{{ item.quantity }}x</span>
        <div class="flex-1">
          <p class="text-xs font-bold text-gray-800 dark:text-gray-200 leading-tight uppercase tracking-tight">
            {{ item.product?.name }}
          </p>
          <div v-if="item.customizations" class="flex flex-wrap gap-1 mt-1">
            <span v-if="item.customizations.temperature" class="text-[8px] font-black uppercase tracking-tighter text-gray-400 dark:text-gray-500">
              {{ item.customizations.temperature }}
            </span>
            <span v-if="item.customizations.service_type" class="text-[8px] font-black uppercase tracking-tighter text-gray-400 dark:text-gray-500">
              • {{ item.customizations.service_type }}
            </span>
          </div>
        </div>
      </div>
    </div>

    <!-- Action Button -->
    <div class="flex gap-2">
      <button 
        v-if="getNextStatus(order.status)"
        @click="emit('update-status', order.id, getNextStatus(order.status)!)"
        class="flex-1 py-3 rounded-xl font-black uppercase tracking-widest text-[10px] transition-all flex items-center justify-center gap-2"
        :class="[
          order.status === 'pending' ? 'bg-red-600 text-white shadow-lg shadow-red-900/20 hover:bg-red-700' :
          order.status === 'preparing' ? 'bg-orange-600 text-white shadow-lg shadow-orange-900/20 hover:bg-orange-700' :
          'bg-green-600 text-white shadow-lg shadow-green-900/20 hover:bg-green-700'
        ]"
      >
        <span>
          {{ order.status === 'pending' ? 'Start Order' : order.status === 'preparing' ? 'Mark Ready' : 'Complete' }}
        </span>
        <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M9 5l7 7-7 7" />
        </svg>
      </button>
    </div>
  </div>
</template>
