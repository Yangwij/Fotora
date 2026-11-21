"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const root = path.resolve(__dirname, "..");
const css = fs.readFileSync(path.join(root, "web", "styles.css"), "utf8");

function rule(selector) {
  const escaped = selector
    .trim()
    .split(/\s+/)
    .map((part) => part.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
    .join("\\s*");
  const match = css.match(new RegExp(`${escaped}\\s*\\{([^}]*)\\}`));
  assert.ok(match, `missing rule: ${selector}`);
  return match[1];
}

test("照片滚到标题栏上沿时不会越过主区域", () => {
  assert.match(rule(".main"), /overflow:\s*hidden/);
  assert.match(
    rule("html.blur-titlebar:not(.transparent-titlebar) .main::before"),
    /height:\s*var\(--toolbar-offset-y\)/,
  );
  assert.match(
    rule(
      'html[data-window-controls="hidden"].blur-titlebar:not(.transparent-titlebar) .toolbar',
    ),
    /top:\s*calc\(var\(--toolbar-offset-y\) - 1px\)/,
  );
});
