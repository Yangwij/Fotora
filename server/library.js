"use strict";
/**
 * 相簿库：导入时把磁盘文件夹结构快照成软件相簿，之后只读取项目文件变化，
 * 索引存进 SQLite（用 Node 自带的 node:sqlite，不用额外装数据库）。
 *
 * 规则：
 *   首次导入时：根文件夹下的一层子文件夹 = 一级相簿，子文件夹 = 子相簿
 *   导入后相簿独立保存；新项目先进入图库和未归档
 *   软件内新建、改名和解散相簿都不修改磁盘
 */
const fs = require("node:fs");
const fsp = require("node:fs/promises");
const crypto = require("node:crypto");
const path = require("node:path");
const os = require("node:os");
const { execFile } = require("node:child_process");
const { DatabaseSync } = require("node:sqlite");
const editModel = require("./edits");
const { readDirectoryEntries, statMediaEntry } = require("./fs-scan");

/* ExifTool 查找顺序：安装版注入的路径 → 仓库随包版本 → 用户桌面的副本 →
   原先的开发机路径。桌面版和随包版都是 13.59，命令参数可以通用。 */
const EXIFTOOL_CANDIDATES = [
  process.env.EXIFTOOL,
  path.join(__dirname, "..", "vendor", "exiftool", "exiftool.exe"),
  process.env.USERPROFILE
    ? path.join(process.env.USERPROFILE, "Desktop", "Exiftool", "exiftool.exe")
    : null,
  "D:\\ExifTool\\exiftool.exe",
].filter(Boolean);
const EXIFTOOL =
  EXIFTOOL_CANDIDATES.find((candidate) => {
    try {
      return fs.existsSync(candidate);
    } catch {
      return false;
    }
  }) || EXIFTOOL_CANDIDATES[0];
/* RAW 导出统一转为 DNG 时，用随包的 DNGLab 保留原始传感器数据。 */
const DNGLAB_CANDIDATES = [
  process.env.DNGLAB,
  path.join(__dirname, "..", "vendor", "dnglab", "dnglab.exe"),
  process.env.USERPROFILE
    ? path.join(process.env.USERPROFILE, "Desktop", "dnglab", "dnglab.exe")
    : null,
  "dnglab",
].filter(Boolean);
const DNGLAB =
  DNGLAB_CANDIDATES.find((candidate) => {
    if (candidate === "dnglab") return true;
    try {
      return fs.existsSync(candidate);
    } catch {
      return false;
    }
  }) || DNGLAB_CANDIDATES[0];
const DATA_DIR =
  process.env.PHOTO_DATA ||
  process.env.ALBUM_DATA ||
  path.join(__dirname, "..", "data");
/* 产品规则已经从“磁盘文件夹就是相簿”切换为“导入快照 + 独立软件相簿”。
   新库单独保存，旧库保持原样，不做迁移。 */
const DB_FILE = process.env.PHOTO_DB || path.join(DATA_DIR, "library-v2.db");
const TMP_DIR = path.join(DATA_DIR, "tmp");
const EXIF_ARG_DIR = path.join(os.tmpdir(), "photo-app-exiftool-args");
const THUMB_DIR = path.join(DATA_DIR, "thumbs-v2");
const PREVIEW_DIR = path.join(DATA_DIR, "previews-v2");
/* v3：统一 quarterTurns 为逆时针语义，避免继续命中旧版反向派生图。 */
const EDIT_DIR = path.join(DATA_DIR, "edits-v3");
/* 「最近删除」的东西挪到这儿（还在本机，只是不在原来的相簿里了） */
const TRASH_DIR = path.join(DATA_DIR, "trash");
const TRASH_ALBUM_DIR = path.join(TRASH_DIR, "albums");

const RAW_PHOTO_EXT = [
  ".nef",
  ".nrw",
  ".dng",
  ".cr2",
  ".cr3",
  ".crw",
  ".arw",
  ".srf",
  ".sr2",
  ".raf",
  ".orf",
  ".rw2",
  ".raw",
  ".rwl",
  ".pef",
  ".srw",
  ".3fr",
  ".fff",
  ".iiq",
  ".mos",
  ".mef",
  ".x3f",
  ".erf",
  ".mrw",
  ".bay",
  ".cap",
  ".dcr",
  ".dcs",
  ".kdc",
  ".ptx",
];

/* Lightroom 读取的是文件里的 Make / Model；软件内使用友好名称，
   导出副本时才把这些字段写入 EXIF。 */
const CAMERA_DEVICE_OVERRIDES = Object.freeze({
  "sony-a7m4": Object.freeze({
    id: "sony-a7m4",
    label: "Sony A7 IV",
    make: "SONY",
    model: "ILCE-7M4",
    uniqueModel: "Sony ILCE-7M4",
    lensMake: "SONY",
    lensModel: "FE 24-105mm F4 G OSS",
    lensSpecification: [24, 105, 4, 4],
  }),
  "ricoh-gr-iii": Object.freeze({
    id: "ricoh-gr-iii",
    label: "RICOH GR III",
    make: "RICOH IMAGING COMPANY, LTD.",
    model: "RICOH GR III",
    uniqueModel: "RICOH GR III",
    lensMake: "RICOH IMAGING COMPANY, LTD.",
    lensModel: "18.3mm F2.8",
    lensSpecification: [18.3, 18.3, 2.8, 2.8],
  }),
  "fujifilm-x-t5": Object.freeze({
    id: "fujifilm-x-t5",
    label: "FUJIFILM X-T5",
    make: "FUJIFILM",
    model: "X-T5",
    uniqueModel: "Fujifilm X-T5",
    lensMake: "FUJIFILM",
    lensModel: "XF16-80mmF4 R OIS WR",
    lensSpecification: [16, 80, 4, 4],
  }),
  "nikon-z5-ii": Object.freeze({
    id: "nikon-z5-ii",
    label: "Nikon Z5 II",
    make: "NIKON CORPORATION",
    model: "NIKON Z5_2",
    uniqueModel: "Nikon Z 5 2",
    lensMake: "NIKON CORPORATION",
    lensModel: "NIKKOR Z 24-120mm f/4 S",
    lensSpecification: [24, 120, 4, 4],
  }),
});

function cameraDeviceOverride(value) {
  if (value == null || value === "") return null;
  /* A7M5 曾短暂作为可选设备；老库里的覆盖值平滑迁移到 A7 IV。 */
  const id = String(value) === "sony-a7m5" ? "sony-a7m4" : String(value);
  return CAMERA_DEVICE_OVERRIDES[id] || null;
}

const RAW_VIDEO_EXT = [".braw", ".crm", ".rmf", ".r3d", ".ari"];
const PHOTO_EXT = new Set([
  ".jpg",
  ".jpeg",
  ".jfif",
  ".png",
  ".webp",
  ".gif",
  ".bmp",
  ".avif",
  ".heic",
  ".heif",
  ".tif",
  ".tiff",
  ...RAW_PHOTO_EXT,
]);
const VIDEO_EXT = new Set([
  ".mp4",
  ".mov",
  ".m4v",
  ".avi",
  ".mkv",
  ".wmv",
  ".flv",
  ".webm",
  ".3gp",
  ".mpg",
  ".mpeg",
  ".mts",
  ".m2ts",
  ".ts",
  ...RAW_VIDEO_EXT,
]);
const RAW_EXT = new Set([...RAW_PHOTO_EXT, ...RAW_VIDEO_EXT]);
const QUICKTIME_EXT = new Set([".mp4", ".mov", ".m4v", ".3gp", ".m4a"]);

const collator = new Intl.Collator("zh-Hans-CN", {
  numeric: true,
  sensitivity: "base",
});

function kindOf(fileName) {
  const ext = path.extname(fileName).toLowerCase();
  if (PHOTO_EXT.has(ext)) return "photo";
  if (VIDEO_EXT.has(ext)) return "video";
  return null;
}

const isRaw = (p) => RAW_EXT.has(path.extname(p).toLowerCase());

/* ------------------------------- 数据库 ------------------------------- */

let db = null;

function openDb() {
  if (db) return db;
  fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.mkdirSync(TMP_DIR, { recursive: true });
  fs.mkdirSync(EDIT_DIR, { recursive: true });
  fs.mkdirSync(TRASH_DIR, { recursive: true });
  fs.mkdirSync(TRASH_ALBUM_DIR, { recursive: true });
  db = new DatabaseSync(DB_FILE);
  db.exec(`
    PRAGMA journal_mode = WAL;
    CREATE TABLE IF NOT EXISTS roots (
      id        INTEGER PRIMARY KEY,
      path      TEXT UNIQUE NOT NULL,
      name      TEXT NOT NULL,
      added_at  INTEGER NOT NULL,
      snapshot_at INTEGER,
      import_id TEXT
    );
    CREATE TABLE IF NOT EXISTS meta (
      key   TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS albums (
      id         INTEGER PRIMARY KEY,
      root_id    INTEGER NOT NULL,
      parent_id  INTEGER,
      path       TEXT UNIQUE NOT NULL,
      name       TEXT NOT NULL,
      depth      INTEGER NOT NULL,
      sort_key   TEXT NOT NULL,
      sort_order INTEGER,
      hidden_at  INTEGER,
      cover_item_id INTEGER,
      kind       TEXT,
      source_path TEXT
    );
    CREATE TABLE IF NOT EXISTS items (
      id          INTEGER PRIMARY KEY,
      root_id     INTEGER NOT NULL,
      /* 物理目录映射缓存。项目的真实归属始终是图库，不是这个相簿。 */
      album_id    INTEGER NOT NULL,
      album_hidden_at INTEGER,
      path        TEXT UNIQUE NOT NULL,
      name        TEXT NOT NULL,
      kind        TEXT NOT NULL,
      size        INTEGER NOT NULL,
      mtime       INTEGER NOT NULL,
      width       INTEGER,
      height      INTEGER,
      taken_at    INTEGER,
      camera      TEXT,
      lens        TEXT,
      iso         INTEGER,
      f_number    REAL,
      exposure    REAL,
      focal       REAL,
      gps_lat     REAL,
      gps_lon     REAL,
      orientation INTEGER,
      duration    REAL,
      fps         REAL,
      codec       TEXT,
      deleted_at  INTEGER,
      deleted_from TEXT,
      added_seq   INTEGER,
      favorite_at INTEGER,
      rating      INTEGER NOT NULL DEFAULT 0,
      hidden_at   INTEGER,
      ignored_at  INTEGER NOT NULL DEFAULT 0,
      restore_library_only INTEGER NOT NULL DEFAULT 0,
      meta_state  TEXT NOT NULL DEFAULT 'pending',
      content_id  TEXT,
      live_video_id INTEGER,
      live_photo_id INTEGER
    );
    CREATE TABLE IF NOT EXISTS item_albums (
      item_id    INTEGER NOT NULL,
      album_id   INTEGER NOT NULL,
      added_seq  INTEGER NOT NULL,
      added_at   INTEGER NOT NULL,
      PRIMARY KEY (item_id, album_id)
    );
    CREATE TABLE IF NOT EXISTS item_metadata_overrides (
      item_id                  INTEGER PRIMARY KEY,
      taken_at_override        INTEGER,
      gps_lat_override         REAL,
      gps_lon_override         REAL,
      gps_cleared              INTEGER NOT NULL DEFAULT 0,
      disk_gps_lat_before      REAL,
      disk_gps_lon_before      REAL,
      gps_file_modified        INTEGER NOT NULL DEFAULT 0,
      location_name_override   TEXT,
      camera_override          TEXT,
      name_override            TEXT,
      updated_at               INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS item_edits (
      item_id      INTEGER PRIMARY KEY,
      recipe_json  TEXT NOT NULL,
      revision     INTEGER NOT NULL,
      updated_at   INTEGER NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_item_edits_updated
      ON item_edits(updated_at);
    CREATE TABLE IF NOT EXISTS video_posters (
      item_id      INTEGER PRIMARY KEY,
      frame_time   REAL NOT NULL,
      recipe_json  TEXT NOT NULL,
      revision     INTEGER NOT NULL,
      updated_at   INTEGER NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_video_posters_updated
      ON video_posters(updated_at);
    CREATE TABLE IF NOT EXISTS photo_wall_crops (
      item_id      INTEGER PRIMARY KEY,
      crop_x       REAL NOT NULL,
      crop_y       REAL NOT NULL,
      crop_size    REAL NOT NULL,
      updated_at   INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS masonry_wall_crops (
      item_id      INTEGER PRIMARY KEY,
      ratio_key    TEXT NOT NULL,
      updated_at   INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS filmroll_wall_crops (
      item_id      INTEGER PRIMARY KEY,
      ratio_key    TEXT NOT NULL,
      updated_at   INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS mosaic_wall_crops (
      item_id      INTEGER PRIMARY KEY,
      ratio_key    TEXT NOT NULL,
      updated_at   INTEGER NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_items_album ON items(album_id);
    CREATE INDEX IF NOT EXISTS idx_items_root  ON items(root_id);
    CREATE INDEX IF NOT EXISTS idx_albums_root ON albums(root_id);
    CREATE TABLE IF NOT EXISTS trashed_albums (
      id            INTEGER PRIMARY KEY,
      root_id       INTEGER NOT NULL,
      original_path TEXT NOT NULL,
      trash_path    TEXT UNIQUE NOT NULL,
      name          TEXT NOT NULL,
      kind          TEXT,
      sort_order    INTEGER,
      item_count    INTEGER NOT NULL DEFAULT 0,
      cover_paths   TEXT,
      album_id      INTEGER,
      deleted_at    INTEGER NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_trashed_albums_root ON trashed_albums(root_id);
    CREATE INDEX IF NOT EXISTS idx_item_albums_album ON item_albums(album_id, added_seq);
    CREATE INDEX IF NOT EXISTS idx_item_albums_item ON item_albums(item_id);
    CREATE TABLE IF NOT EXISTS directory_snapshots (
      root_id   INTEGER NOT NULL,
      path      TEXT NOT NULL,
      status    TEXT NOT NULL,
      album_id  INTEGER,
      seen_at   INTEGER NOT NULL,
      PRIMARY KEY (root_id, path)
    );
    CREATE INDEX IF NOT EXISTS idx_directory_snapshots_status
      ON directory_snapshots(root_id, status);
  `);
  /* 老库升级：items 里补上「最近删除」要用的那两列 */
  const cols = db
    .prepare("SELECT name FROM pragma_table_info('items')")
    .all()
    .map((c) => c.name);
  if (!cols.includes("deleted_at")) {
    db.exec("ALTER TABLE items ADD COLUMN deleted_at INTEGER");
  }
  if (!cols.includes("deleted_from")) {
    db.exec("ALTER TABLE items ADD COLUMN deleted_from TEXT");
  }
  /* 从文件所在相簿移除时只隐藏这层归类，不移动也不删除原文件。
     文件以后被移到别的相簿时，扫描会清掉这个标记。 */
  if (!cols.includes("album_hidden_at")) {
    db.exec("ALTER TABLE items ADD COLUMN album_hidden_at INTEGER");
  }
  /* 老库升级：added_seq 记录项目第一次进入当前相簿的先后。
     自定义顺序就是按它从大到小排；已有项目按插入索引的先后补齐。 */
  if (!cols.includes("added_seq")) {
    db.exec("ALTER TABLE items ADD COLUMN added_seq INTEGER");
  }
  /* 老库升级：收藏只是应用内的标记，不改磁盘上的文件；
     有值表示收藏时间，NULL 表示未收藏。 */
  if (!cols.includes("favorite_at")) {
    db.exec("ALTER TABLE items ADD COLUMN favorite_at INTEGER");
  }
  /* 分类评级是应用内的 1–5 星评分，0 表示未评分；不改动磁盘文件。 */
  if (!cols.includes("rating")) {
    db.exec("ALTER TABLE items ADD COLUMN rating INTEGER NOT NULL DEFAULT 0");
  }
  if (!cols.includes("hidden_at")) {
    db.exec("ALTER TABLE items ADD COLUMN hidden_at INTEGER");
  }
  if (!cols.includes("ignored_at")) {
    db.exec(
      "ALTER TABLE items ADD COLUMN ignored_at INTEGER NOT NULL DEFAULT 0",
    );
  }
  /* 从图库删除的项目恢复时只回到图库，不再挂回父/子相簿。 */
  if (!cols.includes("restore_library_only")) {
    db.exec(
      "ALTER TABLE items ADD COLUMN restore_library_only INTEGER NOT NULL DEFAULT 0",
    );
  }
  if (!cols.includes("fps")) {
    db.exec("ALTER TABLE items ADD COLUMN fps REAL");
  }
  if (!cols.includes("codec")) {
    db.exec("ALTER TABLE items ADD COLUMN codec TEXT");
  }
  /* 实况照片会保留两张物理文件，但只作为一个项目展示。
     content_id 优先用于 Apple 的稳定配对标识；两个 live 字段互相指向
     同一组照片 / 视频，删除其中一张后下一次扫描会自动拆开。 */
  if (!cols.includes("content_id")) {
    db.exec("ALTER TABLE items ADD COLUMN content_id TEXT");
    db.exec("UPDATE items SET meta_state = 'pending'");
  }
  if (!cols.includes("live_video_id")) {
    db.exec("ALTER TABLE items ADD COLUMN live_video_id INTEGER");
  }
  if (!cols.includes("live_photo_id")) {
    db.exec("ALTER TABLE items ADD COLUMN live_photo_id INTEGER");
  }
  db.exec(
    "CREATE INDEX IF NOT EXISTS idx_items_live_video ON items(live_video_id)",
  );
  db.exec(
    "CREATE INDEX IF NOT EXISTS idx_items_live_photo ON items(live_photo_id)",
  );
  db.exec(
    "CREATE INDEX IF NOT EXISTS idx_items_favorite ON items(favorite_at)",
  );
  db.exec("CREATE INDEX IF NOT EXISTS idx_items_rating ON items(rating)");
  db.exec("CREATE INDEX IF NOT EXISTS idx_items_hidden ON items(hidden_at)");
  /* 隐藏功能已移除：升级后把旧版本隐藏的项目自动放回图库和原相簿。
     hidden_at 列暂时保留，只用于兼容旧数据库结构。 */
  db.exec("UPDATE items SET hidden_at = NULL WHERE hidden_at IS NOT NULL");
  const missingAdded = db
    .prepare("SELECT id FROM items WHERE added_seq IS NULL ORDER BY id")
    .all();
  if (missingAdded.length) {
    let seq =
      Number(db.prepare("SELECT MAX(added_seq) AS n FROM items").get().n) || 0;
    const update = db.prepare("UPDATE items SET added_seq = ? WHERE id = ?");
    db.exec("BEGIN IMMEDIATE");
    try {
      for (const row of missingAdded) update.run(++seq, row.id);
      db.exec("COMMIT");
    } catch (err) {
      db.exec("ROLLBACK");
      throw err;
    }
  }
  db.exec("CREATE INDEX IF NOT EXISTS idx_items_added ON items(added_seq)");
  /* 老库升级：相簿可以手动拖动排序；NULL 表示还按名字自然排序 */
  const albumCols = db
    .prepare("SELECT name FROM pragma_table_info('albums')")
    .all()
    .map((c) => c.name);
  if (!albumCols.includes("sort_order")) {
    db.exec("ALTER TABLE albums ADD COLUMN sort_order INTEGER");
  }
  /* 老库升级：记住编辑时新建的是「相簿」还是「文件夹」，
     这样空相簿和空文件夹能显示各自该有的引导。 */
  if (!albumCols.includes("kind")) {
    db.exec("ALTER TABLE albums ADD COLUMN kind TEXT");
  }
  /* 删除相簿只隐藏这个集合：文件夹和项目留在原处，图库仍能看到项目。 */
  if (!albumCols.includes("hidden_at")) {
    db.exec("ALTER TABLE albums ADD COLUMN hidden_at INTEGER");
  }
  if (!albumCols.includes("cover_item_id")) {
    db.exec("ALTER TABLE albums ADD COLUMN cover_item_id INTEGER");
  }
  if (!albumCols.includes("source_path")) {
    db.exec("ALTER TABLE albums ADD COLUMN source_path TEXT");
  }
  const rootCols = db
    .prepare("SELECT name FROM pragma_table_info('roots')")
    .all()
    .map((c) => c.name);
  if (!rootCols.includes("snapshot_at")) {
    db.exec("ALTER TABLE roots ADD COLUMN snapshot_at INTEGER");
  }
  if (!rootCols.includes("import_id")) {
    db.exec("ALTER TABLE roots ADD COLUMN import_id TEXT");
  }
  /* 老库升级：记住相簿删进「最近删除」前的封面。
     cover_paths 是相对于被删相簿根目录的媒体文件路径，最多四条。 */
  const trashedCols = db
    .prepare("SELECT name FROM pragma_table_info('trashed_albums')")
    .all()
    .map((c) => c.name);
  if (!trashedCols.includes("cover_paths")) {
    db.exec("ALTER TABLE trashed_albums ADD COLUMN cover_paths TEXT");
  }
  if (!trashedCols.includes("sort_order")) {
    db.exec("ALTER TABLE trashed_albums ADD COLUMN sort_order INTEGER");
  }
  /* 新记录关联原来的 albums 行，恢复时只取消隐藏，不再搬文件夹；
     老记录的 album_id 为 NULL，仍按旧流程从 data/trash/albums 搬回来。 */
  if (!trashedCols.includes("album_id")) {
    db.exec("ALTER TABLE trashed_albums ADD COLUMN album_id INTEGER");
  }
  const overrideCols = db
    .prepare("SELECT name FROM pragma_table_info('item_metadata_overrides')")
    .all()
    .map((c) => c.name);
  if (!overrideCols.includes("gps_cleared")) {
    db.exec(
      "ALTER TABLE item_metadata_overrides ADD COLUMN gps_cleared INTEGER NOT NULL DEFAULT 0",
    );
  }
  if (!overrideCols.includes("camera_override")) {
    db.exec(
      "ALTER TABLE item_metadata_overrides ADD COLUMN camera_override TEXT",
    );
  }
  if (!overrideCols.includes("name_override")) {
    db.exec(
      "ALTER TABLE item_metadata_overrides ADD COLUMN name_override TEXT",
    );
  }
  if (!overrideCols.includes("disk_gps_lat_before")) {
    db.exec(
      "ALTER TABLE item_metadata_overrides ADD COLUMN disk_gps_lat_before REAL",
    );
  }
  if (!overrideCols.includes("disk_gps_lon_before")) {
    db.exec(
      "ALTER TABLE item_metadata_overrides ADD COLUMN disk_gps_lon_before REAL",
    );
  }
  if (!overrideCols.includes("gps_file_modified")) {
    db.exec(
      `ALTER TABLE item_metadata_overrides
       ADD COLUMN gps_file_modified INTEGER NOT NULL DEFAULT 0`,
    );
  }
  /* 旧版本曾提供 A7M5，但它没有当前 Lightroom 的 Camera Matching 配置。
     升级时把已有覆盖项改为 A7 IV，保留用户原来的设备调整和文件名。 */
  const sonyCameraMigration = "camera-device-sony-a7iv-v1";
  const sonyCameraMigrated = db
    .prepare("SELECT value FROM meta WHERE key = ?")
    .get(sonyCameraMigration);
  if (!sonyCameraMigrated) {
    db.prepare(
      `UPDATE item_metadata_overrides
       SET camera_override = 'sony-a7m4', updated_at = ?
       WHERE camera_override = 'sony-a7m5'`,
    ).run(Date.now());
    db.prepare("INSERT INTO meta (key, value) VALUES (?, ?)").run(
      sonyCameraMigration,
      String(Date.now()),
    );
  }
  db.exec(`
    DROP VIEW IF EXISTS item_effective;
    CREATE VIEW item_effective AS
      SELECT i.*,
        COALESCE(o.taken_at_override, i.taken_at) AS effective_taken_at,
        CASE WHEN o.gps_cleared = 1 THEN NULL
          ELSE COALESCE(o.gps_lat_override, i.gps_lat) END AS effective_gps_lat,
        CASE WHEN o.gps_cleared = 1 THEN NULL
          ELSE COALESCE(o.gps_lon_override, i.gps_lon) END AS effective_gps_lon,
        COALESCE(o.location_name_override, '') AS effective_location_name,
        CASE o.camera_override
          WHEN 'sony-a7m4' THEN 'Sony A7 IV'
          WHEN 'sony-a7m5' THEN 'Sony A7 IV'
          WHEN 'ricoh-gr-iii' THEN 'RICOH GR III'
          WHEN 'fujifilm-x-t5' THEN 'FUJIFILM X-T5'
          WHEN 'nikon-z5-ii' THEN 'Nikon Z5 II'
          ELSE i.camera
        END AS effective_camera,
        CASE o.camera_override
          WHEN 'sony-a7m4' THEN 'FE 24-105mm F4 G OSS'
          WHEN 'sony-a7m5' THEN 'FE 24-105mm F4 G OSS'
          WHEN 'ricoh-gr-iii' THEN '18.3mm F2.8'
          WHEN 'fujifilm-x-t5' THEN 'XF16-80mmF4 R OIS WR'
          WHEN 'nikon-z5-ii' THEN 'NIKKOR Z 24-120mm f/4 S'
          ELSE i.lens
        END AS effective_lens,
        COALESCE(o.name_override, i.name) AS effective_name,
        o.taken_at_override,
        o.gps_lat_override,
        o.gps_lon_override,
        o.gps_cleared,
        o.gps_file_modified,
        o.location_name_override,
        o.camera_override,
        o.name_override,
        e.updated_at AS editRevision,
        vp.revision AS videoPosterRevision
      FROM items i
      LEFT JOIN item_metadata_overrides o ON o.item_id = i.id
      LEFT JOIN item_edits e ON e.item_id = i.id
      LEFT JOIN video_posters vp ON vp.item_id = i.id;
  `);
  /* 旧版本没有清理照片墙专用缓存。升级后首次打开库时做一次迁移清理，
     之后的常规运行只在换库 / 重新导入根目录时整批清理。 */
  const mediaCacheMigration = "photo-wall-cache-v3";
  const migrated = db
    .prepare("SELECT value FROM meta WHERE key = ?")
    .get(mediaCacheMigration);
  if (!migrated) {
    clearMediaCaches();
    db.prepare("INSERT INTO meta (key, value) VALUES (?, ?)").run(
      mediaCacheMigration,
      String(Date.now()),
    );
  }
  /* 旧版自定义顺序按 added_seq 升序，加入相簿时还会写入负数把新项目放到最前。
     改为降序后，把旧负数批次搬到当前最大序号之后，保持它们仍在最前。 */
  const customOrderMigration = "custom-order-newest-first-v1";
  const customOrderMigrated = db
    .prepare("SELECT value FROM meta WHERE key = ?")
    .get(customOrderMigration);
  if (!customOrderMigrated) {
    const negativeRows = db
      .prepare(
        `
      SELECT item_id, album_id FROM item_albums
      WHERE added_seq < 0
      ORDER BY added_seq ASC, item_id ASC, album_id ASC
    `,
      )
      .all();
    if (negativeRows.length) {
      const update = db.prepare(
        "UPDATE item_albums SET added_seq = ? WHERE item_id = ? AND album_id = ?",
      );
      let seq = nextAddedSeq(db) + negativeRows.length;
      db.exec("BEGIN IMMEDIATE");
      try {
        for (const row of negativeRows) {
          update.run(seq--, row.item_id, row.album_id);
        }
        db.exec("COMMIT");
      } catch (err) {
        db.exec("ROLLBACK");
        throw err;
      }
    }
    db.prepare("INSERT INTO meta (key, value) VALUES (?, ?)").run(
      customOrderMigration,
      String(Date.now()),
    );
  }
  return db;
}

