<script setup lang="ts">
import { useCartStore } from '~/stores/cart'
import { useCartDrawer } from '~/composables/useCartDrawer'
import CheckoutForm from './CheckoutForm.vue'

const cartStore = useCartStore()
const { isDrawerOpen, closeDrawer } = useCartDrawer()

const emit = defineEmits<{
  (e: 'order-complete', orderId: string, customerName: string): void
}>()

const showCheckout = ref(false)

const toggleCheckout = () => {
  showCheckout.value = !showCheckout.value
}

/**
 * Bubble up the completion event to the root page.
 */
const handleOrderComplete = (orderId: string, customerName: string) => {
  emit('order-complete', orderId, customerName)
}

// Reset checkout view when drawer closes
watch(isDrawerOpen, (val) => {
  if (!val) {
    setTimeout(() => {
      showCheckout.value = false
    }, 500)
  }
})
</script>

<template>
  <div>
    <Teleport to="body">
      <!-- Backdrop -->
      <Transition
        enter-active-class="transition duration-300 ease-out"
        enter-from-class="opacity-0"
        enter-to-class="opacity-100"
        leave-active-class="transition duration-200 ease-in"
        leave-from-class="opacity-100"
        leave-to-class="opacity-0"
      >
        <div 
          v-if="isDrawerOpen" 
          @click="closeDrawer"
          class="fixed inset-0 z-[60] bg-gray-950/40 backdrop-blur-md"
        ></div>
      </Transition>

      <!-- Drawer Panel: Now always slides from the RIGHT -->
      <Transition
        enter-active-class="transition duration-700 cubic-bezier(0.32, 0.72, 0, 1)"
        enter-from-class="translate-x-full"
        enter-to-class="translate-x-0"
        leave-active-class="transition duration-500 cubic-bezier(0.32, 0.72, 0, 1)"
        leave-from-class="translate-x-0"
        leave-to-class="translate-x-full"
      >
        <div 
          v-if="isDrawerOpen" 
          class="fixed inset-y-0 right-0 z-[70] flex w-[85%] sm:max-w-md flex-col bg-white shadow-2xl overflow-hidden rounded-l-[2rem] sm:rounded-l-[3rem]"
        >
          <!-- Header -->
          <div class="flex items-center justify-between border-b border-gray-50 px-6 sm:px-8 py-6 sm:py-8 flex-shrink-0">
            <div>
              <h2 class="text-xl sm:text-2xl font-black uppercase italic tracking-tighter text-gray-900 leading-none">Your Bag</h2>
              <p class="text-[7px] sm:text-[8px] font-black text-orange-600 uppercase tracking-[0.3em] mt-2">Drip & Brew Review</p>
            </div>
            <button 
              @click="closeDrawer"
              class="rounded-xl sm:rounded-2xl p-3 sm:p-4 text-gray-400 hover:bg-gray-50 hover:text-gray-900 transition-all active:scale-90 border border-gray-100"
            >
              <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 sm:h-6 sm:w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <!-- Cart Items -->
          <div class="flex-1 overflow-y-auto px-6 sm:px-8 py-4 custom-scrollbar">
            <div v-if="cartStore.items.length === 0" class="flex h-full flex-col items-center justify-center text-center">
              <div class="mb-6 flex h-16 w-16 sm:h-20 sm:w-20 items-center justify-center rounded-[1.5rem] sm:rounded-[2rem] bg-gray-50 text-gray-200">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-8 w-8 sm:h-10 sm:w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                </svg>
              </div>
              <p class="text-lg sm:text-xl font-black text-gray-900 uppercase italic">Empty bag</p>
              <button @click="closeDrawer" class="mt-4 text-[9px] font-black text-orange-600 uppercase tracking-widest hover:underline">Start Browsing</button>
            </div>

            <div v-else class="space-y-8 py-4 sm:py-6">
              <div v-for="item in cartStore.items" :key="item.id" class="flex gap-4 sm:gap-6 animate-in slide-in-from-right-4 duration-500">
                <div class="h-16 w-16 sm:h-20 sm:w-20 flex-shrink-0 overflow-hidden rounded-[1rem] sm:rounded-[1.5rem] bg-gray-50 border border-gray-100">
                  <img v-if="item.image_url" :src="item.image_url" :alt="item.name" class="h-full w-full object-cover" />
                </div>
                
                <div class="flex flex-1 flex-col justify-between py-0.5">
                  <div class="flex justify-between items-start gap-2">
                    <div>
                      <h3 class="font-black text-gray-900 uppercase italic text-xs sm:text-sm tracking-tight leading-tight line-clamp-1">{{ item.name }}</h3>
                      <div v-if="item.customizations" class="mt-1 flex flex-wrap gap-1">
                        <span class="text-[7px] sm:text-[8px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded-md bg-gray-900 text-white">
                          {{ item.customizations.temperature }}
                        </span>
                      </div>
                    </div>
                    <p class="font-black text-gray-900 text-xs sm:text-sm tracking-tight">RM{{ (item.price * item.quantity).toFixed(2) }}</p>
                  </div>

                  <div class="flex items-center justify-between mt-3">
                    <div class="flex items-center gap-1 bg-gray-50 rounded-[0.75rem] p-0.5 border border-gray-100">
                      <button @click="cartStore.updateQuantity(item.id, item.quantity - 1)" class="flex h-7 w-7 sm:h-8 sm:w-8 items-center justify-center rounded-lg bg-white shadow-sm text-gray-400 hover:text-gray-900 transition-all border border-gray-50">
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-3 w-3 sm:h-4 sm:w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M20 12H4" /></svg>
                      </button>
                      <span class="w-6 sm:w-8 text-center text-[10px] sm:text-xs font-black tabular-nums">{{ item.quantity }}</span>
                      <button @click="cartStore.updateQuantity(item.id, item.quantity + 1)" class="flex h-7 w-7 sm:h-8 sm:w-8 items-center justify-center rounded-lg bg-white shadow-sm text-gray-400 hover:text-gray-900 transition-all border border-gray-50">
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-3 w-3 sm:h-4 sm:w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M12 4v16m8-8H4" /></svg>
                      </button>
                    </div>
                    <button @click="cartStore.removeItem(item.id)" class="text-[8px] font-black text-gray-300 hover:text-red-500 uppercase tracking-widest">Remove</button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Footer Area -->
          <div v-if="cartStore.items.length > 0" class="border-t border-gray-50 p-6 sm:p-8 pb-10 sm:pb-8 bg-white/80 backdrop-blur-md flex-shrink-0">
            <div v-if="!showCheckout" class="space-y-5">
              <div class="flex items-end justify-between">
                <div>
                  <p class="text-[8px] font-black text-gray-400 uppercase tracking-widest mb-1 ml-0.5">Total</p>
                  <span class="text-3xl sm:text-4xl font-black text-gray-900 tracking-tighter italic leading-none">{{ cartStore.formattedTotalPrice }}</span>
                </div>
                <div v-if="cartStore.discountPercent > 0" class="bg-green-50 text-green-600 px-2 py-1 rounded-lg text-[8px] font-black uppercase tracking-widest mb-1 border border-green-100">
                  -{{ cartStore.discountPercent }}%
                </div>
              </div>
              <button 
                @click="toggleCheckout"
                class="w-full bg-orange-600 py-5 rounded-[1.25rem] sm:rounded-[1.5rem] text-center font-black uppercase tracking-widest text-white shadow-2xl shadow-orange-900/30 transition-all hover:bg-orange-700 active:scale-[0.98] text-xs sm:text-sm"
              >
                Proceed
              </button>
            </div>
            
            <div v-else class="animate-in slide-in-from-right-4 duration-500">
              <div class="mb-6 flex items-center justify-between">
                <button @click="toggleCheckout" class="flex items-center gap-2 text-[8px] font-black uppercase tracking-widest text-gray-400 hover:text-gray-900 group">
                  <svg xmlns="http://www.w3.org/2000/svg" class="h-3 w-3 group-hover:-translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M15 19l-7-7 7-7" /></svg>
                  Back
                </button>
                <div class="text-sm font-black tabular-nums italic text-orange-600">{{ cartStore.formattedTotalPrice }}</div>
              </div>
              <CheckoutForm @order-complete="handleOrderComplete" />
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<style scoped>
.custom-scrollbar::-webkit-scrollbar { width: 4px; }
.custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
.custom-scrollbar::-webkit-scrollbar-thumb { @apply bg-gray-100 rounded-full; }
</style>
