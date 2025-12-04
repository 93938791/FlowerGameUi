<template>
  <div class="resources-page">
    <div class="panel-section">
      <h3 class="section-title">📥 资源下载</h3>
      
      <!-- Tabs -->
      <div class="tabs">
        <button 
          v-for="tab in tabs" 
          :key="tab.id"
          :class="['tab-btn', { active: currentTab === tab.id }]"
          @click="currentTab = tab.id"
        >
          {{ tab.name }}
        </button>
      </div>

      <!-- Search Bar & Filters -->
      <div class="search-bar-container">
        <div class="search-bar">
          <input 
            v-model="searchQuery" 
            @keyup.enter="resetAndSearch"
            type="text" 
            class="qq-input" 
            placeholder="搜索资源..." 
          />
          <button @click="resetAndSearch" class="qq-btn" :disabled="loading">
            <span v-if="loading" class="loading-spinner-sm"></span>
            {{ loading ? '搜索中...' : '🔍 搜索' }}
          </button>
        </div>
        
        <!-- Filters -->
        <div class="filters" v-if="currentTab === 'mod' || currentTab === 'modpack'">
           <select v-model="selectedLoader" class="qq-select filter-select" @change="resetAndSearch">
             <option value="">全部加载器</option>
             <option value="fabric">Fabric</option>
             <option value="forge">Forge</option>
             <option value="neoforge">NeoForge</option>
             <option value="quilt">Quilt</option>
           </select>
           
           <button v-if="currentTab === 'modpack'" @click="pickAndImportMrPack" class="qq-btn secondary" style="margin-left: 12px;">
             📦 导入本地
           </button>
        </div>
      </div>

      <!-- Results Grid -->
      <div class="resources-grid" v-if="resources.length > 0">
        <div v-for="res in resources" :key="res.project_id" class="resource-card">
          <img :src="res.icon_url || '/icons/mod.png'" class="resource-icon" alt="icon" />
          <div class="resource-info">
            <div class="resource-header">
              <h4 class="resource-title" :title="res.title">{{ res.title }}</h4>
              <div class="resource-actions-top">
                <span v-if="!res.translated_description && !res.translating" 
                      @click.stop="translateDescription(res)" 
                      class="translate-btn" 
                      title="点击翻译">
                  <img src="/icons/语言翻译.png" alt="翻译" class="translate-icon" />
                </span>
                <span v-if="res.translating" class="loading-spinner-xs"></span>
              </div>
            </div>
            <p class="resource-desc" :title="res.translated_description || res.description">
              {{ res.translated_description || res.description }}
            </p>
            <div class="resource-meta">
              <span class="author">👤 {{ res.author }}</span>
              <span class="downloads">⬇️ {{ formatNumber(res.downloads) }}</span>
            </div>
            <div class="resource-actions">
                <a :href="`https://modrinth.com/project/${res.slug}`" target="_blank" class="link-btn">🌐 查看</a>
                <button @click="showVersions(res)" class="download-btn">📥 选择版本</button>
            </div>
          </div>
        </div>
      </div>
      
      <!-- Load More / Sentinel -->
      <div ref="sentinel" class="sentinel" v-if="resources.length > 0 && totalHits > resources.length">
        <span v-if="loadingMore" class="loading-spinner-sm"></span>
        <span v-else class="load-text">加载更多...</span>
      </div>
      
      <div v-else-if="!loading && hasSearched && resources.length === 0" class="no-results">
        未找到相关资源
      </div>
      
      <div v-if="loading" class="loading-container">
        <span class="loading-spinner"></span> 正在加载...
      </div>

    </div>

    <!-- Version Selection Modal -->
    <div v-if="showVersionModal" class="modal-overlay" @click.self="closeVersionModal">
      <div class="modal-content">
        <div class="modal-header">
          <h3>选择版本 - {{ selectedResource?.title }}</h3>
          <button class="close-btn" @click="closeVersionModal">×</button>
        </div>
        
        <div class="version-filters">
           <select v-model="filterGameVersion" class="qq-select">
             <option value="">全部游戏版本</option>
             <option v-for="v in uniqueGameVersions" :key="v" :value="v">{{ v }}</option>
           </select>
           <select v-model="filterLoader" class="qq-select">
             <option value="">全部加载器</option>
             <option v-for="l in uniqueLoaders" :key="l" :value="l">{{ l }}</option>
           </select>
        </div>

        <div v-if="loadingVersions" class="loading-container">
          <span class="loading-spinner"></span> 加载中...
        </div>

        <div class="version-list" v-if="filteredVersions.length > 0">
          <div v-for="ver in filteredVersions" :key="ver.id" class="version-item">
            <div class="version-info-main">
              <span class="version-name" :title="ver.name">{{ ver.name }}</span>
              <span class="version-number">{{ ver.version_number }}</span>
            </div>
            <div class="version-tags">
               <span v-for="gv in ver.game_versions" :key="gv" class="tag game-ver">{{ gv }}</span>
               <span v-for="ld in ver.loaders" :key="ld" class="tag loader">{{ ld }}</span>
            </div>
            <div class="version-actions">
              <span class="date">{{ formatDate(ver.date_published) }}</span>
              <button @click="openDownloadModal(ver.files[0], ver)" class="download-btn-sm">
                ⬇️ 下载
              </button>
            </div>
          </div>
        </div>

        <div v-else-if="!loadingVersions" class="no-results">
          未找到版本
        </div>
      </div>
    </div>

    <!-- Download Configuration Modal -->
    <div v-if="showDownloadModal" class="modal-overlay" @click.self="closeDownloadModal">
      <div class="modal-content download-modal">
        <div class="modal-header">
          <h3>下载配置 - {{ downloadConfig.filename }}</h3>
          <button class="close-btn" @click="closeDownloadModal">×</button>
        </div>
        
        <div class="download-form">
          <div class="form-group">
            <label>目标游戏版本</label>
            <select v-model="downloadConfig.targetVersion" class="qq-select full-width" @change="updateDownloadPath">
              <option value="" disabled>选择版本...</option>
              <option v-for="ver in installedVersions" :key="ver.id" :value="ver.id">{{ ver.id }}</option>
            </select>
            <div v-if="currentTab === 'modpack'" class="hint-text">整合包将下载到 versions 目录下</div>
            <div v-if="validationWarning" class="warning-text">⚠️ {{ validationWarning }}</div>
          </div>

          <div class="form-group">
            <label>安装路径</label>
            <div class="input-group">
              <input type="text" v-model="downloadConfig.path" class="qq-input full-width" />
              <button @click="selectDownloadDir" class="qq-btn secondary">📂 浏览</button>
            </div>
            <div class="path-preview" v-if="downloadConfig.path">
              最终位置: {{ downloadConfig.path }}\{{ downloadConfig.filename }}
            </div>
          </div>
        </div>

        <div class="modal-footer">
          <button @click="closeDownloadModal" class="qq-btn secondary">取消</button>
          <button @click="startDownload" class="qq-btn primary" :disabled="downloading">
            <span v-if="downloading" class="loading-spinner-sm"></span>
            {{ downloading ? '提交中...' : '开始下载' }}
          </button>
        </div>
      </div>
    </div>

    <!-- Import Modpack Modal -->
    <div v-if="showImportModal" class="modal-overlay" @click.self="closeImportModal">
      <div class="modal-content download-modal">
        <div class="modal-header">
          <h3>导入整合包</h3>
          <button class="close-btn" @click="closeImportModal">×</button>
        </div>
        
        <div class="download-form">
          <div class="form-group">
            <label>整合包文件</label>
            <div class="path-preview">{{ importConfig.path }}</div>
          </div>

          <div class="form-group">
            <label>实例名称 (版本ID)</label>
            <input type="text" v-model="importConfig.name" class="qq-input full-width" placeholder="请输入实例名称" />
            <div class="hint-text">将创建一个新的版本隔离实例</div>
          </div>
        </div>

        <div class="modal-footer">
          <button @click="closeImportModal" class="qq-btn secondary">取消</button>
          <button @click="startImport" class="qq-btn primary" :disabled="importing">
            <span v-if="importing" class="loading-spinner-sm"></span>
            {{ importing ? '导入中...' : '开始导入' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, onMounted, onUnmounted, computed, nextTick } from 'vue'
import { useBackend } from '@/composables/useBackend'
import { useWebSocket } from '@/composables/useWebSocket'
import { useDownload } from '@/composables/useDownload'

const { fetchApi } = useBackend()
const { messages } = useWebSocket()
const { downloadProgress } = useDownload()

const tabs = [
  { id: 'mod', name: '模组 (Mods)' },
  { id: 'shader', name: '光影 (Shaders)' },
  { id: 'modpack', name: '整合包 (Modpacks)' },
  { id: 'datapack', name: '数据包 (Data Packs)' },
  { id: 'resourcepack', name: '资源包 (Resource Packs)' }
]

const currentTab = ref('mod')
const searchQuery = ref('')
const resources = ref<any[]>([])
const loading = ref(false)
const hasSearched = ref(false)
const selectedLoader = ref('')
const offset = ref(0)
const totalHits = ref(0)
const loadingMore = ref(false)
const sentinel = ref<HTMLElement | null>(null)
let observer: IntersectionObserver | null = null

// Download Progress
// Removed local state and watcher, using global state from useDownload

// Download Modal State
const showDownloadModal = ref(false)
const downloading = ref(false)
const installedVersions = ref<any[]>([])
const minecraftDir = ref('')
const downloadConfig = ref({
  url: '',
  filename: '',
  targetVersion: '',
  path: '',
  type: '',
  loaders: [] as string[] // Resource loaders (e.g. ['fabric'])
})
const validationWarning = ref('')

// Version Modal State
const showVersionModal = ref(false)
const selectedResource = ref<any>(null)
const versions = ref<any[]>([])
const loadingVersions = ref(false)
const filterGameVersion = ref('')
const filterLoader = ref('')

const formatNumber = (num: number) => {
  return new Intl.NumberFormat('en-US', { notation: "compact", compactDisplay: "short" }).format(num);
}

const formatDate = (dateStr: string) => {
  return new Date(dateStr).toLocaleDateString()
}

const resetAndSearch = () => {
  offset.value = 0
  searchResources()
}

const loadMore = async () => {
  if (loadingMore.value || loading.value) return
  
  offset.value += 20
  loadingMore.value = true
  await searchResources(true)
  loadingMore.value = false
}

const setupObserver = () => {
  if (observer) observer.disconnect()
  
  observer = new IntersectionObserver((entries) => {
    if (entries[0].isIntersecting && !loadingMore.value && !loading.value) {
      loadMore()
    }
  }, {
    root: null,
    rootMargin: '100px',
    threshold: 0.1
  })
  
  if (sentinel.value) {
    observer.observe(sentinel.value)
  }
}

watch(() => resources.value.length, () => {
  nextTick(() => {
    if (resources.value.length > 0 && totalHits.value > resources.value.length) {
       setupObserver()
    }
  })
})

onUnmounted(() => {
  if (observer) observer.disconnect()
})

// Fetch installed versions and config
const fetchMinecraftInfo = async () => {
  try {
    const [verRes, configRes] = await Promise.all([
      fetchApi('/api/minecraft/installed-versions'),
      fetchApi('/api/minecraft/config')
    ])
    
    const verData = await verRes.json()
    if (verData.ok) {
      installedVersions.value = verData.versions
    }
    
    const configData = await configRes.json()
    if (configData.ok) {
      minecraftDir.value = configData.minecraft_dir
    }
  } catch (e) {
    console.error('Failed to fetch minecraft info', e)
  }
}

const openDownloadModal = (file: any, version: any) => {
  downloadConfig.value = {
    url: file.url,
    filename: file.filename,
    targetVersion: installedVersions.value.length > 0 ? installedVersions.value[0].id : '',
    path: '',
    type: currentTab.value,
    loaders: version.loaders || []
  }
  
  updateDownloadPath()
  validateVersion()
  showDownloadModal.value = true
}

const updateDownloadPath = () => {
  validateVersion()
  if (!minecraftDir.value) return

  // 处理路径分隔符，统一为 Windows 风格
  const base = minecraftDir.value.replace(/\//g, '\\')
  const ver = downloadConfig.value.targetVersion
  
  if (currentTab.value === 'modpack') {
    // 整合包下载到 versions 根目录
    downloadConfig.value.path = `${base}\\versions`
  } else {
    // 其他资源下载到版本对应的子目录
    if (!ver) {
       // 如果没选版本，默认下载到 .minecraft 根目录的对应文件夹
       let subDir = 'mods'
       if (currentTab.value === 'shader') subDir = 'shaderpacks'
       if (currentTab.value === 'resourcepack') subDir = 'resourcepacks'
       downloadConfig.value.path = `${base}\\${subDir}`
    } else {
       let subDir = 'mods'
       if (currentTab.value === 'shader') subDir = 'shaderpacks'
       if (currentTab.value === 'resourcepack') subDir = 'resourcepacks'
       
       downloadConfig.value.path = `${base}\\versions\\${ver}\\${subDir}`
    }
  }
}

const validateVersion = () => {
  validationWarning.value = ''
  
  // 仅在选择版本且为 Mod 时校验
  if (!downloadConfig.value.targetVersion || currentTab.value !== 'mod') return
  
  // 找到选中的已安装版本
  const selectedVer = installedVersions.value.find(v => v.id === downloadConfig.value.targetVersion)
  
  if (!selectedVer) return
  
  // 获取资源支持的加载器 (e.g. ['fabric', 'quilt'])
  const resourceLoaders = downloadConfig.value.loaders.map(l => l.toLowerCase())
  if (resourceLoaders.length === 0) return
  
  // 检查已安装版本的加载器类型
  // 假设 installedVersions 的 id 包含加载器信息 (e.g. "fabric-loader-0.14.22-1.20.1")
  // 或者我们从后端获取更多信息。目前只能通过 ID 猜测。
  const verId = selectedVer.id.toLowerCase()
  
  let gameLoader = 'vanilla'
  if (verId.includes('fabric')) gameLoader = 'fabric'
  else if (verId.includes('forge')) gameLoader = 'forge'
  else if (verId.includes('neoforge')) gameLoader = 'neoforge'
  else if (verId.includes('quilt')) gameLoader = 'quilt'
  else if (verId.includes('optifine')) gameLoader = 'optifine'
  
  // 如果是原版，提示需要安装加载器
  if (gameLoader === 'vanilla') {
    validationWarning.value = `目标版本似乎是原版，可能无法加载此 Mod。需要安装 ${resourceLoaders.join('/')} 加载器。`
    return
  }
  
  // 检查兼容性
  // Fabric 兼容 Quilt (通常)
  // Forge 不兼容 Fabric
  const isCompatible = resourceLoaders.some(rl => {
    if (rl === gameLoader) return true
    if (rl === 'fabric' && gameLoader === 'quilt') return true
    return false
  })
  
  if (!isCompatible) {
    validationWarning.value = `加载器不匹配！此资源需要 ${resourceLoaders.join('/')}，但目标版本似乎是 ${gameLoader}。`
  }
}

const selectDownloadDir = async () => {
  try {
    const response = await fetchApi('/api/minecraft/select-dir')
    const data = await response.json()
    if (data.ok) {
      downloadConfig.value.path = data.path
    }
  } catch (e) {
    console.error('Select dir failed', e)
  }
}

const startDownload = async () => {
  if (downloading.value) return
  
  downloading.value = true
  
  // 立即显示进度条
   downloadProgress.value = {
     filename: downloadConfig.value.filename || '准备下载...',
     percent: 0,
     total: 0,
     current: 0,
     message: '正在初始化...'
   }
   
   try {
    const response = await fetchApi('/api/resources/download', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        url: downloadConfig.value.url,
        path: downloadConfig.value.path,
        filename: downloadConfig.value.filename,
        type: currentTab.value // 传递类型，以便后端识别 modpack
      })
    })
    
    const data = await response.json()
    if (data.ok) {
      closeDownloadModal()
    } else {
      alert('下载失败: ' + data.error)
      // 失败时隐藏进度条
      downloadProgress.value = { filename: '', percent: 0, total: 0, current: 0, message: '' }
    }
  } catch (e) {
    console.error('Download failed', e)
    alert('下载请求失败')
    downloadProgress.value = { filename: '', percent: 0, total: 0, current: 0, message: '' }
  } finally {
    downloading.value = false
  }
}