function getMeta(key) {
  const row = openDb().prepare("SELECT value FROM meta WHERE key = ?").get(key);
  return row ? row.value : null;
}

function setMeta(key, value) {
  openDb()
    .prepare("INSERT OR REPLACE INTO meta (key, value) VALUES (?, ?)")
    .run(key, String(value));
}

/* ------------------------------- 扫描 ------------------------------- */

const scanStates = new Map();
let lastScanRootId = null;

function defaultScanState() {
  return {
    running: false,
    rootId: null,
    rootPath: null,
    phase: "",
    scanned: 0,
    total: 0,
    message: "尚未扫描",
    finishedAt: null,
  };
}

function scanStateFor(rootId) {
  const id = Number(rootId);
  if (!Number.isInteger(id)) return defaultScanState();
  if (!scanStates.has(id)) {
    const state = defaultScanState();
    state.rootId = id;
    scanStates.set(id, state);
  }
  return scanStates.get(id);
}

function updateScanState(rootId, patch) {
  Object.assign(scanStateFor(rootId), patch);
}

function getScanState(rootId = lastScanRootId) {
  if (rootId == null) {
    for (const state of scanStates.values()) {
      if (state.running) return { ...state };
    }
    return defaultScanState();
  }
  const requested = Number(rootId);
  if (Number.isInteger(requested)) return { ...scanStateFor(requested) };
  for (const state of scanStates.values()) {
    if (state.running) return { ...state };
  }
  return defaultScanState();
}

/* 给当前索引拍一张「指纹」：根目录、相簿、媒体文件的路径 / 名称 / 大小 /
   修改时间 / 拍摄时间 / 排序都算进去。启动时前后各取一次，就知道有没有变化，
   没变化就不用清封面缓存，界面也不会无端闪一下。 */
function getLibrarySignature() {
  const database = openDb();
  const hash = crypto.createHash("sha1");
  for (const row of database
    .prepare(
      "SELECT id, path, name, added_at, snapshot_at, import_id FROM roots ORDER BY id",
    )
    .all()) {
    hash.update(
      JSON.stringify([
        "root",
        row.id,
        row.path,
        row.name,
        row.added_at,
        row.snapshot_at,
        row.import_id,
      ]),
    );
  }
  for (const row of database
    .prepare(
      `SELECT id, root_id, parent_id, path, name, depth, sort_order, hidden_at,
            cover_item_id
     FROM albums ORDER BY id`,
    )
    .all()) {
    hash.update(
      JSON.stringify([
        "album",
        row.id,
        row.root_id,
        row.parent_id,
        row.path,
        row.name,
        row.depth,
        row.sort_order,
        row.hidden_at,
        row.cover_item_id,
      ]),
    );
  }
  for (const row of database
    .prepare(
      `SELECT id, root_id, album_id, album_hidden_at, path, name, kind, size,
            mtime, taken_at, deleted_at, ignored_at, added_seq, hidden_at, content_id,
            live_video_id, live_photo_id
     FROM items ORDER BY id`,
    )
    .all()) {
    hash.update(
      JSON.stringify([
        "item",
        row.id,
        row.root_id,
        row.album_id,
        row.path,
        row.name,
        row.kind,
        row.size,
        row.mtime,
        row.taken_at,
        row.deleted_at,
        row.ignored_at,
        row.added_seq,
        row.album_hidden_at,
        row.hidden_at,
        row.content_id,
        row.live_video_id,
        row.live_photo_id,
      ]),
    );
  }
  for (const row of database
    .prepare(
      "SELECT item_id, album_id, added_seq FROM item_albums ORDER BY item_id, album_id",
    )
    .all()) {
    hash.update(
      JSON.stringify(["membership", row.item_id, row.album_id, row.added_seq]),
    );
  }
  for (const row of database
    .prepare(
      `SELECT item_id, taken_at_override, gps_lat_override, gps_lon_override,
            gps_cleared, location_name_override, camera_override,
            name_override, updated_at
     FROM item_metadata_overrides ORDER BY item_id`,
    )
    .all()) {
    hash.update(
      JSON.stringify([
        "metadata-override",
        row.item_id,
        row.taken_at_override,
        row.gps_lat_override,
        row.gps_lon_override,
        row.gps_cleared,
        row.location_name_override,
        row.camera_override,
        row.name_override,
        row.updated_at,
      ]),
    );
  }
  for (const row of database
    .prepare(
      `SELECT item_id, crop_x, crop_y, crop_size, updated_at
     FROM photo_wall_crops ORDER BY item_id`,
    )
    .all()) {
    hash.update(
      JSON.stringify([
        "photo-wall-crop",
        row.item_id,
        row.crop_x,
        row.crop_y,
        row.crop_size,
        row.updated_at,
      ]),
    );
  }
  for (const row of database
    .prepare(
      `SELECT item_id, ratio_key, updated_at
     FROM masonry_wall_crops ORDER BY item_id`,
    )
    .all()) {
    hash.update(
      JSON.stringify([
        "masonry-wall-crop",
        row.item_id,
        row.ratio_key,
        row.updated_at,
      ]),
    );
  }
  for (const row of database
    .prepare(
      `SELECT item_id, ratio_key, updated_at
     FROM filmroll_wall_crops ORDER BY item_id`,
    )
    .all()) {
    hash.update(
      JSON.stringify([
        "filmroll-wall-crop",
        row.item_id,
        row.ratio_key,
        row.updated_at,
      ]),
    );
  }
  for (const row of database
    .prepare(
      `SELECT item_id, ratio_key, updated_at
     FROM mosaic_wall_crops ORDER BY item_id`,
    )
    .all()) {
    hash.update(
      JSON.stringify([
        "mosaic-wall-crop",
        row.item_id,
        row.ratio_key,
        row.updated_at,
      ]),
    );
  }
  for (const row of database
    .prepare(
      "SELECT id, root_id, original_path, trash_path, name, sort_order, cover_paths, deleted_at FROM trashed_albums ORDER BY id",
    )
    .all()) {
    hash.update(
      JSON.stringify([
        "trashed-album",
        row.id,
        row.root_id,
        row.original_path,
        row.trash_path,
        row.name,
        row.sort_order,
        row.cover_paths,
        row.deleted_at,
      ]),
    );
  }
  for (const row of database
    .prepare(
      "SELECT root_id, path, status, album_id FROM directory_snapshots ORDER BY root_id, path",
    )
    .all()) {
    hash.update(
      JSON.stringify([
        "directory-snapshot",
        row.root_id,
        row.path,
        row.status,
        row.album_id,
      ]),
    );
  }
  return hash.digest("hex");
}

/* 原图被替换后，旧缩略图和旧预览不能再留着。
   缩略图按 item id 命名，不清理的话即使文件内容变了，
   相簿封面还是会一直读到上一次生成的旧图；视频首帧
   （<id>-first.jpg）以及旧版开场封面缓存也必须一起失效。
   换根目录时 SQLite 也可能复用 item id，所以成批清理时按 id 集合一次扫完。 */
function dropItemCaches(itemIds) {
  const ids = new Set((itemIds || []).map(Number).filter(Number.isInteger));
  if (!ids.size) return 0;
  let removed = 0;
  const thumbsRoot = THUMB_DIR;
  try {
    for (const size of fs.readdirSync(thumbsRoot)) {
      const dir = path.join(thumbsRoot, size);
      let names = [];
      try {
        names = fs.readdirSync(dir);
      } catch {
        continue;
      }
      for (const name of names) {
        const m = /^(\d+)(?:-fit)?\.webp$/.exec(name);
        if (m && ids.has(Number(m[1]))) {
          try {
            fs.rmSync(path.join(dir, name), { force: true });
            removed += 1;
          } catch {}
        }
      }
    }
  } catch {}
  /* 照片墙缩略图使用另一套文件名。这里也必须按照片 ID 清理，
     否则重新导入并复用 ID 后会把旧根目录的照片当成新照片显示。 */
  const photoWallDir = path.join(THUMB_DIR, "photo-wall");
  try {
    for (const name of fs.readdirSync(photoWallDir)) {
      const match = /^(\d+)-.+\.webp(?:\.part)?$/.exec(name);
      if (match && ids.has(Number(match[1]))) {
        try {
          fs.rmSync(path.join(photoWallDir, name), { force: true });
          removed += 1;
        } catch {}
      }
    }
  } catch {}
  const masonryWallDir = path.join(THUMB_DIR, "masonry-wall");
  try {
    for (const name of fs.readdirSync(masonryWallDir)) {
      const match = /^(\d+)-.+\.webp(?:\.part)?$/.exec(name);
      if (match && ids.has(Number(match[1]))) {
        try {
          fs.rmSync(path.join(masonryWallDir, name), { force: true });
          removed += 1;
        } catch {}
      }
    }
  } catch {}
  const filmrollWallDir = path.join(THUMB_DIR, "filmroll-wall");
  try {
    for (const name of fs.readdirSync(filmrollWallDir)) {
      const match = /^(\d+)-.+\.webp(?:\.part)?$/.exec(name);
      if (match && ids.has(Number(match[1]))) {
        try {
          fs.rmSync(path.join(filmrollWallDir, name), { force: true });
          removed += 1;
        } catch {}
      }
    }
  } catch {}
  for (const id of ids) {
    for (const name of [
      `${id}.jpg`,
      `${id}-full.jpg`,
      `${id}-opening.jpg`,
      `${id}-first.jpg`,
    ]) {
      try {
        fs.rmSync(path.join(PREVIEW_DIR, name), { force: true });
        removed += 1;
      } catch {}
    }
  }
  try {
    for (const dirName of fs.readdirSync(EDIT_DIR)) {
      const dir = path.join(EDIT_DIR, dirName);
      let names = [];
      try {
        names = fs.readdirSync(dir);
      } catch {
        continue;
      }
      for (const name of names) {
        const match = /^(\d+)-/.exec(name);
        if (!match || !ids.has(Number(match[1]))) continue;
        try {
          fs.rmSync(path.join(dir, name), { force: true });
          removed += 1;
        } catch {}
      }
    }
  } catch {}
  return removed;
}

const dropItemCache = (itemId) => dropItemCaches([itemId]);

function dropPhotoWallCrops(itemIds) {
  const ids = [
    ...new Set((itemIds || []).map(Number).filter(Number.isInteger)),
  ];
  if (!ids.length) return 0;
  const remove = openDb().prepare(
    "DELETE FROM photo_wall_crops WHERE item_id = ?",
  );
  let removed = 0;
  for (const id of ids) removed += Number(remove.run(id).changes) || 0;
  return removed;
}

function dropMasonryWallCrops(itemIds) {
  const ids = [
    ...new Set((itemIds || []).map(Number).filter(Number.isInteger)),
  ];
  if (!ids.length) return 0;
  const remove = openDb().prepare(
    "DELETE FROM masonry_wall_crops WHERE item_id = ?",
  );
  let removed = 0;
  for (const id of ids) removed += Number(remove.run(id).changes) || 0;
  return removed;
}

function dropFilmrollWallCrops(itemIds) {
  const ids = [
    ...new Set((itemIds || []).map(Number).filter(Number.isInteger)),
  ];
  if (!ids.length) return 0;
  const remove = openDb().prepare(
    "DELETE FROM filmroll_wall_crops WHERE item_id = ?",
  );
  let removed = 0;
  for (const id of ids) removed += Number(remove.run(id).changes) || 0;
  return removed;
}

function dropMosaicWallCrops(itemIds) {
  const ids = [
    ...new Set((itemIds || []).map(Number).filter(Number.isInteger)),
  ];
  if (!ids.length) return 0;
  const remove = openDb().prepare(
    "DELETE FROM mosaic_wall_crops WHERE item_id = ?",
  );
  let removed = 0;
  for (const id of ids) removed += Number(remove.run(id).changes) || 0;
  return removed;
}

function getItemEdit(itemId) {
  const row = openDb()
    .prepare(
      `SELECT recipe_json AS recipeJson, revision, updated_at AS updatedAt
     FROM item_edits e
     JOIN items i ON i.id = e.item_id
     WHERE e.item_id = ? AND i.deleted_at IS NULL
       AND i.kind IN ('photo', 'video')`,
    )
    .get(Number(itemId));
  if (!row) return null;
  let recipe;
  try {
    recipe = editModel.normalizeRecipe(JSON.parse(row.recipeJson));
  } catch {
    return null;
  }
  return {
    recipe,
    revision: Number(row.revision) || Number(row.updatedAt) || 0,
    updatedAt: Number(row.updatedAt) || 0,
  };
}

function setItemEdit(itemId, value) {
  const item = getItem(Number(itemId));
  if (!item || !["photo", "video"].includes(item.kind)) {
    throw new Error("只能编辑照片或视频");
  }
  const recipe = editModel.normalizeRecipe(value);
  if (isRaw(item.path) && editModel.hasAdjustmentEdit(recipe)) {
    throw new Error("RAW 照片只支持软件内裁剪和几何调整");
  }
  if (!editModel.hasEdit(recipe)) return deleteItemEdit(item.id);
  const updatedAt = Date.now();
  const revision = updatedAt;
  openDb()
    .prepare(
      `INSERT INTO item_edits (item_id, recipe_json, revision, updated_at)
     VALUES (?, ?, ?, ?)
     ON CONFLICT(item_id) DO UPDATE SET
       recipe_json = excluded.recipe_json,
       revision = excluded.revision,
       updated_at = excluded.updated_at`,
    )
    .run(item.id, JSON.stringify(recipe), revision, updatedAt);
  return { recipe, revision, updatedAt, removed: false };
}

function deleteItemEdit(itemId) {
  const id = Number(itemId);
  const info = openDb()
    .prepare("DELETE FROM item_edits WHERE item_id = ?")
    .run(id);
  return {
    recipe: editModel.normalizeRecipe(null),
    revision: 0,
    updatedAt: Date.now(),
    removed: Number(info.changes) > 0,
  };
}

function normalizeVideoPoster(value, item) {
  const duration = Math.max(0, Number(item?.duration) || 0);
  const rawTime = Number(value?.frameTime);
  const frameTime = Number.isFinite(rawTime)
    ? Math.min(
        duration > 0 ? Math.max(0, duration - 0.02) : rawTime,
        Math.max(0, rawTime),
      )
    : 0;
  const recipe = editModel.normalizeRecipe(value?.recipe);
  for (const key of editModel.ADJUSTMENT_KEYS) recipe.adjustments[key] = 0;
  return { frameTime, recipe };
}

function getVideoPoster(itemId) {
  const row = openDb()
    .prepare(
      `SELECT vp.frame_time AS frameTime, vp.recipe_json AS recipeJson,
              vp.revision, vp.updated_at AS updatedAt
       FROM video_posters vp
       JOIN items i ON i.id = vp.item_id
       WHERE vp.item_id = ? AND i.kind = 'video'`,
    )
    .get(Number(itemId));
  if (!row) return null;
  let recipe;
  try {
    recipe = editModel.normalizeRecipe(JSON.parse(row.recipeJson));
  } catch {
    return null;
  }
  return {
    frameTime: Math.max(0, Number(row.frameTime) || 0),
    recipe,
    revision: Number(row.revision) || Number(row.updatedAt) || 0,
    updatedAt: Number(row.updatedAt) || 0,
  };
}

function setVideoPoster(itemId, value) {
  const item = getItem(Number(itemId));
  if (!item || item.kind !== "video") throw new Error("只能为视频设置封面");
  const poster = normalizeVideoPoster(value, item);
  const updatedAt = Date.now();
  const current = getVideoPoster(item.id);
  const revision = Math.max(updatedAt, (current?.revision || 0) + 1);
  openDb()
    .prepare(
      `INSERT INTO video_posters
         (item_id, frame_time, recipe_json, revision, updated_at)
       VALUES (?, ?, ?, ?, ?)
       ON CONFLICT(item_id) DO UPDATE SET
         frame_time = excluded.frame_time,
         recipe_json = excluded.recipe_json,
         revision = excluded.revision,
         updated_at = excluded.updated_at`,
    )
    .run(
      item.id,
      poster.frameTime,
      JSON.stringify(poster.recipe),
      revision,
      updatedAt,
    );
  return { ...poster, revision, updatedAt };
}

function deleteVideoPoster(itemId) {
  const id = Number(itemId);
  const current = getVideoPoster(id);
  const info = openDb()
    .prepare("DELETE FROM video_posters WHERE item_id = ?")
    .run(id);
  return {
    removed: Number(info.changes) > 0,
    previous: current,
    revision: 0,
    updatedAt: Date.now(),
  };
}

function setItemEditAndVideoPoster(itemId, value, posterChange) {
  const database = openDb();
  database.exec("BEGIN IMMEDIATE");
  try {
    const editResult = setItemEdit(itemId, value);
    let videoPoster;
    let videoPosterRemoved = false;
    if (posterChange === null) {
      videoPosterRemoved = deleteVideoPoster(itemId).removed;
      videoPoster = null;
    } else if (posterChange !== undefined) {
      videoPoster = setVideoPoster(itemId, posterChange);
    } else {
      videoPoster = getVideoPoster(itemId);
    }
    database.exec("COMMIT");
    return { ...editResult, videoPoster, videoPosterRemoved };
  } catch (error) {
    database.exec("ROLLBACK");
    throw error;
  }
}

function removeDirectoryContents(dirPath) {
  let removed = 0;
  try {
    for (const name of fs.readdirSync(dirPath)) {
      fs.rmSync(path.join(dirPath, name), { recursive: true, force: true });
      removed += 1;
    }
  } catch {}
  return removed;
}

/**
 * 换库或重新导入根目录时，索引项目 ID 会重新使用。
 * 所有按 ID 命名的媒体派生缓存都必须在扫描新根目录前整批失效。
 */
function clearMediaCaches() {
  const files =
    removeDirectoryContents(THUMB_DIR) +
    removeDirectoryContents(PREVIEW_DIR) +
    removeDirectoryContents(EDIT_DIR);
  const crops =
    Number(openDb().prepare("DELETE FROM photo_wall_crops").run().changes) || 0;
  const masonryCrops =
    Number(openDb().prepare("DELETE FROM masonry_wall_crops").run().changes) ||
    0;
  const filmrollCrops =
    Number(openDb().prepare("DELETE FROM filmroll_wall_crops").run().changes) ||
    0;
  const mosaicCrops =
    Number(openDb().prepare("DELETE FROM mosaic_wall_crops").run().changes) ||
    0;
  const edits =
    Number(openDb().prepare("DELETE FROM item_edits").run().changes) || 0;
  return { files, crops, masonryCrops, filmrollCrops, mosaicCrops, edits };
}

/** 让 1、2、10 这种数字文件夹按数字排，而不是按字符串排 */
function sortKey(name) {
  const m = /^(\d+)/.exec(name);
  return m ? `0${String(m[1]).padStart(10, "0")}` : `1${name}`;
}

function isHidden(name) {
  const lower = name.toLowerCase();
  return (
    name.startsWith(".") ||
    name.startsWith("$") ||
    lower === "thumbs.db" ||
    lower === "desktop.ini" ||
    name === "__MACOSX"
  );
}

/* 这些是软件自己的缓存/资源包，不是用户放照片的地方，直接跳过 */
const JUNK_DIR =
  /\.(lrdata|lrcat-data|lrlibrary|lrprev|photoslibrary|photolibrary|migratedlibrary|app|framework|bundle|thumbnails|cache)$/i;
const isJunkDir = (name) =>
  JUNK_DIR.test(name) ||
  /^(node_modules|\.git|\$RECYCLE\.BIN|System Volume Information)$/i.test(name);

const SCAN_STAT_CONCURRENCY = 16;
const SCAN_STAGE_BATCH_SIZE = 500;

async function mapWithConcurrency(items, limit, mapper) {
  const results = new Array(items.length);
  let next = 0;
  const workers = Array.from(
    { length: Math.min(Math.max(1, limit), items.length) },
    async () => {
      while (next < items.length) {
        const index = next++;
        results[index] = await mapper(items[index], index);
      }
    },
  );
  await Promise.all(workers);
  return results;
}

function virtualAlbumPath() {
  return `virtual:${crypto.randomUUID()}`;
}

function ensureRootContainer(database, root) {
  let album = database
    .prepare(
      "SELECT * FROM albums WHERE root_id = ? AND kind = 'unfiled' ORDER BY id LIMIT 1",
    )
    .get(root.id);
  if (album) return album;
  const info = database
    .prepare(
      `INSERT INTO albums
       (root_id, parent_id, path, name, depth, sort_key, sort_order, kind, source_path)
     VALUES (?, NULL, ?, ?, 0, ?, 0, 'unfiled', ?)`,
    )
    .run(root.id, root.path, root.name, sortKey(root.name), root.path);
  return database
    .prepare("SELECT * FROM albums WHERE id = ?")
    .get(Number(info.lastInsertRowid));
}

function appendAlbumRow(
  database,
  rootId,
  parentId,
  name,
  depth,
  sourcePath = null,
) {
  const maxOrder = database
    .prepare(
      "SELECT MAX(sort_order) AS n FROM albums WHERE root_id = ? AND parent_id IS ?",
    )
    .get(rootId, parentId).n;
  const nextOrder = maxOrder == null ? null : Number(maxOrder) + 1;
  const info = database
    .prepare(
      `INSERT INTO albums
       (root_id, parent_id, path, name, depth, sort_key, sort_order, kind, source_path)
     VALUES (?, ?, ?, ?, ?, ?, ?, NULL, ?)`,
    )
    .run(
      rootId,
      parentId,
      sourcePath || virtualAlbumPath(),
      name,
      depth,
      sortKey(name),
      nextOrder,
      sourcePath,
    );
  return Number(info.lastInsertRowid);
}

async function directoryHasMedia(dir, depth = 0) {
  if (depth > 12) return false;
  const entries = await readDirectoryEntries(dir);
  for (const ent of entries) {
    if (isHidden(ent.name)) continue;
    const full = path.join(dir, ent.name);
    if (ent.isFile() && kindOf(ent.name)) return true;
    if (
      ent.isDirectory() &&
      !isJunkDir(ent.name) &&
      (await directoryHasMedia(full, depth + 1))
    )
      return true;
  }
  return false;
}

/**
 * 扫描只持续读取根目录里的媒体文件。相簿树仅在第一次导入（或用户确认
 * 导入一个新文件夹）时建立快照；之后的文件夹改名、新增和删除都不会重排
 * 已有软件相簿。新项目一律先进入图库和「未归档」。
 */
