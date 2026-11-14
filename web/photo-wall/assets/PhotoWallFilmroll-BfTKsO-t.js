import { i as e, n as t, r as n, t as r } from "./index-eYugSr6J.js";
import {
  gapCompensation,
  n as i,
} from "./layoutConstants-nNzqxgbJ.js";
import { t as a } from "./wallpaperSpeed-DyUTxP__.js";
import { n as o, t as s } from "./previewSources-C0PeInwa.js";
import {
  i as waitForImages,
  s as revealSchedule,
} from "./wallTransition-D4nOEmCV.js";
var c = e(n()),
  l = t(),
  u = r(),
  d = 8,
  f = 6.3,
  p = 4,
  ee = 54,
  m = 2e3,
  h = 583,
  g = 240,
  te = 30,
  _ = 340,
  ne = 68,
  re = 80,
  v = 1.5,
  y = 4,
  ie = 0.25,
  b = 0.7,
  ae = 1.8,
  initialCameraZoom = 1.12,
  oe = 0.0018,
  se = `center`,
  x = `minimal`,
  ce = `photo-wall-focus-mode`,
  S = 24,
  le = 650,
  C = 72,
  ue = 1200,
  de = 150,
  fe = 210,
  pe = 180,
  me = 18,
  he = 420,
  ge = 1400,
  _e = `cubic-bezier(0.55, 0, 0.9, 0.45)`,
  ve = `cubic-bezier(0.2, 0.7, 0.25, 1)`,
  ye = Object.freeze({
    right: 0,
    "down-right": Math.PI / 4,
    down: Math.PI / 2,
    "down-left": (Math.PI * 3) / 4,
    left: Math.PI,
    "up-left": (-Math.PI * 3) / 4,
    up: -Math.PI / 2,
    "up-right": -Math.PI / 4,
  });
