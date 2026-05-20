<script setup lang="ts">
import { useOrdersStore } from '~/stores/orders'
import { useUI } from '~/composables/useUI'
import PosHeader from '~/components/pos/PosHeader.vue'

useHead({
  title: 'Order History'
})

definePageMeta({
  middleware: 'auth'
})

const ordersStore = useOrdersStore()
const ui = useUI()
const route = useRoute()
const router = useRouter()

// --- State ---
const selectedOrder = ref<any>(null)
const selectedOrderIds = ref<string[]>([])

// --- Filter State ---
const filters = ref({
  search: (route.query.search as string) || '',
  type: (route.query.type as string) || '',
  voucher: (route.query.voucher as string) || '',
  startDate: (route.query.startDate as string) || '',
  endDate: (route.query.endDate as string) || ''
})

// --- URL Synchronization ---
watch(filters, (newFilters) => {
  const query = { ...newFilters }
  Object.keys(query).forEach(key => {
    if (!query[key as keyof typeof query]) delete query[key as keyof typeof query]
  })
  router.push({ query })
}, { deep: true })

// --- Data Fetching ---
const fetchHistory = () => {
  ordersStore.fetchOrderHistory({
    search: filters.value.search,
    type: filters.value.type,
    voucher: filters.value.voucher,
    startDate: filters.value.startDate,
    endDate: filters.value.endDate
  })
}

// --- Reset Filters Action ---
const resetFilters = () => {
  filters.value = { 
    search: '', 
    type: '', 
    voucher: '', 
    startDate: '', 
    endDate: '' 
  }
  selectedOrderIds.value = []
  fetchHistory() // Ensure we fetch fresh data immediately
}

// --- Search Debouncing ---
let searchTimeout: any
watch(() => filters.value.search, () => {
  clearTimeout(searchTimeout)
  searchTimeout = setTimeout(fetchHistory, 300)
})

watch([
  () => filters.value.type, 
  () => filters.value.voucher, 
  () => filters.value.startDate, 
  () => filters.value.endDate
], () => {
  selectedOrderIds.value = []
  fetchHistory()
})

onMounted(() => {
  // Clear URL query params on mount as requested
  if (Object.keys(route.query).length > 0) {
    router.replace({ query: {} })
    // Re-initialize local state to match empty query
    filters.value = { search: '', type: '', voucher: '', startDate: '', endDate: '' }
  }
  fetchHistory()
})

const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleString('en-MY', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  })
}

// --- Selection Logic ---
const toggleSelection = (orderId: string) => {
  const index = selectedOrderIds.value.indexOf(orderId)
  if (index > -1) selectedOrderIds.value.splice(index, 1)
  else selectedOrderIds.value.push(orderId)
}

const toggleAllSelection = () => {
  if (selectedOrderIds.value.length === ordersStore.historyOrders.length) {
    selectedOrderIds.value = []
  } else {
    selectedOrderIds.value = ordersStore.historyOrders.map(o => o.id)
  }
}

// --- Deletion Logic ---
const confirmDelete = (orderId: string, customerName: string) => {
  ui.askConfirmation({
    title: 'Delete Order',
    message: `Are you sure you want to permanently delete the order for "${customerName}"?`,
    confirmText: 'Yes, Delete',
    type: 'danger',
    onConfirm: async () => {
      await ordersStore.deleteOrder(orderId)
      if (selectedOrder.value?.id === orderId) selectedOrder.value = null
      ui.notify({ type: 'success', message: 'Order deleted' })
    }
  })
}

const bulkDelete = () => {
  const count = selectedOrderIds.value.length
  if (!count) return

  ui.askConfirmation({
    title: 'Bulk Delete',
    message: `Are you sure you want to permanently delete ${count} selected orders?`,
    confirmText: `Delete ${count} Orders`,
    type: 'danger',
    onConfirm: async () => {
      const idsToDelete = [...selectedOrderIds.value]
      
      if (typeof ordersStore.deleteOrders !== 'function') {
        ui.notify({ type: 'error', message: 'System Error: Delete function not found. Please refresh.' })
        return
      }

      const result = await ordersStore.deleteOrders(idsToDelete)
      if (result?.success) {
        if (selectedOrder.value && idsToDelete.includes(selectedOrder.value.id)) {
          selectedOrder.value = null
        }
        selectedOrderIds.value = []
        ui.notify({ type: 'success', message: `${count} orders deleted successfully` })
      } else {
        ui.notify({ type: 'error', message: 'Failed to delete some orders' })
      }
    }
  })
}
</script>

