<template>
  <Teleport to="body">
    <div v-if="show" class="modal-overlay" @click.self="$emit('close')">
      <div class="create-room-modal">
        <!-- 头部 -->
        <div class="modal-header">
          <div class="header-icon">🎮</div>
          <div class="header-content">
            <h3 class="modal-title">创建联机房间</h3>
            <p class="modal-subtitle">选择存档并开放局域网供好友加入</p>
          </div>
          <button class="close-btn" @click="$emit('close')">
            <span>✕</span>
          </button>
        </div>

        <!-- 内容区 -->
        <div class="modal-body">
          <!-- 步骤指示器 -->
          <div class="step-indicator">
            <div class="step" :class="{ active: currentStep >= 1, completed: currentStep > 1 }">
              <span class="step-num">1</span>
              <span class="step-label">选择存档</span>
            </div>
            <div class="step-line" :class="{ active: currentStep > 1 }"></div>
            <div class="step" :class="{ active: currentStep >= 2, completed: currentStep > 2 }">
              <span class="step-num">2</span>
              <span class="step-label">房间设置</span>
            </div>
            <div class="step-line" :class="{ active: currentStep > 2 }"></div>
            <div class="step" :class="{ active: currentStep >= 3 }">
              <span class="step-num">3</span>
              <span class="step-label">确认创建</span>
            </div>
          </div>

          <!-- 步骤1：选择存档 -->
          <div v-if="currentStep === 1" class="step-content">
            <div class="section-header">
              <span class="section-icon">📁</span>
              <span class="section-title">选择要开放的存档</span>
            </div>

            <div v-if="loadingSaves" class="loading-state">
              <div class="spinner"></div>
              <span>正在加载存档列表...</span>
            </div>

            <div v-else-if="saves.length === 0" class="empty-state">
              <div class="empty-icon">📭</div>
              <div class="empty-text">没有找到存档</div>
              <div class="empty-hint">请先创建一个单人游戏存档</div>
            </div>

            <div v-else class="saves-grid">
              <div 
                v-for="save in saves" 
                :key="save.name"
                class="save-card"
                :class="{ selected: selectedSave === save.name }"
                @click="selectSave(save)"
              >
                <div class="save-icon">🌍</div>
                <div class="save-info">
                  <div class="save-name">{{ save.level_name || save.name }}</div>
                  <div class="save-meta">
                    <span class="meta-item">
                      <span class="meta-icon">📂</span>
                      {{ save.name }}
                    </span>
                    <span class="meta-item" v-if="save.game_mode !== undefined">
                      <span class="meta-icon">🎯</span>
                      {{ getGameModeLabel(save.game_mode) }}
                    </span>
                  </div>
                </div>
                <div class="save-status">
                  <span v-if="save.allow_commands" class="status-badge enabled">
                    <span>✓</span> 已开启作弊
                  </span>
                  <span v-else class="status-badge disabled">
                    <span>○</span> 未开启作弊
                  </span>
                </div>
                <div class="save-check" v-if="selectedSave === save.name">✓</div>
              </div>
            </div>
          </div>

          <!-- 步骤2：房间设置 -->
          <div v-if="currentStep === 2" class="step-content">
            <div class="form-grid">
              <div class="form-group">
                <label class="form-label">
                  <span class="label-icon">🏠</span>
                  房间名称
                </label>
                <input 
                  v-model="roomName" 
                  type="text" 
                  class="form-input"
                  placeholder="给你的房间起个名字"
                  maxlength="20"
                />
              </div>

              <div class="form-group">
                <label class="form-label">
                  <span class="label-icon">🔌</span>
                  开放端口
                </label>
                <input 
                  v-model.number="port" 
                  type="number" 
                  class="form-input"
                  :class="{ 'input-error': portError, 'input-success': portChecked && !portError }"
                  placeholder="25565"
                  min="1024"
                  max="65535"
                  @blur="checkPort"
                />
                <div v-if="portError" class="form-hint error">{{ portError }}</div>
                <div v-else-if="portChecked" class="form-hint success">✓ 端口可用</div>
                <div v-else class="form-hint">建议使用默认端口 25565</div>
              </div>

              <div class="form-group">
                <label class="form-label">
                  <span class="label-icon">🎮</span>
                  游戏模式
                </label>
                <select v-model="gameMode" class="form-select">
                  <option value="survival">生存模式</option>
                  <option value="creative">创造模式</option>
                  <option value="adventure">冒险模式</option>
                  <option value="spectator">旁观模式</option>
                </select>
              </div>
            </div>
          </div>

          <!-- 步骤3：确认 -->
          <div v-if="currentStep === 3" class="step-content">
            <div class="confirm-section">
              <div class="confirm-title">📋 确认房间信息</div>
              
              <div class="confirm-card">
                <div class="confirm-row">
                  <span class="confirm-label">房间名称</span>
                  <span class="confirm-value">{{ roomName }}</span>
                </div>
                <div class="confirm-row">
                  <span class="confirm-label">存档名称</span>
                  <span class="confirm-value">{{ selectedSave }}</span>
                </div>
                <div class="confirm-row">
                  <span class="confirm-label">开放端口</span>
                  <span class="confirm-value">{{ port }}</span>
                </div>
                <div class="confirm-row">
                  <span class="confirm-label">游戏模式</span>
                  <span class="confirm-value">{{ getGameModeLabel(gameMode) }}</span>
                </div>
                <div class="confirm-row">
                  <span class="confirm-label">房间类型</span>
                  <span class="confirm-value">🌐 公开房间</span>
                </div>
              </div>

              <div class="warning-box">
                <div class="warning-icon">⚠️</div>
                <div class="warning-content">
                  <div class="warning-title">注意事项</div>
                  <ul class="warning-list">
                    <li>必须连接到 Easytier 虚拟网络才能创建联机房间</li>
                    <li>创建房间后，游戏将自动启动并进入存档</li>
                    <li>请在游戏加载完成后手动进入存档</li>
                    <li>系统将自动执行命令开放局域网</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- 底部按钮 -->
        <div class="modal-footer">
          <button 
            v-if="currentStep > 1" 
            class="footer-btn btn-secondary"
            @click="prevStep"
            :disabled="isCreating"
          >
            <span>←</span> 上一步
          </button>
          
          <div class="footer-spacer"></div>
          
          <button 
            v-if="currentStep < 3" 
            class="footer-btn btn-primary"
            @click="nextStep"
            :disabled="!canProceed"
          >
            下一步 <span>→</span>
          </button>
          
          <button 
            v-if="currentStep === 3" 
            class="footer-btn btn-success"
            @click="createRoom"
            :disabled="isCreating"
          >
            <span v-if="isCreating" class="btn-spinner"></span>
            <span v-else>🚀</span>
            {{ isCreating ? '创建中...' : '创建房间' }}
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, watch, computed } from 'vue'
import { useToast } from '../composables/useToast'
import { useBackend } from '../composables/useBackend'

