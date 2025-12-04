<template>
  <div class="game-page">
    <!-- Java 环境检测 -->
    <div class="panel-section">
      <h3 class="section-title">
        <img src="/icons/java.png" class="title-icon-img" alt="Java" />
        Java 环境
      </h3>
      <div class="java-section">
        <div class="java-status-row">
            <div class="status-indicator">
                <span v-if="checkingJava" class="status-text loading">⏳ 检测中...</span>
                <span v-else-if="javaInstalled" class="status-text success">✅ 已安装 Java ({{ javaVersion }})</span>
                <span v-else class="status-text warning">⚠️ 未检测到 Java 环境</span>
            </div>
            <div class="action-buttons">
                <button @click="checkJava" class="qq-btn qq-btn-sm" :disabled="checkingJava || installingJava">
                    {{ checkingJava ? '检测中' : '刷新状态' }}
                </button>
            </div>
         </div>
         
         <div class="java-install-box" v-if="!checkingJava">
            <div class="install-info">
                <p>Minecraft 运行需要 Java 环境。</p>
                <p>推荐安装 <strong>Microsoft OpenJDK 21</strong> (兼容高版本 MC)</p>
            </div>
            <button @click="installJava" class="qq-btn qq-btn-primary qq-btn-block" :disabled="installingJava">
                <span v-if="installingJava" class="loading-spinner"></span>
                {{ installingJava ? '正在下载安装...' : '下载 Microsoft OpenJDK 21' }}
            </button>
         </div>
         <div v-if="installMessage" class="info-hint mt-2">{{ installMessage }}</div>
      </div>
    </div>

    <div class="panel-section">
      <h3 class="section-title">
        <img src="/icons/minecraft.png" class="title-icon-img" alt="Minecraft" />
        Minecraft 下载
      </h3>
      
      <div class="download-form">
        <!-- 版本类型选择 -->
        <div class="form-group">
          <label class="form-label">版本类型</label>
          <div class="version-type-grid">
            <button
              v-for="type in versionTypes"
              :key="type.value"
              :class="['type-btn', { active: selectedVersionType === type.value }]"
              @click="selectVersionType(type.value)"
            >
              <img :src="type.icon" :alt="type.label" class="type-icon" />
              <span class="type-label">{{ type.label }}</span>
            </button>
          </div>
        </div>
        
        <!-- MC版本选择 -->
        <div class="form-group">
          <label class="form-label">Minecraft 版本</label>
          <div class="version-filter-group">
            <div class="version-type-filter">
              <button
                v-for="vtype in versionTypeFilters"
                :key="vtype.value"
                :class="['filter-btn', { active: selectedVersionFilter === vtype.value }]"
                @click="selectVersionFilter(vtype.value)"
              >
                {{ vtype.label }}
              </button>
            </div>
          </div>
          <div class="version-selector">
            <select v-model="versionId" class="qq-select" @change="onVersionChange">
              <option value="">请选择版本</option>
              <option v-for="ver in mcVersions" :key="ver.id" :value="ver.id">
                {{ ver.id }} ({{ getVersionTypeLabel(ver.type) }})
              </option>
            </select>
            <button @click="loadVersions" class="qq-btn" :disabled="loadingVersions">
              {{ loadingVersions ? '加载中...' : '刷新' }}
            </button>
          </div>
        </div>
        
        <!-- 加载器版本选择 -->
        <div class="form-group" v-if="selectedVersionType !== 'vanilla'">
          <label class="form-label">加载器版本</label>
          <div class="version-selector">
            <select v-model="loaderVersion" class="qq-select" :disabled="loadingLoaderVersions">
              <option value="">{{ loadingLoaderVersions ? '加载中...' : '请选择加载器版本' }}</option>
              <option v-for="(lv, index) in loaderVersions" :key="index" :value="getLoaderVersionValue(lv)">
                {{ formatLoaderVersion(lv) }}
              </option>
            </select>
            <button @click="loadLoaderVersions" class="qq-btn" :disabled="!versionId || loadingLoaderVersions">
              <span v-if="loadingLoaderVersions" class="loading-spinner"></span>
              {{ loadingLoaderVersions ? '加载中' : '刷新' }}
            </button>
          </div>
          <div v-if="loadingLoaderVersions" class="loading-hint">
            ⏳ 正在获取加载器版本列表...
          </div>
        </div>
        
        <!-- Fabric API选择 -->
        <div class="form-group" v-if="selectedVersionType === 'fabric'">
          <label class="form-label">Fabric API版本</label>
          <div class="version-selector">
            <select v-model="fabricApiVersion" class="qq-select" :disabled="loadingFabricApiVersions">
              <option value="">{{ loadingFabricApiVersions ? '加载中...' : '不安装 Fabric API' }}</option>
              <option v-for="api in fabricApiVersions" :key="api.version" :value="api.version">
                {{ formatFabricApiVersion(api) }}
              </option>
            </select>
            <button @click="loadFabricApiVersions" class="qq-btn" :disabled="!versionId || loadingFabricApiVersions">
              <span v-if="loadingFabricApiVersions" class="loading-spinner"></span>
              {{ loadingFabricApiVersions ? '加载中' : '刷新' }}
            </button>
          </div>
          <div v-if="loadingFabricApiVersions" class="loading-hint">
            ⏳ 正在获取 Fabric API 版本列表...
          </div>
          <div v-else class="info-hint">
            💡 Fabric API 是运行大多数 Fabric 模组所必需的核心库
          </div>
        </div>
        
        <!-- 自定义名称 -->
        <div class="form-group">
          <label class="form-label">自定义名称 <span class="required-mark">*</span></label>
          <input 
            v-model="customName" 
            placeholder="请输入版本名称（必填）" 
            class="qq-input"
            @input="checkVersionNameConflict"
          />
          <div v-if="versionNameConflict" class="error-hint">
            ⚠️ 该名称已存在，请使用其他名称
          </div>
          <div v-if="customName && !versionNameConflict" class="success-hint">
            ✓ 名称可用
          </div>
        </div>
        
        <!-- 下载按钮 -->
        <div class="form-actions">
          <button 
            @click="startDownload" 
            class="qq-btn qq-btn-download qq-btn-large qq-btn-block"
            :disabled="!canDownload || isDownloading"
          >
            <span class="btn-icon">{{ isDownloading ? '⏳' : '⬇️' }}</span>
            {{ isDownloading ? '下载中...' : '开始下载' }}
          </button>
        </div>
      </div>
    </div>

    <!-- 下载进度区 -->
    <div v-if="downloadTasks.length > 0" class="panel-section">
      <h4 class="section-title">下载进度</h4>
      <div class="progress-list">
        <div 
          v-for="task in downloadTasks" 
          :key="task.id"
          class="progress-item"
        >
          <div class="progress-header">
            <span class="progress-name">{{ task.name }}</span>
            <span class="progress-percentage">{{ task.progress }}%</span>
          </div>
          <div class="progress-bar">
            <div 
              class="progress-bar-fill" 
              :style="{ width: task.progress + '%' }"
              :class="{ 
                'progress-success': task.status === 'completed',
                'progress-error': task.status === 'failed',
                'progress-active': task.status === 'downloading'
              }"
            ></div>
          </div>
          <div class="progress-status">{{ task.statusText }}</div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'

