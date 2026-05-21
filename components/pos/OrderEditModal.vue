<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useProducts } from '~/composables/useProducts'
import { useOrdersStore } from '~/stores/orders'
import { useSupabase } from '~/composables/useSupabase'
import type { Order, OrderItem, Product } from '~/types'

const props = defineProps<{
  order: Order | null
  show: boolean
}>()

const emit = defineEmits<{
  (e: 'close'): void
}>()

const supabase = useSupabase()
const ordersStore = useOrdersStore()
const { products } = useProducts()

const editedOrder = ref<Partial<Order>>({})
const editedItems = ref<any[]>([])
const promoCode = ref('')
const isVerifyingPromo = ref(false)
const promoDiscount = ref(0)
const isSaving = ref(false)
const isDeleting = ref(false)

// Sync with props when opened
watch(() => props.show, async (isShown) => {
  if (isShown && props.order) {
    editedOrder.value = { ...props.order }
    // Clone items
    editedItems.value = (props.order.items || []).map(item => ({
      id: item.id,
      product_id: item.product_id,
      quantity: item.quantity,
      unit_price: item.unit_price,
      customizations: { ...item.customizations }
    }))
    promoCode.value = props.order.promo_code || ''
    if (promoCode.value) {
      await verifyPromo(true)
    } else {
      promoDiscount.value = 0
    }
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
      .eq('code', promoCode.value)
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

const updateItemProduct = (productId: string, index: number) => {
  const product = products.value?.find(p => p.id === productId)
  if (product) {
    editedItems.value[index].product_id = product.id
    editedItems.value[index].unit_price = product.price
    
    // Ensure customizations object exists
    if (!editedItems.value[index].customizations) {
      editedItems.value[index].customizations = {}
    }

    // Reset temperature to first allowed option for the new product
    const allowed = product.allowed_temperatures || ['Hot', 'Cold']
    editedItems.value[index].customizations.temperature = allowed[0]
  }
}

const addItem = () => {
  // Use the first available product as a template
  const defaultProduct = products.value?.[0]
  if (!defaultProduct) return

  editedItems.value.push({
    product_id: defaultProduct.id,
    quantity: 1,
    unit_price: defaultProduct.price,
    customizations: {
      temperature: defaultProduct.allowed_temperatures?.[0] || 'Hot',
      service_type: 'Dine In'
    }
  })
}

const removeItem = (index: number) => {
  editedItems.value.splice(index, 1)
}

const subtotal = computed(() => {
  return editedItems.value.reduce((acc, item) => acc + (item.unit_price * item.quantity), 0)
})

const discountAmount = computed(() => {
  return (subtotal.value * (promoDiscount.value / 100))
})

const totalPrice = computed(() => {
  return Math.max(0, subtotal.value - discountAmount.value)
})

const saveOrder = async () => {
  if (!props.order) return
  isSaving.value = true
  
  const updates = {
    customer_name: editedOrder.value.customer_name,
    phone: editedOrder.value.phone || '',
    email: editedOrder.value.email || '',
    promo_code: promoCode.value || null,
    total_price: totalPrice.value
  } as any

  const result = await ordersStore.updateOrder(props.order.id, updates, editedItems.value)
  
  if (result.success) {
    emit('close')
  } else {
    alert('Failed to save order: ' + result.error)
  }
  isSaving.value = false
}

const confirmDeleteOrder = async () => {
  if (!props.order) return
  if (confirm(`Are you sure you want to delete Order #${props.order.order_number || props.order.id.slice(0, 4)}? This cannot be undone.`)) {
    isDeleting.value = true
    try {
      await ordersStore.deleteOrder(props.order.id)
      emit('close')
    } catch (err) {
      alert('Failed to delete order')
    } finally {
      isDeleting.value = false
    }
  }
}

const getProductAllowedTemps = (productId: string) => {
  const p = products.value?.find(p => p.id === productId)
  return p?.allowed_temperatures || ['Hot', 'Cold']
}
</script>

<template>
  <Transition
    enter-active-class="transition duration-300 ease-out"
    enter-from-class="opacity-0 scale-95"
    enter-to-class="opacity-100 scale-100"
    leave-active-class="transition duration-200 ease-in"
    leave-from-class="opacity-100 scale-100"
    leave-to-class="opacity-0 scale-95"
  >
    <div v-if="show" class="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 bg-black/60 backdrop-blur-sm">
      <div class="bg-white dark:bg-gray-900 w-full max-w-2xl max-h-[90vh] rounded-[2.5rem] shadow-2xl border border-gray-100 dark:border-gray-800 flex flex-col overflow-hidden">
        
        <!-- Header -->
        <div class="px-8 py-6 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
          <div>
            <div class="flex items-center gap-2 mb-1">
              <span class="text-[10px] font-black bg-orange-600 text-white px-2 py-0.5 rounded-md uppercase tracking-tighter">
                #{{ order?.order_number || order?.id.slice(0, 4) }}
              </span>
              <h2 class="text-2xl font-black uppercase italic tracking-tighter text-gray-900 dark:text-white leading-none">Edit Order</h2>
            </div>
            <p class="text-[9px] font-black text-orange-600 uppercase tracking-widest mt-1">Refining Customer Intent</p>
          </div>
          <button @click="emit('close')" class="p-3 rounded-2xl hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors text-gray-400">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <!-- Body -->
        <div class="flex-1 overflow-y-auto p-8 space-y-8 custom-scrollbar">
          
          <!-- Customer Info -->
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div class="space-y-2">
              <label class="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-1">Customer Name</label>
              <input v-model="editedOrder.customer_name" type="text" class="w-full bg-gray-50 dark:bg-gray-800 border-none rounded-2xl px-5 py-4 text-sm font-bold focus:ring-2 focus:ring-orange-600 transition-all" />
            </div>
            <div class="space-y-2">
              <label class="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-1">Phone</label>
              <input v-model="editedOrder.phone" type="text" class="w-full bg-gray-50 dark:bg-gray-800 border-none rounded-2xl px-5 py-4 text-sm font-bold focus:ring-2 focus:ring-orange-600 transition-all" />
            </div>
          </div>

          <!-- Items -->
          <div class="space-y-4">
            <div class="flex items-center justify-between">
              <h3 class="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-1">Order Items</h3>
              <button @click="addItem" class="text-[9px] font-black uppercase tracking-widest text-orange-600 hover:text-orange-700">+ Add Item</button>
            </div>
            
            <div class="space-y-3">
              <div v-for="(item, index) in editedItems" :key="index" class="flex flex-col sm:flex-row gap-3 bg-gray-50 dark:bg-gray-800/50 p-4 rounded-3xl border border-gray-100 dark:border-gray-800 relative group">
                
                <div class="flex-1 space-y-3">
                  <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <!-- Product Select -->
                    <div class="sm:col-span-2">
                      <select 
                        :value="item.product_id" 
                        @change="e => updateItemProduct((e.target as HTMLSelectElement).value, index)" 
                        class="w-full bg-white dark:bg-gray-900 rounded-xl px-4 py-3 text-xs font-bold border border-gray-100 dark:border-gray-700 outline-none focus:ring-2 focus:ring-orange-600"
                      >
                        <option v-for="p in products" :key="p.id" :value="p.id">{{ p.name }} (RM{{ p.price.toFixed(2) }})</option>
                      </select>
                    </div>
                    <!-- Quantity -->
                    <input v-model.number="item.quantity" type="number" min="1" class="w-full bg-white dark:bg-gray-900 rounded-xl px-4 py-3 text-xs font-bold border border-gray-100 dark:border-gray-700 outline-none focus:ring-2 focus:ring-orange-600" placeholder="Qty" />
                  </div>

                  <div class="flex flex-wrap gap-2">
                    <!-- Temperature -->
                    <div v-if="getProductAllowedTemps(item.product_id).length > 0" class="flex bg-white dark:bg-gray-900 p-1 rounded-lg border border-gray-100 dark:border-gray-700">
                      <button 
                        v-for="temp in getProductAllowedTemps(item.product_id)"
                        :key="temp"
                        @click="item.customizations.temperature = temp"
                        class="px-3 py-1 rounded-md text-[9px] font-black uppercase tracking-widest transition-all"
                        :class="item.customizations.temperature === temp ? 'bg-orange-600 text-white shadow-sm' : 'text-gray-400 hover:text-gray-600'"
                      >{{ temp }}</button>
                    </div>
                    
                    <!-- Service Type -->
                    <div class="flex bg-white dark:bg-gray-900 p-1 rounded-lg border border-gray-100 dark:border-gray-700">
                      <button 
                        v-for="st in ['Dine In', 'Takeaway', 'BYO Flask']"
                        :key="st"
                        @click="item.customizations.service_type = st"
                        class="px-3 py-1 rounded-md text-[9px] font-black uppercase tracking-widest transition-all"
                        :class="item.customizations.service_type === st ? 'bg-gray-900 dark:bg-gray-700 text-white shadow-sm' : 'text-gray-400 hover:text-gray-600'"
                      >{{ st }}</button>
                    </div>
                  </div>
                </div>

                <button @click="removeItem(index)" class="self-center p-2 text-gray-300 hover:text-red-500 transition-colors">
                  <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>
            </div>
          </div>

          <!-- Promo Code -->
          <div class="space-y-2">
            <label class="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-1">Promo Code</label>
            <div class="flex gap-2">
              <input v-model="promoCode" type="text" placeholder="ENTER CODE" class="flex-1 bg-gray-50 dark:bg-gray-800 border-none rounded-2xl px-5 py-4 text-sm font-black tracking-widest focus:ring-2 focus:ring-orange-600 transition-all uppercase" />
              <button @click="verifyPromo()" :disabled="isVerifyingPromo" class="px-6 rounded-2xl bg-gray-900 dark:bg-black text-white text-[10px] font-black uppercase tracking-widest hover:bg-orange-600 transition-all">
                {{ isVerifyingPromo ? '...' : 'Apply' }}
              </button>
            </div>
            <p v-if="promoDiscount > 0" class="text-[9px] font-black text-green-600 uppercase tracking-widest ml-1">Active: {{ promoDiscount }}% Discount Applied</p>
          </div>

          <!-- Totals -->
          <div class="bg-gray-50 dark:bg-gray-800/50 p-6 rounded-[2rem] border border-gray-100 dark:border-gray-800 space-y-3">
             <div class="flex justify-between text-[10px] font-black uppercase tracking-widest text-gray-400">
               <span>Subtotal</span>
               <span class="text-gray-900 dark:text-white">RM{{ subtotal.toFixed(2) }}</span>
             </div>
             <div v-if="discountAmount > 0" class="flex justify-between text-[10px] font-black uppercase tracking-widest text-green-600">
               <span>Promo Discount ({{ promoDiscount }}%)</span>
               <span>-RM{{ discountAmount.toFixed(2) }}</span>
             </div>
             <div class="pt-3 border-t border-gray-200 dark:border-gray-700 flex justify-between items-center">
               <span class="text-xs font-black uppercase tracking-widest text-gray-900 dark:text-white">Final Total</span>
               <span class="text-2xl font-black italic text-orange-600">RM{{ totalPrice.toFixed(2) }}</span>
             </div>
          </div>
        </div>

        <!-- Footer -->
        <div class="px-8 py-6 border-t border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900/50 flex gap-3">
          <button 
            @click="confirmDeleteOrder" 
            :disabled="isSaving || isDeleting"
            class="p-4 rounded-2xl bg-red-50 dark:bg-red-950/20 text-red-500 hover:bg-red-100 dark:hover:bg-red-950/40 transition-all flex items-center justify-center disabled:opacity-50"
            title="Delete Order"
          >
            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
          
          <button @click="emit('close')" class="flex-1 py-4 rounded-2xl font-black uppercase tracking-widest text-[10px] text-gray-400 hover:text-gray-600 transition-all">Discard</button>
          
          <button @click="saveOrder" :disabled="isSaving || isDeleting || editedItems.length === 0" class="flex-[2] py-4 rounded-2xl bg-orange-600 text-white font-black uppercase tracking-widest text-[10px] shadow-xl shadow-orange-900/20 hover:bg-orange-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed">
            {{ isSaving ? 'Committing Changes...' : 'Save & Sync' }}
          </button>
        </div>

      </div>
    </div>
  </Transition>
</template>

<style scoped>
.custom-scrollbar::-webkit-scrollbar {
  width: 5px;
}
.custom-scrollbar::-webkit-scrollbar-track {
  background: transparent;
}
.custom-scrollbar::-webkit-scrollbar-thumb {
  @apply bg-gray-200 dark:bg-gray-800 rounded-full;
}
</style>
