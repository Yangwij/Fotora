"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs/promises");
const http = require("node:http");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");

const dataDir = path.join(
  os.tmpdir(),
  `fotora-server-test-${process.pid}-${Date.now()}`,
);
const libraryDir = path.join(dataDir, "library");
process.env.PHOTO_DATA = path.join(dataDir, "data");
process.env.PHOTO_DB = path.join(dataDir, "library.db");

const sharp = require("sharp");
const lib = require("../server/library");
const serverApi = require("../server/index");

function requestStatus(port, requestPath, headers) {
  return new Promise((resolve, reject) => {
    const req = http.request(
      {
        hostname: "127.0.0.1",
        port,
        path: requestPath,
        headers,
      },
      (res) => {
        res.resume();
        res.on("end", () => resolve(res.statusCode));
      },
    );
    req.on("error", reject);
    req.end();
  });
}

test("服务启动、照片墙合并接口和本地请求保护", async (t) => {
  await fs.mkdir(libraryDir, { recursive: true });
  await sharp({
    create: {
      width: 4,
      height: 4,
      channels: 3,
      background: { r: 220, g: 120, b: 80 },
    },
  })
    .jpeg()
    .toFile(path.join(libraryDir, "sample.jpg"));

  const root = lib.addRoot(libraryDir);
  await lib.scanRoot(root.id);
  const [item] = lib.getLibraryItems(root.id);
  assert.ok(item);
  const album = lib.createRootAlbum(root.id, "测试相簿");
  await lib.addItemsToAlbum([item.id], album.id);

  const running = await serverApi.start({ port: 0 });
  t.after(async () => {
    await serverApi.stop();
    lib.closeDatabase();
    await fs.rm(dataDir, { recursive: true, force: true });
  });

  const address = `http://127.0.0.1:${running.port}`;
  const response = await fetch(`${address}/api/walls/albums`);
  assert.equal(response.status, 200);
  const walls = await response.json();
  assert.deepEqual(Object.keys(walls).sort(), [
    "filmroll",
    "masonry",
    "mosaic",
    "photoWall",
  ]);
  assert.equal(walls.photoWall.length, 1);
  assert.equal(walls.photoWall[0].displayName, "测试相簿");

  assert.equal(
    await requestStatus(running.port, "/api/state", {
      Host: "evil.example",
    }),
    403,
  );

  const wrongType = await fetch(`${address}/api/items/favorite`, {
    method: "POST",
    headers: { "Content-Type": "text/plain" },
    body: JSON.stringify({ ids: [item.id] }),
  });
  assert.equal(wrongType.status, 415);

  const malformed = await fetch(`${address}/api/items/favorite`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: "{",
  });
  assert.equal(malformed.status, 400);

  const backgroundLibrary = path.join(dataDir, "background-library");
  await fs.mkdir(backgroundLibrary, { recursive: true });
  await sharp({
    create: {
      width: 3,
      height: 3,
      channels: 3,
      background: { r: 20, g: 140, b: 210 },
    },
  })
    .jpeg()
    .toFile(path.join(backgroundLibrary, "background.jpg"));
  const backgroundResponse = await fetch(`${address}/api/roots`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ path: backgroundLibrary, background: true }),
  });
  assert.equal(backgroundResponse.status, 200);
  const backgroundPayload = await backgroundResponse.json();
  assert.equal(backgroundPayload.background, true);
  assert.equal(backgroundPayload.result, null);

  let scan;
  for (let attempt = 0; attempt < 40; attempt += 1) {
    scan = await (
      await fetch(`${address}/api/scan?rootId=${backgroundPayload.root.id}`)
    ).json();
    if (scan.phase === "done" || scan.phase === "error") break;
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  assert.equal(scan.phase, "done");
  const importedItems = await (
    await fetch(`${address}/api/library/items`)
  ).json();
  assert.equal(importedItems.items.length, 1);
});
