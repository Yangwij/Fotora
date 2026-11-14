"use strict";

/**
 * Fotora 的 Electron 外壳：把原来的本地服务跑在主进程里，
 * 用系统原生窗口装载界面。相簿、索引、缩略图和 ffmpeg 仍然沿用原来的实现。
 */
const fs = require("node:fs");
const path = require("node:path");
const { Blob } = require("node:buffer");
const { pathToFileURL } = require("node:url");
const {
  app,
  BrowserWindow,
  Menu,
  Tray,
  dialog,
  shell,
  ipcMain,
  clipboard,
  ClipboardItem,
  session,
  nativeTheme,
  nativeImage,
  globalShortcut,
} = require("electron");
const sharp = require("sharp");

/* 项目区预览与查看器允许视频在用户打开项目后直接带声音自动播放。 */
app.commandLine.appendSwitch("autoplay-policy", "no-user-gesture-required");
/* 安装包只携带中文语言包；显式固定，避免非中文系统尝试加载不存在的 locale。 */
app.commandLine.appendSwitch("lang", "zh-CN");

const PRODUCT = "Fotora";
const PRODUCT_SLUG = "fotora";
const LEGACY_DATA_FOLDERS = ["Photo", "Album"];
const DATA_FOLDER = "Fotora";
const APP_ID = "com.fotora.app";
const PERSISTENT_SETTINGS_VERSION = 2;
const DEFAULT_LIBRARY_TITLE = PRODUCT;
const DEV_ROOT = path.join(__dirname, "..");
const RESOURCE_ROOT = app.isPackaged ? process.resourcesPath : DEV_ROOT;

/* 正式安装版的数据放在本机应用数据目录，升级时不会丢。 */
const explicitBase =
  process.env.PHOTO_BASE_DIR || process.env.ALBUM_BASE_DIR
    ? path.resolve(process.env.PHOTO_BASE_DIR || process.env.ALBUM_BASE_DIR)
    : "";

/* 产品标识统一为 Fotora。旧的 Photo、Album 目录只作为一次性迁移来源：
   优先原子改名，失败时才复制，旧目录不主动删除。 */
function migrateLegacyDataDirectory(legacy, next) {
  if (
    legacy.toLowerCase() === next.toLowerCase() ||
    !fs.existsSync(legacy) ||
    fs.existsSync(next)
  ) {
    return next;
  }
  try {
    fs.renameSync(legacy, next);
  } catch {
    fs.cpSync(legacy, next, {
      recursive: true,
      errorOnExist: true,
      force: false,
    });
  }
  return next;
}

const appDataRoot = process.env.LOCALAPPDATA || app.getPath("appData");
let baseDir;
if (explicitBase) {
  baseDir = explicitBase;
} else {
  const next = path.join(appDataRoot, DATA_FOLDER);
  const legacy = LEGACY_DATA_FOLDERS.map((name) =>
    path.join(appDataRoot, name),
  ).find((candidate) => fs.existsSync(candidate));
  baseDir = legacy ? migrateLegacyDataDirectory(legacy, next) : next;
}
fs.mkdirSync(baseDir, { recursive: true });
app.setPath("userData", baseDir);

const dataDir =
  process.env.PHOTO_DATA || process.env.ALBUM_DATA
    ? path.resolve(process.env.PHOTO_DATA || process.env.ALBUM_DATA)
    : path.join(baseDir, "data");
process.env.PHOTO_DATA = dataDir;
/* 本地服务和旧脚本仍可读取旧变量；值已指向新的 Fotora 数据目录。 */
process.env.ALBUM_DATA = dataDir;
process.env.ALBEM_ELECTRON = "1";

const settingsFile = path.join(baseDir, "preferences.json");
const BOOLEAN_SETTING_KEYS = new Set([
  "hoverToolbarControls",
  "photoWallGlassBorder",
  "showPhotoWallControls",
  "showSlideshowControls",
  "showGlassBorder",
  "defaultOriginalRatio",
  "previewBlurEnabled",
  "trashHoverOnly",
  "showSettingsControl",
  "showUnfiledCard",
  "hideAllAlbumsCard",
  "showLibraryTimeline",
  "hideLibraryTimeButtons",
  "hideAlbumPhotoWall",
  "hideAlbumLocations",
  "hideImportLibraryButton",
  "hideLibrarySwitchButton",
  "hoverExpandSidebar",
  "transparentTitlebar",
  "titlebarBlur",
  "viewerEditHoverOnly",
  "viewerFilmstripEnabled",
  "showViewerFrame",
  "viewerFitEnabled",
  "videoLoopEnabled",
  "autoPlayNextVideoEnabled",
  "mutePreviewVideo",
  "mutePreviewLivePhoto",
  "mapNetworkEnabled",
  "showLocationSatellite",
  "showLocationMapButtons",
  "showLocationMapFilmstrip",
]);
const PHOTO_LAYOUT_MODES = new Set(["tile", "justified", "masonry"]);
const PHOTO_WALL_KINDS = new Set(["mosaic", "tile", "masonry", "filmroll"]);
const DEFAULT_OPEN_VIEWS = new Set(["library", "all"]);
const INTERFACE_NAME_KEYS = new Set([
  "library",
  "locations",
  "photoWall",
  "unfiled",
  "all",
]);
const MASONRY_WALL_CRUISE_DIRECTIONS = new Set(["up", "down"]);
const FILMSTRIP_POSITIONS = new Set(["top", "bottom", "left", "right"]);
const COLOR_MODES = new Set(["auto", "light", "dark"]);
const WINDOW_CONTROLS_STYLES = new Set(["windows", "macos", "hidden"]);
const CLOSE_WINDOW_BEHAVIORS = new Set(["quit", "tray"]);
const WINDOW_CONTROLS_BAR_HEIGHT = 32;
const THUMBNAIL_CORNER_STYLES = new Set(["rounded", "square"]);
const VIEWER_WHEEL_MODES = new Set(["navigate", "zoom", "zoom-navigate"]);
const VIEWER_PREVIEW_SIZES = new Set(["small", "medium", "large"]);
const LOCATION_FLIGHT_SPEEDS = new Set(["fast", "medium", "slow", "gentle"]);
const MAP_TILE_PROVIDERS = new Set(["amap", "google"]);
const WALLPAPER_CRUISE_SPEEDS = new Set(["fast", "medium", "slow"]);
const THEME_SOURCES = Object.freeze({
  auto: "system",
  light: "light",
  dark: "dark",
});

