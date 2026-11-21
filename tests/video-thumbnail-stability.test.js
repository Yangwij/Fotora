"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const root = path.resolve(__dirname, "..");
const app = fs.readFileSync(path.join(root, "web", "app.js"), "utf8");

test("进入选择模式不会改变视频缩略图资源地址", () => {
  assert.doesNotMatch(app, /selection=1/);
  assert.match(app, /const thumb = itemThumbUrl\(item, thumbSize, "inside"\);/);
  assert.match(
    app,
    /function galleryTileThumbSrc\(tile\)[\s\S]*return itemThumbUrl\(item, galleryThumbSizeForZoom\(\), "inside"\);/,
  );
});
