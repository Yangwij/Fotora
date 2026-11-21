"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const root = path.join(__dirname, "..");
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");

test("设置中的明暗模式、主题和字体都即时预览并可取消还原", () => {
  const dialog = read("web/settings-dialog.js");
  const closeBlock = dialog.slice(
    dialog.indexOf("function close("),
    dialog.indexOf("function open()"),
  );
  const choiceBlock = dialog.slice(
    dialog.indexOf('const choice = event.target.closest("[data-ux-choice]")'),
    dialog.indexOf("confirm.addEventListener"),
  );

  assert.match(
    dialog,
    /colorModeBeforeOpen\s*=\s*document\.documentElement\.dataset\.colorMode \|\| "auto"/,
  );
  assert.match(
    closeBlock,
    /window\.setColorMode\?\.\(colorModeBeforeOpen, \{ persist: false \}\)/,
  );
  assert.match(
    closeBlock,
    /window\.setColorTheme\?\.\(themeBeforeOpen, \{ persist: false \}\)/,
  );
  assert.match(
    closeBlock,
    /window\.setFontTheme\?\.\(fontThemeBeforeOpen, \{ persist: false \}\)/,
  );
  assert.match(
    choiceBlock,
    /row\?\.key === "colorMode"[\s\S]*?window\.setColorMode\?\.\(choice\.dataset\.uxValue/,
  );
});

test("设置控件使用语义化动效 token，并保留独立指示器节奏", () => {
  const motion = read("web/motion.css");
  const settings = read("web/settings-dialog.css");

  for (const token of [
    "--motion-duration-press: 120ms",
    "--motion-duration-feedback: 140ms",
    "--motion-duration-control: 170ms",
    "--motion-duration-enter: 210ms",
    "--motion-press-scale-compact: 0.94",
    "--motion-press-scale-control: 0.97",
  ]) {
    assert.ok(motion.includes(token), `missing ${token}`);
  }

  assert.match(
    settings,
    /\.ux-settings-confirm:active\s*\{[\s\S]*?scale\(var\(--motion-press-scale-compact\)\)/,
  );
  assert.match(
    settings,
    /\.ux-settings-segment:active\s*\{[\s\S]*?scale\(var\(--motion-press-scale-control\)\)/,
  );
  assert.match(
    settings,
    /\.ux-settings-toggle:active\s*\{[\s\S]*?scale\(var\(--motion-press-scale-control\)\)/,
  );
  assert.match(
    settings,
    /\.ux-settings-nav-indicator\s*\{[\s\S]*?transition:\s*transform 230ms/,
  );
});

test("设置弹窗提供可见焦点和低调入场，并在减少动态时移除位移", () => {
  const settings = read("web/settings-dialog.css");

  assert.match(settings, /@starting-style\s*\{/);
  assert.match(
    settings,
    /\.ux-settings-segment:focus-visible,[\s\S]*?outline: 2px solid var\(--accent\);[\s\S]*?outline-offset: 2px;/,
  );
  assert.match(
    settings,
    /@media \(prefers-reduced-motion: reduce\)[\s\S]*?\.ux-settings-confirm:active,[\s\S]*?\.ux-settings-segment:active,[\s\S]*?\.ux-settings-toggle:active[\s\S]*?transform: none;/,
  );
});

test("明暗模式切换在单帧内完成，避免背景与文字颜色错拍", () => {
  const app = read("web/app.js");
  const styles = read("web/styles.css");
  const modeBlock = app.slice(
    app.indexOf("function setColorMode("),
    app.indexOf("function setColorTheme("),
  );

  assert.match(modeBlock, /classList\.add\("color-mode-switching"\)/);
  assert.match(
    modeBlock,
    /colorModeSwitchFrame = requestAnimationFrame\(\(\) => \{[\s\S]*?colorModeSwitchFrame = requestAnimationFrame\(\(\) => \{[\s\S]*?classList\.remove\("color-mode-switching"\)/,
  );
  assert.match(
    styles,
    /html\.color-mode-switching,[\s\S]*?transition: none !important;/,
  );
});

test("所有独立媒体页面加载同一套运动 token", () => {
  const pages = [
    ["web/index.html", "motion.css"],
    ["web/photo-wall/index.html", "/motion.css"],
    ["web/map/index.html", "../motion.css"],
    ["web/map/locations.html", "../motion.css"],
    ["web/map/album-map.html", "../motion.css"],
  ];

  for (const [page, href] of pages) {
    assert.ok(
      read(page).includes(`rel="stylesheet" href="${href}"`),
      `${page} does not load ${href}`,
    );
  }
});

test("高频媒体控件使用统一反馈，但保留有意义的独立编排", () => {
  const styles = read("web/styles.css");
  const slideshow = read("web/slideshow.css");
  const map = read("web/map/map.css");

  assert.match(
    slideshow,
    /\.slideshow-top-controls,[\s\S]*?opacity var\(--motion-duration-control\) var\(--ease-out\)/,
  );
  assert.match(
    slideshow,
    /\.slideshow-round-button:active,[\s\S]*?scale\(var\(--motion-press-scale-control\)\)/,
  );
  assert.match(
    map,
    /\.map-type-button:active\s*\{[\s\S]*?scale\(var\(--motion-press-scale-compact\)\)/,
  );
  assert.match(
    map,
    /\.location-search-clear:focus-visible,[\s\S]*?outline: 2px solid/,
  );
  assert.match(
    styles,
    /\.map-filmstrip\.is-filmstrip-exiting\s*\{[\s\S]*?240ms var\(--ease-out\)/,
  );
  assert.match(
    slideshow,
    /\.slideshow-intro\.is-leaving\s*\{[\s\S]*?opacity 700ms[\s\S]*?transform 900ms/,
  );
});

test("设置分段选项不在快捷键表之外接管方向键或移动焦点", () => {
  const dialog = read("web/settings-dialog.js");

  assert.match(
    dialog,
    /role="radio"[\s\S]*?aria-checked="\$\{optionValue === current\}"[\s\S]*?tabindex="\$\{optionValue === current \? "0" : "-1"\}"/,
  );
  assert.match(dialog, /option\.tabIndex = option === choice \? 0 : -1/);
  assert.doesNotMatch(dialog, /main\.addEventListener\("keydown"/);
  for (const key of ["ArrowRight", "ArrowDown", "ArrowLeft", "ArrowUp"]) {
    assert.doesNotMatch(dialog, new RegExp(`event\\.key === "${key}"`));
  }
  assert.doesNotMatch(
    dialog,
    /next\.focus\(\{ preventScroll: true \}\);\s*next\.click\(\)/,
  );
});

test("编辑器按钮提供统一键盘焦点和克制按压反馈", () => {
  const editor = read("web/photo-editor.css");

  assert.match(
    editor,
    /\.pe-reset-crop:focus-visible,[\s\S]*?\.pe-icon-button:focus-visible,[\s\S]*?\.pe-control:focus-visible,[\s\S]*?outline: 2px solid/,
  );
  assert.match(
    editor,
    /\.pe-icon-button:active:not\(:disabled\)\s*\{[\s\S]*?scale\(var\(--motion-press-scale-compact\)\)/,
  );
  assert.match(
    editor,
    /\.pe-control:active\s*\{[\s\S]*?scale\(var\(--motion-press-scale-compact\)\)/,
  );
  assert.match(
    editor,
    /\.pe-aspect-orientation button:active\s*\{[\s\S]*?scale\(var\(--motion-press-scale-control\)\)/,
  );
  assert.match(
    editor,
    /@media \(prefers-reduced-motion: reduce\)[\s\S]*?\.pe-control:active,[\s\S]*?transform: none;/,
  );
});
