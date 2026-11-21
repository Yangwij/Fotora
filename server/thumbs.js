"use strict";
/**
 * 缩略图：用 sharp 生成 webp 缓存到磁盘，第二次访问直接读缓存。
 * RAW（NEF/DNG 等）sharp 读不了，先用 exiftool 把文件里内嵌的 JPEG 预览抠出来再缩放。
 */
const fs = require("node:fs");
const fsp = require("node:fs/promises");
const path = require("node:path");
const sharp = require("sharp");
const lib = require("./library");
const edits = require("./edits");

/* libvips 读完一张原图，会把文件句柄 / 内存映射留着（它默认缓存最近用过的文件）。
   留着的话，系统就不许把这张照片「移动」进回收站 —— 删照片会莫名失败，
   而普通删除（DeleteFile）却能成功，特别难查。
   这边的缩略图本来就落盘缓存了，不需要 libvips 再缓存一份，直接关掉。 */
sharp.cache(false);

const THUMB_DIR = lib.THUMB_DIR;
const PREVIEW_DIR = lib.PREVIEW_DIR;
const EDIT_DIR = lib.EDIT_DIR;
const SIZES = [128, 200, 400, 600, 800, 1600];
const inflight = new Map();
const posterInflight = new Map();

/* ffmpeg 用来给视频抽一张封面；放在项目 vendor 目录里，或者用 FFMPEG_PATH 指定 */
const FFMPEG = [
  process.env.FFMPEG_PATH,
  path.join(__dirname, "..", "vendor", "ffmpeg.exe"),
  path.join(__dirname, "..", "node_modules", "ffmpeg-static", "ffmpeg.exe"),
  "ffmpeg",
]
  .filter(Boolean)
  .find((p) => p === "ffmpeg" || fs.existsSync(p));

function run(cmd, args, opts = {}) {
  return new Promise((resolve) => {
    require("node:child_process").execFile(
      cmd,
      args,
      {
        windowsHide: true,
        maxBuffer: 64 * 1024 * 1024,
        encoding: "buffer",
        ...opts,
      },
      (err, stdout) => resolve(err && !stdout ? null : stdout),
    );
  });
}

const exists = (p) => {
  try {
    return fs.statSync(p).size > 0;
  } catch {
    return false;
  }
};

async function rawPreviewOrientation(item) {
  const direct = Number(item?.orientation);
  if (direct >= 1 && direct <= 8) return direct;
  const itemId = Number(item?.id);
  if (Number.isInteger(itemId)) {
    const stored = Number(lib.getItem(itemId)?.orientation);
    if (stored >= 1 && stored <= 8) return stored;
  }
  if (!item?.path) return 1;
  const argfile = lib.writeArgfile([item.path], `orient${item.id || "raw"}`);
  try {
    const raw = await lib.runExiftool([
      "-j",
      "-n",
      "-Orientation",
      "-@",
      argfile,
    ]);
    const orientation = Number(JSON.parse(raw || "[]")[0]?.Orientation);
    return orientation >= 1 && orientation <= 8 ? orientation : 1;
  } catch {
    return 1;
  } finally {
    try {
      fs.unlinkSync(argfile);
    } catch {}
  }
}

async function applyPreviewOrientation(file, orientation) {
  if (orientation < 2 || orientation > 8) return;
  const argfile = lib.writeArgfile(
    [
      "-overwrite_original",
      "-m",
      `-EXIF:Orientation#=${orientation}`,
      path.resolve(file),
    ],
    `orient-write-${Date.now()}`,
  );
  let result;
  try {
    result = await lib.runExiftoolDetailed(["-@", argfile]);
  } finally {
    try {
      fs.unlinkSync(argfile);
    } catch {}
  }
  if (!result.ok) throw new Error("无法写入 RAW 预览方向");
}

