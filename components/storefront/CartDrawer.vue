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
  
  // 1. Show the global success popup
  showSuccess.value = true
  
  // 2. Wait 2 seconds so they can see the success message
  setTimeout(() => {
    showSuccess.value = false
    closeDrawer()
    
    // 3. Redirect to tracker
    navigateTo({
      path: '/order-confirmation',
      query: { id: orderId }
    })
  }, 2000)
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
          class="fixed inset-0 z-[60] bg-gray-900/60 backdrop-blur-sm"
        ></div>
      </Transition>

      <!-- Drawer Panel (Full screen on mobile, sidebar on desktop) -->
      <Transition
        enter-active-class="transition duration-500 cubic-bezier(0.32, 0.72, 0, 1)"
        enter-from-class="translate-x-full sm:translate-x-full translate-y-full sm:translate-y-0"
        enter-to-class="translate-x-0 translate-y-0"
        leave-active-class="transition duration-400 cubic-bezier(0.32, 0.72, 0, 1)"
        leave-from-class="translate-x-0 translate-y-0"
        leave-to-class="translate-x-full sm:translate-x-full translate-y-full sm:translate-y-0"
      >
        <div 
          v-if="isDrawerOpen" 
          class="fixed inset-0 sm:inset-y-0 sm:right-0 z-[70] flex w-full sm:max-w-md flex-col bg-white shadow-2xl"
        >
          <!-- Header -->
          <div class="flex items-center justify-between border-b border-gray-100 px-6 py-5 flex-shrink-0">
            <h2 class="text-xl font-black uppercase tracking-tight text-gray-900 italic">Your Order</h2>
            <button 
              @click="closeDrawer"
              class="rounded-2xl p-3 text-gray-400 hover:bg-gray-100 hover:text-gray-900 transition-colors border border-gray-100"
            >
              <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <!-- Cart Items -->
          <div class="flex-1 overflow-y-auto px-6 py-6 custom-scrollbar">
            <div v-if="cartStore.items.length === 0" class="flex h-full flex-col items-center justify-center text-center">
              <div class="mb-6 flex h-20 w-20 items-center justify-center rounded-3xl bg-gray-50 text-gray-200">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                </svg>
              </div>
              <p class="text-xl font-black text-gray-900 uppercase italic">Your cart is empty</p>
              <p class="mt-2 text-xs font-bold text-gray-400 uppercase tracking-widest">Time for some coffee?</p>
            </div>

            <div v-else class="space-y-8">
              <div v-for="item in cartStore.items" :key="item.id" class="flex gap-5">
                <div class="h-20 w-20 flex-shrink-0 overflow-hidden rounded-2xl bg-gray-50 border border-gray-100">
                  <img v-if="item.image_url" :src="item.image_url" :alt="item.name" class="h-full w-full object-cover" />
                  <div v-else class="flex h-full w-full items-center justify-center text-gray-300">
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </div>
                </div>
                
                <div class="flex flex-1 flex-col justify-between py-0.5">
                  <div class="flex justify-between items-start gap-2">
                    <div>
                      <h3 class="font-black text-gray-900 uppercase italic text-sm tracking-tight">{{ item.name }}</h3>
                      <div v-if="item.customizations" class="mt-1.5 flex flex-wrap gap-1.5">
                        <span 
                          v-if="item.customizations.temperature" 
                          class="text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md bg-gray-100 text-gray-500 border border-gray-200"
                        >
                          {{ item.customizations.temperature }}
                        </span>
                        <span 
                          v-if="item.customizations.service_type" 
                          :class="[
                            'text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md border',
                            item.customizations.service_type === 'BYO Flask' 
                              ? 'bg-green-50 text-green-700 border-green-100' 
                              : 'bg-gray-100 text-gray-500 border-gray-200'
                          ]"
                        >
                          {{ item.customizations.service_type }}
                        </span>
                      </div>
                    </div>
                    <div class="text-right">
                      <p class="font-black text-gray-900 text-sm tracking-tight">
                        RM{{ (item.price * item.quantity).toFixed(2) }}
                      </p>
                    </div>
                  </div>

                  <div class="flex items-center justify-between mt-4">
                    <div class="flex items-center gap-1 bg-gray-50 rounded-xl p-1 border border-gray-100">
                      <button 
                        @click="cartStore.updateQuantity(item.id, item.quantity - 1)"
                        class="flex h-8 w-8 items-center justify-center rounded-lg bg-white shadow-sm text-gray-400 hover:text-gray-900 active:scale-90 transition-all"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M20 12H4" />
                        </svg>
                      </button>
                      <span class="w-8 text-center text-xs font-black tabular-nums">{{ item.quantity }}</span>
                      <button 
                        @click="cartStore.updateQuantity(item.id, item.quantity + 1)"
                        class="flex h-8 w-8 items-center justify-center rounded-lg bg-white shadow-sm text-gray-400 hover:text-gray-900 active:scale-90 transition-all"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M12 4v16m8-8H4" />
                        </svg>
                      </button>
                    </div>
                    <button 
                      @click="cartStore.removeItem(item.id)"
                      class="text-[10px] font-black text-gray-400 hover:text-red-500 uppercase tracking-widest transition-colors px-2 py-1"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Footer -->
          <div v-if="cartStore.items.length > 0" class="border-t border-gray-100 p-6 pb-10 sm:pb-6 bg-white flex-shrink-0">
            <div v-if="!showCheckout" class="space-y-5">
              <div class="flex items-center justify-between">
                <span class="text-xs font-black uppercase tracking-widest text-gray-400">Estimated Total</span>
                <span class="text-2xl font-black text-gray-900 tracking-tighter italic">{{ cartStore.formattedTotalPrice }}</span>
              </div>
              <button 
                @click="toggleCheckout"
                class="w-full bg-orange-600 py-5 rounded-2xl text-center font-black uppercase tracking-widest text-white shadow-xl shadow-orange-200 transition-all hover:bg-orange-700 active:scale-[0.98]"
              >
                Checkout Now
              </button>
            </div>
            
            <div v-else class="animate-in slide-in-from-bottom-4 duration-300">
              <div class="mb-6 flex items-center justify-between">
                <button @click="toggleCheckout" class="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-gray-400 hover:text-gray-900 group">
                  <svg xmlns="http://www.w3.org/2000/svg" class="h-3 w-3 group-hover:-translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M15 19l-7-7 7-7" />
                  </svg>
                  Back to Cart
                </button>
                <div class="text-sm font-black tabular-nums italic text-orange-600">{{ cartStore.formattedTotalPrice }}</div>
              </div>
              <CheckoutForm @order-complete="handleOrderComplete" />
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>

    <!-- Global Success Popup -->
    <SuccessPopup 
      :show="showSuccess" 
      :customer-name="lastCustomerName" 
    />
  </div>
</template>

<style scoped>
.custom-scrollbar::-webkit-scrollbar {
  width: 4px;
}
.custom-scrollbar::-webkit-scrollbar-track {
  background: transparent;
}
.custom-scrollbar::-webkit-scrollbar-thumb {
  @apply bg-gray-100;
  border-radius: 10px;
}
</style>
