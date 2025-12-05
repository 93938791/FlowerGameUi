<template>
  <div class="multiplayer-container">
    <div class="multiplayer-grid">
      <!-- 左侧：版本选择和启动 -->
      <div class="multiplayer-left">
        <div class="panel-section">
          <h3 class="section-title">
            <img src="/icons/游戏.png" class="section-icon-img" alt="游戏" />
            选择游戏版本
          </h3>
          
          <div v-if="loadingInstalledVersions" class="loading-hint">
            <span class="loading-icon">⏳</span>
            <span>正在加载已安装的版本...</span>
          </div>
          
          <div v-else-if="installedVersions.length === 0" class="empty-hint">
            <div class="empty-icon">📦</div>
            <div class="empty-text">还没有下载任何版本</div>
            <NuxtLink to="/game" class="qq-btn qq-btn-primary">前往下载</NuxtLink>
          </div>
          
          <div v-else class="version-grid">
            <div 
              v-for="version in installedVersions" 
              :key="version.id"
              class="version-card"
              :class="{ 
                selected: selectedLaunchVersion === version.id,
                [getLoaderTypeClass(version.id, version.type)]: true
              }"
              @click="selectLaunchVersion(version.id)"
            >
              <div class="version-details">
                <div class="version-name">
                  <span class="loader-badge-small" :class="getLoaderTypeClass(version.id, version.type)">
                    {{ getVersionLabel(version.id, version.type) }}
                  </span>
                  {{ version.id }}
                </div>
              </div>
              <div class="version-actions">
                <div class="version-check" v-if="selectedLaunchVersion === version.id">
                  <span class="check-icon">✓</span>
                </div>
                <button 
                  class="delete-btn" 
                  @click.stop="openDeleteModal(version)"
                  title="删除此版本"
                >
                  <span class="delete-icon">🗑️</span>
                </button>
              </div>
            </div>
          </div>
          
          <!-- 删除确认弹窗 -->
          <Teleport to="body">
            <div v-if="showDeleteModal" class="modal-overlay" @click.self="closeDeleteModal">
              <div class="delete-modal">
                <div class="modal-header">
                  <span class="modal-icon">⚠️</span>
                  <h3 class="modal-title">删除游戏版本</h3>
                </div>
                <div class="modal-body">
                  <p class="delete-warning">
                    您确定要删除版本 <strong>{{ versionToDelete?.id }}</strong> 吗？
                  </p>
                  <p class="delete-hint">此操作将删除该版本的所有文件，且<strong>无法恢复</strong>。</p>
                  <div class="confirm-input-group">
                    <label class="confirm-label">请输入 <code>确认删除</code> 以继续：</label>
                    <input 
                      v-model="deleteConfirmText" 
                      type="text" 
                      class="confirm-input"
                      placeholder="确认删除"
                      @keyup.enter="confirmDelete"
                    />
                  </div>
                </div>
                <div class="modal-footer">
                  <button class="modal-btn modal-btn-cancel" @click="closeDeleteModal">取消</button>
                  <button 
                    class="modal-btn modal-btn-delete" 
                    :disabled="deleteConfirmText !== '确认删除' || isDeleting"
                    @click="confirmDelete"
                  >
                    <span v-if="isDeleting" class="btn-spinner"></span>
                    {{ isDeleting ? '删除中...' : '删除' }}
                  </button>
                </div>
              </div>
            </div>
          </Teleport>
        </div>
        
        <!-- 启动设置 -->
        <div class="launch-settings" v-if="installedVersions.length > 0">
          <div class="settings-header">
            <h4 class="subsection-title">
              <img src="/icons/运行.png" class="subsection-icon-img" alt="运行" />
              启动设置
            </h4>
            <div class="auto-calc-hint">
              <span class="hint-icon">✨</span>
              <span class="hint-text">已根据您的电脑配置自动计算参数</span>
            </div>
          </div>
          <div class="launch-form">
            <div class="launch-form-group">
              <label class="launch-label">
                <img src="/icons/内存条.png" class="label-icon-img" alt="内存" />
                <span class="label-text">最小内存 (GB)</span>
              </label>
              <input 
                v-model.number="minMemory" 
                type="number"
                min="1"
                max="32"
                placeholder="最小内存分配" 
                class="launch-input"
              />
              <div class="param-hint">游戏启动时分配的初始内存大小</div>
            </div>
            
            <div class="launch-form-group">
              <label class="launch-label">
                <img src="/icons/内存条.png" class="label-icon-img" alt="内存" />
                <span class="label-text">最大内存 (GB)</span>
              </label>
              <input 
                v-model.number="maxMemory" 
                type="number"
                min="1"
                max="32"
                placeholder="最大内存分配" 
                class="launch-input"
              />
              <div class="param-hint">游戏运行时可使用的最大内存</div>
            </div>
            
            <div class="launch-form-group">
              <label class="launch-label">
                <img src="/icons/闪电.png" class="label-icon-img" alt="闪电" />
                <span class="label-text">垃圾回收器</span>
              </label>
              <select v-model="gcType" class="launch-select">
                <option value="G1GC">G1GC (推荐)</option>
                <option value="ZGC">ZGC (低延迟)</option>
                <option value="ParallelGC">ParallelGC (高吞吐)</option>
              </select>
              <div class="param-hint">控制内存回收方式，G1GC适合大多数情况</div>
            </div>
            
            <div class="launch-form-group advanced-toggle">
              <button @click="showAdvanced = !showAdvanced" class="toggle-btn">
                <span class="toggle-icon">{{ showAdvanced ? '▼' : '▶' }}</span>
                <span>高级选项</span>
              </button>
            </div>
            
            <div v-if="showAdvanced" class="advanced-options">
              <div class="launch-form-group">
                <label class="launch-label">
                  <span class="label-icon">🔧</span>
                  <span class="label-text">额外 JVM 参数</span>
                </label>
                <textarea 
                  v-model="extraJvmArgs" 
                  placeholder="可选：输入额外的 JVM 参数" 
                  class="launch-textarea"
                  rows="2"
                ></textarea>
                <div class="param-hint">高级用户可添加自定义 JVM 参数</div>
              </div>
            </div>
            
            <div class="launch-buttons">
              <button 
                @click="launchMinecraftGame" 
                class="launch-btn"
                :class="{ launching: isLaunching }"
                :disabled="isLaunching || !selectedLaunchVersion"
              >
                <span class="btn-icon">{{ isLaunching ? '⏳' : '🚀' }}</span>
                <span class="btn-text">{{ isLaunching ? '启动中...' : '启动游戏' }}</span>
              </button>
              
              <button 
                @click="openCreateRoomModal" 
                class="create-room-btn"
                :disabled="!selectedLaunchVersion || currentRoom"
              >
                <span class="btn-icon">🌐</span>
                <span class="btn-text">{{ currentRoom ? '房间运行中' : '创建联机房间' }}</span>
              </button>
            </div>
          </div>
          
          <div v-if="launchOutput" class="launch-output">
            <pre>{{ launchOutput }}</pre>
          </div>
        </div>
      </div>
      
      <!-- 右侧：联机配置 -->
      <div class="multiplayer-right">
        <!-- 登录信息 -->
        <div class="panel-section login-info-card" v-if="accountInfo || offlineAccount">
          <div class="login-info-header">
            <span class="info-icon">👤</span>
            <span class="info-title">当前账号</span>
          </div>
          <div class="login-info-content">
            <div class="account-type" v-if="accountInfo">
              <span class="type-badge genuine">✓ 正版账号</span>
            </div>
            <div class="account-type" v-else-if="offlineAccount">
              <span class="type-badge offline">⚡ 离线模式</span>
            </div>
          </div>
        </div>
        
        <!-- 当前房间状态 -->
        <div v-if="currentRoom" class="panel-section room-status-card">
          <div class="room-status-header">
            <span class="room-status-icon">{{ getRoomStatusIcon(currentRoom.status) }}</span>
            <div class="room-status-info">
              <h3 class="room-name">{{ currentRoom.name }}</h3>
              <span class="room-status-badge" :class="currentRoom.status">
                {{ getRoomStatusText(currentRoom.status) }}
              </span>
            </div>
          </div>
          
          <div class="room-details">
            <div class="room-detail-item">
              <span class="detail-label">存档</span>
              <span class="detail-value">{{ currentRoom.save_name }}</span>
            </div>
            <div class="room-detail-item">
              <span class="detail-label">端口</span>
              <span class="detail-value">{{ currentRoom.port }}</span>
            </div>
            <div class="room-detail-item">
              <span class="detail-label">模式</span>
              <span class="detail-value">{{ getGameModeLabel(currentRoom.game_mode) }}</span>
            </div>
            <div class="room-detail-item">
              <span class="detail-label">房间类型</span>
              <span class="detail-value" :class="currentRoom.has_password ? 'private' : 'public'">
                {{ currentRoom.has_password ? '🔒 加密房间' : '🌐 公开房间' }}
              </span>
            </div>
            <div class="room-detail-item full-width" v-if="currentRoom.virtual_ip">
              <span class="detail-label">虚拟IP</span>
              <span class="detail-value highlight">{{ currentRoom.virtual_ip }}</span>
            </div>
          </div>
          
          <div v-if="currentRoom.status === 'open'" class="room-connect-info">
            <div class="connect-title">🎉 房间已开放！</div>
            <div class="connect-hint">好友可以通过以下地址连接：</div>
            <div class="connect-address">
              <code>{{ currentRoom.virtual_ip }}:{{ currentRoom.port }}</code>
              <button class="copy-btn" @click="copyConnectAddress">📋</button>
            </div>
          </div>
          
          <button 
            v-if="currentRoom.status !== 'closed'"
            class="close-room-btn" 
            @click="closeCurrentRoom"
          >
            <span>✕</span> 关闭房间
          </button>
        </div>

        <!-- 局域网房间列表 -->
        <div class="panel-section" v-if="!currentRoom">
          <div class="section-header" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
            <h3 class="section-title" style="margin: 0; border: none;">📡 局域网房间</h3>
            <button @click="loadRoomList" class="qq-btn qq-btn-primary" style="padding: 6px 12px; font-size: 13px;">刷新</button>
          </div>

          <div v-if="loadingRoomList" class="loading-hint">
            <span class="loading-icon">⏳</span>
            <span>正在搜索房间...</span>
          </div>

          <div v-else-if="roomList.length === 0" class="empty-hint">
            <div class="empty-icon">📡</div>
            <div class="empty-text">未发现局域网房间</div>
            <div class="delete-hint" style="margin: 0;">请确保您和房主已连接到同一虚拟网络</div>
          </div>

          <div v-else class="room-list">
            <div v-for="room in roomList" :key="room.room_id" class="version-card" style="display: block; cursor: default; margin-bottom: 12px;">
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
                <div style="display: flex; align-items: center; gap: 12px;">
                  <div class="version-icon-wrapper loader-vanilla" style="width: 44px; height: 44px;">🎮</div>
                  <div>
                    <div class="version-name">{{ room.name }}</div>
                    <div style="font-size: 12px; color: #94a3b8;">房主: {{ room.host_player }}</div>
                  </div>
                </div>
                <span class="room-status-badge" :class="room.status">{{ getRoomStatusText(room.status) }}</span>
              </div>

              <div class="room-connect-info" style="margin-top: 12px;">
                <div class="connect-hint">服务器地址：</div>
                <div class="connect-address">
                  <code>{{ room.virtual_ip }}:{{ room.port }}</code>
                  <button class="copy-btn" @click="copyRoomAddress(room)" title="复制地址">📋</button>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        <div class="panel-section multiplayer-card" v-if="!isNetworkConnected">
          <div class="card-header">
            <h3 class="section-title">🌐 联机配置</h3>
            <div class="card-subtitle">通过虚拟网络与好友联机</div>
          </div>
          
          <div class="network-guide">
            <div class="guide-item">
              <div class="guide-icon">🎮</div>
              <div class="guide-content">
                <div class="guide-title">虚拟局域网联机</div>
                <div class="guide-text">通过 Easytier 虚拟网络，您可以与好友轻松联机</div>
              </div>
            </div>
            
            <div class="guide-item">
              <div class="guide-icon">📡</div>
              <div class="guide-content">
                <div class="guide-title">启动网络</div>
                <div class="guide-text">请先在「网络管理」中启动 Easytier 网络</div>
              </div>
            </div>
            
            <div class="guide-item">
              <div class="guide-icon">🔗</div>
              <div class="guide-content">
                <div class="guide-title">连接房间</div>
                <div class="guide-text">确保您和好友都已连接到同一虚拟网络</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
    
    <!-- 创建房间弹窗 -->
    <CreateRoomModal 
      :show="showCreateRoomModal"
      :selected-version="selectedLaunchVersion"
      :username="currentUsername"
      :uuid="currentUuid"
      :access-token="currentAccessToken"
      :jvm-args="buildJvmArgs()"
      @close="showCreateRoomModal = false"
      @created="onRoomCreated"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { useAuth } from '../composables/useAuth'
