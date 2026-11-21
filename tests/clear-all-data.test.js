"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");

const root = path.resolve(__dirname, "..");
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");
const { assertSafeClearTarget, clearDataDirectory } = require(
  path.join(root, "electron", "clear-data.js"),
);

test("清除所有数据入口位于常规设置最底部", () => {
  const dialog = read("web/settings-dialog.js");
  const general = dialog.slice(
    dialog.indexOf('id: "general"'),
    dialog.indexOf('id: "library"'),
  );

  assert.match(general, /title: "启动与关闭"/);
  assert.match(
    general,
    /title: "数据管理",[\s\S]*?type: "clear-data",\s*label: "清除所有数据"/,
  );
  assert.ok(
    general.lastIndexOf('title: "数据管理"') >
      general.lastIndexOf('title: "启动与关闭"'),
  );
  assert.match(
    general,
    /将永久删除 Fotora 的应用数据文件夹（默认位于 [\s\S]*?不会删除图库源文件夹中的原始照片和视频/,
  );
  assert.doesNotMatch(
    dialog.slice(
      dialog.indexOf('if (row.type === "clear-data")'),
      dialog.indexOf('if (row.type === "text")'),
    ),
    /ux-settings-row-label/,
  );
});

test("清除入口经主进程确认后安排重启再删除数据", () => {
  const dialog = read("web/settings-dialog.js");
  const preload = read("electron/preload.js");
  const main = read("electron/main.js");

  assert.match(dialog, /window\.albumWindow\?\.clearAllData\?\.\(\)/);
  assert.match(
    preload,
    /clearAllData: \(\) => ipcRenderer\.invoke\("settings:clear-all-data"\)/,
  );
  assert.match(main, /ipcMain\.handle\("settings:clear-all-data"/);
  assert.match(main, /will restart automatically after clearing the data/);
  assert.match(
    main,
    /app\.relaunch\(\{ args: clearDataRelaunchArguments\(\) \}\)[\s\S]*?shutdown\(\)[\s\S]*?app\.quit\(\)/,
  );
  assert.match(
    main,
    /process\.argv\.includes\(CLEAR_DATA_FLAG\)[\s\S]*?clearDataDirectory\(baseDir,/,
  );
});

test("清除数据保护磁盘根目录以及用户、应用等父目录", () => {
  const target = path.join(root, "test-fotora-data");
  const protectedPaths = [
    root,
    process.env.LOCALAPPDATA || path.parse(root).root,
    process.env.USERPROFILE || root,
  ];

  assert.equal(assertSafeClearTarget(target, protectedPaths), target);
  assert.throws(
    () => assertSafeClearTarget(path.parse(root).root, protectedPaths),
    /清除目标无效/,
  );
  assert.throws(
    () => assertSafeClearTarget(root, protectedPaths),
    /包含受保护目录/,
  );
});

test("清除数据会删除所选目录及其全部内容", () => {
  const target = fs.mkdtempSync(
    path.join(os.tmpdir(), "fotora-clear-data-test-"),
  );
  fs.mkdirSync(path.join(target, "nested"));
  fs.writeFileSync(path.join(target, "nested", "cache.bin"), "cache");

  const result = clearDataDirectory(target, [
    path.parse(target).root,
    os.homedir(),
  ]);

  assert.equal(result.removed, true);
  assert.equal(fs.existsSync(target), false);
});
