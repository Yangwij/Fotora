"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const fsp = require("node:fs/promises");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

const root = path.resolve(__dirname, "..");
const app = fs.readFileSync(path.join(root, "web", "app.js"), "utf8");
const server = fs.readFileSync(path.join(root, "server", "index.js"), "utf8");

function fakeImage({ src = "", width = 100, height = 100 } = {}) {
  const attributes = new Map(src ? [["src", src]] : []);
  const image = {
    onload: null,
    onerror: null,
    get complete() {
      return attributes.has("src");
    },
    get naturalWidth() {
      return attributes.has("src") ? width : 0;
    },
    get naturalHeight() {
      return attributes.has("src") ? height : 0;
    },
    getAttribute(name) {
      return attributes.has(name) ? attributes.get(name) : null;
    },
    removeAttribute(name) {
      attributes.delete(name);
    },
  };
  return image;
}

function loadViewerCache({ deviceMemory = 8 } = {}) {
  const from = app.indexOf("const VIEWER_IMAGE_CACHE_BASE_MB");
  const to = app.indexOf("function viewerImageWarmTargets()", from);
  assert.ok(from >= 0 && to > from, "找不到查看器大图缓存段落");
  const source = app.slice(from, to);
  const context = vm.createContext({
    navigator: { deviceMemory },
  });
  vm.runInContext(
    source +
      `
    ;globalThis.__cache = {
      VIEWER_IMAGE_CACHE_BUDGET,
      VIEWER_IMAGE_CACHE_MAX_ENTRIES,
      viewerImageCacheBudgetBytes,
      viewerImageBytes,
      trimViewerImageCache,
      keepViewerImage,
      takeViewerImage,
      registerViewerImage,
      syncActiveViewerImageBytes,
      releaseActiveViewerImage,
      discardViewerImage,
      cacheSize: () => viewerImageCache.size,
      cacheBytes: () => viewerImageCacheBytes,
      cacheKeys: () => [...viewerImageCache.keys()],
      activeKey: () => viewerActiveImageKey,
    };
  `,
    context,
    { filename: "viewer-image-cache.js" },
  );
  return context.__cache;
}

test("查看器大图缓存按机器内存收放并保留少量完整节点", () => {
  const low = loadViewerCache({ deviceMemory: 2 });
  const mid = loadViewerCache({ deviceMemory: 8 });
  const high = loadViewerCache({ deviceMemory: 64 });
  assert.equal(low.VIEWER_IMAGE_CACHE_BUDGET, 128 * 1024 * 1024);
  assert.equal(mid.VIEWER_IMAGE_CACHE_BUDGET, 256 * 1024 * 1024);
  assert.equal(high.VIEWER_IMAGE_CACHE_BUDGET, 512 * 1024 * 1024);
  assert.equal(low.VIEWER_IMAGE_CACHE_MAX_ENTRIES, 12);
});

test("大图领回同一个已解码节点，离开时也不触发重新加载", () => {
  const cache = loadViewerCache();
  const image = fakeImage({ src: "/api/view/7?v=1" });
  assert.equal(cache.keepViewerImage("/api/view/7?v=1", image), true);
  assert.equal(cache.takeViewerImage("/api/view/7?v=1"), image);
  assert.equal(cache.activeKey(), "/api/view/7?v=1");
  cache.releaseActiveViewerImage({ trim: false });
  assert.equal(cache.cacheSize(), 1);
  assert.equal(cache.takeViewerImage("/api/view/7?v=1"), image);
});

test("第一次加载中的大图也登记为当前节点，离开后仍能从缓存领回", () => {
  const cache = loadViewerCache();
  const image = fakeImage({ src: "/api/view/8?v=1" });
  cache.registerViewerImage("/api/view/8?v=1", image);
  cache.syncActiveViewerImageBytes(image);
  assert.equal(cache.cacheBytes(), 40000);
  cache.releaseActiveViewerImage({ trim: false });
  assert.equal(cache.takeViewerImage("/api/view/8?v=1"), image);
});

test("正在显示的大图不会被内存预算淘汰，其余按最旧开始回收", () => {
  const cache = loadViewerCache();
  for (const id of [1, 2, 3]) {
    cache.keepViewerImage(`/view/${id}`, fakeImage({ src: `/view/${id}` }));
  }
  cache.takeViewerImage("/view/2");
  cache.trimViewerImageCache(40000);
  assert.deepEqual([...cache.cacheKeys()], ["/view/2"]);
  assert.equal(cache.cacheBytes(), 40000);
});

test("大图节点数量有上限，淘汰时真正断开 src 释放位图", () => {
  const cache = loadViewerCache();
  const limit = cache.VIEWER_IMAGE_CACHE_MAX_ENTRIES;
  const images = [];
  for (let index = 0; index < limit + 5; index += 1) {
    const image = fakeImage({ src: `/tiny/${index}`, width: 1, height: 1 });
    images.push(image);
    cache.keepViewerImage(`/tiny/${index}`, image);
  }
  assert.equal(cache.cacheSize(), limit);
  assert.equal(images[0].getAttribute("src"), null);
  assert.equal(images.at(-1).getAttribute("src"), `/tiny/${limit + 4}`);
});

