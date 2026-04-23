<script setup lang="ts">
import type { Product } from '~/types'
import { useSupabase } from '~/composables/useSupabase'
import MarkdownContent from '../storefront/MarkdownContent.vue'

const supabase = useSupabase()
const { products, refresh } = useProducts()

const isAdding = ref(false)
const isSubmitting = ref(false)
const editingProduct = ref<Partial<Product> | null>(null)

const form = ref({
  name: '',
  description: '',
  price: 0,
  category: '',
  image_url: '',
  is_available: true,
  allowed_temperatures: ['Hot', 'Cold'] as ('Hot' | 'Cold')[]
})

const descriptionRef = ref<HTMLTextAreaElement | null>(null)

const resetForm = () => {
  form.value = {
    name: '',
    description: '',
    price: 0,
    category: '',
    image_url: '',
    is_available: true,
    allowed_temperatures: ['Hot', 'Cold']
  }
  editingProduct.value = null
  isAdding.value = false
}

const handleEdit = (product: Product) => {
  editingProduct.value = product
  form.value = { 
    ...product,
    allowed_temperatures: product.allowed_temperatures || ['Hot', 'Cold'],
    is_available: product.is_available ?? true
  }
  isAdding.value = true
}

const fileInput = ref<HTMLInputElement | null>(null)
const isUploading = ref(false)

const triggerFileUpload = () => {
  fileInput.value?.click()
}

const handleFileUpload = async (event: Event) => {
  const target = event.target as HTMLInputElement
  const file = target.files?.[0]
  if (!file) return

  isUploading.value = true
  try {
    const fileExt = file.name.split('.').pop()
    const fileName = `${Math.random().toString(36).slice(2)}.${fileExt}`
    const filePath = `products/${fileName}`

    const { data, error } = await supabase.storage
      .from('product-images')
      .upload(filePath, file)

    if (error) throw error

    const { data: { publicUrl } } = supabase.storage
      .from('product-images')
      .getPublicUrl(filePath)

    form.value.image_url = publicUrl
  } catch (err: any) {
    alert(err.message || 'Failed to upload image')
  } finally {
    isUploading.value = false
    if (fileInput.value) fileInput.value.value = ''
  }
}

const handleHotkey = (event: KeyboardEvent) => {
  const isModKey = event.metaKey || event.ctrlKey
  if (!isModKey) return

  if (event.key === 'b' || event.key === 'i') {
    event.preventDefault()
    const textarea = descriptionRef.value
    if (!textarea) return

    const start = textarea.selectionStart
    const end = textarea.selectionEnd
    const text = form.value.description || ''
    const selectedText = text.substring(start, end)
    
    const marker = event.key === 'b' ? '**' : '*'
    const newText = text.substring(0, start) + marker + selectedText + marker + text.substring(end)
    
    form.value.description = newText

    nextTick(() => {
      textarea.focus()
      textarea.setSelectionRange(start + marker.length, end + marker.length)
    })
  }
}

const saveProduct = async () => {
  isSubmitting.value = true
  try {
    if (editingProduct.value?.id) {
      const { error } = await supabase
        .from('products')
        .update(form.value)
        .eq('id', editingProduct.value.id)
      if (error) throw error
    } else {
      const { error } = await supabase
        .from('products')
        .insert(form.value)
      if (error) throw error
    }
    
    await refresh()
    resetForm()
  } catch (err: any) {
    alert(err.message || 'Failed to save product')
  } finally {
    isSubmitting.value = false
  }
}

const toggleAvailability = async (product: Product) => {
  try {
    const { error } = await supabase
      .from('products')
      .update({ is_available: !product.is_available })
      .eq('id', product.id)
    
    if (error) throw error
    await refresh()
  } catch (err: any) {
    alert(err.message || 'Failed to update status')
  }
}

