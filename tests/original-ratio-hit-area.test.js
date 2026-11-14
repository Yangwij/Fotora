"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const root = path.resolve(__dirname, "..");
const css = fs.readFileSync(path.join(root, "web", "styles.css"), "utf8");

test("原始比例布局只让实际照片区域接收指针", () => {
  assert.match(
    css,
    /\.photo-grid\.original:not\(\.gallery-square\) \.tile\s*\{[\s\S]*?pointer-events:\s*none;[\s\S]*?cursor:\s*default;/,
  );
  assert.match(
    css,
    /\.photo-grid\.original:not\(\.gallery-square\) \.tile \.shot,\s*\.photo-grid\.original:not\(\.gallery-square\) \.tile \.crop\s*\{[\s\S]*?pointer-events:\s*none;/,
  );
  assert.match(
    css,
    /\.photo-grid\.original:not\(\.gallery-square\) \.tile \.crop > img\s*\{[\s\S]*?pointer-events:\s*auto;[\s\S]*?cursor:\s*pointer;/,
  );
});

test("原始比例预览失败时仍保留整个格子的点击入口", () => {
  assert.match(
    css,
    /\.photo-grid\.original:not\(\.gallery-square\) \.tile\.failed,\s*\.photo-grid\.original:not\(\.gallery-square\) \.tile\.failed-video\s*\{[\s\S]*?pointer-events:\s*auto;[\s\S]*?cursor:\s*pointer;/,
  );
});
