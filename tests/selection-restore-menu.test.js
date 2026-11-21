"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const root = path.join(__dirname, "..");
const app = fs.readFileSync(path.join(root, "web", "app.js"), "utf8");

test("选择菜单按时间、位置、设备顺序渲染可还原项目和评级", () => {
  assert.match(
    app,
    /items = items\.filter\(\(\[label\]\) => \{[\s\S]*?if \(label === "还原位置"\) return canRestoreLocation;[\s\S]*?if \(label === "还原设备"\) return canRestoreCamera;[\s\S]*?if \(label === "还原时间"\) return canRestoreDate;[\s\S]*?if \(label === "还原评级"\) return canRestoreRating;[\s\S]*?return true;/,
  );
  assert.match(
    app,
    /\["还原时间", "restoreDate"\],\s*\["还原位置", "restoreLocation"\],\s*\["还原设备", "restoreCamera"\]/,
  );
  assert.match(app, /const hasRestorableCamera = \(item\) =>/);
  assert.match(app, /void saveSelectedCameraDevice\(null, actionItems\);/);
  assert.doesNotMatch(app, /label === "还原位置" && !canRestoreLocation/);
  assert.doesNotMatch(app, /所选项目没有在软件内修改过的位置/);
});
