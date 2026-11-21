"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const root = path.resolve(__dirname, "..");
const app = fs.readFileSync(path.join(root, "web", "app.js"), "utf8");
const html = fs.readFileSync(path.join(root, "web", "index.html"), "utf8");
const styles = fs.readFileSync(path.join(root, "web", "styles.css"), "utf8");
const slideshow = fs.readFileSync(
  path.join(root, "web", "slideshow.js"),
  "utf8",
);
const settingsDialog = fs.readFileSync(
  path.join(root, "web", "settings-dialog.js"),
  "utf8",
);
const photoEditor = fs.readFileSync(
  path.join(root, "web", "photo-editor.js"),
  "utf8",
);

test("只保留快捷键表定义的应用级键盘操作", () => {
  assert.doesNotMatch(app, /#sidebarList"\)\.addEventListener\("keydown"/);
  assert.doesNotMatch(
    app,
    /#libraryTimelineModes"\)\.addEventListener\("keydown"/,
  );
  assert.doesNotMatch(app, /#selbar"\)\.addEventListener\("keydown"/);
  assert.doesNotMatch(app, /#popMenu"\)\.addEventListener\("keydown"/);
  assert.doesNotMatch(app, /#contextMenu"\)\.addEventListener\("keydown"/);
  assert.doesNotMatch(app, /#sidebarHoverEdge"\)\.addEventListener\("keydown"/);
  assert.doesNotMatch(
    app,
    /#libraryPickerAlbumList"\)\.addEventListener\("keydown"/,
  );
  assert.doesNotMatch(app, /key === "e" \|\| key === "E"/);
  assert.doesNotMatch(app, /e\.altKey && key === "ArrowLeft"/);
  assert.doesNotMatch(app, /focusFirst/);
  assert.doesNotMatch(app, /pickerKeyboardTargets/);
});

test("快捷键执行后不主动移动焦点或制造焦点框", () => {
  const enterSelection = app.slice(
    app.indexOf("function enterSelection("),
    app.indexOf("function captureSelectionExitFrames"),
  );
  const exitSelection = app.slice(
    app.indexOf("async function exitSelection("),
    app.indexOf('$("#selectBtn").addEventListener'),
  );
  const shortcuts = app.slice(
    app.indexOf("function openShortcuts("),
    app.indexOf('$("#shortcuts").addEventListener'),
  );

  assert.doesNotMatch(enterSelection, /\.focus\(/);
  assert.doesNotMatch(exitSelection, /\.focus\(/);
  assert.doesNotMatch(shortcuts, /\.focus\(/);
  assert.doesNotMatch(app, /shortcutsReturnFocus/);
  assert.doesNotMatch(
    app,
    /paintKeyboardFocus|focusTile\(|rememberTileFocus|cursorVisible|is-keyboard-focus/,
  );
  assert.doesNotMatch(styles, /\.photo-grid \.tile\.is-keyboard-focus/);
  assert.doesNotMatch(
    styles,
    /\.photo-grid \.tile:focus(?:,\s*\.photo-grid \.tile:focus-visible)?\s*\{[^}]*outline:\s*none;/,
  );
  assert.match(app, /enterSelection\(\{ selectAll: true \}\)/);
  assert.match(
    app,
    /state\.cursor = key === "Home" \? 0 : state\.items\.length - 1;[\s\S]*?scrollIntoView\(\{[\s\S]*?block: "nearest",[\s\S]*?inline: "nearest",[\s\S]*?\}\);/,
  );
});

test("快捷键触发的确认框和浮层不会恢复或移动焦点", () => {
  const ask = app.slice(
    app.indexOf("function askConfirm("),
    app.indexOf('$("#ask").addEventListener'),
  );
  const nameClose = app.slice(
    app.indexOf("function closeNameDialog("),
    app.indexOf('$("#nameInput").addEventListener'),
  );
  const locationClose = app.slice(
    app.indexOf("function closeMetadataLocation("),
    app.indexOf('$("#metadataLocationDialog").addEventListener'),
  );
  const pickerClose = app.slice(
    app.indexOf("function finalizeLibraryPickerClose("),
    app.indexOf("function closeLibraryPicker("),
  );
  const titleRename = app.slice(
    app.indexOf("function closeTitleRename("),
    app.indexOf("/* 普通相簿与图库的 DOM"),
  );
  const filmstripExit = app.slice(
    app.indexOf("function setFilmstripMode("),
    app.indexOf("function setRatingMode("),
  );
  const wallCancel = app.slice(
    app.indexOf("function cancelPhotoWallAlbumSelection("),
    app.indexOf("function togglePhotoWallAlbumSelected("),
  );

  for (const snippet of [
    ask,
    nameClose,
    locationClose,
    pickerClose,
    titleRename,
    filmstripExit,
    wallCancel,
  ]) {
    assert.doesNotMatch(snippet, /\.focus\(/);
  }
  assert.doesNotMatch(app, /focusOnOpen/);
  assert.doesNotMatch(app, /ReturnFocus/);
  assert.doesNotMatch(app, /restoreFocus/);
});

test("组件内的非快捷键方向键和回车不会改变状态或移动焦点", () => {
  const settingsEvents = settingsDialog.slice(
    settingsDialog.indexOf('main.addEventListener("keydown"'),
    settingsDialog.indexOf('confirm.addEventListener("click"'),
  );
  assert.equal(settingsEvents, "");
  assert.doesNotMatch(
    slideshow,
    /button\.addEventListener\("keydown",[\s\S]*?data-slideshow-order/,
  );
  assert.doesNotMatch(
    photoEditor,
    /else if \(event\.key === "Enter"\) \{[\s\S]*?this\.(?:finish|revertPersisted)/,
  );
  assert.doesNotMatch(slideshow, /setSettingsOpen\(false, \{ restoreFocus/);
});

test("快捷键表仍是键盘操作的唯一说明来源", () => {
  const groups = html.slice(
    html.indexOf('<div class="shortcuts-groups">'),
    html.indexOf('<p class="shortcuts-foot">'),
  );
  for (const shortcut of [
    "Alt + Q",
    "Alt + D",
    "Ctrl + 0",
    "Esc",
    "Ctrl / ⌘ + Z",
    "?",
    "Home",
    "End",
    "R",
    "S",
    "Ctrl / ⌘ + A",
    "Ctrl / ⌘ + C",
    "Delete",
    "←",
    "→",
    "Z",
    "0～5",
    "空格",
  ]) {
    assert.ok(groups.includes(shortcut), `快捷键表缺少 ${shortcut}`);
  }
});
