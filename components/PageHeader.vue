<script setup lang="ts">
/**
 * BIG-TECH UX: Standardized Page Header
 * Used across all POS pages to maintain visual hierarchy.
 * Follows the 2-line pattern: Brand Label -> Bold Italic Title -> Optional Subtitle.
 * 
 * Note: Uses text-orange-600 for labels to maintain brand consistency 
 * as seen in original Inventory and History implementations.
 */
defineProps<{
  label: string
  title: string
  subtitle?: string
}>()
</script>

<template>
  <div class="mb-8 flex-shrink-0">
    <!-- Small Brand Label Above -->
    <p class="text-[10px] font-black text-orange-600 uppercase tracking-[0.4em] mb-1 ml-1">
      {{ label }}
    </p>
    
    <!-- Large Bold Italic Title -->
    <h1 class="text-3xl sm:text-4xl font-black uppercase italic tracking-tighter leading-none text-gray-900 dark:text-white">
      {{ title }}
    </h1>
    
    <!-- Optional Brand Subtitle Below -->
    <p v-if="subtitle" class="text-[10px] font-black text-orange-600 uppercase tracking-[0.4em] mt-3 ml-1">
      {{ subtitle }}
    </p>
  </div>
</template>
