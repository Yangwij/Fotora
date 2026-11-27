"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const fsp = require("node:fs/promises");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");

const { createThumbScheduler } = require("../server/thumb-scheduler");

const repoRoot = path.resolve(__dirname, "..");
const appSource = fs.readFileSync(path.join(repoRoot, "web", "app.js"), "utf8");
const indexSource = fs.readFileSync(
  path.join(repoRoot, "server", "index.js"),
  "utf8",
);

/* ------------------------------ 调度器 ------------------------------ */

/**
 * 造一个「手动放行」的调度器测试台：任务开工时记一笔，等测试点名才结束。
 * 这样才能确定地断言「谁先开工」，而不是靠 sleep 猜。
 */
function createHarness(options) {
  const scheduler = createThumbScheduler(options);
  const started = [];
  const gates = new Map();

  function task(name) {
    return () => {
      started.push(name);
      let release;
      const gate = new Promise((resolve) => {
        release = resolve;
      });
      gates.set(name, release);
      return gate.then(() => name);
    };
  }

  function submit(name, extra = {}) {
    return scheduler.submit({ key: name, task: task(name), ...extra });
  }

  async function waitForStart(name, timeoutMs = 2000) {
    const deadline = Date.now() + timeoutMs;
    while (!started.includes(name)) {
      assert.ok(
        Date.now() < deadline,
        `任务 ${name} 一直没有开工（已开工：${started.join(", ") || "无"}）`,
      );
      await new Promise((resolve) => setTimeout(resolve, 5));
    }
  }

  async function waitFor(predicate, label, timeoutMs = 2000) {
    const deadline = Date.now() + timeoutMs;
    while (!predicate()) {
      assert.ok(Date.now() < deadline, `${label} 一直没有成立`);
      await new Promise((resolve) => setTimeout(resolve, 5));
    }
  }

  function release(name) {
    const gate = gates.get(name);
    assert.ok(gate, `任务 ${name} 还没开工，放行不了`);
    gate(name);
  }

  return { scheduler, started, submit, waitForStart, waitFor, release };
}

test("可见区任务永远排在后台预热前面", async () => {
  const harness = createHarness({
    totalSlots: 2,
    backgroundBusySlots: 1,
    backgroundIdleSlots: 1,
  });

  const blockerA = harness.submit("blocker-a");
  const blockerB = harness.submit("blocker-b");
  await harness.waitForStart("blocker-b");

  /* 名额占满，后面这些都只能排队。后台先提交，前台后提交。 */
  const background = ["bg-1", "bg-2", "bg-3"].map((key) =>
    harness.submit(key, { lane: "background" }),
  );
  const foreground = harness.submit("fg-1");
  assert.deepEqual(harness.started, ["blocker-a", "blocker-b"]);

  harness.release("blocker-a");
  await blockerA;
  /* 空出来的名额给后提交的前台任务，而不是先提交的后台预热。 */
  await harness.waitForStart("fg-1");
  assert.deepEqual(harness.started, ["blocker-a", "blocker-b", "fg-1"]);

  harness.release("fg-1");
  await foreground;
  harness.release("blocker-b");
  await blockerB;

  /* 前台清空之后，后台预热按提交顺序一个个跑（空闲名额只有 1 份）。 */
  for (const key of ["bg-1", "bg-2", "bg-3"]) {
    await harness.waitForStart(key);
    harness.release(key);
  }
  await Promise.all(background);
  assert.deepEqual(harness.started.slice(3), ["bg-1", "bg-2", "bg-3"]);
});

test("有前台任务时后台只占一个名额，空闲时才放开", async () => {
  const harness = createHarness({
    totalSlots: 4,
    backgroundBusySlots: 1,
    backgroundIdleSlots: 3,
  });

  const blocker = harness.submit("blocker");
  await harness.waitForStart("blocker");
  const background = ["bg-1", "bg-2", "bg-3", "bg-4"].map((key) =>
    harness.submit(key, { lane: "background" }),
  );

  await harness.waitFor(
    () => harness.scheduler.stats().runningBackgroundUnits === 1,
    "后台名额没有收敛到 1",
  );
  await new Promise((resolve) => setTimeout(resolve, 40));
  assert.equal(harness.scheduler.stats().runningBackgroundUnits, 1);
  assert.equal(harness.scheduler.stats().running, 2);

  harness.release("blocker");
  await blocker;
  await harness.waitFor(
    () => harness.scheduler.stats().runningBackgroundUnits === 3,
    "空闲时后台名额没有放开到 3",
  );

  for (const key of ["bg-1", "bg-2", "bg-3", "bg-4"]) {
    await harness.waitForStart(key);
    harness.release(key);
  }
  await Promise.all(background);
  assert.equal(harness.scheduler.stats().running, 0);
});