import { useToast } from '../composables/useToast'
import { useBackend } from '../composables/useBackend'
import CreateRoomModal from '../components/CreateRoomModal.vue'

const { accountInfo, offlineAccount, loadAccountFromCache, loadOfflineFromCache } = useAuth()
const { showToast } = useToast()
const { fetchApi, rooms: backendRooms, init: initBackend, networkStatus } = useBackend()

// 房间相关状态
const showCreateRoomModal = ref(false)

// 检查是否已连接到虚拟网络
const isNetworkConnected = computed(() => {
  return networkStatus.value && networkStatus.value.connected
})

// 使用 computed 从 WebSocket 数据中获取当前房间 (本地创建的房间)
const currentRoom = computed(() => {
  return backendRooms.value.find(r => r.is_local) || null
})

// 局域网房间列表 (排除本地房间)
const roomList = computed(() => {
  return backendRooms.value.filter(r => !r.is_local)
})

const loadingRoomList = ref(false)
let roomListPollInterval: any = null

interface InstalledVersion {
  id: string
  type: string
  installed: boolean
  jar_exists: boolean
  json_exists: boolean
}

const installedVersions = ref<InstalledVersion[]>([])
const loadingInstalledVersions = ref(false)
const selectedLaunchVersion = ref('')
const launchUsername = ref('')
const minMemory = ref(2)
const maxMemory = ref(4)
const gcType = ref('G1GC')
const extraJvmArgs = ref('')
const showAdvanced = ref(false)
const isLaunching = ref(false)
const launchOutput = ref('')

