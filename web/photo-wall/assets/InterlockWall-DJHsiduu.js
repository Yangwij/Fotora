import { i as e, r as t, t as n } from "./index-eYugSr6J.js";
import {
  gapCompensation,
  n as r,
} from "./layoutConstants-nNzqxgbJ.js";
import {
  a as i,
  i as a,
  n as o,
  o as s,
  r as c,
  s as revealSchedule,
} from "./wallTransition-D4nOEmCV.js";
import { t as l } from "./wallpaperSpeed-DyUTxP__.js";
var u = e(t()),
  d = n(),
  f = 2048,
  p = 1536,
  ee = 1200,
  m = 960,
  h = 8,
  te = 74,
  ne = 180,
  re = 6,
  ie = 3600,
  g = `folia-interlock-assignments-v2:`,
  ae = 6e3,
  oe = 0.7,
  se = 1.8,
  ce = 7,
  le = 40,
  ue = 4e3,
  de = 0.3,
  fe = 280,
  pe = 0.5,
  me = 80,
  he = 120,
  ge = 520,
  _e = 56,
  ve = 650,
  ye = -28,
  be = 1.16,
  xe = 12,
  Se = 80,
  Ce = 2e3,
  we = 132,
  Te = 1400,
  Ee = 1500,
  De = 1200,
  Oe = 15,
  _ = Object.freeze({
    up: { x: 0, y: -1 },
    down: { x: 0, y: 1 },
    left: { x: -1, y: 0 },
    right: { x: 1, y: 0 },
    "up-right": { x: Math.SQRT1_2, y: -Math.SQRT1_2 },
    "down-right": { x: Math.SQRT1_2, y: Math.SQRT1_2 },
    "up-left": { x: -Math.SQRT1_2, y: -Math.SQRT1_2 },
    "down-left": { x: -Math.SQRT1_2, y: Math.SQRT1_2 },
  });
function ke(e) {
  let t = Number(e?.wallpaperCruiseSeconds);
  return Number.isFinite(t) && t >= 10 && t <= 60 ? t : Oe;
}
function Ae(e) {
  let t = String(e?.wallpaperCruiseDirection || ``);
  return Object.hasOwn(_, t) ? _[t] : null;
}
function je(e) {
  return e * e * (3 - 2 * e);
}
function Me(e) {
  if (!e) return ``;
  try {
    let t = new URL(e, window.location.href);
    if (t.pathname.includes(`/api/mosaic-wall/thumb/`))
      return (t.searchParams.set(`size`, `96`), `${t.pathname}${t.search}`);
  } catch {}
  return e;
}
var v = new Set(),
  y = new Set(),
  Ne = [],
  b = 0;
