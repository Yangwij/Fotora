"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const root = path.resolve(__dirname, "..");
const app = fs.readFileSync(path.join(root, "web", "app.js"), "utf8");
const dialog = fs.readFileSync(
  path.join(root, "web", "settings-dialog.js"),
  "utf8",
);
const main = fs.readFileSync(path.join(root, "electron", "main.js"), "utf8");

function section(source, start, end) {
  const from = source.indexOf(start);
  const to = source.indexOf(end, from);
  assert.ok(from >= 0, `missing block: ${start}`);
  assert.ok(to > from, `missing block end: ${end}`);
  return source.slice(from, to);
}

const keys = [
  ...new Set(
    [...dialog.matchAll(/(?:key|draftKey):\s*"([^"]+)"/g)].map(
      (match) => match[1],
    ),
  ),
];

test("设置页每个普通选项都接入草稿、应用、保存和启动恢复", () => {
  const blocks = {
    snapshot: section(
      app,
      "function snapshotSettingsDraft()",
      "function applySettingsDraft()",
    ),
    apply: section(
      app,
      "function applySettingsDraft()",
      "function openMenu(",
    ),
    save: section(
      app,
      "function persistentSettingsSnapshot()",
      "function applyPersistentSettings(",
    ),
    restore: section(
      app,
      "function applyPersistentSettings(",
      "async function hydratePersistentSettings()",
    ),
  };
  for (const key of keys) {
    for (const [name, block] of Object.entries(blocks)) {
      assert.ok(block.includes(key), `${key} is missing from ${name}`);
    }
  }
});

test("设置页的特殊分段选项也都接入应用与持久化", () => {
  const apply = section(
    app,
    "function applySettingsDraft()",
    "function openMenu(",
  );
  const save = section(
    app,
    "function persistentSettingsSnapshot()",
    "function applyPersistentSettings(",
  );
  const restore = section(
    app,
    "function applyPersistentSettings(",
    "async function hydratePersistentSettings()",
  );
  const specialFields = [
    "photoLayoutMode",
    "defaultOriginalRatio",
    "transparentTitlebar",
    "titlebarBlur",
    "showLocationSatellite",
  ];
  for (const field of specialFields) {
    assert.ok(apply.includes(field), `${field} is missing from apply`);
    assert.ok(save.includes(field), `${field} is missing from save`);
    assert.ok(restore.includes(field), `${field} is missing from restore`);
  }
});

test("设置页的布尔项由主进程持久化校验接收", () => {
  const booleanKeys = section(
    main,
    "const BOOLEAN_SETTING_KEYS = new Set([",
    "]);",
  );
  const toggleKeys = [
    ...new Set(
      [...dialog.matchAll(/type:\s*"toggle",\s*key:\s*"([^"]+)"/g)].map(
        (match) => match[1],
      ),
    ),
  ];
  for (const key of toggleKeys) {
    assert.ok(booleanKeys.includes(`"${key}"`), `${key} is not persisted`);
  }
});

test("全局布局设置即使与默认值相同也会清除当前视图覆盖", () => {
  assert.match(
    app,
    /function setDefaultPhotoStyle\(style,[\s\S]*const changed = nextStyle !== defaultPhotoStyle\(\);[\s\S]*const hasViewOverrides = state\.photoStyleOverrides\.size > 0;[\s\S]*if \(!changed && !hasViewOverrides\) return false;[\s\S]*state\.photoStyleOverrides\.clear\(\);/,
  );
});
