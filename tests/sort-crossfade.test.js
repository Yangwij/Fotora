const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const root = path.join(__dirname, "..");
const app = fs.readFileSync(path.join(root, "web", "app.js"), "utf8");

test("项目排序使用与相簿切换相同的照片交叉淡入", () => {
  const update = app.slice(
    app.indexOf("function updateAlbumItems("),
    app.indexOf("function applyAlbumFilter("),
  );
  const sort = app.slice(
    app.indexOf("function applyAlbumSort("),
    app.indexOf(
      "/* 与 Folia 的 PosterWall",
      app.indexOf("function applyAlbumSort("),
    ),
  );

  assert.match(
    update,
    /const contentCrossfade = crossfade \? beginContentCrossfade\(\) : null;/,
  );
  assert.match(
    update,
    /playContentCrossfade\(contentCrossfade, \{ fallbackDelayMs: 0 \}\);[\s\S]*?render\(\{ holdReveal: crossfade \}\);[\s\S]*?if \(crossfade\) revealRightContent\(\);/,
  );
  assert.match(sort, /updateAlbumItems\([\s\S]*?\{ crossfade: true \},?\s*\);/);
  assert.doesNotMatch(sort, /blurReveal/);
});

test("位置、媒体、设备、类型和文件扩展名筛选共用照片交叉淡入", () => {
  for (const [start, end] of [
    ["function applyAlbumFilter(", "function applyLocationFilter("],
    ["function applyLocationFilter(", "function applyAlbumType("],
    ["function applyAlbumType(", "function applyAlbumDevice("],
    ["function applyAlbumDevice(", "function applyExtensionFilter("],
    ["function applyExtensionFilter(", "function applyAlbumSort("],
  ]) {
    const section = app.slice(
      app.indexOf(start),
      app.indexOf(end, app.indexOf(start)),
    );
    assert.match(section, /\{ crossfade: true \},?\s*\);/);
  }

  const update = app.slice(
    app.indexOf("function updateAlbumItems("),
    app.indexOf("function applyAlbumFilter("),
  );
  assert.match(
    update,
    /if \(crossfade && !state\.items\.length\) \{[\s\S]*?startPhotoContentCrossfadeHandoff\(contentCrossfade\);/,
  );
});
