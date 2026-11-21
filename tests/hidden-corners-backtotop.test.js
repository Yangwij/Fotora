"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const root = path.resolve(__dirname, "..");
const app = fs.readFileSync(path.join(root, "web", "app.js"), "utf8");
const styles = fs.readFileSync(path.join(root, "web", "styles.css"), "utf8");
const html = fs.readFileSync(path.join(root, "web", "index.html"), "utf8");

test("回到顶部按钮存在且默认对辅助技术隐藏", () => {
  assert.match(html, /id="backToTop"[\s\S]*?aria-label="回到顶部"[\s\S]*?aria-hidden="true"/);
});

test("回到顶部弹簧入场，滚过一屏才出现，避开选择/照片墙/查看器/地图", () => {
  assert.match(styles, /\.back-to-top\.is-visible \{[\s\S]*?opacity: 1;[\s\S]*?pointer-events: auto;/);
  assert.match(styles, /\.back-to-top \{[\s\S]*?cubic-bezier\(0\.34, 1\.56, 0\.64, 1\)/);
  const sync = app.slice(
    app.indexOf("function syncBackToTop()"),
    app.indexOf("function scrollContentToTop()"),
  );
  assert.match(sync, /content\.scrollTop > content\.clientHeight \* 0\.9/);
  assert.match(sync, /!state\.select/);
  assert.match(sync, /!state\.photoWall/);
  assert.match(sync, /\$\("#viewer"\)\.hidden/);
  assert.match(sync, /!state\.albumMapOpen/);
  assert.match(app, /\$\("#backToTop"\)\.addEventListener\("click", scrollContentToTop\)/);
  /* 滚动 / 视图 / 选择变化都同步 */
  assert.match(app, /scheduleVisibleContextMapPreviews\(\);\s*syncBackToTop\(\);/);
});

test("回到顶部按钮默认是深色半透明底，悬停切换为浅色玻璃底", () => {
  assert.match(
    styles,
    /\.back-to-top \{[\s\S]*?background: var\(--hover\);[\s\S]*?\}/,
  );
  assert.match(
    styles,
    /\.back-to-top:hover \{\s*background: var\(--sheet-bg\);\s*\}/,
  );
});

test("平滑滚顶用 easeInOutCubic 按距离定时，减少动态直接归零", () => {
  const scroll = app.slice(
    app.indexOf("function scrollContentToTop()"),
    app.indexOf('$("#backToTop").addEventListener'),
  );
  assert.match(scroll, /prefers-reduced-motion: reduce/);
  assert.match(scroll, /content\.scrollTop = 0;/);
  assert.match(scroll, /Math\.max\(320, Math\.min\(620, start \* 0\.35\)\)/);
  assert.match(scroll, /4 \* t \* t \* t/);
  assert.match(scroll, /requestAnimationFrame\(step\)/);
});

test("空状态插画呼吸漂浮，减少动态时静止", () => {
  assert.match(styles, /\.empty-state > svg \{[\s\S]*?animation: empty-breathe/);
  assert.match(styles, /@keyframes empty-breathe/);
  assert.match(
    styles,
    /@media \(prefers-reduced-motion: reduce\) \{\s*\.empty-state > svg \{\s*animation: none;/,
  );
});
