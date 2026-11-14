"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs/promises");
const os = require("node:os");
const path = require("node:path");
const { execFile } = require("node:child_process");
const test = require("node:test");
const sharp = require("sharp");

const dataDir = path.join(
  os.tmpdir(),
  `fotora-video-poster-test-${process.pid}-${Date.now()}`,
);
const libraryDir = path.join(dataDir, "library");
process.env.PHOTO_DATA = path.join(dataDir, "data");
process.env.PHOTO_DB = path.join(dataDir, "library.db");

const edits = require("../server/edits");
const lib = require("../server/library");
const serverApi = require("../server/index");
const thumbs = require("../server/thumbs");

function run(command, args) {
  return new Promise((resolve, reject) => {
    execFile(command, args, { windowsHide: true }, (error, stdout, stderr) => {
      if (error) {
        reject(new Error(String(stderr || error.message)));
        return;
      }
      resolve(stdout);
    });
  });
}

test("视频封面帧与裁剪一起保存，并能恢复默认封面", async (t) => {
  await fs.mkdir(libraryDir, { recursive: true });
  await run(edits.FFMPEG, [
    "-hide_banner",
    "-loglevel",
    "error",
    "-f",
    "lavfi",
    "-i",
    "color=c=0x336699:s=96x64:d=1.2:r=12",
    "-vf",
    "drawbox=x=0:y=0:w=iw:h=ih:color=0xcc3333:t=fill:enable='gte(t,0.6)'",
    "-c:v",
    "libx264",
    "-pix_fmt",
    "yuv420p",
    "-y",
    path.join(libraryDir, "sample.mp4"),
  ]);

  const root = lib.addRoot(libraryDir);
  await lib.scanRoot(root.id);
  const item = lib
    .getLibraryItems(root.id)
    .find((entry) => entry.kind === "video");
  assert.ok(item);

  const running = await serverApi.start({ port: 0 });
  t.after(async () => {
    await serverApi.stop();
    lib.closeDatabase();
    await fs.rm(dataDir, { recursive: true, force: true });
  });

  const address = `http://127.0.0.1:${running.port}`;
  const cropRecipe = edits.normalizeRecipe({
    geometry: {
      crop: { x: 0.1, y: 0.2, w: 0.7, h: 0.6 },
      aspect: "free",
    },
  });
  const saveResponse = await fetch(`${address}/api/edit/${item.id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      recipe: cropRecipe,
      videoPoster: { frameTime: 0.75 },
    }),
  });
  assert.equal(saveResponse.status, 200);
  const saved = await saveResponse.json();
  assert.equal(saved.videoPoster.frameTime, 0.75);
  assert.ok(saved.videoPoster.revision > 0);

  const savedItem = lib
    .getLibraryItems(root.id)
    .find((entry) => entry.id === item.id);
  assert.equal(savedItem.videoPosterRevision, saved.videoPoster.revision);

  const posterThumb = await thumbs.ensureThumb(savedItem, 400, "cover");
  assert.match(path.basename(posterThumb), /-poster-/);
  const posterStats = await sharp(posterThumb).stats();
  assert.ok(posterStats.channels[0].mean > posterStats.channels[2].mean);

  const resetResponse = await fetch(`${address}/api/edit/${item.id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      recipe: edits.normalizeRecipe(null),
      videoPoster: null,
    }),
  });
  assert.equal(resetResponse.status, 200);
  const reset = await resetResponse.json();
  assert.equal(reset.videoPoster, null);
  assert.equal(lib.getVideoPoster(item.id), null);

  const resetItem = lib
    .getLibraryItems(root.id)
    .find((entry) => entry.id === item.id);
  assert.equal(resetItem.videoPosterRevision || 0, 0);
  const defaultThumb = await thumbs.ensureThumb(resetItem, 400, "cover");
  assert.doesNotMatch(path.basename(defaultThumb), /-poster-/);
  const defaultStats = await sharp(defaultThumb).stats();
  assert.ok(defaultStats.channels[2].mean > defaultStats.channels[0].mean);
});
