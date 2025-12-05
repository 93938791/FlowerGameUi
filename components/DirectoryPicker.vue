<template>
  <n-modal :show="show" preset="card" title="选择目录" @update:show="onUpdateShow" :style="{ maxWidth: '860px', width: '860px' }">
    <div class="picker-body">
      <div class="picker-toolbar">
        <n-input v-model:value="filter" placeholder="筛选子目录" size="small" clearable />
        <n-space>
          <n-button tertiary size="small" @click="goUp" :disabled="loading">返回上级</n-button>
          <n-button tertiary size="small" @click="loadDrives" :disabled="loading">磁盘</n-button>
          <n-button type="primary" size="small" @click="confirm" :disabled="loading || isDriveList">选择此目录</n-button>
        </n-space>
      </div>
      <div class="picker-breadcrumbs">
        <n-breadcrumb>
          <n-breadcrumb-item @click="loadDrives">磁盘</n-breadcrumb-item>
          <n-breadcrumb-item v-for="(c, i) in breadcrumbs" :key="i" @click="navigate(c.path)">{{ c.name }}</n-breadcrumb-item>
        </n-breadcrumb>
      </div>
      <n-spin :show="loading">
        <div class="picker-list">
          <div class="list-toolbar">
            <n-select
              v-model:value="quickDrive"
              :options="driveOptions"
              placeholder="快速跳转磁盘"
              size="small"
              style="width: 220px"
              @update:value="onSelectDrive"
            />
          </div>
          <n-tree 
            :data="treeData" 
            block-node
            :expand-on-click="true"
            :expanded-keys="expandedKeys"
            @update:expanded-keys="onExpand"
            :selected-keys="selectedKeys"
            @update:selected-keys="onSelect"
            style="max-height: 420px; overflow: auto;"
          />
          <div v-if="treeData.length === 0" class="empty-state">没有子目录</div>
        </div>
      </n-spin>
    </div>
    <template #footer>
      <n-space>
        <n-button tertiary @click="onUpdateShow(false)">取消</n-button>
        <n-button type="primary" @click="confirm" :disabled="isDriveList">确定</n-button>
      </n-space>
    </template>
  </n-modal>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { NModal, NButton, NInput, NSpace, NBreadcrumb, NBreadcrumbItem, NSpin, NTree, NSelect } from 'naive-ui'
import { useBackend } from '../composables/useBackend'

const props = defineProps<{ show: boolean, initialPath?: string }>()
const emit = defineEmits<{ (e: 'update:show', v: boolean): void, (e: 'confirm', path: string): void }>()

const { fetchApi } = useBackend()

const show = computed({ get: () => props.show, set: v => emit('update:show', v) })
const currentPath = ref('')
const entries = ref<any[]>([])
const loading = ref(false)
const isDriveList = ref(true)
const filter = ref('')

const filteredEntries = computed(() => {
  const f = filter.value.trim().toLowerCase()
  if (!f) return entries.value
  return (entries.value || []).filter((e: any) => (e.name || '').toLowerCase().includes(f))
})

// Tree state
const treeData = ref<any[]>([])
const expandedKeys = ref<string[]>([])
const selectedKeys = ref<string[]>([])

const breadcrumbs = computed(() => {
  if (isDriveList.value || !currentPath.value) return []
  const p = currentPath.value.replace(/\\+$/,'')
  const parts = p.split('\\').filter(Boolean)
  const crumbs: Array<{name:string, path:string}> = []
  let acc = ''
  parts.forEach((name, idx) => {
    if (idx === 0) {
      acc = name + '\\'
      crumbs.push({ name, path: acc })
    } else {
      acc = acc + name
      crumbs.push({ name, path: acc })
      acc = acc + '\\'
    }
  })
  return crumbs
})

function onUpdateShow(v: boolean){ emit('update:show', v) }

async function loadDrives(){
  loading.value = true
  try {
    const r = await fetchApi('/api/system/drives')
    const res = await r.json()
    if (res.ok){
      entries.value = res.drives || []
      currentPath.value = ''
      isDriveList.value = true
      treeData.value = (entries.value || []).map((d: any) => ({ label: d.name, key: d.path, isLeaf: false, children: [] }))
      expandedKeys.value = []
      selectedKeys.value = []
    }
  } finally { loading.value = false }
}

async function loadDir(path: string){
  loading.value = true
  try {
    const r = await fetchApi(`/api/system/list-dir?path=${encodeURIComponent(path)}`)
    const res = await r.json()
    if (res.ok){
      entries.value = res.entries || []
      currentPath.value = res.current_path || path
      isDriveList.value = false
      // update tree children for this path
      const children = (entries.value || []).map((e: any) => ({ label: e.name, key: e.path, isLeaf: false, children: [] }))
      const assignChildren = (nodes: any[]) => {
        for (const n of nodes){
          if (n.key === path){ n.children = children; return true }
          if (n.children && n.children.length){ if (assignChildren(n.children)) return true }
        }
        return false
      }
      if (!assignChildren(treeData.value)){
        // If not found (direct navigation), add root
        treeData.value = [{ label: path, key: path, isLeaf: false, children }]
      }
      if (!expandedKeys.value.includes(path)) expandedKeys.value = [...expandedKeys.value, path]
    }
  } finally { loading.value = false }
}

function goUp(){
  if (isDriveList.value) return
  const p = currentPath.value.replace(/\\+$/,'')
  const idx = p.lastIndexOf('\\')
  if (idx <= 2){ loadDrives() } else { loadDir(p.slice(0, idx)) }
}

function enter(path: string){ loadDir(path) }
function navigate(path: string){ loadDir(path) }
function confirm(){ if (!isDriveList.value) emit('confirm', currentPath.value) }

function onExpand(keys: string[]){
  // Load children for newly expanded keys
  const newly = keys.find(k => !expandedKeys.value.includes(k))
  expandedKeys.value = keys
  if (newly){ loadDir(newly) }
}
function onSelect(keys: string[]){ selectedKeys.value = keys; if (keys[0]) currentPath.value = keys[0] }
function onSelectDrive(val: string){ if (val) enter(val) }

watch(() => props.initialPath, async (val) => {
  if (val){ await loadDir(val) } else { await loadDrives() }
}, { immediate: true })
</script>

<style scoped>
.picker-body { display: flex; flex-direction: column; gap: 16px; }
.picker-toolbar { display: flex; align-items: center; gap: 12px; }
.picker-breadcrumbs { padding: 6px 0; }
.picker-list { display: flex; flex-direction: column; gap: 10px; }
.list-toolbar { display: flex; justify-content: flex-end; }
.entry-grid { display: grid; grid-template-columns: repeat(2, minmax(320px, 1fr)); gap: 14px; }
.entry-card { background: rgba(30,41,59,0.6); border: 1px solid rgba(148,163,184,0.15); border-radius: 12px; padding: 14px; display: flex; align-items: center; gap: 12px; cursor: pointer; transition: all .15s ease; }
.entry-card:hover { border-color: #22c55e; box-shadow: 0 6px 18px rgba(0,0,0,.35); transform: translateY(-1px); }
.entry-icon { font-size: 22px; }
.entry-name { color: #f1f5f9; font-weight: 600; }
.entry-path { color: #94a3b8; font-size: 12px; }
.empty-state { color: #94a3b8; padding: 12px; text-align: center; }
</style>
