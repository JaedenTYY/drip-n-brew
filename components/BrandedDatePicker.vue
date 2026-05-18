<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, nextTick } from 'vue'

const props = defineProps<{
  modelValue: string | null
  label?: string
  placeholder?: string
  minDate?: string | null
}>()

const emit = defineEmits(['update:modelValue'])

const isOpen = ref(false)
const containerRef = ref<HTMLElement | null>(null)
const calendarRef = ref<HTMLElement | null>(null)
const coords = ref({ top: 0, left: 0, width: 0 })

// --- Date Logic ---
const today = new Date()
const currentViewDate = ref(props.modelValue ? new Date(props.modelValue) : new Date())
const selectedDate = computed(() => props.modelValue ? new Date(props.modelValue) : null)
const minDateParsed = computed(() => props.minDate ? new Date(props.minDate) : null)

const months = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
]
const daysOfWeek = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa']

const viewMonth = computed(() => months[currentViewDate.value.getMonth()])
const viewYear = computed(() => currentViewDate.value.getFullYear())

const isDateDisabled = (date: Date) => {
  if (!minDateParsed.value) return false
  
  // Set both to midnight for accurate comparison
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  const min = new Date(minDateParsed.value)
  min.setHours(0, 0, 0, 0)
  
  return d < min
}

const calendarDays = computed(() => {
  const year = currentViewDate.value.getFullYear()
  const month = currentViewDate.value.getMonth()
  const firstDayOfMonth = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const days = []
  for (let i = 0; i < firstDayOfMonth; i++) days.push({ day: null, currentMonth: false, date: null, disabled: false })
  for (let i = 1; i <= daysInMonth; i++) {
    const date = new Date(year, month, i)
    days.push({ 
      day: i, 
      currentMonth: true, 
      date,
      disabled: isDateDisabled(date)
    })
  }
  return days
})

const isSelected = (date: Date) => {
  if (!selectedDate.value) return false
  return date.getDate() === selectedDate.value.getDate() &&
         date.getMonth() === selectedDate.value.getMonth() &&
         date.getFullYear() === selectedDate.value.getFullYear()
}

const isToday = (date: Date) => {
  return date.getDate() === today.getDate() &&
         date.getMonth() === today.getMonth() &&
         date.getFullYear() === today.getFullYear()
}

