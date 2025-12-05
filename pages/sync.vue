<template>
  <div class="sync-page">
    <!-- EasyTier 未连接提示 -->
    <div v-if="!networkStatus.connected" class="not-connected-overlay">
      <div class="overlay-content">
        <div class="warning-icon">⚠️</div>
        <h3>未连接到 EasyTier 网络</h3>
        <p>存档同步功能依赖 EasyTier 虚拟网络。请先启动联机服务。</p>
        <NuxtLink to="/" class="qq-btn qq-btn-primary mt-4">
          前往启动 EasyTier
        </NuxtLink>
      </div>
    </div>

    <!-- 顶部操作栏 -->
    <div class="panel-section action-bar" :class="{ blurred: !networkStatus.connected }">
      <div class="header-content">
        <h3 class="section-title mb-0">☁️ 存档同步中心</h3>
        <p class="header-desc">在 EasyTier 网络中分享和同步您的 Minecraft 存档</p>
      </div>
      <button @click="openShareModal" class="qq-btn qq-btn-primary share-btn" :disabled="!networkStatus.connected">
        <span class="btn-icon">📤</span>
        同步我的存档
      </button>
    </div>

    <!-- 网络分享列表 -->
    <div class="panel-section" :class="{ blurred: !networkStatus.connected }">
      <div class="section-header">
        <h3 class="section-title">🌐 发现新存档</h3>
        <button @click="refreshNetworkShares" class="refresh-btn" :class="{ spinning: loadingShares }" :disabled="!networkStatus.connected">
          🔄
        </button>
      </div>
      
      <div v-if="loadingShares" class="loading-state">
        <div class="spinner"></div>
        <span>正在扫描网络分享...</span>
      </div>
      
      <div v-else-if="networkShares.length === 0" class="empty-state">
        <span class="empty-icon">📭</span>
        <span>当前网络中没有发现新存档</span>
        <span class="sub-text">已同步的存档请在下方"我的同步"中查看</span>
      </div>
      
      <div v-else class="shares-grid">
        <div v-for="share in networkShares" :key="share.folder_id" class="share-card">
          <div class="share-header">
            <div class="device-info">
              <span class="device-icon">💻</span>
              <span class="device-name">{{ share.device_name }}</span>
              <span class="device-ip">{{ share.device_ip }}</span>
            </div>
            <div class="share-status">
              <!-- 既然能显示出来，肯定未连接 -->
              可下载
            </div>
          </div>
          
          <div class="share-body">
            <div class="folder-icon">📁</div>
            <div class="folder-info">
              <div class="folder-label">{{ share.folder_label }}</div>
              <div class="folder-id">ID: {{ share.folder_id }}</div>
            </div>
          </div>
          
          <div class="share-actions">
            <button 
              @click="openConnectModal(share)" 
              class="qq-btn qq-btn-sm qq-btn-secondary"
            >
              📥 下载并同步
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- 本地同步状态 -->
    <div class="panel-section" :class="{ blurred: !networkStatus.connected }">
      <div class="section-header">
        <h3 class="section-title">📂 我的同步</h3>
        <div class="status-badge" :class="{ active: syncStatus.running }">
          <span class="status-dot"></span>
          {{ syncStatus.running ? '服务运行中' : '服务已停止' }}
        </div>
      </div>
      
      <div class="local-shares-list">
        <div v-for="folder in syncStatus.folders" :key="folder.id" class="local-share-item">
          <div class="item-icon">🔄</div>
          <div class="item-details">
            <div class="item-name">{{ folder.label }}</div>
            <div class="item-path">{{ folder.path }}</div>
          </div>
          <div class="item-status">
            <span class="status-tag" :class="folder.paused ? 'paused' : 'synced'">
              {{ folder.paused ? '⏸️ 已暂停' : '✅ 同步中' }}
            </span>
          </div>
        </div>
        
        <div v-if="syncStatus.folders.length === 0" class="empty-local">
          <span>暂无正在同步的目录</span>
        </div>
      </div>
    </div>

    <!-- 分享存档模态框 -->
    <Teleport to="body">
      <div v-if="showShareModal" class="modal-overlay" @click.self="closeShareModal">
        <div class="modal-container">
          <div class="modal-header">
            <h3>📤 选择要同步的存档</h3>
            <button class="close-btn" @click="closeShareModal">×</button>
          </div>
          
          <div class="modal-body">
            <div v-if="loadingSaves" class="loading-state small">
              <div class="spinner"></div>
              <span>加载存档中...</span>
            </div>
            
            <div v-else-if="localSaves.length === 0" class="empty-state small">
              <span>没有找到本地存档</span>
            </div>
            
            <div v-else class="saves-list">
              <div 
                v-for="save in localSaves" 
                :key="save.path" 
                class="save-item"
                :class="{ selected: selectedSave === save, shared: save.is_shared }"
                @click="!save.is_shared && selectSave(save)"
              >
                <div class="save-info">
                  <div class="save-name">{{ save.name }}</div>
                  <div class="save-version">版本: {{ save.version_id }}</div>
                  <div class="save-time">{{ formatDate(save.last_modified) }}</div>
                </div>
                <div class="save-check">
                  <span v-if="save.is_shared" class="shared-badge">已分享</span>
                  <span v-else-if="selectedSave === save" class="check-mark">✓</span>
                </div>
              </div>
            </div>
          </div>
          
          <div class="modal-footer">
            <button class="qq-btn qq-btn-ghost" @click="closeShareModal">取消</button>
            <button 
              class="qq-btn qq-btn-primary" 
              :disabled="!selectedSave || submitting"
              @click="confirmShare"
            >
              {{ submitting ? '提交中...' : '确定分享' }}
            </button>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- 连接同步模态框 -->
    <Teleport to="body">
      <div v-if="showConnectModal" class="modal-overlay" @click.self="closeConnectModal">
        <div class="modal-container">
          <div class="modal-header">
            <h3>📥 连接同步存档</h3>
            <button class="close-btn" @click="closeConnectModal">×</button>
          </div>
          
          <div class="modal-body">
            <div class="form-group">
              <label>远程存档</label>
              <div class="info-box">
                <div><strong>名称:</strong> {{ targetShare?.folder_label }}</div>
                <div><strong>来源:</strong> {{ targetShare?.device_name }} ({{ targetShare?.device_ip }})</div>
              </div>
            </div>
            
            <div class="form-group">
              <label>选择本地存放位置</label>
              <div class="input-group">
                <input type="text" v-model="connectLocalPath" placeholder="输入本地目录路径，例如 C:\\Users\\你的用户名\\AppData\\Roaming\\.minecraft\\versions\\1.20.1\\saves\\存档名">
                <button @click="openDirPicker" class="qq-btn qq-btn-sm">📂 选择目录</button>
              </div>
              <p class="hint">提示：如果浏览器无法获取绝对路径，请手动填写完整路径。</p>
            </div>
          </div>
          
          <div class="modal-footer">
            <button class="qq-btn qq-btn-ghost" @click="closeConnectModal">取消</button>
            <button 
              class="qq-btn qq-btn-primary" 
              :disabled="!connectLocalPath || submitting"
              @click="confirmConnect"
            >
              {{ submitting ? '连接中...' : '开始同步' }}
            </button>
          </div>
        </div>
      </div>
    </Teleport>
    <DirectoryPickerWin :visible="directoryPickerVisible" :initial-path="connectLocalPath" @update:visible="(v)=> directoryPickerVisible = v" @confirm="onDirSelected" />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import DirectoryPickerWin from '../components/DirectoryPickerWin.vue'
