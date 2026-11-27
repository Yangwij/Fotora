"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const root = path.join(__dirname, "..");
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");
const sliceBetween = (value, start, end) => {
  const from = value.indexOf(start);
  assert.notEqual(from, -1, `找不到起点：${start}`);
  const to = value.indexOf(end, from + start.length);
  assert.notEqual(to, -1, `找不到终点：${end}`);
  return value.slice(from, to);
};

test("内容缓存键把档位单列在尾部，不再混进 parts", () => {
  const app = read("web/app.js");
  const ordinary = sliceBetween(
    app,
    "function ordinaryContentView()",
    "function contentViewDescriptor(",
  );
  const descriptor = sliceBetween(
    app,
    "function contentViewDescriptor(",
    "function rebaseRenderedContentViewZoom(",
  );

  /* 档位是单独传进去的一位，数组里最后一项是时间分组模式。 */
  assert.match(
    ordinary,
    /isLibrary \|\| isAlbum \? state\.libraryTimelineMode : "",\s*\n\s*\],\s*\n\s*state\.photoZoom,/,
  );
  assert.match(descriptor, /const level = clampGalleryZoom\(zoom\);/);
  assert.match(descriptor, /const baseKey = JSON\.stringify\(parts\);/);
  assert.match(descriptor, /key: `\$\{baseKey\}@z\$\{level\}`/);
  assert.match(descriptor, /baseKey,/);
});

test("就地换档只改写键尾档位，不重算整份签名", () => {
  const app = read("web/app.js");
  const rebase = sliceBetween(
    app,
    "function rebaseRenderedContentViewZoom(",
    "function contentThumbDecodedBytes(",
  );

  assert.match(rebase, /if \(!current\?\.parts\) return;/);
  assert.match(rebase, /if \(current\.zoom === level\) return;/);
  assert.match(rebase, /contentViewDescriptor\(current\.parts, level\)/);
  /* itemViewSignature 要遍历全部项目，缩放动画里重算一次就是一次卡顿。 */
  assert.doesNotMatch(rebase, /itemViewSignature/);
});

test("换档改样式时同步改写缓存键，且在提前返回之前", () => {
  const app = read("web/app.js");
  const apply = sliceBetween(
    app,
    "function applyGalleryZoomClasses(",
    "function galleryVisibleSnapshots(",
  );

  assert.match(apply, /rebaseRenderedContentViewZoom\(level\);/);
  assert.ok(
    apply.indexOf("rebaseRenderedContentViewZoom(level);") <
      apply.indexOf("if (!grids.length) return;"),
    "缓存键要在网格为空的提前返回之前改写",
  );
});

test("切换视图的每一条路径都把档位收回标准档", () => {
  const app = read("web/app.js");
  const reset = sliceBetween(
    app,
    "function resetGalleryZoomForViewChange()",
    "function galleryImageWindowMarginForZoom(",
  );

  assert.match(reset, /state\.photoZoom = GALLERY_STANDARD_ZOOM;/);
  assert.match(reset, /galleryZoomTarget = GALLERY_STANDARD_ZOOM;/);
  assert.match(reset, /galleryZoomPending = 0;/);
  assert.match(reset, /cancelGalleryZoomMotion\(\);/);

  const paths = [
    [
      "async function select(id) {",
      "async function navigateFromEmptyFavorites(",
      "图库 / 固定栏目切换",
    ],
    [
      "async function selectAlbumWithContentHandoff(",
      "async function select(id) {",
      "相簿内容交接",
    ],
    ["function fallbackToAllAlbums()", "/* 设置页写入全局默认", "回到所有相簿"],
    [
      "async function applyImportedRootState(",
      "function queueImportedRootActivation(",
      "导入图库根目录",
    ],
    [
      "async function switchRoot(rootId)",
      "async function switchToNextRoot(",
      "切换图库根目录",
    ],
    [
      "async function removeRoot(rootId",
      "function formatSize(bytes)",
      "移除图库根目录",
    ],
  ];
  for (const [start, end, label] of paths) {
    assert.match(
      sliceBetween(app, start, end),
      /resetGalleryZoomForViewChange\(\);/,
      `${label}应重置档位`,
    );
  }
});

