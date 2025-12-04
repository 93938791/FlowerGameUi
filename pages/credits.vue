<template>
  <div class="credits-page">
    <div class="panel-section header-section">
      <h2 class="page-title">
        <img src="/icons/感谢.png" class="title-icon" alt="鸣谢" @error="handleImageError" />
        特别鸣谢
      </h2>
      <p class="page-subtitle">感谢以下开源项目、服务和社区对 FlowerGame 的支持</p>
    </div>

    <div class="credits-grid">
      <!-- BMCLAPI -->
      <a href="https://bmclapidoc.bangbang93.com/" target="_blank" class="credit-card">
        <div class="card-icon-wrapper">
          <img src="/icons/bmclapidoc.png" class="card-icon-img" alt="BMCLAPI" />
        </div>
        <div class="card-content">
          <h3 class="card-title">BMCLAPI</h3>
          <p class="card-desc">提供稳定快速的 Minecraft 国内下载镜像源加速服务</p>
          <div class="card-link">bmclapidoc.bangbang93.com</div>
        </div>
      </a>

      <!-- MCIMIRROR -->
      <a href="https://www.mcimirror.top/" target="_blank" class="credit-card">
        <div class="card-icon-wrapper">
          <img src="/icons/mcim.png" class="card-icon-img" alt="MCIMIRROR" />
        </div>
        <div class="card-content">
          <h3 class="card-title">MCIMIRROR</h3>
          <p class="card-desc">提供全面的 Minecraft Mod 镜像加速服务</p>
          <div class="card-link">www.mcimirror.top</div>
        </div>
      </a>

      <!-- EasyTier -->
      <a href="https://easytier.cn/" target="_blank" class="credit-card">
        <div class="card-icon-wrapper">
          <img src="/icons/easytier.png" class="card-icon-img" alt="EasyTier" />
        </div>
        <div class="card-content">
          <h3 class="card-title">EasyTier</h3>
          <p class="card-desc">简单易用的异地组网工具，实现无感联机体验</p>
          <div class="card-link">easytier.cn</div>
        </div>
      </a>

      <!-- Syncthing -->
      <a href="https://syncthing.net/" target="_blank" class="credit-card">
        <div class="card-icon-wrapper">
          <img src="/icons/syncthing.png" class="card-icon-img" alt="Syncthing" />
        </div>
        <div class="card-content">
          <h3 class="card-title">Syncthing</h3>
          <p class="card-desc">安全可靠的去中心化文件同步方案</p>
          <div class="card-link">syncthing.net</div>
        </div>
      </a>

      <!-- MC社区 -->
      <div class="credit-card special">
        <div class="card-icon-wrapper">
          <span class="card-icon-emoji">❤️</span>
        </div>
        <div class="card-content">
          <h3 class="card-title">Minecraft 社区</h3>
          <p class="card-desc">感谢每一位为 Minecraft 社区做出贡献的开发者、创作者和玩家</p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
function handleImageError(e: Event) {
  const img = e.target as HTMLImageElement
  // 如果感谢.png不存在，使用备用图标
  img.src = '/icons/good.png'
}
</script>

<style scoped>
.credits-page {
  width: 100%;
  animation: fadeIn 0.5s ease;
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}

.panel-section {
  background: rgba(30, 41, 59, 0.6);
  border: 1px solid rgba(148, 163, 184, 0.1);
  border-radius: 16px;
  padding: 24px;
  margin-bottom: 24px;
  backdrop-filter: blur(10px);
}

.header-section {
  text-align: center;
  padding: 40px 20px;
  background: linear-gradient(135deg, rgba(30, 41, 59, 0.8) 0%, rgba(15, 23, 42, 0.8) 100%);
}

.page-title {
  font-size: 32px;
  font-weight: 800;
  color: #f1f5f9;
  margin: 0 0 12px 0;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 16px;
}

.title-icon {
  width: 48px;
  height: 48px;
  object-fit: contain;
  filter: drop-shadow(0 4px 8px rgba(0, 0, 0, 0.3));
}

.page-subtitle {
  font-size: 16px;
  color: #94a3b8;
  max-width: 600px;
  margin: 0 auto;
}

.credits-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 20px;
}

.credit-card {
  display: flex;
  align-items: flex-start;
  gap: 20px;
  padding: 24px;
  background: rgba(30, 41, 59, 0.6);
  border: 1px solid rgba(148, 163, 184, 0.1);
  border-radius: 16px;
  backdrop-filter: blur(10px);
  text-decoration: none;
  transition: all 0.3s ease;
  position: relative;
  overflow: hidden;
}

.credit-card:hover {
  transform: translateY(-4px);
  background: rgba(30, 41, 59, 0.8);
  border-color: rgba(34, 197, 94, 0.3);
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.2);
}

.credit-card::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.05) 0%, transparent 100%);
  opacity: 0;
  transition: opacity 0.3s ease;
}

.credit-card:hover::before {
  opacity: 1;
}

.card-icon-wrapper {
  width: 56px;
  height: 56px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(15, 23, 42, 0.6);
  border-radius: 14px;
  border: 1px solid rgba(148, 163, 184, 0.1);
  transition: all 0.3s ease;
  overflow: hidden;
}

.card-icon-img {
  width: 40px;
  height: 40px;
  object-fit: contain;
  filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.2));
}

.card-icon-emoji {
  font-size: 28px;
}

.credit-card:hover .card-icon-wrapper {
  transform: scale(1.1) rotate(5deg);
  border-color: rgba(34, 197, 94, 0.4);
  background: rgba(34, 197, 94, 0.1);
}

.card-content {
  flex: 1;
}

.card-title {
  font-size: 18px;
  font-weight: 700;
  color: #f1f5f9;
  margin: 0 0 8px 0;
  transition: color 0.2s ease;
}

.credit-card:hover .card-title {
  color: #4ade80;
}

.card-desc {
  font-size: 14px;
  color: #94a3b8;
  line-height: 1.5;
  margin: 0 0 12px 0;
}

.card-link {
  font-size: 13px;
  color: #64748b;
  font-family: 'Consolas', monospace;
  display: flex;
  align-items: center;
  gap: 6px;
}

.card-link::before {
  content: '🔗';
  font-size: 12px;
}

/* 特殊样式：MC社区 */
.credit-card.special {
  grid-column: 1 / -1;
  background: linear-gradient(135deg, rgba(34, 197, 94, 0.1) 0%, rgba(15, 23, 42, 0.6) 100%);
  border-color: rgba(34, 197, 94, 0.2);
}

.credit-card.special:hover {
  border-color: rgba(34, 197, 94, 0.5);
}

.credit-card.special .card-icon-wrapper {
  background: rgba(34, 197, 94, 0.2);
  border-color: rgba(34, 197, 94, 0.3);
}

.credit-card.special .card-link::before {
  content: '📅';
}
</style>
