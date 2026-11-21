"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const root = path.resolve(__dirname, "..");
const css = fs.readFileSync(path.join(root, "web", "styles.css"), "utf8");

function rule(selector) {
  const escaped = selector
    .trim()
    .split(/\s+/)
    .map((part) => part.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
    .join("\\s*");
  const match = css.match(new RegExp(`${escaped}\\s*\\{([^}]*)\\}`));
  assert.ok(match, `missing rule: ${selector}`);
  return match[1];
}

test("胶片预览会覆盖模糊标题栏并保持顶部背景透明", () => {
  const toolbar = rule("body.filmstrip-view-mode .main > .toolbar");

  assert.match(toolbar, /position:\s*absolute/);
  assert.match(toolbar, /inset:\s*0 0 auto/);
  assert.match(toolbar, /background:\s*transparent/);
  assert.match(toolbar, /border-bottom-color:\s*transparent/);
  assert.match(toolbar, /backdrop-filter:\s*none/);
});
