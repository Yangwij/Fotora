"use strict";

/**
 * 照片编辑参数与派生图渲染。
 *
 * 原片永远只读。这里只把一组归一化参数变成缓存图或导出副本，
 * 视频则复用同一组几何参数，不应用调色参数。
 */
const fs = require("node:fs");
const fsp = require("node:fs/promises");
const path = require("node:path");
const { execFile } = require("node:child_process");
const sharp = require("sharp");

const RAW_EXT = new Set([
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
  ".braw",
  ".crm",
  ".rmf",
  ".r3d",
  ".ari",
]);

const FFMPEG =
  [
    process.env.FFMPEG_PATH,
    path.join(__dirname, "..", "vendor", "ffmpeg.exe"),
    "ffmpeg",
  ]
    .filter(Boolean)
    .find((candidate) => candidate === "ffmpeg" || fs.existsSync(candidate)) ||
  "ffmpeg";

const ADJUSTMENT_KEYS = Object.freeze([
  "exposure",
  "highlights",
  "shadows",
  "contrast",
  "brightness",
  "blackPoint",
  "saturation",
  "vibrance",
  "temperature",
  "tint",
  "sharpness",
  "clarity",
  "noiseReduction",
  "vignette",
]);
const DEFAULT_ADJUSTMENTS = Object.freeze(
  Object.fromEntries(ADJUSTMENT_KEYS.map((key) => [key, 0])),
);
const DEFAULT_GEOMETRY = Object.freeze({
  quarterTurns: 0,
  mirrorX: false,
  angle: 0,
  perspectiveH: 0,
  perspectiveV: 0,
  crop: Object.freeze({ x: 0, y: 0, w: 1, h: 1 }),
  aspect: "free",
});

function clamp(value, min, max, fallback = 0) {
  const number = Number(value);
  if (!Number.isFinite(number)) return fallback;
  return Math.min(max, Math.max(min, number));
}

function normalizeCrop(value) {
  const x = clamp(value?.x, 0, 0.98, 0);
  const y = clamp(value?.y, 0, 0.98, 0);
  const w = clamp(value?.w, 0.02, 1 - x, 1);
  const h = clamp(value?.h, 0.02, 1 - y, 1);
  return { x, y, w, h };
}

function normalizeRecipe(raw) {
  const adjustments = {};
  for (const key of ADJUSTMENT_KEYS) {
    const limit = key === "exposure" ? 2 : 1;
    adjustments[key] = clamp(raw?.adjustments?.[key], -limit, limit, 0);
  }
  return {
    version: 1,
    adjustments,
    geometry: {
      quarterTurns: Math.round(clamp(raw?.geometry?.quarterTurns, 0, 3, 0)),
      mirrorX: Boolean(raw?.geometry?.mirrorX),
      angle: clamp(raw?.geometry?.angle, -45, 45, 0),
      perspectiveH: clamp(raw?.geometry?.perspectiveH, -1, 1, 0),
      perspectiveV: clamp(raw?.geometry?.perspectiveV, -1, 1, 0),
      crop: normalizeCrop(raw?.geometry?.crop),
      aspect:
        typeof raw?.geometry?.aspect === "string"
          ? raw.geometry.aspect.slice(0, 24)
          : "free",
    },
  };
}

function hasGeometryEdit(geometry) {
  const crop = geometry?.crop;
  return Boolean(
    Number(geometry?.quarterTurns) ||
    geometry?.mirrorX ||
    Math.abs(Number(geometry?.angle) || 0) > 0.001 ||
    Math.abs(Number(geometry?.perspectiveH) || 0) > 0.001 ||
    Math.abs(Number(geometry?.perspectiveV) || 0) > 0.001 ||
    !crop ||
    Math.abs(crop.x) > 0.0005 ||
    Math.abs(crop.y) > 0.0005 ||
    Math.abs(crop.w - 1) > 0.0005 ||
    Math.abs(crop.h - 1) > 0.0005,
  );
}

function hasEdit(raw) {
  const recipe = normalizeRecipe(raw);
  return hasAdjustmentEdit(recipe) || hasGeometryEdit(recipe.geometry);
}

