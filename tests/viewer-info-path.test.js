const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const css = fs.readFileSync(
  path.resolve(__dirname, "..", "web", "styles.css"),
  "utf8",
);

test("项目信息卡默认隐藏磁盘路径，悬停或键盘聚焦时才显示", () => {
  const hiddenRule = css.match(/\.viewer-info-path\s*\{([\s\S]*?)\}/);
  assert.ok(hiddenRule, "应存在磁盘路径样式规则");
  assert.match(hiddenRule[1], /opacity:\s*0;/);
  assert.match(hiddenRule[1], /visibility:\s*hidden;/);
  assert.match(hiddenRule[1], /pointer-events:\s*none;/);
  assert.doesNotMatch(hiddenRule[1], /max-height:\s*0;/);
  assert.match(hiddenRule[1], /line-height:\s*15px;/);

  assert.match(
    css,
    /\.viewer-info-file:hover \.viewer-info-path,[\s\S]*\.viewer-info-file:focus-within \.viewer-info-path,[\s\S]*\.viewer-info-path:focus-visible\s*\{[\s\S]*visibility:\s*visible;[\s\S]*pointer-events:\s*auto;/,
  );
  const revealStart = css.indexOf(".viewer-info-file:hover .viewer-info-path");
  const revealEnd = css.indexOf("}", revealStart);
  assert.ok(revealStart >= 0 && revealEnd > revealStart);
  const revealRule = css.slice(revealStart, revealEnd + 1);
  assert.doesNotMatch(revealRule, /max-height:/);
  assert.doesNotMatch(revealRule, /transform:/);
});

test("磁盘路径隐藏时不会误触资源管理器定位", () => {
  assert.match(
    css,
    /\.viewer-info-path\.is-empty\s*\{\s*pointer-events:\s*none;/,
  );
});
