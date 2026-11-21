"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const root = path.resolve(__dirname, "..");
const app = fs.readFileSync(path.join(root, "web", "app.js"), "utf8");
const styles = fs.readFileSync(path.join(root, "web", "styles.css"), "utf8");

const syncSelbar = app.slice(
  app.indexOf("function syncSelbar()"),
  app.indexOf("function selbarFocusableActions()"),
);

test("选择计数把数字包成可滚动的 span，数值变化时滚入", () => {
  assert.match(syncSelbar, /class="selbar-count-num"/);
  assert.match(syncSelbar, /count\.dataset\.value/);
  assert.match(syncSelbar, /prevValue !== nextValue/);
  assert.match(
    syncSelbar,
    /numEl\.animate\([\s\S]*?translateY\(0\.55em\)[\s\S]*?duration: 180/,
  );
  /* 减少动态时不滚 */
  assert.match(syncSelbar, /prefers-reduced-motion: reduce/);
  /* 文案本身不变，仍走各语言 / 编号 / 回收站分支 */
  assert.match(syncSelbar, /已选择 \$\{state\.selected\.size\}/);
  assert.match(syncSelbar, /selected`/);
});

test("计数数字 inline-block + 等宽，滚动时宽度不抖", () => {
  assert.match(
    styles,
    /\.selbar-count-num \{[\s\S]*?display: inline-block;[\s\S]*?font-variant-numeric: tabular-nums;/,
  );
});

test("勾选角标只淡入，不缩放或推动照片", () => {
  assert.match(
    styles,
    /\.photo-grid \.tile\.is-selected \.tile-check \{[\s\S]*?animation: tile-check-fade/,
  );
  assert.match(styles, /@keyframes tile-check-fade/);
  const kf = styles.slice(
    styles.indexOf("@keyframes tile-check-fade"),
    styles.indexOf(".tile-check.is-numbering"),
  );
  assert.doesNotMatch(kf, /transform:\s*scale/);
  assert.doesNotMatch(kf, /forwards/);
  assert.match(
    styles,
    /@media \(prefers-reduced-motion: reduce\) \{\s*\.photo-grid \.tile\.is-selected \.tile-check \{\s*animation: none;/,
  );
});

test("选择角标始终包含勾号，编号模式保留独立序号层", () => {
  const sync = app.slice(
    app.indexOf("function syncTileCheckMark("),
    app.indexOf("function syncGridSelectionClasses("),
  );
  const gridSync = app.slice(
    app.indexOf("function syncGridSelectionClasses("),
    app.indexOf("function toggleTrashAlbumSelected("),
  );
  const numbering = app.slice(
    app.indexOf("function refreshNumberingBadges("),
    app.indexOf("function startNumberingSession("),
  );

  assert.match(sync, /badge\.insertAdjacentHTML\("afterbegin", ICON_CHECK\)/);
  assert.match(sync, /const value = numbered \? String\(ordinal\) : ""/);
  assert.match(
    sync,
    /if \(number\.textContent !== value\) number\.textContent = value/,
  );
  assert.doesNotMatch(sync, /badge\.(?:innerHTML|textContent)\s*=/);
  assert.match(
    gridSync,
    /syncTileCheckMark\(tile, ordinals\.get\(index\) \|\| 0\)/,
  );
  assert.match(numbering, /syncTileCheckMark\(tile, ordinal\)/);
  assert.doesNotMatch(numbering, /badge\.textContent\s*=\s*ordinal/);
  assert.match(styles, /\.tile-check-number \{\s*display: none;/);
  assert.match(
    styles,
    /\.tile-check\.is-numbering \.tile-check-number \{\s*display: block;/,
  );
  assert.match(
    styles,
    /\.tile-check\.is-numbering \.tile-check-number \{\s*display: block;\s*width: 100%;\s*text-align: center;\s*transform: translateY\(-0\.5px\);/,
  );
  const preserve = app.slice(
    app.indexOf("const previousCheck = tile.querySelector"),
    app.indexOf("fresh.replaceWith(tile)"),
  );
  assert.doesNotMatch(preserve, /previousCheck\.textContent\s*=/);
  assert.match(preserve, /syncTileCheckMark\(\s*tile,\s*/);
});

test("批量编号的序号更新不重复播放角标淡入", () => {
  assert.match(
    styles,
    /#content\.numbering-mode \.photo-grid \.tile\.is-selected \.tile-check \{\s*animation: none;/,
  );
});
