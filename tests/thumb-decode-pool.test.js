"use strict";
/**
 * 缩略图「无感加载」的三层缓存：已上屏标记（关掉重播的入场动画）、
 * 离屏解码池（留住解码好的 <img> 节点）、提前解码（滑到之前就备好）。
 *
 * 前两层是纯逻辑，把 app.js 里那一段原文抠出来放进 vm 真跑一遍，
 * 断言内存预算、LRU 淘汰、换档作废和「回收 → 领用」闭环都对得上。
 * 剩下的接线点（虚拟网格、滚动方向、视图缓存、CSS）没法脱离浏览器跑，
 * 按本仓库一贯的做法做源码断言，防止以后被无意改回去。
 */

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

const repoRoot = path.resolve(__dirname, "..");
const appSource = fs.readFileSync(path.join(repoRoot, "web", "app.js"), "utf8");
const cssSource = fs.readFileSync(
  path.join(repoRoot, "web", "styles.css"),
  "utf8",
);

const POOL_START =
  "/* ---------------------- 缩略图解码缓存 ---------------------- */";
const POOL_END =
  "/* ---------------------- 缩略图后台预生成 ---------------------- */";

/** 抠出解码池那一段源码。两个标记都必须在，否则说明这段被挪走或改名了。 */
function decodePoolSource() {
  const from = appSource.indexOf(POOL_START);
  const to = appSource.indexOf(POOL_END);
  assert.ok(from >= 0, "找不到「缩略图解码缓存」段落起点");
  assert.ok(to > from, "找不到「缩略图后台预生成」段落终点");
  return appSource.slice(from, to);
}

/**
 * 一个够用的假 <img>：解码池只关心 src 字面值、解码尺寸、dataset 和
 * onload / onerror，不需要真的去加载。
 */
function fakeImage({ src = "", width = 100, height = 100 } = {}) {
  const attributes = new Map(src ? [["src", src]] : []);
  const img = {
    dataset: {},
    classList: { contains: () => false },
    alt: "",
    draggable: true,
    loading: "",
    decoding: "",
    onload: null,
    onerror: null,
    removed: false,
    replacedBy: null,
    get naturalWidth() {
      return attributes.has("src") ? width : 0;
    },
    get naturalHeight() {
      return attributes.has("src") ? height : 0;
    },
    get complete() {
      return attributes.has("src");
    },
    getAttribute(name) {
      return attributes.has(name) ? attributes.get(name) : null;
    },
    setAttribute(name, value) {
      attributes.set(name, String(value));
    },
    removeAttribute(name) {
      attributes.delete(name);
    },
    remove() {
      img.removed = true;
    },
    replaceWith(next) {
      img.replacedBy = next;
    },
  };
  return img;
}

/** 假格子：crop 里挂一张 img，donate / adopt 就靠它进出。 */
function fakeTile(img, { index = 0, video = false } = {}) {
  const tile = {
    dataset: { index: String(index) },
    classList: { contains: (name) => (video ? name === "is-video" : false) },
    img,
    querySelector(selector) {
      if (selector !== ".crop > img") return null;
      /* 被摘走的图不该还查得到，跟真实 DOM 一样。 */
      return tile.img && !tile.img.removed ? tile.img : null;
    },
  };
  return tile;
}

/**
 * 在隔离上下文里跑解码池那一段，把内部函数捞出来。
 * thumbSize 决定当前网格档位，donate 时会用它校验 URL 是否还作数。
 */