const props = defineProps<{
  show: boolean
  selectedVersion: string
  username: string
  uuid?: string
  accessToken?: string
  jvmArgs?: string[]
}>()

const { fetchApi, networkStatus } = useBackend()
const { showToast } = useToast()

const emit = defineEmits(['close', 'created'])

// 状态
const currentStep = ref(1)
const loadingSaves = ref(false)
const isCreating = ref(false)

// 存档列表
interface SaveInfo {
  name: string
  level_name?: string
  allow_commands: boolean
  game_mode: number
  last_played: number
}
const saves = ref<SaveInfo[]>([])
const selectedSave = ref('')

// 房间设置
const roomName = ref('')
const port = ref(25565)
const gameMode = ref('survival')
// const password = ref('') // 移除密码
const portError = ref('')
const portChecked = ref(false)

// 检查端口是否被占用
async function checkPort() {
  if (!port.value || port.value < 1024 || port.value > 65535) {
    portError.value = '端口号必须在 1024-65535 之间'
    portChecked.value = false
    return
  }
  
  try {
    const response = await fetchApi(`/api/room/check-port?port=${port.value}`)
    const result = await response.json()
    
    if (result.ok) {
      if (result.available) {
        portError.value = ''
        portChecked.value = true
      } else {
        portError.value = result.message
        portChecked.value = false
      }
    } else {
      portError.value = result.error || '检查端口失败'
      portChecked.value = false
    }
  } catch (e) {
    console.error('检查端口失败:', e)
    portError.value = ''
    portChecked.value = true  // 网络错误时默认可用
  }
}

// 计算属性
const canProceed = computed(() => {
  if (currentStep.value === 1) {
    return !!selectedSave.value
  }
  if (currentStep.value === 2) {
    return !!roomName.value.trim() && port.value >= 1024 && port.value <= 65535
  }
  return true
})

// 游戏模式标签
function getGameModeLabel(mode: number | string): string {
  const modeMap: Record<string | number, string> = {
    0: '生存模式',
    1: '创造模式',
    2: '冒险模式',
    3: '旁观模式',
    'survival': '生存模式',
    'creative': '创造模式',
    'adventure': '冒险模式',
    'spectator': '旁观模式'
  }
  return modeMap[mode] || '生存模式'
}

