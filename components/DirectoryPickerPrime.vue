<template>
  <Dialog v-model:visible="visible" header="选择目录" :style="{ width: '860px' }">
    <div class="picker-body">
      <div class="picker-toolbar">
        <InputText v-model="filter" placeholder="筛选子目录" />
        <Dropdown v-model="quickDrive" :options="driveOptions" optionLabel="label" optionValue="value" placeholder="快速跳转磁盘" style="width: 220px" @change="onSelectDrive" />
        <Button text @click="goUp">返回上级</Button>
        <Button text @click="loadDrives">磁盘</Button>
        <Button :disabled="!currentPath" label="选择此目录" @click="confirm" />
      </div>
      <Tree :value="nodes" selectionMode="single" @node-expand="onNodeExpand" @node-select="onNodeSelect" />
    </div>
    <template #footer>
      <Button text @click="emit('update:visible', false)">取消</Button>
      <Button :disabled="!currentPath" label="确定" @click="confirm" />
    </template>
  </Dialog>
</template>

<script setup lang="ts">
import Dialog from 'primevue/dialog'
import Tree from 'primevue/tree'
import Dropdown from 'primevue/dropdown'
import InputText from 'primevue/inputtext'
import Button from 'primevue/button'
import { ref, computed, watch } from 'vue'
import { useBackend } from '../composables/useBackend'

const props = defineProps<{ visible: boolean, initialPath?: string }>()
const emit = defineEmits<{ (e: 'update:visible', v: boolean): void, (e: 'confirm', path: string): void }>()

const visible = computed({ get: () => props.visible, set: v => emit('update:visible', v) })
const { fetchApi } = useBackend()

const nodes = ref<any[]>([])
const currentPath = ref('')
const filter = ref('')
const quickDrive = ref<string | null>(null)
const driveOptions = ref<any[]>([])

function buildNodes(list: any[]){
  return (list || []).map((e: any) => ({ key: e.path || e.name, label: e.name, data: { path: e.path || e.name }, leaf: false, children: [] }))
}

async function loadDrives(){
  const r = await fetchApi('/api/system/drives')
  const res = await r.json()
  if (res.ok){
    nodes.value = buildNodes(res.drives || [])
    driveOptions.value = (res.drives || []).map((d: any) => ({ label: d.name, value: d.path }))
    currentPath.value = ''
  }
}

async function loadDir(path: string){
  const r = await fetchApi(`/api/system/list-dir?path=${encodeURIComponent(path)}`)
  const res = await r.json()
  if (res.ok){
    const children = buildNodes(res.entries || [])
    const assign = (arr: any[]) => {
      for (const n of arr){
        if (n.key === path){ n.children = children; return true }
        if (n.children && n.children.length){ if (assign(n.children)) return true }
      }
      return false
    }
    if (!assign(nodes.value)) nodes.value = [{ key: path, label: path, data: { path }, children }]
  }
}

function onNodeExpand(evt: any){ const p = evt.node?.data?.path || evt.node?.key; if (p) loadDir(p) }
function onNodeSelect(evt: any){ const p = evt.node?.data?.path || evt.node?.key; if (p) currentPath.value = p }
function onSelectDrive(evt: any){ const v = evt?.value || quickDrive.value; if (v) loadDir(v) }
function goUp(){ if (!currentPath.value) return; const p = currentPath.value.replace(/\\+$/,''); const idx = p.lastIndexOf('\\'); if (idx <= 2) loadDrives(); else loadDir(p.slice(0, idx)) }
function confirm(){ if (currentPath.value) emit('confirm', currentPath.value) }

watch(() => props.initialPath, async (val) => { if (val) await loadDir(val); else await loadDrives() }, { immediate: true })
</script>

<style scoped>
.picker-body { display: flex; flex-direction: column; gap: 12px; }
.picker-toolbar { display: flex; align-items: center; gap: 10px; margin-bottom: 6px; }
</style>
