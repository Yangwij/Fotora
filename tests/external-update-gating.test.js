"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const root = path.resolve(__dirname, "..");
const app = fs.readFileSync(path.join(root, "web", "app.js"), "utf8");
const server = fs.readFileSync(path.join(root, "server", "index.js"), "utf8");

test("外部刷新统一避开所有会占用当前照片集合的界面", () => {
  const from = app.indexOf("function shouldDeferLiveRefresh()");
  const body = app.slice(
    from,
    app.indexOf("function schedulePendingUpdateFlush("),
  );
  assert.ok(from >= 0 && body.length > 0);
  for (const condition of [
    "state.rootImport",
    "menuOpen",
    "pickerOpen",
    "contextMenuOpen",
    "state.libraryPickerOpen",
    "state.select",
    "state.copyTarget",
    "state.edit",
    "state.filmstrip",
    "state.photoWall",
    'state.activeId === "photoWall"',
    "photoWallTransition",
    "state.albumMapOpen",
    'state.activeId === "locations"',
    "photoEditorOpen",
    '!$("#viewer").hidden',
    "window.albumSlideshow?.isOpen()",
    'classList.contains("gallery-is-scrolling")',
    "hasVisibleDialogSurface()",
  ]) {
    assert.ok(body.includes(condition), `外部刷新保护漏掉：${condition}`);
  }
});

test("revision 不变时仍会重试积压的外部更新", () => {
  const poll = app.slice(
    app.indexOf("async function pollRevision()"),
    app.indexOf("async function applyExternalUpdate("),
  );
  assert.match(poll, /info\.rev !== lastRev/);
  assert.match(poll, /markPendingExternalUpdate\(\)/);
  assert.match(
    poll,
    /if \(pendingUpdate \|\| pendingImportedRootActivation\) \{\s*await flushPendingUpdate\(\);/,
  );

  const flush = app.slice(
    app.indexOf("async function flushPendingUpdate()"),
    app.indexOf("let undoing = false;"),
  );
  assert.match(flush, /shouldDeferLiveRefresh\(\)/);
  assert.match(flush, /schedulePendingUpdateFlush\(\)/);
  assert.match(flush, /applyExternalUpdate\(\{ force: true \}\)/);
});

test("等待激活的新图库不会把自己永久判成必须延迟", () => {
  const defer = app.slice(
    app.indexOf("function shouldDeferLiveRefresh()"),
    app.indexOf("function schedulePendingUpdateFlush("),
  );
  assert.doesNotMatch(
    defer,
    /pendingImportedRootActivation/,
    "等待激活状态本身不能成为再次延迟的理由",
  );

  const queue = app.slice(
    app.indexOf("function queueImportedRootActivation("),
    app.indexOf("async function flushPendingRootImport("),
  );
  assert.match(queue, /schedulePendingUpdateFlush\(0\)/);
  const flush = app.slice(
    app.indexOf("async function flushPendingRootImport("),
    app.indexOf("async function pickFolder("),
  );
  assert.match(flush, /\/api\/imports\/complete/);
  assert.match(flush, /await applyImportedRootState/);
});

test("后台导入结束后由可延迟的统一入口激活图库", () => {
  const pick = app.slice(
    app.indexOf("async function pickFolder()"),
    app.indexOf("async function switchRoot("),
  );
  assert.match(pick, /queueImportedRootActivation\(importContext\)/);
  assert.match(pick, /await flushPendingUpdate\(\)/);
  assert.doesNotMatch(
    pick,
    /state\.activeId = "library";\s*await loadLibrary\(\);/,
    "导入完成不应绕过统一交互保护直接切回图库",
  );

  const completeRoute = server.slice(
    server.indexOf('pathname === "/api/imports/complete"'),
    server.indexOf('pathname === "/api/imports/cancel"'),
  );
  assert.match(completeRoute, /setActiveRoot\(root\.id\)/);
  const startRoute = server.slice(
    server.indexOf('pathname === "/api/roots" && req.method === "POST"'),
    server.indexOf('if (parts[1] === "edit"'),
  );
  const backgroundBranch = startRoute.slice(
    startRoute.indexOf("if (background) {"),
    startRoute.indexOf("const result = await scanAndBump(root.id);"),
  );
  assert.doesNotMatch(
    backgroundBranch,
    /setActiveRoot\(root\.id\)/,
    "后台扫描开始时不能提前把新图库设为活动图库",
  );
});
