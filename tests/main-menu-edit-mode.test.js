const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const root = path.resolve(__dirname, "..");
const app = fs.readFileSync(path.join(root, "web", "app.js"), "utf8");
const html = fs.readFileSync(path.join(root, "web", "index.html"), "utf8");
const css = fs.readFileSync(path.join(root, "web", "styles.css"), "utf8");

test("主菜单右键进入编辑模式并只打开内部菜单", () => {
  const contextHandler = app.slice(
    app.indexOf('$("#albumMenuBtn").addEventListener("contextmenu"'),
    app.indexOf('$("#filmstripBtn").addEventListener'),
  );
  assert.match(contextHandler, /e\.preventDefault\(\)/);
  assert.match(
    contextHandler,
    /openMenu\(button, kind, \{ albumMenuEdit: true \}\)/,
  );
});

test("编辑模式点击栏目只切换隐藏草稿，不执行原菜单动作", () => {
  const menuClick = app.slice(
    app.indexOf('$("#popMenu").addEventListener("click"'),
    app.indexOf("const rootSwitchMenuOpen"),
  );
  assert.match(
    menuClick,
    /if \(albumMenuEditMode\)[\s\S]*data-menu-edit-choice[\s\S]*toggleAlbumMenuChoice\(row\)[\s\S]*return;/,
  );

  const toggle = app.slice(
    app.indexOf("function toggleAlbumMenuChoice"),
    app.indexOf("/* 摆位："),
  );
  assert.match(toggle, /albumMenuHiddenDraft\.add\(id\)/);
  assert.match(toggle, /albumMenuHiddenDraft\.delete\(id\)/);
  assert.match(toggle, /classList\.toggle\("is-menu-hidden-choice", hidden\)/);
});

test("打勾提交隐藏项，普通左键菜单过滤隐藏栏目", () => {
  const clickHandler = app.slice(
    app.indexOf('$("#albumMenuBtn").addEventListener("click"'),
    app.indexOf('$("#albumMenuBtn").addEventListener("contextmenu"'),
  );
  assert.match(clickHandler, /albumMenuEditMode/);
  assert.match(clickHandler, /endAlbumMenuEditMode\(\{ commit: true \}\)/);
  assert.match(clickHandler, /closeMenu\(\)/);
  assert.match(
    app,
    /if \(!albumMenuEditMode && albumMenuHiddenItems\.has\(id\)\) return false;/,
  );
  assert.match(app, /if \(albumMenuEditMode\)[\s\S]*endAlbumMenuEditMode\(\);/);
  assert.match(app, /localStorage\.setItem\(\s*ALBUM_MENU_HIDDEN_ITEMS_KEY/);
});

test("主菜单隐藏项写入设置文件并在启动时恢复", () => {
  const snapshot = app.slice(
    app.indexOf("function persistentSettingsSnapshot()"),
    app.indexOf("function applyPersistentSettings("),
  );
  const restore = app.slice(
    app.indexOf("function applyPersistentSettings("),
    app.indexOf("async function hydratePersistentSettings()"),
  );
  const commit = app.slice(
    app.indexOf("function endAlbumMenuEditMode("),
    app.indexOf("function toggleAlbumMenuChoice("),
  );
  const main = fs.readFileSync(path.join(root, "electron", "main.js"), "utf8");
  assert.match(
    snapshot,
    /albumMenuHiddenItems:\s*\[\.\.\.albumMenuHiddenItems\]/,
  );
  assert.match(
    restore,
    /Array\.isArray\(settings\.albumMenuHiddenItems\)[\s\S]*ALBUM_MENU_ITEM_IDS\.has\(id\)[\s\S]*persistAlbumMenuHiddenItems\(\)/,
  );
  assert.match(
    commit,
    /persistAlbumMenuHiddenItems\(\);[\s\S]*persistPersistentSettings\(\)/,
  );
  assert.match(
    main,
    /Array\.isArray\(raw\.albumMenuHiddenItems\)[\s\S]*normalized\.albumMenuHiddenItems/,
  );
});

test("主菜单编辑态显示打勾按钮，红色栏目样式已定义", () => {
  assert.match(html, /class="menu-edit-confirm-icon"/);
  assert.match(
    css,
    /#albumMenuBtn\.is-menu-edit-mode \.menu-edit-confirm-icon/,
  );
  assert.match(css, /\.menu-row\.is-menu-hidden-choice[\s\S]*color: #ff3b30/);
});

test("相簿二级菜单展开：父菜单向右上缩 0.98、选项卡反向放大保持满宽", () => {
  const css = fs.readFileSync(path.join(root, "web", "styles.css"), "utf8");
  assert.match(
    css,
    /#popMenu\.is-album-options\.has-submenu-expanded,\s*#popMenu\.is-selection\.has-submenu-expanded \{\s*transform: scale\(0\.98\);\s*transform-origin: 100% 0;/,
  );
  assert.match(
    css,
    /#popMenu\.is-album-options\.has-submenu-expanded \.menu-submenu-group\.is-expanded,\s*#popMenu\.is-selection\.has-submenu-expanded \.menu-submenu-group\.is-expanded \{\s*transform: scale\(1\.0408163265\);/,
  );
  assert.match(
    css,
    /border-bottom-left-radius: var\(--menu-corner-radius-scaled\);/,
  );
  assert.match(css, /--menu-corner-radius: clamp\(22px, 8vw, 30px\);/);
});
