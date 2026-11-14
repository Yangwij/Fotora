"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const root = path.resolve(__dirname, "..");
const app = fs.readFileSync(path.join(root, "web", "app.js"), "utf8");

test("设置页布局更新全局默认并清除当前视图临时覆盖", () => {
  assert.match(
    app,
    /function setDefaultPhotoStyle\(style, \{ persist = true \} = \{\}\)[\s\S]*photoLayoutMode =[\s\S]*state\.photoStyleOverrides\.clear\(\);[\s\S]*persistPersistentSettings\(\)/,
  );
  assert.match(
    app,
    /function applySettingsDraft\(\)[\s\S]*setDefaultPhotoStyle\([\s\S]*draft\.photoLayoutMode === "justified"[\s\S]*draft\.defaultOriginalRatio[\s\S]*\{ persist: false \}/,
  );
});

test("右上角布局菜单只覆盖当前图库或相簿且不写入全局设置", () => {
  const setter = app.slice(
    app.indexOf("function setCurrentPhotoStyle(style)"),
    app.indexOf("function currentPhotoStyle()"),
  );
  assert.match(setter, /const key = ratioViewKey\(\);/);
  assert.match(
    setter,
    /state\.photoStyleOverrides\.set\(key, nextStyle\);/,
  );
  assert.doesNotMatch(setter, /persistPersistentSettings\(/);
  assert.doesNotMatch(setter, /localStorage\.setItem/);
  assert.match(
    app,
    /function applyPhotoStyle\(style,[\s\S]*setCurrentPhotoStyle\(style\);/,
  );
});

test("导入后的新图库没有覆盖时读取全局默认布局", () => {
  assert.match(
    app,
    /function activePhotoStyle\(\)\s*\{\s*return \(\s*state\.photoStyleOverrides\.get\(ratioViewKey\(\)\) \|\| defaultPhotoStyle\(\)\s*\);/,
  );
  assert.match(
    app,
    /const ratioViewKey = \(\) =>\s*`\$\{state\.activeRootId == null \? "" : state\.activeRootId\}:\$\{state\.activeId\}`;/,
  );
});
