"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const root = path.join(__dirname, "..");
const app = fs.readFileSync(path.join(root, "web", "app.js"), "utf8");

test("选择菜单只渲染当前可还原的位置、时间和评级", () => {
  assert.match(
    app,
    /items = items\.filter\(\(\[label\]\) => \{[\s\S]*?if \(label === "还原位置"\) return canRestoreLocation;[\s\S]*?if \(label === "还原时间"\) return canRestoreDate;[\s\S]*?if \(label === "还原评级"\) return canRestoreRating;[\s\S]*?return true;/,
  );
  assert.doesNotMatch(app, /label === "还原位置" && !canRestoreLocation/);
  assert.doesNotMatch(app, /所选项目没有在软件内修改过的位置/);
});
