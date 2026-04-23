<script setup lang="ts">
const props = defineProps<{
  show: boolean
  customerName: string
}>()

const emit = defineEmits<{
  (e: 'close'): void
}>()
</script>

<template>
  <Teleport to="body">
    <Transition
      enter-active-class="transition duration-500 ease-out"
      enter-from-class="opacity-0"
      enter-to-class="opacity-100"
      leave-active-class="transition duration-300 ease-in"
      leave-from-class="opacity-100"
      leave-to-class="opacity-0"
    >
      <!-- Higher Z-INDEX (z-[300]) to ensure it is above the CartDrawer (z-[70]) -->
      <div v-if="show" class="fixed inset-0 z-[300] flex items-center justify-center p-6">
        <!-- Backdrop -->
        <div class="absolute inset-0 bg-gray-900/80 backdrop-blur-md"></div>
        
        <!-- Popup Card -->
        <div class="relative w-full max-w-sm bg-white rounded-[2.5rem] p-10 shadow-2xl text-center animate-in zoom-in-95 duration-500 border border-gray-100">
          <div class="flex flex-col items-center">
            <!-- Animated Check Circle -->
            <div class="h-24 w-24 bg-green-500 text-white rounded-full flex items-center justify-center mb-8 shadow-xl shadow-green-200 animate-bounce">
              <svg xmlns="http://www.w3.org/2000/svg" class="h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="4" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            
            <h3 class="text-3xl font-black text-gray-900 uppercase italic tracking-tighter mb-2">ORDER PLACED!</h3>
            <p class="text-gray-400 text-xs font-bold uppercase tracking-widest leading-relaxed">
              Thanks <span class="text-gray-900">{{ customerName }}</span>, your request is in the pipeline.
            </p>

            <div class="mt-10 w-full">
              <div class="flex flex-col items-center gap-3">
                <div class="flex items-center gap-2">
                  <div class="w-1.5 h-1.5 bg-orange-600 rounded-full animate-ping"></div>
                  <span class="text-[10px] font-black text-orange-600 uppercase tracking-[0.2em]">Live Tracking Active</span>
                </div>
                <p class="text-[9px] text-gray-400 font-bold uppercase">Redirecting to tracker...</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>
