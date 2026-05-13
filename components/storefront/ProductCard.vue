<script setup lang="ts">
import type { Product } from '~/types'
import MarkdownContent from './MarkdownContent.vue'

/**
 * ProductCard: Refined with premium shadows and improved typography.
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
    minimumFractionDigits: 2
  }).format(props.product.price)
})
</script>

<template>
  <div 
    class="group relative flex flex-col overflow-hidden rounded-[2rem] border border-gray-100 bg-white transition-all duration-500 shadow-sm"
    :class="[
      product.is_available 
        ? 'hover:shadow-2xl hover:shadow-gray-200/50 hover:-translate-y-1' 
        : 'opacity-60 grayscale-[0.8]'
    ]"
  >
    <!-- Image Container -->
    <div class="relative aspect-square overflow-hidden bg-gray-50">
      <img
        v-if="product.image_url"
        :src="product.image_url"
        :alt="product.name"
        class="h-full w-full object-cover transition-transform duration-700 ease-out"
        :class="{'group-hover:scale-110': product.is_available}"
        loading="lazy"
      />
      <div v-else class="flex h-full w-full items-center justify-center bg-gray-100 text-gray-300">
        <svg xmlns="http://www.w3.org/2000/svg" class="h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      </div>

      <!-- Floating Price Tag -->
      <div class="absolute top-4 left-4">
        <span class="bg-white/90 backdrop-blur-md text-gray-900 px-3 py-1.5 rounded-xl text-xs font-black shadow-sm border border-white/50">
          {{ formattedPrice }}
        </span>
      </div>

      <!-- Sold Out Badge -->
      <div v-if="!product.is_available" class="absolute inset-0 bg-black/40 backdrop-blur-[2px] flex items-center justify-center p-4">
        <div class="bg-white text-gray-900 px-5 py-2.5 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] shadow-2xl">
          Sold Out
        </div>
      </div>
      
      <!-- Quick Add Button -->
      <button
        v-if="product.is_available"
        @click="emit('add-to-cart', product)"
        class="absolute bottom-4 right-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-orange-600 text-white shadow-xl shadow-orange-900/30 transition-all duration-300 hover:bg-orange-700 active:scale-90 sm:translate-y-4 sm:opacity-0 sm:group-hover:translate-y-0 sm:group-hover:opacity-100"
        aria-label="Add to cart"
      >
        <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M12 4v16m8-8H4" />
        </svg>
      </button>
    </div>

    <!-- Product Info -->
    <div class="flex flex-1 flex-col p-5">
      <div class="mb-3">
        <div class="flex gap-1.5 flex-wrap mb-1">
          <span v-for="cat in product.categories" :key="cat" class="text-[8px] font-black uppercase tracking-[0.15em] text-orange-600 bg-orange-50 px-1.5 py-0.5 rounded border border-orange-100">
            {{ cat }}
          </span>
        </div>
        <h3 
          class="text-base font-black text-gray-900 transition-colors uppercase italic tracking-tighter leading-tight truncate"
        >
          {{ product.name }}
        </h3>
      </div>
      
      <div class="text-[11px] text-gray-500 leading-relaxed flex-1">
        <div class="line-clamp-2">
          <MarkdownContent :content="product.description || ''" />
        </div>
      </div>

      <div v-if="!product.is_available" class="mt-4 pt-3 border-t border-gray-50">
        <span class="text-[9px] font-black text-red-500 uppercase tracking-widest">Currently Unavailable</span>
      </div>
    </div>
  </div>
</template>
