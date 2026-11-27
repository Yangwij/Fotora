"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const fsp = require("node:fs/promises");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");
const sharp = require("sharp");
const { renderImage } = require("../server/edits");

const root = path.resolve(__dirname, "..");
const editor = fs.readFileSync(
  path.join(root, "web", "photo-editor.js"),
  "utf8",
);
const css = fs.readFileSync(path.join(root, "web", "photo-editor.css"), "utf8");
const language = fs.readFileSync(
  path.join(root, "web", "ui-language.js"),
  "utf8",
);

function geometryHelpers() {
  const start = editor.indexOf("function normalizedQuarterTurns(");
  const end = editor.indexOf("function hasTransformGeometry(");
  assert.ok(start >= 0 && end > start, "geometry helpers should exist");
  const source = editor.slice(start, end);
  const clampSource = `
    const clamp = (value, min, max, fallback = 0) => {
      const number = Number(value);
      if (!Number.isFinite(number)) return fallback;
      return Math.min(max, Math.max(min, number));
    };
  `;
  return new Function(
    `${clampSource}\n${source}\nreturn { normalizedQuarterTurns, geometryOutputAspect, createGeometryMapper };`,
  )();
}

function mappedPoint(mapper, u, v) {
  const point = { u: 0, v: 0 };
  const inside = mapper(u, v, point);
  return { inside, ...point };
}

test("几何预览与后端保持 90° 方向、镜像和输出比例", () => {
  const { normalizedQuarterTurns, geometryOutputAspect, createGeometryMapper } =
    geometryHelpers();
  const sourceAspect = 4 / 3;
  assert.equal(normalizedQuarterTurns(-1), 3);
  assert.ok(
    Math.abs(
      geometryOutputAspect({ quarterTurns: 0, angle: 0 }, sourceAspect) -
        sourceAspect,
    ) < 1e-9,
  );
  assert.ok(
    Math.abs(
      geometryOutputAspect({ quarterTurns: 1, angle: 0 }, sourceAspect) - 3 / 4,
    ) < 1e-9,
  );
  assert.ok(
    Math.abs(
      geometryOutputAspect({ quarterTurns: 0, angle: 45 }, sourceAspect) - 1,
    ) < 1e-9,
  );

  const identity = mappedPoint(
    createGeometryMapper({}, sourceAspect),
    0.25,
    0.3,
  );
  assert.equal(identity.inside, true);
  assert.ok(Math.abs(identity.u - 0.25) < 1e-9);
  assert.ok(Math.abs(identity.v - 0.3) < 1e-9);

  const turned = mappedPoint(
    createGeometryMapper({ quarterTurns: 1 }, sourceAspect),
    0.25,
    0.3,
  );
  assert.ok(Math.abs(turned.u - 0.7) < 1e-9);
  assert.ok(Math.abs(turned.v - 0.25) < 1e-9);

  const mirrored = mappedPoint(
    createGeometryMapper({ mirrorX: true }, sourceAspect),
    0.25,
    0.3,
  );
  assert.ok(Math.abs(mirrored.u - 0.75) < 1e-9);
  assert.ok(Math.abs(mirrored.v - 0.3) < 1e-9);
});

