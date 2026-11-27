"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const root = path.resolve(__dirname, "..");
const app = fs.readFileSync(path.join(root, "web", "app.js"), "utf8");
const styles = fs.readFileSync(path.join(root, "web", "styles.css"), "utf8");

test("开启分类评级后五颗星立即完整可见", () => {
  const syncViewerRating = app.slice(
    app.indexOf("function syncViewerRating"),
    app.indexOf("function updateRatingTile"),
  );
  const ratingHelper = app.slice(
    app.indexOf("function syncRatingControlMode"),
    app.indexOf("function syncFilmstripRating"),
  );

  assert.match(
    app,
    /function viewerRatingHTML\(item\)[\s\S]*Array\.from\(\{ length: 5 \}/,
  );
  assert.match(
    syncViewerRating,
    /const enabled =[\s\S]*state\.ratingMode[\s\S]*syncRatingControlMode\(rating, enabled\)/,
  );
  assert.match(
    ratingHelper,
    /container\.hidden = !enabled[\s\S]*classList\.toggle\("is-rating-active", enabled\)/,
  );
  assert.match(
    styles,
    /\.viewer-rating\.is-rating-active,[\s\S]*\.viewer-rating\.is-rating-active \.viewer-rating-star \{[\s\S]*opacity: 1;[\s\S]*visibility: visible;/,
  );
  assert.match(
    styles,
    /\.viewer-rating-star:not\(\.is-filled\) svg path \{[\s\S]*fill: none;[\s\S]*stroke: currentColor;[\s\S]*stroke-width: 1\.55;/,
  );
});

test("从胶片预览开启分类评级时留在胶片预览并显示星级", () => {
  const setRatingMode = app.slice(
    app.indexOf("function setRatingMode"),
    app.indexOf(
      "function setFilmstripPosition",
      app.indexOf("function setRatingMode"),
    ),
  );

  assert.match(
    setRatingMode,
    /state\.ratingMode = next;[\s\S]*syncFilmstripRating\(\)/,
  );
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

test("胶片预览星级会随当前照片同步，并区分点击与键盘反馈", () => {
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
    /applyRatingState\(\[item\.id\], nextRating\)[\s\S]*syncFilmstripRating\(item, \{ pop \}\)/,
  );
  assert.doesNotMatch(saveFilmstripRating, /setFilmstripMode\(false\)/);
});

test("胶片预览点击评级回弹当前星级，数字键直接更新", () => {
  const keydown = app.slice(
    app.indexOf('document.addEventListener("keydown"'),
    app.indexOf("/* ------------------------------ 启动"),
  );
  const bounce = app.slice(
    app.indexOf("function bounceRatingStar"),
    app.indexOf("function syncViewerRating"),
  );

  assert.match(
    keydown,
    /state\.filmstrip && !state\.select[\s\S]*?state\.ratingMode[\s\S]*?\/\^\[0-5\]\$\/\.test\(key\)[\s\S]*?void saveFilmstripRating\(Number\(key\), \{ pop: false \}\)/,
  );
  assert.match(
    app,
    /void saveFilmstripRating\(Number\(filmstripRatingStar\.dataset\.viewerRating\)\);/,
  );
  assert.match(
    bounce,
    /querySelector\(\s*`\[data-viewer-rating="\$\{normalizeItemRating\(value\)\}"\]`,?\s*\)/,
  );
  assert.match(bounce, /star\.animate\(/);
  assert.match(bounce, /transform: "scale\(0\.9\)"/);
  assert.match(bounce, /transform: "scale\(1\.08\)"/);
  assert.match(bounce, /prefers-reduced-motion: reduce/);
  assert.match(bounce, /duration: reduceMotion \? 140 : 240/);
  assert.match(app, /if \(pop\) \{\s*bounceRatingStar\(rating, value\);\s*\}/);
  assert.doesNotMatch(app, /is-just-rated/);
});
