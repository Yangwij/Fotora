"use strict";
/**
 * 极端操作下的缩略图加载：模拟用户猛滚滚轮、来回切相簿 / 图库、一把拖滚动条到
 * 很远的地方，然后断言「停下来看的那一屏」总是能顺利出图，而半路上被放弃的
 * 那些请求会立刻让出服务端名额，不会堵在后面。
 *
 * 这里用真实的 HTTP 连接打真实的本地服务，`req.destroy()` 就是浏览器换掉
 * <img> 的 src、或者把整片网格拆掉时干的事。
 */

const assert = require("node:assert/strict");
const http = require("node:http");
const fsp = require("node:fs/promises");
const os = require("node:os");
const path = require("node:path");
const { test, before, after } = require("node:test");

const dataDir = path.join(
  os.tmpdir(),
  `fotora-extreme-scroll-${process.pid}-${Date.now()}`,
);
const libraryDir = path.join(dataDir, "library");
process.env.PHOTO_DATA = path.join(dataDir, "data");
process.env.PHOTO_DB = path.join(dataDir, "library.db");

const sharp = require("sharp");
const lib = require("../server/library");
const serverApi = require("../server/index");
const thumbs = require("../server/thumbs");

/* 120 张，够四段互不重叠的场景各自从冷缓存开始。 */
const PHOTO_COUNT = 120;
const THUMB_SIZE = 400;

/* 每个请求一条独立连接：掐断某一条时不会牵连别的，最接近浏览器
   「这一格我不要了」的语义。 */
const agent = new http.Agent({ keepAlive: false });

let port = 0;
let items = [];

const ids = (from, to) => items.slice(from, to).map((item) => item.id);
const stats = () => thumbs.thumbScheduler.stats();

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * 发一条真实的 GET /api/thumb。
 * destroyAfterMs > 0 表示「用户已经滚走了」：过这么久就把连接掐断，
 * 跟浏览器复用格子时换 src 的效果一样。
 */
function getThumb(id, { destroyAfterMs = 0 } = {}) {
  return new Promise((resolve) => {
    const started = Date.now();
    let settled = false;
    const done = (result) => {
      if (settled) return;
      settled = true;
      resolve({ ...result, ms: Date.now() - started });
    };
    const req = http.get(
      {
        host: "127.0.0.1",
        port,
        path: `/api/thumb/${id}?size=${THUMB_SIZE}&fit=inside&v=1`,
        agent,
      },
      (res) => {
        let bytes = 0;
        res.on("data", (chunk) => {
          bytes += chunk.length;
        });
        res.on("end", () =>
          done({ status: res.statusCode, bytes, abandoned: false }),
        );
        res.on("error", () => done({ status: 0, bytes, abandoned: true }));
        res.on("close", () => {
          /* 响应还没读完连接就断了（我们主动掐的）。 */
          if (!res.complete) done({ status: 0, bytes, abandoned: true });
        });
      },
    );
    req.on("error", () => done({ status: 0, bytes: 0, abandoned: true }));
    if (destroyAfterMs > 0) setTimeout(() => req.destroy(), destroyAfterMs);
  });
}

/** 等调度器把手上的活干完，好让下一段场景从干净的队列开始。 */
async function drainScheduler(timeoutMs = 15000) {
  const deadline = Date.now() + timeoutMs;
  for (;;) {
    const now = stats();
    const pending = now.running + now.queuedInteractive + now.queuedBackground;
    if (pending === 0) return;
    assert.ok(
      Date.now() < deadline,
      `调度器一直没有空下来：${JSON.stringify(now)}`,
    );
    await sleep(20);
  }
}

/** 把一屏照片整整齐齐要一遍，全部得是 200 且有内容。 */
async function expectScreenLoads(idList, budgetMs) {
  const started = Date.now();
  const results = await Promise.all(idList.map((id) => getThumb(id)));
  const elapsed = Date.now() - started;
  for (const [index, result] of results.entries()) {
    assert.equal(
      result.status,
      200,
      `停下来这一屏第 ${index + 1} 张没出来（id=${idList[index]}，${JSON.stringify(result)}）`,
    );
    assert.ok(result.bytes > 0, `第 ${index + 1} 张是空的`);
  }
  assert.ok(
    elapsed < budgetMs,
    `停下来这一屏花了 ${elapsed}ms，超过预算 ${budgetMs}ms`,
  );
  return elapsed;
}

