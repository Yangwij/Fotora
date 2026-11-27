"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const root = path.resolve(__dirname, "..");
const app = fs.readFileSync(path.join(root, "web", "app.js"), "utf8");
const css = fs.readFileSync(path.join(root, "web", "styles.css"), "utf8");
const editorCss = fs.readFileSync(
  path.join(root, "web", "photo-editor.css"),
  "utf8",
);

function functionSource(name, nextName) {
  const start = app.indexOf(`function ${name}(`);
  const end = app.indexOf(`function ${nextName}(`, start);
  assert.ok(start >= 0, `${name} should exist`);
  assert.ok(end > start, `${nextName} should follow ${name}`);
  return app.slice(start, end);
}

test("查看器计数在胶片栏出现时移到照片栏上方", () => {
  assert.match(
    css,
    /\.viewer:has\(#viewerFilmstrip:not\(\[hidden\]\)\) \.viewer-meta \{\s*bottom: 84px;/,
  );
});

test("查看器平移限制在画面范围内，边界外使用阻尼", () => {
  const rubberBand = functionSource(
    "rubberBandViewerPan",
    "clampViewerPanToBounds",
  );
  const createRubberBand = new Function(
    `${rubberBand}\nreturn rubberBandViewerPan;`,
  );
  const rubberBandViewerPan = createRubberBand();

  assert.equal(rubberBandViewerPan(80, 100), 80);
  assert.equal(rubberBandViewerPan(120, 100), 104.4);
  assert.equal(rubberBandViewerPan(-120, 100), -104.4);
  assert.equal(rubberBandViewerPan(24, 0), 5.28);

  const limits = functionSource("viewerPanLimits", "rubberBandViewerPan");
  assert.match(limits, /viewerRotationFit\(surface\)/);
  assert.match(limits, /Math\.abs\(viewerRotation % 180\) === 90/);
  assert.match(limits, /Math\.max\(0, \(width - stageRect\.width\) \/ 2\)/);
});

test("拖动释放和缩放变化都会收敛到平移边界", () => {
  const pointerMove = app.slice(
    app.indexOf('$("#viewerStage").addEventListener("pointermove"'),
    app.indexOf("function endViewerDrag("),
  );
  const endDrag = app.slice(
    app.indexOf("function endViewerDrag("),
    app.indexOf(
      '$("#viewerStage").addEventListener("pointerup"',
      app.indexOf("function endViewerDrag("),
    ),
  );
  const setZoom = functionSource("setViewerZoom", "rotateViewer");

  assert.match(
    pointerMove,
    /rubberBandViewerPan\(drag\.panX \+ dx, limits\.x\)/,
  );
  assert.match(
    pointerMove,
    /rubberBandViewerPan\(drag\.panY \+ dy, limits\.y\)/,
  );
  assert.match(endDrag, /clampViewerPanToBounds\(drag\.surface\)/);
  assert.match(endDrag, /applyViewerZoom\(\)/);
  assert.match(setZoom, /clampViewerPanToBounds\(\)/);
});

test("编辑器工作区不再声明未使用的布局属性过渡", () => {
  assert.doesNotMatch(
    editorCss,
    /\.pe-workspace\s*\{[\s\S]*?transition:\s*padding-bottom/,
  );
});
