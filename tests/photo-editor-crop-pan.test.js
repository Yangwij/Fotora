"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const root = path.join(__dirname, "..");
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");

test("裁剪框保持固定，照片可通过拖动和缩放改变实际裁剪区域", () => {
  const editor = read("web/photo-editor.js");
  const css = read("web/photo-editor.css");

  assert.match(
    editor,
    /function cropRecipeFromViewport\([\s\S]*?x: 0\.5 \+ \(frame\.x - 0\.5 - panX\) \/ safeZoom[\s\S]*?w: frame\.w \/ safeZoom/,
  );
  assert.match(
    editor,
    /if \(handle === "move"\) \{[\s\S]*?this\.editorPanX = drag\.panX \+ dx;[\s\S]*?this\.applyEditorZoom\(\);[\s\S]*?return;/,
  );
  assert.match(
    editor,
    /this\.canvas\.addEventListener\("pointerdown",[\s\S]*?this\.gestureStart = clone\(this\.recipe\);[\s\S]*?this\.editorPanDrag = \{/,
  );
  assert.doesNotMatch(
    editor,
    /event\.button !== 0 \|\|[\s\S]{0,120}?this\.activeMode === "crop"/,
  );
  assert.match(
    editor,
    /layoutCropOverlay\(\) \{[\s\S]*?const crop = this\.cropViewport;/,
  );
  assert.match(
    editor,
    /this\.cropOverlay\.style\.width = `\$\{shellWidth\}px`;[\s\S]*?this\.cropOverlay\.style\.height = `\$\{shellHeight\}px`;/,
  );
  assert.match(
    editor,
    /self|window\.PhotoEditor|syncCropRecipeFromView\(\) \{[\s\S]*?this\.recipe\.geometry\.crop = cropRecipeFromViewport/,
  );
  assert.match(css, /\.pe-crop-frame\s*\{[^}]*box-shadow:\s*none;/s);
  assert.match(
    css,
    /\.pe-crop-shade\s*\{[^}]*background:\s*rgba\(0, 0, 0, 0\.26\);/s,
  );
});
