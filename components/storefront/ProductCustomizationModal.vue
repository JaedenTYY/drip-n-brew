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

// --- Native Swipe-to-Close Logic ---
const dragY = ref(0)
const isDragging = ref(false)
let startY = 0

/**
 * Capture initial touch position.
 */
const handleTouchStart = (e: TouchEvent) => {
  startY = e.touches[0].clientY
  isDragging.value = true
}

/**
 * Track vertical movement. Only allow dragging downwards (positive Y).
 */
const handleTouchMove = (e: TouchEvent) => {
  if (!isDragging.value) return
  const currentY = e.touches[0].clientY
  const deltaY = currentY - startY
  
  if (deltaY > 0) {
    dragY.value = deltaY
  }
}

/**
 * Check if the drag distance exceeds the threshold to close,
 * otherwise snap back to zero.
 */
const handleTouchEnd = () => {
  if (!isDragging.value) return
  isDragging.value = false
  
  // Threshold: if dragged more than 150px, close the modal
  if (dragY.value > 150) {
    emit('close')
  }
  
  // Snap back
  dragY.value = 0
}

const isCoffee = computed(() => {
  return props.product?.categories?.some(cat => 
    cat.toLowerCase().includes('coffee') || cat.toLowerCase().includes('brew')
  ) || false
})

const availableTemperatures = computed(() => {
  if (!props.product) return []
  if (props.product.allowed_temperatures && props.product.allowed_temperatures.length > 0) {
    return props.product.allowed_temperatures
  }
  return isCoffee.value ? (['Hot', 'Cold'] as const) : []
})