function readSettingsFile() {
  try {
    const parsed = JSON.parse(fs.readFileSync(settingsFile, "utf8"));
    return parsed && typeof parsed === "object" ? parsed : null;
  } catch {
    return null;
  }
}

function normalizeSettings(raw) {
  if (!raw || typeof raw !== "object") return null;
  const sourceVersion = Number.isInteger(raw.version) ? raw.version : 1;
  const normalized = { version: PERSISTENT_SETTINGS_VERSION };
  for (const key of BOOLEAN_SETTING_KEYS) {
    if (typeof raw[key] === "boolean") normalized[key] = raw[key];
  }
  if (normalized.transparentTitlebar === true) {
    normalized.titlebarBlur = false;
  } else if (normalized.titlebarBlur === true) {
    normalized.transparentTitlebar = false;
  }
  if (typeof raw.wallpaperCruiseChoice === "string") {
    normalized.wallpaperCruiseChoice = raw.wallpaperCruiseChoice.slice(0, 32);
  }
  const savedLibraryTitle =
    typeof raw.libraryTitle === "string"
      ? raw.libraryTitle.trim().slice(0, 60)
      : "";
  normalized.libraryTitle =
    sourceVersion < PERSISTENT_SETTINGS_VERSION &&
    savedLibraryTitle.toLowerCase() === "library"
      ? DEFAULT_LIBRARY_TITLE
      : savedLibraryTitle || DEFAULT_LIBRARY_TITLE;
  if (raw.interfaceNames && typeof raw.interfaceNames === "object") {
    normalized.interfaceNames = {};
    for (const key of INTERFACE_NAME_KEYS) {
      if (typeof raw.interfaceNames[key] === "string") {
        normalized.interfaceNames[key] = raw.interfaceNames[key]
          .trim()
          .slice(0, 60);
      }
    }
  }
  if (Number.isFinite(raw.wallpaperCruiseCustomSeconds)) {
    normalized.wallpaperCruiseCustomSeconds = Math.min(
      99,
      Math.max(10, Math.round(raw.wallpaperCruiseCustomSeconds)),
    );
  }
  if (WALLPAPER_CRUISE_SPEEDS.has(raw.wallpaperCruiseSpeed)) {
    normalized.wallpaperCruiseSpeed = raw.wallpaperCruiseSpeed;
  }
  if (MASONRY_WALL_CRUISE_DIRECTIONS.has(raw.masonryWallCruiseDirection)) {
    normalized.masonryWallCruiseDirection = raw.masonryWallCruiseDirection;
  }
  if (PHOTO_WALL_KINDS.has(raw.photoWallDefaultKind)) {
    normalized.photoWallDefaultKind = raw.photoWallDefaultKind;
  }
  if (DEFAULT_OPEN_VIEWS.has(raw.defaultOpenView)) {
    normalized.defaultOpenView = raw.defaultOpenView;
  }
  if (PHOTO_LAYOUT_MODES.has(raw.photoLayoutMode)) {
    normalized.photoLayoutMode = raw.photoLayoutMode;
  }
  if (FILMSTRIP_POSITIONS.has(raw.filmstripPosition)) {
    normalized.filmstripPosition = raw.filmstripPosition;
  }
  if (COLOR_MODES.has(raw.colorMode)) {
    normalized.colorMode = raw.colorMode;
  }
  if (WINDOW_CONTROLS_STYLES.has(raw.windowControlsStyle)) {
    normalized.windowControlsStyle = raw.windowControlsStyle;
  }
  normalized.closeWindowBehavior = CLOSE_WINDOW_BEHAVIORS.has(
    raw.closeWindowBehavior,
  )
    ? raw.closeWindowBehavior
    : "quit";
  if (THUMBNAIL_CORNER_STYLES.has(raw.thumbnailCornerStyle)) {
    normalized.thumbnailCornerStyle = raw.thumbnailCornerStyle;
  }
  if (VIEWER_WHEEL_MODES.has(raw.viewerWheelMode)) {
    normalized.viewerWheelMode = raw.viewerWheelMode;
  }
  normalized.viewerPreviewSize = VIEWER_PREVIEW_SIZES.has(raw.viewerPreviewSize)
    ? raw.viewerPreviewSize
    : "small";
  if (LOCATION_FLIGHT_SPEEDS.has(raw.locationFlightSpeed)) {
    normalized.locationFlightSpeed = raw.locationFlightSpeed;
  }
  normalized.mapTileProvider = MAP_TILE_PROVIDERS.has(raw.mapTileProvider)
    ? raw.mapTileProvider
    : "amap";
  return normalized;
}

function writeSettingsFile(raw) {
  const settings = normalizeSettings(raw);
  if (!settings) return { ok: false, error: "设置内容无效" };
  const tempFile = `${settingsFile}.${process.pid}.${Date.now()}.tmp`;
  try {
    fs.mkdirSync(path.dirname(settingsFile), { recursive: true });
    fs.writeFileSync(tempFile, `${JSON.stringify(settings, null, 2)}\n`, {
      encoding: "utf8",
      flush: true,
    });
    fs.renameSync(tempFile, settingsFile);
    return { ok: true };
  } catch (err) {
    try {
      fs.rmSync(tempFile, { force: true });
    } catch {}
    console.error("保存设置失败：", err);
    return { ok: false, error: String(err?.message || err) };
  }
}

function applyColorMode(mode) {
  nativeTheme.themeSource =
    THEME_SOURCES[COLOR_MODES.has(mode) ? mode : "auto"];
}

function applyLaunchAtLogin(enabled) {
  /* 开发预览不能把 electron.exe 注册成登录项。 */
  if (!app.isPackaged) return { ok: true, applied: false };
  try {
    app.setLoginItemSettings({ openAtLogin: enabled === true });
    return { ok: true, applied: true };
  } catch (err) {
    console.error("设置开机启动失败：", err);
    return { ok: false, error: String(err?.message || err) };
  }
}

let externalMapNetworkEnabled = readSettingsFile()?.mapNetworkEnabled !== false;

function isLocalRequest(url) {
  try {
    const hostname = new URL(url).hostname.toLowerCase();
    return (
      hostname === "127.0.0.1" || hostname === "localhost" || hostname === "::1"
    );
  } catch {
    return false;
  }
}

