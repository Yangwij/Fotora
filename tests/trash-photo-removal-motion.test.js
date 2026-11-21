"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const root = path.join(__dirname, "..");
const app = fs.readFileSync(path.join(root, "web", "app.js"), "utf8");

const functionSlice = (start, end) => {
  const from = app.indexOf(start);
  assert.notEqual(from, -1, `缺少函数 ${start}`);
  const to = app.indexOf(end, from + start.length);
  assert.notEqual(to, -1, `缺少结束标记 ${end}`);
  return app.slice(from, to);
};

test("最近删除的恢复和彻底删除复用普通相簿的退场与补位", () => {
  const restore = functionSlice(
    "async function performTrashRestore(",
    "async function restoreTrashSelected(",
  );
  const remove = functionSlice(
    "async function performTrashDelete(",
    "async function deleteTrashSelected(",
  );

  for (const source of [restore, remove]) {
    assert.match(source, /commitOptimisticPhotoRemoval\(/);
    assert.match(source, /preservePhotoTileNodesAfterRender\(before/);
    assert.match(source, /animatePhotoReflow\(before/);
    assert.match(
      source,
      /rebaseRenderedContentViewAfterMetadataUpdate\(\);\s*renderSidebar\(\);/,
    );
    assert.match(source, /restoreTrashRemovalSnapshot\(snapshot, ghosts, scrollTop\)/);
  }
});

test("最近删除照片成功操作后不再无条件整片重绘", () => {
  const restore = functionSlice(
    "async function performTrashRestore(",
    "async function restoreTrashSelected(",
  );
  const remove = functionSlice(
    "async function performTrashDelete(",
    "async function deleteTrashSelected(",
  );

  for (const source of [restore, remove]) {
    assert.match(
      source,
      /const needsRender = albumIds\.length > 0 \|\| !allPhotos(?:Restored|Deleted);/,
    );
    assert.match(source, /if \(needsRender\) \{/);
    assert.match(source, /else \{[\s\S]*?renderSidebar\(\);/);
  }
});
