// 本地 ESM 包装：以 <script> 注入加载 d3 v4 的 UMD 全局并导出为默认。
//
// 背景：d3-proj 使用 d3 v4 的回调式 d3.json(url, cb) 与 d3.geoOrthographic，import map 的
// d3 v7 是 promise 式、且与 topojson-client 一起经 esm.sh 加载会出现
// "Cannot assign to read only property '__esModule'" 的互操作错误，故改用经典 <script>
// 注入（浏览器全局下 d3-request 的 XHR / document / window 均可用）。
const g = typeof globalThis !== 'undefined' ? globalThis : window;
if (!g.__d3v4Loaded__) {
  await new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = 'https://d3js.org/d3.v4.min.js';
    s.onload = () => resolve();
    s.onerror = () => reject(new Error('failed to load d3 v4'));
    document.head.appendChild(s);
  });
  g.__d3v4Loaded__ = true;
}
export default g.d3;
