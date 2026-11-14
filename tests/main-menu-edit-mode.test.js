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

test("主菜单编辑态显示打勾按钮，红色栏目样式已定义", () => {
  assert.match(html, /class="menu-edit-confirm-icon"/);
  assert.match(
    css,
    /#albumMenuBtn\.is-menu-edit-mode \.menu-edit-confirm-icon/,
  );
  assert.match(css, /\.menu-row\.is-menu-hidden-choice[\s\S]*color: #ff3b30/);
});

test("相簿二级菜单底角按展开缩放反向补偿", () => {
  const css = fs.readFileSync(
    path.join(root, "web", "styles.css"),
    "utf8",
  );
  assert.match(
    css,
    /#popMenu\.is-album-options\.has-submenu-expanded\s*>\s*\.menu-submenu-group\.is-expanded\s*>\s*\.menu-submenu\s*\{\s*border-bottom-left-radius:\s*calc\(30px \/ 1\.0408163265\);\s*border-bottom-right-radius:\s*calc\(30px \/ 1\.0408163265\);/,
  );
});