const extOf = (filePath) => path.extname(String(filePath || "")).toLowerCase();
const isRawExtension = (filePath) => RAW_EXT.has(extOf(filePath));

function hasAdjustmentEdit(raw) {
  const recipe = normalizeRecipe(raw);
  return ADJUSTMENT_KEYS.some(
    (key) => Math.abs(recipe.adjustments[key]) > 0.0005,
  );
}

async function canEditItem(item) {
  if (!item) return false;
  /* 视频只使用几何裁剪；首帧能否读取由编辑接口在生成预览时确认。 */
  if (item.kind === "video") return true;
  if (item.kind !== "photo") return false;
  const ext = extOf(item.path);
  if (ext === ".gif") return false;
  /* RAW 不解码完整传感器数据；编辑器复用内嵌 JPEG 预览，只开放几何裁剪。 */
  if (isRawExtension(item.path)) return true;
  if (ext !== ".heic" && ext !== ".heif") {
    try {
      const metadata = await sharp(item.path, {
        failOn: "none",
        limitInputPixels: false,
      }).metadata();
      return !(Number(metadata.pages) > 1);
    } catch {
      return false;
    }
  }
  return true;
}

function numberOptions(values) {
  return Object.entries(values)
    .map(([key, value]) => `${key}=${Math.round(value * 100000) / 100000}`)
    .join(":");
}

function toneFilters(recipe) {
  const a = recipe.adjustments;
  const filters = [];
  const brightness = clamp(
    a.brightness * 0.34 + a.exposure * 0.22,
    -0.9,
    0.9,
    0,
  );
  const contrast = clamp(1 + a.contrast * 0.9, 0.05, 3, 1);
  const saturation = clamp(1 + a.saturation * 1.6, 0, 4, 1);
  const gamma = clamp(Math.pow(2, -a.exposure * 0.42), 0.2, 5, 1);
  if (
    Math.abs(brightness) +
      Math.abs(a.contrast) +
      Math.abs(a.saturation) +
      Math.abs(a.exposure) >
    0.0001
  ) {
    filters.push(
      `eq=${numberOptions({ brightness, contrast, saturation, gamma })}`,
    );
  }

  if (
    Math.abs(a.highlights) + Math.abs(a.shadows) + Math.abs(a.blackPoint) >
    0.0001
  ) {
    const black = clamp(a.blackPoint * 0.13, -0.12, 0.12, 0);
    const low = clamp(0.25 + a.shadows * 0.105, 0.02, 0.48, 0.25);
    const high = clamp(0.75 + a.highlights * 0.1, 0.52, 0.98, 0.75);
    filters.push(
      `curves=master='${black.toFixed(4)}/0 0.25/${low.toFixed(4)} ` +
        `0.5/0.5 0.75/${high.toFixed(4)} 1/1'`,
    );
  }

  if (Math.abs(a.temperature) + Math.abs(a.tint) > 0.0001) {
    filters.push(
      `colorbalance=${numberOptions({
        rs: a.temperature * 0.16,
        bs: -a.temperature * 0.16,
        gm: a.tint * 0.13,
        rm: a.temperature * 0.05,
        bm: -a.temperature * 0.05,
      })}`,
    );
  }

  if (Math.abs(a.vibrance) > 0.0001) {
    filters.push(
      `vibrance=intensity=${clamp(a.vibrance, -1, 1, 0).toFixed(4)}`,
    );
  }
  if (Math.abs(a.noiseReduction) > 0.0001) {
    const n = Math.max(0, a.noiseReduction);
    filters.push(
      `hqdn3d=${(n * 2.2).toFixed(3)}:${(n * 1.7).toFixed(3)}:` +
        `${(n * 3.2).toFixed(3)}:${(n * 2.4).toFixed(3)}`,
    );
  }
  if (Math.abs(a.sharpness) > 0.0001) {
    filters.push(
      `unsharp=5:5:${(Math.max(0, a.sharpness) * 1.35).toFixed(3)}:5:5:0`,
    );
  }
  if (Math.abs(a.clarity) > 0.0001) {
    filters.push(
      `unsharp=9:9:${(Math.max(0, a.clarity) * 0.62).toFixed(3)}:9:9:0`,
    );
  }
  if (Math.abs(a.vignette) > 0.0001) {
    const amount = clamp(a.vignette, -1, 1, 0);
    const denominator =
      amount >= 0 ? 6.2 - amount * 3.1 : 6.2 + Math.abs(amount) * 4;
    filters.push(`vignette=angle=PI/${Math.max(1.3, denominator).toFixed(4)}`);
  }
  return filters;
}