const formatDate = (date: Date) => {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

const handleDateSelect = (date: Date) => {
  emit('update:modelValue', formatDate(date))
  isOpen.value = false
}

const changeMonth = (delta: number) => {
  const newDate = new Date(currentViewDate.value)
  newDate.setMonth(newDate.getMonth() + delta)
  currentViewDate.value = newDate
}

const updateCoords = () => {
  if (containerRef.value) {
    const rect = containerRef.value.getBoundingClientRect()
    const scrollY = window.scrollY || window.pageYOffset
    const scrollX = window.scrollX || window.pageXOffset
    
    // Check if there is more space above or below
    const spaceBelow = window.innerHeight - rect.bottom
    const spaceAbove = rect.top
    const shouldOpenUp = spaceBelow < 320 && spaceAbove > spaceBelow

    coords.value = {
      top: shouldOpenUp ? (rect.top + scrollY - 320) : (rect.bottom + scrollY + 8),
      left: rect.left + scrollX,
      width: rect.width
    }
  }
}

const toggleCalendar = async () => {
  if (!isOpen.value) {
    updateCoords()
    isOpen.value = true
    await nextTick()
    // Re-adjust if necessary after render
    updateCoords()
  } else {
    isOpen.value = false
  }
}

const handleClickOutside = (event: MouseEvent) => {
  const target = event.target as HTMLElement
  // Check if click was outside both the trigger and the teleported calendar
  if (containerRef.value && !containerRef.value.contains(target) && 
      calendarRef.value && !calendarRef.value.contains(target)) {
    isOpen.value = false
  }
}

onMounted(() => {
  document.addEventListener('mousedown', handleClickOutside)
  window.addEventListener('resize', updateCoords)
  window.addEventListener('scroll', updateCoords, true)
})

onUnmounted(() => {
  document.removeEventListener('mousedown', handleClickOutside)
  window.removeEventListener('resize', updateCoords)
  window.removeEventListener('scroll', updateCoords, true)
})
</script>

<template>
  <div ref="containerRef" class="relative w-full">
    <!-- Input Trigger -->
    <div 
      @click="toggleCalendar"
      class="w-full bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-xl px-4 py-2.5 flex items-center justify-between cursor-pointer hover:border-orange-500 transition-all group"
      :class="{ 'ring-2 ring-orange-500/20 border-orange-500': isOpen }"
    >
      <span 
        class="text-[10px] font-black uppercase tracking-widest truncate mr-2"
        :class="modelValue ? 'text-gray-900 dark:text-white' : 'text-gray-400'"
      >
        {{ modelValue ? modelValue : (placeholder || 'Select Date') }}
      </span>
      <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 flex-shrink-0 text-gray-400 group-hover:text-orange-500 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
      </svg>
    </div>

    <!-- Teleported Calendar -->
    <Teleport to="body">
      <div 
        v-if="isOpen"
        ref="calendarRef"
        :style="{ 
          top: `${coords.top}px`, 
          left: `${coords.left}px`,
          minWidth: '280px'
        }"
        class="fixed bg-white dark:bg-gray-900 rounded-3xl shadow-2xl border border-gray-100 dark:border-gray-800 p-5 z-[999] animate-in fade-in zoom-in-95 duration-200"
      >
        <!-- Header -->
        <div class="flex items-center justify-between mb-4">
          <button @click="changeMonth(-1)" class="p-2 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-xl transition-all">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <div class="text-center">
            <p class="text-[10px] font-black uppercase tracking-[0.2em] text-gray-900 dark:text-white">{{ viewMonth }}</p>
            <p class="text-[8px] font-bold text-gray-400 uppercase tracking-widest">{{ viewYear }}</p>
          </div>
          <button @click="changeMonth(1)" class="p-2 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-xl transition-all">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>

        <!-- Days Grid -->
        <div class="grid grid-cols-7 gap-1 mb-2">
          <div v-for="day in daysOfWeek" :key="day" class="text-center text-[8px] font-black text-gray-400 uppercase tracking-widest py-2">{{ day }}</div>
          <div v-for="(dateObj, idx) in calendarDays" :key="idx" class="aspect-square flex items-center justify-center relative">
            <button
              v-if="dateObj.day"
              @click="!dateObj.disabled && handleDateSelect(dateObj.date!)"
              :disabled="dateObj.disabled"
              class="w-full h-full rounded-xl text-[10px] font-bold transition-all relative z-10"
              :class="[
                isSelected(dateObj.date!) 
                  ? 'bg-orange-600 text-white shadow-lg shadow-orange-900/20' 
                  : dateObj.disabled
                    ? 'text-gray-200 dark:text-gray-800 cursor-not-allowed opacity-30'
                    : 'hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300'
              ]"
            >
              {{ dateObj.day }}
              <div v-if="isToday(dateObj.date!) && !isSelected(dateObj.date!) && !dateObj.disabled" class="absolute bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-orange-600"></div>
            </button>
          </div>
        </div>

        <!-- Quick Actions -->
        <div class="pt-4 border-t border-gray-50 dark:border-gray-800 flex justify-between">
          <button @click="emit('update:modelValue', null); isOpen = false" class="text-[8px] font-black uppercase tracking-widest text-gray-400 hover:text-red-500 transition-colors">Clear</button>
          <button 
            @click="handleDateSelect(today)" 
            :disabled="isDateDisabled(today)"
            class="text-[8px] font-black uppercase tracking-widest text-orange-600 hover:opacity-70 transition-opacity disabled:opacity-30 disabled:cursor-not-allowed"
          >
            Today
          </button>
        </div>
      </div>
    </Teleport>
  </div>
</template>
