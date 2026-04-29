<script setup lang="ts">
import { useUI } from '~/composables/useUI'

const { 
  notifications, 
  removeNotification, 
  confirmation, 
  handleConfirm, 
  cancelConfirmation, 
  isConfirming 
} = useUI()

const getIcon = (type: string) => {
  switch (type) {
    case 'success': return '✓'
    case 'error': return '✕'
    case 'warning': return '!'
    default: return 'i'
  }
}

const getTypeClass = (type: string) => {
  switch (type) {
    case 'success': return 'bg-green-500 text-white'
    case 'error': return 'bg-red-500 text-white'
    case 'warning': return 'bg-orange-500 text-white'
    default: return 'bg-gray-900 text-white'
  }
}
</script>

<template>
  <Teleport to="body">
    <!-- Notifications (Toasts) Stack -->
    <div class="fixed top-6 right-6 z-[400] flex flex-col gap-3 w-full max-w-sm pointer-events-none">
      <TransitionGroup
        enter-active-class="transition duration-500 ease-out"
        enter-from-class="opacity-0 translate-x-12 scale-95"
        enter-to-class="opacity-100 translate-x-0 scale-100"
        leave-active-class="transition duration-300 ease-in"
        leave-from-class="opacity-100 scale-100"
        leave-to-class="opacity-0 scale-90"
      >
        <div 
          v-for="note in notifications" 
          :key="note.id"
          class="pointer-events-auto bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl p-4 shadow-2xl flex items-start gap-4 overflow-hidden group"
        >
          <div :class="getTypeClass(note.type)" class="h-10 w-10 shrink-0 rounded-xl flex items-center justify-center font-black text-lg italic shadow-lg">
            {{ getIcon(note.type) }}
          </div>
          <div class="flex-1 min-w-0 pt-0.5">
            <h4 class="text-[11px] font-black uppercase tracking-widest text-gray-900 dark:text-white leading-tight mb-1">{{ note.message }}</h4>
            <p v-if="note.description" class="text-[10px] font-bold text-gray-400 uppercase tracking-tight leading-relaxed">{{ note.description }}</p>
          </div>
          <button @click="removeNotification(note.id)" class="p-1 text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
          
          <!-- Progress Bar Decor -->
          <div class="absolute bottom-0 left-0 h-0.5 bg-orange-600/20 w-full"></div>
        </div>
      </TransitionGroup>
    </div>

    <!-- Global Confirmation Modal -->
    <Transition
      enter-active-class="transition duration-500 ease-out"
      enter-from-class="opacity-0"
      enter-to-class="opacity-100"
      leave-active-class="transition duration-300 ease-in"
      leave-from-class="opacity-100"
      leave-to-class="opacity-0"
    >
      <div v-if="confirmation" class="fixed inset-0 z-[500] flex items-center justify-center p-6">
        <div class="absolute inset-0 bg-gray-950/60 backdrop-blur-md" @click="cancelConfirmation"></div>
        
        <div class="relative w-full max-w-sm bg-white dark:bg-gray-900 rounded-[3rem] p-8 shadow-2xl border border-gray-100 dark:border-gray-800 animate-in zoom-in-95 duration-300">
          <div class="flex flex-col items-center text-center">
            <div 
              :class="confirmation.type === 'danger' ? 'bg-red-50 text-red-500' : 'bg-orange-50 text-orange-600'" 
              class="h-20 w-20 rounded-[2rem] flex items-center justify-center mb-6 shadow-inner"
            >
              <svg v-if="confirmation.type === 'danger'" xmlns="http://www.w3.org/2000/svg" class="h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
              <svg v-else xmlns="http://www.w3.org/2000/svg" class="h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>

            <h3 class="text-2xl font-black uppercase italic tracking-tighter text-gray-900 dark:text-white leading-tight mb-2">{{ confirmation.title }}</h3>
            <p class="text-xs font-bold text-gray-400 uppercase tracking-widest leading-relaxed mb-8">{{ confirmation.message }}</p>

            <div class="flex gap-3 w-full">
              <button 
                @click="cancelConfirmation" 
                class="flex-1 py-4 rounded-2xl font-black uppercase tracking-widest text-[10px] text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 transition-all"
              >
                {{ confirmation.cancelText || 'Wait, Cancel' }}
              </button>
              <button 
                @click="handleConfirm" 
                :disabled="isConfirming"
                :class="confirmation.type === 'danger' ? 'bg-red-600 hover:bg-red-700 shadow-red-900/20' : 'bg-gray-900 dark:bg-white text-white dark:text-black'"
                class="flex-[1.5] py-4 rounded-2xl font-black uppercase tracking-widest text-[10px] shadow-xl transition-all active:scale-95 disabled:opacity-50"
              >
                {{ isConfirming ? '...' : (confirmation.confirmText || 'Confirm') }}
              </button>
            </div>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>
