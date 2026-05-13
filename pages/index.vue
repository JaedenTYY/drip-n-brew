<script setup lang="ts">
import { useProducts } from '~/composables/useProducts'
import { useCartStore } from '~/stores/cart'
import { useCartDrawer } from '~/composables/useCartDrawer'
import CategoryFilter from '~/components/storefront/CategoryFilter.vue'
import ProductGrid from '~/components/storefront/ProductGrid.vue'
import CartDrawer from '~/components/storefront/CartDrawer.vue'
import ProductCustomizationModal from '~/components/storefront/ProductCustomizationModal.vue'
import SuccessPopup from '~/components/storefront/SuccessPopup.vue'
import type { Product, ItemCustomizations } from '~/types'

useHead({
  title: 'Storefront'
})

const { availableProducts, categories, pending, error, refresh } = useProducts()
const cartStore = useCartStore()
const { toggleDrawer, closeDrawer } = useCartDrawer()

const activeCategory = ref<string | null>(null)
const selectedProduct = ref<Product | null>(null)

const showSuccess = ref(false)
const successCustomerName = ref('')

const filteredProducts = computed(() => {
  let list = availableProducts.value
  if (activeCategory.value) {
    list = list.filter(p => p.categories?.includes(activeCategory.value!))
  }
  return list
})

const handleCategorySelect = (category: string | null) => {
  activeCategory.value = category
}

const handleAddToCart = (product: Product) => {
  if (product.is_available) {
    selectedProduct.value = product
  }
}

const confirmCustomization = (customizations: ItemCustomizations) => {
  if (selectedProduct.value) {
    cartStore.addItem(selectedProduct.value, customizations)
    selectedProduct.value = null
    toggleDrawer()
  }
}

const handleGlobalOrderComplete = (orderId: string, customerName: string) => {
  console.log('[Storefront] Order Complete Signal Received!', { orderId, customerName })
  successCustomerName.value = customerName
  showSuccess.value = true
  closeDrawer()

  setTimeout(() => {
    showSuccess.value = false
    cartStore.clearCart()
    navigateTo({
      path: '/order-confirmation',
      query: { id: orderId }
    })
  }, 3000)
}
</script>

<template>
  <div class="min-h-screen bg-[#fafafa] pb-20 selection:bg-orange-100 selection:text-orange-900">
    <!-- Premium Global Header (Merged with Category Filter) -->
    <header class="sticky top-0 z-50 w-full border-b border-gray-100 bg-white/70 backdrop-blur-xl transition-all duration-300">
      <div class="mx-auto max-w-6xl">
        <!-- Brand & Cart Row -->
        <div class="flex items-center justify-between px-6 py-4 sm:py-5">
          <div class="flex items-center">
            <!-- Interactive 'Unveil' Logo -->
            <div class="group flex items-center gap-3 sm:gap-0 sm:hover:gap-3 cursor-default transition-all duration-700 ease-in-out">
              <div class="flex h-12 w-12 items-center justify-center transition-transform duration-500 sm:group-hover:scale-110 sm:group-hover:rotate-6">
                 <img src="/favicon.ico" class="h-10 w-10 object-contain" alt="Drip & Brew Logo" />
              </div>
              <div class="overflow-hidden max-w-[200px] sm:max-w-0 sm:group-hover:max-w-[200px] transition-all duration-700 ease-in-out whitespace-nowrap">
                <div class="flex flex-col">
                  <span class="text-xs font-black text-orange-600 uppercase italic tracking-tighter leading-none">Drip & Brew</span>
                  <span class="text-[9px] font-black text-gray-900 uppercase tracking-[0.4em] mt-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity duration-1000 delay-150">Harvest Generation</span>
                </div>
              </div>
            </div>
          </div>

          <!-- Enhanced Cart Button -->
          <button 
            @click="toggleDrawer"
            class="group relative flex items-center gap-2.5 rounded-xl bg-orange-600 px-5 py-3 text-[10px] font-black text-white transition-all hover:bg-orange-700 hover:shadow-xl hover:shadow-orange-200 active:scale-95"
          >
            <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
            </svg>
            <span class="hidden sm:inline uppercase tracking-widest">Order</span>
            
            <div 
              v-if="cartStore.totalItems > 0"
              class="absolute -top-1.5 -right-1.5 flex h-5 w-5 animate-in zoom-in-50 items-center justify-center rounded-full bg-gray-900 text-[9px] font-black text-white shadow-lg border-2 border-white"
            >
              {{ cartStore.totalItems }}
            </div>
          </button>
        </div>

        <!-- Filter Row -->
        <div class="px-6 pb-4">
          <CategoryFilter
            :categories="categories"
            :active-category="activeCategory"
            @category-selected="handleCategorySelect"
          />
        </div>
      </div>
    </header>

    <!-- Main Content Grid -->
    <main class="mx-auto max-w-6xl px-6 pt-10 pb-24">
      <div v-if="pending" class="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
        <div v-for="i in 8" :key="i" class="aspect-[4/5] animate-pulse rounded-[2.5rem] bg-white border border-gray-100 shadow-sm"></div>
      </div>

      <div v-else-if="error" class="flex flex-col items-center justify-center py-32 text-center bg-white rounded-[3rem] border border-dashed border-gray-200">
        <div class="h-20 w-20 rounded-full bg-red-50 flex items-center justify-center mb-6 text-red-500">
          <svg xmlns="http://www.w3.org/2000/svg" class="h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>
        <p class="text-gray-400 text-sm font-bold uppercase tracking-[0.2em]">Connection lost</p>
        <button @click="() => refresh()" class="mt-6 bg-gray-900 text-white px-8 py-3 rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-orange-600 transition-all">Retry Link</button>
      </div>

      <div v-else>
        <div v-if="filteredProducts.length > 0">
          <ProductGrid 
            :products="filteredProducts" 
            @add-to-cart="handleAddToCart"
          />
        </div>
        <div v-else class="flex flex-col items-center justify-center py-40 text-center bg-white rounded-[3rem] border border-dashed border-gray-100 shadow-inner">
          <p class="text-lg font-black text-gray-300 uppercase italic tracking-tighter">The pantry is empty</p>
          <p class="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-2 mb-8">Try selecting a different category</p>
          <button @click="handleCategorySelect(null)" class="bg-orange-600 text-white px-10 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-orange-700 transition-all shadow-lg shadow-orange-100">Browse Full Menu</button>
        </div>
      </div>
    </main>

    <!-- Global Layout Components -->
    <ClientOnly>
      <CartDrawer @order-complete="handleGlobalOrderComplete" />
      
      <ProductCustomizationModal 
        :product="selectedProduct" 
        @close="selectedProduct = null"
        @confirm="confirmCustomization"
      />

      <!-- Global Success Popup -->
      <SuccessPopup 
        :show="showSuccess" 
        :customer-name="successCustomerName" 
      />
    </ClientOnly>
  </div>
</template>

<style>
/* Global smoothing for transitions */
.page-enter-active,
.page-leave-active {
  transition: all 0.4s;
}
.page-enter-from,
.page-leave-to {
  opacity: 0;
  filter: blur(1rem);
}

.custom-scrollbar::-webkit-scrollbar {
  width: 4px;
}
.custom-scrollbar::-webkit-scrollbar-track {
  background: transparent;
}
.custom-scrollbar::-webkit-scrollbar-thumb {
  @apply bg-gray-200 rounded-full;
}
</style>