<template>
  <div class="w-full h-dvh flex flex-col overflow-hidden bg-gray-50 dark:bg-black transition-colors duration-300">
    <PosHeader active-page="history" class="w-full flex-shrink-0" />

    <main class="flex-1 overflow-hidden p-4 sm:p-8 flex flex-col max-w-7xl mx-auto w-full">
      <!-- Header & Quick Actions -->
      <div class="flex flex-col sm:flex-row sm:items-end justify-between gap-6 mb-8 flex-shrink-0">
        <PageHeader label="Archive" title="Order History" />
        
        <div class="flex items-center gap-3">
          <!-- Select All Button -->
          <button 
            v-if="ordersStore.historyOrders.length > 0"
            @click="toggleAllSelection" 
            class="group flex items-center gap-3 px-5 py-2.5 rounded-2xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 hover:border-orange-600/50 hover:bg-orange-50/50 dark:hover:bg-orange-950/10 transition-all active:scale-95 shadow-sm"
          >
            <span class="text-[11px] font-black uppercase tracking-widest text-gray-500 group-hover:text-orange-600 transition-colors">
              {{ selectedOrderIds.length === ordersStore.historyOrders.length ? 'Deselect All' : 'Select All' }}
            </span>
            <div 
              class="h-5 w-5 rounded-lg border-2 flex items-center justify-center transition-all"
              :class="selectedOrderIds.length === ordersStore.historyOrders.length ? 'bg-orange-600 border-orange-600 text-white shadow-lg shadow-orange-600/20' : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900'"
            >
              <svg v-if="selectedOrderIds.length === ordersStore.historyOrders.length" xmlns="http://www.w3.org/2000/svg" class="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="4"><path d="M5 13l4 4L19 7" /></svg>
            </div>
          </button>

          <!-- Reset Button -->
          <button 
            @click="resetFilters"
            class="p-3 rounded-2xl bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 text-gray-400 hover:text-orange-600 hover:border-orange-600 transition-all shadow-sm active:scale-95 group"
            title="Clear All Filters"
          >
            <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6 group-hover:rotate-180 transition-transform duration-700 ease-in-out" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>
        </div>
      </div>

      <!-- History Container -->
      <div class="flex-1 bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-[2rem] shadow-2xl shadow-gray-200/50 dark:shadow-none overflow-hidden flex flex-col">
        <!-- Filters Sticky Header -->
        <div class="p-6 sm:p-8 border-b border-gray-50 dark:border-gray-800 bg-gray-50/30 dark:bg-gray-800/20">
          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
            <!-- Customer Search -->
            <div class="space-y-2">
              <label class="block text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Customer Name</label>
              <div class="relative group">
                <input 
                  v-model="filters.search"
                  type="text" 
                  placeholder="Search orders..."
                  class="w-full bg-white dark:bg-black border border-gray-100 dark:border-gray-800 rounded-2xl px-5 py-3 text-sm font-bold focus:ring-2 focus:ring-orange-600 outline-none transition-all pr-10"
                />
                <div class="absolute right-4 top-1/2 -translate-y-1/2 text-gray-300 group-focus-within:text-orange-600 transition-colors">
                  <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
              </div>
            </div>

            <!-- Order Type -->
            <div class="space-y-2">
              <label class="block text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Order Type</label>
              <div class="relative">
                <select 
                  v-model="filters.type"
                  class="w-full bg-white dark:bg-black border border-gray-100 dark:border-gray-800 rounded-2xl px-5 py-3 text-sm font-bold focus:ring-2 focus:ring-orange-600 outline-none transition-all appearance-none cursor-pointer"
                >
                  <option value="">All Types</option>
                  <option value="Dine In">Dine-in</option>
                  <option value="Takeaway">Takeaway</option>
                  <option value="BYO Flask">BYO Flask</option>
                </select>
                <div class="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
                  <svg xmlns="http://www.w3.org/2000/svg" class="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </div>
            </div>

            <!-- Voucher Filter -->
            <div class="space-y-2">
              <label class="block text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Voucher / Code</label>
              <div class="relative group">
                <input 
                  v-model="filters.voucher"
                  type="text" 
                  placeholder="Enter code"
                  class="w-full bg-white dark:bg-black border border-gray-100 dark:border-gray-800 rounded-2xl px-5 py-3 text-sm font-bold focus:ring-2 focus:ring-orange-600 outline-none transition-all"
                />
              </div>
            </div>

            <!-- Date Filter -->
            <div class="space-y-2 lg:col-span-2">
              <label class="block text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Date Filter</label>
              <div class="flex items-center gap-3">
                <BrandedDatePicker 
                  v-model="filters.startDate"
                  placeholder="From"
                />
                <span class="text-gray-300 font-bold hidden sm:inline">→</span>
                <BrandedDatePicker 
                  v-model="filters.endDate"
                  :min-date="filters.startDate"
                  placeholder="To"
                />
              </div>
            </div>
          </div>
        </div>

        <!-- Scrollable History List -->
        <div class="flex-1 overflow-y-auto custom-scrollbar p-6 sm:p-8">
          <div v-if="ordersStore.isLoading && ordersStore.historyOrders.length === 0" class="flex flex-col items-center justify-center py-20">
            <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600 mb-4"></div>
            <p class="text-gray-500 font-bold uppercase tracking-widest text-xs">Loading history...</p>
          </div>

          <div v-else-if="ordersStore.historyOrders.length === 0" class="text-center py-20 bg-gray-50 dark:bg-black/50 rounded-3xl border border-gray-100 dark:border-gray-800/50">
            <p class="text-gray-500 font-bold uppercase tracking-widest text-sm">No completed orders found.</p>
          </div>

          <div v-else class="space-y-3">
            <div 
              v-for="order in ordersStore.historyOrders" 
              :key="order.id"
              class="flex items-center gap-4 group"
            >
              <!-- Multi-select Checkbox -->
              <div 
                @click="toggleSelection(order.id)"
                class="h-10 w-10 shrink-0 rounded-2xl border-2 flex items-center justify-center cursor-pointer transition-all active:scale-90"
                :class="selectedOrderIds.includes(order.id) ? 'bg-orange-600 border-orange-600 text-white' : 'bg-transparent border-gray-100 dark:border-gray-800 hover:border-orange-600/30'"
              >
                <svg v-if="selectedOrderIds.includes(order.id)" xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="3">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              </div>

              <!-- Order Card -->
              <div 
                @click="selectedOrder = order"
                class="flex-1 bg-white dark:bg-black border border-gray-100 dark:border-gray-800 rounded-[2rem] py-4 px-6 flex flex-wrap items-center justify-between gap-4 hover:border-orange-600/50 hover:shadow-xl hover:shadow-orange-900/5 transition-all shadow-sm cursor-pointer active:scale-[0.99]"
                :class="{'ring-2 ring-orange-600/20 bg-orange-50/5': selectedOrderIds.includes(order.id)}"
              >
                <div class="flex items-center gap-5">
                  <div class="h-10 w-10 rounded-xl bg-green-500/10 flex-shrink-0 flex items-center justify-center text-green-500">
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  
                  <div class="min-w-[140px]">
                    <div class="flex items-center gap-2 mb-1.5">
                      <span class="text-[8px] font-black bg-gray-900 dark:bg-white text-white dark:text-gray-900 px-1.5 py-0.5 rounded uppercase tracking-tighter">
                        #{{ order.order_number || order.id.slice(0, 4) }}
                      </span>
                      <h3 class="text-sm font-black uppercase italic tracking-tight text-gray-900 dark:text-white leading-none">{{ order.customer_name }}</h3>
                    </div>
                    
                    <div class="flex items-center gap-2">
                      <span class="text-[9px] text-gray-400 font-bold uppercase tracking-widest">{{ formatDate(order.created_at) }}</span>
                      <span 
                        class="w-16 inline-flex justify-center items-center text-[8px] font-black py-0.5 rounded border uppercase tracking-tighter"
                        :class="{
                          'bg-blue-50 text-blue-500 border-blue-100 dark:bg-blue-950/20 dark:border-blue-900/50': order.order_type === 'Dine In',
                          'bg-orange-50 text-orange-600 border-orange-100 dark:bg-orange-950/20 dark:border-orange-900/50': order.order_type === 'Takeaway',
                          'bg-purple-50 text-purple-500 border-purple-100 dark:bg-purple-950/20 dark:border-purple-900/50': order.order_type === 'BYO Flask'
                        }"
                      >
                        {{ order.order_type || 'Dine In' }}
                      </span>
                    </div>
                  </div>
                </div>

                <div class="flex-1 min-w-[150px]">
                  <div class="flex flex-wrap gap-1.5">
                    <div 
                      v-for="item in order.items" 
                      :key="item.id"
                      class="bg-gray-50/50 dark:bg-gray-800/50 px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-tight flex items-center gap-1.5 text-gray-600 dark:text-gray-400 border border-gray-100/50 dark:border-gray-700/50"
                    >
                      <span class="text-orange-600">{{ item.quantity }}x</span>
                      <span>{{ item.product?.name }}</span>
                    </div>
                  </div>
                </div>

                <div class="flex items-center gap-4">
                  <div class="text-right">
                    <p class="text-[8px] font-black text-gray-400 uppercase tracking-widest mb-0.5">Paid</p>
                    <p class="text-lg font-black text-orange-600 tracking-tighter italic leading-none">RM{{ order.total_price.toFixed(2) }}</p>
                  </div>
                  
                  <button 
                    @click.stop="confirmDelete(order.id, order.customer_name)"
                    class="p-2.5 rounded-xl bg-gray-50 dark:bg-gray-800 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all opacity-0 group-hover:opacity-100"
                    title="Delete Order History"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>

    <!-- Bulk Actions Sticky Bar -->
    <div 
      v-if="selectedOrderIds.length > 0"
      class="fixed bottom-8 left-1/2 -translate-x-1/2 z-[80] bg-gray-900 text-white rounded-2xl px-6 py-4 shadow-2xl flex items-center gap-6 animate-in slide-in-from-bottom-8 duration-500 border border-gray-800"
    >
      <div class="flex items-center gap-3">
        <div class="h-6 w-6 rounded-full bg-orange-600 flex items-center justify-center text-[10px] font-black italic">{{ selectedOrderIds.length }}</div>
        <span class="text-[10px] font-black uppercase tracking-widest">Orders Selected</span>
      </div>
      <div class="h-4 w-px bg-gray-800"></div>
      <div class="flex items-center gap-4">
        <button @click="selectedOrderIds = []" class="text-[10px] font-black uppercase tracking-widest text-gray-400 hover:text-white transition-colors">Clear</button>
        <button 
          @click="bulkDelete"
          class="bg-red-600 hover:bg-red-700 text-white px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all active:scale-95 flex items-center gap-2"
        >
          <svg xmlns="http://www.w3.org/2000/svg" class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
          Bulk Delete
        </button>
      </div>
    </div>

    <!-- Order Detail Modal -->
    <Teleport to="body">
      <Transition 
        enter-active-class="transition duration-300 ease-out"
        enter-from-class="opacity-0"
        enter-to-class="opacity-100"
        leave-active-class="transition duration-200 ease-in"
        leave-from-class="opacity-100"
        leave-to-class="opacity-0"
      >
        <div v-if="selectedOrder" class="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
          <div @click="selectedOrder = null" class="absolute inset-0 bg-black/40 backdrop-blur-md"></div>
          
          <div class="relative w-full max-w-xl bg-white dark:bg-gray-900 rounded-[3rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
            <div class="p-8 pb-6 border-b border-gray-100 dark:border-gray-800">
              <div class="flex justify-between items-start mb-4">
                <div>
                  <div class="flex items-center gap-2 mb-2">
                    <span class="text-[10px] font-black bg-orange-600 text-white px-2 py-0.5 rounded-md uppercase tracking-tighter">
                      #{{ selectedOrder.order_number || selectedOrder.id.slice(0, 4) }}
                    </span>
                    <h2 class="text-3xl font-black uppercase italic tracking-tighter text-gray-900 dark:text-white leading-none">{{ selectedOrder.customer_name }}</h2>
                  </div>
                  <p class="text-[10px] font-black text-orange-600 uppercase tracking-[0.4em] mt-1">Payment Received</p>
                </div>
                <div class="flex gap-2">
                  <button 
                    @click="confirmDelete(selectedOrder.id, selectedOrder.customer_name)"
                    class="p-3 rounded-2xl bg-red-50 dark:bg-red-950/20 text-red-500 hover:bg-red-100 transition-all"
                    title="Delete This Order"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                  <button @click="selectedOrder = null" class="p-3 rounded-2xl bg-gray-50 dark:bg-gray-800 text-gray-400 hover:text-gray-900 dark:hover:text-white transition-all">
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>

              <div class="flex flex-wrap gap-2">
                <span class="px-3 py-1 rounded-full bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700 text-[10px] font-black uppercase tracking-widest text-gray-500">{{ formatDate(selectedOrder.created_at) }}</span>
                <span 
                  class="px-3 py-1 rounded-full border text-[10px] font-black uppercase tracking-widest"
                  :class="{
                    'bg-blue-50 text-blue-500 border-blue-100': selectedOrder.order_type === 'Dine In',
                    'bg-orange-50 text-orange-600 border-orange-100': selectedOrder.order_type === 'Takeaway',
                    'bg-purple-50 text-purple-500 border-purple-100': selectedOrder.order_type === 'BYO Flask'
                  }"
                >
                  {{ selectedOrder.order_type || 'Dine In' }}
                </span>
                <span v-if="selectedOrder.promo_code" class="px-3 py-1 rounded-full bg-orange-600 text-white text-[10px] font-black uppercase tracking-widest">{{ selectedOrder.promo_code }}</span>
              </div>
            </div>

            <div class="p-8 max-h-[50vh] overflow-y-auto custom-scrollbar">
              <h4 class="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-6">Order Details</h4>
              
              <div v-if="selectedOrder.items?.length" class="space-y-6">
                <div v-for="item in selectedOrder.items" :key="item.id" class="flex justify-between items-center group">
                  <div class="flex items-center gap-4">
                    <div class="h-10 w-10 rounded-xl bg-orange-50 dark:bg-orange-950/20 flex items-center justify-center text-orange-600 font-black text-xs">
                      {{ item.quantity }}x
                    </div>
                    <div>
                      <p class="text-sm font-black uppercase tracking-tight text-gray-900 dark:text-white">{{ item.product?.name || 'Handcrafted Drink' }}</p>
                      <div class="flex flex-wrap gap-2 mt-1">
                        <span v-for="(val, key) in item.customizations" :key="key" class="text-[8px] font-bold bg-gray-50 dark:bg-gray-800 text-gray-500 px-1.5 py-0.5 rounded uppercase border border-gray-100 dark:border-gray-700">
                          {{ val }}
                        </span>
                      </div>
                    </div>
                  </div>
                  <p class="text-xs font-black text-gray-400">RM{{ (item.unit_price * item.quantity).toFixed(2) }}</p>
                </div>
              </div>

              <div v-else class="text-center py-10 bg-gray-50 dark:bg-black/30 rounded-3xl border-2 border-dashed border-gray-100 dark:border-gray-800">
                <p class="text-xs font-bold text-gray-400 uppercase tracking-widest italic">Item breakdown unavailable for this record</p>
              </div>
            </div>

            <div class="p-8 bg-gray-50 dark:bg-gray-950/50 border-t border-gray-100 dark:border-gray-800 flex items-center justify-between">
              <div>
                <p class="text-[10px] font-black text-gray-400 uppercase tracking-widest leading-none">Total Payment</p>
                <p class="text-[8px] font-bold text-gray-300 mt-1">Payment Received</p>
              </div>
              <p class="text-4xl font-black text-orange-600 tracking-tighter italic">RM{{ selectedOrder.total_price.toFixed(2) }}</p>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<style scoped>
* {
  @apply transition-colors duration-200;
}

.custom-scrollbar::-webkit-scrollbar {
  width: 4px;
}
.custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
.custom-scrollbar::-webkit-scrollbar-thumb { @apply bg-gray-200 dark:bg-gray-800 rounded-full; }
</style>