test("鼠标 Ctrl+滚轮一格一档，触控板捏合可连续跟手", () => {
  const app = read("web/app.js");

  assert.doesNotMatch(app, /GALLERY_WHEEL_PINCH_REPEAT_PX/);
  assert.match(
    app,
    /const galleryWheelIsPinch = \(event\) =>\s*\n\s*event\.deltaMode === 0 &&\s*\n\s*Math\.abs\(event\.deltaY\) < ALBUM_WHEEL_SMOOTHING\.minNotchPx;/,
  );

  const wheel = sliceBetween(
    app,
    "function handleGalleryWheel(",
    '$("#content").addEventListener("wheel", handleGalleryWheel',
  );
  const preview = sliceBetween(
    app,
    "function updateGalleryWheelZoomPreview(",
    "function scheduleGalleryWheelZoomCommit(",
  );

  assert.match(
    wheel,
    /if \(!galleryWheelIsPinch\(e\)\) \{[\s\S]*?galleryWheelMouseLocked = true;[\s\S]*?requestGalleryZoom\(dir, focus\);/,
  );
  assert.match(
    wheel,
    /if \(galleryZoomBusy \|\| galleryZoomPending !== 0\) return;/,
  );
  assert.match(wheel, /updateGalleryWheelZoomPreview\(/);
  assert.match(app, /const GALLERY_WHEEL_MOUSE_LOCK_MS = 140;/);
  assert.match(preview, /GALLERY_WHEEL_PREVIEW_SENSITIVITY \* 1\.7/);
  assert.match(preview, /applyGalleryWheelZoomPreview\(visualScale\)/);
  assert.match(preview, /scheduleGalleryWheelZoomCommit\(\)/);
  assert.doesNotMatch(
    preview,
    /else if \(focus\) \{\s*galleryWheelPreviewFocus = focus;/,
  );

  const target = sliceBetween(
    app,
    "function galleryWheelAbsoluteScale()",
    "function clearGalleryWheelZoomPreview()",
  );
  const settle = sliceBetween(
    app,
    "function scheduleGalleryWheelZoomCommit(",
    "async function commitGalleryWheelZoom(",
  );
  const commit = sliceBetween(
    app,
    "async function commitGalleryWheelZoom(",
    "function handleGalleryWheel(",
  );
  assert.match(
    target,
    /GALLERY_LEVEL_SCALE\[clampGalleryZoom\(galleryWheelPreviewBaseLevel\)\]/,
  );
  assert.match(target, /Math\.exp\(galleryWheelPreviewLog\)/);
  assert.match(settle, /void commitGalleryWheelZoom\(\)/);
  assert.match(
    commit,
    /galleryWheelNearestLevel\(galleryWheelAbsoluteScale\(\)\)/,
  );
  assert.doesNotMatch(settle, /galleryWheelPreviewBaseLevel \* Math\.exp/);
  assert.doesNotMatch(commit, /galleryWheelPreviewBaseLevel \* Math\.exp/);
});

test("图库与相簿共用同一套缩放判定和档位样式", () => {
  const app = read("web/app.js");
  const styles = read("web/styles.css");

  const canZoom = sliceBetween(
    app,
    "const canZoomGallery = () => {",
    "/* ---------------------- 照片网格布局",
  );
  assert.match(canZoom, /state\.activeId === "library"/);
  assert.match(canZoom, /!!albumById\(state\.activeId\)/);

  /* 档位样式挂在 .photo-grid 上，图库和相簿渲染的是同一种网格。 */
  for (const level of [1, 2, 3, 4, 5]) {
    assert.match(
      styles,
      new RegExp(`\\.photo-grid\\.gallery-zoom-${level} \\{`),
    );
  }

  const albumView = sliceBetween(
    app,
    "function renderAlbumView(album) {",
    "function renderLibraryView()",
  );
  const libraryView = sliceBetween(
    app,
    "function renderLibraryView()",
    "function photoWallAlbumCoverUrl(",
  );
  for (const view of [albumView, libraryView]) {
    assert.match(view, /galleryZoomClasses\(\)/);
    assert.match(view, /progressivePhotoGridHTML\(/);
  }
});
