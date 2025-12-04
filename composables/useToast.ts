import { ref } from 'vue'

export const useToast = () => {
  const toast = ref({
    show: false,
    message: '',
    type: 'info' as 'success' | 'error' | 'info'
  })

  let toastTimer: ReturnType<typeof setTimeout> | null = null

  function showToast(message: string, type: 'success' | 'error' | 'info' = 'info', duration: number = 3000) {
    // 清除之前的定时器
    if (toastTimer) {
      clearTimeout(toastTimer)
    }

    toast.value = {
      show: true,
      message,
      type
    }

    toastTimer = setTimeout(() => {
      toast.value.show = false
    }, duration)
  }

  return {
    toast,
    showToast
  }
}
