// 本地 ESM 包装：以 <script> 注入加载 d3 v3 的 UMD 全局并导出为默认。
//
// 背景：d3-marker 等示例使用 d3 v3 的 API（d3.geom.quadtree / d3.svg / d3.scale.identity），
// 而 import map 默认的 d3 v7 没有这些；esm.sh 转出的 d3 v3 ESM 在模块作用域内取不到
// document，会报 "Cannot read properties of undefined (reading 'document')"，故改用
// 经典 <script> 注入（浏览器全局下 document/window 均可用），再以 default 导出 d3 对象。
const g = typeof globalThis !== 'undefined' ? globalThis : window;
if (!g.__d3v3Loaded__) {
  await new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = 'https://cdnjs.cloudflare.com/ajax/libs/d3/3.5.17/d3.min.js';
    s.onload = () => resolve();
    s.onerror = () => reject(new Error('failed to load d3 v3'));
    document.head.appendChild(s);
  });
  g.__d3v3Loaded__ = true;
}
export default g.d3;