const closeDownloadModal = () => {
  showDownloadModal.value = false
}

const searchResources = async (append = false) => {
  if (!append) {
    loading.value = true
    resources.value = []
  }
  
  hasSearched.value = true
  
  try {
    // Map tab to Modrinth facet
    let facets = []
    
    // Type facet
    switch (currentTab.value) {
      case 'mod':
        facets.push('["project_type:mod"]')
        break
      case 'shader':
        facets.push('["project_type:shader"]')
        break
      case 'modpack':
        facets.push('["project_type:modpack"]')
        break
      case 'datapack':
        facets.push('["categories:datapack"]')
        break
      case 'resourcepack':
        facets.push('["project_type:resourcepack"]')
        break
    }
    
    // Loader facet
    if (selectedLoader.value && (currentTab.value === 'mod' || currentTab.value === 'modpack')) {
      facets.push(`["categories:${selectedLoader.value}"]`)
    }
    
    // Construct facets string: [[A], [B]] for AND logic
    const facetsStr = facets.length > 0 ? `[${facets.join(',')}]` : ''
    
    // 如果不是追加模式，确保 offset 为 0
    const currentOffset = append ? offset.value : 0
    
    const params = new URLSearchParams({
      limit: '20',
      offset: currentOffset.toString()
    })
    
    if (facetsStr) {
      params.append('facets', facetsStr)
    }
    
    if (searchQuery.value) {
      params.append('query', searchQuery.value)
    } else {
      // Default sort by downloads if no query
      params.append('index', 'downloads')
    }

    // Use backend proxy
    const response = await fetchApi(`/api/resources/search?${params.toString()}`)
    const data = await response.json()
    
    if (data.hits) {
      if (append) {
        // Filter out duplicates
        const newItems = data.hits.filter((item: any) => 
          !resources.value.some((existing: any) => existing.project_id === item.project_id)
        )
        resources.value.push(...newItems)
      } else {
        resources.value = data.hits
      }
      totalHits.value = data.total_hits
    }
  } catch (e) {
    console.error('Search failed', e)
  } finally {
    loading.value = false
  }
}