/** 从 RAW / HEIC 里抠出分辨率最高的内嵌预览图，结果缓存到磁盘 */
async function extractEmbeddedPreview(item) {
  const orientation = await rawPreviewOrientation(item);
  const out = path.join(PREVIEW_DIR, `${item.id}-raw-v3-${orientation}.jpg`);
  try {
    await fsp.access(out);
    return out;
  } catch {
    /* 还没抽过，往下走 */
  }
  await fsp.mkdir(PREVIEW_DIR, { recursive: true });
  const argfile = lib.writeArgfile([item.path], `prev${item.id}`);
  let tmp = "";
  try {
    const candidates = [];
    for (const tag of [
      "-JpgFromRaw",
      "-OtherImage",
      "-PreviewImage",
      "-ThumbnailImage",
    ]) {
      const buf = await lib.runExiftool(["-b", tag, "-@", argfile], {
        encoding: "buffer",
      });
      if (!Buffer.isBuffer(buf) || buf.length < 1024) continue;
      /* exiftool 偶尔会在二进制前面带上别的字节，从 JPEG 文件头开始截 */
      const soi = buf.indexOf(Buffer.from([0xff, 0xd8, 0xff]));
      const data = soi > 0 ? buf.subarray(soi) : buf;
      if (data.length < 1024) continue;
      try {
        const metadata = await sharp(data, { failOn: "none" }).metadata();
        const width = Number(metadata.width) || 0;
        const height = Number(metadata.height) || 0;
        candidates.push({
          data,
          score: width * height,
          bytes: data.length,
        });
      } catch {}
    }
    const best = candidates.sort(
      (a, b) => b.score - a.score || b.bytes - a.bytes,
    )[0];
    if (!best) return null;
    tmp = out + ".part.jpg";
    await fsp.writeFile(tmp, best.data);
    await applyPreviewOrientation(tmp, orientation);
    await fsp.rename(tmp, out);
    tmp = "";
    return out;
  } catch {
    if (tmp) {
      try {
        fs.unlinkSync(tmp);
      } catch {}
    }
    return null;
  } finally {
    try {
      fs.unlinkSync(argfile);
    } catch {}
  }
}

async function render(inputPath, size, outPath, fit = "cover") {
  const tmp = outPath + ".part";
  await sharp(inputPath, { failOn: "none", limitInputPixels: false })
    .rotate()
    .resize({
      width: size,
      height: size,
      fit,
      position: "attention",
      withoutEnlargement: true,
    })
    .webp({ quality: 82 })
    .toFile(tmp);
  await fsp.rename(tmp, outPath);
}

/**
 * 照片墙专用缩略图：从原图或可读取预览中按归一化正方形裁剪，
 * 输出独立缓存，不改变普通图库使用的缩略图。
 */
async function renderPhotoWallCrop(inputPath, size, outPath, crop) {
  const tmp = outPath + ".part";
  const source = sharp(inputPath, { failOn: "none", limitInputPixels: false });
  const metadata = await source.metadata();
  const orientation = Number(metadata.orientation) || 1;
  const rotatedWidth =
    orientation >= 5 && orientation <= 8
      ? Number(metadata.height) || 0
      : Number(metadata.width) || 0;
  const rotatedHeight =
    orientation >= 5 && orientation <= 8
      ? Number(metadata.width) || 0
      : Number(metadata.height) || 0;
  if (!(rotatedWidth > 0 && rotatedHeight > 0)) throw new Error("照片尺寸无效");
  const normalized = {
    x: Math.min(1, Math.max(0, Number(crop?.x) || 0.5)),
    y: Math.min(1, Math.max(0, Number(crop?.y) || 0.5)),
    size: Math.min(1, Math.max(0.5, Number(crop?.size) || 1)),
  };
  const shortEdge = Math.min(rotatedWidth, rotatedHeight);
  const square = Math.max(1, Math.round(shortEdge * normalized.size));
  const centerX = normalized.x * rotatedWidth;
  const centerY = normalized.y * rotatedHeight;
  const left = Math.round(
    Math.min(rotatedWidth - square, Math.max(0, centerX - square / 2)),
  );
  const top = Math.round(
    Math.min(rotatedHeight - square, Math.max(0, centerY - square / 2)),
  );
  await source
    .rotate()
    .extract({ left, top, width: square, height: square })
    .resize({
      width: size,
      height: size,
      fit: "cover",
      withoutEnlargement: true,
    })
    .webp({ quality: size >= 1600 ? 91 : 86 })
    .toFile(tmp);
  await fsp.rename(tmp, outPath);
}

/**
 * 纵向画廊派生图：按固定宽高比从原图取最大可用区域。
 * 9:16 保底边，其余居中；输出本身已经是目标比例。
 */