const deleteProduct = async (id: string) => {
  if (!confirm('Are you sure you want to delete this product?')) return
  
  try {
    const { error } = await supabase
      .from('products')
      .delete()
      .eq('id', id)
    
    if (error) throw error
    await refresh()
  } catch (err: any) {
    alert(err.message || 'Failed to delete product')
  }
}
</script>

<template>
  <div class="space-y-8">
    <!-- Header with Action -->
    <div class="flex items-center justify-between">
      <h2 class="text-sm font-black uppercase tracking-widest text-gray-500">Live Menu Inventory</h2>
      <button 
        @click="isAdding = true"
        class="bg-orange-600 hover:bg-orange-700 text-white px-6 py-2.5 rounded-xl font-black uppercase tracking-widest text-xs transition-all flex items-center gap-2 shadow-lg shadow-orange-900/20"
      >
        <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M12 4v16m8-8H4" />
        </svg>
        Add New Product
      </button>
    </div>

    <!-- Product List -->
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <div 
        v-for="product in products" 
        :key="product.id"
        class="bg-white dark:bg-gray-900 border-2 rounded-[2rem] p-5 flex items-center gap-5 group transition-all duration-300"
        :class="[
          product.is_available 
            ? 'border-gray-50 dark:border-gray-800 hover:border-orange-500/50' 
            : 'border-red-100 dark:border-red-900/20 bg-red-50/30 dark:bg-red-950/10'
        ]"
      >
        <!-- Product Image -->
        <div class="h-20 w-20 rounded-2xl bg-gray-100 dark:bg-gray-800 overflow-hidden flex-shrink-0 border border-gray-200 dark:border-gray-700 relative">
          <img v-if="product.image_url" :src="product.image_url" class="h-full w-full object-cover transition-all" :class="{'grayscale opacity-50': !product.is_available}" />
          <div v-if="!product.is_available" class="absolute inset-0 bg-red-600/60 backdrop-blur-[1px] flex flex-col items-center justify-center text-white">
            <span class="text-[8px] font-black uppercase tracking-tighter">Out of</span>
            <span class="text-[10px] font-black uppercase tracking-tight">Stock</span>
          </div>
        </div>

        <div class="flex-1">
          <div class="flex flex-col gap-1">
            <div class="flex items-center gap-2">
              <h3 class="font-black uppercase tracking-tight text-gray-900 dark:text-white" :class="{'opacity-50': !product.is_available}">{{ product.name }}</h3>
              <span class="text-[8px] font-black bg-gray-100 dark:bg-gray-800 text-gray-500 px-2 py-0.5 rounded-full uppercase">{{ product.category }}</span>
            </div>
            <p class="text-xs font-black text-orange-600">RM{{ product.price.toFixed(2) }}</p>
          </div>
        </div>

        <div class="flex items-center gap-2">
          <!-- Big, User-Friendly Status Toggle -->
          <button 
            @click="toggleAvailability(product)"
            :class="[
              'px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border-2 flex items-center gap-2',
              product.is_available 
                ? 'bg-green-50 dark:bg-green-950/20 text-green-600 border-green-100 dark:border-green-900/50 hover:bg-green-600 hover:text-white hover:border-green-600' 
                : 'bg-red-600 text-white border-red-600 hover:bg-red-700 hover:border-red-700 shadow-lg shadow-red-200 dark:shadow-none'
            ]"
          >
            <div class="w-2 h-2 rounded-full animate-pulse" :class="product.is_available ? 'bg-green-500' : 'bg-white'"></div>
            {{ product.is_available ? 'In Stock' : 'Restock' }}
          </button>
          
          <div class="flex flex-col gap-1">
            <button @click="handleEdit(product)" class="p-2 text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors" title="Edit Item">
              <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
            </button>

            <button @click="deleteProduct(product.id)" class="p-2 text-gray-300 dark:text-gray-700 hover:text-red-500 transition-colors" title="Delete Item">
              <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Add/Edit Modal -->
    <Teleport to="body">
      <div v-if="isAdding" class="fixed inset-0 z-[100] flex items-center justify-center p-6">
        <div @click="resetForm" class="absolute inset-0 bg-black/80 backdrop-blur-md"></div>
        
        <div class="relative w-full max-w-4xl max-h-[90vh] overflow-y-auto bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-3xl p-8 shadow-2xl custom-scrollbar transition-all duration-300">
          <div class="flex items-center justify-between mb-8 border-b border-gray-100 dark:border-gray-800 pb-6">
            <div>
              <h2 class="text-2xl font-black uppercase italic tracking-tighter text-gray-900 dark:text-white">
                {{ editingProduct ? 'Edit Product' : 'Add New Item' }}
              </h2>
              <p class="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">Configure menu item properties</p>
            </div>
            
            <!-- Availability Toggle inside Edit Modal -->
            <button 
              type="button"
              @click="form.is_available = !form.is_available"
              :class="[
                'px-6 py-3 rounded-2xl text-xs font-black uppercase tracking-widest transition-all border-2 flex items-center gap-3',
                form.is_available 
                  ? 'bg-green-600 border-green-600 text-white shadow-lg shadow-green-100 dark:shadow-none' 
                  : 'bg-red-600 border-red-600 text-white shadow-lg shadow-red-100 dark:shadow-none'
              ]"
            >
              <div class="w-2 h-2 rounded-full bg-white animate-pulse"></div>
              Status: {{ form.is_available ? 'Available' : 'Sold Out' }}
            </button>
          </div>
          
          <form @submit.prevent="saveProduct" class="space-y-8">
            <div class="grid grid-cols-1 md:grid-cols-2 gap-10">
              <!-- Left Column: Basic Info -->
              <div class="space-y-6">
                <div class="grid grid-cols-2 gap-6">
                  <div class="col-span-2">
                    <label class="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2">Product Name</label>
                    <input v-model="form.name" type="text" required class="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl px-5 py-4 text-gray-900 dark:text-white focus:ring-2 focus:ring-orange-600 outline-none transition-all" placeholder="e.g. Nitro Cold Brew" />
                  </div>
                  
                  <div>
                    <label class="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2">Category</label>
                    <input v-model="form.category" type="text" required class="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl px-5 py-4 text-gray-900 dark:text-white focus:ring-2 focus:ring-orange-600 outline-none transition-all" placeholder="e.g. Coffee" />
                  </div>

                  <div>
                    <label class="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2">Price (RM)</label>
                    <input v-model="form.price" type="number" step="0.01" required class="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl px-5 py-4 text-gray-900 dark:text-white focus:ring-2 focus:ring-orange-600 outline-none transition-all" />
                  </div>
                </div>

                <div>
                  <label class="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2">Product Image</label>
                  <div class="flex gap-5 items-start">
                    <input type="file" ref="fileInput" class="hidden" accept="image/*" @change="handleFileUpload" />
                    <div class="h-32 w-32 rounded-[2rem] bg-gray-50 dark:bg-gray-800 overflow-hidden flex-shrink-0 border-2 border-dashed border-gray-200 dark:border-gray-700 relative group/preview">
                      <img v-if="form.image_url" :src="form.image_url" class="h-full w-full object-cover" />
                      <div v-else class="h-full w-full flex flex-col items-center justify-center text-gray-400 dark:text-gray-600 gap-2">
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        <span class="text-[8px] font-black uppercase">No Photo</span>
                      </div>
                      <div v-if="isUploading" class="absolute inset-0 bg-black/60 flex items-center justify-center">
                        <div class="animate-spin h-6 w-6 border-2 border-orange-500 border-t-transparent rounded-full"></div>
                      </div>
                    </div>

                    <div class="flex-1 space-y-4">
                      <button type="button" @click="triggerFileUpload" :disabled="isUploading" class="w-full bg-gray-900 text-white py-4 rounded-2xl text-xs font-black uppercase tracking-widest transition-all flex items-center justify-center gap-3 hover:bg-orange-600">
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                        </svg>
                        {{ isUploading ? 'Uploading...' : 'Change Photo' }}
                      </button>
                      <input v-model="form.image_url" type="url" class="w-full bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-2 text-[10px] text-gray-500 dark:text-gray-400 focus:ring-1 focus:ring-orange-600 outline-none" placeholder="Or paste direct image URL..." />
                    </div>
                  </div>
                </div>

                <div>
                  <label class="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-3">Allowed Temperatures</label>
                  <div class="flex gap-4">
                    <label v-for="temp in (['Hot', 'Cold'] as const)" :key="temp" class="flex items-center gap-2 cursor-pointer group">
                      <input type="checkbox" :value="temp" v-model="form.allowed_temperatures" class="hidden" />
                      <div :class="['px-6 py-3 rounded-2xl border-2 font-black text-xs uppercase tracking-widest transition-all', form.allowed_temperatures.includes(temp) ? 'bg-orange-600 border-orange-600 text-white shadow-lg shadow-orange-100 dark:shadow-none' : 'bg-gray-50 dark:bg-gray-800 border-gray-100 dark:border-gray-700 text-gray-400 hover:border-gray-200 dark:hover:border-gray-600']">
                        {{ temp }}
                      </div>
                    </label>
                  </div>
                </div>
              </div>

              <!-- Right Column: Description & Preview -->
              <div class="space-y-6">
                <div>
                  <label class="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-3">Description & Formatting</label>
                  <div class="flex gap-2 mb-3">
                    <kbd class="px-2 py-1 bg-gray-100 dark:bg-gray-800 rounded text-[9px] text-gray-500 font-black border border-gray-200 dark:border-gray-700 uppercase tracking-tighter">Cmd+B: Bold</kbd>
                    <kbd class="px-2 py-1 bg-gray-100 dark:bg-gray-800 rounded text-[9px] text-gray-500 font-black border border-gray-200 dark:border-gray-700 uppercase tracking-tighter">Cmd+I: Italic</kbd>
                  </div>
                  <textarea 
                    ref="descriptionRef"
                    v-model="form.description" 
                    @keydown="handleHotkey"
                    class="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-[2rem] px-6 py-5 text-gray-900 dark:text-white h-48 focus:ring-2 focus:ring-orange-600 outline-none resize-none font-mono text-sm leading-relaxed" 
                    placeholder="Describe the drink..."
                  ></textarea>
                </div>

                <div class="p-6 bg-orange-50/50 dark:bg-gray-800/30 border border-orange-100 dark:border-gray-800 rounded-[2rem]">
                  <label class="block text-[9px] font-black text-orange-600 uppercase tracking-widest mb-4">Customer Storefront Preview</label>
                  <div class="bg-white dark:bg-black rounded-2xl p-6 border border-gray-100 dark:border-gray-800 min-h-[120px] shadow-sm">
                    <MarkdownContent :content="form.description || '*No description entered yet...*'" />
                  </div>
                </div>
              </div>
            </div>

            <div class="flex gap-4 pt-6 border-t border-gray-100 dark:border-gray-800">
              <button type="button" @click="resetForm" class="flex-1 bg-gray-50 dark:bg-gray-800 text-gray-500 dark:text-gray-400 py-5 rounded-2xl font-black uppercase tracking-widest hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors">Discard</button>
              <button type="submit" :disabled="isSubmitting || form.allowed_temperatures.length === 0" class="flex-[2] bg-orange-600 text-white py-5 rounded-2xl font-black uppercase tracking-widest hover:bg-orange-700 disabled:opacity-50 transition-colors shadow-xl shadow-orange-900/20">
                {{ isSubmitting ? 'Syncing...' : 'Save & Make Live' }}
              </button>
            </div>
          </form>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<style scoped>
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
</style>
