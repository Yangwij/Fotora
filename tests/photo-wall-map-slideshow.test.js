"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const root = path.resolve(__dirname, "..");
const app = fs.readFileSync(path.join(root, "web", "app.js"), "utf8");
const slideshow = fs.readFileSync(
  path.join(root, "web", "slideshow.js"),
  "utf8",
);
const slideshowCss = fs.readFileSync(
  path.join(root, "web", "slideshow.css"),
  "utf8",
);
const language = fs.readFileSync(
  path.join(root, "web", "ui-language.js"),
  "utf8",
);
const mapCss = fs.readFileSync(
  path.join(root, "web", "map", "globe-map.css"),
  "utf8",
);
const styles = fs.readFileSync(path.join(root, "web", "styles.css"), "utf8");

test("照片墙换风格恢复初始相簿卡片错落入场", () => {
  const switchKind = app.slice(
    app.indexOf("function setWallLibraryKind("),
    app.indexOf("function cancelActiveWallAlbumSelection("),
  );

  assert.doesNotMatch(switchKind, /WALL_KIND_ORDER\.indexOf\(next\)/);
  assert.match(switchKind, /revealAlbumCards\(\)/);
  assert.doesNotMatch(switchKind, /section\.animate\(/);
  assert.match(
    styles,
    /@media \(max-width: 1100px\) \{[\s\S]*?\.photo-wall-style-bar \{\s*grid-template-columns: repeat\(2, minmax\(0, 1fr\)\);/,
  );
});

test("卫星地图控件使用高对比玻璃底和当前文字色图标", () => {
  assert.match(
    mapCss,
    /\.globe-type-toggle > svg > rect \{\s*stroke: currentColor;\s*stroke-width: 1\.9;/,
  );
  assert.match(
    mapCss,
    /body\.is-satellite\s+:is\(\.globe-type-toggle, \.globe-compass-button, \.globe-close-button\)\s*\{\s*color: #f8fafc;\s*background: rgba\(18, 26, 34, 0\.44\);/,
  );
});

test("幻灯片使用分组计数，并保留完整标题文本而不创建悬停提示", () => {
  assert.match(
    slideshow,
    /const countFormat = new Intl\.NumberFormat\("zh-CN"\);/,
  );
  assert.match(
    slideshow,
    /counter\.textContent = `\$\{range\} \/ \$\{formatCount\(photos\.length\)\}`/,
  );
  assert.match(slideshow, /endTitle\.textContent = title\.textContent/);
  assert.match(slideshow, /title\.textContent = albumTitle \|\| "幻灯片"/);
  assert.doesNotMatch(slideshow, /\btitle\.title\s*=/);
  assert.doesNotMatch(slideshow, /\bendTitle\.title\s*=/);
  assert.match(
    slideshowCss,
    /\.slideshow-intro h2 \{[\s\S]*?overflow-wrap: anywhere;[\s\S]*?-webkit-line-clamp: 2;/,
  );
  assert.match(
    language,
    /第\\s\+\(\[\\d,\]\+\)\\s\+张，共\\s\+\(\[\\d,\]\+\)\\s\+张/,
  );
});
