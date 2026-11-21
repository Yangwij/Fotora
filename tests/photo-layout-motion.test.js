"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const root = path.join(__dirname, "..");
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");

test("照片布局切换使用可取消的 translate / scale FLIP", () => {
  const app = read("web/app.js");
  const flip = app.slice(
    app.indexOf("function animatePhotoTileFlip("),
    app.indexOf("function setPhotoGridLayoutInstant("),
  );
  const layout = app.slice(
    app.indexOf("function animatePhotoGridLayout("),
    app.indexOf("function applyPhotoGridLayouts("),
  );

  assert.match(flip, /translate: `\$\{translateX\.toFixed\(3\)\}px/);
  assert.match(flip, /scale: `\$\{scaleX\.toFixed\(5\)\}/);
  assert.match(flip, /stopPhotoGridFlip\(previous\)/);
  assert.ok(
    flip.indexOf("if (previous) stopPhotoGridFlip(previous);") <
      flip.indexOf("Math.abs(translateX) < 0.5"),
    "新的布局必须以最新目标为准，即使这一次该格子的位移接近零",
  );
  assert.match(
    app,
    /photoGridFlipByTile\.get\(motion\.tile\) === motion[\s\S]*?photoGridFlipByTile\.delete[\s\S]*?classList\.remove\("is-photo-grid-flipping"\)/,
  );
  assert.doesNotMatch(
    layout,
    /\b(?:left|top|width|height):\s*`\$\{(?:old|left|top|width|height)/,
  );
});

test("布局重排保留 240ms，滚轮缩放使用更短的 180ms 过渡", () => {
  const app = read("web/app.js");
  const styles = read("web/styles.css");
  const layout = app.slice(
    app.indexOf("function applyPhotoGridLayouts("),
    app.indexOf("function schedulePhotoGridLayout("),
  );

  assert.match(app, /const PHOTO_GRID_FLIP_MS = 240;/);
  assert.match(app, /const GALLERY_ZOOM_MS = 180;/);
  assert.match(app, /stopAllPhotoGridFlips\(\)/);
  assert.match(
    layout,
    /virtualGrids\.push\(grid\);[\s\S]*?if \(snapshots\) animatedGrids\.push/,
  );
  assert.match(styles, /--photo-layout-motion-duration:\s*240ms;/);
  assert.match(
    styles,
    /\.photo-grid \.tile\.is-photo-grid-flipping\s*\{[\s\S]*?will-change:\s*translate, scale;/,
  );
});

test("键盘升级布局立即生效，菜单和设置仍保留空间连续性", () => {
  const app = read("web/app.js");
  const defaultSetter = app.slice(
    app.indexOf("function setDefaultPhotoStyle("),
    app.indexOf("let colorModeSwitchFrame"),
  );
  const currentSetter = app.slice(
    app.indexOf("function setCurrentPhotoStyle("),
    app.indexOf("function currentPhotoStyle("),
  );

  assert.doesNotMatch(
    defaultSetter,
    /beginContentCrossfade|startContentCrossfadeFade/,
  );
  assert.doesNotMatch(
    currentSetter,
    /beginContentCrossfade|startContentCrossfadeFade/,
  );
  assert.match(app, /cyclePhotoStyle\(\{ animate: false \}\)/);
  assert.match(
    currentSetter,
    /setPhotoGridLayoutInstant\(!animate\)[\s\S]*?applyPhotoGridLayouts\(\{ animate, before \}\)/,
  );
});

test("照片布局动效尊重减少动态并提供即时切换样式", () => {
  const styles = read("web/styles.css");
  const app = read("web/app.js");

  assert.match(
    styles,
    /\.photo-grid\.photo-grid-layout-instant \.tile,[\s\S]*?transition:\s*none !important;/,
  );
  assert.match(
    styles,
    /@media \(prefers-reduced-motion: reduce\) \{[\s\S]*?\.photo-grid \.tile img,[\s\S]*?transition-duration:\s*0\.01ms;/,
  );
  assert.match(
    app,
    /const reducedMotion = window\.matchMedia\([\s\S]*?if \(!reducedMotion\) \{[\s\S]*?animateGalleryLayoutPulse\(grids, focus\)/,
  );
  assert.match(
    app,
    /preserveGalleryZoomFocus\(focus, before, fromLevel, level\)/,
  );
  assert.doesNotMatch(app, /centerGalleryZoomAnchor/);
});

test("相簿栏重排保持视口照片并避免底部缩略图闪空", () => {
  const app = read("web/app.js");
  const styles = read("web/styles.css");
  const measure = app.slice(
    app.indexOf("function measureRailTarget("),
    app.indexOf("/* 动画期间把网格钉在当前槽位"),
  );
  const finish = app.slice(
    app.indexOf("function finishRailMotion("),
    app.indexOf("/* 整个相簿栏向左收到只剩切换图标"),
  );
  const unload = app.slice(
    app.indexOf("function unloadGalleryWindowImage("),
    app.indexOf("function resetGalleryImageWindow("),
  );
  const sidebarMotion = app.slice(
    app.indexOf("function setSidebarRailCollapsed("),
    app.indexOf("function toggleSidebarRail("),
  );
  const layout = app.slice(
    app.indexOf("function applyPhotoGridLayouts("),
    app.indexOf("function schedulePhotoGridLayout("),
  );

  assert.match(
    measure,
    /const originalScrollTop = content\.scrollTop;[\s\S]*?const viewportAnchor = capturePhotoViewportAnchor\(\);/,
  );
  assert.match(
    measure,
    /restorePhotoViewportAnchor\(viewportAnchor\);[\s\S]*?target\.scrollTop = content\.scrollTop;[\s\S]*?content\.scrollTop = originalScrollTop;/,
  );
  assert.match(finish, /content\.scrollTop = motion\.targetScrollTop;/);
  assert.match(
    measure,
    /applyPhotoGridLayouts\(\{ preserveViewport: false, syncWindow: false \}\);[\s\S]*?captureRailItems\(\{ useLayout: true \}\);[\s\S]*?content\.scrollTop = originalScrollTop;\s*syncVirtualPhotoGridWindowNow\(\{ extraRowsBelow: RAIL_VIRTUAL_EXTRA_ROWS \}\);/,
  );
  assert.match(
    layout,
    /if \(syncWindow\) \{\s*for \(const grid of virtualGrids\)/,
  );
  assert.match(
    sidebarMotion,
    /classList\.add\("sidebar-rail-motion-active"\);\s*let start;[\s\S]*?measureRailTarget\(sidebarRailCollapsed\)/,
  );
  assert.match(
    sidebarMotion,
    /for \(const item of start\.items\.values\(\)\) \{\s*loadGalleryWindowImage\(item\.el\);[\s\S]*?for \(const item of target\.items\.values\(\)\) \{\s*loadGalleryWindowImage\(item\.el\);/,
  );
  assert.match(
    sidebarMotion,
    /prepareRailTargetItems\(start, target\);\s*const base = captureRailItems\(\);/,
  );
  assert.match(
    app,
    /for \(const key of target\.entering \|\| \[\]\)[\s\S]*?opacity: 0,[\s\S]*?opacity: 1,/,
  );
  assert.match(
    unload,
    /classList\.contains\("sidebar-rail-motion-active"\)[\s\S]*?return;/,
  );
  assert.match(
    styles,
    /html\.sidebar-rail-motion-active \.photo-grid \.tile\s*\{[\s\S]*?content-visibility:\s*visible;/,
  );
});

test("相簿栏补出的右下方照片从原网格槽位参与 FLIP", () => {
  const app = read("web/app.js");
  const prepare = app.slice(
    app.indexOf("function prepareRailTargetItems("),
    app.indexOf("/* 动画期间把网格钉在当前槽位"),
  );
  const sidebarMotion = app.slice(
    app.indexOf("function setSidebarRailCollapsed("),
    app.indexOf("function toggleSidebarRail("),
  );

  assert.match(prepare, /const startLayout = start\.layouts\?\.get\(grid\)/);
  assert.match(
    prepare,
    /const startBox = startLayout\?\.boxByIndex\.get\(box\.index\)[\s\S]*?start\.items\.set\(key,/,
  );
  assert.match(
    prepare,
    /for \(const \[key, from\] of start\.items\)[\s\S]*?target\.items\.set\(key, \{[\s\S]*?top: gridRect\.top \+ targetBox\.y - scrollDelta/,
  );
  assert.match(
    sidebarMotion,
    /prepareRailTargetItems\(start, target\);\s*const base = captureRailItems\(\);/,
  );
});

test("相簿栏换列时虚拟网格向下多渲染两行照片", () => {
  const app = read("web/app.js");
  const sync = app.slice(
    app.indexOf("function syncVirtualPhotoGrid("),
    app.indexOf("function syncVirtualPhotoGridWindowNow("),
  );
  const measure = app.slice(
    app.indexOf("function measureRailTarget("),
    app.indexOf("function prepareRailTargetItems("),
  );

  assert.match(sync, /extraRowsBelow = 0/);
  assert.match(sync, /rowPitch \* extraRowsBelow/);
  assert.match(
    measure,
    /function measureRailTarget[\s\S]*?syncVirtualPhotoGridWindowNow\(\{ extraRowsBelow: RAIL_VIRTUAL_EXTRA_ROWS \}\)[\s\S]*?captureRailItems\(\{ useLayout: true \}\)/,
  );
  assert.match(app, /const RAIL_VIRTUAL_EXTRA_ROWS = 2/);
});