async function renderFixedWallCrop(inputPath, size, outPath, crop) {
  const tmp = outPath + ".part";
  const source = sharp(inputPath, { failOn: "none", limitInputPixels: false });
  const metadata = await source.metadata();
  const orientation = Number(metadata.orientation) || 1;
  const rotatedWidth =
    orientation >= 5 && orientation <= 8
      ? Number(metadata.height) || 0
      : Number(metadata.width) || 0;
  const rotatedHeight =
    orientation >= 5 && orientation <= 8
      ? Number(metadata.width) || 0
      : Number(metadata.height) || 0;
  if (!(rotatedWidth > 0 && rotatedHeight > 0)) throw new Error("照片尺寸无效");
  const aspect = Math.min(4, Math.max(0.25, Number(crop?.aspect) || 1));
  let width = rotatedWidth;
  let height = Math.round(width / aspect);
  if (height > rotatedHeight) {
    height = rotatedHeight;
    width = Math.round(height * aspect);
  }
  width = Math.max(1, Math.min(rotatedWidth, width));
  height = Math.max(1, Math.min(rotatedHeight, height));
  const left = Math.round(
    Math.min(rotatedWidth - width, (rotatedWidth - width) / 2),
  );
  const top =
    crop?.anchor === "bottom"
      ? Math.max(0, rotatedHeight - height)
      : Math.round(
          Math.min(rotatedHeight - height, (rotatedHeight - height) / 2),
        );
  const outputWidth = Math.max(1, Math.round(size));
  const outputHeight = Math.max(1, Math.round(outputWidth / aspect));
  await source
    .rotate()
    .extract({ left, top, width, height })
    .resize({
      width: outputWidth,
      height: outputHeight,
      fit: "cover",
      withoutEnlargement: true,
    })
    .webp({ quality: size >= 1600 ? 91 : 86 })
    .toFile(tmp);
  await fsp.rename(tmp, outPath);
}

/** 视频封面：从视频开头抽第一帧。相簿缩略图和查看器开场图共用这一张。 */
async function videoPoster(item) {
  const out = path.join(PREVIEW_DIR, `${item.id}-first.jpg`);
  if (exists(out)) return out;
  if (posterInflight.has(item.id)) return posterInflight.get(item.id);
  const job = (async () => {
    await fsp.mkdir(PREVIEW_DIR, { recursive: true });
    /* 注意：ffmpeg 靠扩展名判断输出格式，临时文件也得是 .jpg 结尾 */
    const tmp = out.replace(/\.jpg$/, ".part.jpg");
    await run(FFMPEG, [
      "-hide_banner",
      "-loglevel",
      "error",
      "-i",
      item.path,
      "-map",
      "0:v:0",
      "-an",
      "-sn",
      "-frames:v",
      "1",
      "-vf",
      "scale='min(1600,iw)':-2",
      "-y",
      tmp,
    ]);
    if (!exists(tmp)) return null;
    await fsp.rename(tmp, out);
    return out;
  })();
  posterInflight.set(item.id, job);
  try {
    return await job;
  } finally {
    posterInflight.delete(item.id);
  }
}

async function videoOpeningPoster(item) {
  const poster = item ? lib.getVideoPoster(item.id) : null;
  if (poster) {
    try {
      const file = await ensureVideoPosterThumb(item, 1600, "inside", poster);
      if (file) return file;
    } catch {
      /* 自定义帧暂时生成失败时继续使用标准开场封面。 */
    }
  }
  /* 裁剪后查看器的开场图也要与相簿封面一致，不能先闪一下未裁剪画面。 */
  if (Number(item?.editRevision) > 0) {
    const edit = lib.getItemEdit(item.id);
    if (edit) return ensureEditedThumb(item, 1600, "inside", edit);
  }
  return videoPoster(item);
}

/** 借 Windows 自带的解码器转一张 JPEG：HEIC、TIFF 这些 sharp 读不了的格式靠它 */
async function windowsJpeg(
  item,
  { maxEdge = 2560, quality = 88, suffix = "" } = {},
) {
  const out = path.join(PREVIEW_DIR, `${item.id}${suffix}.jpg`);
  if (exists(out)) return out;
  await fsp.mkdir(PREVIEW_DIR, { recursive: true });
  const tmp = out + ".part";
  const q = (p) => `'${String(p).replace(/'/g, "''")}'`;
  const script = [
    "Add-Type -AssemblyName PresentationCore",
    `$src = ${q(item.path)}`,
    `$dst = ${q(tmp)}`,
    "try {",
    "  $dec = [System.Windows.Media.Imaging.BitmapDecoder]::Create((New-Object System.Uri($src))," +
      " [System.Windows.Media.Imaging.BitmapCreateOptions]::None," +
      " [System.Windows.Media.Imaging.BitmapCacheOption]::OnLoad)",
    "  $frame = $dec.Frames[0]",
    ...(Number(maxEdge) > 0
      ? [
          `  $scale = [Math]::Min(1.0, [Math]::Min(${Number(maxEdge)} / $frame.PixelWidth, ${Number(maxEdge)} / $frame.PixelHeight))`,
        ]
      : ["  $scale = 1.0"]),
    "  if ($scale -lt 1.0) {",
    "    $frame = New-Object System.Windows.Media.Imaging.TransformedBitmap($frame," +
      " (New-Object System.Windows.Media.ScaleTransform($scale, $scale)))",
    "  }",
    "  $enc = New-Object System.Windows.Media.Imaging.JpegBitmapEncoder",
    `  $enc.QualityLevel = ${Math.min(100, Math.max(1, Number(quality) || 88))}`,
    "  $enc.Frames.Add([System.Windows.Media.Imaging.BitmapFrame]::Create($frame))",
    "  $fs = [IO.File]::Create($dst)",
    "  $enc.Save($fs)",
    "  $fs.Close()",
    "} catch { exit 1 }",
  ].join("\n");
  await run("powershell.exe", ["-NoProfile", "-STA", "-Command", script]);
  if (!exists(tmp)) return null;
  await fsp.rename(tmp, out);
  return out;
}