// 删除相关状态
const showDeleteModal = ref(false)
const versionToDelete = ref<InstalledVersion | null>(null)
const deleteConfirmText = ref('')
const isDeleting = ref(false)

// 计算属性：是否有账号
const hasAccount = computed(() => {
  return !!accountInfo.value || !!offlineAccount.value
})

// 计算属性：当前用户名
const currentUsername = computed(() => {
  if (accountInfo.value) {
    return accountInfo.value.name
  }
  if (offlineAccount.value) {
    return offlineAccount.value
  }
  return 'Player'
})

// 计算属性：当前UUID
const currentUuid = computed(() => {
  return accountInfo.value?.id || ''
})

// 计算属性：当前访问令牌
const currentAccessToken = computed(() => {
  return accountInfo.value?.minecraft_token || ''
})

// 根据系统内存计算推荐值
async function calculateRecommendedMemory() {
  try {
    // 从后端 API 获取系统信息
    const r = await fetchApi('/api/system/info')
    const result = await r.json()
    
    if (result.ok && result.memory) {
      const totalMemoryGB = result.memory.total_gb
      
      // 计算推荐值
      // 最小内存：总内存的 25%，至少 2GB
      minMemory.value = Math.max(2, Math.floor(totalMemoryGB * 0.25))
      
      // 最大内存：总内存的 50%，至少 4GB，最多不超过总内存的 75%
      maxMemory.value = Math.max(4, Math.min(
        Math.floor(totalMemoryGB * 0.5),
        Math.floor(totalMemoryGB * 0.75)
      ))
      
      console.log(`✅ 系统内存: ${totalMemoryGB.toFixed(2)}GB, 推荐配置: 最小${minMemory.value}GB, 最大${maxMemory.value}GB`)
    } else {
      // 降级：使用默认值
      minMemory.value = 2
      maxMemory.value = 4
      console.warn('无法获取系统信息，使用默认内存配置')
    }
  } catch (e: any) {
    // 降级：使用默认值
    minMemory.value = 2
    maxMemory.value = 4
    console.error('获取系统信息失败:', e)
  }
}

// 构建 JVM 参数数组
function buildJvmArgs(): string[] {
  const args: string[] = [
    `-Xms${minMemory.value}G`,
    `-Xmx${maxMemory.value}G`,
    '-XX:+UnlockExperimentalVMOptions'
  ]
  
  // 添加 GC 参数
  if (gcType.value === 'G1GC') {
    args.push(
      '-XX:+UseG1GC',
      '-XX:G1NewSizePercent=20',
      '-XX:G1ReservePercent=20',
      '-XX:MaxGCPauseMillis=50',
      '-XX:G1HeapRegionSize=32M'
    )
  } else if (gcType.value === 'ZGC') {
    args.push('-XX:+UseZGC')
  } else if (gcType.value === 'ParallelGC') {
    args.push('-XX:+UseParallelGC')
  }
  
  // 添加额外参数
  if (extraJvmArgs.value.trim()) {
    const extraArgs = extraJvmArgs.value.trim().split(/\s+/).filter(arg => arg.length > 0)
    args.push(...extraArgs)
  }
  
  return args
}

// 加载已安装版本
async function loadInstalledVersions() {
  loadingInstalledVersions.value = true
  try {
    const r = await fetchApi('/api/minecraft/installed-versions')
    const result = await r.json()
    if (result.ok && result.versions && Array.isArray(result.versions)) {
      installedVersions.value = result.versions.filter((v: InstalledVersion) => v.jar_exists && v.json_exists)
    }
  } catch (e: any) {
    console.error('加载已安装版本失败:', e)
    showToast(`加载失败: ${e.message}`, 'error')
  } finally {
    loadingInstalledVersions.value = false
  }
}

function selectLaunchVersion(versionId: string) {
  selectedLaunchVersion.value = versionId
}

function getVersionTypeLabel(type: string): string {
  const typeMap: Record<string, string> = {
    'release': '正式版',
    'snapshot': '快照版',
    'old_beta': 'Beta',
    'old_alpha': 'Alpha',
    'fabric': 'Fabric',
    'forge': 'Forge',
    'neoforge': 'NeoForge',
    'optifine': 'OptiFine',
    'unknown': '未知'
  }
  return typeMap[type?.toLowerCase()] || '正式版'
}

function getVersionTypeClass(type: string): string {
  return type?.toLowerCase() || 'release'
}

function getVersionIconByType(type: string): string {
  const iconMap: Record<string, string> = {
    'fabric': '/icons/fabric.png',
    'forge': '/icons/forge.png',
    'neoforge': '/icons/neoforge.png',
    'optifine': '/icons/optifine.png',
    'release': '/icons/vanilla.png',
    'snapshot': '/icons/vanilla.png',
  }
  return iconMap[type?.toLowerCase()] || '/icons/vanilla.png'
}

function getVersionIcon(versionId: string, type?: string): string {
  // 优先使用 type 字段
  if (type && ['fabric', 'forge', 'neoforge', 'optifine'].includes(type.toLowerCase())) {
    return getVersionIconByType(type)
  }
  
  // 降级：从版本ID推断
  const lowerVersionId = versionId.toLowerCase()
  
  if (lowerVersionId.includes('fabric')) {
    return '/icons/fabric.png'
  } else if (lowerVersionId.includes('neoforge')) {
    return '/icons/neoforge.png'
  } else if (lowerVersionId.includes('forge')) {
    return '/icons/forge.png'
  } else if (lowerVersionId.includes('optifine')) {
    return '/icons/optifine.png'
  } else {
    return '/icons/vanilla.png'
  }
}

function getVersionLabelByType(type: string): string {
  const labelMap: Record<string, string> = {
    'fabric': 'Fabric',
    'forge': 'Forge',
    'neoforge': 'NeoForge',
    'optifine': 'OptiFine',
    'release': '原版',
    'snapshot': '原版',
  }
  return labelMap[type?.toLowerCase()] || '原版'
}

