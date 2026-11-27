"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const root = path.resolve(__dirname, "..");
const app = fs.readFileSync(path.join(root, "web", "app.js"), "utf8");
const css = fs.readFileSync(path.join(root, "web", "styles.css"), "utf8");
const globeMapCss = fs.readFileSync(
  path.join(root, "web", "map", "globe-map.css"),
  "utf8",
);

function functionSource(name, nextName) {
  const start = app.indexOf(`function ${name}(`);
  const end = app.indexOf(`function ${nextName}(`, start);
  assert.ok(start >= 0, `${name} should exist`);
  assert.ok(end > start, `${nextName} should follow ${name}`);
  return app.slice(start, end);
}

test("鼠标靠近判定使用固定热区矩形", () => {
  const source = functionSource(
    "pointerWithinCornerMaterialReach",
    "cornerMaterialRect",
  );
  const isNear = new Function(
    `${source}\nreturn pointerWithinCornerMaterialReach;`,
  )();
  const rect = {
    left: 100,
    right: 180,
    top: 40,
    bottom: 72,
    width: 80,
    height: 32,
  };

  assert.equal(isNear(100, 40, rect, 4), true);
  assert.equal(isNear(96, 68, rect, 4), true);
  assert.equal(isNear(184, 36, rect, 4), true);
  assert.equal(isNear(95, 68, rect, 4), false);
  assert.equal(isNear(184, 35, rect, 4), false);
  assert.equal(isNear(Number.NaN, 40, rect, 4), false);
});

