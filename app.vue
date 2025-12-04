<template>
  <!-- 后端连接中页面 -->
  <LoadingPage v-if="!isBackendConnected" />

  <!-- 主应用页面 -->
  <div v-else class="app-layout">
    <!-- Toast 提示 -->
    <Toast :show="toast.show" :message="toast.message" :type="toast.type" />
    
    <!-- Sidebar 导航 -->
    <Sidebar 
      :account-info="accountInfo"
      :offline-account="offlineAccount"
      :is-authenticating="isAuthenticating"
      :network-connected="networkStatus.connected"
      @start-device-auth="startDeviceAuth"
      @show-offline-login="showOfflineLogin = true"
      @logout="logout"
      @logout-offline="logoutOffline"
    />
    
    <!-- 主内容区 -->
    <div class="main-content">
      <NuxtPage />
    </div>
      
      <!-- 设备代码登录弹窗 -->
      <div v-if="deviceCodeData" class="modal-overlay device-code-modal" @click="cancelDeviceAuth">
        <div class="modal-content device-code-content" @click.stop>
          <div class="device-code-header">
            <div class="header-icon">🔐</div>
            <div class="header-content">
              <h3>Microsoft 登录</h3>
              <p class="header-subtitle">使用设备代码完成身份验证</p>
            </div>
            <button @click="cancelDeviceAuth" class="modal-close">×</button>
          </div>
          
          <div class="device-code-body">
            <div class="login-instruction">
              <div class="instruction-icon">ℹ️</div>
              <div class="instruction-text">点击下方按钮将自动复制代码并打开登录页面</div>
            </div>
            
            <div class="code-display-large">
              <div class="code-label">登录代码</div>
              <div class="code-value-large">{{ deviceCodeData.user_code }}</div>
            </div>
            
            <div class="open-login-section">
              <button @click="copyAndOpen" class="btn-primary btn-block btn-large">
                <span>🚀</span> 复制代码并打开登录页面
              </button>
              <div class="open-hint">代码会自动复制，在新窗口中直接粘贴即可</div>
            </div>
            
            <div class="auth-waiting">
              <div class="waiting-spinner"></div>
              <div class="waiting-text">{{ authProgress }}</div>
            </div>
          </div>
        </div>
      </div>
      
      <!-- 离线登录弹窗 -->
      <div v-if="showOfflineLogin" class="modal-overlay" @click="showOfflineLogin = false">
        <div class="modal-content offline-login-modal" @click.stop>
          <div class="device-code-header">
            <div class="header-icon">👤</div>
            <div class="header-content">
              <h3>离线登录</h3>
              <p class="header-subtitle">使用自定义游戏名称进行游戏</p>
            </div>
            <button @click="showOfflineLogin = false" class="modal-close">×</button>
          </div>
          <div class="device-code-body">
            <div class="login-instruction">
              <div class="instruction-icon">ℹ️</div>
              <div class="instruction-text">输入一个游戏名称（3-16个字符）</div>
            </div>
            <div class="form-group">
              <label class="form-label">
                <span class="label-icon">✏️</span>
                游戏名称
              </label>
              <input 
                v-model="offlineName" 
                placeholder="输入游戏名称" 
                class="form-input"
                maxlength="16"
                @keyup.enter="confirmOfflineLogin"
              />
            </div>
            <button @click="confirmOfflineLogin" class="btn-success btn-block btn-large" style="margin-top: 20px;">
              <span>✅</span> 确认登录
            </button>
          </div>
        </div>
      </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch } from 'vue'
import { useAuth } from './composables/useAuth'
import { useToast } from './composables/useToast'
import { useBackend } from './composables/useBackend'
import Toast from './components/Toast.vue'
import Sidebar from './components/Sidebar.vue'
import LoadingPage from './components/LoadingPage.vue'

// 全局网络状态管理
import { provide } from 'vue'

