<template>
  <n-modal 
    :show="visible" 
    :on-update:show="onUpdateShow"
    display-directive="show"
  >
    <div class="win11-explorer-window">
      <div class="explorer-container">
        <!-- 顶部工具栏 -->
        <div class="explorer-header">
          <div class="nav-controls">
            <n-button quaternary circle size="small" @click="goBack" :disabled="!canGoBack">
              <template #icon><span class="icon">←</span></template>
            </n-button>
            <n-button quaternary circle size="small" @click="goUp" :disabled="!currentPath">
              <template #icon><span class="icon">↑</span></template>
            </n-button>
          </div>
          
          <div class="address-bar">
            <div class="address-icon">
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"></path></svg>
            </div>
            <div class="address-breadcrumbs">
              <span class="crumb-root" @click="loadDrives">此电脑</span>
              <template v-for="(crumb, index) in breadcrumbs" :key="index">
                <span class="crumb-sep">›</span>
                <span class="crumb-item" @click="enter(crumb.path)">{{ crumb.name }}</span>
              </template>
            </div>
            <div class="address-actions">
              <n-button quaternary circle size="tiny" @click="refresh">
                <template #icon><span class="icon">↻</span></template>
              </n-button>
            </div>
          </div>

          <div class="search-bar">
            <n-input placeholder="搜索" size="small" round disabled class="search-input">
              <template #prefix>
                <span class="icon">🔍</span>
              </template>
            </n-input>
          </div>
          
          <!-- 窗口控制按钮 -->
          <div class="window-controls">
            <n-button quaternary circle size="small" @click="onUpdateShow(false)">
              <template #icon><span class="icon">✕</span></template>
            </n-button>
          </div>
        </div>

        <!-- 主体内容区域 -->
        <div class="explorer-body">
          <!-- 左侧导航栏 -->
          <div class="explorer-sidebar">
            <n-scrollbar>
              <div class="sidebar-group">
                <div class="sidebar-header">快速访问</div>
                <div 
                  v-for="item in quickAccess" 
                  :key="item.path" 
                  class="sidebar-item"
                  :class="{ active: currentPath === item.path }"
                  @click="enter(item.path)"
                >
                  <span class="sidebar-icon">
                    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><path d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"></path></svg>
                  </span>
                  <span class="sidebar-text">{{ item.name }}</span>
                </div>
              </div>
              
              <div class="sidebar-group">
                <div class="sidebar-header">此电脑</div>
                <div 
                  v-for="drive in drives" 
                  :key="drive.path" 
                  class="sidebar-item"
                  :class="{ active: currentPath === drive.path }"
                  @click="enter(drive.path)"
                >
                  <span class="sidebar-icon">
                    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 12h14M12 5l7 7-7 7"></path><rect x="2" y="6" width="20" height="12" rx="2"></rect><circle cx="12" cy="12" r="2"></circle></svg>
                  </span>
                  <span class="sidebar-text">{{ drive.name }}</span>
                </div>
              </div>
            </n-scrollbar>
          </div>

          <!-- 右侧文件列表 -->
          <div class="explorer-main">
            <div class="file-list-header">
              <div class="col-name">名称</div>
              <div class="col-date">修改日期</div>
            </div>
            
            <div class="file-list-container">
              <n-scrollbar>
                <div v-if="loading" class="loading-state">
                  <n-spin size="medium" />
                </div>
                <div v-else-if="entries.length === 0" class="empty-state">
                  此文件夹为空
                </div>
                <div v-else class="file-list">
                  <div 
                    v-for="entry in entries" 
                    :key="entry.path" 
                    class="file-item"
                    :class="{ selected: selectedPath === entry.path }"
                    @click="select(entry.path)"
                    @dblclick="enter(entry.path)"
                  >
                    <div class="file-icon">
                      <svg viewBox="0 0 24 24" width="20" height="20" fill="#fbbf24" stroke="none"><path d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"></path></svg>
                    </div>
                    <div class="file-name">{{ entry.name }}</div>
                    <div class="file-date">-</div>
                  </div>
                </div>
              </n-scrollbar>
            </div>
          </div>
        </div>

        <!-- 底部操作栏 -->
        <div class="explorer-footer">
          <div class="selected-info">
            <span class="label">文件夹:</span>
            <n-input :value="displayName" readonly size="small" class="path-display" />
          </div>
          <div class="footer-actions">
            <n-button @click="confirm" type="primary" :disabled="!selectedPath">选择文件夹</n-button>
            <n-button @click="onUpdateShow(false)">取消</n-button>
          </div>
        </div>
      </div>
    </div>
  </n-modal>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import { NModal, NButton, NInput, NScrollbar, NSpin } from 'naive-ui'
import { useBackend } from '../composables/useBackend'

const props = defineProps<{ visible: boolean, initialPath?: string }>()
const emit = defineEmits<{ (e: 'update:visible', v: boolean): void, (e: 'confirm', path: string): void }>()

const { fetchApi } = useBackend()

