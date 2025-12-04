<template>
  <div class="network-page">
    <!-- 连接状态和节点管理并排显示 -->
    <div class="panel-row">
      <!-- 连接状态卡片 -->
      <div class="panel-section panel-half">
        <h3 class="section-title">连接状态</h3>
        <div class="status-card" :class="{ connected: networkStatus.connected }">
          <div class="status-icon">
            <span v-if="networkStatus.connected">✓</span>
            <span v-else>○</span>
          </div>
          <div class="status-info">
            <div class="status-label">{{ networkStatus.connected ? '已连接' : '未连接' }}</div>
            <div class="status-ip">虚拟IP: {{ networkStatus.virtual_ip }}</div>
          </div>
        </div>
      </div>

      <!-- 节点管理卡片 -->
      <div class="panel-section panel-half">
        <div class="section-header">
          <h3 class="section-title">节点管理</h3>
          <button @click="loadNodes" class="qq-btn qq-btn-small">刷新</button>
        </div>
        
        <div class="node-list-compact">
          <div v-if="nodeList.length === 0" class="empty-state-small">
            <p>暂无自定义节点</p>
          </div>
          <div v-else class="node-count">
            <span class="count-badge">{{ nodeList.length }}</span>
            <span class="count-text">个自定义节点</span>
          </div>
        </div>
        
        <div class="quick-actions">
          <button @click="showNodeModal = true" class="qq-btn qq-btn-primary qq-btn-block">管理节点</button>
        </div>
      </div>
    </div>

    <!-- 网络配置和流量统计 -->
    <div class="panel-row">
      <!-- 网络配置 -->
      <div class="panel-section panel-half">
        <h3 class="section-title">网络配置</h3>
        <div class="config-form">
          <div class="form-row">
            <label class="form-label">
              <img src="/icons/房间.png" class="label-icon-img" alt="房间" />
              房间名称
            </label>
            <input 
              v-model="networkConfig.network_name" 
              placeholder="输入房间名称"
              class="qq-input"
            />
          </div>
          <div class="form-row">
            <label class="form-label">
              <img src="/icons/密码.png" class="label-icon-img" alt="密码" />
              房间密码
            </label>
            <input 
              v-model="networkConfig.network_secret" 
              type="password"
              placeholder="输入房间密码"
              class="qq-input"
            />
          </div>
          <div class="button-group">
            <button 
              @click="connectNetwork" 
              class="qq-btn qq-btn-primary" 
              :disabled="networkStatus.connected || isConnecting || nodeList.length === 0"
              :title="nodeList.length === 0 ? '请先添加节点' : ''"
            >
              {{ isConnecting ? '连接中...' : (networkStatus.connected ? '已连接' : '连接房间') }}
            </button>
            <button 
              @click="disconnectNetwork" 
              class="qq-btn qq-btn-danger" 
              :disabled="!networkStatus.connected || isDisconnecting"
            >
              {{ isDisconnecting ? '断开中...' : '断开连接' }}
            </button>
          </div>
        </div>
      </div>

      <!-- 流量统计 -->
      <div class="panel-section panel-half">
        <h3 class="section-title">流量统计</h3>
        <div class="traffic-stats">
          <div class="traffic-item upload">
            <img src="/icons/上行.png" class="traffic-icon-img" alt="上传" />
            <div class="traffic-info">
              <div class="traffic-label">上传</div>
              <div class="traffic-value">{{ formatBytes(trafficStats.tx_bytes) }}</div>
              <div class="traffic-speed">{{ formatSpeed(trafficStats.tx_speed) }}</div>
            </div>
          </div>
          <div class="traffic-divider"></div>
          <div class="traffic-item download">
            <img src="/icons/下行.png" class="traffic-icon-img" alt="下载" />
            <div class="traffic-info">
              <div class="traffic-label">下载</div>
              <div class="traffic-value">{{ formatBytes(trafficStats.rx_bytes) }}</div>
              <div class="traffic-speed">{{ formatSpeed(trafficStats.rx_speed) }}</div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 在线设备列表 -->
    <div class="panel-section">
      <h3 class="section-title">在线设备</h3>
      <div v-if="peers.length === 0" class="empty-state">
        <p>暂无在线设备</p>
      </div>
      <div v-else class="device-list">
        <div v-for="peer in peers" :key="peer.ipv4 + peer.hostname" class="device-item">
          <div class="device-info">
            <img :src="getLatencyIcon(peer.latency)" class="device-icon" alt="延迟图标" />
            <div>
              <div class="device-name">{{ peer.hostname || '未知设备' }}</div>
              <div class="device-ip">{{ peer.ipv4 }}</div>
            </div>
          </div>
          <div class="device-status">
            <span class="device-latency">{{ peer.latency }}ms</span>
          </div>
        </div>
      </div>
    </div>

    <!-- 节点管理模态框 -->
    <div v-if="showNodeModal" class="modal-overlay" @click="showNodeModal = false">
      <div class="modal-content" @click.stop>
        <div class="modal-header">
          <h3>节点管理</h3>
          <button @click="showNodeModal = false" class="modal-close">×</button>
        </div>
        
        <div class="modal-body">
          <div class="node-list">
            <div v-if="nodeList.length === 0" class="empty-state">
              <p>暂无自定义节点</p>
            </div>
            <div v-else>
              <div v-for="(node, index) in nodeList" :key="index" class="node-item">
                <div class="node-content">
                  <div class="node-icon">🌐</div>
                  <div class="node-address">{{ node }}</div>
                </div>
                <button @click.stop="removeNode(node)" class="qq-btn qq-btn-danger qq-btn-small">删除</button>
              </div>
            </div>
          </div>
          
          <div class="add-node-form">
            <input 
              v-model="newNodeAddress" 
              placeholder="输入节点地址，如: tcp://example.com:11010"
              class="qq-input"
              @keyup.enter="addNode"
            />
            <button @click="addNode" class="qq-btn qq-btn-primary">添加节点</button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed } from 'vue'