async function scanRoot(rootId, opts = {}) {
  const database = openDb();
  const root = database.prepare("SELECT * FROM roots WHERE id = ?").get(rootId);
  if (!root) throw new Error("根文件夹不存在");
  if (!fs.existsSync(root.path))
    throw new Error("文件夹不存在或已移动：" + root.path);

  const maxDepth = Number(opts.maxDepth ?? 3);
  const initialImport = !root.snapshot_at;
  const seenAlbums = new Set();
  let createdAlbums = 0;
  let removedItems = 0;
  const rootAlbum = ensureRootContainer(database, root);
  seenAlbums.add(Number(rootAlbum.id));

  /*
   * 扫描结果先写入 SQLite 临时表。这样不会把整棵目录树保存在 JS 堆里，
   * 也只在完整遍历成功后才替换正式索引；读取失败时可安全丢弃整批扫描。
   */
  database.exec(`
    CREATE TEMP TABLE IF NOT EXISTS scan_stage_dirs (
      stage_id    INTEGER PRIMARY KEY AUTOINCREMENT,
      path        TEXT UNIQUE NOT NULL,
      parent_path TEXT,
      depth       INTEGER NOT NULL
    );
    CREATE TEMP TABLE IF NOT EXISTS scan_stage_files (
      stage_id INTEGER PRIMARY KEY AUTOINCREMENT,
      dir_path TEXT NOT NULL,
      path     TEXT UNIQUE NOT NULL,
      name     TEXT NOT NULL,
      kind     TEXT NOT NULL,
      size     INTEGER NOT NULL,
      mtime    INTEGER NOT NULL
    );
    DELETE FROM scan_stage_dirs;
    DELETE FROM scan_stage_files;
  `);
  const insertStageDir = database.prepare(
    `INSERT OR IGNORE INTO scan_stage_dirs (path, parent_path, depth)
     VALUES (?, ?, ?)`,
  );
  const insertStageFile = database.prepare(
    `INSERT OR IGNORE INTO scan_stage_files
       (dir_path, path, name, kind, size, mtime)
     VALUES (?, ?, ?, ?, ?, ?)`,
  );
  let pendingStageDirs = [];
  let pendingStageFiles = [];
  const clearScanStage = () => {
    try {
      database.exec(
        "DELETE FROM scan_stage_dirs; DELETE FROM scan_stage_files;",
      );
    } catch {}
  };
  const flushScanStage = () => {
    if (!pendingStageDirs.length && !pendingStageFiles.length) return;
    database.exec("BEGIN IMMEDIATE");
    try {
      for (const row of pendingStageDirs) {
        insertStageDir.run(row.path, row.parentPath, row.depth);
      }
      for (const row of pendingStageFiles) {
        insertStageFile.run(
          row.dirPath,
          row.path,
          row.name,
          row.kind,
          row.size,
          row.mtime,
        );
      }
      database.exec("COMMIT");
    } catch (err) {
      database.exec("ROLLBACK");
      throw err;
    }
    pendingStageDirs = [];
    pendingStageFiles = [];
  };

  const snapshotStmt = database.prepare(
    "SELECT * FROM directory_snapshots WHERE root_id = ? AND path = ?",
  );
  const insertSnapshot = database.prepare(
    `INSERT OR IGNORE INTO directory_snapshots
       (root_id, path, status, album_id, seen_at) VALUES (?, ?, ?, ?, ?)`,
  );
  const updateSnapshot = database.prepare(
    `UPDATE directory_snapshots
     SET status = ?, album_id = COALESCE(?, album_id), seen_at = ?
     WHERE root_id = ? AND path = ?`,
  );
  const selectItemByPath = database.prepare(
    `SELECT id, size, mtime, name, kind, album_id FROM items
     WHERE root_id = ? AND path = ?`,
  );
  const updateItem = database.prepare(
    `UPDATE items
     SET name = ?, size = ?, mtime = ?, kind = ?, album_id = ?
     WHERE id = ?`,
  );
  const markItemMetadataPending = database.prepare(
    "UPDATE items SET meta_state = 'pending' WHERE id = ?",
  );
  const insertItem = database.prepare(
    `INSERT INTO items
       (root_id, album_id, path, name, kind, size, mtime, added_seq, meta_state)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending')`,
  );
  const directAlbumQuery = database.prepare(
    `SELECT album_id FROM directory_snapshots
     WHERE root_id = ? AND path = ? AND status = 'imported'`,
  );
  const insertItemAlbum = database.prepare(
    `INSERT OR IGNORE INTO item_albums
       (item_id, album_id, added_seq, added_at) VALUES (?, ?, ?, ?)`,
  );
  let nextSequence = nextAddedSeq(database);
  const ensureImportedDirectory = (dirPath, parentAlbumId, depth) => {
    const existing = snapshotStmt.get(root.id, dirPath);
    if (existing?.status === "imported" && existing.album_id != null) {
      seenAlbums.add(Number(existing.album_id));
      return Number(existing.album_id);
    }
    const id = appendAlbumRow(
      database,
      root.id,
      parentAlbumId,
      path.basename(dirPath) || dirPath,
      depth,
      dirPath,
    );
    createdAlbums += 1;
    updateSnapshot.run("imported", id, Date.now(), root.id, dirPath);
    if (!existing) {
      insertSnapshot.run(root.id, dirPath, "imported", id, Date.now());
    }
    seenAlbums.add(id);
    return id;
  };

  const upsertItem = (filePath, name, kind, stat) => {
    const size = Number(stat.size);
    const mtime = Math.floor(Number(stat.mtimeMs ?? stat.mtime));
    const row = selectItemByPath.get(root.id, filePath);
    if (row) {
      const statChanged = row.size !== size || row.mtime !== mtime;
      const identityChanged =
        row.name !== name ||
        row.kind !== kind ||
        Number(row.album_id) !== Number(rootAlbum.id);
      if (statChanged || identityChanged) {
        updateItem.run(name, size, mtime, kind, rootAlbum.id, row.id);
      }
      if (statChanged) {
        dropItemCache(row.id);
        markItemMetadataPending.run(row.id);
      }
      return Number(row.id);
    }
    const info = insertItem.run(
      root.id,
      rootAlbum.id,
      filePath,
      name,
      kind,
      size,
      mtime,
      nextSequence++,
    );
    return Number(info.lastInsertRowid);
  };

  let discoveredItems = 0;
  async function stageDirectory(dir, parentPath, depth) {
    pendingStageDirs.push({ path: dir, parentPath, depth });
    const entries = await readDirectoryEntries(dir);
    const directories = [];
    const files = [];
    for (const ent of entries) {
      if (isHidden(ent.name)) continue;
      const full = path.join(dir, ent.name);
      if (ent.isDirectory()) {
        if (!isJunkDir(ent.name) && depth < maxDepth) {
          directories.push(full);
        }
      } else if (ent.isFile() && kindOf(ent.name)) {
        files.push({ path: full, name: ent.name, kind: kindOf(ent.name) });
      }
    }
    const stats = await mapWithConcurrency(
      files,
      SCAN_STAT_CONCURRENCY,
      async (file) => {
        const stat = await statMediaEntry(file.path);
        if (!stat) return null;
        return {
          dirPath: dir,
          path: file.path,
          name: file.name,
          kind: file.kind,
          size: Number(stat.size),
          mtime: Math.floor(stat.mtimeMs),
        };
      },
    );
    for (const file of stats) {
      if (!file) continue;
      pendingStageFiles.push(file);
      discoveredItems += 1;
    }
    if (
      pendingStageDirs.length + pendingStageFiles.length >=
      SCAN_STAGE_BATCH_SIZE
    ) {
      flushScanStage();
      updateScanState(root.id, {
        scanned: discoveredItems,
        message: `正在读取磁盘项目…已发现 ${discoveredItems.toLocaleString("zh-CN")} 个`,
      });
    }
    for (const child of directories) {
      await stageDirectory(child, dir, depth + 1);
    }
  }

  function applyStagedScan() {
    const directories = database
      .prepare(
        `SELECT path, parent_path AS parentPath, depth
         FROM scan_stage_dirs ORDER BY depth, stage_id`,
      )
      .all();
    const directoryAlbums = new Map();
    const directoryDepths = new Map();
    for (const directory of directories) {
      const parentPath = directory.parentPath;
      let albumId =
        directory.depth === 0
          ? Number(rootAlbum.id)
          : (directoryAlbums.get(parentPath) ?? Number(rootAlbum.id));
      if (directory.depth > 0) {
        if (initialImport) {
          albumId = ensureImportedDirectory(
            directory.path,
            directory.depth === 1 ? null : albumId,
            directory.depth,
          );
        } else {
          const snap = snapshotStmt.get(root.id, directory.path);
          if (!snap) {
            insertSnapshot.run(
              root.id,
              directory.path,
              "waiting",
              null,
              Date.now(),
            );
          } else if (snap.status === "imported" && snap.album_id != null) {
            albumId = Number(snap.album_id);
            seenAlbums.add(albumId);
          }
        }
      }
      directoryAlbums.set(directory.path, albumId);
      directoryDepths.set(directory.path, directory.depth);
    }
    insertSnapshot.run(
      root.id,
      root.path,
      "imported",
      rootAlbum.id,
      Date.now(),
    );

    const selectFiles = database.prepare(
      `SELECT stage_id AS stageId, dir_path AS dirPath, path, name, kind,
              size, mtime
       FROM scan_stage_files
       WHERE stage_id > ?
       ORDER BY stage_id
       LIMIT 1000`,
    );
    let lastStageId = 0;
    while (true) {
      const files = selectFiles.all(lastStageId);
      if (!files.length) break;
      for (const file of files) {
        const itemId = upsertItem(file.path, file.name, file.kind, file);
        if (initialImport && Number(directoryDepths.get(file.dirPath)) > 0) {
          const direct = directAlbumQuery.get(root.id, file.dirPath);
          if (direct?.album_id != null) {
            insertItemAlbum.run(
              itemId,
              direct.album_id,
              nextSequence++,
              Date.now(),
            );
          }
        }
      }
      lastStageId = Number(files[files.length - 1].stageId);
    }

    const staleItemIds = database
      .prepare(
        `SELECT id FROM items
         WHERE root_id = ?
           AND NOT EXISTS (
             SELECT 1 FROM scan_stage_files staged WHERE staged.path = items.path
           )`,
      )
      .all(root.id)
      .map((row) => Number(row.id));
    const removeMembership = database.prepare(
      "DELETE FROM item_albums WHERE item_id = ?",
    );
    const removeMetadata = database.prepare(
      "DELETE FROM item_metadata_overrides WHERE item_id = ?",
    );
    const removeEdit = database.prepare(
      "DELETE FROM item_edits WHERE item_id = ?",
    );
    const removeVideoPoster = database.prepare(
      "DELETE FROM video_posters WHERE item_id = ?",
    );
    const deleteItem = database.prepare("DELETE FROM items WHERE id = ?");
    for (const itemId of staleItemIds) {
      deleteItem.run(itemId);
      removeMembership.run(itemId);
      removeMetadata.run(itemId);
      removeEdit.run(itemId);
      removeVideoPoster.run(itemId);
    }
    if (initialImport) {
      database
        .prepare(
          "UPDATE roots SET snapshot_at = ?, import_id = COALESCE(import_id, ?) WHERE id = ?",
        )
        .run(Date.now(), crypto.randomUUID(), root.id);
    }
    return staleItemIds;
  }

  lastScanRootId = root.id;
  updateScanState(root.id, {
    running: true,
    rootId: root.id,
    rootPath: root.path,
    phase: "walk",
    scanned: 0,
    total: 0,
    message: initialImport ? "正在建立相簿快照…" : "正在读取磁盘项目…",
  });
  try {
    await stageDirectory(root.path, null, 0);
    flushScanStage();
    updateScanState(root.id, {
      scanned: discoveredItems,
      message: `已发现 ${discoveredItems.toLocaleString("zh-CN")} 个媒体文件，正在写入索引…`,
    });
    let staleItemIds = [];
    database.exec("BEGIN IMMEDIATE");
    try {
      staleItemIds = applyStagedScan();
      database.exec("COMMIT");
    } catch (err) {
      database.exec("ROLLBACK");
      throw err;
    }
    clearScanStage();
    removedItems = staleItemIds.length;
    dropItemCaches(staleItemIds);
    dropPhotoWallCrops(staleItemIds);
    dropMasonryWallCrops(staleItemIds);
    dropFilmrollWallCrops(staleItemIds);
    dropMosaicWallCrops(staleItemIds);

    if (!initialImport) {
      /* 新建空文件夹先等待；里面出现可读取的媒体后，下一次扫描再询问。 */
      const unknown = database
        .prepare(
          `SELECT path, status FROM directory_snapshots
         WHERE root_id = ? AND status IN ('waiting', 'pending')`,
        )
        .all(root.id);
      for (const row of unknown) {
        const hasMedia = await directoryHasMedia(row.path);
        const status = hasMedia ? "pending" : "waiting";
        database
          .prepare(
            `UPDATE directory_snapshots SET status = ?, seen_at = ?
           WHERE root_id = ? AND path = ?`,
          )
          .run(status, Date.now(), root.id, row.path);
      }
    }

    updateScanState(root.id, {
      phase: "meta",
      message: "正在读取拍摄信息…",
    });
    database
      .prepare(
        `UPDATE items SET meta_state = 'pending'
         WHERE root_id = ? AND meta_state = 'done' AND deleted_at IS NULL
           AND ignored_at = 0 AND width IS NULL AND height IS NULL`,
      )
      .run(root.id);
    const pendingCount = Number(
      database
        .prepare(
          `SELECT COUNT(*) AS n FROM items
           WHERE root_id = ? AND meta_state = 'pending' AND ignored_at = 0`,
        )
        .get(root.id).n,
    );
    updateScanState(root.id, { total: pendingCount, scanned: 0 });
    if (pendingCount) await readMetadata(root.id);
    database
      .prepare(
        "UPDATE items SET meta_state = 'done' WHERE root_id = ? AND meta_state = 'pending'",
      )
      .run(root.id);
    const livePairs = refreshLivePairs(root.id);

    updateScanState(root.id, {
      running: false,
      phase: "done",
      finishedAt: Date.now(),
      message: `扫描完成：${discoveredItems} 个媒体文件`,
    });
    return {
      albums: seenAlbums.size,
      createdAlbums,
      items: discoveredItems,
      removedAlbums: 0,
      removedItems,
      metadataParsed: pendingCount,
      livePairs,
    };
  } catch (err) {
    clearScanStage();
    updateScanState(root.id, {
      running: false,
      phase: "error",
      message: String(err.message || err),
    });
    throw err;
  }
}

function isPathInside(parentPath, childPath) {
  const relative = path.relative(
    path.resolve(parentPath),
    path.resolve(childPath),
  );
  return (
    relative === "" ||
    (!relative.startsWith("..") && !path.isAbsolute(relative))
  );
}

/** 待确认的外部新文件夹。只展示最上层的待确认项，避免整棵目录连续弹窗。 */
function getPendingFolderPrompts(rootId = null) {
  const database = openDb();
  const id = rootId == null ? null : Number(rootId);
  const byRoot = Number.isInteger(id);
  const rows = database
    .prepare(
      `
    SELECT d.path, d.root_id AS rootId, r.path AS rootPath
    FROM directory_snapshots d
    JOIN roots r ON r.id = d.root_id
    WHERE d.status = 'pending'
      ${byRoot ? "AND d.root_id = ?" : ""}
    ORDER BY LENGTH(d.path) ASC, d.path ASC
  `,
    )
    .all(...(byRoot ? [id] : []));
  const pending = new Set(rows.map((row) => row.path));
  return rows
    .filter((row) => {
      const parentPath = path.dirname(row.path);
      return parentPath === row.rootPath || !pending.has(parentPath);
    })
    .map((row) => ({
      path: row.path,
      name: path.basename(row.path),
      rootId: Number(row.rootId),
    }));
}

function nearestImportedAlbum(database, rootId, rootPath, dirPath) {
  let current = dirPath;
  while (isPathInside(rootPath, current)) {
    const row = database
      .prepare(
        `
      SELECT album_id FROM directory_snapshots
      WHERE root_id = ? AND path = ? COLLATE NOCASE AND status = 'imported'
    `,
      )
      .get(rootId, current);
    if (row?.album_id != null) return Number(row.album_id);
    if (path.resolve(current) === path.resolve(rootPath)) break;
    current = path.dirname(current);
  }
  return ensureRootContainer(
    database,
    database.prepare("SELECT * FROM roots WHERE id = ?").get(rootId),
  ).id;
}

/**
 * 将磁盘上的一个外部文件夹按“此刻”的结构和内容导入成软件相簿。
 * 之后该文件夹继续变化不会更新相簿。拒绝只记录当前导入，不碰磁盘。
 */
async function importExternalFolder(rootId, rawPath, { dismiss = false } = {}) {
  const database = openDb();
  const root = database
    .prepare("SELECT * FROM roots WHERE id = ?")
    .get(Number(rootId));
  if (!root) throw new Error("相簿库不存在");
  const folderPath = path.resolve(String(rawPath || ""));
  if (
    !isPathInside(root.path, folderPath) ||
    path.resolve(folderPath) === path.resolve(root.path)
  ) {
    throw new Error("只能导入当前根目录里面的子文件夹");
  }
  if (!fs.existsSync(folderPath) || !fs.statSync(folderPath).isDirectory()) {
    throw new Error("这个文件夹已经不存在了");
  }
  const existingTop = database
    .prepare(
      `
    SELECT status, album_id FROM directory_snapshots
    WHERE root_id = ? AND path = ? COLLATE NOCASE
  `,
    )
    .get(root.id, folderPath);
  if (
    !dismiss &&
    existingTop?.status === "imported" &&
    existingTop.album_id != null &&
    database
      .prepare("SELECT id FROM albums WHERE id = ?")
      .get(existingTop.album_id)
  ) {
    throw new Error("这个文件夹已经导入过了");
  }

  const prefix = `${folderPath}${path.sep}`.toLowerCase();
  if (dismiss) {
    const rows = database
      .prepare("SELECT path FROM directory_snapshots WHERE root_id = ?")
      .all(root.id);
    const update = database.prepare(`
      UPDATE directory_snapshots SET status = 'declined', seen_at = ?
      WHERE root_id = ? AND path = ?
    `);
    for (const row of rows) {
      const lower = row.path.toLowerCase();
      if (lower === folderPath.toLowerCase() || lower.startsWith(prefix)) {
        update.run(Date.now(), root.id, row.path);
      }
    }
    return { imported: 0, dismissed: true, path: folderPath };
  }

  const maxDepth = 3;
  const seenAlbums = new Set();
  const insertSnapshot = database.prepare(`
    INSERT INTO directory_snapshots
      (root_id, path, status, album_id, seen_at) VALUES (?, ?, 'imported', ?, ?)
    ON CONFLICT(root_id, path) DO UPDATE SET
      status = 'imported', album_id = excluded.album_id, seen_at = excluded.seen_at
  `);
  const insertMembership = database.prepare(`
    INSERT OR IGNORE INTO item_albums
      (item_id, album_id, added_seq, added_at) VALUES (?, ?, ?, ?)
  `);
  const itemAtPath = database.prepare(
    "SELECT id FROM items WHERE root_id = ? AND path = ? COLLATE NOCASE",
  );
  let importedAlbums = 0;

  async function walk(dir, parentAlbumId, depth) {
    const albumId = appendAlbumRow(
      database,
      root.id,
      parentAlbumId,
      path.basename(dir) || dir,
      depth,
      dir,
    );
    importedAlbums += 1;
    seenAlbums.add(albumId);
    insertSnapshot.run(root.id, dir, albumId, Date.now());
    const entries = await readDirectoryEntries(dir);
    for (const ent of entries) {
      if (isHidden(ent.name)) continue;
      const full = path.join(dir, ent.name);
      if (ent.isDirectory() && !isJunkDir(ent.name) && depth < maxDepth) {
        await walk(full, albumId, depth + 1);
      } else if (ent.isFile() && kindOf(ent.name)) {
        const item = itemAtPath.get(root.id, full);
        if (item) {
          insertMembership.run(
            item.id,
            albumId,
            nextAddedSeq(database),
            Date.now(),
          );
        }
      }
    }
  }

  const physicalParent = path.dirname(folderPath);
  const parentAlbumId =
    path.resolve(physicalParent) === path.resolve(root.path)
      ? null
      : nearestImportedAlbum(
          database,
          root.id,
          root.path,
          path.dirname(folderPath),
        );
  database.exec("BEGIN IMMEDIATE");
  try {
    await walk(folderPath, parentAlbumId, 1);
    database.exec("COMMIT");
  } catch (err) {
    database.exec("ROLLBACK");
    throw err;
  }
  return {
    imported: importedAlbums,
    dismissed: false,
    path: folderPath,
    albumIds: [...seenAlbums],
  };
}

/* --------------------- 用 exiftool 读拍摄信息 --------------------- */

/** 把文件列表写成 exiftool 的 @argfile，避免中文路径在命令行里被转码搞坏 */
function writeArgfile(lines, tag) {
  fs.mkdirSync(EXIF_ARG_DIR, { recursive: true });
  const file = path.join(
    EXIF_ARG_DIR,
    `args-${String(tag).replace(/[^a-z0-9_-]+/gi, "-")}-${Date.now()}.txt`,
  );
  fs.writeFileSync(file, lines.join("\n") + "\n", "utf8");
  return file;
}

function runExiftool(args, { encoding = "utf8" } = {}) {
  return new Promise((resolve) => {
    execFile(
      EXIFTOOL,
      ["-charset", "filename=UTF8", "-q", "-q", ...args],
      {
        maxBuffer: 512 * 1024 * 1024,
        encoding,
        windowsHide: true,
      },
      (err, stdout) => {
        if (err && !stdout) return resolve(null);
        resolve(stdout);
      },
    );
  });
}

/** exiftool 的 "2026:08:07 23:17:29" → 毫秒时间戳 */
function toEpoch(value) {
  if (!value) return null;
  const m = /^(\d{4}):(\d{2}):(\d{2})[ T](\d{2}):(\d{2}):(\d{2})/.exec(
    String(value),
  );
  if (!m) {
    const t = Date.parse(String(value));
    return Number.isFinite(t) ? t : null;
  }
  const [, y, mo, d, h, mi, s] = m.map(Number);
  if (!y || y < 1900) return null;
  return new Date(y, mo - 1, d, h, mi, s).getTime();
}

async function readMetadata(rootId = lastScanRootId) {
  /* 参数走 @argfile，不受命令行长度限制。批次大一些可显著减少在 Windows
     上启动 ExifTool 的次数，同时输出仍远低于 512 MB 的缓冲区上限。 */
  const BATCH = 500;
  const database = openDb();
  const selectBatch = database.prepare(
    `SELECT id, path FROM items
     WHERE root_id = ? AND meta_state = 'pending' AND ignored_at = 0
       AND id > ?
     ORDER BY id
     LIMIT ?`,
  );
  const stmt = database.prepare(
    `UPDATE items SET width=?, height=?, taken_at=?, camera=?, lens=?, iso=?, f_number=?,
     exposure=?, focal=?, gps_lat=?, gps_lon=?, orientation=?, duration=?,
     fps=?, codec=?, content_id=? WHERE id=?`,
  );
  let lastId = -1;
  let processed = 0;
  while (true) {
    const slice = selectBatch.all(Number(rootId), lastId, BATCH);
    if (!slice.length) break;
    lastId = Number(slice[slice.length - 1].id);
    const argfile = writeArgfile(
      slice.map((r) => r.path),
      `meta${lastId}`,
    );
    const out = await runExiftool([
      "-j",
      "-n",
      "-struct",
      "-DateTimeOriginal",
      "-CreateDate",
      "-MediaCreateDate",
      "-TrackCreateDate",
      "-Make",
      "-Model",
      "-LensModel",
      "-LensID",
      "-ISO",
      "-FNumber",
      "-ExposureTime",
      "-FocalLength",
      "-ImageWidth",
      "-ImageHeight",
      "-ImageSize",
      "-Orientation",
      "-GPSLatitude",
      "-GPSLongitude",
      "-Duration",
      "-Rotation",
      "-VideoFrameRate",
      "-FrameRate",
      "-AvgFrameRate",
      "-VideoCodec",
      "-Compression",
      "-ContentIdentifier",
      "-@",
      argfile,
    ]);
    let parsed = [];
    try {
      parsed = JSON.parse(out || "[]");
    } catch {}
    try {
      database.exec("BEGIN IMMEDIATE");
      /* exiftool 输出的路径是正斜杠，得统一了才能对上号 */
      const byPath = new Map(slice.map((r) => [normKey(r.path), r.id]));
      for (const rec of parsed) {
        const id = byPath.get(normKey(rec.SourceFile));
        if (!id) continue;
        let width = rec.ImageWidth ?? null;
        let height = rec.ImageHeight ?? null;
        if ((!width || !height) && typeof rec.ImageSize === "string") {
          const m = /^(\d+)\s*[xX ]\s*(\d+)/.exec(rec.ImageSize);
          if (m) {
            width = Number(m[1]);
            height = Number(m[2]);
          }
        }
        /* 手机竖拍的照片在文件里是横的，靠 Rotation / Orientation 把宽高换回来 */
        const rotation = Math.abs(Number(rec.Rotation) || 0);
        const orient = Number(rec.Orientation) || 0;
        let w = width;
        let h = height;
        if (
          rotation === 90 ||
          rotation === 270 ||
          orient === 6 ||
          orient === 8
        ) {
          w = height;
          h = width;
        }
        const camera =
          [rec.Make, rec.Model].filter(Boolean).join(" ").trim() || null;
        const fpsValue = Number.parseFloat(
          rec.VideoFrameRate ?? rec.FrameRate ?? rec.AvgFrameRate,
        );
        const fps = Number.isFinite(fpsValue) && fpsValue > 0 ? fpsValue : null;
        const codec = rec.VideoCodec || rec.Compression || null;
        const contentId = String(rec.ContentIdentifier || "").trim() || null;
        stmt.run(
          w,
          h,
          toEpoch(
            rec.DateTimeOriginal ||
              rec.CreateDate ||
              rec.MediaCreateDate ||
              rec.TrackCreateDate,
          ),
          camera,
          rec.LensModel || rec.LensID || null,
          rec.ISO != null ? Math.round(rec.ISO) : null,
          rec.FNumber ?? null,
          rec.ExposureTime ?? null,
          rec.FocalLength ?? null,
          rec.GPSLatitude ?? null,
          rec.GPSLongitude ?? null,
          rec.Orientation ?? null,
          rec.Duration ?? null,
          fps,
          codec,
          contentId,
          id,
        );
      }
      database.exec("COMMIT");
    } catch {
      try {
        database.exec("ROLLBACK");
      } catch {}
      /* 这一批解析失败就跳过，界面照常显示 */
    }
    processed += slice.length;
    updateScanState(rootId, { scanned: processed });
    try {
      fs.unlinkSync(argfile);
    } catch {}
  }
  /* 没有拍摄时间的（截图、导出图），退回用文件修改时间排序 */
  openDb()
    .prepare(
      "UPDATE items SET taken_at = mtime WHERE root_id = ? AND taken_at IS NULL",
    )
    .run(Number(rootId));
}

/**
 * 把同一目录、同主文件名的一张照片和一段短视频配成实况照片。
 * Apple 导出的两张文件通常带相同的 ContentIdentifier，优先按它配对；
 * 标识被压缩软件或网盘清掉时，才退回“同名 + 拍摄时间接近 + 短视频”的规则。
 */
