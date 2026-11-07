<script setup lang="ts">
import { useShopStatus } from '~/composables/useShopStatus'
import type { DaySchedule } from '~/types'

const props = defineProps<{
  show: boolean
}>()

const emit = defineEmits<{
  (e: 'close'): void
}>()

const {
  shopConfig,
  isShopOpen,
  isSaving,
  hasActiveOverrideToday,
  statusSummary,
  setManualOverride,
  updateSchedule
} = useShopStatus()

const localSchedule = ref<DaySchedule[]>([])
const feedback = ref<{ type: 'success' | 'error', text: string } | null>(null)

watch(
  () => props.show,
  (isOpen) => {
    if (isOpen) {
      feedback.value = null
      localSchedule.value = shopConfig.value.schedule.map(d => ({ ...d }))
    }
  },
  { immediate: true }
)

const handleQuickOverride = async (mode: 'open' | 'closed' | 'auto') => {
  feedback.value = null
  const res = await setManualOverride(mode)
  if (res.success) {
    feedback.value = {
      type: 'success',
      text: mode === 'auto'
        ? 'Resumed automatic weekly schedule.'
        : `Shop manually ${mode === 'open' ? 'opened' : 'closed'} for today.`
    }
  } else {
    feedback.value = { type: 'error', text: res.error || 'Failed to update status.' }
  }
}

const handleSaveSchedule = async () => {
  feedback.value = null
  for (const day of localSchedule.value) {
    if (day.enabled && day.open_time >= day.close_time) {
      feedback.value = {
        type: 'error',
        text: `${day.label}: Close time must be later than open time.`
      }
      return
    }
  }

  const res = await updateSchedule(localSchedule.value)
  if (res.success) {
    emit('close')
  } else {
    feedback.value = { type: 'error', text: res.error || 'Failed to save schedule.' }
  }
}
</script>

