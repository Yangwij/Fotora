"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

const root = path.resolve(__dirname, "..");
const globe = fs.readFileSync(
  path.join(root, "web", "map", "embedded-globe.js"),
  "utf8",
);
const flatMap = fs.readFileSync(
  path.join(root, "web", "map", "map.js"),
  "utf8",
);
const albumMap = fs.readFileSync(
  path.join(root, "web", "map", "album-map.js"),
  "utf8",
);
const app = fs.readFileSync(path.join(root, "web", "app.js"), "utf8");

function embeddedGlobePrototype() {
  const context = {
    window: {},
    document: {
      body: {
        dataset: {},
        classList: { toggle() {} },
      },
    },
    console,
  };
  vm.runInNewContext(globe, context, {
    filename: "web/map/embedded-globe.js",
  });
  return context.window.EmbeddedGlobe.prototype;
}

test("切换卫星/矢量保持当前相机，不重新定位", () => {
  const fn = globe.slice(
    globe.indexOf("setStyleKind(nextKind) {"),
    globe.indexOf("setNetwork(enabled) {"),
  );
  /* 只读 pendingMapCenterSource（坐标系变化时才非空），不再每次切换
     都把当前中心做 GCJ/WGS 往返换算后 jumpTo 造成跳位。 */
  assert.match(fn, /const centerSource = this\.pendingMapCenterSource;/);
  assert.doesNotMatch(fn, /if \(!centerSource && this\.map\?\.getCenter\)/);
  /* 平面地图切换仅改图层可见性，不动相机。 */
  const flat = flatMap.slice(
    flatMap.indexOf("function setStyleKind(nextKind) {"),
    flatMap.indexOf("function hideSearchResults()"),
  );
  const flatSwitch = flatMap.slice(
    flatMap.indexOf("function syncStyleToggle()"),
    flatMap.indexOf("function hideSearchResults()"),
  );
  assert.doesNotMatch(flat, /jumpTo|flyTo|fitBounds|setCenter/);
  assert.doesNotMatch(flat, /map\.setStyle\(/);
  assert.match(flatSwitch, /map\.getLayer\(id\)/);
  assert.match(flatSwitch, /raster-opacity-transition/);
  assert.match(flatSwitch, /setPaintProperty\(id, "raster-opacity"/);
  assert.match(flatSwitch, /styleSwitchTimer = window\.setTimeout/);
  /* 图层显隐不碰相机，也不能中止首次打开地图的自动适配飞行。 */
  assert.doesNotMatch(flat, /dragInertia\?\.cancel\(\)|map\.stop\(\)/);
  assert.doesNotMatch(fn, /this\.cancelFly\(\)|this\.map\.stop\(\)/);
  assert.doesNotMatch(fn, /const keepCamera =/);
  assert.match(
    flatMap,
    /map\.on\("style\.load", \(\) => \{[\s\S]*?applyStyleKindToLayers\(\);/,
  );
  /* 点击照片栏照片仍定位：focusItem 走 flyToPlace，与切换互不影响。 */
  const focus = globe.slice(
    globe.indexOf("focusItem(id,"),
    globe.indexOf("flyToPlace(lng, lat, targetZoom"),
  );
  assert.match(focus, /this\.flyToPlace\(lng, lat, zoom/);
});

test("重复同步底图状态不会留下过期恢复中心", () => {
  const network = globe.slice(
    globe.indexOf("setNetwork(enabled) {"),
    globe.indexOf("setTileProvider(provider) {"),
  );
  assert.match(
    network,
    /const shouldReload =\s*!!this\.map &&\s*this\.mapLoaded &&\s*this\.appliedNetworkEnabled !== next;/,
  );
  assert.match(
    network,
    /if \(shouldReload\) this\.capturePendingMapCenter\(\);/,
  );
  assert.doesNotMatch(
    network,
    /if \(this\.map\?\.getCenter\) \{\s*const center = this\.map\.getCenter\(\);/,
  );

  const provider = globe.slice(
    globe.indexOf("setTileProvider(provider) {"),
    globe.indexOf("updateGlobeBackdrop() {"),
  );
  assert.match(
    provider,
    /const shouldReload =\s*!!this\.map &&\s*this\.mapLoaded &&\s*this\.appliedTileProvider !== next;/,
  );
  assert.match(
    provider,
    /if \(shouldReload\) this\.capturePendingMapCenter\(\);/,
  );
  assert.doesNotMatch(
    provider,
    /if \(this\.map\?\.getCenter\) \{\s*const center = this\.map\.getCenter\(\);/,
  );
});

test("相同底图状态不会改写当前拖动的恢复中心", () => {
  const prototype = embeddedGlobePrototype();
  const state = Object.assign(Object.create(prototype), {
    map: {
      getCenter: () => ({ lng: 121.5, lat: 31.2 }),
    },
    mapLoaded: true,
    appliedNetworkEnabled: true,
    networkEnabled: true,
    pendingMapCenterSource: null,
    clearMarkers() {
      throw new Error("相同状态不应清空标记");
    },
    reloadNetworkStyle() {
      throw new Error("相同状态不应重建底图");
    },
  });

  prototype.setNetwork.call(state, true);

  assert.equal(state.pendingMapCenterSource, null);
});

test("样式同步不会中止首次打开地图的自动定位", () => {
  const prototype = embeddedGlobePrototype();
  const state = Object.assign(Object.create(prototype), {
    mapLoaded: true,
    pendingMapCenterSource: null,
    networkEnabled: true,
    typeToggle: null,
    map: {
      getStyle: () => ({ layers: [] }),
      stop() {
        throw new Error("样式同步不应停止地图动画");
      },
    },
    cancelFly() {
      throw new Error("样式同步不应取消自动适配飞行");
    },
    renderMarkers() {},
  });

  prototype.setStyleKind.call(state, "satellite");

  assert.equal(state.styleKind, "satellite");
});

test("调整位置搜索栏内容不跨会话保留", () => {
  /* iframe 内不再记忆/上报搜索词。 */
  assert.doesNotMatch(flatMap, /rememberedSearchQuery/);
  assert.doesNotMatch(flatMap, /metadata-map:search-query-changed/);
  /* 父窗口不再存储搜索词，同步时只下发空串。 */
  const store = app.slice(
    app.indexOf('if (message.type === "metadata-map:search-query-changed")'),
    app.indexOf('if (message.type !== "metadata-map:location-change"'),
  );
  assert.doesNotMatch(store, /metadataLocationSearchQuery = String\(/);
  /* 退出调整位置时主动清空持久 iframe 的搜索栏。 */
  const close = app.slice(
    app.indexOf('metadataLocationSearchQuery = "";'),
    app.indexOf("metadataLocationAnims = animateDialogPairOut("),
  );
  assert.match(close, /type: "metadata-map:set-search-query",\s*query: "",/);
});

test("单张和多张位置搜索都会自动飞向首条结果", () => {
  for (const source of [flatMap, albumMap]) {
    const run = source.slice(
      source.indexOf("async function runSearch()"),
      source.indexOf(
        "searchForm",
        source.indexOf("async function runSearch()"),
      ),
    );
    assert.match(
      run,
      /renderSearchResults\(results\);\s*flyToSearchPlace\(results\[0\]\);/,
    );
    assert.doesNotMatch(run, /selectSearchPlace|scheduleSearchApply/);
    const fly = source.slice(
      source.indexOf("function flyToSearchPlace("),
      source.indexOf("async function searchPlaces(", source.indexOf("function flyToSearchPlace(")),
    );
    assert.doesNotMatch(fly, /searchInput\.value|selectPoint\(|setTarget\(|post\(/);
  }
});

test("地图就绪消息不会清空正在编辑的地点搜索", () => {
  const parent = app.slice(
    app.indexOf('metadataMapFrame?.addEventListener("load"'),
    app.indexOf('$("#metadataLocationMapRetry").addEventListener("click", retryMetadataMap)'),
  );
  assert.match(parent, /syncMetadataMap\(\);/);
  assert.doesNotMatch(parent, /syncMetadataMapSearch\(\);/);
});
