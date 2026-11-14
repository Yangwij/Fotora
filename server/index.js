"use strict";
/**
 * 本地服务：给前端提供相簿树、缩略图、原图/视频流，以及「选择文件夹」。
 * 启动后以独立应用窗口打开 http://127.0.0.1:4599。
 */
const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");
const zlib = require("node:zlib");
const { execFile } = require("node:child_process");
const lib = require("./library");
const thumbs = require("./thumbs");
const edits = require("./edits");

const PORT = Number(process.env.PORT || 4599);
const MAX_JSON_BODY_BYTES = 8 * 1024 * 1024;
const WEB_DIR = path.join(__dirname, "..", "web");
const WINDOW_CONTROL_SCRIPT = path.join(__dirname, "window-control.ps1");
const compatibilityVideoJobs = new Map();
let compatibilityVideoQueue = Promise.resolve();
/* ------------------------------------------------------------------
 * 自动更新：盯着根文件夹，只要磁盘上有变化就自己重扫一遍，
 * 并把版本号 +1，前端轮询到这个号变了就刷新界面 —— 界面上不再需要「重新扫描」按钮。
 * ------------------------------------------------------------------ */
const revisionByRoot = new Map();
function bumpRootRevision(rootId) {
  if (rootId == null) return;
  const id = Number(rootId);
  if (!Number.isInteger(id)) return;
  revisionByRoot.set(id, Number(revisionByRoot.get(id) || 0) + 1);
}

function getRootRevision(rootId) {
  if (rootId == null) return 0;
  const id = Number(rootId);
  if (!Number.isInteger(id)) return 0;
  if (!revisionByRoot.has(id)) revisionByRoot.set(id, 1);
  return Number(revisionByRoot.get(id));
}

function activeRoot() {
  const roots = lib.listRoots();
  if (!roots.length) return null;
  const stored = Number(lib.getMeta("active_root_id"));
  const current = roots.find((root) => Number(root.id) === stored);
  if (current) return current;
  const fallback = roots[0];
  try {
    lib.setMeta("active_root_id", String(fallback.id));
  } catch {}
  return fallback;
}

function activeRootId() {
  return activeRoot()?.id ?? null;
}

function setActiveRoot(rootId) {
  const root = lib
    .listRoots()
    .find((entry) => Number(entry.id) === Number(rootId));
  if (!root) throw new Error("根目录不存在");
  lib.setMeta("active_root_id", String(root.id));
  syncRootWatchers(root);
  return root;
}

function rootIsAvailable(root) {
  try {
    return fs.statSync(root.path).isDirectory();
  } catch {
    return false;
  }
}

function bumpActiveRootRevision() {
  bumpRootRevision(activeRootId());
}
/* 首次运行由索引指纹生成，之后把封面版本存进库：
   库没变时重启软件也沿用同一个封面 URL，浏览器可以直接命中上次的缓存。 */
const epochFromSignature = (signature) =>
  parseInt(signature.slice(0, 12), 16) || 1;
const storedCoverEpoch = Number(lib.getMeta("cover_epoch"));
let coverEpoch =
  Number.isFinite(storedCoverEpoch) && storedCoverEpoch > 0
    ? storedCoverEpoch
    : epochFromSignature(lib.getLibrarySignature());
if (!storedCoverEpoch) {
  try {
    lib.setMeta("cover_epoch", String(coverEpoch));
  } catch {}
}

function nextCoverEpoch() {
  coverEpoch = Math.max(Date.now(), coverEpoch + 1);
  try {
    lib.setMeta("cover_epoch", String(coverEpoch));
  } catch {}
}
const watchers = new Map(); /* rootId -> fs.watch 实例 */
const watchTimers = new Map(); /* rootId -> 防抖定时器 */
const watchRetryTimers = new Map(); /* rootId -> 监听器重建定时器 */
const WATCH_DEBOUNCE = 1200; /* 一秒多内的连续改动合成一次扫描（复制一堆照片时很有用） */
const WATCH_RETRY_DELAY = 5000;

/* 扫描排成一条队，免得两次扫描同时改库 */
let scanChain = Promise.resolve();
function scanSeries(rootId) {
  const run = scanChain.then(() => lib.scanRoot(rootId));
  scanChain = run.catch(() => {});
  return run;
}
async function scanAndBump(rootId) {
  const before = lib.getLibrarySignature();
  const result = await scanSeries(rootId);
  const after = lib.getLibrarySignature();
  const changed = before !== after;
  if (changed) {
    bumpRootRevision(rootId);
    nextCoverEpoch();
  }
  return { ...result, changed };
}

/* 启动时先把封面用到的 200 / 400 两档缩略图生成好，再返回状态。
   同一个媒体先生成 200 再生成 400，避免视频封面的临时文件互相抢。 */
async function warmCoverThumbs(coverIds) {
  const jobs = coverIds.map((id) => lib.getItem(id)).filter(Boolean);
  let next = 0;
  const workers = Array.from({ length: Math.min(4, jobs.length) }, async () => {
    while (next < jobs.length) {
      const item = jobs[next++];
      for (const size of [200, 400]) {
        try {
          await thumbs.ensureThumb(item, size, "cover");
        } catch {}
      }
    }
  });
  await Promise.all(workers);
}

function clearWatchRetry(rootId) {
  clearTimeout(watchRetryTimers.get(rootId));
  watchRetryTimers.delete(rootId);
}

function scheduleWatchRetry(rootId) {
  if (watchRetryTimers.has(rootId)) return;
  const timer = setTimeout(() => {
    watchRetryTimers.delete(rootId);
    const active = activeRoot();
    if (!active || Number(active.id) !== Number(rootId)) return;
    if (!rootIsAvailable(active)) {
      scheduleWatchRetry(rootId);
      return;
    }
    watchRoot(active);
  }, WATCH_RETRY_DELAY);
  timer.unref?.();
  watchRetryTimers.set(rootId, timer);
}

function watchRoot(root) {
  if (watchers.has(root.id)) return;
  try {
    const w = fs.watch(root.path, { recursive: true }, () => {
      clearTimeout(watchTimers.get(root.id));
      watchTimers.set(
        root.id,
        setTimeout(() => {
          watchTimers.delete(root.id);
          scanAndBump(root.id).catch((err) =>
            console.error("[自动更新失败]", err.message),
          );
        }, WATCH_DEBOUNCE),
      );
    });
    w.on("error", (err) => {
      console.error(
        `[自动更新监听失败，将自动重试] ${root.path}：${err.message || err}`,
      );
      unwatchRoot(root.id);
      scheduleWatchRetry(root.id);
    });
    watchers.set(root.id, w);
    clearWatchRetry(root.id);
    console.log("已开始盯着文件夹：" + root.path);
  } catch (err) {
    console.error(
      "这个文件夹监听不了（不影响浏览，只是不会自动更新）：" +
        root.path +
        " —— " +
        err.message,
    );
    scheduleWatchRetry(root.id);
  }
}

function unwatchRoot(rootId) {
  clearWatchRetry(rootId);
  const w = watchers.get(rootId);
  if (w) {
    try {
      w.close();
    } catch {}
    watchers.delete(rootId);
  }
  clearTimeout(watchTimers.get(rootId));
  watchTimers.delete(rootId);
}

function syncRootWatchers(active) {
  for (const rootId of [...watchers.keys()]) {
    if (Number(rootId) !== Number(active?.id)) unwatchRoot(rootId);
  }
  if (active && rootIsAvailable(active)) watchRoot(active);
}

/* ExifTool 会更新正在被递归监听的媒体文件。Windows 上的原生文件监视器
   偶尔会在同一文件连续变更时崩溃，因此写盘前后短暂停掉相关根目录的监听；
   接口本身会同步更新索引，不需要让监听器再触发一次扫描。 */
async function withoutItemRootWatchers(ids, operation) {
  const rootIds = new Set(
    ids
      .map((id) => Number(lib.getItem(id)?.root_id))
      .filter((id) => Number.isInteger(id) && id > 0),
  );
  for (const rootId of rootIds) unwatchRoot(rootId);
  try {
    return await operation();
  } finally {
    syncRootWatchers(activeRoot());
  }
}

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".gif": "image/gif",
  ".bmp": "image/bmp",
  ".avif": "image/avif",
  ".mp4": "video/mp4",
  ".m4v": "video/mp4",
  ".mov": "video/quicktime",
  ".webm": "video/webm",
  ".mkv": "video/x-matroska",
  ".avi": "video/x-msvideo",
  ".wmv": "video/x-ms-wmv",
};

