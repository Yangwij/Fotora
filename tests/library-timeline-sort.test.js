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
    /return \(\s*showTimelineScrubber &&\s*timelineGroupingViewActive\(\) &&\s*!photoWallSurfaceActive\(\)/,
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

test("相簿与图库共用时间按钮与右侧滑块", () => {
  const viewGate = app.slice(
    app.indexOf("function timelineGroupingViewActive()"),
    app.indexOf("function libraryTimelineIsVisible()"),
  );
  assert.match(
    viewGate,
    /state\.activeId === "library" \|\| Boolean\(albumById\(state\.activeId\)\)/,
  );
  const control = app.slice(
    app.indexOf("function syncLibraryTimelineModeControl("),
    app.indexOf("let libraryTimelineSyncFrame"),
  );
  assert.match(control, /timelineGroupingViewActive\(\) &&/);
  assert.match(
    control,
    /state\.roots\.length > 0 &&\s*state\.items\.length > 0;/,
  );
  const albumView = app.slice(
    app.indexOf("function renderAlbumView(album)"),
    app.indexOf("function renderLibraryView()"),
  );
  assert.match(albumView, /if \(state\.libraryTimelineMode !== "all"\) \{/);
  assert.match(albumView, /<div class="library-timeline-groups/);
  const load = app.slice(
    app.indexOf("async function loadAlbum("),
    app.indexOf("async function loadLibrary()"),
  );
  assert.match(load, /state\.albumItems = sortLibraryAlbumItems\(\);/);
  /* 分组开着时排序改不动顺序，菜单里就不该再出现排序入口。 */
  const albumMenu = app.slice(
    app.indexOf("const visibleGroups = ALBUM_MENU_GROUPS.map((group) => ({"),
    app.indexOf("const items = visibleGroups.flatMap((group) =>"),
  );
  assert.match(
    albumMenu,
    /id === "sort" &&\s*!albumMenuEditMode &&\s*timelineGroupingViewActive\(\) &&\s*state\.libraryTimelineMode !== "all"/,
  );
  assert.doesNotMatch(app, /label !== "排序"/);
});
