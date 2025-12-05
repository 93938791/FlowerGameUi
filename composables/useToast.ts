import { ref } from 'vue'

const toast = ref({
  show: false,
  message: '',
  type: 'info' as 'success' | 'error' | 'info'
})

let toastTimer: ReturnType<typeof setTimeout> | null = null

function showToast(message: string, type: 'success' | 'error' | 'info' = 'info', duration: number = 3000) {
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

export const useToast = () => {
  return {
    toast,
    showToast
  }
}
