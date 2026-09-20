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

const lineLayer = new gl.LineStringLayer("linelayer");

const json = {
  type: "Feature",
  geometry: {
    type: "LineString",
    coordinates: [
      [-0.131049, 51.498568],
      [-0.107049, 51.498568],
    ],
  },
  properties: {
    name: "LineString",
  },
};
const line = maptalks.GeoJSON.toGeometry(json).addTo(lineLayer);
line.updateSymbol({
  lineColor: "#f00",
  lineWidth: 5,
});

const groupLayer = new gl.GroupGLLayer("group", [lineLayer]).addTo(map);
