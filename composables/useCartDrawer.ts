/**
 * Composable to manage the state and visibility of the shopping cart drawer.
 * This state is shared across the storefront using a simple reactive variable.
 */

const isDrawerOpen = ref(false)

export const useCartDrawer = () => {
  const toggleDrawer = () => {
    isDrawerOpen.value = !isDrawerOpen.value
  }

  const openDrawer = () => {
    isDrawerOpen.value = true
  }

  const closeDrawer = () => {
    isDrawerOpen.value = false
  }

  return {
    isDrawerOpen,
    toggleDrawer,
    openDrawer,
    closeDrawer
  }
}