function refreshLivePairs(rootId) {
  const database = openDb();
  const id = Number(rootId);

  const normalizeId = (value) =>
    String(value || "")
      .trim()
      .toLowerCase();
  const stemKey = (row) => {
    const parsed = path.parse(row.name);
    return `${path.dirname(row.path).toLowerCase()}\0${parsed.name.toLowerCase()}`;
  };
  const byContent = new Map();
  const byStem = new Map();
  const videos = database
    .prepare(
      `SELECT id, path, name, kind, taken_at, duration, content_id
       FROM items
       WHERE root_id = ? AND kind = 'video' AND deleted_at IS NULL
       ORDER BY id`,
    )
    .iterate(id);
  for (const video of videos) {
    const content = normalizeId(video.content_id);
    if (content) {
      if (!byContent.has(content)) byContent.set(content, []);
      byContent.get(content).push(video);
    }
    const key = stemKey(video);
    if (!byStem.has(key)) byStem.set(key, []);
    byStem.get(key).push(video);
  }

  const usedVideos = new Set();
  const pairs = [];
  const photos = database
    .prepare(
      `SELECT id, path, name, kind, taken_at, duration, content_id
       FROM items
       WHERE root_id = ? AND kind = 'photo' AND deleted_at IS NULL
       ORDER BY id`,
    )
    .iterate(id);
  for (const photo of photos) {
    const photoContent = normalizeId(photo.content_id);
    let candidates = photoContent ? byContent.get(photoContent) || [] : [];
    if (!candidates.length) {
      candidates = (byStem.get(stemKey(photo)) || []).filter((video) => {
        const videoContent = normalizeId(video.content_id);
        if (photoContent && videoContent) return photoContent === videoContent;
        const duration = Number(video.duration);
        const timeDelta =
          Number(photo.taken_at) > 0 && Number(video.taken_at) > 0
            ? Math.abs(Number(photo.taken_at) - Number(video.taken_at))
            : 0;
        return (
          (!Number.isFinite(duration) || duration <= 10) && timeDelta <= 30000
        );
      });
    }
    candidates = candidates
      .filter((video) => !usedVideos.has(video.id))
      .sort((a, b) => {
        const delta = (video) =>
          Math.abs(Number(photo.taken_at || 0) - Number(video.taken_at || 0));
        return delta(a) - delta(b);
      });
    const video = candidates[0];
    if (!video) continue;
    usedVideos.add(video.id);
    pairs.push([photo.id, video.id]);
  }

  database.exec("BEGIN IMMEDIATE");
  try {
    database
      .prepare(
        "UPDATE items SET live_video_id = NULL, live_photo_id = NULL WHERE root_id = ? AND deleted_at IS NULL",
      )
      .run(id);
    const linkPhoto = database.prepare(
      "UPDATE items SET live_video_id = ? WHERE id = ?",
    );
    const linkVideo = database.prepare(
      "UPDATE items SET live_photo_id = ? WHERE id = ?",
    );
    for (const [photoId, videoId] of pairs) {
      linkPhoto.run(videoId, photoId);
      linkVideo.run(photoId, videoId);
    }
    database.exec("COMMIT");
  } catch (err) {
    database.exec("ROLLBACK");
    throw err;
  }
  return pairs.length;
}

/** Windows 路径统一成小写正斜杠，方便和 exiftool 的输出对账 */
const normKey = (p) => String(p).replace(/\\/g, "/").toLowerCase();

/* --------------------- 修改拍摄时间（写回文件 EXIF） --------------------- */

function formatExifDate(ms) {
  const date = new Date(Number(ms));
  const pad = (value) => String(value).padStart(2, "0");
  return (
    `${date.getFullYear()}:${pad(date.getMonth() + 1)}:${pad(date.getDate())} ` +
    `${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`
  );
}

function runExiftoolDetailed(args) {
  return new Promise((resolve) => {
    execFile(
      EXIFTOOL,
      ["-charset", "filename=UTF8", ...args],
      {
        maxBuffer: 64 * 1024 * 1024,
        encoding: "utf8",
        windowsHide: true,
      },
      (err, stdout, stderr) => {
        resolve({
          ok: !err,
          code: err ? Number(err.code) || 1 : 0,
          stdout: String(stdout || ""),
          stderr: String(stderr || ""),
        });
      },
    );
  });
}

/* ExifTool 在 Windows 上会先吐几行 Perl 的 locale 警告，挑错误时跳过它们。 */
function exiftoolFailureMessage(result) {
  const lines = `${result.stdout}\n${result.stderr}`
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(
      (line) =>
        line &&
        !/^perl: warning:/i.test(line) &&
        !/locale/i.test(line) &&
        !/^(LC_ALL|LC_CTYPE|LANG)\b/.test(line) &&
        !/Falling back to the standard locale/i.test(line) &&
        !/^\d+ image files? updated$/.test(line),
    );
  return lines[lines.length - 1] || "ExifTool 没能写入这个文件";
}

async function setItemsTakenAt(ids, ms) {
  const timestamp = Math.floor(Number(ms));
  if (!Number.isFinite(timestamp)) throw new Error("拍摄时间无效");

  const uniqueIds = [
    ...new Set(
      (Array.isArray(ids) ? ids : [])
        .map(Number)
        .filter((id) => Number.isInteger(id)),
    ),
  ];
  if (!uniqueIds.length) throw new Error("没有选中任何东西");

  const database = openDb();
  const upsert = database.prepare(
    `INSERT INTO item_metadata_overrides (item_id, taken_at_override, updated_at)
     VALUES (?, ?, ?)
     ON CONFLICT(item_id) DO UPDATE SET
       taken_at_override = excluded.taken_at_override,
       updated_at = excluded.updated_at`,
  );
  const changed = [];
  const failed = [];
  database.exec("BEGIN IMMEDIATE");
  try {
    for (const id of uniqueIds) {
      const item = getItem(id);
      if (!item || item.deleted_at) {
        failed.push({
          id,
          name: item?.name,
          reason: item ? "项目已在最近删除里" : "项目已经不在图库里",
        });
        continue;
      }
      upsert.run(id, timestamp, Date.now());
      changed.push(id);
    }
    database.exec("COMMIT");
  } catch (err) {
    database.exec("ROLLBACK");
    throw err;
  }

  return {
    ids: changed,
    failed,
    takenAt: timestamp,
    scope: "album",
  };
}

/**
 * 按人工顺序一次写入多个不同的拍摄时间。
 * 只更新软件内有效值；磁盘原文件及其 EXIF 不改。
 */
function setItemsTakenTimes(entries) {
  const wanted = new Map();
  for (const entry of Array.isArray(entries) ? entries : []) {
    const id = Number(entry?.id);
    const timestamp = Math.floor(Number(entry?.takenAt));
    if (!Number.isInteger(id) || id <= 0 || !Number.isFinite(timestamp))
      continue;
    wanted.set(id, timestamp);
  }
  if (!wanted.size) throw new Error("没有可写入的拍摄时间");

  const database = openDb();
  const upsert = database.prepare(
    `INSERT INTO item_metadata_overrides (item_id, taken_at_override, updated_at)
     VALUES (?, ?, ?)
     ON CONFLICT(item_id) DO UPDATE SET
       taken_at_override = excluded.taken_at_override,
       updated_at = excluded.updated_at`,
  );
  const changed = [];
  const failed = [];

  database.exec("BEGIN IMMEDIATE");
  try {
    for (const [id, timestamp] of wanted) {
      const item = getItem(id);
      if (!item || item.deleted_at) {
        failed.push({
          id,
          name: item?.name,
          reason: item ? "项目已在最近删除里" : "项目已经不在图库里",
        });
        continue;
      }
      upsert.run(id, timestamp, Date.now());
      changed.push({ id, takenAt: timestamp });
    }
    database.exec("COMMIT");
  } catch (err) {
    database.exec("ROLLBACK");
    throw err;
  }

  return {
    ids: changed.map((entry) => entry.id),
    dates: changed,
    failed,
    scope: "album",
  };
}

/**
 * 批量修改项目的拍摄设备。只保存软件覆盖值；磁盘原文件和
 * 当前相机的原始元数据都不变，导出副本时才写入 Make / Model。
 */
function setItemsCamera(ids, deviceId) {
  const uniqueIds = [
    ...new Set(
      (Array.isArray(ids) ? ids : [])
        .map(Number)
        .filter((id) => Number.isInteger(id) && id > 0),
    ),
  ];
  if (!uniqueIds.length) throw new Error("没有选中任何项目");

  const camera = cameraDeviceOverride(deviceId);
  if (deviceId != null && deviceId !== "" && !camera) {
    throw new Error("不支持这个拍摄设备");
  }
  const database = openDb();
  const upsert = database.prepare(
    `INSERT INTO item_metadata_overrides
       (item_id, camera_override, updated_at)
     VALUES (?, ?, ?)
     ON CONFLICT(item_id) DO UPDATE SET
       camera_override = excluded.camera_override,
       updated_at = excluded.updated_at`,
  );
  const changed = [];
  const failed = [];
  database.exec("BEGIN IMMEDIATE");
  try {
    for (const id of uniqueIds) {
      const item = getItem(id);
      if (!item || item.deleted_at) {
        failed.push({
          id,
          name: item?.name,
          reason: item ? "项目已在最近删除里" : "项目已经不在图库里",
        });
        continue;
      }
      upsert.run(id, camera?.id || null, Date.now());
      changed.push(id);
    }
    database.exec("COMMIT");
  } catch (err) {
    database.exec("ROLLBACK");
    throw err;
  }
  return {
    ids: changed,
    failed,
    cameraOverride: camera?.id || null,
    cameraLabel: camera?.label || "",
    scope: "album",
  };
}

/**
 * 位置信息同样只写入 Album 覆盖层。
 * 名称与经纬度可以分别保存；全部留空时恢复磁盘原值。
 */
function setItemsLocation(
  ids,
  { locationName = "", lat = null, lon = null } = {},
) {
  const uniqueIds = [
    ...new Set(
      (Array.isArray(ids) ? ids : [])
        .map(Number)
        .filter((id) => Number.isInteger(id)),
    ),
  ];
  if (!uniqueIds.length) throw new Error("没有选中任何东西");

  const cleanName = String(locationName || "")
    .trim()
    .slice(0, 200);
  const hasLat = lat !== null && lat !== "" && Number.isFinite(Number(lat));
  const hasLon = lon !== null && lon !== "" && Number.isFinite(Number(lon));
  if (hasLat !== hasLon) throw new Error("纬度和经度需要同时填写");
  const nextLat = hasLat ? Number(lat) : null;
  const nextLon = hasLon ? Number(lon) : null;
  if (nextLat != null && (nextLat < -90 || nextLat > 90)) {
    throw new Error("纬度必须在 -90 到 90 之间");
  }
  if (nextLon != null && (nextLon < -180 || nextLon > 180)) {
    throw new Error("经度必须在 -180 到 180 之间");
  }
  const restoreDiskLocation = !cleanName && nextLat == null && nextLon == null;
  const gpsCleared = !restoreDiskLocation && nextLat == null ? 1 : 0;

  const database = openDb();
  const upsert = database.prepare(
    `INSERT INTO item_metadata_overrides
       (item_id, gps_lat_override, gps_lon_override, gps_cleared,
        location_name_override, updated_at)
     VALUES (?, ?, ?, ?, ?, ?)
     ON CONFLICT(item_id) DO UPDATE SET
       gps_lat_override = excluded.gps_lat_override,
       gps_lon_override = excluded.gps_lon_override,
       gps_cleared = excluded.gps_cleared,
       location_name_override = excluded.location_name_override,
       updated_at = excluded.updated_at`,
  );
  const changed = [];
  const failed = [];
  database.exec("BEGIN IMMEDIATE");
  try {
    for (const id of uniqueIds) {
      const item = getItem(id);
      if (!item || item.deleted_at) {
        failed.push({
          id,
          name: item?.name,
          reason: item ? "项目已在最近删除里" : "项目已经不在图库里",
        });
        continue;
      }
      upsert.run(
        id,
        nextLat,
        nextLon,
        gpsCleared,
        cleanName || null,
        Date.now(),
      );
      changed.push(id);
    }
    database.exec("COMMIT");
  } catch (err) {
    database.exec("ROLLBACK");
    throw err;
  }
  return {
    ids: changed,
    failed,
    locationName: cleanName,
    lat: nextLat,
    lon: nextLon,
    scope: "album",
  };
}

function restoreItemsLocationOverrides(snapshots) {
  const entries = (Array.isArray(snapshots) ? snapshots : [])
    .map((entry) => ({
      id: Number(entry?.id),
      overrides: entry?.overrides || null,
    }))
    .filter((entry) => Number.isInteger(entry.id) && entry.id > 0);
  if (!entries.length) return { ids: [] };

  const database = openDb();
  const update = database.prepare(
    `UPDATE item_metadata_overrides
     SET gps_lat_override = ?, gps_lon_override = ?, gps_cleared = ?,
         location_name_override = ?, updated_at = ?
     WHERE item_id = ?`,
  );
  const remove = database.prepare(
    "DELETE FROM item_metadata_overrides WHERE item_id = ?",
  );
  const changed = [];
  database.exec("BEGIN IMMEDIATE");
  try {
    for (const { id, overrides } of entries) {
      if (!overrides) {
        remove.run(id);
        changed.push(id);
        continue;
      }
      const lat = Number(overrides.gpsLat);
      const lon = Number(overrides.gpsLon);
      update.run(
        Number.isFinite(lat) ? lat : null,
        Number.isFinite(lon) ? lon : null,
        overrides.gpsCleared === true ? 1 : 0,
        overrides.locationName || null,
        Number(overrides.updatedAt) || Date.now(),
        id,
      );
      changed.push(id);
    }
    database.exec("COMMIT");
  } catch (error) {
    database.exec("ROLLBACK");
    throw error;
  }
  return { ids: changed };
}

/**
 * 清除选中的照片 / 视频在软件内保存的拍摄时间覆盖值。
 * 磁盘原文件和文件名都不改。
 */
function restoreItemsTakenAt(ids) {
  const uniqueIds = [
    ...new Set(
      (Array.isArray(ids) ? ids : [])
        .map(Number)
        .filter((id) => Number.isInteger(id) && id > 0),
    ),
  ];
  if (!uniqueIds.length) throw new Error("没有选中任何东西");

  const database = openDb();
  const picked = [];
  const failed = [];
  for (const id of uniqueIds) {
    const item = getItem(id);
    if (!item || item.deleted_at) {
      failed.push({
        id,
        name: item?.name,
        reason: item ? "项目已在最近删除里" : "项目已经不在图库里",
      });
      continue;
    }
    const override = database
      .prepare(
        "SELECT taken_at_override AS takenAtOverride FROM item_metadata_overrides WHERE item_id = ?",
      )
      .get(id);
    picked.push({ item, override });
  }

  const clearDate = database.prepare(
    `UPDATE item_metadata_overrides
     SET taken_at_override = NULL, updated_at = ?
     WHERE item_id = ? AND taken_at_override IS NOT NULL`,
  );
  const changed = [];
  database.exec("BEGIN IMMEDIATE");
  try {
    for (const { item, override } of picked) {
      if (!override || override.takenAtOverride == null) continue;
      clearDate.run(Date.now(), item.id);
      changed.push(item.id);
    }
    database.exec("COMMIT");
  } catch (err) {
    database.exec("ROLLBACK");
    throw err;
  }
  return { ids: changed, failed, scope: "album" };
}

/**
 * 清除选中的照片 / 视频在软件内保存的 GPS 与地点名称覆盖值。
 * 如果照片曾在“调整位置”中直接写过 EXIF，同时把首次写盘前的坐标写回文件。
 */
async function restoreItemsLocation(ids) {
  const uniqueIds = [
    ...new Set(
      (Array.isArray(ids) ? ids : [])
        .map(Number)
        .filter((id) => Number.isInteger(id) && id > 0),
    ),
  ];
  if (!uniqueIds.length) throw new Error("没有选中任何东西");

  const database = openDb();
  const clearSoftware = database.prepare(
    `UPDATE item_metadata_overrides
     SET gps_lat_override = NULL, gps_lon_override = NULL,
         gps_cleared = 0, location_name_override = NULL, updated_at = ?
     WHERE item_id = ?
       AND (gps_lat_override IS NOT NULL OR gps_lon_override IS NOT NULL
         OR gps_cleared = 1 OR location_name_override IS NOT NULL)`,
  );
  const clearAllLocation = database.prepare(
    `UPDATE item_metadata_overrides
     SET gps_lat_override = NULL, gps_lon_override = NULL,
         gps_cleared = 0, location_name_override = NULL,
         disk_gps_lat_before = NULL, disk_gps_lon_before = NULL,
         gps_file_modified = 0, updated_at = ?
     WHERE item_id = ?`,
  );
  const updateDiskGps = database.prepare(
    "UPDATE items SET gps_lat = ?, gps_lon = ?, mtime = ?, size = ? WHERE id = ?",
  );
  const overrides = new Map(
    uniqueIds.map((id) => [
      id,
      database
        .prepare(
          `SELECT gps_file_modified AS gpsFileModified,
              disk_gps_lat_before AS diskGpsLatBefore,
              disk_gps_lon_before AS diskGpsLonBefore
       FROM item_metadata_overrides WHERE item_id = ?`,
        )
        .get(id),
    ]),
  );
  const changed = [];
  const failed = [];
  for (const id of uniqueIds) {
    const item = getItem(id);
    if (!item || item.deleted_at) {
      failed.push({
        id,
        name: item?.name,
        reason: item ? "项目已在最近删除里" : "项目已经不在图库里",
      });
      continue;
    }
    const override = overrides.get(id);
    if (Number(override?.gpsFileModified) !== 1) {
      const result = clearSoftware.run(Date.now(), id);
      if (result.changes) changed.push(id);
      continue;
    }
    if (item.kind !== "photo") {
      failed.push({
        id,
        name: item.name,
        reason: "只有照片可以还原写盘位置",
      });
      continue;
    }
    if (!fs.existsSync(item.path)) {
      failed.push({ id, name: item.name, reason: "照片文件不存在" });
      continue;
    }
    const beforeLat =
      override?.diskGpsLatBefore == null
        ? null
        : Number(override.diskGpsLatBefore);
    const beforeLon =
      override?.diskGpsLonBefore == null
        ? null
        : Number(override.diskGpsLonBefore);
    try {
      const args = ["-overwrite_original_in_place", "-n"];
      if (Number.isFinite(beforeLat) && Number.isFinite(beforeLon)) {
        args.push(
          `-GPSLatitude=${Math.abs(beforeLat)}`,
          `-GPSLatitudeRef=${beforeLat < 0 ? "S" : "N"}`,
          `-GPSLongitude=${Math.abs(beforeLon)}`,
          `-GPSLongitudeRef=${beforeLon < 0 ? "W" : "E"}`,
        );
      } else {
        args.push("-GPS:all=", "-XMP:GPSLatitude=", "-XMP:GPSLongitude=");
      }
      args.push(path.resolve(item.path));
      const argfile = writeArgfile(
        args,
        `restore-location-${id}-${Date.now()}`,
      );
      const result = await runExiftoolDetailed(["-@", argfile]);
      if (!result.ok) {
        failed.push({
          id,
          name: item.name,
          reason: exiftoolFailureMessage(result),
        });
        continue;
      }
      const stat = fs.statSync(item.path);
      updateDiskGps.run(
        Number.isFinite(beforeLat) ? beforeLat : null,
        Number.isFinite(beforeLon) ? beforeLon : null,
        stat.mtimeMs,
        stat.size,
        id,
      );
      clearAllLocation.run(Date.now(), id);
      changed.push(id);
    } catch (err) {
      failed.push({ id, name: item.name, reason: String(err?.message || err) });
    }
  }
  return { ids: changed, failed, scope: "album" };
}

function getItemMetadataOverrides(itemId) {
  const row = openDb()
    .prepare(
      `SELECT taken_at_override AS takenAt, gps_lat_override AS gpsLat,
            gps_lon_override AS gpsLon, gps_cleared AS gpsCleared,
            location_name_override AS locationName,
            camera_override AS cameraOverride,
            name_override AS nameOverride,
            updated_at AS updatedAt
     FROM item_metadata_overrides WHERE item_id = ?`,
    )
    .get(Number(itemId));
  if (!row) return null;
  return {
    takenAt: row.takenAt == null ? null : Number(row.takenAt),
    gpsLat: row.gpsLat == null ? null : Number(row.gpsLat),
    gpsLon: row.gpsLon == null ? null : Number(row.gpsLon),
    gpsCleared: Number(row.gpsCleared) === 1,
    locationName: row.locationName == null ? null : String(row.locationName),
    cameraOverride:
      row.cameraOverride == null ? null : String(row.cameraOverride),
    nameOverride: row.nameOverride == null ? null : String(row.nameOverride),
    updatedAt: Number(row.updatedAt),
  };
}

/* 照片墙的裁剪只保存归一化参数，不生成或覆盖原图：
   x / y 是正方形中心在照片里的相对位置，size 是相对短边的边长。 */
const PHOTO_WALL_CROP_MIN_SIZE = 0.5;
const PHOTO_WALL_CROP_MAX_SIZE = 1;

function normalizePhotoWallCrop(value) {
  const x = Number(value?.x);
  const y = Number(value?.y);
  const size = Number(value?.size);
  return {
    x: Number.isFinite(x) ? Math.min(1, Math.max(0, x)) : 0.5,
    y: Number.isFinite(y) ? Math.min(1, Math.max(0, y)) : 0.5,
    size: Number.isFinite(size)
      ? Math.min(
          PHOTO_WALL_CROP_MAX_SIZE,
          Math.max(PHOTO_WALL_CROP_MIN_SIZE, size),
        )
      : PHOTO_WALL_CROP_MAX_SIZE,
    updatedAt: Number(value?.updatedAt) || 0,
  };
}

function getPhotoWallCrop(itemId) {
  const row = openDb()
    .prepare(
      `SELECT crop_x AS x, crop_y AS y, crop_size AS size, updated_at AS updatedAt
     FROM photo_wall_crops p
     JOIN items i ON i.id = p.item_id
     WHERE p.item_id = ? AND i.deleted_at IS NULL AND i.kind = 'photo'`,
    )
    .get(Number(itemId));
  return row ? normalizePhotoWallCrop(row) : null;
}

function setPhotoWallCrop(itemId, value) {
  const item = getItem(Number(itemId));
  if (!item || item.kind !== "photo") throw new Error("只能裁剪照片");
  const crop = normalizePhotoWallCrop(value);
  const updatedAt = Date.now();
  openDb()
    .prepare(
      `INSERT INTO photo_wall_crops (item_id, crop_x, crop_y, crop_size, updated_at)
     VALUES (?, ?, ?, ?, ?)
     ON CONFLICT(item_id) DO UPDATE SET
       crop_x = excluded.crop_x,
       crop_y = excluded.crop_y,
       crop_size = excluded.crop_size,
       updated_at = excluded.updated_at`,
    )
    .run(item.id, crop.x, crop.y, crop.size, updatedAt);
  return { ...crop, updatedAt };
}

/* 纵向画廊使用固定比例，但记录和方形照片墙完全独立。
   9:16 保留照片底部，其余比例居中；派生图不会覆盖原图。 */
const MASONRY_WALL_RATIOS = Object.freeze([
  Object.freeze({
    key: "9:16",
    width: 9,
    height: 16,
    span: 2,
    anchor: "bottom",
  }),
  Object.freeze({ key: "2:3", width: 2, height: 3, span: 2, anchor: "center" }),
  Object.freeze({ key: "3:4", width: 3, height: 4, span: 3, anchor: "center" }),
  Object.freeze({ key: "1:1", width: 1, height: 1, span: 3, anchor: "center" }),
  Object.freeze({ key: "4:3", width: 4, height: 3, span: 3, anchor: "center" }),
  Object.freeze({ key: "3:2", width: 3, height: 2, span: 3, anchor: "center" }),
  Object.freeze({
    key: "16:9",
    width: 16,
    height: 9,
    span: 3,
    anchor: "center",
  }),
]);
const MASONRY_WALL_RATIO_BY_KEY = new Map(
  MASONRY_WALL_RATIOS.map((ratio) => [ratio.key, ratio]),
);
const FILMROLL_WALL_RATIO_BY_KEY = MASONRY_WALL_RATIO_BY_KEY;
const MOSAIC_WALL_RATIOS = Object.freeze([
  Object.freeze({ key: "9:16", width: 9, height: 16, anchor: "bottom" }),
  Object.freeze({ key: "3:5", width: 3, height: 5, anchor: "center" }),
  Object.freeze({ key: "2:3", width: 2, height: 3, anchor: "center" }),
  Object.freeze({ key: "5:7", width: 5, height: 7, anchor: "center" }),
  Object.freeze({ key: "3:4", width: 3, height: 4, anchor: "center" }),
  Object.freeze({ key: "4:5", width: 4, height: 5, anchor: "center" }),
  Object.freeze({ key: "1:1", width: 1, height: 1, anchor: "center" }),
  Object.freeze({ key: "5:4", width: 5, height: 4, anchor: "center" }),
  Object.freeze({ key: "4:3", width: 4, height: 3, anchor: "center" }),
  Object.freeze({ key: "7:5", width: 7, height: 5, anchor: "center" }),
  Object.freeze({ key: "3:2", width: 3, height: 2, anchor: "center" }),
  Object.freeze({ key: "5:3", width: 5, height: 3, anchor: "center" }),
  Object.freeze({ key: "16:9", width: 16, height: 9, anchor: "center" }),
]);
const MOSAIC_WALL_RATIO_BY_KEY = new Map(
  MOSAIC_WALL_RATIOS.map((ratio) => [ratio.key, ratio]),
);

function normalizeMasonryWallRatioKey(value) {
  const key = String(value || "").trim();
  return MASONRY_WALL_RATIO_BY_KEY.has(key) ? key : null;
}

/* 选择能在原图中保留最多面积的固定比例。用面积而不是宽高差比较，
   避免超宽或超高照片被错误地归入相近但裁切更多的比例。 */
