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
const statusSteps: OrderStatus[] = ['pending', 'preparing', 'ready', 'completed']

/**
 * Helper to determine the visual progress of the order.
 */
const currentStepIndex = computed(() => {
  if (!order.value) return 0
  return statusSteps.indexOf(order.value.status)
})

/**
 * Fetch initial order details.
 */
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

/**
 * Real-time subscription setup.
 * We listen specifically for UPDATE events on the 'orders' table
 * filtered to our specific order ID.
 */
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
        // Update the local reactive order state with the new status
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

/**
 * CRITICAL: Clean up the subscription when the user leaves the page.
 * This prevents memory leaks and stale listeners.
 */
onUnmounted(() => {
  if (statusChannel) {
    supabase.removeChannel(statusChannel)
  }
})
</script>

<template>
  <div class="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-6">
    <div v-if="isLoading" class="flex flex-col items-center">
      <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600 mb-4"></div>
      <p class="text-gray-500 font-medium">Loading your order status...</p>
    </div>

    <div v-else-if="error" class="max-w-md w-full text-center">
      <div class="bg-white p-8 rounded-3xl shadow-sm border border-gray-100">
        <h1 class="text-2xl font-bold text-gray-900 mb-2">Oops!</h1>
        <p class="text-gray-500 mb-6">{{ error }}</p>
        <NuxtLink to="/" class="block w-full bg-orange-600 text-white py-3 rounded-xl font-bold hover:bg-orange-700 transition-all">
          Return to Menu
        </NuxtLink>
      </div>
    </div>

    <div v-else-if="order" class="max-w-2xl w-full">
      <div class="bg-white p-8 rounded-3xl shadow-xl shadow-gray-200/50 border border-gray-100 text-center">
        <!-- Success Icon -->
        <div class="inline-flex items-center justify-center w-20 h-20 bg-green-100 text-green-600 rounded-full mb-6">
          <svg xmlns="http://www.w3.org/2000/svg" class="h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
          </svg>
        </div>

        <h1 class="text-3xl font-black text-gray-900 mb-2">Order Confirmed!</h1>
        <p class="text-gray-500 mb-8">Thanks, <span class="font-bold text-gray-900">{{ order.customer_name }}</span>! We've received your order.</p>

        <!-- Status Tracker -->
        <div class="relative mb-12">
          <div class="absolute top-5 left-0 w-full h-1 bg-gray-100"></div>
          <div 
            class="absolute top-5 left-0 h-1 bg-orange-600 transition-all duration-1000"
            :style="{ width: `${(currentStepIndex / (statusSteps.length - 1)) * 100}%` }"
          ></div>
          
          <div class="relative flex justify-between">
            <div v-for="(step, index) in statusSteps" :key="step" class="flex flex-col items-center">
              <div 
                class="w-11 h-11 rounded-full flex items-center justify-center border-4 transition-all duration-500"
                :class="[
                  index <= currentStepIndex 
                    ? 'bg-orange-600 border-white shadow-lg text-white scale-110' 
                    : 'bg-white border-gray-100 text-gray-300'
                ]"
              >
                <span class="text-xs font-black uppercase">{{ index + 1 }}</span>
              </div>
              <span 
                class="mt-3 text-xs font-bold uppercase tracking-widest"
                :class="index <= currentStepIndex ? 'text-orange-600' : 'text-gray-400'"
              >
                {{ step }}
              </span>
            </div>
          </div>
        </div>

        <!-- Dynamic Message -->
        <div class="bg-orange-50 p-6 rounded-2xl border border-orange-100 mb-8">
          <p v-if="order.status === 'pending'" class="text-orange-800 font-medium">
            Waiting for a barista to accept your order...
          </p>
          <p v-else-if="order.status === 'preparing'" class="text-orange-800 font-medium animate-pulse">
            ☕ Your order is currently being prepared!
          </p>
          <p v-else-if="order.status === 'ready'" class="text-green-800 font-bold">
            🎉 Your order is READY for pickup!
          </p>
          <p v-else class="text-gray-600 font-medium">
            Order completed. Enjoy your coffee!
          </p>
        </div>

        <div class="flex flex-col gap-3">
          <NuxtLink to="/" class="text-gray-500 font-bold hover:text-gray-700 transition-colors">
            Order something else
          </NuxtLink>
          <p class="text-[10px] text-gray-300 uppercase tracking-tighter">Order ID: {{ order.id }}</p>
        </div>
      </div>
    </div>
  </div>
</template>