const { accountInfo, offlineAccount, isAuthenticating, deviceCodeData, authProgress, loadAccountFromCache, loadOfflineFromCache, logout, logoutOffline } = useAuth()
const { toast, showToast } = useToast()
const { fetchApi, init: initBackend, isConnected: isBackendConnected, networkStatus } = useBackend()

const showOfflineLogin = ref(false)
const offlineName = ref('')

// 提供网络状态给所有子组件
provide('networkStatus', networkStatus)

// 监听连接状态，连接成功时加载数据
watch(isBackendConnected, (connected) => {
  if (connected) {
    loadAccountFromCache()
    loadOfflineFromCache()
  }
})

let pollInterval: ReturnType<typeof setInterval> | null = null

// 设备授权相关
async function startDeviceAuth() {
  isAuthenticating.value = true
  try {
    const r = await fetchApi('/api/auth/device-code')
    const result = await r.json()
    
    if (result.ok && result.data) {
      deviceCodeData.value = result.data
      startPolling()
    } else {
      showToast(result.error || '获取设备码失败', 'error')
    }
  } catch (e: any) {
    showToast(`请求失败: ${e.message}`, 'error')
  } finally {
    isAuthenticating.value = false
  }
}

function cancelDeviceAuth() {
  deviceCodeData.value = null
  stopPolling()
  authProgress.value = '等待授权...'
}

async function copyAndOpen() {
  if (!deviceCodeData.value) return
  
  try {
    await navigator.clipboard.writeText(deviceCodeData.value.user_code)
    window.open(deviceCodeData.value.verification_uri, '_blank')
    showToast('代码已复制到剪贴板！', 'success')
  } catch (e) {
    showToast('复制失败，请手动复制', 'error')
  }
}

function startPolling() {
  if (!deviceCodeData.value) return
  
  let pollCount = 0
  const maxPolls = Math.ceil(deviceCodeData.value.expires_in / 5)
  
  pollInterval = setInterval(async () => {
    if (pollCount >= maxPolls) {
      stopPolling()
      showToast('授权超时，请重新尝试', 'error')
      deviceCodeData.value = null
      return
    }
    
    pollCount++
    authProgress.value = `等待授权中... (${pollCount}/${maxPolls})`
    
    try {
      const r = await fetchApi('/api/auth/poll-device-token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ device_code: deviceCodeData.value.device_code })
      })
      
      const result = await r.json()
      
      if (result.ok && result.authenticated) {
        stopPolling()
        // 登录正版时，清除离线账号缓存
        if (offlineAccount.value) {
          await logoutOffline()
        }
        accountInfo.value = result.profile
        deviceCodeData.value = null
        authProgress.value = '等待授权...'
        showToast(`登录成功！欢迎 ${result.profile.name}`, 'success')
      } else if (result.error && result.error !== 'authorization_pending') {
        stopPolling()
        showToast(result.error, 'error')
        deviceCodeData.value = null
        authProgress.value = '等待授权...'
      }
    } catch (e: any) {
      console.error('轮询失败:', e)
    }
  }, 5000)
}

function stopPolling() {
  if (pollInterval) {
    clearInterval(pollInterval)
    pollInterval = null
  }
}

async function confirmOfflineLogin() {
  if (offlineName.value.length < 3 || offlineName.value.length > 16) {
    showToast('游戏名称长度必须在3-16个字符之间', 'error')
    return
  }
  
  try {
    const r = await fetchApi('/api/auth/save-offline', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: offlineName.value })
    })
    
    const result = await r.json()
    if (result.ok) {
      // 登录离线时，清除正版账号缓存
      if (accountInfo.value) {
        await logout()
      }
      offlineAccount.value = offlineName.value
      showOfflineLogin.value = false
      offlineName.value = ''
      showToast(`离线登录成功！`, 'success')
    }
  } catch (e: any) {
    showToast(`登录失败: ${e.message}`, 'error')
  }
}
// 预加载图标，避免每次切换页面时重新加载
function preloadIcons() {
  const icons = [
    '/icons/vanilla.png',
    '/icons/fabric.png',
    '/icons/forge.png',
    '/icons/neoforge.png',
    '/icons/optifine.png',
    '/icons/download.png',
    '/icons/mod.png',
    '/icons/modpack.png',
    '/icons/resourcepack.png',
    '/icons/shader.png',
    '/icons/construction.png',
    '/icons/game-download.png',
    '/icons/fluid.png',
    '/icons/drop.png',
    '/icons/good.png',
    '/icons/laggy.png'
  ]
  
  icons.forEach(src => {
    const img = new Image()
    img.src = src
  })
}