test("队首的大视频不会把后面的小照片堵住", async () => {
  const harness = createHarness({
    totalSlots: 2,
    backgroundBusySlots: 1,
    backgroundIdleSlots: 1,
  });

  const blockerA = harness.submit("blocker-a");
  const blockerB = harness.submit("blocker-b");
  await harness.waitForStart("blocker-b");

  /* 只剩 1 份名额时，权重 3 的视频塞不下，权重 1 的照片应该先走。 */
  const heavy = harness.submit("video-heavy", { weight: 3 });
  const light = harness.submit("photo-light", { weight: 1 });
  harness.release("blocker-a");
  await blockerA;

  await harness.waitForStart("photo-light");
  assert.ok(!harness.started.includes("video-heavy"));

  harness.release("photo-light");
  await light;
  harness.release("blocker-b");
  await blockerB;
  await harness.waitForStart("video-heavy");
  harness.release("video-heavy");
  await heavy;
});

test("后台预热里的重任务不会因为名额太小被饿死", async () => {
  /* 双核机器上 totalSlots 只有 2，视频权重 3：预热它时得让它独占一次跑完，
     否则视频封面永远出不来。 */
  const harness = createHarness({
    totalSlots: 2,
    backgroundBusySlots: 1,
    backgroundIdleSlots: 1,
  });

  const solo = harness.submit("video-warm", { lane: "background", weight: 3 });
  await harness.waitForStart("video-warm");
  harness.release("video-warm");
  assert.equal(await solo, "video-warm");

  /* 前台在跑的时候，重任务继续让路给后面的轻任务。 */
  const blocker = harness.submit("blocker");
  await harness.waitForStart("blocker");
  const heavy = harness.submit("video-warm-2", {
    lane: "background",
    weight: 3,
  });
  const light = harness.submit("photo-warm", {
    lane: "background",
    weight: 1,
  });

  await harness.waitForStart("photo-warm");
  assert.ok(!harness.started.includes("video-warm-2"));

  harness.release("blocker");
  await blocker;
  harness.release("photo-warm");
  await light;

  /* 池子空了，重任务这才独占一次开工。 */
  await harness.waitForStart("video-warm-2");
  harness.release("video-warm-2");
  assert.equal(await heavy, "video-warm-2");
  assert.equal(harness.scheduler.stats().running, 0);
});

test("批次作废时只丢掉还没开工的预热任务", async () => {
  const harness = createHarness({
    totalSlots: 1,
    backgroundBusySlots: 1,
    backgroundIdleSlots: 1,
  });
  const controller = new AbortController();

  const running = harness.submit("bg-running", {
    lane: "background",
    signal: controller.signal,
  });
  await harness.waitForStart("bg-running");
  const queued = ["bg-1", "bg-2"].map((key) =>
    harness.submit(key, { lane: "background", signal: controller.signal }),
  );

  controller.abort();
  const settled = await Promise.allSettled(queued);
  for (const result of settled) {
    assert.equal(result.status, "rejected");
    assert.equal(result.reason.code, "THUMB_JOB_ABORTED");
  }

  /* 已经开工的那张让它跑完：结果落盘就是缓存，取消等于白扔一次 CPU。 */
  harness.release("bg-running");
  assert.equal(await running, "bg-running");
  assert.equal(harness.scheduler.stats().cancelled, 2);
  assert.equal(harness.scheduler.stats().running, 0);
});

