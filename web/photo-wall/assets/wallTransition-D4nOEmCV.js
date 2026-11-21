var e = 0.88;
function t(e, t = 28) {
  let n = Math.sqrt(360),
    r = 24 / (2 * n),
    i = n * Math.sqrt(1 - r ** 2),
    a = r * n,
    o = [];
  for (let n = 0; n <= t; n += 1) {
    let r = n / t,
      s = (e * r) / 1e3,
      c = Math.exp(-a * s),
      l =
        r === 0
          ? 0
          : r === 1
            ? 1
            : 1 - c * ((a / i) * Math.sin(i * s) + Math.cos(i * s));
    o.push({ offset: r, progress: l });
  }
  return o;
}
var n = t(583).map(({ offset: t, progress: n }) => ({
    offset: t,
    transform: `translate3d(0, ${(-68 * (1 - n)).toFixed(2)}px, 0) scale(${(e + 0.12 * n).toFixed(4)})`,
  })),
  r = [...n].reverse().map((e, t, n) => ({
    offset: t / Math.max(1, n.length - 1),
    transform: e.transform,
  }));
function i(e, t) {
  return Math.max(1, (Math.max(1, e) + t) * 0.38);
}
function a(e, t, n) {
  let r = Math.max(0, e.left - t.left) + Math.max(0, e.top - t.top);
  return Math.round((r / Math.max(1, n)) * 30);
}
/* 保留左上到右下的距离顺序，只在极大首屏超过目标窗口时
   按比例压缩，避免后半批撞到固定上限后同时开始。 */
function s(e, t = 900) {
  let n = e.reduce(
    (e, { delay: t }) => Math.max(e, Number.isFinite(t) ? t : 0),
    0,
  );
  if (n <= t) return e;
  let r = t / n;
  return e.map((e) => ({ ...e, delay: e.delay * r }));
}
function o(e, { timeoutMs: t = 80, limit: n = 12 } = {}) {
  let r = e.flatMap((e) => [...e.querySelectorAll(`img`)]),
    i = (e) => (e.decode ? e.decode().catch(() => {}) : Promise.resolve());
  return Promise.race([
    Promise.all(
      r.map((e) =>
        e.complete
          ? i(e)
          : new Promise((t) => {
              (e.addEventListener(
                `load`,
                () => {
                  i(e).finally(t);
                },
                { once: !0 },
              ),
                e.addEventListener(`error`, t, { once: !0 }));
            }),
      ),
    ),
    new Promise((e) => window.setTimeout(e, t)),
  ]);
}
export { a, o as i, n, i as o, r, s, e as t };