import { useBackend } from '../composables/useBackend'
import { useToast } from '../composables/useToast'

const { fetchApi, networkStatus } = useBackend()
const { showToast } = useToast()

// 状态
const loadingShares = ref(false)
const networkShares = ref<any[]>([])
const syncStatus = ref({ running: false, folders: [] as any[] })

const showShareModal = ref(false)
const loadingSaves = ref(false)
const localSaves = ref<any[]>([])
const selectedSave = ref<any>(null)

const showConnectModal = ref(false)
const targetShare = ref<any>(null)
const connectLocalPath = ref('')
// const localVersions = ref<string[]>([])
// const selectedVersion = ref('')

const submitting = ref(false)

// 初始化
onMounted(() => {
  refreshNetworkShares()
  refreshSyncStatus()
  // 定期刷新状态
  setInterval(refreshSyncStatus, 5000)
})

// 获取网络分享
async function refreshNetworkShares() {
  loadingShares.value = true
  try {
    const r = await fetchApi('/api/sync/peers')
    const res = await r.json()
    if (res.ok) {
      networkShares.value = res.shares
    }
  } catch (e) {
    console.error(e)
  } finally {
    loadingShares.value = false
  }
}

// 获取同步状态
async function refreshSyncStatus() {
  try {
    const r = await fetchApi('/api/sync/status')
    const res = await r.json()
    if (res.ok) {
      syncStatus.value = {
        running: !!res.running,
        folders: res.folders || []
      }
    } else {
      syncStatus.value.running = false
    }
  } catch (e) {
    syncStatus.value.running = false
  }
}

