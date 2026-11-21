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
const settingsDialogCss = fs.readFileSync(
  path.join(root, "web", "settings-dialog.css"),
  "utf8",
);
const server = fs.readFileSync(path.join(root, "server", "index.js"), "utf8");

test("设置菜单以快捷键分类替代维护分类", () => {
  assert.match(
    settingsDialog,
    /id:\s*"shortcuts",\s*label:\s*"快捷键",\s*action:\s*"shortcuts"/,
  );
  assert.doesNotMatch(app, /label:\s*"键盘快捷键"/);
  assert.doesNotMatch(app, /label:\s*"维护"/);
  assert.doesNotMatch(app, /重新扫描图库/);
});

test("点击快捷键分类会在设置内容区直接显示快捷键列表", () => {
  assert.match(
    settingsDialog,
    /current\.action === "shortcuts"[\s\S]*?#shortcuts \.shortcuts-groups[\s\S]*?ux-settings-shortcuts/,
  );
  assert.match(
    settingsDialog,
    /nav\.addEventListener\("click"[\s\S]*?renderCategory\(next\.id\)/,
  );
});

test("快捷键列表不显示标题和右上角关闭按钮", () => {
  assert.doesNotMatch(html, /shortcutsTitle|shortcutsClose/);
  assert.doesNotMatch(app, /shortcutsClose/);
  assert.match(html, /role="dialog"[\s\S]*?aria-label="快捷键"/);
});

test("设置分类通过点击切换，并同步选中状态与滑块位置", () => {
  assert.match(
    settingsDialog,
    /button\.setAttribute\(\s*"aria-selected",\s*String\(button\.dataset\.uxCategory === id\)/,
  );
  assert.match(
    settingsDialog,
    /indicator\.style\.transform = `translateY\(\$\{activeButton\.offsetTop\}px\)`/,
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

test("窗口控件位于主题颜色下方并支持三种模式", () => {
  assert.match(
    settingsDialog,
    /key:\s*"colorMode"[\s\S]*?key:\s*"windowControlsStyle"[\s\S]*?\["windows",\s*"Windows"\][\s\S]*?\["macos",\s*"红绿灯"\][\s\S]*?\["hidden",\s*"隐藏"\]/,
  );
});

test("窗口控件默认使用 Windows 模式", () => {
  assert.match(
    app,
    /function normalizeWindowControlsStyle\(value\)[\s\S]*?:\s*"windows";/,
  );
});

test("设置分段按钮使用固定等宽列，选中时不会触发整排跳动", () => {
  assert.match(
    settingsDialogCss,
    /\.ux-settings-segmented\s*{[\s\S]*?width:\s*268px;[\s\S]*?max-width:\s*100%;[\s\S]*?grid-auto-columns:\s*minmax\(0,\s*1fr\);/,
  );
});

test("数字在单位左侧的剩余空间内居中", () => {
  assert.match(
    settingsDialogCss,
    /\.ux-settings-number \.ux-settings-input\s*\{[\s\S]*?flex:\s*1 1 auto;[\s\S]*?min-width:\s*0;[\s\S]*?padding:\s*0;[\s\S]*?text-align:\s*center;/,
  );
  assert.match(
    settingsDialogCss,
    /\.ux-settings-number > \[aria-hidden="true"\]\s*\{[\s\S]*?flex:\s*0 0 auto;/,
  );
});

test("白色选中滑块按等分列百分比定位，避免取整后错位", () => {
  assert.match(
    settingsDialog,
    /--ux-segment-count:\$\{options\.length\};--ux-segment-index:\$\{activeIndex\}/,
  );
  assert.match(
    settingsDialogCss,
    /\.ux-settings-segment-thumb\s*{[\s\S]*?left:\s*2px;[\s\S]*?width:\s*calc\(\(100% - 4px\) \/ var\(--ux-segment-count,\s*1\)\);[\s\S]*?translateX\(calc\(var\(--ux-segment-index,\s*0\) \* 100%\)\)/,
  );
});

test("设置弹窗横向收紧，减少右侧内容区留白", () => {
  assert.match(
    settingsDialogCss,
    /\.ux-settings-dialog\s*{[\s\S]*?width:\s*min\(720px,\s*calc\(100vw - 44px\)\);/,
  );
});

test("设置弹窗保留分段滑块和左侧分类的选择动效", () => {
  assert.match(settingsDialog, /class="ux-settings-segment-thumb"/);
  assert.match(
    settingsDialog,
    /toggle\.setAttribute\("aria-checked", String\(next\)\)/,
  );
  assert.doesNotMatch(
    settingsDialog.slice(
      settingsDialog.indexOf(
        'const toggle = event.target.closest("[data-ux-toggle]")',
      ),
      settingsDialog.indexOf(
        'const choice = event.target.closest("[data-ux-choice]")',
      ),
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