function geometryFilters(
  recipe,
  { includeTone = true, maxSize = 0, fit = "inside" } = {},
) {
  const geometry = recipe.geometry;
  const filters = [];
  const turns = Number(geometry.quarterTurns) || 0;
  /* 编辑器中的 quarterTurns 是逆时针递增；FFmpeg 的 transpose=2 也是逆时针。 */
  for (let i = 0; i < turns; i += 1) filters.push("transpose=2");
  if (geometry.mirrorX) filters.push("hflip");

  if (Math.abs(geometry.angle) > 0.001) {
    const radians = (Math.PI * geometry.angle) / 180;
    filters.push(
      `rotate=${radians.toFixed(8)}:ow=rotw(${radians.toFixed(8)}):` +
        `oh=roth(${radians.toFixed(8)}):fillcolor=black`,
    );
  }

  const perspectiveH = Math.tan(
    (clamp(geometry.perspectiveH, -1, 1, 0) * Math.PI) / 6,
  );
  const perspectiveV = Math.tan(
    (clamp(geometry.perspectiveV, -1, 1, 0) * Math.PI) / 6,
  );
  if (Math.abs(perspectiveH) + Math.abs(perspectiveV) > 0.001) {
    const project = ([x, y]) => {
      const denominator = 1 - perspectiveH * x - perspectiveV * y;
      return {
        x: x / Math.max(0.08, denominator),
        y: y / Math.max(0.08, denominator),
      };
    };
    const corners = [
      project([-0.5, -0.5]),
      project([0.5, -0.5]),
      project([-0.5, 0.5]),
      project([0.5, 0.5]),
    ];
    const extent = Math.max(
      ...corners.flatMap((point) => [Math.abs(point.x), Math.abs(point.y)]),
      0.5,
    );
    const scale = 0.5 / extent;
    const [topLeft, topRight, bottomLeft, bottomRight] = corners.map(
      (point) => ({
        x: point.x * scale + 0.5,
        y: point.y * scale + 0.5,
      }),
    );
    const coordinate = (value, axis) =>
      `${axis}*${clamp(value, 0, 1, 0).toFixed(8)}`;
    filters.push(
      "perspective=sense=destination:interpolation=cubic:" +
        `x0=${coordinate(topLeft.x, "W")}:y0=${coordinate(topLeft.y, "H")}:` +
        `x1=${coordinate(topRight.x, "W")}:y1=${coordinate(topRight.y, "H")}:` +
        `x2=${coordinate(bottomLeft.x, "W")}:y2=${coordinate(bottomLeft.y, "H")}:` +
        `x3=${coordinate(bottomRight.x, "W")}:y3=${coordinate(bottomRight.y, "H")}`,
    );
  }

  const crop = normalizeCrop(geometry.crop);
  if (
    crop.x > 0.0005 ||
    crop.y > 0.0005 ||
    crop.w < 0.9995 ||
    crop.h < 0.9995
  ) {
    filters.push(
      `crop=w=trunc(iw*${crop.w.toFixed(6)}/2)*2:` +
        `h=trunc(ih*${crop.h.toFixed(6)}/2)*2:` +
        `x=min(iw-2\\,trunc(iw*${crop.x.toFixed(6)}/2)*2):` +
        `y=min(ih-2\\,trunc(ih*${crop.y.toFixed(6)}/2)*2)`,
    );
  }

  if (includeTone) filters.push(...toneFilters(recipe));

  if (Number(maxSize) > 0) {
    const size = Math.max(16, Math.round(Number(maxSize)));
    if (fit === "cover") {
      filters.push(
        `scale=${size}:${size}:force_original_aspect_ratio=increase:flags=lanczos`,
        `crop=${size}:${size}`,
      );
    } else {
      filters.push(
        `scale=${size}:${size}:force_original_aspect_ratio=decrease:flags=lanczos`,
      );
    }
  }
  return filters;
}

