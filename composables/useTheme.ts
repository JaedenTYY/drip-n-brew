export const useTheme = () => {
  const isDark = useState<boolean>('isDark', () => false)

  const toggleTheme = () => {
    isDark.value = !isDark.value
    if (process.client) {
      localStorage.setItem('pos-theme', isDark.value ? 'dark' : 'light')
      updateDocument()
    }
  }

  const updateDocument = () => {
    if (process.client) {
      if (isDark.value) {
        document.documentElement.classList.add('dark')
      } else {
        document.documentElement.classList.remove('dark')
      }
    }
  }

  onMounted(() => {
    const saved = localStorage.getItem('pos-theme')
    if (saved === 'dark') {
      isDark.value = true
    } else if (saved === 'light') {
      isDark.value = false
    } else {
      // Default to light as requested
      isDark.value = false
    }
    updateDocument()
  })

  return {
    isDark,
    toggleTheme
  }
}
