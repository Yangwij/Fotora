"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const root = path.join(__dirname, "..");
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");

test("减少动态时查看器不再创建照片或视频飞行层", () => {
  const app = read("web/app.js");
  const open = app.slice(
    app.indexOf("function openViewer("),
    app.indexOf("function hidePhotoWallCrop("),
  );

  assert.match(
    open,
    /const reducedMotion = window\.matchMedia\(\s*"\(prefers-reduced-motion: reduce\)",?\s*\)\.matches/,
  );
  assert.match(
    open,
    /const flightRect =\s*!reducedMotion && startRect && startRect\.width > 0 \? startRect : null/,
  );
  assert.match(open, /liveDuringMorph: !!flightRect/);
  assert.match(open, /if \(flightRect && item\.kind === "video"\)/);
});

test("减少动态关闭使用短暂淡出，不创建缩回克隆", () => {
  const app = read("web/app.js");
  const close = app.slice(
    app.indexOf("function closeViewer("),
    app.indexOf("function setViewerInfo("),
  );

  assert.match(app, /const VIEWER_REDUCED_CLOSE_MS = 80;/);
  assert.match(
    close,
    /const reducedMotion = window\.matchMedia\(\s*"\(prefers-reduced-motion: reduce\)",?\s*\)\.matches/,
  );
  assert.match(
    close,
    /if \(reducedMotion\) \{[\s\S]*?clearViewerMorph\(\);[\s\S]*?releaseViewerVideo\(video\);[\s\S]*?VIEWER_REDUCED_CLOSE_MS/,
  );
  assert.doesNotMatch(
    close.slice(
      close.indexOf("if (reducedMotion)"),
      close.indexOf("/* 视频已经落位"),
    ),
    /createMorphClone|createViewerStateCloseClone/,
  );
});

test("查看器减少动态样式压过正常飞行，并保留短暂透明度反馈", () => {
  const css = read("web/styles.css");

  assert.match(
    css,
    /@media \(prefers-reduced-motion: reduce\) \{[\s\S]*?\.viewer\.is-opening \.viewer-photo\s*\{\s*animation: none !important;/,
  );
  assert.match(
    css,
    /\.viewer\.is-closing\s*\{\s*opacity: 0;\s*transition: opacity 80ms var\(--ease-out\);/,
  );
  assert.match(
    css,
    /\.viewer-state-close \.viewer-photo\s*\{\s*transition-duration: 0\.01ms !important;/,
  );
});

test("视频缩回亮度与角标使用响应式 out 曲线并在落位时收尾", () => {
  const css = read("web/styles.css");

  assert.match(
    css,
    /\.viewer-zoom-clone\.is-video-back img\s*\{\s*animation: flight-back-brightness 160ms var\(--ease-out\) 220ms both;/,
  );
  assert.match(
    css,
    /\.viewer-zoom-clone\.is-video-back \.flight-scrim,[\s\S]*?animation: flight-chrome-in 140ms var\(--ease-out\) 230ms both;/,
  );
  assert.doesNotMatch(
    css,
    /\.viewer-zoom-clone\.is-video-back img\s*\{[^}]*ease-in/,
  );
});