function nearestMasonryWallRatio(item) {
  const width = Number(item?.width);
  const height = Number(item?.height);
  const sourceAspect = width > 0 && height > 0 ? width / height : 1;
  let best = MASONRY_WALL_RATIOS[3];
  let bestArea = -1;
  for (const ratio of MASONRY_WALL_RATIOS) {
    const targetAspect = ratio.width / ratio.height;
    const retained = Math.min(
      sourceAspect / targetAspect,
      targetAspect / sourceAspect,
    );
    if (retained > bestArea + 1e-9) {
      best = ratio;
      bestArea = retained;
    }
  }
  return best;
}

function resolveMasonryWallRatio(item, manualKey = null, updatedAt = 0) {
  const manual = normalizeMasonryWallRatioKey(manualKey);
  const ratio = manual
    ? MASONRY_WALL_RATIO_BY_KEY.get(manual)
    : nearestMasonryWallRatio(item);
  return {
    ratioKey: ratio.key,
    width: ratio.width,
    height: ratio.height,
    span: ratio.span,
    anchor: ratio.anchor,
    automatic: !manual,
    updatedAt: Number(updatedAt) || 0,
    aspect: ratio.width / ratio.height,
  };
}

function resolveFilmrollWallRatio(item, manualKey = null, updatedAt = 0) {
  const manual = normalizeMasonryWallRatioKey(manualKey);
  const ratio = manual
    ? FILMROLL_WALL_RATIO_BY_KEY.get(manual)
    : nearestMasonryWallRatio(item);
  return {
    ratioKey: ratio.key,
    width: ratio.width,
    height: ratio.height,
    span: ratio.span,
    anchor: ratio.anchor,
    automatic: !manual,
    updatedAt: Number(updatedAt) || 0,
    aspect: ratio.width / ratio.height,
  };
}

function getMasonryWallCrop(itemId) {
  const item = getItem(Number(itemId));
  if (!item || item.kind !== "photo") return null;
  const row = openDb()
    .prepare(
      `SELECT ratio_key AS ratioKey, updated_at AS updatedAt
     FROM masonry_wall_crops WHERE item_id = ?`,
    )
    .get(item.id);
  return resolveMasonryWallRatio(item, row?.ratioKey, row?.updatedAt);
}

function setMasonryWallCrop(itemId, value) {
  const item = getItem(Number(itemId));
  if (!item || item.kind !== "photo") throw new Error("只能裁剪照片");
  const requested = normalizeMasonryWallRatioKey(
    value?.ratioKey ?? value?.ratio,
  );
  if (value?.automatic === true || !requested) {
    openDb()
      .prepare("DELETE FROM masonry_wall_crops WHERE item_id = ?")
      .run(item.id);
    return resolveMasonryWallRatio(item);
  }
  const updatedAt = Date.now();
  openDb()
    .prepare(
      `INSERT INTO masonry_wall_crops (item_id, ratio_key, updated_at)
     VALUES (?, ?, ?)
     ON CONFLICT(item_id) DO UPDATE SET
       ratio_key = excluded.ratio_key,
       updated_at = excluded.updated_at`,
    )
    .run(item.id, requested, updatedAt);
  return resolveMasonryWallRatio(item, requested, updatedAt);
}

function getFilmrollWallCrop(itemId) {
  const item = getItem(Number(itemId));
  if (!item || item.kind !== "photo") return null;
  const row = openDb()
    .prepare(
      `SELECT ratio_key AS ratioKey, updated_at AS updatedAt
     FROM filmroll_wall_crops WHERE item_id = ?`,
    )
    .get(item.id);
  return resolveFilmrollWallRatio(item, row?.ratioKey, row?.updatedAt);
}

function setFilmrollWallCrop(itemId, value) {
  const item = getItem(Number(itemId));
  if (!item || item.kind !== "photo") throw new Error("只能裁剪照片");
  const requested = normalizeMasonryWallRatioKey(
    value?.ratioKey ?? value?.ratio,
  );
  if (value?.automatic === true || !requested) {
    openDb()
      .prepare("DELETE FROM filmroll_wall_crops WHERE item_id = ?")
      .run(item.id);
    return resolveFilmrollWallRatio(item);
  }
  const updatedAt = Date.now();
  openDb()
    .prepare(
      `INSERT INTO filmroll_wall_crops (item_id, ratio_key, updated_at)
     VALUES (?, ?, ?)
     ON CONFLICT(item_id) DO UPDATE SET
       ratio_key = excluded.ratio_key,
       updated_at = excluded.updated_at`,
    )
    .run(item.id, requested, updatedAt);
  return resolveFilmrollWallRatio(item, requested, updatedAt);
}

function normalizeMosaicWallRatioKey(value) {
  const key = String(value || "").trim();
  return MOSAIC_WALL_RATIO_BY_KEY.has(key) ? key : null;
}

function nearestMosaicWallRatio(item) {
  const width = Number(item?.width);
  const height = Number(item?.height);
  const sourceAspect = width > 0 && height > 0 ? width / height : 1;
  let best = MOSAIC_WALL_RATIOS[6];
  let retainedArea = -1;
  for (const ratio of MOSAIC_WALL_RATIOS) {
    const targetAspect = ratio.width / ratio.height;
    const retained = Math.min(
      sourceAspect / targetAspect,
      targetAspect / sourceAspect,
    );
    if (retained > retainedArea + 1e-9) {
      retainedArea = retained;
      best = ratio;
    }
  }
  return best;
}

function resolveMosaicWallRatio(item, manualKey = null, updatedAt = 0) {
  const manual = normalizeMosaicWallRatioKey(manualKey);
  const ratio = manual
    ? MOSAIC_WALL_RATIO_BY_KEY.get(manual)
    : nearestMosaicWallRatio(item);
  return {
    ratioKey: ratio.key,
    width: ratio.width,
    height: ratio.height,
    anchor: ratio.anchor,
    automatic: !manual,
    updatedAt: Number(updatedAt) || 0,
    aspect: ratio.width / ratio.height,
  };
}

function getMosaicWallCrop(itemId) {
  const item = getItem(Number(itemId));
  if (!item || item.kind !== "photo") return null;
  const row = openDb()
    .prepare(
      `SELECT ratio_key AS ratioKey, updated_at AS updatedAt
     FROM mosaic_wall_crops WHERE item_id = ?`,
    )
    .get(item.id);
  return resolveMosaicWallRatio(item, row?.ratioKey, row?.updatedAt);
}

function setMosaicWallCrop(itemId, value) {
  const item = getItem(Number(itemId));
  if (!item || item.kind !== "photo") throw new Error("只能裁剪照片");
  const requested = normalizeMosaicWallRatioKey(
    value?.ratioKey ?? value?.ratio,
  );
  if (value?.automatic === true || !requested) {
    openDb()
      .prepare("DELETE FROM mosaic_wall_crops WHERE item_id = ?")
      .run(item.id);
    return resolveMosaicWallRatio(item);
  }
  const updatedAt = Date.now();
  openDb()
    .prepare(
      `INSERT INTO mosaic_wall_crops (item_id, ratio_key, updated_at)
     VALUES (?, ?, ?)
     ON CONFLICT(item_id) DO UPDATE SET
       ratio_key = excluded.ratio_key,
       updated_at = excluded.updated_at`,
    )
    .run(item.id, requested, updatedAt);
  return resolveMosaicWallRatio(item, requested, updatedAt);
}

function exportDateArgs(item, timestamp) {
  const stamp = formatExifDate(timestamp);
  if (item.kind === "photo") {
    return [
      "-DateTimeOriginal=" + stamp,
      "-CreateDate=" + stamp,
      "-ModifyDate=" + stamp,
    ];
  }
  if (QUICKTIME_EXT.has(path.extname(item.path).toLowerCase())) {
    return [
      "-QuickTime:CreateDate=" + stamp,
      "-QuickTime:ModifyDate=" + stamp,
      "-MediaCreateDate=" + stamp,
      "-TrackCreateDate=" + stamp,
      "-XMP:CreateDate=" + stamp,
      "-XMP:ModifyDate=" + stamp,
    ];
  }
  return [
    "-CreateDate=" + stamp,
    "-ModifyDate=" + stamp,
    "-Keys:CreationDate=" + stamp,
  ];
}

function shouldExportRawAsDng(item) {
  return Boolean(item?.kind === "photo" && isRaw(item.path));
}

