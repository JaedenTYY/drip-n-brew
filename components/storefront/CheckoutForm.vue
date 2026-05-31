<script setup lang="ts">
import { useCheckout } from '~/composables/useCheckout'
import { useCartStore } from '~/stores/cart'

const emit = defineEmits<{
  (e: 'order-complete', orderId: string, customerName: string): void
}>()

const { submitOrder, isSubmitting } = useCheckout()
const cartStore = useCartStore()

// --- State ---
const checkoutStep = ref<'details' | 'survey' | 'payment'>('details')
const hasRedirected = ref(false)
const details = ref({
  name: '',
  phone: '',
  email: '',
  promoCode: ''
})
const survey = ref({
  invitedBy: '',
  lookingForChurch: false,
  knowMoreAboutJesus: false,
  newcomerPhone: '',
  useNewcomerPhoneAsPrimary: false
})
const promoMessage = ref<{ type: 'success' | 'error', text: string } | null>(null)
const errorMessage = ref<string | null>(null)

// --- Persistence ---
onMounted(() => {
  // Restore Customer Details
  const saved = localStorage.getItem('dnb_customer_details')
  if (saved) {
    try {
      const parsed = JSON.parse(saved)
      details.value.name = parsed.name || ''
      details.value.phone = parsed.phone || ''
      details.value.email = parsed.email || ''
    } catch (e) {}
  }

  // Restore Checkout State (Critical for mobile browser refreshes after TNG redirect)
  const savedSession = localStorage.getItem('dnb_checkout_session')
  if (savedSession) {
    try {
      const parsed = JSON.parse(savedSession)
      if (parsed.step) checkoutStep.value = parsed.step
      if (parsed.hasRedirected) hasRedirected.value = parsed.hasRedirected
      // Clean up session if it's too old (e.g. 30 mins)
      if (parsed.timestamp && Date.now() - parsed.timestamp > 1800000) {
         localStorage.removeItem('dnb_checkout_session')
         checkoutStep.value = 'details'
         hasRedirected.value = false
      }
    } catch (e) {}
  }
})

// Sync checkout session state to localStorage
watch([checkoutStep, hasRedirected], () => {
  if (process.client) {
    localStorage.setItem('dnb_checkout_session', JSON.stringify({
      step: checkoutStep.value,
      hasRedirected: hasRedirected.value,
      timestamp: Date.now()
    }))
  }
})

const toggleSameAsOrder = () => {
  survey.value.useNewcomerPhoneAsPrimary = !survey.value.useNewcomerPhoneAsPrimary
  if (survey.value.useNewcomerPhoneAsPrimary) {
    survey.value.newcomerPhone = details.value.phone
  } else {
    survey.value.newcomerPhone = ''
  }
}

const handleApplyPromo = async () => {
  const result = await cartStore.applyPromoCode(details.value.promoCode)
  promoMessage.value = {
    type: result.success ? 'success' : 'error',
    text: result.message
  }
}

const nextToPayment = async () => {
  errorMessage.value = null
  if (!details.value.name.trim() || !details.value.phone.trim() || !details.value.email.trim()) {
    errorMessage.value = 'Please fill in all details'
    return
  }

  localStorage.setItem('dnb_customer_details', JSON.stringify({
    name: details.value.name,
    phone: details.value.phone,
    email: details.value.email
  }))
  
  if (cartStore.requiresSurvey) {
    checkoutStep.value = 'survey'
    return
  }

  if (cartStore.totalPrice === 0) {
    await completeCheckout()
    return
  }

  checkoutStep.value = 'payment'
}

const goToTNG = () => {
  const tngUrl = 'https://payment.tngdigital.com.my/sc/bDLnokKcnF'
  const isAndroid = /Android/i.test(navigator.userAgent)
  const isIOS = /iPhone|iPad|iPod/i.test(navigator.userAgent)
  
  hasRedirected.value = true

  if (isAndroid) {
    // Android Deep Link Intent: Forces the OS to try opening the app directly
    // If not installed, it falls back to the browser URL
    const intentUrl = `intent://payment.tngdigital.com.my/sc/bDLnokKcnF#Intent;scheme=https;package=my.com.tngdigital.ewallet;S.browser_fallback_url=https://payment.tngdigital.com.my/sc/bDLnokKcnF;end`
    window.location.href = intentUrl
  } else if (isIOS) {
    // iOS standard redirect (Universal Links)
    window.location.href = tngUrl
  } else {
    // Desktop fallback
    window.open(tngUrl, '_blank')
  }
}

