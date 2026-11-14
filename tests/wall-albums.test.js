"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const Module = require("node:module");
const test = require("node:test");

const temporaryRoot = fs.mkdtempSync(
  path.join(os.tmpdir(), "fotora-wall-catalog-"),
);
const photoRoot = path.join(temporaryRoot, "photos");
const dataRoot = path.join(temporaryRoot, "data");
fs.mkdirSync(photoRoot, { recursive: true });
process.env.PHOTO_DATA = dataRoot;
delete process.env.PHOTO_DB;

/* 相册目录测试只访问 SQLite；用空模块替代 Sharp，避免依赖原生运行时。 */
const originalLoad = Module._load;
Module._load = function loadWithSharpStub(request, parent, isMain) {
  if (request === "sharp") return {};
  return originalLoad.call(this, request, parent, isMain);
};

const lib = require("../server/library");
Module._load = originalLoad;

test("照片墙共用相册统计，同时保留每种墙的独立裁剪", (t) => {
  const database = lib.openDb();
  const now = Date.now();
  database
    .prepare(
      "INSERT INTO roots (id, path, name, added_at, snapshot_at, import_id) VALUES (?, ?, ?, ?, ?, ?)",
    )
    .run(1, photoRoot, "Root", now, now, "test-import");
  database
    .prepare(
      `INSERT INTO albums
         (id, root_id, parent_id, path, name, depth, sort_key, sort_order, kind)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(1, 1, null, photoRoot, "Root", 0, "1Root", 0, "unfiled");
  database
    .prepare(
      `INSERT INTO albums
         (id, root_id, parent_id, path, name, depth, sort_key, sort_order, kind)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(2, 1, 1, "virtual:first", "First", 1, "1First", 0, "album");
  database
    .prepare(
      `INSERT INTO albums
         (id, root_id, parent_id, path, name, depth, sort_key, sort_order, kind)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(3, 1, 1, "virtual:second", "Second", 1, "1Second", 1, "album");

  const insertItem = database.prepare(
    `INSERT INTO items
       (id, root_id, album_id, path, name, kind, size, mtime, width, height,
        taken_at, added_seq, meta_state)
     VALUES (?, ?, ?, ?, ?, 'photo', ?, ?, ?, ?, ?, ?, 'done')`,
  );
  insertItem.run(
    10,
    1,
    1,
    path.join(photoRoot, "first.jpg"),
    "first.jpg",
    100,
    now,
    1000,
    2000,
    now,
    1,
  );
  insertItem.run(
    20,
    1,
    1,
    path.join(photoRoot, "second.jpg"),
    "second.jpg",
    100,
    now,
    2000,
    1000,
    now,
    2,
  );
  database
    .prepare(
      "INSERT INTO item_albums (item_id, album_id, added_seq, added_at) VALUES (?, ?, ?, ?)",
    )
    .run(10, 2, 1, now);
  database
    .prepare(
      "INSERT INTO item_albums (item_id, album_id, added_seq, added_at) VALUES (?, ?, ?, ?)",
    )
    .run(20, 3, 2, now);

  database
    .prepare(
      `INSERT INTO photo_wall_crops
         (item_id, crop_x, crop_y, crop_size, updated_at)
       VALUES (?, ?, ?, ?, ?)`,
    )
    .run(10, 0.25, 0.75, 0.6, 101);
  database
    .prepare(
      `INSERT INTO masonry_wall_crops (item_id, ratio_key, updated_at)
       VALUES (?, ?, ?)`,
    )
    .run(10, "16:9", 102);
  database
    .prepare(
      `INSERT INTO filmroll_wall_crops (item_id, ratio_key, updated_at)
       VALUES (?, ?, ?)`,
    )
    .run(10, "2:3", 103);
  database
    .prepare(
      `INSERT INTO mosaic_wall_crops (item_id, ratio_key, updated_at)
       VALUES (?, ?, ?)`,
    )
    .run(10, "3:5", 104);

  t.after(() => {
    lib.closeDatabase();
    fs.rmSync(temporaryRoot, { recursive: true, force: true });
  });

  const catalog = lib.listWallAlbums(1);
  assert.equal(catalog.photoWall.length, 2);
  assert.equal(catalog.masonry.length, 2);
  assert.equal(catalog.filmroll.length, 2);
  assert.equal(catalog.mosaic.length, 2);

  const first = catalog.photoWall.find((album) => album.id === 2);
  assert.equal(first.photoCount, 1);
  assert.equal(first.coverItemId, 10);
  assert.deepEqual(first.coverCrop, {
    x: 0.25,
    y: 0.75,
    size: 0.6,
    updatedAt: 101,
  });
  assert.equal(
    catalog.masonry.find((album) => album.id === 2).coverCrop.ratioKey,
    "16:9",
  );
  assert.equal(
    catalog.filmroll.find((album) => album.id === 2).coverCrop.ratioKey,
    "2:3",
  );
  assert.equal(
    catalog.mosaic.find((album) => album.id === 2).coverCrop.ratioKey,
    "3:5",
  );

  const selected = lib.getMosaicWallPhotos([2], 1);
  assert.deepEqual(
    selected.map((item) => item.id),
    [10],
  );
  assert.equal(selected[0].mosaicCrop.ratioKey, "3:5");
});
