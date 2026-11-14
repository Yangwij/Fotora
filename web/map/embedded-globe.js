(() => {
  "use strict";

  const ICON_MAP =
    '<svg viewBox="0 0 24 24" fill="none" stroke="#4b5563" stroke-width="1.8" stroke-linejoin="round">' +
    '<rect x="3.5" y="5" width="5" height="14" rx="1"/>' +
    '<rect x="9.5" y="3" width="5" height="18" rx="1"/>' +
    '<rect x="15.5" y="5" width="5" height="14" rx="1"/></svg>';
  const ICON_SATELLITE =
    '<svg viewBox="0 0 24 24"><g transform="rotate(45 12 12)" fill="#4b5563">' +
    '<rect x="9" y="9" width="6" height="6" rx="1.5"/>' +
    '<rect x="3.5" y="10.7" width="3.8" height="2.6" rx="0.6"/>' +
    '<rect x="16.7" y="10.7" width="3.8" height="2.6" rx="0.6"/>' +
    '<circle cx="12" cy="12" r="1.1"/></g></svg>';

  /* 缩略图先以原尺寸随地球收缩一段，再开始缩小，避免一离开街景尺度
     就全部变小，失去照片的可辨识度。 */
  const MARKER_FULL_ZOOM = 10.5;
  const MIN_MARKER_SCALE = 0.3;
  const MARKER_TAIL_HEIGHT = 12;
  /* MapLibre 的技术下限；实际下限按当前视口能完整容纳地球圆时动态计算。 */
  const MAP_MIN_ZOOM = 0.5;
  const MAP_MAX_ZOOM = 20;
  const GLOBE_MIN_ZOOM_BACKOFF = 0.97;
  /* 地球接近“完整视野”时，俯仰角要在这段缩放距离内缓慢归零。
     不能用一个瞬间切换的阈值，否则缩小到初始级别时会突然从倾斜变平。 */
  const GLOBE_PITCH_FADE_MIN_SPAN = 0.9;
  const TILE_MAX_ZOOM = 18;
  const SPACE_FADE_FROM = 3.5;
  const SPACE_FADE_TO = 6.5;
  const GLOBE_PITCH = 12;
  const GLOBE_VERTICAL_OFFSET = 18;
  /* 球面距边缘 18px，外层约 76px 的大气光晕也必须完整落入视口。 */
  /* 地图缩到最小时也要覆盖整个视口，避免地球边缘外露出大面积空白。 */
  const GLOBE_COVER_GUTTER = 24;
  const FLY_ZOOM_MS_PER_LEVEL = 60;
  const FLY_PAN_MS_PER_PX = 0.85;
  const FLY_MIN_MS = 300;
  const FLY_MAX_MS = 1900;
  const FLIGHT_SPEED_DURATION_FACTORS = Object.freeze({
    fast: 1,
    medium: 2,
    slow: 3,
    gentle: 4,
  });
  const FLY_FIT_PEAK_DEADBAND = 0.08;
  const FLY_ROUTE_SAMPLES = 9;
  const FLY_STILL_PX = 26;
  const FLY_LAUNCH_END = 0.22;
  const FLY_DECEL_START = 0.58;
  const DENSE_MARKER_CANVAS_THRESHOLD = 240;
  const CANVAS_THUMB_CONCURRENCY = 10;
  const CANVAS_THUMB_CACHE_LIMIT = 2400;
  const DRAG_MOVE_PX = 4;
  const DOUBLE_TAP_MS = 430;
  const DOUBLE_TAP_PX = 8;
  const ROTATE_BEARING_PER_PX = 0.22;
  const ROTATE_PITCH_PER_PX = 0.2;
  const PI = Math.PI;
  const AXIS = 6378245.0;
  const ECCENTRICITY = 0.006693421622965943;

  function outOfChina(lng, lat) {
    return lng < 72.004 || lng > 137.8347 || lat < 0.8293 || lat > 55.8271;
  }

  function transformLat(x, y) {
    let value =
      -100 +
      2 * x +
      3 * y +
      0.2 * y * y +
      0.1 * x * y +
      0.2 * Math.sqrt(Math.abs(x));
    value += ((20 * Math.sin(6 * x * PI) + 20 * Math.sin(2 * x * PI)) * 2) / 3;
    value += ((20 * Math.sin(y * PI) + 40 * Math.sin((y / 3) * PI)) * 2) / 3;
    value +=
      ((160 * Math.sin((y / 12) * PI) + 320 * Math.sin((y * PI) / 30)) * 2) / 3;
    return value;
  }

  function transformLng(x, y) {
    let value =
      300 +
      x +
      2 * y +
      0.1 * x * x +
      0.1 * x * y +
      0.1 * Math.sqrt(Math.abs(x));
    value += ((20 * Math.sin(6 * x * PI) + 20 * Math.sin(2 * x * PI)) * 2) / 3;
    value += ((20 * Math.sin(x * PI) + 40 * Math.sin((x / 3) * PI)) * 2) / 3;
    value +=
      ((150 * Math.sin((x / 12) * PI) + 300 * Math.sin((x / 30) * PI)) * 2) / 3;
    return value;
  }

  function wgs2gcj(lat, lng) {
    if (outOfChina(lng, lat)) return [lat, lng];
    const dLat = transformLat(lng - 105, lat - 35);
    const dLng = transformLng(lng - 105, lat - 35);
    const radial = (lat / 180) * PI;
    const magic = 1 - ECCENTRICITY * Math.sin(radial) ** 2;
    const sqrtMagic = Math.sqrt(magic);
    return [
      lat +
        (dLat * 180) /
          (((AXIS * (1 - ECCENTRICITY)) / (magic * sqrtMagic)) * PI),
      lng + (dLng * 180) / ((AXIS / sqrtMagic) * Math.cos(radial) * PI),
    ];
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

  function displayLngLat(lat, lng) {
    const [displayLat, displayLng] = wgs2gcj(lat, lng);
    return [displayLng, displayLat];
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
            `?lang=zh_cn&size=1&scale=1&style=7&x={x}&y={y}&z={z}`,
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

  function easeInOutSine(t) {
    return -(Math.cos(PI * t) - 1) / 2;
  }

  /* 飞行速度：先快速提速，中段巡航，最后约 42% 的时长逐渐收速。
     末段使用平方衰减，进入目标附近后速度变化会比整体缓动更明确。 */
  function flightSpeed(time) {
    if (time < FLY_LAUNCH_END) return time / FLY_LAUNCH_END;
    if (time <= FLY_DECEL_START) return 1;
    const local = (1 - time) / (1 - FLY_DECEL_START);
    return local * local;
  }

  function clampNum(value, low, high) {
    return Math.max(low, Math.min(high, value));
  }

  function wrapLngDelta(delta) {
    return (((delta % 360) + 540) % 360) - 180;
  }

  function angularDistDeg(lat1, lng1, lat2, lng2) {
    const rad = PI / 180;
    const dLat = (lat2 - lat1) * rad;
    const dLng = wrapLngDelta(lng2 - lng1) * rad;
    const s =
      Math.sin(dLat / 2) ** 2 +
      Math.cos(lat1 * rad) * Math.cos(lat2 * rad) * Math.sin(dLng / 2) ** 2;
    return (2 * Math.asin(Math.min(1, Math.sqrt(s)))) / rad;
  }

  function slerpLatLng(lat1, lng1, lat2, lng2, k) {
    if (k <= 0) return [lat1, lng1];
    if (k >= 1) return [lat2, lng2];
    const rad = PI / 180;
    const deg = 180 / PI;
    const p1 = lat1 * rad;
    const l1 = lng1 * rad;
    const p2 = lat2 * rad;
    const l2 = lng2 * rad;
    const d = angularDistDeg(lat1, lng1, lat2, lng2) * rad;
    if (d < 1e-7) {
      return [lat1 + (lat2 - lat1) * k, lng1 + (lng2 - lng1) * k];
    }
    const sd = Math.sin(d);
    const a = Math.sin((1 - k) * d) / sd;
    const b = Math.sin(k * d) / sd;
    const x = a * Math.cos(p1) * Math.cos(l1) + b * Math.cos(p2) * Math.cos(l2);
    const y = a * Math.cos(p1) * Math.sin(l1) + b * Math.cos(p2) * Math.sin(l2);
    const z = a * Math.sin(p1) + b * Math.sin(p2);
    const lat = Math.atan2(z, Math.sqrt(x * x + y * y)) * deg;
    const lng = Math.atan2(y, x) * deg;
    return [lat, lng1 + wrapLngDelta(lng - lng1)];
  }

  class EmbeddedGlobe {
    constructor(options) {
      this.options = options || {};
      this.container = document.getElementById(this.options.containerId);
      this.typeToggle = this.options.typeToggleId
        ? document.getElementById(this.options.typeToggleId)
        : null;
      this.compassButton = this.options.compassButtonId
        ? document.getElementById(this.options.compassButtonId)
        : null;
      this.compassNeedle = this.compassButton?.querySelector(
        ".globe-compass-needle",
      );
      this.initialCenter = this.options.initialCenter || [104.8, 31.8];
      this.initialZoom = Number(this.options.initialZoom) || 3.15;
      this.initialBearing = Number.isFinite(Number(this.options.bearing))
        ? Number(this.options.bearing)
        : 0;
      this.globePitch = Number.isFinite(Number(this.options.pitch))
        ? Number(this.options.pitch)
        : GLOBE_PITCH;
      this.verticalOffset = Number.isFinite(Number(this.options.verticalOffset))
        ? Number(this.options.verticalOffset)
        : GLOBE_VERTICAL_OFFSET;
      this.scaleWithViewport = this.options.scaleWithViewport === true;
      this.stableZoomView = this.options.stableZoomView === true;
      this.autoPitchForZoom = this.options.autoPitchForZoom === true;
      this.baseViewport = Array.isArray(this.options.baseViewport)
        ? [
            Number(this.options.baseViewport[0]),
            Number(this.options.baseViewport[1]),
          ]
        : [1126, 644];
      this.viewportScale = this.viewportScaleForContainer();
      this.viewportZoomOffset = Math.log2(this.viewportScale);
      this.globeFitZoom = this.initialZoom + this.viewportZoomOffset;
      this.fitItems = this.options.fitItems === true;
      this.animateFit = this.options.animateFit === true;
      this.selectedId = null;
      this.items = [];
      this.markers = [];
      this.markerImgs = [];
      this.markerBadges = [];
      this.markerRecords = new Map();
      this.selectedMarkerEl = null;
      this.photoCanvas = null;
      this.photoCanvasContext = null;
      this.photoCanvasBuffer = null;
      this.photoCanvasBufferContext = null;
      this.photoCanvasGroups = [];
      this.photoCanvasHits = [];
      this.photoCanvasFrame = 0;
      this.photoCanvasActive = false;
      this.photoCanvasImages = new Map();
      this.photoCanvasImageQueue = [];
      this.photoCanvasImageQueued = new Set();
      this.photoCanvasImageActive = 0;
      this.photoCanvasImageGeneration = 0;
      this.photoCanvasVisibleKeys = new Set();
      this.lastMarkerClickId = null;
      this.targetMarker = null;
      this.curMarkerScale = 1;
      this.map = null;
      this.mapLoaded = false;
      this.firstFrameSent = false;
      this.firstFrameWaiting = false;
      this.styleKind =
        this.options.initialStyle === "satellite" ? "satellite" : "street";
      this.networkEnabled = this.options.networkEnabled === true;
      this.appliedNetworkEnabled = this.networkEnabled;
      this.tileProvider =
        this.options.tileProvider === "google" ? "google" : "amap";
      this.appliedTileProvider = this.tileProvider;
      this.flightSpeed = this.normalizeFlightSpeed(this.options.flightSpeed);
      this.pendingFit = this.fitItems;
      this.appliedFitToken = -1;
      this.flyGen = 0;
      this.flyRaf = 0;
      this.flyTimer = 0;
      this.zoomMotion = null;
      this.zoomAnchorContext = null;
      this.zoomAnchorAt = 0;
      this.dragInertia = null;
      this.lastMarkerClickAt = 0;
      this.diagnosticsFrame = 0;
      this.manualViewLocked = false;
      this.windowDragging = false;
      this.pendingViewportResize = false;
      this.pendingMapCenterSource = null;
      this.lastMapWidth = 0;
      this.lastMapHeight = 0;
      this.lastDevicePixelRatio = 0;
      this.start();
    }

    post(type, payload = {}) {
      if (typeof this.options.onEvent === "function") {
        this.options.onEvent(type, payload);
      }
    }

    normalizeItems(rawItems) {
      const seen = new Set();
      const result = [];
      for (const raw of Array.isArray(rawItems) ? rawItems : []) {
        const id = Number(raw?.id);
        const lat = Number(raw?.lat);
        const lon = Number(raw?.lon);
        if (
          !Number.isInteger(id) ||
          seen.has(id) ||
          !Number.isFinite(lat) ||
          !Number.isFinite(lon) ||
          lat < -90 ||
          lat > 90 ||
          lon < -180 ||
          lon > 180
        ) {
          continue;
        }
        seen.add(id);
        const width = Number(raw.width) > 0 ? Number(raw.width) : 1;
        const height = Number(raw.height) > 0 ? Number(raw.height) : 1;
        result.push({
          id,
          lat,
          lon,
          width,
          height,
          aspect: width / height,
          thumb: String(raw.thumb || ""),
          thumbLarge: String(raw.thumbLarge || raw.thumb || ""),
          takenAt: Number(raw.takenAt) || 0,
          name: String(raw.name || ""),
        });
      }
      result.sort((a, b) => a.takenAt - b.takenAt || a.id - b.id);
      return result;
    }

    normalizeFlightSpeed(value) {
      return Object.prototype.hasOwnProperty.call(
        FLIGHT_SPEED_DURATION_FACTORS,
        value,
      )
        ? value
        : "medium";
    }

    setFlightSpeed(value) {
      this.flightSpeed = this.normalizeFlightSpeed(value);
      document.body.dataset.flightSpeed = this.flightSpeed;
      return this.flightSpeed;
    }

    sourceLatLng(lat, lng) {
      const [sourceLat, sourceLng] = this.mapUsesGcjCoordinates()
        ? gcj2wgs(Number(lat), Number(lng))
        : [Number(lat), Number(lng)];
      return { lat: sourceLat, lon: sourceLng };
    }

    mapUsesGcjCoordinates() {
      return this.networkEnabled === true && this.tileProvider === "amap";
    }

    toMapLngLat(lat, lng) {
      return this.mapUsesGcjCoordinates()
        ? displayLngLat(lat, lng)
        : [Number(lng), Number(lat)];
    }

    fromMapLngLat(lng, lat) {
      return this.mapUsesGcjCoordinates()
        ? gcj2wgs(Number(lat), Number(lng))
        : [Number(lat), Number(lng)];
    }

    buildMapStyle() {
      const satellite = this.styleKind === "satellite";
      const online = this.networkEnabled === true;
      const sources = {
        "world-sat-src": {
          type: "raster",
          tiles: ["./assets/world-sat/{z}/{x}/{y}.jpg"],
          tileSize: 256,
          minzoom: 0,
          maxzoom: 0,
        },
        "world-vec-src": {
          type: "raster",
          tiles: ["./assets/world-vec/{z}/{x}/{y}.jpg"],
          tileSize: 256,
          minzoom: 0,
          maxzoom: 0,
        },
      };
      const layers = [
        {
          id: "world-vec",
          type: "raster",
          source: "world-vec-src",
          layout: {
            visibility: !online && !satellite ? "visible" : "none",
          },
        },
        {
          id: "world-sat",
          type: "raster",
          source: "world-sat-src",
          layout: {
            visibility: !online && satellite ? "visible" : "none",
          },
        },
      ];
      if (online) {
        const tileUrls =
          this.tileProvider === "google" ? googleTileUrls : amapTileUrls;
        sources["amap-vec-src"] = {
          type: "raster",
          tiles: tileUrls("street"),
          tileSize: 256,
          minzoom: 0,
          maxzoom: TILE_MAX_ZOOM,
        };
        sources["amap-sat-src"] = {
          type: "raster",
          tiles: tileUrls("satellite"),
          tileSize: 256,
          minzoom: 0,
          maxzoom: TILE_MAX_ZOOM,
        };
        layers.push(
          {
            id: "amap-sat",
            type: "raster",
            source: "amap-sat-src",
            layout: { visibility: satellite ? "visible" : "none" },
          },
          {
            id: "amap-vec",
            type: "raster",
            source: "amap-vec-src",
            layout: { visibility: satellite ? "none" : "visible" },
          },
        );
      }
      return {
        version: 8,
        projection: { type: "globe" },
        sources,
        layers,
        sky: {
          "sky-color": "#030711",
          "sky-horizon-blend": 0.34,
          "horizon-color": "#76b9f0",
          "horizon-fog-blend": 0.42,
          "fog-color": "#06101e",
          "fog-ground-blend": 0.18,
          "atmosphere-blend": [
            "interpolate",
            ["linear"],
            ["zoom"],
            0,
            0.78,
            4,
            0.74,
            6,
            0,
          ],
        },
      };
    }

    start() {
      if (!this.container) return;
      try {
        this.map = new maplibregl.Map({
          container: this.container,
          style: this.buildMapStyle(),
          center: this.initialCenter,
          zoom: this.initialZoom + this.viewportZoomOffset,
          bearing: this.initialBearing,
          pitch: this.globePitchForZoom(
            this.initialZoom + this.viewportZoomOffset,
          ),
          minZoom: MAP_MIN_ZOOM,
          maxZoom: MAP_MAX_ZOOM,
          bearingSnap: 0,
          dragPan: { maxSpeed: 0 },
          attributionControl: false,
          doubleClickZoom: !this.stableZoomView,
          dragRotate: false,
          pitchWithRotate: false,
          touchPitch: false,
          fadeDuration: 150,
        });
        window.__map = this.map;
        window.__embeddedGlobe = this;
        this.dragInertia = window.DragInertiaController
          ? new window.DragInertiaController(this.map)
          : null;

        const space = document.createElement("div");
        space.className = "map-space";
        this.map
          .getContainer()
          .insertBefore(space, this.map.getContainer().firstChild);
        this.spaceEl = space;

        const photoCanvas = document.createElement("canvas");
        photoCanvas.className = "map-photo-canvas";
        photoCanvas.hidden = true;
        photoCanvas.setAttribute("aria-hidden", "true");
        this.map.getContainer().append(photoCanvas);
        this.photoCanvas = photoCanvas;
        this.photoCanvasContext = photoCanvas.getContext("2d", {
          alpha: true,
        });

        this.installTypeToggle();
        this.bindControls();
        this.bindMapEvents();
        this.bindRotateGesture(this.map);
        if (this.stableZoomView) {
          this.map.scrollZoom.disable();
          if (this.autoPitchForZoom) this.bindAdaptiveWheelZoom();
          else this.map.scrollZoom.enable({ around: "center" });
        }
        this.updateGlobeFitZoom();
        this.updateGlobeShift();
        new ResizeObserver(() => this.resizeMapToViewport()).observe(
          this.container,
        );
      } catch (error) {
        this.post("error", { message: String(error?.message || error) });
      }
    }

    finishStyleReady() {
      this.setStyleKind(this.styleKind);
      this.updateGlobeBackdrop();
      this.renderMarkers();
      this.updateDiagnostics();
      if (this.pendingFit) {
        if (this.animateFit) this.flyToFit();
        else this.fitAll();
      }
      this.announceFirstFrameWhenRendered();
    }

    reloadNetworkStyle() {
      let settled = false;
      const finish = () => {
        if (settled || !this.map) return;
        settled = true;
        this.finishStyleReady();
      };
      /* 部分 MapLibre 版本会在 setStyle() 内同步发出 style.load。
         监听必须在调用前注册，同时再检查一次 style 是否已同步就绪。 */
      this.map.once("style.load", finish);
      this.map.setStyle(this.buildMapStyle());
      requestAnimationFrame(() => {
        if (this.map?.isStyleLoaded()) finish();
      });
    }

    installTypeToggle() {
      if (!this.typeToggle) return;
      this.typeToggle.classList.add("map-toggle-btn");
      this.typeToggle.innerHTML = ICON_SATELLITE;
      this.typeToggle.title = "切换到卫星图";
      this.typeToggle.setAttribute("aria-label", "切换到卫星图");
      this.setStyleKind(this.styleKind);
      if (this.compassButton) {
        this.compassButton.hidden = false;
        this.syncCompass();
      }
    }

    bindControls() {
      this.typeToggle?.addEventListener("click", (event) => {
        event.preventDefault();
        event.stopPropagation();
        this.setStyleKind(this.styleKind === "street" ? "satellite" : "street");
      });
      this.compassButton?.addEventListener("click", () => this.resetBearing());
    }

    bindMapEvents() {
      const map = this.map;
      const finishInitialLoad = () => {
        if (this.mapLoaded) return;
        this.mapLoaded = true;
        /* 地点地图从离线样式起步。如果主窗口在地图 load 之前已经把
           “联网接入高德地图”发过来，这里必须按最新状态重建一次样式；
           否则版权文字会显示在线，实际仍停留在本地世界底图。 */
        if (this.appliedNetworkEnabled !== this.networkEnabled) {
          this.appliedNetworkEnabled = this.networkEnabled;
          this.reloadNetworkStyle();
          return;
        }
        this.finishStyleReady();
      };
      /* load 会等待可见瓦片全部完成；在线服务偶发变慢时，首次打开会一直
         停在加载层。本地样式解析完成就足以显示第一帧，后续瓦片继续加载。 */
      map.on("style.load", finishInitialLoad);
      map.on("load", finishInitialLoad);
      map.on("webglcontextlost", (event) => {
        event.preventDefault();
        this.post("context-lost");
      });
      map.on("zoom", () => {
        this.setMarkerScale(this.markerScale(map.getZoom()), false);
        this.updateGlobeShift();
        this.updateGlobeBackdrop();
        this.scheduleDiagnostics();
      });
      map.on("zoomend", () => {
        this.updateGlobePitch();
        this.updateGlobeShift();
        this.updateGlobeFitZoom();
        this.updateMarkerSizes();
        this.scheduleMarkerRender();
      });
      map.on("move", () => {
        this.updateGlobeBackdrop();
        this.scheduleDiagnostics();
      });
      map.on("render", () => {
        if (this.photoCanvasActive) this.drawPhotoCanvas();
      });
      map.on("moveend", () => {
        this.updateGlobeFitZoom();
        this.scheduleMarkerRender();
      });
      map.on("click", (event) => {
        const canvasGroup = this.photoGroupAtPoint(event.point);
        if (canvasGroup) {
          this.activateMarkerGroup(canvasGroup);
          return;
        }
        if (!this.options.pickLocation) return;
        const [lat, lon] = this.fromMapLngLat(
          event.lngLat.lng,
          event.lngLat.lat,
        );
        this.showTargetPoint(lat, lon);
        this.post("target-change", { lat, lon, source: "map" });
      });
      map.on("mousemove", (event) => {
        if (!this.photoCanvasActive) return;
        this.map.getCanvas().style.cursor = this.photoGroupAtPoint(event.point)
          ? "pointer"
          : "";
      });
      map.on("movestart", (event) => {
        if (event?.originalEvent) this.cancelFly();
      });
      map.on("zoomstart", (event) => {
        if (event?.originalEvent) {
          this.cancelFly();
        }
      });
      ["wheel", "pointerdown", "touchstart"].forEach((eventName) => {
        map.getCanvas().addEventListener(
          eventName,
          () => {
            this.cancelFly();
            if (eventName !== "wheel") {
              this.cancelAdaptiveZoom();
              this.zoomAnchorContext = null;
              this.zoomAnchorAt = 0;
            }
          },
          { passive: true },
        );
      });
      document.addEventListener("keydown", (event) => {
        if (event.key === "Control" && !event.repeat) {
          this.setPhotosHidden(true);
        }
      });
      document.addEventListener("keyup", (event) => {
        if (event.key === "Control") {
          this.setPhotosHidden(false);
        }
      });
      window.addEventListener("blur", () => {
        this.setPhotosHidden(false);
      });
    }

    setPhotosHidden(hidden) {
      if (!this.map) return;
      this.map
        .getContainer()
        .classList.toggle("photos-hidden", Boolean(hidden));
    }

    bindRotateGesture(map) {
      const canvas = map.getCanvas();
      let lastTap = null;
      let panGesture = null;
      let rotateGesture = null;
      let suppressClickUntil = 0;

      const addSample = (gesture, x, y, time) => {
        gesture.samples.push({ time, x, y });
        if (gesture.samples.length > 48) gesture.samples.shift();
      };

      const finishRotateGesture = (event, startInertia) => {
        if (!rotateGesture || rotateGesture.pointerId !== event.pointerId)
          return;
        const finished = rotateGesture;
        if (finished.active) {
          suppressClickUntil = performance.now() + 360;
          this.manualViewLocked = true;
          document.body.classList.remove("globe-rotating");
        }
        rotateGesture = null;
        lastTap = null;
        try {
          canvas.releasePointerCapture(event.pointerId);
        } catch {}
        if (startInertia && finished.active) {
          this.dragInertia?.startRotation(finished);
        }
      };

      canvas.addEventListener(
        "pointerdown",
        (event) => {
          if (event.button !== 0) return;
          this.cancelDragInertia();
          if (map.isMoving()) map.stop();
          const now = performance.now();
          if (
            lastTap &&
            now - lastTap.time < DOUBLE_TAP_MS &&
            Math.hypot(event.clientX - lastTap.x, event.clientY - lastTap.y) <
              DOUBLE_TAP_PX
          ) {
            const anchor = this.anchorAtClientPoint(
              event.clientX,
              event.clientY,
            );
            panGesture = null;
            rotateGesture = {
              pointerId: event.pointerId,
              startX: event.clientX,
              startY: event.clientY,
              lastX: event.clientX,
              lastY: event.clientY,
              startPitch: map.getPitch(),
              startBearing: map.getBearing(),
              startCenter: map.getCenter(),
              anchorLngLat: anchor?.lngLat || null,
              anchorPoint: anchor?.point || null,
              samples: [{ time: now, x: event.clientX, y: event.clientY }],
              active: false,
            };
            lastTap = null;
            return;
          }
          lastTap = null;
          panGesture = {
            pointerId: event.pointerId,
            startX: event.clientX,
            startY: event.clientY,
            lastX: event.clientX,
            lastY: event.clientY,
            samples: [{ time: now, x: event.clientX, y: event.clientY }],
            active: false,
          };
        },
        true,
      );

      window.addEventListener(
        "pointermove",
        (event) => {
          if (panGesture && panGesture.pointerId === event.pointerId) {
            panGesture.lastX = event.clientX;
            panGesture.lastY = event.clientY;
            addSample(
              panGesture,
              event.clientX,
              event.clientY,
              performance.now(),
            );
            if (
              Math.hypot(
                event.clientX - panGesture.startX,
                event.clientY - panGesture.startY,
              ) >= DRAG_MOVE_PX
            ) {
              panGesture.active = true;
            }
          }
          if (!rotateGesture || rotateGesture.pointerId !== event.pointerId) {
            return;
          }
          const dx = event.clientX - rotateGesture.startX;
          const dy = event.clientY - rotateGesture.startY;
          if (!rotateGesture.active && Math.hypot(dx, dy) < DRAG_MOVE_PX) {
            return;
          }
          addSample(
            rotateGesture,
            event.clientX,
            event.clientY,
            performance.now(),
          );
          event.preventDefault();
          event.stopImmediatePropagation();
          try {
            canvas.setPointerCapture(event.pointerId);
          } catch {}
          rotateGesture.active = true;
          rotateGesture.lastX = event.clientX;
          rotateGesture.lastY = event.clientY;
          this.manualViewLocked = true;
          document.body.classList.add("globe-rotating");
          map.stop();
          window.MapInteractionHelpers.rotateAtAnchor(
            map,
            rotateGesture.startBearing + dx * ROTATE_BEARING_PER_PX,
            clampNum(
              rotateGesture.startPitch - dy * ROTATE_PITCH_PER_PX,
              0,
              75,
            ),
            rotateGesture.anchorLngLat,
            rotateGesture.anchorPoint,
          );
        },
        true,
      );

      window.addEventListener(
        "pointerup",
        (event) => {
          if (rotateGesture && rotateGesture.pointerId === event.pointerId) {
            event.preventDefault();
            event.stopImmediatePropagation();
            finishRotateGesture(event, true);
            return;
          }
          if (!panGesture || panGesture.pointerId !== event.pointerId) return;
          const finished = panGesture;
          panGesture = null;
          if (!finished.active) {
            lastTap = {
              time: performance.now(),
              x: finished.startX,
              y: finished.startY,
            };
            return;
          }
          this.dragInertia?.startPan(finished);
        },
        true,
      );
      window.addEventListener(
        "pointercancel",
        (event) => {
          if (rotateGesture && rotateGesture.pointerId === event.pointerId) {
            finishRotateGesture(event, false);
            return;
          }
          if (panGesture && panGesture.pointerId === event.pointerId) {
            panGesture = null;
          }
        },
        true,
      );
      canvas.addEventListener(
        "click",
        (event) => {
          if (performance.now() >= suppressClickUntil) return;
          event.preventDefault();
          event.stopImmediatePropagation();
        },
        true,
      );
      canvas.addEventListener(
        "dblclick",
        (event) => {
          if (performance.now() >= suppressClickUntil) return;
          event.preventDefault();
          event.stopImmediatePropagation();
        },
        true,
      );
      canvas.addEventListener(
        "dblclick",
        (event) => {
          if (!this.stableZoomView || performance.now() < suppressClickUntil)
            return;
          event.preventDefault();
          event.stopImmediatePropagation();
          this.zoomAnchorContext = null;
          this.setAdaptiveZoom(
            this.map.getZoom() + 1,
            this.anchorAtClientPoint(event.clientX, event.clientY),
          );
        },
        true,
      );
    }

    anchorAtClientPoint(clientX, clientY) {
      if (!this.map) return null;
      const rect = this.map.getContainer().getBoundingClientRect();
      const point = [clientX - rect.left, clientY - rect.top];
      return {
        point,
        lngLat: this.map.unproject(point),
      };
    }

    bindAdaptiveWheelZoom() {
      if (!this.map || this.options.adaptiveWheelZoom === false) return;
      this.map.getContainer().addEventListener(
        "wheel",
        (event) => {
          if (!event.deltaY || event.altKey) return;
          event.preventDefault();
          event.stopPropagation();
          this.cancelDragInertia();
          const unit =
            event.deltaMode === 1
              ? 16
              : event.deltaMode === 2
                ? this.map.getContainer().clientHeight
                : 1;
          const step = clampNum(-event.deltaY * unit * 0.003, -0.8, 0.8);
          const baseTarget = this.zoomMotion?.target ?? this.map.getZoom();
          const currentAnchor = this.anchorAtClientPoint(
            event.clientX,
            event.clientY,
          );
          const now = performance.now();
          const previous = this.zoomAnchorContext;
          const sameAnchorPoint =
            previous &&
            currentAnchor &&
            Math.hypot(
              currentAnchor.point[0] - previous.point[0],
              currentAnchor.point[1] - previous.point[1],
            ) < 1;
          if (!sameAnchorPoint || now - this.zoomAnchorAt > 500) {
            this.zoomAnchorContext = currentAnchor;
          }
          this.zoomAnchorAt = now;
          this.setAdaptiveZoom(baseTarget + step, this.zoomAnchorContext);
        },
        { passive: false },
      );
    }

    adaptivePitch(zoom) {
      return this.manualViewLocked
        ? this.map.getPitch()
        : this.globePitchForZoom(zoom);
    }

    cancelAdaptiveZoom() {
      const motion = this.zoomMotion;
      if (!motion) return;
      this.zoomMotion = null;
      if (motion.raf) cancelAnimationFrame(motion.raf);
    }

    setAdaptiveZoom(targetZoom, anchorContext = null) {
      const map = this.map;
      if (!map) return;
      this.cancelDragInertia();
      this.cancelFly();
      map.stop();
      const target = clampNum(
        targetZoom,
        this.globeMinimumZoom(),
        MAP_MAX_ZOOM,
      );
      const center = map.getCenter();
      const anchor = anchorContext?.lngLat
        ? [anchorContext.lngLat.lng, anchorContext.lngLat.lat]
        : null;
      const anchorPoint = anchorContext?.point || null;
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
        this.cancelAdaptiveZoom();
        if (anchor && anchorPoint) {
          this.applyZoomAtAnchor(target, anchor, anchorPoint);
        } else {
          map.jumpTo({
            center: [center.lng, center.lat],
            zoom: target,
            pitch: this.adaptivePitch(target),
          });
        }
        this.updateGlobeShift();
        this.updateDiagnostics();
        return;
      }
      if (!this.zoomMotion) {
        this.zoomMotion = {
          center: anchor ? null : [center.lng, center.lat],
          anchor,
          anchorPoint,
          target,
          raf: 0,
          lastTime: 0,
        };
      } else {
        this.zoomMotion.center = anchor ? null : [center.lng, center.lat];
        const sameAnchorPoint =
          anchorPoint &&
          this.zoomMotion.anchorPoint &&
          Math.hypot(
            anchorPoint[0] - this.zoomMotion.anchorPoint[0],
            anchorPoint[1] - this.zoomMotion.anchorPoint[1],
          ) < 1;
        if (!sameAnchorPoint) {
          this.zoomMotion.anchor = anchor;
          this.zoomMotion.anchorPoint = anchorPoint;
        }
        this.zoomMotion.target = target;
      }
      if (!this.zoomMotion.raf) {
        this.zoomMotion.lastTime = 0;
        this.zoomMotion.raf = requestAnimationFrame((time) =>
          this.stepAdaptiveZoom(time),
        );
      }
    }

    stepAdaptiveZoom(time) {
      const motion = this.zoomMotion;
      const map = this.map;
      if (!motion || !map) return;
      const current = map.getZoom();
      const delta = motion.target - current;
      const dt = motion.lastTime
        ? clampNum(time - motion.lastTime, 0, 50)
        : 1000 / 60;
      motion.lastTime = time;
      const factor = 1 - Math.exp(-dt / 54);
      const settled = Math.abs(delta) < 0.0015;
      const zoom = settled
        ? motion.target
        : current + clampNum(delta * factor, -0.45, 0.45);
      if (motion.anchor && motion.anchorPoint) {
        this.applyZoomAtAnchor(zoom, motion.anchor, motion.anchorPoint);
      } else {
        map.jumpTo({
          center: motion.center,
          zoom,
          pitch: this.adaptivePitch(zoom),
        });
      }
      this.updateGlobeShift();
      this.updateDiagnostics();
      if (settled) {
        motion.raf = 0;
        this.zoomMotion = null;
        return;
      }
      motion.raf = requestAnimationFrame((nextTime) =>
        this.stepAdaptiveZoom(nextTime),
      );
    }

    applyZoomAtAnchor(zoom, anchor, point) {
      const pitch = this.adaptivePitch(zoom);
      const anchorLngLat = new maplibregl.LngLat(anchor[0], anchor[1]);
      window.MapInteractionHelpers.zoomAtAnchor(
        this.map,
        zoom,
        pitch,
        anchorLngLat,
        point,
        () => this.updateGlobeShift(),
      );
    }

    setStyleKind(nextKind) {
      let centerSource = this.pendingMapCenterSource;
      if (!centerSource && this.map?.getCenter) {
        const center = this.map.getCenter();
        centerSource = this.fromMapLngLat(center.lng, center.lat);
      }
      this.styleKind = nextKind === "satellite" ? "satellite" : "street";
      const satellite = this.styleKind === "satellite";
      this.pendingMapCenterSource = null;
      document.body.classList.toggle("is-satellite", satellite);
      if (this.typeToggle) {
        this.typeToggle.innerHTML = satellite ? ICON_MAP : ICON_SATELLITE;
        const label = satellite ? "切换到普通地图" : "切换到卫星图";
        this.typeToggle.title = label;
        this.typeToggle.setAttribute("aria-label", label);
      }
      if (!this.map || !this.mapLoaded) return;

      const targetLat = Number(document.body.dataset.targetLat);
      const targetLon = Number(document.body.dataset.targetLon);
      const hasTarget =
        Number.isFinite(targetLat) && Number.isFinite(targetLon);

      for (const styleLayer of this.map.getStyle().layers || []) {
        const id = styleLayer.id;
        if (id === "world-vec") {
          this.map.setLayoutProperty(
            id,
            "visibility",
            !this.networkEnabled && !satellite ? "visible" : "none",
          );
          continue;
        }
        if (id === "world-sat") {
          this.map.setLayoutProperty(
            id,
            "visibility",
            !this.networkEnabled && satellite ? "visible" : "none",
          );
          continue;
        }
        if (id === "amap-vec") {
          this.map.setLayoutProperty(
            id,
            "visibility",
            this.networkEnabled && !satellite ? "visible" : "none",
          );
          continue;
        }
        if (id === "amap-sat") {
          this.map.setLayoutProperty(
            id,
            "visibility",
            this.networkEnabled && satellite ? "visible" : "none",
          );
        }
      }
      if (centerSource) {
        const [lng, lat] = this.toMapLngLat(centerSource[0], centerSource[1]);
        this.map.jumpTo({ center: [lng, lat] });
      }
      /*
       * 在线普通图和卫星图都使用高德的 GCJ-02；离线世界底图使用 WGS84。
       * 切换样式或联网状态时同步重画标记和中心点。
       */
      this.renderMarkers();
      if (hasTarget) {
        this.showTargetPoint(targetLat, targetLon, {
          itemId: document.body.dataset.targetId || null,
        });
      }
    }

    setNetwork(enabled) {
      const next = enabled === true;
      if (this.map?.getCenter) {
        const center = this.map.getCenter();
        this.pendingMapCenterSource = this.fromMapLngLat(
          center.lng,
          center.lat,
        );
      }
      this.networkEnabled = next;
      document.body.dataset.network = next ? "online" : "offline";
      if (!this.map || !this.mapLoaded || this.appliedNetworkEnabled === next)
        return;
      this.clearMarkers();
      this.appliedNetworkEnabled = next;
      this.reloadNetworkStyle();
    }

    setTileProvider(provider) {
      const next = provider === "google" ? "google" : "amap";
      if (this.map?.getCenter) {
        const center = this.map.getCenter();
        this.pendingMapCenterSource = this.fromMapLngLat(
          center.lng,
          center.lat,
        );
      }
      this.tileProvider = next;
      document.body.dataset.mapProvider = next;
      if (
        !this.map ||
        !this.mapLoaded ||
        this.appliedTileProvider === this.tileProvider
      ) {
        return;
      }
      this.clearMarkers();
      this.appliedTileProvider = this.tileProvider;
      this.reloadNetworkStyle();
    }

    updateGlobeBackdrop() {
      if (!this.map || !this.spaceEl) return;
      const zoom = this.map.getZoom();
      const linear = clampNum(
        (SPACE_FADE_TO - zoom) / (SPACE_FADE_TO - SPACE_FADE_FROM),
        0,
        1,
      );
      const strength = linear * linear * (3 - 2 * linear);
      this.spaceEl.style.opacity = strength.toFixed(3);
      let centerX = this.map.getContainer().clientWidth / 2;
      let centerY = this.map.getContainer().clientHeight / 2;
      try {
        const projectedCenter = this.map.project(this.map.getCenter());
        if (
          Number.isFinite(projectedCenter.x) &&
          Number.isFinite(projectedCenter.y)
        ) {
          centerX = projectedCenter.x;
          centerY = projectedCenter.y;
        }
      } catch {}
      this.container.style.setProperty("--globe-cx", `${centerX.toFixed(1)}px`);
      this.container.style.setProperty("--globe-cy", `${centerY.toFixed(1)}px`);
    }

    globePitchForZoom(zoom) {
      if (this.stableZoomView && !this.autoPitchForZoom) {
        return this.globePitch;
      }
      const globeZoom = zoom - this.viewportZoomOffset;
      const linear = clampNum(
        (SPACE_FADE_TO - globeZoom) / (SPACE_FADE_TO - SPACE_FADE_FROM),
        0,
        1,
      );
      const blend = linear * linear * (3 - 2 * linear);
      const openingZoom = this.initialZoom + this.viewportZoomOffset;
      return (
        this.globePitch *
        (zoom <= openingZoom ? this.globeFitProgress(zoom) : blend)
      );
    }

    globeVerticalOffsetForZoom(zoom) {
      if (this.stableZoomView && !this.autoPitchForZoom) {
        return this.verticalOffset * this.viewportScale;
      }
      const globeZoom = zoom - this.viewportZoomOffset;
      const linear = clampNum(
        (SPACE_FADE_TO - globeZoom) / (SPACE_FADE_TO - SPACE_FADE_FROM),
        0,
        1,
      );
      const blend = linear * linear * (3 - 2 * linear);
      const openingZoom = this.initialZoom + this.viewportZoomOffset;
      return (
        this.verticalOffset *
        this.viewportScale *
        (zoom <= openingZoom ? this.globeFitProgress(zoom) : blend)
      );
    }

    globeFitProgress(zoom) {
      const openingZoom = this.initialZoom + this.viewportZoomOffset;
      const fitZoom = Math.min(this.globeFitZoom, openingZoom);
      const span = Math.max(GLOBE_PITCH_FADE_MIN_SPAN, openingZoom - fitZoom);
      const fadeStart = openingZoom - span;
      const linear = clampNum((zoom - fadeStart) / span, 0, 1);
      return linear * linear * (3 - 2 * linear);
    }

    computeGlobeFitZoom() {
      if (!this.map) return this.globeFitZoom;
      const center = this.map.getCenter();
      const probe = this.map.transform.clone();
      probe.setMinZoom(MAP_MIN_ZOOM);
      probe.setMaxPitch(85);
      probe.setPadding({ top: 0, right: 0, bottom: 0, left: 0 });
      probe.setCenter(new maplibregl.LngLat(center.lng, center.lat));
      probe.setPitch(0);
      probe.setBearing(0);

      const limit = Math.max(
        1,
        Math.hypot(probe.width, probe.height) / 2 + GLOBE_COVER_GUTTER,
      );
      const phi = (center.lat * PI) / 180;
      const lambda = (center.lng * PI) / 180;
      const cosPhi = Math.cos(phi);
      const sinPhi = Math.sin(phi);
      const cosLambda = Math.cos(lambda);
      const sinLambda = Math.sin(lambda);
      const east = [-sinLambda, 0, cosLambda];
      const north = [-sinPhi * cosLambda, cosPhi, -sinPhi * sinLambda];
      const horizon = [];
      for (let index = 0; index < 48; index += 1) {
        const angle = (index * 2 * PI) / 48;
        const x = east[0] * Math.cos(angle) + north[0] * Math.sin(angle);
        const y = east[1] * Math.cos(angle) + north[1] * Math.sin(angle);
        const z = east[2] * Math.cos(angle) + north[2] * Math.sin(angle);
        horizon.push({
          lng: (Math.atan2(z, x) * 180) / PI,
          lat: (Math.asin(clampNum(y, -1, 1)) * 180) / PI,
        });
      }

      const radiusAt = (zoom) => {
        probe.setZoom(zoom);
        const middle = probe.locationToScreenPoint({
          lng: center.lng,
          lat: center.lat,
        });
        let radius = 0;
        for (const point of horizon) {
          const projected = probe.locationToScreenPoint(point);
          radius = Math.max(
            radius,
            Math.hypot(projected.x - middle.x, projected.y - middle.y),
          );
        }
        return radius;
      };

      let low = MAP_MIN_ZOOM;
      let high = Math.max(low, this.initialZoom + this.viewportZoomOffset);
      while (radiusAt(high) < limit && high < MAP_MAX_ZOOM) {
        high = Math.min(MAP_MAX_ZOOM, high + 1);
      }
      for (let index = 0; index < 24; index += 1) {
        const middle = (low + high) / 2;
        if (radiusAt(middle) < limit) low = middle;
        else high = middle;
      }
      return clampNum(high, MAP_MIN_ZOOM, MAP_MAX_ZOOM);
    }

    updateGlobeFitZoom() {
      if (!this.map) return;
      this.globeFitZoom = this.computeGlobeFitZoom();
      this.map.setMinZoom(this.globeMinimumZoom());
    }

    globeMinimumZoom() {
      const openingZoom = this.initialZoom + this.viewportZoomOffset;
      return clampNum(
        openingZoom - GLOBE_MIN_ZOOM_BACKOFF,
        MAP_MIN_ZOOM,
        MAP_MAX_ZOOM,
      );
    }

    viewportScaleForContainer() {
      if (!this.scaleWithViewport || !this.container) return 1;
      const width = Math.max(1, this.container.clientWidth);
      const height = Math.max(1, this.container.clientHeight);
      const baseWidth = Math.max(1, this.baseViewport[0]);
      const baseHeight = Math.max(1, this.baseViewport[1]);
      return clampNum(
        Math.min(width / baseWidth, height / baseHeight),
        0.65,
        2.6,
      );
    }

    resizeMapToViewport() {
      if (!this.map) return;
      if (this.windowDragging) {
        this.pendingViewportResize = true;
        return;
      }
      const width = this.container.clientWidth;
      const height = this.container.clientHeight;
      const pixelRatio = window.devicePixelRatio;
      if (width <= 0 || height <= 0) {
        this.pendingViewportResize = true;
        return;
      }
      if (
        width === this.lastMapWidth &&
        height === this.lastMapHeight &&
        pixelRatio === this.lastDevicePixelRatio
      ) {
        return;
      }
      this.lastMapWidth = width;
      this.lastMapHeight = height;
      this.lastDevicePixelRatio = pixelRatio;
      this.pendingViewportResize = false;
      this.map.resize();
      this.resizePhotoCanvasLayer();
      const nextScale = this.viewportScaleForContainer();
      const previousOffset = this.viewportZoomOffset;
      this.viewportScale = nextScale;
      this.viewportZoomOffset = Math.log2(nextScale);
      this.updateGlobeFitZoom();
      if (Math.abs(this.viewportZoomOffset - previousOffset) > 0.0001) {
        this.zoomAnchorContext = null;
        this.zoomAnchorAt = 0;
        const nextZoom = clampNum(
          this.map.getZoom() + this.viewportZoomOffset - previousOffset,
          this.globeFitZoom,
          MAP_MAX_ZOOM,
        );
        this.map.jumpTo({
          zoom: nextZoom,
          pitch: this.manualViewLocked
            ? this.map.getPitch()
            : this.globePitchForZoom(nextZoom),
        });
      }
      this.updateGlobeShift();
      this.updateGlobeBackdrop();
      this.updateMarkerSizes();
      this.updateDiagnostics();
    }

    setWindowDragging(active) {
      const next = active === true;
      if (this.windowDragging === next) return;
      this.windowDragging = next;
      document.documentElement.classList.toggle(
        "is-globe-window-dragging",
        next,
      );
      if (next || !this.pendingViewportResize) return;
      requestAnimationFrame(() => {
        if (!this.windowDragging) this.resizeMapToViewport();
      });
    }

    updateGlobePitch() {
      if (!this.map) return;
      if (this.manualViewLocked) return;
      const zoom = this.map.getZoom();
      const pitch = this.globePitchForZoom(zoom);
      this.updateGlobeShift();
      if (Math.abs(this.map.getPitch() - pitch) > 0.001) {
        this.map.easeTo({
          pitch,
          duration: 180,
          easing: (value) => 1 - (1 - value) ** 3,
          essential: true,
        });
      }
      this.updateGlobeBackdrop();
    }

    updateGlobeShift() {
      if (!this.map) return;
      const offset = this.globeVerticalOffsetForZoom(this.map.getZoom());
      this.container.style.setProperty(
        "--globe-shift-y",
        `${offset.toFixed(1)}px`,
      );
      const nextTopPadding = Math.max(0, offset * 2);
      const currentPadding = this.map.getPadding();
      if (
        Math.abs(currentPadding.top - nextTopPadding) > 0.1 ||
        currentPadding.bottom !== 0 ||
        currentPadding.left !== 0 ||
        currentPadding.right !== 0
      ) {
        this.map.setPadding({
          top: nextTopPadding,
          right: 0,
          bottom: 0,
          left: 0,
        });
      }
    }

    markerScale(zoom) {
      if (zoom >= MARKER_FULL_ZOOM) return 1;
      return Math.max(MIN_MARKER_SCALE, 2 ** (zoom - MARKER_FULL_ZOOM));
    }

    markerIconSize(item) {
      const height = 66;
      const width = Math.max(
        36,
        Math.min(132, Math.round(height * item.aspect)),
      );
      return [width, height];
    }

    setMarkerScale(scale, animate) {
      this.curMarkerScale = scale;
      for (const image of this.markerImgs) {
        const element = image.closest(".pm-photo-icon");
        element?.style.setProperty("--marker-scale", String(scale));
        image.style.transformOrigin = "50% 100%";
        if (!animate) image.style.transition = "none";
        image.style.transform = `translateY(${MARKER_TAIL_HEIGHT * (1 - scale)}px) scale(${scale})`;
      }
      for (const badge of this.markerBadges) {
        const element = badge.parentElement;
        const image = element?.querySelector("img");
        if (!element || !image) continue;
        const width =
          Number.parseFloat(element.style.width) || element.offsetWidth;
        const height =
          Number.parseFloat(image.style.height) ||
          image.offsetHeight ||
          element.offsetHeight - MARKER_TAIL_HEIGHT;
        const badgeScale = Math.max(0.78, scale);
        const badgeGap = 7 * badgeScale;
        badge.style.top = `${
          (height + MARKER_TAIL_HEIGHT) * (1 - scale) - badgeGap
        }px`;
        badge.style.right = `${(width * (1 - scale)) / 2 - badgeGap}px`;
        badge.style.transform = `scale(${badgeScale})`;
      }
      if (!animate) {
        requestAnimationFrame(() => {
          for (const image of this.markerImgs) image.style.transition = "";
        });
      }
    }

    updateMarkerSizes() {
      if (!this.map) return;
      this.setMarkerScale(this.markerScale(this.map.getZoom()), false);
    }

    exactCoordinateGroups() {
      const groups = new Map();
      for (const item of this.items) {
        const key = `${Math.round(item.lat * 1e5)},${Math.round(item.lon * 1e5)}`;
        const list = groups.get(key);
        if (list) list.push(item);
        else groups.set(key, [item]);
      }
      return [...groups.values()].map((group) => {
        group.sort((a, b) => a.takenAt - b.takenAt || a.id - b.id);
        const selectedIndex = group.findIndex(
          (item) => item.id === this.selectedId,
        );
        if (selectedIndex > 0) {
          const [selected] = group.splice(selectedIndex, 1);
          group.unshift(selected);
        }
        return group;
      });
    }

    /* 照片很多时，每张缩略图都作为一个独立 DOM 标记会拖慢地球仪。
       低于高倍缩放时按屏幕网格聚成少量堆栈；视野外的点不创建 DOM。
       拖动过程中只让 MapLibre 移动已有标记，停稳后再重排一次。 */
    clusterWorldKey(lng, lat, referenceZoom, cellSize) {
      const clampedLat = Math.max(-85.051129, Math.min(85.051129, lat));
      const sinLat = Math.sin((clampedLat * PI) / 180);
      const worldX = (lng + 180) / 360;
      const worldY = 0.5 - Math.log((1 + sinLat) / (1 - sinLat)) / (4 * PI);
      const worldSize = 512 * 2 ** referenceZoom;
      return `${Math.floor((worldX * worldSize) / cellSize)}:${Math.floor(
        (worldY * worldSize) / cellSize,
      )}`;
    }

    viewportMarkerGroups() {
      const exactGroups = this.exactCoordinateGroups();
      if (!exactGroups.length) return [];
      const zoom = this.map.getZoom();
      const container = this.map.getContainer();
      const width = container.clientWidth || 1200;
      const height = container.clientHeight || 800;
      if (this.items.length <= 480 || zoom >= 13) {
        return exactGroups.filter((group) => {
          const [lng, lat] = this.toMapLngLat(group[0].lat, group[0].lon);
          const point = this.map.project([lng, lat]);
          return (
            point.x >= -90 &&
            point.x <= width + 90 &&
            point.y >= -90 &&
            point.y <= height + 90
          );
        });
      }

      const cellSize = zoom < 4 ? 138 : zoom < 7 ? 112 : 84;
      const referenceZoom = Math.ceil(zoom * 2) / 2;
      const clusters = new Map();
      for (const exactGroup of exactGroups) {
        const representative = exactGroup[0];
        const [lng, lat] = this.toMapLngLat(
          representative.lat,
          representative.lon,
        );
        const point = this.map.project([lng, lat]);
        if (
          point.x < -cellSize ||
          point.x > width + cellSize ||
          point.y < -cellSize ||
          point.y > height + cellSize
        ) {
          continue;
        }
        const key = this.clusterWorldKey(lng, lat, referenceZoom, cellSize);
        const cluster = clusters.get(key);
        if (cluster) cluster.push(...exactGroup);
        else clusters.set(key, exactGroup.slice());
      }

      return [...clusters.values()].map((group) => {
        const selectedIndex = group.findIndex(
          (item) => item.id === this.selectedId,
        );
        if (selectedIndex > 0) {
          const [selected] = group.splice(selectedIndex, 1);
          group.unshift(selected);
        }
        Object.defineProperty(group, "isSpatialCluster", {
          value: true,
          configurable: true,
        });
        return group;
      });
    }

    scheduleMarkerRender() {
      if (this.markerRenderFrame) return;
      this.markerRenderFrame = requestAnimationFrame(() => {
        this.markerRenderFrame = 0;
        this.renderMarkers();
      });
    }

    photoCanvasItemSize(group) {
      const item = group?.[0];
      if (!item) return [40, 40];
      const height = 66;
      const width = Math.max(
        36,
        Math.min(132, Math.round(height * item.aspect)),
      );
      return [Math.round(width), Math.round(height)];
    }

    photoCanvasImageKey(item) {
      return `${Number(item?.id) || 0}|${String(item?.thumb || "")}`;
    }

    requestPhotoCanvasImage(item) {
      const key = this.photoCanvasImageKey(item);
      if (!key || !item?.thumb || this.photoCanvasImages.has(key)) return;
      if (this.photoCanvasImageQueued.has(key)) return;
      this.photoCanvasImageQueued.add(key);
      this.photoCanvasImageQueue.push({ key, src: item.thumb });
      this.pumpPhotoCanvasImageQueue();
    }

    pumpPhotoCanvasImageQueue() {
      const generation = this.photoCanvasImageGeneration;
      while (
        this.photoCanvasImageActive < CANVAS_THUMB_CONCURRENCY &&
        this.photoCanvasImageQueue.length
      ) {
        const task = this.photoCanvasImageQueue.shift();
        this.photoCanvasImageActive += 1;
        const image = new Image();
        image.decoding = "async";
        image.draggable = false;
        const finish = (ready) => {
          if (generation !== this.photoCanvasImageGeneration) return;
          this.photoCanvasImageActive = Math.max(
            0,
            this.photoCanvasImageActive - 1,
          );
          this.photoCanvasImageQueued.delete(task.key);
          if (ready) {
            this.photoCanvasImages.set(task.key, { image, used: 0 });
            this.trimPhotoCanvasImages();
            this.schedulePhotoCanvasRender();
          }
          this.pumpPhotoCanvasImageQueue();
        };
        image.addEventListener("load", () => finish(true), { once: true });
        image.addEventListener("error", () => finish(false), { once: true });
        image.src = task.src;
      }
    }

    trimPhotoCanvasImages() {
      if (this.photoCanvasImages.size <= CANVAS_THUMB_CACHE_LIMIT) return;
      for (const [key, entry] of this.photoCanvasImages) {
        if (this.photoCanvasImages.size <= CANVAS_THUMB_CACHE_LIMIT) break;
        if (this.photoCanvasVisibleKeys.has(key)) continue;
        entry.image.removeAttribute("src");
        this.photoCanvasImages.delete(key);
      }
    }

    clearPhotoCanvasLayer({ release = true } = {}) {
      this.photoCanvasActive = false;
      this.photoCanvasGroups = [];
      this.photoCanvasHits = [];
      this.photoCanvasVisibleKeys.clear();
      if (this.photoCanvasFrame) {
        cancelAnimationFrame(this.photoCanvasFrame);
        this.photoCanvasFrame = 0;
      }
      if (this.photoCanvas) this.photoCanvas.hidden = true;
      if (release) {
        this.photoCanvasImageGeneration += 1;
        for (const { image } of this.photoCanvasImages.values()) {
          image.removeAttribute("src");
        }
        this.photoCanvasImages.clear();
        this.photoCanvasImageQueue = [];
        this.photoCanvasImageQueued.clear();
        this.photoCanvasImageActive = 0;
      }
    }

    resizePhotoCanvasLayer() {
      const canvas = this.photoCanvas;
      if (!canvas || !this.map) return false;
      const width = Math.max(1, this.map.getContainer().clientWidth);
      const height = Math.max(1, this.map.getContainer().clientHeight);
      const pixelRatio = Math.min(2, Math.max(1, window.devicePixelRatio || 1));
      const pixelWidth = Math.round(width * pixelRatio);
      const pixelHeight = Math.round(height * pixelRatio);
      if (canvas.width !== pixelWidth || canvas.height !== pixelHeight) {
        canvas.width = pixelWidth;
        canvas.height = pixelHeight;
      }
      if (!this.photoCanvasBuffer) {
        this.photoCanvasBuffer = document.createElement("canvas");
        this.photoCanvasBufferContext = this.photoCanvasBuffer.getContext(
          "2d",
          {
            alpha: true,
          },
        );
      }
      if (
        this.photoCanvasBuffer.width !== pixelWidth ||
        this.photoCanvasBuffer.height !== pixelHeight
      ) {
        this.photoCanvasBuffer.width = pixelWidth;
        this.photoCanvasBuffer.height = pixelHeight;
      }
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      const context = this.photoCanvasContext;
      context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
      this.photoCanvasBufferContext.setTransform(
        pixelRatio,
        0,
        0,
        pixelRatio,
        0,
        0,
      );
      return true;
    }

    schedulePhotoCanvasRender() {
      if (!this.photoCanvasActive || this.photoCanvasFrame) return;
      this.photoCanvasFrame = requestAnimationFrame(() => {
        this.photoCanvasFrame = 0;
        this.drawPhotoCanvas();
      });
    }

    roundedRectPath(context, x, y, width, height, radius) {
      if (typeof context.roundRect === "function") {
        context.beginPath();
        context.roundRect(x, y, width, height, radius);
        return;
      }
      const r = Math.min(radius, width / 2, height / 2);
      context.beginPath();
      context.moveTo(x + r, y);
      context.arcTo(x + width, y, x + width, y + height, r);
      context.arcTo(x + width, y + height, x, y + height, r);
      context.arcTo(x, y + height, x, y, r);
      context.arcTo(x, y, x + width, y, r);
      context.closePath();
    }

    drawPhotoCanvasGroup(context, group, selected = false) {
      if (!group?.length || !this.map) return null;
      const item = group[0];
      const [lng, lat] = this.toMapLngLat(item.lat, item.lon);
      const point = this.map.project([lng, lat]);
      const width = this.map.getContainer().clientWidth;
      const height = this.map.getContainer().clientHeight;
      const [itemWidth, itemHeight] = this.photoCanvasItemSize(group);
      const left = point.x - itemWidth / 2;
      const top = point.y - itemHeight - MARKER_TAIL_HEIGHT;
      if (
        left > width + 20 ||
        top > height + 20 ||
        left + itemWidth < -20 ||
        top + itemHeight < -20
      )
        return null;

      const imageKey = this.photoCanvasImageKey(item);
      this.photoCanvasVisibleKeys.add(imageKey);
      this.requestPhotoCanvasImage(item);
      const cached = this.photoCanvasImages.get(imageKey);
      if (cached) cached.used += 1;
      const radius = 4;

      context.save();
      this.roundedRectPath(context, left, top, itemWidth, itemHeight, radius);
      context.clip();
      if (cached?.image?.complete && cached.image.naturalWidth > 0) {
        const scale = Math.max(
          itemWidth / cached.image.naturalWidth,
          itemHeight / cached.image.naturalHeight,
        );
        const sourceWidth = itemWidth / scale;
        const sourceHeight = itemHeight / scale;
        const sourceX = (cached.image.naturalWidth - sourceWidth) / 2;
        const sourceY = (cached.image.naturalHeight - sourceHeight) / 2;
        context.drawImage(
          cached.image,
          sourceX,
          sourceY,
          sourceWidth,
          sourceHeight,
          left,
          top,
          itemWidth,
          itemHeight,
        );
      } else {
        context.fillStyle = "rgba(238, 241, 244, 0.94)";
        context.fillRect(left, top, itemWidth, itemHeight);
      }
      context.restore();

      context.save();
      this.roundedRectPath(
        context,
        left + 0.5,
        top + 0.5,
        itemWidth - 1,
        itemHeight - 1,
        radius,
      );
      context.strokeStyle = selected
        ? "rgba(10, 132, 255, 0.98)"
        : "rgba(255, 255, 255, 0.9)";
      context.lineWidth = selected ? 3 : 1;
      context.stroke();
      context.restore();

      if (group.length > 1) {
        const label = group.length.toLocaleString("zh-CN");
        context.save();
        context.font = "600 10px -apple-system, BlinkMacSystemFont, sans-serif";
        const textWidth = context.measureText(label).width;
        const badgeWidth = Math.max(20, textWidth + 10);
        const badgeHeight = 17;
        const badgeLeft = left + itemWidth - badgeWidth - 2;
        const badgeTop = top - badgeHeight + 3;
        this.roundedRectPath(
          context,
          badgeLeft,
          badgeTop,
          badgeWidth,
          badgeHeight,
          badgeHeight / 2,
        );
        context.fillStyle = "rgba(28, 30, 34, 0.9)";
        context.fill();
        context.fillStyle = "#fff";
        context.textAlign = "center";
        context.textBaseline = "middle";
        context.fillText(label, badgeLeft + badgeWidth / 2, badgeTop + 8.5);
        context.restore();
      }

      return {
        group,
        left: left - 4,
        top: top - 4,
        right: left + itemWidth + 4,
        bottom: top + itemHeight + 4,
      };
    }

    drawPhotoCanvas() {
      if (
        !this.photoCanvasActive ||
        !this.map ||
        !this.photoCanvas ||
        !this.photoCanvasContext
      )
        return;
      if (!this.resizePhotoCanvasLayer()) return;
      const context = this.photoCanvasBufferContext;
      const width = this.map.getContainer().clientWidth;
      const height = this.map.getContainer().clientHeight;
      context.clearRect(0, 0, width, height);
      this.photoCanvasVisibleKeys.clear();
      const hits = [];
      const selectedGroup = this.photoCanvasGroups.find(
        (group) => group[0]?.id === this.selectedId,
      );
      for (const group of this.photoCanvasGroups) {
        if (group === selectedGroup) continue;
        const hit = this.drawPhotoCanvasGroup(context, group, false);
        if (hit) hits.push(hit);
      }
      if (selectedGroup) {
        const hit = this.drawPhotoCanvasGroup(context, selectedGroup, true);
        if (hit) hits.push(hit);
      }
      this.photoCanvasHits = hits;
      const visibleContext = this.photoCanvasContext;
      visibleContext.clearRect(0, 0, width, height);
      visibleContext.drawImage(this.photoCanvasBuffer, 0, 0, width, height);
      document.body.dataset.drawnMarkerCount = String(hits.length);
    }

    photoGroupAtPoint(point) {
      if (!this.photoCanvasActive || !point) return null;
      for (
        let index = this.photoCanvasHits.length - 1;
        index >= 0;
        index -= 1
      ) {
        const hit = this.photoCanvasHits[index];
        if (
          point.x >= hit.left &&
          point.x <= hit.right &&
          point.y >= hit.top &&
          point.y <= hit.bottom
        ) {
          return hit.group;
        }
      }
      return null;
    }

    activateMarkerGroup(group, { ctrlKey = false } = {}) {
      if (!group?.length || ctrlKey) return;
      const item = group[0];
      const now = performance.now();
      if (
        this.lastMarkerClickId === item.id &&
        now - this.lastMarkerClickAt < 320
      )
        return;
      this.lastMarkerClickId = item.id;
      this.lastMarkerClickAt = now;
      this.selectedId = item.id;
      this.syncMarkerSelection();
      this.pingMarker();
      this.post("select-item", { id: item.id });
      if (group.isSpatialCluster) {
        const [lng, lat] = this.toMapLngLat(item.lat, item.lon);
        this.flyToPlace(
          lng,
          lat,
          Math.min(MAP_MAX_ZOOM, this.map.getZoom() + 2.2),
          {
            keepZoom: false,
            allowZoomOut: false,
            ripple: false,
          },
        );
        return;
      }
      if (group.length > 1) {
        this.post("open-stack", {
          ids: group.map((entry) => entry.id),
        });
      } else {
        this.post("open-item", { id: item.id });
      }
    }

    clearMarkers() {
      for (const marker of this.markers) marker.remove();
      this.markers = [];
      this.markerImgs = [];
      this.markerBadges = [];
      this.markerRecords.clear();
      this.selectedMarkerEl = null;
    }

    groupBadgeElement(countLabel) {
      const badge = document.createElement("span");
      badge.className = "pm-group-badge";
      badge.textContent = countLabel;
      badge.setAttribute("aria-hidden", "true");
      return badge;
    }

    markerElement(group) {
      const representative = group[0];
      const size = this.markerIconSize(representative);
      const countLabel = group.length.toLocaleString("zh-CN");
      const element = document.createElement("div");
      element.photoGroup = group;
      element.className = "pm-photo-icon";
      if (this.options.markerClass) {
        element.classList.add(this.options.markerClass);
      }
      element.style.width = `${size[0]}px`;
      element.style.height = `${size[1] + MARKER_TAIL_HEIGHT}px`;
      element.style.setProperty(
        "--marker-tail-height",
        `${MARKER_TAIL_HEIGHT}px`,
      );
      element.style.zIndex =
        representative.id === this.selectedId ? "20" : "10";
      element.dataset.itemId = String(representative.id);
      element.dataset.count = String(group.length);
      element.dataset.aspect = representative.aspect.toFixed(6);
      const accessibleLabel =
        group.length > 1
          ? `${countLabel} 张照片，点击预览`
          : representative.name;
      element.removeAttribute("title");
      element.setAttribute("aria-label", accessibleLabel);

      const image = document.createElement("img");
      image.src = representative.thumbLarge || representative.thumb;
      image.alt = "";
      image.draggable = false;
      image.decoding = "async";
      image.style.width = `${size[0]}px`;
      image.style.height = `${size[1]}px`;
      image.style.objectFit = "cover";
      element.appendChild(image);

      let badge = null;
      if (group.length > 1) {
        badge = this.groupBadgeElement(countLabel);
        element.appendChild(badge);
      }

      element.addEventListener("click", (event) => {
        event.preventDefault();
        event.stopPropagation();
        this.activateMarkerGroup(element.photoGroup || group, {
          ctrlKey: event.ctrlKey,
        });
      });

      this.markerImgs.push(image);
      if (representative.id === this.selectedId) {
        this.selectedMarkerEl = element;
      }
      if (badge) this.markerBadges.push(badge);
      return element;
    }

    groupMarkerKey(group) {
      let key = Number.POSITIVE_INFINITY;
      for (const item of group) key = Math.min(key, item.id);
      return key;
    }

    createPhotoMarker(group) {
      const representative = group[0];
      const [lng, lat] = this.toMapLngLat(
        representative.lat,
        representative.lon,
      );
      const element = this.markerElement(group);
      const marker = new maplibregl.Marker({
        element,
        anchor: "bottom",
      })
        .setLngLat([lng, lat])
        .addTo(this.map);
      const record = {
        key: this.groupMarkerKey(group),
        element,
        image: element.querySelector("img"),
        badge: element.querySelector(".pm-group-badge"),
        marker,
      };
      this.markerRecords.set(record.key, record);
      return record;
    }

    updatePhotoMarker(record, group) {
      const representative = group[0];
      const [lng, lat] = this.toMapLngLat(
        representative.lat,
        representative.lon,
      );
      const current = record.marker.getLngLat();
      if (
        Math.abs(current.lng - lng) > 1e-8 ||
        Math.abs(current.lat - lat) > 1e-8
      ) {
        record.marker.setLngLat([lng, lat]);
      }

      const size = this.markerIconSize(representative);
      const countLabel = group.length.toLocaleString("zh-CN");
      const selected = representative.id === this.selectedId;
      const element = record.element;
      const width = `${size[0]}px`;
      const height = `${size[1]}px`;
      element.photoGroup = group;
      if (element.style.width !== width) element.style.width = width;
      const totalHeight = `${size[1] + MARKER_TAIL_HEIGHT}px`;
      if (element.style.height !== totalHeight) {
        element.style.height = totalHeight;
      }
      element.style.zIndex = selected ? "20" : "10";
      element.classList.toggle("is-selected", selected);
      element.dataset.itemId = String(representative.id);
      element.dataset.count = String(group.length);
      element.dataset.aspect = representative.aspect.toFixed(6);
      const accessibleLabel =
        group.length > 1
          ? `${countLabel} 张照片，点击预览`
          : representative.name;
      element.removeAttribute("title");
      element.setAttribute("aria-label", accessibleLabel);

      if (record.image.style.width !== width) record.image.style.width = width;
      if (record.image.style.height !== height) {
        record.image.style.height = height;
      }
      const representativeThumb =
        representative.thumbLarge || representative.thumb;
      if (record.image.getAttribute("src") !== representativeThumb) {
        record.image.src = representativeThumb;
      }

      if (group.length > 1) {
        if (!record.badge) {
          record.badge = this.groupBadgeElement(countLabel);
          element.appendChild(record.badge);
        } else if (record.badge.textContent !== countLabel) {
          record.badge.textContent = countLabel;
        }
      } else if (record.badge) {
        record.badge.remove();
        record.badge = null;
      }

      if (selected) this.selectedMarkerEl = element;
    }

    syncMarkerSelection() {
      this.selectedMarkerEl = null;
      for (const marker of this.markers) {
        const element = marker.getElement();
        const selected =
          Number(element.dataset.itemId) === Number(this.selectedId);
        element.style.zIndex = selected ? "20" : "10";
        element.classList.toggle("is-selected", selected);
        if (selected) this.selectedMarkerEl = element;
      }
      document.body.dataset.selectedId =
        this.selectedId == null ? "" : String(this.selectedId);
      this.schedulePhotoCanvasRender();
    }

    renderMarkers() {
      if (!this.map || !this.mapLoaded) return;
      const groups = this.viewportMarkerGroups();
      const usePhotoCanvas =
        this.items.length > 480 &&
        this.map.getZoom() >= 13 &&
        groups.length > DENSE_MARKER_CANVAS_THRESHOLD;
      if (usePhotoCanvas) {
        this.clearMarkers();
        this.photoCanvasActive = true;
        this.photoCanvasGroups = groups;
        if (this.photoCanvas) this.photoCanvas.hidden = false;
        this.schedulePhotoCanvasRender();
        document.body.dataset.markerRenderer = "canvas";
        document.body.dataset.markerCount = String(groups.length);
        document.body.dataset.itemCount = String(this.items.length);
        document.body.dataset.stackCount = String(
          groups.filter((group) => group.length > 1).length,
        );
        document.body.dataset.selectedId =
          this.selectedId == null ? "" : String(this.selectedId);
        return;
      }
      const canvasWasActive = this.photoCanvasActive;
      this.clearPhotoCanvasLayer({ release: canvasWasActive });
      const nextRecords = new Map();
      for (const group of groups) {
        const key = this.groupMarkerKey(group);
        const record =
          this.markerRecords.get(key) || this.createPhotoMarker(group);
        this.updatePhotoMarker(record, group);
        nextRecords.set(key, record);
      }
      for (const [key, record] of this.markerRecords) {
        if (nextRecords.has(key)) continue;
        record.marker.remove();
      }
      this.markerRecords = nextRecords;
      const records = [...nextRecords.values()];
      this.markers = records.map((record) => record.marker);
      this.markerImgs = records.map((record) => record.image);
      this.markerBadges = records.map((record) => record.badge).filter(Boolean);
      this.updateMarkerSizes();
      document.body.dataset.markerRenderer = "dom";
      document.body.dataset.markerCount = String(this.markers.length);
      document.body.dataset.itemCount = String(this.items.length);
      document.body.dataset.stackCount = String(
        groups.filter((group) => group.length > 1).length,
      );
      document.body.dataset.selectedId =
        this.selectedId == null ? "" : String(this.selectedId);
    }

    setItems(rawItems, { fit = false, deferFit = false, fitToken = 0 } = {}) {
      this.clearPhotoCanvasLayer();
      this.items = this.normalizeItems(rawItems);
      if (
        this.selectedId != null &&
        !this.items.some((item) => item.id === this.selectedId)
      ) {
        this.selectedId = null;
      }
      const token = Number(fitToken) || 0;
      const shouldFit =
        fit && (token !== this.appliedFitToken || this.pendingFit);
      if (deferFit) this.pendingFit = false;
      if (fit) {
        this.fitItems = true;
        this.pendingFit = true;
        this.appliedFitToken = token;
        if (shouldFit) this.clearTarget();
      }
      this.renderMarkers();
      if (shouldFit || this.pendingFit) {
        if (this.animateFit) this.flyToFit();
        else this.fitAll();
      }
      this.updateDiagnostics();
    }

    setSelected(id) {
      const next = id == null ? NaN : Number(id);
      this.selectedId = Number.isInteger(next) ? next : null;
      this.syncMarkerSelection();
    }

    showTarget(id) {
      const item = this.items.find((entry) => entry.id === Number(id));
      if (!item || !this.map) return false;
      this.showTargetPoint(item.lat, item.lon, { itemId: item.id });
      return true;
    }

    showTargetPoint(lat, lon, { itemId = null, focus = false } = {}) {
      const nextLat = Number(lat);
      const nextLon = Number(lon);
      if (
        !this.map ||
        !Number.isFinite(nextLat) ||
        !Number.isFinite(nextLon) ||
        nextLat < -90 ||
        nextLat > 90 ||
        nextLon < -180 ||
        nextLon > 180
      )
        return false;
      if (this.targetMarker) {
        this.targetMarker.remove();
        this.targetMarker = null;
      }
      const element = document.createElement("div");
      element.title = "目标位置";
      element.setAttribute("aria-label", "目标位置");
      if (this.options.sourcePinTarget) {
        element.className = "metadata-map-pin-anchor";
        const pin = document.createElement("div");
        pin.className = "metadata-map-pin";
        const svg = document.createElementNS(
          "http://www.w3.org/2000/svg",
          "svg",
        );
        svg.setAttribute("viewBox", "0 0 26 36");
        svg.setAttribute("aria-hidden", "true");
        svg.innerHTML =
          window.AlbumMapPinIcon?.innerHTML("location-assign-pin") || "";
        pin.appendChild(svg);
        element.appendChild(pin);
      } else {
        element.className = "pm-target-icon";
        element.innerHTML =
          '<svg viewBox="0 0 25 41" aria-hidden="true">' +
          '<path d="M12.5 40C10.2 34.8 2 24.4 2 14.8A10.5 10.5 0 1 1 23 14.8C23 24.4 14.8 34.8 12.5 40Z" ' +
          'fill="#fff" stroke="#2563eb" stroke-width="2.2"/>' +
          '<circle cx="12.5" cy="14.6" r="4" fill="#2563eb"/></svg>';
      }
      this.targetMarker = new maplibregl.Marker({
        element,
        anchor: "bottom",
        draggable: this.options.targetDraggable === true,
      })
        .setLngLat(this.toMapLngLat(nextLat, nextLon))
        .addTo(this.map);
      if (this.options.targetDraggable === true) {
        this.targetMarker.on("dragstart", () => {
          element.classList.add("is-dragging");
        });
        this.targetMarker.on("dragend", () => {
          element.classList.remove("is-dragging");
          const position = this.targetMarker?.getLngLat();
          if (!position) return;
          const [sourceLat, sourceLon] = this.fromMapLngLat(
            position.lng,
            position.lat,
          );
          this.post("target-change", {
            lat: sourceLat,
            lon: sourceLon,
            source: "drag",
          });
        });
      }
      if (itemId == null) {
        delete document.body.dataset.targetId;
      } else {
        document.body.dataset.targetId = String(itemId);
      }
      document.body.dataset.targetLat = nextLat.toFixed(7);
      document.body.dataset.targetLon = nextLon.toFixed(7);
      if (focus) {
        const [displayLng, displayLat] = this.toMapLngLat(nextLat, nextLon);
        this.flyToPlace(displayLng, displayLat, 13, {
          keepZoom: false,
          allowZoomOut: true,
          ripple: false,
        });
      }
      return true;
    }

    clearTarget() {
      if (this.targetMarker) {
        this.targetMarker.remove();
        this.targetMarker = null;
      }
      delete document.body.dataset.targetId;
      delete document.body.dataset.targetLat;
      delete document.body.dataset.targetLon;
    }

    focusItem(id, { zoom = 12, ripple = true, keepZoom = true } = {}) {
      const item = this.items.find((entry) => entry.id === Number(id));
      if (!item || !this.map) return false;
      this.selectedId = item.id;
      this.renderMarkers();
      const [lng, lat] = this.toMapLngLat(item.lat, item.lon);
      this.flyToPlace(lng, lat, zoom, { ripple, keepZoom });
      this.post("focus-item", { id: item.id });
      return true;
    }

    focusCoordinate(lat, lon, { zoom = 13 } = {}) {
      const nextLat = Number(lat);
      const nextLon = Number(lon);
      if (
        !this.map ||
        !Number.isFinite(nextLat) ||
        !Number.isFinite(nextLon) ||
        nextLat < -90 ||
        nextLat > 90 ||
        nextLon < -180 ||
        nextLon > 180
      )
        return false;
      const [lng, displayLat] = this.toMapLngLat(nextLat, nextLon);
      this.flyToPlace(lng, displayLat, zoom, {
        keepZoom: false,
        allowZoomOut: true,
        ripple: false,
      });
      return true;
    }

    cancelFly() {
      this.flyGen += 1;
      if (this.flyRaf) {
        cancelAnimationFrame(this.flyRaf);
        this.flyRaf = 0;
      }
      if (this.flyTimer) {
        clearTimeout(this.flyTimer);
        this.flyTimer = 0;
      }
      return this.flyGen;
    }

    cancelDragInertia() {
      this.dragInertia?.cancel();
    }

    pxPerDeg(zoom) {
      return Math.pow(2, zoom) * (512 / 360);
    }

    visibleSpanLng(zoom) {
      const width = this.map.getContainer().clientWidth || 1200;
      return Math.min(((360 / 512) * width) / Math.pow(2, zoom), 150);
    }

    isTargetOnScreen(center, lng, lat, zoom) {
      const element = this.map.getContainer();
      const width = element.clientWidth || 1200;
      const height = element.clientHeight || 800;
      const spanLng = this.visibleSpanLng(zoom);
      if (Math.abs(wrapLngDelta(lng - center.lng)) >= spanLng * 0.47) {
        return false;
      }
      return (
        Math.abs(lat - center.lat) * Math.cos((center.lat * PI) / 180) <
        spanLng * (height / width) * 0.47
      );
    }

    flightPadding() {
      const width = this.map.getContainer().clientWidth || 1200;
      const height = this.map.getContainer().clientHeight || 800;
      return {
        top: Math.round(clampNum(height * 0.11, 74, 112)),
        right: Math.round(clampNum(width * 0.09, 88, 148)),
        bottom: Math.round(clampNum(height * 0.15, 108, 152)),
        left: Math.round(clampNum(width * 0.09, 88, 148)),
      };
    }

    flightBounds(center, targetLng, targetLat) {
      const points = [];
      for (let index = 0; index <= FLY_ROUTE_SAMPLES; index += 1) {
        const [lat, lng] = slerpLatLng(
          center.lat,
          center.lng,
          targetLat,
          targetLng,
          index / FLY_ROUTE_SAMPLES,
        );
        points.push([lng, lat]);
      }
      let [west, east] = this.minimalLongitudeRange(
        points.map((point) => point[0]),
      );
      const latitudes = points.map((point) => point[1]);
      const south = Math.min(...latitudes);
      const north = Math.max(...latitudes);
      if (east - west < 0.000001) east = west + 0.000001;
      return [
        [west, south],
        [east, north],
      ];
    }

    flyPeakZoom(center, targetLng, targetLat, zoom0, zoom1) {
      const maximumPeak = Math.min(zoom0, zoom1);
      const padding = this.flightPadding();
      let zoom = NaN;
      try {
        const camera = this.map.cameraForBounds(
          this.flightBounds(center, targetLng, targetLat),
          {
            padding,
            bearing: this.map.getBearing(),
            pitch: this.map.getPitch(),
            maxZoom: maximumPeak,
          },
        );
        zoom = Number(camera?.zoom);
      } catch {}
      if (!Number.isFinite(zoom)) {
        /* cameraForBounds 不可用时仍保留距离兜底；让两端落在可用宽度
           的中心区域，而不是像旧逻辑一样只占约 40% 视野。 */
        const width = this.map.getContainer().clientWidth || 1200;
        const distance = angularDistDeg(
          center.lat,
          center.lng,
          targetLat,
          targetLng,
        );
        const span = clampNum(distance * 1.35, 0.02, 150);
        zoom = Math.log2(((360 / 512) * width) / span);
      }
      const peak = clampNum(zoom, this.globeMinimumZoom(), maximumPeak);
      return maximumPeak - peak < FLY_FIT_PEAK_DEADBAND ? maximumPeak : peak;
    }

    pingMarker() {
      const element = this.selectedMarkerEl;
      if (!element || !element.isConnected) return;
      const image = element.querySelector("img");
      if (!image) return;
      const scale = this.curMarkerScale || 1;
      const elementRect = element.getBoundingClientRect();
      const imageRect = image.getBoundingClientRect();
      let ring = element.querySelector(".pm-ping");
      if (!ring) {
        ring = document.createElement("span");
        ring.className = "pm-ping";
        element.appendChild(ring);
      }
      ring.style.left = `${imageRect.left - elementRect.left - 2}px`;
      ring.style.top = `${imageRect.top - elementRect.top - 2}px`;
      ring.style.width = `${imageRect.width + 4}px`;
      ring.style.height = `${imageRect.height + 4}px`;
      ring.style.borderRadius = `${3 + 4 * scale}px`;
      ring.classList.remove("on");
      void ring.offsetWidth;
      ring.classList.add("on");
    }

    flyToPlace(lng, lat, targetZoom, options = {}) {
      const map = this.map;
      if (!map) return;
      this.cancelDragInertia();
      this.zoomAnchorContext = null;
      this.zoomAnchorAt = 0;
      const generation = this.cancelFly();
      map.stop();
      const zoom0 = map.getZoom();
      const requestedZoom = clampNum(
        targetZoom || REF_ZOOM,
        this.globeMinimumZoom(),
        MAP_MAX_ZOOM,
      );
      const zoom1 = options.keepZoom
        ? zoom0
        : options.allowZoomOut
          ? requestedZoom
          : Math.max(zoom0, requestedZoom);
      const finalPitch = this.manualViewLocked
        ? map.getPitch()
        : this.globePitchForZoom(zoom1);
      const center = map.getCenter();
      const targetLng = center.lng + wrapLngDelta(lng - center.lng);
      const distance = angularDistDeg(center.lat, center.lng, lat, targetLng);
      const onScreen = this.isTargetOnScreen(center, targetLng, lat, zoom0);
      const peak = onScreen
        ? Math.min(zoom0, zoom1)
        : this.flyPeakZoom(center, targetLng, lat, zoom0, zoom1);
      const panPx = distance * this.pxPerDeg(peak);
      const zoomLevels = zoom0 - peak + (zoom1 - peak);
      document.body.dataset.flightStartZoom = zoom0.toFixed(4);
      document.body.dataset.flightEndZoom = zoom1.toFixed(4);
      document.body.dataset.flightPeakZoom = peak.toFixed(4);
      document.body.dataset.flightDistance = distance.toFixed(6);
      document.body.dataset.flightRoute = onScreen ? "direct" : "fit-route";
      if (panPx < FLY_STILL_PX && zoomLevels < 0.05) {
        if (options.ripple) this.pingMarker();
        options.onComplete?.();
        return;
      }
      const baseDuration = clampNum(
        zoomLevels * FLY_ZOOM_MS_PER_LEVEL + panPx * FLY_PAN_MS_PER_PX,
        FLY_MIN_MS + panPx * 0.6,
        FLY_MAX_MS,
      );
      const duration =
        baseDuration * FLIGHT_SPEED_DURATION_FACTORS[this.flightSpeed];
      document.body.dataset.flightSpeed = this.flightSpeed;
      document.body.dataset.flightDuration = String(Math.round(duration));
      if (options.ripple) {
        if (zoomLevels < 0.05) this.pingMarker();
        else {
          this.flyTimer = setTimeout(() => {
            this.flyTimer = 0;
            if (generation === this.flyGen) this.pingMarker();
          }, duration + 40);
        }
      }
      const outLevels = Math.max(zoom0 - peak, 1e-6);
      const inLevels = Math.max(zoom1 - peak, 1e-6);
      const fraction = clampNum(
        outLevels / (outLevels + inLevels * 1.6),
        0.06,
        0.94,
      );
      const zoomAt = (time) => {
        if (time <= 0) return zoom0;
        if (time >= 1) return zoom1;
        if (time <= fraction) {
          const unit = time / fraction;
          return zoom0 + (peak - zoom0) * (2 * unit - unit * unit);
        }
        return (
          peak +
          (zoom1 - peak) * easeInOutSine((time - fraction) / (1 - fraction))
        );
      };
      const samples = 48;
      const accumulated = [0];
      for (let index = 1; index <= samples; index += 1) {
        const time = (index - 0.5) / samples;
        accumulated.push(
          accumulated[index - 1] +
            Math.pow(2, -zoomAt(time)) * flightSpeed(time),
        );
      }
      const total = accumulated[samples];
      const panAt = (time) => {
        if (time <= 0) return 0;
        if (time >= 1) return 1;
        const position = time * samples;
        const index = Math.floor(position);
        const fractionInSample = position - index;
        const value =
          accumulated[index] +
          (accumulated[Math.min(samples, index + 1)] - accumulated[index]) *
            fractionInSample;
        return value / total;
      };
      const started = performance.now();
      const step = (now) => {
        if (generation !== this.flyGen) return;
        const time = (now - started) / duration;
        if (time >= 1) {
          this.flyRaf = 0;
          map.jumpTo({
            center: [targetLng, lat],
            zoom: zoom1,
            pitch: finalPitch,
          });
          this.updateDiagnostics();
          options.onComplete?.();
          return;
        }
        const travelled = panAt(time);
        const middle = slerpLatLng(
          center.lat,
          center.lng,
          lat,
          targetLng,
          travelled,
        );
        const frameZoom = zoomAt(time);
        map.jumpTo({
          center: [middle[1], middle[0]],
          zoom: frameZoom,
          pitch: this.manualViewLocked
            ? map.getPitch()
            : this.globePitchForZoom(frameZoom),
        });
        this.flyRaf = requestAnimationFrame(step);
      };
      this.flyRaf = requestAnimationFrame(step);
    }

    minimalLongitudeRange(longitudes) {
      const sorted = [...new Set(longitudes)].sort((a, b) => a - b);
      if (sorted.length <= 1) return [sorted[0] || 0, sorted[0] || 0];
      let largestGap = -1;
      let gapIndex = -1;
      for (let index = 0; index < sorted.length; index += 1) {
        const current = sorted[index];
        const next =
          index === sorted.length - 1 ? sorted[0] + 360 : sorted[index + 1];
        const gap = next - current;
        if (gap > largestGap) {
          largestGap = gap;
          gapIndex = index;
        }
      }
      const start = sorted[(gapIndex + 1) % sorted.length];
      const unwrapped = sorted.map((lng) => (lng < start ? lng + 360 : lng));
      return [start, Math.max(...unwrapped)];
    }

    fitAllTarget() {
      if (!this.map || !this.items.length) return null;
      const groups = this.exactCoordinateGroups();
      const points = groups.map((group) =>
        this.toMapLngLat(group[0].lat, group[0].lon),
      );
      if (points.length === 1) {
        return {
          center: points[0],
          zoom: 15.5,
          bearing: 0,
          pitch: this.globePitchForZoom(15.5),
        };
      }
      let [west, east] = this.minimalLongitudeRange(
        points.map((point) => point[0]),
      );
      const latitudes = points.map((point) => point[1]);
      const south = Math.min(...latitudes);
      const north = Math.max(...latitudes);
      if (east - west < 0.000001) east = west + 0.000001;
      const padding = { top: 82, right: 96, bottom: 116, left: 82 };
      const bearing = this.map.getBearing();
      let camera = this.map.cameraForBounds(
        [
          [west, south],
          [east, north],
        ],
        { padding, bearing, pitch: 0, maxZoom: 15.5 },
      );
      if (!camera || !Number.isFinite(Number(camera.zoom))) return null;
      let zoom = clampNum(Number(camera.zoom), this.globeMinimumZoom(), 15.5);
      let pitch = this.globePitchForZoom(zoom);
      if (pitch > 0.05) {
        camera = this.map.cameraForBounds(
          [
            [west, south],
            [east, north],
          ],
          { padding, bearing, pitch, maxZoom: 15.5 },
        );
        zoom = clampNum(Number(camera?.zoom), this.globeMinimumZoom(), 15.5);
        pitch = this.globePitchForZoom(zoom);
      }
      return {
        center: camera?.center
          ? [camera.center.lng, camera.center.lat]
          : [(west + east) / 2, (south + north) / 2],
        zoom,
        bearing,
        pitch,
        padding,
      };
    }

    applyFitTarget(target) {
      if (!this.map || !target) return;
      this.map.jumpTo({
        center: target.center,
        zoom: target.zoom,
        bearing: target.bearing,
        pitch: target.pitch,
      });
      if (target.padding) {
        document.body.dataset.fitPadding = JSON.stringify(target.padding);
      }
    }

    flyToFit({ onComplete = null } = {}) {
      if (!this.map || !this.mapLoaded || !this.items.length) return false;
      const target = this.fitAllTarget();
      if (!target) return false;
      this.flyToPlace(target.center[0], target.center[1], target.zoom, {
        keepZoom: false,
        allowZoomOut: true,
        ripple: false,
        onComplete: () => {
          document.body.dataset.fitApplied = "true";
          this.updateDiagnostics();
          onComplete?.();
        },
      });
      if (target.padding) {
        document.body.dataset.fitPadding = JSON.stringify(target.padding);
      }
      this.pendingFit = false;
      this.renderMarkers();
      this.updateDiagnostics();
      return true;
    }

    fitAll() {
      if (!this.map || !this.mapLoaded || !this.items.length) return;
      const target = this.fitAllTarget();
      if (!target) return;
      this.applyFitTarget(target);
      this.pendingFit = false;
      document.body.dataset.fitApplied = "true";
      this.renderMarkers();
      this.updateDiagnostics();
    }

    resetView({ fitItems = this.fitItems } = {}) {
      if (!this.map) return;
      this.cancelDragInertia();
      this.zoomAnchorContext = null;
      this.zoomAnchorAt = 0;
      this.cancelFly();
      this.cancelAdaptiveZoom();
      this.clearTarget();
      this.manualViewLocked = false;
      if (fitItems && this.items.length) {
        this.fitAll();
      } else {
        this.map.jumpTo({
          center: this.initialCenter,
          zoom: this.initialZoom + this.viewportZoomOffset,
          bearing: this.initialBearing,
          pitch: this.globePitchForZoom(
            this.initialZoom + this.viewportZoomOffset,
          ),
        });
      }
      this.updateGlobeShift();
      this.updateGlobeBackdrop();
      this.updateDiagnostics();
    }

    resetToGlobe() {
      this.resetView({ fitItems: false });
    }

    resetBearing() {
      if (!this.map) return;
      this.cancelDragInertia();
      this.zoomAnchorContext = null;
      this.zoomAnchorAt = 0;
      this.cancelFly();
      this.cancelAdaptiveZoom();
      const pitch = this.globePitchForZoom(this.map.getZoom());
      this.manualViewLocked = false;
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
        this.map.jumpTo({ bearing: 0, pitch });
      } else {
        this.map.easeTo({
          bearing: 0,
          pitch,
          duration: 240,
          easing: (value) => 1 - (1 - value) ** 3,
          essential: true,
        });
      }
      this.syncCompass();
    }

    syncCompass() {
      if (!this.compassButton || !this.map) return;
      const bearing = this.map.getBearing();
      const shownBearing = ((bearing + 540) % 360) - 180;
      const northUp = Math.abs(shownBearing) < 0.35;
      if (this.compassNeedle) {
        this.compassNeedle.style.transform = `rotate(${(-shownBearing).toFixed(2)}deg)`;
      }
      this.compassButton.classList.toggle("is-north-up", northUp);
      this.compassButton.dataset.bearing = shownBearing.toFixed(2);
      this.compassButton.setAttribute(
        "aria-label",
        northUp ? "地图已朝北" : "转到正北朝上",
      );
      this.compassButton.title = northUp ? "地图已朝北" : "转到正北朝上";
    }

    activate() {
      if (!this.map) return;
      this.resizeMapToViewport();
      if (this.pendingFit) this.fitAll();
    }

    scheduleDiagnostics() {
      if (this.diagnosticsFrame) return;
      this.diagnosticsFrame = requestAnimationFrame(() => {
        this.diagnosticsFrame = 0;
        this.updateDiagnostics();
      });
    }

    updateDiagnostics() {
      if (!this.map) return;
      const center = this.map.getCenter();
      document.body.dataset.mapZoom = this.map.getZoom().toFixed(4);
      document.body.dataset.mapPitch = this.map.getPitch().toFixed(2);
      document.body.dataset.mapBearing = this.map.getBearing().toFixed(2);
      document.body.dataset.mapCenter = `${center.lng.toFixed(6)},${center.lat.toFixed(6)}`;
      document.body.dataset.projection =
        this.map.getStyle()?.projection?.type || "globe";
      document.body.dataset.mapSize = `${this.map.getContainer().clientWidth}x${this.map.getContainer().clientHeight}`;
      document.body.dataset.minZoom = String(this.map.getMinZoom());
      document.body.dataset.globeFitZoom = this.globeFitZoom.toFixed(4);
      document.body.dataset.viewportScale = this.viewportScale.toFixed(4);
      document.body.dataset.viewportZoomOffset =
        this.viewportZoomOffset.toFixed(4);
      document.body.dataset.viewportMargin = "82";
      this.syncCompass();
    }

    announceFirstFrameWhenRendered() {
      if (this.firstFrameSent || this.firstFrameWaiting) return;
      this.firstFrameWaiting = true;
      let settled = false;
      const finish = () => {
        if (settled) return;
        settled = true;
        this.firstFrameWaiting = false;
        this.announceFirstFrame();
      };
      const check = () => {
        if (!this.map || this.firstFrameSent) {
          this.firstFrameWaiting = false;
          return;
        }
        /* Reveal the rendered local world map immediately. Detailed vector
           tiles continue streaming in the background. */
        finish();
      };
      requestAnimationFrame(() => requestAnimationFrame(check));
      window.setTimeout(finish, 900);
    }

    announceFirstFrame() {
      if (this.firstFrameSent) return;
      this.firstFrameSent = true;
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          document.body.dataset.mapFrameReady = "true";
          this.post("first-frame");
        });
      });
    }
  }

  window.EmbeddedGlobe = EmbeddedGlobe;
})();