const completeCheckout = async () => {
  errorMessage.value = null
  
  // E.164 Formatting Logic for WhatsApp
  // Prepend '60' for Malaysia if number starts with local '01...'
  let cleanPhone = details.value.phone.replace(/\D/g, '')
  if (cleanPhone.startsWith('01')) {
    cleanPhone = '60' + cleanPhone.substring(1)
  } else if (cleanPhone.startsWith('1') && !cleanPhone.startsWith('601')) {
    // Handle cases where user might start with 1...
    cleanPhone = '60' + cleanPhone
  }

  // Ensure survey newcomer phone is updated with latest contact info if toggled
  if (survey.value.useNewcomerPhoneAsPrimary) {
    survey.value.newcomerPhone = details.value.phone
  }

  const result = await submitOrder({
    name: details.value.name,
    phone: cleanPhone,
    email: details.value.email,
    promoCode: cartStore.appliedPromoCode || undefined,
    survey: cartStore.requiresSurvey ? survey.value : undefined
  })
  if (result.success && result.order) {
    // Clear session and cart upon success
    localStorage.removeItem('dnb_checkout_session')
    cartStore.clearCart()
    emit('order-complete', result.order.id, details.value.name)
  } else if (result.error) {
    errorMessage.value = result.error
  }
}
</script>

