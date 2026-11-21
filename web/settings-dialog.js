/* 设置弹窗视图。设置草稿、应用与持久化继续复用 app.js。 */
(() => {
  const trigger = document.getElementById("sidebarOptionsBtn");
  if (!trigger || document.getElementById("uxSettingsLayer")) return;

  const CHECK_ICON = `
    <svg viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <path d="m4.1 10.2 3.7 3.8 8.1-8"
        stroke="currentColor" stroke-width="1.4"
        stroke-linecap="round" stroke-linejoin="round"/>
    </svg>`;

  const settingsMeta = window.FotoraSettingsMeta || {};
  const interfaceNameLabels = Object.freeze({
    libraryTitle: "图库标题",
    library: "图库入口",
    photoWall: "照片墙入口",
    all: "所有相簿入口",
    unfiled: "未归档入口",
  });
  const cruiseOptions = (settingsMeta.wallpaperCruiseOptions || []).map(
    (option, index) => [
      index,
      option.direction
        ? `${option.label} ${option.directionLabel}`
        : option.timed
          ? option.label
          : "",
    ],
  );
  const interfaceNameRows = (settingsMeta.interfaceNameFields || []).map(
    (field) => ({
      type: "text",
      field: field.id,
      label: interfaceNameLabels[field.id] || field.defaultName,
      placeholder: field.defaultName,
      maxlength:
        field.id === "libraryTitle"
          ? settingsMeta.libraryTitleMaxLength
          : settingsMeta.interfaceNameMaxLength,
    }),
  );

  const categories = Object.freeze([
    {
      id: "general",
      label: "常规",
      groups: [
        {
          title: "外观",
          rows: [
            {
              type: "segmented",
              key: "colorMode",
              label: "明暗模式",
              options: [
                ["auto", "跟随系统"],
                ["light", "浅色"],
                ["dark", "深色"],
              ],
            },
            {
              type: "segmented",
              key: "colorTheme",
              label: "主题样式",
              options: [
                ["default", "原色"],
                ["warm", "暖纸"],
                ["mist", "雾岚"],
                ["claude", "杏陶"],
              ],
            },
            {
              type: "segmented",
              key: "fontTheme",
              label: "界面语言",
              options: [
                ["pingfang", "中文"],
                ["anthropic", "English"],
              ],
            },
            {
              type: "segmented",
              key: "windowControlsStyle",
              label: "窗口控件",
              options: [
                ["windows", "Windows"],
                ["macos", "红绿灯"],
                ["hidden", "隐藏"],
              ],
            },
            {
              type: "titlebar",
              label: "标题栏样式",
              options: [
                ["solid", "标准"],
                ["glass", "透明"],
                ["blur", "磨砂"],
              ],
            },
            {
              type: "toggle",
              key: "showGlassBorder",
              label: "显示窗口边框",
            },
            {
              type: "toggle",
              key: "showSettingsControl",
              label: "显示设置按钮",
            },
            {
              type: "toggle",
              key: "showLibraryChevron",
              label: "显示展开箭头",
            },
          ],
        },
        {
          title: "启动与关闭",
          rows: [
            {
              type: "segmented",
              key: "defaultOpenView",
              label: "启动页面",
              options: [
                ["library", "图库"],
                ["all", "所有相簿"],
              ],
            },
            {
              type: "segmented",
              key: "closeWindowBehavior",
              label: "关闭主窗口时",
              options: [
                ["quit", "退出 Fotora"],
                ["tray", "最小化到托盘"],
              ],
            },
          ],
        },
        {
          title: "数据管理",
          rows: [
            {
              type: "clear-data",
              label: "清除所有数据",
              description:
                "将永久删除 Fotora 的应用数据文件夹（默认位于 %LOCALAPPDATA%\\Fotora），包括图库索引、相册、收藏、评分、编辑与裁剪、界面设置和缩略图等缓存。不会删除图库源文件夹中的原始照片和视频，也不会删除已经导出的文件。确认后会退出 Fotora，删除完成后自动重新启动。",
            },
          ],
        },
      ],
    },
    {
      id: "library",
      label: "图库与相簿栏",
      groups: [
        {
          title: "图库浏览",
          rows: [
            {
              type: "photo-layout",
              label: "默认照片布局",
              options: [
                ["original", "原始比例"],
                ["square", "方形网格"],
                ["justified", "等高成行"],
                ["masonry", "等宽成列"],
              ],
            },
            {
              type: "segmented",
              key: "thumbnailCornerStyle",
              label: "缩略图边角",
              options: [
                ["rounded", "圆角"],
                ["square", "直角"],
              ],
            },
            {
              type: "toggle",
              key: "showTimelineScrubber",
              label: "显示拖动滑块",
            },
            {
              type: "toggle",
              key: "showLibraryTimeline",
              label: "显示时间刻度",
            },
            {
              type: "toggle",
              key: "hideLibraryTimeButtons",
              invert: true,
              label: "显示时间按钮",
            },
            {
              type: "toggle",
              key: "hideBackToTop",
              invert: true,
              label: "显示返回顶部按钮",
            },
          ],
        },
        {
          title: "相簿栏入口",
          rows: [
            {
              type: "toggle",
              key: "hoverExpandSidebar",
              label: "悬停展开相簿栏",
            },
            {
              type: "toggle",
              key: "showUnfiledCard",
              label: "显示“未归档”卡",
            },
            {
              type: "toggle",
              key: "hideAllAlbumsCard",
              label: "显示“所有相簿”卡",
              invert: true,
            },
            {
              type: "toggle",
              key: "hideAlbumPhotoWall",
              invert: true,
              label: "显示“照片墙”卡",
            },
            {
              type: "toggle",
              key: "trashHoverOnly",
              invert: true,
              label: "显示“最近删除”",
            },
          ],
        },
      ],
    },
    {
      id: "viewer",
      label: "预览与查看器",
      groups: [
        {
          title: "照片预览",
          rows: [
            {
              type: "segmented",
              key: "viewerPreviewSize",
              label: "预览尺寸",
              options: [
                ["large", "宽大"],
                ["medium", "适中"],
                ["small", "紧凑"],
              ],
            },
            {
              type: "toggle",
              key: "previewBlurEnabled",
              label: "背景虚化",
            },
            {
              type: "toggle",
              key: "mutePreviewVideo",
              label: "静音预览",
            },
            {
              type: "toggle",
              key: "mutePreviewLivePhoto",
              label: "静音预览实况照片",
            },
          ],
        },
        {
          title: "查看器",
          rows: [
            {
              type: "segmented",
              key: "viewerWheelMode",
              label: "滚轮行为",
              options: [
                ["zoom-navigate", "缩放 / Ctrl 切换"],
                ["navigate", "切换 / Ctrl 缩放"],
              ],
            },
            {
              type: "toggle",
              key: "viewerFilmstripEnabled",
              label: "显示照片栏",
            },
            {
              type: "segmented",
              key: "filmstripPosition",
              label: "照片栏位置",
              options: [
                ["top", "顶部"],
                ["bottom", "底部"],
                ["left", "左侧"],
                ["right", "右侧"],
              ],
            },
            {
              type: "toggle",
              key: "viewerFitEnabled",
              label: "等比放大照片",
            },
            {
              type: "toggle",
              key: "viewerEditHoverOnly",
              invert: true,
              label: "显示编辑按钮",
            },
            {
              type: "toggle",
              key: "showViewerStepButtons",
              label: "显示切换按钮",
            },
            {
              type: "toggle",
              key: "showViewerFrame",
              label: "显示四边留白",
            },
            {
              type: "toggle",
              key: "autoPlayLivePhotoEnabled",
              label: "自动播放实况照片",
            },
            {
              type: "toggle",
              key: "videoLoopEnabled",
              label: "循环播放视频",
            },
            {
              type: "toggle",
              key: "autoPlayNextVideoEnabled",
              label: "自动播放下一个视频",
            },
          ],
        },
      ],
    },
    {
      id: "media",
      label: "照片墙与幻灯片",
      groups: [
        {
          title: "照片墙",
          rows: [
            {
              type: "segmented",
              key: "photoWallDefaultKind",
              wide: true,
              label: "默认照片墙",
              options: [
                ["tile", "错落磁贴"],
                ["mosaic", "嵌合拼图"],
                ["masonry", "纵向画廊"],
                ["filmroll", "横向胶卷"],
              ],
            },
            {
              type: "segmented",
              key: "wallpaperCruiseSpeed",
              label: "巡航速度",
              options: [
                ["fast", "快"],
                ["medium", "中"],
                ["slow", "慢"],
              ],
            },
            {
              type: "segmented",
              key: "masonryWallCruiseDirection",
              label: "纵向画廊方向",
              options: [
                ["up", "向上"],
                ["down", "向下"],
              ],
            },
            {
              type: "select",
              key: "cruiseChoiceIndex",
              label: "换向方式",
              options: cruiseOptions,
            },
            {
              type: "number",
              key: "cruiseIntervalMinutes",
              label: "换向间隔",
              min: settingsMeta.wallpaperCruiseIntervalMinMinutes || 1,
              max: settingsMeta.wallpaperCruiseIntervalMaxMinutes || 9,
              unit: "分钟",
            },
          ],
        },
        {
          title: "界面按钮",
          rows: [
            {
              type: "toggle",
              key: "photoWallGlassBorder",
              label: "显示照片墙边框",
            },
            {
              type: "toggle",
              key: "showPhotoWallControls",
              label: "显示照片墙按钮",
            },
            {
              type: "toggle",
              key: "showSlideshowControls",
              label: "显示幻灯片按钮",
            },
          ],
        },
      ],
    },
    {
      id: "map",
      label: "地图与位置",
      groups: [
        {
          title: "地图行为",
          rows: [
            {
              type: "segmented",
              key: "locationFlightSpeed",
              label: "飞行速度",
              options: [
                ["fast", "快"],
                ["medium", "中"],
                ["slow", "慢"],
                ["gentle", "缓"],
              ],
            },
            {
              type: "segmented",
              key: "mapTileProvider",
              label: "瓦片地图",
              options: [
                ["amap", "高德"],
                ["google", "谷歌"],
              ],
            },
            {
              type: "map-type",
              label: "地图类型",
              options: [
                ["satellite", "卫星"],
                ["vector", "矢量"],
              ],
            },
          ],
        },
        {
          title: "地图界面",
          rows: [
            {
              type: "toggle",
              key: "showLocationMapButtons",
              label: "显示地图按钮",
            },
            {
              type: "toggle",
              key: "showLocationMapFilmstrip",
              label: "显示地图照片栏",
            },
          ],
        },
      ],
    },
    {
      id: "names",
      label: "界面名称",
      groups: [
        {
          title: "入口名称",
          rows: interfaceNameRows,
        },
      ],
    },
    {
      id: "shortcuts",
      label: "快捷键",
      action: "shortcuts",
    },
  ]);

  const layer = document.createElement("div");
  layer.className = "ux-settings-layer";
  layer.id = "uxSettingsLayer";
  layer.hidden = true;
  layer.innerHTML = `
    <section class="ux-settings-dialog" role="dialog" aria-modal="true"
      aria-label="设置" tabindex="-1">
      <aside class="ux-settings-nav">
        <header class="ux-settings-nav-head">
          <button class="ux-settings-confirm" type="button"
            data-ux-settings-confirm aria-label="确认并关闭设置">
            ${CHECK_ICON}
          </button>
          <span class="ux-settings-title">设置</span>
          <span aria-hidden="true"></span>
        </header>
        <nav class="ux-settings-nav-list" aria-label="设置分类"></nav>
      </aside>
      <div class="ux-settings-main" data-ux-settings-main></div>
    </section>`;
  document.body.append(layer);

  const dialog = layer.querySelector(".ux-settings-dialog");
  const nav = layer.querySelector(".ux-settings-nav-list");
  const main = layer.querySelector("[data-ux-settings-main]");
  const confirm = layer.querySelector("[data-ux-settings-confirm]");
  let activeCategory = "general";
  let themeBeforeOpen = null;
  let fontThemeBeforeOpen = null;
  let colorModeBeforeOpen = null;
  let englishFontWarmup = null;
  let fontThemeChoiceSequence = 0;

  function warmEnglishFont() {
    if (!document.fonts?.load) return Promise.resolve();
    if (!englishFontWarmup) {
      englishFontWarmup = document.fonts
        .load('16px "Fotora Source Serif"')
        .then(() => undefined)
        .catch(() => undefined);
    }
    return englishFontWarmup;
  }

  function applyFontThemeChoice(row, choice) {
    const next = choice.dataset.uxValue;
    const sequence = ++fontThemeChoiceSequence;
    const apply = () => {
      if (sequence !== fontThemeChoiceSequence) return;
      setValue(row, next);
      window.setFontTheme?.(next, { persist: false });
      for (const option of choice
        .closest(".ux-settings-segmented")
        .querySelectorAll("[data-ux-value]")) {
        option.setAttribute("aria-checked", String(option === choice));
        option.tabIndex = option === choice ? 0 : -1;
      }
      syncSegmentThumbs(true);
    };

    if (next === "anthropic") {
      void warmEnglishFont().then(apply);
    } else {
      apply();
    }
  }

  function category(id) {
    return categories.find((entry) => entry.id === id) || categories[0];
  }

  function valueFor(row) {
    if (row.type === "text") {
      return row.field === "libraryTitle"
        ? settingsDraft?.libraryTitle || ""
        : settingsDraft?.interfaceNames?.[row.field] || "";
    }
    if (row.type === "titlebar") {
      if (settingsDraft?.transparentTitlebar) return "glass";
      return settingsDraft?.titlebarBlur ? "blur" : "solid";
    }
    if (row.type === "photo-layout") {
      if (settingsDraft?.photoLayoutMode !== "tile") {
        return settingsDraft?.photoLayoutMode || "square";
      }
      return settingsDraft?.defaultOriginalRatio ? "original" : "square";
    }
    if (row.type === "map-type") {
      return settingsDraft?.showLocationSatellite ? "satellite" : "vector";
    }
    if (row.type === "toggle") {
      const value = settingsDraft?.[row.key] === true;
      return row.invert ? !value : value;
    }
    return settingsDraft?.[row.key];
  }

  function setValue(row, value) {
    if (!settingsDraft) return;
    if (row.type === "text") {
      const next = String(value || "").slice(
        0,
        Math.max(1, Number(row.maxlength) || 60),
      );
      if (row.field === "libraryTitle") {
        settingsDraft.libraryTitle = next;
      } else {
        settingsDraft.interfaceNames[row.field] = next;
      }
      return;
    }
    if (row.type === "number") {
      const numeric = Number(value);
      const min = Number(row.min) || 0;
      const max = Math.max(min, Number(row.max) || min);
      settingsDraft[row.key] = Number.isFinite(numeric)
        ? Math.min(max, Math.max(min, Math.round(numeric)))
        : min;
      return;
    }
    if (row.type === "select") {
      settingsDraft[row.key] = Number(value);
      return;
    }
    if (row.type === "titlebar") {
      settingsDraft.transparentTitlebar = value === "glass";
      settingsDraft.titlebarBlur = value === "blur";
      return;
    }
    if (row.type === "photo-layout") {
      settingsDraft.defaultOriginalRatio = value === "original";
      settingsDraft.photoLayoutMode =
        value === "original" || value === "square" ? "tile" : value;
      return;
    }
    if (row.type === "map-type") {
      settingsDraft.showLocationSatellite = value === "satellite";
      return;
    }
    if (row.type === "toggle") {
      settingsDraft[row.key] = row.invert ? value !== true : value === true;
      if (row.key === "videoLoopEnabled" && value === true) {
        settingsDraft.autoPlayNextVideoEnabled = false;
      }
      if (row.key === "autoPlayNextVideoEnabled" && value === true) {
        settingsDraft.videoLoopEnabled = false;
      }
      return;
    }
    settingsDraft[row.key] = value;
  }

  function rowMarkup(row, index) {
    if (row.type === "clear-data") {
      return `<div class="ux-settings-row ux-settings-clear-data">
        <span class="ux-settings-row-copy">
          <span class="ux-settings-row-description">${escapeDialogHTML(row.description || "")}</span>
        </span>
        <button class="ux-settings-clear-data-button" type="button"
          aria-label="${escapeDialogHTML(row.label)}"
          data-ux-clear-data>${escapeDialogHTML(row.label)}</button>
      </div>`;
    }
    if (row.type === "text") {
      return `<div class="ux-settings-row">
        <span class="ux-settings-row-label">${escapeDialogHTML(row.label)}</span>
        <input class="ux-settings-input" type="text"
          value="${escapeDialogHTML(valueFor(row))}"
          placeholder="${escapeDialogHTML(row.placeholder || "")}"
          maxlength="${Number(row.maxlength) || 60}"
          aria-label="${escapeDialogHTML(row.label)}"
          data-ux-text="${index}">
      </div>`;
    }
    if (row.type === "number") {
      const current = valueFor(row);
      return `<div class="ux-settings-row">
        <span class="ux-settings-row-label">${escapeDialogHTML(row.label)}</span>
        <span class="ux-settings-number">
          <input class="ux-settings-input" type="number" inputmode="numeric"
            value="${escapeDialogHTML(current)}"
            min="${Number(row.min)}" max="${Number(row.max)}" step="1"
            aria-label="${escapeDialogHTML(row.label)}"
            data-ux-number="${index}">
          <span aria-hidden="true">${escapeDialogHTML(row.unit || "")}</span>
        </span>
      </div>`;
    }
    if (row.type === "select") {
      const current = String(valueFor(row));
      return `<div class="ux-settings-row">
        <span class="ux-settings-row-label">${escapeDialogHTML(row.label)}</span>
        <select class="ux-settings-select"
          aria-label="${escapeDialogHTML(row.label)}"
          data-ux-select="${index}">
          ${row.options
            .map(
              ([optionValue, label]) => `<option value="${optionValue}"
                ${String(optionValue) === current ? "selected" : ""}>
                ${escapeDialogHTML(label)}
              </option>`,
            )
            .join("")}
        </select>
      </div>`;
    }
    if (row.type === "toggle") {
      const checked = valueFor(row) === true;
      return `<div class="ux-settings-row">
        <span class="ux-settings-row-label">${escapeDialogHTML(row.label)}</span>
        <button class="ux-settings-toggle" type="button" role="switch"
          aria-label="${escapeDialogHTML(row.label)}"
          aria-checked="${checked}" data-ux-toggle="${index}"></button>
      </div>`;
    }
    const current = valueFor(row);
    const options =
      row.type === "titlebar"
        ? row.options
        : row.type === "photo-layout"
          ? row.options
          : row.type === "map-type"
            ? row.options
            : row.options || [];
    const activeIndex = Math.max(
      0,
      options.findIndex(([optionValue]) => optionValue === current),
    );
    return `<div class="ux-settings-row">
      <span class="ux-settings-row-label">${escapeDialogHTML(row.label)}</span>
      <div class="ux-settings-segmented" role="radiogroup"
        aria-label="${escapeDialogHTML(row.label)}"
        data-ux-wide="${row.wide === true ? "true" : "false"}"
        style="--ux-segment-count:${options.length};--ux-segment-index:${activeIndex}">
        <span class="ux-settings-segment-thumb" aria-hidden="true"></span>
        ${options
          .map(
            ([optionValue, label]) => `<button class="ux-settings-segment"
              type="button" role="radio"
              aria-checked="${optionValue === current}"
              tabindex="${optionValue === current ? "0" : "-1"}"
              data-ux-choice="${index}"
              data-ux-value="${escapeDialogHTML(optionValue)}">
              ${escapeDialogHTML(label)}
            </button>`,
          )
          .join("")}
      </div>
    </div>`;
  }

  function renderCategory(id = activeCategory) {
    activeCategory = id;
    const current = category(id);
    for (const button of nav.querySelectorAll(".ux-settings-nav-item")) {
      button.setAttribute(
        "aria-selected",
        String(button.dataset.uxCategory === id),
      );
    }
    const activeButton = nav.querySelector(`[data-ux-category="${id}"]`);
    const indicator = nav.querySelector(".ux-settings-nav-indicator");
    if (activeButton && indicator) {
      indicator.style.transform = `translateY(${activeButton.offsetTop}px)`;
    }
    if (current.action === "shortcuts") {
      const groups = document.querySelector("#shortcuts .shortcuts-groups");
      main.innerHTML = `<div class="ux-settings-shortcuts">${
        groups?.innerHTML || ""
      }</div>`;
      main.scrollTop = 0;
      return;
    }
    const rows = current.groups.flatMap((group) => group.rows);
    main.innerHTML = `<div class="ux-settings-groups">
      ${current.groups
        .map(
          (group) => `<section class="ux-settings-group">
            <h2 class="ux-settings-group-title">${escapeDialogHTML(group.title)}</h2>
            ${group.rows
              .map((row) => rowMarkup(row, rows.indexOf(row)))
              .join("")}
          </section>`,
        )
        .join("")}
    </div>`;
    requestAnimationFrame(() => {
      syncSegmentThumbs(false);
      requestAnimationFrame(() => syncSegmentThumbs(false));
    });
  }

  function syncSegmentThumbs(animate = true) {
    const segmentedControls = [
      ...main.querySelectorAll(".ux-settings-segmented"),
    ];
    if (document.documentElement.dataset.fontTheme === "anthropic") {
      let measurer = syncSegmentThumbs.measurer;
      if (!measurer) {
        measurer = document.createElement("span");
        measurer.className = "ux-settings-measure";
        measurer.setAttribute("aria-hidden", "true");
        document.body.append(measurer);
        syncSegmentThumbs.measurer = measurer;
      }
      const measuredControls = segmentedControls.map((segmented) => {
        const choices = [...segmented.querySelectorAll("[data-ux-value]")];
        const widest = Math.max(
          ...choices.map((choice) => {
            const style = getComputedStyle(choice);
            measurer.style.font = style.font;
            measurer.style.fontWeight = "600";
            measurer.style.letterSpacing = style.letterSpacing;
            measurer.textContent =
              window.FotoraLanguage?.translateValue?.(
                choice.textContent.trim(),
              ) || choice.textContent.trim();
            return (
              measurer.getBoundingClientRect().width +
              Number.parseFloat(style.paddingLeft) +
              Number.parseFloat(style.paddingRight) +
              2
            );
          }),
          0,
        );
        return {
          segmented,
          width: Math.ceil(widest * choices.length + 4),
        };
      });
      const regularWidths = measuredControls
        .filter(({ segmented }) => segmented.dataset.uxWide !== "true")
        .map(({ width }) => width);
      const pageWidth = Math.max(
        268,
        Math.min(540, Math.max(...regularWidths)),
      );
      for (const { segmented, width } of measuredControls) {
        const targetWidth =
          segmented.dataset.uxWide === "true"
            ? Math.max(pageWidth, Math.min(540, width))
            : pageWidth;
        segmented.style.width = `${targetWidth}px`;
      }
    } else {
      for (const segmented of segmentedControls) {
        segmented.style.removeProperty("width");
      }
    }

    for (const segmented of segmentedControls) {
      const thumb = segmented.querySelector(".ux-settings-segment-thumb");
      const active = segmented.querySelector('[aria-checked="true"]');
      if (!thumb || !active) continue;
      const choices = [...segmented.querySelectorAll("[data-ux-value]")];
      if (!animate) thumb.style.transition = "none";
      segmented.style.setProperty(
        "--ux-segment-count",
        String(Math.max(1, choices.length)),
      );
      segmented.style.setProperty(
        "--ux-segment-index",
        String(Math.max(0, choices.indexOf(active))),
      );
      if (!animate) {
        requestAnimationFrame(() => thumb.style.removeProperty("transition"));
      }
    }
  }

  function escapeDialogHTML(value) {
    return String(value)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;");
  }

  function close({ commit = false } = {}) {
    if (layer.hidden) return;
    layer.hidden = true;
    document.documentElement.classList.remove("ux-settings-open");
    trigger.classList.remove("is-open");
    trigger.setAttribute("aria-expanded", "false");
    trigger.setAttribute("aria-label", "设置");
    if (commit) {
      applySettingsDraft();
    } else {
      settingsDraft = null;
      if (
        themeBeforeOpen &&
        document.documentElement.dataset.colorTheme !== themeBeforeOpen
      ) {
        window.setColorTheme?.(themeBeforeOpen, { persist: false });
      }
      if (
        fontThemeBeforeOpen &&
        document.documentElement.dataset.fontTheme !== fontThemeBeforeOpen
      ) {
        window.setFontTheme?.(fontThemeBeforeOpen, { persist: false });
      }
      if (
        colorModeBeforeOpen &&
        document.documentElement.dataset.colorMode !== colorModeBeforeOpen
      ) {
        window.setColorMode?.(colorModeBeforeOpen, { persist: false });
      }
    }
    themeBeforeOpen = null;
    fontThemeBeforeOpen = null;
    colorModeBeforeOpen = null;
  }

  function open() {
    if (menuOpen) closeMenu({ duration: 0 });
    void warmEnglishFont();
    snapshotSettingsDraft();
    themeBeforeOpen = document.documentElement.dataset.colorTheme || "default";
    fontThemeBeforeOpen =
      document.documentElement.dataset.fontTheme || "pingfang";
    colorModeBeforeOpen = document.documentElement.dataset.colorMode || "auto";
    layer.hidden = false;
    document.documentElement.classList.add("ux-settings-open");
    trigger.classList.add("is-open");
    trigger.setAttribute("aria-expanded", "true");
    renderCategory(activeCategory);
    requestAnimationFrame(() => confirm.focus({ preventScroll: true }));
  }

  nav.innerHTML =
    '<span class="ux-settings-nav-indicator" aria-hidden="true"></span>';
  for (const entry of categories) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "ux-settings-nav-item";
    button.dataset.uxCategory = entry.id;
    button.setAttribute("aria-selected", String(entry.id === activeCategory));
    button.textContent = entry.label;
    nav.append(button);
  }

  trigger.addEventListener(
    "click",
    (event) => {
      event.preventDefault();
      event.stopImmediatePropagation();
      if (layer.hidden) open();
      else close({ commit: true });
    },
    true,
  );

  nav.addEventListener("click", (event) => {
    const button = event.target.closest("[data-ux-category]");
    if (!button) return;
    const next = category(button.dataset.uxCategory);
    renderCategory(next.id);
    main.scrollTop = 0;
  });

  main.addEventListener("click", (event) => {
    const clearData = event.target.closest("[data-ux-clear-data]");
    if (clearData) {
      void requestClearAllData(clearData);
      return;
    }
    const toggle = event.target.closest("[data-ux-toggle]");
    if (toggle) {
      const rowIndex = Number(toggle.dataset.uxToggle);
      const categoryGroups = category(activeCategory).groups;
      const rows = categoryGroups.flatMap((group) => group.rows);
      const row = rows[rowIndex];
      const next = !(toggle.getAttribute("aria-checked") === "true");
      setValue(row, next);
      toggle.setAttribute("aria-checked", String(next));
      const exclusiveKey =
        next && row.key === "videoLoopEnabled"
          ? "autoPlayNextVideoEnabled"
          : next && row.key === "autoPlayNextVideoEnabled"
            ? "videoLoopEnabled"
            : null;
      if (exclusiveKey) {
        const otherIndex = rows.findIndex(
          (candidate) => candidate.key === exclusiveKey && !candidate.invert,
        );
        main
          .querySelector(`[data-ux-toggle="${otherIndex}"]`)
          ?.setAttribute("aria-checked", "false");
      }
      return;
    }
    const choice = event.target.closest("[data-ux-choice]");
    if (choice) {
      const rowIndex = Number(choice.dataset.uxChoice);
      const rows = category(activeCategory).groups.flatMap(
        (group) => group.rows,
      );
      const row = rows[rowIndex];
      if (row?.key === "fontTheme") {
        applyFontThemeChoice(row, choice);
        return;
      }
      setValue(row, choice.dataset.uxValue);
      if (row?.key === "colorTheme") {
        window.setColorTheme?.(choice.dataset.uxValue, { persist: false });
      }
      if (row?.key === "colorMode") {
        window.setColorMode?.(choice.dataset.uxValue, { persist: false });
      }
      for (const option of choice
        .closest(".ux-settings-segmented")
        .querySelectorAll("[data-ux-value]")) {
        option.setAttribute("aria-checked", String(option === choice));
        option.tabIndex = option === choice ? 0 : -1;
      }
      syncSegmentThumbs(true);
    }
  });

  async function requestClearAllData(button) {
    if (button.disabled) return;
    button.disabled = true;
    button.setAttribute("aria-busy", "true");
    try {
      await window.albumWindow?.clearAllData?.();
    } catch (err) {
      console.error("清除所有数据失败：", err);
    } finally {
      if (button.isConnected) {
        button.disabled = false;
        button.removeAttribute("aria-busy");
      }
    }
  }

  main.addEventListener("input", (event) => {
    const field =
      event.target.closest("[data-ux-text]") ||
      event.target.closest("[data-ux-number]");
    if (!field) return;
    const index = Number(field.dataset.uxText ?? field.dataset.uxNumber);
    const rows = category(activeCategory).groups.flatMap((group) => group.rows);
    const row = rows[index];
    if (!row) return;
    setValue(row, field.value);
    field.setAttribute("aria-invalid", "false");
  });

  main.addEventListener("change", (event) => {
    const select = event.target.closest("[data-ux-select]");
    const number = event.target.closest("[data-ux-number]");
    if (!select && !number) return;
    const control = select || number;
    const index = Number(control.dataset.uxSelect ?? control.dataset.uxNumber);
    const rows = category(activeCategory).groups.flatMap((group) => group.rows);
    const row = rows[index];
    if (!row) return;
    setValue(row, control.value);
    if (row.type === "number") {
      const next = settingsDraft?.[row.key];
      control.value = String(next);
      control.setAttribute("aria-invalid", "false");
    }
  });

  confirm.addEventListener("click", () => close({ commit: true }));
  layer.addEventListener("pointerdown", (event) => {
    if (event.target === layer) close({ commit: true });
  });
  dialog.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      event.preventDefault();
      close();
      return;
    }
    if (event.key !== "Tab") return;
    const focusable = [
      ...dialog.querySelectorAll(
        'button:not([disabled]), [tabindex]:not([tabindex="-1"])',
      ),
    ];
    if (!focusable.length) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  });

  document.fonts?.ready.then(() => {
    if (!layer.hidden) syncSegmentThumbs(false);
  });

  window.uxSettingsDialog = {
    open,
    close,
    isOpen: () => !layer.hidden,
  };
})();
