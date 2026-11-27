"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const root = path.resolve(__dirname, "..");
const app = fs.readFileSync(path.join(root, "web", "app.js"), "utf8");
const css = fs.readFileSync(path.join(root, "web", "styles.css"), "utf8");
const thumbs = fs.readFileSync(path.join(root, "server", "thumbs.js"), "utf8");

test("网格先铺 48px 微型预览，再让高清缩略图覆盖", () => {
  assert.match(app, /const GALLERY_LOW_RES_THUMB_SIZE = 48;/);
  assert.match(app, /const thumbLowResUrl = \(item\)/);
  assert.match(app, /class="gallery-thumb-l0"/);
  assert.match(app, /handleGalleryLowResLoad\(this\)/);
  assert.match(app, /queueThumbLowResWarm\(\);/);
  assert.match(app, /fetchpriority="low"/);
  assert.match(app, /image\.fetchPriority = background \? "low" : "high"/);

  const tile = app.slice(
    app.indexOf("function itemTile("),
    app.indexOf("function galleryTileAriaLabel("),
  );
  const mainImage = tile.indexOf('data-gallery-thumb-size="${thumbSize}"');
  const lowResImage = tile.indexOf('class="gallery-thumb-l0"');
  assert.ok(mainImage >= 0 && lowResImage > mainImage);
});