function json(res, data, status = 200) {
  const body = JSON.stringify(data);
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Content-Length": Buffer.byteLength(body),
    "Cache-Control": "no-store",
  });
  res.end(body);
}

const fail = (res, message, status = 400) =>
  json(res, { error: message }, status);

class RequestError extends Error {
  constructor(message, status = 400) {
    super(message);
    this.status = status;
  }
}

async function readBody(req) {
  const chunks = [];
  let size = 0;
  for await (const chunk of req) {
    size += chunk.length;
    if (size > MAX_JSON_BODY_BYTES) {
      req.resume();
      throw new RequestError("请求内容过大", 413);
    }
    chunks.push(chunk);
  }
  if (!chunks.length) return {};
  const contentType = String(req.headers["content-type"] || "");
  if (!/^application\/json(?:\s*;|$)/i.test(contentType)) {
    throw new RequestError("请求必须使用 application/json", 415);
  }
  try {
    return JSON.parse(Buffer.concat(chunks).toString("utf8"));
  } catch {
    throw new RequestError("请求内容不是有效的 JSON");
  }
}

function isLoopbackHostname(hostname) {
  const value = String(hostname || "").toLowerCase();
  return (
    value === "127.0.0.1" ||
    value === "localhost" ||
    value === "::1" ||
    value === "[::1]"
  );
}

/* 服务只供本机使用。拒绝非回环 Host 可阻止 DNS 重绑定；
   Origin 校验则阻止其他网页向本地接口发送跨站写请求。 */
function assertLocalRequest(req) {
  const host = String(req.headers.host || "");
  if (host) {
    let hostname;
    try {
      hostname = new URL(`http://${host}`).hostname;
    } catch {
      throw new RequestError("请求地址无效", 400);
    }
    if (!isLoopbackHostname(hostname)) {
      throw new RequestError("只允许本机访问", 403);
    }
  }

  const origin = String(req.headers.origin || "");
  if (!origin) return;
  try {
    const parsed = new URL(origin);
    const expectedHost = host.toLowerCase();
    if (
      parsed.protocol !== "http:" ||
      !isLoopbackHostname(parsed.hostname) ||
      (expectedHost && parsed.host.toLowerCase() !== expectedHost)
    ) {
      throw new Error("origin mismatch");
    }
  } catch {
    throw new RequestError("请求来源无效", 403);
  }
}

const state = () => {
  const root = activeRoot();
  const rootId = root?.id ?? null;
  const tree = lib.getTree(rootId);
  return {
    ...tree,
    roots: tree.roots.map((entry) => ({
      ...entry,
      available: rootIsAvailable(entry),
    })),
    activeRootId: rootId,
    revision: getRootRevision(rootId),
    trashCount: lib.countTrash(rootId),
    folderPrompts: lib.getPendingFolderPrompts(rootId),
    scan: lib.getScanState(rootId),
    coverEpoch,
  };
};

/* ------------------------------------------------------------------
 * 撤销：只保留本次运行的一步。任何下一次数据操作都会先清空它；
 * 移入最近删除、逻辑移动和相簿解散都只改软件状态。
 * ------------------------------------------------------------------ */
const undoStack = [];

function pushUndo(op) {
  undoStack.length = 0;
  undoStack.push(op);
}

const clearUndo = () => {
  undoStack.length = 0;
};

function undoInfo() {
  const last = undoStack[undoStack.length - 1];
  return { count: undoStack.length, label: last ? last.label : "" };
}

/* restoreTrashAlbums 只负责把文件夹搬回来；重新扫描后拿到新的相簿行，
   再把保存的槽位写回去，恢复后的顺序才与删除前一致。 */
function applyRestoredAlbumOrders(restoredItems) {
  if (!Array.isArray(restoredItems) || !restoredItems.length) return;
  const albums = lib.getTree(activeRootId()).albums;
  for (const item of restoredItems) {
    if (!item?.path || item.sortOrder == null) continue;
    const album = albums.find(
      (entry) => entry.path.toLowerCase() === item.path.toLowerCase(),
    );
    if (album) lib.restoreAlbumSortOrder(album.id, item.sortOrder);
  }
}

/* ---------------------------- 选择文件夹 ---------------------------- */

function pickFolder() {
  const script = [
    "[Console]::OutputEncoding=[Text.Encoding]::UTF8",
    "Add-Type -AssemblyName System.Windows.Forms",
    "$f=New-Object System.Windows.Forms.Form",
    "$f.TopMost=$true; $f.WindowState='Minimized'; $f.ShowInTaskbar=$false",
    "$d=New-Object System.Windows.Forms.FolderBrowserDialog",
    "$d.Description='选择照片库根文件夹（导入时会按当前子文件夹建立相簿快照）'",
    "$d.ShowNewFolderButton=$false",
    "if($d.ShowDialog($f) -eq [System.Windows.Forms.DialogResult]::OK){ [Console]::Out.Write($d.SelectedPath) }",
  ].join("; ");
  return new Promise((resolve) => {
    execFile(
      "powershell.exe",
      ["-NoProfile", "-STA", "-Command", script],
      { windowsHide: true, encoding: "utf8", maxBuffer: 1024 * 1024 },
      (err, stdout) => resolve(String(stdout || "").trim()),
    );
  });
}

function toggleAppWindow() {
  return new Promise((resolve, reject) => {
    execFile(
      "powershell.exe",
      [
        "-NoProfile",
        "-ExecutionPolicy",
        "Bypass",
        "-File",
        WINDOW_CONTROL_SCRIPT,
        "-Action",
        "toggle",
      ],
      { windowsHide: true, encoding: "utf8", timeout: 8000 },
      (err, stdout, stderr) => {
        if (err) {
          reject(new Error(String(stderr || stdout || err.message).trim()));
          return;
        }
        try {
          resolve(JSON.parse(String(stdout || "").trim()));
        } catch {
          reject(new Error("窗口控制没有返回有效结果"));
        }
      },
    );
  });
}

/* Electron 外壳可以接管这几项系统交互；命令行模式继续用下面的 PowerShell 实现。 */
let folderPicker = pickFolder;
let windowController = null;

function setFolderPicker(fn) {
  folderPicker = typeof fn === "function" ? fn : pickFolder;
}

function setWindowController(fn) {
  windowController = typeof fn === "function" ? fn : null;
}

function compatibilityVideoVersion(item) {
  return [
    Number(item?.mtime) || 0,
    Number(item?.size) || 0,
    Number(item?.editRevision) || 0,
  ].join("-");
}

function compatibilityVideoUrl(item) {
  return (
    `/api/video/compatible/${item.id}?v=` +
    encodeURIComponent(compatibilityVideoVersion(item))
  );
}

function startCompatibilityVideo(item) {
  const version = compatibilityVideoVersion(item);
  const current = compatibilityVideoJobs.get(item.id);
  if (current?.version === version) return current;

  const job = {
    version,
    status: "queued",
    startedAt: Date.now(),
    finishedAt: null,
  };
  compatibilityVideoJobs.set(item.id, job);
  compatibilityVideoQueue = compatibilityVideoQueue.then(async () => {
    if (compatibilityVideoJobs.get(item.id) !== job) return;
    job.status = "running";
    try {
      await thumbs.ensureCompatibleVideo(item);
      if (compatibilityVideoJobs.get(item.id) !== job) return;
      job.status = "ready";
    } catch (err) {
      if (compatibilityVideoJobs.get(item.id) !== job) return;
      job.status = "failed";
      job.error = String(err?.message || err).slice(0, 500);
    } finally {
      job.finishedAt = Date.now();
    }
  });
  compatibilityVideoQueue = compatibilityVideoQueue.catch(() => {});
  return job;
}

function compatibilityVideoResponse(item) {
  const job = startCompatibilityVideo(item);
  return {
    status: job.status,
    url: job.status === "ready" ? compatibilityVideoUrl(item) : "",
  };
}

/* ------------------------------ 文件流 ------------------------------ */

