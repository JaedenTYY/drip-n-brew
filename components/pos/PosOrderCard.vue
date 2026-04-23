<script setup lang="ts">
import type { Order, OrderStatus } from '~/types'

const props = defineProps<{
  order: Order
}>()

const emit = defineEmits<{
  (e: 'update-status', orderId: string, status: OrderStatus): void
}>()

/**
 * Calculates the relative time since the order was placed.
 * In a busy shop, "Time Elapsed" is the most critical metric for a barista.
 */
const timeElapsed = ref('')
let timer: any = null

const updateTime = () => {
  const diff = Date.now() - new Date(props.order.created_at).getTime()
  const minutes = Math.floor(diff / 60000)
  const seconds = Math.floor((diff % 60000) / 1000)
  timeElapsed.value = `${minutes}m ${seconds}s`
}

onMounted(() => {
  updateTime()
  timer = setInterval(updateTime, 1000)
})

onUnmounted(() => {
  if (timer) clearInterval(timer)
})

/**
 * Logic to determine the "Next" logical status for the order.
 */
const nextStatusMap: Record<string, OrderStatus | null> = {
  pending: 'preparing',
  preparing: 'ready',
  ready: 'completed',
  completed: null
}

const nextStatus = computed(() => nextStatusMap[props.order.status])

const getStatusColor = (status: OrderStatus) => {
  const colors: Record<OrderStatus, string> = {
    pending: 'bg-red-500',
    preparing: 'bg-orange-500',
    ready: 'bg-green-500',
    completed: 'bg-gray-500'
  }
  return colors[status]
}
</script>

<template>
  <div class="group bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-5 shadow-lg transition-all hover:border-orange-500/50">
    <!-- Header: Customer & Timer -->
    <div class="flex justify-between items-start mb-4">
      <div>
        <h3 class="text-xl font-black text-gray-900 dark:text-white leading-none uppercase tracking-tight">
          {{ order.customer_name }}
        </h3>
        <div class="flex flex-col gap-1 mt-1">
          <span class="text-[10px] font-bold text-gray-500 uppercase tracking-widest flex items-center gap-1">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
            </svg>
            {{ order.phone }}
          </span>
          <span v-if="order.promo_code" class="text-[9px] font-black text-orange-500 uppercase bg-orange-500/10 self-start px-1.5 py-0.5 rounded">
            🎫 Code: {{ order.promo_code }}
          </span>
          <span class="text-[10px] font-bold text-gray-400 dark:text-gray-700 uppercase tracking-widest">
            #{{ order.id.slice(0, 8) }}
          </span>
        </div>
      </div>
      <div 
        class="px-2 py-1 rounded-md text-[10px] font-black tabular-nums border"
        :class="[
          parseInt(timeElapsed) > 10 ? 'bg-red-900/20 text-red-400 border-red-900/50' : 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 border-gray-200 dark:border-gray-700'
        ]"
      >
        {{ timeElapsed }}
      </div>
    </div>

    <!-- Items List -->
    <div class="space-y-3 mb-6">
      <div v-for="item in order.items" :key="item.id" class="flex flex-col text-sm border-l-2 border-gray-200 dark:border-gray-800 pl-3">
        <div class="flex justify-between">
          <span class="text-gray-700 dark:text-gray-300 font-bold italic">
            <span class="text-orange-500 font-black mr-1 uppercase">{{ item.quantity }}x</span>
            {{ item.product?.name || 'Loading...' }}
          </span>
        </div>
        <!-- Customizations -->
        <div v-if="item.customizations" class="flex flex-wrap gap-1.5 mt-1.5">
          <span 
            v-if="item.customizations.temperature" 
            :class="[
              'text-[8px] font-black uppercase tracking-tighter px-1.5 py-0.5 rounded border',
              item.customizations.temperature === 'Hot' ? 'bg-red-900/10 text-red-500 border-red-900/30' : 'bg-blue-900/10 text-blue-500 border-blue-900/30'
            ]"
          >
            {{ item.customizations.temperature }}
          </span>
          <span 
            v-if="item.customizations.service_type" 
            :class="[
              'text-[8px] font-black uppercase tracking-tighter px-1.5 py-0.5 rounded border',
              item.customizations.service_type === 'BYO Flask' ? 'bg-green-900/10 text-green-500 border-green-900/30' : 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 border-gray-200 dark:border-gray-700'
            ]"
          >
            {{ item.customizations.service_type }}
          </span>
        </div>
      </div>
    </div>

    <!-- Actions -->
    <div class="mt-auto pt-4 border-t border-gray-200 dark:border-gray-800">
      <button
        v-if="nextStatus"
        @click="emit('update-status', order.id, nextStatus)"
        class="w-full py-3 rounded-xl text-sm font-black uppercase tracking-widest transition-all active:scale-95 flex items-center justify-center gap-2"
        :class="[getStatusColor(nextStatus), 'text-white shadow-lg shadow-black/20']"
      >
        {{ nextStatus === 'preparing' ? 'Start Preparing' : nextStatus === 'ready' ? 'Mark as Ready' : 'Complete Order' }}
        <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M9 5l7 7-7 7" />
        </svg>
      </button>
    </div>
  </div>
</template>