function dnglabFailureMessage(result) {
  const text = `${result.stdout}\n${result.stderr}`.replace(
    /\x1b\[[0-9;]*m/g,
    "",
  );
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(
      (line) =>
        line &&
        !/^status:/i.test(line) &&
        !/^total time:/i.test(line) &&
        !/^converted \d+\/\d+ files$/i.test(line),
    );
  return lines.at(-1) || "DNGLab 没能转换这个 RAW 文件";
}

/**
 * 把相机 RAW 重新封装为真正的 DNG。输出先放临时路径，导出层只在成功后改名，
 * 既不改磁盘原片，也不会留下半个文件。
 */
async function convertRawToDng(
  sourcePath,
  outputPath,
  { timeout = 20 * 60 * 1000 } = {},
) {
  const source = path.resolve(String(sourcePath || ""));
  const target = path.resolve(String(outputPath || ""));
  if (!source || !target || source.toLowerCase() === target.toLowerCase()) {
    return { ok: false, error: "DNG 输出的源路径或目标路径无效" };
  }
  try {
    const sourceStat = await fsp.stat(source);
    if (!sourceStat.isFile() || sourceStat.size <= 0) {
      return { ok: false, error: "RAW 原文件不存在或为空" };
    }
  } catch {
    return { ok: false, error: "RAW 原文件不存在" };
  }
  await fsp.rm(target, { force: true }).catch(() => {});
  const result = await new Promise((resolve) => {
    execFile(
      DNGLAB,
      ["convert", source, target, "-f"],
      {
        maxBuffer: 16 * 1024 * 1024,
        encoding: "utf8",
        windowsHide: true,
        timeout,
      },
      (err, stdout, stderr) => {
        resolve({
          ok: !err,
          code: err ? Number(err.code) || 1 : 0,
          timedOut: Boolean(err?.killed),
          stdout: String(stdout || ""),
          stderr: String(stderr || ""),
        });
      },
    );
  });
  if (result.ok) {
    try {
      const targetStat = await fsp.stat(target);
      if (targetStat.isFile() && targetStat.size > 0) {
        return { ok: true, error: "" };
      }
    } catch {}
  }
  await fsp.rm(target, { force: true }).catch(() => {});
  return {
    ok: false,
    error: result.timedOut ? "转换 DNG 超时" : dnglabFailureMessage(result),
  };
}

/**
 * 只修改导出副本的元数据。媒体画面、音频和原有编码数据由 ExifTool
 * 原位更新容器信息，不经过重新渲染或视频转码。
 */
async function applyMetadataOverridesToFile(filePath, item, overrides) {
  const lines = ["-overwrite_original"];
  const camera =
    item?.kind === "photo"
      ? cameraDeviceOverride(overrides?.cameraOverride)
      : null;
  if (camera) {
    lines.push(
      `-EXIF:Make=${camera.make}`,
      `-EXIF:Model=${camera.model}`,
      `-EXIF:LensMake=${camera.lensMake}`,
      `-EXIF:LensModel=${camera.lensModel}`,
      `-EXIF:LensInfo#=${camera.lensSpecification.join(" ")}`,
      `-XMP-tiff:Make=${camera.make}`,
      `-XMP-tiff:Model=${camera.model}`,
      `-XMP-aux:Lens=${camera.lensModel}`,
    );
    if (path.extname(filePath).toLowerCase() === ".dng") {
      lines.push(`-UniqueCameraModel=${camera.uniqueModel}`);
    }
  }
  if (overrides?.takenAt != null) {
    lines.push(...exportDateArgs(item, Number(overrides.takenAt)));
  }
  if (overrides?.gpsLat != null && overrides?.gpsLon != null) {
    const lat = Number(overrides.gpsLat);
    const lon = Number(overrides.gpsLon);
    lines.push(
      `-GPSLatitude=${Math.abs(lat)}`,
      `-GPSLatitudeRef=${lat < 0 ? "S" : "N"}`,
      `-GPSLongitude=${Math.abs(lon)}`,
      `-GPSLongitudeRef=${lon < 0 ? "W" : "E"}`,
    );
  } else if (overrides?.gpsCleared) {
    lines.push("-GPS:all=", "-XMP:GPSLatitude=", "-XMP:GPSLongitude=");
  }
  const locationName = String(overrides?.locationName || "")
    .replace(/[\r\n]+/g, " ")
    .trim();
  if (locationName) lines.push(`-XMP:Location=${locationName}`);
  if (lines.length === 1) return { ok: true, changed: false, error: "" };

  const argfile = writeArgfile(
    [...lines, path.resolve(filePath)],
    `export-meta-${item.id}-${Date.now()}`,
  );
  try {
    const result = await runExiftoolDetailed(["-@", argfile]);
    return {
      ok: result.ok,
      changed: result.ok,
      error: result.ok ? "" : exiftoolFailureMessage(result),
    };
  } finally {
    try {
      fs.unlinkSync(argfile);
    } catch {}
  }
}

async function copyEditedMediaMetadata(sourcePath, targetPath, item) {
  const args = [
    "-overwrite_original",
    "-TagsFromFile",
    path.resolve(sourcePath),
    "-all:all",
    "-unsafe",
  ];
  if (item?.kind === "photo") {
    args.push("-Orientation#=1");
  }
  args.push(path.resolve(targetPath));
  const argfile = writeArgfile(
    args,
    `edit-meta-${item?.id || 0}-${Date.now()}`,
  );
  try {
    const result = await runExiftoolDetailed(["-@", argfile]);
    return {
      ok: result.ok,
      error: result.ok ? "" : exiftoolFailureMessage(result),
    };
  } finally {
    try {
      fs.unlinkSync(argfile);
    } catch {}
  }
}

/* ------------------------------ 查询 ------------------------------ */

function listRoots() {
  return openDb().prepare("SELECT * FROM roots ORDER BY id").all();
}

function addRoot(dirPath) {
  const database = openDb();
  const abs = path.resolve(dirPath);
  const stat = fs.statSync(abs);
  if (!stat.isDirectory()) throw new Error("这不是一个文件夹");
  const previousRoots = listRoots();
  const normalized = abs.toLowerCase();
  const exists = previousRoots.find(
    (root) => path.resolve(root.path).toLowerCase() === normalized,
  );
  if (exists) return exists;
  const overlaps = previousRoots.find((root) => {
    const previous = path.resolve(root.path).toLowerCase();
    return (
      isPathInside(previous, normalized) || isPathInside(normalized, previous)
    );
  });
  if (overlaps) {
    throw new Error(`不能添加与现有根目录重叠的文件夹：${overlaps.path}`);
  }
  const baseName = path.basename(abs) || abs;
  const usedNames = new Set(
    previousRoots.map((root) =>
      String(root.name || "").toLocaleLowerCase("zh-CN"),
    ),
  );
  let name = baseName;
  let suffix = 2;
  while (usedNames.has(name.toLocaleLowerCase("zh-CN"))) {
    name = `${baseName} (${suffix})`;
    suffix += 1;
  }
  const info = database
    .prepare("INSERT INTO roots (path, name, added_at) VALUES (?,?,?)")
    .run(abs, name, Date.now());
  return database
    .prepare("SELECT * FROM roots WHERE id = ?")
    .get(Number(info.lastInsertRowid));
}

function removeRoot(rootId, { keepTrash = false } = {}) {
  const database = openDb();
  const albumIds = database
    .prepare("SELECT id FROM albums WHERE root_id = ?")
    .all(rootId)
    .map((row) => row.id);
  const itemSql = keepTrash
    ? "SELECT id FROM items WHERE root_id = ? AND deleted_at IS NULL"
    : "SELECT id FROM items WHERE root_id = ?";
  const itemIds = database
    .prepare(itemSql)
    .all(rootId)
    .map((row) => row.id);
  const deleteSql = keepTrash
    ? "DELETE FROM items WHERE root_id = ? AND deleted_at IS NULL"
    : "DELETE FROM items WHERE root_id = ?";
  const removeItemMembership = database.prepare(
    "DELETE FROM item_albums WHERE item_id = ?",
  );
  for (const itemId of itemIds) removeItemMembership.run(itemId);
  const removeAlbumMembership = database.prepare(
    "DELETE FROM item_albums WHERE album_id = ?",
  );
  for (const albumId of albumIds) removeAlbumMembership.run(albumId);
  database.prepare(deleteSql).run(rootId);
  database.prepare("DELETE FROM albums WHERE root_id = ?").run(rootId);
  database
    .prepare("DELETE FROM directory_snapshots WHERE root_id = ?")
    .run(rootId);
  database.prepare("DELETE FROM trashed_albums WHERE root_id = ?").run(rootId);
  database
    .prepare(
      "DELETE FROM item_metadata_overrides WHERE item_id NOT IN (SELECT id FROM items)",
    )
    .run();
  database
    .prepare(
      "DELETE FROM item_edits WHERE item_id NOT IN (SELECT id FROM items)",
    )
    .run();
  database
    .prepare(
      "DELETE FROM video_posters WHERE item_id NOT IN (SELECT id FROM items)",
    )
    .run();
  database.prepare("DELETE FROM roots WHERE id = ?").run(rootId);
  dropItemCaches(itemIds);
  dropPhotoWallCrops(itemIds);
  dropMasonryWallCrops(itemIds);
  dropFilmrollWallCrops(itemIds);
  dropMosaicWallCrops(itemIds);
}

/* 相簿列表和封面取图都按同一种顺序：手动排过的按 sort_order，
   其余按名字自然排序。二级相簿换顺序后，一级相簿的封面才会跟着换。 */
function compareAlbumNodes(x, y) {
  if (x.sortOrder != null || y.sortOrder != null) {
    if (x.sortOrder == null) return 1;
    if (y.sortOrder == null) return -1;
    if (x.sortOrder !== y.sortOrder) return x.sortOrder - y.sortOrder;
  }
  return collator.compare(x.name, y.name);
}

/**
 * 一级相簿自己没有照片时，用二级相簿的封面拼四宫格：
 *   1 个二级相簿：取它的前四张
 *   2 个二级相簿：各取前两张
 *   3 个二级相簿：前两个各取第一张，第三个取前两张
 *   4 个及以上：只取前四个二级相簿各自的第一张
 * 某个二级相簿照片不够时，再按相簿顺序拿后面的照片补满。
 */
function composeChildCovers(childCovers) {
  /* 空相簿也保留在自己的位置上；它没有照片时，后面按顺序补满空位。 */
  const groups = childCovers.map((ids) => ids.slice(0, 4));
  if (!groups.length) return [];

  let picked;
  if (groups.length === 1) {
    picked = groups[0];
  } else if (groups.length === 2) {
    picked = [...groups[0].slice(0, 2), ...groups[1].slice(0, 2)];
  } else if (groups.length === 3) {
    picked = [groups[0][0], groups[1][0], ...groups[2].slice(0, 2)];
  } else {
    picked = groups.slice(0, 4).map((ids) => ids[0]);
  }

  const result = [];
  const add = (id) => {
    if (id != null && result.length < 4 && !result.includes(id))
      result.push(id);
  };
  picked.forEach(add);
  if (result.length < 4) {
    for (const ids of groups) {
      for (const id of ids) {
        add(id);
        if (result.length === 4) break;
      }
      if (result.length === 4) break;
    }
  }
  return result;
}

/** 左侧列表要的整棵树；传入 rootId 时只返回当前图库的相簿。 */
function getTree(rootId = null) {
  const database = openDb();
  const allRoots = listRoots();
  const requestedRootId = rootId == null ? null : Number(rootId);
  const byRoot = Number.isInteger(requestedRootId);
  const rootById = new Map(allRoots.map((root) => [root.id, root]));
  const albumRows = database
    .prepare(
      `
    SELECT a.*,
      (CASE WHEN a.kind = 'unfiled' THEN
        (SELECT COUNT(*) FROM items i
         WHERE i.root_id = a.root_id AND i.album_id = a.id
           AND i.deleted_at IS NULL AND i.ignored_at = 0
           AND i.live_photo_id IS NULL AND i.hidden_at IS NULL
           AND NOT EXISTS (
             SELECT 1 FROM item_albums m WHERE m.item_id = i.id
           ))
       ELSE
        (SELECT COUNT(DISTINCT i.id)
         FROM item_albums m
         JOIN items i ON i.id = m.item_id
         WHERE m.album_id = a.id
           AND i.deleted_at IS NULL AND i.ignored_at = 0
           AND i.live_photo_id IS NULL AND i.hidden_at IS NULL)
       END) AS count,
      (SELECT COUNT(*) FROM albums c WHERE c.parent_id = a.id AND c.hidden_at IS NULL) AS child_count
    FROM albums a
    ${byRoot ? "WHERE a.root_id = ?" : ""}
  `,
    )
    .all(...(byRoot ? [requestedRootId] : []));
  const albumRowById = new Map(albumRows.map((row) => [row.id, row]));
  const albumVisible = (row) => {
    let current = row;
    while (current) {
      if (current.hidden_at != null) return false;
      current =
        current.parent_id == null ? null : albumRowById.get(current.parent_id);
    }
    return true;
  };
  const albums = albumRows.filter(albumVisible);
  const coverStmt = database.prepare(
    `SELECT i.id, i.mtime, i.size, i.root_id, i.editRevision,
            i.videoPosterRevision
     FROM item_effective i
     JOIN item_albums m ON m.item_id = i.id AND m.album_id = ?
     WHERE i.deleted_at IS NULL AND i.ignored_at = 0
       AND i.live_photo_id IS NULL AND i.hidden_at IS NULL
     ORDER BY (i.effective_taken_at IS NULL), i.effective_taken_at DESC,
       i.effective_name COLLATE NOCASE
     LIMIT 4`,
  );
  /* 用户点「设为封面」后，封面只取这一张；如果它后来被删除，
     或从相簿里移除，就自动回到原来的封面规则。 */
  const customCoverStmt = database.prepare(
    `SELECT i.id, i.mtime, i.size, i.root_id, i.editRevision,
            i.videoPosterRevision
     FROM item_effective i
     JOIN item_albums m ON m.item_id = i.id AND m.album_id = ?
     WHERE i.id = ?
       AND i.deleted_at IS NULL AND i.ignored_at = 0
       AND i.live_photo_id IS NULL AND i.hidden_at IS NULL`,
  );
  const coverVersionById = new Map();
  const coverVersion = (row) =>
    `${Number(rootById.get(row.root_id)?.added_at) || 0}-${Number(row.mtime) || 0}-${Number(row.size) || 0}-${Number(row.editRevision) || 0}-${Number(row.videoPosterRevision) || 0}`;
  const nodes = albums.map((a) => {
    const custom = a.cover_item_id
      ? customCoverStmt.get(a.id, Number(a.cover_item_id))
      : null;
    const covers = custom ? [custom] : coverStmt.all(a.id);
    for (const row of covers) coverVersionById.set(row.id, coverVersion(row));
    return {
      id: a.id,
      rootId: a.root_id,
      parentId: a.parent_id,
      name: a.name,
      path: a.path,
      depth: a.depth,
      sortOrder: a.sort_order == null ? null : Number(a.sort_order),
      count: Number(a.count),
      childCount: Number(a.child_count),
      kind:
        a.kind === "unfiled"
          ? "unfiled"
          : a.kind === "folder" || a.kind === "album"
            ? a.kind
            : Number(a.child_count) > 0
              ? "folder"
              : "album",
      isUnfiled: a.kind === "unfiled",
      coverIds: covers.map((r) => r.id),
      coverCustom: !!custom,
      coverVersions: {},
    };
  });

  /* 文件夹自己没照片时，按上面的规则用二级相簿拼封面，别让它空着 */
  const byParent = new Map();
  for (const n of nodes) {
    const key = n.parentId ?? 0;
    if (!byParent.has(key)) byParent.set(key, []);
    byParent.get(key).push(n);
  }
  for (const children of byParent.values()) children.sort(compareAlbumNodes);
  const fillCover = (node, depth = 0) => {
    if (node.coverIds.length || depth > 8) return node.coverIds;
    const childCovers = (byParent.get(node.id) || []).map((child) =>
      fillCover(child, depth + 1),
    );
    node.coverIds.push(...composeChildCovers(childCovers));
    return node.coverIds;
  };
  for (const node of nodes) fillCover(node);
  for (const node of nodes) {
    node.coverVersions = Object.fromEntries(
      node.coverIds.map((id) => [id, coverVersionById.get(id) || ""]),
    );
  }
  const roots = allRoots.map((r) => ({
    id: r.id,
    path: r.path,
    name: r.name,
    addedAt: r.added_at,
    albums: nodes
      .filter((n) => n.rootId === r.id && n.parentId === null)
      .sort(compareAlbumNodes),
    itemCount: database
      .prepare(
        `SELECT COUNT(*) AS c FROM items
       WHERE root_id = ? AND deleted_at IS NULL AND ignored_at = 0
         AND live_photo_id IS NULL AND hidden_at IS NULL`,
      )
      .get(r.id).c,
  }));
  /* 标出哪个是根文件夹本身（它不能被当作相簿删掉） */
  const rootPaths = new Set(roots.map((r) => r.path.toLowerCase()));
  for (const node of nodes)
    node.isRoot = rootPaths.has(node.path.toLowerCase());
  const favoriteCount = Number(
    database
      .prepare(
        `
    SELECT COUNT(*) AS c FROM items
    WHERE deleted_at IS NULL AND ignored_at = 0 AND live_photo_id IS NULL
      AND hidden_at IS NULL
      AND favorite_at IS NOT NULL
      ${byRoot ? "AND root_id = ?" : ""}
  `,
      )
      .get(...(byRoot ? [requestedRootId] : [])).c,
  );
  return { roots, albums: nodes, favoriteCount };
}

function getAlbum(albumId) {
  return openDb().prepare("SELECT * FROM albums WHERE id = ?").get(albumId);
}

/** 保存同一组相簿（同一个根文件夹、同一个父相簿）的顺序 */
function setAlbumOrder(ids) {
  const ordered = (Array.isArray(ids) ? ids : []).map(Number);
  if (!ordered.length || ordered.some((id) => !Number.isInteger(id))) {
    throw new Error("相簿顺序无效");
  }
  if (new Set(ordered).size !== ordered.length) {
    throw new Error("相簿顺序里有重复项");
  }

  const database = openDb();
  const rows = ordered.map((id) =>
    database
      .prepare("SELECT id, root_id, parent_id FROM albums WHERE id = ?")
      .get(id),
  );
  if (rows.some((row) => !row)) throw new Error("有相簿已经不存在了");

  const rootId = rows[0].root_id;
  const parentId = rows[0].parent_id;
  if (
    rows.some((row) => row.root_id !== rootId || row.parent_id !== parentId)
  ) {
    throw new Error("只能在同一层相簿之间排序");
  }

  const siblings = database
    .prepare("SELECT id FROM albums WHERE root_id = ? AND parent_id IS ?")
    .all(rootId, parentId)
    .map((row) => row.id);
  if (
    siblings.length !== ordered.length ||
    siblings.some((id) => !ordered.includes(id))
  ) {
    throw new Error("相簿列表刚刚有变化，请重试");
  }

  const update = database.prepare(
    "UPDATE albums SET sort_order = ? WHERE id = ?",
  );
  database.exec("BEGIN IMMEDIATE");
  try {
    ordered.forEach((id, index) => update.run(index, id));
    database.exec("COMMIT");
  } catch (err) {
    database.exec("ROLLBACK");
    throw err;
  }
  return ordered;
}

/**
 * 新建相簿 / 文件夹后，把它放到同一层相簿的末尾。
 *
 * 新相簿刚被扫描进索引时，可能还没有 sort_order；这种情况下界面会按名称排，
 * 于是它看起来会插到中间。这里先把这一层当前的显示顺序固定下来，再把
 * 新建的那一项挪到最后，后续重扫也会沿用这个顺序。
 */
function appendAlbumToEnd(albumId) {
  const id = Number(albumId);
  const database = openDb();
  const album = database
    .prepare("SELECT id, root_id, parent_id FROM albums WHERE id = ?")
    .get(id);
  if (!album) throw new Error("相簿不存在");

  const siblings = database
    .prepare(
      `
    SELECT id, name, sort_order AS sortOrder
    FROM albums
    WHERE root_id = ? AND parent_id IS ?
  `,
    )
    .all(album.root_id, album.parent_id)
    .sort(compareAlbumNodes);

  const index = siblings.findIndex((row) => row.id === id);
  if (index < 0) throw new Error("相簿刚刚被移走了");
  const [created] = siblings.splice(index, 1);
  siblings.push(created);

  const update = database.prepare(
    "UPDATE albums SET sort_order = ? WHERE id = ?",
  );
  database.exec("BEGIN IMMEDIATE");
  try {
    siblings.forEach((row, order) => update.run(order, row.id));
    database.exec("COMMIT");
  } catch (err) {
    database.exec("ROLLBACK");
    throw err;
  }
  return siblings.map((row) => row.id);
}

/** 恢复相簿后把它重新插回删除前的排序槽位，后面的相簿自动顺延。 */
function restoreAlbumSortOrder(albumId, sortOrder) {
  const id = Number(albumId);
  const slot = Number(sortOrder);
  if (!Number.isFinite(slot)) return null;
  const database = openDb();
  const album = database
    .prepare(
      "SELECT id, root_id, parent_id, name, sort_order FROM albums WHERE id = ?",
    )
    .get(id);
  if (!album) return null;

  const siblings = database
    .prepare(
      `
    SELECT id, name, sort_order AS sortOrder
    FROM albums
    WHERE root_id = ? AND parent_id IS ? AND id != ?
  `,
    )
    .all(album.root_id, album.parent_id, id)
    .sort(compareAlbumNodes);
  const insertAt = Math.max(0, Math.min(siblings.length, Math.round(slot)));
  siblings.splice(insertAt, 0, album);

  const update = database.prepare(
    "UPDATE albums SET sort_order = ? WHERE id = ?",
  );
  database.exec("BEGIN IMMEDIATE");
  try {
    siblings.forEach((row, index) => update.run(index, row.id));
    database.exec("COMMIT");
  } catch (err) {
    database.exec("ROLLBACK");
    throw err;
  }
  return siblings.map((row) => row.id);
}

/** 记住这一条是用户新建的相簿还是文件夹；老的散目录按内容自动推断。 */
function setAlbumKind(albumId, kind) {
  const value = kind === "folder" ? "folder" : "album";
  const result = openDb()
    .prepare("UPDATE albums SET kind = ? WHERE id = ?")
    .run(value, Number(albumId));
  if (!result.changes) throw new Error("相簿不存在");
  return value;
}

/** 把相簿里的一张照片设为封面；只记相簿信息，不改文件，也不移动项目。 */
function setAlbumCover(albumId, itemId) {
  const album = getAlbum(Number(albumId));
  if (!album || album.hidden_at) throw new Error("相簿不存在");
  const id = Number(itemId);
  if (!Number.isInteger(id) || id <= 0) throw new Error("没有选中有效的项目");
  const member = openDb()
    .prepare(
      `SELECT i.id
     FROM items i
     JOIN item_albums m ON m.item_id = i.id AND m.album_id = ?
     WHERE i.id = ?
       AND i.deleted_at IS NULL AND i.ignored_at = 0
       AND i.hidden_at IS NULL`,
    )
    .get(album.id, id);
  if (!member) throw new Error("这个项目不在当前相簿里");
  openDb()
    .prepare("UPDATE albums SET cover_item_id = ? WHERE id = ?")
    .run(id, album.id);
  return { albumId: album.id, itemId: id };
}

function getItems(albumId, { offset = 0, limit = 1000 } = {}) {
  const database = openDb();
  const album = database
    .prepare("SELECT kind, root_id FROM albums WHERE id = ?")
    .get(Number(albumId));
  if (!album) return [];
  const unfiled = album.kind === "unfiled";
  return database
    .prepare(
      `SELECT i.id, i.root_id AS rootId, i.album_id AS albumId,
            i.effective_name AS name, i.kind,
            i.size, i.mtime, i.width, i.height,
            i.editRevision, i.videoPosterRevision,
            i.effective_taken_at AS taken_at,
            COALESCE(m.added_seq, i.added_seq) AS addedSeq,
            (CASE WHEN i.favorite_at IS NOT NULL THEN 1 ELSE 0 END) AS favorite,
            i.rating,
            (CASE WHEN i.hidden_at IS NOT NULL THEN 1 ELSE 0 END) AS hidden,
            i.effective_camera AS camera, i.effective_lens AS lens,
            i.camera AS originalCamera, i.lens AS originalLens,
            i.camera_override AS cameraOverride, i.iso, i.f_number,
            i.exposure, i.focal,
            i.effective_gps_lat AS gps_lat,
            i.effective_gps_lon AS gps_lon,
            i.effective_location_name AS location_name,
            i.taken_at_override AS takenAtOverride,
            i.gps_lat_override AS gpsLatOverride,
            i.gps_lon_override AS gpsLonOverride,
            i.gps_cleared AS gpsCleared,
            i.gps_file_modified AS gpsFileModified,
            i.location_name_override AS locationNameOverride,
            i.duration, i.fps, i.codec, i.path,
            CASE WHEN v.id IS NOT NULL THEN i.live_video_id END AS liveVideoId,
            v.name AS liveVideoName,
            v.duration AS liveVideoDuration,
            v.mtime AS liveVideoMtime,
            v.size AS liveVideoSize,
            pw.crop_x AS photoWallCropX,
            pw.crop_y AS photoWallCropY,
            pw.crop_size AS photoWallCropSize,
            pw.updated_at AS photoWallCropUpdatedAt
     FROM item_effective i
     LEFT JOIN item_albums m ON m.item_id = i.id AND m.album_id = ?
     LEFT JOIN items v ON v.id = i.live_video_id AND v.deleted_at IS NULL
     LEFT JOIN photo_wall_crops pw ON pw.item_id = i.id
     WHERE i.deleted_at IS NULL AND i.ignored_at = 0 AND i.live_photo_id IS NULL
       AND i.hidden_at IS NULL
       AND ${
         unfiled
           ? `i.root_id = ? AND i.album_id = ? AND NOT EXISTS (
         SELECT 1 FROM item_albums mx WHERE mx.item_id = i.id)`
           : "m.album_id IS NOT NULL"
       }
     ORDER BY (i.effective_taken_at IS NULL), i.effective_taken_at DESC,
       i.effective_name COLLATE NOCASE
     LIMIT ? OFFSET ?`,
    )
    .all(
      ...(unfiled ? [albumId, album.root_id, albumId] : [albumId]),
      limit,
      offset,
    );
}

function getWallAlbumBases(rootId = null, albumIds = null) {
  const tree = getTree(rootId);
  const wanted =
    albumIds == null
      ? null
      : new Set(
          (Array.isArray(albumIds) ? albumIds : [])
            .map(Number)
            .filter(Number.isInteger),
        );
  const leaves = tree.albums.filter(
    (album) =>
      album.childCount === 0 && (!wanted || wanted.has(Number(album.id))),
  );
  const usedNames = new Set();
  const result = [];
  for (const album of leaves) {
    const photos = getItems(album.id, { limit: 100000 }).filter(
      (item) => item.kind === "photo",
    );
    if (!photos.length) continue;
    const base = String(album.name || "相簿").trim() || "相簿";
    let displayName = base;
    let suffix = 2;
    while (usedNames.has(displayName.toLocaleLowerCase("zh-CN"))) {
      displayName = `${base} ${suffix}`;
      suffix += 1;
    }
    usedNames.add(displayName.toLocaleLowerCase("zh-CN"));
    const cover =
      photos.find((item) => album.coverIds.includes(item.id)) || photos[0];
    result.push({
      album,
      photos,
      fields: {
        id: album.id,
        rootId: album.rootId,
        parentId: album.parentId,
        name: album.name,
        displayName,
        path: album.path,
        photoCount: photos.length,
        coverItemId: cover.id,
        coverName: cover.name,
        coverMtime: cover.mtime,
        coverSize: cover.size,
        coverEditRevision: Number(cover.editRevision) || 0,
      },
    });
  }
  return result;
}

/**
 * 相册目录只需要照片数量和一张封面。这里通过窗口计数和带 LIMIT 1 的
 * 封面查询读取数据，不再为了统计数量把每本相册的全部照片载入内存。
 */
function listWallAlbumCatalog(rootId = null) {
  const tree = getTree(rootId);
  const leaves = tree.albums.filter((album) => album.childCount === 0);
  const database = openDb();
  const albumCover = database.prepare(`
    SELECT i.id, i.effective_name AS name, i.mtime, i.size, i.width, i.height,
           i.editRevision, i.videoPosterRevision,
           COUNT(*) OVER () AS photoCount,
           pw.crop_x AS photoWallCropX,
           pw.crop_y AS photoWallCropY,
           pw.crop_size AS photoWallCropSize,
           pw.updated_at AS photoWallCropUpdatedAt,
           mw.ratio_key AS masonryRatioKey,
           mw.updated_at AS masonryUpdatedAt,
           fw.ratio_key AS filmrollRatioKey,
           fw.updated_at AS filmrollUpdatedAt,
           sw.ratio_key AS mosaicRatioKey,
           sw.updated_at AS mosaicUpdatedAt
    FROM item_albums m
    JOIN item_effective i ON i.id = m.item_id
    LEFT JOIN photo_wall_crops pw ON pw.item_id = i.id
    LEFT JOIN masonry_wall_crops mw ON mw.item_id = i.id
    LEFT JOIN filmroll_wall_crops fw ON fw.item_id = i.id
    LEFT JOIN mosaic_wall_crops sw ON sw.item_id = i.id
    WHERE m.album_id = ? AND i.kind = 'photo'
      AND i.deleted_at IS NULL AND i.ignored_at = 0
      AND i.live_photo_id IS NULL AND i.hidden_at IS NULL
    ORDER BY CASE
               WHEN i.id = ? OR i.id = ? OR i.id = ? OR i.id = ? THEN 0
               ELSE 1
             END,
             (i.effective_taken_at IS NULL), i.effective_taken_at DESC,
             i.effective_name COLLATE NOCASE
    LIMIT 1
  `);
  const unfiledCover = database.prepare(`
    SELECT i.id, i.effective_name AS name, i.mtime, i.size, i.width, i.height,
           i.editRevision, i.videoPosterRevision,
           COUNT(*) OVER () AS photoCount,
           pw.crop_x AS photoWallCropX,
           pw.crop_y AS photoWallCropY,
           pw.crop_size AS photoWallCropSize,
           pw.updated_at AS photoWallCropUpdatedAt,
           mw.ratio_key AS masonryRatioKey,
           mw.updated_at AS masonryUpdatedAt,
           fw.ratio_key AS filmrollRatioKey,
           fw.updated_at AS filmrollUpdatedAt,
           sw.ratio_key AS mosaicRatioKey,
           sw.updated_at AS mosaicUpdatedAt
    FROM item_effective i
    LEFT JOIN photo_wall_crops pw ON pw.item_id = i.id
    LEFT JOIN masonry_wall_crops mw ON mw.item_id = i.id
    LEFT JOIN filmroll_wall_crops fw ON fw.item_id = i.id
    LEFT JOIN mosaic_wall_crops sw ON sw.item_id = i.id
    WHERE i.root_id = ? AND i.album_id = ? AND i.kind = 'photo'
      AND i.deleted_at IS NULL AND i.ignored_at = 0
      AND i.live_photo_id IS NULL AND i.hidden_at IS NULL
      AND NOT EXISTS (
        SELECT 1 FROM item_albums mx WHERE mx.item_id = i.id
      )
    ORDER BY CASE
               WHEN i.id = ? OR i.id = ? OR i.id = ? OR i.id = ? THEN 0
               ELSE 1
             END,
             (i.effective_taken_at IS NULL), i.effective_taken_at DESC,
             i.effective_name COLLATE NOCASE
    LIMIT 1
  `);
  const usedNames = new Set();
  const albums = [];
  for (const album of leaves) {
    const coverIds = (album.coverIds || [])
      .map(Number)
      .filter((id) => Number.isInteger(id))
      .slice(0, 4);
    while (coverIds.length < 4) coverIds.push(-1);
    const cover =
      album.kind === "unfiled"
        ? unfiledCover.get(Number(album.rootId), Number(album.id), ...coverIds)
        : albumCover.get(Number(album.id), ...coverIds);
    if (!cover || !Number(cover.photoCount)) continue;
    const base = String(album.name || "相簿").trim() || "相簿";
    let displayName = base;
    let suffix = 2;
    while (usedNames.has(displayName.toLocaleLowerCase("zh-CN"))) {
      displayName = `${base} ${suffix}`;
      suffix += 1;
    }
    usedNames.add(displayName.toLocaleLowerCase("zh-CN"));
    albums.push({
      id: album.id,
      rootId: album.rootId,
      parentId: album.parentId,
      name: album.name,
      displayName,
      path: album.path,
      photoCount: Number(cover.photoCount),
      coverItemId: Number(cover.id),
      coverName: cover.name,
      coverMtime: cover.mtime,
      coverSize: cover.size,
      coverEditRevision: Number(cover.editRevision) || 0,
      cover,
    });
  }
  return {
    photoWall: albums.map(({ cover, ...album }) => ({
      ...album,
      coverCrop: cropFromRow(cover),
    })),
    masonry: albums.map(({ cover, ...album }) => ({
      ...album,
      coverCrop: resolveMasonryWallRatio(
        cover,
        cover.masonryRatioKey,
        cover.masonryUpdatedAt,
      ),
    })),
    filmroll: albums.map(({ cover, ...album }) => ({
      ...album,
      coverCrop: resolveFilmrollWallRatio(
        cover,
        cover.filmrollRatioKey,
        cover.filmrollUpdatedAt,
      ),
    })),
    mosaic: albums.map(({ cover, ...album }) => ({
      ...album,
      coverCrop: resolveMosaicWallRatio(
        cover,
        cover.mosaicRatioKey,
        cover.mosaicUpdatedAt,
      ),
    })),
  };
}

function listPhotoWallAlbums(rootId = null) {
  return listWallAlbumCatalog(rootId).photoWall;
}

/**
 * 纵向画廊拥有独立的相簿视图和比例裁剪，但相簿身份仍来自普通相簿。
 * 这样改名、移动、增删照片会自动同步，同时两套照片墙状态互不覆盖。
 */
function listMasonryWallAlbums(rootId = null) {
  return listWallAlbumCatalog(rootId).masonry;
}

function listFilmrollWallAlbums(rootId = null) {
  return listWallAlbumCatalog(rootId).filmroll;
}

function listMosaicWallAlbums(rootId = null) {
  return listWallAlbumCatalog(rootId).mosaic;
}

function listWallAlbums(rootId = null) {
  return listWallAlbumCatalog(rootId);
}

const cropFromRow = (item) =>
  item?.photoWallCropX != null && item?.photoWallCropY != null
    ? {
        x: Number(item.photoWallCropX),
        y: Number(item.photoWallCropY),
        size: Number(item.photoWallCropSize),
        updatedAt: Number(item.photoWallCropUpdatedAt) || 0,
      }
    : null;

function selectedWallBases(albumIds, rootId) {
  return getWallAlbumBases(rootId, albumIds);
}

function collectWallPhotos(bases, cropField = "", cropForItem = null) {
  const seen = new Set();
  const result = [];
  for (const entry of bases) {
    for (const item of entry.photos) {
      if (item.kind !== "photo" || seen.has(item.id)) continue;
      seen.add(item.id);
      result.push(
        cropForItem ? { ...item, [cropField]: cropForItem(item.id) } : item,
      );
    }
  }
  return result;
}

/** 所有指定叶子相簿里的照片；按照片 ID 去重，保留第一次出现的顺序。 */
function getPhotoWallPhotos(albumIds = null, rootId = null) {
  return collectWallPhotos(selectedWallBases(albumIds, rootId));
}

function getMasonryWallPhotos(albumIds = null, rootId = null) {
  return collectWallPhotos(
    selectedWallBases(albumIds, rootId),
    "masonryCrop",
    getMasonryWallCrop,
  );
}

function getFilmrollWallPhotos(albumIds = null, rootId = null) {
  return collectWallPhotos(
    selectedWallBases(albumIds, rootId),
    "filmrollCrop",
    getFilmrollWallCrop,
  );
}

function getMosaicWallPhotos(albumIds = null, rootId = null) {
  return collectWallPhotos(
    selectedWallBases(albumIds, rootId),
    "mosaicCrop",
    getMosaicWallCrop,
  );
}

/** 图库：整个相簿库里所有未删除的照片和视频。 */
function getLibraryItems(rootId = null) {
  const id = rootId == null ? null : Number(rootId);
  const byRoot = Number.isInteger(id);
  return openDb()
    .prepare(
      `SELECT i.id, i.root_id AS rootId, i.album_id AS albumId,
            i.effective_name AS name, i.kind,
            i.size, i.mtime, i.width, i.height,
            i.editRevision, i.videoPosterRevision,
            i.effective_taken_at AS taken_at, i.added_seq AS addedSeq,
            (CASE WHEN i.favorite_at IS NOT NULL THEN 1 ELSE 0 END) AS favorite,
            i.rating,
            (CASE WHEN i.hidden_at IS NOT NULL THEN 1 ELSE 0 END) AS hidden,
            i.effective_camera AS camera, i.effective_lens AS lens,
            i.camera AS originalCamera, i.lens AS originalLens,
            i.camera_override AS cameraOverride,
            i.iso, i.f_number, i.exposure, i.focal,
            i.effective_gps_lat AS gps_lat, i.effective_gps_lon AS gps_lon,
            i.effective_location_name AS location_name,
            i.taken_at_override AS takenAtOverride,
            i.gps_lat_override AS gpsLatOverride,
            i.gps_lon_override AS gpsLonOverride,
            i.gps_cleared AS gpsCleared,
            i.gps_file_modified AS gpsFileModified,
            i.location_name_override AS locationNameOverride,
            i.duration, i.fps, i.codec, i.path,
            CASE WHEN v.id IS NOT NULL THEN i.live_video_id END AS liveVideoId,
            v.name AS liveVideoName,
            v.duration AS liveVideoDuration,
            v.mtime AS liveVideoMtime,
            v.size AS liveVideoSize
     FROM item_effective i
     LEFT JOIN items v ON v.id = i.live_video_id AND v.deleted_at IS NULL
     WHERE i.deleted_at IS NULL AND i.ignored_at = 0 AND i.live_photo_id IS NULL
       AND i.hidden_at IS NULL
       ${byRoot ? "AND i.root_id = ?" : ""}
     ORDER BY (i.effective_taken_at IS NULL), i.effective_taken_at DESC,
       i.effective_name COLLATE NOCASE`,
    )
    .all(...(byRoot ? [id] : []));
}

/** 收藏：所有被标记过的项目，最近收藏的排前面。 */
function getFavoriteItems(rootId = null) {
  const id = rootId == null ? null : Number(rootId);
  const byRoot = Number.isInteger(id);
  return openDb()
    .prepare(
      `SELECT i.id, i.root_id AS rootId, i.album_id AS albumId,
            i.effective_name AS name, i.kind,
            i.size, i.mtime, i.width, i.height,
            i.editRevision, i.videoPosterRevision,
            i.effective_taken_at AS taken_at, i.added_seq AS addedSeq,
            i.favorite_at AS favoriteAt, 1 AS favorite, i.rating,
            0 AS hidden,
            i.effective_camera AS camera, i.effective_lens AS lens,
            i.camera AS originalCamera, i.lens AS originalLens,
            i.camera_override AS cameraOverride,
            i.iso, i.f_number, i.exposure, i.focal,
            i.effective_gps_lat AS gps_lat, i.effective_gps_lon AS gps_lon,
            i.effective_location_name AS location_name,
            i.taken_at_override AS takenAtOverride,
            i.gps_lat_override AS gpsLatOverride,
            i.gps_lon_override AS gpsLonOverride,
            i.gps_cleared AS gpsCleared,
            i.gps_file_modified AS gpsFileModified,
            i.location_name_override AS locationNameOverride,
            i.duration, i.fps, i.codec, i.path,
            CASE WHEN v.id IS NOT NULL THEN i.live_video_id END AS liveVideoId,
            v.name AS liveVideoName,
            v.duration AS liveVideoDuration,
            v.mtime AS liveVideoMtime,
            v.size AS liveVideoSize
     FROM item_effective i
     LEFT JOIN items v ON v.id = i.live_video_id AND v.deleted_at IS NULL
     WHERE i.deleted_at IS NULL AND i.ignored_at = 0 AND i.live_photo_id IS NULL
       AND i.hidden_at IS NULL
       AND i.favorite_at IS NOT NULL
       ${byRoot ? "AND i.root_id = ?" : ""}
     ORDER BY i.favorite_at DESC, i.id DESC`,
    )
    .all(...(byRoot ? [id] : []));
}

/**
 * 批量收藏 / 取消收藏。收藏只记在索引里，项目仍留在原来的相簿，
 * 所以移动、复制这些文件操作都不会因为收藏而改变。
 */
function setItemsFavorite(ids, favorite) {
  const database = openDb();
  const list = (Array.isArray(ids) ? ids : [])
    .map(Number)
    .filter((id) => Number.isInteger(id));
  if (!list.length) return { ids: [], changed: 0 };

  const stamp = favorite ? Date.now() : null;
  const update = favorite
    ? database.prepare(
        "UPDATE items SET favorite_at = COALESCE(favorite_at, ?) WHERE id = ? AND deleted_at IS NULL",
      )
    : database.prepare(
        "UPDATE items SET favorite_at = NULL WHERE id = ? AND deleted_at IS NULL AND favorite_at IS NOT NULL",
      );
  const changedIds = [];
  database.exec("BEGIN IMMEDIATE");
  try {
    for (const id of list) {
      const result = favorite ? update.run(stamp, id) : update.run(id);
      if (result.changes) changedIds.push(id);
    }
    database.exec("COMMIT");
  } catch (err) {
    database.exec("ROLLBACK");
    throw err;
  }
  return { ids: changedIds, changed: changedIds.length };
}

/**
 * 批量设置照片星级。0 表示取消评分，1–5 分别对应一颗到五颗实心星。
 * 评分和收藏一样只写入本地索引，不会修改照片原文件。
 */
function setItemsRating(ids, rating) {
  const database = openDb();
  const value = Math.max(0, Math.min(5, Math.round(Number(rating) || 0)));
  const list = (Array.isArray(ids) ? ids : [])
    .map(Number)
    .filter((id) => Number.isInteger(id));
  if (!list.length) return { ids: [], changed: 0, rating: value };

  const update = database.prepare(
    `UPDATE items
     SET rating = ?
     WHERE id = ? AND deleted_at IS NULL AND rating <> ?`,
  );
  const changedIds = [];
  database.exec("BEGIN IMMEDIATE");
  try {
    for (const id of list) {
      const result = update.run(value, id, value);
      if (result.changes) changedIds.push(id);
    }
    database.exec("COMMIT");
  } catch (err) {
    database.exec("ROLLBACK");
    throw err;
  }
  return { ids: changedIds, changed: changedIds.length, rating: value };
}

function nextAddedSeq(database = openDb()) {
  const itemMax =
    Number(database.prepare("SELECT MAX(added_seq) AS n FROM items").get().n) ||
    0;
  const membershipMax =
    Number(
      database.prepare("SELECT MAX(added_seq) AS n FROM item_albums").get().n,
    ) || 0;
  return Math.max(itemMax, membershipMax) + 1;
}

/* 自定义顺序按 added_seq 从大到小排。新增关联从全库最大序号之后倒着分配，
   这样整批项目会进到最前面，同时保留本批项目提交时的先后。 */
function latestBatchAddedSeq(database, count = 1) {
  return nextAddedSeq(database) + Math.max(1, Number(count) || 1) - 1;
}

/**
 * 把项目虚拟加入另一个相簿：只写一条关联，文件仍留在原来的位置。
 * 只跳过同一个项目重复加入；不同真实路径的同名 / 同内容项目保持独立。
 */
async function addItemsToAlbum(itemIds, albumId) {
  const target = getAlbum(albumId);
  if (!target) throw new Error("相簿不存在");
  if (target.hidden_at) throw new Error("这个相簿已经不在当前相簿列表里");

  const database = openDb();
  const targetItems = database
    .prepare(
      `
    SELECT i.id
    FROM item_albums m
    JOIN items i ON i.id = m.item_id
    WHERE m.album_id = ? AND i.deleted_at IS NULL
      AND i.ignored_at = 0 AND i.hidden_at IS NULL
  `,
    )
    .all(target.id);
  const existingIds = new Set(targetItems.map((item) => item.id));

  const result = {
    added: 0,
    skipped: 0,
    failed: [],
    items: [],
    duplicates: [],
  };
  let seq = latestBatchAddedSeq(database, itemIds?.length);
  for (const rawId of itemIds || []) {
    const item = getItem(Number(rawId));
    if (!item || item.deleted_at || item.ignored_at) {
      result.failed.push({ id: rawId, reason: "项目已经不在相簿里" });
      continue;
    }
    if (existingIds.has(item.id)) {
      result.skipped += 1;
      continue;
    }

    try {
      database
        .prepare(
          "INSERT INTO item_albums (item_id, album_id, added_seq, added_at) VALUES (?,?,?,?)",
        )
        .run(item.id, target.id, seq, Date.now());
    } catch (err) {
      result.failed.push({ id: item.id, reason: String(err.message || err) });
      continue;
    }
    result.added += 1;
    result.items.push({ id: item.id, albumId: target.id, addedSeq: seq });
    existingIds.add(item.id);
    seq -= 1;
  }
  return result;
}

/**
 * 在软件内移动项目：只改变相簿关联，不修改真实文件路径。
 * sourceAlbumId 是用户发起移动时所在的相簿；省略时只新增目标关联。
 */
function moveItemsToAlbum(itemIds, targetAlbumId, sourceAlbumId = null) {
  const target = getAlbum(targetAlbumId);
  if (!target || target.hidden_at) throw new Error("目标相簿不存在");
  const source = sourceAlbumId == null ? null : getAlbum(sourceAlbumId);
  if (sourceAlbumId != null && (!source || source.hidden_at)) {
    throw new Error("原相簿不存在");
  }
  /* 「未归档」是根目录直属内容的虚拟汇总，不是 item_albums 里的
     真实成员关系。从它移出时只需要新增目标关联。 */
  const sourceIsUnfiled = source?.kind === "unfiled";

  const database = openDb();
  const result = {
    moved: 0,
    skipped: 0,
    failed: [],
    ids: [],
    items: [],
    before: [],
  };
  const getMemberships = database.prepare(
    `SELECT album_id AS albumId, added_seq AS addedSeq, added_at AS addedAt
     FROM item_albums WHERE item_id = ? ORDER BY album_id`,
  );
  const deleteMembership = database.prepare(
    "DELETE FROM item_albums WHERE item_id = ? AND album_id = ?",
  );
  const insertMembership = database.prepare(
    `INSERT OR IGNORE INTO item_albums (item_id, album_id, added_seq, added_at)
     VALUES (?,?,?,?)`,
  );

  database.exec("BEGIN IMMEDIATE");
  try {
    let seq = latestBatchAddedSeq(database, itemIds?.length);
    for (const rawId of itemIds || []) {
      const item = getItem(Number(rawId));
      if (!item || item.deleted_at || item.ignored_at) {
        result.failed.push({ id: rawId, reason: "项目已经不在图库里" });
        continue;
      }
      if (source && source.id === target.id) {
        result.skipped += 1;
        continue;
      }

      const memberships = getMemberships.all(item.id);
      const sourceMembership = source
        ? memberships.find((row) => Number(row.albumId) === Number(source.id))
        : null;
      const sourceVisible = !source || sourceIsUnfiled || !!sourceMembership;
      if (source && !sourceVisible) {
        result.failed.push({ id: item.id, reason: "项目已经不在原相簿里" });
        continue;
      }

      const targetMembership = memberships.find(
        (row) => Number(row.albumId) === Number(target.id),
      );
      const targetVisible = !!targetMembership;
      if (!source && targetVisible) {
        result.skipped += 1;
        continue;
      }

      const before = {
        id: item.id,
        addedSeq: item.added_seq,
        memberships: memberships.map((row) => ({
          albumId: Number(row.albumId),
          addedSeq: Number(row.addedSeq),
          addedAt: Number(row.addedAt),
        })),
      };
      let changed = false;

      if (source && !sourceIsUnfiled && source.id !== target.id) {
        if (sourceMembership) {
          changed =
            deleteMembership.run(item.id, source.id).changes > 0 || changed;
        }
      }

      if (!targetMembership) {
        insertMembership.run(item.id, target.id, seq, Date.now());
        seq -= 1;
        changed = true;
      }

      if (!changed) {
        result.skipped += 1;
        continue;
      }
      result.moved += 1;
      result.ids.push(item.id);
      result.items.push({
        id: item.id,
        fromAlbumId: sourceIsUnfiled ? null : (source?.id ?? null),
        toAlbumId: target.id,
        path: item.path,
      });
      result.before.push(before);
    }
    database.exec("COMMIT");
  } catch (err) {
    database.exec("ROLLBACK");
    throw err;
  }
  return result;
}

/** 撤销一次软件内移动：恢复移动前的隐藏状态和全部相簿关联。 */
function restoreLogicalMove(snapshots) {
  const list = Array.isArray(snapshots) ? snapshots : [];
  if (!list.length) return { ok: 0, ids: [] };
  const database = openDb();
  const deleteAll = database.prepare(
    "DELETE FROM item_albums WHERE item_id = ?",
  );
  const insert = database.prepare(
    `INSERT INTO item_albums (item_id, album_id, added_seq, added_at)
     VALUES (?,?,?,?)`,
  );
  const ids = [];
  database.exec("BEGIN IMMEDIATE");
  try {
    for (const snapshot of list) {
      const id = Number(snapshot?.id);
      if (!Number.isInteger(id)) continue;
      deleteAll.run(id);
      for (const membership of snapshot.memberships || []) {
        insert.run(
          id,
          Number(membership.albumId),
          Number(membership.addedSeq),
          Number(membership.addedAt),
        );
      }
      ids.push(id);
    }
    database.exec("COMMIT");
  } catch (err) {
    database.exec("ROLLBACK");
    throw err;
  }
  return { ok: ids.length, ids };
}

/**
 * 只取消项目在这个相簿里的归类；原文件、图库和其他相簿都不受影响。
 * 软件的相簿关系只存在 item_albums 中，重扫不会把它加回来。
 */
function removeItemsFromAlbum(itemIds, albumId) {
  const album = getAlbum(albumId);
  if (!album) throw new Error("相簿不存在");
  const database = openDb();
  const result = { removed: 0, skipped: 0, failed: [], ids: [] };
  const remove = database.prepare(
    "DELETE FROM item_albums WHERE item_id = ? AND album_id = ?",
  );
  for (const rawId of itemIds || []) {
    const item = getItem(Number(rawId));
    if (!item) {
      result.failed.push({ id: rawId, reason: "项目已经不在相簿里" });
      continue;
    }
    const info = remove.run(item.id, album.id);
    if (!info.changes) {
      result.skipped += 1;
      continue;
    }
    result.removed += 1;
    result.ids.push(item.id);
  }
  return result;
}

function getItem(itemId) {
  return openDb()
    .prepare(
      `SELECT i.*, e.updated_at AS editRevision,
              vp.revision AS videoPosterRevision
     FROM items i
     LEFT JOIN item_edits e ON e.item_id = i.id
     LEFT JOIN video_posters vp ON vp.item_id = i.id
     WHERE i.id = ?`,
    )
    .get(itemId);
}

/* ------------------------------ 最近删除 ------------------------------ */

/** 最近删除里的东西，新删的排前面 */
function listTrash(rootId = null) {
  const id = rootId == null ? null : Number(rootId);
  const byRoot = Number.isInteger(id);
  return openDb()
    .prepare(
      `SELECT i.id, i.effective_name AS name,
            i.kind, i.size, i.width, i.height,
            i.editRevision, i.videoPosterRevision,
            i.effective_taken_at AS taken_at,
            i.effective_camera AS camera, i.effective_lens AS lens,
            i.camera AS originalCamera, i.lens AS originalLens,
            i.camera_override AS cameraOverride, i.iso, i.f_number,
            i.exposure, i.focal, i.effective_gps_lat AS gps_lat,
            i.effective_gps_lon AS gps_lon,
            i.effective_location_name AS location_name,
            i.taken_at_override AS takenAtOverride,
            i.gps_lat_override AS gpsLatOverride,
            i.gps_lon_override AS gpsLonOverride,
            i.gps_cleared AS gpsCleared,
            i.gps_file_modified AS gpsFileModified,
            i.location_name_override AS locationNameOverride,
            i.duration, i.fps, i.codec, i.path,
            i.deleted_at, i.deleted_from,
            CASE WHEN v.id IS NOT NULL THEN i.live_video_id END AS liveVideoId,
            v.name AS liveVideoName,
            v.duration AS liveVideoDuration,
            v.mtime AS liveVideoMtime,
            v.size AS liveVideoSize
     FROM item_effective i
     LEFT JOIN items v ON v.id = i.live_video_id AND v.deleted_at IS NOT NULL
     WHERE i.deleted_at IS NOT NULL AND i.ignored_at = 0
       AND i.live_photo_id IS NULL
       ${byRoot ? "AND i.root_id = ?" : ""}
     ORDER BY i.deleted_at DESC, i.id DESC`,
    )
    .all(...(byRoot ? [id] : []));
}

function trashedAlbumCoverFiles(dir, depth = 0) {
  if (depth > 8) return [];
  let entries = [];
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return [];
  }

  const direct = entries
    .filter((ent) => ent.isFile() && !isHidden(ent.name) && kindOf(ent.name))
    .map((ent) => path.join(dir, ent.name))
    .sort((a, b) => collator.compare(path.basename(a), path.basename(b)))
    .slice(0, 4);
  /* 和正常相簿一样：自己有照片就先用这层；自己没有才拿子相簿拼封面。 */
  if (direct.length) return direct;

  const children = entries
    .filter(
      (ent) => ent.isDirectory() && !isHidden(ent.name) && !isJunkDir(ent.name),
    )
    .map((ent) => path.join(dir, ent.name))
    .sort((a, b) => collator.compare(path.basename(a), path.basename(b)))
    .map((child) => trashedAlbumCoverFiles(child, depth + 1));
  return composeChildCovers(children);
}

