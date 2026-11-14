"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const root = path.resolve(__dirname, "..");
const locations = fs.readFileSync(
  path.join(root, "web", "map", "locations.js"),
  "utf8",
);
const albumMap = fs.readFileSync(
  path.join(root, "web", "map", "album-map.js"),
  "utf8",
);
const globeCss = fs.readFileSync(
  path.join(root, "web", "map", "globe-map.css"),
  "utf8",
);
const app = fs.readFileSync(path.join(root, "web", "app.js"), "utf8");
const css = fs.readFileSync(path.join(root, "web", "styles.css"), "utf8");

test("关闭显示后地图按钮只随鼠标靠近状态立即显隐", () => {
  for (const source of [locations, albumMap]) {
    assert.match(
      source,
      /if \(nearPointer\) \{\s*if \(!controlsNear\) revealControlsTemporarily\(\);[\s\S]*return;[\s\S]*controlsNear = false;[\s\S]*classList\.remove\("map-buttons-near"\);/,
    );
    assert.doesNotMatch(source, /controlsHideTimer/);
  }
  assert.match(
    app,
    /function syncLocationsMapButtons\(\)[\s\S]*album-map:set-controls-visible/,
  );
  assert.match(
    globeCss,
    /body:is\(\.globe-page-locations, \.globe-page-album\)\.map-buttons-hover-only/,
  );
  assert.match(
    app,
    /function locationsMapRailHoverOnlyActive\(\)[\s\S]*sidebar-rail-is-collapsed[\s\S]*state\.albumMapOpen/,
  );
  assert.match(
    app,
    /classList\.toggle\(\s*"sidebar-rail-is-collapsed",[\s\S]*syncLocationsMapRailVisibility\(\);[\s\S]*if \(sidebarRailCollapsed && !showLocationMapButtons\) \{\s*hideLocationsMapRail\(\);/,
  );
  assert.match(
    app,
    /document\.documentElement\.addEventListener\("pointerleave",[\s\S]*updateLocationsMapRailProximity\(NaN, NaN\)/,
  );
  assert.match(
    albumMap,
    /function postPointerForParent\(\)[\s\S]*post\("album-map:pointer"[\s\S]*postPointerForParent\(\);/,
  );
  assert.match(
    app,
    /message\.type === "album-map:pointer"[\s\S]*syncLocationsMapRailFromControls\(message\.controlsNear === true\)[\s\S]*message\.type === "album-map:pointer-leave"[\s\S]*syncLocationsMapRailFromControls\(false\)/,
  );
});

test("左上角收回按钮与地图内三个按钮共用靠近显示状态", () => {
  for (const source of [locations, albumMap, app]) {
    assert.match(source, /MAP_CONTROL_PROXIMITY_PADDING = 64/);
    assert.match(source, /MAP_CONTROL_PROXIMITY_EXIT_PADDING = 96/);
  }
  for (const source of [locations, albumMap]) {
    assert.match(
      source,
      /const padding = controlsNear\s*\? MAP_CONTROL_PROXIMITY_EXIT_PADDING\s*: MAP_CONTROL_PROXIMITY_PADDING;/,
    );
  }
  assert.match(
    app,
    /const padding = locationsMapRailNear\s*\? MAP_CONTROL_PROXIMITY_EXIT_PADDING\s*: MAP_CONTROL_PROXIMITY_PADDING;/,
  );
  assert.match(
    app,
    /function setEmbeddedMapControlsNear\(near\)[\s\S]*locations-map:set-controls-near[\s\S]*album-map:set-controls-near/,
  );
  assert.match(
    app,
    /function syncLocationsMapRailFromControls\(near\)[\s\S]*near && locationsMapRailHoverOnlyActive\(\)[\s\S]*revealLocationsMapRail\(\)/,
  );
  for (const source of [locations, albumMap]) {
    assert.match(
      source,
      /message\.type === "[^"]+:set-controls-near"[\s\S]*controlsNear = message\.near === true \|\| controlPointerHovered\(\);[\s\S]*map-buttons-near/,
    );
    assert.match(source, /controlsNear,\s*\}\);/);
  }
  assert.match(
    app,
    /syncLocationsMapRailFromControls\(message\.controlsNear === true\)/,
  );
  for (const source of [locations, albumMap]) {
    assert.match(
      source,
      /function controlPointerHovered\(\)[\s\S]*element\.matches\(":hover"\)/,
    );
    assert.match(source, /controlPointerHovered\(\) \|\|/);
  }
  assert.match(app, /rail\.matches\(":hover"\)\s*\|\|/);
});

test("关闭照片栏时先从底部下落退场，再隐藏", () => {
  assert.match(
    app,
    /function playMapFilmstripEntrance\(nav\)[\s\S]*classList\.add\("is-filmstrip-entering"\)/,
  );
  assert.match(
    app,
    /function playMapFilmstripExit\(nav, onFinished = null\)[\s\S]*classList\.add\("is-filmstrip-exiting"\)[\s\S]*onFinished\?\.\(\);/,
  );
  assert.match(
    app,
    /function syncLocationsMapFilmstripVisibility\(\)[\s\S]*const wasDisabled = nav\.classList\.contains\("map-filmstrip-disabled"\);[\s\S]*playMapFilmstripExit\(nav,[\s\S]*map-filmstrip-disabled/,
  );
  assert.match(
    app,
    /function syncLocationsMapFilmstripVisibility\(\)[\s\S]*if \(showLocationMapFilmstrip\) \{[\s\S]*if \(nav\.hidden\) \{[\s\S]*renderMapFilmstrip\("locations"\);[\s\S]*if \(nav\.hidden\) return;/,
  );
  assert.match(
    app,
    /function syncAlbumMapFilmstripVisibility\([\s\S]*if \(showLocationMapFilmstrip\) \{[\s\S]*if \(nav\.hidden\) \{[\s\S]*renderMapFilmstrip\("album"\);[\s\S]*if \(nav\.hidden\) return;/,
  );
  assert.match(
    app,
    /function revealMapFilmstripAfterFlight\(kind\)[\s\S]*renderMapFilmstrip\(kind\);[\s\S]*if \(!showLocationMapFilmstrip\) \{[\s\S]*syncLocationsMapFilmstripVisibility\(\)[\s\S]*syncAlbumMapFilmstripVisibility\(\)[\s\S]*return;[\s\S]*playMapFilmstripEntrance\(nav\);/,
  );
  assert.match(
    css,
    /\.map-filmstrip\.is-filmstrip-exiting\s*\{[\s\S]*animation:\s*map-filmstrip-exit 240ms/,
  );
  assert.match(
    css,
    /@keyframes map-filmstrip-exit\s*\{[\s\S]*translate\(-50%, calc\(100% \+ 28px\)\)/,
  );
});

test("地图控制组使用一致的淡出缩放过渡并尊重减少动态效果", () => {
  assert.match(
    globeCss,
    /--map-controls-motion-duration:\s*140ms;[\s\S]*--map-controls-exit-duration:\s*120ms;[\s\S]*--map-controls-motion-ease:\s*cubic-bezier\(0\.23, 1, 0\.32, 1\);/,
  );
  assert.match(
    globeCss,
    /\.map-buttons-hover-only:not\([\s\S]*scale:\s*0\.97;[\s\S]*visibility:\s*hidden;/,
  );
  assert.match(
    globeCss,
    /@media \(prefers-reduced-motion: reduce\)[\s\S]*scale:\s*1 !important;[\s\S]*opacity 80ms linear/,
  );
  assert.match(
    css,
    /html\.locations-rail-hover-only #sidebarRailBtn:not\(\.is-near\)[\s\S]*scale:\s*0\.97;[\s\S]*opacity 120ms var\(--ease-out\)/,
  );
});

test("相簿栏悬停展开时不套用地图收起按钮的偏移样式", () => {
  const mapRailStyles = [
    ...css.matchAll(
      /html\.locations-map-titlebar-hidden\.sidebar-rail-is-collapsed[^{]+\{/g,
    ),
  ].map((match) => match[0]);
  assert.ok(mapRailStyles.length >= 4);
  for (const selector of mapRailStyles) {
    assert.match(selector, /:not\(\s*\.sidebar-hover-peek-open\s*\)/);
  }
});
