const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const root = path.resolve(__dirname, "..");
const app = fs.readFileSync(path.join(root, "web", "app.js"), "utf8");
const html = fs.readFileSync(path.join(root, "web", "index.html"), "utf8");

test("R 快捷键按菜单顺序循环四种照片布局", () => {
  assert.match(
    app,
    /PHOTO_STYLE_CYCLE = Object\.freeze\(\[\s*"original",\s*"square",\s*"justified",\s*"masonry",?\s*\]\)/,
  );
  assert.match(app, /const currentIndex = PHOTO_STYLE_CYCLE\.indexOf/);
  assert.match(
    app,
    /PHOTO_STYLE_CYCLE\[\s*\(Math\.max\(0, currentIndex\) \+ 1\) % PHOTO_STYLE_CYCLE\.length\s*\]/,
  );
  assert.match(app, /applyPhotoStyle\(next, \{ dismissMenu: false \}\)/);

  const keyHandler = app.slice(
    app.indexOf('if (key === "r" || key === "R")'),
    app.indexOf('if (key === "e" || key === "E")'),
  );
  assert.match(keyHandler, /cyclePhotoStyle\(\)/);
  assert.doesNotMatch(keyHandler, /toggleRatio\(\)/);
});

test("菜单与快捷键共用当前布局判断", () => {
  assert.match(
    app,
    /function currentPhotoStyle\(\)\s*\{\s*return activePhotoStyle\(\);\s*\}/,
  );
  assert.match(app, /const active = currentPhotoStyle\(\);/);
});

test("快捷键说明提供照片布局切换", () => {
  assert.match(html, /切换照片布局[\s\S]*<kbd>R<\/kbd>/);
  assert.doesNotMatch(html, /正方形 \/ 原始比/);
});