function loadDecodePool({ deviceMemory = 8, thumbSize = 200 } = {}) {
  const source = decodePoolSource();
  const sizeState = { value: thumbSize };
  const context = vm.createContext({
    navigator: { deviceMemory },
    state: { photoZoom: 3 },
    sizeState,
    galleryThumbSizeForZoom: () => sizeState.value,
    galleryTileThumbSrc: (tile) => tile?.dataset?.thumbSrc || "",
    syncTileAspect: () => {},
    handleGalleryThumbError: () => {},
  });
  const exportsSource = `
    ;globalThis.__pool = {
      THUMB_DECODE_POOL_BUDGET,
      THUMB_DECODE_POOL_MAX_ENTRIES,
      THUMB_PAINTED_URL_LIMIT,
      thumbDecodeProtectedUrls,
      thumbDecodePoolBudgetBytes,
      thumbImageBytes,
      thumbImageKey,
      thumbRememberPainted,
      thumbWasPainted,
      thumbPoolForget,
      thumbPoolKeep,
      thumbPoolTake,
      thumbPoolHas,
      thumbTrimDecodePool,
      thumbClearDecodePool,
      syncThumbDecodePoolZoomSize,
      donateThumbDecodeImage,
      adoptThumbDecodeImage,
      poolSize: () => thumbDecodePool.size,
      poolBytes: () => thumbDecodePoolBytes,
      poolKeys: () => [...thumbDecodePool.keys()],
      setThumbSize: (value) => { sizeState.value = value; },
    };
  `;
  vm.runInContext(source + exportsSource, context, {
    filename: "decode-pool.js",
  });
  return context.__pool;
}

/* ------------------------------ 内存预算 ------------------------------ */

test("解码池预算按机器内存收放，并夹在上下限之间", () => {
  const low = loadDecodePool({ deviceMemory: 2 });
  const mid = loadDecodePool({ deviceMemory: 8 });
  const high = loadDecodePool({ deviceMemory: 64 });
  assert.equal(low.thumbDecodePoolBudgetBytes(), 96 * 1024 * 1024);
  assert.equal(mid.thumbDecodePoolBudgetBytes(), 192 * 1024 * 1024);
  assert.equal(high.thumbDecodePoolBudgetBytes(), 192 * 1024 * 1024);
  /* 拿不到 deviceMemory（Safari / 隐私模式）时按 8GB 兜底，不能算出 0。 */
  assert.equal(
    loadDecodePool({ deviceMemory: undefined }).thumbDecodePoolBudgetBytes(),
    192 * 1024 * 1024,
  );
  assert.ok(low.THUMB_DECODE_POOL_BUDGET > 0);
});

test("按内存预算淘汰：从最旧的一张开始丢，丢到预算内就停", () => {
  const pool = loadDecodePool();
  /* 每张 100×100×4 = 40000 字节。 */
  for (const index of [1, 2, 3, 4]) {
    pool.thumbPoolKeep(
      `/thumb/${index}`,
      fakeImage({ src: `/thumb/${index}` }),
    );
  }
  assert.equal(pool.poolBytes(), 160000);
  pool.thumbTrimDecodePool(90000);
  /* 池子在 vm 上下文里，取回来的数组要落到本地 realm 才能做严格比较。 */
  assert.deepEqual([...pool.poolKeys()], ["/thumb/3", "/thumb/4"]);
  assert.equal(pool.poolBytes(), 80000);
});

test("最近领用过的会排到队尾，淘汰时不会先丢它", () => {
  const pool = loadDecodePool();
  for (const index of [1, 2, 3]) {
    pool.thumbPoolKeep(`/t/${index}`, fakeImage({ src: `/t/${index}` }));
  }
  /* 把第 1 张取出来再放回去，它就变成了最新的一张。 */
  const reused = pool.thumbPoolTake("/t/1");
  assert.equal(pool.poolBytes(), 80000, "领用时要从池子字节里扣掉");
  pool.thumbPoolKeep("/t/1", reused);
  pool.thumbTrimDecodePool(80000);
  /* 三张共 12 万字节，收到 8 万就先丢最旧的 /t/2；/t/1 因为刚被复用而活下来。 */
  assert.deepEqual([...pool.poolKeys()], ["/t/3", "/t/1"]);
  assert.equal(pool.poolBytes(), 80000);
});

test("最近稳定视野里的图优先躲过普通 LRU，但预算到极限时仍可回收", () => {
  const pool = loadDecodePool();
  for (const index of [1, 2, 3, 4]) {
    const url = `/view/${index}`;
    pool.thumbPoolKeep(url, fakeImage({ src: url }));
    if (index === 1) pool.thumbDecodeProtectedUrls.add(url);
  }
  pool.thumbTrimDecodePool(90000);
  assert.ok(pool.thumbPoolHas("/view/1"), "当前视野的图应先保住");
  assert.deepEqual([...pool.poolKeys()], ["/view/1", "/view/4"]);

  /* 保护区域自己就超标时，不能突破 4 万字节的内存上限。 */
  pool.thumbTrimDecodePool(40000);
  assert.equal(pool.poolBytes(), 40000);
});

