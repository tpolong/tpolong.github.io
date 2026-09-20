import * as gl from "gl-layers";
import * as maptalks from "maptalks";

const map = new maptalks.Map("map", {
  center: [-0.113049, 51.498568],
  zoom: 14,
  baseLayer: new maptalks.TileLayer("base", {
    urlTemplate: "{urlTemplate}",
    subdomains: ["a", "b", "c", "d"],
    attribution: "{attribution}",
  }),
});

const map1 = new maptalks.Map("map1", {
  center: [-0.113049, 51.498568],
  zoom: 14,
  baseLayer: new maptalks.TileLayer("base", {
    urlTemplate: "{urlTemplate}",
    subdomains: ["a", "b", "c", "d"],
    attribution: "{attribution}",
  }),
});

const lineLayer = new gl.LineStringLayer("linelayer").addTo(map);
const line = new maptalks.LineString(
  [
    [-0.131049, 51.498568],
    [-0.107049, 51.498568],
    [-0.107049, 51.483568],
  ],
  {
    symbol: {
      lineColor: "#1bbc9b",
      lineWidth: 3,
    },
  }
).addTo(lineLayer);

gl.LineStringLayer.fromJSON(map.getLayer("linelayer").toJSON()).addTo(
  map1
);
