"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const root = path.resolve(__dirname, "..");
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");
const app = read("web/app.js");
const albumMap = read("web/map/album-map.js");
const globe = read("web/map/embedded-globe.js");

test("切换照片和保存位置都不会清除当前位置大头针", () => {
  const select = app.slice(
    app.indexOf("function selectLocationAssignPhoto("),
    app.indexOf("function patchItemLocation("),
  );
  assert.doesNotMatch(select, /locationAssignTarget\s*=\s*null/);
  assert.doesNotMatch(select, /album-map:clear-target/);

  const save = app.slice(
    app.indexOf("async function applyLocationAssign("),
    app.indexOf("function syncLocationAssignApplyButton("),
  );
  const afterSave = save.slice(
    save.indexOf("locationAssignSavedIds.add"),
    save.indexOf("try {\n      lastRev"),
  );
  assert.doesNotMatch(afterSave, /locationAssignTarget\s*=\s*null/);
  assert.doesNotMatch(afterSave, /album-map:clear-target/);
  assert.match(
    afterSave,
    /syncAlbumMapItems\(\{ fit: false \}\);[\s\S]*syncAlbumMapSelection\(albumMapSelectedId\);[\s\S]*snapshotCurrentView\(\);/,
  );
});

test("相簿地图重载后从父页面恢复当前目标点", () => {
  assert.match(
    app,
    /function syncAlbumMapTarget\(\)[\s\S]*album-map:set-target-point/,
  );
  assert.match(
    app,
    /message\.type === "album-map:ready"[\s\S]*syncAlbumMapSelection\(albumMapSelectedId\);[\s\S]*syncAlbumMapTarget\(\);/,
  );
  assert.match(
    albumMap,
    /message\.type === "album-map:set-target-point"[\s\S]*targetPoint = \{ lat, lon \};[\s\S]*globe\.showTargetPoint\(lat, lon\);/,
  );
});

