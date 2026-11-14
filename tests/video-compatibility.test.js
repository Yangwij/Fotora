"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs/promises");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");
const { execFileSync } = require("node:child_process");

const dataDir = path.join(
  os.tmpdir(),
  `fotora-video-compat-test-${process.pid}-${Date.now()}`,
);
const libraryDir = path.join(dataDir, "library");
process.env.PHOTO_DATA = path.join(dataDir, "data");

const edits = require("../server/edits");
const lib = require("../server/library");
const serverApi = require("../server/index");

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

test("不兼容视频会生成可分段播放的 H.264/AAC 缓存", async (t) => {
  await fs.mkdir(libraryDir, { recursive: true });
  execFileSync(
    edits.FFMPEG,
    [
      "-hide_banner",
      "-loglevel",
      "error",
      "-f",
      "lavfi",
      "-i",
      "testsrc=size=320x180:rate=12",
      "-f",
      "lavfi",
      "-i",
      "sine=frequency=440:sample_rate=48000",
      "-t",
      "1",
      "-c:v",
      "mpeg4",
      "-c:a",
      "libmp3lame",
      "-y",
      path.join(libraryDir, "legacy.avi"),
    ],
    { windowsHide: true },
  );

  const root = lib.addRoot(libraryDir);
  await lib.scanRoot(root.id);
  const [item] = lib
    .getLibraryItems(root.id)
    .filter((entry) => entry.kind === "video");
  assert.ok(item, "测试视频应被识别为视频项目");

  const running = await serverApi.start({ port: 0 });
  t.after(async () => {
    await serverApi.stop();
    lib.closeDatabase();
    await fs.rm(dataDir, { recursive: true, force: true });
  });

  const address = `http://127.0.0.1:${running.port}`;
  let result;
  for (let attempt = 0; attempt < 100; attempt += 1) {
    const response = await fetch(
      `${address}/api/video/compatibility/${item.id}`,
    );
    assert.equal(response.status, 200);
    result = await response.json();
    if (result.status === "ready" || result.status === "failed") break;
    await sleep(100);
  }

  assert.equal(result?.status, "ready");
  assert.match(result.url, new RegExp(`/api/video/compatible/${item.id}`));

  const response = await fetch(`${address}${result.url}`, {
    headers: { Range: "bytes=0-1023" },
  });
  assert.equal(response.status, 206);
  assert.equal(response.headers.get("content-type"), "video/mp4");
  assert.equal(
    response.headers.get("content-range")?.startsWith("bytes 0-1023/"),
    true,
  );
  assert.equal((await response.arrayBuffer()).byteLength, 1024);
});