function getVersionLabel(versionId: string, type?: string): string {
  // 优先使用 type 字段
  if (type && ['fabric', 'forge', 'neoforge', 'optifine'].includes(type.toLowerCase())) {
    return getVersionLabelByType(type)
  }
  
  // 降级：从版本ID推断
  const lowerVersionId = versionId.toLowerCase()
  
  if (lowerVersionId.includes('fabric')) {
    return 'Fabric'
  } else if (lowerVersionId.includes('neoforge')) {
    return 'NeoForge'
  } else if (lowerVersionId.includes('forge')) {
    return 'Forge'
  } else if (lowerVersionId.includes('optifine')) {
    return 'OptiFine'
  } else {
    return '原版'
  }
}

function handleImageError(event: Event) {
  const img = event.target as HTMLImageElement
  img.src = '/icons/vanilla.png'
}

function getLoaderTypeClass(versionId: string, type?: string): string {
  // 优先使用 type 字段
  if (type) {
    const typeMap: Record<string, string> = {
      'fabric': 'loader-fabric',
      'forge': 'loader-forge',
      'neoforge': 'loader-neoforge',
      'optifine': 'loader-optifine',
      'release': 'loader-vanilla',
      'snapshot': 'loader-vanilla',
    }
    const mappedClass = typeMap[type.toLowerCase()]
    if (mappedClass) return mappedClass
  }
  
  // 降级：从版本ID推断
  const lowerVersionId = versionId.toLowerCase()
  
  if (lowerVersionId.includes('fabric')) {
    return 'loader-fabric'
  } else if (lowerVersionId.includes('neoforge')) {
    return 'loader-neoforge'
  } else if (lowerVersionId.includes('forge')) {
    return 'loader-forge'
  } else if (lowerVersionId.includes('optifine')) {
    return 'loader-optifine'
  } else {
    return 'loader-vanilla'
  }
}

// 删除版本相关函数
function openDeleteModal(version: InstalledVersion) {
  versionToDelete.value = version
  deleteConfirmText.value = ''
  showDeleteModal.value = true
}

function closeDeleteModal() {
  showDeleteModal.value = false
  versionToDelete.value = null
  deleteConfirmText.value = ''
}

async function confirmDelete() {
  if (deleteConfirmText.value !== '确认删除' || !versionToDelete.value) {
    return
  }
  
  isDeleting.value = true
  
  try {
    const r = await fetchApi('/api/minecraft/delete-version', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ version_id: versionToDelete.value.id })
    })
    
    const result = await r.json()
    
    if (result.ok) {
      showToast(`版本 ${versionToDelete.value.id} 已删除`, 'success')
      
      // 如果删除的是当前选中的版本，清空选择
      if (selectedLaunchVersion.value === versionToDelete.value.id) {
        selectedLaunchVersion.value = ''
      }
      
      // 重新加载版本列表
      await loadInstalledVersions()
      closeDeleteModal()
    } else {
      showToast(`删除失败: ${result.error}`, 'error')
    }
  } catch (e: any) {
    showToast(`删除失败: ${e.message}`, 'error')
  } finally {
    isDeleting.value = false
  }
}

// 打开创建房间弹窗
function openCreateRoomModal() {
  if (!selectedLaunchVersion.value) {
    showToast('请先选择游戏版本', 'error')
    return
  }
  if (!hasAccount.value && !isNetworkConnected.value) {
    showToast('无法进行游戏联机，请先加入 Easytier 网络并登录账号', 'error')
    return
  }
  if (!hasAccount.value) {
    showToast('请先登录账号', 'error')
    return
  }
  if (!isNetworkConnected.value) {
    showToast('请先在「网络管理」中启动 Easytier 网络', 'error')
    return
  }
  showCreateRoomModal.value = true
}

// 房间创建成功回调
function onRoomCreated(room: any) {
  // currentRoom.value = room // 不需要手动设置，computed 会自动更新
  showToast(`房间 "${room.name}" 创建中...`, 'success')
  // 刷新房间列表
  loadRoomList()
}

// 关闭当前房间
async function closeCurrentRoom() {
  if (!currentRoom.value) return
  
  try {
    const response = await fetchApi('/api/room/close', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ room_id: currentRoom.value.room_id })
    })
    
    const result = await response.json()
    
    if (result.ok) {
      showToast('房间已关闭', 'success')
      // currentRoom.value = null // computed 会自动更新
      // 强制刷新房间列表
      loadRoomList()
    } else {
      showToast(`关闭失败: ${result.error}`, 'error')
    }
  } catch (e: any) {
    showToast(`关闭失败: ${e.message}`, 'error')
  }
}

// 复制房间地址
function copyRoomAddress(room: any) {
  const address = `${room.virtual_ip}:${room.port}`
  navigator.clipboard.writeText(address).then(() => {
    showToast('已复制到剪贴板', 'success')
  }).catch(() => {
    showToast('复制失败', 'error')
  })
}

// 复制连接地址
function copyConnectAddress() {
  if (!currentRoom.value) return
  
  const address = `${currentRoom.value.virtual_ip}:${currentRoom.value.port}`
  navigator.clipboard.writeText(address).then(() => {
    showToast('已复制到剪贴板', 'success')
  }).catch(() => {
    showToast('复制失败', 'error')
  })
}

// 获取房间状态图标
function getRoomStatusIcon(status: string): string {
  const iconMap: Record<string, string> = {
    'creating': '⏳',
    'waiting': '⏳',
    'publishing': '📡',
    'open': '✅',
    'closed': '🔒',
    'error': '❌'
  }
  return iconMap[status] || '❓'
}

// 获取房间状态文本
function getRoomStatusText(status: string): string {
  const textMap: Record<string, string> = {
    'creating': '创建中',
    'waiting': '等待游戏加载',
    'publishing': '开放局域网中',
    'open': '已开放',
    'closed': '已关闭',
    'error': '创建失败'
  }
  return textMap[status] || '未知'
}

// 获取游戏模式标签
function getGameModeLabel(mode: string): string {
  const modeMap: Record<string, string> = {
    'survival': '生存模式',
    'creative': '创造模式',
    'adventure': '冒险模式',
    'spectator': '旁观模式'
  }
  return modeMap[mode] || '生存模式'
}

// 加载房间列表
async function loadRoomList() {
  if (loadingRoomList.value) return
  
  loadingRoomList.value = true
  console.log('Refreshing room list...')
  
  try {
    // 1. 尝试通过 WebSocket 请求更新 (如果后端支持)
    // 目前后端是定时推送，我们可以添加一个请求更新的消息类型
    // ws?.send(JSON.stringify({ type: 'request_rooms_update' }))
    
    // 2. 同时调用 HTTP API 获取最新列表作为 fallback
    const r = await fetchApi('/api/room/list')
    const result = await r.json()
    
    if (result.ok && Array.isArray(result.rooms)) {
      // 强制更新 backendRooms
      backendRooms.value = result.rooms
      console.log('HTTP Room list updated:', result.rooms)
    }
  } catch (e) {
    console.error('加载房间列表失败:', e)
    showToast('刷新失败', 'error')
  } finally {
    loadingRoomList.value = false
  }
}

