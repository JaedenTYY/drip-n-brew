<script setup lang="ts">
import { ref, watch, computed } from 'vue'
import draggable from 'vuedraggable'
import PosHeader from '~/components/pos/PosHeader.vue'
import { useProducts } from '~/composables/useProducts'
import { useSupabase } from '~/composables/useSupabase'
import { useUI } from '~/composables/useUI'

useHead({ title: 'Menu Layout' })
definePageMeta({ middleware: 'auth' })

const { allProducts, categoryOrder, refresh } = useProducts()
const supabase = useSupabase()
const { notify } = useUI()

const isSaving = ref(false)

// Local state
const localCategoryOrder = ref<{id: string, name: string}[]>([])
const localProductsByCategory = ref<Record<string, any[]>>({})
const selectedCategory = ref<string | null>(null)

// Initialize local state when data is ready
watch(() => [categoryOrder.value, allProducts.value], ([cats, prods]) => {
  if (localCategoryOrder.value.length === 0 && cats && (cats as string[]).length > 0) {
    const catsArray = cats as string[]
    localCategoryOrder.value = catsArray.map(c => ({ id: c, name: c }))
    
    if (!selectedCategory.value) {
      selectedCategory.value = catsArray[0]
    }
  }
  
  if (Object.keys(localProductsByCategory.value).length === 0 && prods && (prods as any[]).length > 0) {
    const catsArray = cats as string[] || []
    const prodsArray = prods as any[]
    
    const groups: Record<string, any[]> = {}
    catsArray.forEach(c => { groups[c] = [] })
    
    prodsArray.forEach(p => {
      (p.categories || []).forEach((c: string) => {
        if (!groups[c]) groups[c] = []
        groups[c].push({ ...p })
      })
    })
    
    Object.keys(groups).forEach(cat => {
      groups[cat].sort((a, b) => {
        const orderA = a.display_order ?? 0
        const orderB = b.display_order ?? 0
        if (orderA !== orderB) return orderA - orderB
        return a.name.localeCompare(b.name)
      })
    })
    
    localProductsByCategory.value = groups
  }
}, { immediate: true })

const activeProducts = computed({
  get: () => {
    if (!selectedCategory.value) return []
    return localProductsByCategory.value[selectedCategory.value] || []
  },
  set: (newVal) => {
    if (selectedCategory.value) {
      localProductsByCategory.value[selectedCategory.value] = newVal
    }
  }
})

const saveLayout = async () => {
  isSaving.value = true
  
  try {
    const newCategoryOrder = localCategoryOrder.value.map(c => c.name)
    
    // Calculate global product order
    const productUpdates: Record<string, number> = {}
    let globalIndex = 0
    
    localCategoryOrder.value.forEach(catObj => {
      const cat = catObj.name
      const prods = localProductsByCategory.value[cat] || []
      prods.forEach(p => {
        if (productUpdates[p.id] === undefined) {
          productUpdates[p.id] = globalIndex++
        }
      })
    })

    // Send payload to backend to completely bypass RLS issues
    const res = await $fetch('/api/settings/layout', {
      method: 'POST',
      body: {
        categoryOrder: newCategoryOrder,
        productUpdates
      }
    })

    if (!res.success) {
      throw new Error((res as any).error || 'Unknown error occurred')
    }

    notify({ type: 'success', message: 'Layout Saved', description: 'Your custom menu layout is now live.' })
    
    // Refresh UI
    localCategoryOrder.value = []
    localProductsByCategory.value = {}
    await refresh()
    
  } catch (err: any) {
    console.error('[Layout API Error]:', err)
    notify({ type: 'error', message: 'Unexpected Error', description: err.message })
  } finally {
    isSaving.value = false
  }
}
</script>