// 打开分享模态框
async function openShareModal() {
  showShareModal.value = true
  loadingSaves.value = true
  localSaves.value = []
  selectedSave.value = null
  
  try {
    const r = await fetchApi('/api/sync/local_saves')
    const res = await r.json()
    if (res.ok) {
      localSaves.value = res.saves
    }
  } catch (e: any) {
    showToast(`加载存档失败: ${e.message}`, 'error')
  } finally {
    loadingSaves.value = false
  }
}

function closeShareModal() {
  showShareModal.value = false
}

function selectSave(save: any) {
  selectedSave.value = save
}

async function confirmShare() {
  if (!selectedSave.value) return
  
  submitting.value = true
  try {
    const r = await fetchApi('/api/sync/share', {
      method: 'POST',
      body: JSON.stringify({
        version_id: selectedSave.value.version_id,
        save_name: selectedSave.value.name,
        save_path: selectedSave.value.path
      })
    })
    const res = await r.json()
    if (res.ok) {
      showToast('分享成功', 'success')
      closeShareModal()
      refreshSyncStatus()
    } else {
      showToast(res.error || '分享失败', 'error')
    }
  } catch (e: any) {
    showToast(`分享失败: ${e.message}`, 'error')
  } finally {
    submitting.value = false
  }
}

// 打开连接模态框
function openConnectModal(share: any) {
  targetShare.value = share
  showConnectModal.value = true
  connectLocalPath.value = ''
}

function closeConnectModal() {
  showConnectModal.value = false
  targetShare.value = null
}

const directoryPickerVisible = ref(false)
function openDirPicker(){ directoryPickerVisible.value = true }
function onDirSelected(path: string){ connectLocalPath.value = path; directoryPickerVisible.value = false }


async function confirmConnect() {
  if (!targetShare.value || !connectLocalPath.value) return
  
  submitting.value = true
  try {
    const r = await fetchApi('/api/sync/connect', {
      method: 'POST',
      body: JSON.stringify({
        device_id: targetShare.value.device_id,
        device_ip: targetShare.value.device_ip,
        device_name: targetShare.value.device_name,
        folder_id: targetShare.value.folder_id,
        folder_label: targetShare.value.folder_label,
        local_path: connectLocalPath.value
      })
    })
    const res = await r.json()
    if (res.ok) {
      showToast('连接成功，开始同步', 'success')
      closeConnectModal()
      refreshSyncStatus()
      refreshNetworkShares()
    } else {
      showToast(res.error || '连接失败', 'error')
    }
  } catch (e: any) {
    showToast(`连接失败: ${e.message}`, 'error')
  } finally {
    submitting.value = false
  }
}

async function startSyncthing() {
  try {
    const r = await fetchApi('/api/syncthing/start', { method: 'POST' })
    const res = await r.json()
    if (res.ok) {
      showToast('Syncthing 已启动', 'success')
      refreshSyncStatus()
      refreshNetworkShares()
    } else {
      showToast(res.error || '启动失败', 'error')
    }
  } catch (e: any) {
    showToast(`启动失败: ${e.message}`, 'error')
  }
}

// 工具函数
function formatDate(timestamp: number) {
  return new Date(timestamp * 1000).toLocaleString()
}

function getSaveIconUrl(save: any) {
  // 这里需要后端提供一个 serving static file 的接口，或者直接读取
  // 由于是本地应用，可以直接用 file:// 吗？不行，浏览器安全限制。
  // 我们需要后端 API 返回图片内容或者 URL。
  // 暂时返回空或默认图标
  return '' 
}
</script>

<style scoped>
.sync-page {
  width: 100%;
  max-width: 1200px;
  margin: 0 auto;
  position: relative; /* 为绝对定位的 overlay 提供基准 */
  min-height: 600px; /* 确保最小高度 */
}

