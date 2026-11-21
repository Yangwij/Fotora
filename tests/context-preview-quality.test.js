"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const root = path.resolve(__dirname, "..");
const app = fs.readFileSync(path.join(root, "web", "app.js"), "utf8");
const html = fs.readFileSync(path.join(root, "web", "index.html"), "utf8");
const css = fs.readFileSync(path.join(root, "web", "styles.css"), "utf8");

test("空格快速预览鼠标所在项目，并可再次按空格关闭", () => {
  const keys = app.slice(
    app.indexOf("function tileUnderPointer()"),
    app.indexOf("/* ------------------------------ 启动"),
  );

  assert.match(
    keys,
    /if \(contextMenuOpen\) \{[\s\S]*?dataset\.contextMode === "preview"[\s\S]*?closeItemContextMenu\(false\);/,
  );
  assert.match(
    keys,
    /if \(key === " " && !state\.select && !e\.repeat\) \{\s*const hoveredTile = tileUnderPointer\(\);\s*if \(hoveredTile && canOpenItemContext\(hoveredTile\)\)/,
  );
  assert.match(
    keys,
    /openItemContextMenu\(Number\(hoveredTile\.dataset\.index\), hoveredTile, \{\s*mode: "preview",\s*keyboard: false,/,
  );
});

test("三种预览入口保留放大缩小，但不用按压后的缩略图尺寸", () => {
  const open = app.slice(
    app.indexOf("function openItemContextMenu("),
    app.indexOf("function runContextAction("),
  );
  const close = app.slice(
    app.indexOf("function closeItemContextMenu("),
    app.indexOf("function openItemContextMenu("),
  );

  assert.match(
    open,
    /const motionDuration =\s*keyboard \|\| reducedMotion \? 0 : CONTEXT_PREVIEW_MOTION_MS;/,
  );
  assert.match(
    open,
    /tileMorphRect\(tile, \{ unpressed: true \}\) \|\| tileRect/,
  );
  assert.match(
    close,
    /if \(reducedMotion\) \{[\s\S]*?resetContextMenuDom\(\);/,
  );
});

test("三种预览共用的返回动画真正落位后再交还原缩略图", () => {
  const close = app.slice(
    app.indexOf("function closeItemContextMenu("),
    app.indexOf("function openItemContextMenu("),
  );

  assert.match(
    close,
    /const finalizeAfterPaint = \(\) => requestAnimationFrame\(finalizeClose\);/,
  );
  assert.match(close, /contextSourceAnim\.onfinish = finalizeAfterPaint;/);
  assert.match(
    close,
    /contextCloseTimer = setTimeout\(\s*finalizeAfterPaint,\s*closeMotionDuration \+ 250,?\s*\);/,
  );
});

test("右键信息卡、操作菜单和空格预览统一显示大图", () => {
  const contextOpen = app.slice(
    app.indexOf("function openItemContextMenu("),
    app.indexOf("function runContextAction("),
  );

  assert.match(
    contextOpen,
    /sourceImg\.src = contextCropMode\s*\?\s*itemThumbUrl\(item, 1600, "inside"\)\s*:\s*viewItemUrl\(item\);/,
  );
  assert.match(
    contextOpen,
    /const thumbnailSrc =\s*img\?\.currentSrc \|\| img\?\.src \|\| itemThumbUrl\(item, 1600, "inside"\);/,
  );
  assert.match(
    contextOpen,
    /const revealHighQuality = async \(\) => \{[\s\S]*?await sourceImg\.decode\?\.\(\)\.catch\(\(\) => \{\}\);[\s\S]*?sourceImg\.style\.opacity = "1";[\s\S]*?requestAnimationFrame\(\(\) => requestAnimationFrame\(resolve\)\)[\s\S]*?previewFallback\.remove\(\);/,
  );
  assert.match(
    css,
    /\.context-source \.context-source-fallback \{[\s\S]*?opacity: 1;\s*\}\s*\.context-source \.context-source-image \{/,
  );
  assert.doesNotMatch(
    css,
    /\.context-source \.context-source-(?:fallback|image) \{[^}]*transition:/,
  );
});

test("查看器信息卡直接显示与右键卡一致的地图预览", () => {
  const update = app.slice(
    app.indexOf("function updateViewerInfoPopover("),
    app.indexOf("function renderViewerInfoMap("),
  );
  const render = app.slice(
    app.indexOf("function renderViewerInfoMap("),
    app.indexOf("function itemForInfoRefresh("),
  );

  assert.match(update, /renderViewerInfoMap\(item\);/);
  assert.match(
    render,
    /holder\.classList\.toggle\("has-map", Boolean\(location\)\)/,
  );
  assert.match(render, /context-info-map-image/);
  assert.match(
    render,
    /enqueueContextMapPreview\(item, \{ priority: true \}\)/,
  );
  assert.match(app, /if \(viewerInfoOpen\) updateViewerInfoPopover\(item\);/);
  assert.match(css, /\.viewer-info-map\.has-map\s*\{[\s\S]*?height:\s*160px;/);
});

test("无 GPS 项目修改时间后不会被误判为位于 (0, 0)", () => {
  const location = app.slice(
    app.indexOf("function contextMapLocation("),
    app.indexOf("function contextMapPreviewKey("),
  );
  const getLocation = new Function(
    `${location}\nreturn contextMapLocation;`,
  )();

  assert.match(
    location,
    /rawLat == null\s*\|\|\s*rawLon == null\s*\|\|\s*String\(rawLat\)\.trim\(\) === ""\s*\|\|\s*String\(rawLon\)\.trim\(\) === ""/,
  );
  assert.ok(
    location.indexOf("rawLat == null") < location.indexOf("const lat = Number(rawLat)"),
  );
  assert.equal(getLocation({ gps_lat: null, gps_lon: null }), null);
  assert.equal(getLocation({ gps_lat: "", gps_lon: "121.4737" }), null);
  assert.deepEqual(getLocation({ gps_lat: "31.2304", gps_lon: 121.4737 }), {
    lat: 31.2304,
    lon: 121.4737,
  });
});

test("右键修改时间在信息卡关闭后按当前时间排序归位", () => {
  const save = app.slice(
    app.indexOf("async function saveContextItemDate("),
    app.indexOf("function openContextDate("),
  );
  const resort = app.slice(
    app.indexOf("function resortActiveCollectionForNewCaptureTime("),
    app.indexOf("/* 把菜单里选的拍摄时间写入"),
  );
  const flush = app.slice(
    app.indexOf("function applyPendingContextDateOrderRefresh("),
    app.indexOf("function resetContextMenuDom("),
  );
  const reset = app.slice(
    app.indexOf("function resetContextMenuDom("),
    app.indexOf("function pinTileHover("),
  );
  const inPlace = app.slice(
    app.indexOf("function refreshItemsInPlace("),
    app.indexOf("function applyRatingState("),
  );

  assert.doesNotMatch(save, /reloadActiveCollection|render\(\{/);
  assert.match(save, /const scrollTop = \$\("#content"\)\.scrollTop;/);
  assert.match(save, /\$\("#content"\)\.scrollTop = scrollTop;/);
  assert.match(save, /entry\.taken_at = ms;/);
  assert.match(
    save,
    /pendingContextDateOrderRefresh =\s*changed\.size && dateMetadataChangesCurrentOrder\(\)/,
  );
  assert.match(
    save,
    /refreshItemsInPlace\(\[\.\.\.changed\], \{ replaceTiles: false \}\);/,
  );
  assert.match(
    reset,
    /queueMicrotask\(\(\) => \{\s*if \(!contextMenuOpen\) applyPendingContextDateOrderRefresh\(\);/,
  );
  assert.match(flush, /const layoutAnimations = content\.getAnimations\(\);/);
  assert.match(
    flush,
    /await Promise\.allSettled\([\s\S]*?animation\.finished[\s\S]*?const beforeLayout = capturePhotoLayout\(\);[\s\S]*?const scrollTop = content\.scrollTop;/,
  );
  assert.match(
    flush,
    /activeRootCacheKey\(\) !== pending\.rootKey[\s\S]*?!dateMetadataChangesCurrentOrder\(\)[\s\S]*?!resortActiveCollectionForNewCaptureTime\(\)/,
  );
  assert.match(
    flush,
    /renderPhotoOrderingChange\(beforeLayout, \{\s*scrollTop,?\s*\}\)/,
  );
  assert.match(resort, /state\.albumItems = sortLibraryAlbumItems\(\);/);
  assert.match(
    resort,
    /state\.albumItems = sortAlbumItems\(state\.albumItemsRaw, state\.itemSort\);/,
  );
  assert.match(inPlace, /for \(const id of set\) refreshOpenItemInfo\(id\);/);
});

test("Ctrl 右键只显示当前项目可还原的位置、设备和时间", () => {
  const rows = app.slice(
    app.indexOf("function contextMenuRows(item)"),
    app.indexOf("let contextDetailOpen"),
  );
  const action = app.slice(
    app.indexOf("async function runContextAction(action)"),
    app.indexOf("async function ensureProgressiveTileRendered("),
  );

  assert.match(
    rows,
    /\["还原位置", "restoreLocation", "restore-location"\]/,
  );
  assert.match(rows, /\["还原设备", "restoreCamera", "restore-camera"\]/);
  assert.match(rows, /\["还原时间", "restoreDate", "restore-date"\]/);
  assert.match(rows, /hasRestorableLocation\(item\)/);
  assert.match(rows, /hasRestorableCamera\(item\)/);
  assert.match(rows, /hasRestorableDate\(item\)/);
  assert.match(
    rows,
    /\["还原时间", "restoreDate", "restore-date"\],\s*\["还原位置", "restoreLocation", "restore-location"\],\s*\["还原设备", "restoreCamera", "restore-camera"\]/,
  );
  assert.match(rows, /restoreRows\.length[\s\S]*?rowHTML\(restoreRows\)/);
  assert.match(
    action,
    /restore-location[\s\S]*?restoreSelectedMetadata\("location", \[item\]\)/,
  );
  assert.match(
    action,
    /restore-camera[\s\S]*?saveSelectedCameraDevice\(null, \[item\]\)/,
  );
  assert.match(
    action,
    /restore-date[\s\S]*?restoreSelectedMetadata\("date", \[item\]\)/,
  );
});

test("设为封面只更新相簿封面缩略图，不重建照片网格", () => {
  const sync = app.slice(
    app.indexOf("function syncAlbumCoverThumbnail("),
    app.indexOf("async function setItemAsAlbumCover("),
  );
  const cover = app.slice(
    app.indexOf("async function setItemAsAlbumCover("),
    app.indexOf("function beginImmediateContextRemoval("),
  );

  assert.match(
    sync,
    /#sidebarList \.nav-item\[data-id="\$\{album\.id\}"\] \.thumb img/,
  );
  assert.match(sync, /image\.src = nextUrl;/);
  assert.match(cover, /syncAlbumCoverThumbnail\(albumId\);/);
  assert.match(cover, /rebaseRenderedContentViewAfterMetadataUpdate\(\);/);
  assert.doesNotMatch(cover, /\brender\(\);/);
});

test("Ctrl 右键操作菜单与信息卡使用相同的跟随定位", () => {
  const contextOpen = app.slice(
    app.indexOf("function openItemContextMenu("),
    app.indexOf("function runContextAction("),
  );

  assert.match(
    contextOpen,
    /else if \(!contextCropMode && !contextPreviewOnly\) \{[\s\S]*?let actionTargetPlacement = placeActionMenu\(target\);[\s\S]*?actionTargetPlacement\.side[\s\S]*?actionTargetPlacement\.top < target\.top[\s\S]*?target\.top = actionTargetPlacement\.top;[\s\S]*?const actionStartScale = contextDetailCompanionScale\(start, target\);[\s\S]*?const actionStartPlacement = contextDetailCardStartPlacement\([\s\S]*?contextMenuTargetPlacement = \{[\s\S]*?contextMenuStartPlacement = \{/,
  );
  assert.match(
    contextOpen,
    /if \(mode === "details"\) \{[\s\S]*?contextDetailCardStartPlacement\(/,
  );
  assert.match(
    contextOpen,
    /contextDetailPlacementSide\(\s*target,\s*targetInfoPlacement,\s*infoPreferredSide,?\s*\)/,
  );
  assert.match(
    contextOpen,
    /contextDetailPlacementSide\(\s*target,\s*actionTargetPlacement,\s*actionPreferredSide,?\s*\)/,
  );
  assert.match(
    contextOpen,
    /const actionStartPlacement = contextDetailCardStartPlacement\(\s*start,\s*target,\s*\{\s*\.\.\.actionTargetPlacement,\s*width: menuWidth,\s*height: menuHeight,\s*\},/,
  );
});

test("信息卡和 Ctrl 右键菜单收回时使用相同的单段几何动画", () => {
  const closeSnippet = app.slice(
    app.indexOf("function closeItemContextMenu("),
    app.indexOf("function openItemContextMenu("),
  );

  assert.match(
    closeSnippet,
    /const closeFrames = \[\s*\{\s*opacity:[\s\S]*?transform: fromMenuTransform,[\s\S]*?offset: 0,[\s\S]*?\},\s*\{ opacity: 0, transform: toMenuTransform, offset: 1 \},\s*\];/,
  );
  assert.doesNotMatch(closeSnippet, /offset:\s*0\.55/);
  assert.match(
    closeSnippet,
    /contextSourceAnim\.play\(\);\s*contextMenuAnim\?\.play\(\);/,
  );
});

test("Ctrl 右键删除和移出相簿都立即交接给补位", () => {
  const reset = app.slice(
    app.indexOf("function resetContextMenuDom("),
    app.indexOf("function pinTileHover("),
  );
  const close = app.slice(
    app.indexOf("function closeItemContextMenu("),
    app.indexOf("function openItemContextMenu("),
  );
  const action = app.slice(
    app.indexOf("async function runContextAction("),
    app.indexOf("async function ensureProgressiveTileRendered("),
  );
  const immediateDelete = app.slice(
    app.indexOf("function beginImmediateContextRemoval("),
    app.indexOf("async function runContextAction("),
  );

  assert.match(reset, /resolveContextCloseWaiters\(\);/);
  assert.match(close, /const closed = waitForContextClose\(\);/);
  assert.match(close, /return closed;/);
  assert.match(
    action,
    /if \(action === "delete"\) \{[\s\S]*?const beforeLayout = beginImmediateContextRemoval\(\);[\s\S]*?void trashSelected\(\[item\], \{ beforeLayout \}\);/,
  );
  assert.ok(
    action.indexOf('if (action === "delete")') <
      action.indexOf("await closeItemContextMenu(false)"),
  );
  assert.match(
    action,
    /if \(action === "remove"\) \{[\s\S]*?const beforeLayout = beginImmediateContextRemoval\(\);[\s\S]*?void removeSelectedFromAlbum\(\[item\], \{ albumId, beforeLayout \}\);/,
  );
  assert.ok(
    action.indexOf('if (action === "remove")') <
      action.indexOf("await closeItemContextMenu(false)"),
  );
  assert.match(
    immediateDelete,
    /content\.classList\.add\("is-context-item-removal-snap"\);\s*closeItemContextMenu\(true\);\s*const beforeLayout = capturePhotoLayout\(\);\s*content\.classList\.remove\("is-context-item-removal-snap"\);/,
  );
  assert.match(immediateDelete, /return beforeLayout;/);
  assert.match(
    action,
    /await closeItemContextMenu\(false\);\s*if \(action === "show-library"\)/,
  );
  assert.doesNotMatch(action, /removesCurrentItem/);
  assert.doesNotMatch(
    action,
    /closeItemContextMenu\(false\);[\s\S]*?await closeItemContextMenu/,
  );
});

test("Ctrl 右键菜单与信息卡使用一致的视觉圆角", () => {
  const menuRule = css.match(/\n\.context-menu\s*\{([\s\S]*?)\n\}/)?.[1] || "";
  const detailRule =
    css.match(/\n\.context-menu\.is-item-detail\s*\{([\s\S]*?)\n\}/)?.[1] || "";
  const continuousCorners = css.slice(
    css.indexOf("/* ---------- 连续曲率圆角 ----------"),
    css.indexOf("/* 相簿栏底部的“最近删除”卡片。 */"),
  );

  assert.match(menuRule, /--context-action-radius:\s*24px;/);
  assert.match(menuRule, /--context-info-radius:\s*24px;/);
  assert.match(menuRule, /border-radius:\s*var\(--context-action-radius\);/);
  assert.match(detailRule, /border-radius:\s*var\(--context-info-radius\);/);
  assert.match(app, /const CONTEXT_ACTION_RADIUS = 24;/);
  assert.match(app, /const CONTEXT_INFO_RADIUS = 24;/);
  assert.match(app, /borderRadius: `\$\{CONTEXT_ACTION_RADIUS\}px`/);
  assert.match(app, /borderRadius: `\$\{CONTEXT_INFO_RADIUS\}px`/);
  assert.match(continuousCorners, /\.context-menu,/);
  assert.match(continuousCorners, /corner-shape:\s*squircle;/);
});

test("快捷键表说明鼠标悬停空格快速预览", () => {
  assert.match(
    html,
    /<span>快速预览鼠标所在项目<\/span[\s\S]*?<kbd>空格<\/kbd>/,
  );
});

test("视频右键详情隔离视频合成层并去掉整块毛玻璃矩形", () => {
  assert.match(
    app,
    /scene\.classList\.toggle\(\s*"is-video-preview",\s*mode === "details" && item\.kind === "video"/,
  );
  assert.match(
    app,
    /function expandContextDetail\(item\)[\s\S]*?scene\.classList\.toggle\("is-video-preview", item\.kind === "video"\)/,
  );
  assert.match(app, /scene\.classList\.remove\("is-video-preview"\)/);
  assert.match(
    css,
    /\.context-scene\.is-video-preview\s*{[^}]*isolation:\s*isolate/s,
  );
  assert.match(
    css,
    /\.context-scene\.is-video-preview \.context-source video\s*{[^}]*transform:\s*translateZ\(0\)/s,
  );
  assert.match(
    css,
    /\.context-scene\.is-video-preview \.context-menu\.is-item-detail\s*{[^}]*background:\s*var\(--sheet-solid-bg\);[\s\S]*?backdrop-filter:\s*none/s,
  );
});
