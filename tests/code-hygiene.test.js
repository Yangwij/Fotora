"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const root = path.join(__dirname, "..");
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");

test("不再保留没有调用入口的地图照片栏调度函数", () => {
  const app = read("web/app.js");

  assert.doesNotMatch(app, /function scheduleAlbumMapFilmstripHide\(/);
  assert.doesNotMatch(app, /function albumMapFilmstripPointerIsNear\(/);
});

test("不再保留没有调用入口的思考曲线重启函数", () => {
  const app = read("web/app.js");
  assert.doesNotMatch(app, /function restartThinkingFiveLoader\(/);
});

test("设置弹窗不再保留未生成的旧说明、空状态和快捷键按钮样式", () => {
  const css = read("web/settings-dialog.css");

  assert.doesNotMatch(css, /\.ux-settings-note\b/);
  assert.doesNotMatch(css, /\.ux-settings-empty\b/);
  assert.doesNotMatch(css, /\.ux-settings-shortcut-open\b/);
});

test("设置齿轮只由当前设置弹窗绑定点击入口", () => {
  const app = read("web/app.js");
  const dialog = read("web/settings-dialog.js");

  assert.doesNotMatch(
    app,
    /\$\("#sidebarOptionsBtn"\)\.addEventListener\("click"/,
  );
  assert.match(
    dialog,
    /trigger\.addEventListener\(\s*"click",[\s\S]*?event\.stopImmediatePropagation\(\)/,
  );
});

test("语言同步在 iframe 尚未创建 body 时安全跳过首次遍历", () => {
  const language = read("web/ui-language.js");
  const treeBlock = language.slice(
    language.indexOf("function translateTree("),
    language.indexOf("function connectObserver("),
  );
  const setBlock = language.slice(
    language.indexOf("function setLanguage("),
    language.indexOf(
      "window.FotoraLanguage",
      language.indexOf("function setLanguage("),
    ),
  );

  assert.match(
    treeBlock,
    /if \(!root\) \{\s*observer\?\.takeRecords\(\);\s*return;\s*\}/,
  );
  assert.match(
    setBlock,
    /if \(translateNow && document\.body\) translateTree\(document\.body\)/,
  );
});

test("旧侧栏 ghost-btn 样式已移除，现用底栏样式保留", () => {
  const styles = read("web/styles.css");

  assert.doesNotMatch(styles, /\.ghost-btn\b/);
  assert.doesNotMatch(styles, /#trashNavBtn[^{}]*\.stack-glyph/);
  assert.match(styles, /\.sidebar-foot-card #trashNavBtn/);
  assert.match(styles, /^\.stack-glyph\s*\{/m);
});

test("旧地点图标和三图标底栏样式已移除，现用底部卡片保留", () => {
  const styles = read("web/styles.css");

  assert.doesNotMatch(styles, /\.nav-location-icon\b/);
  assert.doesNotMatch(styles, /\.sidebar-foot-actions\b/);
  assert.doesNotMatch(styles, /\.sidebar-foot-icon\b/);
  assert.match(styles, /^\.sidebar-foot\s*\{/m);
  assert.match(styles, /^\.sidebar-foot-count\s*\{/m);
});

test("未生成的旧缩略图、失败占位和父页面照片墙绘制样式已移除", () => {
  const styles = read("web/styles.css");

  for (const selector of [
    "\\.thumb\\.t2",
    "\\.thumb\\.t4",
    "\\.tile-fallback",
    "\\.photo-wall-lattice",
    "\\.photo-wall-style-more",
    "\\.menu-leading-down",
  ]) {
    assert.doesNotMatch(styles, new RegExp(selector));
  }
  assert.match(styles, /\.photo-grid \.tile\.failed::after/);
});

test("旧父页面照片墙绘制和相机交互已移除，iframe 编排保留", () => {
  const app = read("web/app.js");
  const styles = read("web/styles.css");

  for (const marker of [
    "photoWallCamera",
    "photoWallPan",
    "photoWallWheel",
    "photoWallViewport",
    "photoWallWorld",
    "beginPhotoWallPan",
    "panPhotoWallWithWheel",
    "openPhotoWallFocus",
    "schedulePhotoWallLayout",
  ]) {
    assert.ok(!app.includes(marker), `${marker} should be removed`);
  }
  for (const selector of [
    "\\.photo-wall-shell",
    "\\.photo-wall-atmosphere",
    "\\.photo-wall-viewport",
    "\\.photo-wall-head",
    "\\.photo-wall-exit(?!ing)\\b",
    "\\.photo-wall-focus-",
    "\\.photo-grid\\.photo-wall-grid",
    "\\.photo-wall-item",
  ]) {
    assert.doesNotMatch(styles, new RegExp(selector));
  }
  assert.match(app, /function mountPhotoWallApp\(/);
  assert.match(app, /function handlePhotoWallAppMessage\(/);
  assert.match(styles, /^\.photo-wall-frame\s*\{/m);
});

test("已不存在的图库切换和导入按钮不再保留设置链路", () => {
  const app = read("web/app.js");
  const dialog = read("web/settings-dialog.js");
  const styles = read("web/styles.css");
  const main = read("electron/main.js");
  const runtime = `${app}\n${dialog}\n${styles}\n${main}`;

  for (const marker of [
    "importLibraryBtn",
    "librarySwitchBtn",
    "hideImportLibraryButton",
    "hideLibrarySwitchButton",
    "import-library-hover-only",
    "library-switch-hover-only",
  ]) {
    assert.ok(!runtime.includes(marker), `${marker} should be removed`);
  }
});

test("旧设置菜单渲染器和专用样式已从运行时代码移除", () => {
  const app = read("web/app.js");
  const styles = read("web/styles.css");
  const runtime = `${app}\n${styles}`;

  for (const marker of [
    "settings-region",
    "is-region-settings",
    "settings-menu-open",
    "settingsActiveCategory",
    "SETTINGS_REGION_GROUPS",
    "data-setting-id",
    "data-settings-category",
  ]) {
    assert.ok(!runtime.includes(marker), `${marker} should be removed`);
  }
});

test("独立主题和设置预览产物已经退役", () => {
  for (const retired of [
    "settings-dialog-preview.html",
    "theme-preview",
    "启动主题版.cmd",
    "README-主题版.md",
    "release-spacingfix",
  ]) {
    assert.equal(
      fs.existsSync(path.join(root, retired)),
      false,
      `${retired} should not return`,
    );
  }
});

test("最近删除底栏与普通导航行使用同一视觉层级", () => {
  const html = read("web/index.html");
  const styles = read("web/styles.css");
  const row = styles.match(
    /\.sidebar-foot-card #trashNavBtn\.sidebar-foot-album\s*\{([\s\S]*?)\}/,
  );

  assert.match(html, /class="sidebar-trash-icon"/);
  assert.doesNotMatch(html, /sidebar-trash-cover-(?:back|front)/);
  assert.doesNotMatch(styles, /sidebar-trash-cover-(?:back|front)/);
  assert.ok(row);
  assert.match(row[1], /gap:\s*12px;/);
  assert.match(row[1], /padding:\s*0 12px;/);
  assert.match(row[1], /background:\s*transparent;/);
  assert.match(row[1], /border:\s*0;/);
  assert.match(row[1], /box-shadow:\s*none;/);

  const label = styles.match(/\.sidebar-trash-label\s*\{([\s\S]*?)\}/);
  assert.ok(label);
  assert.match(label[1], /text-align:\s*left;/);

  const footer = styles.match(/\.sidebar-foot\s*\{([\s\S]*?)\}/g)?.at(-1);
  assert.ok(footer);
  assert.match(
    footer,
    /padding:\s*20px calc\(15px - var\(--window-frame\) \/ 2\) 2px\s+calc\(15px \+ var\(--window-frame\) \/ 2\);/,
  );
});

test("不再保留零引用的界面命名与地图照片栏薄包装函数（037 清扫）", () => {
  const app = read("web/app.js");

  assert.doesNotMatch(app, /function interfaceFieldDisplayName\(/);
  assert.doesNotMatch(app, /function applyInterfaceName\(/);
  assert.doesNotMatch(app, /function setLocationsMapFilmstripRevealed\(/);
  assert.doesNotMatch(app, /function setAlbumMapFilmstripRevealed\(/);
  assert.doesNotMatch(app, /function revealAlbumMapFilmstrip\(/);
});

test("不再保留从未接线的设置提示僵尸文件（038 清扫）", () => {
  assert.equal(fs.existsSync(path.join(root, "web/settings-hints.js")), false);
  const html = read("web/index.html");
  assert.doesNotMatch(html, /settingsOptionHint|settings-hints/);
});

test("语言同步在文档被丢弃时安全跳过，不抛未捕获异常（038 压测修复）", () => {
  const language = read("web/ui-language.js");
  const connect = language.slice(
    language.indexOf("function connectObserver("),
    language.indexOf("function setLanguage("),
  );
  assert.match(connect, /const root = document\.documentElement;/);
  assert.match(connect, /if \(!root\) return;/);
  assert.match(connect, /try \{\s*observer\.observe\(root,/);
  assert.match(connect, /catch \{\s*\/\*[\s\S]*?\*\/\s*observer = null;/);
  const setLang = language.slice(
    language.indexOf("function setLanguage("),
    language.indexOf(
      "window.FotoraLanguage",
      language.indexOf("function setLanguage("),
    ),
  );
  assert.match(setLang, /if \(!document\.documentElement\) return;/);
  /* DOMContentLoaded 回调与立即执行分支都先守卫再取 documentElement.lang。 */
  const boot = language.slice(language.indexOf("if (document.readyState"));
  assert.match(
    boot,
    /DOMContentLoaded",\s*\(\) => \{\s*if \(!document\.documentElement\) return;/,
  );
});
