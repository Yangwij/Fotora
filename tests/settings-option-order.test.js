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

test("照片墙巡航速度按快、中、慢排列", () => {
  const expected =
    /\["fast",\s*"快"\],\s*\["medium",\s*"中"\],\s*\["slow",\s*"慢"\]/;
  assert.match(dialog, expected);
  assert.match(
    app,
    /id: "fast", label: "快"[\s\S]*?id: "medium", label: "中"[\s\S]*?id: "slow", label: "慢"/,
  );
  assert.match(
    preview,
    /\["fast",\s*"快"\],\s*\["normal",\s*"中"\],\s*\["slow",\s*"慢"\]/,
  );
});
