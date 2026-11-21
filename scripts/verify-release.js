"use strict";

const crypto = require("node:crypto");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const asar = require("@electron/asar");

const root = path.join(__dirname, "..");
const resources = path.join(root, "release", "win-unpacked", "resources");
const archive = path.join(resources, "app.asar");
const temp = fs.mkdtempSync(path.join(os.tmpdir(), "fotora-verify-"));
const sharpLibrary = path.join(
  resources,
  "app.asar.unpacked",
  "node_modules",
  "@img",
  "sharp-win32-x64",
  "lib",
  "libvips-42.dll",
);

function sha256(file) {
  return crypto
    .createHash("sha256")
    .update(fs.readFileSync(file))
    .digest("hex");
}

try {
  asar.extractAll(archive, temp);
  const manifest = JSON.parse(
    fs.readFileSync(path.join(temp, "build-manifest.json"), "utf8"),
  );
  const problems = manifest.files.flatMap((entry) => {
    const sourceHash = sha256(path.join(root, entry.path));
    const packagedHash = sha256(path.join(temp, entry.path));
    const failures = [];
    if (sourceHash !== entry.sourceHash) {
      failures.push(`${entry.path}: 源码哈希不匹配`);
    }
    if (packagedHash !== entry.packagedHash) {
      failures.push(`${entry.path}: 安装包哈希不匹配`);
    }
    return failures;
  });

  if (problems.length) {
    throw new Error(problems.join("\n"));
  }
  if (!fs.existsSync(sharpLibrary)) {
    throw new Error("Sharp 原生图片库没有解包到 app.asar.unpacked");
  }
  if (
    !fs
      .readFileSync(sharpLibrary)
      .subarray(0, 8192)
      .includes(Buffer.from("UPX0"))
  ) {
    throw new Error("Sharp 原生图片库没有使用优化版本");
  }
  for (const name of ["dxcompiler.dll", "dxil.dll"]) {
    if (fs.existsSync(path.join(root, "release", "win-unpacked", name))) {
      throw new Error(`未使用的 Electron WebGPU 组件仍在发布包中：${name}`);
    }
  }
  const exiftoolRoot = path.join(resources, "exiftool", "exiftool_files");
  if (
    fs
      .readdirSync(exiftoolRoot, { recursive: true })
      .some((file) => /(?:^|[\\/])Lang(?:[\\/]|$)/.test(file))
  ) {
    throw new Error("ExifTool 多语言文档仍在发布包中");
  }
  const exiftoolRuntime = path.join(exiftoolRoot, "perl532.dll");
  if (
    !fs
      .readFileSync(exiftoolRuntime)
      .subarray(0, 8192)
      .includes(Buffer.from("UPX0"))
  ) {
    throw new Error("ExifTool 运行库没有使用优化版本");
  }

  const installer = path.join(root, "release", "Fotora.exe");
  const installedBytes = fs
    .readdirSync(path.join(root, "release", "win-unpacked"), {
      recursive: true,
      withFileTypes: true,
    })
    .filter((entry) => entry.isFile())
    .reduce(
      (sum, entry) =>
        sum + fs.statSync(path.join(entry.parentPath, entry.name)).size,
      0,
    );

  console.log(`发布源码对应检查通过：${manifest.files.length} 个文件`);
  console.log(
    `安装包：${(fs.statSync(installer).size / 1024 / 1024).toFixed(2)} MiB`,
  );
  console.log(`安装后：${(installedBytes / 1024 / 1024).toFixed(2)} MiB`);
} finally {
  fs.rmSync(temp, { recursive: true, force: true });
}
