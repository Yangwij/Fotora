"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const root = path.resolve(__dirname, "..");
const app = fs.readFileSync(path.join(root, "web", "app.js"), "utf8");

test("原始比例保留固定方格槽位并在槽位内保持照片自身比例", () => {
  assert.match(
    app,
    /function effectivePhotoLayoutMode\(\)\s*\{\s*const style = activePhotoStyle\(\);[\s\S]*style === "original" \|\| style === "square"[\s\S]*"tile"[\s\S]*: style;/,
  );
  assert.match(
    app,
    /function syncPhotoGridLayoutClasses\(\)\s*\{\s*const effectiveMode = effectivePhotoLayoutMode\(\);/,
  );
  assert.match(
    app,
    /const effectiveMode = effectivePhotoLayoutMode\(\);[\s\S]*effectiveMode === "tile"[\s\S]*effectiveMode === "justified"/,
  );
  assert.match(
    app,
    /if \(effectivePhotoLayoutMode\(\) !== "tile"\) applyPhotoGridLayouts\(\);/,
  );
});
