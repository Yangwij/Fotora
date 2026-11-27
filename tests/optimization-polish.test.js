"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const root = path.resolve(__dirname, "..");
const app = fs.readFileSync(path.join(root, "web", "app.js"), "utf8");
const css = fs.readFileSync(path.join(root, "web", "styles.css"), "utf8");

function functionSource(name, nextName) {
  const start = app.indexOf(`function ${name}(`);
  const end = app.indexOf(`function ${nextName}(`, start);
  assert.ok(start >= 0, `${name} should exist`);
  assert.ok(end > start, `${nextName} should follow ${name}`);
  return app.slice(start, end);
}

test("顶栏菜单在视口高度不足时从工具栏下方开始滚动", () => {
  const placement = functionSource("placeMenu", "snapshotSettingsDraft");
  assert.match(
    placement,
    /const clampedTop = inToolbar \? toolbarBottom : POPOVER_EDGE_GAP;/,
  );
  assert.match(placement, /vh - clampedTop - POPOVER_EDGE_GAP/);
  assert.match(
    placement,
    /if \(clamped\) \{\s*menu\.style\.maxHeight = `\$\{maxMenuHeight\}px`;\s*top = clampedTop;/,
  );
  assert.match(
    css,
    /\.popmenu\.is-viewport-clamped \{[\s\S]*?overflow-y: auto;[\s\S]*?box-shadow:/,
  );
});

test("项目信息卡省略不存在的拍摄参数并保留下方可用内容", () => {
  const info = functionSource("updateViewerInfoPopover", "renderViewerInfoMap");
  assert.doesNotMatch(info, /item\.iso \? `ISO \$\{item\.iso\}` : "-"/);
  assert.doesNotMatch(info, /\? `\$\{Math\.round\(item\.focal\)\} mm` : "-"/);
  assert.match(info, /\.filter\(Boolean\);/);
  assert.match(info, /\.filter\(\(value\) => value && value !== "-"\)/);
  assert.match(info, /summaryNode\.hidden = summary\.length === 0;/);
  assert.match(info, /specsNode\.hidden = specs\.length === 0;/);
  assert.match(info, /--viewer-spec-count/);
  assert.match(css, /\.viewer-info-specs\[hidden\]\s*\{\s*display: none;/);
  assert.match(
    css,
    /grid-template-columns: repeat\(\s*var\(--viewer-spec-count, 5\)/,
  );
});

test("查看器计数直接显示完整数字且不使用底色包裹", () => {
  const counterStyle =
    css.match(/\.viewer-counter\s*\{([\s\S]*?)\}/)?.[1] || "";
  assert.match(counterStyle, /font-variant-numeric: tabular-nums;/);
  assert.doesNotMatch(
    counterStyle,
    /background|box-shadow|backdrop-filter|border-radius|padding:\s*[1-9]/,
  );
  assert.match(app, /function formatCount\(value\)/);
  assert.match(app, /`\$\{viewerIndex \+ 1\}\/\$\{state\.items\.length\}`/);
  assert.doesNotMatch(
    app,
    /formatCount\(viewerIndex \+ 1\)|formatCount\(state\.items\.length\)/,
  );
  assert.match(
    app,
    /`<div class="card-count">\$\{formatCount\(album\.count\)\}<\/div>`/,
  );
});

test("相簿名和文件名保留在可读文本中，不再创建鼠标悬停提示", () => {
  assert.doesNotMatch(app, /\btitle="\$\{esc\(albumDisplayName\(album\)\)\}"/);
  assert.doesNotMatch(app, /\btitle="\$\{esc\(album\.displayName\)\}"/);
  assert.doesNotMatch(app, /\btitle\.title\s*=/);
  assert.doesNotMatch(app, /\$\("#viewerInfoName"\)\.title\s*=/);
  assert.match(
    app,
    /<div class="card-title">\$\{esc\(albumDisplayName\(album\)\)\}<\/div>/,
  );
  assert.match(
    app,
    /\$\("#viewerInfoName"\)\.textContent =\s*fileNameStem\(item\.name\) \|\| "未命名项目";/,
  );
});

test("图库筛选和选择计数使用区分明确且本地化的标签", () => {
  assert.match(app, /id: "type", label: "媒体类型", icon: "format"/);
  assert.match(app, /id: "extension", label: "文件格式", icon: "funnel"/);
  assert.match(
    app,
    /const selectedCount = formatCount\(state\.selected\.size\);/,
  );
  assert.match(
    app,
    /const countHTML = esc\(countText\)\.replace\(\s*\/\[\\d,\]\+/,
  );
  assert.match(
    app,
    /function trashBulkCountText\(items, albumIds\)[\s\S]*formatCount\(items\.length\)[\s\S]*formatCount\(albumIds\.length\)/,
  );
});

test("键盘触发的收藏与评级立即更新，不播放装饰回弹", () => {
  const favorite = functionSource("syncViewerFavorite", "syncFavoriteTile");
  assert.doesNotMatch(favorite, /is-just-toggled|offsetWidth|pop/);
  assert.doesNotMatch(
    css,
    /viewer-favorite-pop|viewer-favorite\.is-just-toggled/,
  );
  assert.match(
    app,
    /async function saveViewerRating\(value, \{ pop = true \} = \{\}\)/,
  );
  assert.match(
    app,
    /async function saveFilmstripRating\(value, \{ pop = true \} = \{\}\)/,
  );
  assert.match(
    app,
    /void saveViewerRating\(Number\(key\), \{ pop: false \}\);/,
  );
  assert.match(
    app,
    /void saveFilmstripRating\(Number\(key\), \{ pop: false \}\);/,
  );
  assert.match(
    app,
    /void saveViewerRating\(Number\(button\.dataset\.viewerRating\)\);/,
  );
  assert.match(
    app,
    /void saveFilmstripRating\(Number\(filmstripRatingStar\.dataset\.viewerRating\)\);/,
  );
});
