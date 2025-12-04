<template>
  <div class="loading-page">
    <div class="loading-content">
      <div class="logo-container">
        <img src="/icons/logo.png" alt="Logo" class="logo-img" />
        <div class="logo-pulse"></div>
      </div>
      
      <!-- <h1 class="app-title pulsing-text">FlowerGame</h1> -->
      
      <div class="status-container">
        <div class="loading-spinner"></div>
        <div class="status-text">正在连接后端服务...</div>
        <div class="status-detail">尝试连接 localhost:17890</div>
      </div>
      
      <div class="help-text">
        <p class="single-line">如果您尚未启动 FlowerGame 桌面客户端，请先启动它。</p>
        <p class="single-line">如果客户端已运行，请稍候...</p>
      </div>

      <div class="download-section">
        <a href="https://gitee.com/zc_nmg/FlowerGame/releases/download/1.0.0/FlowerGame.exe" class="download-link" target="_blank">
          <span class="icon">⬇️</span> 下载最新客户端
        </a>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
// 简单的展示组件，无需复杂逻辑
</script>

<style scoped>
.loading-page {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  background: #0f172a;
  color: #f1f5f9;
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
}

.loading-content {
  text-align: center;
  padding: 40px;
  width: auto;
  min-width: 400px;
}

.logo-container {
  position: relative;
  width: 360px;
  height: 360px;
  margin: 0 auto 20px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.logo-img {
  width: 100%;
  height: 100%;
  object-fit: contain;
  filter: drop-shadow(0 4px 20px rgba(34, 197, 94, 0.4));
  z-index: 2;
  position: relative;
}

.logo-pulse {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 280px;
  height: 280px;
  background: rgba(34, 197, 94, 0.1);
  border-radius: 50%;
  z-index: 1;
  animation: pulse 3s infinite ease-in-out;
  filter: blur(30px);
}

@keyframes pulse {
  0% {
    transform: translate(-50%, -50%) scale(0.8);
    opacity: 0.4;
  }
  50% {
    transform: translate(-50%, -50%) scale(1.2);
    opacity: 0.8;
  }
  100% {
    transform: translate(-50%, -50%) scale(0.8);
    opacity: 0.4;
  }
}

.status-container {
  background: rgba(30, 41, 59, 0.5);
  border: 1px solid rgba(148, 163, 184, 0.1);
  border-radius: 16px;
  padding: 24px;
  margin-bottom: 24px;
  backdrop-filter: blur(10px);
}

.loading-spinner {
  width: 32px;
  height: 32px;
  border: 3px solid rgba(34, 197, 94, 0.2);
  border-top-color: #22c55e;
  border-radius: 50%;
  margin: 0 auto 16px;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.status-text {
  font-size: 16px;
  font-weight: 600;
  color: #e2e8f0;
  margin-bottom: 8px;
}

.status-detail {
  font-size: 13px;
  color: #94a3b8;
}

.help-text {
  font-size: 13px;
  color: #64748b;
  line-height: 1.6;
}

.help-text p {
  margin-bottom: 8px;
}

.single-line {
  white-space: nowrap;
  margin: 4px 0;
}

.download-section {
  margin-top: 24px;
}

.download-link {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 10px 20px;
  background: rgba(34, 197, 94, 0.15);
  color: #4ade80;
  border: 1px solid rgba(34, 197, 94, 0.3);
  border-radius: 8px;
  text-decoration: none;
  font-size: 0.9rem;
  font-weight: 500;
  transition: all 0.2s;
}

.download-link:hover {
  background: rgba(34, 197, 94, 0.25);
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(34, 197, 94, 0.2);
}

.download-link .icon {
  font-size: 1.1em;
}
</style>
