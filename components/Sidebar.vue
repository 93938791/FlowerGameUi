<template>
  <div class="sidebar">
    <div class="sidebar-header">
      <div class="logo">
        <img src="/icons/logo.png" alt="Logo" class="logo-icon-img" />
      </div>
    </div>
    
    <div class="menu-list">
      <NuxtLink
        v-for="item in menuItems" 
        :key="item.path"
        :to="item.path"
        :class="['menu-item']"
        active-class="active"
      >
        <img :src="item.icon" class="menu-icon-img" :alt="item.name" />
        <span class="menu-text">{{ item.name }}</span>
        <span class="menu-arrow">›</span>
      </NuxtLink>
    </div>
    
    <!-- 账号登录区域 -->
    <div class="sidebar-account">
      <!-- 登录状态显示 -->
      <div v-if="accountInfo || offlineAccount" class="account-card">
        <!-- 3D皮肤预览 -->
        <div class="skin-3d-preview">
          <img 
            v-if="accountInfo" 
            :src="getSkinUrl(accountInfo.id, 'full', 256)" 
            alt="3D皮肤" 
            class="skin-3d" 
          />
          <img 
            v-else-if="offlineAccount" 
            :src="getOfflineSkinUrl('full', 256)" 
            alt="默认皮肤" 
            class="skin-3d" 
          />
        </div>
        
        <div class="account-info">
          <div class="account-name">{{ accountInfo?.name || offlineAccount }}</div>
          <div class="account-badge" :class="accountInfo ? 'premium' : 'offline'">
            {{ accountInfo ? '✓ 正版' : '离线' }}
          </div>
        </div>
        
        <button @click="handleLogout" class="logout-btn">
          退出登录
        </button>
      </div>
      
      <!-- 登录按钮 -->
      <div v-else class="login-buttons">
        <button 
          @click="$emit('start-device-auth')" 
          class="sidebar-login-btn microsoft"
          :disabled="isAuthenticating"
        >
          <span class="btn-icon">🔐</span>
          <span class="btn-text">{{ isAuthenticating ? '请求中...' : '正版登录' }}</span>
        </button>
        <button @click="$emit('show-offline-login')" class="sidebar-login-btn offline">
          <span class="btn-icon">👤</span>
          <span class="btn-text">离线登录</span>
        </button>
      </div>
    </div>
    
    <div class="sidebar-footer">
      <!-- 登录状态 -->
      <div class="status-indicator">
        <span class="status-dot" :class="{
          'online': accountInfo || offlineAccount,
          'offline': !accountInfo && !offlineAccount
        }"></span>
        <span class="status-text">
          {{ accountInfo || offlineAccount ? '已登录' : '未登录' }}
        </span>
      </div>

      <!-- 网络连接状态 -->
      <div class="status-indicator">
        <span class="status-dot" :class="{
          'online': networkStatus?.connected,
          'offline': !networkStatus?.connected
        }"></span>
        <span class="status-text">
          {{ networkStatus?.connected ? '网络已连接' : '网络未连接' }}
        </span>
      </div>

      <!-- Net 类型显示 -->
      <div class="status-indicator" v-if="networkStatus?.connected">
        <span class="status-dot type-dot"></span>
        <span class="status-text" :title="'NAT类型: ' + (networkStatus?.nat_type || networkStatus?.net_type || '未知')">
          NAT类型: {{ getNatLabel(networkStatus?.nat_type || networkStatus?.net_type || '未知') }}
        </span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { inject } from 'vue'

const props = defineProps<{
  accountInfo: any
  offlineAccount: string | null
  isAuthenticating: boolean
}>()

// 注入全局网络状态
const networkStatus = inject('networkStatus') as any

const emit = defineEmits<{
  'start-device-auth': []
  'show-offline-login': []
  'logout': []
  'logout-offline': []
}>()

const menuItems = [
  { path: '/', name: '网络管理', icon: '/icons/网络.png' },
  { path: '/game', name: '游戏管理', icon: '/icons/游戏.png' },
  { path: '/resources', name: '资源下载', icon: '/icons/下载.png' },
  { path: '/sync', name: '存档同步', icon: '/icons/云同步.png' },
  { path: '/multiplayer', name: '游戏联机', icon: '/icons/联机.png' },
  { path: '/credits', name: '鸣谢', icon: '/icons/感谢.png' }
]

