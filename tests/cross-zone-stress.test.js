"use strict";

/* Slice 038 — 跨区联动 / 极限压测的结构守护（方案 §2 / §3）。
   这里锁定让「叠加操作」安全的底层机制：快照单例、动画可取消、
   手势状态随视图复位、未完成任务随视图取消、主题/语言热切换、
   查看器在缩放/导入期间不被关闭。真实运行压测见 plans/038。 */

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const root = path.join(__dirname, "..");
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");

/* 按花括号配对提取顶层函数体，避免跨函数误匹配。 */
function fnBody(src, name) {
  const start = src.indexOf(`function ${name}(`);
  assert.ok(start >= 0, `missing function ${name}`);
  /* 先配对参数列表圆括号（默认参数里可能有花括号），再取函数体。 */
  const paren = src.indexOf("(", start);
  let parens = 0;
  let paramsEnd = -1;
  for (let i = paren; i < src.length; i++) {
    if (src[i] === "(") parens++;
    else if (src[i] === ")") {
      parens--;
      if (parens === 0) {
        paramsEnd = i;
        break;
      }
    }
  }
  assert.ok(paramsEnd > 0, `unbalanced params in ${name}`);
  const open = src.indexOf("{", paramsEnd);
  let depth = 0;
  for (let i = open; i < src.length; i++) {
    if (src[i] === "{") depth++;
    else if (src[i] === "}") {
      depth--;
      if (depth === 0) return src.slice(open + 1, i);
    }
  }
  throw new Error(`unbalanced braces in ${name}`);
}

