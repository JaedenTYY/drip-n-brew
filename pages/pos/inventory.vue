<script setup lang="ts">
import { useInventoryStore } from '~/stores/inventory'
import type { InventoryItem } from '~/types'
import PosHeader from '~/components/pos/PosHeader.vue'

useHead({
  title: 'Inventory Management'
})

definePageMeta({
  middleware: 'auth'
})

const inventoryStore = useInventoryStore()

// Local state to track which rows are currently being saved
const savingItems = ref<Record<string, boolean>>({})

/**
 * BIG-TECH UI: Logic for Expiry Flagging
 * Returns true if the date is within the next 7 days.
 */
const isExpiringSoon = (dateString: string | null) => {
  if (!dateString) return false
  const expiry = new Date(dateString)
  const today = new Date()
  const diffTime = expiry.getTime() - today.getTime()
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
  return diffDays <= 7 && diffDays >= 0
}

const handleSave = async (item: InventoryItem) => {
  savingItems.value[item.id] = true
  
  const result = await inventoryStore.updateStock(
    item.id,
    item.unopened_count,
    item.opened_state_notes || '',
    item.nearest_expiry_date
  )

  if (!result.success) {
    alert(`Failed to save ${item.name}: ${result.error}`)
  }
  
  savingItems.value[item.id] = false
}

onMounted(() => {
  inventoryStore.fetchInventory()
})
</script>

<template>
  <div class="w-full h-dvh flex flex-col overflow-hidden bg-gray-50 dark:bg-black transition-colors duration-300">
    <!-- POS Header -->
    <PosHeader active-page="dashboard" class="w-full flex-shrink-0" />

    <main class="flex-1 overflow-hidden p-4 sm:p-8 flex flex-col">
      <!-- Page Header -->
      <div class="flex items-center justify-between mb-8">
        <div>
          <h2 class="text-3xl font-black text-gray-900 dark:text-white uppercase italic tracking-tighter">
            Inventory Control
          </h2>
          <p class="text-[10px] font-bold text-gray-400 uppercase tracking-[0.2em] mt-1">Manual Stock Adjustment & Expiry Tracking</p>
        </div>
        
        <!-- Legend -->
        <div class="flex items-center gap-4">
          <div class="flex items-center gap-2">
            <div class="w-3 h-3 rounded-full bg-red-100 border border-red-200"></div>
            <span class="text-[10px] font-black text-gray-500 uppercase tracking-widest">Expiring Soon (&lt;7d)</span>
          </div>
          <button @click="inventoryStore.fetchInventory" class="p-2 hover:bg-white rounded-xl transition-colors text-gray-400 hover:text-orange-600">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" :class="{'animate-spin': inventoryStore.isLoading}" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>
        </div>
      </div>

      <!-- Inventory Spreadsheet -->
      <div class="flex-1 bg-white dark:bg-gray-900 rounded-[2.5rem] shadow-xl shadow-gray-200/50 dark:shadow-none border border-gray-100 dark:border-gray-800 overflow-hidden flex flex-col">
        
        <!-- Table Header -->
        <div class="grid grid-cols-12 gap-4 px-8 py-5 border-b border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/30">
          <div class="col-span-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Item Description</div>
          <div class="col-span-2 text-[10px] font-black text-gray-400 uppercase tracking-widest">Unopened Qty</div>
          <div class="col-span-3 text-[10px] font-black text-gray-400 uppercase tracking-widest">Opened State / Notes</div>
          <div class="col-span-2 text-[10px] font-black text-gray-400 uppercase tracking-widest">Nearest Expiry</div>
          <div class="col-span-1"></div>
        </div>

        <!-- Scrollable Rows -->
        <div class="flex-1 overflow-y-auto custom-scrollbar">
          <div 
            v-for="item in inventoryStore.allItems" 
            :key="item.id"
            class="grid grid-cols-12 gap-4 px-8 py-4 items-center border-b border-gray-50 dark:border-gray-800/50 transition-colors"
            :class="[
              isExpiringSoon(item.nearest_expiry_date) 
                ? 'bg-red-50/50 dark:bg-red-950/10' 
                : 'hover:bg-gray-50/50 dark:hover:bg-gray-800/20'
            ]"
          >
            <!-- Item Name -->
            <div class="col-span-4">
              <p class="font-black text-gray-900 dark:text-white uppercase italic text-sm tracking-tight">{{ item.name }}</p>
              <p class="text-[9px] font-bold text-gray-400 uppercase tracking-widest mt-0.5">Unit: {{ item.unit }}</p>
            </div>

            <!-- Unopened Count -->
            <div class="col-span-2">
              <input 
                v-model.number="item.unopened_count"
                type="number"
                class="w-full bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-xl px-4 py-2.5 text-sm font-bold text-gray-900 dark:text-white focus:ring-2 focus:ring-orange-500 outline-none transition-all"
              />
            </div>

            <!-- Notes -->
            <div class="col-span-3">
              <input 
                v-model="item.opened_state_notes"
                type="text"
                placeholder="e.g. 500ml left"
                class="w-full bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-xl px-4 py-2.5 text-sm font-medium text-gray-600 dark:text-gray-300 focus:ring-2 focus:ring-orange-500 outline-none transition-all"
              />
            </div>

            <!-- Expiry Date -->
            <div class="col-span-2 text-right">
              <input 
                v-model="item.nearest_expiry_date"
                type="date"
                class="w-full bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-xl px-4 py-2.5 text-[11px] font-black uppercase text-gray-900 dark:text-white focus:ring-2 focus:ring-orange-500 outline-none transition-all"
              />
            </div>

            <!-- Save Action -->
            <div class="col-span-1 flex justify-end">
              <button 
                @click="handleSave(item)"
                :disabled="savingItems[item.id]"
                class="w-10 h-10 flex items-center justify-center rounded-xl transition-all shadow-sm group"
                :class="[
                  savingItems[item.id] 
                    ? 'bg-gray-100 text-gray-400' 
                    : 'bg-orange-600 text-white hover:bg-orange-700 hover:shadow-lg hover:shadow-orange-900/20 active:scale-95'
                ]"
              >
                <div v-if="savingItems[item.id]" class="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin"></div>
                <svg v-else xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 group-hover:scale-110 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7" />
                </svg>
              </button>
            </div>
          </div>
        </div>

        <!-- Empty State -->
        <div v-if="inventoryStore.allItems.length === 0 && !inventoryStore.isLoading" class="p-20 text-center text-gray-400">
          <p class="font-black uppercase tracking-widest text-xs">No inventory items found.</p>
        </div>
      </div>
    </main>
  </div>
</template>

<style scoped>
/* Custom Scrollbar for the Spreadsheet feel */
.custom-scrollbar::-webkit-scrollbar {
  width: 6px;
}
.custom-scrollbar::-webkit-scrollbar-track {
  background: transparent;
}
.custom-scrollbar::-webkit-scrollbar-thumb {
  @apply bg-gray-200 dark:bg-gray-800;
  border-radius: 10px;
}

/* Remove arrows from number input */
input::-webkit-outer-spin-button,
input::-webkit-inner-spin-button {
  -webkit-appearance: none;
  margin: 0;
}
</style>