function getSkinUrl(uuid: string, type: string = 'face', size: number = 64): string {
  // 移除 UUID 中的连字符 (例如: "123e4567-e89b-12d3-a456-426614174000" -> "123e4567e89b12d3a456426614174000")
  const cleanUuid = uuid.replace(/-/g, '')
  // 使用 Visage API (更稳定的 3D 皮肤渲染)
  if (type === 'full') {
    return `https://visage.surgeplay.com/full/${size}/${cleanUuid}`
  }
  return `https://visage.surgeplay.com/face/${size}/${cleanUuid}`
}

function getOfflineSkinUrl(type: string = 'face', size: number = 64): string {
  const defaultUuid = '8667ba71b85a4004af54457a9734eed7' // Steve (无连字符)
  if (type === 'full') {
    return `https://visage.surgeplay.com/full/${size}/${defaultUuid}`
  }
  return `https://visage.surgeplay.com/face/${size}/${defaultUuid}`
}

function getNatLabel(natType: string): string {
  if (!natType || natType === '未知') return '未知'
  
  // 兼容后端新旧两种返回格式
  
  // 1. 后端已重启，返回 "NAT3 (Port Restricted)" 这种格式
  if (natType.startsWith('NAT')) {
    return natType.split('(')[0].trim()
  }
  
  // 2. 后端未重启，返回 "Restric Port NAT" 这种原始格式 -> 手动映射
  const mapping: Record<string, string> = {
    'Restric NAT': 'NAT2',
    'Restric Port NAT': 'NAT3',
    'Full Cone': 'NAT1',
    'Symmetric NAT': 'NAT4',
    'Symmetric UDP Firewall': '防火墙',
    'Open Internet': '公开',
    'Blocked': '受限'
  }
  
  return mapping[natType] || natType
}

function handleLogout() {
  if (props.accountInfo) {
    emit('logout')
  } else {
    emit('logout-offline')
  }
}
</script>

