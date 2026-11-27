"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const root = path.join(__dirname, "..");
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");

/* 只取某个选择器自己那一个规则块的声明，避免被同名后代选择器干扰。 */
function ruleBody(css, selector) {
  const start = css.indexOf(selector);
  assert.notEqual(start, -1, `找不到选择器：${selector}`);
  const open = css.indexOf("{", start);
  const close = css.indexOf("}", open);
  return css.slice(open + 1, close);
}

test("缩到正方形的三档把间隔和圆角一起归零，并启用半像素压缝", () => {
  const css = read("web/styles.css");

  for (const level of [1, 2, 3]) {
    const body = ruleBody(css, `.photo-grid.gallery-zoom-${level} {`);
    assert.match(
      body,
      /--photo-grid-current-gap:\s*0px;/,
      `gallery-zoom-${level} 间隔应为 0`,
    );
    assert.match(
      body,
      /--gallery-tile-radius:\s*0px;/,
      `gallery-zoom-${level} 圆角应为 0`,
    );
    assert.match(
      body,
      /--gallery-seam-bleed:\s*0\.5px;/,
      `gallery-zoom-${level} 应启用 0.5px 压缝`,
    );
  }
});

test("照片网格默认不压缝、圆角跟随设置，其余两档保持原样", () => {
  const css = read("web/styles.css");
  const grid = ruleBody(css, "\n.photo-grid {");

  assert.match(grid, /--gallery-tile-radius:\s*var\(--thumbnail-radius\);/);
  assert.match(grid, /--gallery-seam-bleed:\s*0px;/);

  for (const level of [4, 5]) {
    const body = ruleBody(css, `.photo-grid.gallery-zoom-${level} {`);
    assert.doesNotMatch(
      body,
      /--gallery-seam-bleed:\s*0\.5px;/,
      `gallery-zoom-${level} 不应压缝`,
    );
  }
});

test("CSS 网格档用负 margin 让格子互相压住亚像素接缝", () => {
  const css = read("web/styles.css");
  const tile = ruleBody(css, "\n.photo-grid .tile {");

  assert.match(
    tile,
    /margin-right:\s*calc\(-1 \* var\(--gallery-seam-bleed\)\);/,
  );
  assert.match(
    tile,
    /margin-bottom:\s*calc\(-1 \* var\(--gallery-seam-bleed\)\);/,
  );
  /* 离屏占位高度要把压出去的半像素算回来，否则未渲染的行会矮半像素。 */
  assert.match(
    tile,
    /contain-intrinsic-size:[\s\S]*?calc\(var\(--photo-tile-size\) \+ var\(--gallery-seam-bleed\)\)/,
  );
});

test("绝对定位的网格把 margin 归零，改由 JS 盒子压缝，避免双重叠加", () => {
  const css = read("web/styles.css");

  assert.match(
    css,
    /\.photo-grid\.photo-grid-windowed \.tile \{[^}]*?margin:\s*0;/,
  );
  assert.match(
    css,
    /\.photo-grid\.photo-layout-justified \.tile,[\s\S]*?\.photo-grid\.photo-grid-windowed \.tile \{[^}]*?position:\s*absolute;/,
  );
});

test("JS 布局按 --gallery-seam-bleed 把每个盒子朝右下各撑大", () => {
  const app = read("web/app.js");

  assert.match(
    app,
    /function photoLayoutSeamBleed\(grid\)[\s\S]*?--gallery-seam-bleed/,
  );
  assert.match(
    app,
    /function growPhotoBoxesForSeam\(boxes, bleed\)[\s\S]*?box\.width \+= bleed;[\s\S]*?box\.height \+= bleed;/,
  );
  /* bleed 为 0 时原样返回，不做任何改动。 */
  assert.match(
    app,
    /function growPhotoBoxesForSeam\(boxes, bleed\)\s*\{\s*if \(!\(bleed > 0\)[\s\S]*?return boxes;/,
  );
  assert.match(app, /const seamBleed = photoLayoutSeamBleed\(grid\);/);
  assert.match(app, /growPhotoBoxesForSeam\(result\.boxes, seamBleed\);/);
});

test("删除动画的替身带上当前档位，无缝档不会闪出圆角", () => {
  const app = read("web/app.js");

  assert.match(
    app,
    /ghost\.className = `photo-grid gallery-square gallery-zoom-\$\{clampGalleryZoom\(/,
  );
  assert.match(app, /photo-delete-ghost`;/);
});