test("最小档一格才几十 KB，只按内存收口会攒下上万个节点，所以还要按数量收", () => {
  const pool = loadDecodePool();
  const limit = pool.THUMB_DECODE_POOL_MAX_ENTRIES;
  /* 每张 1×1×4 = 4 字节，内存预算永远不会触发，只能靠数量上限兜住。 */
  for (let index = 0; index < limit + 50; index += 1) {
    pool.thumbPoolKeep(
      `/tiny/${index}`,
      fakeImage({ src: `/tiny/${index}`, width: 1, height: 1 }),
    );
  }
  assert.ok(pool.poolSize() <= limit, `池子里还剩 ${pool.poolSize()} 个节点`);
  assert.ok(pool.poolKeys().every((key) => !key.startsWith("/tiny/0")));
});

test("同一 URL 重复入池不会把字节记两遍", () => {
  const pool = loadDecodePool();
  pool.thumbPoolKeep("/dup", fakeImage({ src: "/dup" }));
  pool.thumbPoolKeep("/dup", fakeImage({ src: "/dup" }));
  assert.equal(pool.poolSize(), 1);
  assert.equal(pool.poolBytes(), 40000);
});

test("内联占位图和没有尺寸的图不进池子：占内存又领不回去", () => {
  const pool = loadDecodePool();
  pool.thumbPoolKeep(
    "data:image/gif;base64,R0lGOD",
    fakeImage({ src: "data:image/gif;base64,R0lGOD" }),
  );
  pool.thumbPoolKeep(
    "/broken",
    fakeImage({ src: "/broken", width: 0, height: 0 }),
  );
  pool.thumbPoolKeep("", fakeImage({ src: "" }));
  assert.equal(pool.poolSize(), 0);
  assert.equal(pool.poolBytes(), 0);
});

test("丢掉一张要真的断开 src，浏览器才肯释放那份解码内存", () => {
  const pool = loadDecodePool();
  const img = fakeImage({ src: "/gone" });
  pool.thumbPoolKeep("/gone", img);
  pool.thumbPoolForget("/gone");
  assert.equal(img.getAttribute("src"), null);
  assert.equal(img.onload, null);
  assert.equal(pool.poolBytes(), 0);
});

/* ------------------------------ 换档保留 ------------------------------ */

