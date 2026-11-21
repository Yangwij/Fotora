"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const root = path.join(__dirname, "..");
const app = fs.readFileSync(path.join(root, "web", "app.js"), "utf8");

test("所有相簿与照片墙右侧相簿不在入场末帧取消合成动画", () => {
  const reveal = app.slice(
    app.indexOf("function revealAlbumCards()"),
    app.indexOf("const CONTENT_REVEAL_PENDING_CLASS"),
  );

  assert.match(app, /class="album-card photo-wall-library-card/);
  assert.match(
    app,
    /changed &&\s*animate &&\s*document\.querySelector\("#content \.photo-wall-library-accordion"\)[\s\S]*?revealAlbumCards\(\);/,
  );
  assert.match(reveal, /albumCardRevealAnims\.push\(opacity, motion\);/);
  assert.doesNotMatch(reveal, /opacity\.cancel\(\);/);
  assert.doesNotMatch(reveal, /motion\.cancel\(\);/);
  assert.match(
    reveal,
    /cancelAlbumCardReveal\(\) 会在替换内容前统一清理这些动画。/,
  );
});