const showVersions = async (resource: any) => {
  selectedResource.value = resource
  showVersionModal.value = true
  versions.value = []
  loadingVersions.value = true
  filterGameVersion.value = ''
  filterLoader.value = ''
  
  try {
    // Use backend proxy
    const response = await fetchApi(`/api/resources/versions/${resource.slug}`)
    const data = await response.json()
    if (Array.isArray(data)) {
      versions.value = data
    }
  } catch (e) {
    console.error('Failed to fetch versions', e)
  } finally {
    loadingVersions.value = false
  }
}

const closeVersionModal = () => {
  showVersionModal.value = false
  selectedResource.value = null
}

const translateDescription = async (resource: any) => {
  if (resource.translated_description || resource.translating) return
  
  resource.translating = true
  try {
    const response = await fetchApi(`/api/resources/translate/modrinth?project_id=${resource.project_id}`)
    if (response.ok) {
      const data = await response.json()
      if (data.translated) {
        resource.translated_description = data.translated
      }
    }
  } catch (e) {
    console.error('Translation failed', e)
  } finally {
    resource.translating = false
  }
}

// Import Modpack Logic
const showImportModal = ref(false)
const importing = ref(false)
const importConfig = ref({
  path: '',
  name: ''
})

const pickAndImportMrPack = async () => {
  try {
    const res = await fetchApi('/api/system/pick-file')
    const data = await res.json()
    if (data.ok && data.path) {
      importConfig.value.path = data.path
      // Auto generate name from filename
      // Handle both Windows and Unix paths
      const filename = data.path.split(/[\\/]/).pop()
      importConfig.value.name = filename.replace('.mrpack', '')
      showImportModal.value = true
    }
  } catch (e) {
    console.error('Pick file failed', e)
  }
}