const router = useRouter()
const { showToast } = useToast()
const { fetchApi } = useBackend()

const versionTypes = [
  { label: '原版', value: 'vanilla', icon: '/icons/vanilla.png' },
  { label: 'Fabric', value: 'fabric', icon: '/icons/fabric.png' },
  { label: 'Forge', value: 'forge', icon: '/icons/forge.png' },
  { label: 'NeoForge', value: 'neoforge', icon: '/icons/neoforge.png' }
]

const versionTypeFilters = [
  { label: '所有版本', value: '' },
  { label: '正式版', value: 'release' },
  { label: '快照版', value: 'snapshot' }
]

const selectedVersionType = ref('vanilla')
const selectedVersionFilter = ref<string | null>('release')
const versionId = ref('')
const loaderVersion = ref('')
const loaderVersions = ref<any[]>([])
const fabricApiVersion = ref('')
const fabricApiVersions = ref<any[]>([])
const customName = ref('')
const versionNameConflict = ref(false)
const installedVersions = ref<string[]>([])
const mcVersions = ref<any[]>([])
const loadingVersions = ref(false)
const loadingLoaderVersions = ref(false)
const loadingFabricApiVersions = ref(false)
const isDownloading = ref(false)
const downloadTasks = ref<any[]>([])

// Java 相关状态
const checkingJava = ref(true)
const javaInstalled = ref(false)
const javaVersion = ref('')
const installingJava = ref(false)
const installMessage = ref('')

