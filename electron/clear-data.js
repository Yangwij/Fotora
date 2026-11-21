"use strict";

const fs = require("node:fs");
const path = require("node:path");

function normalizedPath(value) {
  const resolved = path.resolve(String(value || ""));
  return resolved.replace(/[\\/]+$/, "").toLocaleLowerCase("en-US");
}

/**
 * 「清除所有数据」只能删除一个具体的应用数据目录。
 * 拒绝磁盘根目录，以及任何包含受保护目录的父目录，避免环境变量写错时
 * 把用户目录、应用目录或整个系统盘一起删掉。
 */
function assertSafeClearTarget(target, protectedPaths = []) {
  const resolved = path.resolve(String(target || ""));
  const root = path.parse(resolved).root;
  if (!resolved || resolved === root || !path.basename(resolved)) {
    throw new Error("清除目标无效");
  }

  const targetKey = normalizedPath(resolved);
  for (const candidate of protectedPaths) {
    if (!candidate) continue;
    const protectedKey = normalizedPath(candidate);
    if (
      protectedKey === targetKey ||
      protectedKey.startsWith(`${targetKey}${path.sep}`)
    ) {
      throw new Error(`清除目标包含受保护目录：${candidate}`);
    }
  }
  return resolved;
}

function clearDataDirectory(target, protectedPaths = []) {
  const resolved = assertSafeClearTarget(target, protectedPaths);
  if (!fs.existsSync(resolved)) return { path: resolved, removed: false };
  fs.rmSync(resolved, {
    recursive: true,
    force: true,
    maxRetries: 12,
    retryDelay: 250,
  });
  return { path: resolved, removed: true };
}

module.exports = {
  assertSafeClearTarget,
  clearDataDirectory,
};
