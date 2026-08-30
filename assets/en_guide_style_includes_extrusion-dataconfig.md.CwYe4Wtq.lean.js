import{_ as n,o,c as i,j as e}from"./chunks/framework.DYAX5gPL.js";const p=JSON.parse('{"title":"","description":"","frontmatter":{},"headers":[],"relativePath":"en/guide/style/includes/extrusion-dataconfig.md","filePath":"en/guide/style/includes/extrusion-dataconfig.md"}'),a={name:"en/guide/style/includes/extrusion-dataconfig.md"};function l(r,t,s,u,d,h){return o(),i("div",null,[...t[0]||(t[0]=[e("pre",null,[e("code",null,`  // [Optional] Default: null
  // Property of the top height; if not set, the default height is used
  altitudeProperty: "height",
  // [Optional] Default: null
  // Property of the bottom height. If the bottom height is not 0, the 3D body will be floating in the air. If not set, the bottom height defaults to 0.
  minHeightProperty: "min_height",
  // [Optional] Default: 1, in meters
  // Height scale. For example, if altitudeProperty stores the number of floors, set altitudeScale to the floor height, e.g. 4 meters
  altitudeScale: 1,
  // [Optional] Default: 0, in meters
  // Default height.
  // Note: in the 2026 source code build3DExtrusion, defaultAltitude defaults to 0;
  // in the default dataConfig of ExtrudePolygonLayer (vector layer) it is 20.
  defaultAltitude: 0,
  // [Optional] Default: 0, in meters
  // Top thickness; if not 0, the top is rendered with a thickness
  topThickness: 0,
  // [Optional] Default: true
  // Whether to build the top data
  top: true,
  // [Optional] Default: true
  // Whether to build the side data
  side: true
`)],-1)])])}const c=n(a,[["render",l]]);export{p as __pageData,c as default};
