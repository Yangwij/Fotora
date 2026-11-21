const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const root = path.resolve(__dirname, "..");
const appSource = fs.readFileSync(path.join(root, "web", "app.js"), "utf8");
const wallHtml = fs.readFileSync(
  path.join(root, "web", "photo-wall", "index.html"),
  "utf8",
);
const wallCss = fs.readFileSync(
  path.join(root, "web", "photo-wall", "assets", "index-Bw9XBx1B.css"),
  "utf8",
);

test("照片墙载入层隐藏时释放曲线 SVG 与动画帧", () => {
  const hideBlock = appSource.slice(
    appSource.indexOf("function hidePhotoWallLoading"),
    appSource.indexOf("function clearPhotoWallEnterTimeout"),
  );
  assert.ok(
    (hideBlock.match(/disposeLemniscateCurveLoaders\(layer\)/g) || []).length >=
      2,
    "立即隐藏和淡出完成后都应释放载入器",
  );

  const disposeStart = appSource.indexOf(
    "function disposeLemniscateCurveLoaders",
  );
  const disposeBlock = appSource.slice(
    disposeStart,
    appSource.indexOf(
      '\nroseCurveLoaderMotion.addEventListener("change"',
      disposeStart,
    ),
  );
  assert.match(disposeBlock, /instance\.group\.replaceChildren\(\)/);
  assert.match(disposeBlock, /removeAttribute\("data-curve-loader-ready"\)/);
  assert.match(
    disposeBlock,
    /cancelAnimationFrame\(lemniscateCurveLoaderFrame\)/,
  );
});

test("照片墙载入层再次显示前会重新创建载入器", () => {
  const showBlock = appSource.slice(
    appSource.indexOf("function showPhotoWallLoading"),
    appSource.indexOf("function hidePhotoWallLoading"),
  );
  assert.match(showBlock, /hydrateLemniscateCurveLoaders\(\)/);
  assert.match(showBlock, /restartLemniscateCurveLoader\(layer\)/);
});

test("照片墙 iframe 不再创建独立的双纽线加载器", () => {
  assert.doesNotMatch(wallHtml, /photo-wall\/loading-circle\.js/);
  assert.doesNotMatch(wallHtml, /class="photo-wall-loading"/);
  assert.match(
    wallCss,
    /\.photo-wall-loading\s*\{[\s\S]*display:\s*none !important;/,
  );
});
