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
const preview = fs.readFileSync(
  path.join(root, "settings-dialog-preview.html"),
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

test("设置预览说明按钮常显与悬停显示的区别", () => {
  assert.match(preview, /key:\s*"editButtonAlwaysVisible"/);
  assert.match(preview, /开启时编辑按钮常驻；关闭后仅在鼠标悬停/);
});