function isAllowedMapRequest(url) {
  try {
    const hostname = new URL(url).hostname.toLowerCase();
    return (
      hostname === "restapi.amap.com" ||
      hostname === "is.autonavi.com" ||
      hostname.endsWith(".is.autonavi.com") ||
      hostname.endsWith(".amap.com") ||
      hostname === "google.com" ||
      hostname.endsWith(".google.com") ||
      hostname === "googleapis.com" ||
      hostname.endsWith(".googleapis.com")
    );
  } catch {
    return false;
  }
}

function isAlbumMapFrameRequest(details) {
  try {
    return /\/map\/album-map\.html(?:$|[?#])/i.test(
      String(details?.referrer || ""),
    );
  } catch {
    return false;
  }
}

function isLocationsMapSearchRequest(details) {
  try {
    const url = new URL(details?.url || "");
    return (
      url.hostname.toLowerCase() === "restapi.amap.com" &&
      url.pathname === "/v3/place/text" &&
      /\/map\/locations\.html(?:$|[?#])/i.test(String(details?.referrer || ""))
    );
  } catch {
    return false;
  }
}

function installExternalNetworkGuard() {
  session.defaultSession.webRequest.onBeforeRequest(
    { urls: ["http://*/*", "https://*/*"] },
    (details, callback) => {
      const allowed =
        isLocalRequest(details.url) ||
        ((externalMapNetworkEnabled ||
          isAlbumMapFrameRequest(details) ||
          isLocationsMapSearchRequest(details)) &&
          isAllowedMapRequest(details.url));
      callback({ cancel: !allowed });
    },
  );
}

const ffmpeg = path.join(RESOURCE_ROOT, "vendor", "ffmpeg.exe");
if (fs.existsSync(ffmpeg)) process.env.FFMPEG_PATH = ffmpeg;

const bundledExiftool = path.join(RESOURCE_ROOT, "exiftool", "exiftool.exe");
const devExiftool = "D:\\ExifTool\\exiftool.exe";
if (fs.existsSync(bundledExiftool)) process.env.EXIFTOOL = bundledExiftool;
else if (!app.isPackaged && fs.existsSync(devExiftool))
  process.env.EXIFTOOL = devExiftool;

const bundledDnglab = app.isPackaged
  ? path.join(RESOURCE_ROOT, "dnglab", "dnglab.exe")
  : path.join(RESOURCE_ROOT, "vendor", "dnglab", "dnglab.exe");
if (fs.existsSync(bundledDnglab)) process.env.DNGLAB = bundledDnglab;

const serverApi = require("../server/index.js");
const lib = require("../server/library");
const thumbs = require("../server/thumbs");
const editModel = require("../server/edits");

app.setName(PRODUCT);
app.setAppUserModelId(APP_ID);

let mainWindow = null;
let tray = null;
let runningServer = null;
let shuttingDown = false;
let devWatcher = null;
let devReloadTimer = null;
let devReloadQuietUntil = 0;
let initialShowFallbackTimer = null;
let windowControlsStyleApplied = "hidden";
let rendererRecoveryTimer = null;
let rendererRecoveryAttempts = 0;
let rendererRecoveryStartedAt = 0;

function scheduleRendererRecovery(source, details) {
  if (
    shuttingDown ||
    !mainWindow ||
    mainWindow.isDestroyed() ||
    mainWindow.webContents.isDestroyed()
  )
    return;
  const now = Date.now();
  if (!rendererRecoveryStartedAt || now - rendererRecoveryStartedAt > 60000) {
    rendererRecoveryStartedAt = now;
    rendererRecoveryAttempts = 0;
  }
  if (rendererRecoveryAttempts >= 2 || rendererRecoveryTimer) return;
  rendererRecoveryAttempts += 1;
  console.error(
    `[窗口恢复] ${source}：`,
    details?.reason || details?.type || details || "",
  );
  rendererRecoveryTimer = setTimeout(() => {
    rendererRecoveryTimer = null;
    if (
      shuttingDown ||
      !mainWindow ||
      mainWindow.isDestroyed() ||
      mainWindow.webContents.isDestroyed()
    )
      return;
    /* 首次初始化 WebGL 失败时 Chromium 可能已经重启 GPU；重新装载主页面
       能接着使用新的图形上下文，不让用户面对一个已经退出的空白窗口。 */
    mainWindow.webContents.reload();
  }, 350);
}
let closeWindowBehavior = "quit";

function setWindowBoundsExact(target) {
  if (!mainWindow || mainWindow.isDestroyed()) return;
  mainWindow.setBounds(target);
  const actual = mainWindow.getBounds();
  const correction = {
    x: actual.x - target.x,
    y: actual.y - target.y,
    width: actual.width - target.width,
    height: actual.height - target.height,
  };
  if (correction.x || correction.y || correction.width || correction.height) {
    mainWindow.setBounds({
      x: target.x - correction.x,
      y: target.y - correction.y,
      width: target.width - correction.width,
      height: target.height - correction.height,
    });
  }
}

function setWindowControlsStyle(style) {
  if (!WINDOW_CONTROLS_STYLES.has(style)) return { ok: false };
  if (!mainWindow || mainWindow.isDestroyed()) {
    windowControlsStyleApplied = style;
    return { ok: false };
  }

  const nextBarHeight = style === "hidden" ? 0 : WINDOW_CONTROLS_BAR_HEIGHT;
  const currentBarHeight =
    windowControlsStyleApplied === "hidden" ? 0 : WINDOW_CONTROLS_BAR_HEIGHT;
  const delta = nextBarHeight - currentBarHeight;

  /* 窗口内容高度必须保持不变：增加控制栏时向屏幕上方长高，
     底边留在原处；收起控制栏时反向收回。 */
  if (delta && !mainWindow.isMaximized() && !mainWindow.isFullScreen()) {
    const bounds = mainWindow.getBounds();
    setWindowBoundsExact({
      x: bounds.x,
      y: bounds.y - delta,
      width: bounds.width,
      height: bounds.height + delta,
    });
  }
  windowControlsStyleApplied = style;
  return {
    ok: true,
    style,
    controlsBarHeight: nextBarHeight,
    bounds: mainWindow.getBounds(),
  };
}

function toggleWindowMaximize() {
  if (!mainWindow || mainWindow.isDestroyed()) return;
  if (mainWindow.isMaximized()) mainWindow.unmaximize();
  else mainWindow.maximize();
  return { ok: true, maximized: mainWindow.isMaximized() };
}

function toggleWindowFullscreen() {
  if (!mainWindow || mainWindow.isDestroyed()) return { ok: false };
  const win = mainWindow;
  const fullscreen = !win.isFullScreen();
  const eventName = fullscreen ? "enter-full-screen" : "leave-full-screen";

  /* 等 Windows 真正完成窗口尺寸切换，再让页面同步边框和布局。
     否则窗框会先在旧尺寸里收掉一次，原生窗口接着再变大，看起来会跳两下。 */
  return new Promise((resolve) => {
    let settled = false;
    const finish = () => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      win.removeListener(eventName, finish);
      resolve({
        ok: !win.isDestroyed(),
        fullscreen: !win.isDestroyed() && win.isFullScreen(),
      });
    };
    const timer = setTimeout(finish, 800);
    win.once(eventName, finish);
    win.setFullScreen(fullscreen);
  });
}

const MINIMIZE_TOGGLE_ACCELERATOR = "CommandOrControl+1";
const TRAY_RESTORE_ACCELERATORS = ["CommandOrControl+3", "Alt+W"];
let minimizeToggleShortcutRegistered = false;
const trayRestoreShortcutsRegistered = new Set();

function unregisterMinimizeToggleShortcut() {
  if (!minimizeToggleShortcutRegistered) return;
  globalShortcut.unregister(MINIMIZE_TOGGLE_ACCELERATOR);
  minimizeToggleShortcutRegistered = false;
}

function registerMinimizeToggleShortcut() {
  if (minimizeToggleShortcutRegistered) return true;
  const registered = globalShortcut.register(
    MINIMIZE_TOGGLE_ACCELERATOR,
    () => {
      if (!mainWindow || mainWindow.isDestroyed()) return;
      if (mainWindow.isMinimized()) {
        mainWindow.restore();
        mainWindow.show();
        mainWindow.focus();
      } else {
        mainWindow.minimize();
      }
    },
  );
  if (!registered) {
    console.warn(`无法注册全局快捷键 ${MINIMIZE_TOGGLE_ACCELERATOR}`);
    return false;
  }
  minimizeToggleShortcutRegistered = true;
  return true;
}

function unregisterTrayRestoreShortcut() {
  for (const accelerator of trayRestoreShortcutsRegistered) {
    globalShortcut.unregister(accelerator);
  }
  trayRestoreShortcutsRegistered.clear();
}

function registerTrayRestoreShortcut() {
  if (closeWindowBehavior !== "tray") return true;
  let allRegistered = true;
  for (const accelerator of TRAY_RESTORE_ACCELERATORS) {
    if (trayRestoreShortcutsRegistered.has(accelerator)) continue;
    const registered = globalShortcut.register(accelerator, showMainWindow);
    if (registered) {
      trayRestoreShortcutsRegistered.add(accelerator);
    } else {
      console.warn(`无法注册全局快捷键 ${accelerator}`);
      allRegistered = false;
    }
  }
  return allRegistered;
}

function showMainWindow() {
  if (!mainWindow || mainWindow.isDestroyed()) return false;
  unregisterTrayRestoreShortcut();
  if (mainWindow.isMinimized()) mainWindow.restore();
  mainWindow.show();
  mainWindow.focus();
  return true;
}

function hideMainWindowToTray() {
  if (!mainWindow || mainWindow.isDestroyed()) return false;
  if (!ensureTray()) return false;
  mainWindow.hide();
  registerTrayRestoreShortcut();
  return true;
}

function toggleMainWindowVisibility() {
  if (!mainWindow || mainWindow.isDestroyed()) return;
  if (mainWindow.isVisible() && !mainWindow.isMinimized()) {
    hideMainWindowToTray();
  } else {
    showMainWindow();
  }
}

function ensureTray() {
  if (tray) return tray;
  const image = nativeImage.createFromPath(iconPath());
  if (image.isEmpty()) {
    console.error(`托盘图标加载失败：${iconPath()}`);
    return null;
  }
  tray = new Tray(image);
  tray.setToolTip(PRODUCT);
  tray.setContextMenu(
    Menu.buildFromTemplate([
      {
        label: "重新启动",
        click: () => {
          app.relaunch();
          app.quit();
        },
      },
      {
        label: "退出 Fotora",
        click: () => {
          app.quit();
        },
      },
    ]),
  );
  tray.on("click", toggleMainWindowVisibility);
  return tray;
}

function destroyTray() {
  if (!tray) return;
  tray.destroy();
  tray = null;
}

function syncCloseWindowBehavior() {
  closeWindowBehavior = CLOSE_WINDOW_BEHAVIORS.has(closeWindowBehavior)
    ? closeWindowBehavior
    : "quit";
  if (closeWindowBehavior === "tray") {
    ensureTray();
  } else {
    unregisterTrayRestoreShortcut();
    destroyTray();
  }
}

ipcMain.on("window:minimize", () => {
  if (mainWindow && !mainWindow.isDestroyed()) mainWindow.minimize();
});
ipcMain.on("window:show-when-ready", async (event) => {
  if (
    !mainWindow ||
    mainWindow.isDestroyed() ||
    event.sender !== mainWindow.webContents
  )
    return;
  clearTimeout(initialShowFallbackTimer);
  initialShowFallbackTimer = null;
  try {
    /* 先强制抓取一帧已完成渲染的页面，再让原生窗口显示。
       只在 renderer 发信号后调用，因此这张帧属于图库界面而不是空壳。 */
    const frame = await mainWindow.webContents.capturePage();
    if (
      frame.isEmpty() ||
      !mainWindow ||
      mainWindow.isDestroyed() ||
      event.sender !== mainWindow.webContents
    )
      return;
  } catch {
    /* 极少数显卡环境下抓帧不可用；仍允许显示，避免窗口永远不出现。 */
  }
  showMainWindow();
  /* 启动目录同步、杀毒扫描或显卡初始化都可能在窗口刚出现时触发文件事件。
     给第一次交互留出稳定窗口，避免刚点进照片墙就被一次无关的整页刷新打断。 */
  devReloadQuietUntil = Date.now() + 2500;
});
ipcMain.on("window:close", () => {
  if (mainWindow && !mainWindow.isDestroyed()) mainWindow.close();
});
ipcMain.handle(
  "window:toggle-maximize",
  () => toggleWindowMaximize() || { ok: false },
);
ipcMain.handle("window:set-controls-style", (_event, style) =>
  setWindowControlsStyle(style),
);
ipcMain.handle("window:is-maximized", () =>
  Boolean(mainWindow && !mainWindow.isDestroyed() && mainWindow.isMaximized()),
);
ipcMain.handle("window:toggle-fullscreen", () => toggleWindowFullscreen());
ipcMain.handle("window:is-fullscreen", () =>
  Boolean(mainWindow && !mainWindow.isDestroyed() && mainWindow.isFullScreen()),
);
ipcMain.handle("window:get-position", () =>
  mainWindow && !mainWindow.isDestroyed() ? mainWindow.getPosition() : [0, 0],
);
ipcMain.handle("settings:get", () => normalizeSettings(readSettingsFile()));
ipcMain.handle("settings:set", (_event, settings) => {
  const result = writeSettingsFile(settings);
  if (result.ok) {
    const saved = readSettingsFile();
    applyColorMode(saved?.colorMode);
    externalMapNetworkEnabled = saved?.mapNetworkEnabled !== false;
    closeWindowBehavior = saved?.closeWindowBehavior || "quit";
    syncCloseWindowBehavior();
  }
  return result;
});

/* 自定义拖动：Windows 在 125% / 150% 这类非整数缩放下，单独调用
   setPosition 会按物理像素反复取整，每移动一帧窗口就长一点。
   拖动开始时记住内容区尺寸，第一次移动时量出系统窗框的取整误差，
   之后每次移动都按这个误差反算外框大小，窗口就只移动、不会长大。 */
let windowMove = null;

function beginWindowMove() {
  if (
    !mainWindow ||
    mainWindow.isDestroyed() ||
    mainWindow.isMaximized() ||
    mainWindow.isFullScreen()
  ) {
    windowMove = null;
    return;
  }
  const bounds = mainWindow.getBounds();
  const content = mainWindow.getContentBounds();
  windowMove = {
    width: bounds.width,
    height: bounds.height,
    contentWidth: content.width,
    contentHeight: content.height,
    frameError: null,
  };
}

ipcMain.on("window:begin-move", beginWindowMove);
ipcMain.on("window:end-move", () => {
  windowMove = null;
});

ipcMain.on("window:move", (_event, x, y) => {
  if (!mainWindow || mainWindow.isDestroyed()) return;
  const nextX = Math.round(Number(x));
  const nextY = Math.round(Number(y));
  if (!Number.isFinite(nextX) || !Number.isFinite(nextY)) return;
  if (mainWindow.isMaximized() || mainWindow.isFullScreen()) return;

  if (!windowMove) beginWindowMove();
  if (!windowMove) return;

  if (!windowMove.frameError) {
    mainWindow.setBounds(
      {
        x: nextX,
        y: nextY,
        width: windowMove.width,
        height: windowMove.height,
      },
      false,
    );
    const after = mainWindow.getContentBounds();
    windowMove.frameError = {
      width: after.width - windowMove.contentWidth,
      height: after.height - windowMove.contentHeight,
    };
  }

  const { width: frameW, height: frameH } = windowMove.frameError;
  mainWindow.setBounds(
    {
      x: nextX,
      y: nextY,
      width: windowMove.width - frameW,
      height: windowMove.height - frameH,
    },
    false,
  );
});

/* 单张照片同时写图片和文件列表：粘到聊天窗口、画图里是图片，
   粘到资源管理器里则是这个文件；多选（或视频）只写文件列表。 */
async function clipboardPngFor(item) {
  const toPng = async (file) => {
    if (!file) return null;
    try {
      return await sharp(file, { failOn: "none", limitInputPixels: false })
        .rotate()
        .png({ compressionLevel: 3 })
        .toBuffer();
    } catch {
      return null;
    }
  };
  let file = null;
  try {
    file = await thumbs.viewableFile(item);
  } catch {
    /* HEIC / RAW 等格式转不出来时，再退回缩略图 */
  }
  const fromOriginal = await toPng(file);
  if (fromOriginal) return fromOriginal;
  try {
    return await toPng(await thumbs.ensureThumb(item, 1600, "inside"));
  } catch {
    return null;
  }
}

const CLIPBOARD_CACHE_DIR = path.join(lib.EDIT_DIR, "clipboard");

function resetClipboardCacheDir() {
  const root = path.resolve(CLIPBOARD_CACHE_DIR);
  const expectedParent = path.resolve(lib.EDIT_DIR);
  if (path.dirname(root) !== expectedParent) {
    throw new Error("剪贴板缓存目录无效");
  }
  fs.mkdirSync(root, { recursive: true });
  for (const entry of fs.readdirSync(root, { withFileTypes: true })) {
    const target = path.join(root, entry.name);
    if (path.dirname(path.resolve(target)) !== root) continue;
    fs.rmSync(target, { recursive: true, force: true });
  }
}

function uniqueClipboardPath(folder, fileName, reserved) {
  const parsed = path.parse(path.basename(fileName));
  let candidate = path.join(folder, parsed.base);
  let suffix = 0;
  while (reserved.has(candidate.toLowerCase()) || fs.existsSync(candidate)) {
    suffix += 1;
    candidate = path.join(folder, `${parsed.name} (${suffix})${parsed.ext}`);
  }
  reserved.add(candidate.toLowerCase());
  return candidate;
}

function editedImageExtension(item) {
  const ext = path.extname(item.path).toLowerCase();
  if (ext === ".heic" || ext === ".heif") return ".jpg";
  if (ext === ".png") return ".png";
  return ".jpg";
}

async function prepareClipboardEntries(items) {
  resetClipboardCacheDir();
  const folder = fs.mkdtempSync(path.join(CLIPBOARD_CACHE_DIR, "copy-"));
  const ids = new Set(items.map((item) => Number(item.id)));
  const seen = new Set();
  const reserved = new Set();
  const entries = [];
  for (const item of items) {
    if (seen.has(Number(item.id))) continue;
    if (
      item.kind === "video" &&
      Number(item.live_photo_id) > 0 &&
      ids.has(Number(item.live_photo_id))
    ) {
      continue;
    }
    const edit = item.kind === "photo" ? lib.getItemEdit(item.id) : null;
    if (!edit) {
      entries.push(item.path);
      seen.add(Number(item.id));
      continue;
    }

    const overrides = lib.getItemMetadataOverrides(item.id);
    const baseName = path.parse(
      overrides?.nameOverride || item.name || item.path,
    ).name;
    const target = uniqueClipboardPath(
      folder,
      `${baseName}${editedImageExtension(item)}`,
      reserved,
    );
    await thumbs.renderEditedPhoto(item, target, edit);
    const metadata = await lib.copyEditedMediaMetadata(item.path, target, item);
    if (!metadata.ok) throw new Error(metadata.error || "复制照片元数据失败");
    if (overrides) {
      const applied = await lib.applyMetadataOverridesToFile(
        target,
        item,
        overrides,
      );
      if (!applied.ok) throw new Error(applied.error || "复制照片编辑信息失败");
    }
    entries.push(target);
    seen.add(Number(item.id));

    const liveVideoId = Number(item.liveVideoId || item.live_video_id) || 0;
    const companion = liveVideoId > 0 ? lib.getItem(liveVideoId) : null;
    if (companion && ids.has(Number(companion.id))) {
      const videoExt = path.extname(companion.path).toLowerCase() || ".mov";
      const videoTarget = uniqueClipboardPath(
        folder,
        `${path.parse(target).name}${videoExt}`,
        reserved,
      );
      if (editModel.hasGeometryEdit(edit.recipe.geometry)) {
        await thumbs.renderEditedLiveVideo(companion, edit, videoTarget);
      } else {
        await fs.promises.copyFile(companion.path, videoTarget);
      }
      const videoMeta = await lib.copyEditedMediaMetadata(
        companion.path,
        videoTarget,
        companion,
      );
      if (!videoMeta.ok)
        throw new Error(videoMeta.error || "复制实况视频元数据失败");
      if (overrides) {
        const applied = await lib.applyMetadataOverridesToFile(
          videoTarget,
          companion,
          overrides,
        );
        if (!applied.ok)
          throw new Error(applied.error || "复制实况视频信息失败");
      }
      entries.push(videoTarget);
      seen.add(Number(companion.id));
    }
  }
  return { folder, entries };
}

ipcMain.handle("clipboard:copy-items", async (_event, rawIds) => {
  const ids = [
    ...new Set(
      (Array.isArray(rawIds) ? rawIds : [])
        .map((id) => Number(id))
        .filter((id) => Number.isInteger(id) && id > 0),
    ),
  ];
  const items = ids
    .map((id) => lib.getItem(id))
    .filter((item) => item && fs.existsSync(item.path));
  if (!items.length) return { ok: false, error: "没有可复制的照片或视频" };

  const photos = items.filter((item) => item.kind !== "video");
  const videos = items.filter((item) => item.kind === "video");
  try {
    const prepared = await prepareClipboardEntries(items);
    const uriList = prepared.entries
      .map((filePath) => pathToFileURL(filePath).href)
      .join("\r\n");
    if (items.length === 1 && photos.length === 1) {
      const png = lib.getItemEdit(photos[0].id)
        ? await sharp(prepared.entries[0], {
            failOn: "none",
            limitInputPixels: false,
          })
            .png({ compressionLevel: 3 })
            .toBuffer()
        : await clipboardPngFor(photos[0]);
      if (png) {
        await clipboard.write([
          new ClipboardItem({
            "image/png": new Blob([new Uint8Array(png)], { type: "image/png" }),
            "text/uri-list": uriList,
          }),
        ]);
        return { ok: true, count: 1, photos: 1, videos: 0, mode: "image" };
      }
    }
    await clipboard.write([new ClipboardItem({ "text/uri-list": uriList })]);
    return {
      ok: true,
      count: items.length,
      photos: photos.length,
      videos: videos.length,
      mode: "files",
    };
  } catch (err) {
    return { ok: false, error: String(err?.message || err) };
  }
});

function uniqueExportPath(folder, fileName, reserved) {
  const parsed = path.parse(path.basename(fileName));
  let candidate = path.join(folder, parsed.base);
  let suffix = 0;
  while (reserved.has(candidate.toLowerCase()) || fs.existsSync(candidate)) {
    suffix += 1;
    candidate = path.join(folder, `${parsed.name} (${suffix})${parsed.ext}`);
  }
  reserved.add(candidate.toLowerCase());
  return candidate;
}

ipcMain.handle("files:export-items", async (_event, rawIds) => {
  const ids = [
    ...new Set(
      (Array.isArray(rawIds) ? rawIds : [])
        .map((id) => Number(id))
        .filter((id) => Number.isInteger(id) && id > 0),
    ),
  ];
  const items = ids
    .map((id) => lib.getItem(id))
    .filter((item) => item && fs.existsSync(item.path));
  if (!items.length) return { ok: false, error: "没有可导出的照片或视频" };

  const previousFolder = (() => {
    try {
      return app.getPath("pictures");
    } catch {
      return app.getPath("documents");
    }
  })();
  const result = await dialog.showOpenDialog(mainWindow, {
    title: "选择导出位置",
    buttonLabel: "导出到这里",
    defaultPath: previousFolder,
    properties: ["openDirectory"],
  });
  if (result.canceled || !result.filePaths[0]) {
    return { ok: false, canceled: true };
  }

  const folder = path.resolve(result.filePaths[0]);
  const reserved = new Set();
  const failed = [];
  let count = 0;
  let renamed = 0;
  let skipped = 0;
  const providedIds = new Set(items.map((item) => Number(item.id)));
  const seen = new Set();

  for (const item of items) {
    if (seen.has(Number(item.id))) continue;
    if (
      item.kind === "video" &&
      Number(item.live_photo_id) > 0 &&
      providedIds.has(Number(item.live_photo_id))
    ) {
      continue;
    }
    const source = path.resolve(item.path);
    const rawSource = lib.isRaw(source);
    /* RAW 的画面编辑只用于软件内显示；非 RAW 仍在导出副本中烘焙编辑。 */
    const edit =
      !rawSource && ["photo", "video"].includes(item.kind)
        ? lib.getItemEdit(item.id)
        : null;
    const overrides = lib.getItemMetadataOverrides(item.id);
    let originalName = overrides?.nameOverride || path.basename(source);
    if (
      edit &&
      item.kind === "photo" &&
      (path.extname(source).toLowerCase() === ".heic" ||
        path.extname(source).toLowerCase() === ".heif")
    ) {
      originalName = `${path.parse(originalName).name}.jpg`;
    }
    const exportAsDng = lib.shouldExportRawAsDng(item);
    if (exportAsDng) {
      originalName = `${path.parse(originalName).name}.dng`;
    }
    const directTarget = path.join(folder, originalName);
    if (
      !edit &&
      path.resolve(directTarget).toLowerCase() === source.toLowerCase()
    ) {
      skipped += 1;
      continue;
    }
    let exportedPhotoTarget = null;
    try {
      const target = uniqueExportPath(folder, originalName, reserved);
      exportedPhotoTarget = target;
      const hasOverrides =
        !!overrides &&
        (overrides.takenAt != null ||
          (overrides.gpsLat != null && overrides.gpsLon != null) ||
          overrides.gpsCleared ||
          !!overrides.locationName ||
          !!overrides.cameraOverride ||
          !!overrides.nameOverride);
      if (edit) {
        const temp = path.join(
          folder,
          `.${path.parse(target).name}.photo-tmp-${process.pid}-${Date.now()}` +
            path.extname(target),
        );
        try {
          if (item.kind === "video") {
            await thumbs.renderEditedVideo(item, edit, temp);
          } else {
            await thumbs.renderEditedPhoto(item, temp, edit);
          }
          const metadata = await lib.copyEditedMediaMetadata(
            source,
            temp,
            item,
          );
          if (!metadata.ok) {
            throw new Error(metadata.error || "没能保留照片元数据");
          }
          if (hasOverrides) {
            const applied = await lib.applyMetadataOverridesToFile(
              temp,
              item,
              overrides,
            );
            if (!applied.ok) {
              throw new Error(applied.error || "没能把照片元数据写入导出副本");
            }
          }
          await fs.promises.rename(temp, target);
        } catch (err) {
          await fs.promises.rm(temp, { force: true }).catch(() => {});
          throw err;
        }
      } else if (
        !hasOverrides &&
        (!exportAsDng || path.extname(source).toLowerCase() === ".dng")
      ) {
        await fs.promises.copyFile(source, target, fs.constants.COPYFILE_EXCL);
      } else {
        const temp = path.join(
          folder,
          `.${path.parse(target).name}.photo-tmp-${process.pid}-${Date.now()}` +
            path.extname(target),
        );
        try {
          if (exportAsDng && path.extname(source).toLowerCase() !== ".dng") {
            const converted = await lib.convertRawToDng(source, temp);
            if (!converted.ok) {
              throw new Error(converted.error || "没能把 RAW 转换为 DNG");
            }
          } else {
            await fs.promises.copyFile(
              source,
              temp,
              fs.constants.COPYFILE_EXCL,
            );
          }
          const metadata = await lib.applyMetadataOverridesToFile(
            temp,
            item,
            overrides,
          );
          if (!metadata.ok) {
            throw new Error(metadata.error || "没能把照片元数据写入导出副本");
          }
          await fs.promises.rename(temp, target);
        } catch (err) {
          await fs.promises.rm(temp, { force: true }).catch(() => {});
          throw err;
        }
      }
      count += 1;
      if (path.basename(target) !== originalName) renamed += 1;
      seen.add(Number(item.id));

      const liveVideoId = Number(item.liveVideoId || item.live_video_id) || 0;
      const companion =
        edit && liveVideoId > 0 ? lib.getItem(liveVideoId) : null;
      if (companion && providedIds.has(Number(companion.id))) {
        const videoExt = path.extname(companion.path).toLowerCase() || ".mov";
        const videoName = `${path.parse(target).name}${videoExt}`;
        const videoTarget = uniqueExportPath(folder, videoName, reserved);
        const videoTemp = path.join(
          folder,
          `.${path.parse(videoTarget).name}.photo-tmp-${process.pid}-${Date.now()}` +
            videoExt,
        );
        try {
          if (editModel.hasGeometryEdit(edit.recipe.geometry)) {
            await thumbs.renderEditedLiveVideo(companion, edit, videoTemp);
          } else {
            await fs.promises.copyFile(companion.path, videoTemp);
          }
          const videoMeta = await lib.copyEditedMediaMetadata(
            companion.path,
            videoTemp,
            companion,
          );
          if (!videoMeta.ok) {
            throw new Error(videoMeta.error || "没能保留实况视频元数据");
          }
          if (hasOverrides) {
            const applied = await lib.applyMetadataOverridesToFile(
              videoTemp,
              companion,
              overrides,
            );
            if (!applied.ok) {
              throw new Error(applied.error || "没能写入实况视频元数据");
            }
          }
          await fs.promises.rename(videoTemp, videoTarget);
          count += 1;
          if (path.basename(videoTarget) !== path.basename(companion.path))
            renamed += 1;
          seen.add(Number(companion.id));
        } catch (err) {
          await fs.promises.rm(videoTemp, { force: true }).catch(() => {});
          throw err;
        }
      }
    } catch (err) {
      if (exportedPhotoTarget) {
        await fs.promises
          .rm(exportedPhotoTarget, { force: true })
          .catch(() => {});
      }
      failed.push({
        name: originalName,
        error: String(err?.message || err),
      });
    }
  }

  if (!count && failed.length) {
    return {
      ok: false,
      error: `导出失败：${failed[0].error}`,
      folder,
      failed,
    };
  }
  return {
    ok: true,
    count,
    renamed,
    skipped,
    failed,
    folder,
    folderName: path.basename(folder) || folder,
  };
});

function iconPath() {
  const iconName = `${PRODUCT_SLUG}.ico`;
  const candidates = app.isPackaged
    ? [
        path.join(process.resourcesPath, "assets", iconName),
        path.join(app.getAppPath(), "assets", iconName),
      ]
    : [path.join(DEV_ROOT, "assets", iconName)];
  return (
    candidates.find((candidate) => fs.existsSync(candidate)) || candidates[0]
  );
}

function createWindow(port) {
  const savedControlsStyle = readSettingsFile()?.windowControlsStyle;
  const initialControlsStyle = WINDOW_CONTROLS_STYLES.has(savedControlsStyle)
    ? savedControlsStyle
    : "windows";
  windowControlsStyleApplied = "hidden";

  mainWindow = new BrowserWindow({
    width: 1534,
    height: 919,
    minWidth: 900,
    minHeight: 600,
    center: true,
    show: false,
    title: PRODUCT,
    backgroundColor: "#00000000",
    /* 窗框使用页面中的固定毛玻璃灰，不需要 DWM 再采样系统背景。 */
    backgroundMaterial: "none",
    /* 关键：transparent: true 会绕过 DWM 原生圆角。
       系统材质负责透出桌面，页面背景保持透明即可。 */
    transparent: false,
    roundedCorners: true,
    frame: false,
    hasShadow: true,
    thickFrame: true,
    autoHideMenuBar: true,
    icon: iconPath(),
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      paintWhenInitiallyHidden: true,
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      spellcheck: false,
      devTools: !app.isPackaged,
    },
  });
  setWindowControlsStyle(initialControlsStyle);

  Menu.setApplicationMenu(null);
  mainWindow.setMenuBarVisibility(false);

  const origin = `http://127.0.0.1:${port}`;
  /* 开发版每次启动都换一个 URL 版本号，避免 Electron 复用旧页面缓存。 */
  mainWindow.loadURL(
    app.isPackaged ? `${origin}/` : `${origin}/?dev=${Date.now()}`,
  );

  /* 开发时只重载界面，不重新打包：保存 web/ 下的文件后自动刷新窗口。
     服务端或主进程代码改动仍建议关掉窗口后重新打开。 */
  if (!app.isPackaged) {
    const scheduleReload = (event, filename) => {
      if (Date.now() < devReloadQuietUntil) return;
      const name = String(filename || "");
      if (
        !name ||
        !/\.(?:css|js|html|svg|png|jpe?g|webp|gif|woff2?)$/i.test(name)
      )
        return;
      clearTimeout(devReloadTimer);
      devReloadTimer = setTimeout(() => {
        if (!mainWindow || mainWindow.isDestroyed()) return;
        console.log("[dev] 界面文件已更新，刷新窗口");
        mainWindow.webContents.reloadIgnoringCache();
      }, 120);
    };
    try {
      devWatcher = fs.watch(
        path.join(DEV_ROOT, "web"),
        { recursive: true },
        scheduleReload,
      );
    } catch (err) {
      console.warn("[dev] 无法监听界面文件：", err);
    }
  }

  mainWindow.once("ready-to-show", () => {
    if (!mainWindow || mainWindow.isDestroyed()) return;
    if (mainWindow.isVisible()) return;
    /* 正常路径由页面完成图库渲染后主动显示窗口。
       如果渲染出错或脚本卡住，超时后仍显示启动遮罩，避免无窗口可操作。 */
    clearTimeout(initialShowFallbackTimer);
    initialShowFallbackTimer = setTimeout(() => {
      initialShowFallbackTimer = null;
      showMainWindow();
    }, 30000);
  });

  mainWindow.on("show", unregisterTrayRestoreShortcut);
  mainWindow.on("close", (event) => {
    if (shuttingDown || closeWindowBehavior !== "tray") return;
    event.preventDefault();
    hideMainWindowToTray();
  });

  mainWindow.on("closed", () => {
    clearTimeout(initialShowFallbackTimer);
    initialShowFallbackTimer = null;
    clearTimeout(rendererRecoveryTimer);
    rendererRecoveryTimer = null;
    unregisterMinimizeToggleShortcut();
    unregisterTrayRestoreShortcut();
    clearTimeout(devReloadTimer);
    devReloadTimer = null;
    try {
      devWatcher?.close();
    } catch {}
    devWatcher = null;
    mainWindow = null;
  });
  const notifyWindowState = () => {
    if (!mainWindow || mainWindow.isDestroyed()) return;
    mainWindow.webContents.send(
      "window:maximized-state",
      mainWindow.isMaximized(),
    );
    mainWindow.webContents.send(
      "window:fullscreen-state",
      mainWindow.isFullScreen(),
    );
  };
  mainWindow.on("maximize", notifyWindowState);
  mainWindow.on("unmaximize", notifyWindowState);
  mainWindow.on("enter-full-screen", notifyWindowState);
  mainWindow.on("leave-full-screen", notifyWindowState);

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https?:\/\//i.test(url)) shell.openExternal(url);
    return { action: "deny" };
  });

  mainWindow.webContents.on("will-navigate", (event, url) => {
    if (!url.startsWith(origin + "/")) event.preventDefault();
  });

  mainWindow.webContents.on("will-attach-webview", (event) => {
    event.preventDefault();
  });
  mainWindow.webContents.on("render-process-gone", (_event, details) => {
    if (details?.reason === "clean-exit") return;
    scheduleRendererRecovery("渲染进程退出", details);
  });

  mainWindow.webContents.setVisualZoomLevelLimits(1, 1).catch(() => {});

  mainWindow.webContents.on("before-input-event", (event, input) => {
    if (!app.isPackaged) return;
    if (input.type !== "keyDown") return;
    const key = String(input.key || "").toLowerCase();
    const blocked =
      input.key === "F5" ||
      input.key === "F12" ||
      (input.control &&
        !input.shift &&
        (key === "r" || key === "+" || key === "=" || key === "-")) ||
      (input.control && input.shift && (key === "r" || key === "i"));
    if (blocked) event.preventDefault();
  });

  return mainWindow;
}

