<script setup lang="ts">
import { useCheckout } from '~/composables/useCheckout'
import { useCartStore } from '~/stores/cart'

const emit = defineEmits<{
  (e: 'order-complete', orderId: string): void
}>()

const { submitOrder, isSubmitting } = useCheckout()
const cartStore = useCartStore()

const details = ref({
  name: '',
  phone: '',
  promoCode: ''
})

const checkoutStep = ref<'details' | 'payment'>('details')
const hasRedirected = ref(false)
const promoMessage = ref<{ type: 'success' | 'error', text: string } | null>(null)
const errorMessage = ref<string | null>(null)
const isSuccess = ref(false)

const handleApplyPromo = () => {
  const result = cartStore.applyPromoCode(details.value.promoCode)
  promoMessage.value = {
    type: result.success ? 'success' : 'error',
    text: result.message
  }
}

const nextToPayment = () => {
  errorMessage.value = null
  if (!details.value.name.trim() || !details.value.phone.trim()) {
    errorMessage.value = 'Please fill in your name and phone number.'
    return
  }
  
  // If the order is FREE (Promo Code applied), skip the payment step and go straight to confirm
  if (cartStore.totalPrice === 0) {
    completeCheckout()
    return
  }

  checkoutStep.value = 'payment'
}

const goToTNG = () => {
  window.open('https://payment.tngdigital.com.my/sc/bDLnokKcnF', '_blank')
  hasRedirected.value = true
}

const completeCheckout = async () => {
  errorMessage.value = null
  
  const result = await submitOrder({
    name: details.value.name,
    phone: details.value.phone,
    promoCode: cartStore.appliedPromoCode || undefined
  })

  if (result.success && result.order) {
    isSuccess.value = true
    // Small delay to show success state before redirecting
    setTimeout(() => {
      emit('order-complete', result.order!.id)
    }, 1000)
  } else if (result.error) {
    errorMessage.value = result.error
  }
}
</script>

