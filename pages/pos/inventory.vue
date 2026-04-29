<script setup lang="ts">
import { useInventoryStore } from '~/stores/inventory'
import type { InventoryItem } from '~/types'
import PosHeader from '~/components/pos/PosHeader.vue'
import { useUI } from '~/composables/useUI'

useHead({
  title: 'Inventory Management'
})

definePageMeta({
  middleware: 'auth'
})

const inventoryStore = useInventoryStore()
const { notify } = useUI()

// --- State ---
const savingItems = ref<Record<string, boolean>>({})
const lastSavedId = ref<string | null>(null)
const isModalOpen = ref(false)
const isSettingsModalOpen = ref(false)
const mailingListInput = ref('')
const isSavingSettings = ref(false)
const isSendingReport = ref(false)

// --- New Item Form ---
const newItem = ref({
  name: '',
  unopened_count: 0,
  unit: 'cartons',
  nearest_expiry_date: ''
})

const isAdding = ref(false)

/**
 * BIG-TECH UI: Logic for Expiry Flagging
 */
const isExpiringSoon = (dateString: string | null) => {
  if (!dateString) return false
  const expiry = new Date(dateString)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const diffTime = expiry.getTime() - today.getTime()
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
  return diffDays <= 7
}

const getExpiryClass = (dateString: string | null) => {
  if (!dateString) return ''
  const expiry = new Date(dateString)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  if (expiry < today) return 'text-red-600 font-black'
  const diffDays = Math.ceil((expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
  if (diffDays <= 7) return 'text-orange-600 font-black'
  return 'text-gray-900 dark:text-white'
}

const handleSave = async (item: InventoryItem) => {
  savingItems.value[item.id] = true
  lastSavedId.value = null
  const result = await inventoryStore.updateStock(
    item.id,
    item.unopened_count,
    item.opened_state_notes || '',
    item.nearest_expiry_date
  )
  if (result.success) {
    lastSavedId.value = item.id
    notify({ type: 'success', message: 'Stock Updated', description: `${item.name} has been synced.` })
    setTimeout(() => { if (lastSavedId.value === item.id) lastSavedId.value = null }, 2000)
  } else {
    notify({ type: 'error', message: 'Update Failed', description: result.error })
  }
  savingItems.value[item.id] = false
}

const handleAddItem = async () => {
  if (!newItem.value.name) return
  isAdding.value = true
  const result = await inventoryStore.addItem({
    name: newItem.value.name,
    unopened_count: newItem.value.unopened_count,
    unit: newItem.value.unit,
    nearest_expiry_date: newItem.value.nearest_expiry_date || null
  })
  if (result.success) {
    isModalOpen.value = false
    notify({ type: 'success', message: 'Item Added', description: `${newItem.value.name} is now in inventory.` })
    newItem.value = { name: '', unopened_count: 0, unit: 'cartons', nearest_expiry_date: '' }
  } else {
    notify({ type: 'error', message: 'Creation Failed', description: result.error })
  }
  isAdding.value = false
}

const openSettings = () => {
  mailingListInput.value = inventoryStore.settings.mailing_list
  isSettingsModalOpen.value = true
}

const handleSaveSettings = async () => {
  isSavingSettings.value = true
  const result = await inventoryStore.updateSettings({ mailing_list: mailingListInput.value })
  if (result.success) {
    isSettingsModalOpen.value = false
    notify({ type: 'success', message: 'Settings Saved', description: 'Mailing list updated successfully.' })
  } else {
    notify({ type: 'error', message: 'Save Failed', description: result.error })
  }
  isSavingSettings.value = false
}

const handleSendReport = async () => {
  if (!inventoryStore.settings.mailing_list) {
    notify({ type: 'warning', message: 'Config Missing', description: 'Please set a mailing list first.' })
    return
  }
  
  isSendingReport.value = true
  const result = await inventoryStore.sendStatusReport()
  if (result.success) {
    notify({ type: 'success', message: 'Report Sent', description: 'Inventory list emailed to admins.' })
  } else {
    notify({ type: 'error', message: 'Send Failed', description: result.error })
  }
  isSendingReport.value = false
}

onMounted(() => {
  inventoryStore.fetchInventory()
  inventoryStore.fetchSettings()
})
</script>

<template>
  <div class="w-full h-dvh flex flex-col overflow-hidden bg-gray-50 dark:bg-black transition-colors duration-300">
    <PosHeader active-page="inventory" class="w-full flex-shrink-0" />

    <main class="flex-1 overflow-hidden p-4 sm:p-8 flex flex-col">
      <!-- Page Header -->
      <div class="flex items-center justify-between mb-8">
        <div>
          <h2 class="text-3xl font-black text-gray-900 dark:text-white uppercase italic tracking-tighter">
            Inventory Control
          </h2>
          <p class="text-[10px] font-bold text-gray-400 uppercase tracking-[0.2em] mt-1">Manual Stock Adjustment & Expiry Tracking</p>
        </div>
        
        <div class="flex items-center gap-4">
          <!-- Send Report Button -->
          <button 
            @click="handleSendReport"
            :disabled="isSendingReport"
            class="p-3 rounded-2xl bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 text-gray-400 hover:text-orange-600 transition-all shadow-sm disabled:opacity-50"
            title="Send Inventory Status Report"
          >
            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" :class="{'animate-pulse text-orange-600': isSendingReport}" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
            </svg>
          </button>

          <button 
            @click="openSettings"
            class="p-3 rounded-2xl bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 text-gray-400 hover:text-orange-600 transition-all shadow-sm"
            title="Mailing List Settings"
          >
            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
          </button>

          <button 
            @click="isModalOpen = true"
            class="bg-gray-900 dark:bg-white dark:text-black text-white px-6 py-3 rounded-2xl font-black uppercase text-[10px] tracking-widest hover:bg-orange-600 hover:text-white transition-all active:scale-95 shadow-lg shadow-gray-200 dark:shadow-none"
          >
            + Add New Item
          </button>
          
          <div class="h-8 w-[1px] bg-gray-200 dark:bg-gray-800 hidden sm:block mx-2"></div>
          
          <button @click="inventoryStore.fetchInventory" class="p-2.5 hover:bg-white dark:hover:bg-gray-800 rounded-xl transition-all text-gray-400 hover:text-orange-600">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" :class="{'animate-spin': inventoryStore.isLoading}" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>
        </div>
      </div>

      <!-- Inventory Spreadsheet -->
      <div class="flex-1 bg-white dark:bg-gray-900 rounded-[2.5rem] shadow-2xl shadow-gray-200/50 dark:shadow-none border border-gray-100 dark:border-gray-800 overflow-hidden flex flex-col">
        
        <!-- Table Header -->
        <div class="grid grid-cols-12 gap-4 px-8 py-5 border-b border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/30">
          <div class="col-span-4 text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Item Description</div>
          <div class="col-span-2 text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Unopened Qty</div>
          <div class="col-span-3 text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Opened State / Notes</div>
          <div class="col-span-2 text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Nearest Expiry</div>
          <div class="col-span-1"></div>
        </div>

        <!-- Scrollable Rows -->
        <div class="flex-1 overflow-y-auto custom-scrollbar">
          <div 
            v-for="item in inventoryStore.allItems" 
            :key="item.id"
            class="grid grid-cols-12 gap-4 px-8 py-4 items-center border-b border-gray-50 dark:border-gray-800/50 transition-all duration-500"
            :class="[
              isExpiringSoon(item.nearest_expiry_date) ? 'bg-red-50/30 dark:bg-red-950/5' : '',
              lastSavedId === item.id ? 'bg-green-50 dark:bg-green-950/20' : ''
            ]"
          >
            <!-- Item Name -->
            <div class="col-span-4">
              <div class="flex items-center gap-2">
                <div v-if="isExpiringSoon(item.nearest_expiry_date)" class="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse"></div>
                <p class="font-black text-gray-900 dark:text-white uppercase italic text-sm tracking-tight">{{ item.name }}</p>
              </div>
              <p class="text-[9px] font-bold text-gray-400 uppercase tracking-widest mt-0.5 ml-3.5">Unit: {{ item.unit }}</p>
            </div>

            <!-- Unopened Count -->
            <div class="col-span-2">
              <input 
                v-model.number="item.unopened_count"
                type="number"
                class="w-full bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-xl px-4 py-2.5 text-sm font-black text-gray-900 dark:text-white focus:ring-2 focus:ring-orange-500 outline-none transition-all"
              />
            </div>

            <!-- Notes -->
            <div class="col-span-3">
              <input 
                v-model="item.opened_state_notes"
                type="text"
                placeholder="e.g. 500ml left"
                class="w-full bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-xl px-4 py-2.5 text-xs font-bold text-gray-500 dark:text-gray-400 focus:ring-2 focus:ring-orange-500 outline-none transition-all placeholder:text-gray-300 dark:placeholder:text-gray-600"
              />
            </div>

            <!-- Expiry Date -->
            <div class="col-span-2">
              <input 
                v-model="item.nearest_expiry_date"
                type="date"
                :class="getExpiryClass(item.nearest_expiry_date)"
                class="w-full bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-xl px-4 py-2.5 text-[10px] outline-none focus:ring-2 focus:ring-orange-500 transition-all uppercase"
              />
            </div>

            <!-- Save Action -->
            <div class="col-span-1 flex justify-end">
              <button 
                @click="handleSave(item)"
                :disabled="savingItems[item.id]"
                class="w-11 h-11 flex items-center justify-center rounded-2xl transition-all shadow-sm group"
                :class="[
                  savingItems[item.id] ? 'bg-gray-100 dark:bg-gray-800 text-gray-400' :
                  lastSavedId === item.id ? 'bg-green-600 text-white' :
                  'bg-gray-900 dark:bg-white dark:text-black text-white hover:bg-orange-600 hover:text-white active:scale-95'
                ]"
              >
                <div v-if="savingItems[item.id]" class="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin"></div>
                <svg v-else xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path v-if="lastSavedId === item.id" stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7" />
                  <path v-else stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>
    </main>

    <!-- Add Item Modal -->
    <Teleport to="body">
      <Transition 
        enter-active-class="transition duration-300 ease-out" 
        enter-from-class="opacity-0" 
        enter-to-class="opacity-100"
        leave-active-class="transition duration-200 ease-in"
        leave-from-class="opacity-100"
        leave-to-class="opacity-0"
      >
        <div v-if="isModalOpen" class="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-gray-950/60 backdrop-blur-sm">
          <div class="bg-white dark:bg-gray-900 w-full max-w-md rounded-[2.5rem] p-8 shadow-2xl border border-gray-100 dark:border-gray-800 animate-in zoom-in-95 duration-300">
            <h3 class="text-xl font-black text-gray-900 dark:text-white uppercase italic tracking-tight mb-6">New Inventory Item</h3>
            
            <form @submit.prevent="handleAddItem" class="space-y-5">
              <div>
                <label class="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 ml-1">Item Name</label>
                <input v-model="newItem.name" required type="text" placeholder="e.g. Oat Milk" class="w-full bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-2xl px-5 py-4 text-sm font-black text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-orange-500 transition-all"/>
              </div>

              <div class="grid grid-cols-2 gap-4">
                <div>
                  <label class="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 ml-1">Unopened Qty</label>
                  <input v-model.number="newItem.unopened_count" type="number" class="w-full bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-2xl px-5 py-4 text-sm font-black text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-orange-500 transition-all"/>
                </div>
                <div>
                  <label class="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 ml-1">Unit</label>
                  <input v-model="newItem.unit" type="text" placeholder="cartons" class="w-full bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-2xl px-5 py-4 text-sm font-black text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-orange-500 transition-all"/>
                </div>
              </div>

              <div>
                <label class="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 ml-1">Nearest Expiry Date</label>
                <input v-model="newItem.nearest_expiry_date" type="date" class="w-full bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-2xl px-5 py-4 text-[10px] font-black uppercase text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-orange-500 transition-all"/>
              </div>

              <div class="flex gap-3 pt-4">
                <button type="button" @click="isModalOpen = false" class="flex-1 px-6 py-4 rounded-2xl font-black uppercase text-[10px] tracking-widest text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 transition-all">Cancel</button>
                <button type="submit" :disabled="isAdding" class="flex-1 bg-orange-600 text-white px-6 py-4 rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-lg shadow-orange-900/20 active:scale-95 disabled:opacity-50">
                  {{ isAdding ? 'Adding...' : 'Confirm Item' }}
                </button>
              </div>
            </form>
          </div>
        </div>
      </Transition>
    </Teleport>

    <!-- Mailing List Settings Modal -->
    <Teleport to="body">
      <Transition 
        enter-active-class="transition duration-300 ease-out" 
        enter-from-class="opacity-0" 
        enter-to-class="opacity-100"
        leave-active-class="transition duration-200 ease-in"
        leave-from-class="opacity-100"
        leave-to-class="opacity-0"
      >
        <div v-if="isSettingsModalOpen" class="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-gray-950/60 backdrop-blur-sm">
          <div class="bg-white dark:bg-gray-900 w-full max-w-md rounded-[2.5rem] p-8 shadow-2xl border border-gray-100 dark:border-gray-800">
            <h3 class="text-xl font-black text-gray-900 dark:text-white uppercase italic tracking-tight mb-2">Notification Settings</h3>
            <p class="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-6">Configure who receives inventory alerts</p>
            
            <div class="space-y-5">
              <div>
                <label class="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 ml-1">Admin Mailing List</label>
                <textarea 
                  v-model="mailingListInput" 
                  rows="3"
                  placeholder="e.g. admin@hg.com, barista@hg.com" 
                  class="w-full bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-2xl px-5 py-4 text-sm font-bold text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-orange-500 transition-all"
                ></textarea>
                <p class="text-[8px] text-gray-400 mt-2 ml-1 uppercase tracking-wider font-bold">Separate multiple emails with commas</p>
              </div>

              <div class="flex gap-3 pt-4">
                <button type="button" @click="isSettingsModalOpen = false" class="flex-1 px-6 py-4 rounded-2xl font-black uppercase text-[10px] tracking-widest text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 transition-all">Cancel</button>
                <button @click="handleSaveSettings" :disabled="isSavingSettings" class="flex-[2] bg-gray-900 dark:bg-white dark:text-black text-white px-6 py-4 rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-lg active:scale-95 disabled:opacity-50">
                  {{ isSavingSettings ? 'Saving...' : 'Update Settings' }}
                </button>
              </div>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<style scoped>
.custom-scrollbar::-webkit-scrollbar { width: 6px; }
.custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
.custom-scrollbar::-webkit-scrollbar-thumb { @apply bg-gray-200 dark:bg-gray-800; border-radius: 10px; }
input::-webkit-outer-spin-button, input::-webkit-inner-spin-button { -webkit-appearance: none; margin: 0; }
</style>
