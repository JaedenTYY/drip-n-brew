<script setup lang="ts">
import type { Product } from '~/types'
import MarkdownContent from './MarkdownContent.vue'

/**
 * ProductCard: Optimized for a dense mobile grid layout.
 */
const props = defineProps<{
  product: Product
}>()

const emit = defineEmits<{
  (e: 'add-to-cart', product: Product): void
}>()

const formattedPrice = computed(() => {
  return new Intl.NumberFormat('en-MY', {
    style: 'currency',
    currency: 'MYR',
  }).format(props.product.price)
})
</script>

<template>
  <div 
    class="group relative flex flex-col overflow-hidden rounded-3xl border border-gray-100 bg-white transition-all duration-300 shadow-sm"
    :class="[
      product.is_available 
        ? 'hover:shadow-xl hover:shadow-gray-200/50' 
        : 'opacity-70 grayscale-[0.5]'
    ]"
  >
    <!-- Image Container -->
    <div class="relative aspect-[4/5] overflow-hidden bg-gray-50">
      <img
        v-if="product.image_url"
        :src="product.image_url"
        :alt="product.name"
        class="h-full w-full object-cover transition-transform duration-500"
        :class="{'group-hover:scale-110': product.is_available}"
        loading="lazy"
      />
      <div v-else class="flex h-full w-full items-center justify-center bg-gray-100 text-gray-400">
        <span class="text-[10px] font-black uppercase">No Image</span>
      </div>

      <!-- Floating Price Tag (Mobile optimized) -->
      <div class="absolute top-2 left-2">
        <span class="bg-white/90 backdrop-blur-md text-gray-900 px-2 py-1 rounded-lg text-[10px] font-black shadow-sm">
          {{ formattedPrice }}
        </span>
      </div>

      <!-- Sold Out Badge Overlay -->
      <div v-if="!product.is_available" class="absolute inset-0 bg-white/20 backdrop-blur-[2px] flex items-center justify-center p-4">
        <div class="bg-gray-900/90 text-white px-3 py-1.5 rounded-xl text-[8px] font-black uppercase tracking-widest shadow-2xl border border-white/20">
          Sold Out
        </div>
      </div>
      
      <!-- Overlay Add Button -->
      <button
        v-if="product.is_available"
        @click="emit('add-to-cart', product)"
        class="absolute bottom-3 right-3 flex h-9 w-9 items-center justify-center rounded-2xl bg-orange-600 text-white shadow-lg shadow-orange-900/20 transition-all duration-300 hover:bg-orange-700 active:scale-90"
        aria-label="Add to cart"
      >
        <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
        </svg>
      </button>
    </div>

    <!-- Product Info -->
    <div class="flex flex-1 flex-col p-3 sm:p-4">
      <h3 
        class="text-xs sm:text-sm font-black text-gray-900 transition-colors uppercase italic tracking-tight line-clamp-1"
        :class="{'group-hover:text-orange-600': product.is_available}"
      >
        {{ product.name }}
      </h3>
      
      <div class="mt-1 line-clamp-2 text-[10px] text-gray-500 leading-tight">
        <MarkdownContent :content="product.description || ''" />
      </div>

      <!-- Category Badge -->
      <div class="mt-3 flex items-center justify-between">
        <span class="inline-flex items-center rounded-lg bg-orange-50 px-1.5 py-0.5 text-[8px] font-black uppercase text-orange-700">
          {{ product.category }}
        </span>
      </div>
    </div>
  </div>
</template>
