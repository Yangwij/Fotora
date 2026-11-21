"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const root = path.resolve(__dirname, "..");
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");

test("照片墙不提供时长预设，换向间隔默认一分钟且最多九分钟", () => {
  const app = read("web/app.js");
  const dialog = read("web/settings-dialog.js");
  const language = read("web/ui-language.js");

  assert.doesNotMatch(app, /id: "(?:1m|2m|5m|10m)"/);
  assert.match(app, /id: "timed", label: "自动换向", timed: true/);
  assert.match(app, /WALLPAPER_CRUISE_INTERVAL_MAX_MINUTES = 9;/);
  assert.match(app, /WALLPAPER_CRUISE_DEFAULT_INTERVAL_MINUTES = 1;/);
  assert.match(dialog, /key: "cruiseIntervalMinutes"/);
  assert.match(
    dialog,
    /label: "换向间隔"[\s\S]*?max: settingsMeta\.wallpaperCruiseIntervalMaxMinutes \|\| 9,[\s\S]*?unit: "分钟"/,
  );
  assert.match(language, /换向方式: "Cruise direction"/);
  assert.match(language, /换向间隔: "Direction interval"/);
  assert.match(language, /分钟: "min"/);
});

test("四种照片墙都接受最长九分钟的换向间隔", () => {
  const interlock = read("web/photo-wall/assets/InterlockWall-DJHsiduu.js");
  const folia = read("web/photo-wall/assets/PhotoWallFolia-3NPRz3QQ.js");
  const masonry = read("web/photo-wall/assets/PhotoWallMasonry-_qPngKll.js");
  const filmroll = read("web/photo-wall/assets/PhotoWallFilmroll-BfTKsO-t.js");

  assert.match(interlock, /t >= 10 && t <= 540/);
  assert.match(folia, /bf = 540/);
  assert.match(masonry, /Math\.min\(\s*540,\s*Number\(.+?\) \|\| 60/);
  assert.match(
    filmroll,
    /Number\(e\.wallpaperCruiseSeconds\) \|\| 60, 10, 540/,
  );
});