test("顶栏和选择底栏分别维护左右角的材质状态", () => {
  assert.match(app, /toolbarLeft: "toolbar-left-material-near"/);
  assert.match(app, /toolbarRight: "toolbar-right-material-near"/);
  assert.match(app, /selectionLeft: "selection-left-material-near"/);
  assert.match(app, /selectionRight: "selection-right-material-near"/);
  assert.match(app, /const CORNER_MATERIAL_ENTER_REACH_PX = 4;/);
  assert.match(app, /const CORNER_MATERIAL_EXIT_REACH_PX = 28;/);
  assert.match(app, /const CORNER_MATERIAL_EXIT_DELAY_MS = 110;/);
  assert.match(app, /const CORNER_MATERIAL_PADDING_PX = 42;/);
  assert.match(
    app,
    /cornerMaterialState\.toolbarLeft\s*\?\s*CORNER_MATERIAL_EXIT_REACH_PX\s*:\s*CORNER_MATERIAL_ENTER_REACH_PX/,
  );
  assert.match(
    app,
    /for \(const key of Object\.keys\(cornerMaterialClasses\)\)\s*\{[\s\S]*?commitCornerMaterialState\(key, nextActive\)/,
  );
  assert.match(
    app,
    /toolbarRight:\s*menuPinsRightTop \|\|\s*\(hasPointer &&\s*pointerWithinCornerMaterialReach\(/,
  );
  assert.match(
    app,
    /selectionLeft:\s*selectionVisible &&\s*\(pickerPinsSelectionLeft \|\|\s*\(hasPointer &&\s*pointerWithinCornerMaterialReach\(/,
  );
});

test("热区围绕按钮四周使用相同留距，并在离开后再延迟恢复", () => {
  const union = functionSource(
    "cornerMaterialUnion",
    "cornerMaterialLayoutAnchor",
  );
  assert.match(
    union,
    /Math\.min\(\.\.\.valid\.map\(\(rect\) => rect\.left\)\)/,
  );
  assert.match(
    union,
    /Math\.max\(\.\.\.valid\.map\(\(rect\) => rect\.right\)\)/,
  );

  const anchor = functionSource(
    "cornerMaterialLayoutAnchor",
    "expandCornerMaterialZone",
  );
  assert.match(anchor, /control\.offsetLeft/);
  assert.match(anchor, /control\.offsetTop/);
  assert.match(anchor, /control\.offsetWidth/);
  assert.match(anchor, /control\.offsetHeight/);
  assert.doesNotMatch(anchor, /getBoundingClientRect\(/);

  const expand = functionSource(
    "expandCornerMaterialZone",
    "cornerMaterialHitZones",
  );
  assert.match(expand, /anchor\.left - CORNER_MATERIAL_PADDING_PX/);
  assert.match(expand, /anchor\.top - CORNER_MATERIAL_PADDING_PX/);
  assert.match(expand, /anchor\.right \+ CORNER_MATERIAL_PADDING_PX/);
  assert.match(expand, /anchor\.bottom \+ CORNER_MATERIAL_PADDING_PX/);

  const zones = functionSource(
    "cornerMaterialHitZones",
    "commitCornerMaterialState",
  );
  assert.match(
    zones,
    /toolbarLeftAnchor = cornerMaterialUnion\(\s*cornerMaterialLayoutAnchor\(/,
  );
  assert.match(zones, /const sidebarRail = \$\("#sidebarRailBtn"\)/);
  assert.match(zones, /sidebarRailAnchor =/);
  assert.match(
    zones,
    /toolbarLeftAnchor = cornerMaterialUnion\([\s\S]*?sidebarRailAnchor/,
  );
  assert.match(
    zones,
    /toolbarLeft: expandCornerMaterialZone\(toolbarLeftAnchor, toolbarLeftBounds\)/,
  );
  assert.match(zones, /toolbarRightAnchor = cornerMaterialLayoutAnchor\(/);
  assert.match(zones, /selectionLeftAnchor = cornerMaterialLayoutAnchor\(/);
  assert.match(zones, /selectionRightAnchor = cornerMaterialLayoutAnchor\(/);
  assert.match(zones, /selectionLayoutRect = cornerMaterialRect\(/);
  assert.match(
    zones,
    /selectionRight: expandCornerMaterialZone\(\s*selectionRightAnchor,\s*bottomBounds/,
  );

  const commit = functionSource(
    "commitCornerMaterialState",
    "applyCornerMaterialState",
  );
  assert.match(
    commit,
    /window\.clearTimeout\(cornerMaterialExitTimers\[key\]\)/,
  );
  assert.match(
    commit,
    /window\.setTimeout\([\s\S]*?CORNER_MATERIAL_EXIT_DELAY_MS/,
  );
  assert.match(
    commit,
    /if \(!cornerMaterialState\[key\] \|\| cornerMaterialExitTimers\[key\]\) return;/,
  );
});

test("靠近按钮时使用主菜单的玻璃填充、模糊与同族阴影", () => {
  const materialStart = css.indexOf("/* ---------- 角落控件的菜单玻璃材质");
  assert.ok(materialStart >= 0);
  const material = css.slice(materialStart);

  assert.doesNotMatch(
    material,
    /(?:^|\n)html\.(?:toolbar-left-material-near|toolbar-right-material-near|selection-left-material-near|selection-right-material-near)/,
  );
  for (const className of [
    "toolbar-left-material-near",
    "toolbar-right-material-near",
    "selection-left-material-near",
    "selection-right-material-near",
  ]) {
    assert.match(material, new RegExp(`\\.${className}`));
  }
  assert.match(
    material,
    /html\.transparent-titlebar\.toolbar-left-material-near/,
  );
  assert.match(
    material,
    /html\.transparent-titlebar\.toolbar-right-material-near/,
  );
  assert.match(
    material,
    /html\.transparent-titlebar\.selection-left-material-near/,
  );
  assert.match(
    material,
    /html\.transparent-titlebar\.selection-right-material-near/,
  );

  assert.match(material, /background:\s*var\(--menu-glass-bg\) !important;/);
  assert.match(
    material,
    /backdrop-filter:\s*var\(--menu-glass-backdrop\) !important;/,
  );
  assert.match(
    material,
    /box-shadow:\s*var\(--menu-control-glass-shadow\) !important;/,
  );
  assert.match(
    material,
    /html\.transparent-titlebar\.toolbar-left-material-near\s+#sidebarRailBtn\s+\.sidebar-rail-visual/,
  );
  assert.match(
    material,
    /#sidebarRailBtn\s+\.sidebar-rail-visual\s*\{\s*background:\s*var\(--menu-glass-bg\) !important;/,
  );
  assert.match(css, /--menu-control-glass-shadow:\s*[\s\S]*?0 6px 18px/);
  assert.doesNotMatch(material, /transition:[^;]*\b(?:width|padding|margin)\b/);
});

test("非透明标题栏会立即清除所有靠近材质状态", () => {
  const apply = functionSource(
    "applyCornerMaterialState",
    "scheduleCornerMaterialSync",
  );
  assert.match(
    apply,
    /const materialEnabled =\s*document\.documentElement\.classList\.contains\(\s*"transparent-titlebar",?\s*\)/,
  );
  assert.match(
    apply,
    /if \(!materialEnabled\) \{[\s\S]*?classList\.remove\(cornerMaterialClasses\[key\]\)/,
  );
});

test("显示地图不做靠近材质变化，但展开按钮始终复用地图按钮材质", () => {
  assert.doesNotMatch(app, /map-(?:left|right)-material-near/);
  assert.doesNotMatch(app, /updateMapMaterialProximity/);
  assert.doesNotMatch(globeMapCss, /map-(?:left|right)-material-near/);

  const sync = functionSource("syncMapRailMaterial", "cornerMaterialHitZones");
  assert.match(sync, /new MutationObserver/);
  assert.match(sync, /classList\.contains\("is-satellite"\)/);
  assert.match(sync, /map-satellite-control-material/);
  assert.match(sync, /getComputedStyle\(reference\)/);
  assert.match(sync, /--map-rail-control-background/);
  assert.match(sync, /--map-rail-control-color/);
  assert.match(app, /syncMapRailMaterial\(frame\.contentDocument\)/);
  assert.match(app, /stopMapRailMaterialSync\(\)/);

  assert.match(
    css,
    /html\.locations-map-titlebar-hidden\.sidebar-rail-is-collapsed:not\(\s*\.sidebar-hover-peek-open\s*\):not\(\s*\.sidebar-hover-peek-closing\s*\)\s+#sidebarRailBtn\s+\.sidebar-rail-visual\s*\{\s*background:\s*var\(\s*--map-rail-control-background/,
  );
  assert.match(
    css,
    /html\.locations-map-titlebar-hidden\.sidebar-rail-is-collapsed:not\(\s*\.sidebar-hover-peek-open\s*\):not\(\s*\.sidebar-hover-peek-closing\s*\)\.map-satellite-control-material\s+#sidebarRailBtn\s+\.sidebar-rail-visual/,
  );
  assert.match(
    css,
    /\.sidebar-rail-overlay\s*>\s*svg\s*\{\s*width:\s*21px;\s*height:\s*21px;/,
  );
  assert.match(
    css,
    /html\.locations-map-titlebar-hidden\.sidebar-rail-is-collapsed:not\(\s*\.sidebar-hover-peek-open\s*\):not\(\s*\.sidebar-hover-peek-closing\s*\)\.map-satellite-control-material\s+#sidebarRailBtn\s*\{\s*color:\s*#f8fafc !important;/,
  );
  assert.doesNotMatch(css, /map-left-material-near/);
});
