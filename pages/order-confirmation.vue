<script setup lang="ts">
import type { Order, OrderStatus } from '~/types'

useHead({
  title: 'Order Confirmed'
})

const route = useRoute()
const supabase = useSupabase()

const orderId = route.query.id as string
const order = ref<Order | null>(null)
const isLoading = ref(true)
const error = ref<string | null>(null)

/**
 * Status sequence for the visual tracker.
 */
const statusSteps: {key: OrderStatus, label: string, icon: string}[] = [
  { key: 'pending', label: 'Order Received', icon: '📝' },
  { key: 'preparing', label: 'Preparing', icon: '☕' },
  { key: 'ready', label: 'Ready for Pickup', icon: '🛍️' },
  { key: 'completed', label: 'Completed', icon: '✅' }
]

const currentStepIndex = computed(() => {
  if (!order.value) return 0
  return statusSteps.findIndex(s => s.key === order.value!.status)
})

const fetchOrder = async () => {
  try {
    const { data, error: fetchError } = await supabase
      .from('orders')
      .select('*')
      .eq('id', orderId)
      .single()

    if (fetchError) throw fetchError
    order.value = data as Order
  } catch (err: any) {
    error.value = 'Could not find your order details.'
    console.error(err)
  } finally {
    isLoading.value = false
  }
}

let statusChannel: any = null

const subscribeToStatus = () => {
  statusChannel = supabase
    .channel(`order-status-${orderId}`)
    .on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'orders',
        filter: `id=eq.${orderId}`
      },
      (payload) => {
        if (order.value) {
          order.value.status = payload.new.status
        }
      }
    )
    .subscribe()
}

onMounted(async () => {
  if (!orderId) {
    error.value = 'No order ID provided.'
    isLoading.value = false
    return
  }

  await fetchOrder()
  subscribeToStatus()
})

onUnmounted(() => {
  if (statusChannel) {
    supabase.removeChannel(statusChannel)
  }
})
</script>

<template>
  <div class="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4 sm:p-6 transition-colors duration-300">
    <div v-if="isLoading" class="flex flex-col items-center">
      <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600 mb-4"></div>
      <p class="text-gray-500 font-black uppercase tracking-widest text-[10px]">Tracking Order...</p>
    </div>

    <div v-else-if="error" class="max-w-md w-full text-center">
      <div class="bg-white p-8 rounded-[2.5rem] shadow-xl border border-gray-100">
        <h1 class="text-2xl font-black uppercase italic italic tracking-tighter mb-2">Oops!</h1>
        <p class="text-gray-500 mb-8 font-medium">{{ error }}</p>
        <NuxtLink to="/" class="block w-full bg-orange-600 text-white py-4 rounded-2xl font-black uppercase tracking-widest shadow-lg shadow-orange-100 hover:bg-orange-700 transition-all">
          Return to Menu
        </NuxtLink>
      </div>
    </div>

    <div v-else-if="order" class="max-w-xl w-full py-8">
      <div class="bg-white p-8 sm:p-10 rounded-[2.5rem] shadow-2xl shadow-gray-200/50 border border-gray-100 text-center relative overflow-hidden">
        <!-- Success Header -->
        <div class="relative z-10">
          <div class="inline-flex items-center justify-center w-20 h-20 bg-green-50 text-green-600 rounded-3xl mb-6 shadow-sm">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7" />
            </svg>
          </div>

          <h1 class="text-3xl font-black text-gray-900 mb-2 uppercase italic tracking-tighter">Order Confirmed!</h1>
          <p class="text-gray-400 text-xs font-bold uppercase tracking-widest mb-10">
            Thanks, <span class="text-gray-900">{{ order.customer_name }}</span>
          </p>

          <!-- Status Tracker (Modern Vertical for Mobile, Horizontal for Desktop) -->
          <div class="space-y-6 mb-12 max-w-xs mx-auto text-left">
            <div 
              v-for="(step, index) in statusSteps" 
              :key="step.key"
              class="flex items-start gap-4 relative"
            >
              <!-- Line Connector -->
              <div 
                v-if="index < statusSteps.length - 1"
                class="absolute left-[19px] top-10 w-[2px] h-8 bg-gray-100"
              >
                <div 
                  class="w-full bg-orange-600 transition-all duration-1000 origin-top"
                  :style="{ height: index < currentStepIndex ? '100%' : '0%' }"
                ></div>
              </div>

              <!-- Step Dot -->
              <div 
                class="w-10 h-10 rounded-2xl flex items-center justify-center border-2 transition-all duration-500 flex-shrink-0"
                :class="[
                  index <= currentStepIndex 
                    ? 'bg-orange-600 border-orange-600 text-white shadow-lg shadow-orange-100 scale-110' 
                    : 'bg-white border-gray-100 text-gray-300'
                ]"
              >
                <span v-if="index < currentStepIndex" class="text-sm">✓</span>
                <span v-else class="text-xs font-black">{{ index + 1 }}</span>
              </div>

              <!-- Step Label -->
              <div class="pt-1">
                <p 
                  class="text-xs font-black uppercase tracking-widest"
                  :class="index <= currentStepIndex ? 'text-gray-900' : 'text-gray-300'"
                >
                  {{ step.label }}
                </p>
                <p v-if="index === currentStepIndex" class="text-[10px] font-bold text-orange-600 uppercase mt-0.5 animate-pulse">
                  Current Status
                </p>
              </div>
              
              <!-- Emoji Icon -->
              <div class="ml-auto text-xl opacity-20" :class="{'opacity-100': index === currentStepIndex}">
                {{ step.icon }}
              </div>
            </div>
          </div>

          <!-- Final Message -->
          <div class="bg-gray-50 p-6 rounded-3xl border border-gray-100 mb-10">
            <p v-if="order.status === 'pending'" class="text-gray-600 text-xs font-bold uppercase tracking-tight leading-relaxed">
              We've received your request. A barista will start preparing it shortly!
            </p>
            <p v-else-if="order.status === 'preparing'" class="text-orange-600 text-xs font-black uppercase tracking-tight leading-relaxed animate-pulse">
              ☕ Your order is being handcrafted right now.
            </p>
            <p v-else-if="order.status === 'ready'" class="text-green-600 text-xs font-black uppercase tracking-tight leading-relaxed">
              🎉 Ready! Please proceed to the counter for pickup.
            </p>
            <p v-else class="text-gray-500 text-xs font-black uppercase tracking-tight leading-relaxed">
              Order completed. We hope you enjoy your Drip & Brew!
            </p>
          </div>

          <div class="flex flex-col gap-4">
            <NuxtLink to="/" class="text-[10px] font-black text-gray-400 hover:text-orange-600 uppercase tracking-[0.2em] transition-colors">
              ← Order something else
            </NuxtLink>
            <div class="pt-4 border-t border-gray-50">
              <p class="text-[8px] text-gray-300 font-black uppercase tracking-widest">Digital Receipt ID: {{ order.id }}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* Smooth status transitions */
* {
  @apply transition-colors duration-300;
}
</style>
