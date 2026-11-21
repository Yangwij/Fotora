"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const root = path.resolve(__dirname, "..");
const app = fs.readFileSync(path.join(root, "web", "app.js"), "utf8");
const css = fs.readFileSync(path.join(root, "web", "styles.css"), "utf8");

const toastBlock = app.slice(
  app.indexOf("const TOAST_ENTER_MS"),
  app.indexOf("let albumSubmenu ="),
);

test("轻提示入场带轻微回弹，退场走共享 out 曲线", () => {
  assert.match(toastBlock, /const TOAST_ENTER_MS = 250;/);
  assert.match(toastBlock, /const TOAST_EXIT_MS = 180;/);
  assert.match(
    toastBlock,
    /const TOAST_SPRING_EASING = "cubic-bezier\(0\.34, 1\.35, 0\.44, 1\)";/,
  );
  const enter = toastBlock.slice(
    toastBlock.indexOf("function playToastEnter("),
    toastBlock.indexOf("function playToastExit("),
  );
  const exit = toastBlock.slice(
    toastBlock.indexOf("function playToastExit("),
    toastBlock.indexOf("function crossfadeToastText("),
  );
  assert.match(enter, /translateY\(14px\) scale\(0\.96\)/);
  assert.match(enter, /easing: reduced \? "ease-out" : TOAST_SPRING_EASING/);
  assert.match(exit, /translateY\(10px\) scale\(0\.98\)/);
  assert.match(exit, /easing: UI_EASE_OUT/);
});

test("减少动态时轻提示只做短透明度变化", () => {
  assert.match(toastBlock, /const TOAST_REDUCED_ENTER_MS = 120;/);
  assert.match(toastBlock, /const TOAST_REDUCED_EXIT_MS = 100;/);
  assert.match(
    toastBlock,
    /function toastReducedMotion\(\) \{\s*return window\.matchMedia\("\(prefers-reduced-motion: reduce\)"\)\.matches;/,
  );
  assert.match(
    toastBlock,
    /reduced\s*\?\s*\[\{ opacity: fromOpacity \}, \{ opacity: 1 \}\]/,
  );
  assert.match(toastBlock, /duration: reduced \? TOAST_REDUCED_ENTER_MS/);
  assert.match(toastBlock, /duration: reduced \? TOAST_REDUCED_EXIT_MS/);
  const crossfade = toastBlock.slice(
    toastBlock.indexOf("function crossfadeToastText("),
    toastBlock.indexOf("function toast("),
  );
  assert.match(crossfade, /if \(toastReducedMotion\(\)\)/);
  assert.match(crossfade, /span\.textContent = nextText;/);
});

test("可见提示换文案走淡出淡入，连点由序号守卫取消旧动画", () => {
  assert.match(toastBlock, /let toastSeq = 0;/);
  assert.match(toastBlock, /const seq = \+\+toastSeq;/);
  assert.match(toastBlock, /if \(seq !== toastSeq\) return;/);
  assert.match(toastBlock, /toastTextMotion\?\.cancel\(\);/);
  assert.match(
    toastBlock,
    /class(?:Name)? = "toast-text"|className = "toast-text"/,
  );
  assert.match(toastBlock, /const TOAST_TEXT_OUT_MS = 90;/);
  assert.match(toastBlock, /const TOAST_TEXT_IN_MS = 140;/);
});

test("退场途中再来提示会从当前透明度重新浮起，而不是硬切", () => {
  assert.match(toastBlock, /let toastExiting = false;/);
  const reenter = toastBlock.slice(
    toastBlock.indexOf("} else if (toastExiting) {"),
    toastBlock.indexOf("} else if (span.textContent !== nextText) {"),
  );
  assert.match(reenter, /getComputedStyle\(el\)\.opacity/);
  assert.match(reenter, /playToastEnter\(el, \{/);
  assert.match(reenter, /fromOpacity:/);
});

test("hideToast 也走退场动画，duration=0 的提示仍常驻", () => {
  const hide = toastBlock.slice(toastBlock.indexOf("function hideToast()"));
  assert.match(hide, /playToastExit\(el, \+\+toastSeq\);/);
  assert.doesNotMatch(hide, /\.hidden = true;/);
  assert.match(toastBlock, /if \(!\(duration > 0\)\) return;/);
});

test("轻提示允许长文案换行，不再 nowrap 溢出窄窗口", () => {
  const toastCss = css.slice(
    css.indexOf(".toast {"),
    css.indexOf(".status-bar {"),
  );
  assert.match(toastCss, /max-width: min\(560px, calc\(100% - 48px\)\);/);
  assert.match(toastCss, /white-space: normal;/);
  assert.match(toastCss, /\.toast \.toast-text \{\s*display: inline-block;/);
  assert.doesNotMatch(toastCss, /white-space: nowrap;/);
});

test("状态条文字更换走短交叉淡化，减少动态直接换字", () => {
  const status = app.slice(
    app.indexOf("let statusLabelMotion = null;"),
    app.indexOf("let quietUntil = 0;"),
  );
  assert.match(status, /function setStatusLabelText\(label, nextText\)/);
  assert.match(status, /prefers-reduced-motion: reduce/);
  assert.match(status, /duration: 80/);
  assert.match(status, /duration: 120/);
  assert.match(status, /if \(statusLabelMotion !== out\) return;/);
  assert.match(status, /setStatusLabelText\(label, busyText\);/);
});

test("导出和导入状态条是不占布局的浮层，不推动照片网格", () => {
  const statusCss = css.slice(
    css.indexOf(".status-bar {"),
    css.indexOf(".status-label {"),
  );
  const collapsed = css.slice(
    css.indexOf(".status-bar.is-collapsed {"),
    css.indexOf(
      "@media (prefers-reduced-motion: reduce)",
      css.indexOf(".status-bar.is-collapsed {"),
    ),
  );

  assert.match(statusCss, /position: absolute;/);
  assert.match(statusCss, /bottom: 0;/);
  assert.match(statusCss, /height: calc\(38px \+ var\(--app-frame-bottom\)\);/);
  assert.match(statusCss, /transition:[\s\S]*?transform 180ms/);
  assert.match(collapsed, /transform: translate3d\(0, 100%, 0\);/);
  assert.doesNotMatch(collapsed, /height:\s*0;/);
  assert.doesNotMatch(collapsed, /padding(?:-top|-bottom)?:\s*0;/);
});
