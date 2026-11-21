"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const root = path.join(__dirname, "..");
const dialog = fs.readFileSync(
  path.join(root, "web", "settings-dialog.js"),
  "utf8",
);
const app = fs.readFileSync(path.join(root, "web", "app.js"), "utf8");

test("当前设置弹窗覆盖基础迁移选项", () => {
  for (const key of [
    "hideAllAlbumsCard",
    "mutePreviewLivePhoto",
    "filmstripPosition",
    "photoWallDefaultKind",
    "masonryWallCruiseDirection",
  ]) {
    assert.match(dialog, new RegExp(`key:\\s*"${key}"`), key);
  }
});

test("迁移后的分段选项包含运行时代码支持的全部值", () => {
  assert.match(
    dialog,
    /key: "filmstripPosition"[\s\S]*?\["top", "顶部"\][\s\S]*?\["bottom", "底部"\][\s\S]*?\["left", "左侧"\][\s\S]*?\["right", "右侧"\]/,
  );
  assert.match(
    dialog,
    /key: "photoWallDefaultKind"[\s\S]*?\["tile", "错落磁贴"\][\s\S]*?\["mosaic", "嵌合拼图"\][\s\S]*?\["masonry", "纵向画廊"\][\s\S]*?\["filmroll", "横向胶卷"\]/,
  );
  assert.match(
    dialog,
    /key: "masonryWallCruiseDirection"[\s\S]*?\["up", "向上"\][\s\S]*?\["down", "向下"\]/,
  );
});

test("换向间隔、方向和界面名称已经迁移到当前弹窗", () => {
  assert.match(app, /window\.FotoraSettingsMeta = Object\.freeze\(\{/);
  assert.match(app, /wallpaperCruiseOptions: WALLPAPER_CRUISE_OPTIONS/);
  assert.match(app, /interfaceNameFields: INTERFACE_NAME_FIELDS/);
  assert.match(
    dialog,
    /key: "cruiseChoiceIndex"[\s\S]*?options: cruiseOptions/,
  );
  assert.match(dialog, /type: "number"[\s\S]*?key: "cruiseIntervalMinutes"/);
  assert.match(
    dialog,
    /id: "names",[\s\S]*?label: "界面名称"[\s\S]*?rows: interfaceNameRows/,
  );
});

test("文本、数字和选择控件接入草稿编辑", () => {
  assert.match(
    dialog,
    /row\.type === "text"[\s\S]*?settingsDraft\.libraryTitle = next/,
  );
  assert.match(
    dialog,
    /row\.type === "number"[\s\S]*?Math\.min\(max, Math\.max\(min, Math\.round\(numeric\)\)\)/,
  );
  assert.match(
    dialog,
    /row\.type === "select"[\s\S]*?settingsDraft\[row\.key\] = Number\(value\)/,
  );
  assert.match(dialog, /data-ux-text="\$\{index\}"/);
  assert.match(dialog, /data-ux-number="\$\{index\}"/);
  assert.match(dialog, /data-ux-select="\$\{index\}"/);
  assert.match(
    dialog,
    /main\.addEventListener\("input"[\s\S]*?main\.addEventListener\("change"[\s\S]*?data-ux-select/,
  );
});
