"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const root = path.resolve(__dirname, "..");
const css = fs.readFileSync(path.join(root, "web", "styles.css"), "utf8");

/* 只取某个选择器自己那一个规则块的声明，避免被同名后代选择器干扰。 */
function ruleBody(selector) {
  const start = css.indexOf(selector);
  assert.notEqual(start, -1, `找不到选择器：${selector}`);
  const open = css.indexOf("{", start);
  const close = css.indexOf("}", open);
  return css.slice(open + 1, close);
}

test("照片网格的留白和照片共用同一只点击小手", () => {
  const grid = ruleBody("\n.photo-grid {");
  assert.match(grid, /cursor:\s*pointer;/);
  assert.doesNotMatch(grid, /cursor:\s*grab;/);

  const tile = ruleBody("\n.photo-grid .tile {");
  assert.match(tile, /cursor:\s*pointer;/);
});

test("选择模式下照片和留白一起回到普通箭头", () => {
  assert.match(
    css,
    /#content\.select-mode \.tile,\s*#content\.select-mode \.photo-grid\s*\{\s*cursor:\s*default;\s*\}/,
  );
});

test("按住留白上下拖动时仍然给抓手反馈", () => {
  assert.match(
    css,
    /#content\.is-drag-scrolling \.photo-grid\s*\{\s*cursor:\s*grabbing;\s*\}/,
  );
  assert.match(
    css,
    /#content\.is-drag-scrolling \.photo-grid \.tile\s*\{\s*cursor:\s*grabbing;\s*\}/,
  );
});
