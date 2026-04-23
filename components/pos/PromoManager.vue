<script setup lang="ts">
import { useSupabase } from '~/composables/useSupabase'

const supabase = useSupabase()

const promoCodes = ref<any[]>([])
const isLoading = ref(true)
const isAdding = ref(false)
const newCode = ref({
  code: '',
  discount_type: 'percent', // or 'fixed'
  discount_value: 100,
  is_active: true
})

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

const addPromoCode = async () => {
  try {
    const { error } = await supabase
      .from('promo_codes')
      .insert({
        ...newCode.value,
        code: newCode.value.code.toUpperCase().trim()
      })
    
    if (error) throw error
    await fetchPromoCodes()
    isAdding.value = false
    newCode.value = { code: '', discount_type: 'percent', discount_value: 100, is_active: true }
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
  <div class="bg-white dark:bg-gray-950 rounded-3xl border border-gray-200 dark:border-gray-800 p-6 shadow-sm">
    <div class="flex items-center justify-between mb-6">
      <div>
        <h2 class="text-lg font-black uppercase italic tracking-tighter text-gray-900 dark:text-white">Promo Codes</h2>
        <p class="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Manage Discounts</p>
      </div>
      <button 
        @click="isAdding = true"
        class="bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 text-gray-900 dark:text-white px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest hover:border-orange-500 transition-all"
      >
        + Create New
      </button>
    </div>

    <!-- Add Form -->
    <div v-if="isAdding" class="mb-6 p-4 bg-gray-50 dark:bg-gray-900 rounded-2xl border border-orange-500/30 animate-in fade-in slide-in-from-top-2">
      <div class="grid grid-cols-2 gap-4 mb-4">
        <div class="col-span-2">
          <label class="block text-[8px] font-black text-gray-500 uppercase tracking-[0.2em] mb-1">Code Name</label>
          <input v-model="newCode.code" type="text" placeholder="e.g. WELCOME" class="w-full bg-white dark:bg-black border border-gray-200 dark:border-gray-800 rounded-lg px-3 py-2 text-xs text-gray-900 dark:text-white uppercase outline-none focus:ring-1 focus:ring-orange-500" />
        </div>
        <div>
          <label class="block text-[8px] font-black text-gray-500 uppercase tracking-[0.2em] mb-1">Value (%)</label>
          <input v-model="newCode.discount_value" type="number" class="w-full bg-white dark:bg-black border border-gray-200 dark:border-gray-800 rounded-lg px-3 py-2 text-xs text-gray-900 dark:text-white outline-none focus:ring-1 focus:ring-orange-500" />
        </div>
        <div class="flex items-end">
          <button @click="addPromoCode" class="w-full bg-orange-600 text-white py-2 rounded-lg text-[10px] font-black uppercase tracking-widest">Save Code</button>
        </div>
      </div>
      <button @click="isAdding = false" class="text-[8px] font-black uppercase tracking-widest text-gray-400 dark:text-gray-600 hover:text-gray-900 dark:hover:text-white transition-colors">Cancel</button>
    </div>

    <!-- List -->
    <div class="space-y-3">
      <div v-if="isLoading" class="py-10 text-center text-gray-400 dark:text-gray-600 text-[10px] font-black uppercase">Loading...</div>
      <div v-else-if="promoCodes.length === 0" class="py-10 text-center text-gray-400 dark:text-gray-800 text-[10px] font-black uppercase border-2 border-dashed border-gray-100 dark:border-gray-900 rounded-2xl">No Active Codes</div>
      
      <div 
        v-for="code in promoCodes" 
        :key="code.id"
        class="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-900/50 border border-gray-100 dark:border-gray-800/50 rounded-xl group hover:border-gray-300 dark:hover:border-gray-700 transition-all"
      >
        <div>
          <div class="flex items-center gap-2">
            <span class="font-black text-gray-900 dark:text-white text-sm tracking-tighter">{{ code.code }}</span>
            <span class="bg-green-900/20 text-green-500 text-[8px] font-black px-1.5 py-0.5 rounded border border-green-900/30">{{ code.discount_value }}% OFF</span>
          </div>
          <p class="text-[8px] font-bold text-gray-500 dark:text-gray-600 mt-0.5">Created on {{ new Date(code.created_at).toLocaleDateString() }}</p>
        </div>
        <button @click="deletePromoCode(code.id)" class="opacity-0 group-hover:opacity-100 p-2 text-gray-400 dark:text-gray-600 hover:text-red-500 transition-all">
          <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
        </button>
      </div>
    </div>
  </div>
</template>
