"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const root = path.join(__dirname, "..");
const read = (file) => fs.readFileSync(path.join(root, "web", file), "utf8");

test("地图取景按实际可见矩形排除相簿栏遮挡", () => {
  const app = read("app.js");
  const helper = app.slice(
    app.indexOf("function mapViewportInsets(host, frame)"),
    app.indexOf("function locationsMapFrame()"),
  );
  assert.match(
    helper,
    /const sidebarRect = \$\("#sidebar"\)\?\.getBoundingClientRect\(\)/,
  );
  assert.match(helper, /Math\.max\(hostRect\.left, sidebarRect\.right\)/);
  assert.match(helper, /left: Math\.max\(0, visibleLeft - frameRect\.left\)/);
  assert.match(
    helper,
    /right: Math\.max\(0, frameRect\.right - hostRect\.right\)/,
  );

  for (const name of ["Locations", "Album"]) {
    assert.match(app, new RegExp(`function sync${name}MapViewport\\(\\)`));
    const reveal = app.slice(
      app.indexOf(`function reveal${name}Map()`),
      app.indexOf(`function reveal${name}MapWhenReady()`),
    );
    assert.match(reveal, new RegExp(`sync${name}MapViewport\\(\\);`));
    assert.ok(
      reveal.indexOf(`sync${name}MapViewport();`) <
        reveal.indexOf(
          `postTo${name}Map({ type: "${name.toLowerCase()}-map:animate-fit" })`,
        ),
    );
  }
  assert.match(
    app,
    /type: "locations-map:set-items",\s*items,\s*insets: mapViewportInsets/,
  );
  assert.match(
    app,
    /fitToken: state\.albumMapFitToken,\s*insets: mapViewportInsets/,
  );
});

test("两侧地图接收可见区域并把遮挡宽度加入取景边距", () => {
  const globe = read("map/embedded-globe.js");
  assert.match(globe, /setViewportInsets\(insets = \{\}\)/);
  assert.match(
    globe,
    /document\.body\.dataset\.viewportInsets = JSON\.stringify/,
  );
  assert.match(globe, /left: 82 \+ insets\.left/);
  assert.match(globe, /right: 96 \+ insets\.right/);
  assert.match(globe, /const padding = this\.fitPadding\(\);/);

  for (const file of ["map/locations.js", "map/album-map.js"]) {
    const page = read(file);
    assert.match(page, /set-viewport-insets/);
    assert.match(page, /globe\.setViewportInsets\(message\.insets\)/);
  }
});
