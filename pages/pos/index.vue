<script setup lang="ts">
import { ref, onMounted, onUnmounted } from "vue"
import { useOrdersStore } from "~/stores/orders"
import { useSupabase } from "~/composables/useSupabase"
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
const supabase = useSupabase()

const showEditModal = ref(false)
const showNewOrderModal = ref(false)
const selectedOrder = ref<Order | null>(null)
const isSessionReady = ref(false)

const handleEditOrder = (order: Order) => {
  selectedOrder.value = order
  showEditModal.value = true
}

const handleVisibilityChange = () => {
  if (typeof document !== "undefined" && document.visibilityState === "visible" && isSessionReady.value) {
    ordersStore.fetchActiveOrders(true)
  }
}

onMounted(async () => {
  // BIG-TECH RELIABILITY: Wait for the Supabase Auth Handshake
  // This ensures the outgoing fetch has the correct JWT headers,
  // preventing the 'anonymous join' bug where items were missing.
  try {
    const { data: { session } } = await supabase.auth.getSession()
    if (session) {
      isSessionReady.value = true
      await ordersStore.fetchActiveOrders()
      ordersStore.initializeRealtime()
    } else {
      // Safety redirect if session lost during mount
      navigateTo('/pos/login')
    }
  } catch (err) {
    console.error('[Dashboard] Auth handshake failed:', err)
  }
  
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

      <!-- Loading State (Now includes Handshake waiting) -->
      <div v-if="(!isSessionReady || ordersStore.isLoading) && ordersStore.activeOrders.length === 0" class="h-[60vh] flex flex-col items-center justify-center">
        <div class="animate-spin rounded-full h-10 w-10 border-b-2 border-orange-600 mb-4"></div>
        <p class="text-gray-500 font-black uppercase tracking-widest text-[10px]">Establishing Secure Connection...</p>
      </div>

      <!-- Error State -->
      <div v-else-if="ordersStore.error" class="h-[60vh] flex flex-col items-center justify-center text-center">
        <p class="text-red-500 font-black mb-4 uppercase text-xs tracking-widest">Sync Error: {{ ordersStore.error }}</p>
        <button @click="ordersStore.fetchActiveOrders()" class="bg-orange-600 px-8 py-3 rounded-xl font-black uppercase tracking-widest text-[10px] text-white shadow-lg shadow-orange-900/20">Retry Sync</button>
      </div>

      <!-- Main Board -->
      <div v-else class="h-full w-full">
        <!-- BIG-TECH STANDARD: Using ClientOnly ensures that the authenticated 
             dashboard is never incorrectly rendered by the Vercel server -->
        <ClientOnly>
          <PosOrderBoard @edit="handleEditOrder" />
          
          <template #fallback>
            <div class="h-[60vh] flex flex-col items-center justify-center opacity-50">
              <div class="animate-pulse flex flex-col items-center">
                <div class="h-10 w-10 bg-gray-200 dark:bg-gray-800 rounded-full mb-4"></div>
                <div class="h-2 w-24 bg-gray-100 dark:bg-gray-900 rounded-full"></div>
              </div>
            </div>
          </template>
        </ClientOnly>
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