async function windowsPreview(item) {
  return windowsJpeg(item, { maxEdge: 2560, quality: 88 });
}

async function windowsFullPreview(item) {
  return windowsJpeg(item, {
    maxEdge: 0,
    quality: 96,
    suffix: "-full",
  });
}

const WIC_SOURCE_EXT = new Set([".heic", ".heif", ".tif", ".tiff"]);

async function editSource(item, { full = false } = {}) {
  if (!item) return null;
  /* 视频编辑器使用首帧作为静态裁剪底图；查看和导出仍使用原视频。 */
  if (item.kind === "video") return videoPoster(item);
  if (item.kind !== "photo") return null;
  /* RAW 编辑器与查看器共用同一张内嵌 JPEG，保证裁剪框坐标系一致。
     这里不碰传感器原始数据，完成时也只保存软件内几何参数。 */
  if (lib.isRaw(item.path)) return extractEmbeddedPreview(item);
  if (WIC_SOURCE_EXT.has(path.extname(item.path).toLowerCase())) {
    return full ? windowsFullPreview(item) : windowsPreview(item);
  }
  return item.path;
}

function editedThumbPath(item, size, fit, revision) {
  const dir = path.join(EDIT_DIR, "thumbs");
  return path.join(
    dir,
    `${item.id}-${revision}-${size}-${fit === "cover" ? "cover" : "inside"}.webp`,
  );
}

async function ensureEditedThumb(item, size, fit, edit) {
  const px = SIZES.includes(size) ? size : 400;
  const revision = Number(edit?.revision) || Number(item.editRevision) || 1;
  const outPath = editedThumbPath(item, px, fit, revision);
  try {
    const stat = await fsp.stat(outPath);
    if (stat.size > 0) return outPath;
  } catch {}
  const key = `edit-thumb:${item.id}@${revision}@${px}@${fit}`;
  if (inflight.has(key)) return inflight.get(key);
  const job = (async () => {
    const input = await editSource(item);
    if (!input) return null;
    await edits.renderImage(input, outPath, edit.recipe, {
      maxSize: px,
      fit,
    });
    return outPath;
  })();
  inflight.set(key, job);
  try {
    return await job;
  } finally {
    inflight.delete(key);
  }
}

async function ensureEditedView(item, edit) {
  const revision = Number(edit?.revision) || Number(item.editRevision) || 1;
  const outPath = path.join(EDIT_DIR, "view", `${item.id}-${revision}.jpg`);
  try {
    const stat = await fsp.stat(outPath);
    if (stat.size > 0) return outPath;
  } catch {}
  const key = `edit-view:${item.id}@${revision}`;
  if (inflight.has(key)) return inflight.get(key);
  const job = (async () => {
    const input = await editSource(item);
    if (!input) return null;
    await edits.renderImage(input, outPath, edit.recipe, {
      maxSize: 2560,
      fit: "inside",
    });
    return outPath;
  })();
  inflight.set(key, job);
  try {
    return await job;
  } finally {
    inflight.delete(key);
  }
}

/* 视频预览必须等 FFmpeg 完整收尾后才能交给浏览器。只判断文件大小不够：
   生成中的 MP4 已经有内容，却还没有 moov 索引，浏览器会直接报错。 */
async function isCompleteMp4(filePath, knownStat = null) {
  let handle = null;
  try {
    const stat = knownStat || (await fsp.stat(filePath));
    if (!stat.isFile() || stat.size < 8) return false;
    handle = await fsp.open(filePath, "r");
    const header = Buffer.alloc(16);
    let offset = 0;
    let hasMoov = false;
    while (offset + 8 <= stat.size) {
      const { bytesRead } = await handle.read(
        header,
        0,
        Math.min(header.length, stat.size - offset),
        offset,
      );
      if (bytesRead < 8) return false;
      let atomSize = header.readUInt32BE(0);
      const atomType = header.toString("ascii", 4, 8);
      let headerSize = 8;
      if (atomSize === 1) {
        if (bytesRead < 16) return false;
        const largeSize = header.readBigUInt64BE(8);
        if (largeSize > BigInt(Number.MAX_SAFE_INTEGER)) return false;
        atomSize = Number(largeSize);
        headerSize = 16;
      } else if (atomSize === 0) {
        atomSize = stat.size - offset;
      }
      if (atomSize < headerSize) return false;
      const atomEnd = offset + atomSize;
      if (!Number.isSafeInteger(atomEnd) || atomEnd > stat.size) return false;
      if (atomType === "moov") hasMoov = true;
      offset = atomEnd;
    }
    return hasMoov && offset === stat.size;
  } catch {
    return false;
  } finally {
    await handle?.close().catch(() => {});
  }
}