onMounted(() => {
  // 初始化后端连接
  initBackend()
  
  preloadIcons()
})

onUnmounted(() => {
  stopPolling()
})
</script>

<style>
/* ==================== 全局深色主题样式 ==================== */
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');

:root {
  /* 主色调 */
  --color-primary: #22c55e;
  --color-primary-hover: #16a34a;
  --color-primary-light: rgba(34, 197, 94, 0.15);
  
  /* 辅助色 */
  --color-blue: #3b82f6;
  --color-blue-hover: #2563eb;
  --color-cyan: #22d3ee;
  --color-orange: #f97316;
  --color-red: #ef4444;
  --color-yellow: #fbbf24;
  
  /* 背景色 */
  --bg-base: #0f172a;
  --bg-surface: #1e293b;
  --bg-elevated: #334155;
  --bg-card: rgba(30, 41, 59, 0.8);
  --bg-hover: rgba(148, 163, 184, 0.1);
  
  /* 文字色 */
  --text-primary: #f1f5f9;
  --text-secondary: #e2e8f0;
  --text-muted: #94a3b8;
  --text-subtle: #64748b;
  
  /* 边框 */
  --border-color: rgba(148, 163, 184, 0.15);
  --border-light: rgba(148, 163, 184, 0.1);
  
  /* 阴影 */
  --shadow-sm: 0 1px 2px rgba(0, 0, 0, 0.3);
  --shadow-md: 0 4px 12px rgba(0, 0, 0, 0.4);
  --shadow-lg: 0 8px 24px rgba(0, 0, 0, 0.5);
  --shadow-xl: 0 20px 40px rgba(0, 0, 0, 0.6);
  
  /* 圆角 */
  --radius-sm: 6px;
  --radius-md: 10px;
  --radius-lg: 14px;
  --radius-xl: 20px;
}

* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  background: var(--bg-base);
  color: var(--text-primary);
}

