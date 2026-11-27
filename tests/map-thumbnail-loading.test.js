"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const root = path.resolve(__dirname, "..");
const read = (...parts) => fs.readFileSync(path.join(root, ...parts), "utf8");
const app = read("web", "app.js");
const globe = read("web", "map", "embedded-globe.js");
const css = read("web", "map", "globe-map.css");

test("地图同时提供 48px 兜底图和 128/200px 清晰图", () => {
  assert.equal(
    (app.match(/thumbMicro: itemThumbUrl\(item, 48, "cover"\)/g) || []).length,
    2,
  );
  assert.match(
    globe,
    /thumbMicro: String\(raw\.thumbMicro \|\| raw\.thumb \|\| ""\)/,
  );
  assert.match(
    globe,
    /const highKey = this\.photoCanvasImageKey\(item, item\.thumb\);/,
  );
  assert.match(globe, /cached = this\.photoCanvasImages\.get\(microKey\)/);
});

test("地图 Canvas 先加载可见 L0，再加载清晰图", () => {
  assert.match(
    globe,
    /requestPhotoCanvasImage\(item, item\.thumbMicro \|\| item\.thumb, \{\s*front: true,\s*\}\)/,
  );
  assert.match(globe, /primePhotoCanvasVisibleImages\(groups\)/);
  assert.match(globe, /resetPhotoCanvasImageQueue\(\) \{/);
  assert.match(globe, /image\.removeAttribute\("src"\)/);
  assert.match(globe, /image\.fetchPriority = "high"/);
});

test("地图 DOM 标记先把 L0 作为背景，再升级到 200px", () => {
  const apply = globe.slice(
    globe.indexOf("applyMarkerPhoto(record, item)"),
    globe.indexOf("markerElement(group)"),
  );
  assert.match(apply, /const micro = String\(item\?\.thumbMicro/);
  assert.match(apply, /image\.style\.backgroundImage = micro/);
  assert.match(apply, /image\.src = low/);
  assert.match(apply, /record\.thumbToken === token/);
  assert.match(apply, /image\.src = high/);

  const markerCss = css.slice(
    css.indexOf(".pm-photo-icon img {"),
    css.indexOf(".pm-photo-icon:hover img"),
  );
  assert.match(markerCss, /background-position: center;/);
  assert.match(markerCss, /background-size: cover;/);
});

test("Canvas 与 DOM 切换时保留已经加载的地图缩略图", () => {
  const render = globe.slice(
    globe.indexOf("renderMarkers() {"),
    globe.indexOf("setItems(rawItems"),
  );
  assert.match(render, /clearPhotoCanvasLayer\(\{ release: false \}\)/);
  assert.doesNotMatch(render, /clearPhotoCanvasLayer\(\{ release: true \}\)/);
});
