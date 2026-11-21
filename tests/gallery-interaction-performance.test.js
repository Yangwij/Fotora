"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const root = path.join(__dirname, "..");
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");
const sliceBetween = (value, start, end) =>
  value.slice(value.indexOf(start), value.indexOf(end, value.indexOf(start)));

test("Ctrl+滚轮每个手势只换一档，并把连续目标合并到最终档位", () => {
  const app = read("web/app.js");
  const wheel = sliceBetween(
    app,
    "function handleGalleryWheel(",
    '$("#content").addEventListener("wheel", handleGalleryWheel',
  );
  const drain = sliceBetween(
    app,
    "async function drainGalleryZoom(",
    "function requestGalleryZoom(",
  );

  assert.match(app, /const GALLERY_WHEEL_GESTURE_IDLE_MS = 90;/);
  assert.doesNotMatch(app, /GALLERY_WHEEL_IDLE_MS/);
  assert.match(
    wheel,
    /if \(galleryWheelLocked\) \{[\s\S]*?clearTimeout\(galleryWheelUnlockTimer\)[\s\S]*?GALLERY_WHEEL_GESTURE_IDLE_MS[\s\S]*?return;/,
  );
  assert.match(drain, /const next = clampGalleryZoom\(galleryZoomTarget\)/);
  assert.match(
    drain,
    /galleryZoomPending = galleryZoomTarget - state\.photoZoom/,
  );
});

test("低档位点击直接命中目标照片，不扫描整个网格", () => {
  const app = read("web/app.js");
  const focus = sliceBetween(
    app,
    "function galleryZoomFocusFromEvent(",
    "function galleryZoomFocusFromTile(",
  );

  assert.match(focus, /event\.target\.closest\("\.tile\[data-index\]"\)/);
  assert.match(
    focus,
    /for \(const tile of bestTile\s*\?\s*\[\]\s*:\s*targetGrid\.querySelectorAll/,
  );
});

test("点击只移动当前 Tab 停靠点，不遍历全部照片", () => {
  const app = read("web/app.js");
  const tabStops = sliceBetween(
    app,
    "function syncGalleryTabStops(",
    "function hasGridItems(",
  );

  assert.doesNotMatch(tabStops, /querySelectorAll\("\.photo-grid/);
  assert.match(tabStops, /tile\[data-index\]\[tabindex="0"\]/);
  assert.match(tabStops, /previous\.tabIndex = -1/);
  assert.match(tabStops, /current\.tabIndex = 0/);
});

test("小档位使用轻量缩略图，并在布局动画结束后才换图", () => {
  const app = read("web/app.js");
  const thumbSize = sliceBetween(
    app,
    "function galleryThumbSizeForZoom(",
    "const galleryZoomClasses",
  );
  const restore = sliceBetween(
    app,
    "function restoreGalleryImageQuality(",
    "function loadGalleryWindowImage(",
  );
  const zoom = sliceBetween(
    app,
    "async function animateGalleryZoomTo(",
    "async function drainGalleryZoom(",
  );

  assert.match(thumbSize, /if \(zoom <= 2\) return 128;/);
  assert.match(thumbSize, /if \(zoom === 3\) return 200;/);
  assert.match(restore, /img\.dataset\.galleryThumbSize = targetSize/);
  assert.doesNotMatch(restore, /img\.src = src/);
  assert.match(zoom, /syncQuality: false/);
  assert.match(zoom, /setGalleryImageQuality\(photoLayoutGrids\(\), level\)/);
});

test("虚拟网格滚动按索引更新，不再逐格 querySelector", () => {
  const app = read("web/app.js");
  const sync = sliceBetween(
    app,
    "function syncVirtualPhotoGrid(",
    "function syncVirtualPhotoGridWindowNow(",
  );

  assert.match(sync, /const tiles = new Map\(\)/);
  assert.match(sync, /const tile = tiles\.get\(box\.index\)/);
  assert.doesNotMatch(sync, /grid\.querySelector\(/);
  assert.match(sync, /if \(tile\.style\.left !== left\)/);
});

test("滚动工作合并在单个动画帧，并通过密集档位 pulse 限制图层数量", () => {
  const app = read("web/app.js");
  const styles = read("web/styles.css");
  const scroll = sliceBetween(
    app,
    "function handleGalleryContentScroll()",
    '$("#content").addEventListener("scroll", handleGalleryContentScroll',
  );

  assert.match(scroll, /requestAnimationFrame\(\(\) => \{/);
  assert.match(scroll, /syncVirtualPhotoGridWindowNow\(\)/);
  assert.match(app, /const GALLERY_FLIP_TILE_LIMIT = 140;/);
  assert.match(app, /function animateGalleryLayoutPulse\(/);
  assert.match(app, /duration: 130/);
  assert.match(
    styles,
    /html\.gallery-is-scrolling \.photo-grid \.tile[\s\S]*?box-shadow:\s*none !important;/,
  );
});
