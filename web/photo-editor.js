/* 照片与视频共用纯裁剪编辑器：只提供自由裁剪和比例裁剪。
   原文件始终只读。 */
(() => {
  const RATIOS = [
    ["original", "原始"],
    ["square", "1:1"],
    ["16:9", "16:9"],
    ["4:5", "4:5"],
    ["5:7", "5:7"],
    ["4:3", "4:3"],
    ["3:5", "3:5"],
    ["3:2", "3:2"],
  ];

  const clone = (value) => JSON.parse(JSON.stringify(value));
  const clamp = (value, min, max, fallback = 0) => {
    const number = Number(value);
    if (!Number.isFinite(number)) return fallback;
    return Math.min(max, Math.max(min, number));
  };
  const defaultRecipe = () => ({
    version: 1,
    geometry: {
      crop: { x: 0, y: 0, w: 1, h: 1 },
      aspect: "free",
    },
  });
  function normalizeRecipe(raw) {
    const result = defaultRecipe();
    const geometry = raw?.geometry || {};
    const x = clamp(geometry.crop?.x, 0, 0.98, 0);
    const y = clamp(geometry.crop?.y, 0, 0.98, 0);
    result.geometry.crop = {
      x,
      y,
      w: clamp(geometry.crop?.w, 0.02, 1 - x, 1),
      h: clamp(geometry.crop?.h, 0.02, 1 - y, 1),
    };
    const aspect =
      typeof geometry.aspect === "string" ? geometry.aspect.slice(0, 24) : "";
    result.geometry.aspect = RATIOS.some(([key]) => key === aspect)
      ? aspect
      : "free";
    return result;
  }
  const recipeEqual = (a, b) => JSON.stringify(a) === JSON.stringify(b);
  function hasGeometry(recipe) {
    const g = recipe.geometry;
    const c = g.crop;
    return Boolean(
      g.aspect !== "free" ||
      Math.abs(c.x) > 0.0005 ||
      Math.abs(c.y) > 0.0005 ||
      Math.abs(c.w - 1) > 0.0005 ||
      Math.abs(c.h - 1) > 0.0005,
    );
  }
  function icon(name, extra = "") {
    const common =
      'viewBox="0 0 24 24" fill="none" stroke="currentColor" ' +
      'stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" ' +
      'aria-hidden="true"';
    const paths = {
      adjust:
        '<circle cx="12" cy="12" r="4.2"/><path d="M12 2.4v3M12 18.6v3M2.4 12h3M18.6 12h3M5.2 5.2l2.1 2.1M16.7 16.7l2.1 2.1M18.8 5.2l-2.1 2.1M7.3 16.7l-2.1 2.1"/>',
      crop: '<path d="M6.8 2.5v14.7h14.7M2.5 6.8h14.7v14.7"/>',
      undo: '<path d="M8.2 7.1 3.8 11.5l4.4 4.4"/><path d="M4.2 11.5h9.2a5.6 5.6 0 0 1 5.6 5.6v.6"/>',
      redo: '<path d="m15.8 7.1 4.4 4.4-4.4 4.4"/><path d="M19.8 11.5H10.6A5.6 5.6 0 0 0 5 17.1v.6"/>',
      mirror:
        '<path d="M3.5 19.5 10 4.5v15M20.5 19.5 14 4.5v15"/><path d="M12 2.5v19"/>',
      flip: '<path d="M3.3 5h17.4M5.5 2.8 3.2 5l2.3 2.2M18.5 2.8 20.8 5l-2.3 2.2"/><path d="M11.2 8.1v11H4.2l7-11Z" fill="currentColor" stroke="none"/><path d="M12.8 8.1v11h7l-7-11Z" fill="currentColor" stroke="none"/>',
      perspectiveV:
        '<path d="M7.5 4h9l2.5 16h-14l2.5-16Z"/><path d="M4.5 20h15"/>',
      perspectiveH:
        '<path d="M4 7.5h16L17.5 17h-11L4 7.5Z"/><path d="M4 20h16"/>',
      rotate:
        '<rect x="3.8" y="7.8" width="14" height="12.2" rx="2.4"/><path d="M18.5 11V7.2a4.8 4.8 0 0 0-4.8-4.8h-.9"/><path d="M15.3 1 12.9 2.4l2.4 1.4"/>',
      compare:
        '<path d="M2.8 12s3.4-5.2 9.2-5.2 9.2 5.2 9.2 5.2-3.4 5.2-9.2 5.2S2.8 12 2.8 12Z"/><circle cx="12" cy="12" r="2.4"/><path d="m4.3 20 15.4-16"/>',
      ratio:
        '<rect x="5.2" y="4.2" width="13.6" height="15.6" rx="1.1"/><path d="M5.2 9h3.2M15.6 15h3.2"/>',
      exposure:
        '<circle cx="12" cy="12" r="7.2"/><path d="M12 4.8v14.4M7 7l10 10"/>',
      highlights:
        '<circle cx="12" cy="12" r="4"/><path d="M12 2.5v3M12 18.5v3M2.5 12h3M18.5 12h3M5.2 5.2l2.1 2.1M16.7 16.7l2.1 2.1M18.8 5.2l-2.1 2.1M7.3 16.7l-2.1 2.1"/>',
      shadows:
        '<path d="M3 10.2c3.3 0 4.5-2.2 7-2.2s3.7 2.2 7 2.2 4-1.5 4-1.5v5.8c0 3.7-3 6-6.6 6h-4.8C6 20.5 3 18.2 3 14.5v-4.3Z"/><path d="M5.3 8 6.6 3.2M10.2 7 11.3 3M15 7l1-3.5"/>',
      contrast:
        '<circle cx="12" cy="12" r="8.2"/><path d="M12 3.8v16.4A8.2 8.2 0 0 0 12 3.8Z" fill="currentColor" stroke="none"/>',
      brightness:
        '<circle cx="12" cy="12" r="4.2"/><path d="M12 2.4v2.5M12 19.1v2.5M2.4 12h2.5M19.1 12h2.5M5.2 5.2l1.8 1.8M17 17l1.8 1.8M18.8 5.2 17 7M7 17l-1.8 1.8"/>',
      blackPoint:
        '<path d="M4 18.5 8.2 5.5h7.6l4.2 13"/><path d="M9 14h6M4 21h16"/>',
      saturation:
        '<circle cx="9.2" cy="9.2" r="5"/><circle cx="14.8" cy="14.8" r="5"/>',
      vibrance:
        '<circle cx="8.2" cy="10" r="4.2"/><circle cx="14.4" cy="8.6" r="4.2"/><circle cx="13.8" cy="15.2" r="4.2"/>',
      temperature:
        '<path d="M10 14.7V4.4a2 2 0 0 1 4 0v10.3a4.6 4.6 0 1 1-4 0Z"/><path d="M12 7v9"/>',
      tint: '<path d="M7 4.2h10M9.4 4.2v6.2L5.3 17a2.1 2.1 0 0 0 1.8 3.2h9.8a2.1 2.1 0 0 0 1.8-3.2l-4.1-6.6V4.2"/>',
      sharpness:
        '<path d="m12 3 2.4 6.6L21 12l-6.6 2.4L12 21l-2.4-6.6L3 12l6.6-2.4L12 3Z"/>',
      clarity:
        '<path d="M3.5 15.5c3.5-7.5 10.5-8 17-2.5"/><path d="M3.5 19c3.5-4.2 10-4.8 17-1.2"/><path d="M6 5.5h5"/>',
      noiseReduction:
        '<path d="M4 7h2.2l2 10 2.5-7 2.4 7 2.1-10H20"/><path d="M4 20h16M4 4h16"/>',
      vignette:
        '<rect x="4" y="3.5" width="16" height="17" rx="2.5"/><circle cx="12" cy="12" r="5.6"/>',
    };
    return `<svg ${common}${extra}>${paths[name] || paths.adjust}</svg>`;
  }

  const EDITOR_HTML = `
    <div class="pe-title-drag-surface" data-pe-title-drag aria-hidden="true"></div>
    <header class="pe-header">
      <div class="pe-head-left">
        <button class="pe-text-button" data-pe-cancel type="button">取消</button>
        <button class="pe-icon-button" data-pe-undo type="button" aria-label="撤销">${icon("undo")}</button>
        <button class="pe-icon-button" data-pe-redo type="button" aria-label="重做">${icon("redo")}</button>
        <button class="pe-reset-crop" data-pe-reset-crop type="button">还原</button>
      </div>
      <div class="pe-head-right">
        <button class="pe-video-cover-button" data-pe-reset-video-cover type="button" hidden>恢复默认封面</button>
        <button class="pe-video-cover-button" data-pe-set-video-cover type="button" hidden>设为视频封面</button>
        <button class="pe-text-button pe-done" data-pe-done type="button" disabled>完成</button>
      </div>
    </header>
    <div class="pe-workspace">
      <div class="pe-stage" data-pe-stage>
        <div class="pe-image-shell" data-pe-image-shell>
          <canvas data-pe-canvas aria-label="照片编辑预览"></canvas>
          <div class="pe-crop-overlay" data-pe-crop-overlay hidden>
            <div class="pe-crop-shade is-left"></div>
            <div class="pe-crop-shade is-right"></div>
            <div class="pe-crop-shade is-top"></div>
            <div class="pe-crop-shade is-bottom"></div>
            <div class="pe-crop-frame" data-pe-crop-frame tabindex="0">
              <span class="pe-grid is-one"></span><span class="pe-grid is-two"></span>
              <span class="pe-grid is-three"></span><span class="pe-grid is-four"></span>
              <button data-pe-handle="nw" class="pe-handle is-nw" type="button" aria-label="左上裁剪"></button>
              <button data-pe-handle="n" class="pe-handle is-n" type="button" aria-label="上边裁剪"></button>
              <button data-pe-handle="ne" class="pe-handle is-ne" type="button" aria-label="右上裁剪"></button>
              <button data-pe-handle="e" class="pe-handle is-e" type="button" aria-label="右边裁剪"></button>
              <button data-pe-handle="se" class="pe-handle is-se" type="button" aria-label="右下裁剪"></button>
              <button data-pe-handle="s" class="pe-handle is-s" type="button" aria-label="下边裁剪"></button>
              <button data-pe-handle="sw" class="pe-handle is-sw" type="button" aria-label="左下裁剪"></button>
              <button data-pe-handle="w" class="pe-handle is-w" type="button" aria-label="左边裁剪"></button>
            </div>
          </div>
          <div class="pe-loading">正在准备照片…</div>
        </div>
      </div>
      <aside class="pe-crop-toolbar" data-pe-crop-rail aria-label="裁剪比例">
        <div class="pe-primary-crop-menu">
          <div class="pe-control-list pe-crop-controls is-primary"
            data-pe-crop-controls role="radiogroup" aria-label="裁剪比例"></div>
          <div class="pe-aspect-orientation pe-primary-orientation" hidden>
            <button data-pe-orientation="landscape" type="button" aria-label="横向比例">
              横
            </button>
            <button data-pe-orientation="portrait" type="button" aria-label="竖向比例">
              竖
            </button>
          </div>
        </div>
      </aside>
    </div>
    <div class="pe-video-timeline" data-pe-video-timeline hidden>
      <span class="pe-video-time" data-pe-video-time>0:00</span>
      <input class="pe-video-seek" data-pe-video-seek type="range"
        min="0" max="0" step="0.01" value="0" aria-label="视频预览进度">
      <span class="pe-video-duration" data-pe-video-duration>0:00</span>
    </div>
  `;

  function bilerp(data, width, height, x, y, output) {
    const px = clamp(x * (width - 1), 0, width - 1, 0);
    const py = clamp(y * (height - 1), 0, height - 1, 0);
    const x0 = Math.floor(px);
    const y0 = Math.floor(py);
    const x1 = Math.min(width - 1, x0 + 1);
    const y1 = Math.min(height - 1, y0 + 1);
    const fx = px - x0;
    const fy = py - y0;
    const i00 = (y0 * width + x0) * 4;
    const i10 = (y0 * width + x1) * 4;
    const i01 = (y1 * width + x0) * 4;
    const i11 = (y1 * width + x1) * 4;
    const mix = (a, b, c, d) =>
      (a * (1 - fx) + b * fx) * (1 - fy) + (c * (1 - fx) + d * fx) * fy;
    output.r = mix(data[i00], data[i10], data[i01], data[i11]);
    output.g = mix(data[i00 + 1], data[i10 + 1], data[i01 + 1], data[i11 + 1]);
    output.b = mix(data[i00 + 2], data[i10 + 2], data[i01 + 2], data[i11 + 2]);
    output.a = mix(data[i00 + 3], data[i10 + 3], data[i01 + 3], data[i11 + 3]);
    return output;
  }

  function waitForImageReady(image) {
    return new Promise((resolve) => {
      let settled = false;
      const finish = () => {
        if (settled) return;
        settled = true;
        image.removeEventListener("load", finish);
        image.removeEventListener("error", finish);
        requestAnimationFrame(resolve);
      };
      image.addEventListener("load", finish, { once: true });
      image.addEventListener("error", finish, { once: true });
      if (image.complete && image.naturalWidth > 0) finish();
      else setTimeout(finish, 1200);
    });
  }

  function formatVideoTime(seconds) {
    const total = Math.max(0, Math.floor(Number(seconds) || 0));
    const minutes = Math.floor(total / 60);
    const remainder = total % 60;
    return `${minutes}:${String(remainder).padStart(2, "0")}`;
  }

  class PhotoEditor {
    constructor() {
      const host = document.createElement("div");
      host.className = "photo-editor";
      host.hidden = true;
      host.innerHTML = EDITOR_HTML;
      document.body.appendChild(host);
      this.el = host;
      this.stage = host.querySelector("[data-pe-stage]");
      this.titleDragSurface = host.querySelector("[data-pe-title-drag]");
      this.shell = host.querySelector("[data-pe-image-shell]");
      this.cropRail = host.querySelector("[data-pe-crop-rail]");
      this.canvas = host.querySelector("[data-pe-canvas]");
      this.ctx = this.canvas.getContext("2d", { willReadFrequently: true });
      this.pendingCanvasWidth = 0;
      this.pendingCanvasHeight = 0;
      this.cropOverlay = host.querySelector("[data-pe-crop-overlay]");
      this.cropFrame = host.querySelector("[data-pe-crop-frame]");
      this.aspectOrientation = host.querySelector(".pe-aspect-orientation");
      this.cropList = host.querySelector(".pe-crop-controls");
      this.doneButton = host.querySelector("[data-pe-done]");
      this.setVideoCoverButton = host.querySelector(
        "[data-pe-set-video-cover]",
      );
      this.resetVideoCoverButton = host.querySelector(
        "[data-pe-reset-video-cover]",
      );
      this.resetCropButton = host.querySelector("[data-pe-reset-crop]");
      this.videoTimeline = host.querySelector("[data-pe-video-timeline]");
      this.videoTime = host.querySelector("[data-pe-video-time]");
      this.videoDuration = host.querySelector("[data-pe-video-duration]");
      this.videoSeek = host.querySelector("[data-pe-video-seek]");
      this.loading = host.querySelector(".pe-loading");
      const cropRows = [["free", "自由裁剪"], ...RATIOS]
        .map(
          ([ratio, label]) => `
        <div class="pe-control-row" data-pe-crop-row="${ratio}">
          <button class="pe-control" data-pe-ratio="${ratio}"
            type="button" role="radio" aria-checked="false" aria-label="${label}">
            <span class="pe-ratio-text">${label}</span>
          </button>
        </div>
      `,
        )
        .join("");
      this.cropList.innerHTML = cropRows;
      this.activeMode = "crop";
      this.portraitRatio = false;
      this.open = false;
      this.dragging = null;
      this.renderFrame = 0;
      this.pendingRenderQuality = 0;
      this.previewCanvas = document.createElement("canvas");
      this.previewCtx = this.previewCanvas.getContext("2d");
      this.closeTimer = 0;
      this.closePromise = null;
      this.editorZoom = 1;
      this.editorPanX = 0;
      this.editorPanY = 0;
      this.editorPanDrag = null;
      this.source = null;
      this.sourceData = null;
      this.video = null;
      this.videoSeekToken = 0;
      this.videoTimelineTouched = false;
      this.videoPoster = null;
      this.videoPosterInitial = null;
      this.videoCoverAction = null;
      this.videoCoverFrameTime = null;
      this.history = [];
      this.redoStack = [];
      this.gestureStart = null;
      this.onExit = null;
      this.onSaved = null;
      this.onBeforeExit = null;
      this.item = null;
      this.isVideo = false;
      this.returnTarget = null;
      this.returnClipRect = null;
      this.returnAspect = 1;
      this.exitTargetRect = null;
      this.exitClipRect = null;
      this.revision = 0;
      this.persisted = false;
      this.recipe = defaultRecipe();
      this.initial = defaultRecipe();
      this.bind();
    }

    bind() {
      this.el.querySelectorAll("[data-pe-cancel]").forEach((button) => {
        button.addEventListener("click", () => this.cancel());
      });
      this.el
        .querySelector("[data-pe-undo]")
        .addEventListener("click", () => this.undo());
      this.el
        .querySelector("[data-pe-redo]")
        .addEventListener("click", () => this.redo());
      this.resetCropButton.addEventListener("click", () => {
        this.mutate(() => {
          const g = this.recipe.geometry;
          g.crop = { x: 0, y: 0, w: 1, h: 1 };
          g.aspect = "free";
        });
        this.syncMode();
        this.layout();
      });
      this.setVideoCoverButton.addEventListener("click", (event) => {
        event.preventDefault();
        event.stopPropagation();
        if (!this.isVideo || !this.video) return;
        this.videoTimelineTouched = true;
        this.videoCoverAction = "set";
        this.videoCoverFrameTime = clamp(
          this.video.currentTime,
          0,
          Number(this.video.duration) || 0,
          0,
        );
        this.syncVideoCoverControls();
        this.syncHeader();
      });
      this.resetVideoCoverButton.addEventListener("click", (event) => {
        event.preventDefault();
        event.stopPropagation();
        if (!this.isVideo || !this.videoPosterInitial) return;
        this.videoCoverAction = "reset";
        this.videoCoverFrameTime = null;
        this.syncVideoCoverControls();
        this.syncHeader();
      });
      this.doneButton.addEventListener("click", () => {
        if (this.persisted && !this.hasPendingChanges()) {
          this.revertPersisted().catch((error) => alert(error.message));
        } else {
          this.finish().catch((error) => alert(error.message));
        }
      });
      this.cropList.addEventListener("click", (event) => {
        const button = event.target.closest("[data-pe-ratio]");
        if (!button) return;
        this.setAspect(button.dataset.peRatio);
      });
      this.el.querySelectorAll("[data-pe-orientation]").forEach((button) => {
        button.addEventListener("click", () => {
          this.portraitRatio = button.dataset.peOrientation === "portrait";
          this.syncRatioButtons();
          const current = this.recipe.geometry.aspect;
          if (current !== "free" && current !== "original") {
            this.setAspect(current, { preserveOrientation: true });
          }
        });
      });
      this.bindCropFrame();
      this.bindEditorZoom();
      this.bindTitlebar();
      this.videoSeek?.addEventListener("input", () => {
        if (!this.isVideo || !this.video) return;
        this.videoTimelineTouched = true;
        const time = clamp(
          Number(this.videoSeek.value),
          0,
          Number(this.video.duration) || 0,
          0,
        );
        this.syncVideoTimeline(time);
        this.syncVideoCoverControls();
        void this.seekVideoPreview(time);
      });
      this.videoSeek?.addEventListener("pointerdown", () => {
        if (!this.isVideo || !this.video) return;
        this.videoTimelineTouched = true;
        this.syncVideoCoverControls();
      });
      this.videoSeek?.addEventListener("keydown", (event) => {
        if (
          !this.isVideo ||
          !this.video ||
          ![
            "ArrowLeft",
            "ArrowRight",
            "ArrowUp",
            "ArrowDown",
            "Home",
            "End",
            "PageUp",
            "PageDown",
          ].includes(event.key)
        )
          return;
        this.videoTimelineTouched = true;
        this.syncVideoCoverControls();
      });
      window.addEventListener("resize", () => {
        if (this.open) this.layout();
      });
      document.addEventListener(
        "keydown",
        (event) => {
          if (!this.open) return;
          this.handleKeydown(event);
        },
        true,
      );
    }

    async show(
      item,
      {
        onExit,
        onSaved,
        onBeforeExit,
        transition = null,
        previewTime = null,
      } = {},
    ) {
      const response = await fetch(`/api/edit/${item.id}`, {
        cache: "no-store",
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        const error = new Error(payload.error || "这个项目不可编辑");
        error.code = response.status;
        throw error;
      }
      this.item = item;
      this.isVideo = item.kind === "video";
      this.videoPoster = payload.videoPoster
        ? clone(payload.videoPoster)
        : null;
      this.videoPosterInitial = this.videoPoster
        ? clone(this.videoPoster)
        : null;
      this.videoCoverAction = null;
      this.videoCoverFrameTime = null;
      this.videoTimelineTouched = false;
      this.initialVideoTime = Number.isFinite(Number(previewTime))
        ? Number(previewTime)
        : Number.isFinite(Number(payload.videoPoster?.frameTime))
          ? Number(payload.videoPoster.frameTime)
          : null;
      this.el.classList.toggle("is-video", this.isVideo);
      this.canvas.setAttribute(
        "aria-label",
        this.isVideo ? "视频裁剪预览" : "照片裁剪预览",
      );
      this.loading.textContent = this.isVideo
        ? "正在准备视频画面…"
        : "正在准备照片…";
      this.revision = Number(payload.revision) || 0;
      this.persisted = this.revision > 0;
      this.recipe = normalizeRecipe(payload.recipe);
      this.initial = clone(this.recipe);
      this.history = [];
      this.redoStack = [];
      this.activeMode = "crop";
      this.portraitRatio = false;
      this.resetEditorZoom();
      this.onExit = onExit || null;
      this.onSaved = onSaved || null;
      this.onBeforeExit = onBeforeExit || null;
      this.returnTarget = transition?.rect ? { ...transition.rect } : null;
      this.returnClipRect = transition?.clipRect
        ? { ...transition.clipRect }
        : null;
      this.returnAspect =
        transition?.rect?.width > 0 && transition?.rect?.height > 0
          ? transition.rect.width / transition.rect.height
          : 1;
      this.exitTargetRect = null;
      this.exitClipRect = null;
      this.el.hidden = false;
      this.el.inert = false;
      this.el.classList.remove("is-closing");
      this.open = true;
      this.closePromise = null;
      this.loading.hidden = false;
      this.videoTimeline.hidden = true;
      this.releaseVideoSource();
      this.item.editRevision = this.revision;
      this.item.videoPosterRevision =
        Number(payload.videoPoster?.revision) || 0;
      this.syncMode();
      this.syncHeader();
      this.syncRatioButtons();
      await this.loadSource();
      this.loading.hidden = true;
      this.syncVideoCoverControls();
      this.syncHeader();
      this.layout();
      this.canvas.style.opacity = transition ? "0" : "1";
      const entryMotion = this.animateImageEntry(transition);
      requestAnimationFrame(() => this.el.classList.add("is-open"));
      await entryMotion;
      this.canvas.style.opacity = "1";
      await new Promise((resolve) =>
        requestAnimationFrame(() => {
          requestAnimationFrame(resolve);
        }),
      );
      await this.fadeEntryFlight();
      return this;
    }

    animateImageEntry(transition) {
      if (!transition?.src || !transition?.rect) return Promise.resolve();
      const target = this.canvas.getBoundingClientRect();
      if (target.width < 2 || target.height < 2) return Promise.resolve();
      const image = document.createElement("img");
      image.className = "pe-flight-photo";
      image.alt = "";
      image.draggable = false;
      image.src = transition.src;
      Object.assign(image.style, {
        left: `${target.left}px`,
        top: `${target.top}px`,
        width: `${target.width}px`,
        height: `${target.height}px`,
        opacity: "0",
      });
      const dx = transition.rect.left - target.left;
      const dy = transition.rect.top - target.top;
      const sx = transition.rect.width / target.width;
      const sy = transition.rect.height / target.height;
      const clip = transition.clipRect;
      const clipPercent = (value, start, size) =>
        `${Math.max(0, Math.min(0.5, (value - start) / Math.max(1, size))) * 100}%`;
      const startClip = clip
        ? `inset(${clipPercent(
            clip.top,
            transition.rect.top,
            transition.rect.height,
          )} ${clipPercent(
            transition.rect.left + transition.rect.width,
            clip.right,
            transition.rect.width,
          )} ${clipPercent(
            transition.rect.top + transition.rect.height,
            clip.bottom,
            transition.rect.height,
          )} ${clipPercent(
            clip.left,
            transition.rect.left,
            transition.rect.width,
          )})`
        : "inset(0)";
      const startTransform = `translate3d(${dx}px, ${dy}px, 0) scale(${sx}, ${sy})`;
      image.style.transform = startTransform;
      image.style.clipPath = startClip;
      document.body.appendChild(image);
      const reduced = window.matchMedia(
        "(prefers-reduced-motion: reduce)",
      ).matches;
      const ready = waitForImageReady(image);
      const motion = ready.then(() => {
        image.style.opacity = "1";
        const duration = reduced ? 1 : 320;
        const animation = image.animate(
          [
            {
              transform: startTransform,
              clipPath: startClip,
              borderRadius: "5px",
              opacity: 1,
            },
            {
              transform: "translate3d(0, 0, 0) scale(1, 1)",
              clipPath: "inset(0)",
              borderRadius: "0px",
              opacity: 1,
            },
          ],
          {
            duration,
            easing: "cubic-bezier(0.22, 0.72, 0.2, 1)",
            fill: "forwards",
          },
        );
        this.entryFlight = { image, animation };
        return animation.finished.catch(() => {});
      });
      return motion;
    }

    async fadeEntryFlight() {
      const flight = this.entryFlight;
      if (!flight) return;
      const reduced = window.matchMedia(
        "(prefers-reduced-motion: reduce)",
      ).matches;
      const animation = flight.image.animate([{ opacity: 1 }, { opacity: 0 }], {
        duration: reduced ? 1 : 68,
        easing: "linear",
        fill: "forwards",
      });
      await animation.finished.catch(() => {});
      this.finishEntryFlight();
    }

    finishEntryFlight() {
      const flight = this.entryFlight;
      if (!flight) return;
      this.entryFlight = null;
      try {
        flight.animation.cancel();
      } catch {}
      flight.image.remove();
    }

    sourceUrl() {
      const version = `${Number(this.item?.mtime) || 0}-${Number(this.item?.size) || 0}`;
      return `/api/edit/source/${this.item.id}?v=${version}`;
    }

    async loadSource() {
      if (this.isVideo) {
        await this.loadVideoSource();
        return;
      }
      const image = new Image();
      image.decoding = "async";
      image.src = this.sourceUrl();
      await new Promise((resolve, reject) => {
        if (image.complete && image.naturalWidth > 0) return resolve();
        image.onload = resolve;
        image.onerror = () =>
          reject(
            new Error(
              this.isVideo ? "视频裁剪预览加载失败" : "照片预览加载失败",
            ),
          );
      });
      const max = 1800;
      const scale = Math.min(
        1,
        max / Math.max(image.naturalWidth, image.naturalHeight),
      );
      const sourceCanvas = document.createElement("canvas");
      sourceCanvas.width = Math.max(2, Math.round(image.naturalWidth * scale));
      sourceCanvas.height = Math.max(
        2,
        Math.round(image.naturalHeight * scale),
      );
      const context = sourceCanvas.getContext("2d", {
        willReadFrequently: true,
      });
      context.drawImage(image, 0, 0, sourceCanvas.width, sourceCanvas.height);
      this.source = sourceCanvas;
      this.sourceData = context.getImageData(
        0,
        0,
        sourceCanvas.width,
        sourceCanvas.height,
      );
    }

    videoSourceUrl() {
      const version = `${Number(this.item?.mtime) || 0}-${Number(this.item?.size) || 0}`;
      return `/api/edit/video-source/${this.item.id}?v=${version}`;
    }

    syncVideoTimeline(time = this.video?.currentTime || 0) {
      if (!this.videoTimeline || !this.video) return;
      const duration = Number(this.video.duration) || 0;
      const current = clamp(time, 0, duration, 0);
      this.videoSeek.value = String(current);
      this.videoSeek.style.setProperty(
        "--pe-video-progress",
        `${duration > 0 ? (current / duration) * 100 : 0}%`,
      );
      this.videoTime.textContent = formatVideoTime(current);
      this.videoDuration.textContent = formatVideoTime(duration);
    }

    captureVideoPreviewFrame() {
      const video = this.video;
      if (!video?.videoWidth || !video.videoHeight) return false;
      const max = 1800;
      const scale = Math.min(
        1,
        max / Math.max(video.videoWidth, video.videoHeight),
      );
      const sourceCanvas = document.createElement("canvas");
      sourceCanvas.width = Math.max(2, Math.round(video.videoWidth * scale));
      sourceCanvas.height = Math.max(2, Math.round(video.videoHeight * scale));
      const context = sourceCanvas.getContext("2d", {
        willReadFrequently: true,
      });
      context.drawImage(video, 0, 0, sourceCanvas.width, sourceCanvas.height);
      this.source = sourceCanvas;
      this.sourceData = context.getImageData(
        0,
        0,
        sourceCanvas.width,
        sourceCanvas.height,
      );
      return true;
    }

    async seekVideoPreview(time, { sync = true } = {}) {
      const video = this.video;
      if (!this.isVideo || !video || !Number.isFinite(video.duration)) return;
      const target = clamp(time, 0, video.duration, 0);
      const token = ++this.videoSeekToken;
      video.pause();
      if (sync) this.syncVideoTimeline(target);
      const seeked = new Promise((resolve, reject) => {
        const finish = () => {
          clearTimeout(timer);
          video.removeEventListener("seeked", finish);
          video.removeEventListener("error", fail);
          resolve();
        };
        const fail = () => {
          clearTimeout(timer);
          video.removeEventListener("seeked", finish);
          video.removeEventListener("error", fail);
          reject(new Error("视频画面切换失败"));
        };
        const timer = setTimeout(finish, 2500);
        video.addEventListener("seeked", finish, { once: true });
        video.addEventListener("error", fail, { once: true });
      });
      try {
        video.currentTime = target;
        await seeked;
      } catch {}
      if (token !== this.videoSeekToken || !this.video?.isConnected) return;
      await Promise.race([
        new Promise((resolve) => {
          if (typeof video.requestVideoFrameCallback === "function") {
            video.requestVideoFrameCallback(() => resolve());
          } else {
            requestAnimationFrame(() => requestAnimationFrame(resolve));
          }
        }),
        new Promise((resolve) => setTimeout(resolve, 500)),
      ]);
      if (token !== this.videoSeekToken || !this.video?.isConnected) return;
      if (!this.captureVideoPreviewFrame()) return;
      this.syncVideoTimeline(video.currentTime);
      this.layout();
    }

    async loadVideoSource() {
      this.releaseVideoSource();
      const video = document.createElement("video");
      video.className = "pe-video-source";
      video.preload = "auto";
      video.muted = true;
      video.playsInline = true;
      video.setAttribute("aria-hidden", "true");
      video.src = this.videoSourceUrl();
      this.el.append(video);
      this.video = video;
      await new Promise((resolve, reject) => {
        const finish = () => {
          clearTimeout(timer);
          video.removeEventListener("loadedmetadata", finish);
          video.removeEventListener("error", fail);
          resolve();
        };
        const fail = () => {
          clearTimeout(timer);
          video.removeEventListener("loadedmetadata", finish);
          video.removeEventListener("error", fail);
          reject(new Error("视频裁剪预览加载失败"));
        };
        const timer = setTimeout(fail, 15000);
        video.addEventListener("loadedmetadata", finish, { once: true });
        video.addEventListener("error", fail, { once: true });
        if (video.readyState >= 1) finish();
      });
      const duration = Number(video.duration) || 0;
      this.videoSeek.min = "0";
      this.videoSeek.max = String(Math.max(0.01, duration));
      this.videoSeek.step = "0.01";
      this.videoTimeline.hidden = false;
      const initial =
        this.initialVideoTime != null
          ? clamp(this.initialVideoTime, 0, Math.max(0, duration - 0.02), 0)
          : duration > 0
            ? Math.min(
                Math.max(duration * 0.1, 0.05),
                Math.max(0, duration - 0.02),
              )
            : 0;
      this.syncVideoTimeline(initial);
      await this.seekVideoPreview(initial);
    }

    releaseVideoSource() {
      this.videoSeekToken += 1;
      if (this.videoTimeline) this.videoTimeline.hidden = true;
      const video = this.video;
      this.video = null;
      if (!video) return;
      try {
        video.pause();
        video.removeAttribute("src");
        video.load();
        video.remove();
      } catch {}
    }

    closeSilently(action = "cancel") {
      if (this.closePromise) return this.closePromise;
      if (this.el.hidden) return Promise.resolve();
      this.entryFlight?.animation?.cancel();
      this.entryFlight = null;
      document
        .querySelectorAll(".pe-flight-photo")
        .forEach((node) => node.remove());
      this.releaseVideoSource();
      this.onBeforeExit?.({ action });
      const exitMotion = this.animateEditorExit(action);
      this.open = false;
      this.el.inert = true;
      this.el.classList.add("is-closing");
      this.el.classList.remove("is-open");
      const fadeMotion = new Promise((resolve) => {
        let settled = false;
        const finish = () => {
          if (settled) return;
          settled = true;
          this.el.removeEventListener("transitionend", onEnd);
          clearTimeout(this.closeTimer);
          this.closeTimer = 0;
          resolve();
        };
        const onEnd = (event) => {
          if (event.target === this.el && event.propertyName === "opacity")
            finish();
        };
        this.el.addEventListener("transitionend", onEnd);
        const reduced = window.matchMedia(
          "(prefers-reduced-motion: reduce)",
        ).matches;
        this.closeTimer = setTimeout(finish, reduced ? 1 : 320);
      });
      this.closePromise = Promise.all([fadeMotion, exitMotion]).then(() => {
        this.el.hidden = true;
        this.el.classList.remove("is-closing");
        this.closePromise = null;
        if (this.renderFrame) cancelAnimationFrame(this.renderFrame);
        this.renderFrame = 0;
      });
      return this.closePromise;
    }

    async animateEditorExit(action = "cancel") {
      if (
        !this.returnTarget &&
        !this.returnClipRect &&
        !this.exitTargetRect &&
        !this.exitClipRect
      )
        return;
      const cropMode = this.activeMode === "crop";
      const startElement = cropMode ? this.cropFrame : this.canvas;
      const start = startElement.getBoundingClientRect();
      if (start.width < 2 || start.height < 2) return;
      let source = "";
      let sourceWidth = this.canvas.width;
      let sourceHeight = this.canvas.height;
      try {
        if (cropMode) {
          const crop = this.recipe.geometry.crop;
          sourceWidth = Math.max(2, Math.round(this.canvas.width * crop.w));
          sourceHeight = Math.max(2, Math.round(this.canvas.height * crop.h));
          const cropped = document.createElement("canvas");
          cropped.width = sourceWidth;
          cropped.height = sourceHeight;
          cropped
            .getContext("2d")
            .drawImage(
              this.canvas,
              this.canvas.width * crop.x,
              this.canvas.height * crop.y,
              this.canvas.width * crop.w,
              this.canvas.height * crop.h,
              0,
              0,
              sourceWidth,
              sourceHeight,
            );
          source = cropped.toDataURL("image/png");
        } else {
          source = this.canvas.toDataURL("image/png");
        }
      } catch {
        return;
      }
      const image = document.createElement("img");
      image.className = "pe-flight-photo is-return";
      image.alt = "";
      image.draggable = false;
      image.src = source;
      const editorStage = this.stage.getBoundingClientRect();
      const clipPercent = (value, startValue, size) =>
        `${Math.max(0, Math.min(0.5, (value - startValue) / Math.max(1, size))) * 100}%`;
      const startClip = `inset(${clipPercent(
        editorStage.top,
        start.top,
        start.height,
      )} ${clipPercent(start.right, editorStage.right, start.width)} ${clipPercent(
        start.bottom,
        editorStage.bottom,
        start.height,
      )} ${clipPercent(editorStage.left, start.left, start.width)})`;
      Object.assign(image.style, {
        left: `${start.left}px`,
        top: `${start.top}px`,
        width: `${start.width}px`,
        height: `${start.height}px`,
        clipPath: startClip,
      });
      document.body.appendChild(image);
      await waitForImageReady(image);
      let target = this.exitTargetRect || this.returnTarget;
      const clipRect = this.exitClipRect || this.returnClipRect;
      if (!this.exitTargetRect && clipRect) {
        const stageWidth = clipRect.right - clipRect.left;
        const stageHeight = clipRect.bottom - clipRect.top;
        const aspect =
          action === "done"
            ? sourceWidth / Math.max(1, sourceHeight)
            : this.returnAspect;
        let width = stageWidth;
        let height = width / Math.max(0.01, aspect);
        if (height > stageHeight) {
          height = stageHeight;
          width = height * aspect;
        }
        target = {
          left: clipRect.left + (stageWidth - width) / 2,
          top: clipRect.top + (stageHeight - height) / 2,
          width,
          height,
        };
      }
      const dx = target.left - start.left;
      const dy = target.top - start.top;
      const sx = target.width / start.width;
      const sy = target.height / start.height;
      const reduced = window.matchMedia(
        "(prefers-reduced-motion: reduce)",
      ).matches;
      const duration = reduced ? 1 : 320;
      const animation = image.animate(
        [
          {
            transform: "translate3d(0, 0, 0) scale(1, 1)",
            clipPath: startClip,
            borderRadius: "0px",
            opacity: 1,
          },
          {
            transform: `translate3d(${dx}px, ${dy}px, 0) scale(${sx}, ${sy})`,
            clipPath: "inset(0)",
            borderRadius: "5px",
            opacity: 1,
            offset: 0.82,
          },
          {
            transform: `translate3d(${dx}px, ${dy}px, 0) scale(${sx}, ${sy})`,
            clipPath: "inset(0)",
            borderRadius: "5px",
            opacity: 0,
          },
        ],
        {
          duration,
          easing: "cubic-bezier(0.24, 0.76, 0.2, 1)",
          fill: "forwards",
        },
      );
      await animation.finished.catch(() => {});
      image.remove();
    }

    async cancel() {
      if (!this.open) return;
      const item = this.item;
      await this.closeSilently("cancel");
      this.onExit?.({ action: "cancel", item });
    }

    async finish() {
      if (!this.open || this.doneButton.disabled) return;
      const item = this.item;
      const recipe = clone(this.recipe);
      const hasVideoPosterChange =
        this.isVideo && this.videoCoverAction != null;
      const videoPoster =
        this.videoCoverAction === "reset"
          ? null
          : this.videoCoverAction === "set"
            ? { frameTime: this.videoCoverFrameTime }
            : undefined;
      this.doneButton.disabled = true;
      try {
        const response = await fetch(`/api/edit/${item.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            recipe,
            ...(hasVideoPosterChange ? { videoPoster } : {}),
          }),
        });
        const result = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(result.error || "保存编辑失败");
        item.editRevision = Number(result.revision) || 0;
        if (this.isVideo && hasVideoPosterChange) {
          this.videoPoster = result.videoPoster
            ? clone(result.videoPoster)
            : null;
          this.videoPosterInitial = this.videoPoster
            ? clone(this.videoPoster)
            : null;
          item.videoPosterRevision = Number(result.videoPoster?.revision) || 0;
          item.videoPosterFrameTime = result.videoPoster
            ? Number(result.videoPoster.frameTime) || 0
            : null;
        }
        const exitTransition = await this.onSaved?.({
          action: "save",
          item,
          recipe: result.recipe || recipe,
          revision: item.editRevision,
          videoPoster: this.videoPoster,
        });
        this.exitTargetRect = exitTransition?.rect || null;
        this.exitClipRect = exitTransition?.clipRect || null;
        await this.closeSilently("done");
        this.onExit?.({
          action: "done",
          item,
          recipe: result.recipe || recipe,
          revision: item.editRevision,
          videoPoster: this.videoPoster,
        });
      } catch (error) {
        this.doneButton.disabled = false;
        this.syncHeader();
        throw error;
      }
    }

    async revertPersisted() {
      if (!this.open || !this.persisted) return;
      const item = this.item;
      const before = clone(this.recipe);
      const response = await fetch(`/api/edit/${item.id}`, {
        method: "DELETE",
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error || "复原失败");
      this.history.push(before);
      this.redoStack.length = 0;
      this.revision = 0;
      this.persisted = false;
      item.editRevision = 0;
      this.recipe = defaultRecipe();
      this.initial = clone(this.recipe);
      this.onSaved?.({
        action: "revert",
        item,
        recipe: this.recipe,
        revision: 0,
        videoPoster: result.videoPoster || null,
      });
      this.syncHeader();
      this.syncControlSelection();
      this.layout();
    }

    syncCropPanel() {
      const geometry = this.recipe.geometry;
      this.el.querySelectorAll("[data-pe-ratio]").forEach((button) => {
        const selected = button.dataset.peRatio === geometry.aspect;
        button.classList.toggle("is-selected", selected);
        button.classList.toggle("is-active", selected);
        button
          .closest(".pe-control-row")
          ?.classList.toggle("is-active", selected);
        button.setAttribute("aria-checked", String(selected));
      });
      const fixedAspect =
        geometry.aspect !== "free" &&
        geometry.aspect !== "original" &&
        geometry.aspect !== "square";
      this.aspectOrientation.hidden = !fixedAspect;
      this.aspectOrientation
        .querySelectorAll("[data-pe-orientation]")
        .forEach((button) => {
          const selected =
            (button.dataset.peOrientation === "portrait") ===
            this.portraitRatio;
          button.classList.toggle("is-selected", selected);
          button.setAttribute("aria-pressed", String(selected));
        });
    }

    videoCoverDirty() {
      if (!this.isVideo || !this.videoCoverAction) return false;
      if (this.videoCoverAction === "reset") return !!this.videoPosterInitial;
      if (!this.videoPosterInitial) return true;
      const sameFrame =
        Math.abs(
          Number(this.videoCoverFrameTime) -
            Number(this.videoPosterInitial.frameTime),
        ) < 0.02;
      return (
        !sameFrame || !recipeEqual(this.recipe, this.videoPosterInitial.recipe)
      );
    }

    hasPendingChanges() {
      return !recipeEqual(this.recipe, this.initial) || this.videoCoverDirty();
    }

    syncVideoCoverControls() {
      const showSet =
        this.isVideo &&
        (this.videoTimelineTouched || this.videoCoverAction === "set");
      const showReset = this.isVideo && !!this.videoPosterInitial;
      this.setVideoCoverButton.hidden = !showSet;
      this.resetVideoCoverButton.hidden = !showReset;
      this.setVideoCoverButton.classList.toggle(
        "is-active",
        this.videoCoverAction === "set",
      );
      this.resetVideoCoverButton.classList.toggle(
        "is-active",
        this.videoCoverAction === "reset",
      );
      this.setVideoCoverButton.setAttribute(
        "aria-pressed",
        String(this.videoCoverAction === "set"),
      );
      this.resetVideoCoverButton.setAttribute(
        "aria-pressed",
        String(this.videoCoverAction === "reset"),
      );
    }

    syncHeader() {
      const dirty = this.hasPendingChanges();
      if (dirty) {
        this.doneButton.textContent = "完成";
        this.doneButton.disabled = false;
        this.doneButton.classList.remove("is-revert");
      } else if (this.persisted) {
        this.doneButton.textContent = "复原";
        this.doneButton.disabled = false;
        this.doneButton.classList.add("is-revert");
      } else {
        this.doneButton.textContent = "完成";
        this.doneButton.disabled = true;
        this.doneButton.classList.remove("is-revert");
      }
      const cropDirty = hasGeometry(this.recipe);
      this.resetCropButton.disabled = !cropDirty;
      this.resetCropButton.hidden = false;
      this.syncVideoCoverControls();
      this.syncUndoButtons();
    }

    syncUndoButtons() {
      this.el.querySelector("[data-pe-undo]").disabled =
        this.history.length === 0;
      this.el.querySelector("[data-pe-redo]").disabled =
        this.redoStack.length === 0;
    }

    syncMode({ deferRender = false } = {}) {
      this.el.classList.add("is-crop-mode");
      this.cropRail.hidden = false;
      this.cropOverlay.hidden = false;
      this.syncHeader();
      this.syncControlSelection();
      this.syncCropPanel();
      if (!deferRender) this.scheduleRender();
    }

    syncControlSelection() {
      this.cropList.querySelectorAll(".pe-control").forEach((button) => {
        const key = button.dataset.peRatio;
        const active = key === this.recipe.geometry.aspect;
        button.classList.toggle("is-active", active);
        button
          .closest(".pe-control-row")
          ?.classList.toggle("is-active", active);
      });
    }

    recordGesture() {
      if (!this.gestureStart || recipeEqual(this.gestureStart, this.recipe)) {
        this.gestureStart = null;
        return;
      }
      this.history.push(this.gestureStart);
      this.gestureStart = null;
      this.redoStack.length = 0;
      this.syncUndoButtons();
    }

    mutate(fn) {
      const before = clone(this.recipe);
      fn();
      if (recipeEqual(before, this.recipe)) {
        this.syncHeader();
        return;
      }
      this.history.push(before);
      this.redoStack.length = 0;
      this.syncHeader();
      this.syncCropPanel();
      this.layout();
    }

    undo() {
      if (!this.history.length) return;
      this.redoStack.push(clone(this.recipe));
      this.recipe = this.history.pop();
      this.syncHeader();
      this.syncCropPanel();
      this.layout();
    }

    redo() {
      if (!this.redoStack.length) return;
      this.history.push(clone(this.recipe));
      this.recipe = this.redoStack.pop();
      this.syncHeader();
      this.syncCropPanel();
      this.layout();
    }

    handleKeydown(event) {
      if (!this.open) return;
      if (event.ctrlKey || event.metaKey) {
        if (event.key.toLowerCase() === "z") {
          event.preventDefault();
          event.stopPropagation();
          if (event.shiftKey) this.redo();
          else this.undo();
        }
        return;
      }
      if (event.key === "Escape") {
        event.preventDefault();
        event.stopPropagation();
        this.cancel();
      } else if (event.key === "Tab") {
        const focusable = [
          ...this.el.querySelectorAll('button:not([disabled]), [tabindex="0"]'),
        ].filter(
          (node) =>
            node.getClientRects().length > 0 &&
            getComputedStyle(node).visibility !== "hidden" &&
            getComputedStyle(node).pointerEvents !== "none",
        );
        if (!focusable.length) return;
        const current = focusable.indexOf(document.activeElement);
        if (event.shiftKey && current <= 0) {
          event.preventDefault();
          focusable[focusable.length - 1].focus();
        } else if (!event.shiftKey && current === focusable.length - 1) {
          event.preventDefault();
          focusable[0].focus();
        }
      } else if (event.key === "Enter") {
        event.preventDefault();
        event.stopPropagation();
        if (this.persisted && recipeEqual(this.recipe, this.initial)) {
          this.revertPersisted().catch((error) => alert(error.message));
        } else if (!this.doneButton.disabled) {
          this.finish().catch((error) => alert(error.message));
        }
      }
    }

    setAspect(aspect, { preserveOrientation = false } = {}) {
      this.mutate(() => {
        const geometry = this.recipe.geometry;
        geometry.aspect = aspect;
        if (aspect === "free") return;
        let baseRatio;
        if (aspect === "original") {
          const w = this.source.width;
          const h = this.source.height;
          baseRatio = w / h;
        } else if (aspect === "square") baseRatio = 1;
        else {
          const [w, h] = aspect.split(":").map(Number);
          baseRatio = w / h;
        }
        if (aspect !== "square" && !preserveOrientation) {
          this.portraitRatio = baseRatio < 1;
        }
        const ratio = this.portraitRatio
          ? Math.min(baseRatio, 1 / baseRatio)
          : Math.max(baseRatio, 1 / baseRatio);
        this.fitCropRatio(ratio);
      });
      this.syncRatioButtons();
      this.layout();
    }

    fitCropRatio(ratio) {
      const frameAspect = this.canvas.width / Math.max(1, this.canvas.height);
      let w;
      let h;
      if (ratio >= frameAspect) {
        w = 1;
        h = frameAspect / ratio;
      } else {
        h = 1;
        w = ratio / frameAspect;
      }
      const current = this.recipe.geometry.crop;
      const centerX = current.x + current.w / 2;
      const centerY = current.y + current.h / 2;
      this.recipe.geometry.crop = {
        x: clamp(centerX - w / 2, 0, 1 - w, 0),
        y: clamp(centerY - h / 2, 0, 1 - h, 0),
        w,
        h,
      };
    }

    syncRatioButtons() {
      this.syncCropPanel();
    }

    cropHandleAtPoint(event) {
      const rect = this.cropFrame.getBoundingClientRect();
      const threshold = Math.min(14, rect.width / 3, rect.height / 3);
      const nearLeft = event.clientX - rect.left <= threshold;
      const nearRight = rect.right - event.clientX <= threshold;
      const nearTop = event.clientY - rect.top <= threshold;
      const nearBottom = rect.bottom - event.clientY <= threshold;
      if (nearTop && nearLeft) return "nw";
      if (nearTop && nearRight) return "ne";
      if (nearBottom && nearLeft) return "sw";
      if (nearBottom && nearRight) return "se";
      if (nearTop) return "n";
      if (nearBottom) return "s";
      if (nearLeft) return "w";
      if (nearRight) return "e";
      return "move";
    }

    cropCursor(handle) {
      return (
        {
          nw: "nwse-resize",
          se: "nwse-resize",
          ne: "nesw-resize",
          sw: "nesw-resize",
          n: "ns-resize",
          s: "ns-resize",
          e: "ew-resize",
          w: "ew-resize",
        }[handle] || "move"
      );
    }

    bindCropFrame() {
      this.cropFrame.addEventListener("pointerdown", (event) => {
        if (event.button !== 0) return;
        event.preventDefault();
        event.stopPropagation();
        this.gestureStart = clone(this.recipe);
        const rect = this.cropOverlay.getBoundingClientRect();
        const handle =
          event.target.closest("[data-pe-handle]")?.dataset.peHandle ||
          this.cropHandleAtPoint(event);
        this.dragging = {
          pointerId: event.pointerId,
          handle,
          startX: event.clientX,
          startY: event.clientY,
          rect,
          crop: { ...this.recipe.geometry.crop },
        };
        this.cropFrame.style.cursor = this.cropCursor(handle);
        this.cropOverlay.classList.add("is-adjusting");
        try {
          this.cropFrame.setPointerCapture(event.pointerId);
        } catch {}
      });
      this.cropFrame.addEventListener("pointermove", (event) => {
        const drag = this.dragging;
        if (!drag || drag.pointerId !== event.pointerId) {
          const targetHandle =
            event.target.closest("[data-pe-handle]")?.dataset.peHandle;
          this.cropFrame.style.cursor = this.cropCursor(
            targetHandle || this.cropHandleAtPoint(event),
          );
          return;
        }
        const dx = (event.clientX - drag.startX) / Math.max(1, drag.rect.width);
        const dy =
          (event.clientY - drag.startY) / Math.max(1, drag.rect.height);
        const next = { ...drag.crop };
        const handle = drag.handle;
        const minW = 0.03;
        const minH = 0.03;
        if (handle === "move") {
          next.x = clamp(drag.crop.x + dx, 0, 1 - drag.crop.w, 0);
          next.y = clamp(drag.crop.y + dy, 0, 1 - drag.crop.h, 0);
        } else if (this.recipe.geometry.aspect !== "free") {
          const ratio = this.desiredRatio();
          const frameAspect =
            this.canvas.width / Math.max(1, this.canvas.height);
          if (ratio > 0) {
            const centerX = drag.crop.x + drag.crop.w / 2;
            const centerY = drag.crop.y + drag.crop.h / 2;
            const right = drag.crop.x + drag.crop.w;
            const bottom = drag.crop.y + drag.crop.h;
            let nextWidth;
            let nextHeight;
            if (handle === "e" || handle === "w") {
              const maxWidth = handle === "e" ? 1 - drag.crop.x : right;
              nextWidth = clamp(
                drag.crop.w + (handle === "e" ? dx : -dx),
                minW,
                maxWidth,
                drag.crop.w,
              );
              nextHeight = (nextWidth * frameAspect) / ratio;
              if (nextHeight > 1) {
                nextHeight = 1;
                nextWidth = (nextHeight * ratio) / frameAspect;
              }
              next.x = handle === "e" ? drag.crop.x : right - nextWidth;
              next.y = clamp(centerY - nextHeight / 2, 0, 1 - nextHeight, 0);
            } else if (handle === "n" || handle === "s") {
              const maxHeight = handle === "s" ? 1 - drag.crop.y : bottom;
              nextHeight = clamp(
                drag.crop.h + (handle === "s" ? dy : -dy),
                minH,
                maxHeight,
                drag.crop.h,
              );
              nextWidth = (nextHeight * ratio) / frameAspect;
              if (nextWidth > 1) {
                nextWidth = 1;
                nextHeight = (nextWidth * frameAspect) / ratio;
              }
              next.y = handle === "s" ? drag.crop.y : bottom - nextHeight;
              next.x = clamp(centerX - nextWidth / 2, 0, 1 - nextWidth, 0);
            } else {
              const widthFromX =
                drag.crop.w + (handle.includes("w") ? -dx : dx);
              const widthFromY =
                ((drag.crop.h + (handle.includes("n") ? -dy : dy)) * ratio) /
                frameAspect;
              const maxWidth = handle.includes("w") ? right : 1 - drag.crop.x;
              const maxHeight = handle.includes("n") ? bottom : 1 - drag.crop.y;
              nextWidth =
                Math.abs(dx) >= Math.abs(dy) ? widthFromX : widthFromY;
              nextWidth = clamp(nextWidth, minW, maxWidth, drag.crop.w);
              nextHeight = (nextWidth * frameAspect) / ratio;
              if (nextHeight > maxHeight) {
                nextHeight = maxHeight;
                nextWidth = (nextHeight * ratio) / frameAspect;
              }
              next.x = handle.includes("w") ? right - nextWidth : drag.crop.x;
              next.y = handle.includes("n") ? bottom - nextHeight : drag.crop.y;
            }
            next.w = nextWidth;
            next.h = nextHeight;
          }
        } else {
          if (handle.includes("w")) {
            const right = drag.crop.x + drag.crop.w;
            next.x = clamp(drag.crop.x + dx, 0, right - minW, 0);
            next.w = right - next.x;
          }
          if (handle.includes("e")) {
            next.w = clamp(drag.crop.w + dx, minW, 1 - drag.crop.x, 1);
          }
          if (handle.includes("n")) {
            const bottom = drag.crop.y + drag.crop.h;
            next.y = clamp(drag.crop.y + dy, 0, bottom - minH, 0);
            next.h = bottom - next.y;
          }
          if (handle.includes("s")) {
            next.h = clamp(drag.crop.h + dy, minH, 1 - drag.crop.y, 1);
          }
        }
        const normalized = normalizeRecipe({
          ...this.recipe,
          geometry: { ...this.recipe.geometry, crop: next },
        });
        this.recipe.geometry.crop = normalized.geometry.crop;
        this.layoutCropOverlay();
        this.syncHeader();
      });
      const end = (event) => {
        if (!this.dragging || this.dragging.pointerId !== event.pointerId)
          return;
        try {
          this.cropFrame.releasePointerCapture(event.pointerId);
        } catch {}
        this.dragging = null;
        this.cropFrame.style.cursor = "move";
        this.cropOverlay.classList.remove("is-adjusting");
        this.recordGesture();
        this.syncHeader();
        this.scheduleRender(1);
      };
      this.cropFrame.addEventListener("pointerup", end);
      this.cropFrame.addEventListener("pointercancel", end);
      this.cropFrame.addEventListener("pointerleave", () => {
        if (!this.dragging) this.cropFrame.style.cursor = "move";
      });
    }

    desiredRatio() {
      const aspect = this.recipe.geometry.aspect;
      if (aspect === "free") return 0;
      if (aspect === "square") return 1;
      let ratio;
      if (aspect === "original") {
        ratio = this.source.width / Math.max(1, this.source.height);
      } else {
        const [w, h] = aspect.split(":").map(Number);
        ratio = w / h;
      }
      return this.portraitRatio
        ? Math.min(ratio, 1 / ratio)
        : Math.max(ratio, 1 / ratio);
    }

    scheduleRender(quality = 1) {
      if (!this.open || !this.sourceData) return;
      this.pendingRenderQuality = this.pendingRenderQuality
        ? Math.max(this.pendingRenderQuality, quality)
        : quality;
      if (this.renderFrame) return;
      this.renderFrame = requestAnimationFrame(() => {
        this.renderFrame = 0;
        const renderQuality = this.pendingRenderQuality;
        this.pendingRenderQuality = 0;
        this.render({ quality: renderQuality });
      });
    }

    layout({ deferRender = false } = {}) {
      if (!this.open || !this.source) return;
      const workspace = this.el.querySelector(".pe-workspace");
      const workspaceWidth = workspace.clientWidth;
      const workspaceRect = workspace.getBoundingClientRect();
      const editorRect = this.el.getBoundingClientRect();
      const horizontalInset = 18;
      const bottomInset = 74;
      const toolbarHeight = this.cropRail.offsetHeight || 52;
      const stageTopGlobal = workspaceRect.top + toolbarHeight + 10;
      const stageBottomGlobal = workspaceRect.bottom - bottomInset;
      const headerHeight = Math.max(0, workspaceRect.top - editorRect.top);
      const availableW = Math.max(120, workspaceWidth - horizontalInset * 2);
      const availableH = Math.max(100, stageBottomGlobal - stageTopGlobal);
      const stageWidth = availableW;
      const stageHeight = availableH;
      const stageLeft = horizontalInset;
      const stageTop = Math.round(stageTopGlobal - workspaceRect.top);
      this.el.style.setProperty(
        "--pe-title-band-center",
        `${headerHeight / 2}px`,
      );
      this.titleDragSurface.style.height = `${Math.round(headerHeight)}px`;
      this.stage.style.left = `${Math.round(stageLeft)}px`;
      this.stage.style.top = `${Math.round(stageTop)}px`;
      this.stage.style.width = `${Math.round(stageWidth)}px`;
      this.stage.style.height = `${Math.round(stageHeight)}px`;
      this.stage.style.right = "auto";
      this.stage.style.bottom = "auto";
      const stageRect = this.stage.getBoundingClientRect();
      const displayAspect = this.source.width / Math.max(1, this.source.height);
      const photoSpaceW = Math.max(120, stageRect.width);
      const photoSpaceH = Math.max(100, stageRect.height);
      let canvasWidth = photoSpaceW;
      let canvasHeight = canvasWidth / displayAspect;
      if (canvasHeight > photoSpaceH) {
        canvasHeight = photoSpaceH;
        canvasWidth = canvasHeight * displayAspect;
      }
      canvasWidth = Math.max(24, Math.round(canvasWidth));
      canvasHeight = Math.max(24, Math.round(canvasHeight));
      /* 照片始终按原比例居中显示，裁剪遮罩只覆盖画布。 */
      const shellWidth = photoSpaceW;
      const shellHeight = photoSpaceH;
      this.shell.style.width = `${Math.round(shellWidth)}px`;
      this.shell.style.height = `${Math.round(shellHeight)}px`;
      const backingScale = clamp(window.devicePixelRatio || 1, 1, 2, 1);
      this.pendingCanvasWidth = Math.min(
        2400,
        Math.round(canvasWidth * backingScale),
      );
      this.pendingCanvasHeight = Math.max(
        2,
        Math.round(this.pendingCanvasWidth / displayAspect),
      );
      this.el.dataset.peBackingScale = String(backingScale.toFixed(2));
      const canvasLeft = Math.round((shellWidth - canvasWidth) / 2);
      const canvasTop = Math.round((shellHeight - canvasHeight) / 2);
      this.canvas.style.left = `${canvasLeft}px`;
      this.canvas.style.top = `${canvasTop}px`;
      this.canvas.style.width = `${canvasWidth}px`;
      this.canvas.style.height = `${canvasHeight}px`;
      this.cropOverlay.style.left = `${canvasLeft}px`;
      this.cropOverlay.style.top = `${canvasTop}px`;
      this.cropOverlay.style.width = `${canvasWidth}px`;
      this.cropOverlay.style.height = `${canvasHeight}px`;
      this.canvas.dataset.peFit = "contain";
      this.shell.style.left = `${Math.round((stageRect.width - shellWidth) / 2)}px`;
      this.shell.style.top = `${Math.round((stageRect.height - shellHeight) / 2)}px`;
      this.applyEditorZoom();
      this.cropOverlay.hidden = false;
      this.layoutCropOverlay();
      this.syncRatioButtons();
      if (!deferRender) this.render();
    }

    bindTitlebar() {
      let press = null;
      let dragging = false;
      let suppressedUntil = 0;
      const toggleFullscreen = async () => {
        if (window.albumWindow?.toggleFullscreen) {
          await window.albumWindow.toggleFullscreen();
        } else {
          document.documentElement.classList.toggle("is-fullscreen");
        }
        await new Promise((resolve) =>
          requestAnimationFrame(() => {
            requestAnimationFrame(resolve);
          }),
        );
      };
      const endMove = () => {
        if (press?.frame) cancelAnimationFrame(press.frame);
        press = null;
        dragging = false;
        window.albumWindow?.endWindowMove?.();
      };
      const moveWindow = () => {
        if (!press?.pos || press.frame) return;
        const pending = press.pending;
        press.frame = requestAnimationFrame(() => {
          if (!press || !pending) return;
          press.frame = 0;
          press.pending = null;
          window.albumWindow?.moveWindow?.(pending[0], pending[1]);
        });
      };

      this.titleDragSurface.addEventListener("pointerdown", (event) => {
        if (event.button !== 0 || event.target.closest?.("button")) return;
        event.preventDefault();
        press = {
          id: event.pointerId,
          x: event.screenX,
          y: event.screenY,
          lastX: event.screenX,
          lastY: event.screenY,
          pos: null,
          pending: null,
          frame: 0,
          fullscreen:
            document.documentElement.classList.contains("is-fullscreen"),
          exitingFullscreen: false,
        };
        dragging = false;
        if (!press.fullscreen) {
          window.albumWindow?.beginWindowMove?.();
          Promise.resolve(window.albumWindow?.getWindowPosition?.())
            .then((position) => {
              if (press && Array.isArray(position)) press.pos = position;
            })
            .catch(() => {});
        }
        try {
          this.titleDragSurface.setPointerCapture(event.pointerId);
        } catch {}
      });
      this.titleDragSurface.addEventListener("pointermove", (event) => {
        if (!press || press.id !== event.pointerId || event.buttons === 0)
          return;
        press.lastX = event.screenX;
        press.lastY = event.screenY;
        const dx = event.screenX - press.x;
        const dy = event.screenY - press.y;
        if (!dragging && Math.hypot(dx, dy) < 4) return;
        if (!dragging) {
          dragging = true;
          if (press.fullscreen && !press.exitingFullscreen) {
            press.exitingFullscreen = true;
            void toggleFullscreen().then(async () => {
              if (!press || !dragging) return;
              window.albumWindow?.beginWindowMove?.();
              const position = await Promise.resolve(
                window.albumWindow?.getWindowPosition?.(),
              ).catch(() => null);
              if (!press || !dragging || !Array.isArray(position)) return;
              press.pos = position;
              press.pending = [
                position[0] + press.lastX - press.x,
                position[1] + press.lastY - press.y,
              ];
              moveWindow();
            });
            return;
          }
        }
        if (press.exitingFullscreen) return;
        if (!press.pos) return;
        press.pending = [press.pos[0] + dx, press.pos[1] + dy];
        moveWindow();
      });
      const release = (event) => {
        if (!press || press.id !== event.pointerId) return;
        const wasDragging = dragging;
        try {
          this.titleDragSurface.releasePointerCapture(event.pointerId);
        } catch {}
        endMove();
        if (wasDragging) suppressedUntil = performance.now() + 350;
      };
      this.titleDragSurface.addEventListener("pointerup", release);
      this.titleDragSurface.addEventListener("pointercancel", release);
      this.titleDragSurface.addEventListener("dblclick", async (event) => {
        if (
          event.target.closest?.("button") ||
          performance.now() < suppressedUntil
        )
          return;
        event.preventDefault();
        event.stopPropagation();
        await toggleFullscreen();
      });
    }

    resetEditorZoom() {
      this.editorZoom = 1;
      this.editorPanX = 0;
      this.editorPanY = 0;
      this.applyEditorZoom();
    }

    applyEditorZoom() {
      if (!this.canvas || !this.shell) return;
      this.editorZoom = clamp(this.editorZoom, 1, 5, 1);
      const maxX = (this.shell.clientWidth * (this.editorZoom - 1)) / 2;
      const maxY = (this.shell.clientHeight * (this.editorZoom - 1)) / 2;
      this.editorPanX = clamp(this.editorPanX, -maxX, maxX, 0);
      this.editorPanY = clamp(this.editorPanY, -maxY, maxY, 0);
      const transformed =
        this.editorZoom > 1.001 ||
        Math.abs(this.editorPanX) > 0.01 ||
        Math.abs(this.editorPanY) > 0.01;
      this.canvas.style.transformOrigin = "center center";
      this.canvas.style.transform = transformed
        ? `translate3d(${this.editorPanX.toFixed(2)}px, ${this.editorPanY.toFixed(2)}px, 0) ` +
          `scale(${this.editorZoom.toFixed(4)})`
        : "";
      this.shell.classList.toggle("is-zoomed", this.editorZoom > 1.001);
      this.shell.dataset.peZoom = this.editorZoom.toFixed(3);
    }

    bindEditorZoom() {
      this.stage.addEventListener(
        "wheel",
        (event) => {
          if (
            !this.open ||
            !(event.target instanceof Element) ||
            !event.target.closest("[data-pe-image-shell]")
          )
            return;
          event.preventDefault();
          event.stopPropagation();
          const factor = Math.exp(
            -event.deltaY * (event.shiftKey ? 0.00055 : 0.0015),
          );
          this.editorZoom = clamp(this.editorZoom * factor, 1, 5, 1);
          if (this.editorZoom <= 1.001) {
            this.editorPanX = 0;
            this.editorPanY = 0;
          }
          this.applyEditorZoom();
        },
        { passive: false },
      );

      this.canvas.addEventListener("pointerdown", (event) => {
        if (
          !this.open ||
          event.button !== 0 ||
          this.editorZoom <= 1.001 ||
          this.activeMode === "crop"
        )
          return;
        event.preventDefault();
        this.editorPanDrag = {
          pointerId: event.pointerId,
          x: event.clientX,
          y: event.clientY,
          panX: this.editorPanX,
          panY: this.editorPanY,
        };
        this.shell.classList.add("is-panning");
        try {
          this.canvas.setPointerCapture(event.pointerId);
        } catch {}
      });
      this.canvas.addEventListener("pointermove", (event) => {
        const drag = this.editorPanDrag;
        if (!drag || drag.pointerId !== event.pointerId) return;
        const maxX = (this.shell.clientWidth * (this.editorZoom - 1)) / 2;
        const maxY = (this.shell.clientHeight * (this.editorZoom - 1)) / 2;
        this.editorPanX = clamp(
          drag.panX + event.clientX - drag.x,
          -maxX,
          maxX,
          0,
        );
        this.editorPanY = clamp(
          drag.panY + event.clientY - drag.y,
          -maxY,
          maxY,
          0,
        );
        this.applyEditorZoom();
      });
      const endPan = (event) => {
        if (
          !this.editorPanDrag ||
          this.editorPanDrag.pointerId !== event.pointerId
        )
          return;
        try {
          this.canvas.releasePointerCapture(event.pointerId);
        } catch {}
        this.editorPanDrag = null;
        this.shell.classList.remove("is-panning");
      };
      this.canvas.addEventListener("pointerup", endPan);
      this.canvas.addEventListener("pointercancel", endPan);
    }

    layoutCropOverlay() {
      if (this.activeMode !== "crop") return;
      const crop = this.recipe.geometry.crop;
      const width = this.cropOverlay.clientWidth;
      const height = this.cropOverlay.clientHeight;
      this.cropFrame.style.left = `${crop.x * width}px`;
      this.cropFrame.style.top = `${crop.y * height}px`;
      this.cropFrame.style.width = `${crop.w * width}px`;
      this.cropFrame.style.height = `${crop.h * height}px`;
      const left = crop.x * width;
      const top = crop.y * height;
      const bottom = (1 - crop.y - crop.h) * height;
      const overlay = this.cropOverlay;
      overlay.querySelector(".is-left").style.cssText =
        `left:0;top:0;width:${left}px;height:100%`;
      overlay.querySelector(".is-right").style.cssText =
        `left:${left + crop.w * width}px;top:0;right:0;height:100%`;
      overlay.querySelector(".is-top").style.cssText =
        `left:${left}px;top:0;width:${crop.w * width}px;height:${top}px`;
      overlay.querySelector(".is-bottom").style.cssText =
        `left:${left}px;bottom:0;width:${crop.w * width}px;height:${bottom}px`;
    }

    render({ quality = 1 } = {}) {
      if (!this.open || !this.sourceData) return;
      const width = this.pendingCanvasWidth || this.canvas.width;
      const height = this.pendingCanvasHeight || this.canvas.height;
      if (width < 2 || height < 2) return;
      const targetChanged =
        this.canvas.width !== width || this.canvas.height !== height;
      const renderWidth = Math.max(
        2,
        Math.round(width * clamp(quality, 0.25, 1, 1)),
      );
      const renderHeight = Math.max(
        2,
        Math.round(height * clamp(quality, 0.25, 1, 1)),
      );
      this.el.dataset.peRenderQuality = String(
        clamp(quality, 0.25, 1, 1).toFixed(2),
      );
      const sourceWidth = this.source.width;
      const sourceHeight = this.source.height;
      const sourceData = this.sourceData.data;
      const output = this.ctx.createImageData(renderWidth, renderHeight);
      const destination = output.data;
      const sample = { r: 0, g: 0, b: 0, a: 255 };
      for (let y = 0; y < renderHeight; y += 1) {
        const v = (y + 0.5) / renderHeight;
        for (let x = 0; x < renderWidth; x += 1) {
          const u = (x + 0.5) / renderWidth;
          bilerp(sourceData, sourceWidth, sourceHeight, u, v, sample);
          const index = (y * renderWidth + x) * 4;
          destination[index] = sample.r;
          destination[index + 1] = sample.g;
          destination[index + 2] = sample.b;
          destination[index + 3] = clamp(sample.a, 0, 255, 255);
        }
      }
      if (renderWidth === width && renderHeight === height && !targetChanged) {
        this.ctx.putImageData(output, 0, 0);
      } else {
        this.previewCanvas.width = renderWidth;
        this.previewCanvas.height = renderHeight;
        this.previewCtx.putImageData(output, 0, 0);
        if (targetChanged) {
          this.canvas.width = width;
          this.canvas.height = height;
        }
        this.ctx.clearRect(0, 0, width, height);
        this.ctx.drawImage(this.previewCanvas, 0, 0, width, height);
      }
    }
  }

  const editor = new PhotoEditor();
  window.PhotoEditor = {
    open: (item, callbacks) => editor.show(item, callbacks),
    close: () => editor.cancel(),
    isOpen: () => editor.open,
  };
})();
