"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

const root = path.resolve(__dirname, "..");
const app = fs.readFileSync(path.join(root, "web", "app.js"), "utf8");

test("多选调整位置会记录本次成功保存的项目", () => {
  const save = app.slice(
    app.indexOf("async function applyLocationAssign("),
    app.indexOf("function syncLocationAssignApplyButton("),
  );
  assert.match(app, /const locationAssignSavedIds = new Set\(\);/);
  assert.match(
    save,
    /patchItemLocation\(id, lat, lon\);[\s\S]*?locationAssignSavedIds\.add\(Number\(changedId\)\);/,
  );
});

test("退出位置分配时仅当筛选会隐藏调整项才切回全部", () => {
  const reveal = app.slice(
    app.indexOf("function revealLocationAssignSavedItemsAfterReturn("),
    app.indexOf("function closeAlbumMap("),
  );
  assert.match(
    reveal,
    /!locationAssignSavedIds\.size \|\| state\.locationFilter === "all"[\s\S]*?return false;/,
  );
  assert.match(
    reveal,
    /locationAssignSavedIds\.has\(Number\(item\?\.id\)\)[\s\S]*?!locationFilterMatches\(item\)/,
  );
  assert.match(reveal, /state\.locationFilter = "all";/);
});

test("位置筛选只在保存项被排除时复位，不影响仍匹配的筛选", () => {
  const reveal = app.slice(
    app.indexOf("function revealLocationAssignSavedItemsAfterReturn("),
    app.indexOf("function closeAlbumMap("),
  );
  const run = ({ locationFilter, item }) => {
    const savedIds = new Set([1]);
    const state = {
      locationFilter,
      albumItems: [item],
      albumMapItems: [],
    };
    const context = {
      locationAssignSavedIds: savedIds,
      locationFilterMatches: () =>
        locationFilter === "located" ||
        (locationFilter !== "unlocated" && locationFilter !== "unmodified"),
      state,
    };
    const revealed = vm.runInNewContext(
      `${reveal}\nrevealLocationAssignSavedItemsAfterReturn();`,
      context,
    );
    return { revealed, state };
  };

  const excluded = run({
    locationFilter: "unlocated",
    item: { id: 1, gps_lat: 31.2, gps_lon: 121.5 },
  });
  assert.equal(excluded.revealed, true);
  assert.equal(excluded.state.locationFilter, "all");

  const stillIncluded = run({
    locationFilter: "located",
    item: { id: 1, gps_lat: 31.2, gps_lon: 121.5 },
  });
  assert.equal(stillIncluded.revealed, false);
  assert.equal(stillIncluded.state.locationFilter, "located");
});

test("退出分配地图立即重算图库和相簿并清理会话记录", () => {
  const close = app.slice(
    app.indexOf("function closeAlbumMap("),
    app.indexOf("let viewerMapContext"),
  );
  assert.match(
    close,
    /revealLocationAssignSavedItemsAfterReturn\(\);[\s\S]*?locationAssignSavedIds\.clear\(\);[\s\S]*?state\.items = visibleAlbumItems\(\);/,
  );
  assert.doesNotMatch(close, /state\.activeId !== "library"/);
  assert.match(
    app,
    /function openLocationAssign\(items\)[\s\S]*?locationAssignSavedIds\.clear\(\);[\s\S]*?openAlbumMap\(media, \{ assignMode: true \}\)/,
  );
});
