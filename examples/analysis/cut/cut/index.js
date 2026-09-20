import * as gl from "gl-layers";
import * as maptalks from "maptalks";

const map = new maptalks.Map("map", {
  center: [108.9605239272878, 34.21955775963946],
  zoom: 15,
  pitch: 70,
  bearing: 135,
  lights: {
    ambient: {
      color: [0.8, 0.8, 0.8],
      exposure: 1.5,
    },
    directional: {
      color: [1, 1, 1],
      direction: [1, 1, -1],
    },
  },
  baseLayer: new maptalks.TileLayer("base", {
    urlTemplate: "{urlTemplate}",
    subdomains: ["a", "b", "c", "d"]
  }),
});
const center = map.getCenter();
const gltfLayer = new gl.GLTFLayer("gltf");

const gltfMarker = new gl.GLTFMarker(
  center,
  {
    symbol: {
      shadow: true,
      url: "{res}/gltf/koncepcja/scene.gltf",
      scaleX: 30,
      scaleY: 30,
      scaleZ: 30
    }
  }
).addTo(gltfLayer);

const sceneConfig = {
  environment: {
    enable: true,
    mode: 1,
    level: 1,
    brightness: 1
  },
  shadow: {
    enable: true,
    opacity: 0.5,
    color: [0, 0, 0]
  },
  postProcess: {
    enable: true,
  }
};
/**start**/
const groupGLLayer = new gl.GroupGLLayer("gl", [gltfLayer], {
  sceneConfig
}).addTo(map);
let cutAnalysis = new gl.CutAnalysis({
  position: [center.x, center.y, 10],
  rotation: [45, 0, 0],
  scale: [8, 8, 8],
});
cutAnalysis.addTo(groupGLLayer);
/**end**/

const gui = new mt.GUI();
gui
  .add({
    type: "button",
    label: "重置",
    role: "clear",
  })
  .onClick(() => {
    cutAnalysis.reset();
  });
