import { ref, watch } from 'vue'
import { useWebSocket } from './useWebSocket'

// Global state for download progress
const downloadProgress = ref({
  filename: '',
  percent: 0,
  total: 0,
  current: 0,
  message: ''
})

// Track if the watcher is already initialized
let isWatcherInitialized = false

export const useDownload = () => {
  const { messages } = useWebSocket()

  /**
   * Initialize the download progress listener.
   * This should be called at the root level (e.g., App.vue) or ensure it's called at least once.
   * It's safe to call multiple times as we check initialization status.
   */
  function initDownloadListener() {
    if (isWatcherInitialized) return

    watch(messages, (newMsg) => {
      if (!newMsg) return
      
      if (newMsg.type === 'download_progress') {
        const data = newMsg.data
        downloadProgress.value = {
          filename: data.filename,
          percent: data.percent,
          total: data.total || 0,
          current: data.current || 0,
          message: data.message || ''
        }
        
        // Hide progress after completion (optional logic, can be kept here or in UI)
        // Kept here to ensure state consistency even if UI is not mounted
        if (data.percent >= 100 && data.message !== '安装完成') {
          setTimeout(() => {
             // If still showing the same task, clear it
             if (downloadProgress.value.filename === data.filename) {
                downloadProgress.value = { filename: '', percent: 0, total: 0, current: 0, message: '' }
             }
          }, 3000)
        }
      } else if (newMsg.type === 'notification') {
         if (newMsg.data.type === 'success' && newMsg.data.title === '安装完成') {
             setTimeout(() => {
                downloadProgress.value = { filename: '', percent: 0, total: 0, current: 0, message: '' }
             }, 3000)
         }
      }
    })

    isWatcherInitialized = true
  }

  /**
   * Reset download progress manually if needed
   */
  function resetProgress() {
    downloadProgress.value = { filename: '', percent: 0, total: 0, current: 0, message: '' }
  }

  return {
    downloadProgress,
    initDownloadListener,
    resetProgress
  }
}
