import { ref, computed } from 'vue'

// 全局状态，确保跨组件共享
const backendUrl = ref('http://127.0.0.1:17890')
const isInitialized = ref(false)

// WebSocket 状态
const isConnected = ref(false)
const lastHeartbeat = ref(0)
const rooms = ref<any[]>([])
const peers = ref<any[]>([])
const traffic = ref<any>(null)
const networkStatus = ref<any>({
  running: false,
  connected: false,
  virtual_ip: '未连接'
})

// 单例 WebSocket 连接
let ws: WebSocket | null = null
let reconnectTimer: any = null
let pingTimer: any = null

export const useBackend = () => {
  
  // 初始化（智能判断）
  function init() {
    if (isInitialized.value) return
    
    // 强制使用本地后端地址
    // 前端无论是部署在公网还是本地，都只连接用户电脑上的 127.0.0.1:17890
    backendUrl.value = 'http://127.0.0.1:17890'
    
    isInitialized.value = true
    
    // 启动 WebSocket 连接
    connectWebSocket()
  }

  function connectWebSocket() {
    if (typeof window === 'undefined') return
    if (ws && (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING)) return

    const wsUrl = getWsUrl('/ws/status')
    console.log('[WebSocket] Connecting to:', wsUrl)
    
    try {
      ws = new WebSocket(wsUrl)
      
      ws.onopen = () => {
        console.log('[WebSocket] Connected')
        isConnected.value = true
        lastHeartbeat.value = Date.now()
        
        // 清除重连定时器
        if (reconnectTimer) {
          clearTimeout(reconnectTimer)
          reconnectTimer = null
        }
        
        // 启动心跳检测
        startHeartbeat()
      }
      
      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data)
          lastHeartbeat.value = Date.now()
          
          if (msg.type === 'rooms_update') {
            rooms.value = msg.data
          } else if (msg.type === 'status_update') {
            networkStatus.value = msg.data
          } else if (msg.type === 'peers_update') {
            peers.value = msg.data
          } else if (msg.type === 'traffic_update') {
            traffic.value = msg.data
          } else if (msg.type === 'heartbeat') {
            // 只是心跳回应
          }
        } catch (e) {
          console.error('[WebSocket] Failed to parse message:', e)
        }
      }
      
      ws.onclose = () => {
        console.log('[WebSocket] Disconnected')
        isConnected.value = false
        ws = null
        
        // 尝试重连
        if (!reconnectTimer) {
          reconnectTimer = setTimeout(() => {
            console.log('[WebSocket] Reconnecting...')
            reconnectTimer = null
            connectWebSocket()
          }, 3000)
        }
      }
      
      ws.onerror = (err) => {
        console.error('[WebSocket] Error:', err)
        ws?.close()
      }
      
    } catch (e) {
      console.error('[WebSocket] Connection failed:', e)
    }
  }

  function startHeartbeat() {
    if (pingTimer) clearInterval(pingTimer)
    pingTimer = setInterval(() => {
      if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send('ping')
      }
    }, 10000)
  }

  // 设置新的后端地址 (保留方法但不公开 UI)
  function setBackendUrl(url: string) {
    // 移除末尾斜杠
    let cleanUrl = url.trim().replace(/\/$/, '')
    
    // 如果没有协议，默认 http
    if (!cleanUrl.startsWith('http://') && !cleanUrl.startsWith('https://')) {
      cleanUrl = 'http://' + cleanUrl
    }
    
    backendUrl.value = cleanUrl
    
    if (typeof window !== 'undefined') {
      localStorage.setItem('flowergame_backend_url', cleanUrl)
    }
  }

  // 获取完整的 API URL
  function getApiUrl(path: string) {
    init()
    // 确保 path 以 / 开头
    const cleanPath = path.startsWith('/') ? path : '/' + path
    return `${backendUrl.value}${cleanPath}`
  }
  
  // 获取完整的 WebSocket URL
  function getWsUrl(path: string) {
    init()
    // 将 http/https 替换为 ws/wss
    // 注意：如果当前页面是 https，必须使用 wss，如果是 http，可以使用 ws 或 wss
    // 但如果后端地址硬编码为 http://127.0.0.1，则只能用 ws
    
    // 智能判断：如果是局域网访问前端 (192.168.x.x)，而后端是 localhost
    // 浏览器可能会阻止非安全上下文的 websocket 连接，或者因为跨域策略 (Origin) 拒绝
    // 但 ws://127.0.0.1 通常是允许的。
    
    let wsBase = backendUrl.value.replace(/^http:/, 'ws:').replace(/^https:/, 'wss:')
    const cleanPath = path.startsWith('/') ? path : '/' + path
    return `${wsBase}${cleanPath}`
  }
  
  // 封装 fetch
  async function fetchApi(path: string, options?: RequestInit) {
    const url = getApiUrl(path)
    console.log(`[fetchApi] Requesting: ${url}`)
    
    const finalOptions = { ...options }
    
    // 自动添加 Content-Type: application/json
    if (finalOptions.body && typeof finalOptions.body === 'string' && !finalOptions.headers) {
      finalOptions.headers = {
        'Content-Type': 'application/json'
      }
    } else if (finalOptions.body && typeof finalOptions.body === 'string' && finalOptions.headers) {
      // 如果有 headers 但没有 Content-Type，添加它
      const headers = finalOptions.headers as Record<string, string>
      if (!headers['Content-Type'] && !headers['content-type']) {
        headers['Content-Type'] = 'application/json'
      }
    }
    
    return fetch(url, finalOptions)
  }

  return {
    backendUrl,
    setBackendUrl,
    getApiUrl,
    getWsUrl,
    fetchApi,
    init,
    // WebSocket state
    isConnected,
    rooms,
    peers,
    traffic,
    networkStatus
  }
}
