"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const root = path.resolve(__dirname, "..");
const app = fs.readFileSync(path.join(root, "web", "app.js"), "utf8");
const css = fs.readFileSync(path.join(root, "web", "styles.css"), "utf8");

test("通用弹窗退场在减少动态下只做短透明度变化", () => {
  const pair = app.slice(
    app.indexOf("function animateDialogPairOut("),
    app.indexOf("function animateCardOut("),
  );
  const card = app.slice(
    app.indexOf("function animateCardOut("),
    app.indexOf("let askOpen = false;"),
  );

  assert.match(app, /const DIALOG_REDUCED_MS = 80;/);
  for (const helper of [pair, card]) {
    assert.match(helper, /prefers-reduced-motion: reduce/);
    assert.match(helper, /reducedMotion \? DIALOG_REDUCED_MS : duration/);
    assert.match(
      helper,
      /\{ opacity: 0, transform: (?:cardFrame|frame)\.transform \}/,
    );
  }
});

test("确认、名称和位置弹窗在减少动态下不播放缩放位移", () => {
  const ask = app.slice(
    app.indexOf("function askConfirm("),
    app.indexOf("function askClose("),
  );
  const name = app.slice(
    app.indexOf("function askAlbumName("),
    app.indexOf("function askNewAlbumName("),
  );
  const location = app.slice(
    app.indexOf("function askMetadataLocation("),
    app.indexOf("function closeMetadataLocation("),
  );

  for (const source of [ask, name, location]) {
    assert.match(source, /prefers-reduced-motion: reduce/);
    assert.match(
      source,
      /reducedMotion\s*\? \[\{ opacity: 0 \}, \{ opacity: 1 \}\]/,
    );
    assert.match(source, /duration: reducedMotion \? DIALOG_REDUCED_MS/);
  }
});

test("确认面板从原点放大浮现、朝原点缩回", () => {
  const place = app.slice(
    app.indexOf("function placeAsk("),
    app.indexOf("function askConfirm("),
  );
  const open = app.slice(
    app.indexOf("function askConfirm("),
    app.indexOf("function askClose("),
  );
  const close = app.slice(
    app.indexOf("function askClose("),
    app.indexOf('$("#ask").addEventListener'),
  );

  /* 时长走 motion.css 那两档共享值，进场用全局 ease-out，退场反过来加速 */
  assert.match(app, /const ASK_POP_MS = 210;/);
  assert.match(app, /const ASK_OUT_MS = 140;/);
  assert.match(app, /const ASK_EASE_POP = UI_EASE_OUT;/);
  assert.match(
    app,
    /const ASK_EASE_DISMISS = "cubic-bezier\(0\.4, 0, 1, 1\)";/,
  );

  /* 放大原点：居中面板从自己中心长出来，贴按钮的面板从按钮中心长出来 */
  assert.match(place, /card\.style\.transformOrigin = "50% 50%";/);
  assert.match(
    place,
    /const axis = \(delta, size\) =>\s*`\$\{Math\.min\(85, Math\.max\(15, \(delta \/ size\) \* 100\)\)\}%`;/,
  );

  /* 入场是放大而不是往上飘：0.92 → 过一点点头 → 1，遮罩同时淡入 */
  assert.match(
    open,
    /\{ opacity: 0, transform: "scale\(0\.92\)" \},\s*\{ opacity: 1, transform: "scale\(1\.004\)", offset: 0\.72 \},\s*\{ opacity: 1, transform: "scale\(1\)" \},/,
  );
  assert.doesNotMatch(open, /translateY/);
  assert.match(
    open,
    /dim\.animate\(\[\{ opacity: 0 \}, \{ opacity: 1 \}\], \{\s*duration: reducedMotion \? DIALOG_REDUCED_MS : ASK_POP_MS,\s*easing: ASK_EASE_POP,\s*fill: "backwards",\s*\}\)/,
  );

  /* 退场朝同一个原点缩回 0.95 并淡出，遮罩从当前这一帧接着淡 */
  assert.match(
    close,
    /animateCardOut\(card, askAnims, \{\s*duration: ASK_OUT_MS,\s*endScale: 0\.95,\s*\}\)/,
  );
  assert.match(
    close,
    /dim\.animate\(\[\{ opacity: dimFrame\.opacity \}, \{ opacity: 0 \}\], \{\s*duration: reducedMotion \? DIALOG_REDUCED_MS : ASK_OUT_MS,\s*easing: ASK_EASE_DISMISS,\s*fill: "forwards",\s*\}\)/,
  );
  /* 记帧必须早于取消入场动画，否则遮罩会先跳回全暗再淡出 */
  assert.match(close, /const dimFrame = captureVisualFrame\(dim\);/);
  assert.ok(
    close.indexOf("captureVisualFrame(dim)") < close.indexOf("animateCardOut("),
  );
});