<style scoped>
/* 侧边栏样式 - 深色主题 */
.sidebar {
  width: 260px;
  background: linear-gradient(180deg, #1e293b 0%, #0f172a 100%);
  display: flex;
  flex-direction: column;
  box-shadow: 4px 0 20px rgba(0, 0, 0, 0.3);
  height: 100vh;
  position: fixed;
  left: 0;
  top: 0;
  border-right: 1px solid rgba(148, 163, 184, 0.08);
  z-index: 100;
}

.sidebar-header {
  padding: 28px 24px;
  border-bottom: 1px solid rgba(148, 163, 184, 0.08);
}

.logo {
  display: flex;
  align-items: center;
  gap: 12px;
  justify-content: center; /* 居中显示 logo */
}

.logo-icon-img {
  width: 200px;
  height: 150px;
  object-fit: contain;
  filter: drop-shadow(0 2px 4px rgba(34, 197, 94, 0.2));
}

.logo-text {
  font-size: 22px;
  font-weight: 700;
  background: linear-gradient(135deg, #22c55e 0%, #4ade80 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  letter-spacing: -0.5px;
}

.menu-list {
  flex: 1;
  padding: 16px 12px;
  overflow-y: auto;
}

.menu-item {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 14px 18px;
  color: #94a3b8;
  cursor: pointer;
  transition: all 0.2s ease;
  position: relative;
  margin: 6px 0;
  border-radius: 12px;
  text-decoration: none;
}

.menu-item:hover {
  background: rgba(148, 163, 184, 0.08);
  color: #e2e8f0;
}

.menu-item.active {
  background: linear-gradient(135deg, rgba(34, 197, 94, 0.15) 0%, rgba(34, 197, 94, 0.05) 100%);
  color: #22c55e;
}

.menu-item.active::before {
  content: '';
  position: absolute;
  left: 0;
  top: 50%;
  transform: translateY(-50%);
  width: 4px;
  height: 28px;
  background: linear-gradient(180deg, #22c55e 0%, #16a34a 100%);
  border-radius: 0 4px 4px 0;
}

.menu-icon {
  width: 50px;
  height: 50px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.menu-icon-img {
  width: 50px;
  height: 50px;
  object-fit: contain;
  opacity: 0.7;
  transition: all 0.3s ease;
  filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.2));
}

.menu-item.active .menu-icon-img,
.menu-item:hover .menu-icon-img {
  opacity: 1;
  transform: scale(1.1);
  filter: drop-shadow(0 4px 8px rgba(59, 130, 246, 0.4));
}

.menu-text {
  font-size: 14px;
  font-weight: 500;
  flex: 1;
}

.menu-arrow {
  font-size: 16px;
  opacity: 0;
  transform: translateX(-5px);
  transition: all 0.2s ease;
  color: #64748b;
}

.menu-item:hover .menu-arrow,
.menu-item.active .menu-arrow {
  opacity: 1;
  transform: translateX(0);
}

.menu-item.active .menu-arrow {
  color: #22c55e;
}

.sidebar-account {
  padding: 16px;
  border-top: 1px solid rgba(148, 163, 184, 0.08);
}

.account-card {
  background: linear-gradient(145deg, rgba(148, 163, 184, 0.08) 0%, rgba(148, 163, 184, 0.02) 100%);
  border: 1px solid rgba(148, 163, 184, 0.1);
  border-radius: 16px;
  padding: 16px;
  padding-top: 180px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  position: relative;
  overflow: hidden;
  min-height: 260px;
}

.skin-3d-preview {
  position: absolute;
  top: 8px;
  left: 50%;
  transform: translateX(-50%);
  width: 130px;
  height: 200px;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 0;
  pointer-events: none;
}

.skin-3d {
  width: auto;
  height: 100%;
  object-fit: contain;
  image-rendering: crisp-edges;
  filter: drop-shadow(0 8px 16px rgba(0, 0, 0, 0.5));
}

.account-info {
  text-align: center;
  width: 100%;
  position: relative;
  z-index: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  flex-wrap: wrap;
}

.account-name {
  color: #f1f5f9;
  font-size: 14px;
  font-weight: 600;
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.5);
  background: rgba(15, 23, 42, 0.7);
  padding: 6px 14px;
  border-radius: 8px;
  backdrop-filter: blur(5px);
  border: 1px solid rgba(148, 163, 184, 0.1);
}

.account-badge {
  display: inline-block;
  padding: 4px 10px;
  border-radius: 6px;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.3px;
}

.account-badge.premium {
  background: linear-gradient(135deg, #22c55e 0%, #16a34a 100%);
  color: white;
  box-shadow: 0 2px 8px rgba(34, 197, 94, 0.3);
}

.account-badge.offline {
  background: rgba(148, 163, 184, 0.2);
  color: #94a3b8;
}

.logout-btn {
  width: 100%;
  padding: 10px;
  border: 1px solid rgba(239, 68, 68, 0.3);
  border-radius: 10px;
  background: rgba(239, 68, 68, 0.1);
  color: #f87171;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  position: relative;
  z-index: 1;
}

.logout-btn:hover {
  background: rgba(239, 68, 68, 0.2);
  border-color: rgba(239, 68, 68, 0.5);
}

.login-buttons {
  display: flex;
  flex-direction: column;
  gap: 10px;
  position: relative;
  z-index: 1;
}

.sidebar-login-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  padding: 14px;
  border: none;
  border-radius: 12px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
}

.sidebar-login-btn.microsoft {
  background: linear-gradient(135deg, #22c55e 0%, #16a34a 100%);
  color: white;
  box-shadow: 0 4px 12px rgba(34, 197, 94, 0.3);
}

.sidebar-login-btn.microsoft:hover {
  transform: translateY(-1px);
  box-shadow: 0 6px 16px rgba(34, 197, 94, 0.4);
}

.sidebar-login-btn.offline {
  background: rgba(148, 163, 184, 0.1);
  border: 1px solid rgba(148, 163, 184, 0.15);
  color: #94a3b8;
}

.sidebar-login-btn.offline:hover {
  background: rgba(148, 163, 184, 0.15);
  color: #e2e8f0;
}

.sidebar-login-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
  transform: none !important;
}

.sidebar-footer {
  padding: 16px 20px;
  border-top: 1px solid rgba(148, 163, 184, 0.08);
  display: flex;
  flex-direction: column;
  gap: 10px;
  background: rgba(15, 23, 42, 0.5);
}

.status-indicator {
  display: flex;
  align-items: center;
  gap: 10px;
  color: #94a3b8;
  font-size: 13px;
}

.status-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #64748b;
  flex-shrink: 0;
}

.status-dot.online {
  background: #22c55e;
  box-shadow: 0 0 8px rgba(34, 197, 94, 0.5);
  animation: pulse 2s infinite;
}

.status-dot.offline {
  background: #64748b;
}

.status-dot.type-dot {
  background: #3b82f6;
  width: 6px;
  height: 6px;
}

@keyframes pulse {
  0%, 100% { 
    opacity: 1;
    box-shadow: 0 0 8px rgba(34, 197, 94, 0.5);
  }
  50% { 
    opacity: 0.7;
    box-shadow: 0 0 4px rgba(34, 197, 94, 0.3);
  }
}

.status-text {
  font-size: 13px;
  font-weight: 500;
}
</style>