<template>
  <Teleport to="body">
    <Transition
      enter-active-class="transition duration-200 ease-out"
      enter-from-class="opacity-0"
      enter-to-class="opacity-100"
      leave-active-class="transition duration-150 ease-in"
      leave-from-class="opacity-100"
      leave-to-class="opacity-0"
    >
      <div
        v-if="show"
        class="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
        @click.self="emit('close')"
      >
        <div class="w-full max-w-lg rounded-2xl bg-white dark:bg-gray-950 border border-gray-100 dark:border-gray-800 shadow-2xl overflow-hidden flex flex-col max-h-[90dvh]">
          <!-- Modal Header -->
          <div class="flex items-center justify-between px-6 py-5 border-b border-gray-100 dark:border-gray-800">
            <div>
              <div class="flex items-center gap-2.5">
                <h2 class="text-lg font-black uppercase italic tracking-tighter text-gray-900 dark:text-white leading-none">
                  Shop Hours & Status
                </h2>
                <span
                  class="px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest"
                  :class="isShopOpen
                    ? 'bg-green-100 text-green-700 dark:bg-green-950/60 dark:text-green-400'
                    : 'bg-red-100 text-red-700 dark:bg-red-950/60 dark:text-red-400'"
                >
                  {{ isShopOpen ? 'Open' : 'Closed' }}
                </span>
              </div>
              <p class="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1.5">
                {{ statusSummary }}
              </p>
            </div>

            <button
              @click="emit('close')"
              class="p-2 rounded-lg text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-900 transition-colors"
            >
              <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <!-- Scrollable Body -->
          <div class="flex-1 overflow-y-auto p-6 space-y-6">
            <!-- Section 1: Manual Override for Today -->
            <div class="p-4 rounded-xl bg-gray-50 dark:bg-gray-900/70 border border-gray-100 dark:border-gray-800 space-y-3">
              <div class="flex items-center justify-between">
                <div>
                  <h3 class="text-[11px] font-black uppercase tracking-widest text-gray-900 dark:text-white">
                    Manual Override (Today)
                  </h3>
                  <p class="text-[10px] text-gray-500 dark:text-gray-400 mt-0.5">
                    Instantly open or close Drip & Brew for the rest of today.
                  </p>
                </div>
                <span
                  v-if="hasActiveOverrideToday"
                  class="text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded bg-orange-100 text-orange-700 dark:bg-orange-950/60 dark:text-orange-400"
                >
                  Override Active
                </span>
              </div>

              <div class="grid grid-cols-2 gap-2.5 pt-1">
                <button
                  type="button"
                  :disabled="isSaving || isShopOpen"
                  @click="handleQuickOverride('open')"
                  class="py-3 px-4 rounded-xl font-black uppercase tracking-widest text-[10px] transition-all flex items-center justify-center gap-2 border"
                  :class="isShopOpen
                    ? 'bg-green-600 text-white border-green-600 opacity-50 cursor-not-allowed'
                    : 'bg-white dark:bg-gray-950 text-green-600 border-green-200 dark:border-green-900/60 hover:bg-green-600 hover:text-white active:scale-95'"
                >
                  <span class="h-2 w-2 rounded-full bg-current"></span>
                  Open Shop Now
                </button>

                <button
                  type="button"
                  :disabled="isSaving || !isShopOpen"
                  @click="handleQuickOverride('closed')"
                  class="py-3 px-4 rounded-xl font-black uppercase tracking-widest text-[10px] transition-all flex items-center justify-center gap-2 border"
                  :class="!isShopOpen
                    ? 'bg-red-600 text-white border-red-600 opacity-50 cursor-not-allowed'
                    : 'bg-white dark:bg-gray-950 text-red-600 border-red-200 dark:border-red-900/60 hover:bg-red-600 hover:text-white active:scale-95'"
                >
                  <span class="h-2 w-2 rounded-full bg-current"></span>
                  Close Shop Now
                </button>
              </div>

              <button
                v-if="hasActiveOverrideToday"
                type="button"
                :disabled="isSaving"
                @click="handleQuickOverride('auto')"
                class="w-full py-2 text-[10px] font-black uppercase tracking-widest text-orange-600 hover:underline text-center"
              >
                Reset to Automatic Weekly Schedule
              </button>
            </div>

            <!-- Section 2: Recurring Weekly Schedule -->
            <div class="space-y-3">
              <div>
                <h3 class="text-[11px] font-black uppercase tracking-widest text-gray-900 dark:text-white">
                  Recurring Weekly Schedule
                </h3>
                <p class="text-[10px] text-gray-500 dark:text-gray-400 mt-0.5">
                  Enable operating days and set automatic opening and closing times.
                </p>
              </div>

              <div class="space-y-2">
                <div
                  v-for="dayItem in localSchedule"
                  :key="dayItem.day"
                  class="flex flex-wrap sm:flex-nowrap items-center justify-between gap-3 p-3 rounded-xl border transition-all"
                  :class="dayItem.enabled
                    ? 'bg-white dark:bg-gray-900 border-orange-200 dark:border-orange-900/50'
                    : 'bg-gray-50/60 dark:bg-gray-950 border-gray-100 dark:border-gray-900 opacity-60'"
                >
                  <!-- Day Toggle -->
                  <label class="flex items-center gap-3 cursor-pointer select-none min-w-[120px]">
                    <input
                      v-model="dayItem.enabled"
                      type="checkbox"
                      class="sr-only peer"
                    />
                    <div class="w-9 h-5 bg-gray-200 dark:bg-gray-800 peer-checked:bg-orange-600 rounded-full relative transition-colors">
                      <div
                        class="absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full transition-transform"
                        :class="dayItem.enabled ? 'translate-x-4' : 'translate-x-0'"
                      ></div>
                    </div>
                    <span class="text-xs font-black uppercase tracking-wider text-gray-900 dark:text-white">
                      {{ dayItem.label }}
                    </span>
                  </label>

                  <!-- Time Pickers -->
                  <div v-if="dayItem.enabled" class="flex items-center gap-2 ml-auto">
                    <input
                      v-model="dayItem.open_time"
                      type="time"
                      class="bg-gray-50 dark:bg-gray-950 border border-gray-200 dark:border-gray-800 rounded-lg px-2.5 py-1.5 text-xs font-bold text-gray-900 dark:text-white focus:ring-2 focus:ring-orange-600 outline-none"
                    />
                    <span class="text-[10px] font-black uppercase text-gray-400">to</span>
                    <input
                      v-model="dayItem.close_time"
                      type="time"
                      class="bg-gray-50 dark:bg-gray-950 border border-gray-200 dark:border-gray-800 rounded-lg px-2.5 py-1.5 text-xs font-bold text-gray-900 dark:text-white focus:ring-2 focus:ring-orange-600 outline-none"
                    />
                  </div>
                  <div v-else class="ml-auto">
                    <span class="text-[10px] font-black uppercase tracking-widest text-gray-400">Closed</span>
                  </div>
                </div>
              </div>
            </div>

            <!-- Feedback Alert -->
            <div
              v-if="feedback"
              class="p-3 rounded-xl text-[10px] font-black uppercase tracking-widest border"
              :class="feedback.type === 'success'
                ? 'bg-green-50 text-green-700 border-green-200 dark:bg-green-950/40 dark:text-green-400 dark:border-green-900'
                : 'bg-red-50 text-red-600 border-red-200 dark:bg-red-950/40 dark:text-red-400 dark:border-red-900'"
            >
              {{ feedback.text }}
            </div>
          </div>

          <!-- Modal Footer -->
          <div class="px-6 py-4 border-t border-gray-100 dark:border-gray-800 flex items-center justify-end gap-3 bg-gray-50/50 dark:bg-gray-950">
            <button
              type="button"
              @click="emit('close')"
              class="px-4 py-2.5 rounded-lg text-[10px] font-black uppercase tracking-widest text-gray-500 hover:text-gray-900 dark:hover:text-white transition-colors"
            >
              Close
            </button>
            <button
              type="button"
              :disabled="isSaving"
              @click="handleSaveSchedule"
              class="bg-orange-600 hover:bg-orange-700 disabled:opacity-50 text-white px-5 py-2.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all active:scale-95 shadow-sm"
            >
              {{ isSaving ? 'Saving...' : 'Save Weekly Schedule' }}
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>