test("快速切换视图：crossfade 快照是单例，新切换先取消旧的，且有寿命上限", () => {
  const app = read("web/app.js");
  const begin = fnBody(app, "beginContentCrossfade");
  const cancel = fnBody(app, "cancelContentCrossfade");

  /* 进场第一件事就是取消上一轮，快照不会堆叠。 */
  assert.match(begin, /^\s*cancelContentCrossfade\(\);/);
  /* 取消时清定时器、停动画、移除快照、摘掉激活类。 */
  assert.match(cancel, /clearTimeout\(motion\.fallbackTimer\)/);
  assert.match(cancel, /clearTimeout\(motion\.cleanupTimer\)/);
  assert.match(cancel, /animation\.cancel\(\)/);
  assert.match(cancel, /motion\.snapshot\?\.remove\(\)/);
  assert.match(cancel, /is-content-crossfade-active/);
  /* 兜底寿命上限，快照绝不可能长期盖住内容。 */
  assert.match(app, /CONTENT_CROSSFADE_MAX_LIFETIME_MS\s*=\s*5000/);
  assert.match(app, /cleanupTimer\s*=\s*(window\.)?setTimeout\(/);
});

test("相簿切换不再按序号等待新图，旧图统一按波纹退场", () => {
  const app = read("web/app.js");
  const handoff = fnBody(app, "startPhotoContentCrossfadeHandoff");

  assert.doesNotMatch(handoff, /const paired = Math\.min/);
  assert.doesNotMatch(
    handoff,
    /waitForImage|image\.decode|pendingImageWaits|failedImageWaits/,
  );
  assert.match(handoff, /const tileRects = oldTiles\.map\(/);
  assert.match(handoff, /const wave = contentCrossfadeWaveForRects\(/);
  assert.match(
    handoff,
    /for \(let index = 0; index < oldTiles\.length; index \+= 1\) \{[\s\S]*?animateContentCrossfadeElement\(/,
  );
  assert.match(
    app,
    /startPhotoContentCrossfadeHandoff\(contentCrossfadeMotion\);/,
  );
});

test("狂点主菜单：重入先取消全部在途动画并截取当前视觉帧，只有最后一次生效", () => {
  const app = read("web/app.js");
  const open = fnBody(app, "openMenu");

  assert.match(open, /captureVisualFrame\(menu\)/);
  for (const anim of [
    "menuContentAnim",
    "menuSubmenuAnim",
    "menuSubmenuContentAnim",
    "menuHeadRadiusAnim",
    "menuBorderRadiusAnim",
    "menuGroupPaddingAnim",
    "menuAnchorBottomRadiusAnim",
  ]) {
    assert.match(open, new RegExp(`${anim}\\?\\.cancel\\(\\)`));
    assert.match(open, new RegExp(`${anim} = null`));
  }
  assert.match(open, /detachedSubmenuCleanup\?\.\(\)/);
});

test("切换相簿/视图复位缩放手势：预览、落位和定时器全部清零", () => {
  const app = read("web/app.js");
  const reset = fnBody(app, "resetGalleryZoomForViewChange");

  assert.match(reset, /galleryWheelPreviewLog = 0/);
  assert.match(reset, /galleryWheelPreviewFocus = null/);
  assert.match(reset, /clearTimeout\(galleryWheelSettleTimer\)/);
  assert.match(reset, /clearTimeout\(galleryWheelCommitTimer\)/);
  assert.match(reset, /clearGalleryWheelZoomPreview\(\)/);
  /* 两条内容切换路径都必须调用复位。 */
  assert.match(
    fnBody(app, "selectAlbumWithContentHandoff"),
    /resetGalleryZoomForViewChange\(\)/,
  );
  const selectBody = app.slice(
    app.indexOf("function select("),
    app.indexOf("function select(") + 4000,
  );
  assert.match(selectBody, /resetGalleryZoomForViewChange\(\)/);
});

test("未完成的渐进网格：脱离 DOM 即取消填充，且不缓存半成品视图", () => {
  const app = read("web/app.js");
  const append = fnBody(app, "appendProgressivePhotoGridChunk");
  const cache = fnBody(app, "cacheCurrentContentView");

  assert.match(
    append,
    /if \(!grid\?\.isConnected\) \{\s*cancelProgressivePhotoGridFill\(\)/,
  );
  assert.match(
    cache,
    /hasIncompleteProgressivePhotoGrid\(\)[\s\S]*?cancelProgressivePhotoGridFill\(\)/,
  );
  assert.match(cache, /content\?\.replaceChildren\(\)/);
});

test("主题/语言热切换：只换属性与文案，不重载不重建，iframe 经消息同步", () => {
  const bridge = read("web/theme-bridge.js");
  const language = read("web/ui-language.js");

  /* 主题切换 = dataset 属性 + 持久化，绝无整页重载或 DOM 重建。 */
  assert.match(bridge, /document\.documentElement\.dataset\.colorTheme = next/);
  assert.doesNotMatch(bridge, /location\.reload|replaceChildren|innerHTML/);
  /* 语言切换委托给翻译器，地图 iframe 走事件而非重建。 */
  assert.match(bridge, /FotoraLanguage\?\.setLanguage\(/);
  assert.match(bridge, /fotora:language-change/);
  /* 主窗口与地图/照片墙 iframe 用 postMessage + storage 双通道同步。 */
  assert.match(bridge, /photo:color-theme/);
  assert.match(bridge, /photo:font-theme/);
  assert.match(bridge, /addEventListener\("storage"/);
  /* 翻译只改文本节点/属性值，不重建子树。 */
  const setLang = fnBody(language, "setLanguage");
  assert.doesNotMatch(setLang, /replaceChildren|innerHTML|location\.reload/);
});

test("查看器在窗口缩放与后台导入期间不关闭：resize 只重 fit，导入不碰查看器", () => {
  const app = read("web/app.js");

  /* 查看器的 resize 监听：重 fit + 保住平移 + 面板重定位，不含关闭。 */
  const resizeBlock = app.match(
    /window\.addEventListener\("resize", \(\) => \{\s*fitViewerImageToStage\(\);[\s\S]*?\n\}\);/,
  );
  assert.ok(resizeBlock, "viewer resize handler missing");
  assert.match(resizeBlock[0], /fitViewerVideoToStage\(\)/);
  assert.match(resizeBlock[0], /preserveViewerPanOnResize\(\)/);
  assert.doesNotMatch(resizeBlock[0], /closeViewer/);

  /* 导入发起与后台轮询都不关闭查看器（§2.3 / §2.5）。 */
  assert.doesNotMatch(fnBody(app, "promptFolderImports"), /closeViewer/);
  assert.doesNotMatch(fnBody(app, "waitForRootImport"), /closeViewer/);

  /* 关闭只来自用户主动流程：撤销、裁剪保存、关闭按钮、ESC。 */
  for (const userFlow of ["undoLast", "savePhotoWallCrop", "handleViewerKey"]) {
    assert.match(fnBody(app, userFlow), /closeViewer\(/);
  }
});
