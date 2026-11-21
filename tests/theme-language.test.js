const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const root = path.join(__dirname, "..");
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");

test("界面语言只提供中文和英文，并联动对应界面字体", () => {
  const app = read("web/app.js");
  const settings = read("web/settings-dialog.js");
  const bridge = read("web/theme-bridge.js");
  const language = read("web/ui-language.js");
  const css = read("web/theme-palettes.css");

  assert.match(app, /id: "pingfang"[\s\S]*id: "anthropic"/);
  assert.doesNotMatch(app, /id: "source-serif"/);
  assert.doesNotMatch(app, /id: "system", label: "系统"/);
  assert.match(app, /next === "anthropic" \? "en" : "zh-CN"/);
  assert.match(
    settings,
    /label: "界面语言"[\s\S]*\["pingfang", "中文"\][\s\S]*\["anthropic", "English"\]/,
  );
  assert.match(bridge, /theme === "anthropic" \? "en" : "zh-CN"/);
  assert.match(css, /data-font-theme="pingfang"/);
  assert.match(css, /font-family: "Noto Sans SC", sans-serif/);
  assert.doesNotMatch(css, /"PingFang SC"/);
  assert.doesNotMatch(css, /"Anthropic Sans Web Text"/);
  assert.match(css, /data-font-theme="anthropic"/);
  assert.match(language, /图库:\s*"Library"/);
  assert.match(language, /设置:\s*"Settings"/);
  assert.match(language, /界面语言:\s*"Interface language"/);
  assert.match(language, /中文:\s*"中文"/);
  assert.match(language, /node\.data !== translated/);
  assert.match(language, /element\.getAttribute\(attribute\) !== translated/);
});

test("语言切换等待英文字体就绪，并热更新界面而不重渲染图库", () => {
  const app = read("web/app.js");
  const settings = read("web/settings-dialog.js");

  assert.match(settings, /function warmEnglishFont\(\)/);
  assert.match(settings, /\.load\(\s*['"]16px "Fotora Source Serif"['"]\s*\)/);
  assert.match(settings, /next === "anthropic"[\s\S]*?warmEnglishFont\(\)/);

  const fontThemeBlock = app.slice(
    app.indexOf("function setFontTheme("),
    app.indexOf("/* ------------------------------ 侧边栏"),
  );
  assert.match(fontThemeBlock, /syncToolbarForState\(\)/);
  assert.match(fontThemeBlock, /fotora:language-change/);
  assert.doesNotMatch(fontThemeBlock, /render\(\)/);
});