before(async () => {
  await fsp.mkdir(libraryDir, { recursive: true });
  /* 1200x900 的 JPEG：缩略图生成大约几十毫秒，跟真实照片一个量级，
     这样「排队中被取消」才有稳定可测的窗口。 */
  for (let start = 0; start < PHOTO_COUNT; start += 12) {
    await Promise.all(
      Array.from({ length: Math.min(12, PHOTO_COUNT - start) }, (_, offset) => {
        const index = start + offset;
        const tone = (index * 29) % 200;
        return sharp({
          create: {
            width: 1200,
            height: 900,
            channels: 3,
            background: { r: tone, g: (tone + 60) % 255, b: 255 - tone },
          },
        })
          .jpeg({ quality: 82 })
          .toFile(
            path.join(libraryDir, `shot-${String(index).padStart(3, "0")}.jpg`),
          );
      }),
    );
  }

  const root = lib.addRoot(libraryDir);
  await lib.scanRoot(root.id);
  items = lib
    .getLibraryItems(root.id)
    .slice()
    .sort((a, b) => a.id - b.id);
  assert.equal(items.length, PHOTO_COUNT, "测试图库没扫全");

  const running = await serverApi.start({ port: 0 });
  port = running.port;
});

after(async () => {
  agent.destroy();
  thumbs.thumbScheduler.clearQueue();
  await serverApi.stop();
  lib.closeDatabase();
  await fsp.rm(dataDir, { recursive: true, force: true });
});

test("正常看完的一屏不会被误判成「用户滚走了」", async () => {
  const cancelledBefore = stats().cancelled;
  await expectScreenLoads(ids(0, 12), 20000);
  await drainScheduler();
  assert.equal(
    stats().cancelled,
    cancelledBefore,
    "连接一直好好开着，不该有任务被取消",
  );
});

test("猛滚滚轮：半路放弃的请求让出名额，停下来那一屏照常出图", async () => {
  const cancelledBefore = stats().cancelled;

  /* 8 帧，每帧 10 张、跟下一帧重叠 6 张 —— 就是一路往下猛滚的样子。
     每帧的请求都在 25ms 后被格子复用掐断。 */
  const abandoned = [];
  for (let frame = 0; frame < 8; frame += 1) {
    const from = 12 + frame * 4;
    abandoned.push(
      ...ids(from, from + 10).map((id) => getThumb(id, { destroyAfterMs: 25 })),
    );
    await sleep(8);
  }
  const rolled = await Promise.all(abandoned);
  assert.ok(
    rolled.some((result) => result.abandoned),
    "这一轮应该确实有请求被掐断，否则测不到东西",
  );

  await drainScheduler();
  const cancelledByBurst = stats().cancelled - cancelledBefore;
  assert.ok(
    cancelledByBurst > 0,
    `滚走之后排队中的任务应该被丢掉（实际取消 ${cancelledByBurst} 个，${JSON.stringify(stats())}）`,
  );
  /* 名额已经空出来了，不会还压着一堆没人要的活。 */
  assert.equal(stats().queuedInteractive, 0);

  /* 用户停下来了：最后那一屏必须整整齐齐出图。 */
  await expectScreenLoads(ids(38, 50), 20000);
  await drainScheduler();
});

test("相簿和图库来回切：上一屏在途的请求全部作废，新视图立刻能看", async () => {
  const cancelledBefore = stats().cancelled;

  /* 切视图会把整片网格拆掉，所有在途的 <img> 请求一起断线。 */
  const torn = await Promise.all(
    ids(50, 68).map((id) => getThumb(id, { destroyAfterMs: 20 })),
  );
  assert.ok(torn.some((result) => result.abandoned));

  await drainScheduler();
  assert.ok(
    stats().cancelled > cancelledBefore,
    "切视图后应该丢掉排队中的任务",
  );

  /* 落到的新视图（另一个相簿的第一屏）不该被上一个视图的残留拖住。 */
  await expectScreenLoads(ids(68, 80), 20000);
  await drainScheduler();
});

test("一把拖滚动条到很远：划过的区间不占名额，落点那一屏照常出图", async () => {
  const cancelledBefore = stats().cancelled;

  /* 拖动过程中经过的那一段：每张都只是闪一下就被换掉。 */
  const flew = await Promise.all(
    ids(80, 100).map((id) => getThumb(id, { destroyAfterMs: 15 })),
  );
  assert.ok(flew.some((result) => result.abandoned));

  await drainScheduler();
  assert.ok(
    stats().cancelled > cancelledBefore,
    "拖滚动条划过的区间应该立刻让出名额",
  );

  /* 松手停在库的另一头。 */
  await expectScreenLoads(ids(100, 112), 20000);
  await drainScheduler();
});

test("极端操作之后整库仍然可看，队列里没有卡住的活", async () => {
  /* 前面几轮反复掐连接，这里确认没留下死结：随便再要一屏，照常出图。 */
  await expectScreenLoads(ids(112, 120), 20000);
  await drainScheduler();
  const now = stats();
  assert.equal(now.running, 0);
  assert.equal(now.queuedInteractive, 0);
  assert.equal(now.queuedBackground, 0);
});
