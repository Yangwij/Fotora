"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const root = path.join(__dirname, "..");
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");

test("侧栏相簿树为行提供单一 roving tab stop 和层级语义", () => {
  const html = read("web/index.html");
  const app = read("web/app.js");

  assert.match(html, /id="sidebarList"[\s\S]*?role="tree"/);
  assert.match(
    app,
    /data-parent-id="\$\{parentId\}" role="treeitem" aria-level="\$\{treeLevel\}"/,
  );
  assert.match(
    app,
    /aria-selected="\$\{isActive\}"\$\{isActive \? ' aria-current="page"' : ""\}/,
  );
  assert.match(app, /function syncSidebarRovingFocus\(/);
  assert.match(app, /syncSidebarRovingFocus\(\);/);
  assert.doesNotMatch(
    app,
    /restoreSidebarFocus|syncSidebarRovingFocus\(\{ focus:/,
  );
});

test("侧栏不响应快捷键表外的方向键和激活键", () => {
  const app = read("web/app.js");
  assert.doesNotMatch(app, /function handleSidebarTreeKeydown\(/);
  assert.doesNotMatch(app, /#sidebarList"\)\.addEventListener\("keydown"/);
  assert.doesNotMatch(app, /focusSidebarTreeItem\(/);
  assert.doesNotMatch(app, /toggleSidebarTreeDisclosure\(/);
});

test("鼠标选择侧栏后不保留程序化焦点", () => {
  const app = read("web/app.js");
  const clickBlock = app.slice(
    app.indexOf('$("#sidebarList").addEventListener("click"'),
    app.indexOf('$("#sidebarList").addEventListener("contextmenu"'),
  );

  assert.match(
    clickBlock,
    /setSidebarRovingItem\(treeItem\);[\s\S]*?if \(e\.detail !== 0\) treeItem\.blur\(\);/,
  );
  assert.doesNotMatch(clickBlock, /setSidebarRovingItem\([^)]*focus:\s*true/);
});

test("键盘从悬停相簿栏导航后保留列表焦点和继续浏览能力", () => {
  const app = read("web/app.js");

  assert.match(
    app,
    /const pointerClosing = sidebarHoverPeekOpen && e\.detail !== 0;/,
  );
  assert.match(
    app,
    /\$\("#trashNavBtn"\)\.addEventListener\("click", \(event\) =>[\s\S]*?sidebarHoverPeekOpen && event\.detail !== 0[\s\S]*?dismissSidebarHoverPeekBeforeNavigation\(\)/,
  );
  assert.doesNotMatch(
    app,
    /closeSidebarHoverPeek\(\);[\s\S]{0,240}sidebarHoverEdge"\)\.focus/,
  );
});

test("切换图库时只先收回图库目录，固定相簿栏不会因此关闭", () => {
  const app = read("web/app.js");
  const navigationBlock = app.slice(
    app.indexOf(
      'const rootChoice = e.target.closest("[data-sidebar-root-choice]")',
    ),
    app.indexOf('if (e.target.closest("[data-all-toggle]"))'),
  );

  assert.match(navigationBlock, /pendingRootSwitchId = rootId/);
  assert.match(
    navigationBlock,
    /libraryClosing[\s\S]*?toggleLibraryPicker\(\)/,
  );
  assert.match(
    navigationBlock,
    /Promise\.all\(\[libraryClosing, sidebarClosing\]\)\.then\(\s*performSwitch/,
  );
  assert.match(
    navigationBlock,
    /sidebarClosing =\s*sidebarHoverPeekOpen && pointerNavigation/,
  );
  assert.doesNotMatch(app, /dismissExpandedSidebarFromOutsidePointer/);
  assert.match(
    app,
    /function dismissSidebarHoverPeekBeforeNavigation\(\)[\s\S]*?return closeSidebarHoverPeek\(\);/,
  );
  assert.match(
    app,
    /sidebarHoverCloseMotionResolve\?\.\(\)[\s\S]*?sidebarHoverCloseMotionPromise = null/,
  );
});

test("图库目录展开时点击 Library 主行也会收起目录", () => {
  const app = read("web/app.js");
  const clickBlock = app.slice(
    app.indexOf('$("#sidebarList").addEventListener("click"'),
    app.indexOf('$("#sidebarList").addEventListener("contextmenu"'),
  );

  assert.match(
    clickBlock,
    /state\.libraryPickerOpen\s*&&\s*e\.target\.closest\('\.nav-item\[data-id="library"\]'\)\s*\)\s*\{\s*return toggleLibraryPicker\(\);/,
  );
});

test("图库根目录选择和图库导入使用同一棵树的可聚焦项", () => {
  const app = read("web/app.js");

  assert.match(
    app,
    /data-sidebar-root-choice="\$\{root\.id\}" data-parent-id="library"[\s\S]*?role="treeitem" aria-level="2" aria-selected="\$\{current\}"/,
  );
  assert.match(
    app,
    /class="nav-library-import" type="button" role="treeitem"[\s\S]*?aria-level="2" data-parent-id="library" tabindex="-1"/,
  );
  assert.doesNotMatch(app, /setSidebarRovingItem\([^)]*focus:\s*true/);
});

test("导航行反馈使用共享缓动且不显示键盘焦点框", () => {
  const styles = read("web/styles.css");

  assert.doesNotMatch(
    styles,
    /\.nav-item\s*\{[\s\S]*?transform\s+0\.18s\s+linear/,
  );
  assert.match(
    styles,
    /\.nav-item:focus-visible,\s*\.nav-library-choice:focus-visible,\s*\.nav-library-import:focus-visible\s*\{\s*outline:\s*none;/,
  );
  assert.match(
    styles,
    /\.nav-item:active\s*\{[\s\S]*?var\(--nav-press-scale\)/,
  );
  assert.match(
    styles,
    /@media \(prefers-reduced-motion: reduce\) \{[\s\S]*?\.nav-library-choice:active,[\s\S]*?transform: none;/,
  );
});

test("减少动态时相簿展开箭头与面板同时落到最终状态", () => {
  const app = fs.readFileSync(path.join(root, "web", "app.js"), "utf8");
  const chevron = app.slice(
    app.indexOf("function animateDisclosureChevron("),
    app.indexOf("function animateNavChevron("),
  );

  assert.match(
    chevron,
    /if \(window\.matchMedia\("\(prefers-reduced-motion: reduce\)"\)\.matches\) \{\s*el\.style\.removeProperty\("transform"\);\s*return;/,
  );
});
