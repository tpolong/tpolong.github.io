/**
 * @maptalks/regl 的 ESM wrapper。
 * 官方 regl 包是 CJS/UMD（module.exports = createREGL 函数），
 * gl 的 ESM 构建需要 `import regl, { createREGL }`（default + named 双导出），
 * 而 esm.sh 的自动转换无法同时提供两者，这里手动补全。
 */
import regl from "https://esm.sh/@maptalks/regl@3.3.5/es2022/regl.mjs";

export default regl;
export const createREGL = regl;
