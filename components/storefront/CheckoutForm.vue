<script setup lang="ts">
import { useCheckout } from '~/composables/useCheckout'
import { useCartStore } from '~/stores/cart'

const emit = defineEmits<{
  (e: 'order-complete', orderId: string, customerName: string): void
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

const handleApplyPromo = async () => {
  const result = await cartStore.applyPromoCode(details.value.promoCode)
  promoMessage.value = {
    type: result.success ? 'success' : 'error',
    text: result.message
  }
}

const nextToPayment = async () => {
  errorMessage.value = null
  if (!details.value.name.trim() || !details.value.phone.trim()) {
    errorMessage.value = 'Please fill in your name and phone number.'
    return
  }
  
  if (cartStore.totalPrice === 0) {
    await completeCheckout()
    return
  }

  checkoutStep.value = 'payment'
}

const goToTNG = () => {
  // We use window.location.href instead of window.open to avoid the "blank tab" issue.
  // The mobile OS will intercept this and open the app, keeping the current tab active.
  window.location.href = 'https://payment.tngdigital.com.my/sc/bDLnokKcnF'
  hasRedirected.value = true
}

const completeCheckout = async () => {
  errorMessage.value = null
  console.log('[CheckoutForm] Finalizing checkout...')
  
  const result = await submitOrder({
    name: details.value.name,
    phone: details.value.phone,
    promoCode: cartStore.appliedPromoCode || undefined
  })

  if (result.success && result.order) {
    console.log('[CheckoutForm] Success! Emitting order-complete', { id: result.order.id, name: details.value.name })
    emit('order-complete', result.order.id, details.value.name)
  } else if (result.error) {
    console.error('[CheckoutForm] Failed:', result.error)
    errorMessage.value = result.error
  }
}
</script>

<template>
  <div class="space-y-6">
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
              🎉 Promo Applied: -{{ cartStore.discountPercent }}%
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
          {{ cartStore.totalPrice === 0 ? (isSubmitting ? 'Confirming Free Drink...' : 'Confirm Free Drink') : 'Proceed to Payment' }}
        </button>
      </div>
    </div>

    <!-- Step 2: Payment Verification -->
    <div v-else class="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300 text-center">
      <div class="bg-[#005ba1] p-8 rounded-[2.5rem] border border-blue-400/20 shadow-2xl shadow-blue-900/10 relative overflow-hidden group">
        <!-- Abstract Logo Shape -->
        <div class="absolute -top-10 -right-10 w-32 h-32 bg-white/5 rounded-full blur-3xl"></div>
        <div class="absolute -bottom-10 -left-10 w-32 h-32 bg-blue-400/10 rounded-full blur-3xl"></div>

        <div class="relative flex flex-col items-center gap-6">
          <div class="flex items-center justify-center gap-2">
            <div class="bg-white px-4 py-2 rounded-xl shadow-sm transform -rotate-2 group-hover:rotate-0 transition-transform duration-500">
              <span class="text-[#005ba1] font-black text-xl italic tracking-tighter">Touch</span>
            </div>
            <div class="bg-[#fdb913] px-4 py-2 rounded-xl shadow-sm transform rotate-3 group-hover:rotate-0 transition-transform duration-500">
              <span class="text-blue-900 font-black text-xl italic tracking-tighter">'n Go</span>
            </div>
          </div>

          <div class="w-full">
            <p class="text-[10px] font-black text-blue-100/60 uppercase tracking-[0.2em] mb-4">Secure E-Wallet Payment</p>
            <div class="bg-white/10 backdrop-blur-md rounded-2xl p-5 border border-white/10">
              <p class="text-[10px] font-black text-blue-100 uppercase tracking-widest mb-1">Total Payable</p>
              <p class="text-3xl font-black text-white tracking-tight">{{ cartStore.formattedTotalPrice }}</p>
            </div>
            <p class="text-[9px] text-blue-100/80 mt-4 font-bold uppercase tracking-wide leading-relaxed">
              1. Tap button below to open TNG App<br/>
              2. Enter amount & Pay<br/>
              3. Return here to confirm
            </p>
          </div>
        </div>
      </div>

      <div class="space-y-4">
        <button 
          @click="goToTNG"
          class="w-full bg-[#005ba1] text-white py-5 rounded-2xl font-black uppercase tracking-widest shadow-xl shadow-blue-600/20 flex items-center justify-center gap-3 transition-all hover:bg-blue-700 active:scale-[0.98]"
        >
          <span>Pay with TNG eWallet</span>
          <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M14 5l7 7m0 0l-7 7m7-7H3" />
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
  </div>
</template>
