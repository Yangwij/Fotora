"use strict";

/* 缩略图缓存就绪态修复 + 查看器退出回弹一致性。 */

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const root = path.join(__dirname, "..");
const read = (file) => fs.readFileSync(path.join(root, "web", file), "utf8");

test("缓存缩略图已 complete 时主动补就绪同步，不卡在骨架灰底", () => {
  const app = read("app.js");

  const loadFn = app.slice(
    app.indexOf("function loadGalleryWindowImage("),
    app.indexOf("function unloadGalleryWindowImage("),
  );
  assert.match(loadFn, /if \(img\.complete && img\.naturalWidth > 0\) syncTileAspect\(img\);/);

  /* 可见图扫描的 else 分支：已解码但未就绪的格子也要补一次。 */
  const sweep = app.slice(
    app.indexOf("function sweepVisibleGalleryImages("),
    app.indexOf("function scheduleVisibleGalleryImageSweep("),
  );
  assert.match(
    sweep,
    /img\.complete &&\s*img\.naturalWidth > 0 &&\s*!tile\.classList\.contains\("is-media-ready"\)[\s\S]*?syncTileAspect\(img\)/,
  );
});

test("查看器退出返回带轻微回弹，与打开按压感一致", () => {
  const css = read("styles.css");

  /* 退出方向（is-back）用带过冲的弹簧缓动（峰值 y>1）。 */
  const back = css.slice(
    css.indexOf(".viewer-zoom-clone.is-back {"),
    css.indexOf(".viewer-zoom-clone.is-arrived {"),
  );
  assert.match(back, /transition:/);
  assert.match(back, /width 0\.4s cubic-bezier\(0\.34, 1\.18, 0\.44, 1\)/);
  assert.match(back, /height 0\.4s cubic-bezier\(0\.34, 1\.18, 0\.44, 1\)/);

  /* 打开方向保持原平滑曲线（不被改动）。 */
  assert.match(
    css,
    /\.viewer-zoom-clone \{[\s\S]*?width 0\.38s cubic-bezier\(0\.25, 0\.35, 0\.25, 1\)/,
  );

  /* 减少动态时全局把过渡压成瞬移，不播回弹。 */
  assert.match(
    css,
    /\.viewer-zoom-clone,\s*\.viewer-state-close[\s\S]*?transition-duration: 0\.01ms !important;/,
  );
});
