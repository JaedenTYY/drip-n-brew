<script setup lang="ts">
import type { Product, ItemCustomizations } from '~/types'
import MarkdownContent from './MarkdownContent.vue'

const props = defineProps<{
  product: Product | null
}>()

const emit = defineEmits<{
  (e: 'close'): void
  (e: 'confirm', customizations: ItemCustomizations): void
}>()

const customizations = ref<ItemCustomizations>({
  temperature: 'Hot',
  service_type: 'Dine In'
})

const isCoffee = computed(() => {
  return props.product?.category.toLowerCase().includes('coffee') || 
         props.product?.category.toLowerCase().includes('brew')
})

const availableTemperatures = computed(() => {
  if (!props.product) return []
  if (props.product.allowed_temperatures && props.product.allowed_temperatures.length > 0) {
    return props.product.allowed_temperatures
  }
  // Default for coffee products if not specified
  return isCoffee.value ? (['Hot', 'Cold'] as const) : []
})

// Initialize customizations when product changes
watch(() => props.product, (newProduct) => {
  if (newProduct) {
    customizations.value.service_type = 'Dine In'
    if (availableTemperatures.value.length > 0) {
      customizations.value.temperature = availableTemperatures.value[0]
    } else {
      delete customizations.value.temperature
    }
  }
}, { immediate: true })

const confirm = () => {
  emit('confirm', { ...customizations.value })
}
</script>

<template>
  <Teleport to="body">
    <Transition
      enter-active-class="transition duration-300 ease-out"
      enter-from-class="opacity-0"
      enter-to-class="opacity-100"
      leave-active-class="transition duration-200 ease-in"
      leave-from-class="opacity-100"
      leave-to-class="opacity-0"
    >
      <div v-if="product" class="fixed inset-0 z-[100] flex items-center justify-center p-6">
        <div @click="emit('close')" class="absolute inset-0 bg-gray-900/60 backdrop-blur-sm"></div>
        
        <div class="relative w-full max-w-md bg-white rounded-3xl p-8 shadow-2xl animate-in zoom-in-95 duration-300">
          <div class="mb-6">
            <h3 class="text-2xl font-black text-gray-900 uppercase italic tracking-tight">{{ product.name }}</h3>
            <div class="mt-2 text-gray-500 text-sm font-medium">
              <MarkdownContent :content="product.description || 'Customize your drink exactly how you like it.'" />
            </div>
          </div>

          <div class="space-y-8">
            <!-- Temperature Selection (If more than one option) -->
            <div v-if="availableTemperatures.length > 1">
              <label class="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3">Temperature</label>
              <div class="grid grid-cols-2 gap-3">
                <button 
                  v-for="temp in availableTemperatures" 
                  :key="temp"
                  @click="customizations.temperature = temp"
                  :class="[
                    'py-3 rounded-xl font-bold transition-all border-2',
                    customizations.temperature === temp 
                      ? 'bg-orange-600 border-orange-600 text-white shadow-lg shadow-orange-200' 
                      : 'bg-white border-gray-100 text-gray-400 hover:border-gray-200'
                  ]"
                >
                  {{ temp }}
                </button>
              </div>
            </div>

            <!-- Service Type -->
            <div>
              <label class="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3">Service Type</label>
              <div class="grid grid-cols-1 gap-3">
                <button 
                  @click="customizations.service_type = 'Dine In'"
                  :class="[
                    'flex items-center justify-between px-5 py-4 rounded-xl font-bold transition-all border-2 text-left',
                    customizations.service_type === 'Dine In'
                      ? 'bg-gray-900 border-gray-900 text-white' 
                      : 'bg-white border-gray-100 text-gray-400 hover:border-gray-200'
                  ]"
                >
                  <span>🍽 Dine In</span>
                </button>
                <button 
                  @click="customizations.service_type = 'Takeaway'"
                  :class="[
                    'flex items-center justify-between px-5 py-4 rounded-xl font-bold transition-all border-2 text-left',
                    customizations.service_type === 'Takeaway'
                      ? 'bg-gray-900 border-gray-900 text-white' 
                      : 'bg-white border-gray-100 text-gray-400 hover:border-gray-200'
                  ]"
                >
                  <span>🥡 Takeaway</span>
                </button>
                <button 
                  @click="customizations.service_type = 'BYO Flask'"
                  :class="[
                    'flex items-center justify-between px-5 py-4 rounded-xl font-bold transition-all border-2 text-left',
                    customizations.service_type === 'BYO Flask'
                      ? 'bg-green-600 border-green-600 text-white shadow-lg shadow-green-100' 
                      : 'bg-white border-gray-100 text-gray-400 hover:border-gray-200'
                  ]"
                >
                  <div class="flex flex-col">
                    <span>♻️ Bring Your Own Flask</span>
                    <span class="text-[10px] opacity-80 uppercase tracking-tighter">Save $0.50 on this item</span>
                  </div>
                  <div v-if="customizations.service_type === 'BYO Flask'" class="bg-white/20 px-2 py-1 rounded text-[10px]">- $0.50</div>
                </button>
              </div>
            </div>
          </div>

          <div class="mt-10 flex gap-3">
            <button @click="emit('close')" class="flex-1 py-4 text-gray-400 font-bold uppercase tracking-widest text-xs hover:text-gray-900">Cancel</button>
            <button 
              @click="confirm"
              class="flex-[2] bg-orange-600 text-white py-4 rounded-2xl font-black uppercase tracking-widest shadow-lg shadow-orange-200 hover:bg-orange-700 active:scale-[0.98] transition-all"
            >
              Add to Order
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>
