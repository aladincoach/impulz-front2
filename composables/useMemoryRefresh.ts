/**
 * Composable to trigger memory refresh in DocumentsPanel
 */
export const useMemoryRefresh = () => {
  const refreshEvent = ref(0)

  const triggerRefresh = () => {
    refreshEvent.value++
  }

  return {
    refreshEvent: readonly(refreshEvent),
    triggerRefresh
  }
}

