"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const root = path.resolve(__dirname, "..");
const html = fs.readFileSync(path.join(root, "web", "index.html"), "utf8");
const app = fs.readFileSync(path.join(root, "web", "app.js"), "utf8");
const dialog = fs.readFileSync(
  path.join(root, "web", "settings-dialog.js"),
  "utf8",
);
const styles = fs.readFileSync(path.join(root, "web", "styles.css"), "utf8");
const main = fs.readFileSync(path.join(root, "electron", "main.js"), "utf8");

test("查看器左右侧提供圆形上一张和下一张按钮", () => {
  const viewer = html.slice(
    html.indexOf('<div class="viewer-stage" id="viewerStage">'),
    html.indexOf('<nav class="viewer-filmstrip"'),
  );

  assert.match(
    viewer,
    /id="viewerPrev"[\s\S]*data-viewer-step="-1"[\s\S]*aria-label="上一张照片或视频"/,
  );
  assert.match(
    viewer,
    /id="viewerNext"[\s\S]*data-viewer-step="1"[\s\S]*aria-label="下一张照片或视频"/,
  );

  const bind = app.slice(
    app.indexOf("function bindViewerStepButton"),
    app.indexOf(
      "for (const button of document.querySelectorAll",
      app.indexOf("function bindViewerStepButton"),
    ),
  );
  assert.match(
    bind,
    /addEventListener\("click"[\s\S]*event\.stopPropagation\(\)[\s\S]*stepViewer\(Number\(button\.dataset\.viewerStep\)\)/,
  );
});

test("胶片预览左右侧按钮复用既有切换逻辑并处理首尾状态", () => {
  const render = app.slice(
    app.indexOf("function renderFilmstripView"),
    app.indexOf(
      "function filmstripPlaybackToken",
      app.indexOf("function renderFilmstripView"),
    ),
  );
  const sync = app.slice(
    app.indexOf("function syncFilmstripStepButtons"),
    app.indexOf("function setFilmstripIndex"),
  );
  const contentClick = app.slice(
    app.indexOf('$("#content").addEventListener("click"'),
    app.indexOf(
      '$("#content").addEventListener("click"',
      app.indexOf('$("#content").addEventListener("click"') + 1,
    ),
  );

  assert.match(
    render,
    /data-filmstrip-step="-1"[\s\S]*data-filmstrip-step="1"/,
  );
  assert.match(
    sync,
    /previous\.disabled = atStart[\s\S]*next\.disabled = atEnd/,
  );
  assert.match(
    contentClick,
    /closest\("\[data-filmstrip-step\]"\)[\s\S]*stepFilmstrip\(Number\(filmstripStep\.dataset\.filmstripStep\)\)/,
  );
});

test("切换按钮是圆形箭头，并在首尾、关闭和减少动态时正确降级", () => {
  assert.match(
    styles,
    /\.photo-step-button \{[\s\S]*border-radius: 50%;[\s\S]*\.photo-step-button\.is-prev \{[\s\S]*left: 24px;[\s\S]*\.photo-step-button\.is-next \{[\s\S]*right: 24px;/,
  );
  assert.match(styles, /\.photo-step-button:disabled \{[\s\S]*opacity: 0\.28;/);
  assert.match(
    styles,
    /\.viewer\.is-closing > \.viewer-step-button,[\s\S]*\.viewer\.is-photo-wall-cropping > \.viewer-step-button \{[\s\S]*opacity: 0;[\s\S]*pointer-events: none;/,
  );
  assert.match(
    styles,
    /@media \(prefers-reduced-motion: reduce\)[\s\S]*\.photo-step-button \{[\s\S]*transition: none;/,
  );
});

test("显示切换按钮默认开启并接入设置草稿、应用和持久化", () => {
  const read = app.slice(
    app.indexOf("function readShowViewerStepButtons"),
    app.indexOf("function readDefaultOriginalRatio"),
  );

  assert.match(
    dialog,
    /key: "showViewerStepButtons",[\s\S]*?label: "显示切换按钮"/,
  );
  assert.match(
    read,
    /stored === null \? true : stored === "true"/,
  );
  assert.match(
    app,
    /let showViewerStepButtons = readShowViewerStepButtons\(\)[\s\S]*classList\.toggle\(\s*"hide-viewer-step-buttons",\s*!showViewerStepButtons/,
  );
  assert.match(
    styles,
    /\.hide-viewer-step-buttons \.photo-step-button,[\s\S]*?display: none;/,
  );
  assert.match(main, /"showViewerStepButtons"/);
});