async function checkJava() {
  checkingJava.value = true
  installMessage.value = ''
  try {
    const r = await fetchApi('/api/java/info')
    const res = await r.json()
    if (res.ok && res.data) {
      javaInstalled.value = res.data.installed
      javaVersion.value = res.data.version || '未知版本'
    }
  } catch (e) {
    console.error(e)
  } finally {
    checkingJava.value = false
  }
}

async function installJava() {
  // 直接打开浏览器下载
  const downloadUrl = "https://aka.ms/download-jdk/microsoft-jdk-21-windows-x64.msi"
   window.open(downloadUrl, '_blank')
   
   showToast('已开始下载 Microsoft OpenJDK 21，下载完成后请手动安装', 'success')
  
  // 提示用户安装完成后刷新状态
  installMessage.value = '请下载并安装完成后点击"刷新状态"按钮'
}

const canDownload = computed(() => {
  // 检查是否有版本名称
  if (!customName.value || customName.value.trim() === '') {
    return false
  }
  // 检查是否有重名
  if (versionNameConflict.value) {
    return false
  }
  // 原版只需要选择版本
  if (selectedVersionType.value === 'vanilla') {
    return versionId.value.length > 0
  }
  // 加载器版本需要选择MC版本和加载器版本
  return versionId.value.length > 0 && loaderVersion.value.length > 0
})

function checkVersionNameConflict() {
  const name = customName.value.trim()
  if (!name) {
    versionNameConflict.value = false
    return
  }
  // 检查是否与已安装版本重名
  versionNameConflict.value = installedVersions.value.includes(name)
}

async function loadInstalledVersions() {
  try {
    const r = await fetchApi('/api/minecraft/installed-versions')
    const result = await r.json()
    if (result.ok && Array.isArray(result.versions)) {
      installedVersions.value = result.versions.map((v: any) => v.id)
    }
  } catch (e: any) {
    console.error('加载已安装版本失败:', e)
  }
}

function selectVersionType(type: string) {
  selectedVersionType.value = type
  loaderVersion.value = ''
  loaderVersions.value = []
  fabricApiVersion.value = ''
  fabricApiVersions.value = []
  if (type !== 'vanilla' && versionId.value) {
    loadLoaderVersions()
    if (type === 'fabric') {
      loadFabricApiVersions()
    }
  }
}

function selectVersionFilter(filter: string | null) {
  selectedVersionFilter.value = filter
  loadVersions()
}

function getVersionTypeLabel(type: string): string {
  const typeMap: Record<string, string> = {
    'release': '正式版',
    'snapshot': '快照版',
    'old_beta': 'Beta',
    'old_alpha': 'Alpha'
  }
  return typeMap[type?.toLowerCase()] || '正式版'
}

function onVersionChange() {
  if (selectedVersionType.value !== 'vanilla' && versionId.value) {
    loadLoaderVersions()
    if (selectedVersionType.value === 'fabric') {
      loadFabricApiVersions()
    }
  }
}