async function ensureEditedVideoView(item, edit) {
  const revision = Number(edit?.revision) || Number(item.editRevision) || 1;
  /* 文件名带编码方案版本，旧版本生成的不兼容预览不会被继续复用。 */
  const outPath = path.join(
    EDIT_DIR,
    "video",
    `${item.id}-${revision}-avc1-aac.mp4`,
  );
  try {
    const stat = await fsp.stat(outPath);
    if (stat.size > 0 && (await isCompleteMp4(outPath, stat))) return outPath;
    /* 旧版本可能留下了写到一半的正式文件。确认无效后移除，
       下一次请求会重新生成而不是持续拿到坏缓存。 */
    await fsp.rm(outPath, { force: true });
  } catch {}
  const key = `edit-video-view:${item.id}@${revision}`;
  if (inflight.has(key)) return inflight.get(key);
  const job = (async () => {
    const tempPath = `${outPath}.${process.pid}.part.mp4`;
    await fsp.mkdir(path.dirname(outPath), { recursive: true });
    await fsp.rm(tempPath, { force: true });
    try {
      await edits.renderVideo(item.path, tempPath, edit.recipe, {
        includeTone: false,
        maxSize: 1440,
        preset: "veryfast",
        crf: 22,
      });
      if (!(await isCompleteMp4(tempPath))) {
        throw new Error("裁剪后的视频没有完成写入");
      }
      /* Windows 上先拿掉旧缓存，再把完整临时文件改名到正式位置。
         播放请求只会看到旧文件或完整的新文件，不会看到正在写入的最终文件。 */
      await fsp.rm(outPath, { force: true });
      await fsp.rename(tempPath, outPath);
      return outPath;
    } finally {
      await fsp.rm(tempPath, { force: true }).catch(() => {});
    }
  })();
  inflight.set(key, job);
  try {
    return await job;
  } finally {
    inflight.delete(key);
  }
}

function compatibleVideoPath(item) {
  const version = [
    Number(item?.mtime) || 0,
    Number(item?.size) || 0,
    Number(item?.editRevision) || 0,
  ].join("-");
  return path.join(
    EDIT_DIR,
    "video",
    `${item.id}-compat-v1-${version}-avc1-aac.mp4`,
  );
}

async function ensureCompatibleVideo(
  item,
  {
    maxHeight = 1080,
    preset = "veryfast",
    crf = 24,
    timeout = 20 * 60 * 1000,
  } = {},
) {
  if (!item || item.kind !== "video" || !item.path) {
    throw new Error("这不是可播放的视频");
  }
  const outPath = compatibleVideoPath(item);
  try {
    const stat = await fsp.stat(outPath);
    if (stat.size > 0 && (await isCompleteMp4(outPath, stat))) return outPath;
    await fsp.rm(outPath, { force: true });
  } catch {}

  const key = `compatible-video:${item.id}@${Number(item.mtime) || 0}:${Number(item.size) || 0}:${Number(item.editRevision) || 0}`;
  if (inflight.has(key)) return inflight.get(key);

  const job = (async () => {
    const input = await viewableFile(item);
    if (!input) throw new Error("这个视频暂时无法读取");
    const tempPath = `${outPath}.${process.pid}.part.mp4`;
    await fsp.mkdir(path.dirname(outPath), { recursive: true });
    await fsp.rm(tempPath, { force: true });
    try {
      await edits.renderVideo(
        input,
        tempPath,
        {},
        {
          includeTone: false,
          maxSize: Math.max(360, Math.round(maxHeight)),
          preset,
          crf,
          timeout,
        },
      );
      if (!(await isCompleteMp4(tempPath))) {
        throw new Error("兼容视频没有完成写入");
      }
      await fsp.rm(outPath, { force: true });
      await fsp.rename(tempPath, outPath);
      return outPath;
    } finally {
      await fsp.rm(tempPath, { force: true }).catch(() => {});
    }
  })();
  inflight.set(key, job);
  try {
    return await job;
  } finally {
    inflight.delete(key);
  }
}

