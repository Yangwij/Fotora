"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const root = path.join(__dirname, "..");
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");

test("崩溃恢复视图同时写入会话存储和持久存储", () => {
  const app = read("web/app.js");
  const snapshot = app.slice(
    app.indexOf("function snapshotCurrentView()"),
    app.indexOf("function readLastViewSnapshot()"),
  );
  const restore = app.slice(
    app.indexOf("async function restoreActiveView()"),
    app.indexOf("async function restoreActiveView()") + 2200,
  );

  assert.match(snapshot, /for \(const storage of \[sessionStorage, localStorage\]\)/);
  assert.match(snapshot, /storage\.setItem\(LAST_VIEW_KEY, value\)/);
  assert.match(app, /function readLastViewSnapshot\(\)/);
  assert.match(restore, /const snap = readLastViewSnapshot\(\);/);
});

test("窗口在渲染进程重建期间使用主题中性底色而不是透明白帧", () => {
  const main = read("electron/main.js");

  assert.match(main, /function rendererBackgroundColor\(\)/);
  assert.match(
    main,
    /nativeTheme\.shouldUseDarkColors \? "#292a2c" : "#e9eaeb"/,
  );
  assert.match(main, /backgroundColor: rendererBackgroundColor\(\)/);
  assert.match(
    main,
    /mainWindow\.setBackgroundColor\(rendererBackgroundColor\(\)\)/,
  );
});

test("相簿切换期间关闭并锁定旧菜单，避免跨视图操作", () => {
  const app = read("web/app.js");
  const select = app.slice(
    app.indexOf("async function select(id)"),
    app.indexOf("let emptyFavoritesNavigation"),
  );
  const menuClick = app.slice(
    app.indexOf('$("#albumMenuBtn").addEventListener("click"'),
    app.indexOf('$("#albumMenuBtn").addEventListener("contextmenu"'),
  );

  assert.match(app, /let activeAlbumNavigationSeq = 0;/);
  assert.match(select, /if \(menuOpen\) closeMenu\(\);/);
  assert.match(select, /activeAlbumNavigationSeq = seq;/);
  assert.match(menuClick, /if \(activeAlbumNavigationSeq\) return;/);
});

test("菜单关闭后释放毛玻璃与动画合成层，避免残留旧菜单", () => {
  const app = read("web/app.js");
  const close = app.slice(
    app.indexOf("function closeMenu("),
    app.indexOf("const toggleMenu ="),
  );

  assert.match(
    close,
    /menu\.style\.setProperty\("--menu-glass-backdrop", "none"\)/,
  );
  assert.match(close, /menu\.style\.setProperty\("will-change", "auto"\)/);
  assert.match(close, /menu\.style\.contentVisibility = "hidden"/);
  assert.match(close, /menu\.replaceChildren\(\)/);
});
