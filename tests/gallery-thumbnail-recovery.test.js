"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const root = path.resolve(__dirname, "..");
const app = fs.readFileSync(path.join(root, "web", "app.js"), "utf8");

test("缩略图偶发失败会保留图片节点并自动重试", () => {
  assert.match(
    app,
    /const GALLERY_THUMB_RETRY_LIMIT = 2;/,
  );
  assert.match(
    app,
    /function handleGalleryThumbError\(img, failureClass = "failed"\)[\s\S]*galleryThumbRetryAttempt[\s\S]*retryUrl\.searchParams\.set\("retry"/,
  );
  assert.match(
    app,
    /onerror="handleGalleryThumbError\(this, 'failed-video'\)"/,
  );
  assert.match(app, /onerror="handleGalleryThumbError\(this\)"/);
  assert.doesNotMatch(
    app,
    /onerror="this\.remove\(\); this\.closest\('\.tile'\)\.classList\.add\('failed/,
  );
});

test("缩略图重试成功后清除失败状态", () => {
  const syncTileAspect = app.slice(
    app.indexOf("function syncTileAspect(img)"),
    app.indexOf("const GALLERY_THUMB_RETRY_LIMIT"),
  );
  assert.match(
    syncTileAspect,
    /classList\.remove\("failed", "failed-video", "is-thumb-retrying"\)/,
  );
});

test("首屏会主动加载仍在内容视口中的缩略图", () => {
  assert.match(
    app,
    /function sweepVisibleGalleryImages\(grids = photoLayoutGrids\(\)\)[\s\S]*getBoundingClientRect\(\)[\s\S]*loadGalleryWindowImage\(tile\)/,
  );
  assert.match(
    app,
    /function observeGalleryImageTiles\(grids = photoLayoutGrids\(\)\)[\s\S]*scheduleVisibleGalleryImageSweep\(grids\);/,
  );
});