/* ==================== 应用布局 ==================== */
.app-layout {
  display: flex;
  min-height: 100vh;
  background: linear-gradient(135deg, var(--bg-base) 0%, #1a1f35 100%);
}

.main-content {
  flex: 1;
  margin-left: 260px;
  overflow-y: auto;
  padding: 28px;
  background: transparent;
}

/* ==================== 模态框样式 ==================== */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(15, 23, 42, 0.8);
  backdrop-filter: blur(8px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
  animation: fadeIn 0.2s ease;
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

.modal-content {
  background: linear-gradient(145deg, var(--bg-surface) 0%, var(--bg-base) 100%);
  border: 1px solid var(--border-light);
  border-radius: var(--radius-xl);
  max-width: 480px;
  width: 90%;
  max-height: 85vh;
  overflow-y: auto;
  box-shadow: var(--shadow-xl), 0 0 0 1px var(--border-light);
  animation: slideUp 0.3s ease;
}

@keyframes slideUp {
  from {
    opacity: 0;
    transform: translateY(20px) scale(0.98);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

.device-code-header {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 24px;
  border-bottom: 1px solid var(--border-light);
  background: linear-gradient(135deg, rgba(34, 197, 94, 0.08) 0%, transparent 100%);
}

.header-icon {
  font-size: 32px;
  filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.3));
}

.header-content {
  flex: 1;
}

.device-code-header h3 {
  font-size: 20px;
  font-weight: 700;
  color: var(--text-primary);
  margin: 0 0 4px 0;
  letter-spacing: -0.3px;
}

.header-subtitle {
  font-size: 13px;
  color: var(--text-muted);
  margin: 0;
}

.modal-close {
  width: 36px;
  height: 36px;
  border: none;
  border-radius: var(--radius-md);
  background: var(--bg-hover);
  color: var(--text-muted);
  font-size: 20px;
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  justify-content: center;
}

.modal-close:hover {
  background: rgba(239, 68, 68, 0.2);
  color: #f87171;
}

.device-code-body {
  padding: 24px;
}

.login-instruction {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px 16px;
  background: rgba(59, 130, 246, 0.1);
  border: 1px solid rgba(59, 130, 246, 0.2);
  border-radius: var(--radius-md);
  margin-bottom: 24px;
}

.instruction-icon {
  font-size: 22px;
}

.instruction-text {
  flex: 1;
  font-size: 14px;
  color: var(--text-secondary);
  line-height: 1.5;
}

.form-group {
  margin-bottom: 20px;
}

.form-label {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  color: var(--text-secondary);
  margin-bottom: 10px;
  font-weight: 500;
}

.label-icon {
  font-size: 16px;
}

.form-input {
  width: 100%;
  background: rgba(15, 23, 42, 0.6);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
  padding: 14px 16px;
  color: var(--text-primary);
  font-size: 15px;
  transition: all 0.2s ease;
}

.form-input:focus {
  outline: none;
  border-color: var(--color-primary);
  background: rgba(15, 23, 42, 0.8);
  box-shadow: 0 0 0 3px rgba(34, 197, 94, 0.15);
}

.code-display-large {
  text-align: center;
  padding: 24px;
  background: var(--bg-hover);
  border-radius: var(--radius-lg);
  margin-bottom: 24px;
}

.code-label {
  font-size: 13px;
  color: var(--text-muted);
  margin-bottom: 10px;
  text-transform: uppercase;
  letter-spacing: 1px;
}

.code-value-large {
  font-size: 36px;
  font-weight: 700;
  color: var(--color-cyan);
  letter-spacing: 6px;
  font-family: 'Consolas', 'Monaco', monospace;
  text-shadow: 0 0 20px rgba(34, 211, 238, 0.3);
}

.open-login-section {
  margin-bottom: 24px;
}

.open-hint {
  text-align: center;
  font-size: 13px;
  color: var(--text-subtle);
  margin-top: 12px;
}

/* 按钮样式 */
.btn-primary {
  background: linear-gradient(135deg, var(--color-blue) 0%, var(--color-blue-hover) 100%);
  color: white;
  border: none;
  border-radius: var(--radius-md);
  padding: 12px 24px;
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);
}

.btn-primary:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 16px rgba(59, 130, 246, 0.4);
}

.btn-primary:active {
  transform: translateY(0);
}

.btn-success {
  background: linear-gradient(135deg, var(--color-primary) 0%, var(--color-primary-hover) 100%);
  color: white;
  border: none;
  border-radius: var(--radius-md);
  padding: 12px 24px;
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  box-shadow: 0 4px 12px rgba(34, 197, 94, 0.3);
}

.btn-success:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 16px rgba(34, 197, 94, 0.4);
}

.btn-success:active {
  transform: translateY(0);
}

.btn-block {
  width: 100%;
}

.btn-large {
  padding: 16px 24px;
  font-size: 16px;
}

.auth-waiting {
  text-align: center;
  padding: 24px;
  background: var(--bg-hover);
  border-radius: var(--radius-md);
}

