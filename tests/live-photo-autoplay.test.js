"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const root = path.join(__dirname, "..");
const app = fs.readFileSync(path.join(root, "web", "app.js"), "utf8");
const dialog = fs.readFileSync(
  path.join(root, "web", "settings-dialog.js"),
  "utf8",
);
const main = fs.readFileSync(path.join(root, "electron", "main.js"), "utf8");
const language = fs.readFileSync(
  path.join(root, "web", "ui-language.js"),
  "utf8",
);

function section(source, start, end) {
  const from = source.indexOf(start);
  const to = source.indexOf(end, from);
  assert.ok(from >= 0, `missing block: ${start}`);
  assert.ok(to > from, `missing block end: ${end}`);
  return source.slice(from, to);
}

test("自动播放实况照片位于查看器留白与视频循环之间", () => {
  assert.match(
    dialog,
    /key: "showViewerFrame",[\s\S]*?key: "autoPlayLivePhotoEnabled",[\s\S]*?label: "自动播放实况照片",[\s\S]*?key: "videoLoopEnabled"/,
  );
  assert.match(language, /自动播放实况照片: "Auto-play Live Photos"/);
});

test("自动播放实况照片默认开启并随持久化设置恢复", () => {
  const read = section(
    app,
    "function readAutoPlayLivePhotoEnabled()",
    "function readViewerFrameEnabled()",
  );
  assert.match(read, /localStorage\.getItem\(AUTO_PLAY_LIVE_PHOTO_KEY\)/);
  assert.match(read, /stored === null \? true : stored === "true"/);

  for (const [start, end] of [
    ["function persistentSettingsSnapshot()", "function applyPersistentSettings("],
    ["function applyPersistentSettings(", "async function hydratePersistentSettings()"],
    ["function snapshotSettingsDraft()", "function applySettingsDraft()"],
    ["function applySettingsDraft()", "function openMenu("],
  ]) {
    assert.ok(
      section(app, start, end).includes("autoPlayLivePhotoEnabled"),
      `missing from ${start}`,
    );
  }
  assert.match(
    main,
    /"mutePreviewLivePhoto",\s*"autoPlayLivePhotoEnabled"/,
  );
});

test("左键打开实况照片查看器后只排一次自动播放", () => {
  const open = section(
    app,
    "function openViewer(index, options = {})",
    "function hidePhotoWallCrop()",
  );
  assert.match(open, /autoplayLivePhoto: autoPlayLivePhotoEnabled/);

  const scheduler = section(
    app,
    "function scheduleViewerLiveAutoplay(",
    "function stopLiveMotion(",
  );
  assert.match(scheduler, /if \(!autoPlayLivePhotoEnabled\) return;/);
  assert.match(scheduler, /addEventListener\("load", start, \{ once: true \}\)/);
  assert.match(scheduler, /Number\(state\.items\[viewerIndex\]\?\.id\) !== targetId/);
  assert.match(scheduler, /playLiveMotion\(\)/);
  assert.match(
    app,
    /opts\.autoplayLivePhoto === true && isLivePhoto\(item\)[\s\S]*?scheduleViewerLiveAutoplay\(item\.id/,
  );
});

test("自动播放结束后仍保留右上角实况图标的悬停播放", () => {
  const bind = section(
    app,
    "function bindViewerLiveButton(button)",
    "let viewerTopDragging = false;",
  );
  assert.match(bind, /button\.addEventListener\("pointerenter"/);
  assert.match(bind, /playLiveMotion\(\)/);
  assert.match(bind, /button\.addEventListener\("pointerleave"/);
  assert.match(bind, /stopLiveMotion\(\)/);
});
