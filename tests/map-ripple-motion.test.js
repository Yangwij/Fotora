"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const root = path.join(__dirname, "..");
const css = fs.readFileSync(
  path.join(root, "web", "map", "globe-map.css"),
  "utf8",
);

test("照片定位反馈由两圈先后扩散的水波组成", () => {
  assert.match(css, /\.pm-ping::before,[\s\S]*?\.pm-ping::after/);
  assert.match(
    css,
    /\.pm-ping\.on::before \{\s*animation: pmPingWave 300ms cubic-bezier\(0\.23, 1, 0\.32, 1\)/,
  );
  assert.match(
    css,
    /\.pm-ping\.on::after \{\s*animation: pmPingWave 300ms cubic-bezier\(0\.23, 1, 0\.32, 1\) 140ms/,
  );
  assert.match(css, /border: 1\.5px solid rgba\(0, 86, 214, 0\.96\)/);
  assert.match(css, /transform: scale\(1\.5\)/);
  assert.match(
    css,
    /prefers-reduced-motion: reduce[\s\S]*?\.pm-ping\.on::before \{\s*animation: pmPingReduced 180ms ease-out/,
  );
  assert.match(css, /\.pm-ping\.on::after \{\s*animation: none;/);
});