.waiting-spinner {
  width: 40px;
  height: 40px;
  margin: 0 auto 14px;
  border: 3px solid var(--border-color);
  border-top-color: var(--color-primary);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.waiting-text {
  font-size: 14px;
  color: var(--text-muted);
}

/* ==================== 表单样式 ==================== */
.form-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.form-label {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  font-weight: 600;
  color: var(--text-secondary);
}

.label-icon {
  font-size: 16px;
}

.form-input,
.form-select,
.form-textarea {
  width: 100%;
  padding: 14px 18px;
  background: rgba(15, 23, 42, 0.6);
  border: 2px solid var(--border-color);
  border-radius: var(--radius-md);
  font-size: 15px;
  color: var(--text-primary);
  font-family: inherit;
  transition: all 0.2s ease;
}

.form-input:focus,
.form-select:focus,
.form-textarea:focus {
  outline: none;
  border-color: var(--color-primary);
  box-shadow: 0 0 0 3px var(--color-primary-light);
}

.form-input::placeholder {
  color: var(--text-subtle);
}

.form-select {
  cursor: pointer;
  appearance: none;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%2394a3b8' d='M6 8L1 3h10z'/%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 16px center;
  padding-right: 40px;
}

.form-select option {
  background: var(--bg-surface);
  color: var(--text-primary);
}

/* ==================== 按钮样式 ==================== */
.btn-primary,
.btn-success,
.btn-secondary,
.btn-danger {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 12px 24px;
  border: none;
  border-radius: var(--radius-md);
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  font-family: inherit;
}

.btn-primary {
  background: linear-gradient(135deg, var(--color-blue) 0%, var(--color-blue-hover) 100%);
  color: white;
  box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);
}

.btn-primary:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: 0 6px 16px rgba(59, 130, 246, 0.4);
}

.btn-success {
  background: linear-gradient(135deg, var(--color-primary) 0%, var(--color-primary-hover) 100%);
  color: white;
  box-shadow: 0 4px 12px rgba(34, 197, 94, 0.3);
}

.btn-success:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: 0 6px 16px rgba(34, 197, 94, 0.4);
}

.btn-secondary {
  background: var(--bg-hover);
  color: var(--text-muted);
}

.btn-secondary:hover:not(:disabled) {
  background: var(--bg-elevated);
  color: var(--text-secondary);
}

.btn-danger {
  background: linear-gradient(135deg, var(--color-red) 0%, #dc2626 100%);
  color: white;
  box-shadow: 0 4px 12px rgba(239, 68, 68, 0.3);
}

.btn-danger:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: 0 6px 16px rgba(239, 68, 68, 0.4);
}

.btn-block {
  width: 100%;
}

.btn-large {
  padding: 16px 28px;
  font-size: 16px;
}

.btn-primary:disabled,
.btn-success:disabled,
.btn-secondary:disabled,
.btn-danger:disabled {
  opacity: 0.5;
  cursor: not-allowed;
  transform: none !important;
}

/* ==================== 卡片样式 ==================== */
.card {
  background: var(--bg-card);
  border: 1px solid var(--border-light);
  border-radius: var(--radius-lg);
  padding: 24px;
  backdrop-filter: blur(10px);
}

.card-header {
  margin-bottom: 20px;
  padding-bottom: 16px;
  border-bottom: 1px solid var(--border-light);
}

.card-title {
  font-size: 18px;
  font-weight: 700;
  color: var(--text-primary);
  display: flex;
  align-items: center;
  gap: 10px;
}

/* ==================== 滚动条样式 ==================== */
::-webkit-scrollbar {
  width: 8px;
  height: 8px;
}

::-webkit-scrollbar-track {
  background: rgba(148, 163, 184, 0.05);
  border-radius: 4px;
}

::-webkit-scrollbar-thumb {
  background: rgba(148, 163, 184, 0.2);
  border-radius: 4px;
}

::-webkit-scrollbar-thumb:hover {
  background: rgba(148, 163, 184, 0.3);
}

/* ==================== 响应式 ==================== */
@media (max-width: 768px) {
  .main-content {
    margin-left: 0;
    padding: 16px;
  }
}
</style>