const closeImportModal = () => {
  showImportModal.value = false
}

const startImport = async () => {
  if (!importConfig.value.name) return
  
  importing.value = true
  try {
    const res = await fetchApi('/api/resources/import-mrpack', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        file_path: importConfig.value.path,
        instance_name: importConfig.value.name
      })
    })
    const data = await res.json()
    
    if (data.ok) {
      closeImportModal()
    } else {
      alert('导入失败: ' + data.error)
    }
  } catch (e) {
    console.error('Import failed', e)
    alert('请求失败')
  } finally {
    importing.value = false
  }
}

// Computed properties for filters
const uniqueGameVersions = computed(() => {
  const s = new Set<string>()
  versions.value.forEach(v => v.game_versions.forEach((gv: string) => s.add(gv)))
  return Array.from(s).sort().reverse()
})

const uniqueLoaders = computed(() => {
  const s = new Set<string>()
  versions.value.forEach(v => v.loaders.forEach((l: string) => s.add(l)))
  return Array.from(s).sort()
})

const filteredVersions = computed(() => {
  return versions.value.filter(v => {
    if (filterGameVersion.value && !v.game_versions.includes(filterGameVersion.value)) return false
    if (filterLoader.value && !v.loaders.includes(filterLoader.value)) return false
    return true
  })
})