function sendFile(req, res, filePath, { cache = false } = {}) {
  let stat;
  try {
    stat = fs.statSync(filePath);
  } catch {
    return fail(res, "文件已不存在", 404);
  }
  /* 浏览器拖动进度条或提前关视频时会中断响应。只 pipe 不销毁源流的话，
     fs.ReadStream 可能一直占着原视频，随后整个相簿就无法移进回收站。 */
  let stream = null;
  res.once("close", () => stream?.destroy());
  const type =
    MIME[path.extname(filePath).toLowerCase()] || "application/octet-stream";
  const headers = {
    "Content-Type": type,
    "Accept-Ranges": "bytes",
    "Cache-Control": cache ? "public, max-age=86400" : "no-cache",
  };
  const range = req.headers.range;
  if (range) {
    const m = /^bytes=(\d*)-(\d*)$/.exec(String(range).trim());
    if (!m || (!m[1] && !m[2])) {
      res.writeHead(416, { "Content-Range": `bytes */${stat.size}` });
      return res.end();
    }
    const suffixLength = !m[1] ? Number(m[2]) : 0;
    const start = suffixLength
      ? Math.max(0, stat.size - suffixLength)
      : Number(m[1]);
    let end = suffixLength || !m[2] ? stat.size - 1 : Number(m[2]);
    end = Math.min(end, stat.size - 1);
    if (
      !Number.isSafeInteger(start) ||
      !Number.isSafeInteger(end) ||
      start < 0 ||
      start >= stat.size ||
      end < start
    ) {
      res.writeHead(416, { "Content-Range": `bytes */${stat.size}` });
      return res.end();
    }
    res.writeHead(206, {
      ...headers,
      "Content-Range": `bytes ${start}-${end}/${stat.size}`,
      "Content-Length": end - start + 1,
    });
    stream = fs.createReadStream(filePath, { start, end });
    stream.once("error", () => res.destroy());
    return stream.pipe(res);
  }
  res.writeHead(200, { ...headers, "Content-Length": stat.size });
  stream = fs.createReadStream(filePath);
  stream.once("error", () => res.destroy());
  return stream.pipe(res);
}

/* ------------------------------- 路由 ------------------------------- */

