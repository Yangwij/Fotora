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

test("主渲染进程崩溃重载带恢复标记，前端回到崩溃前视图", () => {
  const main = read("electron/main.js");
  const recovery = main.slice(
    main.indexOf("function scheduleRendererRecovery("),
    main.indexOf("let closeWindowBehavior"),
  );
  assert.match(recovery, /searchParams\.set\("fotora_recover", "1"\)/);
  assert.match(recovery, /loadURL\(url\.toString\(\)\)/);

  const app = read("web/app.js");
  assert.match(app, /const LAST_VIEW_KEY = "fotora-last-view";/);
  assert.match(app, /function snapshotCurrentView\(\)/);
  assert.match(
    app,
    /if \(photoWallDomFrozen\) return;\s*snapshotCurrentView\(\);/,
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

test("地图瓦片缓存设上限，降低渲染进程内存压力", () => {
  const globe = read("web/map/embedded-globe.js");
  const map = read("web/map/map.js");
  assert.match(globe, /maxTileCacheSize: 128/);
  assert.match(map, /maxTileCacheSize: 128/);
});
