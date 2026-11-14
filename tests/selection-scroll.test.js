"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const root = path.resolve(__dirname, "..");
const app = fs.readFileSync(path.join(root, "web", "app.js"), "utf8");

test("进入选择模式后保留照片区当前滚动位置", () => {
  const enterSelection = app.slice(
    app.indexOf("function enterSelection"),
    app.indexOf("function captureSelectionExitFrames"),
  );

  assert.match(
    enterSelection,
    /const viewport = captureSelectionViewport\(\);[\s\S]*state\.select = true;[\s\S]*render\(\);[\s\S]*restoreSelectionViewport\(viewport\);/,
  );
  assert.match(
    app,
    /function captureSelectionViewport\(\)[\s\S]*scrollTop: Math\.max\(0, content\.scrollTop\)[\s\S]*anchor: capturePhotoViewportAnchor\(\)/,
  );
  assert.match(
    app,
    /function restoreSelectionViewport\(viewport\)[\s\S]*content\.scrollTop = viewport\.scrollTop[\s\S]*syncVirtualPhotoGridWindowNow\(\)/,
  );
});

test("Ctrl+A 全选后聚焦当前视口而不是跳回第一张", () => {
  const enterSelection = app.slice(
    app.indexOf("function enterSelection"),
    app.indexOf("function captureSelectionExitFrames"),
  );

  assert.match(
    enterSelection,
    /const focusIndex =[\s\S]*selectAll && viewport\?\.anchor[\s\S]*viewport\.anchor\.index/,
  );
  assert.match(
    enterSelection,
    /focusTile\(state\.cursor, \{\s*scroll: !\(selectAll && viewport\?\.anchor\),\s*\}\)/,
  );
});

test("点击全选或取消全选时保留照片区当前滚动位置", () => {
  const toggleSelectAll = app.slice(
    app.indexOf("function toggleSelectAll"),
    app.indexOf('$("#selectAllBtn").addEventListener', app.indexOf("function toggleSelectAll")),
  );

  assert.match(
    toggleSelectAll,
    /const viewport = captureSelectionViewport\(\);[\s\S]*render\(\);[\s\S]*restoreSelectionViewport\(viewport\);[\s\S]*syncNumberingTileOrder/,
  );
});
