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
