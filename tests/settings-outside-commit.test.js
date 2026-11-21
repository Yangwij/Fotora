"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const root = path.resolve(__dirname, "..");
const source = fs.readFileSync(
  path.join(root, "web", "settings-dialog.js"),
  "utf8",
);

test("点击设置弹窗外保存并关闭设置", () => {
  assert.match(
    source,
    /layer\.addEventListener\("pointerdown", \(event\) => \{\s*if \(event\.target === layer\) close\(\{ commit: true \}\);/,
  );
});

test("左上角确认按钮仍然保存设置", () => {
  assert.match(
    source,
    /confirm\.addEventListener\("click", \(\) => close\(\{ commit: true \}\)\);/,
  );
});
