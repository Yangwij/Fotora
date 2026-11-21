"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs/promises");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");
const { readDirectoryEntries, statMediaEntry } = require("../server/fs-scan");

test("读取真实空目录时返回空列表", async (t) => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "fotora-empty-"));
  t.after(() => fs.rm(dir, { recursive: true, force: true }));
  assert.deepEqual(await readDirectoryEntries(dir), []);
});

test("目录读取失败时抛出扫描错误而不是伪装成空目录", async (t) => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "fotora-scan-"));
  const filePath = path.join(dir, "not-a-directory.jpg");
  await fs.writeFile(filePath, "test");
  t.after(() => fs.rm(dir, { recursive: true, force: true }));

  await assert.rejects(
    () => readDirectoryEntries(filePath),
    (err) => err.code === "SCAN_READ_FAILED" && err.path === filePath,
  );
});

test("扫描期间消失的文件会跳过，不会阻塞正常刷新", async () => {
  const missing = path.join(
    os.tmpdir(),
    `fotora-missing-${process.pid}-${Date.now()}.jpg`,
  );
  assert.equal(await statMediaEntry(missing), null);
});
