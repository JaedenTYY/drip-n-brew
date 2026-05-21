<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useProducts } from '~/composables/useProducts'
import { useOrdersStore } from '~/stores/orders'
import { useSupabase } from '~/composables/useSupabase'
import type { Order, Product } from '~/types'

const props = defineProps<{ show: boolean }>()
const emit = defineEmits<{ (e: 'close'): void }>()

const supabase = useSupabase()
const ordersStore = useOrdersStore()
const { products, categories } = useProducts()

const customerName = ref('')
const customerPhone = ref('')
const customerEmail = ref('')
const orderType = ref<'Dine In' | 'Takeaway' | 'BYO Flask'>('Takeaway')
const cartItems = ref<any[]>([])

const promoCode = ref('')
const promoDiscount = ref(0)
const isVerifyingPromo = ref(false)

const selectedCategory = ref('')
const searchQuery = ref('')
const isSaving = ref(false)

watch(() => props.show, (isShown) => {
  if (isShown) {
    customerName.value = ''
    customerPhone.value = ''
    customerEmail.value = ''
    orderType.value = 'Takeaway'
    cartItems.value = []
    promoCode.value = ''
    promoDiscount.value = 0
    selectedCategory.value = ''
    searchQuery.value = ''
  }
})

const verifyPromo = async (silent = false) => {
  if (!promoCode.value) {
    promoDiscount.value = 0
    return
  }
  
  if (!silent) isVerifyingPromo.value = true
  try {
    const { data, error } = await supabase
      .from('promo_codes')
      .select('discount_value, is_active')
      .eq('code', promoCode.value.toUpperCase())
      .eq('is_active', true)
      .single()

    if (error || !data) {
      if (!silent) alert('Invalid or inactive promo code')
      promoDiscount.value = 0
    } else {
      promoDiscount.value = (data as any).discount_value
    }
  } catch (err) {
    console.error('Promo verification error:', err)
  } finally {
    isVerifyingPromo.value = false
  }
}

const filteredProducts = computed(() => {
  let list = products.value || []
  if (selectedCategory.value) list = list.filter(p => p.categories?.includes(selectedCategory.value))
  if (searchQuery.value) {
    const q = searchQuery.value.toLowerCase()
    list = list.filter(p => p.name.toLowerCase().includes(q))
  }
  return list
})

const addToCart = (product: Product) => {
  const existing = cartItems.value.find(item => 
    item.product_id === product.id && 
    item.customizations?.temperature === (product.allowed_temperatures?.[0] || 'Hot')
  )
  if (existing) {
    existing.quantity++
  } else {
    cartItems.value.push({
      product_id: product.id,
      name: product.name,
      quantity: 1,
      unit_price: product.price,
      customizations: {
        temperature: product.allowed_temperatures?.[0] || 'Hot',
        service_type: orderType.value
      }
    })
  }
}

const updateQuantity = (index: number, delta: number) => {
  cartItems.value[index].quantity += delta
  if (cartItems.value[index].quantity <= 0) cartItems.value.splice(index, 1)
}

const subtotal = computed(() => cartItems.value.reduce((acc, item) => acc + (item.unit_price * item.quantity), 0))

const discountAmount = computed(() => {
  return (subtotal.value * (promoDiscount.value / 100))
})

const totalPrice = computed(() => {
  const byoDiscount = orderType.value === 'BYO Flask' ? 0.5 : 0
  return Math.max(0, subtotal.value - discountAmount.value - byoDiscount)
})

const createOrder = async () => {
  if (!customerName.value || cartItems.value.length === 0) {
    alert('Name and items required')
    return
  }
  isSaving.value = true
  const items = cartItems.value.map(item => ({
    ...item,
    customizations: { ...item.customizations, service_type: orderType.value }
  }))
  const orderData = {
    customer_name: customerName.value,
    phone: customerPhone.value || '',
    email: customerEmail.value || '',
    order_type: orderType.value,
    promo_code: promoCode.value || null,
    total_price: totalPrice.value,
    status: 'pending'
  }
  const result = await ordersStore.createOrder(orderData, items)
  if (result.success) emit('close')
  else alert('Error: ' + result.error)
  isSaving.value = false
}

const getProductAllowedTemps = (productId: string) => {
  const p = products.value?.find(p => p.id === productId)
  return p?.allowed_temperatures || ['Hot', 'Cold']
}
</script>

