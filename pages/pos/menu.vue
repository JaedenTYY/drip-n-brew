<script setup lang="ts">
import ProductManager from '~/components/pos/ProductManager.vue'
import PromoManager from '~/components/pos/PromoManager.vue'
import PosHeader from '~/components/pos/PosHeader.vue'

useHead({
  title: 'Menu Management'
})

definePageMeta({
  middleware: 'auth'
})
</script>

<template>
  <div class="min-h-dvh bg-white dark:bg-black text-gray-900 dark:text-white transition-colors duration-300">
    <!-- Unified POS Header -->
    <PosHeader active-page="menu" />

    <!-- CMS Content: Vertical Stacked Layout -->
    <main class="max-w-6xl mx-auto py-12 px-6 pb-20">
      <PageHeader label="Management" title="Menu Items" />

      <div class="space-y-16">
        <!-- Section 1: Products -->
        <section class="animate-in fade-in slide-in-from-bottom-4 duration-500">
          <h2 class="text-xs font-black uppercase tracking-[0.3em] text-gray-400 mb-8 ml-1">Products & Availability</h2>
          <ProductManager />
        </section>

        <!-- Section 2: Discounts -->
        <section class="animate-in fade-in slide-in-from-bottom-4 duration-700 delay-100 border-t border-gray-100 dark:border-gray-900 pt-16">
          <h2 class="text-xs font-black uppercase tracking-[0.3em] text-gray-400 mb-8 ml-1">Discounts & Promos</h2>
          <div class="max-w-2xl">
            <PromoManager />
          </div>
        </section>
      </div>
    </main>
  </div>
</template>

<style>
* { @apply transition-colors duration-200; }
</style>
