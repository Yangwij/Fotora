"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const root = path.resolve(__dirname, "..");
const app = fs.readFileSync(path.join(root, "web", "app.js"), "utf8");
const css = fs.readFileSync(path.join(root, "web", "styles.css"), "utf8");

test("整张菜单在减少动态下只淡出，不播放子菜单和编辑器位移", () => {
  const close = app.slice(
    app.indexOf("function closeMenu("),
    app.indexOf("const toggleMenu ="),
  );
  assert.match(close, /if \(renameEditor && !reducedMotion\) \{/);
  assert.match(close, /if \(expandedSubmenu && !reducedMotion\) \{/);
  assert.match(
    close,
    /const closingDuration =\s*renameEditor && !reducedMotion\s*\?\s*Math\.max\(duration, 340\)\s*:\s*albumCard && !reducedMotion\s*\?\s*Math\.max\(duration, ALBUM_SUBMENU_CLOSE_MS\)\s*:\s*duration;/,
  );
  assert.match(
    close,
    /const editorOutDuration =\s*renameEditor && !reducedMotion\s*\? Math\.min\(200, closingDuration - 120\)\s*: 0;/,
  );
  assert.match(
    close,
    /if \(renameEditor && renameEditorFrame && !reducedMotion\) \{/,
  );
  assert.match(
    close,
    /const anim = menu\.animate\(\s*closingFrames,\s*reducedMotion\s*\? \{\s*duration: closingDuration,/,
  );
});

test("顶栏按钮在减少动态下只交叉淡入淡出", () => {
  const sync = app.slice(
    app.indexOf("function syncTopbar("),
    app.indexOf("function syncSelectionMenuButton("),
  );
  assert.match(
    sync,
    /const reducedMotion = window\.matchMedia\(\s*"\(prefers-reduced-motion: reduce\)",?\s*\)\.matches/,
  );
  assert.match(
    sync,
    /const exitFrames = reducedMotion\s*\? \[\s*\{ opacity: exitStart\.opacity, transform: exitStart\.transform \},\s*\{ opacity: 0, transform: exitStart\.transform \},?\s*\]\s*: \[exitStart, exitEnd\];/,
  );
  assert.match(
    sync,
    /const enterStart = reducedMotion\s*\? \{ opacity: 0, transform: "scale\(1\)" \}/,
  );
  assert.match(
    sync,
    /if \(reducedMotion\) return;\s*const changing = new Set\(\[\.\.\.leaving, \.\.\.coming\]\);/,
  );
});

test("菜单快捷键和点击打开都不会自动移动焦点", () => {
  assert.doesNotMatch(app, /focusFirst/);
  const open = app.slice(
    app.indexOf("function openMenu("),
    app.indexOf("function cancelMenuAnims("),
  );
  assert.doesNotMatch(open, /\.focus\(/);
});

test("主菜单长出/收回与二级菜单展开对齐 iOS 17 参考视频", () => {
  /* 主菜单_open：从触发角小尺寸＋顶部裁切"长出"，放大铺开后回弹落定。 */
  const open = app.slice(
    app.indexOf("function openMenu("),
    app.indexOf("function cancelMenuAnims("),
  );
  assert.match(open, /transform: "scale\(0\.5\)"/);
  assert.match(open, /height: `\$\{Math\.round\(openHeight \* 0\.3\)\}px`/);
  assert.match(open, /menu\.style\.overflow = "hidden"/);
  assert.match(open, /\{ duration: 280 \}/);
  /* 主菜单_close：高度与缩放一起收拢回触发角。 */
  assert.match(app, /const MENU_CLOSE_SCALE = 0\.5;/);
  const close = app.slice(
    app.indexOf("function closeMenu("),
    app.indexOf("const toggleMenu ="),
  );
  assert.match(close, /startFrame\.height = `\$\{closingHeight\}px`/);
  assert.match(close, /height: `\$\{Math\.round\(closingHeight \* 0\.3\)\}px`/);
  /* 二级菜单展开：快出慢落弹性曲线＋选项原地揭开（不额外下滑）。 */
  assert.match(app, /const MENU_SUBMENU_OPEN_EASING = "linear";/);
  const content = app.slice(
    app.indexOf("function animateMenuContent("),
    app.indexOf("function refreshNumberingMenuBranch("),
  );
  assert.match(content, /easing: MENU_SUBMENU_OPEN_EASING/);
  assert.doesNotMatch(
    content,
    /\[\{ transform: "translateY\(-20px\)" \}, \{ transform: "translateY\(0\)" \}\]/,
  );
  assert.match(css, /--menu-submenu-open-duration: 230ms;/);
  assert.match(css, /--menu-submenu-close-duration: 230ms;/);
});

test("二级菜单展开/收回连续无跳变：阴影结构匹配＋统一时间线", () => {
  /* 统一时间线变量。 */
  assert.match(css, /--menu-submenu-ms: var\(\s*--menu-submenu-collapse-ms,/);
  assert.match(
    css,
    /--menu-submenu-ease: var\(\s*--menu-submenu-collapse-ease,/,
  );
  /* 常态与展开态阴影同为"两外阴影＋一 inset"，box-shadow 才能逐帧插值。 */
  assert.match(
    css,
    /box-shadow:\s*var\(--menu-glass-shadow\),\s*inset 0 0 0 0\.5px rgba\(0, 0, 0, 0\);/,
  );
  assert.match(
    css,
    /#popMenu\.has-submenu-expanded \{\s*\/\*[\s\S]*?\*\/\s*box-shadow:\s*0 10px 40px rgba\(0, 0, 0, 0\),\s*0 0 0 0\.5px rgba\(0, 0, 0, 0\),\s*inset 0 0 0 0\.5px rgba\(0, 0, 0, 0\.08\);/,
  );
  /* 父菜单阴影/滤镜随时间线渐变。 */
  assert.match(
    css,
    /transition:\s*box-shadow var\(--menu-submenu-ms\) var\(--menu-submenu-ease\),\s*filter var\(--menu-submenu-ms\) var\(--menu-submenu-ease\);/,
  );
  /* 锚点组底色不再 0s 瞬切。 */
  assert.doesNotMatch(css, /background-color 0s linear/);
  /* 退晕行共用时间线。 */
  assert.match(
    css,
    /\.popmenu\.has-submenu-expanded \.menu-row,\s*\.popmenu\.is-submenu-collapsing \.menu-row \{/,
  );
  /* 收回时外阴影渐回。 */
  assert.match(
    css,
    /#popMenu\.is-submenu-collapsing \{\s*box-shadow:\s*var\(--menu-glass-shadow\),/,
  );
});

test("相簿二级菜单是覆盖式卡片：连续展开、上下行统一退晕、圆角同步变化", () => {
  const content = app.slice(
    app.indexOf("function animateMenuContent("),
    app.indexOf("function collapseMenuSubmenuFirst("),
  );
  const open = content.slice(
    content.indexOf("else if (albumCard && !reducedMotion)"),
    content.indexOf("else if (editingInline || editingDate)"),
  );
  /* 卡片从锚点行本身开始，标题行属于卡片；父菜单和下方行都不移动。 */
  assert.match(content, /is-album-submenu-card/);
  assert.match(
    content,
    /editingInline \|\| editingDate \|\| albumCard\s*\?\s*`\$\{anchorRow\.offsetTop\}px`/,
  );
  assert.match(content, /layer\.style\.paddingTop = `\$\{anchorHeight\}px`/);
  assert.match(
    content,
    /const recedingRows = mainMenuRows\(menu\)\.filter\(\s*\(row\) => row !== anchorRow,?\s*\)/,
  );
  assert.doesNotMatch(content, /const recedingRows = albumCard/);
  assert.doesNotMatch(
    content.slice(
      content.indexOf("if (albumCard) {"),
      content.indexOf("} else if (editingInline || editingDate)"),
    ),
    /layer\.style\.position = "relative"/,
  );
  /* 展开和收回使用同一条连续高度路径。 */
  assert.match(content, /albumSubmenuHeightFrames\(/);
  assert.match(
    open,
    /albumSubmenuHeightFrames\(\s*anchorHeight,\s*\[\],\s*albumCardHeight,?\s*\)/,
  );
  assert.doesNotMatch(open, /albumSubmenuRowHeights/);
  assert.doesNotMatch(open, /menuCardSurfaceAnim = layer\.animate/);
  /* 顶部圆角按当前菜单尺寸计算，标题行同步变化。 */
  assert.match(app, /const ALBUM_CARD_TOP_RADIUS_START_RATIO = 0\.32;/);
  assert.match(content, /albumCardRadiusRange\(\s*menu(?:,\s*[^)]+)?\)/);
  assert.match(app, /bottomStart: 0,/);
  assert.match(app, /function albumSubmenuRadiusFrames\(/);
  assert.match(content, /albumSubmenuRadiusFrames\(/);
  assert.match(
    app,
    /borderBottomLeftRadius: `\$\{bottom\}px`,\s*borderBottomRightRadius: `\$\{bottom\}px`,/,
  );
  assert.match(content, /menuCardRadiusAnim = layer\.animate\(/);
  assert.match(content, /menuHeadRadiusAnim = anchorRow\.animate\(/);
  /* 保留逐行层次，但缩短到连续操作仍能跟上的节奏。 */
  assert.match(app, /const ALBUM_SUBMENU_OPEN_MS = 280;/);
  assert.match(content, /if \(albumCard && reducedMotion\)/);
  assert.match(css, /border-radius: var\(--menu-corner-radius\);/);
});

test("相簿子菜单收回是单段连续裁切，不提前淡出", () => {
  const content = app.slice(
    app.indexOf("function animateMenuContent("),
    app.indexOf("function collapseMenuSubmenuFirst("),
  );
  const close = content.slice(
    content.indexOf("if (!albumSubmenu && submenu)"),
    content.indexOf(
      "const finish =",
      content.indexOf("if (!albumSubmenu && submenu)"),
    ),
  );
  assert.match(
    close,
    /const collapseFrames = albumSubmenuHeightFrames\(\s*submenuHeight,\s*\[\],\s*anchorHeight,?\s*\)/,
  );
  assert.match(close, /menuSubmenuAnim = submenu\.animate\(collapseFrames, \{/);
  assert.match(close, /duration: ALBUM_SUBMENU_CLOSE_MS/);
  assert.match(close, /easing: ALBUM_SUBMENU_CLOSE_EASING/);
  assert.match(close, /group\?\.classList\.remove\("has-current-choice"\)/);
  assert.match(app, /const ALBUM_SUBMENU_CLOSE_MS = ALBUM_SUBMENU_OPEN_MS;/);
  assert.match(
    app,
    /const ALBUM_SUBMENU_CLOSE_EASING = "cubic-bezier\(0\.23, 1, 0\.32, 1\)";/,
  );
  assert.doesNotMatch(close, /direction: "reverse"/);
  assert.doesNotMatch(close, /albumSubmenuRowHeights/);
  assert.doesNotMatch(close, /menuCardSurfaceAnim = submenu\.animate/);
  assert.match(close, /menuCardSurfaceAnim = null/);
  assert.doesNotMatch(close, /delay:/);
  assert.doesNotMatch(close, /duration: 170/);
  assert.doesNotMatch(close, /closeFrames/);
  assert.doesNotMatch(close, /filter: "blur\(3px\)"/);
  assert.doesNotMatch(close, /translateY\(-20px\)/);
  assert.doesNotMatch(close, /menuSubmenuContentAnim = inner\?\.animate/);
});

test("相簿卡片组的白色底在收回过程中渐变回透明", () => {
  assert.match(
    css,
    /#popMenu\.is-album-options\.has-submenu-expanded\.is-submenu-collapsing[\s\S]*?\.menu-submenu-group\.is-submenu-card \{\s*background-color: transparent;/,
  );
  assert.match(
    css,
    /#popMenu\.is-album-options\.has-submenu-expanded\.is-submenu-collapsing[\s\S]*?\.menu-submenu\.is-album-submenu-card \{\s*background-color: transparent;\s*box-shadow:[\s\S]*?transition:\s*background-color var\(--menu-submenu-ms\) var\(--menu-submenu-ease\),\s*box-shadow var\(--menu-submenu-ms\) var\(--menu-submenu-ease\);/,
  );
});

test("选择模式的旧一级菜单使用同一档退晕", () => {
  assert.match(
    css,
    /#popMenu\.is-album-options \.menu-row\.is-menu-receding,\s*#popMenu\.is-selection \.menu-row\.is-menu-receding \{\s*filter: blur\(3px\);\s*opacity: 0\.5;/,
  );
});

test("二级菜单箭头与当前选择勾使用同一条 SVG 路径渐变", () => {
  assert.match(app, /const ICON_MENU_DISCLOSURE =/);
  assert.match(app, /MENU_DISCLOSURE_ARROW_PATH/);
  assert.match(app, /MENU_DISCLOSURE_CHECK_PATH/);
  assert.doesNotMatch(app, /class="menu-leading-check"/);
  assert.match(
    css,
    /\.menu-submenu-chevron > svg > path \{\s*transition:\s*d var\(--menu-submenu-ms\) var\(--menu-submenu-ease\),\s*stroke-width var\(--menu-submenu-ms\) var\(--menu-submenu-ease\);/,
  );
  assert.match(
    css,
    /\.menu-submenu-group\.has-current-choice\.has-open-submenu[\s\S]*?d: path\("M3\.4 8\.4 6\.4 11\.4 12\.6 4\.8"\);[\s\S]*?stroke-width: 2\.2;/,
  );
  assert.doesNotMatch(css, /\.menu-leading-check/);
});

test("普通二级菜单收回保持展开时长", () => {
  const cssOpen = css.match(/--menu-submenu-open-duration:\s*(\d+)ms;/);
  const cssClose = css.match(/--menu-submenu-close-duration:\s*(\d+)ms;/);
  assert.ok(cssOpen);
  assert.ok(cssClose);
  assert.equal(cssClose[1], cssOpen[1]);
});

test("批量编号的分支沿用原有展开与收回节奏", () => {
  const branch = app.slice(
    app.indexOf("function refreshNumberingMenuBranch("),
    app.indexOf('$("#popMenu").addEventListener("click"'),
  );
  assert.match(
    branch,
    /duration: reducedMotion \? 1 : MENU_MOTION_DURATION_MS/,
  );
  assert.match(branch, /easing: MENU_MOTION_EASING/);
  assert.match(branch, /const oldInnerHeight = inner\.offsetHeight;/);
  assert.match(branch, /const oldLayerHeight = layer\.offsetHeight;/);
  assert.match(branch, /const oldMenuHeight = menu\.offsetHeight;/);
  assert.match(
    branch,
    /borderTopLeftRadius: collapsing \? "0px" : expandedHeadRadius/,
  );
  assert.match(
    app,
    /if \(motion\.collapse\) \{\s*motion\.options\?\.remove\(\);/,
  );
});

test("从外部收回批量编号时内容面随卡片一起退场", () => {
  const content = app.slice(
    app.indexOf("function animateMenuContent("),
    app.indexOf("function collapseMenuSubmenuFirst("),
  );
  assert.match(content, /if \(groupName === "numbering"\) \{/);
  assert.match(
    content,
    /const closingNumberingCard = albumCard && groupName === "numbering";/,
  );
  assert.match(
    content,
    /menuContentAnim = menu\.animate\(\s*\[\{ height: `\$\{beforeHeight\}px` \}, \{ height: `\$\{baseHeight\}px` \}\],/,
  );
  assert.match(
    content,
    /menuSubmenuContentAnim = submenu\.animate\(\s*\[\{ opacity: 1 \}, \{ opacity: 0 \}\],/,
  );
});

test("批量编号外层沿用普通二级菜单的展开与退后动画", () => {
  const content = app.slice(
    app.indexOf("function animateMenuContent("),
    app.indexOf("function collapseMenuSubmenuFirst("),
  );
  assert.match(
    app,
    /function albumCardRadiusRange\(menu, scale = ALBUM_CARD_SCALE\)/,
  );
  assert.doesNotMatch(content, /numberingCard \? 1 : ALBUM_CARD_SCALE/);
  assert.match(
    content,
    /const recedingRows = mainMenuRows\(menu\)\.filter\(\(row\) => row !== anchorRow\);/,
  );
  assert.match(app, /const bottom = keepBottomRadius\s*\? radii\.end\s*:/);
  assert.match(
    content,
    /keepBottomRadius: menuRowsBelow\(menu, anchorRow\)\.length === 0,/,
  );
  assert.doesNotMatch(
    css,
    /has\(\.menu-numbering-submenu\),[\s\S]*?transform: none;/,
  );
  assert.match(
    css,
    /\.menu-numbering-branch-options \{[\s\S]*?border-bottom-left-radius: var\(--menu-corner-radius-scaled\);[\s\S]*?background: var\(--sheet-solid-bg\);/,
  );
  assert.match(
    css,
    /\.menu-numbering-branch\.is-numbering-branch-head \{\s*border-radius: var\(--menu-corner-radius-scaled\)\s*var\(--menu-corner-radius-scaled\) 0 0;/,
  );
  assert.match(
    css,
    /#popMenu\s+\.menu-numbering-view\s+\.menu-numbering-branch\.is-numbering-branch-covered \{\s*opacity: 0;\s*pointer-events: none;/,
  );
  assert.doesNotMatch(
    css,
    /\.menu-numbering-view\s*> \.menu-numbering-branch:last-child/,
  );
  assert.match(
    css,
    /\.menu-numbering-branch:not\(\.is-numbering-branch-head\) \{\s*border-radius: 0;\s*transition: background-color/,
  );
  assert.match(
    css,
    /#popMenu \.menu-submenu-head:hover \{\s*background: var\(--hover\);/,
  );
  assert.match(
    css,
    /\.popmenu:has\(\s*>\s*\.menu-submenu-group:last-child\s*>\s*\.menu-row:not\(\.menu-submenu-head\):hover\s*\)/,
  );
  assert.match(
    css,
    /\.menu-numbering-branch\.is-numbering-branch-head,[\s\S]*?\.menu-row:is\(:hover, :active, :focus, :focus-visible, \.is-hover-pinned\) \{\s*background: transparent !important;/,
  );
  assert.match(
    css,
    /#popMenu\s+\.menu-submenu-group\[data-submenu-group="numbering"\]\s+> \.menu-submenu-head,/,
  );
  assert.match(
    css,
    /#popMenu \.menu-submenu-group\[data-submenu-group="numbering"\] \{\s*--hover: transparent;\s*--accent-hover: transparent;\s*--field-bg-menu-open: transparent;/,
  );
  assert.match(
    css,
    /\.menu-row:is\(:hover, :active, :focus, :focus-visible, \.is-hover-pinned\) \{\s*background: transparent !important;/,
  );
  assert.match(css, /\.menu-submenu:not\(\.menu-numbering-submenu\):has\(/);
  assert.doesNotMatch(
    css,
    /#popMenu > \.menu-submenu-group\[data-submenu-group="numbering"\]:last-child\s*[^{]*\{\s*border-bottom-left-radius:/,
  );
});

test("相簿菜单快速反向操作会从当前高度接管", () => {
  const content = app.slice(
    app.indexOf("function animateMenuContent("),
    app.indexOf("function collapseMenuSubmenuFirst("),
  );
  assert.match(content, /const interruptedSubmenuHeight =/);
  assert.match(
    content,
    /const submenuHeight = Math\.max\(\s*submenu\.offsetHeight,\s*interruptedSubmenuHeight,?\s*\)/,
  );
  assert.match(content, /is-submenu-collapsing/);
  assert.match(content, /const reopenAfterCollapse =/);
  assert.match(app, /if \(nextSubmenu\)/);
  assert.match(app, /ALBUM_SUBMENU_SWITCH_DELAY_MS/);
  assert.match(content, /const menuSubmenuRun = \+\+menuSubmenuGeneration/);
  assert.match(
    content,
    /if \(menuSubmenuRun !== menuSubmenuGeneration\) return;/,
  );
});
