"use strict";

const assert = require("node:assert/strict");
const fsp = require("node:fs/promises");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");

const dataRoot = path.join(
  os.tmpdir(),
  `fotora-atlas-integrity-${process.pid}-${Date.now()}`,
);
const libraryDir = path.join(dataRoot, "library");
process.env.PHOTO_DATA = path.join(dataRoot, "data");
process.env.PHOTO_DB = path.join(dataRoot, "library.db");

const sharp = require("sharp");
const lib = require("../server/library");
const thumbs = require("../server/thumbs");

test("图集完整才落盘，并保留重复照片的槽位", async (t) => {
  await fsp.mkdir(libraryDir, { recursive: true });
  const valid = path.join(libraryDir, "valid.jpg");
  const other = path.join(libraryDir, "other.jpg");
  const broken = path.join(libraryDir, "broken.jpg");
  await sharp({
    create: {
      width: 120,
      height: 80,
      channels: 3,
      background: { r: 26, g: 110, b: 180 },
    },
  })
    .jpeg()
    .toFile(valid);
  await sharp({
    create: {
      width: 100,
      height: 100,
      channels: 3,
      background: { r: 190, g: 75, b: 40 },
    },
  })
    .jpeg()
    .toFile(other);
  await fsp.writeFile(broken, "not a jpeg");

  const root = lib.addRoot(libraryDir);
  await lib.scanRoot(root.id, { deferMetadata: true });
  const items = lib.getItems(root.id);
  const validItem = items.find((item) => item.name === "valid.jpg");
  const otherItem = items.find((item) => item.name === "other.jpg");
  const brokenItem = items.find((item) => item.name === "broken.jpg");
  assert.ok(validItem);
  assert.ok(otherItem);
  assert.ok(brokenItem);

  const complete = await thumbs.ensureThumbAtlas([validItem.id, validItem.id], {
    cellSize: 64,
    columns: 8,
  });
  assert.ok(complete);
  const completeMeta = await sharp(complete).metadata();
  assert.equal(completeMeta.width, 512);
  assert.equal(completeMeta.height, 512);
  assert.ok(await fsp.stat(complete.replace(/\.webp$/, ".json")));

  const otherComplete = await thumbs.ensureThumbAtlas([otherItem.id], {
    cellSize: 64,
    columns: 8,
  });
  assert.ok(otherComplete);
  const otherManifest = otherComplete.replace(/\.webp$/, ".json");

  const incomplete = await thumbs.ensureThumbAtlas(
    [validItem.id, brokenItem.id],
    {
      cellSize: 64,
      columns: 8,
    },
  );
  assert.equal(incomplete, null);

  await fsp.mkdir(lib.PREVIEW_DIR, { recursive: true });
  const rawPreview = path.join(lib.PREVIEW_DIR, `${validItem.id}-raw-v3-6.jpg`);
  const mosaicThumb = path.join(
    lib.THUMB_DIR,
    "mosaic-wall",
    `${validItem.id}-probe.webp`,
  );
  await fsp.mkdir(path.dirname(mosaicThumb), { recursive: true });
  await fsp.writeFile(rawPreview, "stale-preview");
  await fsp.writeFile(mosaicThumb, "stale-mosaic");

  lib.dropItemCaches([validItem.id]);
  await assert.rejects(fsp.access(complete));
  await assert.rejects(fsp.access(complete.replace(/\.webp$/, ".json")));
  assert.ok(await fsp.stat(otherComplete), "无关图集不能被一起删掉");
  assert.ok(await fsp.stat(otherManifest));
  await assert.rejects(fsp.access(rawPreview));
  await assert.rejects(fsp.access(mosaicThumb));

  const regenerated = await thumbs.ensureThumbAtlas([validItem.id], {
    cellSize: 64,
    columns: 8,
  });
  assert.ok(regenerated);
  lib.dropItemCaches([validItem.id], { invalidateAtlas: false });
  assert.ok(await fsp.stat(regenerated), "封面刷新不应连带重建图集");

  t.after(async () => {
    lib.closeDatabase();
    await fsp.rm(dataRoot, { recursive: true, force: true });
  });
});