function formatLoaderVersion(loaderData: any): string {
  if (typeof loaderData === 'string') {
    // 如果是字符串，尝试解析JSON
    try {
      const parsed = JSON.parse(loaderData)
      if (parsed.loader && parsed.loader.version) {
        const stable = parsed.loader.stable ? '稳定版' : '测试版'
        return `${parsed.loader.version} (${stable})`
      }
      if (parsed.version) {
        return parsed.version
      }
    } catch (e) {
      // 如果不是JSON，直接返回字符串
      return loaderData
    }
    return loaderData
  }
  // 如果是对象，直接处理
  if (loaderData.loader && loaderData.loader.version) {
    const stable = loaderData.loader.stable ? '稳定版' : '测试版'
    return `${loaderData.loader.version} (${stable})`
  }
  if (loaderData.stable !== undefined) {
    const tag = loaderData.stable ? '稳定版' : '测试版'
    return `${loaderData.version} (${tag})`
  }
  return loaderData.version || loaderData
}

function getLoaderVersionValue(loaderData: any): string {
  if (typeof loaderData === 'string') {
    // 如果是字符串，尝试解析JSON获取版本号
    try {
      const parsed = JSON.parse(loaderData)
      if (parsed.loader && parsed.loader.version) {
        return parsed.loader.version
      }
      if (parsed.version) {
        return parsed.version
      }
    } catch (e) {
      return loaderData
    }
    return loaderData
  }
  // 如果是对象，提取版本号
  if (loaderData.loader && loaderData.loader.version) {
    return loaderData.loader.version
  }
  return loaderData.version || loaderData
}

function formatFabricApiVersion(apiData: any): string {
  if (typeof apiData === 'string') {
    return apiData
  }
  // 展示版本号和下载次数
  if (apiData.version) {
    let displayText = apiData.version
    // 如果有名称且与版本号不同，显示名称
    if (apiData.name && apiData.name !== apiData.version) {
      displayText = `${apiData.version} - ${apiData.name}`
    }
    // 如果有下载次数，显示下载次数
    if (apiData.downloads) {
      const downloadsText = apiData.downloads >= 1000 
        ? `${(apiData.downloads / 1000).toFixed(1)}K` 
        : apiData.downloads
      displayText += ` (⬇️ ${downloadsText})`
    }
    return displayText
  }
  return apiData.version || apiData
}

async function loadVersions() {
  loadingVersions.value = true
  try {
    const versionType = selectedVersionFilter.value || ''
    const url = versionType ? `/api/minecraft/versions?version_type=${versionType}` : '/api/minecraft/versions'
    const r = await fetchApi(url)
    const result = await r.json()
    if (result.ok && Array.isArray(result.versions)) {
      mcVersions.value = result.versions
    } else if (result.error) {
      showToast(`加载失败: ${result.error}`, 'error')
    }
  } catch (e: any) {
    showToast(`加载失败: ${e.message}`, 'error')
  } finally {
    loadingVersions.value = false
  }
}

async function loadLoaderVersions() {
  if (!versionId.value || selectedVersionType.value === 'vanilla') {
    return
  }
  
  loadingLoaderVersions.value = true
  loaderVersions.value = []
  loaderVersion.value = ''
  
  try {
    const r = await fetchApi(`/api/minecraft/loader-versions?loader_type=${selectedVersionType.value}&mc_version=${versionId.value}`)
    const result = await r.json()
    if (result.ok && Array.isArray(result.versions)) {
      // 处理返回的数据
      loaderVersions.value = result.versions.map((v: any) => {
        if (typeof v === 'string') {
          // 尝试解析JSON字符串
          try {
            const parsed = JSON.parse(v)
            return parsed
          } catch (e) {
            return { version: v }
          }
        }
        return v
      })
    } else {
      showToast('获取加载器版本失败', 'error')
    }
  } catch (e: any) {
    showToast(`加载失败: ${e.message}`, 'error')
  } finally {
    loadingLoaderVersions.value = false
  }
}

