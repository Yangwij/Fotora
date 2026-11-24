const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const root = path.join(__dirname, "..");
const read = (...parts) => fs.readFileSync(path.join(root, ...parts), "utf8");
const css = read("web", "map", "globe-map.css");
const globe = read("web", "map", "embedded-globe.js");
const albumMap = read("web", "map", "album-map.js");
const locations = read("web", "map", "locations.js");

test("定位反馈只有照片背后一圈柔光，不再有水波残留", () => {
  assert.match(
    css,
    /\.pm-ping\.on \.pm-ping-halo \{[\s\S]{0,90}?animation: pmPingHalo 600ms/,
  );
  assert.match(
    css,
    /@keyframes pmPingHalo \{[\s\S]{0,600}?transform: scale\(1\.15\)/,
  );
  assert.doesNotMatch(css, /pmPingWave/);
  assert.doesNotMatch(css, /\.pm-ping\.on::before/);
  assert.doesNotMatch(css, /\.pm-ping\.on::after/);
  assert.doesNotMatch(globe, /PING_WAVE|pingGroundSquash|--pm-ping-drop/);
});

test("柔光贴着照片边缘发散，画在照片后面不遮挡缩略图", () => {
  assert.match(globe, /element\.insertBefore\(ring, image\)/);
  assert.match(css, /\.pm-photo-icon img \{[\s\S]{0,140}?z-index: 1;/);
  /* 柔光盒和照片边框盒完全重合：留出缝隙就会读成一个独立的浮框。 */
  assert.match(css, /\.pm-ping-halo \{[^}]*inset: 0;/);
  assert.doesNotMatch(css, /\.pm-ping-halo \{[^}]*inset: -/);
  /* 起手略小于照片、收手往外扩，光是从照片边缘渗出来再发散的。 */
  assert.match(
    css,
    /@keyframes pmPingHalo \{[\s\S]{0,260}?transform: scale\(0\.98\);/,
  );
  /* 圆角跟着照片一起缩放，不再补偿那圈外扩。 */
  assert.match(
    globe,
    /halo\.style\.borderRadius = `\$\{Math\.max\(1, Math\.round\(4 \* scale\)\)\}px`;/,
  );
});

test("柔光只在点击照片栏、飞行落定之后出现", () => {
  /* 直接点地图上的照片标记不亮柔光。 */
  const activate = globe.slice(
    globe.indexOf("activateMarkerGroup(group,"),
    globe.indexOf("clearMarkers() {"),
  );
  assert.ok(activate.length > 0);
  assert.doesNotMatch(activate, /pingMarker\(\)/);

  /* focusItem 默认不发柔光，只有照片栏点击那条消息显式打开。 */
  assert.match(
    globe,
    /focusItem\(id, \{ zoom = 12, ripple = false, keepZoom = true \} = \{\}\)/,
  );
  assert.match(
    albumMap,
    /globe\.focusItem\(message\.id, \{\s*zoom: 12,\s*ripple: true,/,
  );
  assert.match(
    locations,
    /globe\.focusItem\(message\.id, \{\s*zoom: 12,\s*ripple: true,/,
  );

  /* 全部柔光调用都在飞行的 ripple 门控里：落定那一下才亮。 */
  assert.equal((globe.match(/this\.pingMarker\(\)/g) || []).length, 3);
  assert.match(globe, /if \(options\.ripple\) this\.pingMarker\(\);/);
  assert.match(globe, /if \(zoomLevels < 0\.05\) this\.pingMarker\(\);/);
  assert.match(
    globe,
    /if \(generation === this\.flyGen\) this\.pingMarker\(\);/,
  );
});

test("柔光播完自己收掉，重开地图不会重播", () => {
  assert.match(globe, /const PING_HALO_MS = 600;/);
  assert.match(globe, /const PING_HALO_TAIL_MS = 80;/);
  assert.match(
    globe,
    /this\.pingTimer = setTimeout\(\(\) => \{[\s\S]{0,160}?if \(this\.pingHost === element\) this\.clearPing\(\);[\s\S]{0,80}?\}, PING_HALO_MS \+ PING_HALO_TAIL_MS\);/,
  );
  /* 标记已经被移出 DOM 时也要摘掉节点，否则挂回来动画就重播一次。 */
  const clear = globe.slice(
    globe.indexOf("clearPing() {"),
    globe.indexOf("pingMarker() {"),
  );
  assert.ok(clear.length > 0);
  assert.match(clear, /clearTimeout\(this\.pingTimer\)/);
  assert.match(clear, /host\?\.querySelector\("\.pm-ping"\)\?\.remove\(\)/);
  assert.doesNotMatch(clear, /isConnected/);
  assert.match(globe, /clearMarkers\(\) \{\s*this\.clearPing\(\);/);
});

test("柔光颜色跟随主题强调色，卫星图上再提亮一档", () => {
  assert.match(css, /--pm-ping-color: var\(--accent, #0a84ff\)/);
  assert.match(
    css,
    /body\.is-satellite \.pm-ping \{[\s\S]*?--pm-ping-color: color-mix/,
  );
});

test("换照片时收掉上一张的柔光节点", () => {
  assert.match(globe, /clearPing\(\) \{[\s\S]*?querySelector\("\.pm-ping"\)/);
  assert.match(
    globe,
    /if \(this\.pingHost && this\.pingHost !== element\) this\.clearPing\(\);/,
  );
});

test("减少动态时只保留一次不透明度短闪", () => {
  const reduced = css.slice(
    css.indexOf("@media (prefers-reduced-motion: reduce)"),
  );
  assert.ok(reduced.length > 0);
  assert.match(
    reduced,
    /\.pm-ping\.on \.pm-ping-halo \{\s*transform: scale\(1\);\s*animation: pmPingHaloReduced 220ms ease-out/,
  );
  assert.doesNotMatch(reduced, /pmPingWave/);
});