function be(e, t = 28) {
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
var xe = be(h).map(({ offset: e, progress: t }) => ({
    offset: e,
    transform: `translate3d(0, ${(-68 * (1 - t)).toFixed(2)}px, 0) scale(${(0.88 + 0.12 * t).toFixed(4)})`,
  })),
  Se = [...xe].reverse().map((e, t, n) => ({
    offset: t / Math.max(1, n.length - 1),
    transform: e.transform,
  }));
function Ce(e, t, n) {
  return Math.max(t, Math.min(n, e));
}
function w(e) {
  let t = Number(e?.aspect);
  return Number.isFinite(t) && t > 0 ? Ce(t, 0.24, 6) : 1;
}
function we(e, t) {
  let n = i(e),
    r = Math.max(1, t - 16),
    a = Math.min(196, Math.max(84, t / f)),
    o = Math.max(1, Math.round((r + n) / (a + n))),
    s = (r - n * (o - 1)) / o;
  for (; o > 1 && s < 42;) (--o, (s = (r - n * (o - 1)) / o));
  return { tracks: o, trackHeight: s, frameHeight: Math.max(42, s), gap: n };
}
function Te(e, t) {
  let n = 0,
    r = (Array.isArray(e) ? e : []).map((e, r) => {
      let i = Math.max(24, t.frameHeight * w(e)),
        a = { item: e, itemIndex: r, x: n, width: i, end: n + i };
      return ((n = a.end + t.gap), a);
    });
  return { frames: r, cycleWidth: r.length ? r[r.length - 1].end + t.gap : 1 };
}
function Ee(e, t, n, r) {
  let i = e.slice(),
    a = Number(t) || 1;
  for (let e = i.length - 1; e > 0; --e) {
    let t = Math.floor(
      Ne(
        a ^
          Math.imul(n + 65536, 2654435761) ^
          Math.imul(r + 32768, 2246822507) ^
          Math.imul(e + 1, 668265261),
      ) *
        (e + 1),
    );
    [i[e], i[t]] = [i[t], i[e]];
  }
  return i;
}
function De(e, t, n, r = 1) {
  let i = e.frameHeight + e.gap,
    a = i * y,
    o = Math.max(0.01, r),
    s = -n / o - a,
    c = (-n + t) / o + a,
    l = Math.floor((s - d) / i) - 1,
    u = Math.ceil((c - d) / i) + 1,
    f = [];
  for (let e = l; e <= u; e += 1) f.push({ lane: e, top: d + e * i });
  return f;
}
function Oe({
  items: e,
  seed: t,
  metrics: n,
  viewportWidth: r,
  viewportHeight: i,
  cameraX: a,
  cameraY: o,
  cameraZoom: s = 1,
}) {
  let { frames: c, cycleWidth: l } = Te(e, n);
  if (!c.length) return [];
  let u = Math.max(0.01, s),
    d = Number(t) || 1,
    f = r * v,
    p = -a / u - f,
    ee = (-a + r) / u + f,
    m = [];
  for (let e of De(n, i, o, u)) {
    let { lane: t } = e,
      r = Me(t, d, l),
      i = Math.floor((p - r) / l) - 1,
      a = Math.ceil((ee - r) / l) + 1;
    for (let o = i; o <= a; o += 1) {
      let i = o * l + r;
      for (let r of Ee(c, d, t, o)) {
        let a = i + r.width;
        if (a < p) i = a + n.gap;
        else {
          if (i > ee) break;
          (m.push({
            ...r,
            lane: t,
            x: i,
            y: e.top,
            height: n.frameHeight,
            key: `${t}:${o}:${r.itemIndex}`,
          }),
            (i = a + n.gap));
        }
      }
    }
  }
  return m;
}
function ke() {
  try {
    return localStorage.getItem(ce) === se ? se : x;
  } catch {
    return x;
  }
}
function Ae(e, t, n, r, i, a, o = 1) {
  if (!e) return { x: n, y: r };
  let s = Math.max(0.01, o);
  if (t === se)
    return {
      x: i / 2 - (e.x + e.width / 2) * s,
      y: a / 2 - (e.y + e.height / 2) * s,
    };
  let c = n,
    l = r,
    u = e.x * s + c,
    d = e.y * s + l,
    f = u + e.width * s,
    p = d + e.height * s;
  return (
    u < S && (c += S - u),
    f > i - S && (c -= f - (i - S)),
    d < S && (l += S - d),
    p > a - S && (l -= p - (a - S)),
    { x: c, y: l }
  );
}
async function je(e) {
  let t = [...new Set((e || []).filter(Boolean))].slice(0, C);
  t.length &&
    (await Promise.race([
      Promise.all(
        t.map(
          (e) =>
            new Promise((t) => {
              let n = new Image(),
                r = !1,
                i = () => {
                  r || ((r = !0), t());
                };
              ((n.onload = i),
                (n.onerror = i),
                (n.src = e),
                n.complete &&
                  (n.naturalWidth > 0
                    ? n
                        .decode?.()
                        .catch(() => {})
                        .finally(i)
                    : i()));
            }),
        ),
      ),
      new Promise((e) => {
        window.setTimeout(e, ue);
      }),
    ]));
}
function Me(e, t, n) {
  let r = (e * 0.61803398875 + Ne(t ^ Math.imul(e + 1, 2654435761))) % 1;
  return n * (r < 0 ? r + 1 : r);
}
function Ne(e) {
  let t = Number(e) >>> 0;
  return (
    (t ^= t >>> 16),
    (t = Math.imul(t, 2146121005)),
    (t ^= t >>> 15),
    (t = Math.imul(t, 2221713035)),
    (t ^= t >>> 16),
    (t >>> 0) / 4294967296
  );
}
function T(e) {
  window.parent.postMessage(e, window.location.origin);
}
function Pe(e, t, n) {
  if (!e) return null;
  let r = Math.min(3, t.tracks),
    i = e.lane - Math.floor(r / 2),
    a = d + i * (t.frameHeight + t.gap),
    o = r * t.frameHeight + (r - 1) * t.gap,
    s = w(e.item),
    c = Math.max(1, n * 0.86),
    l = Math.min(o, c / s),
    u = l * s;
  return {
    x: e.x + e.width / 2 - u / 2,
    y: a + (o - l) / 2,
    width: u,
    height: l,
    gap: t.gap,
    startLane: i,
    endLane: i + r - 1,
  };
}
function Fe(e, t, n) {
  if (!t || !n) return e;
  let r = t.x + t.width / 2,
    i = new Map();
  for (let a = t.startLane; a <= t.endLane; a += 1) {
    let o = e.filter((e) => e.key !== n && e.lane === a),
      s = o.filter((e) => e.x + e.width / 2 < r),
      c = o.filter((e) => e.x + e.width / 2 >= r);
    if (s.length) {
      let e = Math.max(...s.map((e) => e.x + e.width)),
        n = t.x - t.gap - e;
      for (let e of s) i.set(e.key, { ...e, x: e.x + n });
    }
    if (c.length) {
      let e = Math.min(...c.map((e) => e.x)),
        n = t.x + t.width + t.gap - e;
      for (let e of c) i.set(e.key, { ...e, x: e.x + n });
    }
  }
  return e.map((e) =>
    e.key === n
      ? { ...e, x: t.x, y: t.y, width: t.width, height: t.height, focused: !0 }
      : i.get(e.key) || e,
  );
}
let focusPreparationSequence = 0,
  focusMotionTimer = 0;
function warmFilmrollImage(e) {
  if (!e) return Promise.resolve();
  return new Promise((t) => {
    let n = new Image(),
      r = !1,
      i = () => {
        if (r) return;
        ((r = !0),
          typeof n.decode == `function`
            ? n
                .decode()
                .catch(() => {})
                .finally(t)
            : t());
      };
    ((n.onload = i),
      (n.onerror = () => {
        r || ((r = !0), t());
      }),
      (n.decoding = `async`),
      (n.src = e),
      n.complete && n.naturalWidth > 0 && i());
  });
}
function filmrollFallbackUrl(e, t) {
  return e?.kind === `photo`
    ? `/api/thumb/${encodeURIComponent(e.id)}?size=${t}&fit=inside`
    : ``;
}
function Ie({
  frame: e,
  lane: t,
  entering: n,
  focused: r,
  interactive: i,
  onSelect: a,
  backdrop: g = !1,
}) {
  let o = e.item.src,
    c = s(e.item.src),
    d = r && e.item.large && e.item.large !== o ? e.item.large : ``;
  return (0, u.jsxs)(`button`, {
    type: `button`,
    className: `pw-filmroll-card${n ? ` is-entering` : ``}${r ? ` is-focused` : ``}${g ? ` is-focus-anchor` : ``}`,
    "data-item-id": e.item.id,
    "data-item-index": e.itemIndex,
    "data-item-kind": e.item.kind || `photo`,
    "data-lane": t,
    "data-card-key": e.key,
    "aria-label":
      e.item.kind === `album`
        ? `打开相簿，${e.item.title || ``}`
        : `聚焦照片，${e.item.title || ``}`,
    style: {
      left: `calc(${e.x.toFixed(3)}px - var(--pw-camera-gap-extra, 0px))`,
      top: `calc(${e.y.toFixed(3)}px - var(--pw-camera-gap-extra, 0px))`,
      width: `calc(${e.width.toFixed(3)}px + var(--pw-camera-gap-extra, 0px) + var(--pw-camera-gap-extra, 0px))`,
      height: `calc(${e.height.toFixed(3)}px + var(--pw-camera-gap-extra, 0px) + var(--pw-camera-gap-extra, 0px))`,
      backgroundImage: c ? `url(${JSON.stringify(c)})` : undefined,
      zIndex: r ? 20 : g ? 0 : 1,
    },
    onClick: (t) => (g ? t.stopPropagation() : a(e, t)),
    tabIndex: i ? 0 : -1,
    children: [
      (0, u.jsx)(
        `img`,
        {
          className: `pw-filmroll-card-base`,
          src: o,
          alt: ``,
          draggable: `false`,
          decoding: `async`,
          loading: `lazy`,
          fetchPriority: `low`,
          onLoad: (e) => {
            (e.currentTarget.classList.remove(`is-failed`),
              e.currentTarget.classList.add(`is-loaded`));
          },
          onError: (event) => {
            let t = event.currentTarget,
              n = filmrollFallbackUrl(e.item, 900);
            if (n && t.dataset.fallback !== `thumb`) {
              (t.classList.remove(`is-failed`),
                (t.dataset.fallback = `thumb`),
                (t.parentElement.style.backgroundImage = `url(${JSON.stringify(n)})`),
                (t.src = n));
              return;
            }
            (t.classList.remove(`is-loaded`), t.classList.add(`is-failed`));
          },
        },
        o,
      ),
      (0, u.jsx)(`img`, {
        className: `pw-filmroll-card-preview`,
        src: c,
        alt: ``,
        "aria-hidden": `true`,
        draggable: `false`,
        decoding: `async`,
        loading: `eager`,
        fetchPriority: `high`,
        onLoad: (e) => {
          (e.currentTarget.classList.remove(`is-failed`),
            e.currentTarget.classList.add(`is-loaded`));
        },
        onError: (event) => {
          let t = event.currentTarget,
            n = filmrollFallbackUrl(e.item, 180);
          if (n && t.dataset.fallback !== `thumb`) {
            ((t.dataset.fallback = `thumb`),
              (t.parentElement.style.backgroundImage = `url(${JSON.stringify(n)})`),
              (t.src = n));
            return;
          }
          t.classList.add(`is-failed`);
        },
      }),
      d
        ? (0, u.jsx)(
            `img`,
            {
              className: `pw-filmroll-card-detail`,
              src: d,
              alt: ``,
              "aria-hidden": `true`,
              draggable: `false`,
              decoding: `async`,
              loading: `eager`,
              fetchPriority: `high`,
              onLoad: (e) => {
                (e.currentTarget.classList.remove(`is-failed`),
                  e.currentTarget.classList.add(`is-loaded`));
              },
              onError: (e) => {
                (e.currentTarget.classList.remove(`is-loaded`),
                  e.currentTarget.classList.add(`is-failed`));
              },
            },
            d,
          )
        : null,
    ],
  });
}
function Le() {
  let [e, t] = (0, c.useState)(null),
    [n, r] = (0, c.useState)(() => ({
      width: Math.max(1, window.innerWidth),
      height: Math.max(1, window.innerHeight),
    })),
    [i, d] = (0, c.useState)(0),
    [f, v] = (0, c.useState)(0),
    [y, se] = (0, c.useState)(initialCameraZoom),
    [x, ce] = (0, c.useState)(null),
    [S, C] = (0, c.useState)(!1),
    [ue, be] = (0, c.useState)(!1),
    [w, Ee] = (0, c.useState)(!1),
    [Me, Le] = (0, c.useState)(!1),
    [Re, ze] = (0, c.useState)(!0),
    [backNear, setBackNear] = (0, c.useState)(!1),
    [wallpaperNear, setWallpaperNear] = (0, c.useState)(!1),
    [He, Ue] = (0, c.useState)(ke),
    [We, Ge] = (0, c.useState)(``),
    Ke = (0, c.useRef)(null),
    E = (0, c.useRef)(null),
    D = (0, c.useRef)(null),
    O = (0, c.useRef)(null),
    k = (0, c.useRef)(n),
    A = (0, c.useRef)(0),
    j = (0, c.useRef)(0),
    M = (0, c.useRef)(initialCameraZoom),
    Je = (0, c.useRef)(0),
    Ye = (0, c.useRef)(0),
    Xe = (0, c.useRef)(initialCameraZoom),
    Ze = (0, c.useRef)(0),
    Qe = (0, c.useRef)(0),
    $e = (0, c.useRef)(initialCameraZoom),
    et = (0, c.useRef)(null),
    tt = (0, c.useRef)(null),
    N = (0, c.useRef)(!1),
    P = (0, c.useRef)(0),
    F = (0, c.useRef)(0),
    nt = (0, c.useRef)(0),
    I = (0, c.useRef)(!1),
    cruiseVelocity = (0, c.useRef)({ x: 0, y: 0 }),
    L = (0, c.useRef)(!1),
    rt = (0, c.useRef)(!1),
    R = (0, c.useRef)(null),
    z = (0, c.useRef)(0),
    it = (0, c.useRef)(!1),
    at = (0, c.useRef)(0),
    B = (0, c.useRef)([]),
    V = (0, c.useRef)(0),
    ot = (0, c.useRef)(new Set()),
    H = (0, c.useRef)(!1),
    U = (0, c.useRef)(!1),
    W = (0, c.useRef)(0),
    G = (0, c.useRef)(0),
    cameraGapZoom = (0, c.useRef)(initialCameraZoom),
    cameraGapTimer = (0, c.useRef)(0),
    wheelMomentum = (0, c.useRef)({
      pendingX: 0,
      pendingY: 0,
      frame: 0,
      lastTime: null,
    }),
    st = (0, c.useRef)(new Set()),
    ct = (0, c.useRef)(null),
    lt = (0, c.useRef)(null),
    ut = (0, c.useRef)(null),
    dt = (0, c.useRef)(null),
    ft = (0, c.useRef)(0),
    pt = (0, c.useRef)([]),
    mt = (0, c.useRef)(null);
  ((O.current = e),
    (k.current = n),
    (I.current = w),
    (R.current = x),
    (0, c.useEffect)(() => {
      let e = () => {
        let e = {
          width: Math.max(1, window.innerWidth),
          height: Math.max(1, window.innerHeight),
        };
        ((k.current = e), r(e));
      };
      return (
        window.addEventListener(`resize`, e),
        () => window.removeEventListener(`resize`, e)
      );
    }, []),
    (0, c.useEffect)(
      () => () => {
        (cancelAnimationFrame(P.current), cancelAnimationFrame(F.current));
        for (let e of B.current)
          try {
            e.cancel();
          } catch {}
        ((B.current = []),
          cancelAnimationFrame(G.current),
          (H.current = !1),
          (U.current = !1),
          (W.current = 0),
          (G.current &&= (cancelAnimationFrame(G.current), 0)),
          clearTimeout(at.current),
          window.clearTimeout(z.current),
          (it.current = !1));
      },
      [],
    ));
  let K = (0, c.useMemo)(() => we(n.width, n.height), [n.height, n.width]),
    ht = (0, c.useMemo)(() => Te(e?.items, K), [e?.items, K]);
  (0, c.useEffect)(() => {
    o((e?.items || []).map((e) => s(e.src)));
  }, [e?.items]);
  let _t = (0, c.useMemo)(
      () =>
        Oe({
          items: e?.items,
          seed: e?.filmrollSeed,
          metrics: K,
          viewportWidth: n.width,
          viewportHeight: n.height,
          cameraX: i,
          cameraY: f,
          cameraZoom: y,
        }),
      [
        e?.filmrollSeed,
        e?.items,
        K.frameHeight,
        K.gap,
        i,
        f,
        y,
        n.height,
        n.width,
      ],
    ),
    q = (0, c.useMemo)(
      () => Pe(x, K, n.width),
      [x, K.frameHeight, K.gap, K.tracks, n.width],
    ),
    vt = (0, c.useMemo)(() => Fe(_t, q, x?.key), [x?.key, _t, q]),
    focusBackdrop = (0, c.useMemo)(
      () =>
        x
          ? _t.filter(
              (e) =>
                e.x * y + i + e.width * y > -48 &&
                e.y * y + f + e.height * y > -48 &&
                e.x * y + i < n.width + 48 &&
                e.y * y + f < n.height + 48,
            )
          : [],
      [x, _t, i, f, y, n.width, n.height],
    ),
    J = (0, c.useCallback)(
      (e, t = j.current, n = M.current) => {
        ((A.current = e), (j.current = t), (M.current = n));
        let world = D.current;
        if (world) {
          world.style.transform = `translate3d(${e.toFixed(3)}px, ${t.toFixed(3)}px, 0) scale(${n.toFixed(4)})`;
          world.dataset.cameraZoom = n.toFixed(4);
          if (Math.abs(n - cameraGapZoom.current) > 1e-4) {
            cameraGapZoom.current = n;
            world.style.setProperty(
              "--pw-camera-gap-extra",
              `${gapCompensation(K.gap, initialCameraZoom, n).toFixed(3)}px`,
            );
            world.dataset.cameraGapAdjusting = `true`;
            clearTimeout(cameraGapTimer.current);
            cameraGapTimer.current = window.setTimeout(() => {
              world.removeAttribute(`data-camera-gap-adjusting`);
            }, 140);
          }
        }
        if (
          Math.abs(e - Ze.current) > k.current.width * ie ||
          Math.abs(t - Qe.current) > k.current.height * ie ||
          Math.abs(n - $e.current) > 0.035
        ) {
          ((Ze.current = e),
            (Qe.current = t),
            ($e.current = n),
            d(e),
            v(t),
            se(n));
        }
      },
      [K.gap],
    ),
    cameraGapSync = (0, c.useEffect)(() => {
      let world = D.current;
      if (world) {
        cameraGapZoom.current = M.current;
        world.style.setProperty(
          "--pw-camera-gap-extra",
          `${gapCompensation(K.gap, initialCameraZoom, M.current).toFixed(3)}px`,
        );
      }
    }, [K.gap]),
    Y = (0, c.useCallback)(() => {
      (cancelAnimationFrame(P.current), (P.current = 0));
    }, []),
    X = (0, c.useCallback)(
      (e, t = j.current, n = M.current, duration = 0) => {
        (Y(), (Je.current = e), (Ye.current = t), (Xe.current = n));
        if (duration > 0) {
          let startX = A.current,
            startY = j.current,
            startZoom = M.current,
            started = 0,
            step = (now) => {
              if (!started) started = now;
              let progress = Math.min(1, (now - started) / duration),
                eased = progress * progress * (3 - 2 * progress);
              (J(
                startX + (e - startX) * eased,
                startY + (t - startY) * eased,
                startZoom + (n - startZoom) * eased,
              ),
                (P.current =
                  progress < 1 ? requestAnimationFrame(step) : 0));
            };
          P.current = requestAnimationFrame(step);
          return;
        }
        let lastTime = performance.now(),
          r = (now) => {
            let elapsed = Math.min(
                0.05,
                Math.max(0, (now - lastTime) / 1e3),
              ),
              alpha = 1 - Math.exp(-elapsed / 0.08),
              i = e - A.current,
              a = t - j.current,
              o = n - M.current;
            lastTime = now;
          Math.hypot(i, a) < 0.35 && Math.abs(o) < 2e-4
            ? (J(e, t, n), (P.current = 0))
            : (J(
                A.current + i * alpha,
                j.current + a * alpha,
                M.current + o * alpha,
              ),
              (P.current = requestAnimationFrame(r)));
          };
        P.current = requestAnimationFrame(r);
      },
      [J, Y],
    ),
    startCameraInertia = (0, c.useCallback)(
      (velocityX, velocityY, onComplete) => {
        let speed = Math.hypot(velocityX, velocityY);
        if (speed < 40) {
          onComplete?.();
          return;
        }
        let distance = Math.min(speed, 4e3) * 0.3,
          directionX = velocityX / speed,
          directionY = velocityY / speed,
          startX = A.current,
          startY = j.current,
          startedAt = performance.now(),
          step = (now) => {
            let remaining = -distance * Math.exp(-(now - startedAt) / 280),
              offset = distance + remaining;
            J(startX + directionX * offset, startY + directionY * offset);
            if (Math.abs(remaining) > 0.5) {
              P.current = requestAnimationFrame(step);
              return;
            }
            (J(
              startX + directionX * distance,
              startY + directionY * distance,
            ),
              (P.current = 0),
              onComplete?.());
          };
        (Y(), (P.current = requestAnimationFrame(step)));
      },
      [J, Y],
    ),
    stepWheelMotion = (0, c.useCallback)(
      (now) => {
        let motion = wheelMomentum.current,
          elapsed =
            motion.lastTime == null
              ? 1e3 / 60
              : Math.min(50, Math.max(0, now - motion.lastTime)),
          alpha = 1 - Math.exp(-elapsed / 56),
          stepX = motion.pendingX * alpha,
          stepY = motion.pendingY * alpha;
        ((motion.lastTime = now),
          (motion.pendingX -= stepX),
          (motion.pendingY -= stepY),
          J(A.current + stepX, j.current + stepY));
        if (Math.hypot(motion.pendingX, motion.pendingY) > 0.25) {
          motion.frame = requestAnimationFrame(stepWheelMotion);
        } else {
          ((motion.pendingX = 0), (motion.pendingY = 0));
          ((motion.frame = 0), (motion.lastTime = null));
        }
      },
      [J],
    ),
    stopWheelMotion = (0, c.useCallback)(() => {
      let motion = wheelMomentum.current;
      (cancelAnimationFrame(motion.frame),
        (motion.frame = 0),
        (motion.pendingX = 0),
        (motion.pendingY = 0),
        (motion.lastTime = null));
    }, []);
  (0, c.useEffect)(() => {
    if (!q) return;
    let e = Ae(q, He, A.current, j.current, n.width, n.height, M.current);
    X(e.x, e.y, M.current, 520);
  }, [x?.key, X, He, q?.width, q?.x, q?.y, n.height, n.width]);
  let startCruiseDeceleration = (0, c.useCallback)(
      (velocityX, velocityY) => {
        let speed = Math.hypot(velocityX, velocityY);
        if (speed < 0.5) return;
        Y();
        let startedAt = performance.now(),
          lastTime = startedAt,
          step = (now) => {
            let elapsed = Math.min(0.05, Math.max(0, (now - lastTime) / 1e3));
            lastTime = now;
            let progress = Math.min(1, (now - startedAt) / 1600),
              eased = progress * progress * (3 - 2 * progress),
              factor = 1 - eased;
            (J(
              A.current + velocityX * factor * elapsed,
              j.current + velocityY * factor * elapsed,
            ),
              progress < 1
                ? (P.current = requestAnimationFrame(step))
                : (P.current = 0));
          };
        P.current = requestAnimationFrame(step);
      },
      [J, Y],
    ),
    Z = (0, c.useCallback)((decelerate = !1) => {
      let { x, y } = cruiseVelocity.current;
      (cancelAnimationFrame(F.current),
        (F.current = 0),
        (nt.current = 0),
        (I.current = !1),
        Ee(!1),
        Le(!1),
        (cruiseVelocity.current = { x: 0, y: 0 })),
        decelerate &&
          !window.matchMedia(`(prefers-reduced-motion: reduce)`).matches &&
          startCruiseDeceleration(x, y);
    }, [startCruiseDeceleration]),
    yt = (0, c.useCallback)(() => {
      (cancelAnimationFrame(F.current),
        (nt.current = 0),
        (I.current = !0),
        Ee(!0),
        (cruiseVelocity.current = { x: 0, y: 0 }));
      let e = O.current || {},
        t = ye[e.wallpaperCruiseDirection],
        n = Number(e.filmrollSeed) || 1,
        r = Number.isFinite(t) ? t : -Math.PI / 2 + Ne(n) * Math.PI,
        i = r,
        o = 0,
        s = 0,
        c = Ce(Number(e.wallpaperCruiseSeconds) || 15, 10, 60) * 1e3,
        l = (e) => {
          if (!I.current) return;
          let u = nt.current || e,
            d = Math.min(0.05, Math.max(0, (e - u) / 1e3));
          if (
            ((nt.current = e),
            o || ((o = e), (s = e + c)),
            !Number.isFinite(t) && e >= s)
          ) {
            let t = Math.PI / 6 + (Ne(n ^ Math.floor(e / c)) * Math.PI * 4) / 3,
              a = Ne(n ^ Math.floor(e / 1e3)) < 0.5 ? -1 : 1;
            ((i = r + a * t), (s = e + c));
          }
          r += (i - r) * Math.min(1, d * 2.4);
          let ramp = Math.min(1, (e - o) / 1600),
            f = ramp * ramp * (3 - 2 * ramp),
            p = ee * a(O.current) * f,
            m = Math.cos(r) * p,
            h = Math.sin(r) * p;
          ((cruiseVelocity.current = { x: m, y: h }),
            J(A.current + m * d, j.current + h * d),
            (F.current = requestAnimationFrame(l)));
        };
      F.current = requestAnimationFrame(l);
    }, [J]),
    Q = (0, c.useCallback)(() => {
      (Le(!1), ze(!0), clearTimeout(at.current));
      I.current &&
        (at.current = setTimeout(() => {
          I.current && (Le(!0), ze(!1));
        }, m));
    }, []),
    $ = (0, c.useCallback)(() => {
      let e = E.current;
      if (!e) return [];
      let t = e.getBoundingClientRect(),
        n = Math.max(1, K.frameHeight + K.gap);
      return [...e.querySelectorAll(`.pw-filmroll-card`)]
        .filter((e) => {
          let n = e.getBoundingClientRect();
          return (
            n.bottom > t.top &&
            n.top < t.bottom &&
            n.right > t.left &&
            n.left < t.right
          );
        })
        .map((e) => {
          let r = e.getBoundingClientRect(),
            i = Math.max(0, r.left - t.left) + Math.max(0, r.top - t.top);
          return {
            card: e,
            key: e.dataset.cardKey || ``,
            delay: Math.round((i / n) * te),
          };
        });
    }, [K.frameHeight, K.gap]),
    bt = (0, c.useCallback)(() => {
      ((H.current = !1),
        (U.current = !1),
        (W.current = 0),
        (G.current &&= (cancelAnimationFrame(G.current), 0)));
      for (let e of B.current)
        try {
          e.cancel();
        } catch {}
      B.current = [];
    }, []),
    xt = (0, c.useCallback)((e, t, n = null) => {
      if (!e.length || t !== V.current || !H.current || L.current)
        return Promise.resolve();
      e = revealSchedule(e, n == null ? 900 : n);
      W.current += 1;
      let r = [];
      for (let { card: i, key: a, delay: o } of e) {
        if (!i.isConnected) continue;
        ot.current.add(a);
        let e = n == null ? o : Math.min(o, n),
          s = i.animate(
            [{ opacity: 0 }, { opacity: 0.36, offset: 0.42 }, { opacity: 1 }],
            { duration: g, delay: e, easing: `ease-out`, fill: `both` },
          ),
          c = i.animate(xe, {
            duration: h,
            delay: e,
            easing: `linear`,
            fill: `both`,
          });
        (r.push(s, c),
          B.current.push(s, c),
          Promise.allSettled([s.finished, c.finished])
            .then(() => {
              (i.isConnected &&
                t === V.current &&
                !L.current &&
                (i.style.removeProperty(`opacity`),
                i.style.removeProperty(`transform`)),
                (B.current = B.current.filter((e) => e !== s && e !== c)));
            })
            .catch(() => {}));
      }
      return Promise.allSettled(r.map((e) => e.finished))
        .then(() => {
          t === V.current &&
            ((W.current = Math.max(0, W.current - 1)),
            W.current === 0 && ((H.current = !1), (U.current = !1)));
        })
        .catch(() => {});
    }, []),
    St = (0, c.useCallback)(() => {
      if (!H.current || !U.current || L.current) return;
      let e = V.current;
      G.current && cancelAnimationFrame(G.current);
      let t = [],
        n = () => {
          if (e === V.current && H.current && !L.current) {
            t = $().filter(({ key: e }) => e && !ot.current.has(e));
            for (let { card: e, key: n } of t)
              (ot.current.add(n),
                (e.style.opacity = `0`),
                (e.style.transform = `translate3d(0, -${ne}px, 0) scale(0.88)`));
          }
        };
      (n(),
        (G.current = requestAnimationFrame(() => {
          G.current = requestAnimationFrame(() => {
            ((G.current = 0), n(), xt(t, e, 120));
          });
        })));
    }, [xt, $]),
    Ct = (0, c.useCallback)(() => {
      if (L.current)
        for (let { card: e, key: t } of $())
          t &&
            !st.current.has(t) &&
            (st.current.add(t), (e.style.opacity = `0`));
    }, [$]),
    wt = (0, c.useCallback)(
      async (e) => {
        let t = $(),
          n = window.matchMedia(`(prefers-reduced-motion: reduce)`).matches;
        if (!t.length || n) {
          (C(!1), T({ type: `photo-wall:reveal-start` }));
          return;
        }
        ((H.current = !0), (U.current = !1), (W.current = 0));
        for (let { key: e } of t) ot.current.add(e);
        for (let { card: e } of t)
          ((e.style.opacity = `0`),
            (e.style.transform = `translate3d(0, -${ne}px, 0) scale(0.88)`));
        if (
          (await waitForImages(
            t.map(({ card: e }) => e),
            { timeoutMs: 4000 },
          ),
          await new Promise((e) =>
            requestAnimationFrame(() => requestAnimationFrame(e)),
          ),
          e !== V.current)
        )
          return;
        let i = $(),
          a = new Set(i.map(({ card: e }) => e));
        for (let { card: e } of t)
          a.has(e) ||
            (e.style.removeProperty(`opacity`),
            e.style.removeProperty(`transform`));
        if (!i.length) (C(!1), T({ type: `photo-wall:reveal-start` }));
        else {
          (C(!0), T({ type: `photo-wall:reveal-start` }), (U.current = !0));
          for (let { key: e } of i) ot.current.add(e);
          xt(i, e)
            .then(() => {
              e === V.current && C(!1);
            })
            .catch(() => {});
        }
      },
      [xt, $],
    ),
    Tt = (0, c.useCallback)(() => {
      V.current += 1;
      let e = revealSchedule($(), 600),
        t = window.matchMedia(`(prefers-reduced-motion: reduce)`).matches,
        n = Ke.current?.querySelector(`.photo-wall-atmosphere`),
        r = () => T({ type: `photo-wall:exit-animation-complete` });
      if (!e.length || t) {
        (bt(), n && (n.style.opacity = `0`), requestAnimationFrame(r));
        return;
      }
      let i = e.map(({ card: e, delay: t }) => {
        let n = e.dataset.cardKey || ``,
          r = getComputedStyle(e);
        return {
          card: e,
          key: n,
          delay: t,
          opacity: Number(r.opacity),
          transform: r.transform,
        };
      });
      (bt(), (st.current = new Set(i.map(({ key: e }) => e).filter(Boolean))));
      let a = Math.max(...e.map(({ delay: e }) => e), 0),
        o = [],
        s = [];
      n &&
        o.push(
          n.animate([{ opacity: 1 }, { opacity: 0 }], {
            duration: 200,
            easing: `ease-in`,
            fill: `forwards`,
          }),
        );
      for (let e of i) {
        let t = a - e.delay;
        o.push(
          e.card.animate([{ opacity: e.opacity }, { opacity: 0 }], {
            duration: 200,
            delay: t,
            easing: `ease-in`,
            fill: `both`,
          }),
        );
        let n = Se.map((t, n) => ({
          ...t,
          transform: n === 0 ? e.transform : t.transform,
        }));
        s.push(
          e.card.animate(n, {
            duration: 200,
            delay: t,
            easing: `linear`,
            fill: `both`,
          }),
        );
      }
      Promise.allSettled([...o, ...s].map((e) => e.finished))
        .then(() => {
          (s.forEach((e) => {
            try {
              e.cancel();
            } catch {}
          }),
            r());
        })
        .catch(r);
    }, [bt, $]);
  ((ct.current = (0, c.useCallback)(() => {
    let e = V.current + 1;
    ((V.current = e),
      bt(),
      ot.current.clear(),
      st.current.clear(),
      (L.current = !1),
      (rt.current = !1),
      be(!1),
      C(!1),
      (R.current = null),
      ce(null),
      (A.current = 0),
      (j.current = 0),
      (Je.current = 0),
      (Ye.current = 0),
      (M.current = initialCameraZoom),
      (Xe.current = initialCameraZoom),
      (Ze.current = 0),
      (Qe.current = 0),
      ($e.current = initialCameraZoom),
      d(0),
      v(0),
      se(initialCameraZoom),
      J(0, 0, initialCameraZoom),
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          e === V.current && wt(e);
        });
      }));
  }, [J, bt, wt])),
    (lt.current = Tt),
    (0, c.useLayoutEffect)(() => {
      e && U.current && (L.current ? Ct() : St());
    }, [e, Ct, St, ht.frames.length, n.height, n.width]));
  let Et = (0, c.useCallback)(() => {
      ft.current += 1;
      for (let e of pt.current)
        try {
          e.cancel();
        } catch {}
      ((pt.current = []),
        mt.current?.remove(),
        (mt.current = null),
        D.current?.style.removeProperty(`visibility`),
        E.current?.style.removeProperty(`pointer-events`),
        Ge(``));
    }, []),
    Dt = (0, c.useCallback)(
      async (e, r = null) => {
        let i = E.current,
          a = D.current;
        if (!i || !a || !O.current) {
          t(e);
          return;
        }
        Et();
        let o = ft.current;
        (Ge(`flip`),
          Y(),
          Z(),
          (R.current = null),
          ce(null),
          (i.style.pointerEvents = `none`));
        let s = i.getBoundingClientRect(),
          c = r || ut.current || { x: n.width / 2, y: n.height / 2 },
          u = Math.max(1, K.frameHeight + K.gap),
          d = (e) => ({ x: e.left + e.width / 2, y: e.top + e.height / 2 }),
          f = (e) => {
            let t = d(e);
            return Math.min(he, (Math.hypot(t.x - c.x, t.y - c.y) / u) * me);
          },
          p = (e) => (d(e).x < c.x ? -1 : 1),
          ee = (e) =>
            e.bottom > s.top &&
            e.top < s.bottom &&
            e.right > s.left &&
            e.left < s.right,
          m = [];
        for (let e of i.querySelectorAll(`.pw-filmroll-card`)) {
          let t = e.getBoundingClientRect();
          if (!ee(t)) continue;
          let n = e.querySelector(`img`);
          m.push({
            index: m.length,
            x: t.left - s.left,
            y: t.top - s.top,
            width: t.width,
            height: t.height,
            src: n?.currentSrc || n?.src || ``,
            kind: e.dataset.itemKind || `photo`,
            delay: f(t),
            direction: p(t),
          });
        }
        let h = Array.isArray(e?.items) ? e.items : [],
          g = [],
          te = Oe({
            items: h,
            seed: e?.filmrollSeed,
            metrics: K,
            viewportWidth: n.width,
            viewportHeight: n.height,
            cameraX: A.current,
            cameraY: j.current,
            cameraZoom: M.current,
          }),
          _ = M.current;
        for (let e of te) {
          let t = s.left + A.current + e.x * _,
            n = s.top + j.current + e.y * _,
            r = {
              left: t,
              top: n,
              right: t + e.width * _,
              bottom: n + e.height * _,
              width: e.width * _,
              height: e.height * _,
            };
          ee(r) &&
            g.push({
              index: g.length,
              x: r.left - s.left,
              y: r.top - s.top,
              width: r.width,
              height: r.height,
              src: e.item.src || ``,
              kind: e.item.kind || `photo`,
              delay: f(r) + de,
              direction: p(r),
            });
        }
        let ne = !!(
            dt.current &&
            h.length > 0 &&
            h.every((e) => e.kind === `album`)
          ),
          re = ne ? dt.current.camera : { x: A.current, y: j.current };
        if (!m.length || !g.length) {
          (t(e), Et());
          return;
        }
        if (
          (await je([...m.map((e) => e.src), ...g.map((e) => e.src)]),
          o !== ft.current)
        )
          return;
        let v = document.createElement(`div`);
        ((v.className = `photo-wall-handoff-layer pw-filmroll-handoff-layer`),
          (v.dataset.wallHandoff = `flip`),
          v.setAttribute(`aria-hidden`, `true`));
        let y = (e, t) => {
          for (let n of e) {
            let e = document.createElement(`div`);
            ((e.className = `photo-wall-handoff-card is-${t} pw-filmroll-handoff-card`),
              (e.dataset.handoffPhase = t),
              (e.dataset.handoffIndex = String(n.index)),
              (e.style.left = `${n.x}px`),
              (e.style.top = `${n.y}px`),
              (e.style.width = `${n.width}px`),
              (e.style.height = `${n.height}px`),
              n.src && (e.style.backgroundImage = `url("${n.src}")`),
              t === `in` &&
                (e.style.transform = `perspective(${ge}px) rotateY(${-n.direction * 90}deg)`),
              v.append(e),
              (n.node = e));
          }
        };
        (y(m, `out`),
          y(g, `in`),
          i.append(v),
          (mt.current = v),
          (a.style.visibility = `hidden`));
        let ie = window.matchMedia(`(prefers-reduced-motion: reduce)`).matches,
          b = [];
        if (ie) {
          v.dataset.wallHandoff = `fade`;
          for (let e of m)
            b.push(
              e.node.animate([{ opacity: 1 }, { opacity: 0 }], {
                duration: pe,
                easing: `ease-out`,
                fill: `both`,
              }),
            );
          for (let e of g)
            b.push(
              e.node.animate([{ opacity: 0 }, { opacity: 1 }], {
                duration: pe,
                easing: `ease-out`,
                fill: `both`,
              }),
            );
        } else {
          for (let e of m)
            b.push(
              e.node.animate(
                [
                  { transform: `perspective(1400px) rotateY(0deg)` },
                  {
                    transform: `perspective(1400px) rotateY(${e.direction * 90}deg)`,
                  },
                ],
                { duration: de, delay: e.delay, easing: _e, fill: `both` },
              ),
            );
          for (let e of g)
            b.push(
              e.node.animate(
                [
                  {
                    transform: `perspective(${ge}px) rotateY(${-e.direction * 90}deg)`,
                  },
                  { transform: `perspective(${ge}px) rotateY(0deg)` },
                ],
                { duration: fe, delay: e.delay, easing: ve, fill: `both` },
              ),
            );
        }
        if (
          ((pt.current = b),
          await Promise.all(b.map((e) => e.finished.catch(() => {}))),
          o !== ft.current ||
            ((0, l.flushSync)(() => {
              (t(e), C(!1), be(!1));
            }),
            J(A.current, j.current),
            await new Promise((e) =>
              requestAnimationFrame(() => requestAnimationFrame(e)),
            ),
            o !== ft.current))
        )
          return;
        a.style.removeProperty(`visibility`);
        let ae = ie
          ? null
          : v.animate([{ opacity: 1 }, { opacity: 0 }], {
              duration: 90,
              easing: `ease-out`,
              fill: `both`,
            });
        if ((ae && (await ae.finished.catch(() => {})), o === ft.current)) {
          (v.remove(), mt.current === v && (mt.current = null));
          for (let e of b)
            try {
              e.cancel();
            } catch {}
          (pt.current === b && (pt.current = []),
            ne && ((dt.current = null), X(re.x, re.y)),
            (ut.current = null),
            i.style.removeProperty(`pointer-events`),
            Ge(``));
        }
      },
      [X, J, Et, K, Y, Z, n.height, n.width],
    );
  (0, c.useEffect)(() => {
    let e = (e) => {
      if (e.origin === window.location.origin && e.source === window.parent) {
        if (e.data?.type === `photo-wall:init`) {
          (Z(), (rt.current = !1));
          let n = e.data.payload || null;
          if (!O.current) {
            (t(n), ct.current?.());
            return;
          }
          let r = O.current?.items || [],
            i = n?.items || [];
          (r.length > 0 && r.every((e) => e.kind === `album`)) ===
          (i.length > 0 && i.every((e) => e.kind === `album`))
            ? t(n)
            : Dt(n, ut.current);
        } else if (e.data?.type === `photo-wall:exit-animation`) {
          if (L.current) return;
          ((L.current = !0),
            Z(),
            Y(),
            cancelAnimationFrame(F.current),
            ce(null),
            (R.current = null),
            be(!0),
            lt.current?.());
        }
      }
    };
    return (
      window.addEventListener(`message`, e),
      T({ type: `photo-wall:ready` }),
      () => window.removeEventListener(`message`, e)
    );
  }, [Y, Z, Dt]);
  let Ot = (0, c.useCallback)(() => {
      ((R.current = null), ce(null));
    }, []),
    kt = (0, c.useCallback)(() => {
      if (
        (it.current &&=
          (window.clearTimeout(z.current), (z.current = 0), !1)),
        I.current
      ) {
        (Z(), T({ type: `photo-wall:exit` }));
        return;
      }
      R.current
        ? Ot()
        : rt.current ||
          ((rt.current = !0),
          Y(),
          cancelAnimationFrame(F.current),
          T({ type: `photo-wall:back` }));
    }, [Ot, Y, Z]),
    At = (0, c.useCallback)(() => {
      !I.current && R.current && !it.current
        ? (Ot(),
          (it.current = !0),
          window.clearTimeout(z.current),
          (z.current = window.setTimeout(
            () => {
              ((z.current = 0), (it.current = !1), kt());
            },
            window.matchMedia(`(prefers-reduced-motion: reduce)`).matches
              ? 0
              : le,
          )))
        : kt();
    }, [Ot, kt]);
  ((0, c.useEffect)(() => {
    let e = (e) => {
      if (!e.repeat) {
        if ((e.ctrlKey || e.metaKey) && [`0`, `1`, `2`, `3`].includes(e.key))
          T({
            type: `photo-wall:window-shortcut`,
            key: e.key,
            ctrlKey: e.ctrlKey,
            metaKey: e.metaKey,
          });
        else if (e.key === `Escape`) (e.preventDefault(), kt());
        else if (
          !(I.current || R.current) &&
          [`ArrowLeft`, `ArrowRight`, `ArrowUp`, `ArrowDown`].includes(e.key)
        ) {
          e.preventDefault();
          let t =
              e.key === `ArrowLeft`
                ? k.current.width * 0.42
                : e.key === `ArrowRight`
                  ? -k.current.width * 0.42
                  : 0,
            n =
              e.key === `ArrowUp`
                ? k.current.height * 0.42
                : e.key === `ArrowDown`
                  ? -k.current.height * 0.42
                  : 0;
          X(A.current + t, j.current + n);
        }
      }
    };
    return (
      window.addEventListener(`keydown`, e),
      () => window.removeEventListener(`keydown`, e)
    );
  }, [X, kt]),
    (0, c.useLayoutEffect)(() => {
      J(A.current, j.current);
    }, [J, K.frameHeight, K.gap, K.tracks]));
  (0, c.useEffect)(() => {
    let e = (e) => {
      (Q(),
        setBackNear(
          e.clientX >= 0 && e.clientY >= 0 && e.clientX < 120 && e.clientY < 76,
        ),
        setWallpaperNear(
          e.clientX >= window.innerWidth - 120 && e.clientY < 96,
        ));
    };
    return (
      window.addEventListener(`pointermove`, e, { passive: !0 }),
      () => window.removeEventListener(`pointermove`, e)
    );
  }, [Q]);
  let commitFocus = (0, c.useCallback)(
      (targetFrame) => {
        let world = D.current;
        if (world) {
          (clearTimeout(cameraGapTimer.current),
            (cameraGapTimer.current = 0),
            world.removeAttribute(`data-camera-gap-adjusting`),
            world.setAttribute(`data-focus-motion`, `true`),
            clearTimeout(focusMotionTimer),
            (focusMotionTimer = window.setTimeout(() => {
              ((focusMotionTimer = 0),
                world.removeAttribute(`data-focus-motion`));
            }, 700)),
            world.offsetWidth);
        }
        (Y(), (R.current = targetFrame), ce(targetFrame));
      },
      [Y],
    ),
    toggleFocusMode = (0, c.useCallback)(() => {
      let mode = He === se ? `minimal` : `center`;
      Ue(mode);
      try {
        localStorage.setItem(ce, mode);
      } catch {}
    }, [He]),
    jt = (0, c.useCallback)(
      (e, t) => {
        if ((t.stopPropagation(), N.current || I.current || ue)) return;
        stopWheelMotion();
        if (e.item.kind === `album`) {
          T({ type: `photo-wall:navigate`, albumId: Number(e.item.albumId) });
          return;
        }
        let targetFrame = R.current?.key === e.key ? null : e;
        let focusToken = ++focusPreparationSequence;
        if (!targetFrame) {
          commitFocus(null);
          return;
        }
        let focusRect = Pe(targetFrame, K, k.current.width);
        if (!focusRect) {
          commitFocus(targetFrame);
          return;
        }
        let cameraZoom = M.current,
          cameraX = A.current,
          cameraY = j.current,
          previewUrls = Fe(_t, focusRect, targetFrame.key)
            .filter(
              (frame) =>
                frame.lane >= focusRect.startLane &&
                frame.lane <= focusRect.endLane &&
                frame.x * cameraZoom + cameraX + frame.width * cameraZoom >
                  -24 &&
                frame.y * cameraZoom +
                  cameraY +
                  frame.height * cameraZoom >
                  -24 &&
                frame.x * cameraZoom + cameraX < k.current.width - 24 &&
                frame.y * cameraZoom + cameraY < k.current.height - 24,
            )
            .map((frame) => s(frame.item.src));
        previewUrls.push(s(targetFrame.item.src), targetFrame.item.src);
        let warmUrls = [...new Set(previewUrls)];
        Promise.race([
          Promise.all(warmUrls.map((url) => warmFilmrollImage(url))),
          new Promise((e) => window.setTimeout(e, 240)),
        ]).then(() => {
          if (focusToken !== focusPreparationSequence) return;
          commitFocus(targetFrame);
        });
      },
      [ue, commitFocus, K, _t, stopWheelMotion],
    ),
    Mt = (e) => {
      T({
        type: `photo-wall:window-move-start`,
        screenX: e.screenX,
        screenY: e.screenY,
      });
    },
    Nt = (e) => {
      e.button === 0 &&
        (stopWheelMotion(),
        Q(),
        (et.current = e.pointerId),
        (e.ctrlKey || e.metaKey) && !I.current
          ? (E.current?.setPointerCapture?.(e.pointerId),
            (tt.current = { pointerId: e.pointerId, mode: `window` }),
            Mt(e))
          : I.current ||
            R.current ||
            (Y(),
            cancelAnimationFrame(F.current),
            (tt.current = {
              pointerId: e.pointerId,
              mode: `camera`,
              startX: e.clientX,
              startY: e.clientY,
              lastX: e.clientX,
              lastY: e.clientY,
              lastTime: performance.now(),
              velocityX: 0,
              velocityY: 0,
            }),
            (N.current = !1)));
    },
    Pt = (e) => {
      Q();
      let t = tt.current;
      if (!t || t.pointerId !== e.pointerId) return;
      if (t.mode === `window`) {
        T({
          type: `photo-wall:window-move`,
          screenX: e.screenX,
          screenY: e.screenY,
        });
        return;
      }
      let n = performance.now(),
        r = e.clientX - t.lastX,
        i = e.clientY - t.lastY;
      if (Math.hypot(e.clientX - t.startX, e.clientY - t.startY) > p) {
        if (!N.current)
          try {
            E.current?.setPointerCapture?.(e.pointerId);
          } catch {}
        N.current = !0;
      }
      let a = Math.max(1, n - t.lastTime);
      ((t.velocityX = (r / a) * 1e3),
        (t.velocityY = (i / a) * 1e3),
        (t.lastX = e.clientX),
        (t.lastY = e.clientY),
        (t.lastTime = n),
        J(A.current + r, j.current + i));
    },
    Ft = (e) => {
      let t = tt.current;
      if (!t || t.pointerId !== e.pointerId) return;
      tt.current = null;
      try {
        E.current?.releasePointerCapture?.(e.pointerId);
      } catch {}
      if (t.mode === `window`) {
        T({ type: `photo-wall:window-move-end` });
        return;
      }
      performance.now() - t.lastTime > 90 &&
        ((t.velocityX = 0), (t.velocityY = 0));
      let n = Ce(t.velocityX, -4e3, 4e3),
        r = Ce(t.velocityY, -4e3, 4e3);
      if (
        Math.hypot(n, r) < 40 ||
        window.matchMedia(`(prefers-reduced-motion: reduce)`).matches
      ) {
        N.current = !1;
        return;
      }
      startCameraInertia(n, r, () => {
        N.current = !1;
      });
    };
  (0, c.useEffect)(() => {
    let e = E.current;
    if (!e) return;
    let t = (t) => {
      if ((t.preventDefault(), I.current || R.current)) return;
      let n = e.getBoundingClientRect();
      if (t.ctrlKey || t.metaKey) {
        stopWheelMotion();
        let e = P.current ? Xe.current : M.current,
          targetZoom = Ce(e * Math.exp(-t.deltaY * oe), b, ae),
          anchorX = n.width / 2,
          anchorY = n.height / 2,
          a = (anchorX - A.current) / M.current,
          o = (anchorY - j.current) / M.current;
        (X(
          anchorX - a * targetZoom,
          anchorY - o * targetZoom,
          targetZoom,
        ),
          Q());
        return;
      }
      let a = t.shiftKey && !t.deltaX,
        deltaScale =
          t.deltaMode === 1 ? 16 : t.deltaMode === 2 ? n.height : 1,
        o = (a ? t.deltaY : t.deltaX) * deltaScale,
        s = (a ? 0 : t.deltaY) * deltaScale,
        motion = wheelMomentum.current;
      (Y(),
        (motion.pendingX -= o),
        (motion.pendingY -= s),
        motion.frame ||
          ((motion.lastTime = null),
          (motion.frame = requestAnimationFrame(stepWheelMotion))),
        Q());
    };
    return (
      e.addEventListener(`wheel`, t, { passive: !1 }),
      () => e.removeEventListener(`wheel`, t)
    );
  }, [X, e, Y, Q, stopWheelMotion, stepWheelMotion]);
  let It = () => {
    I.current ? Z(!0) : (Ot(), Y(), yt(), Q());
  };
  if (!e)
    return (0, u.jsx)(`main`, {
      className: `photo-wall-loading`,
      "aria-hidden": `true`,
    });
  if (!ht.frames.length)
    return (0, u.jsx)(`main`, {
      className: `photo-wall-empty`,
      "aria-label": `没有可显示的照片`,
      children: (0, u.jsx)(`span`, { children: `没有可显示的照片` }),
    });
  let backVisible = e.showPhotoWallControls ? true : backNear && Re,
    wallpaperVisible = e.showPhotoWallControls ? true : wallpaperNear && Re;
  return (0, u.jsxs)(`main`, {
    ref: Ke,
    className: `photo-wall-app pw-filmroll-app${S ? ` is-revealing` : ``}${ue ? ` is-exiting` : ``}${w ? ` is-wallpaper-mode` : ``}${Me ? ` is-wallpaper-idle` : ``}${x ? ` has-focused-card` : ``}`,
    "data-filmroll-tracks": K.tracks,
    "data-filmroll-gap": K.gap,
    children: [
      (0, u.jsx)(`div`, {
        className: `photo-wall-atmosphere`,
        "aria-hidden": `true`,
        children: e.items
          .slice(0, 4)
          .map((e, t) =>
            (0, u.jsx)(
              `img`,
              { src: e.src, alt: ``, draggable: `false`, decoding: `async` },
              `${e.id}-${t}`,
            ),
          ),
      }),
      (0, u.jsxs)(`div`, {
        ref: E,
        className: `photo-wall-field pw-filmroll-field`,
        onPointerDown: Nt,
        onPointerMove: Pt,
        onPointerUp: Ft,
        onPointerCancel: Ft,
        onPointerLeave: Q,
        onClick: (e) => {
          e.target === e.currentTarget && R.current && Ot();
        },
        children: [
          (0, u.jsx)(`div`, {
            ref: D,
            className: `pw-filmroll-world`,
            "data-camera-zoom": y.toFixed(4),
            style: {
              transform: `translate3d(${i.toFixed(3)}px, ${f.toFixed(3)}px, 0) scale(${y.toFixed(4)})`,
            },
            children: [
              focusBackdrop.map((e) =>
                (0, u.jsx)(
                  Ie,
                  {
                    frame: e,
                    lane: e.lane,
                    entering: !1,
                    focused: !1,
                    interactive: !1,
                    backdrop: !0,
                  },
                  `focus-anchor:${e.key}`,
                ),
              ),
              vt.map((e) =>
                (0, u.jsx)(
                  Ie,
                  {
                    frame: e,
                    lane: e.lane,
                    entering: S && !ue,
                    focused: !!e.focused,
                    interactive: !w && !ue,
                    onSelect: jt,
                  },
                  e.key,
                ),
              ),
            ],
          }),
        ],
      }),
      (0, u.jsx)(`div`, {
        className: `photo-wall-back-zone${backVisible ? ` is-visible` : ``}`,
        children: (0, u.jsx)(`button`, {
          type: `button`,
          className: `photo-wall-back${backVisible ? ` is-visible` : ``}`,
          "aria-label": w
            ? `退出壁纸模式`
            : x
              ? `收起聚焦照片并退出横向胶卷`
              : `退出横向胶卷`,
          onMouseEnter: Q,
          onClick: At,
          children: (0, u.jsx)(`svg`, {
            viewBox: `0 0 16 24`,
            fill: `none`,
            stroke: `currentColor`,
            strokeWidth: `2.2`,
            strokeLinecap: `round`,
            strokeLinejoin: `round`,
            "aria-hidden": `true`,
            children: (0, u.jsx)(`path`, { d: `m12 3.5-8 8.5 8 8.5` }),
          }),
        }),
      }),
      (0, u.jsx)(`div`, {
        className: `photo-wall-wallpaper-zone${wallpaperVisible ? ` is-visible` : ``}`,
        children: [
          (0, u.jsx)(`button`, {
            type: `button`,
            className: `photo-wall-tools-button photo-wall-focus-button${wallpaperVisible ? ` is-visible` : ``}`,
            "data-focus-mode": He,
            disabled: w,
            tabIndex: w ? -1 : 0,
            "aria-label":
              He === se
                ? `当前居中聚焦，切换为让位聚焦`
                : `当前让位聚焦，切换为居中聚焦`,
            onMouseEnter: Q,
            onClick: toggleFocusMode,
            children:
              He === se
                ? (0, u.jsxs)(`svg`, {
                    viewBox: `0 0 22 22`,
                    fill: `none`,
                    stroke: `currentColor`,
                    strokeWidth: `1.5`,
                    "aria-hidden": `true`,
                    children: [
                      (0, u.jsx)(`rect`, {
                        x: `3`,
                        y: `3`,
                        width: `16`,
                        height: `16`,
                        rx: `3`,
                      }),
                      (0, u.jsx)(`rect`, {
                        x: `8`,
                        y: `8`,
                        width: `6`,
                        height: `6`,
                        rx: `1.3`,
                      }),
                      (0, u.jsx)(`path`, {
                        d: `M11 1.8v2M11 18.2v2M1.8 11h2M18.2 11h2`,
                      }),
                    ],
                  })
                : (0, u.jsxs)(`svg`, {
                    viewBox: `0 0 22 22`,
                    fill: `none`,
                    stroke: `currentColor`,
                    strokeWidth: `1.5`,
                    "aria-hidden": `true`,
                    children: [
                      (0, u.jsx)(`path`, {
                        d: `M4 7V4h3M15 4h3v3M18 15v3h-3M7 18H4v-3`,
                      }),
                      (0, u.jsx)(`rect`, {
                        x: `8`,
                        y: `8`,
                        width: `6`,
                        height: `6`,
                        rx: `1.3`,
                      }),
                    ],
                  }),
          }),
          (0, u.jsx)(`button`, {
            type: `button`,
            className: `photo-wall-tools-button photo-wall-wallpaper-button${wallpaperVisible ? ` is-visible` : ``}`,
            "data-wallpaper-mode": String(w),
            "aria-label": w ? `关闭壁纸模式` : `打开壁纸模式`,
            "aria-pressed": w,
            onMouseEnter: Q,
            onClick: It,
            children: (0, u.jsx)(`svg`, {
              viewBox: `0 0 22 22`,
              "aria-hidden": `true`,
              children: (0, u.jsx)(`path`, {
                d: `M3.5 6.1 6.5 16l4.5-7.8 4.5 7.8 3-9.9`,
              }),
            }),
          }),
        ],
      }),
    ],
  });
}
export { Le as default };
