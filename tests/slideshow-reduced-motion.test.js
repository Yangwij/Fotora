"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const root = path.resolve(__dirname, "..");
const slideshow = fs.readFileSync(
  path.join(root, "web", "slideshow.js"),
  "utf8",
);

test("幻灯片结束卡在减少动态下只淡入", () => {
  const reveal = slideshow.slice(
    slideshow.indexOf("function revealEndCard("),
    slideshow.indexOf("function showEnd("),
  );

  assert.match(
    reveal,
    /reducedMotion\s*\? \[\{ opacity: 0 \}, \{ opacity: 1 \}\]\s*: \[/,
  );
  assert.match(reveal, /duration: reducedMotion \? 120 : 420/);
  assert.match(
    slideshow,
    /const duration = isReducedMotion\(\) \? REDUCED_TRANSITION_MS : TRANSITION_MS;/,
  );
  assert.match(
    slideshow,
    /incoming: \[\{ opacity: 0 \}, \{ opacity: 1 \}\],\s*outgoing: \[\s*\{ opacity: 1, offset: 0 \}/,
  );
});