async function handleApi(req, res, url) {
  const { pathname } = url;
  const parts = pathname.split("/").filter(Boolean);
  if (
    req.method !== "GET" &&
    pathname !== "/api/undo" &&
    pathname !== "/api/covers/refresh" &&
    pathname !== "/api/window/toggle" &&
    pathname !== "/api/photo-wall/crop" &&
    pathname !== "/api/masonry-wall/crop" &&
    pathname !== "/api/pick-folder"
  ) {
    clearUndo();
  }

  if (pathname === "/api/state") return json(res, state());
  if (pathname === "/api/scan" && req.method === "GET") {
    const requestedRoot = Number(url.searchParams.get("rootId"));
    return json(
      res,
      lib.getScanState(
        Number.isInteger(requestedRoot) && requestedRoot > 0
          ? requestedRoot
          : activeRootId(),
      ),
    );
  }
  /* 浏览器无法解码的视频会静默生成 H.264/AAC 兼容缓存。
     查询接口同时负责启动任务；前端不需要新增确认步骤。 */
  if (
    parts[1] === "video" &&
    parts[2] === "compatibility" &&
    parts[3] &&
    req.method === "GET"
  ) {
    const item = lib.getItem(Number(parts[3]));
    if (!item || item.kind !== "video") {
      return fail(res, "视频不存在", 404);
    }
    return json(res, compatibilityVideoResponse(item));
  }
  if (
    parts[1] === "video" &&
    parts[2] === "compatible" &&
    parts[3] &&
    req.method === "GET"
  ) {
    const item = lib.getItem(Number(parts[3]));
    if (!item || item.kind !== "video") {
      return fail(res, "视频不存在", 404);
    }
    try {
      const file = await thumbs.ensureCompatibleVideo(item);
      if (!file) return fail(res, "这个视频暂时无法生成兼容预览", 415);
      return sendFile(req, res, file, { cache: true });
    } catch (err) {
      return fail(res, err.message || "这个视频暂时无法生成兼容预览", 415);
    }
  }

  if (pathname === "/api/library/items" && req.method === "GET") {
    return json(res, { items: lib.getLibraryItems(activeRootId()) });
  }

  /* 地点页需要照片和视频的 GPS，但它和未添加位置网格共用同一份
     当前图库快照；隐藏、最近删除和实况伴生视频已在查询中排除。 */
  if (pathname === "/api/locations/items" && req.method === "GET") {
    return json(res, { items: lib.getLibraryItems(activeRootId()) });
  }

  /* 四种照片墙共享一次相簿树和照片快照，避免进入资料库时重复全量查询。 */
  if (pathname === "/api/walls/albums" && req.method === "GET") {
    return json(res, lib.listWallAlbums(activeRootId()));
  }

  /* 左侧「收藏」：只读的项目集合，不复制、不移动磁盘上的文件。 */
  if (pathname === "/api/favorites/items" && req.method === "GET") {
    const items = lib.getFavoriteItems(activeRootId()).map((it) => ({
      ...it,
      ext: path.extname(it.path).toLowerCase(),
      original: thumbs.canViewOriginal(it.path),
    }));
    return json(res, { items });
  }

  /* 照片墙资料库：叶子相簿即时镜像，不在数据库里复制相簿或照片。 */
  if (pathname === "/api/photo-wall/albums" && req.method === "GET") {
    return json(res, { albums: lib.listPhotoWallAlbums(activeRootId()) });
  }

  if (pathname === "/api/photo-wall/photos" && req.method === "GET") {
    const rawAlbumIds = (url.searchParams.get("albums") || "").trim();
    const albumIds = rawAlbumIds
      ? rawAlbumIds.split(",").map(Number).filter(Number.isInteger)
      : [];
    const items = lib.getPhotoWallPhotos(
      albumIds.length ? albumIds : null,
      activeRootId(),
    );
    return json(res, { items });
  }

  if (pathname === "/api/photo-wall/crop" && req.method === "POST") {
    const body = await readBody(req);
    try {
      const crop = lib.setPhotoWallCrop(Number(body.itemId), body);
      thumbs.dropPhotoWallThumbs(Number(body.itemId));
      return json(res, { crop });
    } catch (err) {
      return fail(res, err.message);
    }
  }

  /* 纵向画廊与错落磁贴使用同一批相簿身份，但比例和裁剪记录完全独立。 */
  if (pathname === "/api/masonry-wall/albums" && req.method === "GET") {
    return json(res, { albums: lib.listMasonryWallAlbums(activeRootId()) });
  }

  if (pathname === "/api/masonry-wall/photos" && req.method === "GET") {
    const rawAlbumIds = (url.searchParams.get("albums") || "").trim();
    const albumIds = rawAlbumIds
      ? rawAlbumIds.split(",").map(Number).filter(Number.isInteger)
      : [];
    return json(res, {
      items: lib.getMasonryWallPhotos(
        albumIds.length ? albumIds : null,
        activeRootId(),
      ),
      ratios: ["9:16", "2:3", "3:4", "1:1", "4:3", "3:2", "16:9"],
    });
  }

  if (pathname === "/api/masonry-wall/crop" && req.method === "POST") {
    const body = await readBody(req);
    try {
      const crop = lib.setMasonryWallCrop(Number(body.itemId), body);
      thumbs.dropMasonryWallThumbs(Number(body.itemId));
      return json(res, { crop });
    } catch (err) {
      return fail(res, err.message);
    }
  }

  if (pathname === "/api/filmroll-wall/albums" && req.method === "GET") {
    return json(res, { albums: lib.listFilmrollWallAlbums(activeRootId()) });
  }

  if (pathname === "/api/filmroll-wall/photos" && req.method === "GET") {
    const rawAlbumIds = (url.searchParams.get("albums") || "").trim();
    const albumIds = rawAlbumIds
      ? rawAlbumIds.split(",").map(Number).filter(Number.isInteger)
      : [];
    return json(res, {
      items: lib.getFilmrollWallPhotos(
        albumIds.length ? albumIds : null,
        activeRootId(),
      ),
      ratios: ["9:16", "2:3", "3:4", "1:1", "4:3", "3:2", "16:9"],
    });
  }

  if (pathname === "/api/filmroll-wall/crop" && req.method === "POST") {
    const body = await readBody(req);
    try {
      const crop = lib.setFilmrollWallCrop(Number(body.itemId), body);
      thumbs.dropFilmrollWallThumbs(Number(body.itemId));
      return json(res, { crop });
    } catch (err) {
      return fail(res, err.message);
    }
  }

  if (pathname === "/api/mosaic-wall/albums" && req.method === "GET") {
    return json(res, { albums: lib.listMosaicWallAlbums(activeRootId()) });
  }

  if (pathname === "/api/mosaic-wall/photos" && req.method === "GET") {
    const rawAlbumIds = (url.searchParams.get("albums") || "").trim();
    const albumIds = rawAlbumIds
      ? rawAlbumIds.split(",").map(Number).filter(Number.isInteger)
      : [];
    return json(res, {
      items: lib.getMosaicWallPhotos(
        albumIds.length ? albumIds : null,
        activeRootId(),
      ),
      ratios: [
        "9:16",
        "3:5",
        "2:3",
        "5:7",
        "3:4",
        "4:5",
        "1:1",
        "5:4",
        "4:3",
        "7:5",
        "3:2",
        "5:3",
        "16:9",
      ],
    });
  }

  if (pathname === "/api/mosaic-wall/crop" && req.method === "POST") {
    const body = await readBody(req);
    try {
      const crop = lib.setMosaicWallCrop(Number(body.itemId), body);
      thumbs.dropMosaicWallThumbs(Number(body.itemId));
      return json(res, { crop });
    } catch (err) {
      return fail(res, err.message);
    }
  }

  if (pathname === "/api/window/toggle" && req.method === "POST") {
    try {
      if (windowController) return json(res, await windowController());
      return json(res, await toggleAppWindow());
    } catch (err) {
      return fail(res, "切换窗口失败：" + err.message, 500);
    }
  }

  /* 应用打开后在后台调用：先按磁盘重扫；只有索引真的变了，
     才清封面缓存、预热并换新的封面版本。没变化就完全不动界面。 */
  if (pathname === "/api/covers/refresh" && req.method === "POST") {
    try {
      const force = url.searchParams.get("force") === "1";
      const scans = [];
      const failures = [];
      const changedRoots = new Set();
      for (const root of lib.listRoots()) {
        try {
          const result = await scanAndBump(root.id);
          if (result.changed) changedRoots.add(Number(root.id));
          scans.push({ rootId: root.id, ...result });
        } catch (err) {
          failures.push({
            rootId: root.id,
            path: root.path,
            error: String(err.message || err),
          });
        }
      }
      const rootId = activeRootId();
      const activeChanged = force || changedRoots.has(Number(rootId));
      if (!activeChanged) {
        return json(res, {
          changed: false,
          scans,
          failures,
          covers: 0,
          cleared: 0,
          warmed: 0,
          state: state(),
        });
      }
      const coverIds = [
        ...new Set(
          lib
            .getTree(activeRootId())
            .albums.flatMap((album) => album.coverIds || []),
        ),
      ];
      const cleared = lib.dropItemCaches(coverIds);
      await warmCoverThumbs(coverIds);
      /* 等封面都生成好再换版本号，别的窗口轮询到新号时缓存已经就绪。 */
      if (force && !changedRoots.has(Number(rootId))) bumpRootRevision(rootId);
      nextCoverEpoch();
      return json(res, {
        changed: true,
        scans,
        failures,
        covers: coverIds.length,
        cleared,
        warmed: coverIds.length * 2,
        state: state(),
      });
    } catch (err) {
      return fail(res, "刷新封面失败：" + err.message, 500);
    }
  }

  /* 拖动相簿排序：只改界面里的顺序，不动硬盘上的文件夹 */
  if (pathname === "/api/albums/order" && req.method === "POST") {
    const body = await readBody(req);
    try {
      const ids = lib.setAlbumOrder(body.ids);
      return json(res, { ok: true, ids, state: state() });
    } catch (err) {
      return fail(res, err.message);
    }
  }

  if (pathname === "/api/undo" && req.method === "GET")
    return json(res, undoInfo());

  if (pathname === "/api/undo" && req.method === "POST") {
    const op = undoStack[undoStack.length - 1];
    if (!op) return fail(res, "没有可以撤销的操作", 409);

    try {
      let result = null;
      if (op.kind === "dissolve-album") {
        result = lib.restoreDissolvedAlbum(op.snapshot);
        bumpActiveRootRevision();
        undoStack.pop();
      } else if (op.kind === "move") {
        result = lib.restoreLogicalMove(op.before);
        if (!result.ok) {
          return fail(res, "没能撤销这次移动", 409);
        }
        undoStack.pop();
      } else if (op.kind === "restore") {
        result = await lib.trashItems(op.ids);
        if (!result.ok) {
          return fail(res, "没能撤销恢复：文件可能正被别的程序打开着", 409);
        }
        undoStack.pop();
      } else if (op.kind === "trash-items") {
        result = await lib.restoreItems(op.ids);
        if (!result.ok) {
          return fail(
            res,
            "没能从最近删除恢复：文件可能正被别的程序打开着",
            409,
          );
        }
        undoStack.pop();
      } else if (op.kind === "add-to-album") {
        /* 撤销时只拿掉这次新增的关联；原文件和其他相簿都不动。 */
        if (!lib.getAlbum(op.albumId)) {
          result = { removed: 0, skipped: op.ids.length, failed: [], ids: [] };
        } else {
          result = lib.removeItemsFromAlbum(op.ids, op.albumId);
          if (result.removed) bumpActiveRootRevision();
        }
        undoStack.pop();
      } else if (op.kind === "location") {
        result = lib.restoreItemsLocationOverrides(op.snapshots);
        if (result.ids.length) bumpActiveRootRevision();
        undoStack.pop();
      } else {
        undoStack.pop();
        return fail(res, "这个撤销记录已经过时了", 409);
      }

      let warning = "";
      if (op.kind !== "dissolve-album" && op.kind !== "location") {
        try {
          for (const rootId of op.roots || []) await scanAndBump(rootId);
        } catch (err) {
          warning = `，但重新扫描没完成：${err.message}`;
        }
      }
      return json(res, {
        undone: true,
        kind: op.kind,
        label: op.label,
        result,
        warning,
        canUndo: undoInfo().count > 0,
        state: state(),
      });
    } catch (err) {
      return fail(res, `没能撤销：${err.message}`, 409);
    }
  }

  if (pathname === "/api/pick-folder" && req.method === "POST") {
    const picked = await folderPicker();
    return json(res, { path: picked || null });
  }

  if (pathname === "/api/roots" && req.method === "POST") {
    const body = await readBody(req);
    const target = String(body.path || "").trim();
    if (!target) return fail(res, "没有选择文件夹");
    if (!fs.existsSync(target)) return fail(res, "文件夹不存在：" + target);
    const previousRoots = lib.listRoots();
    const normalized = path.resolve(target).toLowerCase();
    const existing = previousRoots.find(
      (root) => path.resolve(root.path).toLowerCase() === normalized,
    );
    try {
      const root = lib.addRoot(target);
      const background = body.background === true;
      if (background) {
        const scan = scanAndBump(root.id);
        scan.catch((err) =>
          console.error("[后台导入失败]", err.message || String(err)),
        );
        setActiveRoot(root.id);
        return json(res, {
          root,
          result: null,
          created: !existing,
          background: true,
          state: state(),
        });
      }
      const result = await scanAndBump(root.id);
      setActiveRoot(root.id);
      return json(res, {
        root,
        result,
        created: !existing,
        state: state(),
      });
    } catch (err) {
      return fail(res, err.message);
    }
  }

  if (parts[1] === "edit" && parts[2] === "source" && parts[3]) {
    const item = lib.getItem(Number(parts[3]));
    if (!item || !["photo", "video"].includes(item.kind)) {
      return fail(res, "项目不存在", 404);
    }
    if (!(await edits.canEditItem(item)))
      return fail(res, "这个格式不可编辑", 415);
    const file = await thumbs.editSource(item);
    if (!file) return fail(res, "这个格式暂时无法读取", 415);
    return sendFile(req, res, file);
  }

  if (parts[1] === "edit" && parts[2] === "video-source" && parts[3]) {
    const item = lib.getItem(Number(parts[3]));
    if (!item || item.kind !== "video") return fail(res, "视频不存在", 404);
    if (!(await edits.canEditItem(item)))
      return fail(res, "这个视频不可编辑", 415);
    return sendFile(req, res, item.path);
  }

  if (parts[1] === "edit" && parts[2] && !parts[3]) {
    const item = lib.getItem(Number(parts[2]));
    if (!item || !["photo", "video"].includes(item.kind)) {
      return fail(res, "项目不存在", 404);
    }
    if (!(await edits.canEditItem(item))) {
      return json(
        res,
        {
          editable: false,
          error: "这个格式不可编辑",
          itemId: item.id,
        },
        409,
      );
    }
    const geometryOnly =
      item.kind === "video" || edits.isRawExtension(item.path);
    if (req.method === "GET" && geometryOnly) {
      const source = await thumbs.editSource(item);
      if (!source) {
        return json(
          res,
          {
            editable: false,
            error:
              item.kind === "video"
                ? "这个视频暂时无法生成裁剪预览"
                : "这个 RAW 里没有可用的内嵌预览，暂时无法裁剪",
            itemId: item.id,
          },
          409,
        );
      }
    }
    if (req.method === "GET") {
      const edit = lib.getItemEdit(item.id);
      const videoPoster =
        item.kind === "video" ? lib.getVideoPoster(item.id) : null;
      return json(res, {
        editable: true,
        editingMode: geometryOnly ? "crop" : "full",
        itemId: item.id,
        recipe: edit?.recipe || edits.normalizeRecipe(null),
        revision: edit?.revision || 0,
        updatedAt: edit?.updatedAt || 0,
        videoPoster,
      });
    }
    if (req.method === "PUT") {
      try {
        const body = await readBody(req);
        const recipe = edits.normalizeRecipe(body.recipe || body);
        if (item.kind === "video") {
          edits.ADJUSTMENT_KEYS.forEach((key) => {
            recipe.adjustments[key] = 0;
          });
        }
        const hasVideoPosterChange = Object.prototype.hasOwnProperty.call(
          body,
          "videoPoster",
        );
        const result =
          item.kind === "video"
            ? lib.setItemEditAndVideoPoster(
                item.id,
                recipe,
                hasVideoPosterChange ? body.videoPoster : undefined,
              )
            : lib.setItemEdit(item.id, recipe);
        thumbs.dropEditedCaches(item.id);
        thumbs.dropPhotoWallThumbs(item.id);
        thumbs.dropMasonryWallThumbs(item.id);
        return json(res, {
          editable: true,
          editingMode: geometryOnly ? "crop" : "full",
          itemId: item.id,
          ...result,
        });
      } catch (err) {
        return fail(res, err.message);
      }
    }
    if (req.method === "DELETE") {
      const result = lib.deleteItemEdit(item.id);
      thumbs.dropEditedCaches(item.id);
      thumbs.dropPhotoWallThumbs(item.id);
      thumbs.dropMasonryWallThumbs(item.id);
      const videoPoster =
        item.kind === "video" ? lib.getVideoPoster(item.id) : null;
      return json(res, {
        editable: true,
        editingMode: geometryOnly ? "crop" : "full",
        itemId: item.id,
        ...result,
        videoPoster,
      });
    }
  }

  /* 用户确认把当前根目录里的一个新文件夹快照成软件相簿。 */
  if (
    parts[1] === "roots" &&
    parts[2] &&
    parts[3] === "folders" &&
    (parts[4] === "import" || parts[4] === "dismiss") &&
    req.method === "POST"
  ) {
    const body = await readBody(req);
    if (Number(parts[2]) !== Number(activeRootId())) {
      return fail(res, "根目录已经切换，请重新操作", 409);
    }
    try {
      const result = await lib.importExternalFolder(
        Number(parts[2]),
        body.path,
        { dismiss: parts[4] === "dismiss" },
      );
      bumpActiveRootRevision();
      nextCoverEpoch();
      return json(res, { result, state: state() });
    } catch (err) {
      return fail(res, err.message);
    }
  }

  if (parts[1] === "roots" && parts.length >= 3) {
    const rootId = Number(parts[2]);
    const root = lib.listRoots().find((entry) => Number(entry.id) === rootId);
    if (!root) return fail(res, "根目录不存在", 404);
    if (req.method === "POST" && parts[3] === "activate") {
      if (!rootIsAvailable(root)) {
        return fail(res, "这个根目录暂时无法访问：" + root.path, 409);
      }
      try {
        /* 切换必须先完成一次磁盘扫描，再返回新索引；
           否则前端会立刻载入旧图库，看不到切换期间或监听遗漏的新入库。 */
        const result = await scanAndBump(root.id);
        clearUndo();
        setActiveRoot(root.id);
        return json(res, { root, result, state: state() });
      } catch (err) {
        return fail(res, "刷新图库失败：" + err.message);
      }
    }
    if (req.method === "DELETE") {
      const wasActive = Number(activeRootId()) === rootId;
      unwatchRoot(rootId);
      lib.removeRoot(rootId);
      if (wasActive) {
        const next = lib.listRoots()[0];
        if (next) setActiveRoot(next.id);
        else {
          try {
            lib.setMeta("active_root_id", "");
          } catch {}
        }
      }
      nextCoverEpoch();
      clearUndo();
      return json(res, { ok: true, state: state() });
    }
    /* 在根文件夹里新建一个一级相簿（= 新建文件夹） */
    if (req.method === "POST" && parts[3] === "create") {
      const body = await readBody(req);
      try {
        const kind = body.kind === "folder" ? "folder" : "album";
        const album = lib.createRootAlbum(rootId, body.name);
        lib.setAlbumKind(album.id, kind);
        lib.appendAlbumToEnd(album.id);
        bumpActiveRootRevision();
        return json(res, {
          album: { id: album.id, name: album.name, path: album.path },
          folder: album.path,
          state: state(),
        });
      } catch (err) {
        return fail(res, err.message);
      }
    }
  }

  /* 前端每隔两秒问一次：号变了就说明磁盘上有更新，该刷新界面了 */
  if (pathname === "/api/revision") {
    const rootId = activeRootId();
    return json(res, {
      rev: getRootRevision(rootId),
      rootId,
      scanning: !!lib.getScanState(rootId).running,
    });
  }

  /* 给选中的项目加 / 取消收藏标记：项目仍留在原相簿，收藏栏只是另一个视图。 */
  if (pathname === "/api/items/favorite" && req.method === "POST") {
    const body = await readBody(req);
    const ids = (Array.isArray(body.ids) ? body.ids : [])
      .map(Number)
      .filter((n) => Number.isFinite(n));
    if (!ids.length) return fail(res, "没有选中任何东西");
    try {
      const favorite = body.favorite !== false;
      const result = lib.setItemsFavorite(ids, favorite);
      if (result.changed) bumpActiveRootRevision();
      return json(res, { ...result, favorite, state: state() });
    } catch (err) {
      return fail(res, err.message);
    }
  }

  /* 给查看器里的五角星评分写入本地索引；0 可清除评分。 */
  if (pathname === "/api/items/rating" && req.method === "POST") {
    const body = await readBody(req);
    const ids = (Array.isArray(body.ids) ? body.ids : [])
      .map(Number)
      .filter((n) => Number.isInteger(n));
    if (!ids.length) return fail(res, "没有选中任何照片");
    try {
      const result = lib.setItemsRating(ids, body.rating);
      if (result.changed) bumpActiveRootRevision();
      return json(res, { ...result, state: state() });
    } catch (err) {
      return fail(res, err.message);
    }
  }

  /* 调整拍摄时间：写回原文件的 EXIF / 视频创建时间，再同步索引。 */
  if (pathname === "/api/items/date" && req.method === "POST") {
    const body = await readBody(req);
    const ids = (Array.isArray(body.ids) ? body.ids : [])
      .map(Number)
      .filter((n) => Number.isFinite(n));
    if (!ids.length) return fail(res, "没有选中任何东西");
    try {
      const result = await lib.setItemsTakenAt(ids, body.takenAt);
      if (!result.ids.length) {
        const detail = result.failed[0]?.reason;
        return fail(
          res,
          detail ? `没能写入拍摄时间：${detail}` : "没能写入拍摄时间",
        );
      }
      bumpActiveRootRevision();
      return json(res, { ...result, state: state() });
    } catch (err) {
      return fail(res, err.message);
    }
  }

  /* 清除软件内拍摄时间覆盖值，恢复索引中保存的原始拍摄时间。 */
  if (pathname === "/api/items/restore-date" && req.method === "POST") {
    const body = await readBody(req);
    const ids = (Array.isArray(body.ids) ? body.ids : [])
      .map(Number)
      .filter((n) => Number.isFinite(n));
    if (!ids.length) return fail(res, "没有选中任何东西");
    try {
      const result = lib.restoreItemsTakenAt(ids);
      if (!result.ids.length) {
        const detail = result.failed[0]?.reason;
        return fail(res, detail || "所选项目没有在软件内修改过的拍摄时间");
      }
      bumpActiveRootRevision();
      return json(res, { ...result, state: state() });
    } catch (err) {
      return fail(res, err.message);
    }
  }

  /* 拍摄时间编号：每张照片使用不同的软件内有效时间，不写原文件 EXIF。 */
  if (pathname === "/api/items/number-times" && req.method === "POST") {
    const body = await readBody(req);
    try {
      const result = lib.setItemsTakenTimes(body.dates);
      if (!result.ids.length) {
        const detail = result.failed[0]?.reason;
        return fail(
          res,
          detail ? `没能写入拍摄时间：${detail}` : "没能写入拍摄时间",
        );
      }
      bumpActiveRootRevision();
      return json(res, { ...result, state: state() });
    } catch (err) {
      return fail(res, err.message);
    }
  }

  /* 文件名编号：在规定的主文件名后保留原扩展名，并在原相簿目录内安全改名。 */
  if (pathname === "/api/items/rename-numbered" && req.method === "POST") {
    const body = await readBody(req);
    try {
      const result = await lib.renameItemsToBaseNames(body.entries);
      if (!result.renamed) return fail(res, "没有文件被改名");
      bumpActiveRootRevision();
      return json(res, { ...result, state: state() });
    } catch (err) {
      return fail(res, err.message);
    }
  }

  /* 批量调整拍摄设备：只写软件覆盖层，导出副本时才写 EXIF。 */
  if (pathname === "/api/items/camera" && req.method === "POST") {
    const body = await readBody(req);
    const ids = (Array.isArray(body.ids) ? body.ids : [])
      .map(Number)
      .filter((n) => Number.isFinite(n));
    if (!ids.length) return fail(res, "没有选中任何东西");
    try {
      const result = lib.setItemsCamera(ids, body.deviceId || null);
      if (!result.ids.length) {
        const detail = result.failed[0]?.reason;
        return fail(
          res,
          detail ? `没能修改拍摄设备：${detail}` : "没能修改拍摄设备",
        );
      }
      bumpActiveRootRevision();
      return json(res, { ...result, state: state() });
    } catch (err) {
      return fail(res, err.message);
    }
  }

  /* 位置信息只保存到 Album 覆盖层，不修改磁盘原文件的 EXIF。 */
  if (pathname === "/api/items/location" && req.method === "POST") {
    const body = await readBody(req);
    const ids = (Array.isArray(body.ids) ? body.ids : [])
      .map(Number)
      .filter((n) => Number.isFinite(n));
    if (!ids.length) return fail(res, "没有选中任何东西");
    try {
      const snapshots = ids.map((id) => ({
        id,
        overrides: lib.getItemMetadataOverrides(id),
      }));
      const roots = [
        ...new Set(ids.map((id) => lib.getItem(id)?.root_id).filter(Boolean)),
      ];
      const result = lib.setItemsLocation(ids, {
        locationName: body.locationName,
        lat: body.lat,
        lon: body.lon,
      });
      if (!result.ids.length) {
        const detail = result.failed[0]?.reason;
        return fail(res, detail ? `没能保存位置：${detail}` : "没能保存位置");
      }
      pushUndo({
        kind: "location",
        label: "调整照片位置",
        snapshots: snapshots.filter((entry) => result.ids.includes(entry.id)),
        roots,
      });
      bumpActiveRootRevision();
      return json(res, { ...result, state: state() });
    } catch (err) {
      return fail(res, err.message);
    }
  }

  /* 清除软件内 GPS / 地点名称覆盖值，重新显示磁盘中的原始位置。 */
  if (pathname === "/api/items/restore-location" && req.method === "POST") {
    const body = await readBody(req);
    const ids = (Array.isArray(body.ids) ? body.ids : [])
      .map(Number)
      .filter((n) => Number.isFinite(n));
    if (!ids.length) return fail(res, "没有选中任何东西");
    try {
      const result = await withoutItemRootWatchers(ids, () =>
        lib.restoreItemsLocation(ids),
      );
      if (!result.ids.length) {
        const detail = result.failed[0]?.reason;
        return fail(res, detail || "所选项目没有在软件内修改过的位置");
      }
      bumpActiveRootRevision();
      return json(res, { ...result, state: state() });
    } catch (err) {
      return fail(res, err.message);
    }
  }

  /* 把选中的项目标成最近删除；磁盘文件保留。 */
  if (pathname === "/api/items/trash" && req.method === "POST") {
    const body = await readBody(req);
    const ids = (Array.isArray(body.ids) ? body.ids : [])
      .map(Number)
      .filter((n) => Number.isFinite(n));
    if (!ids.length) return fail(res, "没有选中任何东西");
    const roots = new Set(
      ids.map((id) => (lib.getItem(id) || {}).root_id).filter(Boolean),
    );
    const result = await lib.trashItems(ids);
    for (const rootId of roots) await scanAndBump(rootId);
    /* 一个都没挪动 = 基本是文件被别的程序占着（比如缩略图刚读过），
       这种情况必须报出来，不能让界面以为删成功了 */
    if (!result.ok)
      return fail(res, "没能删掉：这些文件可能正被别的程序打开着，稍后再试");
    pushUndo({
      kind: "trash-items",
      label: `删除 ${result.ok} 个文件`,
      ids: result.ids,
      roots: [...roots],
    });
    return json(res, {
      trashed: result.ok,
      failed: result.failed,
      state: state(),
    });
  }

  /* 「最近删除」里的东西 */
  if (pathname === "/api/trash" && req.method === "GET") {
    const rootId = activeRootId();
    return json(res, {
      items: lib.listTrash(rootId),
      albums: lib.listTrashedAlbums(rootId),
      count: lib.countTrash(rootId),
    });
  }

  /* 最近删除里的相簿封面：文件仍在回收站目录中，按保存的原始选择生成缩略图。 */
  if (parts[1] === "trash-album-cover" && parts[2] && parts[3] != null) {
    const cover = lib.getTrashedAlbumCover(Number(parts[2]), Number(parts[3]));
    if (!cover) return fail(res, "相簿封面已不存在", 404);
    const size = Number(url.searchParams.get("size") || 400);
    const fit =
      url.searchParams.get("fit") || (size >= 1600 ? "inside" : "cover");
    const file = await thumbs.ensureThumb(
      {
        id: `trash-album-${parts[2]}-${parts[3]}-${cover.deletedAt}`,
        path: cover.path,
        kind: cover.kind,
      },
      size,
      fit,
    );
    if (!file) return fail(res, "这个格式暂时做不出缩略图", 415);
    return sendFile(req, res, file, { cache: true });
  }

  /* 从「最近删除」还原选中的照片、视频或整个相簿 */
  if (pathname === "/api/trash/restore" && req.method === "POST") {
    const body = await readBody(req);
    const ids = (Array.isArray(body.ids) ? body.ids : [])
      .map(Number)
      .filter((n) => Number.isFinite(n));
    const albumIds = (Array.isArray(body.albumIds) ? body.albumIds : [])
      .map(Number)
      .filter((n) => Number.isFinite(n));
    if (!ids.length && !albumIds.length) return fail(res, "没有选中任何东西");
    const roots = new Set(
      ids.map((id) => (lib.getItem(id) || {}).root_id).filter(Boolean),
    );
    const result = ids.length
      ? await lib.restoreItems(ids)
      : { ok: 0, ids: [], failed: [] };
    const albumResult = albumIds.length
      ? await lib.restoreTrashAlbums(albumIds)
      : { ok: 0, items: [], roots: [], failed: [] };
    for (const rootId of albumResult.roots) roots.add(rootId);
    for (const rootId of roots) await scanAndBump(rootId);
    applyRestoredAlbumOrders(albumResult.items);
    const failure = result.failed[0] || albumResult.failed[0];
    const failureReason = failure
      ? failure.reason || "文件可能正被别的程序打开着"
      : "";
    if (result.ok) {
      pushUndo({
        kind: "restore",
        label: `恢复 ${result.ok} 个文件`,
        ids: result.ids,
        roots: [...roots],
      });
    }
    return json(res, {
      restored: result.ok,
      restoredAlbums: albumResult.ok,
      failed: result.failed,
      failedAlbums: albumResult.failed,
      failureReason,
      state: state(),
    });
  }

  /* 从「最近删除」里彻底删除照片、视频或相簿集合。
     相簿集合只做永久隐藏：文件夹和照片留在原处，照片继续在图库。 */
  if (pathname === "/api/trash/delete" && req.method === "POST") {
    const body = await readBody(req);
    const ids = (Array.isArray(body.ids) ? body.ids : [])
      .map(Number)
      .filter((n) => Number.isFinite(n));
    const albumIds = (Array.isArray(body.albumIds) ? body.albumIds : [])
      .map(Number)
      .filter((n) => Number.isFinite(n));
    if (!ids.length && !albumIds.length) return fail(res, "没有选中任何东西");
    const result = ids.length
      ? await lib.deleteTrashItems(ids)
      : { ok: 0, failed: [] };
    const albumResult = albumIds.length
      ? await lib.deleteTrashAlbums(albumIds)
      : { ok: 0, ids: [], roots: [], failed: [] };
    if (result.ok || albumResult.ok) bumpActiveRootRevision();
    const albumFailure = albumResult.failed[0];
    const failureReason = albumFailure
      ? albumFailure.reason || "相簿文件夹暂时无法移动"
      : result.failed.length
        ? "文件可能正被别的程序打开着"
        : "";
    return json(res, {
      deleted: result.ok,
      deletedAlbums: albumResult.ok,
      failed: result.failed,
      failedAlbums: albumResult.failed,
      failureReason,
      state: state(),
    });
  }

  /* 添加到相簿：只建立关联，文件不复制也不移动；目标已有同一项目 / 同内容项目时跳过。 */
  if (pathname === "/api/items/add-to-album" && req.method === "POST") {
    const body = await readBody(req);
    const ids = (Array.isArray(body.ids) ? body.ids : [])
      .map(Number)
      .filter((n) => Number.isFinite(n));
    const albumId = Number(body.albumId);
    if (!ids.length) return fail(res, "没有选中任何东西");
    const album = lib.getAlbum(albumId);
    if (!album) return fail(res, "相簿不存在", 404);
    try {
      const result = await lib.addItemsToAlbum(ids, albumId);
      if (result.added) {
        bumpActiveRootRevision();
        pushUndo({
          kind: "add-to-album",
          label: `把 ${result.added} 个项目添加到「${album.name}」`,
          ids: result.items.map((item) => item.id),
          albumId,
          roots: [album.root_id],
        });
      }
      return json(res, {
        result,
        album: { id: albumId, name: album.name },
        state: state(),
      });
    } catch (err) {
      return fail(res, err.message);
    }
  }

  /* 软件内移动：只改相簿关联，真实文件和所在文件夹都不变。 */
  if (pathname === "/api/items/move" && req.method === "POST") {
    const body = await readBody(req);
    const ids = (Array.isArray(body.ids) ? body.ids : [])
      .map(Number)
      .filter((n) => Number.isFinite(n));
    const albumId = Number(body.albumId);
    const sourceAlbumId = Number(body.sourceAlbumId);
    if (!ids.length) return fail(res, "没有选中任何东西");
    const album = lib.getAlbum(albumId);
    if (!album) return fail(res, "相簿不存在", 404);
    try {
      const result = lib.moveItemsToAlbum(
        ids,
        albumId,
        Number.isFinite(sourceAlbumId) && sourceAlbumId > 0
          ? sourceAlbumId
          : null,
      );
      if (!result.moved && result.failed.length) {
        return fail(res, `没能移动：${result.failed[0].reason}`);
      }
      if (result.moved) {
        bumpActiveRootRevision();
        pushUndo({
          kind: "move",
          label: `把 ${result.moved} 个项目移到「${album.name}」`,
          before: result.before,
          roots: [album.root_id],
        });
      }
      return json(res, {
        result,
        album: { id: album.id, name: album.name },
        state: state(),
      });
    } catch (err) {
      return fail(res, err.message);
    }
  }

  if (parts[1] === "albums" && parts[2]) {
    const albumId = Number(parts[2]);
    const album = lib.getAlbum(albumId);
    if (!album) return fail(res, "相簿不存在", 404);
    /* 在当前相簿里新建一个子相簿，不修改磁盘。 */
    if (parts[3] === "create" && req.method === "POST") {
      const body = await readBody(req);
      try {
        const kind = body.kind === "folder" ? "folder" : "album";
        const created = lib.createAlbum(albumId, body.name);
        lib.setAlbumKind(created.id, kind);
        lib.appendAlbumToEnd(created.id);
        bumpActiveRootRevision();
        return json(res, {
          album: { id: created.id, name: created.name, path: created.path },
          folder: created.path,
          state: state(),
        });
      } catch (err) {
        return fail(res, err.message);
      }
    }
    /* 重命名相簿：只改软件标题，不修改磁盘文件夹。 */
    if (parts[3] === "rename" && req.method === "POST") {
      const body = await readBody(req);
      try {
        const result = lib.renameAlbum(albumId, body.name);
        return json(res, {
          ...result,
          album: { id: album.id, name: result.name, path: result.newPath },
          state: state(),
        });
      } catch (err) {
        return fail(res, err.message);
      }
    }
    /* 从相簿中移除：只取消归类，不移动或删除文件。 */
    if (parts[3] === "remove-items" && req.method === "POST") {
      const body = await readBody(req);
      const ids = (Array.isArray(body.ids) ? body.ids : [])
        .map(Number)
        .filter((n) => Number.isFinite(n));
      if (!ids.length) return fail(res, "没有选中任何东西");
      try {
        const result = lib.removeItemsFromAlbum(ids, albumId);
        if (result.removed) bumpActiveRootRevision();
        return json(res, { result, state: state() });
      } catch (err) {
        return fail(res, err.message);
      }
    }
    /* 设为相簿封面：只改相簿自己的封面设置，不复制、不移动照片。 */
    if (parts[3] === "cover" && req.method === "POST") {
      const body = await readBody(req);
      try {
        const result = lib.setAlbumCover(albumId, body.itemId);
        await warmCoverThumbs([result.itemId]);
        bumpActiveRootRevision();
        return json(res, { result, state: state() });
      } catch (err) {
        return fail(res, err.message);
      }
    }
    /* 解散相簿：只删除集合，项目留在图库和其他相簿，子相簿提升。 */
    if (parts[3] === "trash" && req.method === "POST") {
      if (lib.isRootAlbum(albumId)) {
        return fail(res, "未归档不能解散");
      }
      try {
        const dissolved = lib.dissolveAlbum(albumId);
        bumpActiveRootRevision();
        nextCoverEpoch();
        pushUndo({
          kind: "dissolve-album",
          label: `解散相簿「${dissolved.name}」`,
          snapshot: dissolved,
          roots: [dissolved.rootId],
        });
        return json(res, {
          dissolved: {
            albumId: dissolved.albumId,
            rootId: dissolved.rootId,
            name: dissolved.name,
            promoted: dissolved.promoted,
          },
          state: state(),
        });
      } catch (err) {
        return fail(res, err.message);
      }
    }
    if (parts[3] === "items") {
      const limitValue = url.searchParams.get("limit");
      const requestedLimit = limitValue == null ? NaN : Number(limitValue);
      const limit = Number.isFinite(requestedLimit)
        ? Math.max(1, Math.min(100000, Math.floor(requestedLimit)))
        : 1000;
      const offsetValue = url.searchParams.get("offset");
      const requestedOffset = offsetValue == null ? 0 : Number(offsetValue);
      const offset = Number.isFinite(requestedOffset)
        ? Math.max(0, Math.floor(requestedOffset))
        : 0;
      const items = lib.getItems(albumId, { limit, offset }).map((it) => ({
        ...it,
        ext: path.extname(it.path).toLowerCase(),
        original: thumbs.canViewOriginal(it.path),
      }));
      return json(res, {
        album: { id: album.id, name: album.name, path: album.path },
        items,
      });
    }
    return json(res, { album });
  }

  if (parts[1] === "thumb" && parts[2]) {
    const item = lib.getItem(Number(parts[2]));
    if (!item) return fail(res, "照片不存在", 404);
    const size = Number(url.searchParams.get("size") || 400);
    /* fit=inside 时不做方形裁剪，保留照片原始宽高比（1600 这么大的一律不裁） */
    const fit =
      url.searchParams.get("fit") || (size >= 1600 ? "inside" : "cover");
    const file = await thumbs.ensureThumb(item, size, fit);
    if (!file) return fail(res, "这个格式暂时做不出缩略图", 415);
    return sendFile(req, res, file, { cache: true });
  }

  if (parts[1] === "photo-wall" && parts[2] === "thumb" && parts[3]) {
    const item = lib.getItem(Number(parts[3]));
    if (!item || item.kind !== "photo") return fail(res, "照片不存在", 404);
    const size = Number(url.searchParams.get("size") || 600);
    const crop = lib.getPhotoWallCrop(item.id);
    const file = await thumbs.ensurePhotoWallThumb(item, size, crop);
    if (!file) return fail(res, "这个格式暂时做不出照片墙缩略图", 415);
    return sendFile(req, res, file, { cache: true });
  }

  if (parts[1] === "masonry-wall" && parts[2] === "thumb" && parts[3]) {
    const item = lib.getItem(Number(parts[3]));
    if (!item || item.kind !== "photo") return fail(res, "照片不存在", 404);
    const size = Number(url.searchParams.get("size") || 800);
    const crop = lib.getMasonryWallCrop(item.id);
    const file = await thumbs.ensureMasonryWallThumb(item, size, crop);
    if (!file) return fail(res, "这个格式暂时做不出纵向画廊缩略图", 415);
    return sendFile(req, res, file, { cache: true });
  }

  if (parts[1] === "filmroll-wall" && parts[2] === "thumb" && parts[3]) {
    const item = lib.getItem(Number(parts[3]));
    if (!item || item.kind !== "photo") return fail(res, "照片不存在", 404);
    const size = Number(url.searchParams.get("size") || 900);
    const crop = lib.getFilmrollWallCrop(item.id);
    const file = await thumbs.ensureFilmrollWallThumb(item, size, crop);
    if (!file) return fail(res, "这个格式暂时做不出横向胶卷缩略图", 415);
    return sendFile(req, res, file, { cache: true });
  }

  if (parts[1] === "mosaic-wall" && parts[2] === "thumb" && parts[3]) {
    const item = lib.getItem(Number(parts[3]));
    if (!item || item.kind !== "photo") return fail(res, "照片不存在", 404);
    const size = Number(url.searchParams.get("size") || 1200);
    const crop = lib.getMosaicWallCrop(item.id);
    const file = await thumbs.ensureMosaicWallThumb(item, size, crop);
    if (!file) return fail(res, "这个格式暂时做不出嵌合拼图缩略图", 415);
    return sendFile(req, res, file, { cache: true });
  }

  if (parts[1] === "opening" && parts[2]) {
    const item = lib.getItem(Number(parts[2]));
    if (!item) return fail(res, "视频不存在", 404);
    if (item.kind !== "video") return fail(res, "这不是视频", 400);
    const file = await thumbs.videoOpeningPoster(item);
    if (!file) return fail(res, "这个视频暂时抽不出开场画面", 415);
    /* URL 已经带视频修改时间；仍然要求浏览器校验，避免服务端封面被
       重建后，用户继续命中同一地址的旧磁盘缓存。 */
    return sendFile(req, res, file);
  }

  if (parts[1] === "file" && parts[2]) {
    const item = lib.getItem(Number(parts[2]));
    if (!item) return fail(res, "文件不存在", 404);
    const file =
      item.kind === "video" ? await thumbs.viewableFile(item) : item.path;
    if (!file) return fail(res, "这个视频暂时无法播放", 415);
    return sendFile(req, res, file);
  }

  /* 查看大图：能直接显示就给原图，HEIC/RAW 这类自动转成 JPEG 再给 */
  if (parts[1] === "view" && parts[2]) {
    const item = lib.getItem(Number(parts[2]));
    if (!item) return fail(res, "文件不存在", 404);
    const file = await thumbs.viewableFile(item);
    if (!file) return fail(res, "这个格式没法在浏览器里显示", 415);
    return sendFile(req, res, file);
  }

  /* 浏览器播不了的视频（比如 HEVC 编码的 MOV），交给系统默认播放器打开 */
  if (parts[1] === "open" && parts[2] && req.method === "POST") {
    const item = lib.getItem(Number(parts[2]));
    if (!item) return fail(res, "文件不存在", 404);
    if (!fs.existsSync(item.path)) return fail(res, "文件已不在磁盘上", 410);
    require("node:child_process").execFile("explorer.exe", [item.path], {
      windowsHide: true,
    });
    return json(res, { ok: true });
  }

  /* 文件路径按钮：打开所在文件夹，并在资源管理器中选中这一项。 */
  if (parts[1] === "reveal" && parts[2] && req.method === "POST") {
    const item = lib.getItem(Number(parts[2]));
    if (!item) return fail(res, "文件不存在", 404);
    if (!fs.existsSync(item.path)) return fail(res, "文件已不在磁盘上", 410);
    const explorer = require("node:child_process").spawn(
      "explorer.exe",
      [`/select,${item.path}`],
      { detached: true, stdio: "ignore" },
    );
    explorer.unref();
    return json(res, { ok: true });
  }

  return fail(res, "未知接口 " + pathname, 404);
}