test("图库添加弹层和右键详情在减少动态下不播放位移", () => {
  const picker = app.slice(
    app.indexOf("function closeLibraryPicker("),
    app.indexOf("async function loadLibraryPickerLibrary("),
  );
  const detail = app.slice(
    app.indexOf("function expandContextDetail("),
    app.indexOf("function resetContextMenuDom("),
  );
  const contextOpen = app.slice(
    app.indexOf("function openItemContextMenu("),
    app.indexOf("function runContextAction("),
  );
  const contextClose = app.slice(
    app.indexOf("function closeItemContextMenu("),
    app.indexOf("function openItemContextMenu("),
  );

  assert.match(picker, /reducedMotion \? DIALOG_REDUCED_MS : 190/);
  assert.match(
    detail,
    /if \(reducedMotion\) \{[\s\S]*?contextDetailAnim = menu\.animate\(\s*\[\{ opacity: 0\.72 \}, \{ opacity: 1 \}\],/,
  );
  assert.ok(
    detail.indexOf("if (reducedMotion)") <
      detail.indexOf("const fromTransform ="),
  );
  assert.match(
    css,
    /@media \(prefers-reduced-motion: reduce\) \{[\s\S]*?\.library-picker-card,[\s\S]*?\.library-picker\.is-closing \.library-picker-card,[\s\S]*?transform: none;/,
  );
  assert.match(
    contextOpen,
    /const motionDuration =\s*keyboard \|\| reducedMotion \? 0 : CONTEXT_PREVIEW_MOTION_MS;/,
  );
  assert.match(
    contextOpen,
    /reducedMotion\s*\? \[\{ opacity: 0 \}, \{ opacity: 1 \}\]\s*: \[/,
  );
  assert.match(
    contextClose,
    /if \(reducedMotion\) \{\s*contextSourceVideo\?\.pause\(\);\s*resetContextMenuDom\(\);/,
  );
});

test("查看器和右键日期浮层在减少动态下只淡入淡出", () => {
  const viewerInfoClose = app.slice(
    app.indexOf("function closeViewerInfo("),
    app.indexOf("function openViewerInfo("),
  );
  const viewerDateClose = app.slice(
    app.indexOf("function closeViewerDate("),
    app.indexOf("function openViewerDate("),
  );
  const viewerDateOpen = app.slice(
    app.indexOf("function openViewerDate("),
    app.indexOf("function clampViewerDatePosition("),
  );
  const contextDateClose = app.slice(
    app.indexOf("function closeContextDate("),
    app.indexOf("async function saveContextItemDate("),
  );
  const contextDateOpen = app.slice(
    app.indexOf("function openContextDate("),
    app.indexOf("function clampContextDatePosition("),
  );

  for (const closeSource of [
    viewerInfoClose,
    viewerDateClose,
    contextDateClose,
  ]) {
    assert.match(closeSource, /reducedMotion/);
    assert.match(
      closeSource,
      /reducedMotion\s*\? \{ opacity: 0, transform: startFrame\.transform \}/,
    );
    assert.match(closeSource, /duration: reducedMotion \? DIALOG_REDUCED_MS/);
  }
  for (const openSource of [viewerDateOpen, contextDateOpen]) {
    assert.match(
      openSource,
      /reducedMotion\s*\? \[\{ opacity: 0 \}, \{ opacity: 1 \}\]/,
    );
    assert.match(openSource, /duration: reducedMotion \? DIALOG_REDUCED_MS/);
  }
});
