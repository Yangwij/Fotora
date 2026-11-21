"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const root = path.join(__dirname, "..");
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");

test("主题样式位于明暗模式和界面语言之间", () => {
  const dialog = read("web/settings-dialog.js");
  const appearance = dialog.slice(
    dialog.indexOf('title: "外观"'),
    dialog.indexOf('title: "启动与关闭"'),
  );

  assert.match(
    appearance,
    /key: "colorMode"[\s\S]*?key: "colorTheme"[\s\S]*?key: "fontTheme"[\s\S]*?key: "windowControlsStyle"/,
  );
  assert.match(appearance, /label: "主题样式"/);
  assert.match(
    appearance,
    /\["default", "原色"\][\s\S]*?\["warm", "暖纸"\][\s\S]*?\["mist", "雾岚"\][\s\S]*?\["claude", "杏陶"\]/,
  );
});

test("杏陶主题在所有窗口和保存校验中可用", () => {
  const app = read("web/app.js");
  const bridge = read("web/theme-bridge.js");
  const main = read("electron/main.js");
  const themePages = [
    "web/index.html",
    "web/photo-wall/index.html",
    "web/map/index.html",
    "web/map/locations.html",
  ];

  assert.match(app, /id: "claude",[\s\S]*?label: "杏陶"/);
  assert.match(bridge, /new Set\(\["default", "warm", "mist", "claude"\]\)/);
  assert.match(main, /new Set\(\["default", "warm", "mist", "claude"\]\)/);
  for (const page of themePages) {
    assert.match(read(page), /"mist",\s*"claude",/, page);
  }
});

test("杏陶主题覆盖浅色、深色与跟随系统，并只使用开放字体", () => {
  const css = read("web/theme-palettes.css");

  assert.match(
    css,
    /:root\[data-color-theme="claude"\]\s*{[\s\S]*?--main-bg: #faf9f5;[\s\S]*?--text: #141413;[\s\S]*?--accent: #d97757;/,
  );
  assert.match(
    css,
    /:root\[data-color-theme="claude"\]\[data-color-mode="dark"\]/,
  );
  assert.match(
    css,
    /:root\[data-color-theme="claude"\]\[data-color-mode="auto"\]/,
  );
  assert.match(
    css,
    /:root\[data-color-theme="claude"\] \.sidebar-title[\s\S]*?var\(--theme-display-font\)/,
  );
  assert.doesNotMatch(css, /Anthropic (?:Sans|Serif|Mono) Web Text/);
});

test("项目信息与照片编辑器状态色跟随当前主题强调色", () => {
  const editorCss = read("web/photo-editor.css");
  const stylesCss = read("web/styles.css");

  assert.match(editorCss, /--pe-active:\s*var\(--accent/);
  assert.match(
    editorCss,
    /\.pe-reset-crop\s*{[^}]*color:\s*var\(--pe-active\)/s,
  );
  assert.match(
    editorCss,
    /\.pe-done:not\(:disabled\)\s*{[^}]*color:\s*var\(--pe-active\)/s,
  );
  assert.match(
    editorCss,
    /\.pe-crop-frame\s*{[^}]*border:\s*2px solid var\(--pe-active\)/s,
  );
  assert.match(
    stylesCss,
    /\.context-info-map-footer:hover \.context-info-map-label,[\s\S]*?color:\s*var\(--accent\)/,
  );
  assert.doesNotMatch(stylesCss, /context-info-map[^}]*#006edc/s);
});

test("查看器信息卡的内部底色跟随查看器明暗而不是应用主题", () => {
  const stylesCss = read("web/styles.css");

  assert.match(
    stylesCss,
    /\.viewer\s*{[\s\S]*?--viewer-info-well-background:\s*color-mix\([\s\S]*?var\(--viewer-pill\)[\s\S]*?var\(--viewer-ink\)/,
  );
  assert.doesNotMatch(
    stylesCss,
    /\.viewer-info-popover\s*{[^}]*--viewer-info-well-background:\s*#e8e8ea/s,
  );
  assert.doesNotMatch(
    stylesCss,
    /html\[data-color-mode="(?:auto|dark)"\]\s+\.viewer-info-popover\s*{[^}]*--viewer-info-well-background/s,
  );
});

test("顶栏与选择栏按钮悬停色跟随主题，不再写死蓝色", () => {
  const css = read("web/styles.css");
  for (const selector of [
    "#moreTopBtn:hover",
    "#albumMenuBtn:hover",
    "#createBtn:hover",
    ".selbar .icon-btn:hover",
    "#sidebarOptionsBtn.is-open:hover::before",
  ]) {
    const start = css.indexOf(selector);
    assert.ok(start >= 0, `缺少规则 ${selector}`);
    const block = css.slice(start, css.indexOf("}", start));
    assert.match(block, /background: var\(--accent-hover\);/);
    assert.doesNotMatch(block, /rgba\(10, 132, 255/);
  }
  /* 原色主题的 --accent-hover 与旧写死值一致，保证默认观感不变 */
  assert.match(css, /--accent-hover: rgba\(10, 132, 255, 0\.14\);/);
  /* 按压态用主题强调色混透明，原色下与旧 rgba 逐像素等价 */
  assert.match(
    css,
    /\.selbar-act\.accent:hover \{\s*background: color-mix\(in srgb, var\(--accent\) 12%, transparent\);/,
  );
  assert.match(
    css,
    /\.back-btn:active \{\s*background: color-mix\(in srgb, var\(--accent\) 16%, transparent\);/,
  );
});
