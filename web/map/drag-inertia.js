(() => {
  "use strict";

  const DRAG_MOVE_PX = 4;
  const RECENT_WINDOW_MS = 120;
  const RISE_SECONDS = 0.032;
  const FRICTION = 9.5;
  const MIN_RELEASE_SPEED = 0.15;
  const MAX_RELEASE_SPEED = 1.7;
  const MAX_DURATION_MS = 760;
  const BEARING_PER_PX = 0.22;
  const PITCH_PER_PX = 0.2;

  function clamp(value, low, high) {
    return Math.max(low, Math.min(high, value));
  }

  function progressAt(seconds) {
    const main = 1 - Math.exp(-FRICTION * seconds);
    const riseAndFriction =
      1 - Math.exp(-(FRICTION + 1 / RISE_SECONDS) * seconds);
    return main / FRICTION - riseAndFriction / (FRICTION + 1 / RISE_SECONDS);
  }

  function estimateRelease(gesture, releasedAt) {
    const samples = Array.isArray(gesture?.samples) ? gesture.samples : [];
    if (samples.length < 2) return null;
    const first = samples[0];
    const last = samples[samples.length - 1];
    const totalX = last.x - first.x;
    const totalY = last.y - first.y;
    const totalDistance = Math.hypot(totalX, totalY);
    if (totalDistance < DRAG_MOVE_PX) return null;

    const duration = Math.max(16, last.time - first.time);
    let recent = samples.filter(
      (sample) => last.time - sample.time <= RECENT_WINDOW_MS,
    );
    if (recent.length < 2) recent = samples.slice(-2);
    const recentFirst = recent[0];
    const recentDuration = Math.max(16, last.time - recentFirst.time);
    const pause = Math.max(0, releasedAt - last.time);
    const pauseFactor = Math.exp(-pause / 90);

    let velocityX =
      (0.45 * totalX) / duration +
      ((0.55 * (last.x - recentFirst.x)) / recentDuration) * pauseFactor;
    let velocityY =
      (0.45 * totalY) / duration +
      ((0.55 * (last.y - recentFirst.y)) / recentDuration) * pauseFactor;
    let speed = Math.hypot(velocityX, velocityY);
    if (speed < 0.035) {
      velocityX = (totalX / totalDistance) * MIN_RELEASE_SPEED;
      velocityY = (totalY / totalDistance) * MIN_RELEASE_SPEED;
      speed = MIN_RELEASE_SPEED;
    }
    const scale = clamp(speed, MIN_RELEASE_SPEED, MAX_RELEASE_SPEED) / speed;
    return {
      velocityX: velocityX * scale,
      velocityY: velocityY * scale,
    };
  }

  function zoomAtAnchor(map, zoom, pitch, anchor, point, afterZoom) {
    map.easeTo({
      zoom,
      around: anchor,
      pitch,
      duration: 0,
    });
    if (typeof afterZoom === "function") afterZoom();
    if (zoom >= 6 && map.getPitch() < 1) {
      const center = map.getCenter();
      const centerMercator = maplibregl.MercatorCoordinate.fromLngLat(center);
      const anchorMercator = maplibregl.MercatorCoordinate.fromLngLat(anchor);
      const underMercator = map.transform.screenPointToMercatorCoordinate(
        new maplibregl.Point(point[0], point[1]),
      );
      if (
        Number.isFinite(underMercator.x) &&
        Number.isFinite(underMercator.y)
      ) {
        const target = new maplibregl.MercatorCoordinate(
          anchorMercator.x + centerMercator.x - underMercator.x,
          anchorMercator.y + centerMercator.y - underMercator.y,
        );
        map.jumpTo({ center: target.toLngLat() });
      }
      return;
    }
    for (let index = 0; index < 4; index += 1) {
      const under = map.unproject(point);
      if (!under || !Number.isFinite(under.lng) || !Number.isFinite(under.lat))
        break;
      const errorLng = ((anchor.lng - under.lng + 540) % 360) - 180;
      const errorLat = anchor.lat - under.lat;
      if (Math.abs(errorLng) < 0.00005 && Math.abs(errorLat) < 0.00005) break;
      const center = map.getCenter();
      map.jumpTo({
        center: [
          center.lng + errorLng * 0.85,
          clamp(center.lat + errorLat * 0.85, -85, 85),
        ],
      });
    }
  }

  function rotateAtAnchor(map, bearing, pitch, anchor, point) {
    if (!anchor || !Array.isArray(point)) {
      map.jumpTo({ bearing, pitch });
      return;
    }
    map.jumpTo({ bearing, pitch });
    const transform = map._getTransformForUpdate();
    transform.setLocationAtPoint(
      anchor,
      new maplibregl.Point(point[0], point[1]),
    );
    map._update();
    map.fire("move");
  }

  class DragInertiaController {
    constructor(map) {
      this.map = map;
      this.motion = null;
    }

    cancel() {
      if (this.motion?.raf) cancelAnimationFrame(this.motion.raf);
      this.motion = null;
    }

    start(gesture, mode) {
      this.cancel();
      if (
        !this.map ||
        window.matchMedia("(prefers-reduced-motion: reduce)").matches
      ) {
        return false;
      }
      const release = estimateRelease(gesture, performance.now());
      if (!release) return false;
      const startedAt = performance.now();
      const motion = {
        mode,
        anchor: gesture.anchorLngLat || null,
        anchorPoint: gesture.anchorPoint || null,
        velocityX: release.velocityX,
        velocityY: release.velocityY,
        startedAt,
        lastProgress: 0,
        raf: 0,
      };
      this.motion = motion;

      const step = (now) => {
        if (this.motion !== motion) return;
        const elapsed = Math.max(0, (now - startedAt) / 1000);
        if (elapsed < 0.001) {
          motion.raf = requestAnimationFrame(step);
          return;
        }
        const progress = progressAt(elapsed);
        const moved = progress - motion.lastProgress;
        motion.lastProgress = progress;
        const dx = motion.velocityX * moved * 1000;
        const dy = motion.velocityY * moved * 1000;

        if (mode === "rotation") {
          rotateAtAnchor(
            this.map,
            this.map.getBearing() + dx * BEARING_PER_PX,
            clamp(this.map.getPitch() - dy * PITCH_PER_PX, 0, 75),
            motion.anchor,
            motion.anchorPoint,
          );
        } else {
          const center = this.map.getCenter();
          const point = this.map.project(center);
          const target = this.map.unproject([point.x - dx, point.y - dy]);
          this.map.jumpTo({ center: target });
        }

        const speed =
          Math.hypot(motion.velocityX, motion.velocityY) *
          (1 - Math.exp(-elapsed / RISE_SECONDS)) *
          Math.exp(-FRICTION * elapsed);
        if (now - startedAt >= MAX_DURATION_MS || speed < 0.006) {
          motion.raf = 0;
          this.motion = null;
          return;
        }
        motion.raf = requestAnimationFrame(step);
      };

      motion.raf = requestAnimationFrame(step);
      return true;
    }

    startPan(gesture) {
      return this.start(gesture, "pan");
    }

    startRotation(gesture) {
      return this.start(gesture, "rotation");
    }
  }

  window.DragInertiaController = DragInertiaController;
  window.MapInteractionHelpers = {
    zoomAtAnchor,
    rotateAtAnchor,
  };
})();
