"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const root = path.resolve(__dirname, "..");
const app = fs.readFileSync(path.join(root, "web", "app.js"), "utf8");
const css = fs.readFileSync(path.join(root, "web", "styles.css"), "utf8");

function functionSource(name, nextName) {
  const start = app.indexOf(`function ${name}(`);
  const end = app.indexOf(`function ${nextName}(`, start);
  assert.ok(start >= 0, `${name} should exist`);
  assert.ok(end > start, `${nextName} should follow ${name}`);
  return app.slice(start, end);
}

test("打开地图查看器前先让照片栏向下退场", () => {
  const open = functionSource(
    "openMapPhotoViewer",
    "finishAlbumMapViewerContext",
  );
  assert.match(
    open,
    /viewerMapContext = kind;\s*departMapFilmstripForViewer\(kind\);\s*\$\("#viewer"\)\.classList\.add\("is-map-photo-viewer"\)/,
  );
  assert.match(open, /openViewer\(0, \{ instantFilmstrip: true \}\)/);

  const depart = functionSource(
    "departMapFilmstripForViewer",
    "returnMapFilmstripAfterViewer",
  );
  assert.match(
    depart,
    /const shouldReturn = wasVisible \|\| mapFilmstripDisplayEnabled\(\)/,
  );
  assert.match(depart, /cancelMapFilmstripExit\(nav\)/);
  assert.match(depart, /classList\.add\("is-viewer-departing"\)/);
  assert.match(depart, /nav\.setAttribute\("aria-hidden", "true"\)/);
  assert.match(depart, /playMapFilmstripExit\(nav,/);
  assert.match(depart, /classList\.add\("map-filmstrip-disabled"\)/);
});

test("退出地图查看器后照片栏从底部推回", () => {
  const finish = functionSource(
    "finishAlbumMapViewerContext",
    "handleAlbumMapMessage",
  );
  assert.match(
    finish,
    /else if \(kind === "album"\) syncAlbumMapSelection\(\);\s*returnMapFilmstripAfterViewer\(kind\);/,
  );

  const restore = functionSource(
    "returnMapFilmstripAfterViewer",
    "openMapPhotoViewer",
  );
  assert.match(restore, /cancelMapFilmstripExit\(nav\)/);
  assert.match(restore, /classList\.remove\("is-viewer-departing"\)/);
  assert.match(restore, /classList\.remove\("map-filmstrip-disabled"\)/);
  assert.match(restore, /removeAttribute\("aria-hidden"\)/);
  assert.match(restore, /playMapFilmstripEntrance\(nav\)/);
  assert.match(
    restore,
    /if \(!mapFilmstripDisplayEnabled\(\)\) scheduleMapFilmstripHide\(kind\)/,
  );
});

test("查看器打开期间照片栏不会被靠近逻辑重新唤出", () => {
  const held = functionSource(
    "mapFilmstripHeldForViewer",
    "departMapFilmstripForViewer",
  );
  assert.match(
    held,
    /mapViewerFilmstripReturn\?\.kind === kind && !\$\("#viewer"\)\.hidden/,
  );

  const reveal = functionSource(
    "revealMapFilmstrip",
    "updateMapFilmstripProximity",
  );
  assert.match(reveal, /if \(mapFilmstripHeldForViewer\(kind\)\) return;/);

  const proximity = functionSource(
    "updateMapFilmstripProximity",
    "syncMapFilmstripVisibility",
  );
  assert.match(proximity, /if \(mapFilmstripHeldForViewer\(kind\)\) return;/);

  const sync = functionSource(
    "syncMapFilmstripVisibility",
    "clearLocationsMapFilmstripHideTimer",
  );
  assert.match(sync, /if \(mapFilmstripHeldForViewer\(kind\)\) return;/);
});

test("查看器打开时照片栏退场层位于查看器之上", () => {
  assert.match(
    css,
    /\.map-filmstrip\.is-viewer-departing\s*\{[\s\S]*?z-index:\s*55;/,
  );
  assert.doesNotMatch(
    css,
    /body:has\(> #viewer:not\(\[hidden\]\)\) \.map-filmstrip/,
  );
  assert.match(
    css,
    /@keyframes map-filmstrip-exit\s*\{[\s\S]*?translate\(-50%, calc\(100% \+ 28px\)\)/,
  );
  assert.match(
    css,
    /@keyframes map-filmstrip-reveal\s*\{[\s\S]*?translate\(-50%, calc\(100% \+ 28px\)\)/,
  );
});