// 状态
const currentPath = ref('')
const selectedPath = ref('')
const drives = ref<any[]>([])
const entries = ref<any[]>([])
const quickAccess = ref<any[]>([])
const history = ref<string[]>([])
const historyIndex = ref(-1)
const loading = ref(false)

// 计算属性
const displayName = computed(() => {
  if (!selectedPath.value) return ''
  const parts = selectedPath.value.split(/[/\\]/)
  return parts[parts.length - 1] || selectedPath.value
})

const breadcrumbs = computed(() => {
  if (!currentPath.value) return []
  const p = currentPath.value.replace(/[/\\]+$/, '')
  const parts = p.split(/[/\\]/).filter(Boolean)
  const list: Array<{name:string, path:string}> = []
  let acc = ''
  
  // 处理 Windows 盘符
  if (p.includes(':')) {
    // 如果是 Windows 路径
    parts.forEach((name, idx) => {
      if (idx === 0) {
        acc = name.endsWith('\\') ? name : name + '\\'
        list.push({ name, path: acc })
      } else {
        acc = acc.endsWith('\\') ? acc + name : acc + '\\' + name
        list.push({ name, path: acc })
      }
    })
  } else {
    // 其他系统路径
    parts.forEach((name) => {
      acc = acc + '/' + name
      list.push({ name, path: acc })
    })
  }
  return list
})

const canGoBack = computed(() => historyIndex.value > 0)

// 方法
function onUpdateShow(v: boolean) { emit('update:visible', v) }

async function loadQuick() {
  try {
    const r = await fetchApi('/api/system/known-folders')
    const res = await r.json()
    if (res.ok) {
      quickAccess.value = res.items || []
    }
  } catch (e) {
    console.error('Failed to load quick access', e)
  }
}

async function loadDrives() {
  loading.value = true
  try {
    const r = await fetchApi('/api/system/drives')
    const res = await r.json()
    if (res.ok) {
      drives.value = res.drives || []
      // 如果没有当前路径，就在根目录视图
      if (!currentPath.value) {
        entries.value = [] // 在根视图下不显示文件，只显示侧边栏的驱动器
      }
    }
  } finally {
    loading.value = false
  }
}

async function loadDir(path: string, pushHistory = true) {
  if (!path) return
  
  loading.value = true
  try {
    const r = await fetchApi(`/api/system/list-dir?path=${encodeURIComponent(path)}`)
    const res = await r.json()
    if (res.ok) {
      entries.value = res.entries || []
      currentPath.value = res.current_path || path
      selectedPath.value = currentPath.value // 进入目录时默认选中该目录
      
      if (pushHistory) {
        if (historyIndex.value < history.value.length - 1) {
          history.value = history.value.slice(0, historyIndex.value + 1)
        }
        history.value.push(currentPath.value)
        historyIndex.value++
      }
    }
  } catch (e) {
    console.error('Failed to load dir', e)
  } finally {
    loading.value = false
  }
}

function enter(path: string) {
  loadDir(path)
}

function select(path: string) {
  selectedPath.value = path
}

function goBack() {
  if (historyIndex.value > 0) {
    historyIndex.value--
    const path = history.value[historyIndex.value]
    loadDir(path, false)
  }
}

function goUp() {
  if (!currentPath.value) return
  
  // 简单的向上导航逻辑
  const p = currentPath.value.replace(/[/\\]+$/, '')
  const lastSep = Math.max(p.lastIndexOf('/'), p.lastIndexOf('\\'))
  
  if (lastSep <= 0) {
    // 到达根目录或盘符
    if (p.endsWith(':')) {
      // Windows 盘符根目录，再上就是驱动器列表
      // 但我们的UI设计是驱动器在侧边栏，主区域也可以显示驱动器列表
      // 这里简化为重新加载驱动器列表，并清空当前路径
      currentPath.value = ''
      entries.value = [] // 清空文件列表
      loadDrives()
    } else {
      loadDrives()
    }
  } else {
    const parent = p.slice(0, lastSep) || '/' // 兼容 Unix 根目录
    // Windows 盘符处理: C:/Users -> C:/
    if (parent.endsWith(':')) {
       loadDir(parent + '/')
    } else {
       loadDir(parent)
    }
  }
}

function refresh() {
  if (currentPath.value) {
    loadDir(currentPath.value, false)
  } else {
    loadDrives()
  }
}

function confirm() {
  if (selectedPath.value) {
    emit('confirm', selectedPath.value)
    emit('update:visible', false)
  }
}

// 生命周期
watch(() => props.visible, async (val) => {
  if (val) {
    await loadQuick()
    await loadDrives()
    if (props.initialPath) {
      await loadDir(props.initialPath)
    } else if (drives.value.length > 0) {
        // 默认不自动进入第一个盘，等待用户选择
    }
  }
})

onMounted(async () => {
  await loadQuick()
  await loadDrives()
})
</script>

