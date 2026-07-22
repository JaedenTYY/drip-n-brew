<script setup lang="ts">
/**
 * Inventory Management: High-performance spreadsheet-style editor.
 *
 * Architecture: Local drafts pattern.
 * - `drafts` holds a local, editable copy of each row's data.
 * - The store (inventoryStore.items) is the source of truth and is NEVER
 *   mutated directly from the template.
 * - Dirty state is computed by comparing drafts against the store's data.
 * - On save, the store is updated and drafts are re-synced.
 */

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
const emailChecklist = ref<{ email: string, active: boolean }[]>([])
const newEmailInput = ref('')
const reportDay = ref(0)
const reportTime = ref('16:30')
const isSavingSettings = ref(false)
const isSendingReport = ref(false)
const editingItem = ref<InventoryItem | null>(null)

/**
 * LOCAL DRAFTS: A plain, non-store-mutating copy of each row.
 * Template inputs bind to this, NOT to the store directly.
 * Key: item.id, Value: editable draft of the item's fields.
 */
const drafts = ref<Record<string, {
  unopened_count: number
  opened_state_notes: string
  nearest_expiry_date: string | null
}>>({})

/**
 * Populates drafts from the store. Called after fetch and after each save.
 */
const syncDrafts = () => {
  const newDrafts: typeof drafts.value = {}
  for (const item of inventoryStore.allItems) {
    newDrafts[item.id] = {
      unopened_count: item.unopened_count,
      opened_state_notes: item.opened_state_notes ?? '',
      nearest_expiry_date: item.nearest_expiry_date ?? null
    }
  }
  drafts.value = newDrafts
}

/**
 * Computed: Which items have unsaved local changes?
 * Compares each draft against the store's source of truth.
 */
const dirtyIds = computed(() => {
  const ids = new Set<string>()
  for (const item of inventoryStore.allItems) {
    const draft = drafts.value[item.id]
    if (!draft) continue
    if (
      draft.unopened_count !== item.unopened_count ||
      (draft.opened_state_notes || '') !== (item.opened_state_notes || '') ||
      (draft.nearest_expiry_date ?? null) !== (item.nearest_expiry_date ?? null)
    ) {
      ids.add(item.id)
    }
  }
  return ids
})

const isDirty = computed(() => dirtyIds.value.size > 0)

// --- Item Form State ---
const itemForm = ref({
  name: '',
  unopened_count: 0,
  unit: 'cartons',
  nearest_expiry_date: ''
})

const isSubmitting = ref(false)

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

/**
 * Single Row Save: reads from the local draft for this item.
 */
const handleSave = async (item: InventoryItem) => {
  const draft = drafts.value[item.id]
  if (!draft) return

  savingItems.value[item.id] = true
  lastSavedId.value = null

  const result = await inventoryStore.updateStock(
    item.id,
    draft.unopened_count,
    draft.opened_state_notes || '',
    draft.nearest_expiry_date,
    item.name,
    item.unit
  )

  if (result.success) {
    lastSavedId.value = item.id
    // Re-sync this row's draft to match the now-saved store value
    const saved = inventoryStore.items[item.id]
    if (saved) {
      drafts.value[item.id] = {
        unopened_count: saved.unopened_count,
        opened_state_notes: saved.opened_state_notes ?? '',
        nearest_expiry_date: saved.nearest_expiry_date ?? null
      }
    }
    notify({ type: 'success', message: 'Stock Updated', description: `${item.name} has been synced.` })
    setTimeout(() => { if (lastSavedId.value === item.id) lastSavedId.value = null }, 2000)
  } else {
    notify({ type: 'error', message: 'Update Failed', description: result.error })
  }
  savingItems.value[item.id] = false
}

/**
 * Batch Save All Changes: collects all dirty rows from drafts.
 */
