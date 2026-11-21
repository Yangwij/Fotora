"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const root = path.resolve(__dirname, "..");
const globe = fs.readFileSync(
  path.join(root, "web", "map", "embedded-globe.js"),
  "utf8",
);
const css = fs.readFileSync(
  path.join(root, "web", "map", "globe-map.css"),
  "utf8",
);

test("照片点位无入场揭示动画（与参考版一致，直接显示）", () => {
  assert.doesNotMatch(css, /is-revealing/);
  assert.doesNotMatch(css, /pm-marker-reveal/);
  const create = globe.slice(
    globe.indexOf("createPhotoMarker(group) {"),
    globe.indexOf("updatePhotoMarker(record, group) {"),
  );
  assert.doesNotMatch(create, /is-revealing/);
  assert.doesNotMatch(create, /animationend/);
});

test("改位置直接落位（与参考版一致，无平滑插值）", () => {
  assert.doesNotMatch(globe, /moveMarkerSmoothly/);
  const update = globe.slice(
    globe.indexOf("updatePhotoMarker(record, group) {"),
    globe.indexOf("renderMarkers() {"),
  );
  assert.match(update, /record\.marker\.setLngLat\(\[lng, lat\]\)/);
  assert.doesNotMatch(globe, /record\.moveFrame/);
});
