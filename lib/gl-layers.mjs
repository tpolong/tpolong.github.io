/**
 * REPL 的 "gl-layers" 汇总入口。
 *
 * maptalks-gl@0.124.4 的 ESM 入口（index.js）只 re-export 了 maptalks 核心与
 * gl / vt / 3dtiles / gltf-layer / transform-control / video-layer，
 * 空间分析类（ViewshedAnalysis、SkylineAnalysis、CutAnalysis 等）已被拆到
 * 独立的 @maptalks/analysis 包。
 *
 * 本站示例统一从 "gl-layers" 导入这些类，因此这里把两者合并导出，
 * 保持示例代码的导入方式不变。
 *
 * 裸标识符由 ExampleRepl.vue 的 import map 解析。
 */
export * from "maptalks-gl";
export * from "@maptalks/analysis";