async function ensureEditedMaster(item, edit, size = 2400) {
  const revision = Number(edit?.revision) || Number(item.editRevision) || 1;
  const outPath = path.join(
    EDIT_DIR,
    "master",
    `${item.id}-${revision}-${size}.webp`,
  );
  try {
    const stat = await fsp.stat(outPath);
    if (stat.size > 0) return outPath;
  } catch {}
  const key = `edit-master:${item.id}@${revision}@${size}`;
  if (inflight.has(key)) return inflight.get(key);
  const job = (async () => {
    const input = await editSource(item);
    if (!input) return null;
    await edits.renderImage(input, outPath, edit.recipe, {
      maxSize: size,
      fit: "inside",
    });
    return outPath;
  })();
  inflight.set(key, job);
  try {
    return await job;
  } finally {
    inflight.delete(key);
  }
}

async function renderEditedPhoto(item, outputPath, edit) {
  const input = await editSource(item, { full: true });
  if (!input) throw new Error("这个格式不能生成编辑后的照片");
  return edits.renderImage(input, outputPath, edit.recipe, {
    maxSize: 0,
    fit: "inside",
    includeTone: true,
  });
}

async function renderEditedLiveVideo(videoItem, photoEdit, outputPath) {
  if (!videoItem || videoItem.kind !== "video" || !photoEdit) return null;
  return edits.renderVideo(videoItem.path, outputPath, photoEdit.recipe, {
    includeTone: false,
  });
}

async function renderEditedVideo(videoItem, edit, outputPath) {
  if (!videoItem || videoItem.kind !== "video" || !edit) return null;
  return edits.renderVideo(videoItem.path, outputPath, edit.recipe, {
    includeTone: false,
  });
}

function videoPosterThumbPath(item, size, fit, revision) {
  return path.join(
    EDIT_DIR,
    "thumbs",
    `${item.id}-poster-${revision}-${size}-${fit === "cover" ? "cover" : "inside"}.webp`,
  );
}

async function ensureVideoPosterThumb(item, size, fit, poster) {
  if (!item || item.kind !== "video" || !poster) return null;
  const px = SIZES.includes(size) ? size : 400;
  const revision = Number(poster.revision) || 0;
  const outPath = videoPosterThumbPath(item, px, fit, revision);
  try {
    const stat = await fsp.stat(outPath);
    if (stat.size > 0) return outPath;
  } catch {}
  const key = `video-poster:${item.id}@${revision}@${px}@${fit}`;
  if (inflight.has(key)) return inflight.get(key);
  const job = (async () => {
    await fsp.mkdir(path.dirname(outPath), { recursive: true });
    await edits.renderImage(item.path, outPath, poster.recipe, {
      maxSize: px,
      fit,
      includeTone: false,
      seekSeconds: poster.frameTime,
    });
    return outPath;
  })();
  inflight.set(key, job);
  try {
    return await job;
  } finally {
    inflight.delete(key);
  }
}

/**
 * 拿到（必要时生成）缩略图文件路径。
 * 返回 null 表示这个文件做不出缩略图，前端画占位块。
 */
async function ensureThumb(item, size, fit = "cover") {
  const px = SIZES.includes(size) ? size : 400;
  if (item?.kind === "video") {
    const poster = lib.getVideoPoster(item.id);
    if (poster) {
      try {
        const file = await ensureVideoPosterThumb(item, px, fit, poster);
        if (file) return file;
      } catch {
        /* 自定义帧暂时生成失败时继续使用标准缩略图链路。 */
      }
    }
  }
  if (
    ["photo", "video"].includes(item?.kind) &&
    Number(item.editRevision) > 0
  ) {
    const edit = lib.getItemEdit(item.id);
    if (edit) return ensureEditedThumb(item, px, fit, edit);
  }
  const dir = path.join(THUMB_DIR, String(px));
  const outPath = path.join(
    dir,
    `${item.id}${fit === "inside" ? "-fit" : ""}${
      lib.isRaw(item.path) ? "-raw-v3" : ""
    }.webp`,
  );
  try {
    const st = await fsp.stat(outPath);
    if (st.size > 0) return outPath;
  } catch {
    /* 需要生成 */
  }

  const key = `${item.id}@${px}@${fit}`;
  if (inflight.has(key)) return inflight.get(key);

  const job = (async () => {
    await fsp.mkdir(dir, { recursive: true });
    /* 按可能性排队试：原文件 → 内嵌预览（RAW）→ ffmpeg 抽帧（视频）→ Windows 解码器（HEIC） */
    const attempts = [];
    if (item.kind === "video") {
      attempts.push(() => videoPoster(item));
    } else if (lib.isRaw(item.path)) {
      attempts.push(() => extractEmbeddedPreview(item));
      attempts.push(() => windowsPreview(item));
    } else {
      attempts.push(async () => item.path);
      attempts.push(() => extractEmbeddedPreview(item));
      attempts.push(() => windowsPreview(item));
    }
    try {
      for (const attempt of attempts) {
        try {
          const input = await attempt();
          if (!input) continue;
          await render(input, px, outPath, fit);
          return outPath;
        } catch {
          /* 这一种不行，换下一种 */
        }
      }
      return null;
    } finally {
      inflight.delete(key);
    }
  })();

  inflight.set(key, job);
  return job;
}

