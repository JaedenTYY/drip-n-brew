<script setup lang="ts">
import { useSupabase } from '~/composables/useSupabase'

const supabase = useSupabase()

const promoCodes = ref<any[]>([])
const isLoading = ref(true)
const isAdding = ref(false)
const editingId = ref<string | null>(null)
const usageLimitMode = ref<'unlimited' | 'single' | 'custom'>('unlimited')
const newCode = ref({
  code: '',
  discount_type: 'percent',
  discount_value: 100,
  is_active: true,
  requires_survey: false,
  max_uses: null as number | null,
  current_uses: 0
})

const setUsageMode = (mode: 'unlimited' | 'single' | 'custom') => {
  usageLimitMode.value = mode
  if (mode === 'unlimited') {
    newCode.value.max_uses = null
  } else if (mode === 'single') {
    newCode.value.max_uses = 1
  } else if (mode === 'custom') {
    if (!newCode.value.max_uses || newCode.value.max_uses <= 1) {
      newCode.value.max_uses = 5
    }
  }
}

const openCreate = () => {
  editingId.value = null
  usageLimitMode.value = 'unlimited'
  newCode.value = {
    code: '',
    discount_type: 'percent',
    discount_value: 100,
    is_active: true,
    requires_survey: false,
    max_uses: null,
    current_uses: 0
  }
  isAdding.value = true
}

const openEdit = (code: any) => {
  editingId.value = code.id
  if (code.max_uses === null || code.max_uses === undefined) {
    usageLimitMode.value = 'unlimited'
  } else if (code.max_uses === 1) {
    usageLimitMode.value = 'single'
  } else {
    usageLimitMode.value = 'custom'
  }
  newCode.value = {
    code: code.code,
    discount_type: code.discount_type || 'percent',
    discount_value: code.discount_value,
    is_active: code.is_active,
    requires_survey: code.requires_survey,
    max_uses: code.max_uses ?? null,
    current_uses: code.current_uses ?? 0
  }
  isAdding.value = true
}

const toggleActiveStatus = () => {
  newCode.value.is_active = !newCode.value.is_active
  // If re-activating an exhausted code, reset current_uses so it can be used again
  if (
    newCode.value.is_active &&
    newCode.value.max_uses !== null &&
    newCode.value.current_uses >= newCode.value.max_uses
  ) {
    newCode.value.current_uses = 0
  }
}

const fetchPromoCodes = async () => {
  isLoading.value = true
  try {
    const { data, error } = await supabase
      .from('promo_codes')
      .select('*')
      .order('created_at', { ascending: false })
    
    if (error) throw error
    promoCodes.value = data || []
  } catch (err: any) {
    console.error('Error fetching promos:', err)
  } finally {
    isLoading.value = false
  }
}

const savePromoCode = async () => {
  try {
    const normalizedMaxUses =
      usageLimitMode.value === 'unlimited'
        ? null
        : usageLimitMode.value === 'single'
          ? 1
          : Math.max(1, Number(newCode.value.max_uses) || 1)

    const payload = {
      code: newCode.value.code.toUpperCase().trim(),
      discount_type: newCode.value.discount_type,
      discount_value: newCode.value.discount_type === 'free_item' ? 100 : newCode.value.discount_value,
      is_active: newCode.value.is_active,
      requires_survey: newCode.value.requires_survey,
      max_uses: normalizedMaxUses,
      current_uses: newCode.value.current_uses
    }
    
    let error;
    if (editingId.value) {
      const { error: updateError } = await supabase
        .from('promo_codes')
        .update(payload)
        .eq('id', editingId.value)
      error = updateError
    } else {
      const { error: insertError } = await supabase
        .from('promo_codes')
        .insert(payload)
      error = insertError
    }
    
    if (error) throw error
    await fetchPromoCodes()
    isAdding.value = false
    editingId.value = null
    usageLimitMode.value = 'unlimited'
    newCode.value = {
      code: '',
      discount_type: 'percent',
      discount_value: 100,
      is_active: true,
      requires_survey: false,
      max_uses: null,
      current_uses: 0
    }
  } catch (err: any) {
    alert(err.message || 'Failed to add promo code')
  }
}

const deletePromoCode = async (id: string) => {
  if (!confirm('Delete this promo code?')) return
  try {
    const { error } = await supabase.from('promo_codes').delete().eq('id', id)
    if (error) throw error
    await fetchPromoCodes()
  } catch (err: any) {
    alert(err.message)
  }
}

onMounted(fetchPromoCodes)
</script>

