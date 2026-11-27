"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const root = path.join(__dirname, "..");
const app = fs.readFileSync(path.join(root, "web", "app.js"), "utf8");

test("所有相簿与照片墙恢复初始弹簧错落入场并保留末帧", () => {
  const reveal = app.slice(
    app.indexOf("function revealAlbumCards("),
    app.indexOf("const CONTENT_REVEAL_PENDING_CLASS"),
  );
  const photoWallSwitch = app.slice(
    app.indexOf("function setWallLibraryKind("),
    app.indexOf("function cancelActiveWallAlbumSelection("),
  );

  assert.match(app, /class="album-card photo-wall-library-card/);
  assert.match(photoWallSwitch, /revealAlbumCards\(\)/);
  assert.match(app, /const ALBUM_CARD_REVEAL_MS = 583;/);
  assert.match(app, /const ALBUM_CARD_OPACITY_MS = 240;/);
  assert.match(app, /const ALBUM_CARD_STAGGER_MS = 30;/);
  assert.match(app, /const ALBUM_CARD_MAX_DELAY_MS = 340;/);
  assert.match(app, /const ALBUM_CARD_ENTRANCE_LIFT = 68;/);
  assert.match(reveal, /photoEntranceSpringFrames\(ALBUM_CARD_REVEAL_MS\)/);
  assert.match(reveal, /card\.animate\(\[\{ opacity: 0 \}, \{ opacity: 1 \}\]/);
  assert.match(reveal, /duration: ALBUM_CARD_OPACITY_MS/);
  assert.match(reveal, /easing: "linear"/);
  assert.match(reveal, /albumCardRevealAnims\.push\(opacity, motion\);/);
  assert.doesNotMatch(reveal, /motion\.cancel\(\);/);
  assert.match(
    reveal,
    /cancelAlbumCardReveal\(\) 会在替换内容前统一清理这些动画。/,
  );
});
