"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const root = path.resolve(__dirname, "..");
const wallPath = (name) => path.join(root, "web", "photo-wall", "assets", name);
const masonry = fs.readFileSync(
  wallPath("PhotoWallMasonry-_qPngKll.js"),
  "utf8",
);
const filmroll = fs.readFileSync(
  wallPath("PhotoWallFilmroll-BfTKsO-t.js"),
  "utf8",
);

test("纵向画廊卡片在清晰图加载前保留预览背景", () => {
  assert.match(
    masonry,
    /backgroundImage:\s*u\s*\?\s*`url\(\$\{JSON\.stringify\(u\)\}\)`/,
  );
  assert.match(
    filmroll,
    /backgroundImage:\s*c\s*\?\s*`url\(\$\{JSON\.stringify\(c\)\}\)`/,
  );
});

test("纵向画廊图片失败时回退到通用缩略图", () => {
  assert.match(
    masonry,
    /function masonryFallbackUrl\(e, t\)[\s\S]*\/api\/thumb\/\$\{encodeURIComponent\(e\.id\)\}\?size=\$\{t\}&fit=inside/,
  );
  assert.match(masonry, /masonryFallbackUrl\(e\.item, 900\)/);
  assert.match(masonry, /masonryFallbackUrl\(e\.item, 180\)/);
});
