(() => {
  "use strict";

  const origin = window.location.origin;
  const mapNode = document.getElementById("metadataMap");
  const closeButton = document.getElementById("mapCloseButton");
  const typeToggle = document.getElementById("mapTypeToggle");
  const searchForm = document.getElementById("locationSearch");
  const searchInput = document.getElementById("locationSearchInput");
  const searchClear = document.getElementById("locationSearchClear");
  const searchSubmit = document.getElementById("locationSearchSubmit");
  const searchResults = document.getElementById("locationSearchResults");
  const confirmButton = document.getElementById("mapConfirmButton");
  const mapNotice = document.getElementById("mapNotice");
  const query = new URLSearchParams(window.location.search);
  const previewMode = query.get("mode") === "preview";
  const viewMode = query.get("mode") === "view";
  const readOnlySurface = previewMode || viewMode;

  const AMAP_BOUNDS = [-180, -60, 180, 60];
  const AMAP_KEY = "ab2b9e88e482a653a507e10151dccd9e";
  const TILE_MAX_ZOOM = 18;
  const DEFAULT_CENTER = [104.2, 35.6];
  const CHINA_ZOOM = 3.55;
  const CHINA_BOUNDS = [
    [73.5, 18],
    [135.1, 53.6],
  ];
  const CHINA_PADDING = { top: 64, right: 64, bottom: 76, left: 64 };
  const PLACE_ZOOM = 14.5;
  const READ_ONLY_ZOOM = 13.2;
  const SEARCH_MIN_WIDTH = 214;
  const SEARCH_MAX_WIDTH = 320;
  const SEARCH_INPUT_DELAY = 420;
  const SEARCH_MIN_CHARS = 2;
  const WHEEL_ZOOM_RATE = 0.0021;
  const DRAG_MOVE_PX = 4;
  const PI = Math.PI;
  const A = 6378245.0;
  const EE = 0.006693421622965943;

  let map = null;
  let dragInertia = null;
  let mapLoaded = false;
  let firstFrameSent = false;
  const previewLat = Number(query.get("lat"));
  const previewLng = Number(query.get("lon"));
  let pendingLocation =
    readOnlySurface &&
    Number.isFinite(previewLat) &&
    Number.isFinite(previewLng)
      ? { points: [{ lat: previewLat, lon: previewLng }] }
      : null;
  let pendingPreviewRequest = null;
  let networkEnabled = query.get("network") === "1";
  let tileProvider = query.get("provider") === "google" ? "google" : "amap";
  let styleKind = viewMode ? "satellite" : "street";
  let selectedMarker = null;
  let currentPoint = null;
  let secondaryMarkers = [];
  let noticeTimer = 0;
  let searchAbort = null;
  let searchInputTimer = 0;
  let searchComposing = false;
  let confirmPending = false;
  let rememberedSearchQuery = "";

  document.body.classList.toggle("is-preview", previewMode);
  document.body.classList.toggle("is-view-only", viewMode);

  function post(type, payload = {}) {
    window.parent.postMessage({ type, ...payload }, origin);
  }

  function postLocation(lat, lon, label = "", source = "map") {
    currentPoint = { lat, lon, label };
    post("metadata-map:location-change", { lat, lon, label, source });
  }

  function outOfChina(lng, lat) {
    return lng < 72.004 || lng > 137.8347 || lat < 0.8293 || lat > 55.8271;
  }

  function transformLat(x, y) {
    let ret =
      -100 +
      2 * x +
      3 * y +
      0.2 * y * y +
      0.1 * x * y +
      0.2 * Math.sqrt(Math.abs(x));
    ret += ((20 * Math.sin(6 * x * PI) + 20 * Math.sin(2 * x * PI)) * 2) / 3;
    ret += ((20 * Math.sin(y * PI) + 40 * Math.sin((y / 3) * PI)) * 2) / 3;
    ret +=
      ((160 * Math.sin((y / 12) * PI) + 320 * Math.sin((y * PI) / 30)) * 2) / 3;
    return ret;
  }

  function transformLng(x, y) {
    let ret =
      300 +
      x +
      2 * y +
      0.1 * x * x +
      0.1 * x * y +
      0.1 * Math.sqrt(Math.abs(x));
    ret += ((20 * Math.sin(6 * x * PI) + 20 * Math.sin(2 * x * PI)) * 2) / 3;
    ret += ((20 * Math.sin(x * PI) + 40 * Math.sin((x / 3) * PI)) * 2) / 3;
    ret +=
      ((150 * Math.sin((x / 12) * PI) + 300 * Math.sin((x / 30) * PI)) * 2) / 3;
    return ret;
  }

  function wgs2gcj(lat, lng) {
    if (outOfChina(lng, lat)) return [lat, lng];
    const dLat = transformLat(lng - 105, lat - 35);
    const dLng = transformLng(lng - 105, lat - 35);
    const radLat = (lat / 180) * PI;
    const magic = 1 - EE * Math.sin(radLat) ** 2;
    const sqrtMagic = Math.sqrt(magic);
    const nextLat =
      lat + (dLat * 180) / (((A * (1 - EE)) / (magic * sqrtMagic)) * PI);
    const nextLng =
      lng + (dLng * 180) / ((A / sqrtMagic) * Math.cos(radLat) * PI);
    return [nextLat, nextLng];
  }

  function gcj2wgs(lat, lng) {
    if (outOfChina(lng, lat)) return [lat, lng];
    let nextLat = lat;
    let nextLng = lng;
    for (let index = 0; index < 15; index += 1) {
      const [gLat, gLng] = wgs2gcj(nextLat, nextLng);
      nextLat -= gLat - lat;
      nextLng -= gLng - lng;
    }
    return [nextLat, nextLng];
  }

  function mapUsesGcjCoordinates() {
    return networkEnabled && tileProvider === "amap";
  }

  function displayLngLat(lat, lng) {
    if (!mapUsesGcjCoordinates()) return [lng, lat];
    const [displayLat, displayLng] = wgs2gcj(lat, lng);
    return [displayLng, displayLat];
  }

  function sourceLatLng(lat, lng) {
    if (!mapUsesGcjCoordinates()) return { lat, lon: lng };
    const [sourceLat, sourceLng] = gcj2wgs(lat, lng);
    return { lat: sourceLat, lon: sourceLng };
  }

  /* 地点搜索始终返回高德使用的 GCJ-02；写入照片前必须换成 WGS-84，
     不能跟随当前瓦片服务，否则切到谷歌后搜索结果会偏移。 */
  function searchSourceLatLng(lat, lng) {
    const [sourceLat, sourceLng] = gcj2wgs(lat, lng);
    return { lat: sourceLat, lon: sourceLng };
  }

  function amapTileUrls(kind) {
    const urls = [];
    for (let index = 1; index <= 4; index += 1) {
      if (kind === "satellite") {
        urls.push(
          `https://webst0${index}.is.autonavi.com/appmaptile` +
            "?style=6&x={x}&y={y}&z={z}",
        );
      } else {
        urls.push(
          `https://webrd0${index}.is.autonavi.com/appmaptile` +
            "?lang=zh_cn&size=1&scale=1&style=7&x={x}&y={y}&z={z}",
        );
      }
    }
    return urls;
  }

  function googleTileUrls(kind) {
    const layer = kind === "satellite" ? "s" : "m";
    return [0, 1, 2, 3].map(
      (index) =>
        `https://mt${index}.google.com/vt/lyrs=${layer}&x={x}&y={y}&z={z}`,
    );
  }

  function buildMapStyle() {
    const sources = {
      "world-satellite": {
        type: "raster",
        tiles: ["./assets/world-sat/{z}/{x}/{y}.jpg"],
        tileSize: 256,
        minzoom: 0,
        maxzoom: 0,
      },
      "world-street": {
        type: "raster",
        tiles: ["./assets/world-vec/{z}/{x}/{y}.jpg"],
        tileSize: 256,
        minzoom: 0,
        maxzoom: 0,
      },
    };
    const layers = [
      {
        id: "space",
        type: "background",
        paint: { "background-color": "#08111c" },
      },
      {
        id: "world-street",
        type: "raster",
        source: "world-street",
        layout: { visibility: styleKind === "street" ? "visible" : "none" },
      },
      {
        id: "world-satellite",
        type: "raster",
        source: "world-satellite",
        layout: { visibility: styleKind === "satellite" ? "visible" : "none" },
      },
    ];
    if (networkEnabled) {
      const onlineTileUrls =
        tileProvider === "google" ? googleTileUrls : amapTileUrls;
      sources["online-street"] = {
        type: "raster",
        tiles: onlineTileUrls("street"),
        tileSize: 256,
        minzoom: 0,
        maxzoom: TILE_MAX_ZOOM,
        bounds: AMAP_BOUNDS,
      };
      sources["online-satellite"] = {
        type: "raster",
        tiles: onlineTileUrls("satellite"),
        tileSize: 256,
        minzoom: 0,
        maxzoom: TILE_MAX_ZOOM,
        bounds: AMAP_BOUNDS,
      };
      layers.push(
        {
          id: "online-satellite",
          type: "raster",
          source: "online-satellite",
          layout: {
            visibility: styleKind === "satellite" ? "visible" : "none",
          },
        },
        {
          id: "online-street",
          type: "raster",
          source: "online-street",
          layout: { visibility: styleKind === "street" ? "visible" : "none" },
        },
      );
    }
    return {
      version: 8,
      projection: { type: "mercator" },
      sources,
      layers,
    };
  }

  function showNotice(message, error = false, duration = 2200) {
    window.clearTimeout(noticeTimer);
    mapNotice.textContent = message;
    mapNotice.classList.toggle("is-error", error);
    mapNotice.hidden = false;
    if (duration > 0) {
      noticeTimer = window.setTimeout(() => {
        mapNotice.hidden = true;
      }, duration);
    }
  }

  function updateNetworkUi() {
    document.body.classList.toggle("is-offline", !networkEnabled);
    document.body.dataset.networkEnabled = String(networkEnabled);
    searchInput.disabled = !networkEnabled;
    searchSubmit.disabled = !networkEnabled;
    searchClear.disabled = !networkEnabled;
    searchInput.placeholder = networkEnabled
      ? "搜索地点或输入地址"
      : "离线模式 · 仅本地世界底图";
    if (!networkEnabled) {
      hideSearchResults();
    }
    syncSearchWidth();
  }

  function setConfirmEnabled(enabled) {
    const visible = enabled && !readOnlySurface;
    confirmButton.hidden = !visible;
    confirmButton.disabled = !visible || confirmPending;
    confirmButton.classList.remove("is-failed");
    if (!visible && !confirmPending) currentPoint = null;
    syncSearchWidth();
  }

  function setConfirmPending(pending) {
    confirmPending = Boolean(pending);
    confirmButton.disabled = confirmPending || !currentPoint;
    confirmButton.classList.toggle("is-pending", confirmPending);
  }

  function applyNetworkEnabled(enabled) {
    const next = enabled === true;
    if (networkEnabled === next) {
      updateNetworkUi();
      return;
    }
    networkEnabled = next;
    updateNetworkUi();
    selectedMarker?.setDraggable(networkEnabled && !readOnlySurface);
    if (!map || !mapLoaded) return;
    map.setStyle(buildMapStyle());
    map.once("style.load", () => {
      setStyleKind(styleKind);
    });
  }

  function clampMapZoom(value) {
    return Math.min(18, Math.max(1, value));
  }

  function applyZoomAtAnchor(zoom, anchor, point) {
    window.MapInteractionHelpers.zoomAtAnchor(map, zoom, 0, anchor, point);
  }

  function handleWheelZoom(event) {
    if (!mapLoaded || previewMode) return;
    event.preventDefault();
    dragInertia?.cancel();
    const unit =
      event.deltaMode === 1
        ? 16
        : event.deltaMode === 2
          ? mapNode.clientHeight
          : 1;
    const delta = event.deltaY * unit;
    if (!delta) return;

    const rect = mapNode.getBoundingClientRect();
    const clientX = Number.isFinite(event.clientX)
      ? event.clientX
      : rect.left + rect.width / 2;
    const clientY = Number.isFinite(event.clientY)
      ? event.clientY
      : rect.top + rect.height / 2;
    const anchor = {
      x: Math.min(rect.width, Math.max(0, clientX - rect.left)),
      y: Math.min(rect.height, Math.max(0, clientY - rect.top)),
    };
    const nextZoom = clampMapZoom(map.getZoom() - delta * WHEEL_ZOOM_RATE);
    const anchorLngLat = map.unproject(anchor);
    /* 缩放和俯仰在同一次相机更新中完成，并把鼠标下的经纬度保持在原位。 */
    applyZoomAtAnchor(nextZoom, anchorLngLat, anchor);
  }

  function bindDragInertia() {
    if (!map || previewMode || !window.DragInertiaController) return;
    dragInertia = new window.DragInertiaController(map);
    const canvas = map.getCanvas();
    let drag = null;

    canvas.addEventListener(
      "pointerdown",
      (event) => {
        if (event.button !== 0) return;
        dragInertia.cancel();
        drag = {
          pointerId: event.pointerId,
          startX: event.clientX,
          startY: event.clientY,
          lastX: event.clientX,
          lastY: event.clientY,
          samples: [
            {
              time: performance.now(),
              x: event.clientX,
              y: event.clientY,
            },
          ],
          active: false,
        };
      },
      true,
    );

    window.addEventListener(
      "pointermove",
      (event) => {
        if (!drag || drag.pointerId !== event.pointerId) return;
        drag.lastX = event.clientX;
        drag.lastY = event.clientY;
        drag.samples.push({
          time: performance.now(),
          x: event.clientX,
          y: event.clientY,
        });
        if (drag.samples.length > 48) drag.samples.shift();
        if (
          Math.hypot(
            event.clientX - drag.startX,
            event.clientY - drag.startY,
          ) >= DRAG_MOVE_PX
        ) {
          drag.active = true;
        }
      },
      true,
    );

    window.addEventListener(
      "pointerup",
      (event) => {
        if (!drag || drag.pointerId !== event.pointerId) return;
        const finished = drag;
        drag = null;
        if (finished.active) dragInertia.startPan(finished);
      },
      true,
    );

    window.addEventListener(
      "pointercancel",
      (event) => {
        if (drag && drag.pointerId === event.pointerId) drag = null;
      },
      true,
    );
  }

  function normalizePoints(payload) {
    const raw = Array.isArray(payload?.points)
      ? payload.points
      : payload && payload.lat != null && payload.lon != null
        ? [payload]
        : [];
    return raw
      .map((point) => ({
        lat: Number(point.lat),
        lon: Number(point.lon),
        label: String(point.label || "").trim(),
      }))
      .filter(
        (point) =>
          Number.isFinite(point.lat) &&
          Number.isFinite(point.lon) &&
          point.lat >= -90 &&
          point.lat <= 90 &&
          point.lon >= -180 &&
          point.lon <= 180,
      );
  }

  function markerElement() {
    const element = document.createElement("div");
    element.className = "metadata-map-pin-anchor";
    element.setAttribute("aria-hidden", "true");
    const pin = document.createElement("div");
    pin.className = "metadata-map-pin";
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("viewBox", "0 0 26 36");
    svg.setAttribute("aria-hidden", "true");
    svg.innerHTML = window.AlbumMapPinIcon.innerHTML("metadata-map-pin");
    pin.appendChild(svg);
    element.appendChild(pin);
    return element;
  }

  function ensureSelectedMarker(lat, lon, label = "") {
    if (!selectedMarker) {
      const element = markerElement();
      selectedMarker = new maplibregl.Marker({
        element,
        anchor: "bottom",
        draggable: networkEnabled && !readOnlySurface,
      });
      selectedMarker.on("dragstart", () =>
        element.classList.add("is-dragging"),
      );
      selectedMarker.on("dragend", () => {
        element.classList.remove("is-dragging");
        const position = selectedMarker.getLngLat();
        const source = sourceLatLng(position.lat, position.lng);
        postLocation(source.lat, source.lon, "", "drag");
      });
      selectedMarker.setLngLat(displayLngLat(lat, lon)).addTo(map);
    } else {
      selectedMarker.setLngLat(displayLngLat(lat, lon));
    }
    currentPoint = { lat, lon, label };
    setConfirmEnabled(true);
  }

  function clearSecondaryMarkers() {
    for (const marker of secondaryMarkers) marker.remove();
    secondaryMarkers = [];
  }

  function addSecondaryMarker(lat, lon) {
    const element = document.createElement("div");
    element.className = "metadata-map-context";
    element.setAttribute("aria-hidden", "true");
    const marker = new maplibregl.Marker({ element, anchor: "center" })
      .setLngLat(displayLngLat(lat, lon))
      .addTo(map);
    secondaryMarkers.push(marker);
  }

  function chinaCamera() {
    const camera = map.cameraForBounds(CHINA_BOUNDS, {
      padding: CHINA_PADDING,
      bearing: 0,
      pitch: 0,
      maxZoom: CHINA_ZOOM + 0.8,
    });
    if (camera?.center && Number.isFinite(Number(camera.zoom))) {
      return {
        center: [camera.center.lng, camera.center.lat],
        zoom: Number(camera.zoom),
        bearing: 0,
        pitch: 0,
      };
    }
    return {
      center: DEFAULT_CENTER,
      zoom: CHINA_ZOOM,
      bearing: 0,
      pitch: 0,
    };
  }

  function centerOnPoints(points, animate) {
    if (!points.length) {
      const camera = chinaCamera();
      if (animate) {
        dragInertia?.cancel();
        map.easeTo({ ...camera, duration: 520 });
      } else map.jumpTo(camera);
      return;
    }
    if (points.length === 1) {
      const pointZoom = previewMode
        ? networkEnabled
          ? 13.2
          : 3.2
        : viewMode
          ? READ_ONLY_ZOOM
          : PLACE_ZOOM;
      const camera = {
        center: displayLngLat(points[0].lat, points[0].lon),
        zoom: pointZoom,
        bearing: 0,
        pitch: 0,
      };
      if (animate) {
        map.flyTo({
          ...camera,
          duration: viewMode ? 1200 : 760,
          curve: 1.25,
          essential: true,
        });
      } else map.jumpTo(camera);
      return;
    }

    const coordinates = points.map((point) =>
      displayLngLat(point.lat, point.lon),
    );
    const lngs = coordinates.map(([lng]) => lng);
    const lats = coordinates.map(([, lat]) => lat);
    const bounds = [
      [Math.min(...lngs), Math.min(...lats)],
      [Math.max(...lngs), Math.max(...lats)],
    ];
    const options = {
      padding: 52,
      maxZoom: previewMode ? 13.2 : PLACE_ZOOM,
      duration: animate ? 720 : 0,
    };
    if (animate) map.fitBounds(bounds, options);
    else map.fitBounds(bounds, options);
  }

  function applyLocationPayload(payload, { animate = false } = {}) {
    setConfirmPending(false);
    const points = normalizePoints(payload);
    clearSecondaryMarkers();

    if (points.length === 1) {
      ensureSelectedMarker(points[0].lat, points[0].lon, points[0].label || "");
    } else {
      if (selectedMarker) {
        selectedMarker.remove();
        selectedMarker = null;
      }
      currentPoint = null;
      setConfirmEnabled(false);
      for (const point of points) addSecondaryMarker(point.lat, point.lon);
    }
    centerOnPoints(points, animate);
  }

  function selectPoint(
    lat,
    lon,
    label = "",
    source = "map",
    moveCamera = false,
  ) {
    if (!mapLoaded) {
      pendingLocation = { points: [{ lat, lon, label }] };
      currentPoint = { lat, lon, label };
      return;
    }
    ensureSelectedMarker(lat, lon, label);
    if (moveCamera) {
      map.flyTo({
        center: displayLngLat(lat, lon),
        zoom: Math.max(map.getZoom(), PLACE_ZOOM),
        pitch: 0,
        duration: 720,
        essential: true,
      });
    }
    postLocation(lat, lon, label, source);
  }

  function announceFirstFrame() {
    if (firstFrameSent) return;
    firstFrameSent = true;
    requestAnimationFrame(() => {
      requestAnimationFrame(() => post("metadata-map:first-frame"));
    });
  }

  function announcePreviewReady(requestId) {
    if (requestId == null) return;
    let settled = false;
    const finish = () => {
      if (settled) return;
      settled = true;
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          post("metadata-map:preview-ready", { requestId });
        });
      });
    };
    /* idle 表示当前定位涉及的瓦片已经完成本轮绘制。预览卡片随后直接使用
       canvas 快照，因此这里必须等首帧稳定，而不是只等 style.load。 */
    map.once("idle", finish);
    window.setTimeout(finish, 1800);
  }

  function applyPendingLocation() {
    if (pendingLocation) {
      const payload = pendingLocation;
      pendingLocation = null;
      applyLocationPayload(payload, { animate: viewMode });
    } else {
      centerOnPoints([], false);
    }
    announceFirstFrame();
  }

  function setStyleKind(nextKind) {
    styleKind = nextKind;
    const satellite = styleKind === "satellite";
    typeToggle.classList.toggle("is-satellite", satellite);
    const label = satellite ? "切换到普通地图" : "切换到卫星地图";
    typeToggle.setAttribute("aria-label", label);
    typeToggle.title = label;
    if (!map || !mapLoaded) return;
    map.setLayoutProperty(
      "world-street",
      "visibility",
      satellite ? "none" : "visible",
    );
    map.setLayoutProperty(
      "world-satellite",
      "visibility",
      satellite ? "visible" : "none",
    );
    if (map.getLayer("online-street")) {
      map.setLayoutProperty(
        "online-street",
        "visibility",
        satellite ? "none" : "visible",
      );
    }
    if (map.getLayer("online-satellite")) {
      map.setLayoutProperty(
        "online-satellite",
        "visibility",
        satellite ? "visible" : "none",
      );
    }
  }

  function hideSearchResults() {
    searchResults.hidden = true;
    searchResults.replaceChildren();
  }

  function confirmCurrentPoint() {
    if (!currentPoint || confirmPending) return;
    setConfirmPending(true);
    post("metadata-map:confirm", {
      lat: currentPoint.lat,
      lon: currentPoint.lon,
      locationName: currentPoint.label || "",
    });
  }

  function syncSearchWidth() {
    if (!searchForm || !searchInput) return;

    const inputStyle = getComputedStyle(searchInput);
    const formStyle = getComputedStyle(searchForm);
    const controls = searchForm.parentElement;
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

    const text = searchInput.value || searchInput.placeholder || "";
    const textWidth = context.measureText(text).width;
    const clearWidth = searchClear.hidden
      ? 0
      : searchClear.getBoundingClientRect().width;
    const submitWidth = searchSubmit.getBoundingClientRect().width;
    const horizontalChrome =
      Number.parseFloat(formStyle.paddingLeft) +
      Number.parseFloat(formStyle.paddingRight) +
      Number.parseFloat(inputStyle.paddingLeft) +
      Number.parseFloat(inputStyle.paddingRight) +
      40 +
      clearWidth +
      submitWidth +
      16;
    const controlsStyle = controls ? getComputedStyle(controls) : null;
    const confirmSpace =
      confirmButton.hidden || !controlsStyle
        ? 0
        : confirmButton.getBoundingClientRect().width +
          Number.parseFloat(controlsStyle.columnGap || controlsStyle.gap || 0);
    const availableWidth =
      (controls?.clientWidth || window.innerWidth) - confirmSpace;
    const maxWidth = Math.max(0, Math.min(SEARCH_MAX_WIDTH, availableWidth));
    const minWidth = Math.min(SEARCH_MIN_WIDTH, maxWidth);
    const width = Math.min(
      maxWidth,
      Math.max(minWidth, Math.ceil(textWidth + horizontalChrome)),
    );
    searchForm.style.width = `${width}px`;
  }

  function renderSearchResults(results) {
    searchResults.replaceChildren();
    results.forEach((place) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "location-search-result";
      button.setAttribute("role", "option");
      const name = document.createElement("span");
      name.className = "location-search-result-name";
      name.textContent = place.name || "未命名地点";
      const detail = document.createElement("span");
      detail.className = "location-search-result-detail";
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
    searchClear.hidden = !searchInput.value;
    syncSearchWidth();
    if (hideResults) hideSearchResults();
    const source = place.isGcj
      ? searchSourceLatLng(place.lat, place.lon)
      : { lat: place.lat, lon: place.lon };
    selectPoint(source.lat, source.lon, place.name || "", "search", true);
  }

  async function searchPlaces(query) {
    searchAbort?.abort();
    searchAbort = new AbortController();
    const response = await fetch(
      "https://restapi.amap.com/v3/place/text" +
        `?key=${encodeURIComponent(AMAP_KEY)}` +
        `&keywords=${encodeURIComponent(query)}` +
        "&offset=6&page=1&extensions=base",
      { signal: searchAbort.signal },
    );
    if (!response.ok) throw new Error(`搜索服务返回 ${response.status}`);
    const data = await response.json();
    if (data?.status !== "1")
      throw new Error(data?.info || "高德搜索服务不可用");
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
            .filter((value, index, list) => list.indexOf(value) === index)
            .join(" · "),
          lat,
          lon,
          isGcj: true,
        };
      })
      .filter(Boolean);
  }

  async function runSearch() {
    if (!networkEnabled) {
      showNotice("离线模式不能搜索地点", true);
      return;
    }
    const query = searchInput.value.trim();
    if (!query) {
      showNotice("请输入要搜索的地点", true);
      searchInput.focus();
      return;
    }
    hideSearchResults();
    showNotice("正在搜索地点…", false, 0);
    searchInput.setAttribute("aria-busy", "true");
    try {
      const results = await searchPlaces(query);
      if (!results.length) {
        showNotice("没有找到这个地点", true);
        return;
      }
      mapNotice.hidden = true;
      renderSearchResults(results);
    } catch (error) {
      if (error?.name === "AbortError") return;
      showNotice("搜索失败，请检查网络连接", true, 2600);
    } finally {
      searchInput.removeAttribute("aria-busy");
    }
  }

  typeToggle.addEventListener("click", () => {
    setStyleKind(styleKind === "street" ? "satellite" : "street");
  });

  searchForm.addEventListener("submit", (event) => {
    event.preventDefault();
    window.clearTimeout(searchInputTimer);
    searchInputTimer = 0;
    runSearch();
  });
  searchInput.addEventListener("compositionstart", () => {
    searchComposing = true;
  });
  searchInput.addEventListener("compositionend", () => {
    searchComposing = false;
    searchInput.dispatchEvent(new Event("input", { bubbles: true }));
  });
  searchInput.addEventListener("input", (event) => {
    searchClear.hidden = !searchInput.value;
    syncSearchWidth();
    rememberedSearchQuery = searchInput.value;
    post("metadata-map:search-query-changed", {
      query: rememberedSearchQuery,
    });
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
  searchClear.addEventListener("click", () => {
    window.clearTimeout(searchInputTimer);
    searchInputTimer = 0;
    searchAbort?.abort();
    searchInput.value = "";
    rememberedSearchQuery = "";
    post("metadata-map:search-query-changed", { query: "" });
    searchClear.hidden = true;
    syncSearchWidth();
    hideSearchResults();
    searchInput.focus();
  });
  searchInput.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      event.preventDefault();
      window.clearTimeout(searchInputTimer);
      searchInputTimer = 0;
      searchAbort?.abort();
      hideSearchResults();
    }
  });
  document.addEventListener("pointerdown", (event) => {
    if (!searchForm.contains(event.target)) {
      hideSearchResults();
    }
  });
  window.addEventListener("resize", syncSearchWidth);
  document.addEventListener("keydown", (event) => {
    if (event.key !== "Escape" || confirmPending) return;
    event.preventDefault();
    event.stopPropagation();
    post("metadata-map:cancel");
  });
  closeButton.addEventListener("click", () => {
    if (!confirmPending) post("metadata-map:cancel");
  });
  confirmButton.addEventListener("click", confirmCurrentPoint);

  setStyleKind(styleKind);
  updateNetworkUi();
  try {
    const initialPreviewPoint = pendingLocation?.points?.[0];
    const animateInitialView = viewMode && Boolean(initialPreviewPoint);
    const initialCenter =
      initialPreviewPoint && !animateInitialView
        ? displayLngLat(initialPreviewPoint.lat, initialPreviewPoint.lon)
        : DEFAULT_CENTER;
    const initialZoom =
      initialPreviewPoint && !animateInitialView
        ? networkEnabled
          ? 13.2
          : 3.2
        : CHINA_ZOOM;
    map = new maplibregl.Map({
      container: mapNode,
      style: buildMapStyle(),
      center: initialCenter,
      zoom: initialZoom,
      minZoom: 1,
      maxZoom: 18,
      bearing: 0,
      pitch: 0,
      maxPitch: 0,
      dragRotate: false,
      touchPitch: false,
      interactive: !previewMode,
      dragPan: previewMode ? false : { maxSpeed: 0 },
      doubleClickZoom: !previewMode,
      keyboard: !previewMode,
      touchZoomRotate: !previewMode,
      scrollZoom: false,
      attributionControl: false,
      preserveDrawingBuffer: previewMode,
      fadeDuration: previewMode ? 0 : 220,
    });
    window.__map = map;
    const updateMapDiagnostics = () => {
      document.body.dataset.mapZoom = map.getZoom().toFixed(4);
      document.body.dataset.mapPitch = map.getPitch().toFixed(2);
      document.body.dataset.projection =
        map.getStyle()?.projection?.type || "mercator";
      const center = map.getCenter();
      document.body.dataset.mapCenter = `${center.lng.toFixed(6)},${center.lat.toFixed(6)}`;
    };
    map.on("move", updateMapDiagnostics);
    map.on("zoom", updateMapDiagnostics);
    map.on("click", (event) => {
      if (!networkEnabled || readOnlySurface) return;
      const source = sourceLatLng(event.lngLat.lat, event.lngLat.lng);
      selectPoint(source.lat, source.lon, "", "map", false);
    });
    map.on("load", () => {
      mapLoaded = true;
      updateMapDiagnostics();
      applyPendingLocation();
      const previewRequest = pendingPreviewRequest;
      pendingPreviewRequest = null;
      if (previewRequest != null) announcePreviewReady(previewRequest);
    });
    mapNode.addEventListener("wheel", handleWheelZoom, { passive: false });
    bindDragInertia();
    new ResizeObserver(() => map.resize()).observe(mapNode);
  } catch (error) {
    post("metadata-map:error", { message: String(error?.message || error) });
    showNotice("地图无法载入", true, 0);
  }

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
    if (message.type === "metadata-map:hello") {
      post("metadata-map:ready");
      if (firstFrameSent) post("metadata-map:first-frame");
      return;
    }
    if (message.type === "metadata-map:set-network") {
      applyNetworkEnabled(message.enabled === true);
      return;
    }
    if (message.type === "metadata-map:set-tile-provider") {
      const next = message.provider === "google" ? "google" : "amap";
      if (tileProvider === next) return;
      tileProvider = next;
      document.body.dataset.mapProvider = tileProvider;
      if (!map || !mapLoaded) return;
      map.setStyle(buildMapStyle());
      map.once("style.load", () => {
        setStyleKind(styleKind);
        if (currentPoint) {
          selectedMarker?.setLngLat(
            displayLngLat(currentPoint.lat, currentPoint.lon),
          );
        }
      });
      return;
    }
    if (message.type === "metadata-map:set-search-query") {
      rememberedSearchQuery = String(message.query || "").slice(0, 200);
      searchInput.value = rememberedSearchQuery;
      searchClear.hidden = !rememberedSearchQuery;
      hideSearchResults();
      syncSearchWidth();
      return;
    }
    if (message.type === "metadata-map:set-location") {
      const payload = {
        points: normalizePoints(message.payload || message),
      };
      if (!mapLoaded) pendingLocation = payload;
      else applyLocationPayload(payload, { animate: true });
      return;
    }
    if (message.type === "metadata-map:set-point") {
      const lat = Number(message.lat);
      const lon = Number(message.lon);
      if (!Number.isFinite(lat) || !Number.isFinite(lon)) return;
      if (!mapLoaded) {
        pendingLocation = { points: [{ lat, lon }] };
        return;
      }
      ensureSelectedMarker(lat, lon);
      if (
        !currentPoint ||
        Math.abs(currentPoint.lat - lat) > 0.0001 ||
        Math.abs(currentPoint.lon - lon) > 0.0001
      ) {
        currentPoint = { lat, lon };
      }
      if (map.getZoom() < 7) {
        map.easeTo({
          center: displayLngLat(lat, lon),
          zoom: PLACE_ZOOM,
          duration: 520,
        });
      }
      return;
    }
    if (message.type === "metadata-map:set-preview-point") {
      const lat = Number(message.lat);
      const lon = Number(message.lon);
      if (!Number.isFinite(lat) || !Number.isFinite(lon)) return;
      const requestId = String(message.requestId || "");
      const payload = { points: [{ lat, lon }] };
      if (!mapLoaded) {
        pendingLocation = payload;
        pendingPreviewRequest = requestId;
        return;
      }
      applyLocationPayload(payload, { animate: false });
      announcePreviewReady(requestId);
      return;
    }
    if (message.type === "metadata-map:confirm-failed") {
      setConfirmPending(false);
      confirmButton.classList.add("is-failed");
      window.setTimeout(() => confirmButton.classList.remove("is-failed"), 280);
    }
  });

  post("metadata-map:ready");
})();
