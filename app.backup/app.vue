<template>
  <ClientOnly>
    <div class="app-layout">
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
            <h3>🔐 Microsoft 登录</h3>
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
              <button @click="copyAndOpen" class="qq-btn qq-btn-success qq-btn-block qq-btn-large">
                🚀 复制代码并打开登录页面
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
            <h3>👤 离线登录</h3>
            <button @click="showOfflineLogin = false" class="modal-close">×</button>
          </div>
          <div class="device-code-body">
            <div class="login-instruction">
              <div class="instruction-icon">ℹ️</div>
              <div class="instruction-text">输入一个游戏名称（3-16个字符）</div>
            </div>
            <input 
              v-model="offlineName" 
              placeholder="输入游戏名称" 
              class="qq-input qq-input-large"
              maxlength="16"
              @keyup.enter="confirmOfflineLogin"
            />
            <button @click="confirmOfflineLogin" class="qq-btn qq-btn-success qq-btn-block qq-btn-large" style="margin-top: 16px;">
              ✅ 确认登录
            </button>
          </div>
        </div>
      </div>
    </div>
  </ClientOnly>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { useAuth } from '../composables/useAuth'
import { useToast } from '../composables/useToast'
import Toast from '../components/Toast.vue'
import Sidebar from '../components/Sidebar.vue'

const { accountInfo, offlineAccount, isAuthenticating, deviceCodeData, authProgress, loadAccountFromCache, loadOfflineFromCache, logout, logoutOffline } = useAuth()
const { toast, showToast } = useToast()

const showOfflineLogin = ref(false)
const offlineName = ref('')
const networkStatus = ref({
  running: false,
  connected: false,
  virtual_ip: '未连接'
})

let pollInterval: ReturnType<typeof setInterval> | null = null

// 设备授权相关
async function startDeviceAuth() {
  isAuthenticating.value = true
  try {
    const r = await fetch('/api/auth/device-code')
    const result = await r.json()
    
    if (result.ok && result.device_code) {
      deviceCodeData.value = result.device_code
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
      const r = await fetch('/api/auth/poll-device-token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ device_code: deviceCodeData.value.device_code })
      })
      
      const result = await r.json()
      
      if (result.ok && result.authenticated) {
        stopPolling()
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
    const r = await fetch('/api/auth/save-offline', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: offlineName.value })
    })
    
    const result = await r.json()
    if (result.ok) {
      offlineAccount.value = offlineName.value
      showOfflineLogin.value = false
      offlineName.value = ''
      showToast(`离线登录成功！`, 'success')
    }
  } catch (e: any) {
    showToast(`登录失败: ${e.message}`, 'error')
  }
}

onMounted(() => {
  loadAccountFromCache()
  loadOfflineFromCache()
})

onUnmounted(() => {
  stopPolling()
})
</script>

<style>
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen',
    'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue',
    sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

.app-layout {
  display: flex;
  height: 100vh;
  background: #f5f5f5;
}

.main-content {
  flex: 1;
  margin-left: 240px;
  overflow-y: auto;
  padding: 24px;
}

/* 模态框样式 */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
}

.modal-content {
  background: white;
  border-radius: 16px;
  max-width: 500px;
  width: 90%;
  max-height: 80vh;
  overflow-y: auto;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
}

.device-code-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 24px;
  border-bottom: 1px solid #e8e8e8;
}

.device-code-header h3 {
  font-size: 20px;
  color: #2c3e50;
  margin: 0;
}

.modal-close {
  background: none;
  border: none;
  font-size: 28px;
  color: #909399;
  cursor: pointer;
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  transition: all 0.3s ease;
}

.modal-close:hover {
  background: #f5f5f5;
  color: #606266;
}

.device-code-body {
  padding: 24px;
}

.login-instruction {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  background: #e8f4f8;
  border-radius: 8px;
  margin-bottom: 20px;
}

.instruction-icon {
  font-size: 24px;
}

.instruction-text {
  flex: 1;
  font-size: 14px;
  color: #606266;
}

.code-display-large {
  text-align: center;
  margin-bottom: 24px;
}

.code-label {
  font-size: 14px;
  color: #909399;
  margin-bottom: 8px;
}

.code-value-large {
  font-size: 32px;
  font-weight: 700;
  color: #00d9ff;
  letter-spacing: 4px;
  font-family: 'Courier New', monospace;
}

.open-login-section {
  margin-bottom: 24px;
}

.open-hint {
  text-align: center;
  font-size: 13px;
  color: #909399;
  margin-top: 12px;
}

.auth-waiting {
  text-align: center;
  padding: 20px;
  background: #f8f9fa;
  border-radius: 8px;
}

.waiting-spinner {
  width: 40px;
  height: 40px;
  margin: 0 auto 12px;
  border: 4px solid #e8e8e8;
  border-top-color: #00d9ff;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.waiting-text {
  font-size: 14px;
  color: #606266;
}

.qq-btn {
  border: none;
  border-radius: 6px;
  font-size: 14px;
  padding: 0 20px;
  height: 36px;
  cursor: pointer;
  transition: all 0.3s ease;
  font-family: inherit;
}

.qq-btn-success {
  background: #67c23a;
  color: white;
}

.qq-btn-success:hover {
  background: #5daf34;
}

.qq-btn-block {
  width: 100%;
}

.qq-btn-large {
  height: 48px;
  font-size: 16px;
  font-weight: 600;
}

.qq-input {
  width: 100%;
  padding: 12px 16px;
  border: 2px solid #e8e8e8;
  border-radius: 8px;
  font-size: 14px;
  font-family: inherit;
  transition: border-color 0.3s ease;
}

.qq-input:focus {
  outline: none;
  border-color: #00d9ff;
}

.qq-input-large {
  height: 48px;
  font-size: 16px;
}
</style>
