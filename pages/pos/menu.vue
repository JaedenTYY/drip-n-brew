<script setup lang="ts">
import ProductManager from '~/components/pos/ProductManager.vue'
import PromoManager from '~/components/pos/PromoManager.vue'
import { useSupabase } from '~/composables/useSupabase'

definePageMeta({
  middleware: 'auth'
})

const supabase = useSupabase()

const handleLogout = async () => {
  await supabase.auth.signOut()
  navigateTo('/pos/login')
}
</script>

<template>
  <div class="min-h-screen bg-black text-white p-6">
    <!-- Header -->
    <header class="flex items-center justify-between mb-10">
      <div class="flex items-center gap-4">
        <NuxtLink to="/pos" class="h-12 w-12 flex items-center justify-center rounded-2xl bg-gray-900 border border-gray-800 text-white hover:border-orange-500 transition-all group">
          <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6 group-hover:-translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M15 19l-7-7 7-7" />
          </svg>
        </NuxtLink>
        <div>
          <h1 class="text-2xl font-black uppercase italic tracking-tighter text-orange-600">POS Management</h1>
          <p class="text-[10px] font-bold text-gray-500 uppercase tracking-[0.2em]">Inventory & Discounts</p>
        </div>
      </div>

      <div class="flex items-center gap-4">
        <NuxtLink to="/pos" class="bg-gray-900 border border-gray-800 px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest hover:text-orange-500 transition-all">
          Back to Orders
        </NuxtLink>
        <button 
          @click="handleLogout"
          class="bg-gray-900 hover:bg-red-900/20 hover:text-red-500 border border-gray-800 px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all"
        >
          Logout
        </button>
      </div>
    </header>

    <!-- CMS Content -->
    <main class="max-w-7xl mx-auto grid grid-cols-1 xl:grid-cols-3 gap-8">
      <div class="xl:col-span-2">
        <ProductManager />
      </div>
      <div class="xl:col-span-1">
        <PromoManager />
      </div>
    </main>
  </div>
</template>

<style>
body {
  background-color: black;
}
</style>