import { useToast } from '../composables/useToast'
import { useBackend } from '../composables/useBackend'

const { showToast } = useToast()
const { fetchApi, init, networkStatus, peers, traffic: trafficData } = useBackend()

const networkConfig = ref({
  network_name: '',
  network_secret: '',
  peers: [] as string[]
})

const nodeList = ref<string[]>([])
const newNodeAddress = ref('')
const showNodeModal = ref(false)

const trafficStats = computed(() => trafficData.value || {
  tx_bytes: 0,
  rx_bytes: 0,
  tx_speed: 0,
  rx_speed: 0
})

const isConnecting = ref(false)
const isDisconnecting = ref(false)

async function connectNetwork() {
  if (!networkConfig.value.network_name || !networkConfig.value.network_secret) {
    showToast('请输入房间名称和密码', 'error')
    return
  }

  // 再次检查节点（防止绕过 UI）
  if (nodeList.value.length === 0) {
    showToast('请至少添加一个节点', 'error')
    return
  }

  isConnecting.value = true
  try {
    const r = await fetchApi('/api/easytier/start', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        network_name: networkConfig.value.network_name,
        network_secret: networkConfig.value.network_secret,
        peers: nodeList.value
      })
    })

    const result = await r.json()
    if (result.ok) {
      showToast('连接成功！', 'success')
    } else {
      showToast(result.error || '连接失败', 'error')
    }
  } catch (e: any) {
    showToast(`连接失败: ${e.message}`, 'error')
  } finally {
    isConnecting.value = false
  }
}

async function disconnectNetwork() {
  isDisconnecting.value = true
  try {
    const r = await fetchApi('/api/easytier/stop', { method: 'POST' })
    const result = await r.json()
    
    if (result.ok) {
      // 广播状态更新给 App.vue (进而更新 Sidebar)
      if (typeof window !== 'undefined') {
        const event = new CustomEvent('easytier-update', { 
          detail: {
            running: false,
            connected: false,
            virtual_ip: '未连接'
          }
        })
        window.dispatchEvent(event)
      }
      
      showToast('已断开连接', 'info')
    } else {
      showToast(result.error || '断开失败', 'error')
    }
  } catch (e: any) {
    showToast(`断开失败: ${e.message}`, 'error')
  } finally {
    isDisconnecting.value = false
  }
}

async function loadNodes() {
  try {
    const r = await fetchApi('/api/easytier/nodes')
    const result = await r.json()
    if (Array.isArray(result.nodes)) {
      nodeList.value = result.nodes
    }
  } catch (e: any) {
    console.error('加载节点失败:', e)
  }
}

async function addNode() {
  if (!newNodeAddress.value.trim()) {
    showToast('请输入节点地址', 'error')
    return
  }

  try {
    const r = await fetchApi('/api/easytier/nodes/add', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ node: newNodeAddress.value.trim() })
    })

    const result = await r.json()
    if (result.ok) {
      nodeList.value.push(newNodeAddress.value.trim())
      newNodeAddress.value = ''
      showToast('节点添加成功', 'success')
    } else {
      showToast(result.error || '添加失败', 'error')
    }
  } catch (e: any) {
    showToast(`添加失败: ${e.message}`, 'error')
  }
}

