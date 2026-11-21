const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const root = path.resolve(__dirname, "..");
const app = fs.readFileSync(path.join(root, "web", "app.js"), "utf8");
const css = fs.readFileSync(path.join(root, "web", "styles.css"), "utf8");

test("胶片栏拖动使用按下时的位置连续映射指针位移", () => {
  assert.match(app, /strip\.scrollLeft = filmstripStripDrag\.scrollLeft - dx/);
  assert.match(app, /viewerFilmstripTrack\.scrollLeft = drag\.scrollLeft - dx/);
  assert.match(
    app,
    /strip\.style\.scrollBehavior = "auto"[\s\S]*filmstripStripDrag = \{/,
  );
  assert.match(
    app,
    /viewerFilmstripTrack\.style\.scrollBehavior = "auto"[\s\S]*viewerFilmstripDrag = \{/,
  );
});

test("胶片栏松手后按指针速度启动指数衰减惯性", () => {
  const helper = app.slice(
    app.indexOf("function startHorizontalFilmstripScrollInertia"),
    app.indexOf("let filmstripPanDrag"),
  );
  assert.match(helper, /speed < PHOTO_WALL_INERTIA\.minSpeed/);
  assert.match(helper, /Math\.exp\(-elapsed \/ 280\)/);
  assert.match(helper, /startedAt: null/);
  assert.match(
    helper,
    /if \(motion\.startedAt == null\) \{\s*motion\.startedAt = timestamp;\s*motion\.frame = requestAnimationFrame\(step\);\s*return;/,
  );
  assert.match(helper, /requestAnimationFrame\(step\)/);
  assert.match(helper, /prefers-reduced-motion: reduce/);

  assert.equal(
    (app.match(/startHorizontalFilmstripScrollInertia\(/g) || []).length,
    3,
    "主胶片栏和查看器胶片栏都应启动惯性，另含函数定义",
  );
  assert.match(app, /filmstripStripDrag\.velocity \+=/);
  assert.match(app, /drag\.velocity \+=/);
});

test("滚轮一格会累计为平滑滚动目标而不是直接跳一格", () => {
  const helper = app.slice(
    app.indexOf("function scrollHorizontalFilmstripByWheel"),
    app.indexOf("function startHorizontalFilmstripScrollInertia"),
  );
  assert.match(helper, /motion\.pending \+= delta/);
  assert.match(helper, /requestAnimationFrame\(step\)/);
  assert.match(
    helper,
    /Math\.exp\(-elapsed \/ ALBUM_WHEEL_SMOOTHING\.timeConstantMs\)/,
  );
  assert.match(helper, /prefers-reduced-motion: reduce/);
  assert.match(
    app,
    /scrollHorizontalFilmstripByWheel\(track, event\.deltaY \* unit\)/,
  );
  assert.match(app, /scrollHorizontalFilmstripByWheel\(track, delta \* unit\)/);
  assert.doesNotMatch(app, /scrollBy\(\{\s*left: event\.deltaY/);
});

test("水平胶片栏把横向手势交给自定义拖动", () => {
  assert.match(css, /\.filmstrip-strip \{[\s\S]*touch-action: pan-y/);
  assert.match(css, /\.viewer-filmstrip-track \{[\s\S]*touch-action: pan-y/);
});

test("底部胶片模式的横向滚动条上移且不改变其他胶片位置", () => {
  assert.match(
    css,
    /\.filmstrip-view\.filmstrip-bottom \.filmstrip-strip \{\s*height: calc\(100% - 6px\);\s*\}/,
  );
  assert.doesNotMatch(
    css,
    /\.filmstrip-view\.filmstrip-(?:top|left|right) \.filmstrip-strip \{\s*height: calc\(100% - 6px\);/,
  );
});

test("胶片栏快捷键切换照片但不主动移动键盘焦点", () => {
  const sync = app.slice(
    app.indexOf("function syncViewerFilmstrip("),
    app.indexOf("function openViewer("),
  );
  assert.doesNotMatch(sync, /\.focus\(/);
  assert.doesNotMatch(app, /restoreFilmstripKeyboardFocus/);
  const previewSync = app.slice(
    app.indexOf("function syncFilmstripView("),
    app.indexOf("function setFilmstripIndex("),
  );
  assert.doesNotMatch(previewSync, /\.focus\(/);
});

test("主胶片栏键盘滚动尊重减少动态效果", () => {
  const scroll = app.slice(
    app.indexOf("function scrollFilmstripThumbIntoView("),
    app.indexOf("function filmstripSourceSize("),
  );
  assert.match(
    scroll,
    /prefers-reduced-motion: reduce[\s\S]*\? "auto"[\s\S]*: behavior/,
  );
  assert.match(
    scroll,
    /top: Math\.min\(maxTop[\s\S]*behavior: resolvedBehavior/,
  );
  assert.match(
    scroll,
    /left: Math\.min\(maxLeft[\s\S]*behavior: resolvedBehavior/,
  );
});
