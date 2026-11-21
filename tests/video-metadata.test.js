"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const Module = require("node:module");
const test = require("node:test");

const temporaryRoot = fs.mkdtempSync(
  path.join(os.tmpdir(), "fotora-video-metadata-"),
);
const libraryRoot = path.join(temporaryRoot, "library");
const dataRoot = path.join(temporaryRoot, "data");
fs.mkdirSync(libraryRoot, { recursive: true });
process.env.PHOTO_DATA = dataRoot;
delete process.env.PHOTO_DB;

const originalLoad = Module._load;
Module._load = function loadWithSharpStub(request, parent, isMain) {
  if (request === "sharp") return {};
  return originalLoad.call(this, request, parent, isMain);
};

const lib = require("../server/library");
Module._load = originalLoad;

test("视频可以修改拍摄时间、设备和位置", async (t) => {
  const database = lib.openDb();
  const now = Date.now();
  database
    .prepare(
      "INSERT INTO roots (id, path, name, added_at, snapshot_at, import_id) VALUES (?, ?, ?, ?, ?, ?)",
    )
    .run(1, libraryRoot, "Root", now, now, "video-metadata-test");
  database
    .prepare(
      `INSERT INTO albums
         (id, root_id, parent_id, path, name, depth, sort_key, sort_order, kind)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(1, 1, null, libraryRoot, "Root", 0, "1Root", 0, "unfiled");
  database
    .prepare(
      `INSERT INTO items
         (id, root_id, album_id, path, name, kind, size, mtime,
          width, height, taken_at, added_seq, meta_state)
       VALUES (?, ?, ?, ?, ?, 'video', ?, ?, ?, ?, ?, ?, 'done')`,
    )
    .run(
      30,
      1,
      1,
      path.join(libraryRoot, "sample.mov"),
      "sample.mov",
      1024,
      now,
      1920,
      1080,
      now,
      1,
    );

  t.after(() => {
    lib.closeDatabase();
    fs.rmSync(temporaryRoot, { recursive: true, force: true });
  });

  const takenAt = now + 60_000;
  const timeResult = await lib.setItemsTakenAt([30], takenAt);
  assert.deepEqual(timeResult.ids, [30]);

  const cameraResult = lib.setItemsCamera([30], "sony-a7m4");
  assert.deepEqual(cameraResult.ids, [30]);
  assert.deepEqual(cameraResult.failed, []);

  const locationResult = lib.setItemsLocation([30], {
    lat: 31.2304,
    lon: 121.4737,
    locationName: "上海",
  });
  assert.deepEqual(locationResult.ids, [30]);
  assert.deepEqual(locationResult.failed, []);

  const updated = database
    .prepare("SELECT * FROM item_effective WHERE id = ?")
    .get(30);
  assert.equal(updated.kind, "video");
  assert.equal(updated.effective_taken_at, takenAt);
  assert.equal(updated.camera_override, "sony-a7m4");
  assert.equal(updated.effective_camera, "Sony A7 IV");
  assert.equal(updated.effective_gps_lat, 31.2304);
  assert.equal(updated.effective_gps_lon, 121.4737);
  assert.equal(updated.effective_location_name, "上海");
});