test("换网格档位保留其他尺寸节点，回到原档位仍可领回同一张", () => {
  const source = decodePoolSource();
  assert.match(source, /function syncThumbDecodePoolZoomSize\(/);
  assert.doesNotMatch(
    source,
    /function syncThumbDecodePoolZoomSize\([\s\S]*?thumbClearDecodePool\(\)[\s\S]*?\n\}/,
  );
  const pool = loadDecodePool({ thumbSize: 400 });
  const fourHundred = fakeImage({
    src: "/api/thumb/7?size=400&fit=inside",
  });
  pool.thumbPoolKeep("/api/thumb/7?size=400&fit=inside", fourHundred);
  pool.setThumbSize(200);
  pool.syncThumbDecodePoolZoomSize(3);
  assert.ok(pool.thumbPoolHas("/api/thumb/7?size=400&fit=inside"));
  const twoHundred = fakeImage({
    src: "/api/thumb/7?size=200&fit=inside",
  });
  pool.thumbPoolKeep("/api/thumb/7?size=200&fit=inside", twoHundred);
  pool.setThumbSize(400);
  pool.syncThumbDecodePoolZoomSize(4);
  assert.equal(
    pool.thumbPoolTake("/api/thumb/7?size=400&fit=inside"),
    fourHundred,
  );

  /* 接线点：换档入口必须调用它，才能同步当前档位并执行统一 LRU。 */
  const quality = appSource.slice(
    appSource.indexOf("function setGalleryImageQuality("),
    appSource.indexOf("function setGalleryImageQuality(") + 2000,
  );
  assert.match(quality, /syncThumbDecodePoolZoomSize\(level\)/);
});

/* ---------------------------- 回收 → 领用闭环 ---------------------------- */

test("格子被回收时把解码好的图摘下来交给池子，新格子直接接回去", () => {
  const pool = loadDecodePool({ thumbSize: 200 });
  const url = "/api/thumb/7?size=200&fit=inside";
  const donor = fakeImage({ src: url });
  const donorTile = fakeTile(donor, { index: 7 });
  donorTile.dataset.thumbSrc = url;

  pool.donateThumbDecodeImage(donorTile);
  assert.ok(donor.removed, "摘下来的图不该还挂在旧格子上");
  assert.equal(donorTile.querySelector(".crop > img"), null);
  assert.ok(pool.thumbPoolHas(url));
  assert.ok(
    pool.thumbWasPainted(url),
    "进过池子的就算上过屏，之后不再重播入场动画",
  );

  /* 新格子先摆一张同 URL 的占位图，领用后应当被池子里那个节点整个换掉。 */
  const placeholder = fakeImage({ src: url, width: 0, height: 0 });
  const freshTile = fakeTile(placeholder, { index: 7 });
  const adopted = pool.adoptThumbDecodeImage(freshTile);
  assert.equal(adopted, donor);
  assert.equal(placeholder.replacedBy, donor);
  assert.equal(placeholder.getAttribute("src"), url, "占位图不该被断开");
  assert.equal(pool.poolSize(), 0, "领走的不能再留在池子里");
});

test("领来的节点要按新格子重接一遍事件和加载属性，并清掉上一轮的失败痕迹", () => {
  const pool = loadDecodePool({ thumbSize: 200 });
  const url = "/api/thumb/9?size=200&fit=inside";
  const donor = fakeImage({ src: url });
  donor.dataset.galleryThumbRetryAttempt = "2";
  donor.dataset.galleryThumbRecovered = "true";
  donor.dataset.galleryThumbSize = "128";
  donor.loading = "";
  const donorTile = fakeTile(donor, { index: 9 });
  donorTile.dataset.thumbSrc = url;
  pool.donateThumbDecodeImage(donorTile);

  const freshTile = fakeTile(fakeImage({ src: url, width: 0, height: 0 }), {
    index: 9,
  });
  const adopted = pool.adoptThumbDecodeImage(freshTile);
  assert.equal(adopted.loading, "lazy");
  assert.equal(adopted.decoding, "async");
  assert.equal(adopted.dataset.galleryThumbSize, "200");
  assert.equal(adopted.dataset.galleryThumbRetryAttempt, undefined);
  assert.equal(adopted.dataset.galleryThumbRecovered, undefined);
  assert.equal(typeof adopted.onload, "function");
  assert.equal(typeof adopted.onerror, "function");
});

test("URL 对不上就别留：换过档、照片被编辑过的图领不回去", () => {
  const pool = loadDecodePool({ thumbSize: 200 });
  const stale = fakeImage({ src: "/api/thumb/3?size=128&fit=inside" });
  const tile = fakeTile(stale, { index: 3 });
  tile.dataset.thumbSrc = "/api/thumb/3?size=200&fit=inside";
  pool.donateThumbDecodeImage(tile);
  assert.equal(pool.poolSize(), 0);
  assert.ok(!stale.removed, "没进池子的图不该被从格子上摘走");
});

test("还没解码完的和被窗口卸载过的图不进池子", () => {
  const pool = loadDecodePool({ thumbSize: 200 });
  const url = "/api/thumb/4?size=200&fit=inside";

  const pending = fakeImage({ src: url, width: 0, height: 0 });
  const pendingTile = fakeTile(pending, { index: 4 });
  pendingTile.dataset.thumbSrc = url;
  pool.donateThumbDecodeImage(pendingTile);

  const unloaded = fakeImage({ src: url });
  unloaded.dataset.galleryWindowUnloaded = "true";
  const unloadedTile = fakeTile(unloaded, { index: 4 });
  unloadedTile.dataset.thumbSrc = url;
  pool.donateThumbDecodeImage(unloadedTile);

  assert.equal(pool.poolSize(), 0);
});

test("池子里没有这一张时，领用返回 null 并留下占位图", () => {
  const pool = loadDecodePool();
  const placeholder = fakeImage({ src: "/cold" });
  const tile = fakeTile(placeholder, { index: 1 });
  assert.equal(pool.adoptThumbDecodeImage(tile), null);
  assert.equal(tile.querySelector(".crop > img"), placeholder);
});

/* ---------------------------- 已上屏标记的容量 ---------------------------- */

test("已上屏的 URL 记满上限后从最旧的开始忘，不会无限涨", () => {
  const pool = loadDecodePool();
  const limit = pool.THUMB_PAINTED_URL_LIMIT;
  for (let index = 0; index < limit + 100; index += 1) {
    pool.thumbRememberPainted(`/painted/${index}`);
  }
  assert.ok(!pool.thumbWasPainted("/painted/0"), "最旧的那条应该已经被忘掉");
  assert.ok(pool.thumbWasPainted(`/painted/${limit + 99}`));
});

test("内联占位图不记「已上屏」：它不是真的照片画面", () => {
  const pool = loadDecodePool();
  pool.thumbRememberPainted("data:image/gif;base64,R0lGOD");
  pool.thumbRememberPainted("");
  assert.equal(pool.thumbWasPainted("data:image/gif;base64,R0lGOD"), false);
});

/* ------------------------------ 免动画快路 ------------------------------ */

test("已经上过屏的缩略图直接免动画，不再走两帧 + 淡入", () => {
  const from = appSource.indexOf("function syncTileAspect(img) {");
  assert.ok(from >= 0);
  const body = appSource.slice(from, from + 2200);
  const warmAt = body.indexOf("thumbWasPainted(source)");
  const revealAt = body.indexOf("const revealAfterPaint");
  assert.ok(warmAt > 0, "syncTileAspect 里没有已上屏判定");
  assert.ok(revealAt > warmAt, "免动画判定必须在淡入逻辑之前");
  const warmPath = body.slice(warmAt, revealAt);
  /* 两个类必须同一帧加上：CSS 里过渡时长为 0，浏览器才不会起过渡。 */
  assert.match(warmPath, /classList\.add\("is-thumb-warm", "is-media-ready"\)/);
  assert.match(warmPath, /return;/);
  /* 冷路径要把免动画标记摘掉，否则真正需要骨架顶住时骨架不出现。 */
  assert.match(
    body.slice(revealAt - 200, revealAt),
    /classList\.remove\("is-thumb-warm"\)/,
  );
  /* 真正上屏那一刻才记账。 */
  assert.match(body, /thumbRememberPainted\(source\)/);
});

test("建格子那一刻就带上免动画标记，不等 onload", () => {
  const from = appSource.indexOf("function itemTile(");
  assert.ok(from >= 0);
  const body = appSource.slice(from, from + 9000);
  assert.match(body, /thumbWasPainted\(thumb\)/);
  assert.match(body, /is-thumb-warm/);
});

test("换图时按新地址重判免动画：新地址自己上过屏才继续免动画", () => {
  const from = appSource.indexOf("function loadGalleryWindowImage(tile) {");
  assert.ok(from >= 0);
  const body = appSource.slice(from, from + 1500);
  assert.match(
    body,
    /classList\.toggle\("is-thumb-warm", thumbWasPainted\(src\)\)/,
  );
});

test("免动画只拿掉 opacity 过渡，transform 那一路必须留着做裁剪模式动画", () => {
  const warmImg = cssSource.match(
    /\.photo-grid\s+\.tile\.is-thumb-warm\s+\.crop\s*>\s*img[^{]*\{([^}]*)\}/,
  );
  assert.ok(warmImg, "styles.css 里找不到 .is-thumb-warm 的图片规则");
  assert.ok(!/opacity/.test(warmImg[1]), "免动画时不该再对 opacity 做过渡");
  assert.match(warmImg[1], /transition:\s*transform/);

  const warmSkeleton = cssSource.match(
    /\.photo-grid \.tile\.is-thumb-warm \.crop::before\s*\{([^}]*)\}/,
  );
  assert.ok(warmSkeleton, "styles.css 里找不到 .is-thumb-warm 的骨架规则");
  assert.match(warmSkeleton[1], /animation:\s*none/);
});

