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

test("照片定位轮廓原地闪两次，不再有水波式缩放", () => {
  assert.match(
    css,
    /\.pm-ping\.on \.pm-ping-halo \{[\s\S]{0,120}?animation: pmPhotoFlashTwice 520ms/,
  );
  const flashKeyframes = css.slice(
    css.indexOf("@keyframes pmPhotoFlashTwice"),
    css.indexOf("/* 卫星图偏暗"),
  );
  assert.ok(flashKeyframes.length > 0);
  assert.equal((flashKeyframes.match(/opacity: 1;/g) || []).length, 2);
  assert.doesNotMatch(flashKeyframes, /transform:/);
  assert.doesNotMatch(css, /pmPingHalo|scale\(1\.15\)/);
  assert.doesNotMatch(css, /pmPingWave/);
  assert.doesNotMatch(css, /\.pm-ping\.on::before/);
  assert.doesNotMatch(css, /\.pm-ping\.on::after/);
  assert.doesNotMatch(globe, /PING_WAVE|pingGroundSquash|--pm-ping-drop/);
});

test("双闪轮廓贴着照片边缘，画在照片后面不遮挡缩略图", () => {
  assert.match(globe, /element\.insertBefore\(ring, image\)/);
  assert.match(css, /\.pm-photo-icon img \{[\s\S]{0,140}?z-index: 1;/);
  /* 轮廓盒和照片边框盒完全重合：留出缝隙就会读成一个独立的浮框。 */
  assert.match(css, /\.pm-ping-halo \{[^}]*inset: 0;/);
  assert.doesNotMatch(css, /\.pm-ping-halo \{[^}]*inset: -/);
  /* 只闪不缩放，确保视觉效果仍然贴着照片。 */
  assert.doesNotMatch(
    css.slice(
      css.indexOf(".pm-ping-halo {"),
      css.indexOf(".pm-ping.on .pm-ping-halo"),
    ),
    /transform:/,
  );
  assert.match(
    css,
    /\.pm-ping-halo \{[^}]*0 0 0 1\.5px var\(--pm-ping-color\)[\s\S]*?0 0 28px 7px var\(--pm-ping-glow\)/,
  );
  /* 圆角与照片尺寸保持一致。 */
  assert.match(
    globe,
    /halo\.style\.borderRadius = `\$\{Math\.max\(1, Math\.round\(4 \* scale\)\)\}px`;/,
  );
});

test("双闪只在点击照片栏、飞行落定之后出现", () => {
  /* 直接点地图上的照片标记不触发双闪。 */
  const activate = globe.slice(
    globe.indexOf("activateMarkerGroup(group,"),
    globe.indexOf("clearMarkers() {"),
  );
  assert.ok(activate.length > 0);
  assert.doesNotMatch(activate, /flashMarker\(\)/);

  /* focusItem 默认不闪，只有照片栏点击那条消息显式打开。 */
  assert.match(
    globe,
    /focusItem\(id, \{ zoom = 12, flash = false, keepZoom = true \} = \{\}\)/,
  );
  assert.match(
    albumMap,
    /globe\.focusItem\(message\.id, \{\s*zoom: 12,\s*flash: true,/,
  );
  assert.match(
    locations,
    /globe\.focusItem\(message\.id, \{\s*zoom: 12,\s*flash: true,/,
  );

  /* 全部双闪调用都在飞行的 flash 门控里：落定之后才开始。 */
  assert.equal((globe.match(/this\.flashMarker\(\)/g) || []).length, 3);
  assert.match(globe, /if \(options\.flash\) this\.flashMarker\(\);/);
  assert.match(globe, /if \(zoomLevels < 0\.05\) this\.flashMarker\(\);/);
  assert.match(
    globe,
    /if \(generation === this\.flyGen\) this\.flashMarker\(\);/,
  );
});

test("双闪播完自己收掉，重开地图不会重播", () => {
  assert.match(globe, /const PHOTO_FLASH_MS = 520;/);
  assert.match(globe, /const PHOTO_FLASH_TAIL_MS = 60;/);
  assert.match(
    globe,
    /this\.flashTimer = setTimeout\(\(\) => \{[\s\S]{0,160}?if \(this\.flashHost === element\) this\.clearFlash\(\);[\s\S]{0,80}?\}, PHOTO_FLASH_MS \+ PHOTO_FLASH_TAIL_MS\);/,
  );
  /* 标记已经被移出 DOM 时也要摘掉节点，否则挂回来动画就重播一次。 */
  const clear = globe.slice(
    globe.indexOf("clearFlash() {"),
    globe.indexOf("flashMarker() {"),
  );
  assert.ok(clear.length > 0);
  assert.match(clear, /clearTimeout\(this\.flashTimer\)/);
  assert.match(clear, /host\?\.querySelector\("\.pm-ping"\)\?\.remove\(\)/);
  assert.doesNotMatch(clear, /isConnected/);
  assert.match(globe, /clearMarkers\(\) \{\s*this\.clearFlash\(\);/);
});

test("双闪颜色跟随主题强调色，卫星图上再提亮一档", () => {
  assert.match(css, /--pm-ping-color: var\(--accent, #0a84ff\)/);
  assert.match(
    css,
    /body\.is-satellite \.pm-ping \{[\s\S]*?--pm-ping-color: color-mix/,
  );
});

test("换照片时收掉上一张的双闪节点", () => {
  assert.match(globe, /clearFlash\(\) \{[\s\S]*?querySelector\("\.pm-ping"\)/);
  assert.match(
    globe,
    /if \(this\.flashHost && this\.flashHost !== element\) this\.clearFlash\(\);/,
  );
});

test("减少动态时只保留一次不透明度短闪", () => {
  const reduced = css.slice(
    css.lastIndexOf("@media (prefers-reduced-motion: reduce)"),
  );
  assert.ok(reduced.length > 0);
  assert.match(
    reduced,
    /\.pm-ping\.on \.pm-ping-halo \{\s*animation: pmPhotoFlashReduced 220ms\s*var\(--ease-out/,
  );
  assert.doesNotMatch(reduced, /pmPhotoFlashTwice|pmPingWave/);
});