async function loadFabricApiVersions() {
  if (!versionId.value || selectedVersionType.value !== 'fabric') {
    return
  }
  
  loadingFabricApiVersions.value = true
  fabricApiVersions.value = []
  fabricApiVersion.value = ''
  
  try {
    const r = await fetchApi(`/api/minecraft/fabric-api-versions?mc_version=${versionId.value}`)
    const result = await r.json()
    if (result.ok && Array.isArray(result.versions)) {
      // 如果返回的是字符串数组，转换为对象数组
      fabricApiVersions.value = result.versions.map((v: any) => 
        typeof v === 'string' ? { version: v, game_version: versionId.value } : v
      )
    } else {
      // 如果API不可用，清空列表
      fabricApiVersions.value = []
    }
  } catch (e: any) {
    console.error('加载 Fabric API 版本失败:', e)
    fabricApiVersions.value = []
  } finally {
    loadingFabricApiVersions.value = false
  }
}

async function startDownload() {
  if (!canDownload.value) {
    if (!customName.value || customName.value.trim() === '') {
      showToast('请输入版本名称', 'error')
    } else if (versionNameConflict.value) {
      showToast('该名称已存在，请使用其他名称', 'error')
    } else {
      showToast('请选择要下载的版本', 'error')
    }
    return
  }
  
  isDownloading.value = true
  
  downloadTasks.value = [
    { id: 'version_info', name: '📄 版本信息', progress: 0, status: 'pending', statusText: '等待中...' },
    { id: 'client_jar', name: '🎮 JAR', progress: 0, status: 'pending', statusText: '等待中...' },
    { id: 'libraries', name: '📦 依赖库', progress: 0, status: 'pending', statusText: '等待中...' },
    { id: 'assets', name: '🎨 资源', progress: 0, status: 'pending', statusText: '等待中...' }
  ]
  
  // 如果是 Fabric 版本，添加 Fabric 相关的进度项
  if (selectedVersionType.value === 'fabric') {
    downloadTasks.value.push(
      { id: 'loader_info', name: '🧵 Fabric 配置', progress: 0, status: 'pending', statusText: '等待中...' },
      { id: 'loader_libraries', name: '📦 Fabric 依赖库', progress: 0, status: 'pending', statusText: '等待中...' }
    )
    // 如果选择了 Fabric API，添加进度项
    if (fabricApiVersion.value) {
      downloadTasks.value.push(
        { id: 'fabric_api', name: '🔧 Fabric API', progress: 0, status: 'pending', statusText: '等待中...' }
      )
    }
  }
  
  // 如果是 Forge 版本，添加 Forge 相关的进度项
  if (selectedVersionType.value === 'forge') {
    downloadTasks.value.push(
      { id: 'loader_info', name: '🔨 Forge 配置', progress: 0, status: 'pending', statusText: '等待中...' },
      { id: 'forge_libraries', name: '📦 Forge 依赖库', progress: 0, status: 'pending', statusText: '等待中...' },
      { id: 'extract_data', name: '📂 提取数据', progress: 0, status: 'pending', statusText: '等待中...' },
      { id: 'processors', name: '⚙️ 执行处理器', progress: 0, status: 'pending', statusText: '等待中...' },
      { id: 'generate_json', name: '📝 生成配置', progress: 0, status: 'pending', statusText: '等待中...' }
    )
  }
  
  // 如果是 NeoForge 版本，添加 NeoForge 相关的进度项（与 Forge 相同）
  if (selectedVersionType.value === 'neoforge') {
    downloadTasks.value.push(
      { id: 'loader_info', name: '🔧 NeoForge 配置', progress: 0, status: 'pending', statusText: '等待中...' },
      { id: 'forge_libraries', name: '📦 NeoForge 依赖库', progress: 0, status: 'pending', statusText: '等待中...' },
      { id: 'extract_data', name: '📂 提取数据', progress: 0, status: 'pending', statusText: '等待中...' },
      { id: 'processors', name: '⚙️ 执行处理器', progress: 0, status: 'pending', statusText: '等待中...' },
      { id: 'generate_json', name: '📝 生成配置', progress: 0, status: 'pending', statusText: '等待中...' }
    )
  }
  
  let taskId = ''
  
  try {
    if (selectedVersionType.value === 'vanilla') {
      const r = await fetchApi('/api/minecraft/download', { 
        method: 'POST', 
        headers: { 'Content-Type': 'application/json' }, 
        body: JSON.stringify({ 
          version_id: versionId.value.trim(), 
          custom_name: customName.value.trim()
        }) 
      })
      const result = await r.json()
      
      if (!result.ok) {
        throw new Error(result.error || '下载请求失败')
      }
      
      // 使用自定义名称作为 task_id
      taskId = customName.value.trim()
    } else {
      const requestBody: any = {
        mc_version: versionId.value.trim(),
        loader_type: selectedVersionType.value,
        loader_version: loaderVersion.value,
        custom_name: customName.value.trim() || null
      }
      
      // 如果选择了Fabric API，添加到请求中
      if (selectedVersionType.value === 'fabric' && fabricApiVersion.value) {
        requestBody.fabric_api_version = fabricApiVersion.value
      }
      
      const r = await fetchApi('/api/minecraft/download-with-loader', { 
        method: 'POST', 
        headers: { 'Content-Type': 'application/json' }, 
        body: JSON.stringify(requestBody) 
      })
      const result = await r.json()
      
      if (!result.ok) {
        throw new Error(result.error || '下载请求失败')
      }
      
      taskId = result.task_id
    }
    
    await pollDownloadProgress(taskId)
    
  } catch (e: any) {
    showToast(`下载失败: ${e.message}`, 'error')
    downloadTasks.value.forEach(task => {
      if (task.status !== 'completed') {
        task.status = 'failed'
        task.statusText = '下载失败'
      }
    })
    isDownloading.value = false
  }
}

