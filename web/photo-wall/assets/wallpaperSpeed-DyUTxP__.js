function e(e) {
  let t = Number(e?.wallpaperCruiseSpeedMultiplier);
  return Number.isFinite(t) && t > 0 ? Math.min(2, Math.max(0.5, t)) : 1;
}
export { e as t };
