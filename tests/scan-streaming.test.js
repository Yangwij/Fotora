"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");

const temporaryRoot = fs.mkdtempSync(
  path.join(os.tmpdir(), "fotora-scan-streaming-"),
);
const libraryRoot = path.join(temporaryRoot, "library");
const dataRoot = path.join(temporaryRoot, "data");
fs.mkdirSync(path.join(libraryRoot, "album", "nested"), { recursive: true });
process.env.PHOTO_DATA = dataRoot;
delete process.env.PHOTO_DB;

const lib = require("../server/library");

function writeMedia(relativePath, contents = "not-a-real-image") {
  const filePath = path.join(libraryRoot, relativePath);
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, contents);
  return filePath;
}

test("大型目录采用分批暂存扫描并保持增量索引正确", async (t) => {
  t.after(() => {
    lib.closeDatabase();
    fs.rmSync(temporaryRoot, { recursive: true, force: true });
  });

  writeMedia("root.jpg");
  writeMedia(path.join("album", "first.jpg"));
  writeMedia(path.join("album", "nested", "second.jpg"));
  writeMedia(path.join("album", "ignore.txt"));
  for (let index = 0; index < 520; index += 1) {
    writeMedia(
      path.join("bulk", `photo-${String(index).padStart(4, "0")}.jpg`),
    );
  }

  const root = lib.addRoot(libraryRoot);
  const initial = await lib.scanRoot(root.id);
  assert.equal(initial.items, 523);
  assert.equal(initial.albums, 4);
  assert.equal(lib.getLibraryItems(root.id).length, 523);

  const database = lib.openDb();
  assert.equal(
    Number(
      database.prepare("SELECT COUNT(*) AS n FROM scan_stage_files").get().n,
    ),
    0,
  );
  assert.equal(
    Number(
      database.prepare("SELECT COUNT(*) AS n FROM scan_stage_dirs").get().n,
    ),
    0,
  );

  const originalIds = new Map(
    lib
      .getLibraryItems(root.id)
      .map((item) => [path.relative(libraryRoot, item.path), item.id]),
  );
  writeMedia("later.jpg");
  const updated = await lib.scanRoot(root.id);
  assert.equal(updated.items, 524);
  const afterAdd = lib.getLibraryItems(root.id);
  assert.equal(afterAdd.length, 524);
  for (const [relativePath, id] of originalIds) {
    assert.equal(
      afterAdd.find(
        (item) => path.relative(libraryRoot, item.path) === relativePath,
      )?.id,
      id,
    );
  }

  fs.rmSync(path.join(libraryRoot, "album", "nested", "second.jpg"));
  const removed = await lib.scanRoot(root.id);
  assert.equal(removed.items, 523);
  assert.equal(removed.removedItems, 1);
  assert.equal(lib.getLibraryItems(root.id).length, 523);
  assert.equal(lib.getScanState(root.id).phase, "done");
});