// Auto search when tab changes
watch(currentTab, () => {
  searchQuery.value = '' // Clear search on tab change to show defaults
  resetAndSearch()
})

// Initial load
onMounted(() => {
  searchResources()
  fetchMinecraftInfo()
})

</script>

<style scoped>
/* Page Layout */
.resources-page {
  padding: 32px;
  max-width: 1400px;
  margin: 0 auto;
  animation: fadeIn 0.6s cubic-bezier(0.16, 1, 0.3, 1);
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(20px); }
  to { opacity: 1; transform: translateY(0); }
}

.panel-section {
  background: rgba(30, 41, 59, 0.7);
  border: 1px solid rgba(148, 163, 184, 0.1);
  border-radius: 24px;
  padding: 32px;
  backdrop-filter: blur(20px);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
}

.section-title {
  font-size: 1.5rem;
  font-weight: 700;
  color: #f1f5f9;
  margin-bottom: 28px;
  display: flex;
  align-items: center;
  gap: 12px;
  text-shadow: 0 2px 4px rgba(0,0,0,0.2);
}

/* Tabs */
.tabs {
  display: flex;
  gap: 8px;
  margin-bottom: 32px;
  overflow-x: auto;
  padding: 6px;
  background: rgba(15, 23, 42, 0.4);
  border-radius: 16px;
  border: 1px solid rgba(148, 163, 184, 0.1);
}