async function removeNode(node: string) {
  try {
    const r = await fetchApi('/api/easytier/nodes/remove', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ node })
    })

    const result = await r.json()
    if (result.ok) {
      nodeList.value = nodeList.value.filter(n => n !== node)
      showToast('节点删除成功', 'success')
    } else {
      showToast(result.error || '删除失败', 'error')
    }
  } catch (e: any) {
    showToast(`删除失败: ${e.message}`, 'error')
  }
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i]
}

function formatSpeed(speed: number): string {
  return formatBytes(speed) + '/s'
}

function getLatencyIcon(latency: number): string {
  if (latency < 0 || latency === null || latency === undefined) {
    return '/icons/drop.png'  // 断开或未知
  } else if (latency < 50) {
    return '/icons/good.png'  // 良好：< 50ms
  } else if (latency < 150) {
    return '/icons/fluid.png'  // 流畅：50-150ms
  } else {
    return '/icons/laggy.png'  // 卡顿：>= 150ms
  }
}

onMounted(() => {
  init()
  loadNodes()
})
</script>

<style scoped>
/* ==================== 深色主题网络管理页面样式 ==================== */
.network-page {
  width: 100%;
}

.panel-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px;
  margin-bottom: 20px;
}

.panel-section {
  background: rgba(30, 41, 59, 0.6);
  border: 1px solid rgba(148, 163, 184, 0.1);
  border-radius: 16px;
  padding: 24px;
  backdrop-filter: blur(10px);
}

.panel-half {
  width: 100%;
}

.section-title {
  font-size: 18px;
  font-weight: 700;
  color: #f1f5f9;
  margin: 0 0 20px 0;
  padding-bottom: 14px;
  border-bottom: 2px solid #22c55e;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.status-card {
  display: flex;
  align-items: center;
  gap: 20px;
  padding: 24px;
  background: rgba(148, 163, 184, 0.05);
  border: 1px solid rgba(148, 163, 184, 0.1);
  border-radius: 14px;
  transition: all 0.2s ease;
}

.status-card.connected {
  background: rgba(34, 197, 94, 0.1);
  border-color: rgba(34, 197, 94, 0.3);
}

.status-icon {
  width: 60px;
  height: 60px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(15, 23, 42, 0.6);
  border-radius: 50%;
  font-size: 28px;
  border: 1px solid rgba(148, 163, 184, 0.1);
}

.status-card.connected .status-icon {
  background: rgba(34, 197, 94, 0.2);
  border-color: rgba(34, 197, 94, 0.3);
}

.status-info {
  flex: 1;
}

.status-label {
  font-size: 18px;
  font-weight: 700;
  color: #f1f5f9;
  margin-bottom: 8px;
}

.status-card.connected .status-label {
  color: #4ade80;
}

.status-ip {
  font-size: 14px;
  color: #94a3b8;
}

.node-list-compact {
  padding: 16px;
  background: rgba(148, 163, 184, 0.05);
  border: 1px solid rgba(148, 163, 184, 0.08);
  border-radius: 10px;
  margin-bottom: 16px;
}

.empty-state-small {
  text-align: center;
  color: #64748b;
  font-size: 14px;
}

.node-count {
  display: flex;
  align-items: center;
  gap: 10px;
}

.count-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 34px;
  height: 34px;
  background: linear-gradient(135deg, #22c55e 0%, #16a34a 100%);
  color: white;
  border-radius: 50%;
  font-weight: 700;
  box-shadow: 0 4px 12px rgba(34, 197, 94, 0.3);
}

.count-text {
  color: #94a3b8;
}

.quick-actions {
  margin-top: 16px;
}

.config-form {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.form-row {
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
  color: #e2e8f0;
}

.label-icon-img {
  width: 20px;
  height: 20px;
  object-fit: contain;
  filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.2));
}

.button-group {
  display: flex;
  gap: 12px;
}

.traffic-stats {
  display: flex;
  align-items: center;
  gap: 20px;
  padding: 20px;
  background: rgba(148, 163, 184, 0.05);
  border: 1px solid rgba(148, 163, 184, 0.08);
  border-radius: 14px;
}

.traffic-item {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 16px;
}

.traffic-icon-img {
  width: 40px;
  height: 40px;
  object-fit: contain;
  filter: drop-shadow(0 4px 8px rgba(0, 0, 0, 0.3));
}

.traffic-info {
  flex: 1;
}

