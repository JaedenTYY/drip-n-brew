<script setup lang="ts">
import { useProducts } from '~/composables/useProducts'
import { useCartStore } from '~/stores/cart'
import { useCartDrawer } from '~/composables/useCartDrawer'
import CategoryFilter from '~/components/storefront/CategoryFilter.vue'
import ProductGrid from '~/components/storefront/ProductGrid.vue'
import CartDrawer from '~/components/storefront/CartDrawer.vue'
import ProductCustomizationModal from '~/components/storefront/ProductCustomizationModal.vue'
import type { Product, ItemCustomizations } from '~/types'

// 1. Initialize our domain logic via composables
const { products, categories, pending, error, refresh } = useProducts()
const cartStore = useCartStore()
const { toggleDrawer } = useCartDrawer()

// 2. Local UI State for filtering
const activeCategory = ref<string | null>(null)
const selectedProduct = ref<Product | null>(null)

/**
 * Filtered products based on the selected category.
 * We perform this filtering on the client-side for an instant, 
 * "no-refresh" experience for the user.
 */
const filteredProducts = computed(() => {
  if (!activeCategory.value) return products.value
  return products.value.filter(p => p.category === activeCategory.value)
})

const handleCategorySelect = (category: string | null) => {
  activeCategory.value = category
}

const handleAddToCart = (product: Product) => {
  selectedProduct.value = product
}

const confirmCustomization = (customizations: ItemCustomizations) => {
  if (selectedProduct.value) {
    cartStore.addItem(selectedProduct.value, customizations)
    selectedProduct.value = null
    // Proactive UX: Open the cart drawer automatically when an item is added
    toggleDrawer()
  }
}
</script>

<template>
  <div class="min-h-screen bg-white pb-20">
    <!-- 1. Minimal Header -->
    <header class="sticky top-0 z-50 w-full border-b border-gray-100 bg-white/80 backdrop-blur-md">
      <div class="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
        <div class="flex items-center gap-3">
          <div class="flex h-10 w-10 items-center justify-center rounded-xl bg-gray-900 text-white shadow-sm overflow-hidden">
            <!-- Replace the SVG below with your Church Logo <img> tag -->
            <!-- <img src="/church-logo.png" class="h-full w-full object-cover" alt="Church Logo" /> -->
            <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          <div>
            <h1 class="text-lg font-black tracking-tight text-gray-900 uppercase italic leading-none">Drip & Brew</h1>
            <p class="text-[7px] font-bold text-gray-400 uppercase tracking-widest mt-0.5">Harvest Generation Church</p>
          </div>
        </div>

        <!-- Cart Button -->
        <button 
          @click="toggleDrawer"
          class="group relative flex items-center justify-center rounded-full bg-orange-600 px-5 py-2 text-xs font-black text-white transition-all hover:bg-orange-700 active:scale-95"
        >
          <span>Cart</span>
          <span 
            v-if="cartStore.totalItems > 0"
            class="ml-2 flex h-4 w-4 items-center justify-center rounded-full bg-white text-[9px] font-black text-orange-600"
          >
            {{ cartStore.totalItems }}
          </span>
        </button>
      </div>
    </header>

    <!-- 2. Menu Controls -->
    <section class="sticky top-[65px] z-40 border-b border-gray-50 bg-white/95 py-3 backdrop-blur-sm">
      <div class="mx-auto max-w-5xl px-6">
        <CategoryFilter
          :categories="categories"
          :active-category="activeCategory"
          @category-selected="handleCategorySelect"
        />
      </div>
    </section>

    <!-- 3. Product Catalog -->
    <main class="mx-auto max-w-5xl px-6 pt-8">
      <div v-if="pending" class="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
        <div v-for="i in 8" :key="i" class="aspect-square animate-pulse rounded-2xl bg-gray-50"></div>
      </div>

      <div v-else-if="error" class="flex flex-col items-center justify-center py-20 text-center">
        <p class="text-gray-400 text-xs font-bold uppercase tracking-widest">Connection lost</p>
        <button @click="() => refresh()" class="mt-4 text-orange-600 text-xs font-black uppercase underline">Retry</button>
      </div>

      <div v-else>
        <div v-if="filteredProducts.length > 0">
          <ProductGrid 
            :products="filteredProducts" 
            @add-to-cart="handleAddToCart"
          />
        </div>
        <div v-else class="flex h-60 flex-col items-center justify-center text-center">
          <p class="text-sm font-bold text-gray-400 uppercase tracking-widest">No items available</p>
          <button @click="handleCategorySelect(null)" class="text-orange-600 text-xs font-black uppercase mt-2">Show all</button>
        </div>
      </div>
    </main>

    <!-- 4. Global Modals/Drawers -->
    <CartDrawer />
    
    <ProductCustomizationModal 
      :product="selectedProduct" 
      @close="selectedProduct = null"
      @confirm="confirmCustomization"
    />
  </div>
</template>
