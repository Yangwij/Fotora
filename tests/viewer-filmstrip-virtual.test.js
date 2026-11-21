"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const root = path.join(__dirname, "..");
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");

test("查看器胶片栏大图库只渲染窗口，关闭时清空", () => {
  const app = read("web/app.js");
  const css = read("web/styles.css");

  assert.match(app, /const VIEWER_FILMSTRIP_VIRTUAL_THRESHOLD = 160;/);
  assert.match(app, /function renderViewerFilmstripWindow\(/);
  assert.match(app, /function clearViewerFilmstrip\(/);

  const sync = app.slice(
    app.indexOf("function syncViewerFilmstrip("),
    app.indexOf("function openViewer("),
  );
  /* 不再一次性渲染全部项目 */
  assert.doesNotMatch(sync, /track\.innerHTML = state\.items\s*\.map/);
  assert.match(
    sync,
    /renderViewerFilmstripWindow\(viewerIndex, \{ resetScroll \}\)/,
  );
  assert.match(
    sync,
    /Number\(thumb\.dataset\.viewerFilmstripThumb\) === viewerIndex/,
  );
  assert.match(
    sync,
    /if \(!currentPresent\) renderViewerFilmstripWindow\(viewerIndex\)/,
  );
  assert.match(sync, /if \(viewer\.hidden\) clearViewerFilmstrip\(\);/);

  const close = app.slice(
    app.indexOf("function closeViewer({"),
    app.indexOf("function setViewerInfo(open)"),
  );
  assert.match(close, /clearViewerFilmstrip\(\);/);

  /* 滚动接近窗口边缘时补渲染 */
  assert.match(
    app,
    /viewerFilmstripTrack\.addEventListener\(\s*"scroll",[\s\S]*?renderViewerFilmstripWindow\(center\)/,
  );
  /* 占位撑出完整滚动宽度 */
  assert.match(
    css,
    /#viewerFilmstripTrack::before \{\s*width: var\(--viewer-filmstrip-spacer-before, 0\);/,
  );
  assert.match(
    css,
    /#viewerFilmstripTrack::after \{\s*width: var\(--viewer-filmstrip-spacer-after, 0\);/,
  );
});

test("菜单支持方向键导航，打开不抢焦点、收起归还丢失的焦点", () => {
  const app = read("web/app.js");
  assert.match(app, /function menuFocusableRows\(\)/);
  assert.match(app, /function moveMenuFocus\(direction\)/);
  /* 沿用既有策略：打开菜单不自动移动焦点 */
  const open = app.slice(
    app.indexOf("function openMenu("),
    app.indexOf("function cancelMenuAnims("),
  );
  assert.doesNotMatch(open, /\.focus\(/);
  const close = app.slice(
    app.indexOf("function closeMenu({"),
    app.indexOf("const toggleMenu ="),
  );
  assert.match(
    close,
    /const focusReturnBtn = menu\.contains\(document\.activeElement\)/,
  );
  assert.match(close, /focusReturnBtn\.focus\(\);/);
  const keyBranch = app.slice(
    app.indexOf('if (menuOpen) {\n    if (key === "Escape")'),
    app.indexOf('if (anyWallSelectionActive() && key === "Escape")'),
  );
  assert.match(keyBranch, /key === "ArrowDown" \|\| key === "ArrowUp"/);
  assert.match(
    keyBranch,
    /closest\("input, textarea, \[contenteditable='true'\]"\)/,
  );
  assert.match(keyBranch, /moveMenuFocus\(key === "ArrowDown" \? 1 : -1\)/);
});
