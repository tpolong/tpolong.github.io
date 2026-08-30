// 本地 ESM 包装：加载 jQuery 全局后，以 <script> 注入 jQuery-UI 的 UMD 扩展。
//
// 背景：sunshine 示例用 $(...).datepicker()/.slider()，REPL 不跑 <script src> 经典脚本，
// 且 import map 的 jquery map 约 3.7.1 与示例原配的 1.12.4 不同。这里 import jquery 设置
// window.$/window.jQuery 后，再用 <script> 注入 jQuery-UI UMD（它会读取已有 jQuery 全局，
// 扩展 $.fn 的 datepicker/slider 等方法），并以 default 导出增强后的 $。
import $ from "jquery";
window.$ = $;
window.jQuery = $;

if (!window.__jQueryUILoaded__) {
  await new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = 'https://code.jquery.com/ui/1.12.1/jquery-ui.min.js';
    s.onload = () => resolve();
    s.onerror = () => reject(new Error('failed to load jquery-ui'));
    document.head.appendChild(s);
  });
  window.__jQueryUILoaded__ = true;
}

export default $;