/* ------------------------------ 身后缓冲 ------------------------------ */

test("往回翻时身后按内存预算多留一段，身前那段交给预热去铺", () => {
  const from = appSource.indexOf("function syncVirtualPhotoGrid(grid, layout");
  assert.ok(from >= 0);
  const body = appSource.slice(from, from + 4000);
  assert.match(body, /galleryTrailOverscanPx\(grid, layout, rowPitch\)/);
  assert.match(body, /const scrollingDown = galleryScrollTrailDirection > 0/);
  assert.match(body, /scrollingDown \? trail : overscan/);
  assert.match(body, /scrollingDown \? overscan : trail/);
  /* 缓冲像素要按「一格解码后占多少内存」折算，不能写死一个屏数。 */
  const trail = appSource.slice(
    appSource.indexOf("function galleryTrailOverscanPx("),
    appSource.indexOf("function syncVirtualPhotoGrid(grid, layout"),
  );
  assert.match(trail, /VIRTUAL_PHOTO_GRID_TRAIL_BUDGET_BYTES/);
  assert.match(trail, /thumbSize \* thumbSize \* 4/);
  assert.match(trail, /VIRTUAL_PHOTO_GRID_TRAIL_MAX_PX/);
});

test("滚动方向只在真滚动了才更新，两像素以内的抖动不算换向", () => {
  const body = appSource.slice(
    appSource.indexOf("function noteGalleryScrollDirection()"),
    appSource.indexOf("function galleryTrailOverscanPx("),
  );
  assert.match(body, /Math\.abs\(delta\) < 2/);
  assert.match(body, /delta > 0 \? 1 : -1/);
  /* 每帧滚动都要记一笔，否则缓冲区永远按旧方向摆。 */
  const from = appSource.indexOf("function handleGalleryContentScroll(");
  assert.ok(from >= 0);
  assert.match(
    appSource.slice(from, from + 3000),
    /noteGalleryScrollDirection\(\)/,
  );
});

