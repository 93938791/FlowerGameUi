import { ref } from 'vue'

export const useAuth = () => {
  const { fetchApi } = useBackend()
  
  const accountInfo = ref<any>(null)
  const offlineAccount = ref<string | null>(null)
  const isAuthenticating = ref(false)
  const deviceCodeData = ref<any>(null)
  const authProgress = ref('等待授权...')

  // 从缓存加载账号信息
  async function loadAccountFromCache() {
    try {
      const r = await fetchApi('/api/auth/profile-cache')
      const result = await r.json()
      if (result.ok && result.profile) {
        accountInfo.value = result.profile
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
      }
    } catch (e) {
      console.error('加载离线账号缓存失败:', e)
    }
  }

  // 登出
  function logout() {
    accountInfo.value = null
    clearAccountCache()
  }

  // 离线登出
  function logoutOffline() {
    offlineAccount.value = null
    clearOfflineCache()
  }

  // 清除账号缓存
  async function clearAccountCache() {
    try {
      await fetchApi('/api/auth/clear-profile', { method: 'POST' })
    } catch (e) {
      console.error('清除账号缓存失败:', e)
    }
  }

  // 清除离线账号缓存
  async function clearOfflineCache() {
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
