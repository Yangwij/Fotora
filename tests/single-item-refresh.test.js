"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const root = path.join(__dirname, "..");
const read = (f) => fs.readFileSync(path.join(root, f), "utf8");

test("单张元数据修改原地刷新，不整片重新拉取", () => {
  const app = read("web/app.js");
  const helper = app.slice(
    app.indexOf("function refreshItemsInPlace("),
    app.indexOf("function applyRatingState("),
  );
  /* 助手只重建受影响格子，不重新拉取集合 */
  assert.doesNotMatch(helper, /reloadActiveCollection/);
  assert.match(helper, /tile\.replaceWith\(fresh\)/);
  assert.match(helper, /observeGalleryImageTiles\(\[grid\]\)/);
  assert.match(helper, /refreshOpenItemInfo\(id\)/);
  assert.match(helper, /replaceTiles = true/);
  /* 设备：原地刷新 */
  assert.match(app, /设备不影响排序\/成员：只原地刷新受影响格子/);
  /* 时间：需要换槽位时复用照片节点做 FLIP，其余只原地刷新 */
  assert.match(app, /function dateMetadataChangesCurrentOrder\(/);
  assert.match(
    app,
    /refreshItemsInPlace\(res\.ids \|\| ids, \{ replaceTiles: false \}\)/,
  );
  /* 位置：仅地点视图整片重载，其余原地 */
  assert.match(app, /位置只改变"地点"视图的成员/);
});

test("时间、设备和位置保存后退出选择模式只刷新一次", () => {
  const app = read("web/app.js");
  const date = app.slice(
    app.indexOf("async function saveSelectedItemDate("),
    app.indexOf("async function saveSelectedCameraDevice("),
  );
  const camera = app.slice(
    app.indexOf("async function saveSelectedCameraDevice("),
    app.indexOf("async function restoreSelectedMetadata("),
  );
  const location = app.slice(
    app.indexOf("async function saveMetadataMapLocation("),
    app.indexOf('$("#metadataLocationDialog").addEventListener'),
  );

  for (const source of [date, camera, location]) {
    assert.match(source, /const wasSelecting = state\.select;/);
    assert.match(
      source,
      /if \(wasSelecting\) \{[\s\S]*?state\.cursor = -1;[\s\S]*?await exitSelection\(\{ reuseGrid: true \}\);/,
    );
    assert.doesNotMatch(source, /if \(state\.select\) exitSelection\(\);/);
  }
  assert.match(app, /function rebaseRenderedContentViewAfterMetadataUpdate\(/);
  assert.match(
    date,
    /rebaseRenderedContentViewAfterMetadataUpdate\(\);[\s\S]*?await exitSelection\(\{\s*reuseGrid: true,?\s*\}\);/,
  );
  assert.match(
    camera,
    /rebaseRenderedContentViewAfterMetadataUpdate\(\);[\s\S]*?await exitSelection\(\{\s*reuseGrid: true,?\s*\}\);/,
  );
  assert.match(
    location,
    /rebaseRenderedContentViewAfterMetadataUpdate\(\);[\s\S]*?await exitSelection\(\{\s*reuseGrid: true,?\s*\}\);/,
  );
  assert.match(
    camera,
    /refreshItemsInPlace\(res\.ids \|\| ids, \{ replaceTiles: false \}\)/,
  );
  assert.match(
    location,
    /refreshItemsInPlace\(ids, \{ replaceTiles: false \}\)/,
  );
  assert.match(date, /const menuClosed = closeMenu\(\);\s*await menuClosed;/);
  assert.match(camera, /const menuClosed = closeMenu\(\);/);
  assert.match(camera, /await menuClosed;/);
});

test("时间修改需要换槽位时复用照片节点并连续移动", () => {
  const app = read("web/app.js");
  const capture = app.slice(
    app.indexOf("function capturePhotoLayout()"),
    app.indexOf("function preservePhotoTileNodesAfterRender("),
  );
  const preserve = app.slice(
    app.indexOf("function preservePhotoTileNodesAfterRender("),
    app.indexOf("function animatePhotoReflow("),
  );
  const reflow = app.slice(
    app.indexOf("function animatePhotoReflow("),
    app.indexOf("function renderPhotoOrderingChange("),
  );
  const orderingRender = app.slice(
    app.indexOf("function renderPhotoOrderingChange("),
    app.indexOf("/* 新建相簿后"),
  );
  const date = app.slice(
    app.indexOf("async function saveSelectedItemDate("),
    app.indexOf("async function saveSelectedCameraDevice("),
  );
  const restore = app.slice(
    app.indexOf("async function restoreSelectedMetadata("),
    app.indexOf("/* 查看器里一次只修改正在看的这一项"),
  );

  assert.match(capture, /tile,[\s\S]*?left: r\.left,[\s\S]*?width: r\.width/);
  assert.match(preserve, /fresh\.replaceWith\(tile\)/);
  assert.match(preserve, /is-media-ready/);
  assert.match(reflow, /scale\(\$\{sx\}, \$\{sy\}\)/);
  assert.match(
    orderingRender,
    /preservePhotoTileNodesAfterRender\(before\);[\s\S]*?animatePhotoReflow\(before\);/,
  );
  assert.match(
    date,
    /const beforeLayout = capturePhotoLayout\(\);[\s\S]*?await reloadActiveCollection\(\);[\s\S]*?renderPhotoOrderingChange\(beforeLayout, \{ scrollTop \}\)/,
  );
  assert.match(
    restore,
    /const beforeLayout = capturePhotoLayout\(\);[\s\S]*?renderPhotoOrderingChange\(beforeLayout, \{ scrollTop \}\)/,
  );
});

test("时间、位置和设备提交后信息卡立即原位更新", () => {
  const app = read("web/app.js");
  const date = app.slice(
    app.indexOf("async function saveSelectedItemDate("),
    app.indexOf("async function saveSelectedCameraDevice("),
  );
  const camera = app.slice(
    app.indexOf("async function saveSelectedCameraDevice("),
    app.indexOf("async function restoreSelectedMetadata("),
  );
  const location = app.slice(
    app.indexOf("async function saveMetadataMapLocation("),
    app.indexOf('$("#metadataLocationDialog").addEventListener'),
  );
  const refresh = app.slice(
    app.indexOf("function syncContextItemInfo("),
    app.indexOf("function closeViewerInfo("),
  );
  const renderMap = app.slice(
    app.indexOf("function renderViewerInfoMap("),
    app.indexOf("function itemForInfoRefresh("),
  );

  assert.match(app, /function patchItemsById\(ids, patch\)/);
  assert.match(date, /patchItemsById\(\[\.\.\.changed\], \(item\) => \{/);
  assert.match(
    camera,
    /item\.camera = item\.originalCamera \|\| "";[\s\S]*?item\.lens = item\.originalLens \|\| "";/,
  );
  assert.match(
    location,
    /item\.gps_lat = lat;[\s\S]*?item\.location_name = locationName;/,
  );
  assert.match(refresh, /syncContextItemInfo\(item\);/);
  assert.doesNotMatch(refresh, /menu\.innerHTML = contextItemInfoHTML/);
  assert.match(
    renderMap,
    /previousKey === key && image\.getAttribute\("src"\)[\s\S]*?const next = new Image\(\)/,
  );
});

test("还原时间、设备和位置后自动退出选择模式", () => {
  const app = read("web/app.js");
  const restore = app.slice(
    app.indexOf("async function restoreSelectedMetadata("),
    app.indexOf("/* 查看器里一次只修改正在看的这一项"),
  );
  const camera = app.slice(
    app.indexOf("async function saveSelectedCameraDevice("),
    app.indexOf("async function restoreSelectedMetadata("),
  );

  assert.match(restore, /const wasSelecting = state\.select;/);
  assert.match(
    restore,
    /if \(wasSelecting\) \{[\s\S]*?state\.select = false;[\s\S]*?clearSelection\(\);[\s\S]*?renderPhotoOrderingChange\(beforeLayout, \{ scrollTop \}\)/,
  );
  assert.doesNotMatch(restore, /state\.select = state\.selected\.size > 0/);
  assert.match(
    camera,
    /if \(wasSelecting\) \{[\s\S]*?await exitSelection\(\{\s*reuseGrid: true \}\);/,
  );
});
