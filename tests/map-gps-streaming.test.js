"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const root = path.resolve(__dirname, "..");
const read = (...parts) => fs.readFileSync(path.join(root, ...parts), "utf8");
const app = read("web", "app.js");
const globe = read("web", "map", "embedded-globe.js");
const locations = read("web", "map", "locations.js");
const albumMap = read("web", "map", "album-map.js");
const server = read("server", "index.js");
const library = read("server", "library.js");

test("后台导入先成为可浏览图库，全库元数据随后继续", () => {
  assert.match(server, /scanAndBump\(root\.id, \{ deferMetadata: true \}\)/);
  assert.match(server, /startDeferredMetadata\(root\.id\)/);
  assert.match(library, /opts\.deferMetadata === true/);
  assert.match(library, /phase: pendingCount \? "browsable" : "done"/);
  assert.match(library, /metadataRunning: pendingCount > 0/);
  assert.match(app, /scan\.browsable === true/);
});

test("元数据批次完成会推进可恢复游标，不要求整库一次完成", () => {
  assert.match(
    library,
    /async function readMetadata\([\s\S]*?batchSize = 500[\s\S]*?onBatch/,
  );
  assert.match(
    library,
    /for \(const row of slice\) markDone\.run\(row\.id, Number\(rootId\)\)/,
  );
  assert.match(library, /function getLocationItemsAfter\(rootId/);
  assert.match(library, /i\.meta_state = 'done'/);
  assert.match(server, /pathname === "\/api\/locations\/stream"/);
});

test("地图通过差量消息持续接收新 GPS，不重载 iframe", () => {
  const stream = app.slice(
    app.indexOf("async function pumpLocationsMetadataStream()"),
    app.indexOf("function syncLocationsMapSelection("),
  );
  assert.match(stream, /\/api\/locations\/stream\?after=/);
  assert.match(app, /type: "locations-map:upsert-items"/);
  assert.match(app, /type: "album-map:upsert-items"/);
  assert.match(app, /isAlbumMapView\(\)/);
  assert.match(app, /locationsStillPending = media\.some/);
  assert.doesNotMatch(
    stream,
    /locationsMapFrame\(\)\.src|reloadLocationsMapFrame/,
  );
  assert.match(locations, /message\.type === "locations-map:upsert-items"/);
  assert.match(albumMap, /message\.type === "album-map:upsert-items"/);

  const upsert = globe.slice(
    globe.indexOf("upsertItems(rawItems) {"),
    globe.indexOf("setItems(rawItems"),
  );
  assert.match(upsert, /const byId = new Map/);
  assert.match(upsert, /this\.renderMarkers\(\)/);
  assert.doesNotMatch(upsert, /fitAll\(|flyToFit/);
});
