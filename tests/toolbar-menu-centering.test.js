"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const root = path.resolve(__dirname, "..");
const app = fs.readFileSync(path.join(root, "web", "app.js"), "utf8");
const css = fs.readFileSync(path.join(root, "web", "styles.css"), "utf8");
const html = fs.readFileSync(path.join(root, "web", "index.html"), "utf8");

function block(selector) {
  const start = css.indexOf(selector + " {");
  assert.ok(start >= 0, `missing ${selector}`);
  return css.slice(start, css.indexOf("}", start));
}

test("主菜单选项文字在行内上下居中", () => {
  const row = block(".menu-row");
  assert.match(row, /display: flex;/);
  assert.match(row, /align-items: center;/);
  /* 行高固定、无额外上下 padding，文字不会被挤偏。 */
  assert.match(row, /height: 44px;/);
  assert.match(row, /padding: 0 16px;/);
});

test("标题栏按钮文字/图标上下左右居中", () => {
  const icon = block(".icon-btn");
  assert.match(icon, /display: grid;/);
  assert.match(icon, /place-items: center;/);
  assert.match(icon, /transform-origin: 50% 50%;/);
  const pill = block(".pill-btn");
  assert.match(pill, /display: inline-flex;/);
  assert.match(pill, /align-items: center;/);
  assert.match(pill, /justify-content: center;/);
  assert.match(pill, /line-height: 1;/);
  const modes = block(".library-time-modes button");
  assert.match(modes, /display: inline-flex;/);
  assert.match(modes, /align-items: center;/);
  assert.match(modes, /justify-content: center;/);
  assert.match(modes, /line-height: 1;/);
});

test("菜单使用未缩放的按钮尺寸作为锚点", () => {
  const start = app.indexOf("function menuAnchorRect(");
  const end = app.indexOf("\n}\n\n/* 摆位：", start);
  assert.ok(start >= 0 && end > start, "missing menuAnchorRect");
  const source = `${app.slice(start, end + 2)}\nreturn menuAnchorRect;`;
  const anchorRect = new Function(source)();
  const settled = {
    left: 1489.38,
    top: 39.5,
    width: 27,
    height: 27,
  };
  const centerX = settled.left + settled.width / 2;
  const centerY = settled.top + settled.height / 2;
  const scaled = {
    left: centerX - (settled.width * 0.88) / 2,
    top: centerY - (settled.height * 0.88) / 2,
    width: settled.width * 0.88,
    height: settled.height * 0.88,
  };
  const rect = anchorRect({
    offsetWidth: settled.width,
    offsetHeight: settled.height,
    getBoundingClientRect: () => scaled,
  });

  assert.equal(rect.width, settled.width);
  assert.equal(rect.height, settled.height);
  assert.equal(rect.left, settled.left);
  assert.equal(rect.right, settled.left + settled.width);
  assert.equal(rect.top, settled.top);
  assert.equal(rect.bottom, settled.top + settled.height);

  const place = app.slice(
    app.indexOf("function placeMenu("),
    app.indexOf("function snapshotSettingsDraft("),
  );
  assert.match(place, /const r = menuAnchorRect\(btn\);/);
  assert.match(place, /const wantedLeft = r\.right - menu\.offsetWidth;/);
});

test("三点点点的中间点与圆钮圆心重合", () => {
  const buttonStart = html.indexOf('id="moreTopBtn"');
  const buttonEnd = html.indexOf("</button>", buttonStart);
  const button = html.slice(buttonStart, buttonEnd);
  assert.match(button, /viewBox="0 0 27 27"/);
  const dots = [...button.matchAll(/<circle cx="([\d.]+)" cy="([\d.]+)"/g)];
  assert.equal(dots.length, 3);
  assert.deepEqual(
    dots.map((match) => [Number(match[1]), Number(match[2])]),
    [
      [6.5, 13.5],
      [13.5, 13.5],
      [20.5, 13.5],
    ],
  );

  const container = block("#moreTopBtn");
  assert.match(container, /position: relative;/);
  assert.match(container, /width: var\(--toolbar-control-size\);/);
  assert.match(container, /height: var\(--toolbar-control-size\);/);
  assert.match(container, /transform-box: border-box;/);
  assert.match(container, /transform-origin: 50% 50%;/);
  const icon = block("#moreTopBtn > svg");
  assert.match(icon, /position: absolute;/);
  assert.match(icon, /inset: 0;/);
  assert.match(icon, /width: 100%;/);
  assert.match(icon, /height: 100%;/);
});
