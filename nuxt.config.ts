// https://nuxt.com/docs/api/configuration/nuxt-config

// 防止开发服务器因后端连接断开而崩溃
if (process.env.NODE_ENV === 'development') {
  process.on('unhandledRejection', (reason, promise) => {
    if (reason instanceof Error && reason.message.includes('ECONNRESET')) {
      // 忽略 ECONNRESET 错误，这是由于后端服务不可用或重启导致的
      return;
    }
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  });
  
  process.on('uncaughtException', (err) => {
    if (err.message.includes('ECONNRESET')) {
      return;
    }
    console.error('Uncaught Exception:', err);
  });
}

export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },
  ssr: false,
  app: {
    baseURL: '/web/'
  },
  build: {
    transpile: ['naive-ui', 'vueuc', '@css-render/vue3-ssr', '@juggle/resize-observer']
  },
  // 开发服务器配置
  devServer: {
    port: 3000,
    host: '0.0.0.0'
  },
  // Nitro 代理配置 - 禁用 Nitro 代理，只使用 Vite 代理
  // nitro: {
  //   devProxy: {
  //     '/api': {
  //       target: 'http://127.0.0.1:17890/api',
  //       changeOrigin: true,
  //       prependPath: true
  //     },
  //     '/ws': {
  //       target: 'ws://127.0.0.1:17890/ws',
  //       changeOrigin: true,
  //       ws: true
  //     }
  //   }
  // },
  // Vite 配置
  vite: {
    server: {
      // 禁用代理，因为我们现在直接连接本地后端
      // proxy: {
      //   '/api': {
      //     target: 'http://127.0.0.1:17890',
      //     changeOrigin: true,
      //     secure: false,
      //     ws: false,
      //     configure: (proxy, _options) => {
      //       proxy.on('error', (err, _req, _res) => {
      //         console.log('proxy error', err);
      //       });
      //     }
      //   },
      //   '/ws': {
      //     target: 'ws://127.0.0.1:17890',
      //     changeOrigin: true,
      //     ws: true,
      //     secure: false,
      //     rewrite: (path) => path.replace(/^\/ws/, '/ws'),
      //     configure: (proxy, _options) => {
      //        proxy.on('error', (err, _req, _res) => {
      //          console.log('proxy error', err);
      //        });
      //     }
      //   }
      // }
    }
  }
})
