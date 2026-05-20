<script setup lang="ts">
import { useOrdersStore } from '~/stores/orders'
import PosOrderBoard from '~/components/pos/PosOrderBoard.vue'
import PosHeader from '~/components/pos/PosHeader.vue'
import OrderEditModal from '~/components/pos/OrderEditModal.vue'
import type { Order } from '~/types'

useHead({
  title: 'Dashboard'
})

definePageMeta({
  middleware: 'auth'
})

const ordersStore = useOrdersStore()

const showEditModal = ref(false)
const selectedOrder = ref<Order | null>(null)

const handleEditOrder = (order: Order) => {
  selectedOrder.value = order
  showEditModal.value = true
}

/**
 * BIG-TECH UX: POS Resilience
 * When the barista switches tabs or puts their device to sleep, 
 * we trigger a silent sync as soon as they return to ensure 
 * the board is 100% accurate.
 */
const handleVisibilityChange = () => {
  if (document.visibilityState === 'visible') {
    console.log('[POS Dashboard] Syncing orders on wake...')
    ordersStore.fetchActiveOrders(true) // Silent sync
  }
}

onMounted(() => {
  ordersStore.fetchActiveOrders()
  ordersStore.initializeRealtime()
  
  document.addEventListener('visibilitychange', handleVisibilityChange)
})

onUnmounted(() => {
  document.removeEventListener('visibilitychange', handleVisibilityChange)
  ordersStore.cleanupRealtime()
})
</script>

<template>
  <!-- 
    ROOT POS CONTAINER
    w-full and h-dvh ensure it stretches to 100% of visible area.
    flex-col + overflow-hidden prevents the body from scrolling while allowing columns to scroll.
  -->
  <div class="w-full h-dvh flex flex-col overflow-hidden transition-colors duration-300 bg-gray-50 dark:bg-black">
    <!-- Unified POS Header -->
    <PosHeader active-page="dashboard" class="w-full flex-shrink-0" />

    <!-- Main Order Board Area -->
    <main class="flex-1 w-full overflow-hidden p-4 sm:p-6">
      <PageHeader label="Live view" title="Orders" />

      <div v-if="ordersStore.isLoading && ordersStore.activeOrders.length === 0" class="h-full flex flex-col items-center justify-center">
        <div class="animate-spin rounded-full h-10 w-10 border-b-2 border-orange-600 mb-4"></div>
        <p class="text-gray-500 font-black uppercase tracking-widest text-[10px]">Loading Orders...</p>
      </div>

      <div v-else-if="ordersStore.error" class="h-full flex flex-col items-center justify-center text-center">
        <p class="text-red-500 font-black mb-4 uppercase text-sm">Connection Error: {{ ordersStore.error }}</p>
        <button @click="ordersStore.fetchActiveOrders" class="bg-orange-600 px-8 py-3 rounded-xl font-black uppercase tracking-widest text-xs text-white">Retry</button>
      </div>

      <div v-else class="h-full w-full">
        <PosOrderBoard @edit="handleEditOrder" />
      </div>
    </main>

    <!-- Global Modals -->
    <OrderEditModal 
      :show="showEditModal" 
      :order="selectedOrder" 
      @close="showEditModal = false" 
    />
  </div>
</template>

<style>
/* Local page transitions */
* {
  @apply transition-colors duration-200;
}
</style>