test("查看器打开后预取前后两张，关闭时停止并保留近期节点", () => {
  assert.match(app, /const VIEWER_IMAGE_WARM_RADIUS = 2;/);
  assert.match(app, /const VIEWER_IMAGE_WARM_CONCURRENCY = 2;/);
  const show = app.slice(
    app.indexOf("function showViewerItem("),
    app.indexOf("function addVideoChrome("),
  );
  assert.match(show, /takeViewerImage\(viewItemUrl\(item\)\)/);
  assert.match(show, /image\.replaceWith\(cachedImage\)/);
  assert.match(show, /scheduleViewerImageWarm\(\);/);
  assert.match(show, /scheduleViewerReturnGridWarm\(\);/);

  const close = app.slice(
    app.indexOf("function closeViewer({"),
    app.indexOf("function setViewerInfo(open)"),
  );
  assert.match(close, /stopViewerImageWarm\(\);/);
  assert.match(close, /stopViewerReturnGridWarm\(\);/);
  assert.match(close, /releaseActiveViewerImage\(\{ trim: false \}\);/);

  const retarget = app.slice(
    app.indexOf("function retargetViewerImageWarm()"),
    app.indexOf("function scheduleViewerImageWarm("),
  );
  assert.match(retarget, /!desired\.has\(job\.url\)/);
  assert.match(retarget, /cancelViewerImageWarmJob\(job\)/);
});

test("查看器胶片跳远后预热返回格，关闭时落点已从解码池就绪", () => {
  assert.match(app, /const VIEWER_RETURN_GRID_RADIUS = 8;/);
  assert.match(app, /const VIEWER_RETURN_GRID_DELAY_MS = 140;/);
  const warm = app.slice(
    app.indexOf("async function warmViewerReturnGrid("),
    app.indexOf("function scheduleViewerReturnGridWarm("),
  );
  assert.match(warm, /preloadGalleryAtlasPagesForItems\(items\)/);
  assert.match(
    warm,
    /orderedItems\.map\(\(item\) =>\s*itemThumbUrl\(item, size, "inside"\),?\s*\)/,
  );
  assert.match(warm, /onLoaded: \(img, url\) => thumbPoolKeep\(url, img\)/);
  assert.match(warm, /orderedItems\.map\(\(item\) => thumbLowResUrl\(item\)\)/);
  assert.match(warm, /onLoaded: \(img, url\) => thumbLowResKeep\(url, img\)/);

  const ensure = app.slice(
    app.indexOf("function ensureVirtualPhotoTile("),
    app.indexOf("function capturePhotoViewportAnchor("),
  );
  const appendAt = ensure.indexOf("found.grid.append(tile)");
  const adoptAt = ensure.indexOf("adoptThumbDecodeImage(tile)");
  assert.ok(appendAt >= 0 && adoptAt > appendAt);
  assert.match(ensure, /adoptThumbLowResImage\(tile\)/);
  assert.match(
    ensure,
    /if \(img\?\.complete && img\.naturalWidth > 0\) syncTileAspect\(img\)/,
  );
});

test("带内容版本的查看器与原图响应使用 immutable 和 ETag", () => {
  assert.match(
    server,
    /function sendFile\([\s\S]*?\{ cache = false, immutable = false \} = \{\}/,
  );
  assert.match(server, /public, max-age=31536000, immutable/);
  assert.match(server, /ETag: etag/);
  assert.match(server, /"Last-Modified": lastModified/);
  assert.match(server, /res\.writeHead\(304, headers\)/);

  const viewRoute = server.slice(
    server.indexOf('if (parts[1] === "view" && parts[2])'),
    server.indexOf('if (parts[1] === "open" && parts[2])'),
  );
  assert.match(viewRoute, /cache: true/);
  assert.match(viewRoute, /immutable: url\.searchParams\.has\("v"\)/);
});

const cacheDataDir = path.join(
  os.tmpdir(),
  `fotora-http-image-cache-${process.pid}-${Date.now()}`,
);
const cacheLibraryDir = path.join(cacheDataDir, "library");
process.env.PHOTO_DATA = path.join(cacheDataDir, "data");
process.env.PHOTO_DB = path.join(cacheDataDir, "library.db");

const sharp = require("sharp");
const lib = require("../server/library");
const serverApi = require("../server/index");

test("查看器大图与网格缩略图实际返回长期缓存头，并可用 ETag 做 304", async (t) => {
  await fsp.mkdir(cacheLibraryDir, { recursive: true });
  await sharp({
    create: { width: 16, height: 12, channels: 3, background: "#d08060" },
  })
    .jpeg()
    .toFile(path.join(cacheLibraryDir, "cache-photo.jpg"));

  const rootEntry = lib.addRoot(cacheLibraryDir);
  await lib.scanRoot(rootEntry.id);
  const item = lib.getLibraryItems(rootEntry.id)[0];
  assert.ok(item);

  const running = await serverApi.start({ port: 0 });
  t.after(async () => {
    await serverApi.stop();
    lib.closeDatabase();
    await fsp.rm(cacheDataDir, { recursive: true, force: true });
  });
  const origin = `http://127.0.0.1:${running.port}`;

  const viewUrl = `${origin}/api/view/${item.id}?v=test-version`;
  const firstView = await fetch(viewUrl);
  assert.equal(firstView.status, 200);
  assert.match(
    firstView.headers.get("cache-control") || "",
    /max-age=31536000.*immutable/,
  );
  const etag = firstView.headers.get("etag");
  assert.ok(etag);
  assert.ok(firstView.headers.get("last-modified"));
  await firstView.arrayBuffer();

  const revalidated = await fetch(viewUrl, {
    headers: { "If-None-Match": etag },
  });
  assert.equal(revalidated.status, 304);
  assert.equal(await revalidated.text(), "");

  const thumbResponse = await fetch(
    `${origin}/api/thumb/${item.id}?size=400&fit=inside&v=test-version`,
  );
  assert.equal(thumbResponse.status, 200);
  assert.match(
    thumbResponse.headers.get("cache-control") || "",
    /max-age=31536000.*immutable/,
  );
  assert.ok(thumbResponse.headers.get("etag"));
});
