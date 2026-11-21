"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const root = path.resolve(__dirname, "..");
const app = fs.readFileSync(path.join(root, "web", "app.js"), "utf8");

test("确认面板缩放时重定位而非关闭，保住待确认的 Promise", () => {
  assert.match(app, /function placeAsk\(\)/);
  const askConfirm = app.slice(
    app.indexOf("function askConfirm("),
    app.indexOf("function askClose("),
  );
  assert.match(askConfirm, /askAnchorBtn = anchorBtn \|\| null;/);
  assert.match(askConfirm, /askCentered = centered;/);
  assert.match(askConfirm, /placeAsk\(\);/);
  assert.match(
    app,
    /window\.addEventListener\("resize", \(\) => \{\s*if \(askOpen\) placeAsk\(\);/,
  );
  /* 不再在 resize 里 askClose */
  assert.doesNotMatch(app, /if \(askOpen\) askClose\(false\)/);
});

test("相簿选择弹窗缩放时重定位，保住展开状态", () => {
  assert.match(
    app,
    /window\.addEventListener\("resize", \(\) => \{\s*if \(pickerOpen\) \{\s*placePicker\(\);\s*fitPickerColumns\(\);/,
  );
  assert.doesNotMatch(
    app,
    /window\.addEventListener\("resize", \(\) => closePicker\(\)\)/,
  );
});

test("主菜单缩放时按锚点按钮重定位，重排逻辑保留", () => {
  const handler = app.slice(
    app.indexOf('window.addEventListener("resize", () => {\n  if (menuOpen && menuAnchorBtn) placeMenu(menuAnchorBtn);'),
    app.indexOf('window.addEventListener("resize", () => {\n  if (menuOpen && menuAnchorBtn) placeMenu(menuAnchorBtn);') + 260,
  );
  assert.match(handler, /if \(menuOpen && menuAnchorBtn\) placeMenu\(menuAnchorBtn\);/);
  assert.match(handler, /schedulePhotoGridLayout\(\);/);
  assert.match(handler, /scheduleAlbumGridSpacing\(\);/);
  assert.match(app, /menuAnchorBtn = btn;/);
});
