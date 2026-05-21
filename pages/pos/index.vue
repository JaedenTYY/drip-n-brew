<script setup lang="ts">
import { ref, onMounted, onUnmounted } from "vue"
import { useOrdersStore } from "~/stores/orders"
import type { Order } from "~/types"

// Local Components (Using relative paths for maximum resilience)
import PosOrderBoard from "../../components/pos/PosOrderBoard.vue"
import PosHeader from "../../components/pos/PosHeader.vue"
import OrderEditModal from "../../components/pos/OrderEditModal.vue"
import NewOrderModal from "../../components/pos/NewOrderModal.vue"

useHead({
  title: "Dashboard"
})

definePageMeta({
  middleware: "auth"
})

const ordersStore = useOrdersStore()

const showEditModal = ref(false)
const showNewOrderModal = ref(false)
const selectedOrder = ref<Order | null>(null)

const handleEditOrder = (order: Order) => {
  selectedOrder.value = order
  showEditModal.value = true
}

const handleVisibilityChange = () => {
  if (typeof document !== "undefined" && document.visibilityState === "visible") {
    ordersStore.fetchActiveOrders(true)
  }
}

onMounted(() => {
  ordersStore.fetchActiveOrders()
  ordersStore.initializeRealtime()
  
  if (typeof window !== "undefined") {
    window.addEventListener("visibilitychange", handleVisibilityChange)
  }
})

onUnmounted(() => {
  if (typeof window !== "undefined") {
    window.removeEventListener("visibilitychange", handleVisibilityChange)
  }
  ordersStore.cleanupRealtime()
})
</script>

<template>
  <div class="w-full min-h-screen flex flex-col bg-gray-50 dark:bg-black">
    <PosHeader active-page="dashboard" class="w-full flex-shrink-0 sticky top-0 z-[60]" />

    <main class="flex-1 w-full p-4 sm:p-6">
      <div class="flex items-center justify-between mb-2">
        <PageHeader label="Live view" title="Orders" />
        <button 
          @click="showNewOrderModal = true"
          class="flex items-center gap-2 bg-orange-600 hover:bg-orange-700 text-white px-6 py-3 rounded-2xl font-black uppercase tracking-widest text-[10px] shadow-lg shadow-orange-900/20 active:scale-95 transition-all"
        >
          <span class="text-lg">+</span>
          Create New Order
        </button>
      </div>

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

    <ClientOnly>
      <OrderEditModal 
        :show="showEditModal" 
        :order="selectedOrder" 
        @close="showEditModal = false" 
      />

      <NewOrderModal
        :show="showNewOrderModal"
        @close="showNewOrderModal = false"
      />
    </ClientOnly>
  </div>
</template>

<style scoped>
.transition-all {
  transition-property: all;
  transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1);
  transition-duration: 150ms;
}
</style>