watch(() => props.product, (newProduct) => {
  if (newProduct) {
    customizations.value.service_type = 'Dine In'
    if (availableTemperatures.value.length > 0) {
      customizations.value.temperature = availableTemperatures.value[0]
    } else {
      delete customizations.value.temperature
    }
    // Reset drag on new product
    dragY.value = 0
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
      <div v-if="product" class="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-5">
        <!-- Backdrop -->
        <div @click="emit('close')" class="absolute inset-0 bg-gray-950/60 backdrop-blur-sm"></div>
        
        <!-- 
          HCI STANDARDIZED MODAL CONTAINER
          - Fixed Heights: Ensures the UI doesn't jump or resize between different items.
          - Drag Behavior: Applies translateY based on touch tracking for a native feel.
        -->
        <div 
          class="relative w-full max-w-md bg-white rounded-t-2xl sm:rounded-xl shadow-md animate-in slide-in-from-bottom-10 sm:slide-in-from-bottom-0 sm:zoom-in-95 duration-500 overflow-hidden flex flex-col h-[85dvh] sm:h-[680px]"
          :style="{ 
            transform: dragY > 0 ? `translateY(${dragY}px)` : '',
            transition: isDragging ? 'none' : 'transform 0.3s cubic-bezier(0.2, 0.8, 0.2, 1)' 
          }"
        >
          
          <!-- Mobile Pull Handle: captures touch for swipe-to-close -->
          <div 
            @touchstart="handleTouchStart"
            @touchmove="handleTouchMove"
            @touchend="handleTouchEnd"
            class="group w-full py-4 sm:hidden flex-shrink-0 cursor-grab active:cursor-grabbing touch-none"
          >
            <div class="w-12 h-1.5 bg-gray-100 group-active:bg-gray-200 rounded-full mx-auto transition-colors"></div>
          </div>

          <!-- Header Section: Constant Height for Symmetry -->
          <div class="px-6 pt-2 pb-4 sm:pt-6 flex-shrink-0">
            <h3 class="text-2xl sm:text-3xl font-black text-gray-900 uppercase italic tracking-tighter leading-tight line-clamp-2">
              {{ product.name }}
            </h3>
            <p class="text-[9px] font-black text-orange-600 uppercase tracking-[0.3em] mt-1 ml-0.5">
              {{ (product.categories || []).join(' • ') }}
            </p>
          </div>

          <!-- Content Scroll Area: Standardized layout for description and options -->
          <div class="flex-1 overflow-y-auto px-6 custom-scrollbar">
            <!-- Fixed-height Description Box: Prevents UI collapse for short text -->
            <div class="mt-2 text-gray-500 text-xs leading-relaxed bg-gray-50/50 p-4 rounded-lg border border-gray-50 min-h-[60px] sm:min-h-[100px] mb-6">
              <MarkdownContent :content="product.description || 'Crafted with premium ingredients for the perfect Drip & Brew experience.'" />
            </div>

            <div class="space-y-5 pb-6">
              <!-- Temperature Selection -->
              <div v-if="availableTemperatures.length > 1">
                <div class="flex items-center gap-2 mb-4">
                  <div class="h-px flex-1 bg-gray-100"></div>
                  <label class="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">1. Select Temperature</label>
                  <div class="h-px flex-1 bg-gray-100"></div>
                </div>
                <div class="grid grid-cols-2 gap-3">
                  <button 
                    v-for="temp in availableTemperatures" 
                    :key="temp"
                    @click="customizations.temperature = temp"
                    :class="[
                      'py-4 rounded-lg font-bold transition-all border-2 text-sm',
                      customizations.temperature === temp 
                        ? 'bg-orange-600 border-orange-600 text-white shadow-sm shadow-orange-900/20'
                        : 'bg-white border-gray-100 text-gray-400 hover:border-gray-200'
                    ]"
                  >
                    {{ temp }}
                  </button>
                </div>
              </div>

              <!-- Service Type -->
              <div>
                <div class="flex items-center gap-2 mb-4">
                  <div class="h-px flex-1 bg-gray-100"></div>
                  <label class="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">2. Service Method</label>
                  <div class="h-px flex-1 bg-gray-100"></div>
                </div>
                <div class="grid grid-cols-1 gap-3">
                  <button 
                    v-for="type in (['Dine In', 'Takeaway', 'BYO Flask'] as const)"
                    :key="type"
                    @click="customizations.service_type = type"
                    :class="[
                      'relative flex items-center justify-between px-5 py-4 rounded-lg font-bold transition-all border-2 text-left text-sm min-h-[76px]',
                      customizations.service_type === type
                        ? (type === 'BYO Flask' ? 'bg-green-600 border-green-600 text-white shadow-sm shadow-green-100' : 'bg-gray-900 border-gray-900 text-white')
                        : 'bg-white border-gray-100 text-gray-400 hover:border-gray-200'
                    ]"
                  >
                    <div class="flex flex-col gap-0.5">
                      <span class="flex items-center gap-2.5">
                        <svg v-if="type === 'Dine In'" xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                          <path d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 0 0 2-2V2" />
                          <path d="M7 2v20" />
                          <path d="M21 15V2v0a5 5 0 0 0-5 5v6c0 1.1.9 2 2 2h3Zm0 0v7" />
                        </svg>
                        <svg v-if="type === 'Takeaway'" xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                          <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z" />
                          <path d="M3 6h18" />
                          <path d="M16 10a4 4 0 0 1-8 0" />
                        </svg>
                        <svg v-if="type === 'BYO Flask'" xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                          <path d="M7 19H4.815a1.83 1.83 0 0 1-1.57-.881 1.785 1.785 0 0 1-.004-1.784L7.196 9.5" />
                          <path d="M11 19h8.203a1.83 1.83 0 0 0 1.556-.89 1.784 1.784 0 0 0 0-1.775l-1.226-2.12" />
                          <path d="m14 16-3 3 3 3" />
                          <path d="M8.293 13.596 7.196 9.5 3.1 10.598" />
                          <path d="m9.344 5.811 1.093-1.892A1.83 1.83 0 0 1 11.985 3a1.784 1.784 0 0 1 1.546.888l3.943 6.843" />
                          <path d="m13.378 9.633 4.096 1.098 1.097-4.096" />
                        </svg>
                        {{ type }}
                      </span>
                      <span v-if="type === 'BYO Flask'" class="text-[8px] opacity-70 uppercase tracking-widest font-black">Eco Discount Applied</span>
                    </div>

                    <div v-if="type === 'BYO Flask'" 
                      :class="[
                        'px-2 py-1 rounded-lg text-[9px] font-black uppercase tracking-tighter transition-colors',
                        customizations.service_type === type ? 'bg-white/20 text-white' : 'bg-green-50 text-green-600 border border-green-100'
                      ]"
                    >
                      -RM0.50
                    </div>
                  </button>
                </div>
              </div>
            </div>
          </div>

          <!-- 
            Sticky Symmetrical Action Footer
            - Positioned identically for every item (Fitts's Law)
          -->
          <div class="px-6 py-6 border-t border-gray-50 bg-white flex-shrink-0">
            <div class="flex flex-col sm:flex-row gap-3">
              <button @click="emit('close')" class="order-2 sm:order-1 flex-1 py-4 text-gray-400 font-black uppercase tracking-widest text-[10px] hover:text-gray-900 transition-colors">Cancel</button>
              <button 
                @click="confirm"
                class="order-1 sm:order-2 flex-[2] bg-orange-600 text-white py-4 rounded-lg font-black uppercase tracking-widest shadow-sm shadow-orange-900/30 hover:bg-orange-700 active:scale-[0.98] transition-all text-xs"
              >
                Add to Order
              </button>
            </div>
          </div>

        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.custom-scrollbar::-webkit-scrollbar {
  width: 4px;
}
.custom-scrollbar::-webkit-scrollbar-track {
  background: transparent;
}
.custom-scrollbar::-webkit-scrollbar-thumb {
  @apply bg-gray-100 rounded-full;
}
</style>
