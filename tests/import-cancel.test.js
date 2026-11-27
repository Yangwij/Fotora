"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const fsp = require("node:fs/promises");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");

const dataDir = path.join(
  os.tmpdir(),
  `fotora-import-cancel-${process.pid}-${Date.now()}`,
);
const existingLibrary = path.join(dataDir, "existing-library");
const incomingLibrary = path.join(dataDir, "incoming-library");
process.env.PHOTO_DATA = path.join(dataDir, "data");
process.env.PHOTO_DB = path.join(dataDir, "library.db");

const lib = require("../server/library");
const serverApi = require("../server/index");

function postJson(address, requestPath, body) {
  return fetch(`${address}${requestPath}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

async function waitForScan(address, rootId, timeoutMs = 5000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const response = await fetch(
      `${address}/api/scan?rootId=${encodeURIComponent(rootId)}`,
    );
    const scan = await response.json();
    if (scan.running) {
      await new Promise((resolve) => setTimeout(resolve, 20));
      continue;
    }
    return scan;
  }
  throw new Error("扫描没有在限定时间内结束");
}

test("后台导入不提前换库；取消恢复旧库，完成后才激活新库", async (t) => {
  await fsp.mkdir(existingLibrary, { recursive: true });
  await fsp.mkdir(incomingLibrary, { recursive: true });
  await fsp.writeFile(path.join(existingLibrary, "existing.jpg"), "photo");
  for (let index = 0; index < 32; index += 1) {
    await fsp.writeFile(
      path.join(incomingLibrary, `incoming-${index}.jpg`),
      "photo",
    );
  }

  const existingRoot = lib.addRoot(existingLibrary);
  await lib.scanRoot(existingRoot.id);
  lib.setMeta("active_root_id", String(existingRoot.id));
  const running = await serverApi.start({ port: 0 });
  t.after(async () => {
    await serverApi.stop();
    lib.closeDatabase();
    await fsp.rm(dataDir, { recursive: true, force: true });
  });

  const address = `http://127.0.0.1:${running.port}`;
  const startResponse = await postJson(address, "/api/roots", {
    path: incomingLibrary,
    background: true,
  });
  assert.equal(startResponse.status, 200);
  const started = await startResponse.json();
  assert.equal(started.background, true);
  assert.ok(started.importId);
  assert.notEqual(started.root.id, existingRoot.id);
  assert.equal(
    started.state.activeRootId,
    existingRoot.id,
    "扫描期间服务端必须继续使用旧图库",
  );

  const cancelResponse = await postJson(address, "/api/imports/cancel", {
    importId: started.importId,
  });
  assert.equal(cancelResponse.status, 200);
  const canceled = await cancelResponse.json();
  assert.equal(canceled.canceled, true);
  assert.equal(canceled.state.activeRootId, existingRoot.id);
  assert.deepEqual(
    canceled.state.roots.map((root) => root.id),
    [existingRoot.id],
  );
  assert.equal(
    lib.listRoots().some((root) => root.id === started.root.id),
    false,
  );

  const secondResponse = await postJson(address, "/api/roots", {
    path: incomingLibrary,
    background: true,
  });
  const second = await secondResponse.json();
  assert.equal(secondResponse.status, 200);
  assert.equal(second.state.activeRootId, existingRoot.id);
  const scan = await waitForScan(address, second.root.id);
  assert.equal(scan.browsable, true);
  assert.match(scan.phase, /^(browsable|done)$/);
  assert.equal(
    lib.getMeta("active_root_id"),
    String(existingRoot.id),
    "扫描完成但前端尚未允许切换时，活动图库仍应保持旧库",
  );

  const completeResponse = await postJson(address, "/api/imports/complete", {
    importId: second.importId,
    rootId: second.root.id,
  });
  const completed = await completeResponse.json();
  assert.equal(completeResponse.status, 200);
  assert.equal(completed.ok, true);
  assert.equal(completed.state.activeRootId, second.root.id);
});

test("导入底栏只在任务期间显示取消入口", () => {
  const root = path.resolve(__dirname, "..");
  const app = fs.readFileSync(path.join(root, "web", "app.js"), "utf8");
  const css = fs.readFileSync(path.join(root, "web", "styles.css"), "utf8");
  const language = fs.readFileSync(
    path.join(root, "web", "ui-language.js"),
    "utf8",
  );
  const status = app.slice(
    app.indexOf("function renderStatus()"),
    app.indexOf("let quietUntil"),
  );
  assert.match(status, /state\.rootImport/);
  assert.match(status, /status-import-cancel/);
  assert.match(status, /cancelRootImport\(\)/);
  assert.match(
    app,
    /api\("\/api\/imports\/cancel"[\s\S]*?importId: importContext\.importId/,
  );
  const buttonCss = css.slice(
    css.indexOf(".status-import-cancel {"),
    css.indexOf("/* ---------- 查看器 ---------- */"),
  );
  assert.match(buttonCss, /margin-left:\s*auto/);
  assert.match(buttonCss, /\[hidden\]\s*\{\s*display:\s*none/);
  assert.match(language, /取消这次图库导入: "Cancel this library import"/);
  assert.match(language, /已取消导入图库: "Library import canceled"/);
});
