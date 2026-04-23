<script setup lang="ts">
import type { Product } from '~/types'
import { useSupabase } from '~/composables/useSupabase'

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
  is_available: true
})

const resetForm = () => {
  form.value = {
    name: '',
    description: '',
    price: 0,
    category: '',
    image_url: '',
    is_available: true
  }
  editingProduct.value = null
  isAdding.value = false
}

const handleEdit = (product: Product) => {
  editingProduct.value = product
  form.value = { ...product }
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
    // 1. Create a unique file path
    const fileExt = file.name.split('.').pop()
    const fileName = `${Math.random().toString(36).slice(2)}.${fileExt}`
    const filePath = `products/${fileName}`

    // 2. Upload to 'product-images' bucket
    // IMPORTANT: You must create this bucket in Supabase and set it to 'Public'
    const { data, error } = await supabase.storage
      .from('product-images')
      .upload(filePath, file)

    if (error) throw error

    // 3. Get the public URL
    const { data: { publicUrl } } = supabase.storage
      .from('product-images')
      .getPublicUrl(filePath)

    form.value.image_url = publicUrl
  } catch (err: any) {
    alert(err.message || 'Failed to upload image')
  } finally {
    isUploading.value = false
    // Reset the input so the same file can be selected again if needed
    if (fileInput.value) fileInput.value.value = ''
  }
}

const saveProduct = async () => {
  isSubmitting.value = true
  try {
    if (editingProduct.value?.id) {
      // Update existing
      const { error } = await supabase
        .from('products')
        .update(form.value)
        .eq('id', editingProduct.value.id)
      if (error) throw error
    } else {
      // Create new
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
        class="bg-orange-600 hover:bg-orange-700 text-white px-6 py-2.5 rounded-xl font-black uppercase tracking-widest text-xs transition-all flex items-center gap-2"
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
        class="bg-gray-900 border border-gray-800 rounded-2xl p-4 flex items-center gap-4 group hover:border-orange-500/50 transition-all"
      >
        <div class="h-16 w-16 rounded-xl bg-gray-800 overflow-hidden flex-shrink-0 border border-gray-700">
          <img v-if="product.image_url" :src="product.image_url" class="h-full w-full object-cover" />
          <div v-else class="h-full w-full flex items-center justify-center text-gray-600">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
        </div>

        <div class="flex-1">
          <div class="flex items-center gap-2">
            <h3 class="font-black uppercase tracking-tight text-white">{{ product.name }}</h3>
            <span class="text-[10px] font-bold text-orange-500 bg-orange-500/10 px-2 py-0.5 rounded-full uppercase">{{ product.category }}</span>
          </div>
          <p class="text-xs text-gray-500 font-medium">RM{{ product.price.toFixed(2) }}</p>
        </div>

        <div class="flex items-center gap-2">
          <button 
            @click="toggleAvailability(product)"
            :class="[
              'px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all',
              product.is_available ? 'bg-green-900/20 text-green-500 border border-green-900/50' : 'bg-red-900/20 text-red-500 border border-red-900/50'
            ]"
          >
            {{ product.is_available ? 'Available' : 'Sold Out' }}
          </button>
          
          <button @click="handleEdit(product)" class="p-2 text-gray-400 hover:text-white transition-colors">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
          </button>

          <button @click="deleteProduct(product.id)" class="p-2 text-gray-600 hover:text-red-500 transition-colors">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        </div>
      </div>
    </div>

    <!-- Add/Edit Modal -->
    <Teleport to="body">
      <div v-if="isAdding" class="fixed inset-0 z-[100] flex items-center justify-center p-6">
        <div @click="resetForm" class="absolute inset-0 bg-black/80 backdrop-blur-md"></div>
        
        <div class="relative w-full max-w-xl bg-gray-900 border border-gray-800 rounded-3xl p-8 shadow-2xl">
          <h2 class="text-2xl font-black uppercase italic tracking-tighter text-white mb-6">
            {{ editingProduct ? 'Edit Product' : 'Add New Item' }}
          </h2>
          
          <form @submit.prevent="saveProduct" class="space-y-5">
            <div class="grid grid-cols-2 gap-5">
              <div class="col-span-2">
                <label class="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2">Product Name</label>
                <input v-model="form.name" type="text" required class="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-orange-600 outline-none" placeholder="e.g. Nitro Cold Brew" />
              </div>
              
              <div>
                <label class="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2">Category</label>
                <input v-model="form.category" type="text" required class="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-orange-600 outline-none" placeholder="e.g. Coffee" />
              </div>

              <div>
                <label class="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2">Price (RM)</label>
                <input v-model="form.price" type="number" step="0.01" required class="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-orange-600 outline-none" />
              </div>

              <div class="col-span-2">
                <label class="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2">Product Image</label>
                <div class="flex gap-4 items-start">
                  <!-- Hidden Input -->
                  <input 
                    type="file" 
                    ref="fileInput" 
                    class="hidden" 
                    accept="image/*"
                    @change="handleFileUpload"
                  />
                  
                  <!-- Preview Box -->
                  <div class="h-24 w-24 rounded-2xl bg-gray-800 overflow-hidden flex-shrink-0 border border-gray-700 relative group/preview">
                    <img v-if="form.image_url" :src="form.image_url" class="h-full w-full object-cover" />
                    <div v-else class="h-full w-full flex items-center justify-center text-gray-600">
                      <svg xmlns="http://www.w3.org/2000/svg" class="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                    </div>
                    
                    <!-- Loading Overlay -->
                    <div v-if="isUploading" class="absolute inset-0 bg-black/60 flex items-center justify-center">
                      <div class="animate-spin h-5 w-5 border-2 border-orange-500 border-t-transparent rounded-full"></div>
                    </div>
                  </div>

                  <!-- Actions -->
                  <div class="flex-1 space-y-3">
                    <button 
                      type="button"
                      @click="triggerFileUpload"
                      :disabled="isUploading"
                      class="w-full bg-gray-800 hover:bg-gray-700 text-white py-3 rounded-xl text-xs font-black uppercase tracking-widest border border-gray-700 transition-all flex items-center justify-center gap-2"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                      </svg>
                      {{ isUploading ? 'Uploading...' : 'Upload Photo' }}
                    </button>
                    <div class="relative">
                      <input v-model="form.image_url" type="url" class="w-full bg-gray-800/50 border border-gray-700 rounded-xl px-4 py-2 text-[10px] text-gray-400 focus:ring-1 focus:ring-orange-600 outline-none" placeholder="Or paste image URL here..." />
                    </div>
                  </div>
                </div>
              </div>

              <div class="col-span-2">
                <label class="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2">Description</label>
                <textarea v-model="form.description" class="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white h-24 focus:ring-2 focus:ring-orange-600 outline-none resize-none"></textarea>
              </div>
            </div>

            <div class="flex gap-3 pt-4">
              <button type="button" @click="resetForm" class="flex-1 bg-gray-800 text-gray-400 py-4 rounded-xl font-bold uppercase tracking-widest hover:bg-gray-700">Cancel</button>
              <button type="submit" :disabled="isSubmitting" class="flex-[2] bg-orange-600 text-white py-4 rounded-xl font-black uppercase tracking-widest hover:bg-orange-700 disabled:opacity-50">
                {{ isSubmitting ? 'Saving...' : 'Confirm Item' }}
              </button>
            </div>
          </form>
        </div>
      </div>
    </Teleport>
  </div>
</template>