<template>
  <div class="w-full min-h-screen flex flex-col bg-gray-50 dark:bg-black">
    <PosHeader active-page="layout" class="w-full flex-shrink-0 sticky top-0 z-[60]" />

    <main class="flex-1 w-full max-w-5xl mx-auto p-4 sm:p-6 lg:p-8 flex flex-col gap-8">
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 class="text-3xl font-black uppercase italic tracking-tighter text-gray-900 dark:text-white">Menu Layout</h1>
          <p class="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">Select a category to layout its drinks</p>
        </div>
        <button 
          @click="saveLayout" 
          :disabled="isSaving"
          class="bg-orange-600 hover:bg-orange-700 text-white px-8 py-4 rounded-2xl font-black uppercase tracking-widest text-xs shadow-lg shadow-orange-900/20 active:scale-95 transition-all disabled:opacity-50 flex items-center justify-center min-w-[160px]"
        >
          <div v-if="isSaving" class="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2"></div>
          {{ isSaving ? 'Saving...' : 'Save All Changes' }}
        </button>
      </div>

      <div class="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        <!-- Left Column: Categories Order -->
        <div class="lg:col-span-5 xl:col-span-4 bg-white dark:bg-gray-900 rounded-[2rem] p-6 sm:p-8 border border-gray-100 dark:border-gray-800 shadow-xl shadow-gray-200/50 dark:shadow-none flex flex-col">
          <h2 class="text-xl font-black uppercase tracking-tighter mb-6 text-gray-900 dark:text-white">Categories</h2>
          <draggable 
            v-model="localCategoryOrder" 
            item-key="id"
            handle=".drag-handle"
            ghost-class="opacity-30"
            class="flex-1 space-y-2"
            :animation="200"
          >
            <template #item="{ element: cat }">
              <div 
                @click="selectedCategory = cat.name"
                class="flex items-center justify-between p-3 rounded-xl border transition-all cursor-pointer group"
                :class="selectedCategory === cat.name ? 'bg-orange-50 border-orange-200 dark:bg-orange-900/20 dark:border-orange-500/30 shadow-sm' : 'bg-gray-50 border-gray-100 dark:bg-gray-800 dark:border-gray-700 hover:border-orange-500/50 hover:shadow-md'"
              >
                <div class="flex items-center gap-4">
                  <div class="drag-handle cursor-grab active:cursor-grabbing p-1 text-gray-400 hover:text-orange-600 transition-colors" @click.stop>
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 8h16M4 16h16" />
                    </svg>
                  </div>
                  <span class="font-bold text-sm transition-colors" :class="selectedCategory === cat.name ? 'text-orange-600 dark:text-orange-400' : 'text-gray-900 dark:text-white'">{{ cat.name }}</span>
                </div>
                
                <div v-if="selectedCategory === cat.name" class="w-2 h-2 rounded-full bg-orange-600"></div>
              </div>
            </template>
          </draggable>
        </div>

        <!-- Right Column: Products in Selected Category -->
        <div class="lg:col-span-7 xl:col-span-8 bg-white dark:bg-gray-900 rounded-[2rem] p-6 sm:p-8 border border-gray-100 dark:border-gray-800 shadow-xl shadow-gray-200/50 dark:shadow-none flex flex-col">
          <div class="flex items-center justify-between mb-6">
            <h2 class="text-xl font-black uppercase tracking-tighter text-gray-900 dark:text-white">
              Drinks in <span class="text-orange-600 italic">{{ selectedCategory || '...' }}</span>
            </h2>
            <div class="text-[10px] font-bold text-gray-400 uppercase tracking-widest bg-gray-100 dark:bg-gray-800 px-3 py-1.5 rounded-lg">
              {{ activeProducts.length }} items
            </div>
          </div>
          
          <draggable 
            v-if="selectedCategory && activeProducts.length > 0"
            v-model="activeProducts" 
            item-key="id"
            handle=".drag-handle"
            ghost-class="opacity-30"
            class="flex-1 space-y-2 max-h-[65vh] overflow-y-auto custom-scrollbar pr-2"
            :animation="200"
          >
            <template #item="{ element: product }">
              <div class="flex items-center justify-between bg-gray-50 dark:bg-gray-800 p-3 rounded-xl border border-gray-100 dark:border-gray-700 group transition-all hover:border-orange-500/50 hover:shadow-md">
                <div class="flex items-center gap-4">
                  <div class="drag-handle cursor-grab active:cursor-grabbing p-1 text-gray-400 hover:text-orange-600 transition-colors">
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 8h16M4 16h16" />
                    </svg>
                  </div>
                  <div class="flex flex-col">
                    <div class="font-bold text-sm text-gray-900 dark:text-white">{{ product.name }}</div>
                    <div class="text-[9px] font-bold text-gray-400 uppercase tracking-widest mt-1">{{ product.categories?.join(', ') }}</div>
                  </div>
                </div>
              </div>
            </template>
          </draggable>
          
          <div v-else class="flex-1 flex flex-col items-center justify-center py-20 border-2 border-dashed border-gray-100 dark:border-gray-800 rounded-2xl">
             <p class="text-sm font-bold text-gray-400 uppercase tracking-widest">No drinks found in this category.</p>
          </div>
        </div>
      </div>
    </main>
  </div>
</template>

<style scoped>
.custom-scrollbar::-webkit-scrollbar { width: 6px; }
.custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
.custom-scrollbar::-webkit-scrollbar-thumb { @apply bg-gray-200 dark:bg-gray-800; border-radius: 10px; }
</style>