test("有微型预览时不再显示灰骨架，高清层仍在上方", () => {
  assert.match(css, /\.tile\.has-thumb-l0 \.crop::before\s*\{/);
  assert.match(css, /\.crop > img\.gallery-thumb-l0\s*\{/);
  assert.match(css, /\.crop > \.gallery-thumb-atlas\s*\{/);
  assert.match(css, /z-index:\s*2;/);
  assert.match(
    css,
    /\.crop\s*>\s*img:not\(\.gallery-full-overlay\):not\(\.gallery-thumb-l0\)/,
  );
  assert.match(css, /z-index:\s*3;/);
});

test("48px 缓存从最接近的大缩略图缩小，避免重复解码原始照片", () => {
  assert.match(thumbs, /const SIZES = \[48, 128, 200, 400, 600, 800, 1600\];/);
  const generate = thumbs.slice(
    thumbs.indexOf("async function generatePlainThumb("),
    thumbs.indexOf("async function generateThumbJob("),
  );
  assert.match(generate, /if \(px <= 200\)/);
  assert.match(generate, /for \(const sourceSize of \[128, 200, 400\]\)/);
  assert.match(generate, /plainThumbPath\(item, sourceSize, fit\)/);
});

test("微型预览后台预热有独立内存预算且不挤占高清缓存", () => {
  const section = app.slice(
    app.indexOf(
      "/* ---------------------- 全库微型预览预热 ---------------------- */",
    ),
    app.indexOf("function startThumbDecodeAhead("),
  );
  assert.match(section, /THUMB_LOW_RES_WARM_CONCURRENCY = 4/);
  assert.match(section, /THUMB_LOW_RES_JUMP_CONCURRENCY = 8/);
  assert.match(section, /function primeThumbLowResAtRatio\(ratio\)/);
  assert.match(section, /96 \* 1024 \* 1024/);
  assert.match(section, /THUMB_LOW_RES_WARM_MAX_ENTRIES = 20000/);
  assert.match(section, /galleryViewportIndexRange\(\)/);
  assert.match(section, /gallery-is-scrolling/);
  assert.match(section, /trimThumbLowResWarmCache\(\)/);
  assert.match(section, /thumbLowResWarmUrl\(item\)/);
  assert.match(section, /img\.fetchPriority = urgent \? "high" : "low"/);
});

test("后台 L0 回收后仍能按规范 URL 再次领用", () => {
  const section = app.slice(
    app.indexOf("const thumbLowResUrl = (item) =>"),
    app.indexOf("function scheduleThumbLowResWarm("),
  );
  assert.match(section, /const thumbLowResCanonicalUrl = \(url\) =>/);
  assert.match(section, /parsed\.searchParams\.delete\("lane"\)/);
  assert.match(
    section,
    /const url = thumbLowResCanonicalUrl\(thumbImageKey\(img\)\);[\s\S]*?thumbLowResKeep\(url, img\)/,
  );
  assert.match(
    section,
    /if \(item && url !== thumbLowResUrl\(item\)\) return;/,
  );
});

test("时间轴跳转先预热目标附近，不让中间扫过的位置占队列", () => {
  const scrub = app.slice(
    app.indexOf("function scrubLibraryTimelineToPointer("),
    app.indexOf("function beginLibraryTimelineScrub("),
  );
  assert.match(
    scrub,
    /primeThumbLowResAtRatio\(ratio\);[\s\S]*?content\.scrollTop = ratio \* max;/,
  );

  const key = app.slice(
    app.indexOf("function handleLibraryTimelineKey("),
    app.indexOf(
      '$("#libraryTimelineScrubber").addEventListener("pointerenter"',
    ),
  );
  assert.match(
    key,
    /primeThumbLowResAtRatio\(max > 0 \? content\.scrollTop \/ max : 0\)/,
  );

  const prime = app.slice(
    app.indexOf("function primeThumbLowResAtRatio("),
    app.indexOf("function queueThumbLowResWarm("),
  );
  assert.match(
    prime,
    /if \(!queued\.urgent && !urls\.has\(queued\.cacheUrl\)\)/,
  );
  assert.match(prime, /thumbLowResWarmQueued\.delete\(queued\.cacheUrl\)/);
});

test("切换图库前先解码首屏微型预览，第一帧直接接回真实图", () => {
  const section = app.slice(
    app.indexOf("async function preloadImageUrls("),
    app.indexOf("/* 后台刷新完成后，先把新封面装进浏览器缓存"),
  );
  assert.match(section, /FIRST_SCREEN_LOW_RES_PREVIEW_MIN = 36/);
  assert.match(section, /FIRST_SCREEN_LOW_RES_PREVIEW_MAX = 240/);
  assert.match(section, /function firstScreenLowResPreviewLimit\(\)/);
  assert.match(section, /async function preloadFirstScreenLowResPreviews/);
  assert.match(section, /async function prepareLibraryFirstScreen/);
  assert.match(section, /thumbLowResKeep\(url, img\)/);
  assert.match(app, /function adoptThumbLowResImage\(tile\)/);
  assert.match(app, /function donateThumbLowResImage\(tile\)/);

  const imported = app.slice(
    app.indexOf("async function applyImportedRootState("),
    app.indexOf("function queueImportedRootActivation("),
  );
  assert.match(
    imported,
    /lastRev = Number\(finalState\.revision\)[\s\S]*?await prepareLibraryFirstScreen\(\);[\s\S]*?await loadLibrary\(\);/,
  );

  const switched = app.slice(
    app.indexOf("async function switchRoot("),
    app.indexOf("async function switchToNextRoot("),
  );
  assert.match(
    switched,
    /lastRev = Number\(res\.state\.revision\)[\s\S]*?await prepareLibraryFirstScreen\(\);[\s\S]*?await loadLibrary\(\);/,
  );
});

test("大量 L0 可按页合成图集，单张预览继续作为回退", () => {
  assert.match(app, /const GALLERY_ATLAS_PAGE_SIZE = 64;/);
  assert.match(app, /const GALLERY_ATLAS_COLUMNS = 8;/);
  assert.match(app, /const GALLERY_ATLAS_FORMAT_VERSION = 2;/);
  assert.match(app, /&format=\$\{GALLERY_ATLAS_FORMAT_VERSION\}/);
  assert.match(app, /class="gallery-thumb-atlas"/);
  assert.match(app, /data-gallery-low-res-src="\$\{lowResThumb\}"/);
  assert.match(app, /function loadGalleryAtlasPage\(/);
  assert.match(app, /function requestGalleryAtlasTile\(/);
  assert.match(app, /function activateGalleryLowResFallback\(/);
  assert.match(app, /preloadGalleryAtlasPagesForItems\(targetItems\)/);
  assert.match(app, /function queueGalleryAtlasWarm\(/);
  assert.match(app, /GALLERY_ATLAS_WARM_CONCURRENCY = 4/);
  assert.match(
    app,
    /loadGalleryAtlasPage\(page, state\.items, \{ background: true \}\)/,
  );
  assert.match(app, /GALLERY_LOW_RES_FALLBACK_SPAN = 120/);
  assert.match(
    app,
    /galleryAtlasPages\.get\(page\)\?\.status === "loaded"/,
    "已常驻的图集页不能每轮 render 又排队一遍",
  );

  const atlasKey = app.slice(
    app.indexOf("function galleryAtlasKeyFor("),
    app.indexOf("function resetGalleryAtlasPages("),
  );
  assert.match(atlasKey, /renderedContentView\?\.baseKey/);
  assert.match(atlasKey, /items === state\.items/);

  const toggle = app.slice(
    app.indexOf("async function toggleLibraryTimelineScrollEdge()"),
    app.indexOf("function libraryTimelineUsesTime()"),
  );
  assert.match(toggle, /atlasReady = await Promise\.race/);
  assert.match(
    toggle,
    /if \(!atlasReady\) await preloadFirstScreenLowResPreviews\(targetItems\)/,
  );

  const cssAtlas = css.slice(
    css.indexOf(".photo-grid .tile .crop > .gallery-thumb-atlas"),
    css.indexOf(".photo-grid .tile .crop > img.gallery-thumb-l0"),
  );
  assert.match(cssAtlas, /background-size:\s*800% 800%;/);
  assert.match(cssAtlas, /z-index:\s*1;/);
});

test("后台图集让出带宽，失败页可重试且不会永久钉死", () => {
  const loader = app.slice(
    app.indexOf("function loadGalleryAtlasPage("),
    app.indexOf("function activateGalleryLowResFallback("),
  );
  assert.match(loader, /image\.fetchPriority = background \? "low" : "high";/);
  assert.match(
    loader,
    /if \(existing && existing\.status !== "error"\) return existing\.promise;/,
  );
  assert.match(
    loader,
    /galleryAtlasPages\.delete\(page\);[\s\S]*?existing\?\.image\?\.removeAttribute\("src"\)/,
  );
});

test("新格子的图集尚未返回时立刻铺单张 L0，不把首个画面留给空白", () => {
  const request = app.slice(
    app.indexOf("function requestGalleryAtlasTile("),
    app.indexOf("async function preloadGalleryAtlasPagesForItems("),
  );
  const fallbackAt = request.indexOf("activateGalleryLowResFallback(tile)");
  const pageLoadAt = request.indexOf("void loadGalleryAtlasPage(page)");
  assert.ok(fallbackAt >= 0 && pageLoadAt > fallbackAt);
  assert.doesNotMatch(request, /setTimeout\(/);
});

test("常见图库的低清图集整库常驻，时间轴跳转先准备目标图集页", () => {
  assert.match(app, /const GALLERY_ATLAS_CACHE_LIMIT = 128;/);
  const limit = Number(
    /const GALLERY_ATLAS_CACHE_LIMIT = (\d+);/.exec(app)?.[1],
  );
  assert.ok(limit * 64 >= 8000, "常驻页数应覆盖常见 7,000～8,000 张图库");

  const prime = app.slice(
    app.indexOf("function primeThumbLowResAtRatio("),
    app.indexOf("function queueThumbLowResWarm("),
  );
  assert.match(
    prime,
    /preloadGalleryAtlasPagesForItems\(state\.items\.slice\(first, last \+ 1\)\)/,
  );
  assert.ok(
    prime.indexOf("preloadGalleryAtlasPagesForItems") <
      prime.indexOf("const jobs = []"),
    "图集页应先于逐张 L0 兜底进入队列",
  );
});