<style scoped>
.win11-explorer-window {
  width: 900px;
  height: 600px;
  background: #202020;
  border-radius: 8px;
  box-shadow: 0 0 0 1px #444, 0 20px 50px rgba(0,0,0,0.5);
  overflow: hidden;
  display: flex;
  flex-direction: column;
  color: #fff;
  font-family: "Segoe UI", "Microsoft YaHei", sans-serif;
}

.explorer-container {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: #202020;
}

/* Header */
.explorer-header {
  display: flex;
  align-items: center;
  padding: 8px 12px;
  gap: 12px;
  background: #2c2c2c;
  border-bottom: 1px solid #333;
  flex-shrink: 0;
}

.nav-controls {
  display: flex;
  gap: 4px;
}

.icon {
  font-size: 16px;
  color: #ccc;
}

.address-bar {
  flex: 1;
  display: flex;
  align-items: center;
  background: #333;
  border-radius: 4px;
  padding: 4px 8px;
  border: 1px solid #444;
  transition: border-color 0.2s;
}

.address-bar:hover {
  border-color: #555;
  background: #383838;
}

.address-icon {
  color: #fbbf24;
  margin-right: 8px;
  display: flex;
  align-items: center;
}

.address-breadcrumbs {
  flex: 1;
  display: flex;
  align-items: center;
  overflow: hidden;
  white-space: nowrap;
  font-size: 13px;
}

.crumb-root, .crumb-item {
  cursor: pointer;
  padding: 2px 4px;
  border-radius: 2px;
  color: #ddd;
}

.crumb-root:hover, .crumb-item:hover {
  background: rgba(255,255,255,0.1);
}

.crumb-sep {
  color: #888;
  margin: 0 2px;
}

.search-bar {
  width: 200px;
}

:deep(.n-input) {
  background-color: #333 !important;
}
:deep(.n-input .n-input__input-el) {
  color: #fff !important;
}

.window-controls {
  margin-left: auto;
  display: flex;
  align-items: center;
}


/* Body */
.explorer-body {
  flex: 1;
  display: flex;
  overflow: hidden;
  min-height: 0; /* 重要：允许 flex 容器收缩 */
}

.explorer-sidebar {
  width: 200px;
  background: #252525;
  border-right: 1px solid #333;
  padding: 10px 0;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
}

.sidebar-group {
  margin-bottom: 16px;
}

.sidebar-header {
  padding: 4px 16px;
  font-size: 11px;
  color: #888;
  font-weight: 600;
  text-transform: uppercase;
}

.sidebar-item {
  display: flex;
  align-items: center;
  padding: 6px 16px;
  cursor: pointer;
  transition: background 0.1s;
  gap: 8px;
}

.sidebar-item:hover {
  background: rgba(255,255,255,0.05);
}

.sidebar-item.active {
  background: rgba(255,255,255,0.1);
  border-left: 3px solid #60cdff;
}

.sidebar-icon {
  font-size: 16px;
  width: 20px;
  text-align: center;
}

.sidebar-text {
  font-size: 13px;
  color: #eee;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* Main Content */
.explorer-main {
  flex: 1;
  display: flex;
  flex-direction: column;
  background: #202020;
  overflow: hidden;
}

.file-list-header {
  display: flex;
  padding: 8px 16px;
  border-bottom: 1px solid #333;
  font-size: 12px;
  color: #999;
  flex-shrink: 0;
}

.file-list-container {
  flex: 1;
  overflow: hidden;
  position: relative;
}

.col-name { flex: 1; }
.col-date { width: 120px; }

.file-list {
  padding: 4px;
  min-height: 100%; /* 确保可以滚动 */
}

.file-item {
  display: flex;
  align-items: center;
  padding: 6px 12px;
  cursor: pointer;
  border-radius: 4px;
  margin-bottom: 2px;
}

.file-item:hover {
  background: rgba(255,255,255,0.05);
}

.file-item.selected {
  background: rgba(96, 205, 255, 0.2);
  border: 1px solid rgba(96, 205, 255, 0.3);
}

.file-icon {
  margin-right: 12px;
  display: flex;
  align-items: center;
}

.file-name {
  flex: 1;
  font-size: 13px;
  color: #eee;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.file-date {
  width: 120px;
  font-size: 12px;
  color: #888;
}

.empty-state {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 100%;
  color: #666;
  font-size: 14px;
}

.loading-state {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 100%;
  padding: 20px;
}

/* Footer */
.explorer-footer {
  padding: 12px 16px;
  background: #2c2c2c;
  border-top: 1px solid #333;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  flex-shrink: 0;
}

.selected-info {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 10px;
}

.selected-info .label {
  font-size: 13px;
  color: #ccc;
  white-space: nowrap;
}

.path-display {
  max-width: 400px;
}

.footer-actions {
  display: flex;
  gap: 10px;
}

/* Scrollbar customization */
::-webkit-scrollbar {
  width: 10px;
  height: 10px;
}

::-webkit-scrollbar-track {
  background: transparent;
}

::-webkit-scrollbar-thumb {
  background: #444;
  border-radius: 5px;
  border: 2px solid #202020;
}

::-webkit-scrollbar-thumb:hover {
  background: #555;
}
</style>
