const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { spawnSync } = require("node:child_process");
const test = require("node:test");

const root = path.resolve(__dirname, "..");
const wallAssets = [
  "PhotoWallMasonry-_qPngKll.js",
  "PhotoWallFilmroll-BfTKsO-t.js",
  "PhotoWallFolia-3NPRz3QQ.js",
  "InterlockWall-DJHsiduu.js",
];
const wallPath = (name) => path.join(root, "web", "photo-wall", "assets", name);

function wallSource(name) {
  return fs.readFileSync(wallPath(name), "utf8");
}

function exitBlock(source, startMarker, endMarker) {
  const start = source.indexOf(startMarker);
  const end = source.indexOf(endMarker, start);
  assert.ok(start >= 0 && end > start, "退出动画代码块应存在");
  return source.slice(start, end);
}

test("四种照片墙 bundle 均可作为 ES 模块解析", () => {
  for (const name of wallAssets) {
    const checked = spawnSync(
      process.execPath,
      ["--input-type=module", "--check"],
      { input: wallSource(name), encoding: "utf8" },
    );
    assert.equal(
      checked.status,
      0,
      `${name} 存在语法错误：\n${checked.stderr}`,
    );
  }
});

test("四种照片墙的退场同时等待淡化与缩退", () => {
  const masonry = exitBlock(
    wallSource("PhotoWallMasonry-_qPngKll.js"),
    "qt = (0, f.useCallback)(() => {",
    "}, [q, J, K, Q, W, Z]),",
  );
  assert.match(masonry, /Promise\.allSettled\(\[\.\.\.r, \.\.\.i\]/);
  assert.match(masonry, /revealSchedule\(e, 600\)/);
  assert.ok((masonry.match(/duration: 200/g) || []).length >= 3);

  const filmroll = exitBlock(
    wallSource("PhotoWallFilmroll-BfTKsO-t.js"),
    "Tt = (0, c.useCallback)(() => {",
    "}, [bt, $]);",
  );
  assert.match(filmroll, /Promise\.allSettled\(\[\.\.\.o, \.\.\.s\]/);
  assert.doesNotMatch(filmroll, /Promise\.allSettled\(o\.map/);
  assert.match(filmroll, /revealSchedule\(\$\(\), 600\)/);
  assert.ok((filmroll.match(/duration: 200/g) || []).length >= 3);

  const folia = exitBlock(
    wallSource("PhotoWallFolia-3NPRz3QQ.js"),
    "$e = (0, o.useCallback)(() => {",
    "}, [Je, B, qe]);",
  );
  assert.match(folia, /Promise\.allSettled\(\[\.\.\.a, \.\.\.o\]/);
  assert.doesNotMatch(folia, /Promise\.allSettled\(a\.map/);
  assert.match(folia, /revealSchedule\(e, 600\)/);
  assert.ok((folia.match(/duration: 200/g) || []).length >= 3);

  const interlock = exitBlock(
    wallSource("InterlockWall-DJHsiduu.js"),
    "ht = (0, u.useCallback)(() => {",
    "}, [U, ft]);",
  );
  assert.match(interlock, /Promise\.allSettled\(i\.map/);
  assert.match(interlock, /revealSchedule\(ft\(\), 600\)/);
  assert.ok((interlock.match(/duration: 200/g) || []).length >= 3);
});

test("嵌合拼图按视口距离限流预取并可在退出时取消排队", () => {
  const source = wallSource("InterlockWall-DJHsiduu.js");
  assert.match(source, /\bre = 6,/);
  assert.match(source, /\bSe = 80,/);
  assert.match(source, /\.slice\(0, 96\)/);
  assert.match(source, /function Pe\(stopped = !1\)/);
  assert.match(source, /if \(stopped\) \{\s*Ne = \[\];\s*return;/);
});

test("照片墙首屏等待全部可见图片，并保留统一异常兜底", () => {
  const shared = fs.readFileSync(
    path.join(
      root,
      "web",
      "photo-wall",
      "assets",
      "wallTransition-D4nOEmCV.js",
    ),
    "utf8",
  );
  assert.match(
    shared,
    /let r = e\.flatMap\(\(e\) => \[\.\.\.e\.querySelectorAll\(`img`\)\]\),/,
  );
  assert.doesNotMatch(shared, /\.slice\(0, n\)/);

  const masonry = wallSource("PhotoWallMasonry-_qPngKll.js");
  assert.match(masonry, /timeoutMs: 4000/);

  const filmroll = wallSource("PhotoWallFilmroll-BfTKsO-t.js");
  assert.match(filmroll, /timeoutMs: 4000/);

  const folia = wallSource("PhotoWallFolia-3NPRz3QQ.js");
  assert.match(folia, /timeoutMs: 4000/);

  const interlock = wallSource("InterlockWall-DJHsiduu.js");
  assert.match(interlock, /timeoutMs: 4000/);
});

test("入场按画布左上角距离排序，退出使用反向延迟", () => {
  const shared = fs.readFileSync(
    path.join(
      root,
      "web",
      "photo-wall",
      "assets",
      "wallTransition-D4nOEmCV.js",
    ),
    "utf8",
  );
  assert.match(
    shared,
    /Math\.max\(0, e\.left - t\.left\) \+ Math\.max\(0, e\.top - t\.top\)/,
  );
  assert.match(shared, /function s\(e, t = 900\)/);
  for (const name of wallAssets) {
    assert.match(wallSource(name), /revealSchedule\(/);
  }
});

test("相簿栏开关与顶部时间、窗口按钮共用照片墙显隐编排", () => {
  const html = fs.readFileSync(path.join(root, "web", "index.html"), "utf8");
  const app = fs.readFileSync(path.join(root, "web", "app.js"), "utf8");
  const css = fs.readFileSync(path.join(root, "web", "styles.css"), "utf8");

  assert.match(
    html,
    /日常状态保持在与项目区相同的合成层[\s\S]*id="sidebarRailBtn"/,
  );
  assert.match(
    app,
    /function moveNodePreservingState\(parent, node, before = null\)[\s\S]*parent\.moveBefore\(node, before\)[\s\S]*parent\.insertBefore\(node, before\)/,
  );
  assert.match(
    app,
    /function detachSidebarRailForPhotoWall\(\)[\s\S]*button\.before\(marker\)[\s\S]*moveNodePreservingState\(document\.body, button\)/,
  );
  assert.match(
    app,
    /function restoreSidebarRailAfterPhotoWall\(\)[\s\S]*moveNodePreservingState\(marker\.parentNode, button, marker\)[\s\S]*marker\.remove\(\)/,
  );
  const sidebarMoveBlock = app.slice(
    app.indexOf("function detachSidebarRailForPhotoWall"),
    app.indexOf("function preparePhotoWallBackdrop"),
  );
  assert.doesNotMatch(sidebarMoveBlock, /replaceChild|appendChild/);
  assert.doesNotMatch(
    css,
    /body\.photo-wall-mode \.toolbar\s*\{\s*display:\s*none;/,
  );
  assert.match(
    css,
    /body\.photo-wall-exiting \.toolbar,\s*body\.photo-wall-exiting \.window-controls\s*\{/,
  );
  assert.match(
    css,
    /opacity 160ms var\(--ease-out\),\s*visibility 0s linear 160ms/,
  );
  assert.match(
    css,
    /opacity var\(--menu-motion-duration\) var\(--menu-motion-ease\) 360ms,\s*visibility 0s linear 360ms/,
  );
  assert.match(
    css,
    /body\.photo-wall-exiting #sidebarRailBtn\s*\{\s*opacity: 0 !important;\s*visibility: hidden !important;/,
  );
});

test("纵向画廊聚焦使用点击前矩形的 FLIP，避免尺寸首帧突跳", () => {
  const source = wallSource("PhotoWallMasonry-_qPngKll.js");
  assert.match(
    source,
    /n\.classList\.contains\(`is-focus-anchor`\) \|\|\s*t\.set/,
  );
  assert.match(
    source,
    /let previous = e\.get\(card\.dataset\.cardKey\);[\s\S]*card\.getBoundingClientRect\(\)[\s\S]*card\.animate\(/,
  );
  assert.match(source, /previous\.width \/ next\.width/);
  assert.match(source, /previous\.height \/ next\.height/);
  assert.match(source, /dx = \(previous\.left - next\.left\) \/ cameraZoom/);
  assert.match(source, /dy = \(previous\.top - next\.top\) \/ cameraZoom/);
  assert.match(source, /animation\.pause\(\);\s*animation\.currentTime = 0/);
  assert.match(
    source,
    /for \(let \{ animation \} of flipAnimations\) animation\.play\(\)/,
  );
  assert.match(source, /card\.style\.transition = `none`/);
  const disableTransitions = source.indexOf(
    "for (let card of flipCards) card.style.transition = `none`",
  );
  const forceFinalLayout = source.indexOf("void panel.offsetWidth");
  const measureTarget = source.indexOf(
    "let next = card.getBoundingClientRect()",
    forceFinalLayout,
  );
  assert.ok(disableTransitions >= 0);
  assert.ok(forceFinalLayout > disableTransitions);
  assert.ok(measureTarget > forceFinalLayout);
  assert.match(source, /flipToken = \+\+focusTransitionToken\.current/);
  assert.match(source, /focusTransitionToken\.current !== flipToken\) return;/);
  assert.match(
    source,
    /e\.style\.removeProperty\(`transition`\),[\s\S]*e\.style\.removeProperty\(`transform-origin`\),[\s\S]*e\.style\.removeProperty\(`transform`\),[\s\S]*e\.style\.removeProperty\(`will-change`\)/,
  );
  assert.match(source, /focusMotionLayoutFrozen\.current = !0/);
  assert.match(source, /focusMotionLayoutFrozen\.current \|\| te\(/);
  assert.match(
    source,
    /requestAnimationFrame\(\(\) => requestAnimationFrame\(resolve\)\)/,
  );
  assert.match(source, /\.catch\(finishFlip\)/);
});
