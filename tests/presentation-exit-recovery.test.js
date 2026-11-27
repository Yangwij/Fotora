"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const root = path.resolve(__dirname, "..");
const app = fs.readFileSync(path.join(root, "web", "app.js"), "utf8");

function sourceBetween(start, end, from = 0) {
  const first = app.indexOf(start, from);
  const last = app.indexOf(end, first + start.length);
  assert.ok(first >= 0, `找不到起点：${start}`);
  assert.ok(last > first, `找不到终点：${end}`);
  return app.slice(first, last);
}

test("照片墙冻结期间不丢渲染请求，退出或超时后补一次普通视图渲染", () => {
  const render = sourceBetween(
    "function render({",
    "function syncSelectionBar()",
  );
  assert.match(
    render,
    /if \(photoWallDomFrozen\) \{\s*pendingRenderAfterPhotoWall = true;\s*return false;/,
  );

  for (const [start, end] of [
    [
      "function armPhotoWallEnterTimeout()",
      "async function resumePendingPhotoWallEntry()",
    ],
    [
      "function leavePhotoWallMode()",
      "async function launchPhotoWallPlayback(",
    ],
  ]) {
    const exit = sourceBetween(start, end);
    assert.match(
      exit,
      /const needsDeferredRender = pendingRenderAfterPhotoWall;/,
    );
    assert.match(exit, /pendingRenderAfterPhotoWall = false;/);
    assert.match(
      exit,
      /scheduleOrdinarySurfaceRecovery\(\{ force: needsDeferredRender \}\)/,
    );
  }
});

test("空内容树不会进入普通图库缓存，强制恢复时会重新生成界面", () => {
  const cache = sourceBetween(
    "function cacheCurrentContentView()",
    "function restoreCachedContentView(",
  );
  const emptyGuard = cache.indexOf("!content.childElementCount");
  const cacheSet = cache.indexOf("contentViewCache.set(");
  assert.ok(emptyGuard > 0, "缺少空内容缓存防线");
  assert.ok(cacheSet > emptyGuard, "空内容防线必须位于写入缓存之前");
  assert.match(
    app,
    /function render\(\{[\s\S]*?force = false,[\s\S]*?let reusedContentView = Boolean\(\s*!force &&/,
  );
});

test("覆盖式功能退出统一检查残留遮罩、隐藏状态和空内容", () => {
  const recovery = sourceBetween(
    "function presentationOverlayOwnsPrimarySurface()",
    "function syncSelectionBar()",
  );
  for (const state of [
    "state.photoWall",
    "state.albumMapOpen",
    'state.activeId === "locations" && state.locationSubview === "map"',
    "!viewer.hidden",
    "!slideshow.hidden",
  ]) {
    assert.ok(recovery.includes(state), `恢复检查遗漏：${state}`);
  }
  for (const residue of [
    "content.hidden",
    "!content.childElementCount",
    '"photo-wall-mode"',
    '"album-map-view-mode"',
    '"filmstrip-view-mode"',
    '"slideshow-open"',
    '"viewer-open"',
  ]) {
    assert.ok(recovery.includes(residue), `残留状态检查遗漏：${residue}`);
  }
  assert.match(recovery, /content\.hidden = false;/);
  assert.match(recovery, /render\(\{ force: true \}\)/);
  assert.match(recovery, /revealRightContent\(\{ animateEntrance: false \}\)/);
});

test("照片墙、地图、胶片、放映、查看器和侧栏切换都接入退出恢复", () => {
  const slideshowListener = sourceBetween(
    'window.addEventListener("fotora:slideshow-state-change"',
    "function readLastViewSnapshot()",
  );
  assert.match(
    slideshowListener,
    /scheduleOrdinarySurfaceRecovery\(\{ delay: 240 \}\)/,
  );

  const filmstrip = sourceBetween(
    "function setFilmstripMode(",
    "function setRatingMode(",
  );
  assert.match(
    filmstrip,
    /if \(!state\.filmstrip\) scheduleOrdinarySurfaceRecovery\(\)/,
  );

  const albumMap = sourceBetween(
    "function closeAlbumMap(",
    "let viewerMapContext",
  );
  assert.match(albumMap, /scheduleOrdinarySurfaceRecovery\(\)/);

  const viewer = sourceBetween(
    "function closeViewer({",
    "function setViewerInfo(",
  );
  assert.match(viewer, /scheduleOrdinarySurfaceRecovery\(\{ delay: 320 \}\)/);

  const albumNavigation = sourceBetween(
    "async function selectAlbumWithContentHandoff(",
    "async function select(id)",
  );
  const sidebarNavigation = sourceBetween(
    "async function select(id)",
    "let emptyFavoritesNavigation",
  );
  assert.match(albumNavigation, /scheduleOrdinarySurfaceRecovery\(\)/);
  assert.match(sidebarNavigation, /scheduleOrdinarySurfaceRecovery\(\)/);
});
