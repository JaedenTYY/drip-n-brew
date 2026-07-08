<script setup lang="ts">
import type { InventoryItem } from '~/types'

useHead({
  title: 'Live Inventory Status - Drip & Brew'
})

// Do not require auth middleware here
definePageMeta({
  layout: false // Custom minimal layout for public view
})

const items = ref<InventoryItem[]>([])
const isLoading = ref(true)
const error = ref<string | null>(null)

const isExpiringSoon = (dateString: string | null) => {
  if (!dateString) return false
  const expiry = new Date(dateString)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const diffTime = expiry.getTime() - today.getTime()
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
  return diffDays <= 7
}

const fetchInventory = async () => {
  isLoading.value = true
  error.value = null
  try {
    const response = await $fetch('/api/shared-inventory')
    if (response.success) {
      items.value = response.data as InventoryItem[]
    } else {
      error.value = response.error || 'Failed to load inventory'
    }
  } catch (err: any) {
    error.value = err.message
  } finally {
    isLoading.value = false
  }
}

onMounted(() => {
  fetchInventory()
})
</script>

<template>
  <div class="min-h-screen bg-gray-50 dark:bg-black p-4 sm:p-8 transition-colors duration-300 flex justify-center">
    <div class="w-full max-w-5xl flex flex-col h-[calc(100vh-2rem)] sm:h-[calc(100vh-4rem)]">
      
      <!-- Header -->
      <div class="flex flex-col sm:flex-row sm:items-end justify-between gap-6 mb-8 flex-shrink-0">
        <div>
          <div class="flex items-center gap-3 mb-2">
            <div class="w-8 h-8 rounded-full bg-orange-600 flex items-center justify-center shadow-lg shadow-orange-900/30">
              <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
              </svg>
            </div>
            <p class="text-sm font-black text-orange-600 uppercase tracking-[0.2em]">Drip & Brew</p>
          </div>
          <h1 class="text-3xl sm:text-5xl font-black text-gray-900 dark:text-white tracking-tighter uppercase italic">
            Live Inventory
          </h1>
          <p class="text-sm font-bold text-gray-400 mt-2">Read-only view of current stock status</p>
        </div>
        
        <button @click="fetchInventory" class="self-start sm:self-auto p-3 rounded-2xl bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 text-gray-400 hover:text-orange-600 transition-all shadow-sm">
          <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" :class="{'animate-spin': isLoading}" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
        </button>
      </div>

      <!-- Main Content -->
      <div v-if="isLoading" class="flex-1 flex items-center justify-center bg-white dark:bg-gray-900 rounded-[2rem] border border-gray-100 dark:border-gray-800 shadow-2xl shadow-gray-200/50 dark:shadow-none">
        <div class="flex flex-col items-center gap-4">
          <div class="w-10 h-10 border-4 border-gray-200 dark:border-gray-700 border-t-orange-600 rounded-full animate-spin"></div>
          <p class="text-xs font-black text-gray-400 uppercase tracking-widest">Loading Stock...</p>
        </div>
      </div>
      
      <div v-else-if="error" class="flex-1 flex items-center justify-center bg-white dark:bg-gray-900 rounded-[2rem] border border-red-100 dark:border-red-900/30">
        <div class="text-center">
          <svg xmlns="http://www.w3.org/2000/svg" class="h-12 w-12 text-red-500 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <p class="text-red-500 font-bold">{{ error }}</p>
        </div>
      </div>

      <div v-else class="flex-1 bg-white dark:bg-gray-900 rounded-[2rem] shadow-2xl shadow-gray-200/50 dark:shadow-none border border-gray-100 dark:border-gray-800 overflow-hidden flex flex-col">
        <!-- Table Header -->
        <div class="grid grid-cols-12 gap-4 px-6 sm:px-8 py-5 border-b border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/30 flex-shrink-0">
          <div class="col-span-6 sm:col-span-5 text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Item</div>
          <div class="col-span-3 sm:col-span-2 text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] text-center">Unopened Qty</div>
          <div class="hidden sm:block sm:col-span-3 text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Notes</div>
          <div class="col-span-3 sm:col-span-2 text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] text-right">Expiry</div>
        </div>

        <!-- Scrollable Rows -->
        <div class="flex-1 overflow-y-auto custom-scrollbar">
          <div 
            v-for="item in items" 
            :key="item.id"
            class="grid grid-cols-12 gap-4 px-6 sm:px-8 py-5 items-center border-b border-gray-50 dark:border-gray-800/50 transition-colors"
            :class="isExpiringSoon(item.nearest_expiry_date) ? 'bg-red-50/30 dark:bg-red-950/5' : 'hover:bg-gray-50/50 dark:hover:bg-gray-800/30'"
          >
            <!-- Item Name -->
            <div class="col-span-6 sm:col-span-5 flex flex-col">
              <div class="flex items-center gap-2">
                <div v-if="isExpiringSoon(item.nearest_expiry_date)" class="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse flex-shrink-0"></div>
                <p class="font-black text-gray-900 dark:text-white uppercase italic text-sm tracking-tight truncate">{{ item.name }}</p>
              </div>
              <p class="text-[9px] font-bold text-gray-400 uppercase tracking-widest mt-1">Unit: {{ item.unit }}</p>
              <!-- Mobile only notes -->
              <p v-if="item.opened_state_notes" class="sm:hidden text-xs font-semibold text-gray-500 mt-2 border-l-2 border-gray-200 dark:border-gray-700 pl-2">
                {{ item.opened_state_notes }}
              </p>
            </div>

            <!-- Unopened Count -->
            <div class="col-span-3 sm:col-span-2 flex justify-center">
              <div class="px-3 py-1.5 bg-gray-100 dark:bg-gray-800 rounded-lg text-sm font-black text-gray-900 dark:text-white">
                {{ item.unopened_count }}
              </div>
            </div>

            <!-- Notes (Desktop) -->
            <div class="hidden sm:block sm:col-span-3">
              <p class="text-xs font-bold text-gray-500 dark:text-gray-400 truncate" :title="item.opened_state_notes || ''">
                {{ item.opened_state_notes || '-' }}
              </p>
            </div>

            <!-- Expiry Date -->
            <div class="col-span-3 sm:col-span-2 text-right flex justify-end">
              <span 
                v-if="item.nearest_expiry_date" 
                class="text-xs font-bold px-2 py-1 rounded"
                :class="isExpiringSoon(item.nearest_expiry_date) ? 'text-red-600 bg-red-100 dark:bg-red-900/30' : 'text-gray-500'"
              >
                {{ new Date(item.nearest_expiry_date).toLocaleDateString('en-MY', { day: '2-digit', month: 'short', year: 'numeric' }) }}
              </span>
              <span v-else class="text-xs font-bold text-gray-400">-</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.custom-scrollbar::-webkit-scrollbar { width: 6px; }
.custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
.custom-scrollbar::-webkit-scrollbar-thumb { @apply bg-gray-200 dark:bg-gray-800; border-radius: 10px; }
</style>