.traffic-label {
  font-size: 13px;
  color: #64748b;
  margin-bottom: 4px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.traffic-value {
  font-size: 20px;
  font-weight: 700;
  color: #f1f5f9;
}

.traffic-speed {
  font-size: 13px;
  color: #94a3b8;
}

.traffic-divider {
  width: 2px;
  height: 60px;
  background: rgba(148, 163, 184, 0.15);
  border-radius: 1px;
}

.device-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.device-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px;
  background: rgba(148, 163, 184, 0.05);
  border: 1px solid rgba(148, 163, 184, 0.1);
  border-radius: 12px;
  transition: all 0.2s ease;
}

.device-item:hover {
  background: rgba(148, 163, 184, 0.08);
}

.device-info {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 14px;
}

.device-icon {
  width: 56px;
  height: 56px;
  object-fit: contain;
}

.device-name {
  font-size: 16px;
  font-weight: 700;
  color: #f1f5f9;
  margin-bottom: 4px;
}

.device-ip {
  font-size: 14px;
  color: #94a3b8;
  font-family: 'Consolas', monospace;
}

.device-latency {
  font-size: 14px;
  font-weight: 600;
  color: #4ade80;
}

.empty-state {
  text-align: center;
  padding: 40px;
  color: #64748b;
}

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
}

.modal-content {
  background: linear-gradient(145deg, #1e293b 0%, #0f172a 100%);
  border: 1px solid rgba(148, 163, 184, 0.1);
  border-radius: 20px;
  max-width: 600px;
  width: 90%;
  max-height: 80vh;
  overflow-y: auto;
  box-shadow: 0 25px 50px rgba(0, 0, 0, 0.5);
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 24px;
  border-bottom: 1px solid rgba(148, 163, 184, 0.1);
}

.modal-header h3 {
  color: #f1f5f9;
  font-weight: 700;
}

.modal-close {
  width: 36px;
  height: 36px;
  background: rgba(148, 163, 184, 0.1);
  border: none;
  border-radius: 10px;
  font-size: 20px;
  cursor: pointer;
  color: #94a3b8;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
}

.modal-close:hover {
  background: rgba(239, 68, 68, 0.2);
  color: #f87171;
}

.modal-body {
  padding: 24px;
}

.node-list {
  margin-bottom: 20px;
}

.node-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 16px;
  background: rgba(148, 163, 184, 0.05);
  border: 1px solid rgba(148, 163, 184, 0.08);
  border-radius: 10px;
  margin-bottom: 10px;
  transition: all 0.2s ease;
}

.node-item:hover {
  background: rgba(148, 163, 184, 0.08);
}

.node-content {
  display: flex;
  align-items: center;
  gap: 12px;
  flex: 1;
}

.node-icon {
  font-size: 20px;
}

.node-address {
  font-size: 14px;
  color: #e2e8f0;
  font-family: 'Consolas', monospace;
}

.add-node-form {
  display: flex;
  gap: 12px;
  margin-top: 20px;
}

.qq-input {
  flex: 1;
  padding: 14px 18px;
  border: 2px solid rgba(148, 163, 184, 0.15);
  border-radius: 10px;
  font-size: 14px;
  font-family: inherit;
  background: rgba(15, 23, 42, 0.6);
  color: #f1f5f9;
  transition: all 0.2s ease;
}

.qq-input::placeholder {
  color: #64748b;
}

.qq-input:focus {
  outline: none;
  border-color: #22c55e;
  box-shadow: 0 0 0 3px rgba(34, 197, 94, 0.15);
}

.qq-btn {
  border: none;
  border-radius: 10px;
  font-size: 14px;
  padding: 0 22px;
  height: 44px;
  cursor: pointer;
  transition: all 0.2s ease;
  font-family: inherit;
  font-weight: 600;
  background: rgba(148, 163, 184, 0.1);
  color: #94a3b8;
}

.qq-btn:hover:not(:disabled) {
  background: rgba(148, 163, 184, 0.2);
  color: #e2e8f0;
}

.qq-btn-primary {
  background: linear-gradient(135deg, #22c55e 0%, #16a34a 100%);
  color: white;
  box-shadow: 0 4px 12px rgba(34, 197, 94, 0.3);
}

.qq-btn-primary:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: 0 6px 16px rgba(34, 197, 94, 0.4);
}

.qq-btn-danger {
  background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
  color: white;
  box-shadow: 0 4px 12px rgba(239, 68, 68, 0.3);
}

.qq-btn-danger:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: 0 6px 16px rgba(239, 68, 68, 0.4);
}

.qq-btn-small {
  height: 36px;
  padding: 0 16px;
  font-size: 13px;
}

.qq-btn-block {
  width: 100%;
}

.qq-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
  transform: none !important;
}
</style>
