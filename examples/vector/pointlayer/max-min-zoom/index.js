import * as gl from "gl-layers";
import * as maptalks from "maptalks";

const map = new maptalks.Map("map", {
  center: [-0.113049, 51.498568],
  zoom: 14,
  zoomControl: true,
  baseLayer: new maptalks.TileLayer("base", {
    urlTemplate: "{urlTemplate}",
    subdomains: ["a", "b", "c", "d"],
    attribution: "{attribution}",
  }),
});

const point = new gl.PointLayer("point", {
  minZoom: 12,
  maxZoom: 16,
});

const marker = new maptalks.Marker(map.getCenter(), {
  symbol: {
    textName: "Layer is add.",
    textWeight: "bold",
    textSize: 50,
    textFill: "#1bbc9b",
    textHaloFill: "#fff",
    textHaloRadius: 5,
  },
}).addTo(point);

const groupLayer = new gl.GroupGLLayer("group", [point]);
groupLayer.addTo(map);
