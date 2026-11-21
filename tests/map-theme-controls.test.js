const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");

test("位置确认按钮使用当前主题强调色", () => {
  const css = read("web/map/map.css");
  const confirmRule = css.match(/\.location-confirm\s*\{([\s\S]*?)\n\}/)?.[1];
  const hoverRule = css.match(
    /\.location-confirm:hover:not\(:disabled\)\s*\{([\s\S]*?)\n\}/,
  )?.[1];

  assert.match(confirmRule, /background:\s*var\(--accent\)/);
  assert.match(confirmRule, /box-shadow:[\s\S]*var\(--accent-shadow,/);
  assert.match(hoverRule, /color-mix\(in srgb, var\(--accent\)/);
  assert.doesNotMatch(hoverRule, /#168cff|rgba\(10, 132, 255/);
});

test("照片地图聚合数字使用当前主题强调色", () => {
  const css = read("web/map/globe-map.css");
  const badgeRule = css.match(/\.pm-group-badge\s*\{([\s\S]*?)\n\}/)?.[1];
  const js = read("web/map/embedded-globe.js");

  assert.match(badgeRule, /background:\s*var\(--accent,\s*#0a84ff\)/);
  assert.match(badgeRule, /box-shadow:[\s\S]*var\(--accent-shadow,/);
  assert.doesNotMatch(badgeRule, /background:\s*#0a84ff/);
  assert.match(js, /themeAccentColor\(\)[\s\S]*getPropertyValue\("--accent"\)/);
  assert.match(js, /context\.fillStyle = this\.themeAccentColor\(\)/);
});