function runFfmpeg(args, { timeout = 120000 } = {}) {
  return new Promise((resolve, reject) => {
    execFile(
      FFMPEG,
      args,
      {
        windowsHide: true,
        encoding: "buffer",
        maxBuffer: 16 * 1024 * 1024,
        timeout,
      },
      (error, stdout, stderr) => {
        if (error) {
          const detail = Buffer.from(stderr || stdout || "")
            .toString("utf8")
            .trim();
          reject(new Error(detail || error.message));
          return;
        }
        resolve();
      },
    );
  });
}

async function renderImage(
  inputPath,
  outputPath,
  recipe,
  { maxSize = 0, fit = "inside", includeTone = true, seekSeconds = null } = {},
) {
  const normalized = normalizeRecipe(recipe);
  const filters = geometryFilters(normalized, { includeTone, maxSize, fit });
  const ext = extOf(outputPath);
  const seek =
    Number.isFinite(Number(seekSeconds)) && Number(seekSeconds) > 0
      ? ["-ss", String(Number(seekSeconds))]
      : [];
  const args = [
    "-hide_banner",
    "-loglevel",
    "error",
    ...seek,
    "-i",
    inputPath,
    "-vf",
    filters.length ? filters.join(",") : "null",
    "-frames:v",
    "1",
    "-update",
    "1",
    "-map_metadata",
    "0",
  ];
  if (ext === ".webp") args.push("-c:v", "libwebp", "-quality", "88");
  else if (ext === ".jpg" || ext === ".jpeg")
    args.push("-c:v", "mjpeg", "-q:v", "2");
  args.push("-y", outputPath);
  await fsp.mkdir(path.dirname(outputPath), { recursive: true });
  await runFfmpeg(args);
  return outputPath;
}

async function renderVideo(
  inputPath,
  outputPath,
  recipe,
  {
    includeTone = false,
    maxSize = 0,
    preset = "medium",
    crf = 18,
    timeout = 20 * 60 * 1000,
  } = {},
) {
  const normalized = normalizeRecipe(recipe);
  const filters = geometryFilters(normalized, {
    includeTone,
    maxSize,
    fit: "inside",
  });
  if (!filters.length) {
    await fsp.copyFile(inputPath, outputPath);
    return outputPath;
  }
  /* H.264 + yuv420p 要求最终宽高为偶数；缩放后的奇数边缘会让部分
     浏览器拒绝播放。 */
  filters.push("scale=trunc(iw/2)*2:trunc(ih/2)*2:flags=lanczos");
  await fsp.mkdir(path.dirname(outputPath), { recursive: true });
  await runFfmpeg(
    [
      "-hide_banner",
      "-loglevel",
      "error",
      "-i",
      inputPath,
      "-vf",
      filters.join(","),
      "-map",
      "0:v:0",
      "-map",
      "0:a?",
      "-map_metadata",
      "0",
      "-c:v",
      "libx264",
      "-preset",
      preset,
      "-crf",
      String(crf),
      "-pix_fmt",
      "yuv420p",
      "-c:a",
      "aac",
      "-b:a",
      "160k",
      "-movflags",
      "+faststart",
      "-y",
      outputPath,
    ],
    { timeout },
  );
  return outputPath;
}

module.exports = {
  ADJUSTMENT_KEYS,
  DEFAULT_ADJUSTMENTS,
  DEFAULT_GEOMETRY,
  normalizeRecipe,
  hasEdit,
  hasAdjustmentEdit,
  hasGeometryEdit,
  canEditItem,
  isRawExtension,
  geometryFilters,
  renderImage,
  renderVideo,
  FFMPEG,
};