.panel-section {
  background: var(--bg-card);
  border: 1px solid var(--border-light);
  border-radius: var(--radius-lg);
  padding: 24px;
  margin-bottom: 20px;
  backdrop-filter: blur(10px);
}

.action-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: linear-gradient(135deg, rgba(34, 197, 94, 0.1) 0%, rgba(30, 41, 59, 0.6) 100%);
  border: 1px solid rgba(34, 197, 94, 0.2);
}

.header-desc {
  color: var(--text-muted);
  margin: 4px 0 0 0;
  font-size: 14px;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  border-bottom: 2px solid var(--border-light);
  padding-bottom: 14px;
}

.section-title {
  font-size: 18px;
  font-weight: 700;
  color: var(--text-primary);
  margin: 0;
}

.mb-0 {
  margin-bottom: 0;
}

.refresh-btn {
  background: none;
  border: none;
  color: #94a3b8;
  font-size: 18px;
  cursor: pointer;
  transition: all 0.3s;
}

.refresh-btn:hover {
  color: #fff;
  transform: rotate(180deg);
}

.refresh-btn.spinning {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

/* 分享列表 */
.shares-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 16px;
}

.share-card {
  background: var(--bg-card);
  border: 1px solid var(--border-light);
  border-radius: var(--radius-md);
  padding: 16px;
  transition: all 0.2s;
  box-shadow: var(--shadow-sm);
}

.share-card:hover {
  border-color: rgba(34, 197, 94, 0.4);
  transform: translateY(-2px);
}

.share-header {
  display: flex;
  justify-content: space-between;
  font-size: 12px;
  margin-bottom: 12px;
}

.device-info {
  display: flex;
  align-items: center;
  gap: 6px;
  color: var(--text-muted);
}

.share-status { color: var(--color-primary); }

.share-status.connected {
  color: #22c55e;
}

.share-body {
  display: flex;
  gap: 12px;
  margin-bottom: 16px;
}

.folder-icon {
  font-size: 24px;
}

.folder-info {
  overflow: hidden;
}

.folder-label {
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: 4px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.folder-id {
  font-size: 12px;
  color: var(--text-muted);
  font-family: monospace;
}

.share-actions {
  display: flex;
  justify-content: flex-end;
}

/* 本地列表 */
.local-shares-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.local-share-item {
  display: flex;
  align-items: center;
  gap: 16px;
  background: rgba(15, 23, 42, 0.4);
  padding: 12px 16px;
  border-radius: 8px;
}

.item-details {
  flex: 1;
}

.item-name {
  color: #e2e8f0;
  font-weight: 500;
}

.item-path {
  color: #64748b;
  font-size: 12px;
}

.status-tag {
  font-size: 12px;
  padding: 4px 8px;
  border-radius: 4px;
  background: rgba(148, 163, 184, 0.1);
}

.status-tag.synced {
  color: #22c55e;
  background: rgba(34, 197, 94, 0.1);
}

.status-tag.paused {
  color: #f59e0b;
  background: rgba(245, 158, 11, 0.1);
}

/* 模态框 */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  backdrop-filter: blur(4px);
}

.modal-container {
  background: #1e293b;
  border: 1px solid rgba(148, 163, 184, 0.2);
  border-radius: 16px;
  width: 500px;
  max-width: 90vw;
  max-height: 80vh;
  display: flex;
  flex-direction: column;
  box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.5);
}

.modal-header {
  padding: 20px;
  border-bottom: 1px solid rgba(148, 163, 184, 0.1);
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.modal-header h3 {
  margin: 0;
  color: #f1f5f9;
}

.close-btn {
  background: none;
  border: none;
  color: #94a3b8;
  font-size: 24px;
  cursor: pointer;
}

.modal-body {
  padding: 20px;
  overflow-y: auto;
}

.modal-footer {
  padding: 20px;
  border-top: 1px solid rgba(148, 163, 184, 0.1);
  display: flex;
  justify-content: flex-end;
  gap: 12px;
}

/* 存档列表 */
.saves-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.save-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  border-radius: 8px;
  border: 1px solid transparent;
  cursor: pointer;
  transition: all 0.2s;
}

.save-item:hover {
  background: rgba(255, 255, 255, 0.05);
}

