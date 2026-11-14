(() => {
  "use strict";

  const origin = window.location.origin;
  const notice = document.getElementById("albumMapNotice");
  const query = new URLSearchParams(window.location.search);
  const assignMode = query.get("mode") === "assign";
  const initialStyle =
    assignMode || query.get("satellite") === "0" ? "street" : "satellite";
  const initialFlightSpeed = query.get("speed") || "medium";
  let entryId = Number(query.get("entry")) || 0;
  const searchForm = document.getElementById("albumMapSearch");
  const searchInput = document.getElementById("albumMapSearchInput");
  const searchResults = document.getElementById("albumMapSearchResults");
  const closeButton = document.getElementById("albumMapCloseButton");
  const compassButton = document.getElementById("albumCompassButton");
  const typeToggle = document.getElementById("albumTypeToggle");
  const AMAP_KEY = "ab2b9e88e482a653a507e10151dccd9e";
  const SEARCH_INPUT_DELAY = 420;
  const SEARCH_MIN_CHARS = 2;
  const MAP_CONTROL_PROXIMITY_PADDING = 64;
  const MAP_CONTROL_PROXIMITY_EXIT_PADDING = 96;
  let noticeTimer = 0;
  let searchAbort = null;
  let searchInputTimer = 0;
  let searchApplyTimer = 0;
  let searchComposing = false;
  let targetPoint = null;
  let searchExpanded = false;
  let controlsVisible = true;
  let controlsNear = false;
  let lastPointer = { x: NaN, y: NaN };
  let parentPointerFrame = 0;

  document.body.classList.toggle("is-location-assign", assignMode);
  if (searchForm) searchForm.hidden = !assignMode;
  if (closeButton) {
    closeButton.hidden = false;
    const closeLabel = assignMode ? "退出位置分配" : "返回相簿";
    closeButton.setAttribute("aria-label", closeLabel);
    closeButton.title = closeLabel;
  }
  if (searchInput) searchInput.tabIndex = -1;

  function post(type, payload = {}) {
    window.parent.postMessage({ type, entryId, ...payload }, origin);
  }

  function postPointerForParent() {
    if (parentPointerFrame || !Number.isFinite(lastPointer.x)) return;
    parentPointerFrame = requestAnimationFrame(() => {
      parentPointerFrame = 0;
      post("album-map:pointer", {
        pointerX: lastPointer.x,
        pointerY: lastPointer.y,
        controlsNear,
      });
    });
  }

  function showNotice(message, duration = 0) {
    window.clearTimeout(noticeTimer);
    notice.textContent = message;
    notice.hidden = !message;
    if (message && duration > 0) {
      noticeTimer = window.setTimeout(() => {
        notice.hidden = true;
      }, duration);
    }
  }

  const globe = new window.EmbeddedGlobe({
    containerId: "albumMap",
    typeToggleId: "albumTypeToggle",
    compassButtonId: "albumCompassButton",
    initialCenter: [104.8, 31.8],
    initialZoom: 3.15,
    stableZoomView: true,
    autoPitchForZoom: true,
    fitItems: true,
    animateFit: true,
    initialStyle,
    flightSpeed: initialFlightSpeed,
    tileProvider: query.get("provider") === "google" ? "google" : "amap",
    /* 冷启动先绘制本地世界底图，首帧显示后再切换在线高德图层。这样首个
       WebGL 上下文不依赖网络，也不会在样式加载中途被第二次 setStyle 打断。 */
    networkEnabled: false,
    markerClass: "album-map-marker",
    pickLocation: assignMode,
    targetDraggable: assignMode,
    sourcePinTarget: assignMode,
    onEvent(type, payload) {
      if (type === "first-frame") {
        post("album-map:first-frame");
        return;
      }
      if (type === "select-item") {
        post("album-map:select", { id: payload.id });
        return;
      }
      if (type === "open-stack") {
        post("album-map:open-stack", { ids: payload.ids });
        return;
      }
      if (type === "open-item") {
        post("album-map:open-item", { id: payload.id });
        return;
      }
      if (type === "focus-item") {
        post("album-map:focus-change", { id: payload.id });
        return;
      }
      if (type === "target-change") {
        targetPoint = {
          lat: Number(payload.lat),
          lon: Number(payload.lon),
        };
        post("album-map:target-change", {
          ...targetPoint,
          source: payload.source || "map",
        });
        return;
      }
      if (type === "error") {
        post("album-map:error", { message: payload.message });
        showNotice("地图暂时无法显示");
        return;
      }
      if (type === "context-lost") {
        post("album-map:context-lost");
        showNotice("地图正在恢复…");
      }
    },
  });

  function hideSearchResults() {
    if (!searchResults) return;
    searchResults.hidden = true;
    searchResults.replaceChildren();
  }

  function mapControlElements() {
    return [closeButton, searchForm, compassButton, typeToggle].filter(Boolean);
  }

  function controlPointerHovered() {
    return mapControlElements().some((element) => element.matches(":hover"));
  }

  function revealControlsTemporarily() {
    if (controlsVisible) return;
    document.body.classList.add("map-buttons-near");
  }

  function updateControlProximity(
    x = lastPointer.x,
    y = lastPointer.y,
  ) {
    if (controlsVisible) {
      document.body.classList.remove("map-buttons-near");
      controlsNear = false;
      return;
    }
    const nearPointer =
      controlPointerHovered() ||
      (Number.isFinite(x) &&
        Number.isFinite(y) &&
        mapControlElements().some((element) => {
          if (element.hidden) return false;
          const rect = element.getBoundingClientRect();
          if (rect.width < 1 || rect.height < 1) return false;
          const padding = controlsNear
            ? MAP_CONTROL_PROXIMITY_EXIT_PADDING
            : MAP_CONTROL_PROXIMITY_PADDING;
          return (
            x >= rect.left - padding &&
            x <= rect.right + padding &&
            y >= rect.top - padding &&
            y <= rect.bottom + padding
          );
        }));
    if (nearPointer) {
      if (!controlsNear) revealControlsTemporarily();
      controlsNear = true;
      return;
    }
    controlsNear = false;
    document.body.classList.remove("map-buttons-near");
  }

  function setControlsVisible(visible) {
    controlsVisible = visible !== false;
    document.body.classList.toggle("map-buttons-hover-only", !controlsVisible);
    controlsNear = false;
    document.body.classList.remove("map-buttons-near");
    updateControlProximity();
  }

  function syncSearchWidth() {
    if (!searchForm || !searchInput) return;
    if (!searchExpanded) {
      searchForm.style.removeProperty("width");
      return;
    }
    const value = searchInput.value;
    if (!value) {
      searchForm.style.removeProperty("width");
      return;
    }
    const inputStyle = getComputedStyle(searchInput);
    const formStyle = getComputedStyle(searchForm);
    const submit = searchForm.querySelector(".globe-place-search-submit");
    const canvas =
      syncSearchWidth.canvas ||
      (syncSearchWidth.canvas = document.createElement("canvas"));
    const context = canvas.getContext("2d");
    context.font = [
      inputStyle.fontStyle,
      inputStyle.fontWeight,
      inputStyle.fontSize,
      inputStyle.fontFamily,
    ].join(" ");
    const textWidth = context.measureText(value).width;
    const horizontalChrome =
      Number.parseFloat(formStyle.paddingLeft) +
      Number.parseFloat(formStyle.paddingRight) +
      Number.parseFloat(inputStyle.paddingLeft) +
      Number.parseFloat(inputStyle.paddingRight) +
      (submit?.getBoundingClientRect().width || 36) +
      6;
    const available = Math.max(
      160,
      document.documentElement.clientWidth - 134 - 82,
    );
    const width = Math.min(
      available,
      Math.max(160, Math.ceil(textWidth + horizontalChrome)),
    );
    searchForm.style.width = `${width}px`;
  }

  function setSearchExpanded(expanded, { focus = true } = {}) {
    if (!searchForm || !searchInput || !assignMode) return;
    searchExpanded = Boolean(expanded);
    searchForm.classList.toggle("is-expanded", searchExpanded);
    searchInput.tabIndex = searchExpanded ? 0 : -1;
    const submit = searchForm.querySelector(".globe-place-search-submit");
    if (submit) {
      submit.title = searchExpanded ? "搜索" : "搜索地点";
      submit.setAttribute(
        "aria-label",
        searchExpanded ? "搜索" : "展开地点搜索",
      );
    }
    if (searchExpanded && focus) {
      requestAnimationFrame(() => {
        syncSearchWidth();
        searchInput.focus();
      });
    } else if (searchExpanded) {
      syncSearchWidth();
    } else {
      searchForm.style.removeProperty("width");
    }
  }

  function setTarget(lat, lon, { focus = false } = {}) {
    const nextLat = Number(lat);
    const nextLon = Number(lon);
    if (!Number.isFinite(nextLat) || !Number.isFinite(nextLon)) return false;
    targetPoint = { lat: nextLat, lon: nextLon };
    const shown = globe.showTargetPoint(nextLat, nextLon, { focus });
    if (shown) {
      post("album-map:target-change", {
        ...targetPoint,
        source: "search",
      });
    }
    return shown;
  }

  function clearSearchApplyTimer() {
    window.clearTimeout(searchApplyTimer);
    searchApplyTimer = 0;
  }

  function scheduleSearchApply(lat, lon) {
    clearSearchApplyTimer();
    if (!assignMode) return;
    const expectedLat = Number(lat);
    const expectedLon = Number(lon);
    const flightDuration = Number(document.body.dataset.flightDuration) || 760;
    searchApplyTimer = window.setTimeout(() => {
      searchApplyTimer = 0;
      if (
        !targetPoint ||
        Math.abs(targetPoint.lat - expectedLat) > 1e-7 ||
        Math.abs(targetPoint.lon - expectedLon) > 1e-7
      ) {
        return;
      }
      hideSearchResults();
      setSearchExpanded(false, { focus: false });
      post("album-map:apply-location");
    }, flightDuration + 80);
  }

  function renderSearchResults(results) {
    searchResults.replaceChildren();
    results.forEach((place) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "globe-place-search-result";
      button.setAttribute("role", "option");
      const name = document.createElement("span");
      name.className = "globe-place-search-result-name";
      name.textContent = place.name || "未命名地点";
      const detail = document.createElement("span");
      detail.className = "globe-place-search-result-detail";
      detail.textContent = place.detail || "";
      button.append(name, detail);
      button.addEventListener("click", () => {
        selectSearchPlace(place, { hideResults: true });
      });
      searchResults.appendChild(button);
    });
    searchResults.hidden = false;
  }

  function selectSearchPlace(place, { hideResults = false } = {}) {
    if (!place) return;
    searchInput.value = place.name || "";
    syncSearchWidth();
    if (hideResults) hideSearchResults();
    const source = globe.sourceLatLng(place.lat, place.lon);
    if (setTarget(source.lat, source.lon, { focus: true })) {
      scheduleSearchApply(source.lat, source.lon);
    }
    if (hideResults) searchInput.blur();
  }

  async function searchPlaces(value) {
    searchAbort?.abort();
    searchAbort = new AbortController();
    const response = await fetch(
      "https://restapi.amap.com/v3/place/text" +
        `?key=${encodeURIComponent(AMAP_KEY)}` +
        `&keywords=${encodeURIComponent(value)}` +
        "&offset=6&page=1&extensions=base",
      { signal: searchAbort.signal },
    );
    if (!response.ok) throw new Error(`搜索服务返回 ${response.status}`);
    const data = await response.json();
    if (data?.status !== "1") {
      throw new Error(data?.info || "地点搜索服务不可用");
    }
    return (Array.isArray(data?.pois) ? data.pois : [])
      .map((poi) => {
        const [lngText, latText] = String(poi.location || "").split(",");
        const lat = Number(latText);
        const lon = Number(lngText);
        if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;
        return {
          name: String(poi.name || "未命名地点"),
          detail: [poi.cityname, poi.adname]
            .filter(Boolean)
            .filter((entry, index, list) => list.indexOf(entry) === index)
            .join(" · "),
          lat,
          lon,
        };
      })
      .filter(Boolean);
  }

  async function runSearch() {
    if (!assignMode || !searchInput) return;
    const value = searchInput.value.trim();
    if (!value) {
      searchInput.focus();
      return;
    }
    clearSearchApplyTimer();
    hideSearchResults();
    showNotice("正在搜索地点…");
    searchInput.setAttribute("aria-busy", "true");
    try {
      const results = await searchPlaces(value);
      if (!results.length) {
        showNotice("没有找到这个地点", 2200);
        return;
      }
      notice.hidden = true;
      renderSearchResults(results);
      selectSearchPlace(results[0]);
    } catch (error) {
      if (error?.name === "AbortError") return;
      showNotice("搜索失败，请检查网络连接", 2600);
    } finally {
      searchInput.removeAttribute("aria-busy");
    }
  }

  searchForm?.addEventListener("submit", (event) => {
    event.preventDefault();
    if (!searchExpanded) {
      setSearchExpanded(true);
      return;
    }
    window.clearTimeout(searchInputTimer);
    searchInputTimer = 0;
    void runSearch();
  });
  closeButton?.addEventListener("click", () => {
    post("album-map:cancel");
  });
  searchInput?.addEventListener("compositionstart", () => {
    searchComposing = true;
  });
  searchInput?.addEventListener("compositionend", () => {
    searchComposing = false;
    searchInput.dispatchEvent(new Event("input", { bubbles: true }));
  });
  searchInput?.addEventListener("input", (event) => {
    clearSearchApplyTimer();
    syncSearchWidth();
    window.clearTimeout(searchInputTimer);
    searchInputTimer = 0;
    searchAbort?.abort();
    const value = searchInput.value.trim();
    if (!value) {
      hideSearchResults();
      return;
    }
    if (searchComposing || event.isComposing || value.length < SEARCH_MIN_CHARS)
      return;
    searchInputTimer = window.setTimeout(() => {
      searchInputTimer = 0;
      void runSearch();
    }, SEARCH_INPUT_DELAY);
  });
  window.addEventListener(
    "pointermove",
    (event) => {
      lastPointer = { x: event.clientX, y: event.clientY };
      updateControlProximity();
      postPointerForParent();
    },
    { passive: true },
  );
  document.documentElement.addEventListener("pointerleave", () => {
    cancelAnimationFrame(parentPointerFrame);
    parentPointerFrame = 0;
    lastPointer = { x: NaN, y: NaN };
    updateControlProximity();
    post("album-map:pointer-leave");
  });
  window.addEventListener("resize", syncSearchWidth);
  searchInput?.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      event.preventDefault();
      window.clearTimeout(searchInputTimer);
      searchInputTimer = 0;
      searchAbort?.abort();
      clearSearchApplyTimer();
      hideSearchResults();
      if (searchInput.value.trim()) searchInput.blur();
      else setSearchExpanded(false);
    }
  });
  document.addEventListener("pointerdown", (event) => {
    if (!searchForm || searchForm.contains(event.target)) return;
    clearSearchApplyTimer();
    hideSearchResults();
    if (searchExpanded && !searchInput.value.trim()) {
      setSearchExpanded(false, { focus: false });
    }
  });
  document.addEventListener("keydown", (event) => {
    if (!assignMode || event.isComposing) return;
    if (event.key === "Control" && !event.repeat) {
      post("album-map:control-state", { held: true });
    }
    if (event.key === "Escape") {
      event.preventDefault();
      event.stopPropagation();
      post("album-map:cancel");
      return;
    }
    if (event.key !== "Enter") return;
    const active = document.activeElement;
    if (searchForm?.contains(active)) return;
    if (!targetPoint) {
      event.preventDefault();
      event.stopPropagation();
      post("album-map:apply-without-target");
      return;
    }
    event.preventDefault();
    event.stopPropagation();
    post("album-map:apply-location");
  });
  document.addEventListener("keyup", (event) => {
    if (assignMode && event.key === "Control") {
      post("album-map:control-state", { held: false });
    }
  });
  window.addEventListener("blur", () => {
    if (assignMode) post("album-map:control-state", { held: false });
  });

  window.addEventListener("message", (event) => {
    if (event.origin !== origin || event.source !== window.parent) return;
    const message = event.data || {};
    const incomingEntryId = Number(message.entryId);
    if (Number.isInteger(incomingEntryId) && incomingEntryId > 0) {
      entryId = incomingEntryId;
    }
    if (message.type === "album-map:hello") {
      post("album-map:ready");
      if (globe.firstFrameSent) post("album-map:first-frame");
      return;
    }
    if (message.type === "album-map:activate") {
      globe.activate();
      return;
    }
    if (message.type === "album-map:set-window-drag") {
      globe.setWindowDragging(message.active === true);
      return;
    }
    if (message.type === "album-map:reset") {
      globe.resetView();
      return;
    }
    if (message.type === "album-map:reset-globe") {
      globe.resetToGlobe();
      return;
    }
    if (message.type === "album-map:set-network") {
      globe.setNetwork(message.enabled === true);
      return;
    }
    if (message.type === "album-map:set-tile-provider") {
      globe.setTileProvider(message.provider);
      return;
    }
    if (message.type === "album-map:set-style") {
      globe.setStyleKind(message.kind === "street" ? "street" : "satellite");
      return;
    }
    if (message.type === "album-map:set-flight-speed") {
      globe.setFlightSpeed(message.speed);
      return;
    }
    if (message.type === "album-map:set-controls-visible") {
      setControlsVisible(message.visible === true);
      return;
    }
    if (message.type === "album-map:set-controls-near") {
      controlsNear = message.near === true || controlPointerHovered();
      document.body.classList.toggle(
        "map-buttons-near",
        !controlsVisible && controlsNear,
      );
      return;
    }
    if (message.type === "album-map:set-selected") {
      clearSearchApplyTimer();
      globe.setSelected(message.id);
      return;
    }
    if (message.type === "album-map:set-photos-hidden") {
      if (assignMode) globe.setPhotosHidden(message.hidden === true);
      return;
    }
    if (message.type === "album-map:focus-item") {
      globe.focusItem(message.id, {
        zoom: 12,
        ripple: true,
        keepZoom: false,
      });
      return;
    }
    if (message.type === "album-map:set-target") {
      globe.showTarget(message.id);
      return;
    }
    if (message.type === "album-map:clear-target") {
      clearSearchApplyTimer();
      targetPoint = null;
      globe.clearTarget();
      return;
    }
    if (message.type === "album-map:set-items") {
      const items = Array.isArray(message.items) ? message.items : [];
      globe.setItems(items, {
        fit: message.fit !== false,
        deferFit: message.deferFit === true,
        fitToken: Number(message.fitToken) || 0,
      });
      post("album-map:items-ready", { count: items.length });
      if (!assignMode) {
        showNotice(items.length ? "" : "这个相簿没有带位置信息的照片");
      } else if (!items.length && !targetPoint) {
        showNotice("");
      }
      return;
    }
    if (message.type === "album-map:animate-fit") {
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
        globe.fitAll();
        post("album-map:fit-complete");
        return;
      }
      const started = globe.flyToFit({
        onComplete: () => post("album-map:fit-complete"),
      });
      if (!started) post("album-map:fit-complete");
      return;
    }
  });

  document.addEventListener("keydown", (event) => {
    if (event.isComposing) return;
    if (
      event.target instanceof HTMLInputElement ||
      event.target instanceof HTMLTextAreaElement ||
      event.target?.isContentEditable
    ) {
      return;
    }
    if (
      (event.ctrlKey || event.metaKey) &&
      !event.altKey &&
      event.key.toLowerCase() === "z"
    ) {
      event.preventDefault();
      post("album-map:undo");
      return;
    }
    if (assignMode || event.key !== "Escape") return;
    event.preventDefault();
    post("album-map:escape");
  });

  post("album-map:ready");
})();
