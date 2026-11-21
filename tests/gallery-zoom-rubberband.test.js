"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const root = path.resolve(__dirname, "..");
const app = fs.readFileSync(path.join(root, "web", "app.js"), "utf8");

test("推到缩放边界给橡皮筋回弹，不改档位模型", () => {
  const req = app.slice(
    app.indexOf("function requestGalleryZoom("),
    app.indexOf("function handleGalleryWheel("),
  );
  assert.match(req, /rubberBandGalleryZoom\(Math\.sign\(dir\)\)/);
  assert.match(app, /function rubberBandGalleryZoom\(dir\)/);
  const rb = app.slice(
    app.indexOf("function rubberBandGalleryZoom(dir)"),
    app.indexOf("function handleGalleryWheel("),
  );
  assert.match(rb, /dir > 0 \? 1\.03 : 0\.97/);
  assert.match(rb, /prefers-reduced-motion: reduce/);
  assert.match(rb, /now - galleryRubberBandAt < 160/);
  assert.match(rb, /grid\.animate\(/);
  /* 档位表与 FLIP 缓动不变 */
  assert.match(app, /const GALLERY_ZOOM_MAX = 5;/);
  assert.match(app, /const GALLERY_ZOOM_MIN = 1;/);
  assert.match(app, /const PHOTO_GRID_FLIP_EASE = "cubic-bezier\(0\.22, 0\.72, 0\.24, 1\)";/);
});

test("视图切换取消未完成的橡皮筋", () => {
  const cancel = app.slice(
    app.indexOf("function cancelGalleryZoomMotion()"),
    app.indexOf("async function animateGalleryZoomTo("),
  );
  assert.match(cancel, /cancelGalleryRubberBand\(\);/);
  assert.match(app, /function cancelGalleryRubberBand\(\)/);
});