.save-item.selected {
  background: rgba(34, 197, 94, 0.1);
  border-color: rgba(34, 197, 94, 0.3);
}

.save-item.shared {
  opacity: 0.6;
  cursor: not-allowed;
}


.save-info {
  flex: 1;
}

.save-name {
  color: #f1f5f9;
  font-weight: 500;
}

.save-version {
  font-size: 12px;
  color: #94a3b8;
}

.save-check {
  width: 24px;
  display: flex;
  justify-content: center;
}

.check-mark {
  color: #22c55e;
  font-weight: bold;
}

.shared-badge {
  font-size: 10px;
  background: rgba(148, 163, 184, 0.2);
  padding: 2px 6px;
  border-radius: 4px;
  color: #94a3b8;
}

/* 表单 */
.form-group {
  margin-bottom: 20px;
}

.form-group label {
  display: block;
  margin-bottom: 8px;
  color: #cbd5e1;
}

.info-box {
  background: rgba(0, 0, 0, 0.2);
  padding: 12px;
  border-radius: 8px;
  font-size: 14px;
  color: #94a3b8;
}

.input-group {
  display: flex;
  gap: 8px;
}

.input-group input {
  flex: 1;
  background: rgba(15, 23, 42, 0.6);
  border: 1px solid rgba(148, 163, 184, 0.2);
  border-radius: 6px;
  padding: 8px 12px;
  color: #f1f5f9;
}

.hint {
  font-size: 12px;
  color: #64748b;
  margin-top: 6px;
}

/* 按钮 */
.qq-btn {
  padding: 8px 16px;
  border-radius: 6px;
  border: none;
  cursor: pointer;
  font-weight: 500;
  transition: all 0.2s;
}

.qq-btn-primary {
  background: #22c55e;
  color: #fff;
}

.qq-btn-primary:hover {
  background: #16a34a;
}

.qq-btn-primary:disabled {
  background: #94a3b8;
  cursor: not-allowed;
}

.qq-btn-secondary {
  background: #3b82f6;
  color: #fff;
}

.qq-btn-secondary:hover {
  background: #2563eb;
}

.qq-btn-ghost {
  background: transparent;
  color: #94a3b8;
}

.qq-btn-ghost:hover {
  color: #f1f5f9;
  background: rgba(255, 255, 255, 0.05);
}

.qq-btn-sm {
  padding: 4px 12px;
  font-size: 12px;
}

.qq-btn-outline {
  background: transparent;
  border: 1px solid rgba(148, 163, 184, 0.3);
  color: #94a3b8;
}

.spinner {
  width: 20px;
  height: 20px;
  border: 2px solid rgba(255, 255, 255, 0.1);
  border-top-color: #22c55e;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

.loading-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  padding: 40px;
  color: #94a3b8;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 40px;
  color: #94a3b8;
}

.empty-icon {
  font-size: 32px;
  margin-bottom: 8px;
}

.sub-text {
  font-size: 12px;
  color: #64748b;
}

/* 未连接遮罩 */
.not-connected-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 100;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(15, 23, 42, 0.4);
  backdrop-filter: blur(2px);
  border-radius: 16px;
  min-height: 400px;
}

.overlay-content {
  background: rgba(30, 41, 59, 0.9);
  border: 1px solid rgba(148, 163, 184, 0.2);
  border-radius: 16px;
  padding: 40px;
  text-align: center;
  box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.5);
  max-width: 400px;
}

.warning-icon {
  font-size: 48px;
  margin-bottom: 16px;
}

.overlay-content h3 {
  color: #f1f5f9;
  margin: 0 0 12px 0;
  font-size: 20px;
}

.overlay-content p {
  color: #94a3b8;
  margin: 0 0 24px 0;
  line-height: 1.5;
}

.mt-4 {
  margin-top: 16px;
  text-decoration: none;
  display: inline-block;
}

.blurred {
  filter: blur(4px);
  opacity: 0.6;
  pointer-events: none;
}

.breadcrumbs {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
  background: rgba(0,0,0,0.2);
  padding: 8px 10px;
  border-radius: 6px;
}
.crumb {
  color: #e2e8f0;
  cursor: pointer;
  font-weight: 600;
}
.crumb:hover { color: #22c55e; }
.sep { color: #94a3b8; }
</style>
