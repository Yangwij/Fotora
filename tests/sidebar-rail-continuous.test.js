"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const root = path.resolve(__dirname, "..");
const app = fs.readFileSync(path.join(root, "web", "app.js"), "utf8");

function sourceBetween(start, end) {
  const from = app.indexOf(start);
  const to = app.indexOf(end, from);
  assert.ok(from >= 0, `找不到起点：${start}`);
  assert.ok(to > from, `找不到终点：${end}`);
  return app.slice(from, to);
}

test("相簿栏连续开合始终携带有效滚动位置", () => {
  const capture = sourceBetween(
    "function captureRailItems(",
    "/* 先量出栏体到位后的最终网格。",
  );
  const prepare = sourceBetween(
    "function prepareRailTargetItems(",
    "/* 动画期间把网格钉在当前槽位",
  );
  const finish = sourceBetween(
    "function finishRailMotion(",
    "/* 整个相簿栏向左收到只剩切换图标",
  );

  assert.match(capture, /scrollTop:\s*content\.scrollTop/);
  assert.match(
    prepare,
    /const scrollDelta = Number\.isFinite\(target\.scrollTop\)/,
  );
  assert.match(prepare, /virtualPhotoGridVisibleBoxes\(\s*layout,/);
  assert.match(
    finish,
    /if \(content && Number\.isFinite\(motion\.targetScrollTop\)\)/,
  );
});

test("相簿栏连点不会被永久锁定，照片墙风格卡也参与平滑补位", () => {
  const press = sourceBetween(
    "function handleSidebarRailPress(",
    "/* pointerdown 和 mousedown 都监听",
  );
  const toggle = sourceBetween(
    "function toggleSidebarRail(",
    "let sidebarRailPressHandled",
  );
  const prepare = sourceBetween(
    "function prepareRailTargetItems(",
    "/* 动画期间把网格钉在当前槽位",
  );
  const capture = sourceBetween(
    "function captureRailItems(",
    "/* 先量出栏体到位后的最终网格。",
  );

  assert.match(app, /#content \.photo-wall-style-choice/);
  assert.match(
    press,
    /sidebarRailPressHandled = true;[\s\S]*?window\.setTimeout\([\s\S]*?toggleSidebarRail\(\);/,
  );
  assert.doesNotMatch(toggle, /photoWallLibraryRailIsLocked/);
  assert.match(capture, /rect\.width <= 0 \|\| rect\.height <= 0/);
});