const handleSaveAll = async () => {
  if (!isDirty.value) return

  const updates = inventoryStore.allItems
    .filter(item => dirtyIds.value.has(item.id))
    .map(item => {
      const draft = drafts.value[item.id]
      return {
        id: item.id,
        unopened_count: draft.unopened_count,
        opened_state_notes: draft.opened_state_notes || '',
        nearest_expiry_date: draft.nearest_expiry_date || null,
        name: item.name,
        unit: item.unit
      }
    })

  updates.forEach(u => savingItems.value[u.id] = true)

  const result = await inventoryStore.batchUpdateStock(updates)

  if (result.success) {
    notify({
      type: 'success',
      message: 'Batch Save Complete',
      description: `Successfully updated ${updates.length} items.`
    })
    // Re-sync all drafts to match the saved store
    syncDrafts()
    updates.forEach(u => savingItems.value[u.id] = false)
  } else {
    notify({ type: 'error', message: 'Batch Update Failed', description: result.error })
    updates.forEach(u => savingItems.value[u.id] = false)
  }
}

const openAddModal = () => {
  editingItem.value = null
  itemForm.value = { name: '', unopened_count: 0, unit: 'cartons', nearest_expiry_date: '' }
  isModalOpen.value = true
}

const openEditModal = (item: InventoryItem) => {
  editingItem.value = item
  itemForm.value = {
    name: item.name,
    unopened_count: item.unopened_count,
    unit: item.unit,
    nearest_expiry_date: item.nearest_expiry_date || ''
  }
  isModalOpen.value = true
}

const handleSubmit = async () => {
  if (!itemForm.value.name) return
  isSubmitting.value = true
  
  let result;
  if (editingItem.value) {
    result = await inventoryStore.updateStock(
      editingItem.value.id,
      itemForm.value.unopened_count,
      editingItem.value.opened_state_notes || '',
      itemForm.value.nearest_expiry_date || null,
      itemForm.value.name,
      itemForm.value.unit
    )
  } else {
    result = await inventoryStore.addItem({
      name: itemForm.value.name,
      unopened_count: itemForm.value.unopened_count,
      unit: itemForm.value.unit,
      nearest_expiry_date: itemForm.value.nearest_expiry_date || null
    })
  }

  if (result.success) {
    isModalOpen.value = false
    notify({ 
      type: 'success', 
      message: editingItem.value ? 'Item Updated' : 'Item Added', 
      description: `${itemForm.value.name} is synced.` 
    })
  } else {
    notify({ type: 'error', message: 'Action Failed', description: result.error })
  }
  isSubmitting.value = false
}

const copyShareLink = async () => {
  const url = window.location.origin + '/shared-stock'
  try {
    await navigator.clipboard.writeText(url)
    notify({ type: 'success', message: 'Link Copied', description: 'Public inventory link copied to clipboard.' })
  } catch (err) {
    notify({ type: 'error', message: 'Copy Failed', description: 'Could not copy link to clipboard.' })
  }
}

const openSettings = () => {
  if (inventoryStore.settings.email_checklist) {
    emailChecklist.value = JSON.parse(JSON.stringify(inventoryStore.settings.email_checklist))
  } else if (inventoryStore.settings.mailing_list) {
    emailChecklist.value = inventoryStore.settings.mailing_list
      .split(',')
      .map(e => ({ email: e.trim(), active: true }))
      .filter(e => e.email)
  } else {
    emailChecklist.value = []
  }
  reportDay.value = inventoryStore.settings.report_day ?? 0
  reportTime.value = inventoryStore.settings.report_time || '16:30'
  newEmailInput.value = ''
  isSettingsModalOpen.value = true
}

const addEmail = () => {
  const email = newEmailInput.value.trim()
  if (email && !emailChecklist.value.some(e => e.email === email)) {
    emailChecklist.value.push({ email, active: true })
    newEmailInput.value = ''
  }
}

const toggleEmail = (index: number) => {
  emailChecklist.value[index].active = !emailChecklist.value[index].active
}

const removeEmail = (index: number) => {
  emailChecklist.value.splice(index, 1)
}

