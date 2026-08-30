// 本地 ESM shim：把 @maptalks 的 draco 解码器注册进 gl 的全局 transcoders 注册表。
//
// 背景：@maptalks/transcoders.draco 只有 UMD 构建（transcoders.draco.js）被发布，
// 示例却以 `import "draco"` 的方式按 ESM 副作用导入。UMD 文件顶层是 `return transcoder`
//（浏览器分支），作为 ESM 加载会直接抛 SyntaxError，故需要本地包装。
//
// 做法：
//   1. 以 <script> 注入加载 UMD（跨域加载无需 CORS，classic script 不受 import map 限制），
//      得到 window.maptalks.transcoders.draco 解码器工厂；
//   2. 用顶层 await 等待其加载完成，再把它注册进 @maptalks/gl 的内部注册表
//      window.gl_trans__coders（Decoders 会通过该全局读取 draco 解码器）；
//   3. 顶层 await 保证 `import "draco"` 的模块（示例）在解码器就绪前不会执行，消除竞态。
//
// 注意：UMD 在浏览器分支只把解码器工厂挂到 window.maptalks.transcoders.draco，
// 不会自动注册到 gl_trans__coders，因此这里必须显式注册。
const self = typeof globalThis !== 'undefined' ? globalThis : window;
const transcoders = self.gl_trans__coders = self.gl_trans__coders || {};

if (!self.__dracoRegistered__) {
  const loaded = new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = 'https://maptalks.com/api/transcoders.draco.js';
    s.onload = () => resolve();
    s.onerror = () => reject(new Error('failed to load @maptalks/transcoders.draco UMD'));
    document.head.appendChild(s);
  });
  await loaded;
  const factory = self.maptalks && self.maptalks.transcoders && self.maptalks.transcoders.draco;
  if (factory) {
    if (typeof transcoders.registerTranscoder === 'function') {
      transcoders.registerTranscoder('draco', factory);
    } else {
      transcoders['draco'] = factory;
    }
  }
  self.__dracoRegistered__ = true;
}

export default transcoders.draco;
