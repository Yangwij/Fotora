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
      'html[data-window-controls="hidden"]:not(.hide-glass-border).blur-titlebar:not(.transparent-titlebar) .toolbar',
    ),
    /top:\s*calc\(var\(--toolbar-offset-y\) - 1px\)/,
  );
});

test("隐藏窗口控件且关闭玻璃边框时顶部不留内缩", () => {
  /* 顶部内缩必须跟随上半部玻璃边，而不是写死 6px；
     否则隐藏控件 + 关边框时标题栏仍会下移并在顶边留下残边。 */
  assert.match(rule(":root"), /--toolbar-offset-y:\s*var\(--app-frame-top\)/);
  assert.match(rule("html.hide-glass-border"), /--app-frame-top:\s*0px/);
  assert.match(
    rule("html.hide-glass-border"),
    /--window-frame-y:\s*var\(--window-controls-band\)/,
  );
});
