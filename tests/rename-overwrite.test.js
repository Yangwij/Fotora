"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs/promises");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");

const dataDir = path.join(
  os.tmpdir(),
  `fotora-rename-overwrite-test-${process.pid}-${Date.now()}`,
);
const libraryDir = path.join(dataDir, "library");
process.env.PHOTO_DATA = path.join(dataDir, "data");
process.env.PHOTO_DB = path.join(dataDir, "library.db");

const sharp = require("sharp");
const lib = require("../server/library");

test("批量编号遇到同名文件时以新名称为准覆盖", async (t) => {
  await fs.mkdir(libraryDir, { recursive: true });
  const sourcePath = path.join(libraryDir, "source.jpg");
  const targetPath = path.join(libraryDir, "target.jpg");
  await sharp({
    create: {
      width: 4,
      height: 4,
      channels: 3,
      background: { r: 20, g: 120, b: 220 },
    },
  })
    .jpeg()
    .toFile(sourcePath);
  await sharp({
    create: {
      width: 4,
      height: 4,
      channels: 3,
      background: { r: 220, g: 80, b: 20 },
    },
  })
    .jpeg()
    .toFile(targetPath);

  const root = lib.addRoot(libraryDir);
  await lib.scanRoot(root.id);
  const items = lib.getLibraryItems(root.id);
  const source = items.find((item) => item.name === "source.jpg");
  const target = items.find((item) => item.name === "target.jpg");
  assert.ok(source);
  assert.ok(target);
  const sourceBytes = await fs.readFile(sourcePath);

  t.after(async () => {
    lib.closeDatabase();
    await fs.rm(dataDir, { recursive: true, force: true });
  });

  const result = await lib.renameItemsToBaseNames([
    { id: source.id, baseName: "target" },
  ]);
  assert.equal(result.renamed, 1);
  assert.equal(result.replaced, 1);
  await assert.rejects(fs.access(sourcePath));
  assert.deepEqual(await fs.readFile(targetPath), sourceBytes);

  const remaining = lib.getLibraryItems(root.id);
  assert.equal(remaining.length, 1);
  assert.equal(remaining[0].id, source.id);
  assert.equal(remaining[0].name, "target.jpg");
  assert.equal(remaining[0].path, targetPath);
  assert.ok(!remaining.some((item) => item.id === target.id));

  const fileNames = await fs.readdir(libraryDir);
  assert.deepEqual(fileNames, ["target.jpg"]);
});