<template>
  <div class="h-full flex flex-col">
    <!-- Step 1: Details -->
    <div v-if="checkoutStep === 'details'" class="flex flex-col h-full animate-in fade-in slide-in-from-right-4 duration-300">
      
      <div class="flex-1 space-y-6">
        <!-- Premium Header (Reverted 'Step' parts) -->
        <div class="border-b border-gray-100 pb-4">
           <h3 class="text-xl font-black uppercase italic tracking-tighter text-gray-900">Checkout Info</h3>
           <p class="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">Provide your contact details below</p>
        </div>

        <!-- Input Grid -->
        <div class="space-y-4">
          <!-- Name -->
          <div>
            <label class="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2 ml-1">Full Name</label>
            <input 
              v-model="details.name" 
              type="text" 
              autocomplete="name" 
              class="w-full bg-gray-50 border border-gray-100 rounded-2xl px-5 py-4 text-sm font-bold text-gray-900 focus:ring-2 focus:ring-orange-600 outline-none transition-all" 
              placeholder="e.g. Beckham Acho Paul"
            />
          </div>

          <!-- Phone & Email -->
          <div class="grid grid-cols-1 sm:grid-cols-5 gap-4">
            <div class="sm:col-span-2">
              <label class="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2 ml-1">Phone</label>
              <input 
                v-model="details.phone" 
                type="tel" 
                autocomplete="tel" 
                class="w-full bg-gray-50 border border-gray-100 rounded-2xl px-5 py-4 text-sm font-bold text-gray-900 focus:ring-2 focus:ring-orange-600 outline-none transition-all" 
                placeholder="012-3456789"
              />
            </div>
            <div class="sm:col-span-3">
              <label class="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2 ml-1">Email</label>
              <input 
                v-model="details.email" 
                type="email" 
                autocomplete="email" 
                class="w-full bg-gray-50 border border-gray-100 rounded-2xl px-5 py-4 text-sm font-bold text-gray-900 focus:ring-2 focus:ring-orange-600 outline-none transition-all" 
                placeholder="john@example.com"
              />
            </div>
          </div>

          <!-- Inline Promo Code -->
          <div>
            <label class="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2 ml-1">Promo Code</label>
            <div class="relative flex items-center">
              <input 
                v-model="details.promoCode" 
                type="text" 
                class="w-full bg-gray-50 border border-gray-100 rounded-2xl px-5 py-4 text-sm font-bold text-gray-900 focus:ring-2 focus:ring-orange-600 outline-none transition-all uppercase pr-24" 
                placeholder="JESUSLOVESYOU"
              />
              <button 
                @click="handleApplyPromo" 
                type="button" 
                class="absolute right-2 bg-gray-900 text-white px-5 py-2.5 rounded-xl font-black text-[10px] uppercase hover:bg-orange-600 transition-all active:scale-95"
              >
                Apply
              </button>
            </div>
            <p v-if="promoMessage" class="mt-2 text-[9px] font-black uppercase tracking-widest ml-1" :class="promoMessage.type === 'success' ? 'text-green-600' : 'text-red-500'">
              {{ promoMessage.text }}
            </p>
          </div>
        </div>
      </div>

      <!-- Large Action Footer -->
      <div class="mt-8 pt-6 border-t border-gray-100">
        <div v-if="errorMessage" class="mb-4 p-4 bg-red-50 border border-red-100 rounded-2xl text-xs text-red-600 font-black uppercase tracking-widest animate-in shake">
          ⚠️ {{ errorMessage }}
        </div>

        <div class="flex items-center justify-between mb-5 px-1">
          <div class="flex flex-col">
            <span class="text-[10px] font-black uppercase tracking-widest text-gray-400">Total Payable</span>
            <span v-if="cartStore.appliedPromoCode" class="text-[9px] font-black text-green-600 uppercase">Promo Applied</span>
          </div>
          <span class="text-3xl font-black text-gray-900 italic tracking-tighter">{{ cartStore.formattedTotalPrice }}</span>
        </div>
        
        <button 
          @click="nextToPayment" 
          :disabled="isSubmitting" 
          class="w-full bg-gray-900 py-5 rounded-[1.5rem] font-black uppercase tracking-[0.2em] text-sm text-white shadow-2xl shadow-gray-900/20 active:scale-95 transition-all flex items-center justify-center gap-3 hover:bg-orange-600"
        >
          <span v-if="isSubmitting" class="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full"></span>
          {{ cartStore.totalPrice === 0 ? 'Confirm Order' : 'Proceed to Payment' }}
        </button>
      </div>
    </div>

    <!-- Step 2: Survey (Conditional for Newcomers) -->
    <div v-else-if="checkoutStep === 'survey'" class="flex flex-col h-full animate-in fade-in slide-in-from-right-4 duration-300">
      <div class="flex-1 space-y-6">
        <div class="border-b border-gray-100 pb-4">
           <h3 class="text-xl font-black uppercase italic tracking-tighter text-gray-900">New Here?</h3>
           <p class="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">Tell us a bit about yourself</p>
        </div>

        <div class="space-y-4">
          <!-- Newcomer Phone -->
          <div>
            <div class="flex items-center justify-between mb-2 ml-1">
              <label class="block text-[10px] font-black text-gray-500 uppercase tracking-widest">Newcomer Phone Number</label>
              <button 
                @click="toggleSameAsOrder" 
                type="button"
                class="text-[8px] font-black uppercase tracking-widest px-3 py-1.5 rounded-full border transition-all flex items-center gap-1.5 active:scale-95 shadow-sm shadow-black/5"
                :class="survey.useNewcomerPhoneAsPrimary 
                  ? 'bg-orange-600 border-orange-600 text-white ring-2 ring-orange-100' 
                  : 'bg-white border-gray-200 text-gray-400 hover:border-gray-300 hover:bg-gray-50'"
              >
                <div class="w-2 h-2 rounded-full flex items-center justify-center border border-current">
                  <span v-if="survey.useNewcomerPhoneAsPrimary" class="text-[6px]">✓</span>
                </div>
                Same as contact info
              </button>
            </div>
            <input 
              v-model="survey.newcomerPhone" 
              :disabled="survey.useNewcomerPhoneAsPrimary"
              type="tel" 
              class="w-full bg-gray-50 border border-gray-100 rounded-2xl px-5 py-4 text-sm font-bold text-gray-900 focus:ring-2 focus:ring-orange-600 outline-none transition-all disabled:opacity-50" 
              :placeholder="survey.useNewcomerPhoneAsPrimary ? details.phone : '012-3456789'"
            />
          </div>

          <!-- Invited By -->
          <div>
            <label class="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2 ml-1">Invited By? (Optional)</label>
            <input 
              v-model="survey.invitedBy" 
              type="text" 
              class="w-full bg-gray-50 border border-gray-100 rounded-2xl px-5 py-4 text-sm font-bold text-gray-900 focus:ring-2 focus:ring-orange-600 outline-none transition-all" 
              placeholder="Friend's Name"
            />
          </div>

          <!-- Questions -->
          <div class="space-y-4">
            <div @click="survey.lookingForChurch = !survey.lookingForChurch" class="flex items-center justify-between p-4 bg-gray-50 rounded-2xl border border-gray-100 cursor-pointer transition-all hover:bg-gray-100" :class="{'ring-2 ring-orange-600 bg-orange-50': survey.lookingForChurch}">
              <span class="text-[11px] font-black uppercase tracking-tight text-gray-700">Looking for a church?</span>
              <div class="h-6 w-12 rounded-full relative transition-all" :class="survey.lookingForChurch ? 'bg-orange-600' : 'bg-gray-200 dark:bg-gray-800'">
                <div class="absolute top-1 left-1 h-4 w-4 bg-white rounded-full transition-all" :class="{'translate-x-6': survey.lookingForChurch}"></div>
              </div>
            </div>

            <div @click="survey.knowMoreAboutJesus = !survey.knowMoreAboutJesus" class="flex items-center justify-between p-4 bg-gray-50 rounded-2xl border border-gray-100 cursor-pointer transition-all hover:bg-gray-100" :class="{'ring-2 ring-orange-600 bg-orange-50': survey.knowMoreAboutJesus}">
              <span class="text-[11px] font-black uppercase tracking-tight text-gray-700">Interested to know more about Jesus?</span>
              <div class="h-6 w-12 rounded-full relative transition-all" :class="survey.knowMoreAboutJesus ? 'bg-orange-600' : 'bg-gray-200 dark:bg-gray-800'">
                <div class="absolute top-1 left-1 h-4 w-4 bg-white rounded-full transition-all" :class="{'translate-x-6': survey.knowMoreAboutJesus}"></div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div class="mt-8 pt-6 border-t border-gray-100">
        <button 
          @click="completeCheckout" 
          :disabled="isSubmitting" 
          class="w-full bg-gray-900 py-5 rounded-[1.5rem] font-black uppercase tracking-[0.2em] text-sm text-white shadow-2xl shadow-gray-900/20 active:scale-95 transition-all flex items-center justify-center gap-3 hover:bg-orange-600"
        >
          <span v-if="isSubmitting" class="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full"></span>
          Confirm Order
        </button>
        <button @click="checkoutStep = 'details'" class="w-full text-[11px] font-black uppercase tracking-[0.2em] text-gray-400 py-4 text-center hover:text-gray-900 transition-colors">
          &larr; Back to details
        </button>
      </div>
    </div>

    <!-- Step 3: Payment -->
    <div v-else class="flex flex-col h-full animate-in fade-in slide-in-from-right-4 duration-300">
      <div class="flex-1 space-y-6">
        <div class="border-b border-gray-100 pb-3">
           <h3 class="text-xl font-black uppercase italic tracking-tighter text-gray-900">Payment</h3>
           <p class="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">Verify your transaction via TNG</p>
        </div>

        <div class="bg-blue-50 p-6 rounded-[2.5rem] border border-blue-100 relative overflow-hidden text-center">
          <div class="relative z-10 flex flex-col items-center py-2">
            <div class="h-16 w-16 bg-white rounded-2xl flex items-center justify-center shadow-sm border border-blue-50 mb-4">
              <span class="text-3xl">💳</span>
            </div>
            <p class="text-[10px] font-black text-blue-400 uppercase tracking-[0.2em] mb-1">Enter this amount in App</p>
            <p class="text-5xl font-black text-gray-900 tracking-tighter italic">{{ cartStore.formattedTotalPrice }}</p>
            <p class="text-[10px] text-blue-700 font-bold uppercase tracking-tight mt-4 italic opacity-80">* Manual amount entry required</p>
          </div>
          <div class="absolute -bottom-4 -right-4 opacity-5 italic font-black text-8xl pointer-events-none">TNG</div>
        </div>
      </div>

      <div class="mt-8 space-y-4">
        <button 
          @click="goToTNG" 
          class="w-full bg-[#005ba1] text-white py-5 rounded-[1.5rem] font-black uppercase tracking-[0.15em] text-sm shadow-xl shadow-blue-900/10 flex items-center justify-center gap-3 transition-all active:scale-95"
        >
          <span>Open TNG App</span>
          <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
        </button>

        <button 
          v-if="hasRedirected" 
          @click="completeCheckout" 
          :disabled="isSubmitting" 
          class="w-full bg-green-600 text-white py-5 rounded-[1.5rem] font-black uppercase tracking-[0.15em] text-sm shadow-xl shadow-green-900/10 transition-all hover:bg-green-700 animate-in zoom-in-95 flex items-center justify-center gap-3"
        >
          <span v-if="isSubmitting" class="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full"></span>
          <span>{{ isSubmitting ? 'Verifying...' : '✅ I have made payment' }}</span>
        </button>
        
        <button @click="checkoutStep = 'details'" class="w-full text-[11px] font-black uppercase tracking-[0.2em] text-gray-400 py-2 text-center hover:text-gray-900 transition-colors">
          &larr; Back to details
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
input { -webkit-appearance: none; appearance: none; }
input::-webkit-outer-spin-button, input::-webkit-inner-spin-button { -webkit-appearance: none; margin: 0; }
</style>
