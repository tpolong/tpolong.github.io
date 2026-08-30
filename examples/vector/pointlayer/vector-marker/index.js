import * as gl from "gl-layers";
import * as maptalks from "maptalks";

const map = new maptalks.Map("map", {
  center: [-74.00912099912109, 40.71107610933129],
  zoom: 14,
  baseLayer: new maptalks.TileLayer("base", {
    urlTemplate: "{urlTemplate}",
    subdomains: ["a", "b", "c", "d"],
    attribution: "{attribution}",
  }),
});

const pointLayer = new gl.PointLayer("point");

const marker = new maptalks.Marker([-74.00912099912109, 40.71107610933129], {
  symbol: {
    markerType: "ellipse",
    markerFill: "#22be9e",
    markerFillOpacity: 1,
    markerLineColor: "#fff",
    markerLineWidth: 3,
    markerLineOpacity: 1,
    markerLineDasharray: [],
    markerWidth: 40,
    markerHeight: 40,
    markerDx: 0,
    markerDy: 0,
    markerOpacity: 1,
  },
}).addTo(pointLayer);

const groupLayer = new gl.GroupGLLayer("group", [pointLayer]);
groupLayer.addTo(map);