async function ensurePhotoWallThumb(item, size, crop = null) {
  if (!item || item.kind !== "photo") return null;
  const px = Math.min(2400, Math.max(200, Number(size) || 600));
  const normalized = {
    x: Math.min(1, Math.max(0, Number(crop?.x) || 0.5)),
    y: Math.min(1, Math.max(0, Number(crop?.y) || 0.5)),
    size: Math.min(1, Math.max(0.5, Number(crop?.size) || 1)),
    updatedAt: Number(crop?.updatedAt) || 0,
  };
  const version = normalized.updatedAt
    ? String(normalized.updatedAt)
    : `${normalized.x.toFixed(5)}-${normalized.y.toFixed(5)}-${normalized.size.toFixed(5)}`;
  const editRevision = Number(item.editRevision) || 0;
  const dir = path.join(THUMB_DIR, "photo-wall");
  const outPath = path.join(
    dir,
    `${item.id}-${version}-${editRevision}-${px}.webp`,
  );
  try {
    const stat = await fsp.stat(outPath);
    if (stat.size > 0) return outPath;
  } catch {
    /* 需要生成 */
  }

  const key = `photo-wall:${item.id}@${version}@${editRevision}@${px}`;
  if (inflight.has(key)) return inflight.get(key);
  const job = (async () => {
    await fsp.mkdir(dir, { recursive: true });
    const attempts = [];
    const edit = editRevision > 0 ? lib.getItemEdit(item.id) : null;
    if (edit) {
      attempts.push(() => ensureEditedMaster(item, edit, Math.max(px, 2048)));
    } else if (lib.isRaw(item.path)) {
      attempts.push(() => extractEmbeddedPreview(item));
      attempts.push(() => windowsPreview(item));
    } else {
      attempts.push(async () => item.path);
      attempts.push(() => extractEmbeddedPreview(item));
      attempts.push(() => windowsPreview(item));
    }
    try {
      for (const attempt of attempts) {
        try {
          const input = await attempt();
          if (!input) continue;
          await renderPhotoWallCrop(input, px, outPath, normalized);
          return outPath;
        } catch {
          /* 尝试下一种解码路径 */
        }
      }
      return null;
    } finally {
      inflight.delete(key);
    }
  })();
  inflight.set(key, job);
  return job;
}

async function ensureFixedWallThumb(
  item,
  size,
  crop = null,
  wallKind = "masonry",
) {
  if (!item || item.kind !== "photo") return null;
  const directoryName =
    wallKind === "filmroll"
      ? "filmroll-wall"
      : wallKind === "mosaic"
        ? "mosaic-wall"
        : "masonry-wall";
  const px = Math.min(2400, Math.max(200, Number(size) || 600));
  const ratioKey = String(crop?.ratioKey || "1:1");
  const aspect = Number(crop?.aspect) || 1;
  const anchor = crop?.anchor === "bottom" ? "bottom" : "center";
  const updatedAt = Number(crop?.updatedAt) || 0;
  const version = [
    ratioKey.replace(":", "-"),
    anchor,
    updatedAt || "auto",
  ].join("-");
  const editRevision = Number(item.editRevision) || 0;
  const dir = path.join(THUMB_DIR, directoryName);
  const outPath = path.join(
    dir,
    `${item.id}-${version}-${editRevision}-${px}.webp`,
  );
  try {
    const stat = await fsp.stat(outPath);
    if (stat.size > 0) return outPath;
  } catch {
    /* 需要生成 */
  }
  const key = `${directoryName}:${item.id}@${version}@${editRevision}@${px}`;
  if (inflight.has(key)) return inflight.get(key);
  const job = (async () => {
    await fsp.mkdir(dir, { recursive: true });
    const attempts = [];
    const edit = editRevision > 0 ? lib.getItemEdit(item.id) : null;
    if (edit) {
      attempts.push(() => ensureEditedMaster(item, edit, Math.max(px, 2048)));
    } else if (lib.isRaw(item.path)) {
      attempts.push(() => extractEmbeddedPreview(item));
      attempts.push(() => windowsPreview(item));
    } else {
      attempts.push(async () => item.path);
      attempts.push(() => extractEmbeddedPreview(item));
      attempts.push(() => windowsPreview(item));
    }
    try {
      for (const attempt of attempts) {
        try {
          const input = await attempt();
          if (!input) continue;
          await renderFixedWallCrop(input, px, outPath, {
            aspect,
            anchor,
          });
          return outPath;
        } catch {
          /* 尝试下一种解码路径 */
        }
      }
      return null;
    } finally {
      inflight.delete(key);
    }
  })();
  inflight.set(key, job);
  return job;
}

