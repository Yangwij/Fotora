"use strict";

const assert = require("node:assert/strict");
const { execFile } = require("node:child_process");
const fs = require("node:fs/promises");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");

const dataDir = path.join(
  os.tmpdir(),
  `fotora-rename-video-test-${process.pid}-${Date.now()}`,
);
const libraryDir = path.join(dataDir, "library");
process.env.PHOTO_DATA = path.join(dataDir, "data");
process.env.PHOTO_DB = path.join(dataDir, "library.db");

const lib = require("../server/library");
const ffmpeg = path.join(__dirname, "..", "vendor", "ffmpeg.exe");

function createVideo(targetPath) {
  return new Promise((resolve, reject) => {
    execFile(
      ffmpeg,
      [
        "-f",
        "lavfi",
        "-i",
        "color=c=black:s=64x64:d=0.1",
        "-c:v",
        "mpeg4",
        "-y",
        targetPath,
      ],
      { windowsHide: true },
      (error) => (error ? reject(error) : resolve()),
    );
  });
}

test("视频可以参与按顺序文件编号", async (t) => {
  await fs.mkdir(libraryDir, { recursive: true });
  const sourcePath = path.join(libraryDir, "clip.mp4");
  await createVideo(sourcePath);

  const root = lib.addRoot(libraryDir);
  await lib.scanRoot(root.id);
  const video = lib
    .getLibraryItems(root.id)
    .find((item) => item.name === "clip.mp4");
  assert.equal(video?.kind, "video");

  t.after(async () => {
    lib.closeDatabase();
    await fs.rm(dataDir, { recursive: true, force: true });
  });

  const result = await lib.renameItemsToBaseNames([
    { id: video.id, baseName: "V_00001" },
  ]);
  assert.equal(result.renamed, 1);
  await assert.rejects(fs.access(sourcePath));
  const renamed = lib.getLibraryItems(root.id)[0];
  assert.equal(renamed.id, video.id);
  assert.equal(renamed.kind, "video");
  assert.equal(renamed.name, "V_00001.mp4");
});