/* ------------------------------ 提前解码 ------------------------------ */

test("提前解码只排当前档位那一批，尺寸对不上就整批不要", () => {
  const body = appSource.slice(
    appSource.indexOf("function queueThumbDecodeAhead(items, size) {"),
    appSource.indexOf("function startThumbDecodeAhead(url) {"),
  );
  assert.match(body, /size !== galleryThumbSizeForZoom\(\)/);
  assert.match(body, /THUMB_DECODE_AHEAD_LIMIT/);
  assert.match(
    body,
    /thumbPoolHas\(url\) \|\| thumbDecodeAheadQueued\.has\(url\)/,
  );
  /* 全库可以继续落盘，但解码队列只接受当前视野左右各约两屏。 */
  assert.match(body, /galleryViewportIndexRange\(\)/);
  assert.match(body, /THUMB_DECODE_AHEAD_VIEWPORT_RADIUS/);
  assert.match(body, /index < first \|\| index > last/);
});

test("解码让路给可见区：查看器、导入、换档动画、正在滚动时都不抢主线程", () => {
  const wanted = appSource.slice(
    appSource.indexOf("function thumbDecodeAheadWanted() {"),
    appSource.indexOf("function scheduleThumbDecodeAhead("),
  );
  assert.match(wanted, /thumbPrefetchAlive\(\)/);
  assert.match(wanted, /\$\("#viewer"\)\?\.hidden/);
  assert.match(wanted, /state\.busy \|\| rootImportRunning\(\)/);
  assert.match(wanted, /galleryZoomBusy/);

  const pump = appSource.slice(
    appSource.indexOf("function pumpThumbDecodeAhead() {"),
    appSource.indexOf("function cancelThumbPrefetchBatch() {"),
  );
  assert.match(pump, /document\.hidden/);
  assert.match(pump, /thumbDecodeScrollQuietUntil - performance\.now\(\)/);
  assert.match(pump, /THUMB_DECODE_AHEAD_CONCURRENCY/);
});

test("落盘的那一批接着排进提前解码，滚动时先静默一会儿", () => {
  assert.match(
    appSource,
    /queueThumbDecodeAhead\(batch\.items, thumbPrefetchSize\)/,
  );
  const note = appSource.slice(
    appSource.indexOf("function noteThumbPrefetchScroll() {"),
    appSource.indexOf("function stopThumbPrefetch() {"),
  );
  assert.match(note, /THUMB_DECODE_AHEAD_SCROLL_QUIET_MS/);
  /* 停止预热时必须连提前解码一起停，否则关掉图库后还在后台下载。 */
  const stop = appSource.slice(
    appSource.indexOf("function stopThumbPrefetch() {"),
    appSource.indexOf("function armThumbPrefetch("),
  );
  assert.match(stop, /stopThumbDecodeAhead\(\)/);
});