function dropPhotoWallThumbs(itemId) {
  const dir = path.join(THUMB_DIR, "photo-wall");
  try {
    for (const name of fs.readdirSync(dir)) {
      if (name.startsWith(`${Number(itemId)}-`) && name.endsWith(".webp")) {
        try {
          fs.rmSync(path.join(dir, name), { force: true });
        } catch {}
      }
    }
  } catch {}
}

function dropMasonryWallThumbs(itemId) {
  dropWallThumbs("masonry-wall", itemId);
}

function dropFilmrollWallThumbs(itemId) {
  dropWallThumbs("filmroll-wall", itemId);
}

function dropMosaicWallThumbs(itemId) {
  dropWallThumbs("mosaic-wall", itemId);
}

function dropWallThumbs(directoryName, itemId) {
  const dir = path.join(THUMB_DIR, directoryName);
  try {
    for (const name of fs.readdirSync(dir)) {
      if (name.startsWith(`${Number(itemId)}-`) && name.endsWith(".webp")) {
        try {
          fs.rmSync(path.join(dir, name), { force: true });
        } catch {}
      }
    }
  } catch {}
}

const ensureMasonryWallThumb = (item, size, crop = null) =>
  ensureFixedWallThumb(item, size, crop, "masonry");

const ensureFilmrollWallThumb = (item, size, crop = null) =>
  ensureFixedWallThumb(item, size, crop, "filmroll");

const ensureMosaicWallThumb = (item, size, crop = null) =>
  ensureFixedWallThumb(item, size, crop, "mosaic");

function dropEditedCaches(itemId) {
  const id = Number(itemId);
  if (!Number.isInteger(id) || id <= 0) return;
  for (const dirName of ["thumbs", "view", "video", "master"]) {
    const dir = path.join(EDIT_DIR, dirName);
    let names = [];
    try {
      names = fs.readdirSync(dir);
    } catch {
      continue;
    }
    for (const name of names) {
      if (!new RegExp(`^${id}-`).test(name)) continue;
      try {
        fs.rmSync(path.join(dir, name), { force: true });
      } catch {}
    }
  }
}

/** 浏览器能直接显示的格式；其余（RAW/HEIC/TIFF）查看大图时统一走 1600 缩略图 */
const DIRECT_VIEW = new Set([
  ".jpg",
  ".jpeg",
  ".jfif",
  ".png",
  ".webp",
  ".gif",
  ".bmp",
  ".avif",
]);
const canViewOriginal = (filePath) =>
  DIRECT_VIEW.has(path.extname(filePath).toLowerCase());

/** 查看大图时实际要喂给浏览器的文件：能直接显示就用原图，否则给转换出来的副本 */
async function viewableFile(item) {
  if (item.kind === "video") {
    if (Number(item.editRevision) > 0) {
      const edit = lib.getItemEdit(item.id);
      if (edit) return ensureEditedVideoView(item, edit);
    }
    return item.path;
  }
  if (Number(item.editRevision) > 0) {
    const edit = lib.getItemEdit(item.id);
    if (edit) return ensureEditedView(item, edit);
  }
  if (canViewOriginal(item.path)) return item.path;
  if (lib.isRaw(item.path)) return await extractEmbeddedPreview(item);
  return await windowsPreview(item);
}

module.exports = {
  ensureThumb,
  ensurePhotoWallThumb,
  ensureMasonryWallThumb,
  ensureFilmrollWallThumb,
  ensureMosaicWallThumb,
  dropPhotoWallThumbs,
  dropMasonryWallThumbs,
  dropFilmrollWallThumbs,
  dropMosaicWallThumbs,
  dropEditedCaches,
  viewableFile,
  canViewOriginal,
  extractEmbeddedPreview,
  videoPoster,
  videoOpeningPoster,
  windowsPreview,
  windowsFullPreview,
  editSource,
  renderEditedPhoto,
  renderEditedLiveVideo,
  renderEditedVideo,
  ensureCompatibleVideo,
  ensureVideoPosterThumb,
  SIZES,
  THUMB_DIR,
  FFMPEG,
};
