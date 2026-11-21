"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const root = path.resolve(__dirname, "..");
const app = fs.readFileSync(path.join(root, "web", "app.js"), "utf8");
const dialog = fs.readFileSync(
  path.join(root, "web", "settings-dialog.js"),
  "utf8",
);

test("显示编辑按钮开关以常显为开启、悬停为关闭", () => {
  assert.match(
    dialog,
    /key:\s*"viewerEditHoverOnly",\s*invert:\s*true,\s*label:\s*"显示编辑按钮"/,
  );
  assert.match(
    app,
    /if \(!viewerEditHoverOnly\)[\s\S]*?zone\.classList\.add\("is-visible"\)/,
  );
});

test("编辑按钮设置从草稿应用到运行时和持久化", () => {
  assert.match(
    app,
    /viewerEditHoverOnly = draft\.viewerEditHoverOnly;[\s\S]*?VIEWER_EDIT_HOVER_ONLY_KEY,[\s\S]*?String\(viewerEditHoverOnly\)/,
  );
  assert.match(
    app,
    /document\.documentElement\.classList\.toggle\(\s*"viewer-edit-hover-only",\s*viewerEditHoverOnly/,
  );
});
