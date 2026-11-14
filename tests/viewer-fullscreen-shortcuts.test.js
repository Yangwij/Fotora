"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const root = path.resolve(__dirname, "..");
const app = fs.readFileSync(path.join(root, "web", "app.js"), "utf8");
const html = fs.readFileSync(path.join(root, "web", "index.html"), "utf8");

test("查看器中 Q 在普通窗口和全屏之间切换", () => {
  const toggle = app.slice(
    app.indexOf("async function toggleViewerFullscreen()"),
    app.indexOf("function handleViewerKey"),
  );
  assert.match(toggle, /window\.albumWindow\?\.toggleFullscreen/);
  assert.match(toggle, /album:fullscreen-will-change/);
  assert.match(toggle, /album:fullscreen-changed/);
  assert.match(toggle, /resetViewerZoom\(\);[\s\S]*?fullscreen-will-change/);
  assert.match(
    app,
    /\(key === "q" \|\| key === "Q"\)[\s\S]*?void toggleViewerFullscreen\(\);/,
  );
});

test("查看器全屏按原始比例完整适配而不是裁剪铺满", () => {
  const imageFit = app.slice(
    app.indexOf("function fitViewerImageToStage"),
    app.indexOf("function viewerVideoCrop"),
  );
  const videoFit = app.slice(
    app.indexOf("function fitViewerVideoToStage"),
    app.indexOf("function viewerVideoVisibleRect"),
  );
  assert.match(imageFit, /viewerContainBox\(/);
  assert.match(
    imageFit,
    /document\.documentElement\.classList\.contains\("is-fullscreen"\)/,
  );
  assert.match(
    videoFit,
    /video\.style\.objectFit = hasClientCrop \? "fill" : "contain"/,
  );
});

test("查看器全屏后仍保留缩放和左右切换", () => {
  const viewerKeys = app.slice(
    app.indexOf("function handleViewerKey"),
    app.indexOf("function tileUnderPointer"),
  );
  assert.match(viewerKeys, /key === "ArrowLeft"[\s\S]*?stepViewer\(-1\)/);
  assert.match(viewerKeys, /key === "ArrowRight"[\s\S]*?stepViewer\(1\)/);
  assert.match(viewerKeys, /key === "\+"[\s\S]*?setViewerZoom\(viewerZoom \* 1\.5\)/);
  assert.match(
    viewerKeys,
    /key === "-"[\s\S]*?setViewerZoom\(viewerZoom \/ 1\.5\)/,
  );
  assert.match(viewerKeys, /key === "0"[\s\S]*?resetViewerZoom\(\)/);
});

test("Esc 优先退出查看器，不被视频控件焦点截获", () => {
  const viewerKeys = app.slice(
    app.indexOf("function handleViewerKey"),
    app.indexOf("function tileUnderPointer"),
  );
  const escapeIndex = viewerKeys.indexOf('if (key === "Escape")');
  const videoControlsIndex = viewerKeys.indexOf('target.closest("#videoControls")');
  assert.ok(escapeIndex >= 0);
  assert.ok(videoControlsIndex > escapeIndex);
  assert.match(
    viewerKeys,
    /if \(key === "Escape"\)[\s\S]*?closeViewerWithBackgroundAnimation\(\);/,
  );
});

test("快捷键表列出查看器全屏和退出键", () => {
  assert.match(
    html,
    /<span>全屏 \/ 退出全屏<\/span[\s\S]*?<kbd>Q<\/kbd>/,
  );
  assert.match(
    html,
    /<span>退出查看器<\/span[\s\S]*?<kbd>Esc<\/kbd>/,
  );
});
