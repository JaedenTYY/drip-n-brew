<script setup lang="ts">
import { useOrdersStore } from '~/stores/orders'
import PosOrderBoard from '~/components/pos/PosOrderBoard.vue'
import PosHeader from '~/components/pos/PosHeader.vue'

useHead({
  title: 'Dashboard'
})

definePageMeta({
  middleware: 'auth'
})

const ordersStore = useOrdersStore()

onMounted(() => {
  ordersStore.fetchActiveOrders()
  ordersStore.initializeRealtime()
})

onUnmounted(() => {
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
      <div v-if="ordersStore.isLoading && ordersStore.activeOrders.length === 0" class="h-full flex flex-col items-center justify-center">
        <div class="animate-spin rounded-full h-10 w-10 border-b-2 border-orange-600 mb-4"></div>
        <p class="text-gray-500 font-black uppercase tracking-widest text-[10px]">Syncing Pipeline...</p>
      </div>

      <div v-else-if="ordersStore.error" class="h-full flex flex-col items-center justify-center text-center">
        <p class="text-red-500 font-black mb-4 uppercase text-sm">Sync Error: {{ ordersStore.error }}</p>
        <button @click="ordersStore.fetchActiveOrders" class="bg-orange-600 px-8 py-3 rounded-xl font-black uppercase tracking-widest text-xs text-white">Retry Connection</button>
      </div>

      <div v-else class="h-full w-full">
        <PosOrderBoard />
      </div>
    </main>
  </div>
</template>

<style>
/* Local page transitions */
* {
  @apply transition-colors duration-200;
}
</style>
