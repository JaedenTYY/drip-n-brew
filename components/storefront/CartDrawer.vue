<script setup lang="ts">
import { useCartStore } from '~/stores/cart'
import { useCartDrawer } from '~/composables/useCartDrawer'
import CheckoutForm from './CheckoutForm.vue'

const cartStore = useCartStore()
const { isDrawerOpen, closeDrawer } = useCartDrawer()

const showCheckout = ref(false)

const toggleCheckout = () => {
  showCheckout.value = !showCheckout.value
}

const handleOrderComplete = (orderId: string) => {
  closeDrawer()
  navigateTo({
    path: '/order-confirmation',
    query: { id: orderId }
  })
}
</script>

<template>
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
        class="fixed inset-0 z-[60] bg-gray-900/40 backdrop-blur-sm"
      ></div>
    </Transition>

    <!-- Drawer Panel -->
    <Transition
      enter-active-class="transition duration-500 cubic-bezier(0.32, 0.72, 0, 1)"
      enter-from-class="translate-x-full"
      enter-to-class="translate-x-0"
      leave-active-class="transition duration-400 cubic-bezier(0.32, 0.72, 0, 1)"
      leave-from-class="translate-x-0"
      leave-to-class="translate-x-full"
    >
      <div 
        v-if="isDrawerOpen" 
        class="fixed inset-y-0 right-0 z-[70] flex w-full max-w-md flex-col bg-white shadow-2xl"
      >
        <!-- Header -->
        <div class="flex items-center justify-between border-b border-gray-100 px-6 py-5">
          <h2 class="text-xl font-black uppercase tracking-tight text-gray-900">Your Order</h2>
          <button 
            @click="closeDrawer"
            class="rounded-full p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-900 transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <!-- Cart Items -->
        <div class="flex-1 overflow-y-auto px-6 py-4">
          <div v-if="cartStore.items.length === 0" class="flex h-full flex-col items-center justify-center text-center">
            <div class="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gray-50 text-gray-300">
              <svg xmlns="http://www.w3.org/2000/svg" class="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
              </svg>
            </div>
            <p class="text-lg font-bold text-gray-900">Your cart is empty</p>
            <p class="mt-1 text-sm text-gray-400">Add some delicious treats to get started!</p>
          </div>

          <div v-else class="space-y-6">
            <div v-for="item in cartStore.items" :key="item.id" class="flex gap-4">
              <div class="h-20 w-20 flex-shrink-0 overflow-hidden rounded-xl bg-gray-100">
                <img v-if="item.image_url" :src="item.image_url" :alt="item.name" class="h-full w-full object-cover" />
                <div v-else class="flex h-full w-full items-center justify-center text-gray-300">
                  <svg xmlns="http://www.w3.org/2000/svg" class="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
              </div>
              <div class="flex flex-1 flex-col justify-between">
                <div class="flex justify-between">
                  <div>
                    <h3 class="font-bold text-gray-900">{{ item.name }}</h3>
                    <!-- Customizations Display -->
                    <div v-if="item.customizations" class="mt-1 flex flex-wrap gap-1">
                      <span 
                        v-if="item.customizations.temperature" 
                        class="text-[9px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded bg-gray-100 text-gray-500"
                      >
                        {{ item.customizations.temperature }}
                      </span>
                      <span 
                        v-if="item.customizations.service_type" 
                        :class="[
                          'text-[9px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded',
                          item.customizations.service_type === 'BYO Flask' ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-500'
                        ]"
                      >
                        {{ item.customizations.service_type }}
                      </span>
                    </div>
                  </div>
                  <div class="text-right">
                    <p class="font-black text-gray-900">
                      RM{{ (item.price * item.quantity).toFixed(2) }}
                    </p>
                    <p v-if="item.customizations?.service_type === 'BYO Flask'" class="text-[10px] font-bold text-green-600 uppercase">
                      -RM0.50 Discount
                    </p>
                  </div>
                </div>
                <div class="flex items-center justify-between">
                  <div class="flex items-center gap-3">
                    <button 
                      @click="cartStore.updateQuantity(item.id, item.quantity - 1)"
                      class="flex h-7 w-7 items-center justify-center rounded-lg border border-gray-200 text-gray-400 hover:border-gray-900 hover:text-gray-900 transition-colors"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 12H4" />
                      </svg>
                    </button>
                    <span class="text-sm font-black tabular-nums">{{ item.quantity }}</span>
                    <button 
                      @click="cartStore.updateQuantity(item.id, item.quantity + 1)"
                      class="flex h-7 w-7 items-center justify-center rounded-lg border border-gray-200 text-gray-400 hover:border-gray-900 hover:text-gray-900 transition-colors"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
                      </svg>
                    </button>
                  </div>
                  <button 
                    @click="cartStore.removeItem(item.id)"
                    class="text-xs font-bold text-gray-400 hover:text-red-500 uppercase tracking-widest transition-colors"
                  >
                    Remove
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Footer -->
        <div v-if="cartStore.items.length > 0" class="border-t border-gray-100 p-6">
          <div v-if="!showCheckout" class="space-y-4">
            <div class="flex items-center justify-between text-lg font-black uppercase tracking-tight">
              <span>Total</span>
              <span>{{ cartStore.formattedTotalPrice }}</span>
            </div>
            <button 
              @click="toggleCheckout"
              class="w-full bg-orange-600 py-4 text-center font-black uppercase tracking-widest text-white shadow-lg shadow-orange-200 transition-all hover:bg-orange-700 active:scale-[0.98]"
            >
              Checkout Now
            </button>
          </div>
          
          <div v-else class="animate-in slide-in-from-bottom duration-500">
            <div class="mb-4 flex items-center justify-between">
              <button @click="toggleCheckout" class="text-xs font-black uppercase tracking-widest text-gray-400 hover:text-gray-900">
                &larr; Back to Cart
              </button>
              <div class="text-sm font-black tabular-nums">{{ cartStore.formattedTotalPrice }}</div>
            </div>
            <CheckoutForm @order-complete="handleOrderComplete" />
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>
