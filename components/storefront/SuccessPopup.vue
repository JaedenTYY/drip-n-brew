<script setup lang="ts">
const props = defineProps<{
  show: boolean
  customerName: string
}>()
</script>

<template>
  <Teleport to="body">
    <Transition
      enter-active-class="transition duration-500 ease-out"
      enter-from-class="opacity-0 scale-95"
      enter-to-class="opacity-100 scale-100"
      leave-active-class="transition duration-300 ease-in"
      leave-from-class="opacity-100 scale-100"
      leave-to-class="opacity-0 scale-95"
    >
      <div v-if="show" class="fixed inset-0 z-[300] flex items-center justify-center p-6">
        <!-- Ultra-Premium Backdrop -->
        <div class="absolute inset-0 bg-gray-950/80 backdrop-blur-xl"></div>
        
        <!-- Hero Popup Card -->
        <div class="relative w-full max-w-sm bg-white rounded-[3.5rem] p-12 shadow-2xl text-center border border-gray-50 overflow-hidden group">
          <!-- Background Accent Blur -->
          <div class="absolute -top-24 -right-24 w-48 h-48 bg-orange-500/10 rounded-full blur-3xl group-hover:bg-orange-500/20 transition-all duration-1000"></div>
          
          <div class="relative z-10 flex flex-col items-center">
            <!-- Iconic Checkmark -->
            <div class="h-28 w-28 bg-orange-600 text-white rounded-[2.5rem] flex items-center justify-center mb-10 shadow-2xl shadow-orange-900/40 animate-in zoom-in-50 duration-700">
              <svg xmlns="http://www.w3.org/2000/svg" class="h-14 w-14" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            
            <h3 class="text-4xl font-black text-gray-900 uppercase italic tracking-tighter mb-3 leading-tight">Order<br/>Sent!</h3>
            <p class="text-gray-400 text-xs font-bold uppercase tracking-[0.2em] leading-relaxed max-w-[200px]">
              Cheers, <span class="text-gray-900">{{ customerName }}</span>! Your brew is in the pipeline.
            </p>

            <div class="mt-12 w-full pt-8 border-t border-gray-50">
              <div class="flex flex-col items-center gap-4">
                <div class="flex items-center gap-3">
                  <div class="w-2 h-2 bg-orange-600 rounded-full animate-ping"></div>
                  <span class="text-[10px] font-black text-orange-600 uppercase tracking-[0.4em]">Live Tracking</span>
                </div>
                <p class="text-[9px] text-gray-300 font-black uppercase tracking-widest">Opening tracker...</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>
