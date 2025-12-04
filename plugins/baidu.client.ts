export default defineNuxtPlugin(() => {
  // 百度统计
  // 使用 (window as any) 来规避 TS 类型检查
  const w = window as any
  w._hmt = w._hmt || [];
  
  (function() {
    const hm = document.createElement("script");
    hm.src = "https://hm.baidu.com/hm.js?946ddeeca8c50a636efa33a0d1900529";
    const s = document.getElementsByTagName("script")[0]; 
    if (s && s.parentNode) {
      s.parentNode.insertBefore(hm, s);
    }
  })();
  
  if (process.env.NODE_ENV === 'development') {
    console.log('百度统计已注入');
  }
})
