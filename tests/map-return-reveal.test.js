const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const root = path.resolve(__dirname, "..");
const app = fs.readFileSync(path.join(root, "web", "app.js"), "utf8");

test("退出相簿地图直接恢复照片且不重播入场", () => {
  const closeAlbumMap = app.slice(
    app.indexOf("function closeAlbumMap"),
    app.indexOf("let viewerMapContext", app.indexOf("function closeAlbumMap")),
  );
  assert.match(
    closeAlbumMap,
    /render\(\);[\s\S]*content\.scrollTop = returnScroll;[\s\S]*syncVirtualPhotoGridWindowNow\(\);[\s\S]*revealRightContent\(\{ animateEntrance: false \}\);/,
  );
  assert.doesNotMatch(
    closeAlbumMap,
    /requestAnimationFrame\([\s\S]*scrollTop = returnScroll/,
  );
  assert.doesNotMatch(closeAlbumMap, /revealAlbumPhotos\(|revealAlbumCards\(/);
});

test("地图退出只淡化地图，不再移动或淡化照片区", () => {
  const animateMapHostExit = app.slice(
    app.indexOf("function animateMapHostExit"),
    app.indexOf(
      "function mountLocationsMap",
      app.indexOf("function animateMapHostExit"),
    ),
  );
  assert.match(
    animateMapHostExit,
    /const hostAnimation = host\.animate\(\[\{ opacity: 1 \}, \{ opacity: 0 \}\]/,
  );
  assert.doesNotMatch(
    animateMapHostExit,
    /content\.animate\(|MAP_HOST_EXIT_RISE_PX|MAP_HOST_EXIT_CONTENT_MS/,
  );
});

test("无入场恢复会清除残留透明状态但不创建照片动画", () => {
  const revealRightContent = app.slice(
    app.indexOf("function revealRightContent"),
    app.indexOf(
      "function clearPhotoRevealVisuals",
      app.indexOf("function revealRightContent"),
    ),
  );
  assert.match(
    revealRightContent,
    /animateEntrance = true[\s\S]*if \(!animateEntrance\)[\s\S]*cancelAlbumCardReveal\(\);[\s\S]*clearPhotoRevealVisuals\([\s\S]*releaseContentReveal\(\);[\s\S]*return;/,
  );
  assert.ok(
    revealRightContent.indexOf("if (!animateEntrance)") <
      revealRightContent.indexOf("revealAlbumPhotos()"),
  );
});

test("照片入场重跑前会清除上一轮透明状态并支持减少动态效果", () => {
  assert.match(
    app,
    /function clearPhotoRevealVisuals\(grids\)[\s\S]*classList\.remove\("is-album-revealing"\)[\s\S]*style\.removeProperty\("opacity"\)/,
  );
  assert.match(
    app,
    /async function revealAlbumPhotos\(\)[\s\S]*clearPhotoRevealVisuals\(grids\);[\s\S]*prefers-reduced-motion: reduce/,
  );
});
