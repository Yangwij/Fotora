"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const styles = fs.readFileSync(
  path.resolve(__dirname, "..", "web", "styles.css"),
  "utf8",
);

test("空相簿以蓝色操作按钮为内容区中心", () => {
  const rule = styles.match(/\.empty-state\.empty-album\s*\{([\s\S]*?)\}/);
  assert.ok(rule, "应存在空相簿布局规则");
  assert.match(rule[1], /position:\s*absolute;/);
  assert.match(rule[1], /inset:\s*0;/);
  assert.match(rule[1], /height:\s*auto;/);
  assert.match(
    rule[1],
    /grid-template-rows:\s*minmax\(0,\s*1fr\)\s*auto\s*minmax\(0,\s*1fr\);/,
  );
  assert.match(rule[1], /align-content:\s*stretch;/);
  assert.match(rule[1], /gap:\s*0;/);
  assert.match(rule[1], /text-align:\s*center;/);
  assert.doesNotMatch(rule[1], /transform:/);
  assert.doesNotMatch(rule[1], /left:|right:|margin-left:/);
  assert.match(
    styles,
    /\.empty-album-copy\s*\{[\s\S]*?grid-row:\s*1;[\s\S]*?align-self:\s*end;/,
  );
  assert.match(
    styles,
    /\.empty-state\.empty-album \.primary-btn\s*\{\s*grid-row:\s*2;\s*margin:\s*0;\s*justify-self:\s*center;/,
  );
});

test("纯图标文字空状态统一以中间文字行作为垂直中心", () => {
  const rule = styles.match(/\.empty-state\s*\{([\s\S]*?)\}/);
  assert.ok(rule, "应存在通用空状态布局规则");
  assert.match(rule[1], /position:\s*absolute;/);
  assert.match(rule[1], /inset:\s*0;/);
  assert.match(rule[1], /height:\s*auto;/);
  assert.match(
    rule[1],
    /grid-template-rows:\s*minmax\(0,\s*1fr\)\s*auto\s*minmax\(0,\s*1fr\);/,
  );
  assert.match(rule[1], /align-content:\s*stretch;/);
  assert.match(rule[1], /justify-items:\s*center;/);
  assert.match(
    styles,
    /\.empty-state > svg\s*\{\s*grid-row:\s*1;\s*align-self:\s*end;\s*margin-bottom:\s*12px;/,
  );
  assert.match(
    styles,
    /\.empty-state > p\s*\{\s*grid-row:\s*2;\s*align-self:\s*center;/,
  );
  assert.doesNotMatch(styles, /\.empty-state\.empty-all-albums\s*\{/);
  assert.doesNotMatch(styles, /\.empty-state\.empty-trash\s*\{/);
});

test("无图库欢迎页以整个窗口视口为坐标系双向居中", () => {
  const welcome = styles.match(/^\.empty-state\.welcome\s*\{([\s\S]*?)\}/m);
  assert.ok(welcome, "应存在欢迎页独立布局规则");
  assert.match(welcome[1], /position:\s*fixed;/);
  assert.match(welcome[1], /inset:\s*0;/);
  assert.match(welcome[1], /height:\s*auto;/);
  assert.match(welcome[1], /display:\s*flex;/);
  assert.match(welcome[1], /align-items:\s*center;/);
  assert.match(welcome[1], /justify-content:\s*center;/);
  assert.match(welcome[1], /gap:\s*0;/);
  assert.doesNotMatch(welcome[1], /grid-template-rows:/);

  assert.match(
    styles,
    /html\.no-root-directory \.empty-state\.welcome\s*\{[\s\S]*?position:\s*fixed;[\s\S]*?inset:\s*0;[\s\S]*?display:\s*flex;[\s\S]*?align-items:\s*center;[\s\S]*?justify-content:\s*center;[\s\S]*?transform:\s*none;/,
  );
  assert.match(
    styles,
    /\.welcome-pick-icon\s*\{[\s\S]*?width:\s*112px;[\s\S]*?height:\s*112px;[\s\S]*?place-items:\s*center;/,
  );
});