// 加入房间
async function joinRoom(room: any) {
  console.log('Clicked Join Room:', room)
  if (!selectedLaunchVersion.value) {
    showToast('请先选择游戏版本', 'error')
    return
  }
  
  // 构造启动参数
  const address = `${room.virtual_ip}:${room.port}`
  console.log('Join Address:', address)
  extraJvmArgs.value = '' // 清空可能存在的额外参数
  
  // 传入字符串类型的地址
  await launchMinecraftGame(address)
}

// 修改 launchMinecraftGame 支持 serverAddress
async function launchMinecraftGame(serverAddress?: string | Event) {
  console.log('🚀 开始启动游戏...')
  console.log('选中的版本:', selectedLaunchVersion.value)
  
  if (!selectedLaunchVersion.value) {
    showToast('请先选择要启动的版本', 'error')
    return
  }
  
  isLaunching.value = true
  launchOutput.value = ''
  
  try {
    let username = ''
    let uuid = ''
    let accessToken = ''
    
    console.log('accountInfo:', accountInfo.value)
    console.log('offlineAccount:', offlineAccount.value)
    
    // 账号选择逻辑：优先使用最近登录/切换的账号
    // 如果 offlineAccount 存在且 (accountInfo 不存在 或 用户明确选择了离线模式)
    // 这里我们通过检查缓存状态来判断
    
    // 实际上，我们在切换账号时应该清空另一个账号的状态
    // 在 Sidebar.vue 中切换账号时，应该调用 logout 或 logoutOffline
    
    // 如果同时存在正版和离线账号，优先使用离线账号（假设用户刚切换到离线）
    if (offlineAccount.value) {
        username = offlineAccount.value
        console.log('使用离线账号:', username)
    } else if (accountInfo.value) {
        username = accountInfo.value.name
        uuid = accountInfo.value.id
        accessToken = accountInfo.value.minecraft_token || ''
        console.log('使用正版账号:', username)
    } else {
        showToast('请先登录账号', 'error')
        isLaunching.value = false
        return
    }
    
    launchOutput.value = `正在启动 Minecraft ${selectedLaunchVersion.value}...\n`
    
    // 构建 JVM 参数
    const jvmArgsArray = buildJvmArgs()
    console.log('JVM 参数:', jvmArgsArray)
    
    // 构建请求参数
    const requestBody: any = {
      version_id: selectedLaunchVersion.value,
      username: username,
      uuid: uuid,
      access_token: accessToken,
      jvm_args: jvmArgsArray
    }
    
    // 如果有服务器地址且是字符串类型，添加到 extra_game_args
    // 注意：launchMinecraftGame 可能会被作为事件处理函数调用，此时 serverAddress 是 Event 对象
    // 所以我们必须严格检查类型
    if (serverAddress && typeof serverAddress === 'string') {
      launchOutput.value += `🔗 将自动连接到服务器: ${serverAddress}\n`
      
      // 解析地址和端口
      // 处理 IPv6 格式 [xxxx]:port 或 IPv4 格式 x.x.x.x:port
      let ip = serverAddress
      let port = '25565'
      
      const lastColonIndex = serverAddress.lastIndexOf(':')
      const closingBracketIndex = serverAddress.lastIndexOf(']')
      
      // 如果有端口（冒号在右方括号之后，或者没有方括号）
      if (lastColonIndex > -1 && lastColonIndex > closingBracketIndex) {
        ip = serverAddress.substring(0, lastColonIndex)
        port = serverAddress.substring(lastColonIndex + 1)
      }
      
      // 使用 --server 和 --port 参数，这比 --quickPlayMultiplayer 兼容性更好
      // 且能避免某些情况下出现的"无效会话"错误
      requestBody.extra_game_args = ['--server', ip, '--port', port]
    } else {
      console.log('serverAddress is not a string or empty:', serverAddress, typeof serverAddress)
    }
    
    console.log('Sending fetch request to /api/minecraft/launch...')
    
    try {
      const r = await fetchApi('/api/minecraft/launch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody)
      })
      
      console.log('响应状态:', r.status)
      const result = await r.json()
      console.log('响应结果:', result)
      
      if (result.ok) {
        launchOutput.value += `✅ 游戏启动成功！PID: ${result.pid}\n`
        showToast(`Minecraft ${selectedLaunchVersion.value} 启动成功！`, 'success')
      } else {
        launchOutput.value += `❌ 启动失败: ${result.error}\n`
        showToast(`启动失败: ${result.error}`, 'error')
      }
    } catch (fetchError) {
      console.error('Fetch Error:', fetchError)
      launchOutput.value += `❌ 请求发送失败: ${fetchError}\n`
      showToast(`请求发送失败: ${fetchError}`, 'error')
      throw fetchError // 抛出异常以便被外层 catch 捕获
    }
  } catch (e: any) {
    launchOutput.value += `❌ 启动异常: ${e.message}\n`
    showToast(`启动异常: ${e.message}`, 'error')
  } finally {
    isLaunching.value = false
  }
}

onMounted(async () => {
  // 初始化后端连接 (WebSocket)
  initBackend()

  // 加载已安装版本
  loadInstalledVersions()
  
  // 初始化内存推荐值
  calculateRecommendedMemory()
  
  // 加载账号信息
  await loadAccountFromCache()
  await loadOfflineFromCache()
  
  // 房间状态和列表现在通过 WebSocket 自动同步
  
  console.log('✅ 页面加载完成')
  console.log('正版账号:', accountInfo.value)
  console.log('离线账号:', offlineAccount.value)
})

onUnmounted(() => {
  // 清理逻辑 (WebSocket 由 useBackend 管理，无需在此关闭)
})
</script>

<style scoped>
/* ==================== 深色主题联机页面样式 ==================== */
.multiplayer-container {
  width: 100%;
}

.multiplayer-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 24px;
}

.panel-section {
  background: rgba(30, 41, 59, 0.6);
  border: 1px solid rgba(148, 163, 184, 0.1);
  border-radius: 16px;
  padding: 24px;
  margin-bottom: 20px;
  backdrop-filter: blur(10px);
}

.section-title {
  font-size: 18px;
  font-weight: 700;
  color: #f1f5f9;
  margin: 0 0 20px 0;
  padding-bottom: 14px;
  border-bottom: 2px solid #22c55e;
  display: flex;
  align-items: center;
  gap: 10px;
}

.loading-hint,
.empty-hint {
  text-align: center;
  padding: 48px 20px;
  color: #64748b;
}

.loading-icon {
  font-size: 36px;
  display: block;
  margin-bottom: 14px;
}

.empty-icon {
  font-size: 64px;
  margin-bottom: 16px;
  opacity: 0.8;
}

.empty-text {
  font-size: 16px;
  margin-bottom: 20px;
  color: #94a3b8;
}

