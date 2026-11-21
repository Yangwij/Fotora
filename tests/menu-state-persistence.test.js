"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const root = path.join(__dirname, "..");
const app = fs.readFileSync(path.join(root, "web", "app.js"), "utf8");

test("布局和项目排序在切换视图后继续保留", () => {
  assert.match(app, /const PHOTO_LAYOUT_KEY = "photo-layout-mode";/);
  assert.match(app, /const ITEM_SORT_KEY = "photo-item-sort";/);
  assert.match(app, /itemSort:\s*readItemSort\(\)/);
  assert.match(app, /function applyAlbumSort[\s\S]*?persistItemSort\(kind\)/);
  assert.doesNotMatch(app, /loadLibrary\(\{\s*resetSort:/);
});

test("位置、媒体、设备、类型和扩展名筛选切换视图后清除", () => {
  assert.match(
    app,
    /function resetTransientAlbumFilters\(\) \{[\s\S]*?state\.filterKind = "all";[\s\S]*?state\.typeKind = "all";[\s\S]*?state\.deviceKind = "all";[\s\S]*?state\.locationFilter = "all";[\s\S]*?state\.extensionFilter = null;[\s\S]*?\n\}/,
  );
  assert.match(
    app,
    /if \(state\.activeId !== nextId\) \{[\s\S]*?resetTransientAlbumFilters\(\)/,
  );
  assert.match(
    app,
    /async function showItemInLibrary[\s\S]*?resetTransientAlbumFilters\(\)/,
  );
});
