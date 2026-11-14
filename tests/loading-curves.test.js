const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const root = path.resolve(__dirname, "..");
const read = (name) => fs.readFileSync(path.join(root, "web", name), "utf8");

test("曲线加载器复用同一组 SVG 路径并接入静态加载点", () => {
  const html = read("index.html");
  assert.match(html, /id="fotora-spiral-search-path"\s+pathLength="100"/);
  assert.match(
    html,
    /class="startup-loading"[\s\S]*fotora-curve-loader--circle[\s\S]*正在打开图库/,
  );
  assert.match(
    html,
    /id="photoWallLoading"[\s\S]*fotora-curve-loader--lemniscate[\s\S]*data-curve-loader="lemniscate"[\s\S]*<\/div>/,
  );
  assert.doesNotMatch(html, /photoWallLoadingText|正在载入照片墙/);
  assert.equal(
    (html.match(/data-curve-loader="thinking-five"/g) || []).length,
    0,
    "静态页不再使用 Thinking Five 载入器",
  );
  assert.equal(
    (html.match(/data-curve-loader="circle"/g) || []).length,
    3,
    "启动页和两处地图应使用圆形轨迹载入器",
  );
  assert.equal(
    (html.match(/data-curve-loader="lemniscate"/g) || []).length,
    1,
    "照片墙应使用 Lemniscate Bloom 载入器",
  );
});

