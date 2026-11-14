"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const root = path.join(__dirname, "..");

test("安装包名称只显示 Fotora", () => {
  const pkg = JSON.parse(
    fs.readFileSync(path.join(root, "package.json"), "utf8"),
  );
  assert.equal(pkg.productName, "Fotora");
  assert.equal(pkg.build.productName, "Fotora");
  assert.equal(pkg.build.nsis.artifactName, "Fotora.${ext}");
  assert.equal(pkg.build.nsis.shortcutName, "Fotora");
  assert.equal(pkg.build.nsis.uninstallDisplayName, "Fotora");
});

test("源码运行要求与 Electron 的 Node 版本一致", () => {
  const readme = fs.readFileSync(path.join(root, "README.md"), "utf8");
  assert.match(readme, /Node\.js 22\.12 或更高版本/);
  assert.doesNotMatch(readme, /Node\.js 20\.9/);
});

test("恢复说明不再展示历史发布版本号", () => {
  const notes = fs.readFileSync(
    path.join(root, "docs", "RECOVERY_NOTES.md"),
    "utf8",
  );
  assert.doesNotMatch(notes, /1\.1\.0/);
});

test("README 将软件截图穿插在功能说明中", () => {
  const readme = fs.readFileSync(path.join(root, "README.md"), "utf8");
  assert.match(readme, /^## 功能$/m);
  assert.match(readme, /^## 功能概览$/m);
  assert.doesNotMatch(readme, /^## 截图$/m);
  assert.doesNotMatch(readme, /^## 特色$/m);
  assert.doesNotMatch(readme, /^## 为什么选择 Fotora$/m);
  assert.match(readme, /- 🔒 \*\*本地优先\*\*/);
  assert.match(readme, /- ⚡ \*\*适合大图库\*\*/);
  assert.match(readme, /- 📁 从本地文件夹建立图库/);
  assert.match(readme, /- 🧩 提供方形网格/);
  assert.match(readme, /- 📍 按 GPS 信息浏览照片分布/);
  assert.match(readme, /^### 📋 照片信息卡$/m);

  for (const name of [
    "library.webp",
    "photo-wall.webp",
    "locations-globe.webp",
    "locations-detail.webp",
    "photo-info.webp",
  ]) {
    assert.ok(
      fs.existsSync(path.join(root, "docs", "images", "screenshots", name)),
      `${name} should exist`,
    );
  }
});