// 选择存档
function selectSave(save: SaveInfo) {
  selectedSave.value = save.name
  // 自动设置游戏模式
  const modeMap: Record<number, string> = {
    0: 'survival',
    1: 'creative',
    2: 'adventure',
    3: 'spectator'
  }
  gameMode.value = modeMap[save.game_mode] || 'survival'
}

// 步骤控制
async function nextStep() {
  if (canProceed.value && currentStep.value < 3) {
    // 从步骤1进入步骤2时
    if (currentStep.value === 1) {
      // 设置默认房间名（基于存档名）
      if (!roomName.value && selectedSave.value) {
        roomName.value = `${selectedSave.value}的房间`
      }
      // 自动检测默认端口
      await checkPort()
    }
    currentStep.value++
  }
}

function prevStep() {
  if (currentStep.value > 1) {
    currentStep.value--
  }
}

// 加载存档列表
async function loadSaves() {
  loadingSaves.value = true
  try {
    // 传递选中的版本，以便后端从正确的版本隔离目录加载存档
    // 确保版本参数被正确编码
    const versionParam = props.selectedVersion ? `?version_id=${encodeURIComponent(props.selectedVersion)}` : ''
    
    // 使用 useBackend 自动处理后端地址
    const url = `/api/room/saves${versionParam}`
    console.log('Loading saves from:', url)
    
    const response = await fetchApi(url)
    
    // 检查响应状态
    if (!response.ok) {
        // 尝试读取错误信息
        try {
            const errorData = await response.json()
            console.error('加载存档失败 (API错误):', errorData)
            // 如果是 500 错误，但后端返回了 JSON 格式的 error，我们可以显示出来
            if (errorData.error) {
                // 也许可以显示一个 toast 提示
                console.warn(`服务端错误: ${errorData.error}`)
            }
        } catch (e) {
            console.error(`加载存档失败 (HTTP ${response.status}):`, await response.text())
        }
        // 即使失败，也把存档列表置空，避免界面一直转圈
        saves.value = []
        return
    }
    
    const result = await response.json()
    
    if (result.ok) {
      saves.value = result.saves || []
    } else {
      console.error('加载存档失败:', result.error)
      saves.value = []
    }
  } catch (e: any) {
    console.error('加载存档失败 (网络/解析错误):', e)
    saves.value = []
  } finally {
    loadingSaves.value = false
  }
}

