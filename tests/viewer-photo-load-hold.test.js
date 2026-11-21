"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const root = path.resolve(__dirname, "..");
const app = fs.readFileSync(path.join(root, "web", "app.js"), "utf8");
const css = fs.readFileSync(path.join(root, "web", "styles.css"), "utf8");
const lang = fs.readFileSync(path.join(root, "web", "ui-language.js"), "utf8");

const photoBranch = app.slice(
  app.indexOf("function showViewerItem("),
  app.indexOf("function addVideoChrome("),
);

test("查看器照片先铺网格同款缩略图占位，原图仍是第一个子元素", () => {
  assert.match(
    photoBranch,
    /<img src="\$\{viewItemUrl\(item\)\}" alt="">\s*<img class="viewer-photo-poster" src="\$\{itemThumbUrl\(item, 600, "inside"\)\}"/,
  );
  assert.match(photoBranch, /class="viewer-photo-loading"/);
  assert.match(photoBranch, /class="viewer-photo-retry" type="button" hidden/);
  assert.match(photoBranch, /hydrateCircleCurveLoaders\(\);/);
  assert.match(photoBranch, /fitViewerPosterToStage\(poster, item\);/);
});

test("占位图按元数据先算等比落位，原图就绪后淡出并移除", () => {
  const fit = app.slice(
    app.indexOf("function fitViewerPosterToStage("),
    app.indexOf("function fitViewerImageToStage("),
  );
  assert.match(fit, /viewerContainBox\(/);
  assert.match(fit, /allowUpscale: viewerFitEnabled/);
  assert.match(fit, /poster\.style\.visibility = "hidden";/);
  const sync = photoBranch.slice(
    photoBranch.indexOf("const syncViewerPhotoLoadState"),
    photoBranch.indexOf("poster.addEventListener"),
  );
  assert.match(sync, /loadingMark\.hidden = ready \|\| posterDecoded\(\);/);
  assert.match(sync, /poster\.classList\.add\("is-hidden"\);/);
  assert.match(sync, /if \(poster\.isConnected && fullDecoded\(\)\) poster\.remove\(\);/);
});

test("原图未解码时窗口缩放仍重排占位图，解码后两图共用同一落位", () => {
  const fit = app.slice(
    app.indexOf("function fitViewerImageToStage("),
    app.indexOf("function viewerVideoCrop("),
  );
  assert.match(
    fit,
    /if \(!image\.naturalWidth \|\| !image\.naturalHeight\) \{\s*fitViewerPosterToStage\(/,
  );
  assert.match(fit, /poster\.style\.width = image\.style\.width;/);
  assert.match(fit, /poster\.style\.height = image\.style\.height;/);
});

test("翻页交叉淡化等新图能画了再走，最多等 700ms，连按可取消", () => {
  assert.match(app, /const VIEWER_SWITCH_HOLD_MAX_MS = 700;/);
  const ready = app.slice(
    app.indexOf("function viewerPhotoVisualReady("),
    app.indexOf("function runViewerSwitchCrossfade("),
  );
  assert.match(ready, /:scope > img:not\(\.viewer-photo-poster\)/);
  assert.match(ready, /poster\.complete && poster\.naturalWidth > 0/);
  const hold = app.slice(
    app.indexOf("function crossfadeViewerPhotoSwitch("),
    app.indexOf("function transitionViewerItem("),
  );
  assert.match(hold, /if \(viewerPhotoVisualReady\(incoming\)\)/);
  assert.match(hold, /window\.setTimeout\(finish, VIEWER_SWITCH_HOLD_MAX_MS\)/);
  assert.match(hold, /state\.items\[viewerIndex\]\?\.id !== itemId/);
  assert.match(hold, /full\?\.addEventListener\("error", finish\);/);
  const clear = app.slice(
    app.indexOf("function clearViewerSwitchHold("),
    app.indexOf("function viewerPhotoVisualReady("),
  );
  assert.match(clear, /clearTimeout\(viewerSwitchHold\.timer\);/);
  assert.match(clear, /viewerSwitchHold\.cleanup\(\);/);
  const clearLayers = app.slice(
    app.indexOf("function clearViewerPhotoSwitchLayers("),
    app.indexOf("function ensureContentTileRendered("),
  );
  assert.match(clearLayers, /clearViewerSwitchHold\(\);/);
});

test("翻页残影克隆不带加载指示与重试按钮", () => {
  const capture = app.slice(
    app.indexOf("function captureViewerPhotoSwitchLayer("),
    app.indexOf("function clearViewerPhotoSwitchLayers("),
  );
  assert.match(
    capture,
    /\.viewer-live-video, \.viewer-live-button, \.viewer-photo-loading, \.viewer-photo-retry/,
  );
});

test("单张加载失败只留在本张：缩略图兜底 + 重试入口，不冒泡全局", () => {
  assert.match(
    photoBranch,
    /image\.addEventListener\("error", \(\) => \{\s*if \(!stillCurrent\(\)\) return;\s*loadingMark\.hidden = true;\s*retryBtn\.hidden = false;/,
  );
  assert.match(photoBranch, /retryUrl\.searchParams\.set\("retry", String\(attempt\)\);/);
  assert.match(photoBranch, /poster\.addEventListener\("error"/);
  assert.match(lang, /"加载失败，点击重试": "Couldn’t load this photo\. Click to retry\."/);
});

test("关闭飞行在原图未解码时用占位图缩回，不退化成硬切", () => {
  const close = app.slice(
    app.lastIndexOf("const image = $(\"#viewerPhoto img\");"),
    app.indexOf("const keepStageUntilHidden"),
  );
  assert.match(close, /const visualImage =\s*image && image\.naturalWidth > 0 \? image : posterImage \|\| image;/);
  assert.match(close, /rectSnapshot\(visualImage\.getBoundingClientRect\(\)\)/);
  assert.match(close, /visualImage\.currentSrc \|\| visualImage\.src/);
});

test("占位图永远在原图下层，重试按钮走查看器玻璃 token 与按压反馈", () => {
  assert.match(
    css,
    /\.viewer-stage \.viewer-photo > img:not\(\.viewer-photo-poster\) \{\s*position: relative;\s*z-index: 1;/,
  );
  const posterCss = css.slice(
    css.indexOf(".viewer-photo .viewer-photo-poster {"),
    css.indexOf(".viewer-photo {\n  position: relative;\n}"),
  );
  assert.match(posterCss, /z-index: 0;/);
  assert.match(posterCss, /\.viewer-photo-poster\.is-hidden \{\s*opacity: 0;/);
  assert.match(posterCss, /background: var\(--viewer-pill\);/);
  assert.match(posterCss, /scale\(var\(--motion-press-scale-control\)\)/);
  assert.match(posterCss, /@media \(prefers-reduced-motion: reduce\)/);
});

test("重试按钮可自行点击：不被 .viewer-photo 的 pointer-events:none 穿透", () => {
  const retryCss = css.slice(
    css.indexOf(".viewer-photo .viewer-photo-retry {"),
    css.indexOf(".viewer-photo .viewer-photo-retry:hover"),
  );
  assert.match(retryCss, /pointer-events: auto;/);
  /* 舞台点击关闭逻辑仍在，按钮修复不能靠移除舞台关闭来实现 */
  assert.match(
    app,
    /\$\("#viewerStage"\)\.addEventListener\("click"/,
  );
});