function resolveTrashedCover(row, relativePath) {
  const root = path.resolve(row.trash_path);
  const full = path.resolve(root, String(relativePath));
  const within = path.relative(root, full);
  if (within.startsWith("..") || path.isAbsolute(within)) return null;
  if (!kindOf(full) || !fs.existsSync(full)) return null;
  return full;
}

/** 新删除的相簿保存了精确封面；老记录第一次打开时从回收站目录补出来。 */
function trashedAlbumCoverPaths(row) {
  if (row.album_id != null) {
    let files = [];
    if (row.cover_paths) {
      try {
        const saved = JSON.parse(row.cover_paths);
        if (Array.isArray(saved)) {
          files = saved
            .map((file) => path.resolve(String(file)))
            .filter((file) => fs.existsSync(file) && kindOf(file))
            .slice(0, 4);
        }
      } catch {}
    }
    if (!files.length) {
      files = getItems(Number(row.album_id), { limit: 4 })
        .map((item) => item.path)
        .filter((file) => fs.existsSync(file) && kindOf(file))
        .slice(0, 4);
    }
    return files;
  }
  if (row.cover_paths) {
    try {
      const saved = JSON.parse(row.cover_paths);
      if (Array.isArray(saved)) {
        const files = saved
          .map((rel) => resolveTrashedCover(row, rel))
          .filter(Boolean)
          .slice(0, 4);
        if (files.length) return files;
      }
    } catch {}
  }

  const files = trashedAlbumCoverFiles(row.trash_path);
  if (files.length) {
    const relative = files.map((file) => path.relative(row.trash_path, file));
    openDb()
      .prepare("UPDATE trashed_albums SET cover_paths = ? WHERE id = ?")
      .run(JSON.stringify(relative), row.id);
    row.cover_paths = JSON.stringify(relative);
  }
  return files;
}

function listTrashedAlbums(rootId = null) {
  const id = rootId == null ? null : Number(rootId);
  const byRoot = Number.isInteger(id);
  return openDb()
    .prepare(
      `
    SELECT id, root_id AS rootId, name, kind, item_count AS itemCount,
           trash_path, cover_paths, album_id AS albumId, deleted_at AS deletedAt
    FROM trashed_albums
    ${byRoot ? "WHERE root_id = ?" : ""}
    ORDER BY deleted_at DESC, id DESC
  `,
    )
    .all(...(byRoot ? [id] : []))
    .map(({ trash_path, cover_paths, album_id, ...row }) => ({
      id: Number(row.id),
      rootId: Number(row.rootId),
      name: row.name,
      kind: row.kind,
      albumId: album_id == null ? null : Number(album_id),
      itemCount:
        album_id == null ? Number(row.itemCount) : countItems(Number(album_id)),
      deletedAt: Number(row.deletedAt),
      coverCount: trashedAlbumCoverPaths({
        ...row,
        album_id,
        trash_path,
        cover_paths,
      }).length,
    }));
}

function getTrashedAlbumCover(albumId, index) {
  const row = openDb()
    .prepare("SELECT * FROM trashed_albums WHERE id = ?")
    .get(Number(albumId));
  if (!row) return null;
  const file = trashedAlbumCoverPaths(row)[Number(index)];
  if (!file) return null;
  return { path: file, kind: kindOf(file), deletedAt: Number(row.deleted_at) };
}

function countTrash(rootId = null) {
  const database = openDb();
  const id = rootId == null ? null : Number(rootId);
  const byRoot = Number.isInteger(id);
  return Number(
    database
      .prepare(
        `SELECT
       (SELECT COUNT(*) FROM items
        WHERE deleted_at IS NOT NULL AND ignored_at = 0
          AND live_photo_id IS NULL
          ${byRoot ? "AND root_id = ?" : ""})
       + (SELECT COUNT(*) FROM trashed_albums
          ${byRoot ? "WHERE root_id = ?" : ""}) AS c`,
      )
      .get(...(byRoot ? [id, id] : [])).c,
  );
}

/** 整个文件夹搬走；跨盘时先完整复制，再把原文件夹收掉。 */
async function moveDirectory(src, dest) {
  await fsp.mkdir(path.dirname(dest), { recursive: true });
  try {
    await fsp.rename(src, dest);
    return;
  } catch (err) {
    if (err.code !== "EXDEV") throw err;
  }
  await fsp.cp(src, dest, {
    recursive: true,
    errorOnExist: true,
    force: false,
    preserveTimestamps: true,
  });
  try {
    await fsp.rm(src, { recursive: true });
  } catch (err) {
    /* 复制成功了但原目录没清掉，不能留下两份；删掉副本，让原相簿保持原样。 */
    await fsp.rm(dest, { recursive: true, force: true }).catch(() => {});
    throw err;
  }
}

async function moveDirectoryWithRetry(src, dest, tries = 3) {
  let lastError = null;
  for (let i = 0; i < tries; i++) {
    try {
      await moveDirectory(src, dest);
      return;
    } catch (err) {
      lastError = err;
      if (i < tries - 1) {
        /* 缩略图和视频播放器有时会短暂握着文件句柄；给系统一点时间释放，
           不要刚试三次、半秒不到就判定永久失败。 */
        await new Promise((r) => setTimeout(r, 180 * (i + 1)));
      }
    }
  }
  throw lastError;
}

/** 隐藏整棵相簿集合。permanent 时把这个集合的虚拟关联也清掉。 */
function hideAlbumCollection(
  albumId,
  { permanent = false, trashRecordId = null } = {},
) {
  const database = openDb();
  const ids = database
    .prepare(
      `
    WITH RECURSIVE subtree(id) AS (
      SELECT id FROM albums WHERE id = ?
      UNION ALL
      SELECT a.id FROM albums a JOIN subtree s ON a.parent_id = s.id
    )
    SELECT id FROM subtree
  `,
    )
    .all(Number(albumId))
    .map((row) => row.id);
  if (!ids.length) return null;
  const hiddenAt = Date.now();
  database.exec("BEGIN IMMEDIATE");
  try {
    database
      .prepare("UPDATE albums SET hidden_at = ? WHERE id = ?")
      .run(hiddenAt, Number(albumId));
    const forget = database.prepare(
      "DELETE FROM item_albums WHERE album_id = ?",
    );
    if (permanent) for (const id of ids) forget.run(id);
    /* 永久删除相簿时，集合隐藏和回收站记录消失必须在同一个事务里。
       后续任何失败都不能提前把条目从「最近删除」抹掉。 */
    if (trashRecordId != null) {
      database
        .prepare("DELETE FROM trashed_albums WHERE id = ?")
        .run(Number(trashRecordId));
    }
    database.exec("COMMIT");
  } catch (err) {
    try {
      database.exec("ROLLBACK");
    } catch {}
    throw err;
  }
  return ids;
}

/** 兼容旧调用名：相簿不再进入最近删除，删除就是原地解散。 */
async function trashAlbum(albumId) {
  return dissolveAlbum(albumId);
}

/**
 * 从「最近删除」恢复整个相簿。
 * 新记录只取消隐藏，文件夹和项目一直在原处；
 * 老记录仍按以前的方式，从 data/trash/albums 搬回原位置。
 */
async function restoreTrashAlbums(ids) {
  const database = openDb();
  const restored = [];
  const failed = [];
  const roots = new Set();
  const usedByDir = new Map();

  for (const rawId of ids) {
    const row = database
      .prepare("SELECT * FROM trashed_albums WHERE id = ?")
      .get(Number(rawId));
    if (!row) {
      failed.push({ id: Number(rawId), reason: "不在最近删除里" });
      continue;
    }
    const root = database
      .prepare("SELECT * FROM roots WHERE id = ?")
      .get(row.root_id);
    if (!root || !fs.existsSync(root.path)) {
      failed.push({
        id: row.id,
        name: row.name,
        reason: "原来的根文件夹已不存在",
      });
      continue;
    }

    if (row.album_id != null) {
      const album = getAlbum(row.album_id);
      if (!album) {
        failed.push({
          id: row.id,
          name: row.name,
          reason: "相簿集合已经不存在",
        });
        continue;
      }
      if (!fs.existsSync(album.path)) {
        failed.push({
          id: row.id,
          name: row.name,
          reason: "相簿原文件夹已经不在磁盘上",
        });
        continue;
      }
      try {
        database.exec("BEGIN IMMEDIATE");
        database
          .prepare("UPDATE albums SET hidden_at = NULL WHERE id = ?")
          .run(album.id);
        database.prepare("DELETE FROM trashed_albums WHERE id = ?").run(row.id);
        database.exec("COMMIT");
        roots.add(row.root_id);
        restored.push({
          id: row.id,
          albumId: album.id,
          rootId: row.root_id,
          path: album.path,
          name: album.name,
          sortOrder: row.sort_order == null ? null : Number(row.sort_order),
        });
      } catch (err) {
        try {
          database.exec("ROLLBACK");
        } catch {}
        failed.push({
          id: row.id,
          name: row.name,
          reason: String(err.message || err),
        });
      }
      continue;
    }

    if (!fs.existsSync(row.trash_path)) {
      /* 上一次永久删除可能已经把老版文件夹搬回原位置，但还没走到删除记录。
         这种“已经恢复”的记录仍可直接完成恢复，不能反过来说它凭空消失了。 */
      if (fs.existsSync(row.original_path)) {
        try {
          const album = database
            .prepare("SELECT id, path FROM albums WHERE path = ?")
            .get(row.original_path);
          if (album) {
            database
              .prepare("UPDATE albums SET hidden_at = NULL WHERE id = ?")
              .run(album.id);
          }
          database
            .prepare("DELETE FROM trashed_albums WHERE id = ?")
            .run(row.id);
          roots.add(row.root_id);
          restored.push({
            id: row.id,
            albumId: album?.id ?? null,
            rootId: row.root_id,
            path: row.original_path,
            name: row.name,
            sortOrder: row.sort_order == null ? null : Number(row.sort_order),
          });
        } catch (err) {
          failed.push({
            id: row.id,
            name: row.name,
            reason: String(err.message || err),
          });
        }
        continue;
      }
      failed.push({
        id: row.id,
        name: row.name,
        reason: "相簿文件夹已不在最近删除里",
      });
      continue;
    }

    const dir = path.dirname(row.original_path);
    const relative = path.relative(root.path, dir);
    if (relative.startsWith("..") || path.isAbsolute(relative)) {
      failed.push({
        id: row.id,
        name: row.name,
        reason: "原位置不在当前相簿库里",
      });
      continue;
    }

    try {
      await fsp.mkdir(dir, { recursive: true });
      const key = dir.toLowerCase();
      if (!usedByDir.has(key)) usedByDir.set(key, new Set());
      const name = freeName(
        dir,
        path.basename(row.original_path),
        usedByDir.get(key),
      );
      const dest = path.join(dir, name);
      await moveDirectoryWithRetry(row.trash_path, dest);
      database.prepare("DELETE FROM trashed_albums WHERE id = ?").run(row.id);
      roots.add(row.root_id);
      restored.push({ id: row.id, rootId: row.root_id, path: dest, name });
      if (row.sort_order != null)
        restored[restored.length - 1].sortOrder = Number(row.sort_order);
    } catch (err) {
      failed.push({
        id: row.id,
        name: row.name,
        reason: String(err.message || err),
      });
    }
  }
  return { ok: restored.length, items: restored, roots: [...roots], failed };
}

/**
 * 从「最近删除」彻底删掉相簿集合。
 * 新记录只永久隐藏集合，照片和原文件夹继续留在图库；
 * 老记录先安全搬回原位并重建索引，成功后才清掉回收站记录。
 */
async function deleteTrashAlbums(ids, { detached = false } = {}) {
  const database = openDb();
  const removed = [];
  const failed = [];
  const roots = new Set();
  for (const rawId of ids) {
    const row = database
      .prepare("SELECT * FROM trashed_albums WHERE id = ?")
      .get(Number(rawId));
    if (!row) {
      failed.push({ id: Number(rawId), reason: "不在最近删除里" });
      continue;
    }
    try {
      /* 换根文件夹时旧根已经从索引移除，回收记录此时不再需要恢复/隐藏。
         新版相簿只清记录、保留原文件夹；旧版回收目录里的副本按原行为清掉。 */
      if (detached) {
        const trashRoot = path.resolve(TRASH_ALBUM_DIR) + path.sep;
        const oldTrashPath = path.resolve(row.trash_path);
        if (
          row.album_id == null &&
          oldTrashPath.startsWith(trashRoot) &&
          fs.existsSync(oldTrashPath)
        ) {
          await fsp.rm(oldTrashPath, { recursive: true, force: true });
        }
        database.prepare("DELETE FROM trashed_albums WHERE id = ?").run(row.id);
        removed.push(row.id);
        continue;
      }

      /* 新式相簿一直在原文件夹里，只隐藏集合，绝不为了“删除”先把它恢复、
         搬一次文件夹。这样既符合“照片继续留在图库”，也不会被缩略图
         或播放器短暂占用的文件句柄误伤。 */
      let album =
        row.album_id == null
          ? null
          : database
              .prepare("SELECT * FROM albums WHERE id = ?")
              .get(row.album_id);
      if (!album) {
        album = database
          .prepare("SELECT * FROM albums WHERE path = ?")
          .get(row.original_path);
      }
      if (album && fs.existsSync(album.path)) {
        if (
          !hideAlbumCollection(album.id, {
            permanent: true,
            trashRecordId: row.id,
          })
        ) {
          throw new Error("相簿集合已经不存在");
        }
        roots.add(row.root_id);
        removed.push(row.id);
        continue;
      }

      /* 老版记录把整个文件夹放在了 data/trash/albums。先搬回原位并重建索引，
         成功隐藏后才删除回收站记录；中途失败就搬回回收目录，确保条目仍在
         「最近删除」里，可以再次恢复或重试删除。 */
      const folderAlreadyRestored =
        !fs.existsSync(row.trash_path) && fs.existsSync(row.original_path);
      if (!fs.existsSync(row.trash_path) && !folderAlreadyRestored) {
        throw new Error("相簿文件夹已不在最近删除里");
      }

      const root = database
        .prepare("SELECT * FROM roots WHERE id = ?")
        .get(row.root_id);
      if (!root || !fs.existsSync(root.path)) {
        throw new Error("原来的根文件夹已不存在");
      }

      let dest = row.original_path;
      let moved = false;
      if (!folderAlreadyRestored) {
        const dir = path.dirname(row.original_path);
        const relative = path.relative(root.path, dir);
        if (relative.startsWith("..") || path.isAbsolute(relative)) {
          throw new Error("原位置不在当前相簿库里");
        }
        await fsp.mkdir(dir, { recursive: true });
        const name = freeName(dir, path.basename(row.original_path), new Set());
        dest = path.join(dir, name);
        await moveDirectoryWithRetry(row.trash_path, dest, 6);
        moved = true;
      }

      try {
        await scanRoot(row.root_id);
        const restoredAlbum = database
          .prepare("SELECT id, path FROM albums WHERE path = ?")
          .get(dest);
        if (!restoredAlbum) throw new Error("相簿集合恢复后没有找到");
        if (
          !hideAlbumCollection(restoredAlbum.id, {
            permanent: true,
            trashRecordId: row.id,
          })
        ) {
          throw new Error("相簿集合恢复后没有找到");
        }
      } catch (err) {
        if (moved) {
          try {
            await fsp.mkdir(path.dirname(row.trash_path), { recursive: true });
            await moveDirectoryWithRetry(dest, row.trash_path, 6);
          } catch (rollbackErr) {
            throw new Error(
              `${err.message || err}；文件夹已留在原位置，但没能放回最近删除：` +
                String(rollbackErr.message || rollbackErr),
            );
          }
        }
        throw err;
      }
      roots.add(row.root_id);
      removed.push(row.id);
    } catch (err) {
      failed.push({
        id: row.id,
        name: row.name,
        reason: String(err.message || err),
      });
    }
  }
  return { ok: removed.length, ids: removed, failed, roots: [...roots] };
}

