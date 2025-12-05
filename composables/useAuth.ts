import { ref } from 'vue'

// 单例状态（跨组件共享，不随 useAuth 调用而重复创建）
const accountInfo = ref<any>(null)
const offlineAccount = ref<string | null>(null)
const isAuthenticating = ref(false)
const deviceCodeData = ref<any>(null)
const authProgress = ref('等待授权...')

export const useAuth = () => {
  const { fetchApi } = useBackend()

  // 从缓存加载账号信息
  async function loadAccountFromCache() {
    try {
      const r = await fetchApi('/api/auth/profile-cache')
      const result = await r.json()
      if (result.ok && result.profile) {
        accountInfo.value = result.profile
      } else if (!result.ok) {
        accountInfo.value = null
      }
    } catch (e) {
      console.error('加载账号缓存失败:', e)
    }
  }

  // 从缓存加载离线账号
  async function loadOfflineFromCache() {
    try {
      const r = await fetchApi('/api/auth/offline-cache')
      const result = await r.json()
      if (result.ok && result.username) {
        offlineAccount.value = result.username
      } else if (!result.ok) {
        offlineAccount.value = null
      }
    } catch (e) {
      console.error('加载离线账号缓存失败:', e)
    }
  }

  // 登出（清理内存与后端缓存）
  async function logout() {
    accountInfo.value = null
    try {
      await fetchApi('/api/auth/clear-profile', { method: 'POST' })
    } catch (e) {
      console.error('清除账号缓存失败:', e)
    }
  }

  // 离线登出（清理内存与后端缓存）
  async function logoutOffline() {
    offlineAccount.value = null
    try {
      await fetchApi('/api/auth/clear-offline', { method: 'POST' })
    } catch (e) {
      console.error('清除离线账号缓存失败:', e)
    }
  }

  return {
    accountInfo,
    offlineAccount,
    isAuthenticating,
    deviceCodeData,
    authProgress,
    loadAccountFromCache,
    loadOfflineFromCache,
    logout,
    logoutOffline,
  }
}