test("状态栏、视频缓冲与空图库使用对应的曲线动画", () => {
  const app = read("app.js");
  assert.match(app, /function curveLoaderMarkup\(kind = "circle"/);
  assert.match(app, /curveLoaderMarkup\("rose"\)/);
  assert.match(
    app,
    /ROSE_ORBIT_CONFIG = Object\.freeze\(\{\s*orbitRadius: 7,[\s\S]*particleCount: 96,[\s\S]*trailSpan: 0\.9,[\s\S]*durationMs: 5200,[\s\S]*pulseDurationMs: 4600/,
  );
  assert.match(
    app,
    /roseOrbitPoint\(progress, detailScale\)[\s\S]*Math\.cos\(k \* t\)[\s\S]*radius \* ROSE_ORBIT_CONFIG\.curveScale/,
  );
  assert.match(
    app,
    /function roseOrbitRotation\(time\)[\s\S]*-\s*\(\s*\(time % ROSE_ORBIT_CONFIG\.rotationDurationMs\)[\s\S]*\* 360/,
  );
  assert.match(
    app,
    /group\.appendChild\(circle\)[\s\S]*roseCurveLoaderInstances\.add\(instance\)/,
  );
  assert.match(app, /progress - tailOffset \* ROSE_ORBIT_CONFIG\.trailSpan/);
  assert.match(
    app,
    /ROSE_ORBIT_TIME_ORIGIN = performance\.now\(\)[\s\S]*ROSE_ORBIT_PHASE_OFFSET = 0\.38[\s\S]*startedAt: ROSE_ORBIT_TIME_ORIGIN,[\s\S]*phaseOffset: ROSE_ORBIT_PHASE_OFFSET/,
  );
  assert.match(
    app,
    /SPIRAL_SEARCH_CONFIG = Object\.freeze\(\{\s*particleCount: 86,[\s\S]*trailSpan: 0\.28,[\s\S]*durationMs: 6500,[\s\S]*pulseDurationMs: 5800,[\s\S]*searchTurns: 4,[\s\S]*searchBaseRadius: 8,[\s\S]*searchRadiusAmp: 8\.5,[\s\S]*searchPulse: 2\.4/,
  );
  assert.match(
    app,
    /spiralSearchPoint\(progress, detailScale\)[\s\S]*Math\.cos\(angle\) \* radius \* SPIRAL_SEARCH_CONFIG\.searchScale/,
  );
  assert.match(app, /progress - tailOffset \* SPIRAL_SEARCH_CONFIG\.trailSpan/);
  assert.match(
    app,
    /THINKING_FIVE_CONFIG = Object\.freeze\(\{\s*particleCount: 62,[\s\S]*trailSpan: 0\.38,[\s\S]*durationMs: 2500,[\s\S]*pulseDurationMs: 2300,[\s\S]*baseRadius: 7,[\s\S]*detailAmplitude: 3,[\s\S]*petalCount: 5/,
  );
  assert.match(
    app,
    /CIRCLE_LOADER_CONFIG = Object\.freeze\(\{\s*particleCount: 56,[\s\S]*trailSpan: 0\.36,[\s\S]*durationMs: 1000,[\s\S]*radius: 30/,
  );
  assert.match(
    app,
    /circleCurveLoaderParticle\(index, progress\)[\s\S]*Math\.cos\(angle\) \* CIRCLE_LOADER_CONFIG\.radius[\s\S]*Math\.sin\(angle\) \* CIRCLE_LOADER_CONFIG\.radius/,
  );
  assert.match(
    app,
    /LEMNISCATE_LOADER_CONFIG = Object\.freeze\(\{\s*particleCount: 70,[\s\S]*trailSpan: 0\.4,[\s\S]*durationMs: 1000,[\s\S]*pulseDurationMs: 5000,[\s\S]*strokeWidth: 4\.8,[\s\S]*curveScale: 20,[\s\S]*pulseAmplitude: 7/,
  );
  assert.match(
    app,
    /function lemniscateLoaderPoint\(progress, detailScale\)[\s\S]*1 \+ Math\.sin\(t\) \*\* 2[\s\S]*scale \* Math\.cos\(t\)[\s\S]*scale \* Math\.sin\(t\) \* Math\.cos\(t\)/,
  );
  assert.match(
    app,
    /curveLoaderMarkup\("circle", "fotora-curve-loader--compact"\)/,
  );
  assert.match(
    app,
    /loader\.className = "viewer-buffer-loader"[\s\S]*curveLoaderMarkup\("circle"\)/,
  );
});

test("照片墙只使用父页面全屏双纽线加载层", () => {
  const html = read("photo-wall/index.html");
  const css = read("photo-wall/assets/index-Bw9XBx1B.css");
  const bundles = [
    "photo-wall/assets/PhotoWallMasonry-_qPngKll.js",
    "photo-wall/assets/PhotoWallFolia-3NPRz3QQ.js",
    "photo-wall/assets/PhotoWallFilmroll-BfTKsO-t.js",
    "photo-wall/assets/InterlockWall-DJHsiduu.js",
  ];

  assert.doesNotMatch(html, /photo-wall\/loading-circle\.js/);
  assert.doesNotMatch(html, /class="photo-wall-loading"/);
  assert.match(
    css,
    /\.photo-wall-loading\s*\{[\s\S]*display:\s*none !important;/,
  );
  assert.match(
    css,
    /html\.photo-wall-exiting \.photo-wall-loading\s*\{\s*display:\s*none !important;/,
  );

  for (const bundle of bundles) {
    const source = read(bundle);
    assert.match(source, /className: `photo-wall-loading`/);
    assert.doesNotMatch(
      source,
      /正在打开(纵向画廊|错落磁贴|横向胶卷|嵌合拼图)/,
    );
  }
});

test("加载曲线速度、动态效果降级与空图库慢速节奏已定义", () => {
  const app = read("app.js");
  const css = read("styles.css");
  assert.match(
    css,
    /\.fotora-curve-loader__trail\s*\{[\s\S]*animation:\s*fotora-curve-flow 6\.5s linear infinite;/,
  );
  assert.match(css, /\.fotora-curve-loader__track\s*\{[\s\S]*opacity:\s*0;/);
  assert.match(
    css,
    /\.fotora-curve-loader--thinking-five\s*\{\s*color:\s*var\(--accent\);/,
  );
  assert.match(
    css,
    /\.fotora-curve-loader--circle\s*\{\s*color:\s*var\(--accent\);/,
  );
  assert.match(
    app,
    /THINKING_FIVE_CONFIG = Object\.freeze\(\{\s*particleCount: 62,[\s\S]*durationMs: 2500,/,
  );
  assert.match(
    app,
    /const fade = Math\.pow\(1 - tailOffset, 0\.56\)[\s\S]*0\.9 \+ fade \* 2\.7[\s\S]*0\.04 \+ fade \* 0\.96/,
  );
  assert.match(
    css,
    /\.fotora-curve-loader--compact\s*\{\s*--curve-loader-size:\s*20px;/,
  );
  assert.match(
    css,
    /\.fotora-curve-loader--spiral \.fotora-curve-loader__trail--tail\s*\{[\s\S]*stroke-opacity:\s*0\.18;[\s\S]*stroke-dasharray:\s*30 70;/,
  );
  assert.match(
    css,
    /\.fotora-curve-loader--spiral \.fotora-curve-loader__trail--head\s*\{[\s\S]*stroke-opacity:\s*1;/,
  );
  assert.match(
    css,
    /@media \(prefers-reduced-motion: reduce\)[\s\S]*fotora-curve-opacity/,
  );
  assert.match(
    css,
    /\.welcome-pick-icon\s*\{[\s\S]*border:\s*0;[\s\S]*color:\s*var\(--text\);/,
  );
  assert.match(
    css,
    /\.welcome-pick-icon \.fotora-curve-loader\s*\{[\s\S]*color:\s*var\(--accent\);/,
  );
  assert.match(
    css,
    /\.empty-state\.welcome\s*\{\s*position:\s*fixed;\s*inset:\s*0;\s*height:\s*auto;/,
  );
  assert.match(
    css,
    /html:not\(\.sidebar-rail-is-collapsed\) \.empty-state\.welcome\s*\{\s*transform:\s*translateX\(calc\(var\(--sidebar-visible-width\) \/ 2\)\);/,
  );
  assert.match(
    css,
    /html\.no-root-directory #sidebarRailBtn,\s*html\.no-root-directory \.sidebar-hover-edge,\s*html\.no-root-directory \.sidebar\s*\{\s*display:\s*none;/,
  );
  assert.match(
    css,
    /html\.no-root-directory \.toolbar\s*\{\s*display:\s*none;/,
  );
  assert.match(
    css,
    /html\.no-root-directory \.content,[\s\S]*html\.no-root-directory\.blur-titlebar:not\(\.transparent-titlebar\) \.content,[\s\S]*html\.no-root-directory\.transparent-titlebar \.content\s*\{\s*padding-top:\s*0;/,
  );
  assert.match(
    css,
    /html\.no-root-directory \.empty-state\.welcome\s*\{\s*transform:\s*none;/,
  );
  assert.match(
    css,
    /\.content-crossfade-snapshot \.empty-state\.welcome\s*\{\s*display:\s*none;/,
  );
  assert.match(
    css,
    /\.welcome-pick-icon \.fotora-curve-loader\s*\{[\s\S]*--curve-loader-size:\s*96px;/,
  );
  assert.doesNotMatch(
    css,
    /\.fotora-curve-loader--rose \.fotora-curve-loader__group\s*\{[^}]*transform-origin/,
  );
  assert.doesNotMatch(css, /\.spinner\s*\{/);
});

test("地图进入时只淡化当前可见照片，载入与相机飞行不被阻塞", () => {
  const app = read("app.js");
  const css = read("styles.css");
  const albumMap = read("map/album-map.js");
  const locationsMap = read("map/locations.js");
  const globe = read("map/embedded-globe.js");
  assert.match(app, /MAP_ENTRY_FADE_MS = 220/);
  assert.match(app, /MAP_ENTRY_FADE_SCALE = 0\.96/);
  assert.match(app, /MAP_HOST_ENTRY_MS = 180/);
  assert.match(
    app,
    /function playMapEntryFade\(motion\)[\s\S]*opacity: 1, scale: "1"[\s\S]*opacity: 0, scale: String\(MAP_ENTRY_FADE_SCALE\)[\s\S]*const animation = snapshot\.animate\(keyframes/,
  );
  const playMapEntryFade = app.slice(
    app.indexOf("function playMapEntryFade"),
    app.indexOf(
      "function mapFilmstripPhotos",
      app.indexOf("function playMapEntryFade"),
    ),
  );
  assert.doesNotMatch(
    playMapEntryFade,
    /targets\.map\(|querySelectorAll\("\.photo-grid \.tile"\)/,
  );
  assert.match(
    app,
    /function beginMapEntryFade\(\)[\s\S]*document\.createElement\("div"\)[\s\S]*querySelectorAll\("\.tile"\)[\s\S]*cloneNode\(true\)/,
  );
  assert.match(app, /snapshot\.style\.left = `\$\{motion\.rect\.left\}px`/);
  const beginMapEntryFade = app.slice(
    app.indexOf("function beginMapEntryFade"),
    app.indexOf(
      "function playMapEntryFade",
      app.indexOf("function beginMapEntryFade"),
    ),
  );
  assert.doesNotMatch(beginMapEntryFade, /cloneContentSnapshot\(content\)/);
  assert.match(app, /easing: UI_EASE_OUT,[\s\S]*fill: "both"/);
  assert.match(
    app,
    /function showLocationsMapView\(\)[\s\S]*playMapEntryFade\(locationsMapEntryFade\)[\s\S]*host\.hidden = false;[\s\S]*animateMapHostEntry\(host\);[\s\S]*content\.hidden = true/,
  );
  assert.match(
    app,
    /function showAlbumMapView\(\)[\s\S]*playMapEntryFade\(albumMapEntryFade\)[\s\S]*host\.hidden = false;[\s\S]*animateMapHostEntry\(host\);[\s\S]*mountAlbumMap\(\)/,
  );
  assert.match(
    app,
    /function animateMapHostEntry\(host\)[\s\S]*frame\.animate\(\[\{ opacity: 0 \}, \{ opacity: 1 \}\]/,
  );
  assert.doesNotMatch(
    app.slice(
      app.indexOf("function animateMapHostEntry"),
      app.indexOf(
        "function animateMapHostExit",
        app.indexOf("function animateMapHostEntry"),
      ),
    ),
    /MAP_HOST_ENTRY_SCALE|scale:/,
  );
  assert.match(
    app,
    /albumMapEntryFade = beginMapEntryFade\(\)[\s\S]*state\.albumMapOpen = true[\s\S]*render\(\)/,
  );
  assert.match(
    app,
    /locationsMapEntryFade = beginMapEntryFade\(\)[\s\S]*beginLocationsMapLoading\(\)/,
  );
  assert.doesNotMatch(app, /MAP_LOADING_FULL_CYCLE_MS/);
  assert.doesNotMatch(app, /playMapContentCrossfade\(/);
  assert.doesNotMatch(app, /animateMapLoadingCrossfadeIn\(/);
  assert.match(
    css,
    /\.locations-map-host\s*\{\s*position:\s*absolute;\s*inset:\s*0;/,
  );
  assert.match(
    css,
    /\.album-map-host\s*\{\s*position:\s*absolute;\s*inset:\s*0;/,
  );
  assert.doesNotMatch(
    css,
    /html\.locations-map-titlebar-hidden \.toolbar\s*\{\s*display:\s*none;/,
  );
  assert.match(
    css,
    /html\.locations-map-titlebar-hidden \.toolbar\s*\{[\s\S]*opacity:\s*0;[\s\S]*visibility:\s*hidden;[\s\S]*transform:\s*translateY\(-6px\);/,
  );
  assert.equal(
    (css.match(/opacity 140ms var\(--ease-out\)/g) || []).length >= 4,
    true,
  );
  assert.match(
    app,
    /albumMapDeferredInitialFit = false;[\s\S]*postToAlbumMap\(\{ type: "album-map:animate-fit" \}\)/,
  );
  assert.match(
    albumMap,
    /message\.type === "album-map:animate-fit"[\s\S]*globe\.flyToFit\(\{[\s\S]*onComplete: \(\) => post\("album-map:fit-complete"\)/,
  );
  assert.match(
    locationsMap,
    /message\.type === "locations-map:animate-fit"[\s\S]*globe\.flyToFit\(\{[\s\S]*onComplete: \(\) => post\("locations-map:fit-complete"\)/,
  );
  assert.match(
    albumMap,
    /message\.type === "album-map:reset-globe"[\s\S]*globe\.resetToGlobe\(\)/,
  );
  assert.match(
    locationsMap,
    /message\.type === "locations-map:reset-globe"[\s\S]*globe\.resetToGlobe\(\)/,
  );
  assert.match(
    globe,
    /resetToGlobe\(\)\s*\{\s*this\.resetView\(\{ fitItems: false \}\);/,
  );
  assert.match(
    app,
    /function showLocationsMapView\(\)[\s\S]*locations-map:reset-globe/,
  );
  assert.match(
    app,
    /function showAlbumMapView\(\)[\s\S]*album-map:reset-globe/,
  );
  assert.match(app, /restartLemniscateCurveLoader\(layer\)/);
  assert.match(app, /restartCircleCurveLoader\(\$\("#albumMapLoading"\)\)/);
});

test("地图照片栏在相机飞行完成后从底部推出", () => {
  const app = read("app.js");
  const css = read("styles.css");
  const albumMap = read("map/album-map.js");
  const locationsMap = read("map/locations.js");
  const globe = read("map/embedded-globe.js");

  assert.match(
    app,
    /locationsMapFilmstripDeferred = true;[\s\S]*albumMapFilmstripDeferred = true;/,
  );
  assert.match(
    app,
    /function revealMapFilmstripAfterFlight\(kind\)[\s\S]*playMapFilmstripEntrance\(nav\)/,
  );
  assert.match(
    app,
    /locations-map:fit-complete[\s\S]*revealMapFilmstripAfterFlight\("locations"\)/,
  );
  assert.match(
    app,
    /album-map:fit-complete[\s\S]*revealMapFilmstripAfterFlight\("album"\)/,
  );
  assert.match(
    globe,
    /flyToFit\(\{ onComplete = null \} = \{\}\)[\s\S]*onComplete\?\.\(\)/,
  );
  assert.match(
    albumMap,
    /globe\.flyToFit\(\{\s*onComplete: \(\) => post\("album-map:fit-complete"\)/,
  );
  assert.match(
    locationsMap,
    /globe\.flyToFit\(\{\s*onComplete: \(\) => post\("locations-map:fit-complete"\)/,
  );
  assert.match(
    css,
    /\.map-filmstrip\.is-filmstrip-entering\s*\{\s*animation:\s*map-filmstrip-reveal 300ms var\(--ease-out\) both;/,
  );
});

test("相簿栏无图库时默认收起，有图库时默认展开并记住用户选择", () => {
  const app = read("app.js");
  assert.match(
    app,
    /const SIDEBAR_RAIL_COLLAPSED_KEY = "sidebar-rail-collapsed"/,
  );
  assert.match(
    app,
    /function readSidebarRailCollapsed\(\)[\s\S]*stored == null \? null/,
  );
  assert.match(
    app,
    /const storedSidebarRailCollapsed = readSidebarRailCollapsed\(\);[\s\S]*hoverExpandSidebar \|\|[\s\S]*storedSidebarRailCollapsed \?\? state\.roots\.length === 0[\s\S]*setSidebarRailCollapsed\(true, \{ animate: false \}\)/,
  );
  assert.match(
    app,
    /setSidebarRailCollapsed\(nextCollapsed\);[\s\S]*writeSidebarRailCollapsed\(nextCollapsed\)/,
  );
});

test("悬停展开相簿栏在照片墙资料库根页仍然有效", () => {
  const app = read("app.js");
  const css = read("styles.css");
  const interactionBlock = app.slice(
    app.indexOf("function sidebarHoverPeekInteractionAllowed"),
    app.indexOf("function clearSidebarHoverPeekTimers"),
  );
  const modeBlock = app.slice(
    app.indexOf("function syncSidebarHoverPeekMode"),
    app.indexOf("function applySidebarRailHoverMemory"),
  );
  assert.match(
    interactionBlock,
    /hoverExpandSidebar\s*&&\s*sidebarRailCollapsed\s*&&\s*!askOpen/,
  );
  assert.doesNotMatch(interactionBlock, /photoWallLibraryRailIsLocked/);
  assert.match(
    modeBlock,
    /const ready =\s*hoverExpandSidebar\s*&&\s*sidebarRailCollapsed;/,
  );
  assert.doesNotMatch(modeBlock, /photoWallLibraryRailIsLocked/);
  assert.match(
    css,
    /html\.sidebar-hover-expand:not\(\.sidebar-hover-peek-open\)\s*\.sidebar\.is-rail-collapsed\s*\+\s*\.main\s*#toolbarLeftZone\s*\{\s*padding-left:\s*0;/,
  );
});

test("地图左上角按钮保护区不会触发相簿栏悬停展开", () => {
  const app = read("app.js");
  const css = read("styles.css");
  const safeZoneBlock = app.slice(
    app.indexOf("function sidebarHoverPointerInMapSafeZone"),
    app.indexOf("function sidebarHoverPeekPointerNear"),
  );
  const pointerNearBlock = app.slice(
    app.indexOf("function sidebarHoverPeekPointerNear"),
    app.indexOf("function scheduleSidebarHoverPeekOpen"),
  );
  assert.match(
    app,
    /SIDEBAR_MAP_HOVER_SAFE_ZONE_WIDTH = 96;[\s\S]*SIDEBAR_MAP_HOVER_SAFE_ZONE_BOTTOM = 112;/,
  );
  assert.match(safeZoneBlock, /locations-map-titlebar-hidden/);
  assert.match(safeZoneBlock, /x <= SIDEBAR_MAP_HOVER_SAFE_ZONE_WIDTH/);
  assert.match(safeZoneBlock, /y < SIDEBAR_MAP_HOVER_SAFE_ZONE_BOTTOM/);
  assert.match(
    pointerNearBlock,
    /sidebarHoverPointerInMapSafeZone\(x, y\)\) return false;\s*if \(x <= 40\) return true;/,
  );
  assert.match(
    css,
    /html\.locations-map-titlebar-hidden\.sidebar-hover-expand\.sidebar-rail-is-collapsed\s*\.sidebar-hover-edge:not\(\.is-disabled\)\s*\{\s*top:\s*112px;/,
  );
});