/** 只把项目标成最近删除；磁盘文件与相簿关联都保留。 */
async function trashItems(ids) {
  const database = openDb();
  const changed = [];
  const failed = [];
  for (const id of ids) {
    const item = database.prepare("SELECT * FROM items WHERE id = ?").get(id);
    if (!item || item.deleted_at || item.ignored_at) continue;
    if (!fs.existsSync(item.path)) {
      failed.push(item.path);
      continue;
    }
    database
      .prepare(
        "UPDATE items SET deleted_at = ?, deleted_from = NULL WHERE id = ?",
      )
      .run(Date.now(), item.id);
    changed.push(item.id);
  }
  return { ok: changed.length, failed, ids: changed };
}

/** 恢复项目本身，以及仍在当前导入中存在的原相簿关联。 */
async function restoreItems(ids) {
  const database = openDb();
  const restored = [];
  const failed = [];

  for (const rawId of ids) {
    const item = database
      .prepare("SELECT * FROM items WHERE id = ?")
      .get(Number(rawId));
    if (!item || !item.deleted_at || item.ignored_at) {
      failed.push({ id: Number(rawId), reason: "不在最近删除里" });
      continue;
    }
    if (!fs.existsSync(item.path)) {
      failed.push({
        id: item.id,
        name: item.name,
        reason: "磁盘上的文件已经不存在",
      });
      continue;
    }

    database
      .prepare(
        `UPDATE items
       SET deleted_at = NULL, deleted_from = NULL, ignored_at = 0,
           restore_library_only = 0
       WHERE id = ?`,
      )
      .run(item.id);
    database
      .prepare(
        `
      DELETE FROM item_albums
      WHERE item_id = ?
        AND album_id NOT IN (SELECT id FROM albums)
    `,
      )
      .run(item.id);
    restored.push(item.id);
  }
  return { ok: restored.length, ids: restored, failed };
}

/** 软件内永久删除：保留磁盘文件，只记录本次导入内的忽略状态。 */
async function deleteTrashItems(ids) {
  const database = openDb();
  const removed = [];
  const failed = [];
  for (const rawId of ids) {
    const item = database
      .prepare("SELECT * FROM items WHERE id = ?")
      .get(Number(rawId));
    if (!item || !item.deleted_at || item.ignored_at) {
      failed.push({ id: Number(rawId), reason: "不在最近删除里" });
      continue;
    }
    if (!fs.existsSync(item.path)) {
      failed.push({
        id: item.id,
        name: item.name,
        reason: "磁盘上的文件已经不存在",
      });
      continue;
    }
    database
      .prepare("UPDATE items SET ignored_at = ? WHERE id = ?")
      .run(Date.now(), item.id);
    removed.push(item.id);
  }
  return { ok: removed.length, ids: removed, failed };
}

function countItems(albumId) {
  const database = openDb();
  const album = database
    .prepare("SELECT kind, root_id FROM albums WHERE id = ?")
    .get(Number(albumId));
  if (!album) return 0;
  if (album.kind === "unfiled") {
    return Number(
      database
        .prepare(
          `
      SELECT COUNT(*) AS c FROM items i
      WHERE i.root_id = ? AND i.album_id = ?
        AND i.deleted_at IS NULL AND i.ignored_at = 0
        AND i.live_photo_id IS NULL AND i.hidden_at IS NULL
        AND NOT EXISTS (SELECT 1 FROM item_albums m WHERE m.item_id = i.id)
    `,
        )
        .get(album.root_id, album.id).c,
    );
  }
  return Number(
    database
      .prepare(
        `
    SELECT COUNT(*) AS c FROM item_albums m
    JOIN items i ON i.id = m.item_id
    WHERE m.album_id = ? AND i.deleted_at IS NULL AND i.ignored_at = 0
      AND i.live_photo_id IS NULL AND i.hidden_at IS NULL
  `,
      )
      .get(album.id).c,
  );
}

/* ------------------------- 新建 / 删除相簿（文件夹） ------------------------- */

function safeChildName(name) {
  const n = String(name || "").trim();
  if (!n) throw new Error("名字不能为空");
  if (/[\\/:*?"<>|]/.test(n))
    throw new Error('名字里不能有 \\ / : * ? " < > | 这些字符');
  if (n === "." || n === "..") throw new Error("这个名字不能用");
  if (n.length > 100) throw new Error("名字太长了");
  return n;
}

/** 在软件里新建一个子相簿；不会在磁盘上创建任何文件夹。 */
function createAlbum(parentId, name) {
  const parent = getAlbum(parentId);
  if (!parent) throw new Error("相簿不存在");
  if (parent.kind === "unfiled") throw new Error("未归档不能包含子相簿");
  const clean = safeChildName(name);
  const id = appendAlbumRow(
    openDb(),
    parent.root_id,
    parent.id,
    clean,
    Number(parent.depth || 0) + 1,
  );
  return getAlbum(id);
}

/** 在软件里新建一个一级相簿；磁盘上的根文件夹不变。 */
function createRootAlbum(rootId, name) {
  const database = openDb();
  const root = database
    .prepare("SELECT * FROM roots WHERE id = ?")
    .get(Number(rootId));
  if (!root) throw new Error("相簿库不存在");
  const clean = safeChildName(name);
  const id = appendAlbumRow(database, root.id, null, clean, 1);
  return getAlbum(id);
}

/** 判断这个相簿是不是根文件夹本身（根文件夹不允许删） */
function isRootAlbum(albumId) {
  const album = getAlbum(albumId);
  if (!album) return false;
  return album.kind === "unfiled";
}

/** 只改软件标题，绝不改磁盘文件夹或项目路径。 */
function renameAlbum(albumId, name) {
  const album = getAlbum(albumId);
  if (!album) throw new Error("相簿不存在");
  if (isRootAlbum(albumId)) throw new Error("未归档不能重命名");
  const clean = safeChildName(name);
  openDb()
    .prepare("UPDATE albums SET name = ?, sort_key = ? WHERE id = ?")
    .run(clean, sortKey(clean), album.id);
  return { oldPath: album.path, newPath: album.path, name: clean };
}

function orderedAlbumRows(database, rootId, parentId) {
  return database
    .prepare(
      `
    SELECT id, name, sort_order AS sortOrder
    FROM albums WHERE root_id = ? AND parent_id IS ?
  `,
    )
    .all(rootId, parentId)
    .sort(compareAlbumNodes);
}

/**
 * 解散相簿：删除集合本身和它在这一层的项目关联，子相簿原样提升到
 * A 的父层并追加到末尾。项目、其他相簿关联和磁盘都不动。
 */
function dissolveAlbum(albumId) {
  const database = openDb();
  const album = getAlbum(Number(albumId));
  if (!album) throw new Error("相簿不存在");
  if (isRootAlbum(album.id)) throw new Error("未归档不能解散");

  const parentId = album.parent_id == null ? null : Number(album.parent_id);
  const siblings = orderedAlbumRows(database, album.root_id, parentId);
  const children = orderedAlbumRows(database, album.root_id, album.id);
  const memberships = database
    .prepare(
      `
    SELECT item_id AS itemId, added_seq AS addedSeq, added_at AS addedAt
    FROM item_albums WHERE album_id = ? ORDER BY item_id
  `,
    )
    .all(album.id);
  const childOrders = new Map();
  for (const child of children) {
    childOrders.set(
      child.id,
      orderedAlbumRows(database, album.root_id, child.id).map((row) => ({
        id: row.id,
        sortOrder: row.sortOrder ?? null,
      })),
    );
  }
  const snapshot = {
    album: { ...album },
    parentSiblingIds: siblings.map((row) => row.id),
    children: children.map((row) => ({
      id: row.id,
      parentId: album.id,
      sortOrder: row.sortOrder == null ? null : Number(row.sortOrder),
    })),
    memberships,
    childOrders: Object.fromEntries(childOrders),
  };

  database.exec("BEGIN IMMEDIATE");
  try {
    database
      .prepare("DELETE FROM item_albums WHERE album_id = ?")
      .run(album.id);
    const removeDirect = database.prepare(
      "DELETE FROM item_albums WHERE item_id = ? AND album_id = ?",
    );
    for (const membership of memberships) {
      removeDirect.run(membership.itemId, album.id);
    }

    const moveChild = database.prepare(
      "UPDATE albums SET parent_id = ?, depth = ?, sort_key = ? WHERE id = ?",
    );
    const rebase = (parent, childId, depth) => {
      moveChild.run(
        parent,
        depth,
        sortKey(
          database.prepare("SELECT name FROM albums WHERE id = ?").get(childId)
            .name,
        ),
        childId,
      );
      const grandchildren = database
        .prepare(
          "SELECT id FROM albums WHERE parent_id = ? ORDER BY sort_order, id",
        )
        .all(childId);
      for (const grandchild of grandchildren) {
        rebase(childId, grandchild.id, depth + 1);
      }
    };
    const baseDepth = parentId == null ? 0 : Number(album.depth) - 1;
    for (const child of children) rebase(parentId, child.id, baseDepth + 1);

    const childIds = new Set(children.map((row) => Number(row.id)));
    const remaining = orderedAlbumRows(
      database,
      album.root_id,
      parentId,
    ).filter(
      (row) =>
        Number(row.id) !== Number(album.id) && !childIds.has(Number(row.id)),
    );
    const finalOrder = [...remaining, ...children];
    const setOrder = database.prepare(
      "UPDATE albums SET sort_order = ? WHERE id = ?",
    );
    finalOrder.forEach((row, index) => setOrder.run(index, row.id));
    database.prepare("DELETE FROM albums WHERE id = ?").run(album.id);
    database.exec("COMMIT");
  } catch (err) {
    database.exec("ROLLBACK");
    throw err;
  }

  return {
    ...snapshot,
    albumId: album.id,
    rootId: album.root_id,
    name: album.name,
    promoted: children.map((row) => Number(row.id)),
  };
}

function restoreDissolvedAlbum(snapshot) {
  if (!snapshot?.album) throw new Error("撤销记录不完整");
  const source = snapshot.album;
  const database = openDb();
  if (
    database
      .prepare("SELECT id FROM albums WHERE id = ?")
      .get(Number(source.id))
  ) {
    throw new Error("相簿已经存在");
  }
  database.exec("BEGIN IMMEDIATE");
  try {
    database
      .prepare(
        `
      INSERT INTO albums
        (id, root_id, parent_id, path, name, depth, sort_key, sort_order,
         hidden_at, cover_item_id, kind, source_path)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, NULL, ?, ?, ?)
    `,
      )
      .run(
        Number(source.id),
        Number(source.root_id),
        source.parent_id == null ? null : Number(source.parent_id),
        source.path,
        source.name,
        Number(source.depth),
        source.sort_key,
        source.sort_order == null ? null : Number(source.sort_order),
        source.cover_item_id == null ? null : Number(source.cover_item_id),
        source.kind,
        source.source_path || null,
      );
    for (const child of snapshot.children || []) {
      database
        .prepare("UPDATE albums SET parent_id = ?, depth = ? WHERE id = ?")
        .run(Number(source.id), Number(source.depth) + 1, Number(child.id));
      const rebaseDescendants = (parentId, parentDepth) => {
        const rows = database
          .prepare("SELECT id FROM albums WHERE parent_id = ?")
          .all(Number(parentId));
        for (const row of rows) {
          database
            .prepare("UPDATE albums SET depth = ? WHERE id = ?")
            .run(parentDepth + 1, Number(row.id));
          rebaseDescendants(row.id, parentDepth + 1);
        }
      };
      rebaseDescendants(child.id, Number(source.depth) + 1);
    }
    const insertMembership = database.prepare(`
      INSERT OR IGNORE INTO item_albums
        (item_id, album_id, added_seq, added_at) VALUES (?, ?, ?, ?)
    `);
    for (const membership of snapshot.memberships || []) {
      if (
        !database
          .prepare("SELECT id FROM items WHERE id = ?")
          .get(Number(membership.itemId))
      )
        continue;
      insertMembership.run(
        Number(membership.itemId),
        Number(source.id),
        Number(membership.addedSeq),
        Number(membership.addedAt),
      );
    }
    const setOrder = database.prepare(
      "UPDATE albums SET sort_order = ? WHERE id = ?",
    );
    for (const id of snapshot.parentSiblingIds || []) {
      if (
        database.prepare("SELECT id FROM albums WHERE id = ?").get(Number(id))
      ) {
        setOrder.run((snapshot.parentSiblingIds || []).indexOf(id), Number(id));
      }
    }
    for (const child of snapshot.children || []) {
      const rows = snapshot.childOrders?.[child.id] || [];
      rows.forEach((row, index) => setOrder.run(index, Number(row.id)));
    }
    database.exec("COMMIT");
  } catch (err) {
    database.exec("ROLLBACK");
    throw err;
  }
  return {
    ok: true,
    albumId: Number(source.id),
    rootId: Number(source.root_id),
  };
}

/**
 * 目标文件夹里已经有同名的了，就给搬过去的这个换个名字（「名字 (2).jpg」，
 * 跟资源管理器里「复制一份」的叫法一致），绝不覆盖 —— 那边那张是人家相簿里的照片，
 * 覆盖掉就找不回来了。used 是这一批里已经占下的名字，免得一批之中自己跟自己撞。
 */
function freeName(dir, name, used) {
  const ext = path.extname(name);
  const base = name.slice(0, name.length - ext.length);
  const taken = (p) => fs.existsSync(p) || used.has(p.toLowerCase());
  let candidate = name;
  let n = 1;
  while (taken(path.join(dir, candidate))) {
    n += 1;
    if (n > 999) throw new Error("重名太多，换不过来了");
    candidate = `${base} (${n})${ext}`;
  }
  used.add(path.join(dir, candidate).toLowerCase());
  return candidate;
}

function safeRenameBase(value) {
  const raw = String(value ?? "").trim();
  if (!raw) throw new Error("文件名不能为空");
  if (/[<>:"/\\|?*\u0000-\u001f]/.test(raw)) {
    throw new Error("文件名含有 Windows 不允许的字符");
  }
  if (/[. ]$/.test(raw) || raw === "." || raw === "..") {
    throw new Error("文件名不能以空格或句点结尾");
  }
  if (raw.length > 180) throw new Error("文件名太长");
  return raw;
}

/**
 * 按名称编号只改文件在各自相簿目录里的名字，不移动目录。
 * 照片和视频都可编号；照片带实况视频时，两者的主文件名一起改。
 * 全过程先改成临时名再落到目标名，因此交换名字和互相占名都不会覆盖文件。
 */
async function renameItemsToBaseNames(entries) {
  const requested = [];
  const seenIds = new Set();
  for (const entry of Array.isArray(entries) ? entries : []) {
    const id = Number(entry?.id);
    if (!Number.isInteger(id) || id <= 0 || seenIds.has(id)) continue;
    seenIds.add(id);
    requested.push({ id, baseName: safeRenameBase(entry?.baseName) });
  }
  if (!requested.length) throw new Error("没有可改名的照片");

  const database = openDb();
  const mediaRows = new Map();
  for (const request of requested) {
    const item = getItem(request.id);
    if (!item || item.deleted_at) {
      throw new Error(
        item ? `${item.name} 已在最近删除里` : "照片已经不在图库里",
      );
    }
    if (item.kind !== "photo" && item.kind !== "video") {
      throw new Error(`${item.name} 不是可编号的照片或视频`);
    }
    mediaRows.set(item.id, item);
    if (item.live_video_id) {
      const liveVideo = getItem(item.live_video_id);
      if (liveVideo && !liveVideo.deleted_at)
        mediaRows.set(liveVideo.id, liveVideo);
    }
  }

  const sourceSet = new Set(
    [...mediaRows.values()].map((item) =>
      path.resolve(item.path).toLowerCase(),
    ),
  );
  const findItemByPath = database.prepare(
    "SELECT * FROM items WHERE path = ? COLLATE NOCASE",
  );
  const targetOwners = new Map();
  const replacedTargets = new Map();
  const operations = [];
  for (const request of requested) {
    const main = mediaRows.get(request.id);
    const family = [main];
    if (main.live_video_id && mediaRows.has(main.live_video_id)) {
      family.push(mediaRows.get(main.live_video_id));
    }
    for (const item of family) {
      const dir = path.dirname(item.path);
      const target = path.resolve(
        path.join(dir, `${request.baseName}${path.extname(item.path)}`),
      );
      const key = target.toLowerCase();
      if (targetOwners.has(key)) {
        throw new Error(`编号后有两个文件同名：${path.basename(target)}`);
      }
      targetOwners.set(key, item.id);
      if (fs.existsSync(target) && !sourceSet.has(key)) {
        replacedTargets.set(key, {
          path: target,
          item: findItemByPath.get(target) || null,
        });
      }
      operations.push({ item, source: path.resolve(item.path), target });
    }
  }

  const staged = [];
  const completed = [];
  const backups = [];
  try {
    for (const operation of operations) {
      if (!fs.existsSync(operation.source)) {
        throw new Error(`磁盘上已经找不到：${operation.item.name}`);
      }
      const temp = path.join(
        path.dirname(operation.source),
        `.照片编号-${crypto.randomUUID()}${path.extname(operation.source)}`,
      );
      await fsp.rename(operation.source, temp);
      staged.push({ ...operation, temp });
    }
    /* 新名称优先：先备份被覆盖的旧文件，整批改名失败时仍可完整恢复。 */
    for (const replacement of replacedTargets.values()) {
      if (!fs.existsSync(replacement.path)) continue;
      const backup = path.join(
        path.dirname(replacement.path),
        `.照片编号覆盖-${crypto.randomUUID()}${path.extname(replacement.path)}`,
      );
      await fsp.rename(replacement.path, backup);
      backups.push({ ...replacement, backup });
    }
    for (const operation of staged) {
      await fsp.rename(operation.temp, operation.target);
      completed.push(operation);
    }
  } catch (error) {
    const recovery = [];
    for (const operation of completed.reverse()) {
      try {
        await fsp.rename(operation.target, operation.temp);
      } catch {
        recovery.push(path.basename(operation.target));
      }
    }
    for (const operation of staged.reverse()) {
      try {
        if (fs.existsSync(operation.temp)) {
          await fsp.rename(operation.temp, operation.source);
        }
      } catch {
        recovery.push(path.basename(operation.temp));
      }
    }
    for (const replacement of backups.reverse()) {
      try {
        if (fs.existsSync(replacement.backup)) {
          await fsp.rename(replacement.backup, replacement.path);
        }
      } catch {
        recovery.push(path.basename(replacement.backup));
      }
    }
    const suffix = recovery.length
      ? `；这些临时文件需要手动恢复：${recovery.join("、")}`
      : "";
    throw new Error(
      `批量改名没有完成，已尽量恢复原文件名${suffix}。${error.message || error}`,
    );
  }

  const update = database.prepare(
    "UPDATE items SET path = ?, name = ? WHERE id = ?",
  );
  const stageIndexPath = database.prepare(
    "UPDATE items SET path = ? WHERE id = ?",
  );
  const clearNameOverride = database.prepare(
    "UPDATE item_metadata_overrides SET name_override = NULL WHERE item_id = ?",
  );
  const replacedItemIds = [
    ...new Set(
      [...replacedTargets.values()]
        .map((replacement) => Number(replacement.item?.id))
        .filter((id) => Number.isInteger(id) && id > 0),
    ),
  ];
  const clearLiveVideoRef = database.prepare(
    "UPDATE items SET live_video_id = NULL WHERE live_video_id = ?",
  );
  const clearLivePhotoRef = database.prepare(
    "UPDATE items SET live_photo_id = NULL WHERE live_photo_id = ?",
  );
  const clearAlbumCover = database.prepare(
    "UPDATE albums SET cover_item_id = NULL WHERE cover_item_id = ?",
  );
  const removeMembership = database.prepare(
    "DELETE FROM item_albums WHERE item_id = ?",
  );
  const removeMetadata = database.prepare(
    "DELETE FROM item_metadata_overrides WHERE item_id = ?",
  );
  const removeEdit = database.prepare(
    "DELETE FROM item_edits WHERE item_id = ?",
  );
  const removeVideoPoster = database.prepare(
    "DELETE FROM video_posters WHERE item_id = ?",
  );
  const removePhotoWallCrop = database.prepare(
    "DELETE FROM photo_wall_crops WHERE item_id = ?",
  );
  const removeMasonryWallCrop = database.prepare(
    "DELETE FROM masonry_wall_crops WHERE item_id = ?",
  );
  const removeFilmrollWallCrop = database.prepare(
    "DELETE FROM filmroll_wall_crops WHERE item_id = ?",
  );
  const removeMosaicWallCrop = database.prepare(
    "DELETE FROM mosaic_wall_crops WHERE item_id = ?",
  );
  const deleteReplacedItem = database.prepare("DELETE FROM items WHERE id = ?");
  database.exec("BEGIN IMMEDIATE");
  try {
    /* 同名旧项目已经被磁盘上的新文件替换，先移除它失效的索引与引用。 */
    for (const itemId of replacedItemIds) {
      clearLiveVideoRef.run(itemId);
      clearLivePhotoRef.run(itemId);
      clearAlbumCover.run(itemId);
      removeMembership.run(itemId);
      removeMetadata.run(itemId);
      removeEdit.run(itemId);
      removeVideoPoster.run(itemId);
      removePhotoWallCrop.run(itemId);
      removeMasonryWallCrop.run(itemId);
      removeFilmrollWallCrop.run(itemId);
      removeMosaicWallCrop.run(itemId);
      deleteReplacedItem.run(itemId);
    }
    /* 先把本批项目改成数据库内唯一的临时路径，支持 A→B、B→A 这类交换。 */
    for (const operation of completed) {
      const temporaryPath = path.join(
        path.dirname(operation.target),
        `.fotora-index-${operation.item.id}-${crypto.randomUUID()}`,
      );
      stageIndexPath.run(temporaryPath, operation.item.id);
    }
    for (const operation of completed) {
      update.run(
        operation.target,
        path.basename(operation.target),
        operation.item.id,
      );
      clearNameOverride.run(operation.item.id);
    }
    database.exec("COMMIT");
  } catch (error) {
    database.exec("ROLLBACK");
    throw new Error(
      `文件已改名，但图库索引没有更新：${error.message || error}`,
    );
  }
  for (const replacement of backups) {
    try {
      await fsp.rm(replacement.backup, { force: true });
    } catch {}
  }
  dropItemCaches(replacedItemIds);

  return {
    renamed: completed.length,
    replaced: backups.length,
    items: completed.map((operation) => ({
      id: operation.item.id,
      from: operation.source,
      to: operation.target,
    })),
  };
}

/** 仅供自动化测试在关闭服务后释放 Windows 上的 SQLite 文件句柄。 */
function closeDatabase() {
  if (!db) return;
  db.close();
  db = null;
}

module.exports = {
  openDb,
  scanRoot,
  getScanState,
  listRoots,
  addRoot,
  removeRoot,
  getTree,
  getLibrarySignature,
  getMeta,
  setMeta,
  dropItemCaches,
  clearMediaCaches,
  getAlbum,
  setAlbumKind,
  setAlbumOrder,
  appendAlbumToEnd,
  restoreAlbumSortOrder,
  setAlbumCover,
  getItems,
  getLibraryItems,
  getFavoriteItems,
  listWallAlbums,
  listPhotoWallAlbums,
  getPhotoWallPhotos,
  getPhotoWallCrop,
  setPhotoWallCrop,
  listMasonryWallAlbums,
  getMasonryWallPhotos,
  getMasonryWallCrop,
  setMasonryWallCrop,
  listFilmrollWallAlbums,
  getFilmrollWallPhotos,
  getFilmrollWallCrop,
  setFilmrollWallCrop,
  listMosaicWallAlbums,
  getMosaicWallPhotos,
  getMosaicWallCrop,
  setMosaicWallCrop,
  getItemEdit,
  setItemEdit,
  deleteItemEdit,
  getVideoPoster,
  setVideoPoster,
  deleteVideoPoster,
  setItemEditAndVideoPoster,
  setItemsFavorite,
  setItemsRating,
  setItemsTakenAt,
  setItemsTakenTimes,
  restoreItemsTakenAt,
  setItemsCamera,
  setItemsLocation,
  restoreItemsLocationOverrides,
  restoreItemsLocation,
  getItemMetadataOverrides,
  applyMetadataOverridesToFile,
  copyEditedMediaMetadata,
  addItemsToAlbum,
  moveItemsToAlbum,
  restoreLogicalMove,
  removeItemsFromAlbum,
  getItem,
  countItems,
  kindOf,
  isRaw,
  createAlbum,
  createRootAlbum,
  isRootAlbum,
  renameAlbum,
  dissolveAlbum,
  restoreDissolvedAlbum,
  getPendingFolderPrompts,
  importExternalFolder,
  trashAlbum,
  restoreTrashAlbums,
  deleteTrashAlbums,
  listTrashedAlbums,
  getTrashedAlbumCover,
  renameItemsToBaseNames,
  listTrash,
  countTrash,
  trashItems,
  restoreItems,
  deleteTrashItems,
  closeDatabase,
  TRASH_DIR,
  TRASH_ALBUM_DIR,
  runExiftool,
  runExiftoolDetailed,
  writeArgfile,
  DATA_DIR,
  TMP_DIR,
  THUMB_DIR,
  PREVIEW_DIR,
  EDIT_DIR,
  PHOTO_EXT,
  VIDEO_EXT,
  RAW_EXT,
  EXIFTOOL,
  DNGLAB,
  shouldExportRawAsDng,
  convertRawToDng,
};
