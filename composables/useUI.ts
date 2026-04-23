export const useUI = () => {
  const showSuccessPopup = useState('showSuccessPopup', () => false)
  const successCustomerName = useState('successCustomerName', () => '')
  const successOrderId = useState('successOrderId', () => '')

  const triggerSuccess = (orderId: string, customerName: string) => {
    console.log('[Global UI] Triggering Success Popup for:', customerName)
    successOrderId.value = orderId
    successCustomerName.value = customerName
    showSuccessPopup.value = true

    // Auto-hide and redirect after 3 seconds
    setTimeout(() => {
      showSuccessPopup.value = false
      navigateTo({
        path: '/order-confirmation',
        query: { id: orderId }
      })
    }, 3000)
  }

  return {
    showSuccessPopup,
    successCustomerName,
    triggerSuccess
  }
}
