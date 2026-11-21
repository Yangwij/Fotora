"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const root = path.resolve(__dirname, "..");
const app = fs.readFileSync(path.join(root, "web", "app.js"), "utf8");

const functionSlice = (start, end) => {
  const from = app.indexOf(start);
  assert.notEqual(from, -1, `缺少函数 ${start}`);
  const to = app.indexOf(end, from + start.length);
  assert.notEqual(to, -1, `缺少结束标记 ${end}`);
  return app.slice(from, to);
};

test("相簿删除预览和红色减号在减少动态下不播放缩放", () => {
  const albumPreview = functionSlice(
    "function beginAlbumDeletePreview(",
    "function restoreAlbumDeletePreview(",
  );
  const mark = functionSlice(
    "function animateDeleteMark(",
    "function restoreDeleteMarks(",
  );

  for (const source of [albumPreview, mark]) {
    assert.match(
      source,
      /if \(window\.matchMedia\("\(prefers-reduced-motion: reduce\)"\)\.matches\)\s*return;/,
    );
  }
  assert.doesNotMatch(albumPreview.split("return;")[0], /\.animate\(/);
  assert.doesNotMatch(mark.split("return;")[0], /\.animate\(/);
});

test("回收站相簿恢复在减少动态下直接更新最终列表", () => {
  const restore = functionSlice(
    "function beginTrashAlbumRestorePreview(",
    "function cancelTrashAlbumRestorePreview(",
  );
  const reflow = functionSlice(
    "function animateTrashAlbumCardReflow(",
    "async function performTrashRestore(",
  );

  assert.match(
    restore,
    /if \(window\.matchMedia\("\(prefers-reduced-motion: reduce\)"\)\.matches\)\s*return;/,
  );
  assert.match(reflow, /prefers-reduced-motion: reduce/);
  assert.doesNotMatch(restore.split("return;")[0], /\.animate\(/);
});
