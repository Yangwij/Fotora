"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const root = path.resolve(__dirname, "..");
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");

test("谷歌地图瓦片通过主进程网络白名单", () => {
  const main = read("electron/main.js");
  assert.match(
    main,
    /hostname === "google\.com" \|\|\s*hostname\.endsWith\("\.google\.com"\)/,
  );
  assert.match(main, /hostname\.endsWith\("\.googleapis\.com"\)/);
});

test("地点地图和相簿地图使用所选谷歌瓦片", () => {
  const globe = read("web/map/embedded-globe.js");
  assert.match(globe, /function googleTileUrls\(kind\)/);
  assert.match(
    globe,
    /this\.tileProvider === "google" \? googleTileUrls : amapTileUrls/,
  );
  assert.match(globe, /mapUsesGcjCoordinates\(\)[\s\S]*tileProvider === "amap"/);

  const editor = read("web/map/map.js");
  assert.match(editor, /function googleTileUrls\(kind\)/);
  assert.match(
    editor,
    /tileProvider === "google" \? googleTileUrls : amapTileUrls/,
  );
  assert.match(
    editor,
    /mapUsesGcjCoordinates\(\)[\s\S]*tileProvider === "amap"/,
  );
  assert.match(editor, /metadata-map:set-tile-provider/);
});

test("位置编辑地图接收谷歌提供方并正确转换坐标", () => {
  const app = read("web/app.js");
  const editor = read("web/map/map.js");
  assert.match(
    app,
    /function metadataMapSrc\(mode, items\)[\s\S]*provider: mapTileProvider/,
  );
  assert.match(
    app,
    /type: "metadata-map:set-tile-provider",\s*provider: mapTileProvider/,
  );
  assert.match(
    editor,
    /function searchSourceLatLng\(lat, lng\)[\s\S]*gcj2wgs\(lat, lng\)/,
  );
  assert.match(
    editor,
    /place\.isGcj\s*\? searchSourceLatLng\(place\.lat, place\.lon\)/,
  );
});
