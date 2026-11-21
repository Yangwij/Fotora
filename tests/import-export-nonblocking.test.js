"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const root = path.resolve(__dirname, "..");
const app = fs.readFileSync(path.join(root, "web", "app.js"), "utf8");

test("导入走后台轮询，期间事件循环空闲、不阻塞主界面", () => {
  const wait = app.slice(
    app.indexOf("async function waitForRootImport("),
    app.indexOf("let rootImportInProgress"),
  );
  /* 异步轮询而非同步阻塞 */
  assert.match(wait, /await api\(`\/api\/scan/);
  assert.match(wait, /window\.setTimeout\(resolve, ROOT_IMPORT_POLL_MS\)/);
  assert.match(wait, /scan\.running/);
  const pick = app.slice(
    app.indexOf("async function pickFolder()"),
    app.indexOf("async function switchRoot("),
  );
  assert.match(pick, /background: true/);
  assert.match(pick, /rootImportInProgress/);
  /* 并发导入只挡导入本身，给 toast，不锁死 UI */
  assert.match(pick, /正在导入图库，请等待当前任务完成/);
});

test("导出异步 IPC + 底栏进度，重入有守卫", () => {
  const exp = app.slice(
    app.indexOf("async function exportSelectedItems("),
    app.indexOf("const selectedTrashAlbumIds"),
  );
  assert.match(exp, /exportInFlight/);
  assert.match(exp, /await window\.albumWindow\.exportItems/);
  assert.doesNotMatch(exp, /toast\("正在导出，请稍候…", 0\)/);
  assert.match(exp, /finally \{\s*exportInFlight = false;/);
  assert.match(app, /onExportProgress/);
  assert.match(app, /state\.exportTask/);
  assert.match(app, /正在导出 \$\{task\.completed\}\/\$\{task\.total\}/);
});

test("导入状态用曲线加载器 + 稳定文案，无跳变数字", () => {
  const status = app.slice(
    app.indexOf("function renderStatus()"),
    app.indexOf("let quietUntil"),
  );
  assert.match(status, /curveLoaderMarkup\("circle"/);
  assert.match(status, /setStatusLabelText\(label, busyText\)/);
});