async function pollDownloadProgress(taskId: string) {
  // 动态构建 stageMap
  const stageMap: Record<string, number> = {
    'version_manifest': 0,
    'version_info': 0,
    'client_jar': 1,
    'libraries': 2,
    'assets': 3
  }
  
  // 根据版本类型添加额外的阶段映射
  if (selectedVersionType.value === 'fabric') {
    stageMap['loader_info'] = 4
    stageMap['loader_libraries'] = 5
    // 如果选择了 Fabric API
    if (fabricApiVersion.value) {
      stageMap['fabric_api'] = 6
    }
  } else if (selectedVersionType.value === 'forge' || selectedVersionType.value === 'neoforge') {
    // Forge 和 NeoForge 使用相同的进度阶段
    stageMap['loader_info'] = 4
    stageMap['forge_libraries'] = 5
    stageMap['extract_data'] = 6
    stageMap['processors'] = 7
    stageMap['generate_json'] = 8
  }
  
  let pollCount = 0
  const maxPolls = 600
  
  while (pollCount < maxPolls) {
    try {
      const r = await fetchApi(`/api/minecraft/download-progress?task_id=${encodeURIComponent(taskId)}`)
      
      if (!r.ok) {
        if (r.status === 404) {
          await new Promise(resolve => setTimeout(resolve, 500))
          pollCount++
          continue
        }
        throw new Error(`获取进度失败: ${r.status}`)
      }
      
      const result = await r.json()
      
      if (result.ok && result.progress) {
        const progress = result.progress
        const stage = progress.stage
        const stageIndex = stageMap[stage] ?? -1
        
        if (stageIndex >= 0 && stageIndex < downloadTasks.value.length) {
          const task = downloadTasks.value[stageIndex]
          task.progress = progress.percentage || 0
          task.status = 'downloading'
          task.statusText = progress.message || '下载中...'
          
          for (let i = 0; i < stageIndex; i++) {
            if (downloadTasks.value[i].status !== 'completed') {
              downloadTasks.value[i].progress = 100
              downloadTasks.value[i].status = 'completed'
              downloadTasks.value[i].statusText = '✓ 完成'
            }
          }
        }
        
        if (stage === 'complete') {
          downloadTasks.value.forEach(task => {
            task.progress = 100
            task.status = 'completed'
            task.statusText = '✓ 完成'
          })
          showToast(`版本 ${taskId} 下载成功！`, 'success')
          isDownloading.value = false
          
          // 等待1秒后清空进度条并跳转到游戏联机页面
          await new Promise(resolve => setTimeout(resolve, 1000))
          downloadTasks.value = []
          router.push('/multiplayer')
          
          return
        }
        
        if (stage === 'error') {
          throw new Error(progress.message || '下载失败')
        }
      }
      
      await new Promise(resolve => setTimeout(resolve, 1000))
      pollCount++
      
    } catch (e: any) {
      showToast(`下载失败: ${e.message}`, 'error')
      downloadTasks.value.forEach(task => {
        if (task.status !== 'completed') {
          task.status = 'failed'
          task.statusText = '失败'
        }
      })
      isDownloading.value = false
      return
    }
  }
}