const handleSaveSettings = async () => {
  isSavingSettings.value = true
  const activeEmails = emailChecklist.value.filter(e => e.active).map(e => e.email).join(',')
  const result = await inventoryStore.updateSettings({ 
    mailing_list: activeEmails,
    email_checklist: emailChecklist.value,
    report_day: reportDay.value,
    report_time: reportTime.value
  })
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

onMounted(async () => {
  await inventoryStore.fetchInventory()
  syncDrafts()
  inventoryStore.fetchSettings()
})

// Keep drafts in sync if new items arrive (e.g. added via modal)
watch(() => inventoryStore.allItems, (newItems) => {
  for (const item of newItems) {
    if (!drafts.value[item.id]) {
      drafts.value[item.id] = {
        unopened_count: item.unopened_count,
        opened_state_notes: item.opened_state_notes ?? '',
        nearest_expiry_date: item.nearest_expiry_date ?? null
      }
    }
  }
})
</script>

<template>
  <div class="w-full h-dvh flex flex-col overflow-hidden bg-gray-50 dark:bg-black transition-colors duration-300">
    <PosHeader active-page="inventory" class="w-full flex-shrink-0" />

    <main class="flex-1 overflow-hidden p-4 sm:p-8 flex flex-col max-w-7xl mx-auto w-full">
      <!-- Page Header -->
      <div class="flex flex-col sm:flex-row sm:items-end justify-between gap-6 mb-8 flex-shrink-0">
        <PageHeader label="Supplies" title="Inventory" />
        
        <div class="flex items-center gap-4">
          <!-- BIG-TECH: Dynamic "Save All" Button -->
          <button 
            v-if="isDirty"
            @click="handleSaveAll"
            :disabled="inventoryStore.isLoading"
            class="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-2xl font-black uppercase text-[10px] tracking-widest transition-all active:scale-95 shadow-lg shadow-green-900/20 animate-in zoom-in"
          >
            <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7" />
            </svg>
            Save All Changes
          </button>

          <!-- Copy Link Button -->
          <button 
            @click="copyShareLink"
            class="p-3 rounded-2xl bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 text-gray-400 hover:text-orange-600 transition-all shadow-sm"
            title="Copy Shareable Link"
          >
            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
            </svg>
          </button>

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
            @click="openAddModal"
            class="bg-gray-900 dark:bg-white dark:text-black text-white px-6 py-3 rounded-2xl font-black uppercase text-[10px] tracking-widest hover:bg-orange-600 hover:text-white transition-all active:scale-95 shadow-lg shadow-gray-200 dark:shadow-none"
          >
            + Add Item
          </button>
          
          <div class="h-8 w-[1px] bg-gray-200 dark:bg-gray-800 hidden sm:block mx-2"></div>
          
          <button @click="inventoryStore.fetchInventory" class="p-2.5 hover:bg-white dark:hover:bg-gray-800 rounded-xl transition-all text-gray-400 hover:text-orange-600">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" :class="{'animate-spin': inventoryStore.isLoading}" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>
        </div>
      </div>

      <!-- Inventory Spreadsheet Container -->
      <div class="flex-1 bg-white dark:bg-gray-900 rounded-[2rem] shadow-2xl shadow-gray-200/50 dark:shadow-none border border-gray-100 dark:border-gray-800 overflow-hidden flex flex-col">
        
        <!-- Table Header -->
        <div class="grid grid-cols-12 gap-4 px-8 py-5 border-b border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/30 flex-shrink-0">
          <div class="col-span-4 text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Item</div>
          <div class="col-span-2 text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Unopened Qty</div>
          <div class="col-span-3 text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Notes</div>
          <div class="col-span-2 text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Nearest Expiry</div>
          <div class="col-span-1"></div>
        </div>

        <!-- Scrollable Rows -->
        <div class="flex-1 overflow-y-auto custom-scrollbar">
          <div 
            v-for="item in inventoryStore.allItems" 
            :key="item.id"
            class="grid grid-cols-12 gap-4 px-8 py-4 items-center border-b border-gray-50 dark:border-gray-800/50 transition-all duration-500 group"
            :class="[
              isExpiringSoon(item.nearest_expiry_date) ? 'bg-red-50/30 dark:bg-red-950/5' : '',
              lastSavedId === item.id ? 'bg-green-50 dark:bg-green-950/20' : '',
              dirtyIds.has(item.id) ? 'bg-orange-50/20 dark:bg-orange-950/5 border-l-4 border-l-orange-500' : ''
            ]"
          >
            <!-- Item Name -->
            <div class="col-span-4">
              <div class="flex items-center gap-3">
                <button 
                  @click="openEditModal(item)"
                  class="p-2 rounded-lg bg-gray-50 dark:bg-gray-800 text-gray-400 hover:text-orange-600 opacity-0 group-hover:opacity-100 transition-all"
                  title="Edit Item Details"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                  </svg>
                </button>
                <div class="flex flex-col">
                  <div class="flex items-center gap-2">
                    <div v-if="isExpiringSoon(item.nearest_expiry_date)" class="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse"></div>
                    <p class="font-black text-gray-900 dark:text-white uppercase italic text-sm tracking-tight">{{ item.name }}</p>
                  </div>
                  <p class="text-[9px] font-bold text-gray-400 uppercase tracking-widest mt-0.5">Unit: {{ item.unit }}</p>
                </div>
              </div>
            </div>

            <!-- Unopened Count -->
            <div class="col-span-2">
              <input 
                v-model.number="drafts[item.id].unopened_count"
                type="number"
                step="0.1"
                class="w-full bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-xl px-4 py-2.5 text-sm font-black text-gray-900 dark:text-white focus:ring-2 focus:ring-orange-500 outline-none transition-all"
              />
            </div>

            <!-- Notes -->
            <div class="col-span-3">
              <input 
                v-model="drafts[item.id].opened_state_notes"
                type="text"
                placeholder="e.g. 500ml left"
                class="w-full bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-xl px-4 py-2.5 text-xs font-bold text-gray-500 dark:text-gray-400 focus:ring-2 focus:ring-orange-500 outline-none transition-all placeholder:text-gray-300 dark:placeholder:text-gray-600"
              />
            </div>

            <!-- Expiry Date -->
            <div class="col-span-2">
              <BrandedDatePicker 
                v-model="drafts[item.id].nearest_expiry_date"
                placeholder="No Expiry"
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
                  lastSavedId === item.id ? 'bg-green-600 text-white shadow-lg shadow-green-900/20' :
                  dirtyIds.has(item.id) ? 'bg-orange-600 text-white shadow-lg shadow-orange-900/30' :
                  'bg-gray-900 dark:bg-white dark:text-black text-white hover:bg-gray-800 dark:hover:bg-gray-100 active:scale-95'
                ]"
                :title="dirtyIds.has(item.id) ? 'Save Unsaved Changes' : 'Sync Item'"
              >
                <div v-if="savingItems[item.id]" class="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin"></div>
                <svg v-else xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <!-- Checkmark for just saved -->
                  <path v-if="lastSavedId === item.id" stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7" />
                  <!-- Floppy disk save icon -->
                  <g v-else>
                    <!-- Outer body with notched corner -->
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2z" />
                    <!-- Bottom label area -->
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 21v-8H7v8" />
                    <!-- Top write-protect window -->
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 3v5h8" />
                  </g>
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>
    </main>

    <!-- Item Modal (Add/Edit) -->
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
            <h3 class="text-xl font-black text-gray-900 dark:text-white uppercase italic tracking-tight mb-6">
              {{ editingItem ? 'Edit Item' : 'New Inventory Item' }}
            </h3>
            
            <form @submit.prevent="handleSubmit" class="space-y-5">
              <div>
                <label class="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 ml-1">Item Name</label>
                <input v-model="itemForm.name" required type="text" placeholder="e.g. Oat Milk" class="w-full bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-2xl px-5 py-4 text-sm font-black text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-orange-500 transition-all"/>
              </div>

              <div class="grid grid-cols-2 gap-4">
                <div>
                  <label class="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 ml-1">Unopened Qty</label>
                  <input v-model.number="itemForm.unopened_count" type="number" step="0.1" class="w-full bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-2xl px-5 py-4 text-sm font-black text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-orange-500 transition-all"/>
                </div>
                <div>
                  <label class="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 ml-1">Unit</label>
                  <input v-model="itemForm.unit" type="text" placeholder="cartons" class="w-full bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-2xl px-5 py-4 text-sm font-black text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-orange-500 transition-all"/>
                </div>
              </div>

              <div>
                <label class="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 ml-1">Nearest Expiry Date</label>
                <input v-model="itemForm.nearest_expiry_date" type="date" class="w-full bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-2xl px-5 py-4 text-[10px] font-black uppercase text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-orange-500 transition-all"/>
              </div>

              <div class="flex gap-3 pt-4">
                <button type="button" @click="isModalOpen = false" class="flex-1 px-6 py-4 rounded-2xl font-black uppercase text-[10px] tracking-widest text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 transition-all">Cancel</button>
                <button type="submit" :disabled="isSubmitting" class="flex-1 bg-orange-600 text-white px-6 py-4 rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-lg shadow-orange-900/20 active:scale-95 disabled:opacity-50">
                  {{ isSubmitting ? 'Saving...' : (editingItem ? 'Save Changes' : 'Save Item') }}
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
                <label class="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 ml-1">Add Email</label>
                <input 
                  v-model="newEmailInput" 
                  @keydown.enter.prevent="addEmail"
                  type="email"
                  placeholder="e.g. barista@hg.com (Press Enter)" 
                  class="w-full bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-2xl px-5 py-4 text-sm font-bold text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-orange-500 transition-all"
                />
              </div>

              <div class="max-h-48 overflow-y-auto space-y-2 custom-scrollbar pr-1">
                <div 
                  v-for="(item, idx) in emailChecklist" 
                  :key="idx" 
                  class="flex items-center justify-between p-3 rounded-xl border border-gray-100 dark:border-gray-800 transition-all"
                  :class="item.active ? 'bg-orange-50/50 dark:bg-orange-900/20' : 'bg-gray-50 dark:bg-gray-800'"
                >
                  <div class="flex items-center gap-3 cursor-pointer" @click="toggleEmail(idx)">
                    <button class="flex-shrink-0 w-5 h-5 rounded border border-gray-300 dark:border-gray-600 flex items-center justify-center transition-colors" :class="item.active ? 'bg-orange-500 border-orange-500' : ''">
                      <svg v-if="item.active" xmlns="http://www.w3.org/2000/svg" class="h-3.5 w-3.5 text-white" viewBox="0 0 20 20" fill="currentColor">
                        <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" />
                      </svg>
                    </button>
                    <span class="text-sm font-semibold transition-colors" :class="item.active ? 'text-gray-900 dark:text-white' : 'text-gray-400 line-through'">{{ item.email }}</span>
                  </div>
                  <button @click.stop="removeEmail(idx)" class="text-gray-400 hover:text-red-500 transition-colors p-1" title="Remove Email">
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>

              <!-- Scheduling Settings -->
              <div class="pt-2 border-t border-gray-100 dark:border-gray-800 mt-6">
                <p class="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-4">Automated Report Schedule</p>
                <div class="grid grid-cols-2 gap-4 mb-6">
                  <div>
                    <label class="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 ml-1">Day of Week</label>
                    <select v-model.number="reportDay" class="w-full bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-2xl px-5 py-4 text-sm font-bold text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-orange-500 transition-all cursor-pointer">
                      <option :value="0">Sunday</option>
                      <option :value="1">Monday</option>
                      <option :value="2">Tuesday</option>
                      <option :value="3">Wednesday</option>
                      <option :value="4">Thursday</option>
                      <option :value="5">Friday</option>
                      <option :value="6">Saturday</option>
                    </select>
                  </div>
                  <div>
                    <label class="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 ml-1">Time (24h)</label>
                    <input 
                      v-model="reportTime" 
                      type="time"
                      class="w-full bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-2xl px-5 py-4 text-sm font-bold text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-orange-500 transition-all cursor-pointer"
                    />
                  </div>
                </div>
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
input::-webkit-outer-spin-button, input::-webkit-inner-spin-button { -webkit-appearance: none; margin: 0; margin: 0; }
</style>