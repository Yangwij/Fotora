"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const root = path.join(__dirname, "..");
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");

test("地图照片栏受显示照片栏总开关影响，就绪即推出且入场幂等", () => {
  const app = read("web/app.js");
  assert.match(
    app,
    /function mapFilmstripDisplayEnabled\(\) \{\s*return viewerFilmstripEnabled \|\| showLocationMapFilmstrip;\s*\}/,
  );
  /* 同步 / 邻近 / 退出 / 推出 都走总开关 */
  const sync = app.slice(
    app.indexOf("function syncMapFilmstripVisibility("),
    app.indexOf("function setLocationsMapFilmstripRevealed("),
  );
  assert.match(sync, /if \(mapFilmstripDisplayEnabled\(\)\) \{/);
  assert.doesNotMatch(sync, /if \(showLocationMapFilmstrip\) \{/);

  /* 推出必须等 fit 完成且照片到位：attempt 门控 */
  const attempt = app.slice(
    app.indexOf("function attemptMapFilmstripReveal("),
    app.indexOf("function scheduleMapFilmstripRevealFallback("),
  );
  assert.match(attempt, /locationsMapFitCompleted : albumMapFitCompleted/);
  assert.match(
    attempt,
    /if \(!fitDone \|\| !mapFilmstripDisplayEnabled\(\)\) return;/,
  );
  assert.match(attempt, /if \(!mapFilmstripPhotos\(kind\)\.length\) return;/);
  assert.match(attempt, /revealMapFilmstripAfterFlight\(kind\);/);
  /* fit-complete 置标记后走 attempt；照片同步后也走 attempt（补 fit 先到的竞态） */
  assert.match(
    app,
    /locations-map:fit-complete"\) \{\s*locationsMapFitCompleted = true;/,
  );
  assert.match(
    app,
    /album-map:fit-complete"\) \{\s*albumMapFitCompleted = true;/,
  );
  const syncLoc = app.slice(
    app.indexOf("function syncLocationsMapItems()"),
    app.indexOf("function syncLocationsMapSelection("),
  );
  assert.match(syncLoc, /attemptMapFilmstripReveal\("locations"\)/);
  /* 进入地图时重置 fit 标记 */
  assert.match(
    app,
    /locationsMapFilmstripDeferred = true;\s*locationsMapFitCompleted = false;/,
  );

  /* 入场幂等：同一次显示只推一次 */
  const afterFlight = app.slice(
    app.indexOf("function revealMapFilmstripAfterFlight("),
    app.indexOf("function scheduleMapFilmstripRevealFallback("),
  );
  assert.match(afterFlight, /nav\.dataset\.filmstripEntered !== "1"/);
  assert.match(afterFlight, /nav\.dataset\.filmstripEntered = "1";/);
  /* 完全隐藏时清除标记，下次重新推出 */
  assert.match(
    app,
    /nav\.hidden = true;\s*delete nav\.dataset\.filmstripEntered;/,
  );
});

test("初始飞行被打断时仍会释放照片栏，且重复就绪不会清掉兜底计时", () => {
  const app = read("web/app.js");
  const globe = read("web/map/embedded-globe.js");

  /* 用户拖动、滚轮或缩放会取消动画；取消时必须执行本次飞行的取消回调。 */
  const cancelFly = globe.slice(
    globe.indexOf("cancelFly() {"),
    globe.indexOf("cancelDragInertia() {"),
  );
  assert.match(cancelFly, /const onCancel = this\.flyCancel;/);
  assert.match(cancelFly, /this\.flyCancel = null;\s*onCancel\?\.\(\);/);

  /* 初始取景的正常完成和用户打断走同一个 fit-complete 通知。 */
  const flyToFit = globe.slice(
    globe.indexOf("flyToFit({ onComplete = null } = {})"),
    globe.indexOf("fitAll() {"),
  );
  assert.match(flyToFit, /onComplete: finish,/);
  assert.match(flyToFit, /onCancel: \(\) => \{[\s\S]*?onComplete\?\.\(\);/);

  /* 就绪消息可能重复到达；重复调用 reveal 不能取消尚未触发的 6.5 秒兜底。 */
  for (const name of ["Locations", "Album"]) {
    const reveal = app.slice(
      app.indexOf(`function reveal${name}Map()`),
      app.indexOf(
        name === "Locations"
          ? "function revealLocationsMapWhenReady()"
          : "function revealAlbumMapWhenReady()",
      ),
    );
    assert.doesNotMatch(
      reveal,
      new RegExp(
        `window\\.clearTimeout\\(${name.toLowerCase()}MapFilmstripRevealTimer\\)`,
      ),
    );
    assert.match(
      reveal,
      new RegExp(
        `scheduleMapFilmstripRevealFallback\\("${name.toLowerCase()}"\\)`,
      ),
    );
  }
});

test("开关开启时地图照片栏常驻，不被空闲定时器收起", () => {
  const app = read("web/app.js");
  const hide = app.slice(
    app.indexOf("function scheduleMapFilmstripHide("),
    app.indexOf("function hideMapFilmstrip("),
  );
  assert.match(
    hide,
    /if \(mapFilmstripHideTimerFor\(kind\) \|\| mapFilmstripDisplayEnabled\(\)\) return;/,
  );
  assert.match(
    hide,
    /mapFilmstripDisplayEnabled\(\) \|\|\s*mapFilmstripPointerIsNear\(kind\)/,
  );
  assert.doesNotMatch(hide, /\|\| showLocationMapFilmstrip\)/);
});

test("地图照片栏左右边缘渐隐柔化，仅可滚动时生效", () => {
  const css = read("web/styles.css");
  assert.match(
    css,
    /\.viewer-filmstrip \.viewer-filmstrip-track:not\(\.is-short\) \{[\s\S]*?mask-image: linear-gradient\([\s\S]*?transparent 0,[\s\S]*?#000 32px,[\s\S]*?calc\(100% - 32px\),[\s\S]*?transparent 100%/,
  );
  /* 不足一屏居中时不遮罩 */
  assert.match(
    css,
    /\.viewer-filmstrip-track\.is-short \{\s*justify-content: center;/,
  );
});

test("地图照片栏长度随任意窗口自适应，无固定像素上限", () => {
  const css = read("web/styles.css");
  const app = read("web/app.js");
  assert.match(
    css,
    /\.map-filmstrip \{[\s\S]*?--viewer-filmstrip-max-width: 92vw;/,
  );
  assert.doesNotMatch(css, /--viewer-filmstrip-max-width: min\(92vw, 1480px\)/);
  /* 查看器照片栏同样自适应 + resize 补渲染居中 */
  assert.match(css, /\.viewer \{[\s\S]*?--viewer-filmstrip-max-width: 92vw;/);
  assert.doesNotMatch(css, /--viewer-filmstrip-max-width: 720px;/);
  assert.match(
    app,
    /renderViewerFilmstripWindow\(viewerIndex\);\s*scrollViewerFilmstripSelection\(\{ immediate: true \}\)/,
  );
  assert.match(
    app,
    /window\.addEventListener\("resize", \(\) => \{[\s\S]*?scrollMapFilmstripSelection\(kind, \{ immediate: true \}\)/,
  );
});

test("从地图打开照片时照片栏向下退场，关闭查看器后再从下方推回", () => {
  const app = read("web/app.js");
  const css = read("web/styles.css");
  const open = app.slice(
    app.indexOf("function openMapPhotoViewer("),
    app.indexOf("function finishAlbumMapViewerContext("),
  );
  const finish = app.slice(
    app.indexOf("function finishAlbumMapViewerContext("),
    app.indexOf("function handleAlbumMapMessage("),
  );
  const dismiss = app.slice(
    app.indexOf("function dismissMapFilmstripForViewer("),
    app.indexOf("function restoreMapFilmstripAfterViewer("),
  );
  const restore = app.slice(
    app.indexOf("function restoreMapFilmstripAfterViewer("),
    app.indexOf("function mapFilmstripThumbHTML("),
  );

  assert.match(
    open,
    /dismissMapFilmstripForViewer\(kind\);[\s\S]*?viewerMapContext = kind;[\s\S]*?openViewer\(/,
  );
  assert.match(finish, /restoreMapFilmstripAfterViewer\(kind\);/);
  assert.match(dismiss, /playMapFilmstripExit\(nav\);/);
  assert.match(restore, /playMapFilmstripEntrance\(nav\);/);
  assert.match(
    css,
    /body:has\(> #viewer:not\(\[hidden\]\)\)[\s\S]*?\.map-filmstrip:not\(\.is-filmstrip-exiting\)\s*\{/,
  );
});
