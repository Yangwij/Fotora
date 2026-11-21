"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const root = path.join(__dirname, "..");
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");

test("图库网格提供适合大量缩略图的五档，并从标准档启动", () => {
  const app = read("web/app.js");
  const styles = read("web/styles.css");

  assert.match(app, /photoZoom: 4/);
  assert.match(app, /const GALLERY_STANDARD_ZOOM = 4;/);
  assert.match(app, /const GALLERY_ZOOM_MAX = 5;/);
  assert.match(styles, /\.photo-grid\.gallery-zoom-1[\s\S]*?\* 0\.16\)/);
  assert.match(styles, /\.photo-grid\.gallery-zoom-2[\s\S]*?\* 0\.3\)/);
  assert.match(styles, /\.photo-grid\.gallery-zoom-3[\s\S]*?\* 0\.52\)/);
  assert.match(styles, /\.photo-grid\.gallery-zoom-5[\s\S]*?repeat\(4, minmax/);
});

test("点击升档使用点击位置，不锁定某张照片", () => {
  const app = read("web/app.js");
  const zoomBlock = app.slice(
    app.indexOf("function galleryGridActionLocked("),
    app.indexOf("function animateGalleryFlip("),
  );

  assert.match(zoomBlock, /event\.clientX - rect\.left/);
  assert.match(zoomBlock, /event\.clientY - rect\.top/);
  assert.match(
    zoomBlock,
    /index: bestTile \? Number\(bestTile\.dataset\.index\)/,
  );
  assert.match(
    zoomBlock,
    /tileRect\.top \+[\s\S]*?content\.scrollTop \+= anchorY - focus\.y/,
  );
  assert.match(
    app,
    /preserveGalleryZoomFocus\(focus, before, fromLevel, level\)/,
  );
  assert.doesNotMatch(zoomBlock, /zoomAnchorId|itemCenter|viewportCenter/);
  assert.doesNotMatch(zoomBlock, /\.sort\(|state\.items\s*=/);
});

test("低于标准档时照片网格只执行升档", () => {
  const app = read("web/app.js");

  assert.match(
    app,
    /galleryGrid && canZoomGallery\(\) && galleryGridActionLocked\(\)[\s\S]*?galleryZoomFocusFromEvent\(e, \{ anchorItem: true \}\)/,
  );
  assert.match(
    app,
    /galleryGridActionLocked\(\)[\s\S]*?galleryZoomFocusFromEvent\(e, \{ anchorItem: true \}\)/,
  );
  assert.match(
    app,
    /function canOpenItemContext\(tile\)[\s\S]*?!galleryGridActionLocked\(\)/,
  );
});

test("大图库窗口化网格升档后仍按布局盒保留点击目标", () => {
  const app = read("web/app.js");
  const preserveBlock = app.slice(
    app.indexOf("function preserveGalleryZoomFocus("),
    app.indexOf("function animateGalleryFlip("),
  );
  assert.match(preserveBlock, /virtualPhotoLayoutForIndex\(focus\.index\)/);
  assert.match(
    preserveBlock,
    /found\.gridTop \+ found\.box\.y \+ found\.box\.height \* tileY - focus\.y/,
  );
  const zoomBlock = app.slice(
    app.indexOf("async function animateGalleryZoomTo("),
    app.indexOf("async function drainGalleryZoom("),
  );
  assert.match(
    zoomBlock,
    /preserveGalleryZoomFocus\([\s\S]*?syncVirtualPhotoGridWindowNow\(\)/,
  );
  assert.match(zoomBlock, /focus\.index == null/);
  assert.match(zoomBlock, /virtualPhotoGridLayouts\.get\(grid\)/);
  assert.match(zoomBlock, /focus\.index = best\.index/);
});

test("选择、预览与键盘在低档位或换档动画期间被锁定", () => {
  const app = read("web/app.js");
  const selectionStart = app.indexOf(
    '$("#content").addEventListener("pointerdown", (e) => {',
  );
  const selectionBlock = app.slice(
    selectionStart,
    app.indexOf('$("#content").addEventListener("pointermove"', selectionStart),
  );
  const pointerOverBlock = app.slice(
    app.indexOf('document.addEventListener("pointerover"'),
    app.indexOf(
      "/* ------------------------------ 快捷键",
      app.indexOf('document.addEventListener("pointerover"'),
    ),
  );
  const keyboardBlock = app.slice(
    app.lastIndexOf('document.addEventListener("keydown"'),
    app.indexOf(
      'if (key === "Delete")',
      app.lastIndexOf('document.addEventListener("keydown"'),
    ),
  );

  assert.match(selectionBlock, /galleryGridActionLocked\(\)/);
  assert.match(pointerOverBlock, /if \(galleryGridActionLocked\(\)\) return;/);
  assert.match(
    keyboardBlock,
    /galleryGridActionLocked\(\)[\s\S]*?requestGalleryZoom\(1, galleryZoomFocusFromTile\(galleryTile\)\)/,
  );
});

test("连续点击升档时不会在动画中提前打开，控件保持可见", () => {
  const app = read("web/app.js");
  const styles = read("web/styles.css");
  const lock = app.slice(
    app.indexOf("function galleryGridActionLocked("),
    app.indexOf("function syncGalleryGridInteractionState("),
  );

  assert.match(lock, /galleryZoomBusy/);
  assert.match(lock, /galleryZoomPending !== 0/);
  assert.match(
    styles,
    /html\.gallery-grid-action-locked[\s\S]*?pointer-events:\s*none;/,
  );
  assert.doesNotMatch(
    styles,
    /html\.gallery-grid-action-locked[\s\S]{0,500}?display:\s*none/,
  );
});
