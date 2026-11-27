"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const root = path.join(__dirname, "..");
const read = (f) => fs.readFileSync(path.join(root, f), "utf8");

test("GPU 进程退出不整窗重载，交给 iframe 原地自愈", () => {
  const main = read("electron/main.js");
  const gpu = main.slice(
    main.indexOf('app.on("child-process-gone"'),
    main.indexOf('app.on("second-instance"'),
  );
  assert.doesNotMatch(gpu, /scheduleRendererRecovery/);
  assert.match(gpu, /GPU 进程退出/);
});

test("开发版刷新界面时也保留当前现场并跳过启动页", () => {
  const main = read("electron/main.js");
  const watcher = main.slice(
    main.indexOf("const scheduleReload ="),
    main.indexOf("devWatcher = fs.watch"),
  );
  assert.match(watcher, /fotora_recover/);
  assert.match(watcher, /fotora_recover_attempt/);
  assert.match(watcher, /fotora_recover_reason/);
  assert.match(watcher, /dev-reload/);
  assert.doesNotMatch(watcher, /reloadIgnoringCache/);
});

test("主渲染进程崩溃重载带恢复标记，前端回到崩溃前视图", () => {
  const main = read("electron/main.js");
  const recovery = main.slice(
    main.indexOf("function scheduleRendererRecovery("),
    main.indexOf("let closeWindowBehavior"),
  );
  assert.match(recovery, /searchParams\.set\("fotora_recover", "1"\)/);
  assert.match(recovery, /fotora_recover_attempt/);
  assert.match(recovery, /fotora_recover_reason/);
  assert.match(recovery, /loadURL\(url\.toString\(\)\)/);

  const app = read("web/app.js");
  assert.match(app, /const LAST_VIEW_KEY = "fotora-last-view";/);
  assert.match(app, /function snapshotCurrentView\(\)/);
  assert.match(
    app,
    /if \(photoWallDomFrozen\) \{\s*pendingRenderAfterPhotoWall = true;\s*return false;\s*\}\s*snapshotCurrentView\(\);/,
  );
  const restore = app.slice(
    app.indexOf("async function restoreActiveView()"),
    app.indexOf("async function restoreActiveView()") + 2200,
  );
  assert.match(restore, /get\("fotora_recover"\) === "1"/);
  assert.match(app, /function readLastViewSnapshot\(\)/);
  assert.match(restore, /const snap = readLastViewSnapshot\(\);/);
  assert.match(restore, /state\.activeId = snap\.activeId;/);
});

test("恢复模式不播放图库启动遮罩，并保留照片墙与幻灯片现场", () => {
  const html = read("web/index.html");
  const css = read("web/styles.css");
  const app = read("web/app.js");
  const slideshow = read("web/slideshow.js");

  assert.match(html, /classList\.add\("app-recovering"\)/);
  assert.match(css, /html\.app-recovering \.startup-screen/);
  assert.match(css, /display:\s*none/);
  assert.match(app, /photoWallPlayback,/);
  assert.match(app, /slideshow:\s*slideshowState\?\.active/);
  assert.match(app, /async function restorePhotoWallFromRecovery/);
  assert.match(app, /function restoreSlideshowFromRecovery/);
  assert.match(app, /await restoreRecoveredPresentation\(\)/);
  assert.match(app, /fotora:slideshow-state-change/);
  assert.match(slideshow, /fotora:slideshow-state-change/);
  assert.match(slideshow, /currentPhotoId/);
});

test("第一次恢复失败时不再自动重开高资源视图", () => {
  const app = read("web/app.js");
  const restore = app.slice(
    app.indexOf("async function restoreActiveView()"),
    app.indexOf("const saved = normalizeDefaultOpenView(defaultOpenView)"),
  );
  assert.match(restore, /recoveryAttempt > 1/);
  assert.match(restore, /recoveryReason === "oom"/);
  assert.match(restore, /recoveryPlaybackSuppressed/);
});

test("地图瓦片缓存设上限，降低渲染进程内存压力", () => {
  const globe = read("web/map/embedded-globe.js");
  const map = read("web/map/map.js");
  assert.match(globe, /maxTileCacheSize: 128/);
  assert.match(map, /maxTileCacheSize: 128/);
});
