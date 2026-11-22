const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const root = path.join(__dirname, "..");
const app = fs.readFileSync(path.join(root, "web", "app.js"), "utf8");
const css = fs.readFileSync(path.join(root, "web", "styles.css"), "utf8");

test("拖动滑块总开关与时间刻度显示逻辑相互独立", () => {
  const timeAware = app.slice(
    app.indexOf("function libraryTimelineUsesTime()"),
    app.indexOf("function libraryTimelineShowsTime()"),
  );
  const visible = app.slice(
    app.indexOf("function libraryTimelineIsVisible()"),
    app.indexOf("function libraryTimelineYearCounts()"),
  );
  const ticks = app.slice(
    app.indexOf("function libraryTimelineTickContent()"),
    app.indexOf("function libraryTimelineRatioAtEvent("),
  );

  assert.match(
    timeAware,
    /state\.libraryTimelineMode !== "all" \|\|[\s\S]*?state\.itemSort === "newest" \|\|[\s\S]*?state\.itemSort === "oldest"/,
  );
  assert.match(
    visible,
    /return \(\s*showTimelineScrubber &&\s*state\.activeId === "library" &&\s*!photoWallSurfaceActive\(\)/,
  );
  assert.match(ticks, /const showsTime = libraryTimelineShowsTime\(\);/);
  assert.match(ticks, /if \(!showsTime\) return;/);
});

test("四种照片墙模式不显示图库时间轴滑块", () => {
  const surface = app.slice(
    app.indexOf("function photoWallSurfaceActive()"),
    app.indexOf("function libraryTimelineIsVisible()"),
  );
  assert.match(surface, /state\.photoWall \|\|/);
  assert.match(surface, /state\.photoWallAlbumId \|\|/);
  assert.match(surface, /state\.masonryWallAlbumId \|\|/);
  assert.match(surface, /state\.filmrollWallAlbumId \|\|/);
  assert.match(surface, /state\.mosaicWallAlbumId/);
  assert.match(
    css,
    /body\.photo-wall-mode \.library-timeline-scrubber,[\s\S]*body\.photo-wall-library-active \.library-timeline-scrubber,[\s\S]*body\.photo-wall-exiting \.library-timeline-scrubber\s*\{[\s\S]*display:\s*none;/,
  );
});

test("所有照片保持连续网格，不创建时间分组标题", () => {
  const render = app.slice(
    app.indexOf("function renderLibraryView()"),
    app.indexOf("function photoWallAlbumCoverUrl("),
  );
  const grouped = render.indexOf('if (state.libraryTimelineMode !== "all") {');
  const continuous = render.lastIndexOf("return progressivePhotoGridHTML(");

  assert.ok(grouped >= 0);
  assert.ok(continuous > grouped);
});

test("仅重复点击当前时间分段按钮时在底部与顶部之间切换", () => {
  const setMode = app.slice(
    app.indexOf("function setLibraryTimelineMode("),
    app.indexOf("function syncLibraryTimelineModeControl("),
  );
  const toggleScroll = app.slice(
    app.indexOf("function toggleLibraryTimelineScrollEdge("),
    app.indexOf("function libraryTimelineUsesTime("),
  );

  assert.match(
    setMode,
    /if \(mode === state\.libraryTimelineMode\) \{\s*return toggleLibraryTimelineScrollEdge\(\);/,
  );
  assert.match(toggleScroll, /top: goToBottom \? content\.scrollHeight : 0,/);
  assert.match(
    toggleScroll,
    /libraryTimelineRepeatScrollEdge = goToBottom \? "top" : "bottom";/,
  );
  const toolbarBindingStart = app.indexOf(
    'bindWindowDragSurface($(".toolbar")',
  );
  assert.ok(toolbarBindingStart >= 0);
  const toolbarBindingEnd = app.indexOf(
    '$("#viewer").addEventListener',
    toolbarBindingStart,
  );
  assert.ok(toolbarBindingEnd > toolbarBindingStart);
  const toolbarBinding = app.slice(toolbarBindingStart, toolbarBindingEnd);
  assert.doesNotMatch(app, /scrollProjectAreaTo/);
  assert.doesNotMatch(toolbarBinding, /onClick:/);
});
