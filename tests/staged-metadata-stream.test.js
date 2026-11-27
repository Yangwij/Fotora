"use strict";

const assert = require("node:assert/strict");
const fsp = require("node:fs/promises");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");

const dataRoot = path.join(
  os.tmpdir(),
  `fotora-staged-metadata-${process.pid}-${Date.now()}`,
);
const libraryDir = path.join(dataRoot, "library");
process.env.PHOTO_DATA = path.join(dataRoot, "data");
process.env.PHOTO_DB = path.join(dataRoot, "library.db");

const sharp = require("sharp");
const lib = require("../server/library");
const thumbs = require("../server/thumbs");

test("可浏览后继续整理元数据，地图游标按批次推进", async (t) => {
  await fsp.mkdir(libraryDir, { recursive: true });
  const photo = path.join(libraryDir, "located.jpg");
  await sharp({
    create: {
      width: 96,
      height: 72,
      channels: 3,
      background: { r: 40, g: 120, b: 190 },
    },
  })
    .jpeg()
    .toFile(photo);
  await lib.runExiftool([
    "-overwrite_original",
    "-GPSLatitude=31.2304",
    "-GPSLatitudeRef=N",
    "-GPSLongitude=121.4737",
    "-GPSLongitudeRef=E",
    photo,
  ]);

  const root = lib.addRoot(libraryDir);
  const scan = await lib.scanRoot(root.id, { deferMetadata: true });
  assert.equal(scan.metadataDeferred, true);

  const browsable = lib.getScanState(root.id);
  assert.equal(browsable.browsable, true);
  assert.equal(browsable.metadataRunning, true);
  assert.equal(browsable.metadataReady, false);

  const before = lib.getLocationItemsAfter(root.id, 0, 20);
  assert.equal(before.items.length, 0);
  assert.equal(before.complete, false);

  await lib.readMetadata(root.id, { batchSize: 1 });
  lib.finishMetadataEnrichment(root.id);

  const after = lib.getLocationItemsAfter(root.id, 0, 20);
  assert.equal(after.items.length, 1);
  assert.equal(after.items[0].name, "located.jpg");
  assert.ok(Number.isFinite(Number(after.items[0].gps_lat)));
  assert.ok(Number.isFinite(Number(after.items[0].gps_lon)));
  assert.equal(after.complete, true);
  assert.ok(after.nextAfter >= after.items[0].id);

  const atlas = await thumbs.ensureThumbAtlas([after.items[0].id], {
    cellSize: 64,
    columns: 8,
  });
  const atlasMeta = await sharp(atlas).metadata();
  assert.equal(atlasMeta.format, "webp");
  assert.equal(atlasMeta.width, 512);
  assert.equal(atlasMeta.height, 512);

  t.after(async () => {
    lib.closeDatabase();
    await fsp.rm(dataRoot, { recursive: true, force: true });
  });
});