.tab-btn {
  padding: 10px 20px;
  background: transparent;
  border: 1px solid transparent;
  border-radius: 12px;
  color: #94a3b8;
  cursor: pointer;
  transition: all 0.3s ease;
  white-space: nowrap;
  font-weight: 600;
  font-size: 0.95rem;
}

.tab-btn:hover {
  color: #e2e8f0;
  background: rgba(148, 163, 184, 0.1);
}

.tab-btn.active {
  background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
  color: white;
  box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);
  border: none;
}

/* Search & Filters */
.search-bar-container {
  display: flex;
  gap: 16px;
  margin-bottom: 32px;
  flex-wrap: wrap;
}

.search-bar {
  flex: 1;
  display: flex;
  gap: 12px;
  min-width: 300px;
}

.filters {
  display: flex;
  align-items: center;
  gap: 12px;
}

.qq-input {
  flex: 1;
  padding: 12px 20px;
  background: rgba(15, 23, 42, 0.6);
  border: 2px solid rgba(148, 163, 184, 0.1);
  border-radius: 12px;
  color: #f1f5f9;
  font-size: 1rem;
  transition: all 0.3s ease;
}

.qq-input:focus {
  outline: none;
  border-color: #3b82f6;
  background: rgba(15, 23, 42, 0.8);
  box-shadow: 0 0 0 4px rgba(59, 130, 246, 0.15);
}

.qq-select {
  padding: 12px 20px;
  background: rgba(15, 23, 42, 0.6);
  border: 2px solid rgba(148, 163, 184, 0.1);
  border-radius: 12px;
  color: #f1f5f9;
  font-size: 0.95rem;
  outline: none;
  cursor: pointer;
  transition: all 0.3s ease;
  min-width: 140px;
}

.qq-select:hover {
  border-color: rgba(148, 163, 184, 0.3);
}

.qq-select:focus {
  border-color: #3b82f6;
}

.qq-btn {
  padding: 0 28px;
  height: 48px;
  border: none;
  border-radius: 12px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  font-size: 0.95rem;
}

.qq-btn:not(:disabled):hover {
  transform: translateY(-2px);
}

.qq-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
  filter: grayscale(100%);
}

.qq-btn.primary {
  background: linear-gradient(135deg, #22c55e 0%, #16a34a 100%);
  color: white;
  box-shadow: 0 4px 16px rgba(34, 197, 94, 0.3);
}

.qq-btn.primary:hover:not(:disabled) {
  box-shadow: 0 8px 24px rgba(34, 197, 94, 0.4);
}

.qq-btn.secondary {
  background: rgba(148, 163, 184, 0.1);
  color: #e2e8f0;
  border: 1px solid rgba(148, 163, 184, 0.1);
}

.qq-btn.secondary:hover {
  background: rgba(148, 163, 184, 0.2);
  color: white;
}

/* Search button specific style */
.search-bar .qq-btn {
  background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
  color: white;
  box-shadow: 0 4px 16px rgba(59, 130, 246, 0.3);
}

.search-bar .qq-btn:hover:not(:disabled) {
  box-shadow: 0 8px 24px rgba(59, 130, 246, 0.4);
}

/* Resources Grid */
.resources-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(340px, 1fr));
  gap: 24px;
}

.resource-card {
  background: rgba(30, 41, 59, 0.4);
  border: 1px solid rgba(148, 163, 184, 0.08);
  border-radius: 16px;
  padding: 20px;
  display: flex;
  gap: 20px;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  position: relative;
  overflow: hidden;
}

