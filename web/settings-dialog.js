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
              label: "主题颜色",
              options: [
                ["auto", "跟随系统"],
                ["light", "浅色"],
                ["dark", "深色"],
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
              key: "showLibraryTimeline",
              label: "显示时间轴",
            },
            {
              type: "toggle",
              key: "hideLibraryTimeButtons",
              invert: true,
              label: "显示时间按钮",
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
              key: "hideAlbumPhotoWall",
              invert: true,
              label: "显示“照片墙”卡",
            },
            {
              type: "toggle",
              key: "hideLibrarySwitchButton",
              invert: true,
              label: "显示“切换图库”",
            },
            {
              type: "toggle",
              key: "hideImportLibraryButton",
              invert: true,
              label: "显示“导入图库”",
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
              key: "showViewerFrame",
              label: "显示四边留白",
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
              key: "wallpaperCruiseSpeed",
              label: "巡航速度",
              options: [
                ["fast", "快"],
                ["medium", "中"],
                ["slow", "慢"],
              ],
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
  let lastFocus = null;

  function category(id) {
    return categories.find((entry) => entry.id === id) || categories[0];
  }

  function valueFor(row) {
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
        style="--ux-segment-count:${options.length};--ux-segment-index:${activeIndex}">
        <span class="ux-settings-segment-thumb" aria-hidden="true"></span>
        ${options
          .map(
            ([optionValue, label]) => `<button class="ux-settings-segment"
              type="button" role="radio"
              aria-checked="${optionValue === current}"
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
    requestAnimationFrame(() => syncSegmentThumbs(false));
  }

  function syncSegmentThumbs(animate = true) {
    for (const segmented of main.querySelectorAll(".ux-settings-segmented")) {
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

  function close({ commit = false, restoreFocus = true } = {}) {
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
    }
    if (restoreFocus) trigger.focus({ preventScroll: true });
  }

  function open() {
    if (menuOpen) closeMenu({ duration: 0, restoreFocus: false });
    snapshotSettingsDraft();
    lastFocus = document.activeElement;
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
      setValue(rows[rowIndex], choice.dataset.uxValue);
      for (const option of choice
        .closest(".ux-settings-segmented")
        .querySelectorAll("[data-ux-value]")) {
        option.setAttribute("aria-checked", String(option === choice));
      }
      syncSegmentThumbs(true);
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

  window.uxSettingsDialog = {
    open,
    close,
    isOpen: () => !layer.hidden,
  };
})();
