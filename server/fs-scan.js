"use strict";

const fsp = require("node:fs/promises");

function scanError(action, target, cause) {
  const detail = cause?.code || cause?.message || "未知错误";
  const error = new Error(`无法完整${action}：${target}（${detail}）`, {
    cause,
  });
  error.code = "SCAN_READ_FAILED";
  error.path = target;
  return error;
}

/**
 * 目录扫描必须区分“空目录”和“读取失败”。扫描入口不能把读取异常
 * 转换成空列表，否则后续清理陈旧记录时会把整棵目录的索引误删。
 */
async function readDirectoryEntries(dir) {
  try {
    return await fsp.readdir(dir, { withFileTypes: true });
  } catch (err) {
    throw scanError("读取目录", dir, err);
  }
}

/**
 * 文件在扫描过程中消失属于正常竞态，可以当作本轮未看到；
 * 权限、设备离线等错误则必须中止扫描，避免误删已有索引。
 */
async function statMediaEntry(filePath) {
  try {
    return await fsp.stat(filePath);
  } catch (err) {
    if (err?.code === "ENOENT" || err?.code === "ENOTDIR") return null;
    throw scanError("读取文件信息", filePath, err);
  }
}

module.exports = {
  readDirectoryEntries,
  statMediaEntry,
};