function handleStatic(req, res, url) {
  let rel;
  try {
    rel = decodeURIComponent(url.pathname);
  } catch {
    return fail(res, "非法路径", 400);
  }
  if (rel === "/") rel = "/index.html";
  const safe = path.normalize(rel).replace(/^([/\\])+/, "");
  const filePath = path.resolve(WEB_DIR, safe);
  const relative = path.relative(WEB_DIR, filePath);
  if (relative.startsWith("..") || path.isAbsolute(relative)) {
    return fail(res, "非法路径", 403);
  }
  if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
    return fail(res, "没有这个文件 " + rel, 404);
  }
  return sendFile(req, res, filePath);
}

const server = http.createServer(async (req, res) => {
  try {
    assertLocalRequest(req);
    const url = new URL(req.url, `http://${req.headers.host || "127.0.0.1"}`);
    if (url.pathname.startsWith("/api/")) return await handleApi(req, res, url);
    return handleStatic(req, res, url);
  } catch (err) {
    console.error("[错误]", err);
    if (!res.headersSent)
      return fail(
        res,
        String(err && err.message ? err.message : err),
        Number(err?.status) || 500,
      );
    return res.end();
  }
});

const ADDRESS = `http://127.0.0.1:${PORT}`;

function openBrowser(address = ADDRESS) {
  const { execFile, spawn } = require("node:child_process");
  const launcher = path.join(__dirname, "..", "打开相簿.vbs");
  if (process.platform === "win32" && fs.existsSync(launcher)) {
    /* 统一走无窗口启动入口：由它计算居中位置、使用专用浏览器配置并打开应用窗口。 */
    const child = spawn("wscript.exe", [launcher], {
      detached: true,
      stdio: "ignore",
      windowsHide: true,
    });
    child.unref();
    return;
  }
  /* 没装 Edge / Chrome 时退回默认浏览器。 */
  execFile("explorer.exe", [address], { windowsHide: true });
}

