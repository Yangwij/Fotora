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

test("所有相簿为空时，提示和图标在内容区上下居中", () => {
  const rule = styles.match(/\.empty-state\.empty-all-albums\s*\{([\s\S]*?)\}/);
  assert.ok(rule, "应存在所有相簿空状态布局规则");
  assert.match(rule[1], /position:\s*absolute;/);
  assert.match(rule[1], /inset:\s*0;/);
  assert.match(rule[1], /height:\s*auto;/);
  assert.match(
    rule[1],
    /grid-template-rows:\s*minmax\(0,\s*1fr\)\s*auto\s*minmax\(0,\s*1fr\);/,
  );
  assert.match(rule[1], /align-content:\s*stretch;/);
  assert.match(
    styles,
    /\.empty-state\.empty-all-albums svg\s*\{\s*grid-row:\s*1;\s*align-self:\s*end;/,
  );
  assert.match(
    styles,
    /\.empty-state\.empty-all-albums p\s*\{\s*grid-row:\s*2;\s*align-self:\s*center;/,
  );
});
