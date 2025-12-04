import { ref } from 'vue'
import { useBackend } from './useBackend'

const messages = ref<any>(null)
const isConnected = ref(false)
let ws: WebSocket | null = null
let reconnectTimer: any = null

export const useWebSocket = () => {
  const { getWsUrl } = useBackend()

  function connect() {
    if (typeof window === 'undefined') return
    if (ws && (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING)) return

    const wsUrl = getWsUrl('/ws/status')
    
    try {
      ws = new WebSocket(wsUrl)
      
      ws.onopen = () => {
        isConnected.value = true
        if (reconnectTimer) {
          clearTimeout(reconnectTimer)
          reconnectTimer = null
        }
      }
      
      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data)
          messages.value = msg
        } catch (e) {
          console.error('WS parse error:', e)
        }
      }
      
      ws.onclose = () => {
        isConnected.value = false
        ws = null
        if (!reconnectTimer) {
          reconnectTimer = setTimeout(() => connect(), 3000)
        }
      }
      
    } catch (e) {
      console.error('WS connection failed:', e)
    }
  }

  // Initialize connection
  connect()

  return {
    messages,
    isConnected
  }
}