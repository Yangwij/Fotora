"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const root = path.resolve(__dirname, "..", "web");
const ignored = new Set(["vendor", "assets"]);

function filesUnder(directory, extension) {
  const files = [];
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    if (ignored.has(entry.name)) continue;
    const absolute = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      files.push(...filesUnder(absolute, extension));
    } else if (entry.name.endsWith(extension)) {
      files.push(absolute);
    }
  }
  return files;
}

test("界面源码不再声明或动态设置鼠标悬停标题", () => {
  for (const file of filesUnder(root, ".html")) {
    const source = fs
      .readFileSync(file, "utf8")
      .replace(/<title\b[^>]*>[\s\S]*?<\/title>/gi, "");
    assert.doesNotMatch(
      source,
      /\stitle\s*=/i,
      `${path.relative(root, file)} 不应包含 title 属性`,
    );
  }

  for (const file of filesUnder(root, ".js")) {
    const source = fs.readFileSync(file, "utf8");
    assert.doesNotMatch(
      source,
      /(?:\b[\w$]+\.title|\[["']title["']\])\s*=/,
      `${path.relative(root, file)} 不应动态设置悬停标题`,
    );
    assert.doesNotMatch(
      source,
      /(?:setAttribute|toggleAttribute)\(\s*["']title["']/,
      `${path.relative(root, file)} 不应通过属性 API 设置悬停标题`,
    );
  }
});

test("自定义悬停提示也已移除", () => {
  for (const file of [
    ...filesUnder(root, ".html"),
    ...filesUnder(root, ".js"),
  ]) {
    const source = fs.readFileSync(file, "utf8");
    assert.doesNotMatch(
      source,
      /\bdata-tooltip(?:=|\b)/,
      `${path.relative(root, file)} 不应保留自定义悬停提示`,
    );
  }

  const cssFiles = filesUnder(root, ".css");
  for (const file of cssFiles) {
    const source = fs.readFileSync(file, "utf8");
    assert.doesNotMatch(
      source,
      /\[data-tooltip\]|content\s*:\s*attr\(\s*data-tooltip/i,
      `${path.relative(root, file)} 不应渲染自定义悬停提示`,
    );
  }
});
