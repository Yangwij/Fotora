(() => {
  "use strict";

  const origin = window.location.origin;
  const notice = document.getElementById("locationsNotice");
  const query = new URLSearchParams(window.location.search);
  const searchForm = document.getElementById("locationsMapSearch");
  const searchInput = document.getElementById("locationsMapSearchInput");
  const searchResults = document.getElementById("locationsMapSearchResults");
  const compassButton = document.getElementById("locationsCompassButton");
  const typeToggle = document.getElementById("locationsTypeToggle");
  const AMAP_KEY = "ab2b9e88e482a653a507e10151dccd9e";
  const SEARCH_SESSION_KEY = "photo-locations-search-session-v1";
  const SEARCH_MIN_WIDTH = 144;
  const SEARCH_MAX_WIDTH = 320;
  const MAP_CONTROL_PROXIMITY_PADDING = 64;
  const MAP_CONTROL_PROXIMITY_EXIT_PADDING = 96;
  let noticeTimer = 0;
  let searchAbort = null;
  let searchInputTimer = 0;
  let searchExpanded = false;
  let controlsNear = false;
  let resultsDrag = null;
  let suppressResultClickUntil = 0;
  let controlsVisible = true;
  let lastPointer = { x: NaN, y: NaN };
  let filmstripPointerFrame = 0;
  let searchSession = readSearchSession();

  function post(type, payload = {}) {
    window.parent.postMessage({ type, ...payload }, origin);
  }

  function showNotice(message, duration = 1800) {
    window.clearTimeout(noticeTimer);
    notice.textContent = message;
    notice.hidden = !message;
    if (message && duration > 0) {
      noticeTimer = window.setTimeout(() => {
        notice.hidden = true;
      }, duration);
    }
  }

  function mapControlElements() {
    return [searchForm, compassButton, typeToggle].filter(Boolean);
  }

  function controlPointerHovered() {
    return mapControlElements().some((element) => element.matches(":hover"));
  }

  function postPointerForFilmstrip() {
    if (controlsVisible || filmstripPointerFrame) return;
    filmstripPointerFrame = requestAnimationFrame(() => {
      filmstripPointerFrame = 0;
      if (
        controlsVisible ||
        !Number.isFinite(lastPointer.x) ||
        !Number.isFinite(lastPointer.y)
      )
        return;
      post("locations-map:pointer", {
        pointerX: lastPointer.x,
        pointerY: lastPointer.y,
        controlsNear,
      });
    });
  }

  function revealControlsTemporarily() {
    if (controlsVisible) return;
    document.body.classList.add("map-buttons-near");
  }

  function setControlsVisible(visible) {
    controlsVisible = visible !== false;
    document.body.classList.toggle("map-buttons-hover-only", !controlsVisible);
    controlsNear = false;
    document.body.classList.remove("map-buttons-near");
    updateControlProximity();
    postPointerForFilmstrip();
  }

  function updateControlProximity(x = lastPointer.x, y = lastPointer.y) {
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

  function hideSearchResults() {
    if (!searchResults) return;
    searchResults.hidden = true;
    searchResults.replaceChildren();
  }

  function readSearchSession() {
    try {
      const stored = JSON.parse(sessionStorage.getItem(SEARCH_SESSION_KEY));
      const query = String(stored?.query || "").trim();
      const results = Array.isArray(stored?.results)
        ? stored.results
            .filter((place) => {
              const lat = Number(place?.lat);
              const lon = Number(place?.lon);
              return (
                String(place?.name || "").trim() &&
                Number.isFinite(lat) &&
                Number.isFinite(lon) &&
                lat >= -90 &&
                lat <= 90 &&
                lon >= -180 &&
                lon <= 180
              );
            })
            .slice(0, 30)
        : [];
      return query && results.length ? { query, results } : null;
    } catch {
      return null;
    }
  }

  function saveSearchSession(query, results) {
    searchSession = { query, results };
    try {
      sessionStorage.setItem(SEARCH_SESSION_KEY, JSON.stringify(searchSession));
    } catch {}
  }

  function clearSearchSession() {
    searchSession = null;
    try {
      sessionStorage.removeItem(SEARCH_SESSION_KEY);
    } catch {}
  }

  function syncSearchWidth() {
    if (!searchForm || !searchInput) return;
    if (!searchExpanded || !searchInput.value) {
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
    const textWidth = context.measureText(searchInput.value).width;
    const horizontalChrome =
      Number.parseFloat(formStyle.paddingLeft) +
      Number.parseFloat(formStyle.paddingRight) +
      Number.parseFloat(inputStyle.paddingLeft) +
      Number.parseFloat(inputStyle.paddingRight) +
      (submit?.getBoundingClientRect().width || 36) +
      6;
    const maxWidth = Math.max(
      SEARCH_MIN_WIDTH,
      Math.min(SEARCH_MAX_WIDTH, searchForm.getBoundingClientRect().right - 18),
    );
    const width = Math.min(
      maxWidth,
      Math.max(SEARCH_MIN_WIDTH, Math.ceil(textWidth + horizontalChrome)),
    );
    searchForm.style.width = `${width}px`;
  }

  function setSearchExpanded(expanded, { focus = true } = {}) {
    if (!searchForm || !searchInput) return;
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
    if (!searchExpanded) {
      hideSearchResults();
      searchForm.style.removeProperty("width");
    } else if (focus) {
      requestAnimationFrame(() => {
        syncSearchWidth();
        searchInput.focus();
      });
    } else {
      syncSearchWidth();
    }
    if (
      searchExpanded &&
      searchSession &&
      searchSession.query === searchInput.value.trim()
    ) {
      requestAnimationFrame(() => {
        if (
          searchExpanded &&
          searchSession &&
          searchSession.query === searchInput.value.trim()
        ) {
          renderSearchResults(searchSession.results);
        }
      });
    }
    updateControlProximity();
  }

  const globe = new window.EmbeddedGlobe({
    containerId: "locationsMap",
    typeToggleId: "locationsTypeToggle",
    compassButtonId: "locationsCompassButton",
    initialCenter: [112.3, 28.8],
    initialZoom: 3.69,
    pitch: 26,
    bearing: -6,
    verticalOffset: 47,
    scaleWithViewport: true,
    stableZoomView: true,
    autoPitchForZoom: true,
    baseViewport: [1126, 644],
    fitItems: false,
    networkEnabled: false,
    flightSpeed: query.get("speed") || "medium",
    tileProvider: query.get("provider") === "google" ? "google" : "amap",
    markerClass: "location-thumb-marker",
    initialStyle: query.get("satellite") === "0" ? "street" : "satellite",
    onEvent(type, payload) {
      if (type === "first-frame") {
        post("locations-map:first-frame");
        return;
      }
      if (type === "select-item") {
        post("locations-map:select", { id: payload.id });
        return;
      }
      if (type === "open-stack") {
        post("locations-map:open-stack", { ids: payload.ids });
        return;
      }
      if (type === "open-item") {
        post("locations-map:open-item", { id: payload.id });
        return;
      }
      if (type === "focus-item") {
        post("locations-map:focus-change", { id: payload.id });
        return;
      }
      if (type === "error") {
        post("locations-map:error", { message: payload.message });
        showNotice("地图无法载入", 0);
        return;
      }
      if (type === "context-lost") {
        post("locations-map:context-lost");
        showNotice("地图正在恢复…");
      }
    },
  });

  function focusSearchResult(place, { collapse = false } = {}) {
    if (!place) return;
    const source = globe.sourceLatLng(place.lat, place.lon);
    globe.focusCoordinate(source.lat, source.lon, { zoom: 13 });
    if (!collapse) return;
    syncSearchWidth();
    hideSearchResults();
    setSearchExpanded(false, { focus: false });
    searchInput.blur();
  }

  function renderSearchResults(results) {
    if (!searchResults || !searchInput) return;
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
        focusSearchResult(place, { collapse: true });
      });
      searchResults.appendChild(button);
    });
    searchResults.hidden = false;
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
    if (!searchInput) return;
    window.clearTimeout(searchInputTimer);
    searchInputTimer = 0;
    const value = searchInput.value.trim();
    if (!value) {
      searchInput.focus();
      return;
    }
    hideSearchResults();
    showNotice("");
    searchInput.setAttribute("aria-busy", "true");
    try {
      const results = await searchPlaces(value);
      if (!results.length) {
        clearSearchSession();
        showNotice("没有找到这个地点", 2200);
        return;
      }
      notice.hidden = true;
      saveSearchSession(value, results);
      renderSearchResults(results);
      focusSearchResult(results[0]);
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
    void runSearch();
  });
  searchInput?.addEventListener("input", () => {
    window.clearTimeout(searchInputTimer);
    searchInputTimer = 0;
    searchAbort?.abort();
    syncSearchWidth();
    if (!searchInput.value.trim()) {
      hideSearchResults();
      return;
    }
    searchInputTimer = window.setTimeout(() => {
      searchInputTimer = 0;
      void runSearch();
    }, 240);
  });
  searchInput?.addEventListener("keydown", (event) => {
    if (event.key !== "Escape") return;
    event.preventDefault();
    event.stopPropagation();
    hideSearchResults();
    if (searchInput.value.trim()) searchInput.blur();
    else setSearchExpanded(false);
  });
  searchResults?.addEventListener(
    "click",
    (event) => {
      if (performance.now() >= suppressResultClickUntil) return;
      event.preventDefault();
      event.stopImmediatePropagation();
    },
    true,
  );
  searchResults?.addEventListener("pointerdown", (event) => {
    if (event.button !== 0) return;
    resultsDrag = {
      pointerId: event.pointerId,
      startY: event.clientY,
      startScrollTop: searchResults.scrollTop,
      moved: false,
    };
  });
  searchResults?.addEventListener("pointermove", (event) => {
    if (!resultsDrag || resultsDrag.pointerId !== event.pointerId) return;
    const delta = event.clientY - resultsDrag.startY;
    if (!resultsDrag.moved && Math.abs(delta) < 4) return;
    if (!resultsDrag.moved) {
      try {
        searchResults.setPointerCapture(event.pointerId);
      } catch {}
    }
    resultsDrag.moved = true;
    searchResults.classList.add("is-dragging");
    searchResults.scrollTop = resultsDrag.startScrollTop - delta;
    event.preventDefault();
  });
  const finishResultsDrag = (event) => {
    if (!resultsDrag || resultsDrag.pointerId !== event.pointerId) return;
    const moved = resultsDrag.moved;
    resultsDrag = null;
    searchResults?.classList.remove("is-dragging");
    if (searchResults?.hasPointerCapture(event.pointerId)) {
      searchResults.releasePointerCapture(event.pointerId);
    }
    if (moved) suppressResultClickUntil = performance.now() + 320;
  };
  searchResults?.addEventListener("pointerup", finishResultsDrag);
  searchResults?.addEventListener("pointercancel", finishResultsDrag);
  document.addEventListener("pointerdown", (event) => {
    if (!searchForm || searchForm.contains(event.target)) return;
    hideSearchResults();
    if (searchExpanded && !searchInput?.value.trim()) {
      setSearchExpanded(false, { focus: false });
    }
  });
  window.addEventListener(
    "pointermove",
    (event) => {
      lastPointer = { x: event.clientX, y: event.clientY };
      updateControlProximity();
      postPointerForFilmstrip();
    },
    { passive: true },
  );
  window.addEventListener("pointerout", (event) => {
    if (event.relatedTarget) return;
    cancelAnimationFrame(filmstripPointerFrame);
    filmstripPointerFrame = 0;
    post("locations-map:pointer-leave");
  });
  document.documentElement.addEventListener("pointerleave", () => {
    lastPointer = { x: NaN, y: NaN };
    updateControlProximity();
  });
  window.addEventListener("resize", syncSearchWidth);

  window.addEventListener("message", (event) => {
    if (event.origin !== origin || event.source !== window.parent) return;
    const message = event.data || {};
    if (message.type === "photo:color-mode") {
      const mode =
        message.mode === "light" || message.mode === "dark"
          ? message.mode
          : "auto";
      document.documentElement.dataset.colorMode = mode;
      document.documentElement.style.colorScheme =
        mode === "auto" ? "light dark" : mode;
      return;
    }
    if (message.type === "locations-map:hello") {
      post("locations-map:ready");
      if (globe.firstFrameSent) post("locations-map:first-frame");
      return;
    }
    if (message.type === "locations-map:activate") {
      globe.activate();
      return;
    }
    if (message.type === "locations-map:set-window-drag") {
      globe.setWindowDragging(message.active === true);
      return;
    }
    if (message.type === "locations-map:reset") {
      globe.resetView();
      return;
    }
    if (message.type === "locations-map:reset-globe") {
      globe.resetToGlobe();
      return;
    }
    if (message.type === "locations-map:set-network") {
      globe.setNetwork(message.enabled === true);
      return;
    }
    if (message.type === "locations-map:set-tile-provider") {
      globe.setTileProvider(message.provider);
      return;
    }
    if (message.type === "locations-map:set-flight-speed") {
      globe.setFlightSpeed(message.speed);
      return;
    }
    if (message.type === "locations-map:set-style") {
      globe.setStyleKind(message.kind === "street" ? "street" : "satellite");
      return;
    }
    if (message.type === "locations-map:set-chrome") {
      document.documentElement.classList.toggle(
        "show-map-chrome",
        message.transparentTitlebar === true,
      );
      return;
    }
    if (message.type === "locations-map:set-controls-visible") {
      setControlsVisible(message.visible === true);
      return;
    }
    if (message.type === "locations-map:set-controls-near") {
      controlsNear = message.near === true || controlPointerHovered();
      document.body.classList.toggle(
        "map-buttons-near",
        !controlsVisible && controlsNear,
      );
      return;
    }
    if (message.type === "locations-map:set-items") {
      globe.setItems(message.items, { fit: false });
      const count = Array.isArray(message.items) ? message.items.length : 0;
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          post("locations-map:items-ready", { count });
        });
      });
      return;
    }
    if (message.type === "locations-map:animate-fit") {
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
        globe.fitAll();
        post("locations-map:fit-complete");
        return;
      }
      const started = globe.flyToFit({
        onComplete: () => post("locations-map:fit-complete"),
      });
      if (!started) post("locations-map:fit-complete");
      return;
    }
    if (message.type === "locations-map:set-selected") {
      globe.setSelected(message.id);
      return;
    }
    if (message.type === "locations-map:focus-item") {
      globe.focusItem(message.id, {
        zoom: 12,
        ripple: true,
        keepZoom: false,
      });
      return;
    }
    if (message.type === "locations-map:set-target") {
      globe.showTarget(message.id);
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
      post("locations-map:undo");
      return;
    }
    if (event.key !== "Escape") return;
    event.preventDefault();
    post("locations-map:escape");
  });

  setControlsVisible(true);
  post("locations-map:ready");
})();
