"use strict";

/* 本轮 UX 修复：菜单悬停文字、返回顶部设置、查看器双击复位、预览回弹统一、照片栏下移。 */

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const root = path.join(__dirname, "..");
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");

test("返回顶部按钮设置项完整接入（开关/持久化/靠近浮现）", () => {
  const app = read("web/app.js");
  const dialog = read("web/settings-dialog.js");
  const main = read("electron/main.js");
  assert.match(dialog, /key: "hideBackToTop",\s*invert: true,\s*label: "显示返回顶部按钮"/);
  assert.match(main, /"hideBackToTop",/);
  assert.match(app, /function readHideBackToTop\(\)/);
  assert.match(app, /\(!hideBackToTop \|\| backToTopMouseNear\)/);
  assert.match(app, /let backToTopMouseNear = false;/);
});

test("查看器照片双击完整复位缩放与平移（恢复打开态）", () => {
  const app = read("web/app.js");
  const dbl = app.slice(
    app.indexOf('$("#viewerStage").addEventListener("dblclick"'),
    app.indexOf("let viewerFilmstripDrag"),
  );
  assert.match(dbl, /!video &&/);
  assert.match(dbl, /Math\.abs\(viewerZoom - 1\) > 0\.001/);
  assert.match(dbl, /resetViewerZoom\(\);/);
});

test("查看器照片栏略微下移", () => {
  const css = read("web/styles.css");
  assert.match(css, /\.viewer-filmstrip \{\s*position: absolute;\s*left: 50%;\s*bottom: 12px;/);
});

test("地图标记缩放行为与参考版一致（缩放曲线 + 逐帧适配）", () => {
  const globe = read("web/map/embedded-globe.js");
  const fn = globe.slice(
    globe.indexOf("markerScale(zoom) {"),
    globe.indexOf("markerIconSize(item) {"),
  );
  assert.match(fn, /2 \*\* \(zoom - MARKER_FULL_ZOOM\)/);
  const zoomHandler = globe.slice(
    globe.indexOf('map.on("zoom", () => {'),
    globe.indexOf('map.on("zoomend", () => {'),
  );
  assert.match(zoomHandler, /setMarkerScale\(this\.markerScale\(map\.getZoom\(\)\), false\)/);
});
