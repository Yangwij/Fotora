"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const root = path.join(__dirname, "..");
const app = fs.readFileSync(path.join(root, "web", "app.js"), "utf8");
const source = app.slice(
  app.indexOf("function placeContextDetailCard("),
  app.indexOf("function clearContextDetailContentMotion("),
);
const placementFor = new Function(
  "CONTEXT_DETAIL_GAP",
  "CONTEXT_DETAIL_EDGE",
  `${source}\nreturn placeContextDetailCard;`,
)(20, 20);
const motionSource = app.slice(
  app.indexOf("function contextDetailCompanionScale("),
  app.indexOf("function hideContextCrop("),
);
const motionFor = new Function(
  "CONTEXT_DETAIL_GAP",
  `${motionSource}\nreturn {
    contextDetailCompanionScale,
    contextDetailPlacementSide,
    contextDetailCardStartPlacement
  };`,
)(20);

const rect = (left, top, width, height) => ({
  left,
  top,
  right: left + width,
  bottom: top + height,
  width,
  height,
});

test("详情卡横向定位同时受上下边界约束", () => {
  assert.match(source, /top: clampTop\(source\.top\)/);
  assert.doesNotMatch(app, /trackSourceTop/);

  const placement = placementFor(
    rect(120, 480, 360, 100),
    320,
    274,
    rect(0, 0, 1000, 600),
    rect(0, 0, 1000, 600),
    { preferredSide: "right" },
  );

  assert.equal(placement.side, "right");
  assert.ok(placement.top >= 20);
  assert.ok(placement.top + 274 <= 580);
});

test("顶部项目不会被详情卡带出内容区上沿", () => {
  const placement = placementFor(
    rect(100, -30, 180, 120),
    320,
    274,
    rect(0, 0, 1000, 600),
    rect(0, 0, 1000, 600),
    { preferredSide: "right" },
  );

  assert.equal(placement.side, "right");
  assert.ok(placement.top >= 20);
});

test("左右都放不下时详情卡改到上下侧并保持水平居中", () => {
  const placement = placementFor(
    rect(350, 230, 300, 140),
    360,
    220,
    rect(0, 0, 1000, 600),
    rect(0, 0, 1000, 600),
    { preferredSide: "right" },
  );

  assert.equal(placement.side, "");
  assert.ok(placement.left >= 20);
  assert.ok(placement.left + 360 <= 980);
  assert.ok(placement.top >= 20 && placement.top + 220 <= 580);
});

test("极窄内容区兜底仍不会越过左右边界", () => {
  const placement = placementFor(
    rect(40, 200, 120, 100),
    240,
    180,
    rect(0, 0, 300, 500),
    rect(0, 0, 300, 500),
    { preferredSide: "right" },
  );

  assert.ok(placement.left >= 20);
  assert.ok(placement.left + 240 <= 280);
});

test("信息卡使用照片的整体缩放比而不是按卡片宽度单独缩放", () => {
  const scale = motionFor.contextDetailCompanionScale(
    { width: 200, height: 200 },
    { width: 400, height: 600 },
  );

  assert.ok(Math.abs(scale - Math.sqrt((200 / 400) * (200 / 600))) < 1e-9);
  assert.ok(scale < 0.96);
});

test("信息卡展开时锁定同一侧并与照片保持固定间距", () => {
  const targetPhoto = rect(200, 100, 400, 500);
  const targetCard = { ...rect(620, 100, 320, 480), side: "right" };
  const side = motionFor.contextDetailPlacementSide(targetPhoto, targetCard);
  const scale = 0.4;
  const start = motionFor.contextDetailCardStartPlacement(
    rect(750, 400, 180, 180),
    targetPhoto,
    targetCard,
    side,
    scale,
  );

  assert.equal(side, "right");
  assert.equal(start.left, 950);
  assert.equal(start.left - (750 + 180), 20);
  assert.equal(start.top, 400);
  assert.equal(targetCard.left - (targetPhoto.left + targetPhoto.width), 20);
});

test("上下摆位也能在缩小时保持固定的垂直间距", () => {
  const targetPhoto = rect(300, 120, 360, 300);
  const targetCard = { ...rect(320, 440, 320, 180), side: "" };
  const side = motionFor.contextDetailPlacementSide(targetPhoto, targetCard);
  const scale = 0.5;
  const start = motionFor.contextDetailCardStartPlacement(
    rect(380, 360, 160, 140),
    targetPhoto,
    targetCard,
    side,
    scale,
  );

  assert.equal(side, "bottom");
  assert.equal(start.top - (360 + 140), 20);
  assert.equal(start.left + (targetCard.width * scale) / 2, 460);
});

test("窄窗口里卡片与照片重叠时仍锁定稳定的跟随侧", () => {
  const targetPhoto = rect(180, 120, 620, 360);
  const centeredCard = {
    ...rect(250, 190, 320, 280),
    side: "",
  };
  const side = motionFor.contextDetailPlacementSide(
    targetPhoto,
    centeredCard,
    "left",
  );
  const start = motionFor.contextDetailCardStartPlacement(
    rect(520, 560, 180, 180),
    targetPhoto,
    centeredCard,
    side,
    0.45,
  );

  assert.equal(side, "left");
  assert.equal(start.left, 520 - 20 - centeredCard.width * 0.45);
  assert.equal(start.top, 560 + (centeredCard.top - targetPhoto.top) * 0.45);
});

test("信息卡进入和退出复用照片的缓动与起始缩放", () => {
  assert.match(
    app,
    /const detailStartScale = contextDetailCompanionScale\(start, target\)/,
  );
  assert.match(
    app,
    /const menuStartScale = Number\.isFinite\(\s*Number\(contextMenuStartPlacement\?\.scale\),\s*\)\s*\?\s*Number\(contextMenuStartPlacement\.scale\)\s*:\s*contextMenuStartScale\(contextSourceStart\.width, menuBase\.width\)/,
  );
  assert.ok((app.match(/easing: CONTEXT_PREVIEW_EASING/g) || []).length >= 4);
  assert.equal(
    (
      app.match(
        /contextSourceAnim\.play\(\);\s*contextMenuAnim\?\.play\(\);/g,
      ) || []
    ).length,
    2,
  );
  assert.equal((app.match(/contextSourceAnim\.pause\(\);/g) || []).length, 2);
});