.version-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 10px;
  margin-bottom: 20px;
  max-height: 400px;
  overflow-y: auto;
  padding-right: 6px;
}

.version-grid::-webkit-scrollbar {
  width: 6px;
}

.version-grid::-webkit-scrollbar-track {
  background: rgba(148, 163, 184, 0.05);
  border-radius: 3px;
}

.version-grid::-webkit-scrollbar-thumb {
  background: rgba(148, 163, 184, 0.2);
  border-radius: 3px;
}

.version-grid::-webkit-scrollbar-thumb:hover {
  background: rgba(148, 163, 184, 0.3);
}

.version-card {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 16px;
  background: rgba(148, 163, 184, 0.05);
  border: 2px solid transparent;
  border-radius: 14px;
  cursor: pointer;
  transition: all 0.2s ease;
  position: relative;
}

.version-card:hover {
  background: rgba(148, 163, 184, 0.1);
  border-color: rgba(34, 197, 94, 0.3);
}

.version-card.selected {
  background: rgba(34, 197, 94, 0.1);
  border-color: #22c55e;
  box-shadow: 0 0 20px rgba(34, 197, 94, 0.15);
}

/* 禁用状态的按钮样式 */
.qq-btn-disabled {
  background: #475569 !important;
  color: #94a3b8 !important;
  cursor: pointer !important; /* 保持手型，因为我们希望用户点击时有反馈 */
  box-shadow: none !important;
  transform: none !important;
}

.qq-btn-disabled:hover {
  background: #475569 !important;
  transform: none !important;
  box-shadow: none !important;
}

/* 不同加载器类型的卡片边框颜色 */
.version-card.loader-fabric {
  border-left: 4px solid #dbb68f;
}

.version-card.loader-forge {
  border-left: 4px solid #3e5ca1;
}

.version-card.loader-neoforge {
  border-left: 4px solid #f97316;
}

.version-card.loader-optifine {
  border-left: 4px solid #ad0000;
}

.version-card.loader-vanilla {
  border-left: 4px solid #7cb342;
}

.version-icon-wrapper {
  width: 52px;
  height: 52px;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 12px;
  padding: 10px;
  transition: all 0.2s ease;
  background: rgba(148, 163, 184, 0.1);
}

/* 不同加载器类型的图标背景 */
.version-icon-wrapper.loader-fabric {
  background: linear-gradient(135deg, rgba(219, 182, 143, 0.2) 0%, rgba(219, 182, 143, 0.4) 100%);
  border: 1px solid rgba(219, 182, 143, 0.3);
}

.version-icon-wrapper.loader-forge {
  background: linear-gradient(135deg, rgba(62, 92, 161, 0.2) 0%, rgba(62, 92, 161, 0.4) 100%);
  border: 1px solid rgba(62, 92, 161, 0.3);
}

.version-icon-wrapper.loader-neoforge {
  background: linear-gradient(135deg, rgba(249, 115, 22, 0.2) 0%, rgba(249, 115, 22, 0.4) 100%);
  border: 1px solid rgba(249, 115, 22, 0.3);
}

.version-icon-wrapper.loader-optifine {
  background: linear-gradient(135deg, rgba(173, 0, 0, 0.2) 0%, rgba(173, 0, 0, 0.4) 100%);
  border: 1px solid rgba(173, 0, 0, 0.3);
}

.version-icon-wrapper.loader-vanilla {
  background: linear-gradient(135deg, rgba(124, 179, 66, 0.2) 0%, rgba(124, 179, 66, 0.4) 100%);
  border: 1px solid rgba(124, 179, 66, 0.3);
}

.version-icon-img {
  width: 100%;
  height: 100%;
  object-fit: contain;
}

.version-details {
  flex: 1;
  min-width: 0;
}

