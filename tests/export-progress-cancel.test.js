"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const root = path.resolve(__dirname, "..");
const read = (relativePath) =>
  fs.readFileSync(path.join(root, relativePath), "utf8");

test("导出在底栏显示已处理数量与总数，并提供取消入口", () => {
  const app = read("web/app.js");
  const preload = read("electron/preload.js");

  assert.match(preload, /cancelExport: \(exportId\)/);
  assert.match(preload, /onExportProgress/);
  assert.match(app, /phase === "exporting"/);
  assert.match(app, /正在导出 \$\{task\.completed\}\/\$\{task\.total\}/);
  assert.match(app, /正在取消导出 \$\{task\.completed\}\/\$\{task\.total\}/);
  assert.match(app, /class="status-task-cancel status-import-cancel"/);
  assert.match(
    app,
    /else if \(state\.exportTask\) void cancelActiveExport\(\)/,
  );
});

test("主进程逐项上报导出进度，并在逐项检查取消请求", () => {
  const main = read("electron/main.js");

  assert.match(main, /sender\.send\("files:export-progress"/);
  assert.match(main, /completed: exportJob\.completed/);
  assert.match(main, /total: exportJob\.total/);
  assert.match(
    main,
    /for \(const item of exportItems\)[\s\S]*?if \(exportJob\.cancelRequested\) break;/,
  );
  assert.match(main, /advanceExportProgress\(exportJob\)/);
  assert.match(main, /files:cancel-export/);
  assert.match(main, /canceled: true/);
});

test("导出未结束时退出会询问是否停止，继续导出则保留窗口", () => {
  const main = read("electron/main.js");

  assert.match(main, /导出未完成，是否停止导出？/);
  assert.match(main, /停止导出并退出/);
  assert.match(main, /继续导出/);
  assert.match(main, /mainWindow\.on\("close"[\s\S]*?confirmStopExportForQuit/);
  assert.match(main, /app\.on\("before-quit"[\s\S]*?confirmStopExportForQuit/);
});
