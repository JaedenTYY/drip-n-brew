export type NotificationType = 'success' | 'error' | 'info' | 'warning'

interface Notification {
  id: string
  type: NotificationType
  message: string
  description?: string
  duration?: number
}

interface ConfirmationOptions {
  title: string
  message: string
  confirmText?: string
  cancelText?: string
  type?: 'danger' | 'info'
  onConfirm: () => void | Promise<void>
}

export const useUI = () => {
  // --- Notifications (Toasts) ---
  const notifications = useState<Notification[]>('ui-notifications', () => [])

  const notify = (options: Omit<Notification, 'id'>) => {
    const id = Math.random().toString(36).slice(2)
    const duration = options.duration ?? 4000
    
    notifications.value.push({ ...options, id })

    if (duration > 0) {
      setTimeout(() => {
        removeNotification(id)
      }, duration)
    }
  }

  const removeNotification = (id: string) => {
    notifications.value = notifications.value.filter(n => n.id !== id)
  }

  // --- Confirmation Dialog ---
  const confirmation = useState<ConfirmationOptions | null>('ui-confirmation', () => null)
  const isConfirming = ref(false)

  const askConfirmation = (options: ConfirmationOptions) => {
    confirmation.value = options
  }

  const handleConfirm = async () => {
    if (!confirmation.value) return
    isConfirming.value = true
    try {
      await confirmation.value.onConfirm()
      confirmation.value = null
    } finally {
      isConfirming.value = false
    }
  }

  const cancelConfirmation = () => {
    confirmation.value = null
  }

  // --- Legacy Success Popup ---
  const showSuccessPopup = useState('showSuccessPopup', () => false)
  const successCustomerName = useState('successCustomerName', () => '')

  const triggerSuccess = (orderId: string, customerName: string) => {
    successCustomerName.value = customerName
    showSuccessPopup.value = true

    setTimeout(() => {
      showSuccessPopup.value = false
      navigateTo({
        path: '/order-confirmation',
        query: { id: orderId }
      })
    }, 3000)
  }

  return {
    notifications,
    notify,
    removeNotification,
    confirmation,
    isConfirming,
    askConfirmation,
    handleConfirm,
    cancelConfirmation,
    showSuccessPopup,
    successCustomerName,
    triggerSuccess
  }
}
