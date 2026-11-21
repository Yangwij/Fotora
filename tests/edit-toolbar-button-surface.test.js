const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const css = fs.readFileSync(
  path.join(__dirname, "..", "web", "styles.css"),
  "utf8",
);

test("编辑模式的新建按钮与完成按钮使用同一层顶栏底色", () => {
  assert.match(
    css,
    /html\.transparent-titlebar \.library-time-modes,[\s\S]*?html\.transparent-titlebar #toolbarRightZone #createBtn\s*\{[\s\S]*?background:\s*color-mix\(in srgb, var\(--main-bg\) 28%, transparent\)/,
  );
  assert.match(
    css,
    /html\.blur-titlebar:not\(\.transparent-titlebar\) #createBtn\s*\{[\s\S]*?background:\s*var\(--toolbar-control-surface\)/,
  );
  assert.doesNotMatch(
    css,
    /html\.transparent-titlebar #toolbarRightZone \.icon-btn:not\(#moreTopBtn\)\s*\{/,
  );
});
