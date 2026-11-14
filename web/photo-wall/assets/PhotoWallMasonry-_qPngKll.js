import { i as e, r as t, t as n } from "./index-eYugSr6J.js";
import { gapCompensation } from "./layoutConstants-nNzqxgbJ.js";
import {
  a as r,
  i,
  n as a,
  o,
  r as s,
  s as revealSchedule,
  t as c,
} from "./wallTransition-D4nOEmCV.js";
import { t as l } from "./wallpaperSpeed-DyUTxP__.js";
import { n as u, t as d } from "./previewSources-C0PeInwa.js";
var f = e(t()),
  p = n(),
  m = 6,
  h = m,
  ee = 195,
  g = 2,
  te = 10,
  ne = 2,
  re = 14,
  ie = 680,
  ae = 0.7,
  _ = 1.8,
  oe = 0.0018,
  v = 56,
  se = 4,
  ce = 140,
  le = 1600,
  ue = 1600,
  de = 420,
  fe = Math.PI / 6,
  pe = (Math.PI * 3) / 2,
  me = Math.PI / 6,
  he = 280,
  ge = 2e3,
  _e = new Set([`0`, `1`, `2`, `3`]),
  ve = 0.9,
  ye = 520,
  be = 650,
  xe = `cubic-bezier(0.4, 0, 0.2, 1)`,
  y = 180,
  Se = 1200,
  Ce = 150,
  we = 210,
  Te = 18,
  Ee = 420,
  De = 1400,
  initialCameraZoom = 1.12,
  Oe = `cubic-bezier(0.55, 0, 0.9, 0.45)`,
  ke = `cubic-bezier(0.2, 0.7, 0.25, 1)`,
  Ae = Object.freeze({
    up: { x: 0, y: -1 },
    down: { x: 0, y: 1 },
    left: { x: -1, y: 0 },
    right: { x: 1, y: 0 },
    "up-right": { x: Math.SQRT1_2, y: -Math.SQRT1_2 },
    "down-right": { x: Math.SQRT1_2, y: Math.SQRT1_2 },
    "down-left": { x: -Math.SQRT1_2, y: Math.SQRT1_2 },
    "up-left": { x: -Math.SQRT1_2, y: -Math.SQRT1_2 },
  }),
  je = (e) => {
    let t = window.devicePixelRatio || 1;
    return Math.round(e * t) / t;
  };