/**
 * 启动本地服务。Electron 用 port: 0 让系统挑一个空闲端口；
 * 命令行模式仍然固定 4599，保持原来的使用方式。
 */
function start({ port = PORT, open = false } = {}) {
  return new Promise((resolve, reject) => {
    const onError = (err) => {
      server.off("listening", onListening);
      reject(err);
    };
    const onListening = () => {
      server.off("error", onError);
      const actualPort = server.address().port;
      const address = `http://127.0.0.1:${actualPort}`;
      console.log(`Fotora 已启动： ${address}`);
      console.log(`数据目录： ${lib.DATA_DIR}`);
      console.log("关掉这个窗口就是关闭相簿。");
      /* 只监听当前图库；其他图库在切换时先完整扫描，再成为监听目标。 */
      const currentRoot = activeRoot();
      if (currentRoot) watchRoot(currentRoot);
      if (open) openBrowser(address);
      resolve({ server, port: actualPort, address, stop });
    };
    server.once("error", onError);
    server.once("listening", onListening);
    server.listen(port, "127.0.0.1");
  });
}

function stop() {
  for (const rootId of [...watchers.keys()]) unwatchRoot(rootId);
  for (const rootId of [...watchTimers.keys()]) {
    clearTimeout(watchTimers.get(rootId));
    watchTimers.delete(rootId);
  }
  for (const rootId of [...watchRetryTimers.keys()]) clearWatchRetry(rootId);
  if (!server.listening) return Promise.resolve();
  return new Promise((resolve) => {
    server.close(() => resolve());
    server.closeAllConnections?.();
  });
}

if (require.main === module) {
  start({ open: process.argv.includes("--open") }).catch((err) => {
    /* 端口被占 = 相簿已经在跑了，那就别再起一个，直接把应用窗口打开即可 */
    if (err.code === "EADDRINUSE") {
      console.log(
        `Fotora 已经在运行了（${ADDRESS}），我直接帮你打开应用窗口。`,
      );
      console.log("如果想彻底重启：先关掉原来那个黑窗口，再运行这个。");
      openBrowser();
      process.exit(0);
    }
    console.error("启动失败：", err.message);
    process.exit(1);
  });
}

module.exports = {
  start,
  stop,
  setFolderPicker,
  setWindowController,
};
