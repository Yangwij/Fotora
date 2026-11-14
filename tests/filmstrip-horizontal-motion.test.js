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