<template>
  <div class="space-y-6">
    <!-- Success State Overlay -->
    <div v-if="isSuccess" class="py-12 flex flex-col items-center justify-center text-center animate-in zoom-in-95 duration-500">
      <div class="h-16 w-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mb-4">
        <svg xmlns="http://www.w3.org/2000/svg" class="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7" />
        </svg>
      </div>
      <h3 class="text-xl font-black text-gray-900 uppercase italic">Order Sent!</h3>
      <p class="text-gray-500 text-xs font-medium mt-1">Redirecting to tracker...</p>
    </div>

    <template v-else>
      <!-- Error Display -->
      <div v-if="errorMessage" class="p-4 bg-red-50 border border-red-100 rounded-2xl text-xs text-red-600 font-bold uppercase tracking-widest animate-in shake duration-500">
        ⚠️ Error: {{ errorMessage }}
      </div>

      <!-- Step 1: Customer Details -->
      <div v-if="checkoutStep === 'details'" class="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
        <h3 class="text-xs font-black uppercase tracking-widest text-gray-400">Checkout Details</h3>
        
        <div class="space-y-4">
          <div>
            <label class="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1.5">Your Name</label>
            <input 
              v-model="details.name" 
              type="text" 
              required 
              class="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 text-gray-900 focus:ring-2 focus:ring-orange-600 outline-none transition-all"
              placeholder="John Doe"
            />
          </div>

          <div>
            <label class="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1.5">Phone Number</label>
            <input 
              v-model="details.phone" 
              type="tel" 
              required 
              class="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 text-gray-900 focus:ring-2 focus:ring-orange-600 outline-none transition-all"
              placeholder="012-3456789"
            />
          </div>

          <div>
            <label class="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1.5">Promo Code (Optional)</label>
            <div class="flex gap-2">
              <input 
                v-model="details.promoCode" 
                type="text" 
                class="flex-1 bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 text-gray-900 focus:ring-2 focus:ring-orange-600 outline-none transition-all uppercase"
                placeholder="e.g. WELCOME"
              />
              <button 
                @click="handleApplyPromo"
                type="button"
                class="bg-gray-900 text-white px-6 rounded-xl font-bold text-xs uppercase hover:bg-orange-600 transition-colors"
              >
                Apply
              </button>
            </div>
            <p 
              v-if="promoMessage" 
              class="mt-2 text-[10px] font-bold uppercase tracking-widest"
              :class="promoMessage.type === 'success' ? 'text-green-600' : 'text-red-500'"
            >
              {{ promoMessage.text }}
            </p>
          </div>
        </div>

        <div class="pt-4 border-t border-gray-100">
          <div class="flex items-center justify-between mb-4">
            <span class="text-xs font-black uppercase tracking-widest text-gray-400">Final Total</span>
            <div class="flex flex-col items-end">
              <span v-if="cartStore.appliedPromoCode" class="text-[10px] font-black text-green-600 uppercase tracking-tighter mb-1">
                🎉 Promo Applied: -100%
              </span>
              <span class="text-xl font-black text-gray-900" :class="{'text-green-600': cartStore.totalPrice === 0}">
                {{ cartStore.formattedTotalPrice }}
              </span>
            </div>
          </div>
          
          <button 
            @click="nextToPayment"
            :disabled="isSubmitting"
            class="w-full py-4 rounded-xl font-black uppercase tracking-widest transition-all flex items-center justify-center gap-3"
            :class="cartStore.totalPrice === 0 ? 'bg-green-600 text-white hover:bg-green-700' : 'bg-gray-900 text-white hover:bg-orange-600'"
          >
            <span v-if="isSubmitting" class="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full"></span>
            {{ cartStore.totalPrice === 0 ? (isSubmitting ? 'Confirming Free Order...' : 'Confirm Free Order') : 'Proceed to Payment' }}
          </button>
        </div>
      </div>

      <!-- Step 2: Payment Verification -->
      <div v-else class="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300 text-center">
        <div class="bg-blue-50 p-6 rounded-2xl border border-blue-100">
          <div class="flex flex-col items-center gap-4">
            <div class="h-12 w-12 bg-white rounded-full flex items-center justify-center shadow-sm">
              <span class="text-xl">💳</span>
            </div>
            <div class="w-full">
              <h3 class="font-black text-blue-900 uppercase tracking-tight">Payment via Touch 'n Go</h3>
              <div class="mt-3 bg-white rounded-xl p-4 border border-blue-100">
                <p class="text-[10px] font-black text-blue-400 uppercase tracking-widest">Amount to Pay</p>
                <p class="text-2xl font-black text-gray-900">{{ cartStore.formattedTotalPrice }}</p>
              </div>
              <p class="text-[10px] text-blue-700 mt-3 font-bold uppercase italic">* Enter this exact amount in the TNG app</p>
            </div>
          </div>
        </div>

        <div class="space-y-3">
          <button 
            @click="goToTNG"
            class="w-full bg-[#005ba1] text-white py-4 rounded-xl font-black uppercase tracking-widest shadow-lg shadow-blue-100 flex items-center justify-center gap-3 transition-all active:scale-95"
          >
            <span>Open TNG App</span>
            <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
          </button>

          <button 
            v-if="hasRedirected"
            @click="completeCheckout"
            :disabled="isSubmitting"
            class="w-full bg-green-600 text-white py-4 rounded-xl font-black uppercase tracking-widest shadow-lg shadow-green-100 transition-all hover:bg-green-700 animate-in zoom-in-95"
          >
            {{ isSubmitting ? 'Verifying...' : '✅ I have made payment' }}
          </button>
          
          <button @click="checkoutStep = 'details'" class="text-xs font-black uppercase tracking-widest text-gray-400 hover:text-gray-900">
            Cancel & Edit Details
          </button>
        </div>
      </div>
    </template>
  </div>
</template>