test("滚到正在预热的照片时，它会被提到前台队首并且不再跟着批次取消", async () => {
  const harness = createHarness({
    totalSlots: 1,
    backgroundBusySlots: 1,
    backgroundIdleSlots: 1,
  });
  const controller = new AbortController();

  const blocker = harness.submit("blocker");
  await harness.waitForStart("blocker");
  const warmed = harness.submit("bg-warm", {
    lane: "background",
    signal: controller.signal,
  });
  harness.submit("bg-next", { lane: "background", signal: controller.signal });
  const foreground = harness.submit("fg-1");

  /* 用户滚到了 bg-warm 这一格：前台请求撞上还在排队的预热任务。 */
  const promoted = harness.submit("bg-warm");
  assert.equal(harness.scheduler.stats().queuedInteractive, 2);
  assert.equal(harness.scheduler.stats().queuedBackground, 1);

  controller.abort();
  /* 提上来的那张脱离了批次的取消信号，仍然会正常出图。 */
  harness.release("blocker");
  await blocker;
  await harness.waitForStart("bg-warm");
  harness.release("bg-warm");
  assert.equal(await warmed, "bg-warm");
  assert.equal(await promoted, "bg-warm");

  await harness.waitForStart("fg-1");
  harness.release("fg-1");
  await foreground;
  assert.deepEqual(harness.started, ["blocker", "bg-warm", "fg-1"]);
  assert.equal(harness.scheduler.stats().cancelled, 1);
});

test("同一个 key 只排一次队", async () => {
  const harness = createHarness({ totalSlots: 1 });
  const blocker = harness.submit("blocker");
  await harness.waitForStart("blocker");

  const first = harness.submit("dup");
  const second = harness.submit("dup");
  assert.equal(first, second);
  assert.equal(harness.scheduler.stats().queuedInteractive, 1);

  harness.release("blocker");
  await blocker;
  harness.release("dup");
  assert.equal(await first, "dup");
});

test("默认名额配置：后台再闲也留一份给突然滚回来的可见区", () => {
  /* 四核机器上 totalSlots=3：以前空闲时后台只放 1 份，导入完一整库照片
     往下滑一路都是灰骨架；现在放开到 2 份，但仍然留 1 份给前台。 */
  for (const totalSlots of [2, 3, 4, 5]) {
    const st = createThumbScheduler({ totalSlots }).stats();
    assert.equal(st.busyBackgroundSlots, 1);
    assert.ok(
      st.idleBackgroundSlots >= 1,
      `${totalSlots} 份名额时后台至少要能跑 1 份`,
    );
    assert.ok(
      st.idleBackgroundSlots <= totalSlots - 1,
      `${totalSlots} 份名额时后台占了 ${st.idleBackgroundSlots} 份，没给前台留位置`,
    );
  }
});

/* ------------------------------ 服务端接口 ------------------------------ */

const dataDir = path.join(
  os.tmpdir(),
  `fotora-thumb-prefetch-${process.pid}-${Date.now()}`,
);
const libraryDir = path.join(dataDir, "library");
process.env.PHOTO_DATA = path.join(dataDir, "data");
process.env.PHOTO_DB = path.join(dataDir, "library.db");

const sharp = require("sharp");
const lib = require("../server/library");
const serverApi = require("../server/index");
const thumbs = require("../server/thumbs");