.resource-card:hover {
  transform: translateY(-4px);
  background: rgba(30, 41, 59, 0.6);
  border-color: rgba(59, 130, 246, 0.3);
  box-shadow: 0 12px 32px -8px rgba(0, 0, 0, 0.3);
}

.resource-card::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  width: 4px;
  height: 100%;
  background: linear-gradient(to bottom, #3b82f6, #2563eb);
  opacity: 0;
  transition: opacity 0.3s;
}

.resource-card:hover::before {
  opacity: 1;
}

.resource-icon {
  width: 80px;
  height: 80px;
  border-radius: 12px;
  object-fit: cover;
  background: #1e293b;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
}

.resource-info {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
}

.resource-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 8px;
  gap: 12px;
}

.resource-title {
  font-size: 1.15rem;
  font-weight: 700;
  color: #f1f5f9;
  margin: 0;
  line-height: 1.3;
}

.resource-desc {
  font-size: 0.9rem;
  color: #94a3b8;
  margin: 0 0 16px 0;
  line-height: 1.6;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.resource-meta {
  display: flex;
  gap: 16px;
  font-size: 0.85rem;
  color: #64748b;
  margin-bottom: 16px;
  margin-top: auto;
  align-items: center;
}

.author, .downloads {
  display: flex;
  align-items: center;
  gap: 6px;
}

.resource-actions {
  display: flex;
  gap: 10px;
}

.link-btn, .download-btn {
  padding: 8px 16px;
  border-radius: 8px;
  text-decoration: none;
  font-size: 0.9rem;
  cursor: pointer;
  transition: all 0.2s;
  border: none;
  font-weight: 600;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
}

.link-btn {
  background: rgba(148, 163, 184, 0.1);
  color: #94a3b8;
}

.link-btn:hover {
  background: rgba(148, 163, 184, 0.2);
  color: #f1f5f9;
}

.download-btn {
  background: linear-gradient(135deg, #22c55e 0%, #16a34a 100%);
  color: white;
  flex: 1;
  box-shadow: 0 4px 12px rgba(34, 197, 94, 0.2);
}

.download-btn:hover {
  transform: translateY(-1px);
  box-shadow: 0 6px 16px rgba(34, 197, 94, 0.3);
}

/* Loading & Sentinel */
.loading-container, .no-results {
  text-align: center;
  padding: 40px;
  color: #94a3b8;
}

.sentinel {
  height: 60px;
  display: flex;
  justify-content: center;
  align-items: center;
  margin-top: 20px;
  color: #94a3b8;
  font-size: 0.9rem;
}

.loading-spinner {
  display: inline-block;
  width: 20px;
  height: 20px;
  border: 2px solid rgba(255,255,255,0.3);
  border-radius: 50%;
  border-top-color: #fff;
  animation: spin 1s ease-in-out infinite;
  vertical-align: middle;
  margin-right: 8px;
}

.loading-spinner-sm {
  display: inline-block;
  width: 14px;
  height: 14px;
  border: 2px solid rgba(255,255,255,0.3);
  border-radius: 50%;
  border-top-color: #fff;
  animation: spin 1s ease-in-out infinite;
}

.loading-spinner-xs {
  display: inline-block;
  width: 12px;
  height: 12px;
  border: 2px solid rgba(255,255,255,0.3);
  border-radius: 50%;
  border-top-color: #fff;
  animation: spin 1s ease-in-out infinite;
  margin-left: 6px;
  vertical-align: middle;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

/* Modal Styles */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.8);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
  backdrop-filter: blur(8px);
}

.modal-content {
  background: #1e293b;
  border: 1px solid rgba(148, 163, 184, 0.2);
  border-radius: 24px;
  width: 90%;
  max-width: 800px;
  max-height: 85vh;
  display: flex;
  flex-direction: column;
  box-shadow: 0 24px 48px rgba(0, 0, 0, 0.5);
  animation: modalSlideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1);
}

@keyframes modalSlideUp {
  from { transform: translateY(20px); opacity: 0; }
  to { transform: translateY(0); opacity: 1; }
}

