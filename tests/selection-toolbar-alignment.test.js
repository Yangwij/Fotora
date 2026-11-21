const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const root = path.join(__dirname, "..");
const css = fs.readFileSync(path.join(root, "web/styles.css"), "utf8");
const app = fs.readFileSync(path.join(root, "web/app.js"), "utf8");
const html = fs.readFileSync(path.join(root, "web/index.html"), "utf8");
const uiLanguage = fs.readFileSync(
  path.join(root, "web/ui-language.js"),
  "utf8",
);

test("选择底栏与顶栏共用窗框补偿后的左右边距", () => {
  assert.match(
    css,
    /\.selbar\s*\{[\s\S]*?padding:\s*0 var\(--sidebar-rail-visual-left\) 8px\s*var\(--toolbar-visible-inset\)/,
  );
});

test("全选与取消使用统一胶囊内边距，并按选中状态收回更多按钮", () => {
  assert.match(css, /\.pill-btn\s*\{[\s\S]*?padding:\s*0 13px;/);
  assert.doesNotMatch(css, /#selectAllBtn\s*\{[\s\S]*?width:\s*104px;/);
  assert.doesNotMatch(css, /#selectAllBtn\s*\{[\s\S]*?padding-inline:\s*0;/);
  assert.doesNotMatch(css, /is-selection-placeholder/);
  assert.match(app, /if \(shouldShow\) wanted\.add\("moreTopBtn"\)/);
  assert.match(app, /else wanted\.delete\("moreTopBtn"\)/);
  assert.match(
    app,
    /state\.selected\.size > 0\)\s*wanted\.add\("moreTopBtn"\)/,
  );
});

test("英文模式下第一张选择不会误触发全选文字动画", () => {
  const app = fs.readFileSync(path.join(root, "web", "app.js"), "utf8");
  const sync = app.slice(
    app.indexOf("function syncSelectAllLabel("),
    app.indexOf("/* 底栏：一件没选的时候"),
  );

  assert.match(uiLanguage, /translate:\s*translateTree/);
  assert.match(
    sync,
    /const nextState = allSelected \? "all" : "none";[\s\S]*?if \(previousState === nextState\) return;/,
  );
  assert.match(
    sync,
    /label\.textContent = next;\s*btn\.setAttribute\("aria-label", next\);\s*window\.FotoraLanguage\?\.translate\?\.\(btn\);/,
  );
  assert.doesNotMatch(sync, /label\.textContent === next/);
});

test("减少动态时全选文案直接切换，不播放宽度与淡变", () => {
  const sync = app.slice(
    app.indexOf("function syncSelectAllLabel("),
    app.indexOf("function syncSelbar("),
  );
  assert.match(sync, /prefers-reduced-motion: reduce/);
  assert.match(
    sync,
    /if \(reducedMotion\) \{\s*ghost\.remove\(\);\s*return;\s*\}/,
  );
  assert.match(sync, /btn\.animate\(\s*\[\{ width:/);
  assert.equal((sync.match(/\.animate\(/g) || []).length, 3);
});

test("减少动态时选择底栏直接展开且取消高度过渡", () => {
  const sync = app.slice(
    app.indexOf("function syncSelectionBar("),
    app.indexOf("function loadAlbum("),
  );
  assert.match(
    sync,
    /prefers-reduced-motion: reduce[\s\S]*bar\.classList\.remove\("is-collapsed"\)[\s\S]*return;/,
  );
  assert.match(
    css,
    /@media \(prefers-reduced-motion: reduce\)[\s\S]*?\.selbar\s*\{\s*transition:\s*none !important;/,
  );
});

test("快捷键操作不移动焦点，地图预热层退出一级焦点顺序", () => {
  assert.match(
    html,
    /id="contextMapPrewarmHost"[\s\S]*?aria-hidden="true"[\s\S]*?inert/,
  );
  assert.match(html, /id="contextMapPrewarmFrame"[\s\S]*?tabindex="-1"/);

  const picker = app.slice(
    app.indexOf("function openPicker("),
    app.indexOf("/* 没工夫放动画的时候"),
  );
  assert.match(picker, /function openPicker\(\)/);
  assert.match(picker, /function closePicker\(\)/);
  assert.doesNotMatch(picker, /\.focus\(/);
  assert.doesNotMatch(app, /pickerKeyboardTargets/);
  assert.match(
    app,
    /#shareBtn"\)\.addEventListener\("click", \(\) =>\s*pickerOpen \? closePicker\(\) : openPicker\(\),?\s*\)/,
  );
});
