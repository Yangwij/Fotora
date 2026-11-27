"use strict";

const assert = require("node:assert/strict");
const fsp = require("node:fs/promises");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");

const dataRoot = path.join(
  os.tmpdir(),
  `fotora-first-import-isolation-${process.pid}-${Date.now()}`,
);
const libraryDir = path.join(dataRoot, "library");
process.env.PHOTO_DATA = path.join(dataRoot, "data");
process.env.PHOTO_DB = path.join(dataRoot, "library-v2.db");

const sharp = require("sharp");
const lib = require("../server/library");
const serverApi = require("../server/index");

async function postJson(address, requestPath, body) {
  const response = await fetch(`${address}${requestPath}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return { response, data: await response.json() };
}

async function waitForScan(address, rootId) {
  const deadline = Date.now() + 5000;
  while (Date.now() < deadline) {
    const scan = await (
      await fetch(`${address}/api/scan?rootId=${rootId}`)
    ).json();
    if (!scan.running) return scan;
    await new Promise((resolve) => setTimeout(resolve, 15));
  }
  throw new Error("首次图库扫描没有及时结束");
}

test("首次图库未提交时不向任何集合入口暴露半成品", async (t) => {
  await fsp.mkdir(libraryDir, { recursive: true });
  await sharp({
    create: {
      width: 96,
      height: 72,
      channels: 3,
      background: { r: 35, g: 105, b: 175 },
    },
  })
    .jpeg()
    .toFile(path.join(libraryDir, "first-photo.jpg"));

  const running = await serverApi.start({ port: 0 });
  t.after(async () => {
    await serverApi.stop();
    lib.closeDatabase();
    await fsp.rm(dataRoot, { recursive: true, force: true });
  });
  const address = running.address;

  const started = await postJson(address, "/api/roots", {
    path: libraryDir,
    background: true,
  });
  assert.equal(started.response.status, 200);
  assert.equal(started.data.background, true);
  assert.equal(started.data.state.activeRootId, null);
  assert.deepEqual(started.data.state.roots, []);

  /* 模拟用户在首次扫描期间疯狂点击照片墙、地图、图库和主菜单刷新。 */
  for (let round = 0; round < 12; round += 1) {
    const [state, items, locations, walls, favorites] = await Promise.all([
      fetch(`${address}/api/state`).then((res) => res.json()),
      fetch(`${address}/api/library/items`).then((res) => res.json()),
      fetch(`${address}/api/locations/items`).then((res) => res.json()),
      fetch(`${address}/api/walls/albums`).then((res) => res.json()),
      fetch(`${address}/api/favorites/items`).then((res) => res.json()),
    ]);
    assert.equal(state.activeRootId, null);
    assert.deepEqual(state.roots, []);
    assert.deepEqual(items.items, []);
    assert.deepEqual(locations.items, []);
    assert.deepEqual(walls.photoWall, []);
    assert.deepEqual(walls.masonry, []);
    assert.deepEqual(walls.filmroll, []);
    assert.deepEqual(walls.mosaic, []);
    assert.deepEqual(favorites.items, []);
  }

  const scan = await waitForScan(address, started.data.root.id);
  assert.equal(scan.browsable, true);
  assert.match(scan.phase, /^(browsable|done)$/);
  const beforeComplete = await (await fetch(`${address}/api/state`)).json();
  assert.equal(
    beforeComplete.activeRootId,
    null,
    "扫描完成但用户尚未允许切换前，仍不能暴露新图库",
  );

  const completed = await postJson(address, "/api/imports/complete", {
    importId: started.data.importId,
    rootId: started.data.root.id,
  });
  assert.equal(completed.response.status, 200);
  assert.equal(completed.data.state.activeRootId, started.data.root.id);

  const [items, walls] = await Promise.all([
    fetch(`${address}/api/library/items`).then((res) => res.json()),
    fetch(`${address}/api/walls/albums`).then((res) => res.json()),
  ]);
  assert.equal(items.items.length, 1);
  assert.equal(walls.photoWall.length, 1);

  const atlas = await fetch(
    `${address}/api/thumbs/atlas?ids=${items.items[0].id}&cell=64&cols=8`,
  );
  assert.equal(atlas.status, 200);
  assert.equal(atlas.headers.get("content-type"), "image/webp");
  assert.ok((await atlas.arrayBuffer()).byteLength > 0);

  const locationStream = await (
    await fetch(`${address}/api/locations/stream?after=0&limit=20`)
  ).json();
  assert.ok(Array.isArray(locationStream.items));
  assert.ok(Number.isInteger(locationStream.nextAfter));
  assert.equal(typeof locationStream.complete, "boolean");
});