test("预热接口在后台生成缩略图，随后可见区请求直接命中缓存", async (t) => {
  await fsp.mkdir(libraryDir, { recursive: true });
  for (const [index, color] of [
    [1, { r: 220, g: 120, b: 80 }],
    [2, { r: 60, g: 140, b: 200 }],
  ]) {
    await sharp({
      create: { width: 8, height: 6, channels: 3, background: color },
    })
      .jpeg()
      .toFile(path.join(libraryDir, `sample-${index}.jpg`));
  }

  const root = lib.addRoot(libraryDir);
  await lib.scanRoot(root.id);
  const items = lib.getLibraryItems(root.id);
  assert.equal(items.length, 2);

  const album = lib.createRootAlbum(root.id, "预热测试");
  await lib.addItemsToAlbum(
    items.map((item) => item.id),
    album.id,
  );
  const targetAlbum = lib.createRootAlbum(root.id, "移动目标");

  const running = await serverApi.start({ port: 0 });
  t.after(async () => {
    await serverApi.stop();
    lib.closeDatabase();
    await fsp.rm(dataDir, { recursive: true, force: true });
  });
  const address = `http://127.0.0.1:${running.port}`;

  /* 先做一次能撤销的移动，用来验证预热请求不会把「撤销」清掉。 */
  const moveResponse = await fetch(`${address}/api/items/move`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      ids: [items[0].id],
      albumId: targetAlbum.id,
      sourceAlbumId: album.id,
    }),
  });
  assert.equal(moveResponse.status, 200);
  const undoBefore = await (await fetch(`${address}/api/undo`)).json();
  assert.equal(undoBefore.count, 1);

  const prefetch = await fetch(`${address}/api/thumbs/prefetch`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      ids: items.map((item) => item.id),
      size: 400,
      fit: "inside",
    }),
  });
  assert.equal(prefetch.status, 200);
  const summary = await prefetch.json();
  assert.equal(summary.requested, 2);
  assert.equal(summary.warmed, 2);
  assert.equal(summary.cancelled, 0);

  /* 缓存文件确实落在网格要用的那个尺寸和裁剪方式上。 */
  for (const item of items) {
    const cached = path.join(thumbs.THUMB_DIR, "400", `${item.id}-fit.webp`);
    assert.ok(fs.existsSync(cached), `缺少预热结果 ${cached}`);
    assert.ok(fs.statSync(cached).size > 0);
  }

  /* 撤销栈没有被预热请求清掉。 */
  const undoAfter = await (await fetch(`${address}/api/undo`)).json();
  assert.equal(undoAfter.count, 1);

  /* 预热过之后，可见区那次 GET 直接读磁盘。 */
  const viewed = await fetch(
    `${address}/api/thumb/${items[0].id}?size=400&fit=inside&v=1`,
  );
  assert.equal(viewed.status, 200);
  assert.equal(viewed.headers.get("content-type"), "image/webp");
  assert.ok((await viewed.arrayBuffer()).byteLength > 0);

  /* 第二次预热命中缓存，不再重复生成。 */
  const again = await fetch(`${address}/api/thumbs/prefetch`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ids: [items[0].id], size: 400, fit: "inside" }),
  });
  assert.equal(again.status, 200);
  assert.equal((await again.json()).warmed, 1);

  const empty = await fetch(`${address}/api/thumbs/prefetch`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ids: [] }),
  });
  assert.equal(empty.status, 400);

  const missing = await fetch(`${address}/api/thumbs/prefetch`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ids: [999999], size: 400 }),
  });
  assert.equal(missing.status, 200);
  const missingSummary = await missing.json();
  assert.equal(missingSummary.warmed, 0);
  assert.equal(missingSummary.failed, 1);
});