function b(e) {
  let t = e >>> 0;
  return (
    (t ^= t >>> 16),
    (t = Math.imul(t, 2146121005)),
    (t ^= t >>> 15),
    (t = Math.imul(t, 2221713035)),
    (t ^= t >>> 16),
    t >>> 0
  );
}
function Me(e, t, n, r = 0) {
  return (
    b(
      (e || 1) ^
        b((t + 1) * 2654435761) ^
        b((n + 2147483648) * 2246822507) ^
        b(r * 668265261),
    ) / 4294967296
  );
}
function Ne(e) {
  let t = Number(e?.aspect);
  return Number.isFinite(t) && t > 0.02 ? Math.min(32, Math.max(1 / 32, t)) : 1;
}
function x(e) {
  let t = Math.max(1, e - 12),
    n = Math.max(g, Math.min(te, Math.floor((t + m) / 201)));
  return {
    columns: n,
    columnWidth: Math.max(1, (t - m * (n - 1)) / n),
    worldWidth: t + 12,
  };
}
function Pe(e, t, n, r) {
  return {
    column: e,
    columnWidth: t,
    items: n,
    seed: r,
    down: [],
    up: [],
    nextOrdinal: 0,
    previousOrdinal: -1,
    downEnd: 0,
    upStart: 0,
  };
}
function S(e, t, n) {
  return e.y <= n + m && e.y + e.height >= t - m;
}
function Fe(e, t, n, r) {
  let i = new Set();
  for (let e of [...t.up, ...t.down]) S(e, n, r) && i.add(String(e.item.id));
  for (let a of [-1, 1]) {
    let o = e.streams.get(t.column + a);
    if (o)
      for (let e of [...o.up, ...o.down])
        S(e, n, r) && i.add(String(e.item.id));
  }
  return i;
}
function Ie(e, t, n, r) {
  let i = null,
    a = e.items.length > 1 ? 28 : 1;
  for (let o = 0; o < a; o += 1) {
    let a = Math.floor(Me(e.seed, e.column, t, o) * e.items.length),
      s = e.items[a],
      c = Math.max(12, e.columnWidth / Ne(s)),
      l =
        r === `down`
          ? e.downEnd === 0
            ? 0
            : e.downEnd + m
          : e.upStart === 0
            ? -c
            : e.upStart - m - c,
      u = {
        key: `${e.column}:${t}`,
        column: e.column,
        ordinal: t,
        item: s,
        itemIndex: a,
        width: e.columnWidth,
        height: c,
        y: l,
      };
    if (((i = u), !Fe(n, e, l, l + c).has(String(s.id)))) return u;
  }
  return i;
}
function Le(e, t, n) {
  let r = 0;
  for (; e.downEnd < t && r < 220;) {
    let t = Ie(e, e.nextOrdinal, n, `down`);
    (e.down.push(t),
      (e.downEnd = t.y + t.height),
      (e.nextOrdinal += 1),
      (r += 1));
  }
}
function Re(e, t, n) {
  let r = 0;
  for (; e.upStart > t && r < 220;) {
    let t = Ie(e, e.previousOrdinal, n, `up`);
    (e.up.push(t), (e.upStart = t.y), --e.previousOrdinal, (r += 1));
  }
}
function ze(e, t, n) {
  let { columns: r, columnWidth: i, worldWidth: a } = x(e),
    o = new Map();
  for (let e = 0; e < r; e += 1) o.set(e, Pe(e, i, t, n));
  return {
    streams: o,
    columns: r,
    columnWidth: i,
    worldWidth: a,
    seed: n,
    items: t,
  };
}
function Be(e, t, n) {
  if (!e) return;
  let r = e.columnWidth + m,
    i = Math.floor((t - h) / r) - 1,
    a = Math.ceil((n + h) / r) + 1;
  for (let t = i; t <= a; t += 1)
    e.streams.has(t) || e.streams.set(t, Pe(t, e.columnWidth, e.items, e.seed));
  for (let t of e.streams.keys())
    (t < i - 2 || t > a + 2) && e.streams.delete(t);
}
function Ve(e, t, n, r, i) {
  let a = Math.max(1, n - t),
    o = t - a * ne,
    s = n + a * ne,
    c = Math.max(28, (i - r) * ne);
  Be(e, r - c, i + c);
  for (let t of e.streams.values()) (Le(t, s, e), Re(t, o, e));
}
function He(e, t, n, r, i) {
  if (!e) return [];
  let a = [];
  Be(e, r, i);
  for (let o of e.streams.values()) {
    let s = o.column * (e.columnWidth + m);
    if (!(s > i + m || s + e.columnWidth < r - m)) {
      for (let e of o.down) e.y <= n && e.y + e.height >= t && a.push(e);
      for (let e of o.up) e.y <= n && e.y + e.height >= t && a.push(e);
    }
  }
  if (a.length <= ie) return a;
  let o = (t + n) / 2;
  return a
    .sort(
      (t, n) =>
        Math.hypot(
          t.column * (e.columnWidth + m) + e.columnWidth / 2 - (r + i) / 2,
          t.y + t.height / 2 - o,
        ) -
        Math.hypot(
          n.column * (e.columnWidth + m) + e.columnWidth / 2 - (r + i) / 2,
          n.y + n.height / 2 - o,
        ),
    )
    .slice(0, ie);
}
async function Ue(e) {
  let t = [...new Set((e || []).filter(Boolean))].slice(0, y);
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
        window.setTimeout(e, Se);
      }),
    ]));
}
function We(e) {
  return e < 0.5 ? 4 * e ** 3 : 1 - (-2 * e + 2) ** 3 / 2;
}
function C(e) {
  window.parent.postMessage(e, window.location.origin);
}
function Ge(e) {
  let t = Number(e?.focusSpan);
  return t === 2 || t === 3
    ? t
    : e?.ratioKey === `9:16` || e?.ratioKey === `2:3`
      ? 2
      : 3;
}
function Ke(e, t, n) {
  if (!e || !t) return null;
  let r = Ge(e.item),
    i = r * t.columnWidth + (r - 1) * m,
    a = i / Ne(e.item),
    o = Math.max(t.columnWidth, Math.min(n * ve, a)),
    s = r === 3 ? e.column - 1 : e.column;
  return {
    x: s * (t.columnWidth + m),
    y: e.y + e.height / 2 - o / 2,
    width: i,
    height: o,
    span: r,
    startColumn: s,
  };
}
function qe(e, t, n) {
  if (!e || !t) return { rects: new Map(), focus: null };
  let r = Ke(t, e, n);
  if (!r) return { rects: new Map(), focus: null };
  let i = new Map(),
    a = r.y + r.height / 2;
  for (let n = r.startColumn; n < r.startColumn + r.span; n += 1) {
    let o = e.streams.get(n);
    if (!o) continue;
    let s = [...o.up, ...o.down]
        .filter((e) => e.key !== t.key)
        .sort((e, t) => e.y - t.y),
      c = s.filter((e) => e.y + e.height / 2 < a),
      l = s.filter((e) => e.y + e.height / 2 >= a),
      u = 0,
      d = 0;
    if (c.length) {
      let e = c[c.length - 1];
      u = Math.min(0, r.y - m - (e.y + e.height));
    }
    if (l.length) {
      let e = l[0];
      d = Math.max(0, r.y + r.height + m - e.y);
    }
    for (let t of c)
      i.set(t.key, {
        x: t.column * (e.columnWidth + m),
        y: t.y + u,
        width: t.width,
        height: t.height,
      });
    for (let t of l)
      i.set(t.key, {
        x: t.column * (e.columnWidth + m),
        y: t.y + d,
        width: t.width,
        height: t.height,
      });
  }
  return (
    i.set(t.key, { x: r.x, y: r.y, width: r.width, height: r.height }),
    { rects: i, focus: r }
  );
}
function Je({
  card: e,
  revealDelay: t,
  entering: n,
  focused: r,
  onSelect: i,
  interactive: a,
  motionDuration: o,
  backdrop: b = !1,
}) {
  let [s, c] = (0, f.useState)(``),
    l = e.item.src,
    u = d(l),
    h = r && e.item.large && e.item.large !== l ? e.item.large : ``,
    ee = r && s === h ? h : ``,
    g = {
      objectPosition:
        e.item.cropAnchor === `bottom` ? `center bottom` : `center`,
    };
  return (
    (0, f.useEffect)(() => {
      if (!r || !h) {
        c(``);
        return;
      }
      if (o <= 0) {
        c(h);
        return;
      }
      let e = window.setTimeout(() => {
        c(h);
      }, o);
      return () => window.clearTimeout(e);
    }, [h, r, o]),
    (0, p.jsxs)(`article`, {
      className: `pw-masonry-card${n ? ` is-entering` : ``}${r ? ` is-focused` : ``}${b ? ` is-focus-anchor` : ``}${e.item.kind === `album` ? ` is-album` : ``}`,
      "data-card-key": e.key,
      "data-item-id": e.item.id,
      "data-item-index": e.itemIndex,
      "data-item-kind": e.item.kind || `photo`,
      "data-focus-span": Ge(e.item),
      "aria-hidden": b ? `true` : undefined,
      style: {
        left: `calc(${e.x ?? e.column * (e.width + m)}px - var(--pw-camera-gap-extra, 0px))`,
        top: `calc(${e.y}px - var(--pw-camera-gap-extra, 0px))`,
        width: `calc(${e.width}px + var(--pw-camera-gap-extra, 0px) + var(--pw-camera-gap-extra, 0px))`,
        height: `calc(${e.height}px + var(--pw-camera-gap-extra, 0px) + var(--pw-camera-gap-extra, 0px))`,
        zIndex: r ? 20 : b ? 0 : 1,
      },
      onClick: (t) => {
        !b && a && i?.(e, t);
      },
      children: [
        (0, p.jsx)(
          `img`,
          {
            className: `pw-masonry-card-base`,
            src: l,
            alt: ``,
            draggable: `false`,
            decoding: `async`,
            style: g,
            loading: t < 300 ? `eager` : `lazy`,
            fetchPriority: `low`,
            onLoad: (e) => {
              (e.currentTarget.classList.remove(`is-failed`),
                e.currentTarget.classList.add(`is-loaded`));
            },
            onError: (e) => {
              (e.currentTarget.classList.remove(`is-loaded`),
                e.currentTarget.classList.add(`is-failed`));
            },
          },
          l,
        ),
        (0, p.jsx)(`img`, {
          className: `pw-masonry-card-preview`,
          src: u,
          alt: ``,
          "aria-hidden": `true`,
          draggable: `false`,
          decoding: `async`,
          style: g,
          loading: `eager`,
          fetchPriority: `high`,
          onLoad: (e) => {
            (e.currentTarget.classList.remove(`is-failed`),
              e.currentTarget.classList.add(`is-loaded`));
          },
          onError: (e) => e.currentTarget.classList.add(`is-failed`),
        }),
        ee &&
          (0, p.jsx)(
            `img`,
            {
              className: `pw-masonry-card-detail`,
              src: ee,
              alt: ``,
              draggable: `false`,
              decoding: `async`,
              loading: `eager`,
              style: g,
              onLoad: (e) => {
                let t = e.currentTarget,
                  n = () => {
                    t.isConnected &&
                      requestAnimationFrame(() => t.classList.add(`is-ready`));
                  };
                typeof t.decode == `function` ? t.decode().then(n, n) : n();
              },
              onError: (e) => e.currentTarget.remove(),
            },
            ee,
          ),
      ],
    })
  );
}
function Ye() {
  let [e, t] = (0, f.useState)(null),
    [n, h] = (0, f.useState)(() => ({
      width: Math.max(1, window.innerWidth),
      height: Math.max(1, window.innerHeight),
    })),
    [g, te] = (0, f.useState)(0),
    [ne, ve] = (0, f.useState)(!0),
    [y, Se] = (0, f.useState)(!1),
    [b, Ne] = (0, f.useState)({ current: ``, previous: ``, version: 0 }),
    [x, Pe] = (0, f.useState)(!1),
    [S, Fe] = (0, f.useState)(!1),
    [Ie, Le] = (0, f.useState)(!0),
    [Re, Be] = (0, f.useState)(!0),
    [Ge, Ye] = (0, f.useState)(!0),
    [w, Xe] = (0, f.useState)(() => {
      try {
        return localStorage.getItem(`photo-wall-focus-mode`) === `center`
          ? `center`
          : `minimal`;
      } catch {
        return `minimal`;
      }
    }),
    [T, Ze] = (0, f.useState)(null),
    [Qe, $e] = (0, f.useState)(``),
    [E, et] = (0, f.useState)(!1),
    D = (0, f.useRef)(null),
    O = (0, f.useRef)(null),
    k = (0, f.useRef)(null),
    A = (0, f.useRef)({
      x: 0,
      y: 0,
      zoom: initialCameraZoom,
      ready: !1,
    }),
    tt = (0, f.useRef)(null),
    focusTransitionToken = (0, f.useRef)(0),
    focusCloseTimer = (0, f.useRef)(0),
    focusMotionLayoutFrozen = (0, f.useRef)(!1),
    nt = (0, f.useRef)({
      frame: 0,
      lastTime: 0,
      targetZoom: initialCameraZoom,
      clientX: 0,
      clientY: 0,
    }),
    j = (0, f.useRef)({
      top: 0,
      bottom: Math.max(1, window.innerHeight),
      left: 0,
      right: Math.max(1, window.innerWidth),
      lastRefreshX: 0,
      lastRefreshY: 0,
      lastRefreshZoom: 1,
      frame: 0,
    }),
    rt = (0, f.useRef)(null),
    it = (0, f.useRef)(null),
    M = (0, f.useRef)({ frame: 0, velocityX: 0, velocityY: 0, lastTime: 0 }),
    N = (0, f.useRef)({ pendingX: 0, pendingY: 0, frame: 0 }),
    at = (0, f.useRef)(!1),
    P = (0, f.useRef)(null),
    ot = (0, f.useRef)(0),
    st = (0, f.useRef)(!1),
    ct = (0, f.useRef)(null),
    lt = (0, f.useRef)([]),
    F = (0, f.useRef)(null),
    I = (0, f.useRef)(!1),
    ut = (0, f.useRef)(!1),
    dt = (0, f.useRef)(0),
    ft = (0, f.useRef)(!1),
    pt = (0, f.useRef)(!0),
    L = (0, f.useRef)([]),
    mt = (0, f.useRef)(new Map()),
    ht = (0, f.useRef)(new Set()),
    R = (0, f.useRef)(!1),
    z = (0, f.useRef)(!1),
    gt = (0, f.useRef)(0),
    B = (0, f.useRef)(0),
    _t = (0, f.useRef)(new Set()),
    vt = (0, f.useRef)(0),
    V = (0, f.useRef)(!1),
    H = (0, f.useRef)(null),
    yt = (0, f.useRef)(0),
    bt = (0, f.useRef)(null),
    xt = (0, f.useRef)([]),
    U = (0, f.useMemo)(() => e?.items || [], [e]),
    St = e?.showPhotoWallControls !== !1,
    Ct = St || Ie,
    wt = St || Re,
    Tt = !x && (St || Ge),
    W = (0, f.useMemo)(
      () => window.matchMedia(`(prefers-reduced-motion: reduce)`).matches,
      [],
    );
  ((H.current = e),
    (I.current = x),
    (ut.current = S),
    (P.current = T),
    (0, f.useEffect)(
      () => () => {
        (window.clearTimeout(ot.current), (st.current = !1));
      },
      [],
    ));
  let Et = U[0]?.large || U[0]?.src || ``;
  ((0, f.useEffect)(() => {
    u(U.map((e) => d(e.src)));
  }, [U]),
    (0, f.useEffect)(() => {
      if (Et)
        return (
          Ne((e) =>
            e.current === Et
              ? e
              : { current: Et, previous: e.current, version: e.version + 1 },
          ),
          clearTimeout(vt.current),
          (vt.current = window.setTimeout(() => {
            Ne((e) => (e.previous ? { ...e, previous: `` } : e));
          }, 280)),
          () => clearTimeout(vt.current)
        );
    }, [Et]));
  let Dt = (0, f.useCallback)(
      (e = !1) => {
        let t = k.current;
        if (!t) return;
        let r = A.current.x,
          i = A.current.y,
          a = Math.max(0.01, A.current.zoom);
        (!e &&
          Math.abs(a - j.current.lastRefreshZoom) < 0.001 &&
          Math.abs(i - j.current.lastRefreshY) < re &&
          Math.abs(r - j.current.lastRefreshX) < re) ||
          (j.current.frame && cancelAnimationFrame(j.current.frame),
          (j.current.frame = requestAnimationFrame(() => {
            j.current.frame = 0;
            let e = Math.max(1, D.current?.clientHeight || n.height),
              o = Math.max(1, D.current?.clientWidth || n.width),
              s = -r / a,
              c = (o - r) / a,
              l = i / a,
              u = (i + e) / a;
            (Ve(t, l, u, s, c),
              (j.current.top = l),
              (j.current.bottom = u),
              (j.current.left = s),
              (j.current.right = c),
              (j.current.lastRefreshX = r),
              (j.current.lastRefreshY = i),
              (j.current.lastRefreshZoom = a),
              focusMotionLayoutFrozen.current || te((e) => e + 1));
          })));
      },
      [n.height, n.width],
    ),
    G = (0, f.useCallback)(
      (e = !0, smooth = !1) => {
        let t = O.current;
        if (!t) return;
        let n = smooth ? A.current.x : je(A.current.x),
          r = smooth ? A.current.y : je(A.current.y),
          i = Math.max(0.01, A.current.zoom);
        ((t.style.transform = `translate3d(${n}px, ${-r}px, 0) scale(${i})`),
          t.style.setProperty(
            "--pw-camera-gap-extra",
            `${gapCompensation(m, initialCameraZoom, i).toFixed(3)}px`,
          ),
          (t.dataset.cameraX = String(n)),
          (t.dataset.cameraY = String(r)),
          (t.dataset.cameraZoom = String(i.toFixed(4))),
          e && Dt());
      },
      [Dt],
    ),
    K = (0, f.useCallback)(() => {
      (N.current.frame && cancelAnimationFrame(N.current.frame),
        (N.current.frame = 0),
        (N.current.pendingX = 0),
        (N.current.pendingY = 0));
    }, []),
    q = (0, f.useCallback)(() => {
      (M.current.frame && cancelAnimationFrame(M.current.frame),
        (M.current.frame = 0),
        (M.current.velocityX = 0),
        (M.current.velocityY = 0),
        (M.current.lastTime = 0));
    }, []),
    J = (0, f.useCallback)(() => {
      (F.current?.frame && cancelAnimationFrame(F.current.frame),
        (F.current = null));
    }, []),
    Ot = (0, f.useCallback)(
      (e, t) => {
        if ((J(), W || Math.hypot(e, t) < 0.5)) return;
        let n = {
            frame: 0,
            phase: `decelerate`,
            startedAt: performance.now(),
            lastTime: performance.now(),
            velocityX: e,
            velocityY: t,
          },
          r = (i) => {
            if (F.current !== n) return;
            let a = Math.min(50, Math.max(0, i - n.lastTime)),
              o = i - n.startedAt,
              s = Math.min(1, o / ue),
              c = 1 - We(s);
            ((n.velocityX = e * c),
              (n.velocityY = t * c),
              (n.lastTime = i),
              (A.current.x += (n.velocityX * a) / 1e3),
              (A.current.y += (n.velocityY * a) / 1e3),
              G(),
              s >= 1
                ? (F.current = null)
                : (n.frame = requestAnimationFrame(r)));
          };
        ((F.current = n), (n.frame = requestAnimationFrame(r)));
      },
      [G, J, W],
    ),
    kt = (0, f.useCallback)(() => {
      if (!H.current) return;
      (q(), K(), J());
      let e = Ae[H.current.wallpaperCruiseDirection],
        t =
          Math.max(
            10,
            Math.min(60, Number(H.current.wallpaperCruiseSeconds) || 15),
          ) * 1e3,
        n = {
          frame: 0,
          startedAt: performance.now(),
          lastTime: null,
          heading: e
            ? Math.atan2(e.y, e.x)
            : Math.random() * Math.PI * 2 - Math.PI,
          speed: 0,
          velocityX: 0,
          velocityY: 0,
          isTurning: !1,
          turnRemaining: 0,
          turnRate: 0,
          lastTurnAngle: null,
          fixedDirection: !!e,
          turnIntervalMs: t,
          nextTurnAt: e ? 1 / 0 : de + t,
        };
      O.current && (O.current.dataset.wallpaperMotion = `straight`);
      let r = (e) => {
        if (F.current !== n) return;
        let t = e - n.startedAt,
          i =
            n.lastTime == null
              ? 0
              : Math.min(0.05, Math.max(0, (e - n.lastTime) / 1e3));
        n.lastTime = e;
        let a = Math.min(1, Math.max(0, (t - de) / le)),
          o = a * a * (3 - 2 * a);
        if (
          ((n.speed = ce * l(H.current) * o),
          !n.fixedDirection && !n.isTurning && t >= n.nextTurnAt)
        ) {
          let e = Math.random() < 0.5 ? -1 : 1,
            t = fe + Math.random() * (pe - fe);
          if (n.lastTurnAngle !== null) {
            let e = fe,
              r = pe,
              i = me,
              a = Math.max(e, n.lastTurnAngle - i),
              o = Math.min(r, n.lastTurnAngle + i),
              s = Math.max(0, a - e),
              c = Math.max(0, r - o);
            s + c > 0 &&
              (t =
                Math.random() * (s + c) < s
                  ? e + Math.random() * s
                  : o + Math.random() * c);
          }
          n.lastTurnAngle = t;
          let r = he + Math.random() * 480;
          ((n.isTurning = !0),
            (n.turnRemaining = e * t),
            (n.turnRate = Math.max(1, n.speed) / r),
            O.current && (O.current.dataset.wallpaperMotion = `arc`));
        }
        let s = 0;
        n.isTurning &&
          i > 0 &&
          ((s =
            Math.sign(n.turnRemaining) *
            Math.min(Math.abs(n.turnRemaining), n.turnRate * i)),
          (n.heading += s),
          (n.turnRemaining -= s),
          Math.abs(n.turnRemaining) < 1e-6 &&
            ((n.turnRemaining = 0),
            (n.isTurning = !1),
            (n.nextTurnAt = t + n.turnIntervalMs),
            O.current && (O.current.dataset.wallpaperMotion = `straight`)));
        let c = n.heading - s / 2;
        ((n.velocityX = Math.cos(c) * n.speed),
          (n.velocityY = Math.sin(c) * n.speed),
          (A.current.x += n.velocityX * i),
          (A.current.y += n.velocityY * i),
          G(),
          (n.frame = requestAnimationFrame(r)));
      };
      ((F.current = n), (n.frame = requestAnimationFrame(r)));
    }, [G, q, J, K]),
    At = (0, f.useCallback)(
      (e = !0) => {
        let t = F.current?.velocityX || 0,
          n = F.current?.velocityY || 0;
        (J(),
          (I.current = !1),
          Pe(!1),
          Fe(!1),
          (ut.current = !1),
          clearTimeout(dt.current),
          (dt.current = 0),
          e && Ot(t, n));
      },
      [J, Ot],
    ),
    jt = (0, f.useCallback)(() => {
      I.current &&
        (ut.current && ((ut.current = !1), Fe(!1)),
        clearTimeout(dt.current),
        (dt.current = setTimeout(() => {
          I.current && ((ut.current = !0), Fe(!0), Le(!1), Be(!1), Ye(!1));
        }, ge)));
    }, []),
    Mt = (0, f.useCallback)(() => {
      !E &&
        H.current &&
        (I.current
          ? At(!0)
          : ((I.current = !0),
            (ut.current = !1),
            Pe(!0),
            Fe(!1),
            (P.current = null),
            Ze(null),
            Le(!0),
            Be(!0),
            Ye(!0),
            kt(),
            jt()));
    }, [E, kt, At, jt]),
    Y = (0, f.useCallback)(() => {
      if (!tt.current) return;
      if (typeof tt.current === `number`) {
        cancelAnimationFrame(tt.current);
      } else {
        /* 提前退出聚焦时，先把相机的当前合成位置写回内联样式，
           再取消动画，避免下一张布局快照从动画目标位置开始。 */
        let world = O.current;
        if (world) {
          let transform = getComputedStyle(world).transform;
          if (transform && transform !== `none`) {
            let matrix = new DOMMatrixReadOnly(transform);
            ((A.current.x = matrix.e),
              (A.current.y = -matrix.f),
              (A.current.zoom = Math.max(0.01, matrix.a)),
              (world.style.transform = transform),
              (world.dataset.cameraX = String(matrix.e)),
              (world.dataset.cameraY = String(-matrix.f)),
              (world.dataset.cameraZoom = String(matrix.a)));
          }
        }
        try {
          tt.current.cancel();
        } catch {}
      }
      tt.current = null;
    }, []),
    Nt = (0, f.useCallback)(() => {
      (nt.current.frame && cancelAnimationFrame(nt.current.frame),
        (nt.current.frame = 0),
        (nt.current.lastTime = 0));
    }, []),
    Pt = (0, f.useCallback)(
      (e, t, wheelDelta) => {
        let r = nt.current,
          i = A.current;
        r.frame || (r.targetZoom = i.zoom);
        if (
          ((r.targetZoom = Math.max(
            ae,
            Math.min(_, r.targetZoom * Math.exp(-wheelDelta * oe)),
          )),
          (r.clientX = n.width / 2),
          (r.clientY = n.height / 2),
          r.frame)
        )
          return;
        r.lastTime = 0;
        let a = (e) => {
          let t = r.lastTime
            ? Math.min(50, Math.max(0, e - r.lastTime))
            : 1e3 / 60;
          r.lastTime = e;
          let n = A.current,
            i = 1 - Math.exp(-t / v),
            o = n.zoom + (r.targetZoom - n.zoom) * i,
            s = Math.abs(o - r.targetZoom) < 2e-4;
          s && (o = r.targetZoom);
          let c = (r.clientX - n.x) / n.zoom,
            l = (r.clientY + n.y) / n.zoom;
          ((A.current = {
            ...n,
            x: r.clientX - c * o,
            y: l * o - r.clientY,
            zoom: o,
          }),
            G(),
            s
              ? ((r.frame = 0), (r.lastTime = 0))
              : (r.frame = requestAnimationFrame(a)));
        };
        r.frame = requestAnimationFrame(a);
      },
      [G],
    ),
    Ft = (0, f.useCallback)(() => {
      for (let e of lt.current)
        try {
          e.cancel();
        } catch {}
      for (let e of D.current?.querySelectorAll(`.pw-masonry-card`) || [])
        (e.style.removeProperty(`transition`),
          e.style.removeProperty(`transform-origin`),
          e.style.removeProperty(`transform`),
          e.style.removeProperty(`will-change`));
      lt.current = [];
    }, []),
    It = (0, f.useCallback)(() => {
      let e = D.current;
      if (!e) return null;
      let t = new Map();
      for (let n of e.querySelectorAll(`.pw-masonry-card`))
        n.classList.contains(`is-focus-anchor`) ||
          t.set(n.dataset.cardKey, n.getBoundingClientRect());
      return t;
    }, []),
    X = (0, f.useCallback)(
      (e) => {
        ct.current = It();
        window.clearTimeout(focusCloseTimer.current);
        focusCloseTimer.current = 0;
        for (let n of D.current?.querySelectorAll(`[data-focus-closing]`) || [])
          n.removeAttribute(`data-focus-closing`);
        if (!e && P.current) {
          let n = D.current?.querySelector(
            `.pw-masonry-card[data-card-key="${P.current.key}"]`,
          );
          n &&
            ((n.dataset.focusClosing = `true`),
            (focusCloseTimer.current = window.setTimeout(() => {
              (n.removeAttribute(`data-focus-closing`),
                (focusCloseTimer.current = 0));
            }, ye + 40)));
        }
        for (let e of L.current)
          try {
            e.cancel();
          } catch {}
        L.current = [];
        ((P.current = e), Ze(e));
      },
      [It],
    );
  (0, f.useLayoutEffect)(() => {
    let e = ct.current;
    ct.current = null;
    Ft();
    if (!e || W) return;
    let panel = D.current;
    if (!panel) return;
    let flipToken = ++focusTransitionToken.current;
    focusMotionLayoutFrozen.current = !0;
    /* 用点击前的屏幕矩形做 FLIP：布局已经完成后再用 transform 补回旧位置，
       避免 left / top / width / height 在首帧直接跳到聚焦尺寸。 */
    let flipCards = [...panel.querySelectorAll(`.pw-masonry-card`)];
    let flipAnimations = [];
    for (let card of flipCards) card.style.transition = `none`;
    /* 必须先关闭布局 transition 并强制提交最终布局，再读取目标矩形；
       否则 getBoundingClientRect 仍可能返回过渡起点。 */
    void panel.offsetWidth;
    let cameraZoom = Math.max(0.01, A.current.zoom);
    for (let card of flipCards) {
      let previous = e.get(card.dataset.cardKey);
      if (!previous) continue;
      let next = card.getBoundingClientRect();
      if (next.width <= 0 || next.height <= 0) continue;
      let dx = (previous.left - next.left) / cameraZoom,
        dy = (previous.top - next.top) / cameraZoom,
        scaleX = previous.width / next.width,
        scaleY = previous.height / next.height;
      if (
        Math.abs(dx) < 0.01 &&
        Math.abs(dy) < 0.01 &&
        Math.abs(scaleX - 1) < 0.001 &&
        Math.abs(scaleY - 1) < 0.001
      )
        continue;
      card.style.transformOrigin = `0 0`;
      card.style.willChange = `transform`;
      let animation = card.animate(
        [
          {
            transform: `translate3d(${dx.toFixed(3)}px, ${dy.toFixed(3)}px, 0) scale(${scaleX.toFixed(5)}, ${scaleY.toFixed(5)})`,
          },
          { transform: `translate3d(0, 0, 0) scale(1, 1)` },
        ],
        {
          duration: ye,
          easing: `cubic-bezier(0.4, 0, 0.2, 1)`,
          fill: `both`,
        },
      );
      animation.pause();
      animation.currentTime = 0;
      flipAnimations.push({ animation, card });
      lt.current.push(animation);
    }
    let clearFlipStyles = () => {
      for (let card of flipCards)
        card.isConnected &&
          (card.style.removeProperty(`transition`),
          card.style.removeProperty(`transform-origin`),
          card.style.removeProperty(`transform`),
          card.style.removeProperty(`will-change`));
    };
    let finishFlip = () => {
      if (focusTransitionToken.current !== flipToken) return;
      clearFlipStyles();
      focusMotionLayoutFrozen.current = !1;
      Dt(!0);
    };
    if (!flipAnimations.length) {
      finishFlip();
      return;
    }
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        if (
          focusTransitionToken.current !== flipToken ||
          !focusMotionLayoutFrozen.current
        )
          return;
        for (let { animation } of flipAnimations) animation.play();
      });
    });
    Promise.allSettled(
      flipAnimations.map(({ animation }) => animation.finished),
    )
      .then(async () => {
        await new Promise((resolve) =>
          requestAnimationFrame(() => requestAnimationFrame(resolve)),
        );
        if (focusTransitionToken.current !== flipToken) return;
        for (let { animation } of flipAnimations) {
          try {
            animation.cancel();
          } catch {}
        }
        finishFlip();
        lt.current = lt.current.filter(
          (item) =>
            !flipAnimations.some(({ animation }) => animation === item),
        );
      })
      .catch(finishFlip);
    return;
    let transitionToken = ++focusTransitionToken.current;
    let exitFocus = Boolean(
      !T && D.current?.querySelector(`[data-focus-closing]`),
    );
    if (!exitFocus)
      for (let n of D.current?.querySelectorAll(`.pw-masonry-card`) || [])
        (n.style.removeProperty(`opacity`),
          n.style.removeProperty(`transform`));
    let focusCamera = null;
    if (T && k.current) {
      let r = Ke(T, k.current, n.height);
      if (r) {
        let i = Math.max(0.01, A.current.zoom),
          a = (r.x + r.width / 2) * i,
          o = (r.y + r.height / 2) * i,
          s = n.width / 2 - a,
          c = o - n.height / 2;
        if (w === `minimal`) {
          let e = A.current.x + r.x * i,
            t = r.y * i - A.current.y,
            a = e + r.width * i,
            o = t + r.height * i;
          ((s = A.current.x),
            (c = A.current.y),
            e < 32 && (s += 32 - e),
            a > n.width - 32 && (s -= a - (n.width - 32)),
            t < 32 && (c -= 32 - t),
            o > n.height - 32 && (c += o - (n.height - 32)));
        }
        focusCamera = { x: s, y: c };
      }
    }
    if (!e || W) {
      if (W && focusCamera) {
        ((A.current.x = focusCamera.x),
          (A.current.y = focusCamera.y),
          G());
      }
      return;
    }
    let t = D.current;
    let animations = [];
    let cardTransforms = [];
    let cameraDeltaX = 0,
      cameraDeltaY = 0;
    let focusRects = T ? qe(k.current, T, n.height).rects : null;
    if (t) {
      ((cameraDeltaX = focusCamera ? focusCamera.x - A.current.x : 0),
        (cameraDeltaY = focusCamera ? -(focusCamera.y - A.current.y) : 0));
      let cameraX = cameraDeltaX,
        cameraY = cameraDeltaY;
      for (let n of t.querySelectorAll(`.pw-masonry-card`)) {
        let t = e.get(n.dataset.cardKey);
        if (!t) continue;
        if (exitFocus) {
          let startTransform = n.style.transform;
          if (!startTransform || startTransform === `none`) continue;
          ((n.style.transform = startTransform),
            (n.style.willChange = `transform`));
          let c = n.animate(
            [
              { transform: startTransform },
              { transform: `translate3d(0, 0, 0) scale(1, 1)` },
            ],
            { duration: ye, easing: xe, fill: `both` },
          );
          (c.pause(),
            (c.currentTime = 0),
            lt.current.push(c),
            animations.push(c),
            cardTransforms.push({ node: n }));
          continue;
        }
        let r = n.getBoundingClientRect();
        if (r.width <= 0 || r.height <= 0) continue;
        let marginX = Math.abs(cameraX) + 80,
          marginY = Math.abs(cameraY) + 80;
        if (
          r.right < -marginX ||
          r.left > n.width + marginX ||
          r.bottom < -marginY ||
          r.top > n.height + marginY
        )
          continue;
        let i = t.left + t.width / 2 - (r.left + r.width / 2),
          a = t.top + t.height / 2 - (r.top + r.height / 2),
          o = t.width / r.width,
          s = t.height / r.height;
        Math.abs(o - 1) < 0.02 && (o = 1);
        Math.abs(s - 1) < 0.02 && (s = 1);
        let focusRect = focusRects?.get(n.dataset.cardKey),
          isFocusTarget = T?.key === n.dataset.cardKey,
          finalScaleX = 1,
          finalScaleY = 1,
          finalX = cameraX,
          finalY = cameraY;
        if (focusRect) {
          let zoom = Math.max(0.01, A.current.zoom),
            focusWidth = focusRect.width * zoom,
            focusHeight = focusRect.height * zoom,
            focusCenterX =
              (focusRect.x + focusRect.width / 2) * zoom + A.current.x,
            focusCenterY =
              (focusRect.y + focusRect.height / 2) * zoom - A.current.y;
          if (isFocusTarget)
            ((finalScaleX = focusWidth / r.width),
              (finalScaleY = focusHeight / r.height));
          ((finalX = focusCenterX + cameraX - (r.left + r.width / 2)),
            (finalY = focusCenterY + cameraY - (r.top + r.height / 2)));
        }
        if (
          Math.abs(finalX) < 0.01 &&
          Math.abs(finalY) < 0.01 &&
          Math.abs(i) < 0.01 &&
          Math.abs(a) < 0.01 &&
          Math.abs(o - 1) < 0.001 &&
          Math.abs(s - 1) < 0.001 &&
          Math.abs(finalScaleX - 1) < 0.001 &&
          Math.abs(finalScaleY - 1) < 0.001
        )
          continue;
        let startTransform = `translate3d(${i.toFixed(3)}px, ${a.toFixed(3)}px, 0) scale(${o.toFixed(5)}, ${s.toFixed(5)})`;
        ((n.style.transform = startTransform),
          (n.style.willChange = `transform`));
        let c = n.animate(
          [
            { transform: startTransform },
            {
              transform: `translate3d(${finalX.toFixed(3)}px, ${finalY.toFixed(3)}px, 0) scale(${finalScaleX.toFixed(5)}, ${finalScaleY.toFixed(5)})`,
            },
          ],
          { duration: ye, easing: xe, fill: `both` },
        );
        (c.pause(), (c.currentTime = 0));
        (lt.current.push(c),
          animations.push(c),
          cardTransforms.push({
            node: n,
            x: finalX,
            y: finalY,
            scaleX: finalScaleX,
            scaleY: finalScaleY,
          }));
      }
    }
    let cleanup = () => {
      for (let e of animations)
        try {
          e.cancel();
        } catch {}
      lt.current = lt.current.filter((e) => !animations.includes(e));
    };
    let finish = () => {
      if (transitionToken !== focusTransitionToken.current) return;
      if (exitFocus) {
        for (let e of cardTransforms)
          (e.node.style.removeProperty(`transform`),
            e.node.style.removeProperty(`will-change`));
        cleanup();
        for (let e of t?.querySelectorAll(`[data-focus-closing]`) || [])
          e.removeAttribute(`data-focus-closing`);
        return;
      }
      if (focusCamera && P.current === T) {
        requestAnimationFrame(() => {
          if (
            transitionToken !== focusTransitionToken.current ||
            P.current !== T
          )
            return;
          ((A.current.x = focusCamera.x),
            (A.current.y = focusCamera.y),
            G(!1, !0));
          for (let item of cardTransforms)
            item.node.style.transform = `translate3d(${(item.x - cameraDeltaX).toFixed(3)}px, ${(item.y - cameraDeltaY).toFixed(3)}px, 0) scale(${item.scaleX.toFixed(5)}, ${item.scaleY.toFixed(5)})`;
          cleanup();
        });
        return;
      }
      /* 放大和缩回都保留动画最终帧。缩回时若立即 cancel，最后一帧
         会从缓动尾部直接吸附到零，形成一次很短的跳动。下一轮聚焦
         或退出画廊时再由 Ft() 统一回收。 */
      for (let e of t?.querySelectorAll(`[data-focus-closing]`) || [])
        e.removeAttribute(`data-focus-closing`);
      if (P.current !== T) cleanup();
    };
    if (animations.length) {
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          if (
            transitionToken !== focusTransitionToken.current ||
            P.current !== T
          )
            return;
          for (let e of animations) e.play();
        });
      });
      Promise.allSettled(animations.map((e) => e.finished))
        .then(finish)
        .catch(finish);
    } else finish();
  }, [T, Dt, Ft, W]);
  (0, f.useEffect)(() => {
    if (!T || !k.current) return;
    let r = Ke(T, k.current, n.height);
    if (!r) return;
    let zoom = Math.max(0.01, A.current.zoom),
      currentX = A.current.x,
      currentY = A.current.y,
      targetX = currentX,
      targetY = currentY;
    if (w === `center`) {
      ((targetX = n.width / 2 - (r.x + r.width / 2) * zoom),
        (targetY = (r.y + r.height / 2) * zoom - n.height / 2));
    } else {
      let left = currentX + r.x * zoom,
        right = currentX + (r.x + r.width) * zoom,
        top = r.y * zoom - currentY,
        bottom = (r.y + r.height) * zoom - currentY;
      ((targetX =
        right - left > n.width - 48
          ? n.width / 2 - (r.x + r.width / 2) * zoom
          : left < 24
            ? currentX + 24 - left
            : right > n.width - 24
              ? currentX - (right - (n.width - 24))
              : currentX),
        (targetY =
          bottom - top > n.height - 48
            ? (r.y + r.height / 2) * zoom - n.height / 2
            : top < 24
              ? currentY - (24 - top)
              : bottom > n.height - 24
                ? currentY + (bottom - (n.height - 24))
                : currentY));
    }
    if (
      Math.abs(targetX - currentX) < 0.5 &&
      Math.abs(targetY - currentY) < 0.5
    )
      return;
    if (W) {
      ((A.current.x = targetX), (A.current.y = targetY), G());
      return;
    }
    let started = 0,
      frame = 0,
      step = (now) => {
        if (!started) started = now;
        let progress = Math.min(1, (now - started) / ye),
          eased = progress * progress * (3 - 2 * progress);
        ((A.current.x = currentX + (targetX - currentX) * eased),
          (A.current.y = currentY + (targetY - currentY) * eased),
          G(!0, !0),
          (frame =
            progress < 1 ? requestAnimationFrame(step) : 0));
      };
    frame = requestAnimationFrame(step);
    return () => {
      frame && cancelAnimationFrame(frame);
      frame = 0;
    };
  }, [T, w, n.height, n.width, G, W]);
  let zt = (0, f.useCallback)(() => {
      if (
        (st.current &&=
          (window.clearTimeout(ot.current), (ot.current = 0), !1)),
        I.current
      ) {
        (At(!1),
          C(
            { type: `photo-wall:exit` },
          ));
        return;
      }
      P.current
        ? (Y(), X(null))
        : V.current ||
          ((V.current = !0),
          q(),
          K(),
          J(),
          Y(),
          C({ type: `photo-wall:back` }));
    }, [Y, q, J, K, X, At]),
    Bt = (0, f.useCallback)(() => {
      !I.current && P.current && !st.current
        ? (Y(),
          X(null),
          (st.current = !0),
          window.clearTimeout(ot.current),
          (ot.current = window.setTimeout(
            () => {
              ((ot.current = 0), (st.current = !1), zt());
            },
            W ? 0 : be,
          )))
        : zt();
    }, [Y, W, zt, X]),
    Vt = (0, f.useCallback)(
      (e, t) => {
        if ((t?.stopPropagation?.(), at.current || I.current || E)) return;
        if (e.item.kind === `album`) {
          let r = t?.currentTarget?.getBoundingClientRect();
          C({
            type: `photo-wall:navigate`,
            albumId: e.item.albumId,
            origin: {
              x: r ? r.left + r.width / 2 : n.width / 2,
              y: r ? r.top + r.height / 2 : n.height / 2,
            },
          });
          return;
        }
        let r = P.current?.key === e.key ? null : e;
        (q(), K(), J(), Y(), X(r));
      },
      [Y, q, J, K, E, X],
    ),
    Ht = (0, f.useCallback)(() => {
      let e = w === `center` ? `minimal` : `center`;
      Xe(e);
      try {
        localStorage.setItem(`photo-wall-focus-mode`, e);
      } catch {}
    }, [w]),
    Z = (0, f.useCallback)(() => {
      let e = D.current;
      if (!e) return [];
      let t = e.getBoundingClientRect(),
        n = o(k.current?.columnWidth || ee, m);
      return [...e.querySelectorAll(`.pw-masonry-card`)]
        .filter((e) => {
          let n = e.getBoundingClientRect();
          return (
            n.bottom > 0 && n.top < t.height && n.right > 0 && n.left < t.width
          );
        })
        .map((e) => {
          let i = e.getBoundingClientRect(),
            a = r(i, t, n),
            o = e.dataset.cardKey || ``;
          return (
            mt.current.set(o, a),
            (e.dataset.enterDelay = String(a)),
            { node: e, key: o, delay: a }
          );
        });
    }, []),
    Q = (0, f.useCallback)(() => {
      ((R.current = !1),
        (z.current = !1),
        (gt.current = 0),
        (B.current &&= (cancelAnimationFrame(B.current), 0)));
      for (let e of L.current)
        try {
          e.cancel();
        } catch {}
      L.current = [];
    }, []),
    Ut = (0, f.useCallback)((e, t = null) => {
      if (!e.length || !R.current || V.current) return;
      e = revealSchedule(e, t == null ? 900 : t);
      gt.current += 1;
      let n = [];
      for (let { node: r, key: i, delay: o } of e) {
        if (!r.isConnected) continue;
        ht.current.add(i);
        let e = t == null ? o : Math.min(o, t),
          s = r.animate(
            [{ opacity: 0 }, { opacity: 0.36, offset: 0.42 }, { opacity: 1 }],
            { duration: 240, delay: e, easing: `ease-out`, fill: `both` },
          ),
          c = r.animate(a, {
            duration: 583,
            delay: e,
            easing: `linear`,
            fill: `both`,
          });
        (n.push(s, c),
          L.current.push(s, c),
          Promise.allSettled([s.finished, c.finished])
            .then(() => {
              (r.isConnected &&
                !V.current &&
                (r.style.removeProperty(`opacity`),
                r.style.removeProperty(`transform`)),
                (L.current = L.current.filter((e) => e !== s && e !== c)));
            })
            .catch(() => {}));
      }
      Promise.allSettled(n.map((e) => e.finished))
        .then(() => {
          ((gt.current = Math.max(0, gt.current - 1)),
            gt.current === 0 && ((R.current = !1), (z.current = !1)));
        })
        .catch(() => {});
    }, []),
    Wt = (0, f.useCallback)(() => {
      if (!R.current || !z.current || V.current) return;
      B.current && cancelAnimationFrame(B.current);
      let e = [],
        t = () => {
          if (R.current && !V.current) {
            e = Z().filter(({ key: e }) => e && !ht.current.has(e));
            for (let { node: t, key: n } of e)
              (ht.current.add(n),
                (t.style.opacity = `0`),
                (t.style.transform = `translate3d(0, -68px, 0) scale(${c})`));
          }
        };
      (t(),
        (B.current = requestAnimationFrame(() => {
          B.current = requestAnimationFrame(() => {
            ((B.current = 0), t(), Ut(e, 120));
          });
        })));
    }, [Ut, Z]),
    Gt = (0, f.useCallback)(() => {
      if (V.current)
        for (let { node: e, key: t } of Z())
          t &&
            !_t.current.has(t) &&
            (_t.current.add(t), (e.style.opacity = `0`));
    }, [Z]),
    Kt = (0, f.useCallback)(async () => {
      if (!pt.current) return;
      let e = () => C({ type: `photo-wall:reveal-start` }),
        t = Z();
      if (t.length || W) {
        if (((pt.current = !1), !t.length || W)) (e(), ve(!1), Se(!0));
        else {
          ((R.current = !0), (z.current = !1), (gt.current = 0));
          for (let { key: e } of t) ht.current.add(e);
          for (let { node: e } of t)
            ((e.style.opacity = `0`),
              (e.style.transform = `translate3d(0, -68px, 0) scale(${c})`));
          /* 小相册等到可见图片真正可绘制；大相册仍限制在 80ms。 */
          (await i(t.map(({ node: e }) => e), {
            timeoutMs: 4000,
          }),
            await new Promise((e) =>
              requestAnimationFrame(() => requestAnimationFrame(e)),
            ),
            e(),
            ve(!1),
            Se(!0),
            (z.current = !0),
            Ut(t));
        }
      }
    }, [Ut, W, Z]),
    qt = (0, f.useCallback)(() => {
      (q(), K(), J(), et(!0));
      let e = Z();
      e = revealSchedule(e, 600);
      if (W || !e.length) {
        Q();
        let e = document.querySelector(`.photo-wall-atmosphere`);
        (e && (e.style.opacity = `0`),
          requestAnimationFrame(() =>
            C({ type: `photo-wall:exit-animation-complete` }),
          ));
        return;
      }
      let t = e.map(({ node: e, delay: t }) => {
        let n = e.dataset.cardKey || ``,
          r = getComputedStyle(e);
        return {
          node: e,
          key: n,
          delay: t,
          opacity: Number(r.opacity),
          transform: r.transform,
        };
      });
      (Q(), (_t.current = new Set(t.map(({ key: e }) => e).filter(Boolean))));
      let n = Math.max(...e.map(({ delay: e }) => e), 0),
        r = [],
        i = [],
        a = document.querySelector(`.photo-wall-atmosphere`);
      a &&
        r.push(
          a.animate([{ opacity: 1 }, { opacity: 0 }], {
            duration: 200,
            easing: `ease-in`,
            fill: `forwards`,
          }),
        );
      for (let e of t) {
        let t = n - e.delay;
        r.push(
          e.node.animate([{ opacity: e.opacity }, { opacity: 0 }], {
            duration: 200,
            delay: t,
            easing: `ease-in`,
            fill: `both`,
          }),
        );
        let a = s.map((t, n) => ({
          ...t,
          transform: n === 0 ? e.transform : t.transform,
        }));
        i.push(
          e.node.animate(a, {
            duration: 200,
            delay: t,
            easing: `linear`,
            fill: `both`,
          }),
        );
      }
      Promise.allSettled([...r, ...i].map((e) => e.finished))
        .then(() => C({ type: `photo-wall:exit-animation-complete` }))
        .catch(() => C({ type: `photo-wall:exit-animation-complete` }));
    }, [q, J, K, Q, W, Z]),
    $ = (0, f.useCallback)(({ clearPhase: e = !0 } = {}) => {
      yt.current += 1;
      for (let e of xt.current)
        try {
          e.cancel();
        } catch {}
      ((xt.current = []),
        bt.current?.remove(),
        (bt.current = null),
        O.current?.style.removeProperty(`visibility`),
        O.current?.style.removeProperty(`opacity`),
        D.current?.style.removeProperty(`pointer-events`),
        e && $e(``));
    }, []),
    Jt = (0, f.useCallback)(
      async (e) => {
        $();
        let r = yt.current,
          i = D.current,
          a = O.current,
          o = H.current;
        if (!i || !a || !o || W) {
          t(e);
          return;
        }
        ((V.current = !1),
          $e(`flip`),
          q(),
          K(),
          J(),
          Y(),
          Q(),
          Ft(),
          (P.current = null),
          Ze(null),
          (i.style.pointerEvents = `none`));
        let s = i.getBoundingClientRect(),
          c = { x: s.width / 2, y: s.height / 2 },
          l = (e) =>
            e.right > 0 && e.left < s.width && e.bottom > 0 && e.top < s.height,
          u = (e) => ({ x: e.left + e.width / 2, y: e.top + e.height / 2 }),
          d = (e) => (u(e).x < c.x ? -1 : 1),
          f = [];
        for (let e of i.querySelectorAll(`.pw-masonry-card`)) {
          let t = e.getBoundingClientRect(),
            n = {
              left: t.left - s.left,
              top: t.top - s.top,
              width: t.width,
              height: t.height,
            };
          if (
            ((n.right = n.left + n.width), (n.bottom = n.top + n.height), !l(n))
          )
            continue;
          let r = e.querySelector(`img`);
          f.push({
            index: f.length,
            ...n,
            src: r?.currentSrc || r?.src || ``,
            kind: e.dataset.itemKind || `photo`,
            direction: d(n),
          });
        }
        let p = ze(n.width, e.items || [], Number(e.masonrySeed) || 1),
          h = Math.max(0.01, A.current.zoom),
          ee = -A.current.x / h,
          g = (n.width - A.current.x) / h,
          te = A.current.y / h,
          ne = (A.current.y + n.height) / h;
        Ve(p, te, ne, ee, g);
        let re = Math.max(1, p.columnWidth + m),
          ie = (e) =>
            Math.min(
              Ee,
              Math.round((Math.hypot(u(e).x - c.x, u(e).y - c.y) / re) * Te),
            ),
          ae = He(p, te, ne, ee, g)
            .map((e, t) => {
              let n = {
                left: A.current.x + e.column * (p.columnWidth + m) * h,
                top: e.y * h - A.current.y,
                width: e.width * h,
                height: e.height * h,
              };
              return (
                (n.right = n.left + n.width),
                (n.bottom = n.top + n.height),
                { card: e, index: t, rect: n }
              );
            })
            .filter(({ rect: e }) => l(e))
            .map(({ card: e, index: t, rect: n }) => {
              let r = d(n);
              return {
                index: t,
                ...n,
                src: e.item.src || ``,
                kind: e.item.kind || `photo`,
                direction: r,
                delay: ie(n) + Ce,
              };
            });
        if (!f.length || !ae.length) {
          (t(e), $());
          return;
        }
        if (
          (await Ue([...f.map((e) => e.src), ...ae.map((e) => e.src)]),
          r !== yt.current)
        )
          return;
        let _ = document.createElement(`div`);
        ((_.className = `photo-wall-handoff-layer`),
          _.setAttribute(`aria-hidden`, `true`),
          (_.dataset.wallHandoff = `flip`));
        let oe = (e, t) => {
          for (let n of e) {
            let e = document.createElement(`div`);
            ((e.className = `photo-wall-handoff-card pw-masonry-handoff-card is-${t}`),
              (e.dataset.handoffPhase = t),
              (e.dataset.handoffIndex = String(n.index)),
              (e.style.left = `${n.left}px`),
              (e.style.top = `${n.top}px`),
              (e.style.width = `${n.width}px`),
              (e.style.height = `${n.height}px`),
              n.src && (e.style.backgroundImage = `url("${n.src}")`),
              n.kind === `album` && e.classList.add(`is-album`),
              t === `in` &&
                (e.style.transform = `perspective(${De}px) rotateY(${-n.direction * 90}deg)`),
              _.append(e),
              (n.node = e));
          }
        };
        (oe(f, `out`), oe(ae, `in`), i.append(_), (bt.current = _));
        let v = [];
        for (let e of f)
          v.push(
            e.node.animate(
              [
                { transform: `perspective(${De}px) rotateY(0deg)` },
                {
                  transform: `perspective(${De}px) rotateY(${e.direction * 90}deg)`,
                },
              ],
              { duration: Ce, delay: ie(e), easing: Oe, fill: `both` },
            ),
          );
        for (let e of ae)
          v.push(
            e.node.animate(
              [
                {
                  transform: `perspective(${De}px) rotateY(${-e.direction * 90}deg)`,
                },
                { transform: `perspective(${De}px) rotateY(0deg)` },
              ],
              { duration: we, delay: e.delay, easing: ke, fill: `both` },
            ),
          );
        if (
          ((xt.current = v),
          await Promise.all(v.map((e) => e.finished.catch(() => {}))),
          r === yt.current &&
            ((a.style.visibility = `hidden`),
            t(e),
            await new Promise((e) =>
              requestAnimationFrame(() => requestAnimationFrame(e)),
            ),
            r === yt.current &&
              (a.style.removeProperty(`visibility`),
              await _.animate([{ opacity: 1 }, { opacity: 0 }], {
                duration: 90,
                easing: `ease-out`,
                fill: `both`,
              }).finished.catch(() => {}),
              r === yt.current)))
        ) {
          (_.remove(), bt.current === _ && (bt.current = null));
          for (let e of v)
            try {
              e.cancel();
            } catch {}
          (xt.current === v && (xt.current = []),
            i.style.removeProperty(`pointer-events`),
            $e(``));
        }
      },
      [Y, q, J, $, K, Q, Ft, W, n.height, n.width],
    );
  ((0, f.useEffect)(() => {
    let e = (e) => {
      if (e.origin === window.location.origin && e.source === window.parent) {
        if (e.data?.type === `photo-wall:init`) {
          let n = e.data.payload,
            r =
              H.current?.items?.length > 0 &&
              H.current.items.every((e) => e.kind === `album`),
            i =
              n?.items?.length > 0 && n.items.every((e) => e.kind === `album`);
          !(H.current && r !== i) || W ? ($(), (V.current = !1), t(n)) : Jt(n);
        } else e.data?.type === `photo-wall:exit-animation` && qt();
      }
    };
    return (
      window.addEventListener(`message`, e),
      ft.current || ((ft.current = !0), C({ type: `photo-wall:ready` })),
      () => window.removeEventListener(`message`, e)
    );
  }, [qt, $, W, Jt]),
    (0, f.useEffect)(() => {
      let e = D.current;
      if (!e) return;
      let t = () =>
        h({
          width: Math.max(1, e.clientWidth),
          height: Math.max(1, e.clientHeight),
        });
      t();
      let n = new ResizeObserver(t);
      return (n.observe(e), () => n.disconnect());
    }, [e]),
    (0, f.useLayoutEffect)(() => {
      e &&
        (V.current
          ? Gt()
          : (y && ((R.current = !0), (z.current = !0)), z.current && Wt()));
    }, [e, Gt, y, Wt, n.height, n.width]),
    (0, f.useEffect)(
      () => () => {
        B.current && cancelAnimationFrame(B.current);
      },
      [],
    ),
    (0, f.useLayoutEffect)(() => {
      if (!e || !U.length || n.width <= 1) return;
      let t = ze(n.width, U, Number(e.masonrySeed) || 1);
      k.current = t;
      let r = t.columnWidth * t.columns + m * Math.max(0, t.columns - 1);
      (A.current.ready ||
        ((A.current.x = (n.width - r * initialCameraZoom) / 2),
        (A.current.y = 0),
        (A.current.zoom = initialCameraZoom),
        (A.current.ready = !0)),
        (P.current = null),
        Ze(null),
        Y());
      let i = Math.max(1, n.height),
        a = Math.max(0.01, A.current.zoom),
        o = -A.current.x / a,
        s = (n.width - A.current.x) / a;
      (Ve(t, A.current.y / a, (A.current.y + i) / a, o, s),
        (j.current.lastRefreshX = A.current.x),
        (j.current.lastRefreshY = A.current.y),
        (j.current.lastRefreshZoom = a),
        te((e) => e + 1),
        G(!1));
    }, [G, Y, e, U, n.height, n.width]),
    (0, f.useEffect)(() => {
      e && U.length && Kt();
    }, [e, U.length, g, Kt]),
    (0, f.useEffect)(() => {
      if (!y) return;
      let e = window.setTimeout(() => Se(!1), 1e3);
      return () => clearTimeout(e);
    }, [y]),
    (0, f.useEffect)(() => {
      let e = (e) => {
        I.current && jt();
        let t =
            e.clientX >= 0 &&
            e.clientY >= 0 &&
            e.clientX < 120 &&
            e.clientY < 76,
          n = e.clientX >= window.innerWidth - 120 && e.clientY < 76,
          r = e.clientX >= window.innerWidth - 146 && e.clientY < 76;
        (Le(t), Be(n), Ye(r));
      };
      return (
        window.addEventListener(`pointermove`, e, { passive: !0 }),
        () => window.removeEventListener(`pointermove`, e)
      );
    }, [St, jt]),
    (0, f.useEffect)(() => {
      let e = (e) => {
        e.key === `Escape`
          ? (e.preventDefault(), zt())
          : (e.ctrlKey || e.metaKey) &&
            _e.has(e.key) &&
            (e.preventDefault(),
            C({
              type: `photo-wall:window-shortcut`,
              key: e.key,
              ctrlKey: e.ctrlKey,
              metaKey: e.metaKey,
            }));
      };
      return (
        window.addEventListener(`keydown`, e),
        () => window.removeEventListener(`keydown`, e)
      );
    }, [zt]),
    (0, f.useEffect)(
      () => () => {
        (K(),
          Nt(),
          q(),
          J(),
          Ft(),
          Q(),
          clearTimeout(vt.current),
          clearTimeout(dt.current),
          $({ clearPhase: !1 }),
          Y());
      },
      [Y, q, J, $, K, Nt, Ft, Q],
    ));
  let Yt = (0, f.useCallback)(
    (e) => {
      if ((e.preventDefault(), I.current || E || P.current)) return;
      if ((q(), e.ctrlKey || e.metaKey)) {
        (e.preventDefault(), K());
        let t =
          e.deltaMode === 1
            ? 16
            : e.deltaMode === 2
              ? Math.max(1, n.height)
              : 1;
        Pt(n.width / 2, n.height / 2, e.deltaY * t);
        return;
      }
      Y();
      Nt();
      let t =
        e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? Math.max(1, n.height) : 1;
      if (
        ((N.current.pendingX -= e.deltaX * t),
        (N.current.pendingY -= e.deltaY * t),
        N.current.frame)
      )
        return;
      let r = () => {
        let e = N.current.pendingX,
          t = N.current.pendingY;
        if (Math.abs(e) < 0.25 && Math.abs(t) < 0.25) {
          ((N.current.pendingX = 0),
            (N.current.pendingY = 0),
            (N.current.frame = 0));
          return;
        }
        let n = e * 0.2,
          i = t * 0.2;
        ((N.current.pendingX -= n),
          (N.current.pendingY -= i),
          (A.current.x += n),
          (A.current.y += i),
          G(),
          (N.current.frame = requestAnimationFrame(r)));
      };
      N.current.frame = requestAnimationFrame(r);
    },
    [G, Y, q, Nt, E, Pt, n.height],
  );
  (0, f.useEffect)(() => {
    let e = D.current;
    if (e)
      return (
        e.addEventListener(`wheel`, Yt, { passive: !1 }),
        () => e.removeEventListener(`wheel`, Yt)
      );
  }, [e, Yt]);
  let Xt = (0, f.useCallback)(
      (e) => {
        if (!(E || e.button !== 0)) {
          if ((e.ctrlKey || e.metaKey) && !I.current) {
            e.preventDefault();
            let t = {
              pointerId: e.pointerId,
              startX: e.screenX,
              startY: e.screenY,
              dragged: !1,
            };
            ((it.current = t),
              D.current?.setPointerCapture?.(e.pointerId),
              C({
                type: `photo-wall:window-move-start`,
                screenX: e.screenX,
                screenY: e.screenY,
              }));
          } else
            I.current ||
              P.current ||
              (q(),
              K(),
              Nt(),
              Y(),
              (rt.current = {
                pointerId: e.pointerId,
                startX: e.clientX,
                startY: e.clientY,
                originX: A.current.x,
                originY: A.current.y,
                lastX: e.clientX,
                lastY: e.clientY,
                lastTime: e.timeStamp,
                velocity: 0,
                dragged: !1,
              }));
        }
      },
      [Y, q, K, Nt, E],
    ),
    Zt = (0, f.useCallback)(
      (e) => {
        let t = it.current;
        if (t && t.pointerId === e.pointerId) {
          (!t.dragged &&
            Math.hypot(e.screenX - t.startX, e.screenY - t.startY) > se &&
            (t.dragged = !0),
            t.dragged &&
              C({
                type: `photo-wall:window-move`,
                screenX: e.screenX,
                screenY: e.screenY,
              }));
          return;
        }
        let n = rt.current;
        if (!n || n.pointerId !== e.pointerId || I.current) return;
        let r = e.clientX - n.lastX,
          i = e.clientY - n.lastY,
          a = Math.max(1, e.timeStamp - n.lastTime);
        ((n.lastX = e.clientX),
          (n.lastY = e.clientY),
          (n.lastTime = e.timeStamp),
          !n.dragged &&
            Math.hypot(e.clientX - n.startX, e.clientY - n.startY) > se &&
            ((n.dragged = !0),
            (at.current = !0),
            D.current?.setPointerCapture?.(e.pointerId)),
          (n.velocityX = (r / a) * 1e3),
          (n.velocityY = (-i / a) * 1e3),
          (A.current.x = n.originX + e.clientX - n.startX),
          (A.current.y = n.originY + n.startY - e.clientY),
          G());
      },
      [G],
    ),
    Qt = (0, f.useCallback)(
      (e) => {
        let t = it.current;
        if (t && t.pointerId === e.pointerId) {
          it.current = null;
          try {
            D.current?.releasePointerCapture?.(e.pointerId);
          } catch {}
          C({ type: `photo-wall:window-move-end` });
          return;
        }
        let n = rt.current;
        if (!n || n.pointerId !== e.pointerId) return;
        rt.current = null;
        try {
          D.current?.releasePointerCapture?.(e.pointerId);
        } catch {}
        if (
          (n.dragged &&
            setTimeout(() => {
              at.current = !1;
            }, 0),
          !n.dragged ||
            e.timeStamp - n.lastTime > 80 ||
            Math.min(3600, Math.hypot(n.velocityX || 0, n.velocityY || 0)) < 35)
        )
          return;
        q();
        let r = {
            frame: 0,
            velocityX: n.velocityX,
            velocityY: n.velocityY,
            lastTime: performance.now(),
          },
          i = (e) => {
            if (M.current !== r) return;
            let t = Math.min(50, Math.max(0, e - r.lastTime));
            r.lastTime = e;
            let n = Math.exp(-t / 280);
            ((r.velocityX *= n),
              (r.velocityY *= n),
              (A.current.x += (r.velocityX * t) / 1e3),
              (A.current.y += (r.velocityY * t) / 1e3),
              G(),
              Math.hypot(r.velocityX, r.velocityY) < 8
                ? (M.current.frame = 0)
                : (r.frame = requestAnimationFrame(i)));
          };
        ((M.current = r), (r.frame = requestAnimationFrame(i)));
      },
      [G, q],
    ),
    $t = (0, f.useMemo)(() => {
      let e = A.current.y,
        t = e + n.height,
        r = -A.current.x,
        i = r + n.width,
        a = Math.min(j.current.top, e - n.height),
        o = Math.max(j.current.bottom, t + n.height),
        s = Math.min(j.current.left, r - n.width),
        c = Math.max(j.current.right, i + n.width),
        l = He(k.current, e, t, r, i),
        u = He(k.current, a, o, s, c),
        d = [...l],
        f = new Set(l.map((e) => e.key));
      for (let e of u)
        if (!f.has(e.key) && (d.push(e), f.add(e.key), d.length >= ie)) break;
      let p = qe(k.current, T, n.height),
        v = d.map((e) => {
        let t = p.rects.get(e.key);
        return t ? { ...e, ...t } : e;
      });
      return { cards: v, backdrop: T ? l : [] };
    }, [T, g, n.height, n.width]);
  return e
    ? U.length
      ? (0, p.jsxs)(`main`, {
          className: `photo-wall-app pw-masonry-app${x ? ` is-wallpaper-mode` : ``}${S ? ` is-wallpaper-idle` : ``}${y ? ` is-revealing` : ``}${ne ? ` is-reveal-pending` : ``}${T ? ` has-focused-card` : ``}`,
          "data-wallpaper-mode": String(x),
          "data-cruise-direction": e.wallpaperCruiseDirection || `timed`,
          style: {
            "--pw-focus-motion-ms": `${ye}ms`,
            "--pw-focus-motion-ease": xe,
          },
          children: [
            (0, p.jsxs)(`div`, {
              className: `photo-wall-atmosphere`,
              "aria-hidden": `true`,
              children: [
                b.previous &&
                  (0, p.jsx)(
                    `img`,
                    {
                      className: `is-previous`,
                      src: b.previous,
                      alt: ``,
                      draggable: `false`,
                      decoding: `async`,
                    },
                    `previous-${b.version}`,
                  ),
                b.current &&
                  (0, p.jsx)(
                    `img`,
                    {
                      className: `is-current`,
                      src: b.current,
                      alt: ``,
                      draggable: `false`,
                      decoding: `async`,
                    },
                    `current-${b.version}`,
                  ),
              ],
            }),
            (0, p.jsx)(`div`, {
              ref: D,
              className: `photo-wall-field pw-masonry-field${x ? ` is-wallpaper-mode` : ``}`,
              onPointerDown: Xt,
              onPointerMove: Zt,
              onPointerUp: (e) => Qt(e),
              onPointerCancel: (e) => Qt(e),
              onClick: (e) => {
                (e.target === e.currentTarget ||
                  e.target.classList.contains(`pw-masonry-world`) ||
                  e.target.classList.contains(`pw-masonry-scene`)) &&
                  X(null);
              },
              children: (0, p.jsx)(`div`, {
                className: `pw-masonry-scene${Qe ? ` is-handoff-${Qe}` : ``}`,
                children: (0, p.jsx)(`div`, {
                  ref: O,
                  className: `photo-wall-world pw-masonry-world`,
                  "data-masonry-world": !0,
                  children: [
                    $t.backdrop.map((t) =>
                      (0, p.jsx)(
                        Je,
                        {
                          card: t,
                          entering: !1,
                          focused: !1,
                          interactive: !1,
                          motionDuration: 0,
                          revealDelay: 0,
                          backdrop: !0,
                        },
                        `focus-anchor:${t.key}`,
                      ),
                    ),
                    $t.cards.map((t, n) =>
                      (0, p.jsx)(
                        Je,
                        {
                          card: t,
                          entering: y,
                          focused: T?.key === t.key,
                          onSelect: Vt,
                          interactive: !x && !Qe,
                          motionDuration: W ? 0 : ye,
                          revealDelay: Math.round(
                            n * 30 +
                              Me(e.masonrySeed || 1, t.column, t.ordinal) * 70,
                          ),
                        },
                        t.key,
                      ),
                    ),
                  ],
                }),
              }),
            }),
            (0, p.jsx)(`div`, {
              className: `photo-wall-back-zone${Ct ? ` is-visible` : ``}`,
              children: (0, p.jsx)(`button`, {
                type: `button`,
                className: `photo-wall-back${Ct ? ` is-visible` : ``}`,
                "aria-label": x
                  ? `退出壁纸模式`
                  : T
                    ? `收起聚焦照片并退出纵向画廊`
                    : `退出纵向画廊`,
                onFocus: () => Le(!0),
                onClick: Bt,
                children: (0, p.jsx)(`svg`, {
                  viewBox: `0 0 16 24`,
                  fill: `none`,
                  stroke: `currentColor`,
                  strokeWidth: `2.2`,
                  strokeLinecap: `round`,
                  strokeLinejoin: `round`,
                  "aria-hidden": `true`,
                  children: (0, p.jsx)(`path`, { d: `m12 3.5-8 8.5 8 8.5` }),
                }),
              }),
            }),
            (0, p.jsxs)(`div`, {
              className: `photo-wall-wallpaper-zone${wt ? ` is-visible` : ``}`,
              children: [
                (0, p.jsx)(`button`, {
                  type: `button`,
                  className: `photo-wall-tools-button photo-wall-focus-button${Tt ? ` is-visible` : ``}`,
                  "data-focus-mode": w,
                  disabled: x,
                  tabIndex: x ? -1 : 0,
                  "aria-label":
                    w === `center`
                      ? `当前居中聚焦，切换为让位聚焦`
                      : `当前让位聚焦，切换为居中聚焦`,
                  onClick: Ht,
                  children:
                    w === `center`
                      ? (0, p.jsxs)(`svg`, {
                          viewBox: `0 0 22 22`,
                          fill: `none`,
                          stroke: `currentColor`,
                          strokeWidth: `1.5`,
                          "aria-hidden": `true`,
                          children: [
                            (0, p.jsx)(`rect`, {
                              x: `3`,
                              y: `3`,
                              width: `16`,
                              height: `16`,
                              rx: `3`,
                            }),
                            (0, p.jsx)(`rect`, {
                              x: `8`,
                              y: `8`,
                              width: `6`,
                              height: `6`,
                              rx: `1.3`,
                            }),
                            (0, p.jsx)(`path`, {
                              d: `M11 1.8v2M11 18.2v2M1.8 11h2M18.2 11h2`,
                            }),
                          ],
                        })
                      : (0, p.jsxs)(`svg`, {
                          viewBox: `0 0 22 22`,
                          fill: `none`,
                          stroke: `currentColor`,
                          strokeWidth: `1.5`,
                          "aria-hidden": `true`,
                          children: [
                            (0, p.jsx)(`path`, {
                              d: `M4 7V4h3M15 4h3v3M18 15v3h-3M7 18H4v-3`,
                            }),
                            (0, p.jsx)(`rect`, {
                              x: `8`,
                              y: `8`,
                              width: `6`,
                              height: `6`,
                              rx: `1.3`,
                            }),
                          ],
                        }),
                }),
                (0, p.jsx)(`button`, {
                  type: `button`,
                  className: `photo-wall-tools-button photo-wall-wallpaper-button${wt ? ` is-visible` : ``}`,
                  "data-wallpaper-mode": String(x),
                  "aria-label": x ? `关闭壁纸模式` : `打开壁纸模式`,
                  "aria-pressed": x,
                  onFocus: () => Be(!0),
                  onClick: Mt,
                  children: (0, p.jsx)(`svg`, {
                    viewBox: `0 0 22 22`,
                    "aria-hidden": `true`,
                    style: { overflow: `visible` },
                    children: (0, p.jsx)(`path`, {
                      d: `M3.5 6.1 6.5 16l4.5-7.8 4.5 7.8 3-9.9`,
                    }),
                  }),
                }),
              ],
            }),
          ],
        })
      : (0, p.jsx)(`main`, {
          className: `photo-wall-empty`,
          "aria-label": `没有可显示的照片`,
          children: (0, p.jsx)(`span`, { children: `没有可显示的照片` }),
        })
    : (0, p.jsx)(`main`, {
        className: `photo-wall-loading`,
        "aria-hidden": `true`,
      });
}
export { Ye as default };