onMounted(() => {
  loadVersions()
  loadInstalledVersions()
  checkJava()
})
</script>

<style scoped>
/* ==================== 深色主题游戏管理页面样式 ==================== */
.game-page {
  width: 100%;
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

.title-icon-img {
  width: 32px;
  height: 32px;
  object-fit: contain;
  filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.2));
}

.download-form {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.form-label {
  font-size: 14px;
  font-weight: 600;
  color: #e2e8f0;
}

.version-filter-group {
  margin-bottom: 12px;
}

.version-type-filter {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.filter-btn {
  padding: 8px 18px;
  border: 2px solid rgba(148, 163, 184, 0.15);
  background: rgba(148, 163, 184, 0.05);
  border-radius: 8px;
  font-size: 13px;
  font-weight: 600;
  color: #94a3b8;
  cursor: pointer;
  transition: all 0.2s ease;
}

.filter-btn:hover {
  border-color: rgba(34, 197, 94, 0.4);
  color: #e2e8f0;
}

.filter-btn.active {
  background: linear-gradient(135deg, #22c55e 0%, #16a34a 100%);
  border-color: transparent;
  color: white;
  box-shadow: 0 4px 12px rgba(34, 197, 94, 0.3);
}

.version-type-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 12px;
}

.type-btn {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  padding: 18px 16px;
  background: rgba(148, 163, 184, 0.05);
  border: 2px solid rgba(148, 163, 184, 0.1);
  border-radius: 14px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.type-btn:hover {
  border-color: rgba(34, 197, 94, 0.4);
  background: rgba(148, 163, 184, 0.08);
}

.type-btn.active {
  border-color: #22c55e;
  background: rgba(34, 197, 94, 0.1);
  box-shadow: 0 0 20px rgba(34, 197, 94, 0.15);
}

.type-icon {
  width: 44px;
  height: 44px;
  object-fit: contain;
}

.type-label {
  font-size: 13px;
  font-weight: 700;
  color: #e2e8f0;
}

.version-selector {
  display: flex;
  gap: 12px;
}

.qq-select {
  flex: 1;
  height: 44px;
  padding: 0 14px;
  border: 2px solid rgba(148, 163, 184, 0.15);
  border-radius: 10px;
  font-size: 14px;
  font-family: inherit;
  background: rgba(15, 23, 42, 0.6);
  color: #f1f5f9;
  cursor: pointer;
  transition: all 0.2s ease;
}

.qq-select:focus {
  outline: none;
  border-color: #22c55e;
  box-shadow: 0 0 0 3px rgba(34, 197, 94, 0.15);
}

.qq-select option {
  background: #1e293b;
  color: #f1f5f9;
}

.qq-input {
  width: 100%;
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

.required-mark {
  color: #f87171;
  font-weight: 700;
  margin-left: 4px;
}

.error-hint {
  margin-top: 10px;
  padding: 10px 14px;
  background: rgba(239, 68, 68, 0.1);
  border: 1px solid rgba(239, 68, 68, 0.25);
  border-radius: 10px;
  color: #f87171;
  font-size: 13px;
  display: flex;
  align-items: center;
  gap: 8px;
}

.success-hint {
  margin-top: 10px;
  padding: 10px 14px;
  background: rgba(59, 130, 246, 0.1);
  border: 1px solid rgba(59, 130, 246, 0.25);
  border-radius: 10px;
  color: #60a5fa;
  font-size: 13px;
  display: flex;
  align-items: center;
  gap: 8px;
}

.info-hint {
  margin-top: 10px;
  padding: 10px 14px;
  background: rgba(59, 130, 246, 0.1);
  border: 1px solid rgba(59, 130, 246, 0.2);
  border-radius: 10px;
  color: #60a5fa;
  font-size: 13px;
  display: flex;
  align-items: center;
  gap: 8px;
}

.loading-hint {
  margin-top: 10px;
  padding: 10px 14px;
  background: rgba(251, 191, 36, 0.1);
  border: 1px solid rgba(251, 191, 36, 0.2);
  border-radius: 10px;
  color: #fbbf24;
  font-size: 13px;
  display: flex;
  align-items: center;
  gap: 8px;
  animation: pulse 1.5s ease-in-out infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.7; }
}

.loading-spinner {
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

.form-actions {
  margin-top: 10px;
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
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  background: rgba(148, 163, 184, 0.1);
  color: #94a3b8;
}

.qq-btn:hover:not(:disabled) {
  background: rgba(148, 163, 184, 0.2);
  color: #e2e8f0;
}

.qq-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.qq-btn-download {
  background: linear-gradient(135deg, #22c55e 0%, #16a34a 100%);
  color: white;
  box-shadow: 0 4px 16px rgba(34, 197, 94, 0.35);
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
}

.qq-btn-download:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 8px 24px rgba(34, 197, 94, 0.4);
}

.qq-btn-large {
  height: 52px;
  font-size: 16px;
  font-weight: 700;
}

.qq-btn-block {
  width: 100%;
}

.progress-list {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.progress-item {
  background: rgba(148, 163, 184, 0.05);
  border: 1px solid rgba(148, 163, 184, 0.08);
  padding: 18px;
  border-radius: 12px;
}

.progress-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10px;
}

.progress-name {
  font-weight: 600;
  color: #f1f5f9;
  font-size: 14px;
}

.progress-percentage {
  font-weight: 700;
  color: #22c55e;
  font-size: 14px;
}

.progress-bar {
  height: 8px;
  background: rgba(148, 163, 184, 0.1);
  border-radius: 4px;
  overflow: hidden;
  margin-bottom: 10px;
}

/* Java Section Styles */
.java-section {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.java-status-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: rgba(15, 23, 42, 0.4);
  padding: 16px;
  border-radius: 12px;
  border: 1px solid rgba(148, 163, 184, 0.1);
}

.status-indicator {
  display: flex;
  align-items: center;
}

.status-text {
  font-weight: 600;
  font-size: 15px;
}

.status-text.loading { color: #fbbf24; }
.status-text.success { color: #22c55e; }
.status-text.warning { color: #f87171; }

.java-install-box {
  background: rgba(59, 130, 246, 0.05);
  border: 1px dashed rgba(59, 130, 246, 0.3);
  border-radius: 12px;
  padding: 16px;
}

.install-info {
  margin-bottom: 16px;
  color: #94a3b8;
  font-size: 14px;
  line-height: 1.5;
}

.install-info p {
  margin: 4px 0;
}

.qq-btn-sm {
  height: 32px;
  padding: 0 14px;
  font-size: 13px;
}

.mt-2 {
  margin-top: 8px;
}

.progress-bar-fill {
  height: 100%;
  background: linear-gradient(135deg, #22c55e 0%, #16a34a 100%);
  border-radius: 4px;
  transition: width 0.3s ease;
}

.progress-bar-fill.progress-active {
  background: linear-gradient(90deg, #22c55e 0%, #16a34a 50%, #22c55e 100%);
  background-size: 200% 100%;
  animation: progressShine 2s linear infinite;
}

.progress-bar-fill.progress-success {
  background: linear-gradient(135deg, #22c55e 0%, #16a34a 100%);
}

.progress-bar-fill.progress-error {
  background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
}

@keyframes progressShine {
  0% { background-position: 0% 0%; }
  100% { background-position: 200% 0%; }
}

.progress-status {
  font-size: 13px;
  color: #64748b;
}

.btn-icon {
  font-size: 20px;
}
</style>