test("预热走后台队列，可见区那条 GET 仍然是前台优先级", () => {
  assert.match(
    indexSource,
    /pathname !== "\/api\/thumbs\/prefetch" &&/,
    "预热接口应该被排除在「清空撤销」之外",
  );
  assert.match(
    indexSource,
    /thumbs\.ensureThumb\(item, size, fit, \{\s*lane: "background",\s*signal: controller\.signal,/,
  );
  /* 可见区那条 GET 默认走前台；只有 L0 预热可显式标记为后台。 */
  assert.match(
    indexSource,
    /if \(parts\[1\] === "thumb" && parts\[2\]\) \{[\s\S]*?url\.searchParams\.get\("lane"\) === "background"[\s\S]*?lane: "background"[\s\S]*?signal: controller\.signal,/,
    "普通 GET 默认前台，L0 预热可显式走后台",
  );
  assert.match(
    indexSource,
    /if \(parts\[1\] === "thumb" && parts\[2\]\) \{[\s\S]*?req\.once\("close", onClose\);[\s\S]*?if \(thumbs\.isThumbJobCancelled\(err\)\) return;/,
    "格子被复用 / 视图切走时浏览器会掐断连接，服务端要跟着丢掉排队中的任务",
  );
  assert.match(
    indexSource,
    /if \(parts\[1\] === "thumb" && parts\[2\]\) \{[\s\S]*?finally \{\s*req\.removeListener\("close", onClose\);\s*\}/,
  );
});

/* ------------------------------ 前端接线 ------------------------------ */

test("前端从当前可见区往下排预热计划，滚到哪里就重排到哪里", () => {
  const section = appSource.slice(
    appSource.indexOf("/* ---------------------- 缩略图后台预生成"),
    appSource.indexOf("function galleryQualitySrc("),
  );
  assert.ok(section.length > 0, "找不到缩略图预生成这一段");

  /* 计划以可见区为锚：先顺着往下补，再回头往上补。 */
  assert.match(
    section,
    /function buildThumbPrefetchPlan\(range\) \{[\s\S]*range\.last \+ 1[\s\S]*range\.first - 1/,
  );
  assert.match(section, /const THUMB_PREFETCH_AHEAD = 2400;/);
  const plan = section.slice(
    section.indexOf("function buildThumbPrefetchPlan("),
    section.indexOf("function rebuildThumbPrefetchPlan("),
  );
  assert.doesNotMatch(
    plan,
    /downEnd \+ 1 < items\.length|upStart - 1 >= 0/,
    "高清 L1 不应在空闲时继续铺满整个图库",
  );
  /* 整库刚导入时缩略图全是冷的，批量要够大，别被提交速率卡住。 */
  assert.match(section, /const THUMB_PREFETCH_BATCH = 24;/);
  assert.match(section, /const THUMB_PREFETCH_TIMEOUT_MS = 45000;/);
  /* 可见区范围靠真实 DOM 量，虚拟网格只渲染窗口内的 tile。 */
  assert.match(
    section,
    /function galleryViewportIndexRange\(\)[\s\S]*querySelectorAll\(":scope > \.tile\[data-index\]"\)/,
  );
  /* 请求的尺寸和裁剪方式必须和网格里 <img> 用的完全一致，否则缓存对不上。 */
  assert.match(section, /galleryThumbSizeForZoom\(\)/);
  assert.match(section, /fit: "inside",/);
  assert.match(section, /size: thumbPrefetchSize,/);
  /* 挪动一点点不打断计划，大跳才掐掉在途那一批。 */
  assert.match(section, /const THUMB_PREFETCH_REANCHOR_MIN = 16;/);
  assert.match(section, /const THUMB_PREFETCH_JUMP_MIN = 200;/);
  assert.match(
    section,
    /if \(moved >= THUMB_PREFETCH_JUMP_MIN\) \{[\s\S]*?cancelThumbPrefetchBatch\(\);[\s\S]*?stopThumbDecodeAhead\(\);[\s\S]*?thumbPrefetchSettleUntil = settled\s*\?\s*0\s*:\s*Date\.now\(\) \+ THUMB_PREFETCH_SETTLE_MS;/,
    "拖滚动条这种大跳要掐掉在途批次和旧解码队列，并区分停稳后的立即重排",
  );
  /* 大跳之后等视野停稳再排计划，别把刚排好的一批立刻作废。 */
  assert.match(section, /const THUMB_PREFETCH_SETTLE_MS = 200;/);
  assert.match(
    section,
    /if \(Date\.now\(\) < thumbPrefetchSettleUntil\) \{\s*scheduleThumbPrefetch\(THUMB_PREFETCH_SETTLE_MS\);\s*return;\s*\}/,
  );
  /* 切图库 / 切相簿 / 换档位时，上一个视图的在途批次要立刻让路。 */
  assert.match(
    section,
    /function armThumbPrefetch\([\s\S]*?if \(key !== thumbPrefetchViewKey\) cancelThumbPrefetchBatch\(\);/,
  );
  /* 停下来的时候要把停稳计时清掉，别让下一次启动白等一轮。 */
  assert.match(
    section,
    /function stopThumbPrefetch\(\) \{[\s\S]*?thumbPrefetchSettleUntil = 0;/,
  );
  /* 查看器打开时让路，导入没跑完时也不抢。 */
  assert.match(section, /if \(!\$\("#viewer"\)\?\.hidden\) return false;/);
  assert.match(
    section,
    /if \(state\.busy \|\| rootImportRunning\(\)\) return false;/,
  );
  assert.match(section, /return !hasIncompleteProgressivePhotoGrid\(\);/);
});

test("预生成接在渲染、滚动、换档和窗口前后台这四个时机上", () => {
  /* 导入完成 / 切视图都会走到 render() 末尾。 */
  assert.match(
    appSource,
    /scheduleVisibleContextMapPreviews\(\);\s*\/\* 视图落定了[\s\S]*?armThumbPrefetch\(\);\s*queueThumbLowResWarm\(\);[\s\S]*?return true;\s*\}/,
  );
  /* 滚动时只记账，下一批开工前再重排。 */
  assert.match(
    appSource,
    /syncBackToTop\(\);\s*noteThumbPrefetchScroll\(\);\s*\}\);/,
  );
  /* 换网格档位 = 换一档缩略图尺寸。 */
  assert.match(
    appSource,
    /function setGalleryImageQuality\([\s\S]*?observeGalleryImageTiles\(grids\);[\s\S]*?armThumbPrefetch\(\);/,
  );
  /* 切到后台就停下，回到前台从当前视野重新排。 */
  assert.match(
    appSource,
    /document\.addEventListener\("visibilitychange"[\s\S]*?armThumbPrefetch\(\{ force: true \}\);/,
  );
});

test("前端一批的数量不超过服务端一次能收的上限", () => {
  /* 服务端会把超出的 id 静默截掉：批量配大了就等于白排一趟，
     那些照片要等下一次重排才轮得到。 */
  const batch = Number(
    /const THUMB_PREFETCH_BATCH = (\d+);/.exec(appSource)?.[1],
  );
  const cap = Number(
    /const THUMB_PREFETCH_MAX_IDS = (\d+);/.exec(indexSource)?.[1],
  );
  assert.ok(Number.isInteger(batch) && batch > 0, "读不到前端的批量大小");
  assert.ok(Number.isInteger(cap) && cap > 0, "读不到服务端的接收上限");
  assert.ok(
    batch <= cap,
    `一批 ${batch} 张超过服务端上限 ${cap} 张，多出来的会被丢掉`,
  );
  const libraryBatch = Number(
    /const LIBRARY_STANDARD_WARM_BATCH = (\d+);/.exec(appSource)?.[1],
  );
  assert.ok(Number.isInteger(libraryBatch) && libraryBatch > 0);
  assert.ok(
    libraryBatch <= cap,
    `全库预热一批 ${libraryBatch} 张超过服务端上限 ${cap} 张`,
  );
});

test("导入后按全库顺序补标准细节图，但每批仍走后台优先级", () => {
  assert.match(
    appSource,
    /const LIBRARY_STANDARD_THUMB_SIZE = GALLERY_GRID_DETAIL_SIZE;/,
  );
  assert.match(appSource, /const LIBRARY_STANDARD_WARM_BATCH = 48;/);
  assert.match(
    appSource,
    /LIBRARY_STANDARD_WARM_STORAGE_KEY =\s*"fotora-library-standard-thumb-warm-v3"/,
  );
  const section = appSource.slice(
    appSource.indexOf("function libraryStandardWarmItems()"),
    appSource.indexOf("/* ---------------------- 提前解码"),
  );
  assert.match(
    section,
    /state\.activeId !== "library"[\s\S]*?state\.albumItems\.length[\s\S]*?state\.albumItemsRaw/,
  );
  assert.match(
    section,
    /items\.map\(\(item\) => \(\{[\s\S]*?thumbPrefetchKeyOf\(item, LIBRARY_STANDARD_THUMB_SIZE\)/,
  );
  assert.match(
    section,
    /api\("\/api\/thumbs\/prefetch"[\s\S]*?size: LIBRARY_STANDARD_THUMB_SIZE[\s\S]*?fit: "inside"/,
  );
  assert.match(section, /libraryStandardWarmMarkedDone\(signature\)/);
  assert.match(
    section,
    /markLibraryStandardWarmDone\(libraryStandardWarmSignature\)/,
  );
  assert.doesNotMatch(
    section,
    /rememberThumbPrefetchWarmed\(batch\.map/,
    "全库预热只负责落盘，不能抢掉可见区后续的提前解码",
  );

  /* render 是导入完成、切换图库和回到普通图库的共同落点。 */
  assert.match(
    appSource,
    /armThumbPrefetch\(\);\s*queueThumbLowResWarm\(\);\s*ensureLibraryStandardThumbWarm\(\);/,
  );
  assert.match(
    appSource,
    /armThumbPrefetch\(\{ force: true \}\);[\s\S]*?ensureLibraryStandardThumbWarm\(\);[\s\S]*?scheduleThumbLowResWarm\(0\);/,
  );
});

test("全库标准图预热让路给查看器和可见区，但切回图库会继续", () => {
  const ready = appSource.slice(
    appSource.indexOf("function libraryStandardWarmReady()"),
    appSource.indexOf("function scheduleLibraryStandardThumbWarm("),
  );
  assert.match(ready, /!state\.busy/);
  assert.match(ready, /!rootImportRunning\(\)/);
  assert.match(ready, /\$\("#viewer"\)\?\.hidden/);
  assert.match(ready, /!galleryAtlasWarmActive/);
  assert.match(ready, /!galleryAtlasWarmQueue\.length/);
  assert.match(ready, /gallery-is-scrolling/);

  const tick = appSource.slice(
    appSource.indexOf("async function runLibraryStandardThumbWarmTick()"),
    appSource.indexOf("function ensureLibraryStandardThumbWarm("),
  );
  assert.match(tick, /LIBRARY_STANDARD_WARM_IDLE_MS/);
  assert.match(tick, /libraryStandardWarmCursor = startCursor/);
  assert.match(tick, /signature !== libraryStandardWarmSignature/);
});