<template>
  <div class="bg-white dark:bg-black rounded-xl border border-gray-200 dark:border-gray-800 p-5 shadow-sm">
    <div class="flex items-center justify-between mb-6">
      <div>
        <h2 class="text-lg font-black uppercase italic tracking-tighter text-gray-900 dark:text-white">Promo Codes</h2>
        <p class="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Manage Discounts</p>
      </div>
      <button 
        @click="openCreate"
        class="bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 text-gray-900 dark:text-white px-4 py-2 rounded-md text-[10px] font-black uppercase tracking-widest hover:border-orange-600 transition-all"
      >
        + Create New
      </button>
    </div>

    <!-- Add Form -->
    <div v-if="isAdding" class="mb-6 p-4 bg-gray-50 dark:bg-gray-900 rounded-lg border border-orange-600/30 animate-in fade-in slide-in-from-top-2">
      <div class="grid grid-cols-2 gap-4 mb-4">
        <div class="col-span-2">
          <label class="block text-[8px] font-black text-gray-500 uppercase tracking-[0.2em] mb-1">Code Name</label>
          <input v-model="newCode.code" type="text" placeholder="e.g. WELCOME" class="w-full bg-white dark:bg-black border border-gray-200 dark:border-gray-800 rounded-lg px-3 py-2 text-xs text-gray-900 dark:text-white uppercase outline-none focus:ring-1 focus:ring-orange-600" />
        </div>
        <div :class="newCode.discount_type === 'free_item' ? 'col-span-2' : ''">
          <label class="block text-[8px] font-black text-gray-500 uppercase tracking-[0.2em] mb-1">Type</label>
          <select v-model="newCode.discount_type" class="w-full bg-white dark:bg-black border border-gray-200 dark:border-gray-800 rounded-lg px-3 py-2 text-xs text-gray-900 dark:text-white outline-none focus:ring-1 focus:ring-orange-600">
            <option value="percent">Percentage (%)</option>
            <option value="free_item">1 Free Drink</option>
          </select>
        </div>
        <div v-if="newCode.discount_type === 'percent'">
          <label class="block text-[8px] font-black text-gray-500 uppercase tracking-[0.2em] mb-1">Value (%)</label>
          <input v-model="newCode.discount_value" type="number" class="w-full bg-white dark:bg-black border border-gray-200 dark:border-gray-800 rounded-lg px-3 py-2 text-xs text-gray-900 dark:text-white outline-none focus:ring-1 focus:ring-orange-600" />
        </div>

        <!-- Usage Limit Configuration -->
        <div class="col-span-2">
          <label class="block text-[8px] font-black text-gray-500 uppercase tracking-[0.2em] mb-1.5">Usage Limit (Auto-Close Validity)</label>
          <div class="grid grid-cols-3 gap-2">
            <button
              type="button"
              @click="setUsageMode('unlimited')"
              class="py-2 px-3 rounded-lg text-[9px] font-black uppercase tracking-widest border transition-all"
              :class="usageLimitMode === 'unlimited' ? 'bg-orange-600 text-white border-orange-600' : 'bg-white dark:bg-black text-gray-600 dark:text-gray-400 border-gray-200 dark:border-gray-800'"
            >
              Unlimited
            </button>
            <button
              type="button"
              @click="setUsageMode('single')"
              class="py-2 px-3 rounded-lg text-[9px] font-black uppercase tracking-widest border transition-all"
              :class="usageLimitMode === 'single' ? 'bg-orange-600 text-white border-orange-600' : 'bg-white dark:bg-black text-gray-600 dark:text-gray-400 border-gray-200 dark:border-gray-800'"
            >
              1 Use
            </button>
            <button
              type="button"
              @click="setUsageMode('custom')"
              class="py-2 px-3 rounded-lg text-[9px] font-black uppercase tracking-widest border transition-all"
              :class="usageLimitMode === 'custom' ? 'bg-orange-600 text-white border-orange-600' : 'bg-white dark:bg-black text-gray-600 dark:text-gray-400 border-gray-200 dark:border-gray-800'"
            >
              Custom
            </button>
          </div>
          <div v-if="usageLimitMode === 'custom'" class="mt-2">
            <label class="block text-[8px] font-black text-gray-500 uppercase tracking-[0.2em] mb-1">Max Number of Usages</label>
            <input
              v-model.number="newCode.max_uses"
              type="number"
              min="1"
              placeholder="e.g. 5"
              class="w-full bg-white dark:bg-black border border-gray-200 dark:border-gray-800 rounded-lg px-3 py-2 text-xs text-gray-900 dark:text-white outline-none focus:ring-1 focus:ring-orange-600"
            />
          </div>
        </div>

        <div class="col-span-2 flex items-center gap-3 py-1">
          <button 
            type="button"
            @click="newCode.requires_survey = !newCode.requires_survey"
            class="h-5 w-10 rounded-full relative transition-all"
            :class="newCode.requires_survey ? 'bg-orange-600' : 'bg-gray-200 dark:bg-gray-800'"
          >
            <div class="absolute top-1 left-1 h-3 w-3 bg-white rounded-full transition-all" :class="{'translate-x-5': newCode.requires_survey}"></div>
          </button>
          <span class="text-[9px] font-black uppercase tracking-widest text-gray-600 dark:text-gray-400">Trigger Newcomer Survey</span>
        </div>

        <div v-if="editingId" class="col-span-2 flex items-center justify-between py-1 border-t border-gray-200 dark:border-gray-800 pt-3">
          <div class="flex items-center gap-3">
            <button 
              type="button"
              @click="toggleActiveStatus"
              class="h-5 w-10 rounded-full relative transition-all"
              :class="newCode.is_active ? 'bg-green-600' : 'bg-gray-200 dark:bg-gray-800'"
            >
              <div class="absolute top-1 left-1 h-3 w-3 bg-white rounded-full transition-all" :class="{'translate-x-5': newCode.is_active}"></div>
            </button>
            <span class="text-[9px] font-black uppercase tracking-widest text-gray-600 dark:text-gray-400">
              {{ newCode.is_active ? 'Code Active' : 'Code Closed / Inactive' }}
            </span>
          </div>
          <button
            v-if="newCode.current_uses > 0"
            type="button"
            @click="newCode.current_uses = 0; newCode.is_active = true"
            class="text-[8px] font-black uppercase tracking-widest text-orange-600 hover:underline"
          >
            Reset Usage ({{ newCode.current_uses }} → 0)
          </button>
        </div>

        <div class="col-span-2 flex items-end">
          <button @click="savePromoCode" class="w-full bg-orange-600 text-white py-2 rounded-lg text-[10px] font-black uppercase tracking-widest">{{ editingId ? 'Update Code' : 'Save Code' }}</button>
        </div>
      </div>
      <button @click="isAdding = false" class="text-[8px] font-black uppercase tracking-widest text-gray-400 dark:text-gray-600 hover:text-gray-900 dark:hover:text-white transition-colors">Cancel</button>
    </div>

    <!-- List -->
    <div class="space-y-3">
      <div v-if="isLoading" class="py-7 text-center text-gray-400 dark:text-gray-600 text-[10px] font-black uppercase">Loading...</div>
      <div v-else-if="promoCodes.length === 0" class="py-7 text-center text-gray-400 dark:text-gray-800 text-[10px] font-black uppercase border-2 border-dashed border-gray-100 dark:border-gray-900 rounded-lg">No Promo Codes</div>
      
      <div 
        v-for="code in promoCodes" 
        :key="code.id"
        class="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-900/50 border border-gray-100 dark:border-gray-800/50 rounded-md group hover:border-gray-300 dark:hover:border-gray-700 transition-all"
        :class="{'opacity-60': !code.is_active}"
      >
        <div>
          <div class="flex flex-wrap items-center gap-2">
            <span class="font-black text-gray-900 dark:text-white text-sm tracking-tighter" :class="{'line-through text-gray-400 dark:text-gray-600': !code.is_active}">{{ code.code }}</span>
            <span v-if="!code.is_active" class="bg-red-900/20 text-red-500 text-[8px] font-black px-1.5 py-0.5 rounded border border-red-900/30">CLOSED</span>
            <span v-if="code.discount_type === 'percent'" class="bg-green-900/20 text-green-500 text-[8px] font-black px-1.5 py-0.5 rounded border border-green-900/30">{{ code.discount_value }}% OFF</span>
            <span v-else-if="code.discount_type === 'free_item'" class="bg-blue-900/20 text-blue-500 text-[8px] font-black px-1.5 py-0.5 rounded border border-blue-900/30">1 FREE DRINK</span>
            <span v-if="code.max_uses !== null && code.max_uses !== undefined" class="bg-purple-900/20 text-purple-500 text-[8px] font-black px-1.5 py-0.5 rounded border border-purple-900/30">
              {{ code.current_uses || 0 }} / {{ code.max_uses }} USED
            </span>
            <span v-else-if="code.current_uses > 0" class="bg-gray-200 dark:bg-gray-800 text-gray-600 dark:text-gray-400 text-[8px] font-black px-1.5 py-0.5 rounded">
              {{ code.current_uses }} USED
            </span>
            <span v-if="code.requires_survey" class="bg-orange-900/20 text-orange-500 text-[8px] font-black px-1.5 py-0.5 rounded border border-orange-900/30">NEWCOMER FLOW</span>
          </div>
          <p class="text-[8px] font-bold text-gray-500 dark:text-gray-600 mt-0.5">Created on {{ new Date(code.created_at).toLocaleDateString() }}</p>
        </div>
        <div class="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all">
          <button @click="openEdit(code)" class="p-2 text-gray-400 dark:text-gray-600 hover:text-blue-500 transition-all" title="Edit">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
            </svg>
          </button>
          <button @click="deletePromoCode(code.id)" class="p-2 text-gray-400 dark:text-gray-600 hover:text-red-500 transition-all" title="Delete">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