// 创建房间
async function createRoom() {
  // 再次检查网络连接
  if (networkStatus.value && !networkStatus.value.connected) {
    showToast('未连接到 Easytier 网络，无法创建联机房间', 'error')
    return
  }

  // 检查版本
  if (!props.selectedVersion) {
    showToast('未选择游戏版本', 'error')
    return
  }

  if (isCreating.value) return
  
  isCreating.value = true
  
  try {
    const payload = {
      room_name: roomName.value,
      save_name: selectedSave.value,
      port: port.value,
      password: null, // 移除密码
      game_mode: gameMode.value,
      max_players: 8, // 默认值
      version_id: props.selectedVersion, // 传递版本ID
      username: props.username,
      uuid: props.uuid,
      access_token: props.accessToken,
      jvm_args: props.jvmArgs
    }
    
    console.log('创建房间 payload:', payload)
    
    const r = await fetchApi('/api/room/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    })
    
    const result = await r.json()
    
    if (result.ok) {
      emit('created', result.room)
      emit('close')
    } else {
      showToast(`创建失败: ${result.error}`, 'error')
    }
  } catch (e: any) {
    showToast(`创建失败: ${e.message}`, 'error')
  } finally {
    isCreating.value = false
  }
}

// 监听显示状态
watch(() => props.show, (newVal) => {
  if (newVal) {
    // 重置状态
    currentStep.value = 1
    selectedSave.value = ''
    roomName.value = ''
    port.value = 25565
    gameMode.value = 'survival'
    // password.value = ''
    
    // 加载存档
    loadSaves()

    // 检查网络状态
    if (networkStatus.value && !networkStatus.value.connected) {
      showToast('未连接到 Easytier 网络，无法创建联机房间', 'error')
    }
  }
})
</script>

<style scoped>
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(15, 23, 42, 0.75);
  backdrop-filter: blur(4px);
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

.create-room-modal {
  background: linear-gradient(145deg, #1e293b 0%, #0f172a 100%);
  border: 1px solid rgba(148, 163, 184, 0.1);
  border-radius: 20px;
  width: 95%;
  max-width: 680px;
  max-height: 90vh;
  overflow: hidden;
  box-shadow: 
    0 25px 50px -12px rgba(0, 0, 0, 0.5),
    0 0 0 1px rgba(148, 163, 184, 0.1);
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

/* 头部 */
.modal-header {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 24px 28px;
  background: linear-gradient(135deg, rgba(34, 197, 94, 0.1) 0%, rgba(16, 185, 129, 0.05) 100%);
  border-bottom: 1px solid rgba(148, 163, 184, 0.1);
}

.header-icon {
  font-size: 36px;
  filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.3));
}

.header-content {
  flex: 1;
}

.modal-title {
  font-size: 22px;
  font-weight: 700;
  color: #f1f5f9;
  margin: 0 0 4px 0;
  letter-spacing: -0.3px;
}

.modal-subtitle {
  font-size: 14px;
  color: #94a3b8;
  margin: 0;
}

.close-btn {
  width: 36px;
  height: 36px;
  border: none;
  border-radius: 10px;
  background: rgba(148, 163, 184, 0.1);
  color: #94a3b8;
  font-size: 18px;
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  justify-content: center;
}

.close-btn:hover {
  background: rgba(239, 68, 68, 0.2);
  color: #f87171;
}

/* 步骤指示器 */
.step-indicator {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
  gap: 8px;
}

.step {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 16px;
  border-radius: 20px;
  background: rgba(148, 163, 184, 0.1);
  transition: all 0.3s ease;
}

.step.active {
  background: rgba(34, 197, 94, 0.15);
}

.step.completed {
  background: rgba(34, 197, 94, 0.25);
}

.step-num {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background: rgba(148, 163, 184, 0.2);
  color: #94a3b8;
  font-size: 12px;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.3s ease;
}

.step.active .step-num {
  background: #22c55e;
  color: #0f172a;
}

.step.completed .step-num {
  background: #22c55e;
  color: #0f172a;
}

.step-label {
  font-size: 13px;
  color: #64748b;
  font-weight: 500;
  transition: all 0.3s ease;
}

.step.active .step-label,
.step.completed .step-label {
  color: #22c55e;
}

.step-line {
  width: 40px;
  height: 2px;
  background: rgba(148, 163, 184, 0.2);
  border-radius: 1px;
  transition: all 0.3s ease;
}

.step-line.active {
  background: #22c55e;
}

/* 内容区 */
.modal-body {
  padding: 0 28px 24px;
  max-height: 55vh;
  overflow-y: auto;
}

.modal-body::-webkit-scrollbar {
  width: 6px;
}

.modal-body::-webkit-scrollbar-track {
  background: rgba(148, 163, 184, 0.1);
  border-radius: 3px;
}

.modal-body::-webkit-scrollbar-thumb {
  background: rgba(148, 163, 184, 0.3);
  border-radius: 3px;
}

.step-content {
  animation: fadeSlide 0.3s ease;
}

@keyframes fadeSlide {
  from {
    opacity: 0;
    transform: translateX(10px);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
}

.section-header {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 16px;
}

.section-icon {
  font-size: 20px;
}

.section-title {
  font-size: 15px;
  font-weight: 600;
  color: #e2e8f0;
}

/* 加载和空状态 */
.loading-state,
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 48px 20px;
  color: #64748b;
}

.spinner {
  width: 32px;
  height: 32px;
  border: 3px solid rgba(148, 163, 184, 0.2);
  border-top-color: #22c55e;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
  margin-bottom: 12px;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.empty-icon {
  font-size: 48px;
  margin-bottom: 12px;
  opacity: 0.8;
}

.empty-text {
  font-size: 16px;
  font-weight: 600;
  color: #94a3b8;
  margin-bottom: 6px;
}

.empty-hint {
  font-size: 13px;
  color: #64748b;
}

/* 存档网格 */
.saves-grid {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.save-card {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 16px;
  background: rgba(148, 163, 184, 0.05);
  border: 2px solid transparent;
  border-radius: 14px;
  cursor: pointer;
  transition: all 0.2s ease;
  position: relative;
}

.save-card:hover {
  background: rgba(148, 163, 184, 0.1);
  border-color: rgba(34, 197, 94, 0.3);
}

.save-card.selected {
  background: rgba(34, 197, 94, 0.1);
  border-color: #22c55e;
}

.save-icon {
  font-size: 32px;
  flex-shrink: 0;
}

.save-info {
  flex: 1;
  min-width: 0;
}

.save-name {
  font-size: 15px;
  font-weight: 600;
  color: #f1f5f9;
  margin-bottom: 4px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.save-meta {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
}

.meta-item {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
  color: #64748b;
}

.meta-icon {
  font-size: 11px;
}

.save-status {
  flex-shrink: 0;
}

.status-badge {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px 10px;
  border-radius: 6px;
  font-size: 11px;
  font-weight: 600;
}

.status-badge.enabled {
  background: rgba(34, 197, 94, 0.15);
  color: #4ade80;
}

.status-badge.disabled {
  background: rgba(148, 163, 184, 0.1);
  color: #64748b;
}

.save-check {
  position: absolute;
  top: 12px;
  right: 12px;
  width: 22px;
  height: 22px;
  background: #22c55e;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #0f172a;
  font-size: 12px;
  font-weight: 700;
}

/* 表单 */
.form-grid {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

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
  color: #e2e8f0;
}

.label-icon {
  font-size: 16px;
}

.optional {
  font-size: 12px;
  color: #64748b;
  font-weight: 400;
}

.form-input,
.form-select {
  width: 100%;
  padding: 12px 16px;
  background: rgba(15, 23, 42, 0.6);
  border: 2px solid rgba(148, 163, 184, 0.15);
  border-radius: 10px;
  font-size: 14px;
  color: #f1f5f9;
  font-family: inherit;
  transition: all 0.2s ease;
}

.form-input:focus,
.form-select:focus {
  outline: none;
  border-color: #22c55e;
  box-shadow: 0 0 0 3px rgba(34, 197, 94, 0.1);
}

.form-input::placeholder {
  color: #475569;
}

.form-select {
  cursor: pointer;
}

.form-select option {
  background: #1e293b;
  color: #f1f5f9;
}

.form-hint {
  font-size: 12px;
  color: #64748b;
  padding-left: 4px;
}

.form-hint.error {
  color: #ef4444;
}

.form-hint.success {
  color: #22c55e;
}

.input-error {
  border-color: #ef4444 !important;
}

.input-success {
  border-color: #22c55e !important;
}

/* 确认区域 */
.confirm-section {
  padding: 8px 0;
}

.confirm-title {
  font-size: 16px;
  font-weight: 600;
  color: #e2e8f0;
  margin-bottom: 16px;
}

.confirm-card {
  background: rgba(15, 23, 42, 0.6);
  border: 1px solid rgba(148, 163, 184, 0.1);
  border-radius: 12px;
  padding: 4px;
  margin-bottom: 20px;
}

.confirm-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  border-radius: 8px;
}

.confirm-row:hover {
  background: rgba(148, 163, 184, 0.05);
}

.confirm-label {
  font-size: 14px;
  color: #94a3b8;
}

.confirm-value {
  font-size: 14px;
  font-weight: 600;
  color: #f1f5f9;
}

.warning-box {
  display: flex;
  gap: 14px;
  padding: 16px;
  background: rgba(251, 191, 36, 0.08);
  border: 1px solid rgba(251, 191, 36, 0.2);
  border-radius: 12px;
}

.warning-icon {
  font-size: 24px;
  flex-shrink: 0;
}

.warning-title {
  font-size: 14px;
  font-weight: 600;
  color: #fbbf24;
  margin-bottom: 8px;
}

.warning-list {
  margin: 0;
  padding-left: 18px;
  font-size: 13px;
  color: #94a3b8;
  line-height: 1.7;
}

.warning-list li {
  margin-bottom: 4px;
}

/* 底部按钮 */
.modal-footer {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 20px 28px;
  background: rgba(15, 23, 42, 0.5);
  border-top: 1px solid rgba(148, 163, 184, 0.1);
}

.footer-spacer {
  flex: 1;
}

.footer-btn {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 12px 24px;
  border: none;
  border-radius: 10px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
}

.footer-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-secondary {
  background: rgba(148, 163, 184, 0.1);
  color: #94a3b8;
}

.btn-secondary:hover:not(:disabled) {
  background: rgba(148, 163, 184, 0.2);
  color: #e2e8f0;
}

.btn-primary {
  background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
  color: white;
  box-shadow: 0 4px 12px rgba(59, 130, 246, 0.25);
}

.btn-primary:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: 0 6px 16px rgba(59, 130, 246, 0.35);
}

.btn-success {
  background: linear-gradient(135deg, #22c55e 0%, #16a34a 100%);
  color: white;
  box-shadow: 0 4px 12px rgba(34, 197, 94, 0.25);
}

.btn-success:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: 0 6px 16px rgba(34, 197, 94, 0.35);
}

.btn-spinner {
  width: 16px;
  height: 16px;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-top-color: white;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}
</style>