.modal-header {
  padding: 24px;
  background: rgba(15, 23, 42, 0.6);
  border-bottom: 1px solid rgba(148, 163, 184, 0.1);
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.modal-header h3 {
  margin: 0;
  color: #f1f5f9;
  font-size: 1.25rem;
  font-weight: 600;
}

.close-btn {
  background: none;
  border: none;
  color: #94a3b8;
  font-size: 1.75rem;
  cursor: pointer;
  padding: 4px;
  line-height: 1;
  transition: color 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
}

.close-btn:hover {
  color: #f1f5f9;
}

.version-filters {
  padding: 16px 24px;
  display: flex;
  gap: 12px;
  background: rgba(15, 23, 42, 0.3);
  border-bottom: 1px solid rgba(148, 163, 184, 0.1);
}

.version-list {
  overflow-y: auto;
  padding: 24px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.version-item {
  background: rgba(15, 23, 42, 0.4);
  border: 1px solid rgba(148, 163, 184, 0.1);
  border-radius: 12px;
  padding: 20px;
  display: flex;
  align-items: center;
  gap: 16px;
  transition: all 0.2s;
}

.version-item:hover {
  background: rgba(15, 23, 42, 0.6);
  border-color: rgba(148, 163, 184, 0.3);
}

.version-info-main {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.version-name {
  color: #f1f5f9;
  font-weight: 600;
  font-size: 1.05rem;
}

.version-number {
  color: #94a3b8;
  font-size: 0.9rem;
}

.version-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  max-width: 240px;
}

.tag {
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 0.8rem;
  font-weight: 500;
}

.tag.game-ver {
  background: rgba(59, 130, 246, 0.15);
  color: #93c5fd;
}

.tag.loader {
  background: rgba(16, 185, 129, 0.15);
  color: #6ee7b7;
}

.version-actions {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 10px;
}

.date {
  color: #64748b;
  font-size: 0.85rem;
}

.download-btn-sm {
  background: linear-gradient(135deg, #22c55e 0%, #16a34a 100%);
  color: white;
  padding: 8px 16px;
  border-radius: 8px;
  font-weight: 600;
  border: none;
  cursor: pointer;
  transition: all 0.2s;
  box-shadow: 0 2px 8px rgba(34, 197, 94, 0.2);
  text-decoration: none;
  font-size: 0.9rem;
}

.download-btn-sm:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(34, 197, 94, 0.3);
}

/* Download Config Modal */
.download-modal {
  max-width: 500px;
}

.download-form {
  padding: 24px;
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.form-group label {
  display: block;
  margin-bottom: 8px;
  color: #cbd5e1;
  font-size: 0.95rem;
  font-weight: 500;
}

.input-group {
  display: flex;
  gap: 12px;
}

.full-width {
  width: 100%;
  box-sizing: border-box;
}

.hint-text {
  font-size: 0.85rem;
  color: #64748b;
  margin-top: 6px;
}

.warning-text {
  font-size: 0.9rem;
  color: #fbbf24;
  margin-top: 12px;
  padding: 12px;
  background: rgba(251, 191, 36, 0.1);
  border: 1px solid rgba(251, 191, 36, 0.2);
  border-radius: 8px;
  display: flex;
  align-items: center;
  gap: 8px;
}

.path-preview {
  font-size: 0.85rem;
  color: #64748b;
  margin-top: 8px;
  word-break: break-all;
  background: rgba(15, 23, 42, 0.3);
  padding: 8px 12px;
  border-radius: 8px;
  font-family: 'Consolas', monospace;
}

.modal-footer {
  padding: 20px 24px;
  border-top: 1px solid rgba(148, 163, 184, 0.1);
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  background: rgba(15, 23, 42, 0.3);
}

/* Download Progress Toast style moved to component */

/* Scrollbar style for tabs */
.tabs::-webkit-scrollbar {
  height: 4px;
}

.tabs::-webkit-scrollbar-track {
  background: transparent;
}

.tabs::-webkit-scrollbar-thumb {
  background: rgba(148, 163, 184, 0.2);
  border-radius: 2px;
}

/* Global Scrollbar */
::-webkit-scrollbar {
  width: 8px;
  height: 8px;
}

::-webkit-scrollbar-track {
  background: rgba(15, 23, 42, 0.4);
}

::-webkit-scrollbar-thumb {
  background: rgba(148, 163, 184, 0.3);
  border-radius: 4px;
}

::-webkit-scrollbar-thumb:hover {
  background: rgba(148, 163, 184, 0.5);
}

.translate-btn {
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  padding: 4px;
  border-radius: 4px;
  transition: background-color 0.2s;
}

.translate-btn:hover {
  background-color: rgba(255, 255, 255, 0.1);
}

.translate-icon {
  width: 32px;
  height: 32px;
  object-fit: contain;
}
</style>
