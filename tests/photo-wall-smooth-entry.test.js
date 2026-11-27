"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const root = path.resolve(__dirname, "..");
const app = fs.readFileSync(path.join(root, "web", "app.js"), "utf8");
const css = fs.readFileSync(path.join(root, "web", "styles.css"), "utf8");

function sourceBetween(start, end) {
  const from = app.indexOf(start);
  const to = app.indexOf(end, from);
  assert.ok(from >= 0, `找不到起点：${start}`);
  assert.ok(to > from, `找不到终点：${end}`);
  return app.slice(from, to);
}

test("照片墙快速启动不显示只闪一下的加载层", () => {
  const setWall = sourceBetween(
    "function setPhotoWall(enabled)",
    "function startCurrentPhotoWallAlbumPlayback()",
  );
  const set = sourceBetween(
    "async function select(id)",
    "let emptyFavoritesNavigation",
  );

  assert.match(app, /const PHOTO_WALL_LOADING_DELAY_MS = 320;/);
  assert.match(
    setWall,
    /showPhotoWallLoading\(\{\s*delay: PHOTO_WALL_LOADING_DELAY_MS,?\s*\}\)/,
  );
  assert.match(set, /nextId === "photoWall" \|\|\s*targetIsPhotoAlbum/);
  assert.match(set, /!contentCrossfade/);
});

test("照片墙首帧交接只使用合成友好的稳定层", () => {
  const loading = css.slice(
    css.indexOf(".photo-wall-loading-layer {"),
    css.indexOf(".photo-wall-loading-layer.is-visible"),
  );
  const frame = css.slice(
    css.indexOf(".photo-wall-frame {"),
    css.indexOf("html.photo-wall-glass-border .photo-wall-frame"),
  );
  const backdrop = css.slice(
    css.indexOf(".app.photo-wall-backdrop-animating {"),
    css.indexOf(".app.photo-wall-backdrop {"),
  );

  assert.doesNotMatch(loading, /backdrop-filter/);
  assert.match(loading, /background: color-mix\(in srgb, var\(--main-bg\) 96%/);
  assert.match(frame, /transition: none;/);
  assert.match(backdrop, /will-change: transform;/);
  assert.doesNotMatch(backdrop, /filter 560ms/);
  assert.match(
    app,
    /startContentCrossfadeFade\(contentCrossfadeMotion, "\.album-card"\)/,
  );
});
