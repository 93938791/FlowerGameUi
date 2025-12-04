<template>
  <div v-if="downloadProgress.filename" class="download-progress-toast">
    <div class="progress-header">
      <span class="filename" :title="downloadProgress.filename">
         {{ downloadProgress.percent >= 100 ? '✅' : '⬇️' }} {{ downloadProgress.filename }}
      </span>
      <span class="percent">{{ downloadProgress.percent }}%</span>
    </div>
    <div class="progress-bar-bg">
      <div class="progress-bar-fill" :style="{ width: downloadProgress.percent + '%' }"></div>
    </div>
    <div class="progress-detail" v-if="downloadProgress.message">
      {{ downloadProgress.message }}
    </div>
  </div>
</template>

<script setup lang="ts">
import { useDownload } from '@/composables/useDownload'

const { downloadProgress } = useDownload()
</script>

<style scoped>
/* Download Progress Toast */
.download-progress-toast {
  position: fixed;
  bottom: 32px;
  right: 32px;
  background: rgba(15, 23, 42, 0.9);
  border: 1px solid rgba(59, 130, 246, 0.2);
  border-radius: 16px;
  padding: 20px;
  width: 340px;
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.4);
  backdrop-filter: blur(12px);
  z-index: 2000;
  animation: slideIn 0.4s cubic-bezier(0.16, 1, 0.3, 1);
}

@keyframes slideIn {
  from { transform: translateY(100px); opacity: 0; }
  to { transform: translateY(0); opacity: 1; }
}

.progress-header {
  display: flex;
  justify-content: space-between;
  margin-bottom: 12px;
  font-size: 0.95rem;
  color: #f1f5f9;
  font-weight: 500;
}

.filename {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 260px;
}

.progress-bar-bg {
  height: 6px;
  background: rgba(148, 163, 184, 0.1);
  border-radius: 3px;
  overflow: hidden;
}

.progress-bar-fill {
  height: 100%;
  background: linear-gradient(90deg, #3b82f6, #2563eb);
  transition: width 0.3s ease-out;
  box-shadow: 0 0 10px rgba(59, 130, 246, 0.5);
}

.progress-detail {
  font-size: 0.8rem;
  color: #94a3b8;
  margin-top: 8px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
</style>
