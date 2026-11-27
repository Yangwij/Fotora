"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const root = path.resolve(__dirname, "..");
const app = fs.readFileSync(path.join(root, "web", "app.js"), "utf8");
const windowControls = fs.readFileSync(
  path.join(root, "web", "window-controls.js"),
  "utf8",
);

function sourceBetween(start, end) {
  const from = app.indexOf(start);
  const to = app.indexOf(end, from);
  assert.ok(from >= 0, `找不到起点：${start}`);
  assert.ok(to > from, `找不到终点：${end}`);
  return app.slice(from, to);
}

test("四种照片墙的入口、播放数据和 iframe 布局一一对应", () => {
  const starts = sourceBetween(
    "async function startPhotoWallPlayback(",
    "async function openPhotoWallPlaybackAlbum(",
  );
  assert.match(starts, /wallKind: "tile"/);
  assert.match(starts, /wallKind: "masonry"/);
  assert.match(starts, /wallKind: "filmroll"/);
  assert.match(starts, /wallKind: "mosaic"/);

  const mount = sourceBetween(
    "function mountPhotoWallApp()",
    "function unmountPhotoWallApp()",
  );
  assert.match(mount, /layout=interlock/);
  assert.match(mount, /layout=filmroll/);
  assert.match(mount, /layout=masonry/);
  assert.match(mount, /\/photo-wall\/index\.html"/);

  const payload = sourceBetween(
    "function photoWallAppPayload()",
    "function postPhotoWallData(",
  );
  assert.match(payload, /wallKind,/);
  assert.match(payload, /mosaicMode\s*\?\s*"interlock"/);
  assert.match(payload, /filmrollMode\s*\?\s*"filmroll"/);
  assert.match(payload, /masonryMode\s*\?\s*"masonry"/);
  assert.match(payload, /: "photo"/);
});

test("快速连续选择多个照片墙时只允许最后一次启动", () => {
  const launch = sourceBetween(
    "async function launchPhotoWallPlayback(",
    "function setPhotoWall(",
  );
  assert.match(launch, /const launchSeq = \+\+photoWallLaunchSeq/);
  assert.match(launch, /await leavePhotoWallMode\(\)/);
  assert.match(launch, /launchSeq !== photoWallLaunchSeq/);
  assert.match(launch, /state\.photoWallPlayback = playback/);

  const starts = sourceBetween(
    "async function startPhotoWallPlayback(",
    "async function openPhotoWallPlaybackAlbum(",
  );
  const guards = starts.match(/requestSeq !== photoWallPlaybackOpenSeq/g) || [];
  assert.ok(guards.length >= 8, "异步获取返回后必须逐处作废旧入口");
  assert.match(starts, /return launchPhotoWallPlayback\(playback\)/);
});

test("照片墙专辑切换仍保留嵌合拼图数据和返回层级", () => {
  const open = sourceBetween(
    "async function openPhotoWallPlaybackAlbum(",
    "function backPhotoWallLevel()",
  );
  assert.match(open, /playback\.wallKind === "mosaic"/);
  assert.match(open, /loadMosaicWallData\(\[Number\(albumId\)\]\)/);
  assert.match(open, /playback\.wallKind === "masonry"/);
  assert.match(open, /playback\.wallKind === "filmroll"/);
});

test("普通照片墙不预解码整套嵌合拼图缩略图", () => {
  const launch = sourceBetween(
    "function startCurrentPhotoWallAlbumPlayback()",
    "function randomPhotoWallSeed()",
  );
  assert.doesNotMatch(launch, /warmMosaicWallThumbnails\(/);
  assert.match(launch, /void launchPhotoWallPlayback\(playback\)/);
});

test("首次图库不可浏览时，所有全库入口都有统一防线", () => {
  for (const marker of [
    "function ensureActiveLibraryFeature()",
    'state.activeId === "photoWall"',
  ]) {
    assert.ok(app.includes(marker), `缺少保护：${marker}`);
  }

  const guards = app.match(/ensureActiveLibraryFeature\(\)/g) || [];
  assert.ok(guards.length >= 12, "集合入口的统一保护没有接到足够多的路径");
  const select = sourceBetween(
    "async function select(id)",
    "let emptyFavoritesNavigation",
  );
  assert.match(select, /ensureActiveLibraryFeature\(\)/);
  const setWall = sourceBetween(
    "function setPhotoWall(enabled)",
    "function startCurrentPhotoWallAlbumPlayback()",
  );
  assert.match(setWall, /ensureActiveLibraryFeature\(\)/);
  const menuAction = sourceBetween(
    'const albumOptions = menuKind === "album"',
    "/* 展开筛选 / 类型 / 排序时",
  );
  assert.match(
    menuAction,
    /if \(albumOptions && !ensureActiveLibraryFeature\(\)\) return;/,
  );
  const filmstrip = sourceBetween(
    "function setFilmstripMode(enabled)",
    "function setFilmstripPosition(",
  );
  assert.match(filmstrip, /ensureActiveLibraryFeature\(\)/);
});

test("右上角窗口按钮只改变窗口状态，不刷新图库数据", () => {
  assert.doesNotMatch(windowControls, /\bfetch\(/);
  assert.doesNotMatch(windowControls, /\brender\(/);
  assert.doesNotMatch(windowControls, /\bapplyExternalUpdate\(/);
  assert.doesNotMatch(windowControls, /\breload\(/);
  assert.match(windowControls, /api\.minimize\(\)/);
  assert.match(windowControls, /api\.toggleMaximize\(\)/);
  assert.match(windowControls, /toggleFullscreen\(\)/);
});
