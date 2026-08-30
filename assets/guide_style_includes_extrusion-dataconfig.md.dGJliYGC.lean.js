import{_ as n,o as a,c as i,j as t}from"./chunks/framework.DYAX5gPL.js";const f=JSON.parse('{"title":"","description":"","frontmatter":{},"headers":[],"relativePath":"guide/style/includes/extrusion-dataconfig.md","filePath":"guide/style/includes/extrusion-dataconfig.md"}'),r={name:"guide/style/includes/extrusion-dataconfig.md"};function o(l,e,u,d,s,c){return a(),i("div",null,[...e[0]||(e[0]=[t("pre",null,[t("code",null,`  // [可选] 默认为 null
  // 顶部高度的属性值，如果没有设置，则用默认高度
  altitudeProperty: "height",
  // [可选] 默认为 null
  // 底部高度的属性值，如果底部高度不为0，则三维体会悬空。如果没有设置，则底部高度默认为0。
  minHeightProperty: "min_height",
  // [可选] 默认为1，单位米
  // 高度缩放比例，例如altitudeProperty中如果存储的是楼层数，可以把altitudeScale设为层高，例如4米
  altitudeScale: 1,
  // [可选] 默认为0，单位米
  // 默认的高度。
  // 注：2026 源码 build3DExtrusion 中 defaultAltitude 缺省时为 0；
  // ExtrudePolygonLayer（矢量图层）的默认 dataConfig 中为 20。
  defaultAltitude: 0,
  // [可选] 默认为0，单位米
  // 顶部的厚度，如果不为0，顶部会变成有厚度的形式。
  topThickness: 0,
  // [可选] 默认为true
  // 是否构造顶部数据。
  top: true,
  // [可选] 默认为true
  // 是否构造侧面数据。
  side: true
`)],-1)])])}const g=n(r,[["render",o]]);export{f as __pageData,g as default};