async function boot() {
  installExternalNetworkGuard();
  /* 在创建窗口前确定配色来源，首帧就使用用户上次选择的浅色或深色。 */
  const saved = readSettingsFile();
  applyColorMode(saved?.colorMode);
  /* Fotora 不提供开机启动，并清理旧版本可能遗留的登录项。 */
  applyLaunchAtLogin(false);
  closeWindowBehavior = saved?.closeWindowBehavior || "quit";
  runningServer = await serverApi.start({ port: 0 });
  const win = createWindow(runningServer.port);
  registerMinimizeToggleShortcut();
  syncCloseWindowBehavior();

  serverApi.setFolderPicker(async () => {
    const result = await dialog.showOpenDialog(win, {
      title: "选择照片库根文件夹（导入时会按当前子文件夹建立相簿快照）",
      buttonLabel: "选择",
      properties: ["openDirectory"],
    });
    return result.canceled ? "" : result.filePaths[0] || "";
  });

  serverApi.setWindowController(() => toggleWindowMaximize() || { ok: false });
}

function shutdown() {
  if (shuttingDown) return;
  shuttingDown = true;
  clearTimeout(initialShowFallbackTimer);
  initialShowFallbackTimer = null;
  clearTimeout(rendererRecoveryTimer);
  rendererRecoveryTimer = null;
  unregisterMinimizeToggleShortcut();
  unregisterTrayRestoreShortcut();
  destroyTray();
  try {
    void runningServer?.stop?.();
  } catch {}
}

if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  app.on("child-process-gone", (_event, details) => {
    if (details?.type === "GPU" && details?.reason !== "clean-exit") {
      scheduleRendererRecovery("GPU 进程退出", details);
    }
  });
  app.on("second-instance", () => {
    showMainWindow();
  });

  app
    .whenReady()
    .then(boot)
    .catch((err) => {
      dialog.showErrorBox("Fotora 启动失败", String((err && err.stack) || err));
      app.quit();
    });

  app.on("before-quit", shutdown);
  app.on("window-all-closed", () => {
    if (shuttingDown || closeWindowBehavior !== "tray") app.quit();
  });
}
