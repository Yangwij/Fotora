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

test("取消后台导入会移除新图库并恢复导入前的图库", async (t) => {
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