test("拖动大跳时清掉中间位置，滚动停稳后立即重排", () => {
  const retarget = appSource.slice(
    appSource.indexOf("function retargetThumbPrefetch("),
    appSource.indexOf("async function runThumbPrefetchTick("),
  );
  assert.match(retarget, /stopThumbDecodeAhead\(\)/);
  assert.match(retarget, /settled\s*\?\s*0\s*:/);
  assert.match(retarget, /if \(settled\) thumbPrefetchScrollDirty = false;/);

  const scrollEnd = appSource.slice(
    appSource.indexOf("function handleGalleryContentScroll("),
    appSource.indexOf('$("#content").addEventListener("scroll"'),
  );
  assert.match(scrollEnd, /rememberThumbDecodeViewport\(\)/);
  assert.match(scrollEnd, /retargetThumbPrefetch\(\{ settled: true \}\)/);
  assert.match(scrollEnd, /scheduleThumbPrefetch\(0\)/);
});

test("切到后台时停下解码并把池子收到四分之一，内存先还给系统", () => {
  const from = appSource.indexOf(
    'document.addEventListener("visibilitychange"',
  );
  assert.ok(from >= 0);
  const body = appSource.slice(from, from + 900);
  assert.match(body, /stopThumbDecodeAhead\(\)/);
  assert.match(
    body,
    /thumbTrimDecodePool\(Math\.floor\(THUMB_DECODE_POOL_BUDGET \/ 4\)\)/,
  );
  assert.match(body, /armThumbPrefetch\(\{ force: true \}\)/);
});

/* ------------------------------ 视图缓存 ------------------------------ */

test("切视图的缓存按字节收口，不按格子数", () => {
  const cache = appSource.slice(
    appSource.indexOf("function cacheCurrentContentView() {"),
    appSource.indexOf("function cacheCurrentContentView() {") + 2500,
  );
  assert.match(cache, /contentThumbDecodedBytes\(content\)/);
  assert.match(cache, /bytes > CONTENT_VIEW_CACHE_MAX_BYTES/);
  assert.match(
    cache,
    /contentViewCache\.set\(descriptor\.key, \{ fragment, bytes \}\)/,
  );
  /* 最小档一屏能有上千格，按格子数卡会把最常见的情况直接拒掉。 */
  assert.ok(!/CONTENT_VIEW_CACHE_MAX_TILES/.test(appSource));

  const trim = appSource.slice(
    appSource.indexOf("function trimContentCache() {"),
    appSource.indexOf("function cacheCurrentContentView() {"),
  );
  assert.match(trim, /CONTENT_VIEW_CACHE_TOTAL_BYTES/);
  /* 只删 Map 里那条引用，位图还得等 GC 才肯放手，要显式清空子树。 */
  assert.match(trim, /fragment\?\.replaceChildren\(\)/);
});

/* ------------------------------ 领用时机 ------------------------------ */

test("领用必须等格子进了真文档：<template> 的内容文档不是完全活动的", () => {
  const from = appSource.indexOf("function syncVirtualPhotoGrid(grid, layout");
  assert.ok(from >= 0);
  const body = appSource.slice(from, from + 6000);
  const appendAt = body.indexOf("grid.append(template.content)");
  const adoptAt = body.indexOf("adoptThumbDecodeImage(tile)");
  assert.ok(appendAt > 0, "找不到把新格子挂进网格的那一步");
  assert.ok(
    adoptAt > appendAt,
    "领用必须在 grid.append 之后，否则加载会被作废",
  );
  /* 领来的节点不会再触发 onload，得自己补一次就绪同步。 */
  assert.match(body.slice(adoptAt, adoptAt + 400), /syncTileAspect\(img\)/);
  /* 回收要在 remove 之前，节点摘走了就再也拿不到那张图了。 */
  const donateAt = body.indexOf("donateThumbDecodeImage(tile)");
  const removeAt = body.indexOf("tile.remove()", donateAt);
  assert.ok(
    donateAt > 0 && removeAt > donateAt,
    "回收必须在 tile.remove() 之前",
  );
});
