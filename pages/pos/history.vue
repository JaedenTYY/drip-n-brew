<script setup lang="ts">
import { useOrdersStore } from '~/stores/orders'
import PosHeader from '~/components/pos/PosHeader.vue'

useHead({
  title: 'Order History'
})

definePageMeta({
  middleware: 'auth'
})

const ordersStore = useOrdersStore()
const route = useRoute()
const router = useRouter()

// --- State ---
const selectedOrder = ref<any>(null)

// --- Filter State ---
// Hydrate from URL query params for persistence
const filters = ref({
  search: (route.query.search as string) || '',
  type: (route.query.type as string) || '',
  voucher: (route.query.voucher as string) || '',
  startDate: (route.query.startDate as string) || '',
  endDate: (route.query.endDate as string) || ''
})

// --- URL Synchronization ---
// Watch filters and update URL without triggering a full page reload
watch(filters, (newFilters) => {
  const query = { ...newFilters }
  // Clean up empty values to keep URL tidy
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

// --- Search Debouncing ---
let searchTimeout: any
watch(() => filters.value.search, () => {
  clearTimeout(searchTimeout)
  searchTimeout = setTimeout(fetchHistory, 300)
})

// --- Instant Filter Watcher ---
watch([
  () => filters.value.type, 
  () => filters.value.voucher, 
  () => filters.value.startDate, 
  () => filters.value.endDate
], fetchHistory)

onMounted(() => {
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

const confirmDelete = async (orderId: string, customerName: string) => {
  if (confirm(`Are you sure you want to permanently delete the order for "${customerName}"? This action cannot be undone.`)) {
    await ordersStore.deleteOrder(orderId)
  }
}
</script>

<template>
  <div class="min-h-dvh bg-white dark:bg-black text-gray-900 dark:text-white transition-colors duration-300">
    <!-- Unified POS Header -->
    <PosHeader active-page="history" />

    <!-- History Controls -->
    <div class="max-w-5xl mx-auto pt-12 px-6">
      <div class="bg-gray-50 dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-[2.5rem] p-8 shadow-sm transition-all duration-500">
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
          <!-- Customer Search -->
          <div class="space-y-2">
            <label class="block text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Customer Name</label>
            <div class="relative group">
              <input 
                v-model="filters.search"
                type="text" 
                placeholder="Search..."
                class="w-full bg-white dark:bg-black border border-gray-100 dark:border-gray-800 rounded-2xl px-5 py-3.5 text-sm font-bold focus:ring-2 focus:ring-orange-600 outline-none transition-all pr-10"
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
                class="w-full bg-white dark:bg-black border border-gray-100 dark:border-gray-800 rounded-2xl px-5 py-3.5 text-sm font-bold focus:ring-2 focus:ring-orange-600 outline-none transition-all appearance-none cursor-pointer"
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
                placeholder="WELCOME100..."
                class="w-full bg-white dark:bg-black border border-gray-100 dark:border-gray-800 rounded-2xl px-5 py-3.5 text-sm font-bold focus:ring-2 focus:ring-orange-600 outline-none transition-all"
              />
            </div>
          </div>

          <!-- Date Range -->
          <div class="space-y-2 lg:col-span-2">
            <label class="block text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1 text-center sm:text-left">Date Filter</label>
            <div class="flex items-center gap-3">
              <input 
                v-model="filters.startDate"
                type="date" 
                class="flex-1 bg-white dark:bg-black border border-gray-100 dark:border-gray-800 rounded-2xl px-5 py-3.5 text-xs font-bold focus:ring-2 focus:ring-orange-600 outline-none transition-all"
              />
              <span class="text-gray-300 font-bold hidden sm:inline">→</span>
              <input 
                v-model="filters.endDate"
                type="date" 
                class="flex-1 bg-white dark:bg-black border border-gray-100 dark:border-gray-800 rounded-2xl px-5 py-3.5 text-xs font-bold focus:ring-2 focus:ring-orange-600 outline-none transition-all"
              />
              <button 
                @click="filters = { search: '', type: '', voucher: '', startDate: '', endDate: '' }"
                class="p-3.5 rounded-2xl bg-white dark:bg-black border border-gray-100 dark:border-gray-800 text-gray-400 hover:text-orange-600 hover:border-orange-600 transition-all shadow-sm active:scale-95"
                title="Reset Filters"
              >
                <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- History List -->
    <div class="max-w-5xl mx-auto py-8 px-6">
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
          @click="selectedOrder = order"
          class="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-[2rem] py-4 px-6 flex flex-wrap items-center justify-between gap-4 hover:border-orange-600/50 hover:shadow-xl hover:shadow-orange-900/5 transition-all group shadow-sm cursor-pointer active:scale-[0.99]"
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
                <!-- Standardized Date -->
                <span class="text-[9px] text-gray-400 font-bold uppercase tracking-widest">{{ formatDate(order.created_at) }}</span>
                
                <!-- Standardized Order Type Badge (Fixed Width) -->
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

                <!-- Standardized Promo Badge (Fixed Width) -->
                <span v-if="order.promo_code" class="w-16 inline-flex justify-center items-center text-[8px] font-black bg-orange-600 text-white py-0.5 rounded border border-orange-700 uppercase tracking-tighter shadow-sm">
                  {{ order.promo_code }}
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
              <div v-if="!order.items?.length" class="text-[9px] font-bold text-gray-300 uppercase tracking-widest italic">Legacy/SQL Order</div>
            </div>
          </div>

          <div class="flex items-center gap-4">
            <div class="text-right">
              <p class="text-[8px] font-black text-gray-400 uppercase tracking-widest mb-0.5">Paid</p>
              <p class="text-lg font-black text-orange-600 tracking-tighter italic leading-none">RM{{ order.total_price.toFixed(2) }}</p>
            </div>
            
            <button 
              @click="confirmDelete(order.id, order.customer_name)"
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

    <!-- Order Detail Modal (Teleport to Body for full-screen overlay) -->
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
          <!-- Backdrop -->
          <div @click="selectedOrder = null" class="absolute inset-0 bg-black/40 backdrop-blur-md"></div>
          
          <!-- Modal Content -->
          <div class="relative w-full max-w-xl bg-white dark:bg-gray-900 rounded-[3rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
            <!-- Header -->
            <div class="p-8 pb-6 border-b border-gray-100 dark:border-gray-800">
              <div class="flex justify-between items-start mb-4">
                <div>
                  <div class="flex items-center gap-2 mb-2">
                    <span class="text-[10px] font-black bg-orange-600 text-white px-2 py-0.5 rounded-md uppercase tracking-tighter">
                      #{{ selectedOrder.order_number || selectedOrder.id.slice(0, 4) }}
                    </span>
                    <h2 class="text-3xl font-black uppercase italic tracking-tighter text-gray-900 dark:text-white leading-none">{{ selectedOrder.customer_name }}</h2>
                  </div>
                  <p class="text-[10px] font-black text-orange-600 uppercase tracking-[0.4em] mt-1">Transaction Verified ✓</p>
                </div>
                <button @click="selectedOrder = null" class="p-3 rounded-2xl bg-gray-50 dark:bg-gray-800 text-gray-400 hover:text-gray-900 dark:hover:text-white transition-all">
                  <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <!-- Metadata Chips -->
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

            <!-- Body: Items List -->
            <div class="p-8 max-h-[50vh] overflow-y-auto custom-scrollbar">
              <h4 class="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-6">Itemized Summary</h4>
              
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

              <!-- SQL Placeholder if no items -->
              <div v-else class="text-center py-10 bg-gray-50 dark:bg-black/30 rounded-3xl border-2 border-dashed border-gray-100 dark:border-gray-800">
                <p class="text-xs font-bold text-gray-400 uppercase tracking-widest italic">Item breakdown unavailable for this record</p>
              </div>
            </div>

            <!-- Footer: Total -->
            <div class="p-8 bg-gray-50 dark:bg-gray-950/50 border-t border-gray-100 dark:border-gray-800 flex items-center justify-between">
              <div>
                <p class="text-[10px] font-black text-gray-400 uppercase tracking-widest leading-none">Total Payment</p>
                <p class="text-[8px] font-bold text-gray-300 mt-1">Transaction Verified ✓</p>
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
.custom-scrollbar::-webkit-scrollbar-track {
  background: transparent;
}
.custom-scrollbar::-webkit-scrollbar-thumb {
  @apply bg-gray-200 dark:bg-gray-800 rounded-full;
}
</style>