.version-name {
  font-size: 15px;
  font-weight: 700;
  color: #f1f5f9;
  margin-bottom: 6px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.version-meta {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.loader-badge {
  display: inline-flex;
  align-items: center;
  padding: 3px 10px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 600;
  letter-spacing: 0.3px;
}

.loader-badge-small {
  display: inline-flex;
  align-items: center;
  padding: 2px 8px;
  border-radius: 6px;
  font-size: 11px;
  font-weight: 600;
  margin-right: 8px;
  vertical-align: middle;
  transform: translateY(-1px);
}

.loader-badge.loader-fabric, .loader-badge-small.loader-fabric {
  background: linear-gradient(135deg, #dbb68f 0%, #c4a47a 100%);
  color: #5d4e37;
}

.loader-badge.loader-forge, .loader-badge-small.loader-forge {
  background: linear-gradient(135deg, #3e5ca1 0%, #2d4373 100%);
  color: white;
}

.loader-badge.loader-neoforge, .loader-badge-small.loader-neoforge {
  background: linear-gradient(135deg, #f97316 0%, #ea580c 100%);
  color: white;
}

.loader-badge.loader-optifine, .loader-badge-small.loader-optifine {
  background: linear-gradient(135deg, #ad0000 0%, #8b0000 100%);
  color: white;
}

.loader-badge.loader-vanilla, .loader-badge-small.loader-vanilla {
  background: linear-gradient(135deg, #7cb342 0%, #558b2f 100%);
  color: white;
}

.version-type-tag {
  display: inline-block;
  padding: 3px 8px;
  border-radius: 4px;
  font-size: 11px;
  font-weight: 600;
}

.version-type-tag.release {
  background: #d4f4dd;
  color: #52c41a;
}

.version-type-tag.snapshot {
  background: #fff4e6;
  color: #fa8c16;
}

.version-actions {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
}

.version-check {
  flex-shrink: 0;
}

.check-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 26px;
  height: 26px;
  border-radius: 50%;
  background: linear-gradient(135deg, #00d9ff 0%, #00b8d4 100%);
  color: white;
  font-size: 14px;
  font-weight: 700;
  box-shadow: 0 2px 6px rgba(0, 217, 255, 0.4);
}

.delete-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border: none;
  border-radius: 8px;
  background: transparent;
  cursor: pointer;
  transition: all 0.2s ease;
  opacity: 0;
}

.version-card:hover .delete-btn {
  opacity: 1;
}

.delete-btn:hover {
  background: #fee2e2;
}

.delete-icon {
  font-size: 16px;
}

/* 删除确认弹窗样式 - 深色主题 */
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

.delete-modal {
  background: linear-gradient(145deg, #1e293b 0%, #0f172a 100%);
  border: 1px solid rgba(148, 163, 184, 0.1);
  border-radius: 20px;
  width: 90%;
  max-width: 420px;
  box-shadow: 0 25px 50px rgba(0, 0, 0, 0.5);
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

.modal-header {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 22px 24px;
  border-bottom: 1px solid rgba(148, 163, 184, 0.1);
  background: linear-gradient(135deg, rgba(239, 68, 68, 0.08) 0%, transparent 100%);
}

.modal-icon {
  font-size: 28px;
}

.modal-title {
  font-size: 18px;
  font-weight: 700;
  color: #f1f5f9;
  margin: 0;
}

.modal-body {
  padding: 24px;
}

.delete-warning {
  font-size: 15px;
  color: #e2e8f0;
  margin: 0 0 14px 0;
  line-height: 1.6;
}

.delete-warning strong {
  color: #f87171;
  font-weight: 700;
}

.delete-hint {
  font-size: 13px;
  color: #94a3b8;
  margin: 0 0 20px 0;
  padding: 14px 16px;
  background: rgba(251, 191, 36, 0.1);
  border: 1px solid rgba(251, 191, 36, 0.2);
  border-radius: 10px;
}

.delete-hint strong {
  color: #fbbf24;
}

.confirm-input-group {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.confirm-label {
  font-size: 14px;
  color: #e2e8f0;
  font-weight: 500;
}

.confirm-label code {
  background: rgba(239, 68, 68, 0.15);
  color: #f87171;
  padding: 3px 10px;
  border-radius: 6px;
  font-family: 'Consolas', monospace;
  font-weight: 700;
}

.confirm-input {
  width: 100%;
  padding: 14px 18px;
  border: 2px solid rgba(148, 163, 184, 0.15);
  border-radius: 10px;
  font-size: 14px;
  font-family: inherit;
  transition: all 0.2s ease;
  background: rgba(15, 23, 42, 0.6);
  color: #f1f5f9;
}

.confirm-input:focus {
  outline: none;
  border-color: #ef4444;
  box-shadow: 0 0 0 3px rgba(239, 68, 68, 0.15);
}

.confirm-input::placeholder {
  color: #64748b;
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  padding: 18px 24px;
  border-top: 1px solid rgba(148, 163, 184, 0.1);
  background: rgba(15, 23, 42, 0.5);
  border-radius: 0 0 20px 20px;
}

.modal-btn {
  padding: 12px 22px;
  border: none;
  border-radius: 10px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  display: inline-flex;
  align-items: center;
  gap: 8px;
}

.modal-btn-cancel {
  background: rgba(148, 163, 184, 0.1);
  color: #94a3b8;
}

.modal-btn-cancel:hover {
  background: rgba(148, 163, 184, 0.2);
  color: #e2e8f0;
}

.modal-btn-delete {
  background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
  color: white;
  box-shadow: 0 4px 12px rgba(239, 68, 68, 0.3);
}

.modal-btn-delete:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: 0 6px 16px rgba(239, 68, 68, 0.4);
}

.modal-btn-delete:disabled {
  background: rgba(148, 163, 184, 0.2);
  color: #64748b;
  cursor: not-allowed;
  box-shadow: none;
}

.btn-spinner {
  width: 14px;
  height: 14px;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-top-color: white;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.launch-settings {
  background: rgba(30, 41, 59, 0.6);
  border: 1px solid rgba(148, 163, 184, 0.1);
  border-radius: 16px;
  padding: 24px;
  backdrop-filter: blur(10px);
}

.subsection-title {
  font-size: 16px;
  font-weight: 700;
  color: #f1f5f9;
  margin: 0;
}

.settings-header {
  margin-bottom: 16px;
}

.auto-calc-hint {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 10px;
  padding: 10px 14px;
  background: rgba(251, 191, 36, 0.1);
  border: 1px solid rgba(251, 191, 36, 0.25);
  border-radius: 10px;
}

.hint-icon {
  font-size: 16px;
}

.hint-text {
  font-size: 13px;
  color: #fbbf24;
  font-weight: 500;
}

.launch-form {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.launch-form-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.launch-label {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  font-weight: 600;
  color: #e2e8f0;
}

.launch-select,
.launch-input,
.launch-textarea {
  width: 100%;
  padding: 12px 16px;
  border: 2px solid rgba(148, 163, 184, 0.15);
  border-radius: 10px;
  font-size: 14px;
  font-family: inherit;
  transition: all 0.2s ease;
  background: rgba(15, 23, 42, 0.6);
  color: #f1f5f9;
}

.launch-textarea {
  resize: vertical;
  min-height: 80px;
  line-height: 1.5;
}

.launch-select:focus,
.launch-input:focus,
.launch-textarea:focus {
  outline: none;
  border-color: #22c55e;
  box-shadow: 0 0 0 3px rgba(34, 197, 94, 0.15);
}

.launch-input::placeholder {
  color: #64748b;
}

.launch-select option {
  background: #1e293b;
  color: #f1f5f9;
}

.param-hint {
  margin-top: 6px;
  font-size: 12px;
  color: #64748b;
  line-height: 1.4;
}

.advanced-toggle {
  margin: 8px 0;
}

.toggle-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 18px;
  background: rgba(148, 163, 184, 0.1);
  border: 1px solid rgba(148, 163, 184, 0.1);
  border-radius: 8px;
  font-size: 14px;
  font-weight: 500;
  color: #94a3b8;
  cursor: pointer;
  transition: all 0.2s ease;
}

.toggle-btn:hover {
  background: rgba(148, 163, 184, 0.15);
  color: #e2e8f0;
}

.toggle-icon {
  font-size: 12px;
  transition: transform 0.2s ease;
}

.advanced-options {
  padding: 18px;
  background: rgba(15, 23, 42, 0.4);
  border: 1px solid rgba(148, 163, 184, 0.1);
  border-radius: 10px;
  margin-top: 14px;
}

.login-info-card {
  margin-bottom: 20px;
}

.login-info-header {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 14px;
  padding-bottom: 14px;
  border-bottom: 2px solid #22c55e;
}

.info-icon {
  font-size: 22px;
}

.info-title {
  font-size: 16px;
  font-weight: 700;
  color: #f1f5f9;
}

.login-info-content {
  padding: 12px 0;
}

.account-type {
  display: flex;
  align-items: center;
}

.type-badge {
  padding: 8px 18px;
  border-radius: 10px;
  font-size: 13px;
  font-weight: 600;
  display: inline-flex;
  align-items: center;
  gap: 8px;
}

.type-badge.genuine {
  background: rgba(34, 197, 94, 0.15);
  color: #4ade80;
  border: 1px solid rgba(34, 197, 94, 0.3);
}

.type-badge.offline {
  background: rgba(251, 191, 36, 0.15);
  color: #fbbf24;
  border: 1px solid rgba(251, 191, 36, 0.3);
}

.launch-btn {
  flex: 1;
  padding: 16px;
  border: none;
  border-radius: 12px;
  background: linear-gradient(135deg, #22c55e 0%, #16a34a 100%);
  color: white;
  font-size: 16px;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  box-shadow: 0 4px 16px rgba(34, 197, 94, 0.3);
}

.launch-btn:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 8px 24px rgba(34, 197, 94, 0.4);
}

.launch-btn:disabled {
  background: rgba(148, 163, 184, 0.2);
  color: #64748b;
  cursor: not-allowed;
  box-shadow: none;
}

.launch-output {
  margin-top: 18px;
  padding: 18px;
  background: rgba(15, 23, 42, 0.6);
  border: 1px solid rgba(148, 163, 184, 0.1);
  border-radius: 12px;
  max-height: 300px;
  overflow-y: auto;
}

.launch-output pre {
  margin: 0;
  font-family: 'Consolas', 'Monaco', monospace;
  font-size: 13px;
  line-height: 1.6;
  color: #22d3ee;
  white-space: pre-wrap;
  word-wrap: break-word;
}

.network-guide {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.guide-item {
  display: flex;
  align-items: flex-start;
  gap: 14px;
  padding: 16px;
  background: rgba(148, 163, 184, 0.05);
  border: 1px solid rgba(148, 163, 184, 0.08);
  border-radius: 12px;
  transition: all 0.2s ease;
}

.guide-item:hover {
  background: rgba(148, 163, 184, 0.08);
}

.guide-icon {
  font-size: 28px;
  flex-shrink: 0;
}

.guide-content {
  flex: 1;
}

.guide-title {
  font-size: 14px;
  font-weight: 600;
  color: #e2e8f0;
  margin-bottom: 4px;
}

.guide-text {
  font-size: 13px;
  color: #94a3b8;
  line-height: 1.5;
}

.qq-btn {
  border: none;
  border-radius: 10px;
  font-size: 14px;
  padding: 12px 24px;
  cursor: pointer;
  transition: all 0.2s ease;
  font-family: inherit;
  text-decoration: none;
  display: inline-block;
  font-weight: 600;
}

.qq-btn-primary {
  background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
  color: white;
  box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);
}

.qq-btn-primary:hover {
  transform: translateY(-1px);
  box-shadow: 0 6px 16px rgba(59, 130, 246, 0.4);
}

/* 启动按钮组 */
.launch-buttons {
  display: flex;
  gap: 14px;
  margin-top: 20px;
}

.create-room-btn {
  flex: 1;
  padding: 16px 20px;
  border: 2px solid rgba(59, 130, 246, 0.4);
  border-radius: 12px;
  background: rgba(59, 130, 246, 0.1);
  color: #60a5fa;
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
}

.create-room-btn:hover:not(:disabled) {
  background: rgba(59, 130, 246, 0.2);
  border-color: #3b82f6;
  transform: translateY(-2px);
  box-shadow: 0 4px 16px rgba(59, 130, 246, 0.25);
}

.create-room-btn:disabled {
  border-color: rgba(148, 163, 184, 0.2);
  background: rgba(148, 163, 184, 0.05);
  color: #64748b;
  cursor: not-allowed;
}

/* 房间状态卡片 - 深色主题 */
.room-status-card {
  background: linear-gradient(135deg, rgba(34, 197, 94, 0.1) 0%, rgba(34, 197, 94, 0.02) 100%);
  border: 1px solid rgba(34, 197, 94, 0.3);
  margin-bottom: 20px;
}

.room-status-header {
  display: flex;
  align-items: center;
  gap: 14px;
  margin-bottom: 16px;
}

.room-status-icon {
  font-size: 36px;
}

.room-status-info {
  flex: 1;
}

.room-name {
  font-size: 18px;
  font-weight: 700;
  color: #4ade80;
  margin: 0 0 6px 0;
}

.room-status-badge {
  display: inline-block;
  padding: 5px 14px;
  border-radius: 8px;
  font-size: 12px;
  font-weight: 600;
}

.room-status-badge.creating,
.room-status-badge.waiting,
.room-status-badge.publishing {
  background: rgba(251, 191, 36, 0.15);
  color: #fbbf24;
  border: 1px solid rgba(251, 191, 36, 0.3);
}

.room-status-badge.open {
  background: rgba(34, 197, 94, 0.2);
  color: #4ade80;
  border: 1px solid rgba(34, 197, 94, 0.3);
}

.room-status-badge.error {
  background: rgba(239, 68, 68, 0.15);
  color: #f87171;
  border: 1px solid rgba(239, 68, 68, 0.3);
}

.room-status-badge.closed {
  background: rgba(148, 163, 184, 0.1);
  color: #94a3b8;
}

.room-details {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
  margin-bottom: 16px;
}

.room-detail-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 12px 14px;
  background: rgba(15, 23, 42, 0.5);
  border: 1px solid rgba(148, 163, 184, 0.08);
  border-radius: 10px;
}

.detail-label {
  font-size: 11px;
  color: #64748b;
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.detail-value {
  font-size: 14px;
  color: #e2e8f0;
  font-weight: 600;
}

.detail-value.highlight {
  color: #22d3ee;
  font-family: 'Consolas', monospace;
}

.detail-value.private {
  color: #fbbf24;
}

.detail-value.public {
  color: #4ade80;
}

.room-detail-item.full-width {
  grid-column: 1 / -1;
}

.room-connect-info {
  padding: 20px;
  background: rgba(34, 197, 94, 0.08);
  border: 1px solid rgba(34, 197, 94, 0.2);
  border-radius: 12px;
  margin-bottom: 16px;
  text-align: center;
}

.connect-title {
  font-size: 17px;
  font-weight: 700;
  color: #4ade80;
  margin-bottom: 8px;
}

.connect-hint {
  font-size: 13px;
  color: #94a3b8;
  margin-bottom: 14px;
}

.connect-address {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
}

.connect-address code {
  padding: 12px 24px;
  background: rgba(15, 23, 42, 0.8);
  color: #22d3ee;
  border-radius: 10px;
  font-family: 'Consolas', 'Monaco', monospace;
  font-size: 17px;
  font-weight: 700;
  letter-spacing: 1px;
  border: 1px solid rgba(34, 211, 238, 0.2);
}

.copy-btn {
  width: 44px;
  height: 44px;
  border: 1px solid rgba(34, 211, 238, 0.3);
  border-radius: 10px;
  background: rgba(34, 211, 238, 0.1);
  color: #22d3ee;
  font-size: 18px;
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  justify-content: center;
}

.copy-btn:hover {
  background: rgba(34, 211, 238, 0.2);
  border-color: #22d3ee;
}

.close-room-btn {
  width: 100%;
  padding: 12px;
  border: 1px solid rgba(239, 68, 68, 0.3);
  border-radius: 10px;
  background: rgba(239, 68, 68, 0.1);
  color: #f87171;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
}

.close-room-btn:hover {
  background: rgba(239, 68, 68, 0.2);
  border-color: rgba(239, 68, 68, 0.5);
}

.section-icon-img {
  width: 32px;
  height: 32px;
  object-fit: contain;
}

.subsection-icon-img {
  width: 24px;
  height: 24px;
  object-fit: contain;
  margin-right: 8px;
  vertical-align: text-bottom;
}

.label-icon-img {
  width: 20px;
  height: 20px;
  object-fit: contain;
}
</style>
