"use strict";

const fs = require("node:fs");
const path = require("node:path");
const { execFileSync } = require("node:child_process");

const UPX = path.join(__dirname, "tools", "upx.exe");
const PACKED_MARKER = Buffer.from("UPX0");

function hasUpxHeader(file) {
  if (!fs.existsSync(file)) return true;
  const descriptor = fs.openSync(file, "r");
  const header = Buffer.alloc(8192);
  const bytesRead = fs.readSync(descriptor, header, 0, header.length, 0);
  fs.closeSync(descriptor);
  return header.subarray(0, bytesRead).includes(PACKED_MARKER);
}

function compressBinary(file, label) {
  if (hasUpxHeader(file)) return false;
  console.log(`正在压缩 ${label}…`);
  execFileSync(UPX, ["--best", "--lzma", file], { stdio: "inherit" });
  return true;
}

function executableFiles(directory) {
  if (!fs.existsSync(directory)) return [];
  return fs
    .readdirSync(directory, { recursive: true, withFileTypes: true })
    .filter((entry) => entry.isFile() && /\.(?:dll|exe)$/i.test(entry.name))
    .map((entry) => path.join(entry.parentPath, entry.name));
}

function optimizeRuntimeBinaries({ projectRoot, packaged = false }) {
  if (process.platform !== "win32") return [];
  if (!fs.existsSync(UPX)) {
    throw new Error(`缺少二进制压缩工具：${UPX}`);
  }

  const resourcesRoot = packaged
    ? path.join(projectRoot, "resources")
    : projectRoot;
  const targetFiles = [
    path.join(resourcesRoot, "vendor", "ffmpeg.exe"),
    path.join(
      resourcesRoot,
      packaged ? "dnglab" : "vendor/dnglab",
      "dnglab.exe",
    ),
    [
      path.join(
        projectRoot,
        "node_modules",
        "@img",
        "sharp-win32-x64",
        "lib",
        "libvips-42.dll",
      ),
    ],
  ]
    .flat()
    .filter((file) => fs.existsSync(file));
  const exiftoolRoot = path.join(
    resourcesRoot,
    packaged ? "exiftool" : "vendor/exiftool",
  );
  targetFiles.push(...executableFiles(exiftoolRoot));

  return [...new Set(targetFiles)]
    .filter((file) => compressBinary(file, path.basename(file)))
    .map((file) => path.basename(file));
}

module.exports = { optimizeRuntimeBinaries };

if (require.main === module) {
  optimizeRuntimeBinaries({ projectRoot: path.join(__dirname, "..") });
}
