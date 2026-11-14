"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const root = path.resolve(__dirname, "..");
const app = fs.readFileSync(path.join(root, "web", "app.js"), "utf8");

test("从胶片预览开启分类评级时留在胶片预览并显示星级", () => {
  const setRatingMode = app.slice(
    app.indexOf("function setRatingMode"),
    app.indexOf("function setFilmstripPosition", app.indexOf("function setRatingMode")),
  );

  assert.match(setRatingMode, /state\.ratingMode = next;[\s\S]*syncFilmstripRating\(\)/);
  assert.doesNotMatch(setRatingMode, /setFilmstripMode\(false\)/);
  assert.doesNotMatch(setRatingMode, /\btoast\(/);
  assert.doesNotMatch(
    setRatingMode,
    /state\.items\.forEach\(\(item, index\) => syncRatingTile/,
  );
});

test("评级标记只同步已经渲染的照片格", () => {
  const syncRenderedRatingTiles = app.slice(
    app.indexOf("function syncRenderedRatingTiles"),
    app.indexOf("async function saveViewerRating"),
  );

  assert.match(
    syncRenderedRatingTiles,
    /querySelectorAll\([\s\S]*#content \.photo-grid \.tile\[data-index\][\s\S]*updateRatingTile/,
  );
  assert.doesNotMatch(syncRenderedRatingTiles, /\btileAt\(/);
});

test("胶片预览星级会随当前照片同步并可在原位保存", () => {
  assert.match(
    app,
    /data-filmstrip-rating[\s\S]*role="group" aria-label="照片分类评级"/,
  );
  assert.match(
    app,
    /function syncFilmstripRating\(\s*item[\s\S]*state\.filmstrip && state\.ratingMode && item\?\.kind === "photo"[\s\S]*viewerRatingHTML\(item\)/,
  );
  const saveFilmstripRating = app.slice(
    app.indexOf("async function saveFilmstripRating"),
    app.indexOf("async function saveViewerRating"),
  );
  assert.match(
    saveFilmstripRating,
    /applyRatingState\(\[item\.id\], nextRating\)[\s\S]*syncFilmstripRating\(item, \{ pop: true \}\)/,
  );
  assert.doesNotMatch(saveFilmstripRating, /setFilmstripMode\(false\)/);
});
