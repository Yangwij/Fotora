"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const root = path.resolve(__dirname, "..");
const app = fs.readFileSync(path.join(root, "web", "app.js"), "utf8");
const styles = fs.readFileSync(path.join(root, "web", "styles.css"), "utf8");
const language = fs.readFileSync(
  path.join(root, "web", "ui-language.js"),
  "utf8",
);

test("未加载瓷砖有微光骨架，解码后淡入并停掉微光", () => {
  /* 骨架是独立的 .crop::before 层，不能和 img 的 opacity:0 合并（否则白屏） */
  assert.match(
    styles,
    /\.photo-grid \.tile \.crop::before \{[\s\S]*?background-color: var\(--tile-empty\);[\s\S]*?animation: tile-shimmer-sweep/,
  );
  assert.match(
    styles,
    /\.photo-grid \.tile\.is-media-ready \.crop::before,[\s\S]*?\.photo-grid \.tile\.failed \.crop::before,[\s\S]*?\.photo-grid \.tile\.failed-video \.crop::before \{[\s\S]*?opacity: 0;[\s\S]*?animation: none;/,
  );
  assert.match(
    styles,
    /\.photo-grid \.tile \.crop > img:not\(\.gallery-full-overlay\) \{[\s\S]*?opacity: 0;/,
  );
  assert.match(
    styles,
    /\.photo-grid \.tile\.is-media-ready \.crop > img:not\(\.gallery-full-overlay\) \{[\s\S]*?opacity: 1;/,
  );
  assert.match(styles, /@keyframes tile-shimmer-sweep/);
  /* 骨架几何与 img 一致：原始比例模式只覆盖照片实际区域 */
  assert.match(
    styles,
    /\.photo-grid \.tile \.crop::before \{[\s\S]*?width: min\(100%, calc\(100% \* var\(--ar, 1\)\)\);[\s\S]*?transform: scale\(var\(--cs, 1\)\);/,
  );
});

test("裁剪编辑墙不参与淡入 gate，高清层保留自己的淡入", () => {
  assert.match(
    styles,
    /\.photo-grid \.tile\.mosaic-wall-library-tile \.crop > img,[\s\S]*?\.photo-grid \.tile\.filmroll-wall-library-tile \.crop > img,[\s\S]*?\.photo-grid \.tile\.masonry-wall-library-tile \.crop > img \{[\s\S]*?opacity: 1;/,
  );
  assert.match(
    styles,
    /\.photo-grid \.tile\.mosaic-wall-library-tile \.crop::before,[\s\S]*?opacity: 0;[\s\S]*?animation: none;/,
  );
  assert.match(
    styles,
    /\.photo-grid \.tile img\.gallery-full-overlay \{[\s\S]*?transition: opacity 160ms ease;/,
  );
});

test("换高清档时旧画面保持可见：syncTileAspect 不再摘掉 is-media-ready", () => {
  const syncTileAspect = app.slice(
    app.indexOf("function syncTileAspect(img)"),
    app.indexOf("const GALLERY_THUMB_RETRY_LIMIT"),
  );
  assert.doesNotMatch(syncTileAspect, /classList\.remove\("is-media-ready"\)/);
  assert.match(syncTileAspect, /classList\.remove\("is-load-failed"\)/);
  assert.match(syncTileAspect, /querySelector\("\.tile-retry"\)\?\.remove\(\)/);
});

test("加载中也有按压反馈，减少动态时关闭按压缩放", () => {
  assert.match(
    styles,
    /\.photo-grid \.tile:active \{\s*transform: scale\(0\.97\);/,
  );
  assert.match(
    styles,
    /\.photo-grid \.tile\.is-selected:active \{\s*transform: scale\(0\.955\);/,
  );
  assert.match(
    styles,
    /@media \(prefers-reduced-motion: reduce\) \{\s*\.photo-grid \.tile:active \{\s*transform: none;/,
  );
});

test("重试用尽后区分格式失败与偶发失败，偶发失败给重试按钮", () => {
  const finalize = app.slice(
    app.indexOf("function finalizeGalleryThumbFailure"),
    app.indexOf("function showTileRetryPill"),
  );
  assert.match(finalize, /res\.status === 415/);
  assert.match(finalize, /galleryThumbRecovered !== "1"/);
  assert.match(finalize, /img\.getAttribute\("src"\) === failedSrc/);
  assert.match(finalize, /classList\.add\(failureClass, "is-load-failed"\)/);
  assert.match(
    app,
    /function handleGalleryThumbError\(img, failureClass = "failed"\)[\s\S]*?finalizeGalleryThumbFailure\(img, tile, failureClass\)/,
  );
  assert.match(app, /retry\.textContent = uiText\("重试"\)/);
  assert.match(language, /重试: "Retry"/);
});

test("重试按钮走委托点击，且不会触发刷选或打开查看器", () => {
  const clickBranch = app.indexOf('e.target.closest(".tile-retry")');
  const tileBranch = app.indexOf('const tile = e.target.closest(".tile");');
  assert.ok(clickBranch > 0 && clickBranch < tileBranch);
  assert.match(
    app,
    /function retryFailedGalleryTile\(tile\) \{[\s\S]*?galleryThumbRetryAttempt = "0"[\s\S]*?searchParams\.set\("retry", `manual-/,
  );
  /* 选择模式 pointerdown 先让开重试按钮 */
  const sweepStart = app.indexOf(
    '$("#content").addEventListener("pointerdown", (e) => {',
  );
  const sweep = app.slice(sweepStart, sweepStart + 1200);
  assert.match(sweep, /e\.target\.closest\("\.tile-retry"\)\) return/);
});

test("失败标签与重试按钮有英文文案，窗口回收会清掉重试按钮", () => {
  assert.match(
    styles,
    /html\[data-ui-language="en"\] \.photo-grid \.tile\.failed::after \{\s*content: "Preview unavailable";/,
  );
  assert.match(
    styles,
    /html\[data-ui-language="en"\] \.photo-grid \.tile\.is-load-failed::after \{\s*content: "Couldn’t load";/,
  );
  const unload = app.slice(
    app.indexOf("function unloadGalleryWindowImage"),
    app.indexOf("function resetGalleryImageWindow"),
  );
  assert.match(unload, /classList\.remove\("is-media-ready", "is-load-failed"\)/);
  assert.match(unload, /querySelector\("\.tile-retry"\)\?\.remove\(\)/);
});
