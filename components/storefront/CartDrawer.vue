<script setup lang="ts">
import { useCartStore } from '~/stores/cart'
import { useCartDrawer } from '~/composables/useCartDrawer'
import CheckoutForm from './CheckoutForm.vue'
import SuccessPopup from './SuccessPopup.vue'

const cartStore = useCartStore()
const { isDrawerOpen, closeDrawer } = useCartDrawer()

const showCheckout = ref(false)
const showSuccess = ref(false)
const lastCustomerName = ref('')
const lastOrderId = ref('')

const toggleCheckout = () => {
  showCheckout.value = !showCheckout.value
}

const handleOrderComplete = (orderId: string, customerName: string) => {
  lastOrderId.value = orderId
  lastCustomerName.value = customerName
  showSuccess.value = true
  showCheckout.value = false
  
  setTimeout(() => {
    showSuccess.value = false
    cartStore.clearCart()
    closeDrawer()
    navigateTo({
      path: '/order-confirmation',
      query: { id: orderId }
    })
  }, 2500)
}

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

      <!-- Drawer Panel -->
      <Transition
        enter-active-class="transition duration-700 cubic-bezier(0.32, 0.72, 0, 1)"
        enter-from-class="translate-x-full sm:translate-x-full translate-y-full sm:translate-y-0"
        enter-to-class="translate-x-0 translate-y-0"
        leave-active-class="transition duration-500 cubic-bezier(0.32, 0.72, 0, 1)"
        leave-from-class="translate-x-0 translate-y-0"
        leave-to-class="translate-x-full sm:translate-x-full translate-y-full sm:translate-y-0"
      >
        <div 
          v-if="isDrawerOpen" 
          class="fixed inset-0 sm:inset-y-0 sm:right-0 z-[70] flex w-full sm:max-w-md flex-col bg-white shadow-2xl overflow-hidden sm:rounded-l-[3rem]"
        >
          <!-- Header -->
          <div class="flex items-center justify-between border-b border-gray-50 px-8 py-8 flex-shrink-0">
            <div>
              <h2 class="text-2xl font-black uppercase italic tracking-tighter text-gray-900 leading-none">Your Bag</h2>
              <p class="text-[8px] font-black text-orange-600 uppercase tracking-[0.3em] mt-2">Drip & Brew Review</p>
            </div>
            <button 
              @click="closeDrawer"
              class="rounded-2xl p-4 text-gray-400 hover:bg-gray-50 hover:text-gray-900 transition-all active:scale-90 border border-gray-100"
            >
              <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <!-- Cart Items -->
          <div class="flex-1 overflow-y-auto px-8 py-4 custom-scrollbar">
            <div v-if="cartStore.items.length === 0 && !showSuccess" class="flex h-full flex-col items-center justify-center text-center">
              <div class="mb-8 flex h-24 w-24 items-center justify-center rounded-[2.5rem] bg-gray-50 text-gray-200">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                </svg>
              </div>
              <p class="text-xl font-black text-gray-900 uppercase italic">The bag is empty</p>
              <button @click="closeDrawer" class="mt-6 text-[10px] font-black text-orange-600 uppercase tracking-widest hover:underline">Start Browsing</button>
            </div>

            <div v-else class="space-y-10 py-6">
              <div v-for="item in cartStore.items" :key="item.id" class="flex gap-6 animate-in slide-in-from-right-4 duration-500">
                <div class="h-24 w-24 flex-shrink-0 overflow-hidden rounded-[1.5rem] bg-gray-50 border border-gray-100 shadow-inner">
                  <img v-if="item.image_url" :src="item.image_url" :alt="item.name" class="h-full w-full object-cover" />
                </div>
                
                <div class="flex flex-1 flex-col justify-between py-1">
                  <div class="flex justify-between items-start">
                    <div>
                      <h3 class="font-black text-gray-900 uppercase italic text-sm tracking-tight leading-tight">{{ item.name }}</h3>
                      <div v-if="item.customizations" class="mt-2 flex flex-wrap gap-1.5">
                        <span class="text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md bg-gray-900 text-white">
                          {{ item.customizations.temperature }}
                        </span>
                        <span class="text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md border border-gray-200 text-gray-400">
                          {{ item.customizations.service_type }}
                        </span>
                      </div>
                    </div>
                    <p class="font-black text-gray-900 text-sm tracking-tight">RM{{ (item.price * item.quantity).toFixed(2) }}</p>
                  </div>

                  <div class="flex items-center justify-between mt-5">
                    <div class="flex items-center gap-1 bg-gray-50 rounded-[1rem] p-1 border border-gray-100">
                      <button @click="cartStore.updateQuantity(item.id, item.quantity - 1)" class="flex h-9 w-9 items-center justify-center rounded-lg bg-white shadow-sm text-gray-400 hover:text-gray-900 transition-all active:scale-90 border border-gray-50">
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M20 12H4" /></svg>
                      </button>
                      <span class="w-10 text-center text-xs font-black tabular-nums">{{ item.quantity }}</span>
                      <button @click="cartStore.updateQuantity(item.id, item.quantity + 1)" class="flex h-9 w-9 items-center justify-center rounded-lg bg-white shadow-sm text-gray-400 hover:text-gray-900 transition-all active:scale-90 border border-gray-50">
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M12 4v16m8-8H4" /></svg>
                      </button>
                    </div>
                    <button @click="cartStore.removeItem(item.id)" class="text-[9px] font-black text-gray-300 hover:text-red-500 uppercase tracking-widest transition-all">Remove</button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Footer Area -->
          <div v-if="cartStore.items.length > 0" class="border-t border-gray-50 p-8 pb-12 sm:pb-8 bg-white/80 backdrop-blur-md flex-shrink-0">
            <div v-if="!showCheckout" class="space-y-6">
              <div class="flex items-end justify-between">
                <div>
                  <p class="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1.5 ml-0.5">Total Amount</p>
                  <span class="text-4xl font-black text-gray-900 tracking-tighter italic leading-none">{{ cartStore.formattedTotalPrice }}</span>
                </div>
                <div v-if="cartStore.discountPercent > 0" class="bg-green-50 text-green-600 px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest mb-1 shadow-sm border border-green-100">
                  {{ cartStore.discountPercent }}% Off Applied
                </div>
              </div>
              <button 
                @click="toggleCheckout"
                class="w-full bg-orange-600 py-6 rounded-[1.5rem] text-center font-black uppercase tracking-widest text-white shadow-2xl shadow-orange-900/30 transition-all hover:bg-orange-700 hover:scale-[1.02] active:scale-[0.98]"
              >
                Proceed to Checkout
              </button>
            </div>
            
            <div v-else class="animate-in slide-in-from-bottom-4 duration-500">
              <div class="mb-8 flex items-center justify-between">
                <button @click="toggleCheckout" class="flex items-center gap-3 text-[9px] font-black uppercase tracking-widest text-gray-400 hover:text-gray-900 group transition-all">
                  <div class="h-8 w-8 rounded-full border border-gray-100 flex items-center justify-center group-hover:border-gray-900 group-hover:bg-gray-900 group-hover:text-white transition-all">
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M15 19l-7-7 7-7" /></svg>
                  </div>
                  Back to Bag
                </button>
                <div class="text-lg font-black tabular-nums italic text-orange-600 tracking-tight">{{ cartStore.formattedTotalPrice }}</div>
              </div>
              <CheckoutForm @order-complete="handleOrderComplete" />
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>

    <!-- Success Feedback Overlay -->
    <SuccessPopup :show="showSuccess" :customer-name="lastCustomerName" />
  </div>
</template>

<style scoped>
.custom-scrollbar::-webkit-scrollbar { width: 4px; }
.custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
.custom-scrollbar::-webkit-scrollbar-thumb { @apply bg-gray-100 rounded-full; }
</style>
