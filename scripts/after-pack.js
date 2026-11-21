"use strict";

const crypto = require("node:crypto");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const asar = require("@electron/asar");
const esbuild = require("esbuild");
const { optimizeRuntimeBinaries } = require("./optimize-binaries");

const RUNTIME_ROOTS = ["assets", "electron", "server", "web"];
const MANIFEST = "build-manifest.json";

function listFiles(root, relative = "") {
  const directory = path.join(root, relative);
  if (!fs.existsSync(directory)) return [];
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const next = path.join(relative, entry.name);
    return entry.isDirectory() ? listFiles(root, next) : [next];
  });
}

function sha256(file) {
  return crypto
    .createHash("sha256")
    .update(fs.readFileSync(file))
    .digest("hex");
}

function normalize(relative) {
  return relative.replaceAll(path.sep, "/");
}

async function minifyOwnedWebAssets(appDir) {
  const webDir = path.join(appDir, "web");
  const files = listFiles(webDir).filter((relative) => {
    const normalized = normalize(relative);
    if (normalized.includes("/vendor/")) return false;
    if (normalized.startsWith("photo-wall/assets/")) return false;
    return /\.(?:css|js)$/.test(normalized);
  });

  for (const relative of files) {
    const file = path.join(webDir, relative);
    const extension = path.extname(file).slice(1);
    const source = fs.readFileSync(file, "utf8");
    const result = await esbuild.transform(source, {
      loader: extension,
      minifyWhitespace: true,
      minifySyntax: extension === "css",
      minifyIdentifiers: false,
      legalComments: "none",
    });
    fs.writeFileSync(file, result.code);
  }
}

function createManifest(projectRoot, appDir) {
  const files = RUNTIME_ROOTS.flatMap((root) => listFiles(appDir, root)).map(
    normalize,
  );
  files.push("package.json");

  return {
    version: JSON.parse(
      fs.readFileSync(path.join(projectRoot, "package.json"), "utf8"),
    ).version,
    files: files.sort().map((relative) => {
      const sourceFile = path.join(projectRoot, relative);
      const packagedFile = path.join(appDir, relative);
      const sourceHash = sha256(sourceFile);
      const packagedHash = sha256(packagedFile);
      return { path: relative, sourceHash, packagedHash };
    }),
  };
}

function assertInside(parent, target) {
  const relative = path.relative(parent, target);
  if (!relative || relative.startsWith("..") || path.isAbsolute(relative)) {
    throw new Error(`不安全的发布路径：${target}`);
  }
}

async function optimizeAppArchive(context) {
  const projectRoot = context.packager.projectDir;
  const resourcesDir = path.join(context.appOutDir, "resources");
  const archive = path.join(resourcesDir, "app.asar");
  if (!fs.existsSync(archive)) return;

  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "fotora-pack-"));
  const appDir = path.join(tempRoot, "app");
  const optimizedArchive = path.join(resourcesDir, "app.optimized.asar");
  const optimizedUnpacked = `${optimizedArchive}.unpacked`;
  const currentUnpacked = `${archive}.unpacked`;

  try {
    asar.extractAll(archive, appDir);
    await minifyOwnedWebAssets(appDir);
    optimizeRuntimeBinaries({ projectRoot: appDir });

    const manifest = createManifest(projectRoot, appDir);
    fs.writeFileSync(
      path.join(appDir, MANIFEST),
      `${JSON.stringify(manifest)}\n`,
    );
    await asar.createPackageWithOptions(appDir, optimizedArchive, {
      unpack: "**/{sharp,@img}/**/*",
    });

    assertInside(resourcesDir, optimizedArchive);
    assertInside(resourcesDir, currentUnpacked);
    fs.rmSync(archive, { force: true });
    fs.rmSync(currentUnpacked, { recursive: true, force: true });
    fs.renameSync(optimizedArchive, archive);
    if (fs.existsSync(optimizedUnpacked)) {
      fs.renameSync(optimizedUnpacked, currentUnpacked);
    }
  } finally {
    fs.rmSync(tempRoot, { recursive: true, force: true });
    fs.rmSync(optimizedArchive, { force: true });
    fs.rmSync(optimizedUnpacked, { recursive: true, force: true });
  }
}

exports.default = async function afterPack(context) {
  await optimizeAppArchive(context);
  optimizeRuntimeBinaries({
    projectRoot: context.appOutDir,
    packaged: true,
  });
  /* Fotora does not use WebGPU. These Electron extras only compile D3D12
     compute shaders for WebGPU, so they are not needed by this application. */
  for (const name of ["dxcompiler.dll", "dxil.dll"]) {
    fs.rmSync(path.join(context.appOutDir, name), { force: true });
  }
};
