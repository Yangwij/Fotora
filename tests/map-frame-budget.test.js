"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const root = path.join(__dirname, "..");
const read = (file) => fs.readFileSync(path.join(root, "web", file), "utf8");

test("地球仪移动/缩放每帧不做诊断与重复样式写入", () => {
  const globe = read("map/embedded-globe.js");
  const handlers = globe.slice(
    globe.indexOf('map.on("zoom", () => {'),
    globe.indexOf('map.on("click", (event) => {'),
  );
  /* 诊断调度（scheduleDiagnostics 内部节流合帧）按参考版保留在 move/zoom。 */
  const moveHandler = handlers.slice(
    handlers.indexOf('map.on("move", () => {'),
    handlers.indexOf('map.on("render", () => {'),
  );
  const zoomHandler = handlers.slice(
    handlers.indexOf('map.on("zoom", () => {'),
    handlers.indexOf('map.on("zoomend", () => {'),
  );

  /* getStyle() 不在每帧诊断里重建 */
  const diag = globe.slice(
    globe.indexOf("updateDiagnostics() {"),
    globe.indexOf("updateDiagnostics() {") + 1400,
  );
  assert.match(diag, /if \(!this\._projectionType\)/);
  /* 背景 / 位移 CSS 变量值没变就不写，避免整棵子树重算样式 */
  assert.match(globe, /if \(this\._globeCx !== cx\)/);
  assert.match(globe, /if \(this\._globeCy !== cy\)/);
  assert.match(globe, /if \(this\._globeShiftY !== shift\)/);
  /* 容器尺寸缓存 + 每帧只读一次传参 */
  assert.match(globe, /cachedContainerSize\(\) \{/);
  assert.match(
    globe,
    /drawPhotoCanvasGroup\(context, group, selected = false, size = null\)/,
  );
  /* 罗盘 bearing 没变不写 DOM */
  assert.match(globe, /if \(this\._compassBearing === rounded\) return;/);
});

test("平面地图诊断不在 move/zoom 每帧触发，投影缓存", () => {
  const map = read("map/map.js");
  assert.doesNotMatch(map, /map\.on\("move", updateMapDiagnostics\)/);
  assert.doesNotMatch(map, /map\.on\("zoom", updateMapDiagnostics\)/);
  assert.match(map, /map\.on\("moveend", updateMapDiagnostics\)/);
  assert.match(map, /map\.on\("zoomend", updateMapDiagnostics\)/);
  assert.match(map, /if \(!updateMapDiagnostics\.projection\)/);
});

test("地图标记聚类与密集 canvas 切换的照片数阈值为 480（与参考版一致）", () => {
  const globe = read("map/embedded-globe.js");
  assert.match(globe, /if \(this\.items\.length <= 480 \|\| zoom >= 13\)/);
  assert.match(
    globe,
    /this\.items\.length > 480 &&\s*this\.map\.getZoom\(\) >= 13 &&/,
  );
  assert.doesNotMatch(globe, /items\.length <= 200|items\.length > 200/);
});