<template>
  <Teleport to="body">
    <Transition enter-active-class="transition duration-300 ease-out" enter-from-class="opacity-0 scale-95" enter-to-class="opacity-100 scale-100" leave-active-class="transition duration-200 ease-in" leave-from-class="opacity-100 scale-100" leave-to-class="opacity-0 scale-95">
      <div v-if="show" class="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 bg-black/60 backdrop-blur-sm">
        <div class="bg-white dark:bg-gray-900 w-full max-w-6xl h-[90vh] rounded-[2.5rem] shadow-2xl border border-gray-100 dark:border-gray-800 flex flex-col overflow-hidden">
          <div class="px-8 py-6 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between flex-shrink-0">
            <div>
              <h2 class="text-2xl font-black uppercase italic tracking-tighter text-gray-900 dark:text-white leading-none">New Manual Order</h2>
              <p class="text-[9px] font-black text-orange-600 uppercase tracking-widest mt-1">POS Direct Entry</p>
            </div>
            <button @click="emit('close')" class="p-3 rounded-2xl hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors text-gray-400">
              <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          </div>
          <div class="flex-1 flex overflow-hidden">
            <div class="flex-1 flex flex-col border-r border-gray-100 dark:border-gray-800 bg-gray-50/30 dark:bg-black/20">
              <div class="p-6 space-y-4 flex-shrink-0">
                <div class="relative">
                  <input v-model="searchQuery" type="text" placeholder="Search Products..." class="w-full bg-white dark:bg-gray-800 border-none rounded-2xl px-12 py-4 text-sm font-bold shadow-sm focus:ring-2 focus:ring-orange-600 transition-all" />
                  <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                </div>
                <div class="flex gap-2 overflow-x-auto pb-2 custom-scrollbar">
                  <button @click="selectedCategory = ''" :class="['px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap', selectedCategory === '' ? 'bg-orange-600 text-white shadow-lg shadow-orange-900/20' : 'bg-white dark:bg-gray-800 text-gray-400 hover:text-gray-600']">All Items</button>
                  <button v-for="cat in categories" :key="cat" @click="selectedCategory = cat" :class="['px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap', selectedCategory === cat ? 'bg-orange-600 text-white shadow-lg shadow-orange-900/20' : 'bg-white dark:bg-gray-800 text-gray-400 hover:text-gray-600']">{{ cat }}</button>
                </div>
              </div>
              <div class="flex-1 overflow-y-auto p-6 pt-0 custom-scrollbar">
                <div class="grid grid-cols-2 lg:grid-cols-3 gap-4">
                  <button v-for="product in filteredProducts" :key="product.id" @click="addToCart(product)" class="bg-white dark:bg-gray-800 p-4 rounded-3xl border border-gray-100 dark:border-gray-700 text-left hover:border-orange-600 hover:shadow-xl transition-all group active:scale-95">
                    <div class="flex flex-col h-full">
                      <div class="flex-1">
                        <h4 class="text-sm font-black uppercase italic tracking-tighter text-gray-900 dark:text-white group-hover:text-orange-600 transition-colors leading-tight mb-1">{{ product.name }}</h4>
                        <p class="text-[9px] font-black text-gray-400 uppercase tracking-widest">{{ product.categories?.join(' • ') }}</p>
                      </div>
                      <div class="mt-4 flex items-center justify-between">
                        <span class="text-xs font-black text-orange-600">RM{{ product.price.toFixed(2) }}</span>
                        <span class="w-8 h-8 rounded-xl bg-gray-50 dark:bg-gray-900 flex items-center justify-center text-orange-600 font-bold group-hover:bg-orange-600 group-hover:text-white transition-all">+</span>
                      </div>
                    </div>
                  </button>
                </div>
              </div>
            </div>
            <div class="w-full max-w-sm flex flex-col bg-white dark:bg-gray-900">
              <div class="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
                <div class="space-y-4">
                  <h3 class="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-1">Customer Info</h3>
                  <div class="space-y-3">
                    <input v-model="customerName" type="text" placeholder="Full Name *" class="w-full bg-gray-50 dark:bg-gray-800 border-none rounded-2xl px-5 py-3.5 text-xs font-bold focus:ring-2 focus:ring-orange-600 transition-all" />
                    <input v-model="customerPhone" type="text" placeholder="Phone Number (Optional)" class="w-full bg-gray-50 dark:bg-gray-800 border-none rounded-2xl px-5 py-3.5 text-xs font-bold focus:ring-2 focus:ring-orange-600 transition-all" />
                    <input v-model="customerEmail" type="email" placeholder="Email Address (Optional)" class="w-full bg-gray-50 dark:bg-gray-800 border-none rounded-2xl px-5 py-3.5 text-xs font-bold focus:ring-2 focus:ring-orange-600 transition-all" />
                  </div>
                </div>
                <div class="space-y-3">
                  <h3 class="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-1">Service Method</h3>
                  <div class="grid grid-cols-3 gap-2">
                    <button v-for="st in (['Dine In', 'Takeaway', 'BYO Flask'] as const)" :key="st" @click="orderType = st" :class="['py-3 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all border-2', orderType === st ? (st === 'BYO Flask' ? 'bg-green-600 border-green-600 text-white shadow-lg shadow-green-900/20' : 'bg-gray-900 border-gray-900 text-white') : 'bg-white dark:bg-gray-800 border-gray-100 dark:border-gray-700 text-gray-400']">{{ st }}</button>
                  </div>
                </div>
                <div class="space-y-3">
                  <div class="flex items-center justify-between">
                    <h3 class="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-1">Cart ({{ cartItems.length }})</h3>
                    <button @click="cartItems = []" v-if="cartItems.length > 0" class="text-[9px] font-black text-red-500 uppercase tracking-widest">Clear</button>
                  </div>
                  <div class="space-y-2">
                    <div v-for="(item, index) in cartItems" :key="index" class="bg-gray-50 dark:bg-gray-800/50 p-4 rounded-2xl border border-gray-100 dark:border-gray-800">
                      <div class="flex justify-between items-start mb-2">
                        <div>
                          <h5 class="text-xs font-black uppercase italic tracking-tighter text-gray-900 dark:text-white leading-tight">{{ item.name }}</h5>
                          <div class="flex gap-2 mt-1">
                            <span v-if="getProductAllowedTemps(item.product_id).length > 1" class="text-[8px] font-black text-orange-600 uppercase">{{ item.customizations?.temperature }}</span>
                            <span class="text-[8px] font-black text-gray-400 uppercase">RM{{ (item.unit_price * item.quantity).toFixed(2) }}</span>
                          </div>
                        </div>
                        <div class="flex items-center gap-3">
                          <button @click="updateQuantity(index, -1)" class="w-6 h-6 rounded-lg bg-white dark:bg-gray-900 flex items-center justify-center text-gray-400 hover:text-red-500 transition-colors shadow-sm">-</button>
                          <span class="text-xs font-black w-4 text-center">{{ item.quantity }}</span>
                          <button @click="updateQuantity(index, 1)" class="w-6 h-6 rounded-lg bg-white dark:bg-gray-900 flex items-center justify-center text-gray-400 hover:text-orange-600 transition-colors shadow-sm">+</button>
                        </div>
                      </div>
                      <div v-if="getProductAllowedTemps(item.product_id).length > 1" class="flex gap-1 mt-3 p-1 bg-white dark:bg-gray-900 rounded-lg border border-gray-100 dark:border-gray-700 w-fit">
                        <button v-for="temp in getProductAllowedTemps(item.product_id)" :key="temp" @click="item.customizations.temperature = temp" :class="['px-2 py-1 rounded-md text-[8px] font-black uppercase tracking-widest transition-all', item.customizations?.temperature === temp ? 'bg-orange-600 text-white' : 'text-gray-400']">{{ temp }}</button>
                      </div>
                    </div>
                    <div v-if="cartItems.length === 0" class="py-8 text-center"><p class="text-[10px] font-black text-gray-400 uppercase tracking-widest">Cart is empty</p></div>
                  </div>
                </div>

                <!-- Promo Code Section -->
                <div class="space-y-2 pt-2">
                  <label class="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-1">Promo Code</label>
                  <div class="flex gap-2">
                    <input v-model="promoCode" type="text" placeholder="ENTER CODE" class="flex-1 bg-gray-50 dark:bg-gray-800 border-none rounded-2xl px-5 py-4 text-[10px] font-black tracking-widest focus:ring-2 focus:ring-orange-600 transition-all uppercase" />
                    <button @click="verifyPromo()" :disabled="isVerifyingPromo" class="px-6 rounded-2xl bg-gray-900 dark:bg-black text-white text-[10px] font-black uppercase tracking-widest hover:bg-orange-600 transition-all">
                      {{ isVerifyingPromo ? '...' : 'Apply' }}
                    </button>
                  </div>
                  <p v-if="promoDiscount > 0" class="text-[9px] font-black text-green-600 uppercase tracking-widest ml-1">Active: {{ promoDiscount }}% Discount Applied</p>
                </div>
              </div>

              <div class="p-6 border-t border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-950/20 space-y-4">
                <div class="space-y-2">
                  <div class="flex justify-between text-[10px] font-black uppercase tracking-widest text-gray-400"><span>Subtotal</span><span class="text-gray-900 dark:text-white">RM{{ subtotal.toFixed(2) }}</span></div>
                  <div v-if="promoDiscount > 0" class="flex justify-between text-[10px] font-black uppercase tracking-widest text-green-600"><span>Promo Discount ({{ promoDiscount }}%)</span><span>-RM{{ discountAmount.toFixed(2) }}</span></div>
                  <div v-if="orderType === 'BYO Flask'" class="flex justify-between text-[10px] font-black uppercase tracking-widest text-green-600"><span>BYO Flask Discount</span><span>-RM0.50</span></div>
                  <div class="pt-2 border-t border-gray-200 dark:border-gray-700 flex justify-between items-center"><span class="text-xs font-black uppercase tracking-widest text-gray-900 dark:text-white">Total</span><span class="text-2xl font-black italic text-orange-600">RM{{ totalPrice.toFixed(2) }}</span></div>
                </div>
                <button @click="createOrder" :disabled="isSaving || cartItems.length === 0 || !customerName" class="w-full py-5 rounded-3xl bg-orange-600 text-white font-black uppercase tracking-widest text-[10px] shadow-xl shadow-orange-900/30 hover:bg-orange-700 active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed">{{ isSaving ? 'Placing Order...' : 'Confirm & Place Order' }}</button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.custom-scrollbar::-webkit-scrollbar { width: 5px; }
.custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
.custom-scrollbar::-webkit-scrollbar-thumb { @apply bg-gray-200 dark:bg-gray-800 rounded-full; }
</style>