test("多选和地图视图会提前释放信息卡地图预热上下文", () => {
  assert.match(
    app,
    /function enterSelection[\s\S]*setContextMapPrewarmSuspended\(true\);/,
  );
  assert.match(
    app,
    /const albumMapVisible = isAlbumMap;[\s\S]*const locationsMapVisible =[\s\S]*setContextMapPrewarmSuspended\([\s\S]*albumMapVisible \|\| locationsMapVisible \|\| state\.select/,
  );
  assert.match(
    app,
    /async function exitSelection[\s\S]*resumeContextMapPrewarmIfPossible\(\);/,
  );
});

test("Ctrl 隐藏照片在 iframe 内即时执行，并有父页面焦点兜底", () => {
  const hiddenCss = read("web/map/globe-map.css").slice(
    read("web/map/globe-map.css").indexOf(".photos-hidden"),
  );
  assert.match(
    hiddenCss,
    /\.photos-hidden \.pm-photo-icon,[\s\S]*\.photos-hidden \.pm-ping\s*\{[\s\S]*opacity:\s*0;[\s\S]*visibility:\s*hidden;[\s\S]*pointer-events:\s*none;/,
  );
  assert.match(
    globe,
    /event\.key === "Control" && !event\.repeat[\s\S]*this\.setPhotosHidden\(true\)/,
  );
  assert.match(
    globe,
    /event\.key === "Control"[\s\S]*this\.setPhotosHidden\(false\)/,
  );
  assert.match(
    globe,
    /setPhotosHidden\(hidden\)[\s\S]*const next = Boolean\(hidden\);[\s\S]*if \(this\.photosHidden === next\) return;[\s\S]*classList\.toggle\("photos-hidden", this\.photosHidden\);[\s\S]*if \(!this\.photosHidden\) this\.scheduleHiddenPhotoRestore\(\);/,
  );
  assert.match(
    globe,
    /map\.on\("click", \(event\) => \{[\s\S]*if \(!this\.photosHidden\) \{[\s\S]*this\.photoGroupAtPoint\(event\.point\)/,
  );
  assert.match(
    app,
    /window\.addEventListener\("keydown"[\s\S]*event\.key !== "Control"[\s\S]*album-map:set-photos-hidden", hidden: true/,
  );
  assert.match(
    app,
    /window\.addEventListener\("keyup"[\s\S]*event\.key !== "Control"[\s\S]*album-map:set-photos-hidden", hidden: false/,
  );
});

test("Ctrl 隐藏期间滚轮缩放跳过照片标记与 Canvas 每帧绘制", () => {
  const hiddenCss = read("web/map/globe-map.css").slice(
    read("web/map/globe-map.css").indexOf(".photos-hidden"),
  );
  const wheel = globe.slice(
    globe.indexOf("bindAdaptiveWheelZoom()"),
    globe.indexOf(
      "adaptivePitch(zoom)",
      globe.indexOf("bindAdaptiveWheelZoom()"),
    ),
  );
  assert.match(
    wheel,
    /addEventListener\(\s*"wheel",[\s\S]*event\.stopImmediatePropagation\(\);/,
  );
  assert.match(
    wheel,
    /event\.stopImmediatePropagation\(\);[\s\S]*!event\.ctrlKey[\s\S]*this\.setPhotosHidden\(false\);[\s\S]*if \(this\.photosHidden\) return;/,
  );
  assert.match(wheel, /\{ passive: false, capture: true \}/);
  assert.match(
    globe,
    /canvas\.addEventListener\(\s*"dblclick",[\s\S]*event\.stopImmediatePropagation\(\);[\s\S]*if \(this\.photosHidden\) return;[\s\S]*this\.setAdaptiveZoom/,
  );
  assert.match(
    globe,
    /setMarkerScale\(scale, animate\) \{[\s\S]*this\.curMarkerScale = scale;[\s\S]*if \(this\.photosHidden\) \{[\s\S]*this\.markerScaleDirty = true;[\s\S]*return;/,
  );
  assert.match(
    globe,
    /schedulePhotoCanvasRender\(\) \{[\s\S]*this\.photosHidden[\s\S]*return;/,
  );
  assert.match(
    globe,
    /drawPhotoCanvas\(\) \{[\s\S]*this\.photosHidden[\s\S]*return;/,
  );
  assert.match(
    hiddenCss,
    /\.photos-hidden \.map-photo-canvas\s*\{[\s\S]*opacity:\s*0;[\s\S]*pointer-events:\s*none;/,
  );
});

test("松开 Ctrl 后立即恢复照片，并把缩放补算推迟到下一帧", () => {
  assert.match(
    globe,
    /scheduleHiddenPhotoRestore\(\) \{[\s\S]*this\.hiddenPhotoRestoreFrame = requestAnimationFrame\(\(\) => \{[\s\S]*if \(!this\.map \|\| this\.photosHidden \|\| !this\.markerScaleDirty\) return;[\s\S]*this\.setMarkerScale\(this\.markerScale\(this\.map\.getZoom\(\)\), false\);/,
  );
  assert.match(
    globe,
    /setPhotosHidden\(hidden\)[\s\S]*this\.post\("photos-visibility-change", \{ hidden: this\.photosHidden \}\);/,
  );
  assert.match(
    albumMap,
    /type === "photos-visibility-change"[\s\S]*post\("album-map:control-state", \{[\s\S]*held: payload\.hidden === true/,
  );
  assert.match(
    globe,
    /map\.on\("click", \(event\) => \{[\s\S]*!event\.ctrlKey && !event\.metaKey && this\.photosHidden[\s\S]*this\.setPhotosHidden\(false\);/,
  );
  assert.match(
    globe,
    /canvas\.addEventListener\(\s*"dblclick",[\s\S]*!event\.ctrlKey && !event\.metaKey && this\.photosHidden[\s\S]*this\.setPhotosHidden\(false\);/,
  );
});

test("打勾确认按钮跟随位置分配照片栏显隐", () => {
  assert.match(
    app,
    /function syncLocationAssignApplyButton\(\) \{[\s\S]*const filmstrip = mapFilmstripElements\("album"\)\.nav;[\s\S]*!filmstrip\.hidden[\s\S]*aria-hidden[\s\S]*!filmstrip\.classList\.contains\("is-filmstrip-exiting"\)[\s\S]*button\.hidden =[\s\S]*!filmstripVisible;/,
  );
  assert.match(
    app,
    /function renderMapFilmstrip\([\s\S]*nav\.hidden = true;[\s\S]*syncLocationAssignApplyButton\(\);/,
  );
  assert.match(
    app,
    /function setMapFilmstripRevealed\([\s\S]*if \(revealed\) syncLocationAssignApplyButton\(\);/,
  );
  assert.match(
    app,
    /playMapFilmstripExit\(nav, \(\) => \{[\s\S]*syncLocationAssignApplyButton\(\);[\s\S]*\}\);[\s\S]*syncLocationAssignApplyButton\(\);/,
  );
  assert.match(
    app,
    /function hideMapFilmstrip\([\s\S]*nav\.removeAttribute\("aria-hidden"\);[\s\S]*syncLocationAssignApplyButton\(\);/,
  );
});

test("崩溃恢复快照保留位置分配队列、当前项和目标点", () => {
  const snapshot = app.slice(
    app.indexOf("function snapshotCurrentView()"),
    app.indexOf("function readLastViewSnapshot()"),
  );
  assert.match(snapshot, /albumMapAssignMode:/);
  assert.match(snapshot, /albumMapItemIds:/);
  assert.match(snapshot, /albumMapSelectedId:/);
  assert.match(snapshot, /locationAssignTarget:/);
  assert.match(snapshot, /locationAssignSavedIds:/);
  assert.match(
    app,
    /function restoreAlbumMapFromSnapshot\(snapshot\)[\s\S]*openAlbumMap\(media, \{[\s\S]*assignMode: true,[\s\S]*recovered: snapshot/,
  );
  assert.match(
    app,
    /const snap = readLastViewSnapshot\(\);[\s\S]*restoreAlbumMapFromSnapshot\(snap\)/,
  );
});