test("编辑器配方保留旋转、镜像、拉直和透视字段", () => {
  for (const field of [
    "quarterTurns",
    "mirrorX",
    "angle",
    "perspectiveH",
    "perspectiveV",
  ]) {
    assert.match(
      editor,
      new RegExp(`result\\.geometry\\.${field}\\s*=`),
      `${field} should survive recipe normalization`,
    );
  }
  assert.match(editor, /function createGeometryMapper\(/);
  assert.match(editor, /if \(mapGeometry\(u, v, mapped\)\)/);
  assert.match(editor, /const displayAspect = geometryOutputAspect\(/);
});

test("裁剪与几何拥有清晰模式切换和独立工具栏", () => {
  assert.match(
    editor,
    /class="pe-mode-switch" role="tablist" aria-label="编辑工具"/,
  );
  assert.match(editor, /data-pe-mode="crop"[\s\S]*?裁剪/);
  assert.match(editor, /data-pe-mode="geometry"[\s\S]*?几何/);
  assert.match(editor, /data-pe-rotate="-1"[\s\S]*?data-pe-rotate="1"/);
  assert.match(editor, /data-pe-mirror/);
  assert.match(editor, /data-pe-angle type="range"/);
  assert.match(editor, /data-pe-reset-geometry/);
  assert.match(css, /\.pe-mode-switch button\[aria-selected="true"\]/);
  assert.match(
    css,
    /\.pe-geometry-toolbar \{[\s\S]*?max-width: calc\(100% - 24px\)/,
  );
  assert.match(
    css,
    /\.pe-geometry-button\[data-pe-rotate="-1"\] svg \{\s*transform: scaleX\(-1\);/,
  );
  assert.match(language, /拉直: "Straighten"/);
  assert.match(language, /水平镜像: "Flip horizontally"/);
});

test("几何模式不劫持裁剪缩放，并继续支持撤销重做", () => {
  assert.match(
    editor,
    /this\.cropOverlay\.hidden = this\.activeMode !== "crop";\s*if \(this\.activeMode === "crop"\) this\.layoutCropOverlay\(\);/,
  );
  assert.match(
    editor,
    /this\.activeMode !== "crop"[\s\S]*?!event\.target\.closest\("\[data-pe-image-shell\]"\)/,
  );
  assert.match(
    editor,
    /this\.activeMode !== "crop"[\s\S]*?event\.button !== 0/,
  );
  assert.match(
    editor,
    /rotateQuarterTurn\(delta\)[\s\S]*?this\.mutate\([\s\S]*?geometry\.quarterTurns - delta/,
  );
  assert.match(editor, /toggleMirror\(\)[\s\S]*?this\.mutate\(/);
  assert.match(
    editor,
    /angleInput\.addEventListener\("change"[\s\S]*?this\.recordGesture\(\)/,
  );
});

test("保存管线按 CCW 步数、镜像和拉直生成真实输出", async () => {
  const temporary = await fsp.mkdtemp(
    path.join(os.tmpdir(), "fotora-geometry-"),
  );
  const input = path.join(temporary, "source.png");
  const rotated = path.join(temporary, "rotated.png");
  const mirrored = path.join(temporary, "mirrored.png");
  try {
    await sharp(
      Buffer.from(
        '<svg width="240" height="120" xmlns="http://www.w3.org/2000/svg"><rect width="120" height="120" fill="#ff0000"/><rect x="120" width="120" height="120" fill="#0000ff"/></svg>',
      ),
    )
      .png()
      .toFile(input);

    await renderImage(input, rotated, {
      geometry: { quarterTurns: 1, mirrorX: false, angle: 0 },
    });
    const rotatedMeta = await sharp(rotated).metadata();
    const rotatedRaw = await sharp(rotated)
      .raw()
      .toBuffer({ resolveWithObject: true });
    assert.equal(rotatedMeta.width, 120);
    assert.equal(rotatedMeta.height, 240);
    const top = (10 * rotatedRaw.info.width + 60) * rotatedRaw.info.channels;
    const bottom =
      (230 * rotatedRaw.info.width + 60) * rotatedRaw.info.channels;
    assert.ok(rotatedRaw.data[top] < 60);
    assert.ok(rotatedRaw.data[top + 2] > 200);
    assert.ok(rotatedRaw.data[bottom] > 200);
    assert.ok(rotatedRaw.data[bottom + 2] < 60);

    await renderImage(input, mirrored, {
      geometry: {
        mirrorX: true,
        angle: 12,
        perspectiveH: 0.15,
        perspectiveV: -0.1,
      },
    });
    const mirroredMeta = await sharp(mirrored).metadata();
    assert.ok(mirroredMeta.width > 240);
    assert.ok(mirroredMeta.height > 120);
  } finally {
    await fsp.rm(temporary, { recursive: true, force: true });
  }
});
