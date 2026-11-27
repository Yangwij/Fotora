"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

const root = path.join(__dirname, "..");
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");
const sliceBetween = (value, start, end) =>
  value.slice(value.indexOf(start), value.indexOf(end, value.indexOf(start)));

test("触控板捏合只做 GPU 缩放，鼠标滚轮每次只提交一个档位", () => {
  const app = read("web/app.js");
  const styles = read("web/styles.css");
  const wheel = sliceBetween(
    app,
    "function handleGalleryWheel(",
    '$("#content").addEventListener("wheel", handleGalleryWheel',
  );
  const preview = sliceBetween(
    app,
    "function updateGalleryWheelZoomPreview(",
    "function scheduleGalleryWheelZoomCommit(",
  );
  const commit = sliceBetween(
    app,
    "async function commitGalleryWheelZoom(",
    "function handleGalleryWheel(",
  );

  assert.match(app, /const GALLERY_WHEEL_GESTURE_IDLE_MS = 90;/);
  assert.doesNotMatch(app, /GALLERY_WHEEL_IDLE_MS/);
  assert.match(
    wheel,
    /if \(!galleryWheelIsPinch\(e\)\) \{[\s\S]*?requestGalleryZoom\(dir, focus\);[\s\S]*?return;/,
  );
  assert.match(wheel, /updateGalleryWheelZoomPreview\(/);
  assert.match(preview, /galleryWheelPreviewLog \+=/);
  assert.match(preview, /applyGalleryWheelZoomPreview\(visualScale\)/);
  assert.doesNotMatch(preview, /applyGalleryZoomClasses\(/);
  assert.match(app, /entry\.host\.style\.transform = `scale\(/);
  assert.match(commit, /applyGalleryZoomClasses\(null, toLevel/);
  assert.match(commit, /playGalleryZoomCrossfade\(/);
  assert.match(
    commit,
    /setGalleryImageQuality\(photoLayoutGrids\(\), toLevel\)/,
  );
  assert.doesNotMatch(commit, /while \(galleryZoomPending/);
  assert.match(
    styles,
    /html\.gallery-wheel-zooming #content \.tile,[\s\S]*?pointer-events:\s*none;/,
  );
});

test("连续反向滚轮在换档动画期间仍会排入下一个目标", () => {
  const app = read("web/app.js");
  const wheel = sliceBetween(
    app,
    "function handleGalleryWheel(",
    '$("#content").addEventListener("wheel", handleGalleryWheel',
  );
  const discrete = sliceBetween(
    wheel,
    "if (!galleryWheelIsPinch(e)) {",
    "if (galleryZoomBusy || galleryZoomPending !== 0) return;",
  );

  assert.match(
    discrete,
    /const reversed =\s*galleryWheelMouseDirection !== 0 &&\s*dir !== galleryWheelMouseDirection;/,
  );
  assert.match(
    discrete,
    /const locked =\s*galleryWheelMouseLocked &&\s*now - galleryWheelMouseLastAt < GALLERY_WHEEL_MOUSE_LOCK_MS &&\s*!reversed;/,
    "惯性去重必须按事件时间戳判断，不能依赖可能被主线程延迟的定时器",
  );
  assert.doesNotMatch(
    discrete,
    /galleryZoomBusy|galleryZoomPending/,
    "动画忙碌不能吞掉已经通过滚轮去重的新手势",
  );
  assert.match(discrete, /requestGalleryZoom\(dir, focus\)/);
});

test("连续滚轮沿用首个照片锚点，动画中不重新选格子", () => {
  const app = read("web/app.js");
  const focus = sliceBetween(
    app,
    "function galleryZoomFocusFromEvent(",
    "function galleryZoomFocusFromTile(",
  );
  const request = sliceBetween(
    app,
    "function requestGalleryZoom(",
    "function rubberBandGalleryZoom(",
  );

  assert.match(focus, /const tileHit = Boolean\(bestTile\)/);
  assert.match(focus, /tileHit,/);
  assert.match(
    request,
    /const continuing =\s*galleryZoomBusy \|\|\s*galleryZoomPending !== 0 \|\|/,
  );
  assert.match(app, /const GALLERY_ZOOM_ANCHOR_HOLD_MS = 700;/);
  assert.match(
    request,
    /Math\.hypot\(focus\.x - previous\.x, focus\.y - previous\.y\) < 24/,
  );
  assert.match(
    request,
    /continuing && pointerStayed && previous\.index != null[\s\S]*?focus\.index = previous\.index/,
  );
});

test("换档冻结旧画面，并用同向缩放的双层交叉淡化", () => {
  const app = read("web/app.js");
  const styles = read("web/styles.css");
  const begin = sliceBetween(
    app,
    "function beginGalleryZoomCrossfade(",
    "function playGalleryZoomCrossfade(",
  );
  const play = sliceBetween(
    app,
    "function playGalleryZoomCrossfade(",
    "function clearGalleryWheelZoomPreview(",
  );
  const commit = sliceBetween(
    app,
    "async function commitGalleryWheelZoom(",
    "function handleGalleryWheel(",
  );
  const zoom = sliceBetween(
    app,
    "async function animateGalleryZoomTo(",
    "async function drainGalleryZoom(",
  );

  assert.match(begin, /const stage = cloneContentSnapshot\(content\)/);
  assert.match(begin, /const snapshot = document\.createElement\("div"\)/);
  assert.match(begin, /snapshot\.append\(stage\)/);
  assert.match(begin, /main\.append\(snapshot\)/);
  assert.match(begin, /stage\.scrollTop = content\.scrollTop/);
  assert.match(play, /outgoingEndScale = relativeScale \/ visualScale/);
  assert.match(play, /incomingStartScale = visualScale \/ relativeScale/);
  assert.match(play, /motion\.snapshot\.animate\(outgoingFrames/);
  assert.match(play, /motion\.stage\.animate\(/);
  assert.match(play, /host\.animate\(incomingFrames/);
  assert.doesNotMatch(play, /box-shadow|width:|height:/);
  assert.match(
    play,
    /reducedMotion\s*\? \[\{ opacity: 1 \}, \{ opacity: 0 \}\]/,
  );
  assert.match(
    commit,
    /const crossfade = beginGalleryZoomCrossfade\(focus\);[\s\S]*?clearGalleryWheelZoomPreview\(\);/,
  );
  assert.match(commit, /previewScale = Math\.exp\(galleryWheelPreviewLog\)/);
  assert.match(commit, /playGalleryZoomCrossfade\(/);
  assert.match(zoom, /beginGalleryZoomCrossfade\(focus\)/);
  assert.match(zoom, /playGalleryZoomCrossfade\(crossfade, fromLevel, level\)/);
  assert.match(
    styles,
    /\.gallery-zoom-crossfade-snapshot \.photo-grid \.tile,[\s\S]*?transition:\s*none !important;/,
  );
});

test("虚拟布局倍率与手势预览共用同一张档位表", () => {
  const app = read("web/app.js");
  const targetSize = sliceBetween(
    app,
    "function photoLayoutTargetSize(",
    "function photoLayoutGap(",
  );

  assert.match(targetSize, /const scale = GALLERY_LEVEL_SCALE\[level\];/);
  assert.doesNotMatch(targetSize, /level === 1\s*\? 0\.1/);
});

test("窗口化网格换档后不会因 content-visibility 留下下半屏空白", () => {
  const styles = read("web/styles.css");
  assert.match(
    styles,
    /\.photo-grid\.photo-grid-windowed \.tile\s*\{\s*content-visibility:\s*visible;/,
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

test("所有布局和普通缩放共用同一张轻量网格图，标准档叠加细节层", () => {
  const app = read("web/app.js");
  const thumbSize = sliceBetween(
    app,
    "const GALLERY_ZOOM_MIN = 1;",
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

  assert.match(thumbSize, /GALLERY_GRID_THUMB_SIZE = 192;/);
  assert.match(thumbSize, /GALLERY_GRID_DETAIL_SIZE = 400;/);
  assert.match(
    thumbSize,
    /function galleryThumbSizeForZoom\(\)\s*\{\s*return GALLERY_GRID_THUMB_SIZE;/,
  );
  assert.match(restore, /img\.dataset\.galleryThumbSize = targetSize/);
  assert.doesNotMatch(restore, /img\.src = src/);
  const detail = sliceBetween(
    app,
    "function loadGalleryDetailedImage(",
    "function setGalleryImageQuality(",
  );
  assert.match(detail, /overlay\.className = "gallery-full-overlay"/);
  assert.doesNotMatch(detail, /img\.src = detailSrc/);
  assert.match(zoom, /syncQuality: false/);
  assert.match(zoom, /setGalleryImageQuality\(photoLayoutGrids\(\), level\)/);
});

test("小档格子提高到可读密度，标准档开始加载共用细节层", () => {
  const app = read("web/app.js");
  const styles = read("web/styles.css");
  assert.match(app, /1: 0\.32,/);
  assert.match(app, /2: 0\.46,/);
  assert.match(app, /3: 0\.64,/);
  assert.match(app, /const GALLERY_DETAIL_MIN = GALLERY_STANDARD_ZOOM;/);
  assert.match(styles, /\.photo-grid\.gallery-zoom-1[\s\S]*?\* 0\.32\)/);
  assert.match(styles, /\.photo-grid\.gallery-zoom-2[\s\S]*?\* 0\.46\)/);
  assert.match(styles, /\.photo-grid\.gallery-zoom-3[\s\S]*?\* 0\.64\)/);
});

test("小档强制方形总览，回到标准档恢复当前布局和原始比例", () => {
  const app = read("web/app.js");
  const styles = read("web/styles.css");
  const layout = sliceBetween(
    app,
    "function effectivePhotoLayoutMode()",
    "function syncPhotoGridLayoutClasses()",
  );
  const original = sliceBetween(
    app,
    "const isOriginalRatio = () =>",
    "/* ---------------------- 照片网格布局",
  );
  assert.match(
    layout,
    /if \(state\.photoZoom < GALLERY_STANDARD_ZOOM\) return "tile";/,
  );
  assert.match(
    original,
    /state\.photoZoom >= GALLERY_STANDARD_ZOOM[\s\S]*?activePhotoStyle\(\) === "original"/,
  );
  const applyZoom = sliceBetween(
    app,
    "function applyGalleryZoomClasses(",
    "function galleryVisibleSnapshots(",
  );
  assert.match(
    applyZoom,
    /setPhotoGridLayoutInstant\(true\)/,
    "换档必须在同一帧冻结方格裁切，不能只更新新补出来的格子",
  );
  assert.match(
    styles,
    /\.photo-grid\.gallery-square \.tile img,[\s\S]*?transition:\s*none !important;/,
  );
});

test("虚拟网格滚动按索引更新，不再逐格 querySelector", () => {
  const app = read("web/app.js");
  const sync = sliceBetween(
    app,
    "function syncVirtualPhotoGrid(",
    "function syncVirtualPhotoGridWindowNow(",
  );
  const layout = sliceBetween(
    app,
    "function applyPhotoGridLayouts(",
    "function schedulePhotoGridLayout(",
  );

  assert.match(sync, /virtualPhotoGridTileMaps/);
  assert.match(sync, /const tile = tiles\.get\(box\.index\)/);
  assert.match(
    sync,
    /if \(tiles\.has\(index\)\)[\s\S]*?tile\.remove\(\)/,
    "同一索引的旧窗口节点必须清掉，否则标准档以下会混入旧布局",
  );
  assert.doesNotMatch(sync, /grid\.querySelector\(/);
  assert.match(sync, /if \(tile\.style\.left !== left\)/);
  assert.match(
    sync,
    /const contentTop = Number\.isFinite\(layout\.gridTop\)/,
    "缩放动画的 transform 不能污染虚拟窗口使用的真实网格顶部",
  );
  assert.match(layout, /cached\.layout\.gridTop =/);
});

test("虚拟网格新补格子继续接入标准档细节层", () => {
  const app = read("web/app.js");
  const sync = sliceBetween(
    app,
    "function syncVirtualPhotoGrid(",
    "function syncVirtualPhotoGridWindowNow(",
  );
  const detail = sliceBetween(
    app,
    "function loadGalleryDetailedImage(",
    "function setGalleryImageQuality(",
  );

  assert.match(
    app,
    /function observeGalleryDetailTile\(tile\)[\s\S]*?galleryFullObserver\.observe\(tile\)/,
  );
  assert.match(
    sync,
    /if \(galleryImageWindowObserver\) observeGalleryImageTile\(tile\);[\s\S]*?observeGalleryDetailTile\(tile\);/,
    "滚动后新建的可见格子必须重新接入 400px 细节观察器",
  );
  assert.match(sync, /galleryFullObserver\?\.unobserve\(tile\)/);
  assert.match(detail, /overlay\.fetchPriority = "high"/);
});

test("最小档用图集先铺底，后续仍复用同一张网格图", () => {
  const app = read("web/app.js");
  const styles = read("web/styles.css");
  const load = sliceBetween(
    app,
    "function loadGalleryWindowImage(",
    "function unloadGalleryWindowImage(",
  );
  assert.doesNotMatch(app, /galleryUsesAtlasOnly/);
  assert.doesNotMatch(load, /galleryUsesAtlasOnly/);
  assert.match(load, /img\.fetchPriority = "high"/);
  assert.match(
    app,
    /const thumbSrc =\s*deferThumbDuringScroll \? "" : `src="\$\{thumb\}"`/,
  );
  assert.match(
    styles,
    /\.photo-grid \.tile\.has-thumb-atlas \.crop > \.gallery-thumb-atlas\s*\{\s*opacity:\s*1;/,
  );
  assert.doesNotMatch(
    styles,
    /\.photo-grid\.gallery-zoom-1\s+\.tile\s+\.crop\s*>\s*img:not\(\.gallery-full-overlay\):not\(\.gallery-thumb-l0\)\s*\{\s*opacity:\s*0;/,
  );
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

test("缩小后滚动用二分查找可见盒，不再逐帧扫描整库", () => {
  const app = read("web/app.js");
  const source = sliceBetween(
    app,
    "function virtualPhotoGridGeometryMetrics(",
    "function syncVirtualPhotoGrid(",
  );
  const context = vm.createContext({});
  vm.runInContext(
    source +
      `
      ;globalThis.geometry = {
        metrics: virtualPhotoGridGeometryMetrics,
        visible: virtualPhotoGridVisibleBoxes,
      };
    `,
    context,
  );
  const boxes = [
    { index: 0, y: 0, height: 100 },
    { index: 1, y: 100, height: 150 },
    { index: 2, y: 200, height: 50 },
    { index: 3, y: 1000, height: 100 },
  ];
  const metrics = context.geometry.metrics(boxes);
  assert.deepEqual(
    [
      ...context.geometry.visible(
        { boxes, geometryMetrics: metrics },
        120,
        250,
        0,
      ),
    ].map((box) => box.index),
    [1, 2],
  );
  const sync = sliceBetween(
    app,
    "function syncVirtualPhotoGrid(",
    "function syncVirtualPhotoGridWindowNow(",
  );
  assert.match(sync, /virtualPhotoGridVisibleBoxes\(/);
  assert.doesNotMatch(sync, /layout\.boxes\.filter\(/);
});

test("小档滚动期间延后新图请求，并且不再为每格叠 blur 滤镜", () => {
  const app = read("web/app.js");
  const styles = read("web/styles.css");
  const load = sliceBetween(
    app,
    "function loadGalleryWindowImage(",
    "function unloadGalleryWindowImage(",
  );
  const ready = sliceBetween(
    app,
    "function thumbPrefetchReady()",
    "function buildThumbPrefetchPlan(",
  );
  assert.match(
    load,
    /state\.photoZoom < GALLERY_STANDARD_ZOOM[\s\S]*?gallery-is-scrolling[\s\S]*?return;/,
  );
  const scroll = sliceBetween(
    app,
    "function handleGalleryContentScroll()",
    '$("#content").addEventListener("scroll"',
  );
  assert.match(
    scroll,
    /classList\.remove\("gallery-is-scrolling"\);[\s\S]*?scheduleVisibleGalleryImageSweep\(\);/,
  );
  assert.match(ready, /gallery-is-scrolling/);
  assert.match(
    styles,
    /\.photo-grid\.gallery-zoom-1 \.crop > img\.gallery-thumb-l0[\s\S]*?filter:\s*none;/,
  );
  assert.match(
    styles,
    /\.photo-grid \.tile\.is-media-ready \.crop > img\.gallery-thumb-l0[\s\S]*?opacity:\s*0;/,
  );
});
