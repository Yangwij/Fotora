"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const root = path.join(__dirname, "..");
const app = fs.readFileSync(path.join(root, "web", "app.js"), "utf8");
const html = fs.readFileSync(path.join(root, "web", "index.html"), "utf8");
const settingsDialog = fs.readFileSync(
  path.join(root, "web", "settings-dialog.js"),
  "utf8",
);
const server = fs.readFileSync(path.join(root, "server", "index.js"), "utf8");

test("设置菜单以快捷键分类替代维护分类", () => {
  assert.match(
    app,
    /id:\s*"shortcuts",\s*label:\s*"快捷键",\s*items:\s*Object\.freeze\(\[\]\)/,
  );
  assert.doesNotMatch(app, /label:\s*"键盘快捷键"/);
  assert.doesNotMatch(app, /label:\s*"维护"/);
  assert.doesNotMatch(app, /重新扫描图库/);
});

test("点击一级快捷键分类会直接打开快捷键列表", () => {
  assert.match(
    app,
    /next\.id === "shortcuts"[\s\S]*?openShortcuts\(\{[\s\S]*?dockedToSettings:\s*true/,
  );
  assert.match(
    app,
    /is-shortcuts-category[\s\S]*?settings-region-secondary-stage/,
  );
});

test("快捷键列表不显示标题和右上角关闭按钮", () => {
  assert.doesNotMatch(html, /shortcutsTitle|shortcutsClose/);
  assert.doesNotMatch(app, /shortcutsClose/);
  assert.match(html, /role="dialog"[\s\S]*?aria-label="快捷键"/);
});

test("鼠标落在一级分类上时始终显示对应内容", () => {
  assert.match(
    app,
    /function bindSettingsRegionCategoryHover[\s\S]*?addEventListener\("pointerenter", activate\)[\s\S]*?addEventListener\("mouseenter", activate\)/,
  );
  assert.match(
    app,
    /function activateSettingsRegionCategory[\s\S]*?setSettingsRegionCategory\(categoryId\)/,
  );
  assert.match(
    app,
    /addEventListener\("pointerover"[\s\S]*?activateSettingsRegionCategoryFromPointer[\s\S]*?addEventListener\("pointermove"[\s\S]*?activateSettingsRegionCategoryFromPointer/,
  );
});

test("图库不再提供手动重新扫描入口", () => {
  assert.doesNotMatch(app, /reimportCurrentRoot/);
  assert.doesNotMatch(server, /parts\[3\] === "reimport"/);
  assert.doesNotMatch(server, /parts\[3\] === "rescan"/);
});

test("设置弹窗使用独立地图来源、地图类型和照片栏状态", () => {
  assert.match(settingsDialog, /key:\s*"mapTileProvider"/);
  assert.match(settingsDialog, /\["amap",\s*"高德"\]/);
  assert.match(settingsDialog, /\["google",\s*"谷歌"\]/);
  assert.match(settingsDialog, /type:\s*"map-type"/);
  assert.match(settingsDialog, /key:\s*"showLocationMapFilmstrip"/);
  assert.match(app, /const SHOW_LOCATION_MAP_FILMSTRIP_KEY/);
});

test("设置中不提供窗口控件位置选项", () => {
  assert.doesNotMatch(settingsDialog, /窗口控件位置/);
  assert.doesNotMatch(app, /id:\s*"windowControls"/);
});

test("设置弹窗保留分段滑块和左侧分类的选择动效", () => {
  assert.match(settingsDialog, /class="ux-settings-segment-thumb"/);
  assert.match(
    settingsDialog,
    /toggle\.setAttribute\("aria-checked", String\(next\)\)/,
  );
  assert.doesNotMatch(
    settingsDialog.slice(
      settingsDialog.indexOf('const toggle = event.target.closest("[data-ux-toggle]")'),
      settingsDialog.indexOf('const choice = event.target.closest("[data-ux-choice]")'),
    ),
    /renderCategory\(activeCategory\)/,
  );
  assert.match(settingsDialog, /syncSegmentThumbs\(true\)/);
  assert.match(settingsDialog, /class="ux-settings-nav-indicator"/);
  assert.match(
    settingsDialog,
    /indicator\.style\.transform = `translateY\(\$\{activeButton\.offsetTop\}px\)`/,
  );
});

test("快捷键分类在设置右侧内容区显示", () => {
  assert.match(
    settingsDialog,
    /current\.action === "shortcuts"[\s\S]*?#shortcuts \.shortcuts-groups[\s\S]*?main\.innerHTML/,
  );
  assert.doesNotMatch(
    settingsDialog,
    /next\.action === "shortcuts"[\s\S]*?openShortcuts/,
  );
});

test("查看器中 W 和 S 与上下方向键执行旋转", () => {
  assert.match(
    app,
    /key === "ArrowUp"[\s\S]*?key === "w"[\s\S]*?key === "s"[\s\S]*?rotateViewer\(/,
  );
  assert.match(
    app,
    /key === "ArrowUp"[\s\S]*?key === "w"[\s\S]*?key === "s"[\s\S]*?rotateFilmstripMedia\(/,
  );
});