function x(e) {
  for (v.delete(e), v.add(e); v.size > ie;) {
    let e = v.values().next().value;
    if (e === void 0) break;
    v.delete(e);
  }
}
function Pe(stopped = !1) {
  if (stopped) {
    Ne = [];
    return;
  }
  for (; b < re && Ne.length;) {
    let e = Ne.shift();
    if (!e || v.has(e) || y.has(e)) continue;
    (y.add(e), (b += 1));
    let t = new Image();
    t.decoding = `async`;
    let n = () => {
      (y.delete(e), x(e), (b = Math.max(0, b - 1)), Pe());
    };
    ((t.onload = () => {
      typeof t.decode == `function`
        ? t
            .decode()
            .catch(() => {})
            .finally(n)
        : n();
    }),
      (t.onerror = n),
      (t.src = e));
  }
}
function Fe(e) {
  let t = [...new Set(e)]
    .filter((e) => e && !v.has(e) && !y.has(e))
    .slice(0, 96);
  t.length && ((Ne = [...t, ...Ne.filter((e) => !t.includes(e))]), Pe());
}
function Ie(e, t, n) {
  let r = 2166136261;
  for (let e of n) {
    let t = `${e.id}:${Number(e.aspect || 1).toFixed(4)}|`;
    for (let e = 0; e < t.length; e += 1)
      r = Math.imul(r ^ t.charCodeAt(e), 16777619);
  }
  return `${g}${e >>> 0}:${t}:${n.length}:${r >>> 0}`;
}
function Le(e) {
  if (!e) return new Map();
  try {
    let t = JSON.parse(sessionStorage.getItem(e) || `null`);
    return Array.isArray(t?.entries)
      ? new Map(t.entries.slice(0, ae))
      : new Map();
  } catch {
    return new Map();
  }
}
function Re(e, t) {
  if (!e || !t.size) return;
  let n = [...t.entries()].slice(-6e3);
  try {
    sessionStorage.setItem(e, JSON.stringify({ entries: n }));
  } catch {}
}
function ze(e) {
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
function Be(e, t, n) {
  return Math.max(t, Math.min(n, e));
}
function Ve(e, t = 0) {
  let n = t >>> 0;
  for (let t = 0; t < e.length; t += 1)
    n = Math.imul(n ^ e.charCodeAt(t), 16777619);
  return n >>> 0;
}
function He(e) {
  return e < 0.5 ? 4 * e ** 3 : 1 - (-2 * e + 2) ** 3 / 2;
}
function S(e) {
  return Math.round(e / h) * h;
}
function C(e, t, n, r) {
  if (t <= 1) return [e];
  let i = [e],
    a = 0;
  for (; i.length < t;) {
    let e = -1,
      t = -1;
    if (
      (i.forEach((n, i) => {
        if (n.w < r * 2 || n.h < r * 2) return;
        let a = n.w * n.h * (1 + Math.abs(Math.log(n.w / n.h)) * 0.38);
        a > t && ((t = a), (e = i));
      }),
      e < 0)
    )
      break;
    let o = i[e],
      s = o.w >= o.h,
      c = s ? o.w : o.h,
      l = Math.min(0.34, (r + h) / c),
      u = Be(0.42 + ze(n ^ Math.imul(a + 1, 2654435761)) * 0.16, l, 1 - l),
      d = s ? o.x : o.y,
      f = Be(S(d + c * u), d + r, d + c - r);
    if (f - d < r || d + c - f < r) break;
    let p = s ? { ...o, w: f - d } : { ...o, h: f - d },
      ee = s ? { ...o, x: f, w: d + o.w - f } : { ...o, y: f, h: d + o.h - f };
    (i.splice(e, 1, p, ee), (a += 1));
  }
  return i;
}
function Ue(e, t) {
  let n = Array.from({ length: e }, (e, t) => t);
  for (let e = n.length - 1; e > 0; --e) {
    let r = Math.floor(ze(t ^ Math.imul(e + 1, 668265261)) * (e + 1));
    [n[e], n[r]] = [n[r], n[e]];
  }
  return n;
}
function We(e, t, n, r) {
  let i =
      ze(
        n ^ Math.imul(e + 65536, 2654435761) ^ Math.imul(t + 65536, 2246822507),
      ) * 4294967295,
    a = 5 + Math.floor(ze(i ^ 19057) * 4),
    o = C({ x: e * f, y: t * p, w: f, h: p }, a, i, ne),
    s = [];
  return (
    o.forEach((n, a) => {
      C(
        n,
        Be(Math.round((n.w * n.h) / 36500), 3, 11),
        i ^ Math.imul(a + 1, 668265261),
        te,
      ).forEach((n, i) => {
        s.push({
          key: `${e}:${t}:${a}:${i}`,
          blockColumn: e,
          blockRow: t,
          x: n.x + r / 2,
          y: n.y + r / 2,
          width: Math.max(1, n.w - r),
          height: Math.max(1, n.h - r),
        });
      });
    }),
    s
  );
}
function Ge(e, t, n) {
  let r = Math.max(ee, m / Math.max(0.01, e.zoom)),
    i = -e.x / e.zoom - r,
    a = (t - e.x) / e.zoom + r,
    o = -e.y / e.zoom - r,
    s = (n - e.y) / e.zoom + r;
  return {
    fromColumn: Math.floor(i / f),
    toColumn: Math.floor(a / f),
    fromRow: Math.floor(o / p),
    toRow: Math.floor(s / p),
  };
}
function Ke(e, t) {
  return (
    !!(e && t) &&
    e.fromColumn === t.fromColumn &&
    e.toColumn === t.toColumn &&
    e.fromRow === t.fromRow &&
    e.toRow === t.toRow
  );
}
function qe(e) {
  window.parent.postMessage(e, window.location.origin);
}
function Je(e, t) {
  return Math.abs(Math.log(e.width / e.height / (Number(t.aspect) || 1)));
}
function Ye({ card: e, focused: t, interactive: n, onSelect: r }) {
  let i = e.item.src,
    a = Me(i),
    itemId = e.item.id,
    [detailReadyItemId, setDetailReadyItemId] = (0, u.useState)(null),
    [baseLoadedItemId, setBaseLoadedItemId] = (0, u.useState)(null),
    [previewSrc, setPreviewSrc] = (0, u.useState)(a),
    [decodedPreviewSrc, setDecodedPreviewSrc] = (0, u.useState)(a),
    c = t && e.item.large && e.item.large !== i ? e.item.large : ``,
    baseLoaded = baseLoadedItemId === itemId;
  (0, u.useEffect)(() => {
    if (!a) return;
    let cancelled = !1,
      image = new Image();
    const commit = () => {
      if (!cancelled)
        setDecodedPreviewSrc(a);
    };
    const ready = () => {
      if (!image.naturalWidth) return;
      typeof image.decode == `function` ? image.decode().then(commit, commit) : commit();
    };
    ((image.decoding = `async`),
      (image.onload = ready),
      (image.onerror = () => {}),
      (image.src = a));
    return () => {
      ((cancelled = !0), (image.onload = null), (image.onerror = null));
    };
  }, [a]);
  (0, u.useEffect)(() => {
    baseLoaded && decodedPreviewSrc === a && setPreviewSrc(a);
  }, [a, baseLoaded, decodedPreviewSrc]);
  (0, u.useEffect)(() => {
    if (!t || !c) return;
    let e = window.setTimeout(
      () => setDetailReadyItemId(itemId),
      window.matchMedia(`(prefers-reduced-motion: reduce)`).matches ? 0 : ge + 40,
    );
    return () => window.clearTimeout(e);
  }, [t, c, itemId]);
  let f = t && detailReadyItemId === itemId ? c : ``;
  return (0, d.jsxs)(`button`, {
    type: `button`,
    className: `pw-interlock-card${t ? ` is-focused` : ``}`,
    "data-card-key": e.key,
    "data-item-id": e.item.id,
    "data-item-ratio": e.item.ratioKey || ``,
    "data-base-loaded": String(baseLoaded),
    "aria-label": `聚焦照片，${e.item.title || ``}`,
    style: {
      left: `calc(${e.x}px - var(--pw-camera-gap-extra, 0px))`,
      top: `calc(${e.y}px - var(--pw-camera-gap-extra, 0px))`,
      width: `calc(${e.width}px + var(--pw-camera-gap-extra, 0px) + var(--pw-camera-gap-extra, 0px))`,
      height: `calc(${e.height}px + var(--pw-camera-gap-extra, 0px) + var(--pw-camera-gap-extra, 0px))`,
      zIndex: t ? 30 : 2,
    },
    onClick: (t) => {
      (t.stopPropagation(), n && r(e));
    },
    tabIndex: n ? 0 : -1,
    children: [
      (0, d.jsx)(`img`, {
        className: `pw-interlock-card-preview`,
        src: previewSrc,
        alt: ``,
        draggable: `false`,
        decoding: `async`,
        loading: `eager`,
        fetchPriority: `high`,
        onLoad: (e) => e.currentTarget.classList.add(`is-loaded`),
        onError: (e) => e.currentTarget.classList.add(`is-failed`),
      }),
      (0, d.jsx)(`img`, {
        key: `base:${itemId}`,
        className: `pw-interlock-card-base`,
        src: i,
        alt: ``,
        draggable: `false`,
        decoding: `async`,
        loading: `lazy`,
        fetchPriority: `low`,
        onLoad: (e) => {
          let t = e.currentTarget,
            n = () => {
              t.isConnected &&
                (t.classList.remove(`is-failed`),
                t.classList.add(`is-loaded`),
                setBaseLoadedItemId(itemId));
            };
          typeof t.decode == `function` ? t.decode().then(n, n) : n();
        },
        onError: (e) => {
          (e.currentTarget.classList.remove(`is-loaded`),
            e.currentTarget.classList.add(`is-failed`),
            setBaseLoadedItemId(null));
        },
      }),
      f
        ? (0, d.jsx)(`img`, {
            key: `detail:${itemId}`,
            className: `pw-interlock-card-detail`,
            src: f,
            alt: ``,
            "aria-hidden": `true`,
            draggable: `false`,
            decoding: `async`,
            onLoad: (e) => {
              let t = e.currentTarget,
                n = () => {
                  t.isConnected &&
                    (t.classList.remove(`is-failed`),
                    t.classList.add(`is-loaded`));
                };
              typeof t.decode == `function` ? t.decode().then(n, n) : n();
            },
            onError: (e) => {
              (e.currentTarget.classList.remove(`is-loaded`),
                e.currentTarget.classList.add(`is-failed`));
            },
          })
        : null,
    ],
  });
}
var CameraCard = (0, u.memo)(
  Ye,
  (e, t) =>
    e.card === t.card &&
    e.focused === t.focused &&
    e.interactive === t.interactive,
);
function Xe() {
  let [e, t] = (0, u.useState)(null),
    [n, f] = (0, u.useState)(() => ({
      width: Math.max(1, window.innerWidth),
      height: Math.max(1, window.innerHeight),
    })),
    [p, ee] = (0, u.useState)(() => {
      let e = { x: 0, y: ye, zoom: be };
      return { ...e, ...Ge(e, n.width, n.height) };
    }),
    [m, h] = (0, u.useState)(null),
    [te, ne] = (0, u.useState)(!1),
    [re, ie] = (0, u.useState)(!0),
    [g, ae] = (0, u.useState)(!1),
    [Oe, _] = (0, u.useState)(!1),
    [v, y] = (0, u.useState)(!1),
    [Ne, b] = (0, u.useState)(!1),
    [x, Pe] = (0, u.useState)(!1),
    S = (0, u.useRef)(null),
    C = (0, u.useRef)(null),
    Xe = (0, u.useRef)(e),
    Qe = (0, u.useRef)(null),
    w = (0, u.useRef)(!1),
    cameraGapTimer = (0, u.useRef)(0),
    cameraGapValue = (0, u.useRef)(``),
    viewportBounds = (0, u.useRef)(null),
    viewportZoom = (0, u.useRef)(0),
    cameraSettling = (0, u.useRef)(!1),
    zoomFrame = (0, u.useRef)(0),
    zoomTarget = (0, u.useRef)(be),
    zoomLastTime = (0, u.useRef)(0),
    T = (0, u.useRef)({ x: 0, y: ye, zoom: be }),
    E = (0, u.useRef)(0),
    D = (0, u.useRef)({ pendingX: 0, pendingY: 0, frame: 0, lastTime: null }),
    $e = (0, u.useRef)(0),
    O = (0, u.useRef)(0),
    et = (0, u.useRef)(null),
    k = (0, u.useRef)(0),
    A = (0, u.useRef)(n),
    j = (0, u.useRef)(m),
    M = (0, u.useRef)(0),
    N = (0, u.useRef)(!1),
    tt = (0, u.useRef)(new Map()),
    P = (0, u.useRef)(new Map()),
    nt = (0, u.useRef)(``),
    rt = (0, u.useRef)(0),
    F = (0, u.useRef)(!1),
    I = (0, u.useRef)(!1),
    it = (0, u.useRef)(!1),
    at = (0, u.useRef)(!1),
    L = (0, u.useRef)(0),
    R = (0, u.useRef)(null),
    z = (0, u.useRef)(null),
    B = (0, u.useRef)([]),
    ot = (0, u.useRef)(!1),
    st = (0, u.useRef)(new Set()),
    ct = (0, u.useRef)(0),
    lt = (0, u.useRef)(new Set());
  ((A.current = n), (j.current = m), (F.current = g), (Xe.current = e));
  let V = (0, u.useMemo)(() => r(n.width), [n.width]),
    H = (0, u.useMemo)(
      () =>
        Array.isArray(e?.items)
          ? e.items.filter((e) => e.kind === `photo`)
          : [],
      [e],
    ),
    ut = Number(e?.interlockSeed) || Number(e?.mosaicSeed) || 1,
    dt = (0, u.useMemo)(() => Ie(ut, V, H), [V, H, ut]);
  (nt.current !== dt && ((nt.current = dt), (P.current = Le(dt))),
    (0, u.useEffect)(() => {
      let e = () => {
        let e = {
            width: Math.max(1, S.current?.clientWidth || window.innerWidth),
            height: Math.max(1, S.current?.clientHeight || window.innerHeight),
          },
          t = A.current;
        if (t.width > 1 && t.height > 1) {
          ((k.current &&= (cancelAnimationFrame(k.current), 0)),
            (cameraSettling.current = !1),
            (O.current &&= (cancelAnimationFrame(O.current), 0)));
          let n = T.current,
            r = {
              ...n,
              x: n.x + (e.width - t.width) / 2,
              y: n.y + (e.height - t.height) / 2,
            };
          ((T.current = r),
            C.current &&
              (C.current.style.transform = `translate3d(${r.x.toFixed(2)}px, ${r.y.toFixed(2)}px, 0) scale(${r.zoom})`),
            ee({ ...r, ...Ge(r, e.width, e.height) }));
        }
        ((A.current = e), f(e));
      };
      return (
        e(),
        window.addEventListener(`resize`, e),
        () => window.removeEventListener(`resize`, e)
      );
    }, []));
  let U = (0, u.useCallback)(() => {
      for (let e of B.current)
        try {
          e.cancel();
        } catch {}
      B.current = [];
    }, []),
    ft = (0, u.useCallback)(() => {
      let e = S.current;
      if (!e) return [];
      let t = e.getBoundingClientRect(),
        n = [...e.querySelectorAll(`.pw-interlock-card`)].filter((e) => {
          let t = e.getBoundingClientRect();
          return (
            t.right > 0 &&
            t.left < A.current.width &&
            t.bottom > 0 &&
            t.top < A.current.height
          );
        }),
        r = n
          .map((e) => e.getBoundingClientRect().width)
          .filter((e) => e > 0)
          .sort((e, t) => e - t),
        a = r[Math.floor(r.length / 2)] || 195,
        o = s(a, V);
      return n.map((e) => {
        let n = e.getBoundingClientRect();
        return { node: e, key: e.dataset.cardKey || ``, delay: i(n, t, o) };
      });
    }, [V]);
  ((0, u.useEffect)(() => {
    tt.current.clear();
  }, [V, ut]),
    (0, u.useEffect)(
      () => () => {
        (window.clearTimeout(M.current),
          (N.current = !1),
          U(),
          Re(nt.current, P.current));
      },
      [U],
    ));
  let pt = (0, u.useMemo)(() => {
    if (!H.length) return [];
    let e = [];
    for (let t = p.fromRow; t <= p.toRow; t += 1)
      for (let n = p.fromColumn; n <= p.toColumn; n += 1) {
        let r = `${n}:${t}`,
          i = tt.current.get(r);
        i || ((i = We(n, t, ut, V)), tt.current.set(r, i));
        let a = Ve(r, ut ^ 1374496523),
          o = Ue(H.length, a),
          s = new Set(),
          c = [...i].sort(
            (e, t) =>
              t.width * t.height - e.width * e.height ||
              e.key.localeCompare(t.key),
          );
        for (let t = 0; t < c.length; t += 1) {
          let n = c[t],
            r = P.current.get(n.key),
            i = H.length >= c.length;
          if (
            !Number.isInteger(r) ||
            r < 0 ||
            r >= H.length ||
            (i && s.has(r))
          ) {
            let e = Math.floor(ze(a ^ Math.imul(t + 1, 2654435761)) * H.length),
              c = -1,
              l = 1 / 0;
            for (let t = 0; t < H.length; t += 1) {
              let r = o[(e + t) % H.length];
              if (i && s.has(r)) continue;
              let a = Je(n, H[r]) + t * 4e-4;
              a < l && ((c = r), (l = a));
            }
            ((r = c >= 0 ? c : o[e % H.length]), P.current.set(n.key, r));
          }
          (s.add(r),
            e.push({ ...n, index: e.length, item: H[r], itemIndex: r }));
        }
      }
    return e;
  }, [V, H, p.fromColumn, p.fromRow, p.toColumn, p.toRow, ut]);
  ((0, u.useEffect)(
    () => (
      clearTimeout(rt.current),
      (rt.current = window.setTimeout(() => {
        ((rt.current = 0), Re(nt.current, P.current));
      }, 500)),
      () => clearTimeout(rt.current)
    ),
    [dt, pt],
  ),
    (0, u.useEffect)(() => {
      let e = n.width / 2,
        t = n.height / 2,
        r = new Map(),
        i = (e, t) => {
          let n = r.get(e);
          (!n || t < n.distance) && r.set(e, { source: e, distance: t });
        };
      for (let n of pt) {
        let r = n.item?.src;
        if (!r) continue;
        let a = n.x * p.zoom + p.x,
          o = n.y * p.zoom + p.y,
          s = Math.hypot(
            a + (n.width * p.zoom) / 2 - e,
            o + (n.height * p.zoom) / 2 - t,
          );
        i(Me(r), s);
      }
      for (let e of H) {
        if (!e?.src) continue;
        let t = Me(e.src);
        r.has(t) || i(t, 1 / 0);
      }
      Fe(
        [...r.values()]
          .sort((e, t) => e.distance - t.distance)
          .map(({ source: e }) => e),
      );
    }, [pt, H, p.x, p.y, p.zoom, n.height, n.width]));
  let mt = (0, u.useCallback)(
      async ({ supplemental: e = !1 } = {}) => {
        let t = S.current;
        if (!t) return;
        e || U();
        let n = ct.current,
          r = window.matchMedia(`(prefers-reduced-motion: reduce)`).matches,
          i = revealSchedule(
            ft().filter(({ key: e }) => !lt.current.has(e)),
            900,
          );
        if (!i.length || r) {
          if (r) for (let { key: e } of i) lt.current.add(e);
          if (e) return;
          (ne(!0), ie(!1), qe({ type: `photo-wall:reveal-start` }));
          return;
        }
        for (let { node: e } of i)
          ((e.style.opacity = `0`),
            (e.style.transform = `translate3d(0, -68px, 0) scale(0.88)`));
        let s = t.getBoundingClientRect(),
          c = { x: s.width / 2, y: s.height / 2 },
          l = i.map(({ node: e }) => e);
        if (
          (await a(l, {
            timeoutMs: 4000,
          }),
          !t.isConnected ||
            n !== ct.current ||
            (await new Promise((e) =>
              requestAnimationFrame(() => requestAnimationFrame(e)),
            ),
            !t.isConnected || n !== ct.current))
        )
          return;
        e || (ne(!0), ie(!1));
        let u = [];
        for (let { node: e, delay: t } of i) {
          if (!e.isConnected) continue;
          let n = e.dataset.cardKey || ``;
          lt.current.has(n) ||
            (lt.current.add(n),
            u.push(e),
            B.current.push(
              e.animate(
                [
                  { opacity: 0 },
                  { opacity: 0.36, offset: 0.42 },
                  { opacity: 1 },
                ],
                { duration: 240, delay: t, easing: `ease-out`, fill: `both` },
              ),
            ),
            B.current.push(
              e.animate(o, {
                duration: 583,
                delay: t,
                easing: `linear`,
                fill: `both`,
              }),
            ));
        }
        (e || qe({ type: `photo-wall:reveal-start` }),
          Promise.allSettled(B.current.map((e) => e.finished)).then(() => {
            if (t.isConnected && !ot.current) {
              for (let e of u)
                e.isConnected &&
                  (e.style.removeProperty(`opacity`),
                  e.style.removeProperty(`transform`));
              e || ne(!1);
            }
          }));
      },
      [U, ft],
    ),
    ht = (0, u.useCallback)(() => {
      Re(nt.current, P.current);
      let e = revealSchedule(ft(), 600),
        t = () => qe({ type: `photo-wall:exit-animation-complete` });
      if (
        !e.length ||
        window.matchMedia(`(prefers-reduced-motion: reduce)`).matches
      ) {
        U();
        let e = document.querySelector(`.photo-wall-atmosphere`);
        (e && (e.style.opacity = `0`), Pe(!0), requestAnimationFrame(t));
        return;
      }
      let n = e.map(({ node: e, delay: t }) => {
        let n = getComputedStyle(e);
        return {
          node: e,
          delay: t,
          opacity: Number(n.opacity),
          transform: n.transform,
        };
      });
      (U(),
        (st.current = new Set(
          n.map(({ node: e }) => e.dataset.cardKey || ``).filter(Boolean),
        )));
      let r = Math.max(...e.map(({ delay: e }) => e), 0),
        i = [],
        a = document.querySelector(`.photo-wall-atmosphere`);
      (a &&
        i.push(
          a.animate([{ opacity: 1 }, { opacity: 0 }], {
            duration: 200,
            easing: `ease-in`,
            fill: `forwards`,
          }),
        ),
        Pe(!0));
      for (let e of n) {
        let t = r - e.delay;
        i.push(
          e.node.animate([{ opacity: e.opacity }, { opacity: 0 }], {
            duration: 200,
            delay: t,
            easing: `ease-in`,
            fill: `both`,
          }),
        );
        let n = c.map((t, n) => ({
          ...t,
          transform: n === 0 ? e.transform : t.transform,
        }));
        i.push(
          e.node.animate(n, {
            duration: 200,
            delay: t,
            easing: `linear`,
            fill: `both`,
          }),
        );
      }
      ((B.current = i),
        Promise.allSettled(i.map((e) => e.finished)).then(t, t));
    }, [U, ft]);
  ((0, u.useEffect)(() => {
    let e = (e) => {
      if (e.origin === window.location.origin && e.source === window.parent) {
        if (e.data?.type === `photo-wall:init`)
          (U(),
            (R.current &&= (cancelAnimationFrame(R.current.frame), null)),
            (z.current &&= (cancelAnimationFrame(z.current), null)),
            clearTimeout(L.current),
            (L.current = 0),
            (F.current = !1),
            (I.current = !1),
            (it.current = !1),
            (at.current = !1),
            ae(!1),
            _(!1),
            y(!1),
            b(!1),
            C.current?.removeAttribute(`data-wallpaper-motion`),
            (k.current &&= (cancelAnimationFrame(k.current), 0)),
            (cameraSettling.current = !1),
            (ot.current = !1),
            tt.current.clear(),
            t(e.data.payload || null),
            (T.current = { x: 0, y: ye, zoom: be }),
            zoomFrame.current &&
              (cancelAnimationFrame(zoomFrame.current), (zoomFrame.current = 0)),
            (zoomTarget.current = be),
            (zoomLastTime.current = 0),
            ee({
              x: 0,
              y: ye,
              zoom: be,
              ...Ge(
                { x: 0, y: ye, zoom: be },
                A.current.width,
                A.current.height,
              ),
            }),
            h(null),
            (ct.current += 1),
            lt.current.clear(),
            st.current.clear(),
            ie(!0),
            ne(!1),
            Pe(!1));
        else if (e.data?.type === `photo-wall:exit-animation`) {
          if (
            (window.clearTimeout(M.current),
            (M.current = 0),
            (N.current = !1),
            ot.current)
          )
            return;
          ((ot.current = !0), ht());
        }
      }
    };
    return (
      window.addEventListener(`message`, e),
      qe({ type: `photo-wall:ready` }),
      () => {
        window.removeEventListener(`message`, e);
      }
    );
  }, [ht, U]),
    (0, u.useEffect)(() => {
      if (!e || !re) return;
      let t = !1,
        n = 0,
        r = 0;
      return (
        (n = requestAnimationFrame(() => {
          r = requestAnimationFrame(() => {
            t || mt();
          });
        })),
        () => {
          ((t = !0), cancelAnimationFrame(n), cancelAnimationFrame(r));
        }
      );
    }, [mt, e, re]),
    (0, u.useLayoutEffect)(() => {
      if (e && x)
        for (let { node: e, key: t } of ft())
          t &&
            !st.current.has(t) &&
            (st.current.add(t), (e.style.opacity = `0`));
    }, [e, x, p.x, p.y, p.zoom, n.height, n.width]));
  let W = (0, u.useCallback)(
      (e = T.current) => {
        T.current = e;
        let t = C.current;
        if (t) {
          t.style.transform = `translate3d(${e.x.toFixed(2)}px, ${e.y.toFixed(2)}px, 0) scale(${e.zoom})`;
          let n = `${gapCompensation(V, be, e.zoom).toFixed(3)}px`;
          if (n !== cameraGapValue.current) {
            cameraGapValue.current = n;
            (t.style.setProperty("--pw-camera-gap-extra", n),
              (t.dataset.cameraGapAdjusting = `true`),
              clearTimeout(cameraGapTimer.current),
              (cameraGapTimer.current = window.setTimeout(() => {
                t.removeAttribute(`data-camera-gap-adjusting`);
              }, 120)));
          }
        }
        if (!cameraSettling.current) {
          let n = Ge(e, A.current.width, A.current.height),
            r = Math.abs((viewportZoom.current || e.zoom) - e.zoom) > 1e-4;
          (!viewportBounds.current ||
            !Ke(viewportBounds.current, n) ||
            r) &&
            ((viewportBounds.current = n),
            (viewportZoom.current = e.zoom),
            et.current?.());
        }
      },
      [V],
    ),
    cameraGapSync = (0, u.useEffect)(() => {
      let world = C.current;
      if (world) {
        world.style.setProperty(
          "--pw-camera-gap-extra",
          `${gapCompensation(V, be, T.current.zoom).toFixed(3)}px`,
        );
      }
    }, [V]),
    G = (0, u.useCallback)(() => {
      ($e.current && window.clearTimeout($e.current),
        ($e.current = 0),
        O.current && cancelAnimationFrame(O.current),
        (O.current = 0));
    }, []),
    K = (0, u.useCallback)((e = T.current) => {
      let t = Ge(e, A.current.width, A.current.height);
      ee((n) =>
        Ke(n, t) && Math.abs(n.zoom - e.zoom) < 1e-4
          ? n
          : { x: e.x, y: e.y, zoom: e.zoom, ...t },
      );
    }, []);
  et.current = (0, u.useCallback)(() => {
    O.current ||= requestAnimationFrame(() => {
      ((O.current = 0), K());
    });
  }, [K]);
  let q = (0, u.useCallback)(() => {
      (k.current &&= (cancelAnimationFrame(k.current), 0),
        (cameraSettling.current = !1));
    }, []),
    gt = (0, u.useCallback)(
      (e) => {
        q();
        let t = { ...T.current },
          n = e.zoom ?? t.zoom,
          r =
            Math.hypot(e.x - t.x, e.y - t.y) < 0.5 &&
            Math.abs(n - t.zoom) < 1e-4,
          i = window.matchMedia(`(prefers-reduced-motion: reduce)`).matches;
        if (r || i) {
          ((cameraSettling.current = !1),
            W({ x: e.x, y: e.y, zoom: n }),
            K());
          return;
        }
        cameraSettling.current = !0;
        let a = performance.now(),
          o = (r) => {
            let i = Math.min(1, Math.max(0, (r - a) / ge)),
              s = He(i);
            (W({
              x: t.x + (e.x - t.x) * s,
              y: t.y + (e.y - t.y) * s,
              zoom: t.zoom + (n - t.zoom) * s,
            }),
              i < 1
                ? (k.current = requestAnimationFrame(o))
                : ((k.current = 0),
                  (cameraSettling.current = !1),
                  W({ x: e.x, y: e.y, zoom: n }),
                  K()));
          };
        k.current = requestAnimationFrame(o);
      },
      [W, q, K],
    ),
    J = (0, u.useCallback)(
      (e = he) => {
        (G(),
          ($e.current = window.setTimeout(() => {
            (($e.current = 0), K());
          }, e)));
      },
      [G, K],
    ),
    Y = (0, u.useCallback)(() => {
      (clearTimeout(L.current), (L.current = 0));
    }, []),
    _t = (0, u.useCallback)(() => {
      F.current &&
        ((L.current = 0),
        (I.current = !0),
        _(!0),
        (it.current = !1),
        (at.current = !1),
        y(!1),
        b(!1));
    }, []),
    vt = (0, u.useCallback)(() => {
      F.current &&
        (I.current && ((I.current = !1), _(!1)),
        Y(),
        (L.current = window.setTimeout(_t, Ce)));
    }, [Y, _t]),
    X = (0, u.useCallback)(() => {
      z.current &&= (cancelAnimationFrame(z.current), null);
    }, []),
    yt = (0, u.useCallback)(
      (e, t) => {
        if ((X(), Math.hypot(e, t) < 0.5)) return;
        let n = performance.now(),
          r = n,
          i = (a) => {
            let o = Math.min(0.05, Math.max(0, (a - r) / 1e3));
            r = a;
            let s = Math.min(1, (a - n) / De),
              c = 1 - je(s);
            ((T.current = {
              ...T.current,
              x: T.current.x + e * c * o,
              y: T.current.y + t * c * o,
            }),
              W(),
              s < 1
                ? (z.current = requestAnimationFrame(i))
                : ((z.current = null), K()));
          };
        z.current = requestAnimationFrame(i);
      },
      [W, X, K],
    ),
    Z = (0, u.useCallback)(
      (e = !1) => {
        let t = R.current;
        (t &&
          (cancelAnimationFrame(t.frame),
          (R.current = null),
          e && yt(t.velocityX, t.velocityY)),
          C.current && delete C.current.dataset.wallpaperMotion);
      },
      [yt],
    ),
    bt = (0, u.useCallback)(() => {
      (Z(!1), X());
      let e = Ae(Xe.current),
        t = ke(Xe.current) * 1e3,
        n = e ? Math.atan2(e.y, e.x) : Math.random() * Math.PI * 2 - Math.PI,
        r = {
          frame: 0,
          startedAt: performance.now(),
          lastTime: null,
          lastLayoutAt: 0,
          heading: n,
          speed: 0,
          velocityX: 0,
          velocityY: 0,
          fixed: !!e,
          turnIntervalMs: t,
          nextTurnAt: performance.now() + t,
          turn: null,
        };
      C.current &&
        (C.current.dataset.wallpaperMotion = e ? `fixed` : `turning`);
      let i = (e) => {
        if (R.current !== r) return;
        let t = Math.min(0.05, Math.max(0, (e - (r.lastTime ?? e)) / 1e3));
        r.lastTime = e;
        let n = Math.min(1, (e - r.startedAt) / Te);
        if (
          ((r.speed = we * l(Xe.current) * je(n)),
          !r.fixed && !r.turn && e >= r.nextTurnAt)
        ) {
          let t = Math.PI / 6 + (Math.random() * Math.PI * 5) / 6,
            n = Math.random() < 0.5 ? -1 : 1;
          r.turn = { from: r.heading, delta: t * n, startedAt: e };
        }
        if (r.turn) {
          let t = Math.min(1, (e - r.turn.startedAt) / Ee);
          ((r.heading = r.turn.from + r.turn.delta * je(t)),
            t >= 1 && ((r.turn = null), (r.nextTurnAt = e + r.turnIntervalMs)));
        }
        ((r.velocityX = Math.cos(r.heading) * r.speed),
          (r.velocityY = Math.sin(r.heading) * r.speed),
          (T.current = {
            ...T.current,
            x: T.current.x + r.velocityX * t,
            y: T.current.y + r.velocityY * t,
          }),
          W(),
          e - r.lastLayoutAt >= he && ((r.lastLayoutAt = e), J(0)),
          (r.frame = requestAnimationFrame(i)));
      };
      ((r.frame = requestAnimationFrame(i)), (R.current = r));
    }, [W, X, J, Z]),
    Q = (0, u.useCallback)(() => {
      (E.current && cancelAnimationFrame(E.current), (E.current = 0));
    }, []),
    $ = (0, u.useCallback)(() => {
      let e = D.current;
      (e.frame && cancelAnimationFrame(e.frame),
        (e.frame = 0),
        (e.pendingX = 0),
        (e.pendingY = 0),
        (e.lastTime = null));
    }, []),
    xt = (0, u.useCallback)(() => {
      F.current
        ? ((F.current = !1),
          ae(!1),
          Y(),
          (I.current = !1),
          _(!1),
          (it.current = !1),
          (at.current = !1),
          y(!1),
          b(!1),
          Z(!0),
          K())
        : (q(),
          Q(),
          $(),
          G(),
          (j.current = null),
          h(null),
          (F.current = !0),
          (I.current = !1),
          ae(!0),
          _(!1),
          Y(),
          (L.current = window.setTimeout(_t, Ce)),
          bt());
    }, [q, Q, G, X, $, Y, _t, K, bt, Z]),
    St = (0, u.useCallback)(
      (deltaY) => {
        let camera = T.current;
        if (!zoomFrame.current) zoomTarget.current = camera.zoom;
        zoomTarget.current = Be(
          zoomTarget.current * Math.exp(-deltaY * 0.0018),
          oe,
          se,
        );
        if (zoomFrame.current) return;
        zoomLastTime.current = 0;
        let step = (time) => {
          let current = T.current,
            elapsed = zoomLastTime.current
              ? Math.min(50, Math.max(0, time - zoomLastTime.current))
              : 1000 / 60;
          zoomLastTime.current = time;
          let target = zoomTarget.current,
            ease = 1 - Math.exp(-elapsed / 70),
            nextZoom = current.zoom + (target - current.zoom) * ease,
            settled = Math.abs(nextZoom - target) < 1e-4;
          if (settled) nextZoom = target;
          let centerX = A.current.width / 2,
            centerY = A.current.height / 2,
            worldX = (centerX - current.x) / current.zoom,
            worldY = (centerY - current.y) / current.zoom;
          W({
            x: centerX - worldX * nextZoom,
            y: centerY - worldY * nextZoom,
            zoom: nextZoom,
          });
          if (settled) {
            ((zoomFrame.current = 0), (zoomLastTime.current = 0), K());
          } else {
            zoomFrame.current = requestAnimationFrame(step);
          }
        };
        zoomFrame.current = requestAnimationFrame(step);
      },
      [W, K],
    ),
    Ct = (0, u.useCallback)(
      (e) => {
        let t = D.current;
        if (((t.frame = 0), j.current || ot.current || F.current)) {
          $();
          return;
        }
        let n =
          t.lastTime == null
            ? 1e3 / 60
            : Math.min(50, Math.max(0, e - t.lastTime));
        t.lastTime = e;
        let r = 1 - Math.exp(-n / _e),
          i = t.pendingX * r,
          a = t.pendingY * r,
          o = t.pendingX - i,
          s = t.pendingY - a;
        Math.hypot(o, s) < 0.5
          ? ((i = t.pendingX),
            (a = t.pendingY),
            (t.pendingX = 0),
            (t.pendingY = 0))
          : ((t.pendingX = o), (t.pendingY = s));
        let c = T.current;
        (W({ ...c, x: c.x + i, y: c.y + a }),
          t.pendingX || t.pendingY
            ? (t.frame = requestAnimationFrame(Ct))
            : ((t.lastTime = null), J(0)));
      },
      [W, $, J],
    ),
    wt = (0, u.useCallback)(
      (e, t) => {
        Q();
        let n = Math.hypot(e, t);
        if (
          n < le ||
          window.matchMedia(`(prefers-reduced-motion: reduce)`).matches
        ) {
          J(0);
          return;
        }
        let r = Math.min(n, ue) * de,
          i = T.current.x,
          a = T.current.y,
          o = e / n,
          s = t / n,
          c = performance.now(),
          l = (e) => {
            let t = -r * Math.exp(-(e - c) / fe),
              n = r + t;
            (W({ ...T.current, x: i + n * o, y: a + n * s }),
              Math.abs(t) > pe
                ? (E.current = requestAnimationFrame(l))
                : ((E.current = 0),
                  W({ ...T.current, x: i + r * o, y: a + r * s }),
                  K()));
          };
        E.current = requestAnimationFrame(l);
      },
      [W, Q, K, J],
    );
  (0, u.useEffect)(() => {
    let e = S.current;
    if (!e) return;
    let t = (e) => {
      if ((e.preventDefault(), F.current || j.current)) return;
      if ((q(), Q(), e.ctrlKey || e.metaKey)) {
        ($(), St(e.deltaY));
        return;
      }
      let t = e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? A.current.height : 1,
        n = e.shiftKey && !e.deltaX,
        r = (n ? e.deltaY : e.deltaX) * t,
        i = (n ? 0 : e.deltaY) * t;
      if (window.matchMedia(`(prefers-reduced-motion: reduce)`).matches) {
        $();
        let e = T.current;
        (W({ ...e, x: e.x - r, y: e.y - i }), J());
      } else
        ((D.current.pendingX -= r),
          (D.current.pendingY -= i),
          D.current.frame ||
            ((D.current.lastTime = null),
            (D.current.frame = requestAnimationFrame(Ct))));
    };
    return (
      e.addEventListener(`wheel`, t, { passive: !1 }),
      () => e.removeEventListener(`wheel`, t)
    );
  }, [W, q, Q, $, e, J, Ct, St]);
  let Tt = (e) => {
      e.button !== 0 ||
        x ||
        F.current ||
        (q(),
        Q(),
        $(),
        G(),
        zoomFrame.current &&
          (cancelAnimationFrame(zoomFrame.current), (zoomFrame.current = 0)),
        (zoomLastTime.current = 0),
        C.current?.style.removeProperty(`transition`),
        (w.current = !1),
        (Qe.current = {
          id: e.pointerId,
          startX: e.clientX,
          startY: e.clientY,
          cameraX: T.current.x,
          cameraY: T.current.y,
          lastX: e.clientX,
          lastY: e.clientY,
          lastTime: e.timeStamp,
          velocityX: 0,
          velocityY: 0,
          dragged: !1,
        }));
    },
    Et = (e) => {
      if (F.current) return;
      let t = Qe.current;
      if (!t || t.id !== e.pointerId) return;
      let n = e.clientX - t.startX,
        r = e.clientY - t.startY;
      if (
        (!t.dragged &&
          Math.hypot(n, r) > ce &&
          ((t.dragged = !0),
          (w.current = !0),
          S.current?.setPointerCapture(e.pointerId)),
        !t.dragged)
      )
        return;
      e.preventDefault();
      let i = e.timeStamp - t.lastTime;
      (i > 0 &&
        ((t.velocityX = ((e.clientX - t.lastX) / i) * 1e3),
        (t.velocityY = ((e.clientY - t.lastY) / i) * 1e3)),
        (t.lastX = e.clientX),
        (t.lastY = e.clientY),
        (t.lastTime = e.timeStamp),
        W({ ...T.current, x: t.cameraX + n, y: t.cameraY + r }));
    },
    Dt = (e, t = !0) => {
      let n = Qe.current;
      if (!n || n.id !== e.pointerId) return;
      Qe.current = null;
      try {
        S.current?.releasePointerCapture(e.pointerId);
      } catch {}
      let r = e.timeStamp - n.lastTime <= me;
      t && n.dragged && r ? wt(n.velocityX, n.velocityY) : J(0);
    };
  ((0, u.useEffect)(
    () => () => {
      (q(), Q(), $(), G());
    },
    [q, Q, G, $],
  ),
    (0, u.useLayoutEffect)(() => {
      W();
    }, [W, e]));
  let Ot = (e) => {
      if (F.current) return;
      if (w.current) {
        w.current = !1;
        return;
      }
      if (j.current?.key === e.key) {
        (q(), (j.current = null), h(null));
        return;
      }
      (q(), Q(), $(), G(), (j.current = e), h(e));
      let t = T.current.zoom;
      gt({
        x: n.width / 2 - (e.x + e.width / 2) * t,
        y: n.height / 2 - (e.y + e.height / 2) * t,
        zoom: t,
      });
    },
    kt = (0, u.useCallback)(() => {
      if (
        (N.current &&=
          (window.clearTimeout(M.current), (M.current = 0), !1)),
        F.current
      ) {
        (xt(), qe({ type: `photo-wall:exit` }));
        return;
      }
      j.current
        ? (q(), (j.current = null), h(null))
        : ot.current || (Q(), $(), qe({ type: `photo-wall:back` }));
    }, [q, Q, $, xt]),
    At = (0, u.useCallback)(() => {
      !F.current && j.current && !N.current
        ? (q(),
          (j.current = null),
          h(null),
          (N.current = !0),
          window.clearTimeout(M.current),
          (M.current = window.setTimeout(
            () => {
              ((M.current = 0), (N.current = !1), kt());
            },
            window.matchMedia(`(prefers-reduced-motion: reduce)`).matches
              ? 0
              : ve,
          )))
        : kt();
    }, [q, kt]);
  if (
    ((0, u.useEffect)(() => {
      let e = (e) => {
        e.key === `Escape` && (e.preventDefault(), kt());
      };
      return (
        window.addEventListener(`keydown`, e),
        () => window.removeEventListener(`keydown`, e)
      );
    }, [kt]),
    (0, u.useEffect)(() => {
      let e = (e) => {
        F.current && vt();
        let t =
            e.clientX >= 0 &&
            e.clientY >= 0 &&
            e.clientX < 120 &&
            e.clientY < 76,
          n = e.clientX >= window.innerWidth - 120 && e.clientY < 96;
        (it.current !== t && ((it.current = t), y(t)),
          at.current !== n && ((at.current = n), b(n)));
      };
      return (
        window.addEventListener(`pointermove`, e, { passive: !0 }),
        () => window.removeEventListener(`pointermove`, e)
      );
    }, [vt]),
    (0, u.useEffect)(
      () => () => {
        (Z(!1), X(), Y());
      },
      [X, Y, Z],
    ),
    !e)
  )
    return (0, d.jsx)(`main`, {
      className: `photo-wall-loading`,
      "aria-hidden": `true`,
    });
  if (!H.length)
    return (0, d.jsx)(`main`, {
      className: `photo-wall-empty`,
      "aria-label": `没有可显示的照片`,
      children: (0, d.jsx)(`span`, { children: `没有可显示的照片` }),
    });
  let showControls = e?.showPhotoWallControls !== !1,
    jt = showControls || (!Oe && v),
    Mt = showControls || (!Oe && Ne);
  return (0, d.jsxs)(`main`, {
    className: `photo-wall-app pw-interlock-app${te ? ` is-revealing` : ``}${x ? ` is-exiting` : ``}${re ? ` is-reveal-pending` : ``}${m ? ` has-focused-card` : ``}${g ? ` is-wallpaper-mode` : ``}${Oe ? ` is-wallpaper-idle` : ``}`,
    children: [
      (0, d.jsx)(`div`, {
        className: `photo-wall-atmosphere`,
        "aria-hidden": `true`,
        children: H.slice(0, 4).map((e, t) =>
          (0, d.jsx)(
            `img`,
            { src: e.src, alt: ``, draggable: `false`, decoding: `async` },
            `${e.id}-${t}`,
          ),
        ),
      }),
      (0, d.jsx)(`div`, {
        ref: S,
        className: `photo-wall-field pw-interlock-field${g ? ` is-wallpaper-mode` : ``}`,
        onPointerDown: Tt,
        onPointerMove: Et,
        onPointerUp: (e) => Dt(e, !0),
        onPointerCancel: (e) => Dt(e, !1),
        onLostPointerCapture: (e) => Dt(e, !1),
        onClick: (e) => {
          if (e.target === e.currentTarget && m) {
            if (w.current) {
              w.current = !1;
              return;
            }
            (q(), (j.current = null), h(null));
          }
        },
        children: (0, d.jsx)(`div`, {
          ref: C,
          className: `photo-wall-world pw-interlock-world`,
          children: pt.map((e) =>
            (0, d.jsx)(
              CameraCard,
              {
                card: e,
                focused: m?.key === e.key,
                onSelect: Ot,
                interactive: !x && !g,
              },
              e.key,
            ),
          ),
        }),
      }),
      (0, d.jsx)(`div`, {
        className: `photo-wall-back-zone${jt ? ` is-visible` : ``}`,
        children: (0, d.jsx)(`button`, {
          type: `button`,
          className: `photo-wall-back${jt ? ` is-visible` : ``}`,
          "aria-label": g
            ? `退出壁纸模式`
            : m
              ? `收起聚焦照片并退出嵌合拼图`
              : `退出嵌合拼图`,
          onClick: At,
          children: (0, d.jsx)(`svg`, {
            viewBox: `0 0 16 24`,
            fill: `none`,
            stroke: `currentColor`,
            strokeWidth: `2.2`,
            strokeLinecap: `round`,
            strokeLinejoin: `round`,
            "aria-hidden": `true`,
            children: (0, d.jsx)(`path`, { d: `m12 3.5-8 8.5 8 8.5` }),
          }),
        }),
      }),
      (0, d.jsx)(`div`, {
        className: `photo-wall-wallpaper-zone${Mt ? ` is-visible` : ``}`,
        children: (0, d.jsx)(`button`, {
          type: `button`,
          className: `photo-wall-tools-button photo-wall-wallpaper-button${Mt ? ` is-visible` : ``}`,
          "data-wallpaper-mode": g ? `true` : `false`,
          "aria-label": g ? `关闭壁纸模式` : `打开壁纸模式`,
          "aria-pressed": g,
          onClick: xt,
          children: (0, d.jsx)(`svg`, {
            viewBox: `0 0 22 22`,
            "aria-hidden": `true`,
            children: (0, d.jsx)(`path`, {
              d: `M3.5 6.1 6.5 16l4.5-7.8 4.5 7.8 3-9.9`,
            }),
          }),
        }),
      }),
    ],
  });
}
export { Xe as default };
