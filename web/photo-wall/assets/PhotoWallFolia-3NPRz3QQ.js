import { i as e, n as t, r as n, t as r } from "./index-eYugSr6J.js";
import {
  gapCompensation,
  t as i,
} from "./layoutConstants-nNzqxgbJ.js";
import { t as a } from "./wallpaperSpeed-DyUTxP__.js";
import {
  i as waitForImages,
  s as revealSchedule,
} from "./wallTransition-D4nOEmCV.js";
var o = e(n(), 1),
  s = (0, o.createContext)({});
function c(e) {
  let t = (0, o.useRef)(null);
  return (t.current === null && (t.current = e()), t.current);
}
var l = typeof window < `u` ? o.useLayoutEffect : o.useEffect,
  u = (0, o.createContext)(null);
function d(e, t) {
  e.indexOf(t) === -1 && e.push(t);
}
function f(e, t) {
  let n = e.indexOf(t);
  n > -1 && e.splice(n, 1);
}
var p = (e, t, n) => (n > t ? t : n < e ? e : n),
  m = {},
  h = (e) => /^-?(?:\d+(?:\.\d+)?|\.\d+)$/u.test(e),
  g = (e) => typeof e == `object` && !!e,
  _ = (e) => /^0[^.\s]+$/u.test(e);
function v(e) {
  let t;
  return () => (t === void 0 && (t = e()), t);
}
var y = (e) => e,
  b = (...e) => e.reduce((e, t) => (n) => t(e(n))),
  x = (e, t, n) => {
    let r = t - e;
    return r ? (n - e) / r : 1;
  },
  S = class {
    constructor() {
      this.subscriptions = [];
    }
    add(e) {
      return (d(this.subscriptions, e), () => this.remove(e));
    }
    remove(e) {
      f(this.subscriptions, e);
    }
    notify(e, t, n) {
      let r = this.subscriptions.length;
      if (r) {
        if (r === 1) this.subscriptions[0](e, t, n);
        else
          for (let i = 0; i < r; i++) {
            let r = this.subscriptions[i];
            r && r(e, t, n);
          }
      }
    }
    getSize() {
      return this.subscriptions.length;
    }
    clear() {
      this.subscriptions.length = 0;
    }
  },
  C = (e) => e * 1e3,
  w = (e) => e / 1e3,
  T = (e, t) => (t ? (1e3 / t) * e : 0),
  ee = (e, t, n) => {
    let r = t - e;
    return ((((n - e) % r) + r) % r) + e;
  },
  E = (e, t, n) => e * (3 * (1 - e) * ((1 - e) * t + e * n) + e * e);
function D(e, t, n, r) {
  return e === t && n === r
    ? y
    : (i) => {
        let a = 0,
          o = 1,
          s = i;
        for (let t = 0; ; t++) {
          (s >= a && s <= o) || (s = (a + o) / 2);
          let r = E(s, e, n) - i;
          if (r * r < 1e-28 || t === 40) break;
          (r > 0 ? (o = s) : (a = s),
            (s -= (r * 1e-7) / (E(s + 1e-7, e, n) - i - r)));
        }
        return E(s, t, r);
      };
}
var O = (e) => (t) => (t <= 0.5 ? e(2 * t) / 2 : (2 - e(2 * (1 - t))) / 2),
  k = (e) => (t) => 1 - e(1 - t),
  te = D(0.33, 1.53, 0.69, 0.99),
  A = k(te),
  j = O(A),
  ne = (e) =>
    e >= 1 ? 1 : (e *= 2) < 1 ? 0.5 * A(e) : 0.5 * (2 - 2 ** (-10 * (e - 1))),
  M = (e) => 1 - Math.sin(Math.acos(e)),
  re = k(M),
  ie = O(M),
  ae = D(0.42, 0, 1, 1),
  oe = D(0, 0, 0.58, 1),
  se = D(0.42, 0, 0.58, 1),
  ce = (e) => Array.isArray(e) && typeof e[0] != `number`;
function le(e, t) {
  return ce(e) ? e[ee(0, e.length, t)] : e;
}
var ue = (e) => Array.isArray(e) && typeof e[0] == `number`,
  N = {
    linear: y,
    easeIn: ae,
    easeInOut: se,
    easeOut: oe,
    circIn: M,
    circInOut: ie,
    circOut: re,
    backIn: A,
    backInOut: j,
    backOut: te,
    anticipate: ne,
  },
  de = (e) => typeof e == `string`,
  fe = (e) => {
    if (ue(e)) {
      e.length;
      let [t, n, r, i] = e;
      return D(t, n, r, i);
    }
    return de(e) ? (N[e], `${e}`, N[e]) : e;
  },
  P = { delta: 0, timestamp: 0, isProcessing: !1 },
  pe;
function me() {
  pe = void 0;
}
var F = {
    now: () => (
      pe === void 0 &&
        F.set(
          P.isProcessing || m.useManualTiming ? P.timestamp : performance.now(),
        ),
      pe
    ),
    set: (e) => {
      ((pe = e), queueMicrotask(me));
    },
  },
  I = (e) => Math.round(e * 1e5) / 1e5,
  he = (e) => (t) => typeof t == `string` && t.startsWith(e),
  ge = he(`--`),
  _e = he(`var(--`),
  ve = (e) => (_e(e) ? ye.test(e.split(`/*`)[0].trim()) : !1),
  ye =
    /var\(--(?:[\w-]+\s*|[\w-]+\s*,(?:\s*[^)(\s]|\s*\((?:[^)(]|\([^)(]*\))*\))+\s*)\)$/iu;
function be(e) {
  return typeof e == `string` && e.split(`/*`)[0].includes(`var(--`);
}
var xe = {
    test: (e) => typeof e == `number`,
    parse: parseFloat,
    transform: (e) => e,
  },
  Se = { ...xe, transform: (e) => p(0, 1, e) },
  Ce = { ...xe, default: 1 },
  we = /-?(?:\d+(?:\.\d+)?|\.\d+)/gu;
function L(e) {
  return e == null;
}
var Te =
    /^(?:#[\da-f]{3,8}|(?:rgb|hsl)a?\((?:-?[\d.]+%?[,\s]+){2}-?[\d.]+%?\s*(?:[,/]\s*)?(?:\b\d+(?:\.\d+)?|\.\d+)?%?\))$/iu,
  Ee = (e, t) => (n) =>
    !!(
      (typeof n == `string` && Te.test(n) && n.startsWith(e)) ||
      (t && !L(n) && Object.prototype.hasOwnProperty.call(n, t))
    ),
  De = (e, t, n) => (r) => {
    if (typeof r != `string`) return r;
    let [i, a, o, s] = r.match(we);
    return {
      [e]: parseFloat(i),
      [t]: parseFloat(a),
      [n]: parseFloat(o),
      alpha: s === void 0 ? 1 : parseFloat(s),
    };
  },
  Oe = (e) => p(0, 255, e),
  ke = { ...xe, transform: (e) => Math.round(Oe(e)) },
  Ae = {
    test: Ee(`rgb`, `red`),
    parse: De(`red`, `green`, `blue`),
    transform: ({ red: e, green: t, blue: n, alpha: r = 1 }) =>
      `rgba(` +
      ke.transform(e) +
      `, ` +
      ke.transform(t) +
      `, ` +
      ke.transform(n) +
      `, ` +
      I(Se.transform(r)) +
      `)`,
  };
function je(e) {
  let t = ``,
    n = ``,
    r = ``,
    i = ``;
  return (
    e.length > 5
      ? ((t = e.substring(1, 3)),
        (n = e.substring(3, 5)),
        (r = e.substring(5, 7)),
        (i = e.substring(7, 9)))
      : ((t = e.substring(1, 2)),
        (n = e.substring(2, 3)),
        (r = e.substring(3, 4)),
        (i = e.substring(4, 5)),
        (t += t),
        (n += n),
        (r += r),
        (i += i)),
    {
      red: parseInt(t, 16),
      green: parseInt(n, 16),
      blue: parseInt(r, 16),
      alpha: i ? parseInt(i, 16) / 255 : 1,
    }
  );
}
var Me = { test: Ee(`#`), parse: je, transform: Ae.transform },
  Ne = (e) => ({
    test: (t) =>
      typeof t == `string` && t.endsWith(e) && t.split(` `).length === 1,
    parse: parseFloat,
    transform: (t) => `${t}${e}`,
  }),
  Pe = Ne(`deg`),
  R = Ne(`%`),
  z = Ne(`px`),
  Fe = Ne(`vh`),
  Ie = Ne(`vw`),
  Le = {
    ...R,
    parse: (e) => R.parse(e) / 100,
    transform: (e) => R.transform(e * 100),
  },
  B = {
    test: Ee(`hsl`, `hue`),
    parse: De(`hue`, `saturation`, `lightness`),
    transform: ({ hue: e, saturation: t, lightness: n, alpha: r = 1 }) =>
      `hsla(` +
      Math.round(e) +
      `, ` +
      R.transform(I(t)) +
      `, ` +
      R.transform(I(n)) +
      `, ` +
      I(Se.transform(r)) +
      `)`,
  },
  V = {
    test: (e) => Ae.test(e) || Me.test(e) || B.test(e),
    parse: (e) =>
      Ae.test(e) ? Ae.parse(e) : B.test(e) ? B.parse(e) : Me.parse(e),
    transform: (e) =>
      typeof e == `string`
        ? e
        : e.hasOwnProperty(`red`)
          ? Ae.transform(e)
          : B.transform(e),
    getAnimatableNone: (e) => {
      let t = V.parse(e);
      return ((t.alpha = 0), V.transform(t));
    },
  },
  H =
    /(?:#[\da-f]{3,8}|(?:rgb|hsl)a?\((?:-?[\d.]+%?[,\s]+){2}-?[\d.]+%?\s*(?:[,/]\s*)?(?:\b\d+(?:\.\d+)?|\.\d+)?%?\))/giu,
  Re = new RegExp(we.source),
  ze = new RegExp(H.source, `i`);
function Be(e) {
  return isNaN(e) && typeof e == `string` && (Re.test(e) || ze.test(e));
}
var Ve = `number`,
  He = `color`,
  Ue = `var`,
  We = `var(`,
  Ge = "${}",
  Ke =
    /var\s*\(\s*--(?:[\w-]+\s*|[\w-]+\s*,(?:\s*[^)(\s]|\s*\((?:[^)(]|\([^)(]*\))*\))+\s*)\)|#[\da-f]{3,8}|(?:rgb|hsl)a?\((?:-?[\d.]+%?[,\s]+){2}-?[\d.]+%?\s*(?:[,/]\s*)?(?:\b\d+(?:\.\d+)?|\.\d+)?%?\)|-?(?:\d+(?:\.\d+)?|\.\d+)(?![a-z]*\()/giu;
function qe(e) {
  let t = e.toString();
  return Re.test(t) || ze.test(t);
}
function Je(e) {
  let t = e.toString(),
    n = [],
    r = { color: [], number: [], var: [] },
    i = [],
    a = 0;
  return {
    values: n,
    split: t
      .replace(
        Ke,
        (e) => (
          V.test(e)
            ? (r.color.push(a), i.push(He), n.push(V.parse(e)))
            : e.startsWith(We)
              ? (r.var.push(a), i.push(Ue), n.push(e))
              : (r.number.push(a), i.push(Ve), n.push(parseFloat(e))),
          ++a,
          Ge
        ),
      )
      .split(Ge),
    indexes: r,
    types: i,
  };
}
function Ye(e) {
  return Je(e).values;
}
function Xe({ split: e, types: t }) {
  let n = e.length;
  return (r) => {
    let i = ``;
    for (let a = 0; a < n; a++)
      if (((i += e[a]), r[a] !== void 0)) {
        let e = t[a];
        i += e === Ve ? I(r[a]) : e === He ? V.transform(r[a]) : r[a];
      }
    return i;
  };
}
function Ze(e) {
  return Xe(Je(e));
}
var Qe = (e) =>
    typeof e == `number` ? 0 : V.test(e) ? V.getAnimatableNone(e) : e,
  $e = (e, t) =>
    typeof e == `number` ? (t?.trim().endsWith(`/`) ? e : 0) : Qe(e);
function U(e) {
  let t = Je(e);
  return Xe(t)(t.values.map((e, n) => $e(e, t.split[n])));
}
var W = { test: Be, parse: Ye, createTransformer: Ze, getAnimatableNone: U };
function et(e, t, n) {
  return (
    n < 0 && (n += 1),
    n > 1 && --n,
    n < 1 / 6
      ? e + (t - e) * 6 * n
      : n < 1 / 2
        ? t
        : n < 2 / 3
          ? e + (t - e) * (2 / 3 - n) * 6
          : e
  );
}
function G({ hue: e, saturation: t, lightness: n, alpha: r }) {
  ((e /= 360), (t /= 100), (n /= 100));
  let i = 0,
    a = 0,
    o = 0;
  if (!t) i = a = o = n;
  else {
    let r = n < 0.5 ? n * (1 + t) : n + t - n * t,
      s = 2 * n - r;
    ((i = et(s, r, e + 1 / 3)), (a = et(s, r, e)), (o = et(s, r, e - 1 / 3)));
  }
  return {
    red: Math.round(i * 255),
    green: Math.round(a * 255),
    blue: Math.round(o * 255),
    alpha: r,
  };
}
function tt(e, t) {
  return (n) => (n > 0 ? t : e);
}
var K = (e, t, n) => e + (t - e) * n,
  nt = (e, t, n) => {
    let r = e * e,
      i = n * (t * t - r) + r;
    return i < 0 ? 0 : Math.sqrt(i);
  },
  rt = [Me, Ae, B],
  it = (e) => rt.find((t) => t.test(e));
function at(e) {
  let t = it(e);
  if (!t) return (`${e}`, !1);
  let n = t.parse(e);
  return (t === B && (n = G(n)), n);
}
var ot = (e, t) => {
    let n = at(e),
      r = at(t);
    if (!n || !r) return tt(e, t);
    let i = { ...n };
    return (e) => (
      (i.red = nt(n.red, r.red, e)),
      (i.green = nt(n.green, r.green, e)),
      (i.blue = nt(n.blue, r.blue, e)),
      (i.alpha = K(n.alpha, r.alpha, e)),
      Ae.transform(i)
    );
  },
  st = new Set([`none`, `hidden`]);
function ct(e, t) {
  return st.has(e) ? (n) => (n <= 0 ? e : t) : (n) => (n >= 1 ? t : e);
}
function lt(e, t) {
  return (n) => K(e, t, n);
}
function ut(e) {
  return typeof e == `number`
    ? lt
    : typeof e == `string`
      ? ve(e)
        ? tt
        : V.test(e)
          ? ot
          : mt
      : Array.isArray(e)
        ? dt
        : typeof e == `object`
          ? V.test(e)
            ? ot
            : ft
          : tt;
}
function dt(e, t) {
  let n = [...e],
    r = n.length,
    i = e.map((e, n) => ut(e)(e, t[n]));
  return (e) => {
    for (let t = 0; t < r; t++) n[t] = i[t](e);
    return n;
  };
}
function ft(e, t) {
  let n = { ...e, ...t },
    r = {};
  for (let i in n)
    e[i] !== void 0 && t[i] !== void 0 && (r[i] = ut(e[i])(e[i], t[i]));
  return (e) => {
    for (let t in r) n[t] = r[t](e);
    return n;
  };
}
function pt(e, t) {
  let n = [],
    r = { color: 0, var: 0, number: 0 };
  for (let i = 0; i < t.values.length; i++) {
    let a = t.types[i],
      o = e.indexes[a][r[a]],
      s = e.values[o] ?? 0;
    ((n[i] = s), r[a]++);
  }
  return n;
}
var mt = (e, t) => {
    let n = W.createTransformer(t),
      r = Je(e),
      i = Je(t);
    return r.indexes.var.length === i.indexes.var.length &&
      r.indexes.color.length === i.indexes.color.length &&
      r.indexes.number.length >= i.indexes.number.length
      ? (st.has(e) && !i.values.length) || (st.has(t) && !r.values.length)
        ? ct(e, t)
        : b(dt(pt(r, i), i.values), n)
      : (`${e}${t}`, tt(e, t));
  },
  ht = /^(-?(?:\d+(?:\.\d*)?|\.\d+))([a-z%]*)$/iu;
function gt(e, t) {
  let n = ht.exec(e);
  if (!n) return;
  let r = ht.exec(t);
  if (!r || n[2] !== r[2]) return;
  let i = n[2],
    a = parseFloat(n[1]),
    o = parseFloat(r[1]);
  return (e) => I(K(a, o, e)) + i;
}
function _t(e, t, n) {
  if (typeof e == `number` && typeof t == `number` && typeof n == `number`)
    return K(e, t, n);
  if (typeof e == `string` && typeof t == `string`) {
    let n = gt(e, t);
    if (n) return n;
  }
  return ut(e)(e, t);
}
var vt = [
  `setup`,
  `read`,
  `resolveKeyframes`,
  `preUpdate`,
  `update`,
  `preRender`,
  `render`,
  `postRender`,
];
function yt(e) {
  let t = new Set(),
    n = new Set(),
    r = !1,
    i = !1,
    a,
    o = new Set(),
    s = { delta: 0, timestamp: 0, isProcessing: !1 };
  function c(t) {
    (o.has(t) && (n.add(t), e()), (a = t)(s));
  }
  let l = {
    schedule: (e, i = !1, s = !1) => {
      let c = s && r,
        l = c ? t : n;
      return (i && o.add(e), c && e !== a && l.delete(e), l.add(e), e);
    },
    cancel: (e) => {
      (n.delete(e), o.delete(e));
    },
    process: (e) => {
      if (((s = e), r)) {
        i = !0;
        return;
      }
      r = !0;
      let o = t;
      ((t = n),
        (n = o),
        t.forEach(c),
        t.clear(),
        (a = void 0),
        (r = !1),
        i && ((i = !1), l.process(e)));
    },
  };
  return l;
}
var bt = 40;
function xt(e, t, n = { delta: 0, timestamp: 0, isProcessing: !1 }) {
  let r = !1,
    i = !0,
    a = () => (r = !0),
    o = vt.reduce((e, t) => ((e[t] = yt(a)), e), {}),
    {
      setup: s,
      read: c,
      resolveKeyframes: l,
      preUpdate: u,
      update: d,
      preRender: f,
      render: p,
      postRender: h,
    } = o,
    g = () => {
      let a = m.useManualTiming,
        o = a ? n.timestamp : performance.now();
      ((r = !1),
        a ||
          (n.delta = i ? 1e3 / 60 : Math.max(Math.min(o - n.timestamp, bt), 1)),
        (n.timestamp = o),
        (n.isProcessing = !0),
        s.process(n),
        c.process(n),
        l.process(n),
        u.process(n),
        d.process(n),
        f.process(n),
        p.process(n),
        h.process(n),
        (n.isProcessing = !1),
        r && t && ((i = !1), e(g)));
    },
    _ = () => {
      ((r = !0), (i = !0), n.isProcessing || e(g));
    };
  return {
    schedule: vt.reduce((e, t) => {
      let n = o[t];
      return (
        (e[t] = (e, t = !1, i = !1) => (r || _(), n.schedule(e, t, i))),
        e
      );
    }, {}),
    cancel: (e) => {
      for (let t = 0; t < vt.length; t++) o[vt[t]].cancel(e);
    },
    state: n,
    steps: o,
  };
}
var {
    schedule: q,
    cancel: St,
    steps: Ct,
  } = xt(typeof requestAnimationFrame < `u` ? requestAnimationFrame : y, !0, P),
  wt = (e) => {
    let t = ({ timestamp: t }) => e(t);
    return {
      start: (e = !0) => q.update(t, e),
      stop: () => St(t),
      now: () => (P.isProcessing ? P.timestamp : F.now()),
    };
  },
  Tt = (e, t, n = 10) => {
    let r = ``,
      i = Math.max(Math.round(t / n), 2);
    for (let t = 0; t < i; t++)
      r += Math.round(e(t / (i - 1)) * 1e4) / 1e4 + `, `;
    return `linear(${r.substring(0, r.length - 2)})`;
  },
  Et = 2e4;
function Dt(e, t = 50, n = Et, r) {
  let i = 0,
    a = e.next(i);
  for (r?.push(a.value); !a.done && i < n;)
    ((i += t), (a = e.next(i)), r?.push(a.value));
  return i >= n ? 1 / 0 : i;
}
function Ot(e, t = 100, n) {
  let { keyframes: r, velocity: i } = e,
    a = r && r[r.length - 1] - r[0],
    o = n({ ...e, velocity: i && a ? (i * t) / a : i, keyframes: [0, t] }),
    s = Math.min(Dt(o), Et);
  return {
    type: `keyframes`,
    ease: (e) => o.next(s * e).value / t,
    duration: w(s),
  };
}
var J = {
    stiffness: 100,
    damping: 10,
    mass: 1,
    duration: 800,
    bounce: 0.3,
    visualDuration: 0.3,
    restSpeed: { granular: 0.01, default: 2 },
    restDelta: { granular: 0.005, default: 0.5 },
    minDuration: 0.01,
    maxDuration: 10,
    minDamping: 0.05,
  },
  kt = (e) =>
    e < 0 ? 1 / Math.max(1 + e, J.minDamping) : Math.max(1 - e, J.minDamping);
function At(e, t) {
  if (!(e > 1)) return 1;
  let n = Math.sqrt(e * e - 1),
    r = e - n,
    i = e + n,
    a = 2 * n * Math.exp(-t) * (1 + t);
  return (
    Nt(
      (e) => i * Math.exp(-r * e) - r * Math.exp(-i * e) - a,
      (e) => Math.exp(-i * e) - Math.exp(-r * e),
      t,
    ) / t
  );
}
function jt(e, t) {
  return e * Math.sqrt(1 - t * t);
}
var Mt = 12;
function Nt(e, t, n) {
  let r = n;
  for (let n = 1; n < Mt; n++) r -= e(r) / t(r);
  return r;
}
var Pt = 0.001;
function Ft({ duration: e = J.duration, bounce: t = J.bounce }) {
  let n, r;
  J.maxDuration;
  let i = kt(t);
  ((e = p(J.minDuration, J.maxDuration, w(e))),
    i < 1
      ? ((n = (t) => {
          let n = t * i,
            r = n * e,
            a = jt(t, i),
            o = Math.exp(-r);
          return Pt - (n / a) * o;
        }),
        (r = (t) => {
          let r = t * i * e,
            a = i * i * t * t * e,
            o = Math.exp(-r),
            s = jt(t * t, i);
          return ((-n(t) + Pt > 0 ? -1 : 1) * -a * o) / s;
        }))
      : ((n = (t) => -0.001 + Math.exp(-t * e) * (t * e + 1)),
        (r = (t) => Math.exp(-t * e) * (-t * (e * e)))));
  let a = 5 / e,
    o = Nt(n, r, a),
    s = o * At(i, o * e),
    c = s * s;
  return { stiffness: c, damping: i * 2 * Math.sqrt(c), duration: C(e) };
}
var It = (e, t) => (t ? e >= 0 : e > 0) && e < 1 / 0;
function Lt(e, t) {
  if (It(e, t)) return e;
}
function Rt(e) {
  let t = Lt(e.stiffness),
    n = Lt(e.damping, !0),
    r = Lt(e.mass),
    i = {
      ...e,
      stiffness: t ?? J.stiffness,
      damping: n ?? J.damping,
      mass: r ?? J.mass,
      isResolvedFromDuration: !1,
      isTimeDefined:
        (t ?? n ?? r) === void 0 &&
        (e.duration !== void 0 || e.bounce !== void 0),
    };
  if (i.isTimeDefined) {
    if (e.visualDuration) {
      let t = kt(e.bounce || 0),
        n =
          ((2 * Math.PI) / (e.visualDuration * 1.2)) *
          At(t, (2 * Math.PI) / 1.2);
      ((i.stiffness = n * n), (i.damping = 2 * t * Math.sqrt(i.stiffness)));
    } else (Object.assign(i, Ft(i)), (i.isResolvedFromDuration = !0));
    (It(i.stiffness) && It(i.damping, !0)) ||
      ((i.stiffness = J.stiffness), (i.damping = J.damping));
  }
  return i;
}
function zt(e = J.visualDuration, t = J.bounce) {
  let n =
      typeof e == `object`
        ? e
        : { visualDuration: e, keyframes: [0, 1], bounce: t },
    r = n.keyframes[0],
    i = n.keyframes[n.keyframes.length - 1],
    a = { done: !1, value: r },
    {
      stiffness: o,
      damping: s,
      mass: c,
      duration: l,
      isResolvedFromDuration: u,
      isTimeDefined: d,
    } = Rt({ ...n }),
    f = (e) => (d ? 0 : -w(e)),
    p = s / (2 * Math.sqrt(o * c)),
    m = w(Math.sqrt(o / c)),
    h = p * m,
    g = {
      target: i,
      delta: i - r,
      velocity: f(n.velocity || 0) || 0,
      restSpeed: 0,
      restDelta: 0,
    },
    _ = () => {
      let e = Math.abs(g.delta) < 5;
      ((g.restSpeed =
        n.restSpeed || (e ? J.restSpeed.granular : J.restSpeed.default)),
        (g.restDelta =
          n.restDelta || (e ? J.restDelta.granular : J.restDelta.default)));
    };
  _();
  let v, y, b;
  if (p < 1) {
    let e = jt(m, p),
      t = { A: 0, sinC: 0, cosC: 0, t: -1, env: 0, sin: 0, cos: 0 };
    b = () => {
      ((t.A = (g.velocity + h * g.delta) / e),
        (t.sinC = h * t.A + g.delta * e),
        (t.cosC = h * g.delta - t.A * e));
    };
    let n = (n) => {
      n !== t.t &&
        ((t.t = n),
        (t.env = Math.exp(-h * n)),
        (t.sin = Math.sin(e * n)),
        (t.cos = Math.cos(e * n)));
    };
    ((v = (e) => (n(e), g.target - t.env * (t.A * t.sin + g.delta * t.cos))),
      (y = (e) => (n(e), t.env * (t.sinC * t.sin + t.cosC * t.cos))));
  } else if (p === 1) {
    v = (e) =>
      g.target - Math.exp(-m * e) * (g.delta + (g.velocity + m * g.delta) * e);
    let e = { C: 0 };
    ((b = () => {
      e.C = g.velocity + m * g.delta;
    }),
      (y = (t) => Math.exp(-m * t) * (m * e.C * t - g.velocity)));
  } else {
    let e = m * Math.sqrt(p * p - 1),
      t = h - e,
      n = h + e,
      r = d ? 1 / 0 : 300 / e,
      i = (e, t) => Math.exp(t > r ? -e * r - h * (t - r) : -e * t),
      a = { S: 0, F: 0 };
    ((b = () => {
      let t = (g.velocity + h * g.delta) / e;
      ((a.S = (g.delta + t) / 2), (a.F = (g.delta - t) / 2));
    }),
      (v = (e) => g.target - a.S * i(t, e) - a.F * i(n, e)),
      (y = (e) => t * a.S * i(t, e) + n * a.F * i(n, e)));
  }
  b();
  let x = (u && l) || null,
    S = {
      calculatedDuration: x,
      retarget: (e, t) => {
        ((g.target = e[e.length - 1]),
          (g.delta = g.target - e[0]),
          (g.velocity = f(t)),
          (n.restSpeed && n.restDelta) || _(),
          (S.calculatedDuration = x),
          (a.done = !1),
          b());
      },
      velocity: (e) => C(y(e)),
      next: (e) => {
        let t = v(e);
        if (u) a.done = e >= l;
        else {
          let n = C(y(e));
          a.done =
            Math.abs(n) <= g.restSpeed && Math.abs(g.target - t) <= g.restDelta;
        }
        return ((a.value = a.done ? g.target : t), a);
      },
      toString: () => {
        let e = Math.min(Dt(S), Et),
          t = Tt((t) => S.next(e * t).value, e, 30);
        return e + `ms ` + t;
      },
      toTransition: () => {},
    };
  return S;
}
var Bt = Object.assign(zt, {
  applyToOptions: (e) => {
    let t = Ot(e, 100, zt);
    return (
      (e.ease = t.ease),
      (e.duration = C(t.duration)),
      (e.type = `keyframes`),
      e
    );
  },
});
function Vt({
  keyframes: e,
  velocity: t = 0,
  power: n = 0.8,
  timeConstant: r = 325,
  bounceDamping: i = 10,
  bounceStiffness: a = 500,
  modifyTarget: o,
  min: s,
  max: c,
  restDelta: l = 0.5,
  restSpeed: u,
}) {
  let d = e[0],
    f = { done: !1, value: d },
    p = (e) => e < s || e > c,
    m = (e) =>
      s === void 0
        ? c
        : c === void 0 || Math.abs(s - e) < Math.abs(c - e)
          ? s
          : c,
    h = n * t,
    g = d + h,
    _ = o === void 0 ? g : o(g);
  _ !== g && (h = _ - d);
  let v = (e) => -h * Math.exp(-e / r),
    y = (e) => {
      let t = v(e);
      ((f.done = Math.abs(t) <= l), (f.value = f.done ? _ : _ + t));
    },
    b,
    x,
    S = (e) => {
      p(f.value) &&
        ((b = e),
        (x = Bt({
          keyframes: [f.value, m(f.value)],
          velocity: (-v(e) / r) * 1e3,
          damping: i,
          stiffness: a,
          restDelta: l,
          restSpeed: u,
        })));
    };
  return (
    S(0),
    {
      calculatedDuration: null,
      next: (e) => {
        let t = !1;
        return (
          !x && b === void 0 && ((t = !0), y(e), S(e)),
          b !== void 0 && e >= b ? x.next(e - b) : (!t && y(e), f)
        );
      },
    }
  );
}
function Ht(e, t, n) {
  let r = [],
    i = n || m.mix || _t,
    a = e.length - 1;
  for (let n = 0; n < a; n++) {
    let a = i(e[n], e[n + 1]);
    (t && (a = b(Array.isArray(t) ? t[n] || y : t, a)), r.push(a));
  }
  return r;
}
function Ut(e, t, { clamp: n = !0, ease: r, mixer: i } = {}) {
  let a = e.length;
  if ((t.length, a === 1)) return () => t[0];
  if (a === 2 && t[0] === t[1]) return () => t[1];
  let o = e[0] === e[1];
  e[0] > e[a - 1] && ((e = [...e].reverse()), (t = [...t].reverse()));
  let s = Ht(t, r, i),
    c = s.length,
    l = (n) => {
      if (o && n < e[0]) return t[0];
      let r = 0;
      if (c > 1) for (; r < e.length - 2 && !(n < e[r + 1]); r++);
      let i = x(e[r], e[r + 1], n);
      return s[r](i);
    };
  return n ? (t) => l(p(e[0], e[a - 1], t)) : l;
}
function Wt(e, t) {
  let n = e[e.length - 1];
  for (let r = 1; r <= t; r++) {
    let i = x(0, t, r);
    e.push(K(n, 1, i));
  }
}
function Gt(e) {
  let t = [0];
  return (Wt(t, e.length - 1), t);
}
function Kt(e, t) {
  return e.map((e) => e * t);
}
function qt(e, t) {
  return e.map(() => t || se).splice(0, e.length - 1);
}
function Jt({
  duration: e = 300,
  keyframes: t,
  times: n,
  ease: r = `easeInOut`,
}) {
  let i = ce(r) ? r.map(fe) : fe(r) || se,
    a = { done: !1, value: t[0] };
  if (
    t.length === 2 &&
    !Array.isArray(i) &&
    (!n || n.length !== 2 || (n[0] === 0 && n[1] === 1))
  ) {
    let [n, r] = t,
      o = n === r ? void 0 : (m.mix || _t)(n, r);
    return {
      calculatedDuration: e,
      next: (t) => (
        (a.value = o ? o(i(e > 0 ? p(0, 1, t / e) : 1)) : r),
        (a.done = t >= e),
        a
      ),
    };
  }
  let o = Ut(Kt(n && n.length === t.length ? n : Gt(t), e), t, {
    ease: Array.isArray(i) ? i : qt(t, i),
  });
  return {
    calculatedDuration: e,
    next: (t) => ((a.value = o(t)), (a.done = t >= e), a),
  };
}
var Yt = 5;
function Xt(e, t, n) {
  let r = Math.max(t - Yt, 0);
  return T(n - e(r), t - r);
}
function Zt(e, t, n = 0) {
  return t <= 0
    ? n
    : e.velocity
      ? e.velocity(t)
      : Xt((t) => e.next(t).value, t, e.next(t).value);
}
var Qt = (e) => e !== null;
function $t(e, { repeat: t, repeatType: n = `loop` }, r, i = 1) {
  let a = e.filter(Qt),
    o = i < 0 || (t && n !== `loop` && t % 2 == 1) ? 0 : a.length - 1;
  return !o || r === void 0 ? a[o] : r;
}
var en = { decay: Vt, inertia: Vt, tween: Jt, keyframes: Jt, spring: Bt };
function tn(e) {
  typeof e.type == `string` && (e.type = en[e.type]);
}
var nn = 40,
  rn = (e, t) => (t - e > nn && !m.useManualTiming ? t : e);
function an(e, t) {
  return {
    kind: e,
    animation: t,
    timestamp: F.now(),
    frameTimestamp: P.timestamp,
    frameIsProcessing: P.isProcessing,
  };
}
function on(e, t, n) {
  let r = globalThis.__MOTION_INSPECT__;
  if (r)
    try {
      r({ ...an(`animation-start`, e), options: n ? { ...t, ...n } : t });
    } catch {}
}
function sn(e, t) {
  let n = globalThis.__MOTION_INSPECT__;
  if (n)
    try {
      n({ ...an(`layout-animation-start`, e), node: t });
    } catch {}
}
var cn = class {
    constructor() {
      this.isResolved = !1;
    }
    get finished() {
      return (
        (this._finished ||= this.isResolved
          ? Promise.resolve()
          : new Promise((e) => {
              this._resolve = e;
            })),
        this._finished
      );
    }
    updateFinished() {
      ((this._finished = this._resolve = void 0), (this.isResolved = !1));
    }
    notifyFinished() {
      ((this.isResolved = !0), this._resolve?.());
    }
    then(e, t) {
      return this.finished.then(e, t);
    }
  },
  ln = (e) => e / 100,
  un = (e) => Math.round(e * 1e4) / 1e4,
  dn = class extends cn {
    constructor(e) {
      (super(),
        (this.state = `idle`),
        (this.startTime = null),
        (this.isStopped = !1),
        (this.currentTime = 0),
        (this.holdTime = null),
        (this.playbackSpeed = 1),
        (this.delayState = { done: !1, value: void 0 }),
        (this.stop = () => {
          let { motionValue: e } = this.options;
          (e && e.updatedAt !== F.now() && this.tick(F.now()),
            (this.isStopped = !0),
            this.state !== `idle` &&
              (this.teardown(), this.options.onStop?.()));
        }),
        (this.options = e),
        this.initAnimation(),
        this.play(),
        e.autoplay === !1 && this.pause(),
        on(this, this.options));
    }
    initAnimation() {
      let { options: e } = this;
      tn(e);
      let {
          type: t = Jt,
          repeat: n = 0,
          repeatDelay: r = 0,
          repeatType: i,
          velocity: a = 0,
        } = e,
        { keyframes: o } = e,
        s = t || Jt;
      s !== Jt &&
        typeof o[0] != `number` &&
        ((this.mixKeyframes = b(ln, _t(o[0], o[1]))), (o = [0, 100]));
      let c = s(o === e.keyframes ? e : { ...e, keyframes: o });
      (i === `mirror` &&
        (this.mirroredGenerator = s({
          ...e,
          keyframes: [...o].reverse(),
          velocity: -a,
        })),
        c.calculatedDuration === null && (c.calculatedDuration = Dt(c)));
      let { calculatedDuration: l } = c;
      ((this.calculatedDuration = l),
        (this.resolvedDuration = l + r),
        (this.totalDuration = this.resolvedDuration * (n + 1) - r),
        (this.generator = c));
    }
    updateTime(e) {
      let t = Math.round(e - this.startTime) * this.playbackSpeed;
      this.currentTime = this.holdTime === null ? t : this.holdTime;
    }
    tick(e, t = !1) {
      let { generator: n, totalDuration: r, calculatedDuration: i } = this;
      if (this.startTime === null) return n.next(0);
      let {
        delay: a = 0,
        keyframes: o,
        type: s,
        onUpdate: c,
        finalKeyframe: l,
      } = this.options;
      (this.startTime === this.pendingStartTime &&
        (this.startTime = rn(this.startTime, e)),
        (this.pendingStartTime = void 0),
        this.speed > 0
          ? (this.startTime = Math.min(this.startTime, e))
          : this.speed < 0 &&
            (this.startTime = Math.min(e - r / this.speed, this.startTime)),
        t ? (this.currentTime = e) : this.updateTime(e));
      let u = this.currentTime - a * (this.playbackSpeed >= 0 ? 1 : -1),
        d = this.playbackSpeed >= 0 ? u < 0 : u > r;
      ((this.currentTime = Math.max(u, 0)),
        this.state === `finished` &&
          this.holdTime === null &&
          (this.currentTime = r));
      let f = this.generate(this.currentTime, d),
        { done: p } = f;
      !d &&
        i !== null &&
        (p =
          this.playbackSpeed >= 0
            ? this.currentTime >= r
            : this.currentTime <= 0);
      let m =
        this.holdTime === null &&
        (this.state === `finished` || (this.state === `running` && p));
      return (
        m && s !== Vt && (f.value = $t(o, this.options, l, this.speed)),
        c && c(f.value),
        m && this.finish(),
        f
      );
    }
    at(e) {
      return this.holdTime ?? un((e - this.startTime) * this.playbackSpeed);
    }
    sampleAt(e, t) {
      let { options: n, totalDuration: r } = this,
        i = this.at(e) - (n.delay || 0);
      return i >= r && n.type !== Vt
        ? $t(n.keyframes, n, t ? void 0 : n.finalKeyframe)
        : this.generate(Math.max(i, 0), i < 0).value;
    }
    generate(e, t) {
      let {
          generator: n,
          totalDuration: r,
          mixKeyframes: i,
          mirroredGenerator: a,
          resolvedDuration: o,
        } = this,
        {
          keyframes: s,
          repeat: c,
          repeatType: l,
          repeatDelay: u,
        } = this.options,
        d = e,
        f = n;
      if (c) {
        let t = Math.min(e, r) / o,
          n = Math.floor(t),
          i = t % 1;
        (!i && t >= 1 && (i = 1),
          i === 1 && n--,
          (n = Math.min(n, c + 1)),
          n % 2 &&
            (l === `reverse`
              ? ((i = 1 - i), u && (i -= u / o))
              : l === `mirror` && (f = a)),
          (d = p(0, 1, i) * o));
      }
      let m;
      return (
        t
          ? ((this.delayState.value = s[0]), (m = this.delayState))
          : (m = f.next(d)),
        i && !t && (m.value = i(m.value)),
        m
      );
    }
    then(e, t) {
      return this.finished.then(e, t);
    }
    get duration() {
      return w(this.calculatedDuration);
    }
    get iterationDuration() {
      let { delay: e = 0 } = this.options || {};
      return this.duration + w(e);
    }
    get time() {
      return w(this.currentTime);
    }
    set time(e) {
      ((e = C(e)),
        (this.currentTime = e),
        this.startTime === null ||
        this.holdTime !== null ||
        this.playbackSpeed === 0
          ? (this.holdTime = e)
          : this.driver &&
            (this.startTime = this.driver.now() - e / this.playbackSpeed),
        this.driver
          ? this.driver.start(!1)
          : ((this.startTime = 0),
            (this.state = `paused`),
            (this.holdTime = e),
            this.tick(e)));
    }
    getGeneratorVelocity() {
      return Zt(this.generator, this.currentTime, this.options.velocity);
    }
    get speed() {
      return this.playbackSpeed;
    }
    set speed(e) {
      let t = this.playbackSpeed !== e;
      (t && this.driver && this.updateTime(F.now()),
        (this.playbackSpeed = e),
        t && this.driver && (this.time = w(this.currentTime)));
    }
    play() {
      if (this.isStopped) return;
      let { driver: e = wt, startTime: t } = this.options;
      ((this.driver ||= e((e) => this.tick(e))), this.options.onPlay?.());
      let n = this.driver.now();
      (this.state === `finished`
        ? (this.updateFinished(), (this.startTime = n))
        : this.holdTime === null
          ? (this.startTime ||= t ?? (this.pendingStartTime = n))
          : (this.startTime = n - this.holdTime / (this.playbackSpeed || 1)),
        this.state === `finished` &&
          this.speed < 0 &&
          (this.startTime += this.calculatedDuration),
        (this.holdTime = null),
        (this.state = `running`),
        this.driver.start());
    }
    pause() {
      ((this.state = `paused`),
        this.updateTime(F.now()),
        (this.holdTime = this.currentTime));
    }
    complete() {
      (this.state !== `running` && this.play(),
        (this.state = `finished`),
        (this.holdTime = null));
    }
    finish() {
      (this.notifyFinished(),
        this.teardown(),
        (this.state = `finished`),
        this.options.onComplete?.());
    }
    cancel() {
      ((this.holdTime = null),
        (this.startTime = 0),
        this.tick(0),
        this.teardown(),
        this.options.onCancel?.());
    }
    teardown() {
      ((this.state = `idle`),
        this.stopDriver(),
        (this.startTime = this.holdTime = null));
    }
    stopDriver() {
      this.driver &&= (this.driver.stop(), void 0);
    }
    sample(e) {
      return ((this.startTime = 0), this.tick(e, !0));
    }
    attachTimeline(e) {
      return (
        this.options.allowFlatten &&
          ((this.options.type = `keyframes`),
          (this.options.ease = `linear`),
          this.initAnimation()),
        this.driver?.stop(),
        e.observe(this)
      );
    }
  },
  fn = new Set([`brightness`, `contrast`, `saturate`, `opacity`]);
function pn(e) {
  let [t, n] = e.slice(0, -1).split(`(`);
  if (t === `drop-shadow`) return e;
  let [r] = n.match(we) || [];
  if (!r) return e;
  let i = n.replace(r, ``),
    a = +!!fn.has(t);
  return (r !== n && (a *= 100), t + `(` + a + i + `)`);
}
var mn = /\b([a-z-]*)\(.*?\)/gu,
  hn = {
    ...W,
    getAnimatableNone: (e) => {
      let t = e.match(mn);
      return t ? t.map(pn).join(` `) : e;
    },
  },
  gn = {
    ...W,
    getAnimatableNone: (e) => {
      let t = W.parse(e);
      return W.createTransformer(e)(
        t.map((e) =>
          typeof e == `number`
            ? 0
            : typeof e == `object`
              ? { ...e, alpha: 1 }
              : e,
        ),
      );
    },
  },
  _n = { ...xe, transform: Math.round },
  vn = {
    rotate: Pe,
    pathRotation: Pe,
    rotateX: Pe,
    rotateY: Pe,
    rotateZ: Pe,
    scale: Ce,
    scaleX: Ce,
    scaleY: Ce,
    scaleZ: Ce,
    skew: Pe,
    skewX: Pe,
    skewY: Pe,
    distance: z,
    translateX: z,
    translateY: z,
    translateZ: z,
    x: z,
    y: z,
    z,
    perspective: z,
    transformPerspective: z,
    opacity: Se,
    originX: Le,
    originY: Le,
    originZ: z,
  },
  yn = {
    borderWidth: z,
    borderTopWidth: z,
    borderRightWidth: z,
    borderBottomWidth: z,
    borderLeftWidth: z,
    borderRadius: z,
    borderTopLeftRadius: z,
    borderTopRightRadius: z,
    borderBottomRightRadius: z,
    borderBottomLeftRadius: z,
    width: z,
    maxWidth: z,
    height: z,
    maxHeight: z,
    top: z,
    right: z,
    bottom: z,
    left: z,
    inset: z,
    insetBlock: z,
    insetBlockStart: z,
    insetBlockEnd: z,
    insetInline: z,
    insetInlineStart: z,
    insetInlineEnd: z,
    padding: z,
    paddingTop: z,
    paddingRight: z,
    paddingBottom: z,
    paddingLeft: z,
    paddingBlock: z,
    paddingBlockStart: z,
    paddingBlockEnd: z,
    paddingInline: z,
    paddingInlineStart: z,
    paddingInlineEnd: z,
    margin: z,
    marginTop: z,
    marginRight: z,
    marginBottom: z,
    marginLeft: z,
    marginBlock: z,
    marginBlockStart: z,
    marginBlockEnd: z,
    marginInline: z,
    marginInlineStart: z,
    marginInlineEnd: z,
    fontSize: z,
    backgroundPositionX: z,
    backgroundPositionY: z,
    ...vn,
    zIndex: _n,
    fillOpacity: Se,
    strokeOpacity: Se,
    numOctaves: _n,
  },
  bn = {
    ...yn,
    color: V,
    backgroundColor: V,
    outlineColor: V,
    fill: V,
    stroke: V,
    borderColor: V,
    borderTopColor: V,
    borderRightColor: V,
    borderBottomColor: V,
    borderLeftColor: V,
    filter: hn,
    WebkitFilter: hn,
    mask: gn,
    WebkitMask: gn,
  },
  xn = (e) => bn[e],
  Sn = new Set([hn, gn]);
function Cn(e, t) {
  let n = xn(e);
  return (
    Sn.has(n) || (n = W),
    n.getAnimatableNone ? n.getAnimatableNone(t) : void 0
  );
}
function wn(e) {
  for (let t = 1; t < e.length; t++) e[t] ?? (e[t] = e[t - 1]);
}
var Tn = (e) => (e * 180) / Math.PI,
  En = (e) => On(Tn(Math.atan2(e[1], e[0]))),
  Dn = {
    x: 4,
    y: 5,
    translateX: 4,
    translateY: 5,
    scaleX: 0,
    scaleY: 3,
    scaleZ: () => 1,
    scale: (e) => (Math.abs(e[0]) + Math.abs(e[3])) / 2,
    rotate: En,
    rotateZ: En,
    skewX: (e) => Tn(Math.atan(e[1])),
    skewY: (e) => Tn(Math.atan(e[2])),
    skew: (e) => (Math.abs(e[1]) + Math.abs(e[2])) / 2,
  },
  On = (e) => ((e %= 360), e < 0 && (e += 360), e),
  kn = En,
  An = (e) => Math.hypot(e[0], e[1]),
  jn = (e) => Math.hypot(e[4], e[5]),
  Mn = {
    x: 12,
    y: 13,
    z: 14,
    translateX: 12,
    translateY: 13,
    translateZ: 14,
    scaleX: An,
    scaleY: jn,
    scaleZ: (e) => Math.hypot(e[8], e[9], e[10]),
    scale: (e) => (An(e) + jn(e)) / 2,
    rotateX: (e) => On(Tn(Math.atan2(e[6], e[5]))),
    rotateY: (e) => On(Tn(Math.atan2(-e[2], e[0]))),
    rotateZ: kn,
    rotate: kn,
    skewX: (e) => Tn(Math.atan(e[4])),
    skewY: (e) => Tn(Math.atan(e[1])),
    skew: (e) => (Math.abs(e[1]) + Math.abs(e[4])) / 2,
  };
function Nn(e) {
  return +!!e.includes(`scale`);
}
function Pn(e, t) {
  if (!e || e === `none`) return Nn(t);
  let n = e.match(/^matrix3d\(([-\d.e\s,]+)\)$/u),
    r,
    i;
  if (n) ((r = Mn), (i = n));
  else {
    let t = e.match(/^matrix\(([-\d.e\s,]+)\)$/u);
    ((r = Dn), (i = t));
  }
  if (!i) return Nn(t);
  let a = r[t],
    o = i[1].split(`,`).map(In);
  return typeof a == `function` ? a(o) : o[a];
}
var Fn = (e, t) => {
  let { transform: n = `none` } = getComputedStyle(e);
  return Pn(n, t);
};
function In(e) {
  return parseFloat(e.trim());
}
var Ln = [
    `transformPerspective`,
    `x`,
    `y`,
    `z`,
    `translateX`,
    `translateY`,
    `translateZ`,
    `scale`,
    `scaleX`,
    `scaleY`,
    `scaleZ`,
    `rotate`,
    `rotateX`,
    `rotateY`,
    `rotateZ`,
    `skew`,
    `skewX`,
    `skewY`,
  ],
  Rn = new Set([...Ln, `pathRotation`]),
  zn = (e) => e === xe || e === z,
  Bn = new Set([`x`, `y`, `z`]),
  Vn = Ln.filter((e) => !Bn.has(e));
function Hn(e) {
  let t = [];
  return (
    Vn.forEach((n) => {
      let r = e.getValue(n);
      if (r !== void 0) {
        let e = r.get(),
          i = +!!n.startsWith(`scale`);
        if (e === i) return;
        (t.push([n, e]), r.set(i));
      }
    }),
    t
  );
}
var Un = new Set([`bottom`, `right`]);
function Wn(e, t, n, r, i, a) {
  let o = parseFloat(e);
  if (!isNaN(o)) return o;
  let { min: s, max: c } = t()[n],
    l = c - s;
  return a === `border-box` ? l : l - parseFloat(r) - parseFloat(i);
}
var Gn = ({ transform: e }) => Pn(e, `x`),
  Kn = ({ transform: e }) => Pn(e, `y`),
  qn = {
    width: (
      { width: e, paddingLeft: t = `0`, paddingRight: n = `0`, boxSizing: r },
      i,
    ) => Wn(e, i, `x`, t, n, r),
    height: (
      { height: e, paddingTop: t = `0`, paddingBottom: n = `0`, boxSizing: r },
      i,
    ) => Wn(e, i, `y`, t, n, r),
    top: ({ top: e }) => parseFloat(e),
    left: ({ left: e }) => parseFloat(e),
    bottom: ({ top: e }, t) => {
      let { y: n } = t();
      return parseFloat(e) + (n.max - n.min);
    },
    right: ({ left: e }, t) => {
      let { x: n } = t();
      return parseFloat(e) + (n.max - n.min);
    },
    x: Gn,
    y: Kn,
    translateX: Gn,
    translateY: Kn,
  },
  Jn = new Set(),
  Yn = !1,
  Xn = !1,
  Zn = !1;
function Qn() {
  if (Xn) {
    let e = [],
      t = new Set(),
      n = new Set();
    Jn.forEach((r) => {
      r.needsMeasurement &&
        (e.push(r), t.add(r.element), Un.has(r.name) && n.add(r.element));
    });
    let r = new Map();
    (n.forEach((e) => {
      let t = Hn(e);
      t.length && (r.set(e, t), e.render());
    }),
      e.forEach((e) => e.measureInitialState()),
      t.forEach((e) => {
        e.render();
        let t = r.get(e);
        t &&
          t.forEach(([t, n]) => {
            e.getValue(t)?.set(n);
          });
      }),
      e.forEach((e) => e.measureEndState()),
      e.forEach((e) => {
        e.suspendedScrollY !== void 0 && window.scrollTo(0, e.suspendedScrollY);
      }));
  }
  ((Xn = !1), (Yn = !1), Jn.forEach((e) => e.complete(Zn)), Jn.clear());
}
function $n() {
  Jn.forEach((e) => {
    (e.readKeyframes(), e.needsMeasurement && (Xn = !0));
  });
}
function er() {
  ((Zn = !0), $n(), Qn(), (Zn = !1));
}
function tr(e, t, n) {
  if (typeof e == `string`) {
    if (h(e) || _(e)) return parseFloat(e);
    if (!W.test(e) && W.test(n)) return Cn(t, n);
  }
  return e ?? void 0;
}
var nr = class {
    constructor(e, t, n, r, i, a = !1) {
      ((this.state = `pending`),
        (this.isAsync = !1),
        (this.needsMeasurement = !1),
        (this.unresolvedKeyframes = [...e]),
        (this.onComplete = t),
        (this.name = n),
        (this.motionValue = r),
        (this.element = i),
        (this.isAsync = a));
    }
    scheduleResolve() {
      ((this.state = `scheduled`),
        this.isAsync
          ? (Jn.add(this),
            Yn || ((Yn = !0), q.read($n), q.resolveKeyframes(Qn)))
          : (this.readKeyframes(), this.complete()));
    }
    readKeyframes() {
      let {
        unresolvedKeyframes: e,
        name: t,
        element: n,
        motionValue: r,
      } = this;
      if (e[0] === null) {
        let i = r?.get(),
          a = e[e.length - 1];
        if (i !== void 0) e[0] = i;
        else if (n && t) {
          let r = tr(n.readValue(t, a), t, a);
          r !== void 0 && (e[0] = r);
        }
        (e[0] === void 0 && (e[0] = a), r && i === void 0 && r.set(e[0]));
      }
      wn(e);
    }
    setFinalKeyframe() {}
    measureInitialState() {}
    renderEndStyles() {}
    measureEndState() {}
    complete(e = !1) {
      ((this.state = `complete`),
        this.onComplete(this.unresolvedKeyframes, this.finalKeyframe, e),
        Jn.delete(this));
    }
    cancel() {
      this.state === `scheduled` && (Jn.delete(this), (this.state = `pending`));
    }
    resume() {
      this.state === `pending` && this.scheduleResolve();
    }
  },
  rr = (e) => e.startsWith(`--`);
function ir(e, t, n) {
  rr(t) ? e.style.setProperty(t, n) : (e.style[t] = n);
}
var ar = {};
function or(e, t) {
  let n = v(e);
  return () => ar[t] ?? n();
}
var sr = or(() => window.ScrollTimeline !== void 0, `scrollTimeline`),
  cr = or(() => {
    try {
      document
        .createElement(`div`)
        .animate({ opacity: 0 }, { easing: `linear(0, 1)` });
    } catch {
      return !1;
    }
    return !0;
  }, `linearEasing`),
  lr = ([e, t, n, r]) => `cubic-bezier(${e}, ${t}, ${n}, ${r})`,
  ur = {
    linear: `linear`,
    ease: `ease`,
    easeIn: `ease-in`,
    easeOut: `ease-out`,
    easeInOut: `ease-in-out`,
    circIn: lr([0, 0.65, 0.55, 1]),
    circOut: lr([0.55, 0, 1, 0.45]),
    backIn: lr([0.31, 0.01, 0.66, -0.59]),
    backOut: lr([0.33, 1.53, 0.69, 0.99]),
  };
function dr(e, t) {
  if (e)
    return typeof e == `function`
      ? cr()
        ? Tt(e, t)
        : `ease-out`
      : ue(e)
        ? lr(e)
        : Array.isArray(e)
          ? e.map((e) => dr(e, t) || ur.easeOut)
          : ur[e];
}
function fr(
  e,
  t,
  n,
  {
    delay: r = 0,
    duration: i = 300,
    repeat: a = 0,
    repeatType: o = `loop`,
    ease: s = `easeOut`,
    times: c,
  } = {},
  l = void 0,
) {
  let u = { [t]: n };
  c && (u.offset = c);
  let d = dr(s, i);
  Array.isArray(d) && (u.easing = d);
  let f = {
    delay: r,
    duration: i,
    easing: Array.isArray(d) ? `linear` : d,
    fill: `both`,
    iterations: a + 1,
    direction: o === `reverse` ? `alternate` : `normal`,
  };
  return (l && (f.pseudoElement = l), e.animate(u, f));
}
function pr(e) {
  return typeof e == `function` && `applyToOptions` in e;
}
function mr({ type: e, ...t }) {
  return pr(e) && cr()
    ? e.applyToOptions(t)
    : ((t.duration ??= 300), (t.ease ??= `easeOut`), t);
}
var hr = class extends cn {
    constructor(e) {
      if (
        (super(),
        (this.finishedTime = null),
        (this.isStopped = !1),
        (this.manualStartTime = null),
        !e)
      )
        return;
      let {
        element: t,
        name: n,
        keyframes: r,
        pseudoElement: i,
        allowFlatten: a = !1,
        finalKeyframe: o,
        onComplete: s,
      } = e;
      ((this.isPseudoElement = !!i),
        (this.allowFlatten = a),
        (this.options = e),
        e.type);
      let c = mr(e);
      ((this.animation = fr(t, n, r, c, i)),
        c.autoplay === !1 && this.animation.pause(),
        (this.animation.onfinish = () => {
          if (((this.finishedTime = this.time), !i)) {
            let e = $t(r, this.options, o, this.speed);
            (this.updateMotionValue && this.updateMotionValue(e),
              ir(t, n, e),
              this.animation.cancel());
          }
          (s?.(), this.notifyFinished());
        }),
        on(this, e, c));
    }
    play() {
      this.isStopped ||
        ((this.manualStartTime = null),
        this.animation.play(),
        this.state === `finished` && this.updateFinished());
    }
    pause() {
      this.animation.pause();
    }
    complete() {
      this.animation.finish?.();
    }
    cancel() {
      try {
        this.animation.cancel();
      } catch {}
    }
    stop() {
      this.isStopped ||
        ((this.isStopped = !0),
        this.state !== `idle` &&
          this.finishedTime === null &&
          (this.updateMotionValue
            ? this.updateMotionValue()
            : this.commitStyles(),
          this.isPseudoElement ||
            ((this.animation.onfinish = null), this.cancel())));
    }
    commitStyles() {
      let e = this.options?.element;
      !this.isPseudoElement &&
        e?.isConnected &&
        this.animation.commitStyles?.();
    }
    get duration() {
      let e = this.animation.effect?.getComputedTiming?.().duration || 0;
      return w(Number(e));
    }
    get iterationDuration() {
      let { delay: e = 0 } = this.options || {};
      return this.duration + w(e);
    }
    get time() {
      return w(Number(this.animation.currentTime) || 0);
    }
    set time(e) {
      let t = this.finishedTime !== null;
      ((this.manualStartTime = null),
        (this.finishedTime = null),
        (this.animation.currentTime = C(e)),
        t && this.animation.pause());
    }
    get speed() {
      return this.animation.playbackRate;
    }
    set speed(e) {
      (e < 0 && (this.finishedTime = null), (this.animation.playbackRate = e));
    }
    get state() {
      return this.finishedTime === null ? this.animation.playState : `finished`;
    }
    get startTime() {
      return this.manualStartTime ?? Number(this.animation.startTime);
    }
    set startTime(e) {
      this.manualStartTime = this.animation.startTime = e;
    }
    attachTimeline({ timeline: e, onAttach: t, observe: n }) {
      return (
        this.allowFlatten &&
          this.animation.effect?.updateTiming({ easing: `linear` }),
        (this.animation.onfinish = null),
        e && sr()
          ? ((this.animation.timeline = e), t?.(this.animation), y)
          : n(this)
      );
    }
  },
  gr = { anticipate: ne, backInOut: j, circInOut: ie };
function _r(e) {
  return e in gr;
}
function vr(e) {
  typeof e.ease == `string` && _r(e.ease) && (e.ease = gr[e.ease]);
}
var yr = class extends hr {
    constructor(e) {
      (vr(e),
        tn(e),
        super(e),
        e.startTime !== void 0 &&
          e.autoplay !== !1 &&
          (this.startTime = e.startTime),
        (this.options = e));
    }
    elapsed() {
      return this.state === `running`
        ? (F.now() - this.startTime) * this.speed
        : this.time * 1e3;
    }
    sample(e) {
      if (!this.sampler) {
        let {
          motionValue: e,
          onUpdate: t,
          onComplete: n,
          onPlay: r,
          onStop: i,
          element: a,
          ...o
        } = this.options;
        ((this.sampler = new dn({ ...o, autoplay: !1 })), this.sampler.stop());
      }
      return this.sampler.sample(Math.max(0, e)).value;
    }
    liveValue() {
      let { state: e } = this;
      if (e === `running` || e === `paused`) return this.sample(this.elapsed());
    }
    updateMotionValue(e) {
      let { motionValue: t, element: n, name: r } = this.options;
      if (!t) return;
      if (e !== void 0) {
        t.set(e);
        return;
      }
      let { speed: i } = this,
        a = this.elapsed(),
        o = this.state === `running` && i ? p(0, 10, a) : 0,
        s = this.sample(a);
      (n && r && ir(n, r, s),
        t.setWithVelocity(
          this.sample(a - o * Math.sign(i)),
          s,
          o / Math.abs(i || 1),
        ));
    }
  },
  br = (e, t) =>
    t !== `zIndex` &&
    !!(
      typeof e == `number` ||
      Array.isArray(e) ||
      (typeof e == `string` &&
        (W.test(e) || e === `0`) &&
        !e.startsWith(`url(`))
    );
function xr(e) {
  let t = e[0];
  if (e.length === 1) return !0;
  for (let n = 0; n < e.length; n++) if (e[n] !== t) return !0;
}
function Sr(e, t, n, r) {
  let i = e[0];
  if (i === null) return !1;
  if (t === `display` || t === `visibility`) return !0;
  let a = e[e.length - 1],
    o = br(i, t),
    s = br(a, t);
  return !o || !s
    ? (o !== s && `${t}${i}${a}${o ? a : i}`, !1)
    : xr(e) || ((n === `spring` || pr(n)) && r);
}
function Cr(e) {
  ((e.duration = 0), (e.type = `keyframes`));
}
var wr = new Set([
    `opacity`,
    `clipPath`,
    `filter`,
    `transform`,
    `backgroundColor`,
  ]),
  Tr = /^(?:oklch|oklab|lab|lch|color|color-mix|light-dark)\(/;
function Er(e) {
  for (let t = 0; t < e.length; t++)
    if (typeof e[t] == `string` && Tr.test(e[t])) return !0;
  return !1;
}
var Dr = new Set([
    `color`,
    `backgroundColor`,
    `outlineColor`,
    `fill`,
    `stroke`,
    `borderColor`,
    `borderTopColor`,
    `borderRightColor`,
    `borderBottomColor`,
    `borderLeftColor`,
  ]),
  Or = () =>
    !m.useManualTiming &&
    Object.hasOwnProperty.call(Element.prototype, `animate`);
function kr(e) {
  let {
    motionValue: t,
    name: n,
    repeatDelay: r,
    repeatType: i,
    damping: a,
    type: o,
    keyframes: s,
  } = e;
  if (!n || !(wr.has(n) || Dr.has(n))) return !1;
  let c = t?.owner?.current;
  if (!(c instanceof HTMLElement) && !(c instanceof SVGElement)) return !1;
  let { onUpdate: l, transformTemplate: u } = t.owner.getProps();
  return (
    Or() &&
    (wr.has(n) || (Dr.has(n) && Er(s))) &&
    (n !== `transform` || !u) &&
    !l &&
    !r &&
    i !== `mirror` &&
    a !== 0 &&
    o !== `inertia`
  );
}
var Ar = (e, t) => (t && typeof e == `number` ? t.transform(e) : e),
  jr = {
    x: `translateX`,
    y: `translateY`,
    z: `translateZ`,
    transformPerspective: `perspective`,
  },
  Mr = Ln.length;
function Nr(e, t, n) {
  let r = ``,
    i = !0;
  for (let a = 0; a < Mr; a++) {
    let o = Ln[a],
      s = e[o];
    if (s === void 0) continue;
    let c = !0;
    if (typeof s == `number`) c = s === +!!o.startsWith(`scale`);
    else {
      let e = parseFloat(s);
      c = o.startsWith(`scale`) ? e === 1 : e === 0;
    }
    if (!c || n) {
      let e = Ar(s, yn[o]);
      if (!c) {
        i = !1;
        let t = jr[o] || o;
        r += `${t}(${e}) `;
      }
      n && (t[o] = e);
    }
  }
  let a = e.pathRotation;
  return (
    a && ((i = !1), (r += `rotate(${Ar(a, yn.pathRotation)}) `)),
    (r = r.trim()),
    n ? (r = n(t, i ? `` : r)) : i && (r = `none`),
    r
  );
}
var Pr = new WeakMap(),
  Fr = 200,
  Ir = 0.001,
  Lr = 0.1,
  Rr = 0.001,
  zr = 100,
  Br = (e) => /^(linear|ease(In|Out|InOut))$/.test(e),
  Vr = (e, t) => e - t,
  Hr = (e, t, n) => {
    let r = [];
    for (let i = 0; i <= n; i++) r.push(K(e, t, i / n));
    return r;
  },
  Ur = (e) => e.motionValue.owner,
  Wr = (e) => Pr.get(e),
  Gr = (e, t) => (e.latestValues ? e.latestValues[t] : e.getValue(t)?.get()),
  Kr = ({ name: e, motionValue: t }) =>
    e &&
    Ln.includes(e) &&
    t?.owner?.current instanceof HTMLElement &&
    Or() &&
    cr();
function qr(e) {
  let t = Ur(e),
    { onUpdate: n, transformTemplate: r } = t.getProps();
  return (
    !e.isHandoff &&
    !n &&
    !e.hasOnUpdate &&
    !r &&
    e.type !== `inertia` &&
    (Gr(t, `transform`) || `none`) === `none` &&
    !Gr(t, `pathRotation`) &&
    !t.projection?.isProjecting()
  );
}
var Jr = class extends dn {
  constructor(e) {
    let t = Ur(e).current,
      { driver: n = wt } = e,
      r,
      i = qr(e);
    ((e.driver = (e) => {
      let i = n(e);
      return {
        js: i,
        now: i.now,
        start: (e = !0) => {
          let n = Wr(t);
          !n || n.isJS ? i.start(e) : n.schedule(!1, !e);
        },
        stop: () => {
          i.stop();
          let e = Wr(t);
          e && !e.isFinishing && e.release(r);
        },
      };
    }),
      super(e),
      (r = this),
      (this.canAccelerate = i));
    let { stop: a } = this;
    this.stop = () => {
      (this.isAccelerated() && this.sync(), a());
    };
  }
  get group() {
    return Wr(Ur(this.options).current);
  }
  get js() {
    return this.driver?.js;
  }
  get name() {
    return this.options.name;
  }
  timing() {
    let { startTime: e, speed: t, totalDuration: n } = this,
      { delay: r = 0, repeatType: i } = this.options;
    return this.holdTime === null
      ? n === 1 / 0
        ? [e + r / t, (this.resolvedDuration * (i === `loop` ? 1 : 2)) / t || 1]
        : [e + (r + n) / t, 0]
      : [1 / 0, 0];
  }
  isAccelerated() {
    let { group: e, state: t } = this;
    return (
      e?.tracks.has(this) &&
      !e.isJS &&
      this.canAccelerate &&
      (t === `running` || t === `paused`)
    );
  }
  liveValue() {
    return this.isAccelerated() ? this.sampleAt(F.now()) : void 0;
  }
  tween() {
    let {
        keyframes: e,
        type: t,
        ease: n,
        times: r,
        repeat: i,
        delay: a = 0,
      } = this.options,
      o = ue(n) ? lr(n) : Br(n) && ur[n];
    if (o && !i && !r && e.length === 2 && t === Jt && this.holdTime === null) {
      let e = this.startTime + a / this.speed;
      return [e, e + this.resolvedDuration / this.speed, o];
    }
  }
  boundaries(e, t) {
    let { startTime: n, speed: r, resolvedDuration: i, options: a } = this,
      {
        delay: o = 0,
        repeat: s = 0,
        repeatDelay: c = 0,
        repeatType: l,
        times: u,
        keyframes: d,
        type: f,
      } = a,
      p = (f || Jt) === Jt ? u || Gt(d) : [0, 1],
      m = n + o / r,
      h = [];
    if (this.holdTime !== null || !(i > 0)) return h;
    for (let n = Math.max(0, Math.floor(((e - m) * r) / i)); n <= s; n++) {
      let a = m + (n * i) / r;
      if (a > t) break;
      for (let o of p) {
        let s = a + ((n % 2 && l && l !== `loop` ? 1 - o : o) * (i - c)) / r;
        s > e && s < t && h.push(s);
      }
    }
    return h;
  }
  numberAt(e) {
    return parseFloat(this.sampleAt(e, !0));
  }
  sync() {
    let e = F.now();
    this.options.motionValue.setWithVelocity(
      this.sampleAt(e - 10, !0),
      this.sampleAt(e, !0),
      10,
    );
  }
  play() {
    this.isStopped ||
      ((this.group || Yr(Ur(this.options))).tracks.add(this), super.play());
  }
  pause() {
    (super.pause(),
      this.isAccelerated() && (this.sync(), this.group.schedule(!1)));
  }
  complete() {
    super.complete();
    let { group: e } = this;
    e && !e.isJS && this.canAccelerate && this.tick(F.now());
  }
  get time() {
    return this.isAccelerated()
      ? w(
          p(
            0,
            this.totalDuration,
            this.at(F.now()) - (this.options.delay || 0),
          ),
        )
      : super.time;
  }
  set time(e) {
    ((super.time = e), this.isAccelerated() && this.sync());
  }
  attachTimeline(e) {
    return (
      (this.canAccelerate = !1),
      this.group?.demote(!0),
      super.attachTimeline(e)
    );
  }
};
function Yr(e) {
  let t = e.current,
    n = new Set(),
    r = new Map(),
    i = {},
    a = [],
    o = new Map(),
    s = [],
    c = !1,
    l = !1,
    u = !1,
    d = !1,
    f = -1 / 0,
    p = (e) => {
      for (let t of n) if (t.name === e) return !0;
    },
    m = (t, n) => {
      let o = {};
      for (let s of t === void 0 ? Ln : a) {
        let a = r.get(s),
          c =
            t === void 0
              ? Gr(e, s)
              : a
                ? a.sampleAt(n > t && !a.timing()[1] ? n : t)
                : i[s];
        c !== void 0 && (o[s] = c);
      }
      return o;
    },
    h = (e, t) => {
      let n = ``,
        r = m(e, t);
      for (let e in r) n += (jr[e] || e) + `(` + Ar(r[e], yn[e]) + `) `;
      return n || `none`;
    },
    g = (e = m()) => {
      t.style.transform = Nr(e, {});
    },
    _ = (e = !0) => {
      (e && g(), s.forEach(({ animation: e }) => e.cancel()), (s = []));
    },
    v = (e, t, n = 1 / 0) => {
      let r = { animation: e, offset: t, end: n };
      ((e.startTime = F.now() + t),
        n < 1 / 0 &&
          (e.onfinish = () => {
            ((r.isDone = !0),
              s.some((e) => e.end === 1 / 0) &&
                (e.cancel(), (s = s.filter((e) => e !== r))),
              O.schedule(!1));
          }),
        (e.oncancel = () => s.includes(r) && O.demote()),
        s.push(r));
    },
    y = (e, t, n) => {
      let r = (t, n) => Math.abs(e(n) - e(t)),
        i = r(t, n);
      for (; n - t > 0.01;) {
        let e = (t + n) / 2;
        r(t, e) > r(e, n) ? (n = e) : (t = e);
      }
      return r(t, n) > i / 2 ? [t, n] : [];
    },
    b = (e, t, n, r) => {
      let i = Math.min(Fr, Math.max(2, Math.ceil((n - t) / 10)));
      if (r.length * 4 > i) return;
      let a = Hr(t, n, i).concat(r).sort(Vr),
        o = (e) => x(t, n, e),
        s,
        c;
      for (let t of e) {
        let e = a.map((e) => t.numberAt(e)),
          [n] = e,
          r = e.map((e) => e - n),
          i = r[r.length - 1],
          o = r.some((e) => Math.abs(e) * Ir > Math.abs(i)) ? 0 : i,
          l = r.map((e) => (o ? e / o : e));
        if (!o) {
          if (l.some((e) => !(Math.abs(e) <= Ir))) return;
        } else if (!s) ((s = l), (c = (e) => (t.numberAt(e) - n) / o));
        else if (l.some((e, t) => !(Math.abs(e - s[t]) <= Ir))) return;
      }
      if (!s || s.every((e, t) => Math.abs(e - o(a[t])) <= Ir)) return `linear`;
      let l = [],
        u = (e, t = c(e)) => l.push(un(t) + ` ` + un(o(e) * 100) + `%`);
      return (
        s.forEach((e, t) => {
          (t &&
            Math.abs(e - s[t - 1]) > 0.2 &&
            y(c, a[t - 1], a[t]).forEach((e) => u(e)),
            u(a[t], e));
        }),
        `linear(` + l + `)`
      );
    },
    S = (e, t, n, r) => {
      let i = [t],
        a = (t, n) =>
          e.every(
            (e) =>
              !(
                Math.abs(
                  e.numberAt((t + n) / 2) - (e.numberAt(t) + e.numberAt(n)) / 2,
                ) > (e.name.startsWith(`scale`) ? Rr : Lr)
              ),
          ),
        o = (t, n, r) => {
          if (n - t < 1 || a(t, n)) i.push(n);
          else if (r < 4) (o(t, (t + n) / 2, r + 1), o((t + n) / 2, n, r + 1));
          else {
            for (let r of e) i.push(...y((e) => r.numberAt(e), t, n));
            i.push(n);
          }
        },
        s = Hr(t, n, Math.ceil((n - t) / 100));
      for (let e of r) s.push(e, Math.min(e + 0.01, n));
      let c = t;
      for (let e of s.sort(Vr)) (e > c && o(c, e, 0), (c = e));
      return i.sort(Vr);
    },
    C = (e) => {
      let t;
      for (let n of e) {
        let e = n.tween();
        if (
          !e ||
          t?.some((t, n) => (n < 2 ? Math.abs(e[n] - t) > 1 : e[n] !== t))
        )
          return;
        t = e;
      }
      return t;
    },
    w = (e, n, r, i = { fill: `both` }, a, o) => {
      let s = e.flatMap((e) => e.boundaries(n, r)),
        c = o || b(e, n, r, s),
        l = c ? [n, r] : S(e, n, r, s),
        u = l.map((e) => h(e, a)),
        d = { transform: u };
      return (
        c || (d.offset = l.map((e) => x(n, r, e))),
        u.every((e) => e === u[0]) && (g(m(n, a)), (d = null)),
        t.animate(d, { ...i, duration: r - n, easing: c || `linear` })
      );
    },
    T = (c) => {
      let l = c,
        u = 0,
        d = 0,
        f = [],
        p = [],
        m = new Set();
      (r.clear(), (o = new Map()));
      for (let e of n) {
        r.set(e.name, e);
        let [t, n] = e.timing(),
          i = t === 1 / 0;
        if ((o.set(e, [e.at(c), e.speed, i]), i)) e.sync();
        else {
          if (e.speed < 0) return;
          if (n) {
            if (u) {
              let e = (t - d) / n;
              if (Math.abs(n - u) > 1 || Math.abs(e - Math.round(e)) * u > 1)
                return;
            } else ((u = n), (d = t));
            p.push(e);
          } else m.add(t);
          (f.push(e), (l = Math.max(l, t)));
        }
      }
      ((i = {}),
        (a = Ln.filter((t) => {
          if (r.has(t)) return !0;
          let n = (i[t] = Gr(e, t));
          return n !== void 0 && parseFloat(n) !== +!!t.startsWith(`scale`);
        })),
        _(!1));
      let h = !u && C(f);
      try {
        if (h && h[1] > c) {
          let [e, t, n] = h;
          v(w(f, e, t, void 0, void 0, n), e - c, t - e);
        } else
          l > c &&
            (v(w(f, c, l), 0, l - c),
            m.forEach(
              (e) =>
                e < l - 1 && v(t.animate(null, { duration: e - c }), 0, e - c),
            ));
        if (u) {
          let e = d + Math.floor((l - d) / u) * u;
          v(
            w(
              p,
              e,
              e + u,
              {
                iterations: 1 / 0,
                iterationStart: (l - e) / u,
                fill: `forwards`,
              },
              l,
            ),
            l - c,
          );
        }
      } catch {
        return;
      }
      return (s.length || _(), !0);
    },
    ee = (e) => {
      let t,
        r = 0;
      for (let i of n) {
        let n = o.get(i);
        if (!n) return !1;
        let [a, s, c] = n,
          l = i.at(e),
          u = i.timing()[0] === 1 / 0;
        if (c) {
          if (u && l === a) continue;
          return !1;
        }
        let d = (l - a) / s,
          f = u ? 0 : i.speed / s;
        if (t === void 0) ((t = d), (r = f));
        else if (Math.abs(d - t) > 1 || f !== r) return !1;
      }
      if (t === void 0) return !0;
      if (!s.length) return !1;
      for (let { offset: e, end: n, isDone: r } of s) {
        let i = t - e;
        if (n < 1 / 0 && (r ? i < n - 1 : i < 0 || i >= n)) return !1;
      }
      for (let { animation: n, offset: i, isDone: a } of s) {
        if (a) continue;
        let o = t - i;
        r
          ? ((n.playbackRate = r), (n.startTime = e - o / r))
          : (n.pause(), (n.currentTime = o));
      }
      return !0;
    },
    E = () =>
      !n.size && ((u = !0), Wr(t) === O && Pr.delete(t), O.isJS || _(), !0),
    D = () => {
      let t = F.now();
      if (
        (O.isJS ||
          ((O.isFinishing = !0),
          n.forEach((n) => {
            let [r, a] = n.timing();
            n.state === `running` &&
              n.speed > 0 &&
              !a &&
              r <= t + 1 &&
              (n.complete(), (i[n.name] = Gr(e, n.name)), o.has(n) || (c = !0));
          }),
          (O.isFinishing = !1)),
        (l = !1),
        u ||
          (n.forEach(({ state: e }, t) => {
            (e === `idle` || e === `finished`) && n.delete(t);
          }),
          E()))
      )
        return;
      for (let e of n) if (!e.canAccelerate) return O.demote(!0);
      O.isJS && ((O.isJS = !1), (c = !0), n.forEach((e) => e.js?.stop()));
      let r = c,
        a = d;
      if (((c = d = !1), r || !ee(t))) {
        if (a) {
          if (t - f < zr) return O.demote();
          f = t;
        }
        if (!T(t)) return O.demote();
      }
    },
    O = {
      tracks: n,
      isJS: !1,
      isFinishing: !1,
      schedule(e, t) {
        u ||
          ((c ||= e),
          (d ||= !!t),
          l ||
            ((l = !0),
            P.isProcessing ? q.render(D, !1, !0) : queueMicrotask(D)));
      },
      release(e) {
        let { state: t } = e;
        ((t === `idle` || t === `finished`) && n.delete(e),
          E() || O.schedule(!0));
      },
      check() {
        if (!O.isJS) {
          for (let t in i)
            if (Gr(e, t) !== i[t] && !p(t)) return O.schedule(!0, !0);
        }
      },
      demote(e) {
        O.isJS ||
          u ||
          (n.forEach((t) => {
            (t.isAccelerated() && t.sync(), e || (t.canAccelerate = !1));
          }),
          (O.isJS = !0),
          (o = new Map()),
          _(),
          n.forEach((e) => e.state === `running` && e.js?.start()));
      },
    };
  return (Pr.set(t, O), O);
}
var Xr = class extends cn {
    constructor(e) {
      (super(),
        (this.stop = () => {
          (this._animation && (this._animation.stop(), this.stopTimeline?.()),
            this.keyframeResolver?.cancel());
        }),
        (this.createdAt = F.now()));
      let { keyframes: t, name: n, motionValue: r, element: i } = e,
        a = e;
      ((a.autoplay ??= !0),
        (a.delay ??= 0),
        (a.type ??= `keyframes`),
        (a.repeat ??= 0),
        (a.repeatDelay ??= 0),
        (a.repeatType ??= `loop`));
      let o = i?.KeyframeResolver || nr;
      ((this.keyframeResolver = new o(
        t,
        (e, t, n) => this.onKeyframesResolved(e, t, a, !n),
        n,
        r,
        i,
      )),
        this.keyframeResolver?.scheduleResolve());
    }
    onKeyframesResolved(e, t, n, r) {
      this.keyframeResolver = void 0;
      let {
        name: i,
        type: a,
        velocity: o,
        delay: s,
        isHandoff: c,
        onUpdate: l,
      } = n;
      this.resolvedAt = F.now();
      let u = !0;
      Sr(e, i, a, o) ||
        ((u = !1),
        (m.instantAnimations || !s) && l?.($t(e, n, t)),
        (e[0] = e[e.length - 1]),
        Cr(n),
        (n.repeat = 0));
      let { onComplete: d } = n;
      ((n.finalKeyframe = t),
        (n.keyframes = e),
        (n.onComplete = () => {
          (d?.(), this.notifyFinished());
        }));
      let f = u && !c && kr(n),
        p = !f && Kr(n);
      r &&
        (f || p || this.resolvedAt !== this.createdAt) &&
        (n.startTime ??= rn(this.createdAt, this.resolvedAt));
      let h;
      if (f) {
        n.element = n.motionValue?.owner?.current;
        try {
          h = new yr(n);
        } catch {
          h = new dn(n);
        }
      } else h = p ? new Jr(n) : new dn(n);
      ((this.pendingTimeline &&=
        ((this.stopTimeline = h.attachTimeline(this.pendingTimeline)), void 0)),
        (this._animation = h));
    }
    get finished() {
      return this._animation ? this._animation.finished : super.finished;
    }
    then(e, t) {
      return this.finished.finally(e).then(() => {});
    }
    liveValue() {
      return this._animation?.liveValue?.();
    }
    get animation() {
      return (
        this._animation || (this.keyframeResolver?.resume(), er()),
        this._animation
      );
    }
    get duration() {
      return this.animation.duration;
    }
    get iterationDuration() {
      return this.animation.iterationDuration;
    }
    get time() {
      return this.animation.time;
    }
    set time(e) {
      this.animation.time = e;
    }
    get speed() {
      return this.animation.speed;
    }
    get state() {
      return this.animation.state;
    }
    set speed(e) {
      this.animation.speed = e;
    }
    get startTime() {
      return this.animation.startTime;
    }
    attachTimeline(e) {
      return (
        this._animation
          ? (this.stopTimeline = this.animation.attachTimeline(e))
          : (this.pendingTimeline = e),
        () => this.stop()
      );
    }
    play() {
      this.animation.play();
    }
    pause() {
      this.animation.pause();
    }
    complete() {
      this.animation.complete();
    }
    cancel() {
      (this._animation && this.animation.cancel(),
        this.keyframeResolver?.cancel());
    }
  },
  Zr = class {
    constructor(e) {
      ((this.stop = () => this.runAll(`stop`)),
        (this.animations = e.filter(Boolean)));
    }
    get finished() {
      return Promise.all(this.animations.map((e) => e.finished));
    }
    getAll(e) {
      return this.animations[0][e];
    }
    setAll(e, t) {
      for (let n = 0; n < this.animations.length; n++)
        this.animations[n][e] = t;
    }
    attachTimeline(e) {
      let t = this.animations.map((t) => t.attachTimeline(e));
      return () => {
        t.forEach((e, t) => {
          (e && e(), this.animations[t].stop());
        });
      };
    }
    get time() {
      return this.getAll(`time`);
    }
    set time(e) {
      this.setAll(`time`, e);
    }
    get speed() {
      return this.getAll(`speed`);
    }
    set speed(e) {
      this.setAll(`speed`, e);
    }
    get state() {
      return this.getAll(`state`);
    }
    get startTime() {
      return this.getAll(`startTime`);
    }
    get duration() {
      return Qr(this.animations, `duration`);
    }
    get iterationDuration() {
      return Qr(this.animations, `iterationDuration`);
    }
    runAll(e) {
      this.animations.forEach((t) => t[e]());
    }
    play() {
      this.runAll(`play`);
    }
    pause() {
      this.runAll(`pause`);
    }
    cancel() {
      this.runAll(`cancel`);
    }
    complete() {
      this.runAll(`complete`);
    }
  };
function Qr(e, t) {
  let n = 0;
  for (let r = 0; r < e.length; r++) {
    let i = e[r][t];
    i !== null && i > n && (n = i);
  }
  return n;
}
var $r = class extends Zr {
  then(e, t) {
    return this.finished.finally(e).then(() => {});
  }
};
function ei(e, t, n, r = 0, i = 1) {
  let a = Array.from(e)
      .sort((e, t) => e.sortNodePosition(t))
      .indexOf(t),
    o = e.size,
    s = (o - 1) * r;
  return typeof n == `function` ? n(a, o) : i === 1 ? a * r : s - a * r;
}
var ti = 30,
  ni = (e) => !isNaN(parseFloat(e)),
  ri = { current: void 0 },
  ii = class {
    constructor(e, t = {}) {
      ((this.canTrackVelocity = null),
        (this.events = {}),
        (this.updateAndNotify = (e) => {
          let t = F.now();
          if (
            (this.updatedAt !== t && this.setPrevFrameValue(),
            (this.prev = this.current),
            this.setCurrent(e),
            this.current !== this.prev &&
              (this.notifyChange(), this.dependents))
          )
            for (let e of this.dependents) e.dirty();
        }),
        (this.hasAnimated = !1),
        this.setCurrent(e),
        (this.owner = t.owner));
    }
    setCurrent(e) {
      ((this.current = e),
        (this.updatedAt = F.now()),
        this.canTrackVelocity === null &&
          e !== void 0 &&
          (this.canTrackVelocity = ni(this.current)));
    }
    setPrevFrameValue(e = this.current) {
      ((this.prevFrameValue = e), (this.prevUpdatedAt = this.updatedAt));
    }
    onChange(e) {
      return this.on(`change`, e);
    }
    on(e, t) {
      var n;
      return e === `change`
        ? this.onChangeSubscribe(t)
        : ((n = this.events)[e] || (n[e] = new S())).add(t);
    }
    onChangeSubscribe(e) {
      let { events: t } = this;
      return (
        !t.change && !this.changeSubscriber
          ? (this.changeSubscriber = e)
          : (t.change ||
              ((t.change = new S()),
              t.change.add(this.changeSubscriber),
              (this.changeSubscriber = void 0)),
            t.change.add(e)),
        () => {
          (this.changeSubscriber === e
            ? (this.changeSubscriber = void 0)
            : t.change?.remove(e),
            this.stopIfUnobserved());
        }
      );
    }
    stopIfUnobserved() {
      q.read(() => {
        !this.changeSubscriber && !this.events.change?.getSize() && this.stop();
      });
    }
    clearListeners() {
      this.changeSubscriber = void 0;
      for (let e in this.events) this.events[e].clear();
    }
    attach(e, t) {
      ((this.passiveEffect = e), (this.stopPassiveEffect = t));
    }
    set(e) {
      this.passiveEffect
        ? this.passiveEffect(e, this.updateAndNotify)
        : this.updateAndNotify(e);
    }
    setWithVelocity(e, t, n) {
      (this.set(t),
        (this.prev = void 0),
        (this.prevFrameValue = e),
        (this.prevUpdatedAt = this.updatedAt - n));
    }
    jump(e, t = !0) {
      (this.updateAndNotify(e),
        (this.prev = e),
        (this.prevUpdatedAt = this.prevFrameValue = void 0),
        t && this.stop(),
        this.stopPassiveEffect && this.stopPassiveEffect());
    }
    dirty() {
      this.notifyChange();
    }
    notifyChange() {
      let { current: e, changeSubscriber: t } = this;
      t ? t(e) : this.events.change?.notify(e);
    }
    addDependent(e) {
      ((this.dependents ||= new Set()), this.dependents.add(e));
    }
    removeDependent(e) {
      this.dependents && this.dependents.delete(e);
    }
    get() {
      ri.current && ri.current.push(this);
      let e = this.animation?.liveValue?.();
      return e === void 0 ? this.current : e;
    }
    getCurrent() {
      return this.current;
    }
    getPrevious() {
      return this.prev;
    }
    getVelocity() {
      let e = F.now();
      if (
        !this.canTrackVelocity ||
        this.prevFrameValue === void 0 ||
        e - this.updatedAt > ti
      )
        return 0;
      let t = Math.min(this.updatedAt - this.prevUpdatedAt, ti);
      return T(parseFloat(this.current) - parseFloat(this.prevFrameValue), t);
    }
    start(e) {
      return (
        this.stop(),
        new Promise((t) => {
          this.hasAnimated = !0;
          let n = !1,
            r;
          ((r = e(() => {
            ((n = !0),
              this.events.animationComplete?.notify(),
              this.animation === r && this.clearAnimation(),
              t());
          })),
            n || (this.animation = r),
            this.events.animationStart?.notify());
        })
      );
    }
    stop() {
      (this.animation &&
        (this.animation.stop(),
        this.events.animationCancel && this.events.animationCancel.notify()),
        this.clearAnimation());
    }
    isAnimating() {
      return !!this.animation;
    }
    clearAnimation() {
      this.animation = void 0;
    }
    destroy() {
      (this.dependents?.clear(),
        this.events.destroy?.notify(),
        this.clearListeners(),
        this.stop(),
        this.stopPassiveEffect && this.stopPassiveEffect());
    }
  };
function ai(e, t) {
  return new ii(e, t);
}
function oi(e, t) {
  if (e?.inherit && t) {
    let { inherit: n, ...r } = e;
    return { ...t, ...r };
  }
  return e;
}
function si(e, t) {
  let n = e?.[t] ?? e?.default ?? e;
  return n === e ? n : oi(n, e);
}
var ci = { type: `spring`, stiffness: 500, damping: 25, restSpeed: 10 },
  li = (e) => ({
    type: `spring`,
    stiffness: 550,
    damping: e === 0 ? 2 * Math.sqrt(550) : 30,
    restSpeed: 10,
  }),
  ui = { type: `keyframes`, duration: 0.8 },
  di = { type: `keyframes`, ease: [0.25, 0.1, 0.35, 1], duration: 0.3 },
  fi = (e, { keyframes: t }) =>
    t.length > 2
      ? ui
      : Rn.has(e)
        ? e.startsWith(`scale`)
          ? li(t[1])
          : ci
        : di,
  pi = new Set([
    `when`,
    `delay`,
    `delayChildren`,
    `staggerChildren`,
    `staggerDirection`,
    `repeat`,
    `repeatType`,
    `repeatDelay`,
    `from`,
    `elapsed`,
  ]);
function mi(e) {
  for (let t in e) if (!pi.has(t)) return !0;
  return !1;
}
var hi =
    (e, t, n, r = {}, i, a) =>
    (o) => {
      let s = si(r, e) || {},
        c = s.delay || r.delay || 0,
        { elapsed: l = 0 } = r;
      l -= C(c);
      let u = {
        keyframes: Array.isArray(n) ? n : [null, n],
        ease: `easeOut`,
        velocity: t.getVelocity(),
        ...s,
        delay: -l,
        onUpdate: (e) => {
          (t.set(e), s.onUpdate && s.onUpdate(e));
        },
        onComplete: () => {
          (o(), s.onComplete && s.onComplete());
        },
        name: e,
        motionValue: t,
        element: a ? void 0 : i,
        hasOnUpdate: !!s.onUpdate,
      };
      (mi(s) || Object.assign(u, fi(e, u)),
        (u.duration &&= C(u.duration)),
        (u.repeatDelay &&= C(u.repeatDelay)),
        u.from !== void 0 && (u.keyframes[0] = u.from));
      let d = !1;
      if (
        ((u.type === !1 || (u.duration === 0 && !u.repeatDelay)) &&
          (Cr(u), u.delay === 0 && (d = !0)),
        (m.instantAnimations ||
          m.skipAnimations ||
          i?.shouldSkipAnimations ||
          s.skipAnimations) &&
          ((d = !0), Cr(u), (u.delay = 0)),
        (u.allowFlatten = !s.type && !s.ease),
        d && !a && t.get() !== void 0)
      ) {
        let e = $t(u.keyframes, s);
        if (e !== void 0) {
          q.update(() => {
            (u.onUpdate(e), u.onComplete());
          });
          return;
        }
      }
      return s.isSync ? new dn(u) : new Xr(u);
    },
  gi = /^var\(--(?:([\w-]+)|([\w-]+), ?([a-zA-Z\d ()%#.,-]+))\)/u;
function _i(e) {
  let t = gi.exec(e);
  if (!t) return [,];
  let [, n, r, i] = t;
  return [`--${n ?? r}`, i];
}
function vi(e, t, n = 1) {
  `${e}`;
  let [r, i] = _i(e);
  if (!r) return;
  let a = window.getComputedStyle(t).getPropertyValue(r);
  if (a) {
    let e = a.trim();
    return h(e) ? parseFloat(e) : e;
  }
  return ve(i) ? vi(i, t, n + 1) : i;
}
function yi(e) {
  let t = [{}, {}];
  return (
    e?.values.forEach((e, n) => {
      ((t[0][n] = e.get()), (t[1][n] = e.getVelocity()));
    }),
    t
  );
}
function bi(e, t, n, r) {
  let i = (t) =>
    typeof t == `function` ? t(n === void 0 ? e.custom : n, ...yi(r)) : t;
  return (
    (t = i(t)),
    typeof t == `string` && (t = e.variants && e.variants[t]),
    i(t)
  );
}
function xi(e, t, n) {
  return bi(e.getProps(), t, n, e);
}
var Si = (e, t) => (t === `exit` ? e.presenceContext?.custom : void 0),
  Ci = new Set([`width`, `height`, `top`, `left`, `right`, `bottom`, ...Ln]),
  wi = (e) => Array.isArray(e);
function Ti(e, t, n) {
  e.hasValue(t) ? e.getValue(t).set(n) : e.addValue(t, ai(n));
}
function Ei(e) {
  return wi(e) ? e[e.length - 1] || 0 : e;
}
function Di(e, t) {
  let { transitionEnd: n = {}, transition: r = {}, ...i } = xi(e, t) || {};
  i = { ...i, ...n };
  for (let t in i) Ti(e, t, Ei(i[t]));
}
var Y = (e) => !!(e && e.getVelocity);
function Oi(e) {
  return !!(Y(e) && e.add);
}
function ki(e, t) {
  let n = e.getValue(`willChange`);
  if (Oi(n)) return n.add(t);
  if (!n && m.WillChange) {
    let n = new m.WillChange(`auto`);
    (e.addValue(`willChange`, n), n.add(t));
  }
}
var Ai = `data-framer-appear-id`;
function ji(e) {
  return e.props[Ai];
}
var Mi = typeof window < `u`;
function Ni({ protectedKeys: e, needsAnimating: t }, n) {
  let r = n in e && !t[n];
  return ((t[n] = !1), r);
}
function Pi(e, t, { delay: n = 0, transitionOverride: r, type: i } = {}) {
  let { transition: a, transitionEnd: o, ...s } = t,
    c = e.getDefaultTransition();
  a = a ? oi(a, c) : c;
  let l = a?.reduceMotion,
    u = a?.skipAnimations;
  r && (a = r);
  let d = [],
    f = i && e.animationState?.getState()[i],
    p = a?.path;
  p &&
    (p.animateValues
      ? p.animateValues(
          (t) => e.getValue(t, e.latestValues[t] ?? 0),
          s,
          a,
          n,
          d,
        )
      : p.animateVisualElement?.(e, s, a, n, d));
  for (let t in s) {
    let r = e.getValue(t, e.latestValues[t] ?? null),
      i = s[t];
    if (i === void 0 || (f && Ni(f, t))) continue;
    let o = { delay: n, ...si(a || {}, t) };
    u && (o.skipAnimations = !0);
    let c = r.get();
    if (
      c !== void 0 &&
      !r.isAnimating() &&
      !Array.isArray(i) &&
      i === c &&
      !o.velocity
    ) {
      q.update(() => r.set(i));
      continue;
    }
    let p = !1;
    if (Mi && window.MotionHandoffAnimation) {
      let n = ji(e);
      if (n) {
        let e = window.MotionHandoffAnimation(n, t, q);
        e !== null && ((o.startTime = e), (p = !0));
      }
    }
    ki(e, t);
    let m = l ?? e.shouldReduceMotion;
    r.start(hi(t, r, i, m && Ci.has(t) ? { type: !1 } : o, e, p));
    let h = r.animation;
    h && d.push(h);
  }
  if (o) {
    let t = () =>
      q.update(() => {
        o && Di(e, o);
      });
    d.length ? Promise.all(d).then(t) : t();
  }
  return d;
}
function Fi(e, t, n = {}) {
  let r = xi(e, t, Si(e, n.type)),
    i =
      n.transitionOverride ||
      (r?.transition ?? (e.getDefaultTransition() || {})),
    a = () => Promise.all(r ? Pi(e, r, n) : []),
    o = (r = 0) => {
      let { variantChildren: a } = e,
        { delayChildren: o = 0, staggerChildren: s, staggerDirection: c } = i,
        l = [];
      return (
        a?.forEach((e) => {
          (e.notify(`AnimationStart`, t),
            l.push(
              Fi(e, t, {
                ...n,
                delay: r + (typeof o == `function` ? 0 : o) + ei(a, e, o, s, c),
              }).then(() => e.notify(`AnimationComplete`, t)),
            ));
        }),
        Promise.all(l)
      );
    },
    { when: s } = i;
  return s
    ? s === `beforeChildren`
      ? a().then(() => o())
      : o().then(a)
    : Promise.all([a(), o(n.delay)]);
}
function Ii(e, t, n = {}) {
  return (
    e.notify(`AnimationStart`, t),
    (Array.isArray(t)
      ? Promise.all(t.map((t) => Fi(e, t, n)))
      : typeof t == `string`
        ? Fi(e, t, n)
        : Promise.all(Pi(e, xi(e, t, n.custom), n))
    ).then(() => {
      e.notify(`AnimationComplete`, t);
    })
  );
}
var Li = { test: (e) => e === `auto`, parse: (e) => e },
  Ri = (e) => (t) => t.test(e),
  zi = [xe, z, R, Pe, Ie, Fe, Li],
  Bi = (e) => zi.find(Ri(e));
function Vi(e) {
  return typeof e == `number`
    ? e === 0
    : e === null || e === `none` || e === `0` || _(e);
}
var Hi = new Set([`auto`, `none`, `0`]);
function Ui(e, t, n) {
  let r = 0,
    i;
  for (; r < e.length && !i;) {
    let t = e[r];
    (typeof t == `string` && !Hi.has(t) && qe(t) && (i = e[r]), r++);
  }
  if (i && n) for (let r of t) e[r] !== i && (e[r] = Cn(n, i));
}
var Wi = class extends nr {
    constructor(e, t, n, r, i) {
      super(e, t, n, r, i, !0);
    }
    scheduleResolve() {
      if (this.canReadNow() && (this.readKeyframes(), !this.needsMeasurement))
        return this.complete();
      super.scheduleResolve();
    }
    canReadNow() {
      let { unresolvedKeyframes: e, element: t, motionValue: n } = this,
        r = e[0] ?? n?.get();
      if (!t?.current || r === void 0) return !1;
      for (let t = 0; t < e.length; t++) if (be(t ? e[t] : r)) return !1;
      return !0;
    }
    readKeyframes() {
      let { unresolvedKeyframes: e, element: t, name: n } = this;
      if (!t || !t.current) return;
      super.readKeyframes();
      for (let n = 0; n < e.length; n++) {
        let r = e[n];
        if (typeof r == `string` && ((r = r.trim()), ve(r))) {
          let i = vi(r, t.current);
          (i !== void 0 && (e[n] = i),
            n === e.length - 1 && (this.finalKeyframe = r));
        }
      }
      if ((this.resolveNoneKeyframes(), !Ci.has(n) || e.length !== 2)) return;
      let [r, i] = e;
      if (typeof r == `number` && typeof i == `number`) return;
      let a = Bi(r),
        o = Bi(i);
      if (be(r) !== be(i) && qn[n]) this.needsMeasurement = !0;
      else if (a !== o) {
        if (zn(a) && zn(o))
          for (let t = 0; t < e.length; t++) {
            let n = e[t];
            typeof n == `string` && (e[t] = parseFloat(n));
          }
        else qn[n] && (this.needsMeasurement = !0);
      }
    }
    resolveNoneKeyframes() {
      let { unresolvedKeyframes: e, name: t } = this,
        n = [];
      for (let t = 0; t < e.length; t++)
        (e[t] === null || Vi(e[t])) && n.push(t);
      n.length && Ui(e, n, t);
    }
    measure() {
      let { element: e, name: t } = this;
      return qn[t](window.getComputedStyle(e.current), () =>
        e.measureViewportBox(),
      );
    }
    measureInitialState() {
      let { element: e, unresolvedKeyframes: t, name: n } = this;
      if (!e || !e.current) return;
      (n === `height` && (this.suspendedScrollY = window.pageYOffset),
        (this.measuredOrigin = this.measure()),
        (t[0] = this.measuredOrigin));
      let r = t[t.length - 1];
      r !== void 0 && this.motionValue?.jump(r, !1);
    }
    measureEndState() {
      let { element: e, unresolvedKeyframes: t } = this;
      if (!e || !e.current) return;
      this.motionValue?.jump(this.measuredOrigin, !1);
      let n = t.length - 1,
        r = t[n];
      ((t[n] = this.measure()),
        r !== null && this.finalKeyframe === void 0 && (this.finalKeyframe = r),
        this.removedTransforms?.length &&
          this.removedTransforms.forEach(([t, n]) => {
            e.getValue(t).set(n);
          }),
        this.resolveNoneKeyframes());
    }
  },
  Gi = [
    `borderTopLeftRadius`,
    `borderTopRightRadius`,
    `borderBottomRightRadius`,
    `borderBottomLeftRadius`,
  ],
  Ki = [];
function qi(e) {
  (typeof e.test == `function` && e.read, Ji(e), Ki.unshift(e));
}
function Ji(e) {
  f(Ki, e);
}
function Yi(e) {
  return Ki.find((t) => t.test(e));
}
function Xi(e, t, n = {}, r) {
  let i = [],
    { velocity: a, path: o } = n,
    s = n.reduceMotion ?? r?.shouldReduceMotion;
  o?.animateValues && r && ((t = { ...t }), o.animateValues(e, t, n, 0, i));
  for (let o in t) {
    if (o === `transition` || o === `transitionEnd`) continue;
    let c = t[o];
    if (c === void 0) continue;
    let l = e(o),
      u = l.get();
    u !== void 0 && !l.isAnimating() && !Array.isArray(c) && c === u && !a
      ? q.update(() => l.set(c))
      : (l.start(hi(o, l, c, s && Ci.has(o) ? { type: !1 } : n, r)),
        l.animation && i.push(l.animation));
  }
  let { transitionEnd: c } = t;
  if (c) {
    let t = () =>
      q.update(() => {
        for (let t in c) e(t).set(c[t]);
      });
    i.length ? Promise.all(i).then(t) : t();
  }
  return i;
}
function Zi(e, t, n, r, i) {
  return Xi(
    (r) => {
      let a = e.get(t, r);
      if (!a) {
        let o;
        if (!i) {
          let i = n[r];
          ((o = Qi(i) ?? e.read(t, r, i)), `${r}`);
        }
        ((a = ai(o, { owner: i })), e(t, { [r]: a }));
      }
      return a;
    },
    n,
    r,
    i,
  );
}
function Qi(e) {
  let t = Array.isArray(e) ? e[0] : void 0;
  return t === null ? void 0 : t;
}
function $i(e) {
  return g(e) && `offsetHeight` in e && !(`ownerSVGElement` in e);
}
function ea(e) {
  return g(e) && `ownerSVGElement` in e;
}
var ta = {};
function na(e) {
  return (ta.current?.add(e), e);
}
var ra = (e) => (ta.current ? ta.current.bind(e) : e);
function ia(e, t, n) {
  if (e == null) return [];
  if (e instanceof EventTarget) return [e];
  if (typeof e == `string`) {
    let r = t ? t.current : ta.current?.root || document,
      i = n?.[e] ?? r.querySelectorAll(e);
    return i ? Array.from(i) : [];
  }
  return Array.from(e).filter((e) => e != null);
}
var aa = class {
  constructor(e = q.render) {
    ((this.step = e),
      (this.values = new Map()),
      (this.pending = []),
      (this.numPending = 0),
      (this.flush = () => {
        let { pending: e, numPending: t } = this;
        this.numPending = 0;
        for (let n = 0; n < t; n++) e[n]();
      }));
  }
  set(e, t, n, r) {
    if ((this.values.get(e)?.onRemove(), r))
      for (let e of this.values.values()) e.value === r && (n = e.render);
    let i = () => n && this.schedule(n);
    t.get() !== void 0 && i();
    let a = t.on(`change`, i),
      o = () => {
        (a(),
          n && !r && this.cancel(n),
          this.values.get(e)?.onRemove === o && this.values.delete(e));
      };
    return (
      this.values.set(e, { value: t, render: r ? void 0 : n, onRemove: o }),
      o
    );
  }
  get(e) {
    return this.values.get(e)?.value;
  }
  release() {
    let e = new Map();
    return (
      this.values.forEach((t, n) => {
        (e.set(n, t.value), t.onRemove());
      }),
      (this.transformKeys = this.transformValues = void 0),
      e
    );
  }
  schedule(e) {
    let { pending: t, numPending: n } = this;
    for (let r = 0; r < n; r++) if (t[r] === e) return;
    (n || this.step(this.flush), (t[this.numPending++] = e));
  }
  cancel(e) {
    let { pending: t } = this;
    for (let n = 0; n < this.numPending; n++)
      if (t[n] === e) {
        t[n] = t[--this.numPending];
        return;
      }
  }
};
function oa(e, { step: t, ...n } = {}) {
  let r = new WeakMap();
  return Object.assign(
    (n, i) => {
      let a = r.get(n) ?? new aa(t);
      r.set(n, a);
      let o = [];
      for (let t in i) {
        let r = i[t],
          s = e(n, a, t, r);
        o.push(s);
      }
      return () => {
        for (let e of o) e();
      };
    },
    n,
    {
      get: (e, t) => r.get(e)?.get(t),
      flush: (e) => r.get(e)?.flush(),
      state: (e) => r.get(e),
    },
  );
}
var sa = {};
function ca(e) {
  let t = ``,
    { transformKeys: n = [], transformValues: r = {} } = e;
  for (let e = 0; e < n.length; e++) {
    let i = n[e],
      a = r[i].getCurrent();
    a !== void 0 &&
      (typeof a == `number` ? a : parseFloat(a)) !== +!!i.startsWith(`scale`) &&
      (t +=
        (t && ` `) +
        (sa[i] || (sa[i] = (jr[i] || i) + `(`)) +
        Ar(a, vn[i]) +
        `)`);
  }
  let i = e.get(`pathRotation`)?.get();
  return (
    i && (t += (t && ` `) + `rotate(` + Ar(i, vn.pathRotation) + `)`),
    t || `none`
  );
}
var la = new Set([`originX`, `originY`, `originZ`]),
  ua = (e, t) => Ar(e.get(t)?.get(), yn[t]),
  da = (e, t, n, r) => {
    let i, a;
    if (Rn.has(n)) {
      if (n !== `pathRotation`) {
        let e = (t.transformKeys ??= []);
        (((t.transformValues ??= {})[n] = r),
          e.includes(n) ||
            (e.push(n), e.sort((e, t) => Ln.indexOf(e) - Ln.indexOf(t))));
      }
      (t.get(`transform`) ||
        (!$i(e) &&
          !t.get(`transformBox`) &&
          da(e, t, `transformBox`, new ii(`fill-box`)),
        t.set(`transform`, new ii(`none`), () => {
          (Pr.get(e)?.check(), (e.style.transform = ca(t)));
        })),
        (a = t.get(`transform`)));
    } else
      la.has(n)
        ? (t.get(`transformOrigin`) ||
            t.set(`transformOrigin`, new ii(``), () => {
              let n = ua(t, `originX`) ?? `50%`,
                r = ua(t, `originY`) ?? `50%`,
                i = ua(t, `originZ`) ?? 0;
              e.style.transformOrigin = `${n} ${r} ${i}`;
            }),
          (a = t.get(`transformOrigin`)))
        : (i = rr(n)
            ? () => {
                e.style.setProperty(n, r.getCurrent());
              }
            : () => {
                e.style[n] = Ar(r.getCurrent(), yn[n]);
              });
    return t.set(n, r, i, a);
  },
  fa = (e) => $i(e) || ea(e),
  pa = (e, t) => {
    if (Rn.has(t)) return Fn(e, t);
    let n = getComputedStyle(e),
      r = rr(t) ? n.getPropertyValue(t) : n[t];
    return (typeof r == `string` && r.trim()) || 0;
  },
  ma = oa(da, { test: fa, read: pa });
function ha(e) {
  return e.replace(/([A-Z])/g, (e) => `-${e.toLowerCase()}`);
}
function ga(e, t, n) {
  let { style: r, vars: i, transformOrigin: a } = e,
    o = !1,
    s = !1;
  for (let e in t) {
    let n = t[e];
    if (Rn.has(e)) o = !0;
    else if (ge(e)) i[e] = n;
    else {
      let t = Ar(n, yn[e]);
      e.startsWith(`origin`) ? ((s = !0), (a[e] = t)) : (r[e] = t);
    }
  }
  if (
    (t.transform ||
      (o || n
        ? (r.transform = Nr(t, e.transform, n))
        : (r.transform &&= `none`)),
    s)
  ) {
    let { originX: e = `50%`, originY: t = `50%`, originZ: n = 0 } = a;
    r.transformOrigin = `${e} ${t} ${n}`;
  }
}
var _a = { offset: `stroke-dashoffset`, array: `stroke-dasharray` },
  va = { offset: `strokeDashoffset`, array: `strokeDasharray` };
function ya(e, t, n = 1, r = 0, i = !0) {
  e.pathLength = 1;
  let a = i ? _a : va;
  ((e[a.offset] = `${-r}`), (e[a.array] = `${t} ${n}`));
}
var ba = [
  `transform`,
  `opacity`,
  `clipPath`,
  `filter`,
  `offsetDistance`,
  `offsetPath`,
  `offsetRotate`,
  `offsetAnchor`,
];
function xa(
  e,
  {
    attrX: t,
    attrY: n,
    attrScale: r,
    pathLength: i,
    pathSpacing: a = 1,
    pathOffset: o = 0,
    ...s
  },
  c,
  l,
  u,
) {
  if ((ga(e, s, l), c)) {
    e.style.viewBox && (e.attrs.viewBox = e.style.viewBox);
    return;
  }
  ((e.attrs = e.style), (e.style = {}));
  let { attrs: d, style: f } = e;
  for (let e of ba) d[e] !== void 0 && ((f[e] = d[e]), delete d[e]);
  ((f.transform || d.transformOrigin) &&
    ((f.transformOrigin = d.transformOrigin ?? `50% 50%`),
    delete d.transformOrigin),
    f.transform &&
      ((f.transformBox = u?.transformBox ?? `fill-box`), delete d.transformBox),
    t !== void 0 && (d.x = t),
    n !== void 0 && (d.y = n),
    r !== void 0 && (d.scale = r),
    i !== void 0 && ya(d, i, a, o, !1));
}
function Sa(e, t) {
  if (!(t in e)) return !1;
  let n =
    Object.getOwnPropertyDescriptor(Object.getPrototypeOf(e), t) ||
    Object.getOwnPropertyDescriptor(e, t);
  return n && typeof n.set == `function`;
}
var Ca = (e, t, n, r, i = n) => {
  let a = Sa(e, i);
  !a && (i.startsWith(`data`) || i.startsWith(`aria`)) && (i = ha(i));
  let o = yn[n] || yn[i],
    s = a
      ? () => {
          e[i] = Ar(r.get(), yn[n]);
        }
      : () => {
          let t = Ar(r.get(), o);
          t == null ? e.removeAttribute(i) : e.setAttribute(i, String(t));
        };
  return t.set(n, r, s);
};
function wa(e, t, n, r) {
  return (
    q.render(() => e.setAttribute(`pathLength`, `1`)),
    n === `pathOffset`
      ? t.set(n, r, () => {
          let t = r.get();
          e.setAttribute(`stroke-dashoffset`, `${-t}`);
        })
      : (t.get(`stroke-dasharray`) ||
          t.set(`stroke-dasharray`, new ii(`1 1`), () => {
            let n = t.get(`pathLength`)?.get() ?? 1,
              r = t.get(`pathSpacing`)?.get();
            e.setAttribute(`stroke-dasharray`, `${n} ${r ?? 1 - Number(n)}`);
          }),
        t.set(n, r, void 0, t.get(`stroke-dasharray`)))
  );
}
var Ta = oa(
  (e, t, n, r) =>
    n.startsWith(`path`) && !Rn.has(n)
      ? wa(e, t, n, r)
      : n.startsWith(`attr`)
        ? Ca(e, t, n, r, Ea(n))
        : (Rn.has(n) || la.has(n) || rr(n) || n in e.style ? da : Ca)(
            e,
            t,
            n,
            r,
          ),
  {
    test: ea,
    read: (e, t) =>
      Rn.has(t)
        ? yn[t]?.default || 0
        : rr(t) || ba.includes(t)
          ? pa(e, t) || e.getAttribute(ha(t)) || 0
          : ((t = Ea(t)), e.getAttribute(ha(t)) ?? e.getAttribute(t) ?? void 0),
  },
);
function Ea(e) {
  return e.replace(/^attr([A-Z])/, (e, t) => t.toLowerCase());
}
function Da({ top: e, left: t, right: n, bottom: r }) {
  return { x: { min: t, max: n }, y: { min: e, max: r } };
}
function Oa({ x: e, y: t }) {
  return { top: t.min, right: e.max, bottom: t.max, left: e.min };
}
function ka(e, t) {
  if (!t) return e;
  let n = t({ x: e.left, y: e.top }),
    r = t({ x: e.right, y: e.bottom });
  return { top: n.y, left: n.x, bottom: r.y, right: r.x };
}
function Aa(e) {
  return e === void 0 || e === 1;
}
function ja({ scale: e, scaleX: t, scaleY: n }) {
  return !Aa(e) || !Aa(t) || !Aa(n);
}
function Ma(e) {
  return (
    ja(e) ||
    Na(e) ||
    e.z ||
    e.rotate ||
    e.rotateX ||
    e.rotateY ||
    e.rotateZ ||
    e.skewX ||
    e.skewY
  );
}
function Na(e) {
  return Pa(e.x) || Pa(e.y);
}
function Pa(e) {
  return e && e !== `0%`;
}
function Fa(e, t, n) {
  return n + t * (e - n);
}
function Ia(e, t, n, r, i) {
  return (i !== void 0 && (e = Fa(e, i, r)), Fa(e, n, r) + t);
}
function La(e, t = 0, n = 1, r, i) {
  ((e.min = Ia(e.min, t, n, r, i)), (e.max = Ia(e.max, t, n, r, i)));
}
function Ra(e, { x: t, y: n }) {
  (La(e.x, t.translate, t.scale, t.originPoint),
    La(e.y, n.translate, n.scale, n.originPoint));
}
var za = 0.999999999999,
  Ba = 1.0000000000001;
function Va(e, t, n, r = !1) {
  let i = n.length;
  if (!i) return;
  t.x = t.y = 1;
  let a, o;
  for (let s = 0; s < i; s++) {
    ((a = n[s]), (o = a.projectionDelta));
    let { visualElement: i } = a.options;
    (i && i.props.style && i.props.style.display === `contents`) ||
      (r &&
        a.options.layoutScroll &&
        a.scroll &&
        a !== a.root &&
        (Ha(e.x, -a.scroll.offset.x), Ha(e.y, -a.scroll.offset.y)),
      o && ((t.x *= o.x.scale), (t.y *= o.y.scale), Ra(e, o)),
      r && Ma(a.latestValues) && Ga(e, a.latestValues, a.layout?.layoutBox));
  }
  (t.x < Ba && t.x > za && (t.x = 1), t.y < Ba && t.y > za && (t.y = 1));
}
function Ha(e, t) {
  ((e.min += t), (e.max += t));
}
function Ua(e, t, n, r, i = 0.5) {
  La(e, t, n, K(e.min, e.max, i), r);
}
function Wa(e, t) {
  return typeof e == `string` ? (parseFloat(e) / 100) * (t.max - t.min) : e;
}
function Ga(e, t, n) {
  let r = n ?? e;
  (Ua(e.x, Wa(t.x, r.x), t.scaleX, t.scale, t.originX),
    Ua(e.y, Wa(t.y, r.y), t.scaleY, t.scale, t.originY));
}
function Ka(e, t) {
  return Da(ka(e.getBoundingClientRect(), t));
}
function qa(e, t, n) {
  let r = Ka(e, n),
    { scroll: i } = t;
  return (i && (Ha(r.x, i.offset.x), Ha(r.y, i.offset.y)), r);
}
var Ja = {},
  Ya = (e) => (ea(e) ? Ta : ma),
  Xa = class {
    constructor(e, t) {
      ((this.effect = e), (this.current = t), (this.KeyframeResolver = Wi));
    }
    getValue(e) {
      return this.effect.get(this.current, e);
    }
    readValue(e, t) {
      return this.effect.read(this.current, e, t);
    }
    render() {
      this.effect.flush(this.current);
    }
    measureViewportBox() {
      return Ka(this.current);
    }
    getProps() {
      return Ja;
    }
  };
function Za(e, t, n, r) {
  if ((ta.current?.track(e), r)) return Xi((e) => r.getValue(e, null), t, n, r);
  let i = Ya(e);
  return Zi(i, e, t, n, new Xa(i, e));
}
var Qa = oa(
    (e, t, n, r) =>
      t.set(n, r, () => {
        e[n] = r.get();
      }),
    {
      test: (e) => g(e),
      read: (e, t) => {
        let n = e[t];
        return typeof n == `string` || typeof n == `number` ? n : void 0;
      },
    },
  ),
  { schedule: $a, cancel: eo } = xt(queueMicrotask, !1);
function to(e, t, n) {
  let r = Y(e) ? e : ai(e);
  return (r.start(hi(``, r, t, n)), r.animation);
}
var no = {},
  ro = { value: null, addProjectionMetrics: null };
function io(e, t) {
  let n = F.now();
  e = ra(e);
  let r = ({ timestamp: i }) => {
    let a = i - n;
    a >= t && (St(r), e(a - t));
  };
  return (q.setup(r, !0), na(() => St(r)));
}
function ao(e) {
  return ea(e) && e.tagName === `svg`;
}
function oo(e) {
  return Y(e) ? e.get() : e;
}
var so = (e) => (typeof e == `number` ? e : parseFloat(e)),
  co = Gi.length,
  lo = [`rotate`, `rotateX`, `rotateY`, `rotateZ`, `skewX`, `skewY`],
  uo = lo.length,
  fo = (e) => typeof e == `number` || z.test(e);
function po(e, t, n, r, i, a) {
  i
    ? ((e.opacity = K(0, n.opacity ?? 1, ho(r))),
      (e.opacityExit = K(t.opacity ?? 1, 0, go(r))))
    : a && (e.opacity = K(t.opacity ?? 1, n.opacity ?? 1, r));
  for (let i = 0; i < co; i++) {
    let a = Gi[i],
      o = mo(t, a),
      s = mo(n, a);
    (o !== void 0 || s !== void 0) &&
      ((o ||= 0),
      (s ||= 0),
      o === 0 || s === 0 || fo(o) === fo(s)
        ? ((e[a] = Math.max(K(so(o), so(s), r), 0)),
          (R.test(s) || R.test(o)) && (e[a] += `%`))
        : (e[a] = s));
  }
  for (let i = 0; i < uo; i++) {
    let a = lo[i];
    (t[a] || n[a]) && (e[a] = K(t[a] || 0, n[a] || 0, r));
  }
}
function mo(e, t) {
  return e[t] === void 0 ? e.borderRadius : e[t];
}
var ho = _o(0, 0.5, re),
  go = _o(0.5, 0.95, y);
function _o(e, t, n) {
  return (r) => (r < e ? 0 : r > t ? 1 : n(x(e, t, r)));
}
function vo(e, t) {
  ((e.min = t.min), (e.max = t.max));
}
function yo(e, t) {
  (vo(e.x, t.x), vo(e.y, t.y));
}
function bo(e, t) {
  ((e.translate = t.translate),
    (e.scale = t.scale),
    (e.originPoint = t.originPoint),
    (e.origin = t.origin));
}
var xo = 0.9999,
  So = 1.0001,
  Co = -0.01,
  wo = 0.01;
function X(e) {
  return e.max - e.min;
}
function To(e, t, n) {
  return Math.abs(e - t) <= n;
}
function Eo(e, t, n, r = 0.5) {
  ((e.origin = r),
    (e.originPoint = K(t.min, t.max, e.origin)),
    (e.scale = X(n) / X(t)),
    (e.translate = K(n.min, n.max, e.origin) - e.originPoint),
    ((e.scale >= xo && e.scale <= So) || isNaN(e.scale)) && (e.scale = 1),
    ((e.translate >= Co && e.translate <= wo) || isNaN(e.translate)) &&
      (e.translate = 0));
}
function Do(e, t, n, r) {
  (Eo(e.x, t.x, n.x, r ? r.originX : void 0),
    Eo(e.y, t.y, n.y, r ? r.originY : void 0));
}
function Oo(e, t, n, r = 0) {
  ((e.min = (r ? K(n.min, n.max, r) : n.min) + t.min), (e.max = e.min + X(t)));
}
function ko(e, t, n, r) {
  (Oo(e.x, t.x, n.x, r?.x), Oo(e.y, t.y, n.y, r?.y));
}
function Ao(e, t, n, r = 0) {
  let i = r ? K(n.min, n.max, r) : n.min;
  ((e.min = t.min - i), (e.max = e.min + X(t)));
}
function jo(e, t, n, r) {
  (Ao(e.x, t.x, n.x, r?.x), Ao(e.y, t.y, n.y, r?.y));
}
function Mo(e, t, n, r, i) {
  return (
    (e -= t),
    (e = Fa(e, 1 / n, r)),
    i !== void 0 && (e = Fa(e, 1 / i, r)),
    e
  );
}
function No(e, t = 0, n = 1, r = 0.5, i, a = e, o = e) {
  if (
    (R.test(t) && ((t = parseFloat(t)), (t = K(o.min, o.max, t / 100) - o.min)),
    typeof t != `number`)
  )
    return;
  let s = K(a.min, a.max, r);
  (e === a && (s -= t),
    (e.min = Mo(e.min, t, n, s, i)),
    (e.max = Mo(e.max, t, n, s, i)));
}
function Po(e, t, [n, r, i], a, o) {
  No(e, t[n], t[r], t[i], t.scale, a, o);
}
var Fo = [`x`, `scaleX`, `originX`],
  Io = [`y`, `scaleY`, `originY`];
function Lo(e, t, n, r) {
  (Po(e.x, t, Fo, n ? n.x : void 0, r ? r.x : void 0),
    Po(e.y, t, Io, n ? n.y : void 0, r ? r.y : void 0));
}
var Ro = () => ({ translate: 0, scale: 1, origin: 0, originPoint: 0 }),
  zo = () => ({ x: Ro(), y: Ro() }),
  Bo = () => ({ min: 0, max: 0 }),
  Z = () => ({ x: Bo(), y: Bo() });
function Vo(e) {
  return e.translate === 0 && e.scale === 1;
}
function Ho(e) {
  return Vo(e.x) && Vo(e.y);
}
function Uo(e, t) {
  return e.min === t.min && e.max === t.max;
}
function Wo(e, t) {
  return Uo(e.x, t.x) && Uo(e.y, t.y);
}
function Go(e, t) {
  return (
    Math.round(e.min) === Math.round(t.min) &&
    Math.round(e.max) === Math.round(t.max)
  );
}
function Ko(e, t) {
  return Go(e.x, t.x) && Go(e.y, t.y);
}
function qo(e) {
  return X(e.x) / X(e.y);
}
function Jo(e, t) {
  return (
    e.translate === t.translate &&
    e.scale === t.scale &&
    e.originPoint === t.originPoint
  );
}
var Yo = class {
  constructor() {
    this.members = [];
  }
  add(e) {
    d(this.members, e);
    for (let t = this.members.length - 1; t >= 0; t--) {
      let n = this.members[t];
      if (n === e || n === this.lead || n === this.prevLead) continue;
      let r = n.instance;
      (r && r.isConnected !== !1) ||
        n.snapshot ||
        (f(this.members, n), n.unmount());
    }
    e.scheduleRender();
  }
  remove(e) {
    if (
      (f(this.members, e),
      e === this.prevLead && (this.prevLead = void 0),
      e === this.lead)
    ) {
      let e = this.members[this.members.length - 1];
      e && this.promote(e);
    }
  }
  relegate(e) {
    for (let t = this.members.indexOf(e) - 1; t >= 0; t--) {
      let e = this.members[t];
      if (e.isPresent !== !1 && e.instance?.isConnected !== !1)
        return (this.promote(e), !0);
    }
    return !1;
  }
  promote(e, t) {
    let n = this.lead;
    if (e !== n && ((this.prevLead = n), (this.lead = e), e.show(), n)) {
      (n.updateSnapshot(), e.scheduleRender());
      let { layoutDependency: r } = n.options,
        { layoutDependency: i } = e.options;
      ((r === void 0 || r !== i) &&
        ((e.resumeFrom = n),
        t && (n.preserveOpacity = !0),
        n.snapshot &&
          ((e.snapshot = n.snapshot),
          (e.snapshot.latestValues = n.animationValues || n.latestValues)),
        e.root?.isUpdating && (e.isLayoutDirty = !0)),
        e.options.crossfade === !1 && n.hide());
    }
  }
  exitAnimationComplete() {
    this.members.forEach((e) => {
      (e.options.onExitComplete?.(),
        e.resumingFrom?.options.onExitComplete?.());
    });
  }
  scheduleRender() {
    this.members.forEach((e) => e.instance && e.scheduleRender(!1));
  }
  removeLeadSnapshot() {
    this.lead?.snapshot && (this.lead.snapshot = void 0);
  }
};
function Xo(e, t) {
  return t.max === t.min ? 0 : (e / (t.max - t.min)) * 100;
}
var Zo = {
    correct: (e, t) => {
      if (!t.target) return e;
      if (typeof e == `string`) {
        if (z.test(e)) e = parseFloat(e);
        else return e;
      }
      return `${Xo(e, t.target.x)}% ${Xo(e, t.target.y)}%`;
    },
  },
  Qo = {
    borderRadius: Object.assign({}, Zo, { applyTo: Gi.slice() }),
    borderTopLeftRadius: Zo,
    borderTopRightRadius: Zo,
    borderBottomLeftRadius: Zo,
    borderBottomRightRadius: Zo,
    boxShadow: {
      correct: (e, { treeScale: t, projectionDelta: n }) => {
        let r = e,
          i = W.parse(e);
        if (i.length > 5) return r;
        let a = W.createTransformer(e),
          o = typeof i[0] == `number` ? 0 : 1,
          s = n.x.scale * t.x,
          c = n.y.scale * t.y;
        ((i[0 + o] /= s), (i[1 + o] /= c));
        let l = K(s, c, 0.5);
        return (
          typeof i[2 + o] == `number` && (i[2 + o] /= l),
          typeof i[3 + o] == `number` && (i[3 + o] /= l),
          a(i)
        );
      },
    },
  };
function $o(e, t, n) {
  let r = ``,
    i = e.x.translate / t.x,
    a = e.y.translate / t.y,
    o = n?.z || 0;
  if (
    ((i || a || o) && (r = `translate3d(${i}px, ${a}px, ${o}px) `),
    (t.x !== 1 || t.y !== 1) && (r += `scale(${1 / t.x}, ${1 / t.y}) `),
    n)
  ) {
    let {
      transformPerspective: e,
      rotate: t,
      pathRotation: i,
      rotateX: a,
      rotateY: o,
      rotateZ: s,
      skewX: c,
      skewY: l,
    } = n;
    (e && (r = `perspective(${e}px) ${r}`),
      t && (r += `rotate(${t}deg) `),
      i && (r += `rotate(${i}deg) `),
      a && (r += `rotateX(${a}deg) `),
      o && (r += `rotateY(${o}deg) `),
      s && (r += `rotateZ(${s}deg) `),
      c && (r += `skewX(${c}deg) `),
      l && (r += `skewY(${l}deg) `));
  }
  let s = e.x.scale * t.x,
    c = e.y.scale * t.y;
  return ((s !== 1 || c !== 1) && (r += `scale(${s}, ${c})`), r || `none`);
}
function es(e) {
  return [e(`x`), e(`y`)];
}
var ts = (e, t) => e.depth - t.depth,
  ns = class {
    constructor() {
      ((this.children = []), (this.isDirty = !1));
    }
    add(e) {
      (d(this.children, e), (this.isDirty = !0));
    }
    remove(e) {
      (f(this.children, e), (this.isDirty = !0));
    }
    forEach(e) {
      (this.isDirty && this.children.sort(ts),
        (this.isDirty = !1),
        this.children.forEach(e));
    }
  },
  rs = { hasAnimatedSinceResize: !0, hasEverUpdated: !1 },
  is = { nodes: 0, calculatedTargetDeltas: 0, calculatedProjections: 0 },
  as = [``, `X`, `Y`, `Z`],
  os = 1e3,
  ss = 0;
function cs(e, t, n, r) {
  let { latestValues: i } = t;
  i[e] && ((n[e] = i[e]), t.setStaticValue(e, 0), r && (r[e] = 0));
}
var ls = ({ instance: e }) => e && Pr.get(e)?.demote();
function us(e) {
  if (((e.hasCheckedOptimisedAppear = !0), e.root === e)) return;
  let { visualElement: t } = e.options;
  if (!t) return;
  let n = ji(t);
  if (window.MotionHasOptimisedAnimation(n, `transform`)) {
    let { layout: t, layoutId: r } = e.options;
    window.MotionCancelOptimisedAnimation(n, `transform`, q, !(t || r));
  }
  let { parent: r } = e;
  r && !r.hasCheckedOptimisedAppear && us(r);
}
function ds({
  attachResizeListener: e,
  defaultParent: t,
  measureScroll: n,
  checkIsScrollRoot: r,
  resetTransform: i,
}) {
  return (
    Object.assign(no, { ...Qo, ...no }),
    class {
      constructor(e = {}, n = t?.()) {
        ((this.id = ss++),
          (this.animationId = 0),
          (this.animationCommitId = 0),
          (this.children = new Set()),
          (this.options = {}),
          (this.isTreeAnimating = !1),
          (this.isAnimationBlocked = !1),
          (this.isLayoutDirty = !1),
          (this.isProjectionDirty = !1),
          (this.isSharedProjectionDirty = !1),
          (this.isTransformDirty = !1),
          (this.updateManuallyBlocked = !1),
          (this.updateBlockedByResize = !1),
          (this.isUpdating = !1),
          (this.isSVG = !1),
          (this.needsReset = !1),
          (this.shouldResetTransform = !1),
          (this.hasCheckedOptimisedAppear = !1),
          (this.treeScale = { x: 1, y: 1 }),
          (this.eventHandlers = new Map()),
          (this.hasTreeAnimated = !1),
          (this.updateScheduled = !1),
          (this.scheduleUpdate = () => this.update()),
          (this.projectionUpdateScheduled = !1),
          (this.checkUpdateFailed = () => {
            this.isUpdating &&
              ((this.isUpdating = !1), this.clearAllSnapshots());
          }),
          (this.updateProjection = () => {
            ((this.projectionUpdateScheduled = !1),
              ro.value &&
                (is.nodes =
                  is.calculatedTargetDeltas =
                  is.calculatedProjections =
                    0),
              this.nodes.forEach(ms),
              this.nodes.forEach(Ts),
              this.nodes.forEach(Es),
              this.nodes.forEach(hs),
              ro.addProjectionMetrics && ro.addProjectionMetrics(is));
          }),
          (this.resolvedRelativeTargetAt = 0),
          (this.hasProjected = !1),
          (this.isVisible = !0),
          (this.animationProgress = 0),
          (this.sharedNodes = new Map()),
          (this.latestValues = e),
          (this.root = n ? n.root || n : this),
          (this.path = n ? [...n.path, n] : []),
          (this.parent = n),
          (this.depth = n ? n.depth + 1 : 0));
        for (let e = 0; e < this.path.length; e++)
          this.path[e].shouldResetTransform = !0;
        this.root === this && (this.nodes = new ns());
      }
      addEventListener(e, t) {
        return (
          this.eventHandlers.has(e) || this.eventHandlers.set(e, new S()),
          this.eventHandlers.get(e).add(t)
        );
      }
      notifyListeners(e, ...t) {
        let n = this.eventHandlers.get(e);
        n && n.notify(...t);
      }
      hasListeners(e) {
        return this.eventHandlers.has(e);
      }
      mount(t) {
        if (this.instance) return;
        ((this.isSVG = ea(t) && !ao(t)), (this.instance = t));
        let { layoutId: n, layout: r, visualElement: i } = this.options;
        if (
          (i && !i.current && i.mount(t),
          this.root.nodes.add(this),
          this.parent && this.parent.children.add(this),
          this.root.hasTreeAnimated && (r || n) && (this.isLayoutDirty = !0),
          e)
        ) {
          let n,
            r = 0,
            i = () => (this.root.updateBlockedByResize = !1);
          (q.read(() => {
            r = window.innerWidth;
          }),
            e(t, () => {
              let e = window.innerWidth;
              e !== r &&
                ((r = e),
                (this.root.updateBlockedByResize = !0),
                n && n(),
                (n = io(i, 250)),
                rs.hasAnimatedSinceResize &&
                  ((rs.hasAnimatedSinceResize = !1), this.nodes.forEach(ws)));
            }));
        }
        (n && this.root.registerSharedNode(n, this), this.addLayoutListener());
      }
      addLayoutListener() {
        let {
          layoutId: e,
          layout: t,
          visualElement: n,
          animate: r,
        } = this.options;
        this.instance &&
          !this.hasLayoutListener &&
          r !== !1 &&
          n &&
          (e || t) &&
          ((this.hasLayoutListener = !0),
          this.addEventListener(
            `didUpdate`,
            ({
              delta: e,
              hasLayoutChanged: t,
              hasRelativeLayoutChanged: r,
              layout: i,
            }) => {
              if (this.isAnimationBlocked) {
                ((this.target = void 0), (this.relativeTarget = void 0));
                return;
              }
              let a = this.options.transition || n.getDefaultTransition() || Ms,
                { onLayoutAnimationStart: o, onLayoutAnimationComplete: s } =
                  n.getProps(),
                c = !this.targetLayout || !Ko(this.targetLayout, i),
                l = !t && r;
              if (
                this.options.layoutRoot ||
                this.resumeFrom ||
                l ||
                (t && (c || !this.currentAnimation))
              ) {
                this.resumeFrom &&
                  ((this.resumingFrom = this.resumeFrom),
                  (this.resumingFrom.resumingFrom = void 0));
                let t = { ...si(a, `layout`), onPlay: o, onComplete: s };
                ((n.shouldReduceMotion || this.options.layoutRoot) &&
                  ((t.delay = 0), (t.type = !1)),
                  this.startAnimation(t),
                  this.setAnimationOrigin(e, l, t.path));
              } else
                (t || ws(this),
                  this.isLead() &&
                    this.options.onExitComplete &&
                    this.options.onExitComplete());
              this.targetLayout = i;
            },
          ));
      }
      unmount() {
        (this.options.layoutId && this.willUpdate(),
          this.root.nodes.remove(this));
        let e = this.getStack();
        (e && e.remove(this),
          this.parent && this.parent.children.delete(this),
          (this.instance = void 0),
          this.eventHandlers.clear(),
          (this.hasLayoutListener = !1),
          St(this.updateProjection));
      }
      blockUpdate() {
        this.updateManuallyBlocked = !0;
      }
      unblockUpdate() {
        this.updateManuallyBlocked = !1;
      }
      isUpdateBlocked() {
        return this.updateManuallyBlocked || this.updateBlockedByResize;
      }
      startUpdate() {
        this.isUpdateBlocked() ||
          ((this.isUpdating = !0),
          this.nodes && this.nodes.forEach(Ds),
          this.animationId++);
      }
      getTransformTemplate() {
        let { visualElement: e } = this.options;
        return e && e.getProps().transformTemplate;
      }
      willUpdate(e = !0) {
        if (((this.root.hasTreeAnimated = !0), this.root.isUpdateBlocked())) {
          this.options.onExitComplete && this.options.onExitComplete();
          return;
        }
        if (
          (window.MotionCancelOptimisedAnimation &&
            !this.hasCheckedOptimisedAppear &&
            us(this),
          !this.root.isUpdating && this.root.startUpdate(),
          this.isLayoutDirty)
        )
          return;
        (ls(this), (this.isLayoutDirty = !0));
        for (let e = 0; e < this.path.length; e++) {
          let t = this.path[e];
          ((t.shouldResetTransform = !0),
            ls(t),
            (typeof t.latestValues.x == `string` ||
              typeof t.latestValues.y == `string`) &&
              (t.isLayoutDirty = !0),
            t.updateScroll(`snapshot`),
            t.options.layoutRoot && t.willUpdate(!1),
            t.isAnimationBlocked &&
              ((t.dragSnapshot ||= t.measure()), (this.dragAncestor = t)));
        }
        let { layoutId: t, layout: n } = this.options;
        if (t === void 0 && !n) return;
        let r = this.getTransformTemplate();
        ((this.prevTransformTemplateValue = r
          ? r(this.latestValues, ``)
          : void 0),
          this.updateSnapshot(),
          e && this.notifyListeners(`willUpdate`));
      }
      update() {
        if (((this.updateScheduled = !1), this.isUpdateBlocked())) {
          let e = this.updateBlockedByResize;
          (this.unblockUpdate(),
            (this.updateBlockedByResize = !1),
            this.clearAllSnapshots(),
            e && this.nodes.forEach(vs),
            this.nodes.forEach(_s));
          return;
        }
        if (this.animationId <= this.animationCommitId) {
          this.nodes.forEach(ys);
          return;
        }
        ((this.animationCommitId = this.animationId),
          this.isUpdating
            ? ((this.isUpdating = !1),
              this.nodes.forEach(xs),
              this.nodes.forEach(Ss),
              this.nodes.forEach(Cs),
              this.nodes.forEach(fs),
              this.nodes.forEach(ps))
            : this.nodes.forEach(ys),
          this.clearAllSnapshots());
        let e = F.now();
        ((P.delta = p(0, 1e3 / 60, e - P.timestamp)),
          (P.timestamp = e),
          (P.isProcessing = !0),
          Ct.update.process(P),
          Ct.preRender.process(P),
          Ct.render.process(P),
          (P.isProcessing = !1));
      }
      didUpdate() {
        this.updateScheduled ||
          ((this.updateScheduled = !0), $a.read(this.scheduleUpdate));
      }
      clearAllSnapshots() {
        (this.nodes.forEach(gs),
          this.sharedNodes.forEach((e, t) =>
            e.members.length
              ? e.removeLeadSnapshot()
              : this.sharedNodes.delete(t),
          ));
      }
      scheduleUpdateProjection() {
        this.projectionUpdateScheduled ||
          ((this.projectionUpdateScheduled = !0),
          q.preRender(this.updateProjection, !1, !0));
      }
      scheduleCheckAfterUnmount() {
        q.postRender(() => {
          this.isLayoutDirty
            ? this.root.didUpdate()
            : this.root.checkUpdateFailed();
        });
      }
      updateSnapshot() {
        !this.snapshot &&
          this.instance &&
          ((this.snapshot = this.measure()),
          this.snapshot &&
            !X(this.snapshot.measuredBox.x) &&
            !X(this.snapshot.measuredBox.y) &&
            (this.snapshot = void 0));
      }
      updateLayout() {
        if (
          !this.instance ||
          (this.updateScroll(),
          !(this.options.alwaysMeasureLayout && this.isLead()) &&
            !this.isLayoutDirty)
        )
          return;
        if (this.resumeFrom && !this.resumeFrom.instance)
          for (let e = 0; e < this.path.length; e++)
            this.path[e].updateScroll();
        let e = this.layout;
        ((this.layout = this.measure(!1)),
          (this.layoutCorrected ||= Z()),
          (this.isLayoutDirty = !1),
          (this.projectionDelta = void 0),
          this.notifyListeners(`measure`, this.layout.layoutBox));
        let { visualElement: t } = this.options;
        t &&
          t.notify(
            `LayoutMeasure`,
            this.layout.layoutBox,
            e ? e.layoutBox : void 0,
          );
      }
      updateScroll(e = `measure`) {
        let t = !!(this.options.layoutScroll && this.instance);
        if (
          (this.scroll &&
            this.scroll.animationId === this.root.animationId &&
            this.scroll.phase === e &&
            (t = !1),
          t && this.instance)
        ) {
          let t = r(this.instance);
          this.scroll = {
            animationId: this.root.animationId,
            phase: e,
            isRoot: t,
            offset: n(this.instance),
            wasRoot: this.scroll ? this.scroll.isRoot : t,
          };
        }
      }
      resetTransform() {
        if (!i) return;
        let e =
          this.isLayoutDirty ||
          this.shouldResetTransform ||
          this.options.alwaysMeasureLayout;
        e && ls(this);
        let t = this.projectionDelta && !Ho(this.projectionDelta),
          n = this.getTransformTemplate(),
          r = n ? n(this.latestValues, ``) : void 0,
          a = r !== this.prevTransformTemplateValue;
        e &&
          this.instance &&
          (t || Ma(this.latestValues) || a) &&
          (i(this.instance, r),
          (this.shouldResetTransform = !1),
          this.scheduleRender());
      }
      measure(e = !0) {
        let t = this.measurePageBox(),
          n = this.removeElementScroll(t);
        return (
          e && (n = this.removeTransform(n)),
          Is(n),
          {
            animationId: this.root.animationId,
            measuredBox: t,
            layoutBox: n,
            latestValues: {},
            source: this.id,
          }
        );
      }
      measurePageBox() {
        let { visualElement: e } = this.options;
        if (!e) return Z();
        let t = e.measureViewportBox();
        if (!(this.scroll?.wasRoot || this.path.some(Rs))) {
          let { scroll: e } = this.root;
          e && (Ha(t.x, e.offset.x), Ha(t.y, e.offset.y));
        }
        return t;
      }
      removeElementScroll(e) {
        let t = Z();
        if ((yo(t, e), this.scroll?.wasRoot)) return t;
        for (let n = 0; n < this.path.length; n++) {
          let r = this.path[n],
            { scroll: i, options: a } = r;
          r !== this.root &&
            i &&
            a.layoutScroll &&
            (i.wasRoot && yo(t, e), Ha(t.x, i.offset.x), Ha(t.y, i.offset.y));
        }
        return t;
      }
      applyTransform(e, t = !1, n, r) {
        let i = n || Z();
        yo(i, e);
        for (let e = 0; e < this.path.length; e++) {
          let n = this.path[e];
          (!t &&
            n.options.layoutScroll &&
            n.scroll &&
            n !== n.root &&
            (Ha(i.x, -n.scroll.offset.x), Ha(i.y, -n.scroll.offset.y)),
            Ma(n.latestValues) && Ga(i, n.latestValues, n.layout?.layoutBox));
        }
        return (
          !r &&
            Ma(this.latestValues) &&
            Ga(i, this.latestValues, this.layout?.layoutBox),
          i
        );
      }
      removeTransform(e) {
        let t = Z();
        yo(t, e);
        for (let e = 0; e < this.path.length; e++) {
          let n = this.path[e];
          if (!Ma(n.latestValues)) continue;
          let r;
          (n.instance &&
            (ja(n.latestValues) && n.updateSnapshot(),
            (r = Z()),
            yo(r, n.measurePageBox())),
            Lo(t, n.latestValues, n.snapshot?.layoutBox, r));
        }
        return (Ma(this.latestValues) && Lo(t, this.latestValues), t);
      }
      setTargetDelta(e) {
        ((this.targetDelta = e),
          this.root.scheduleUpdateProjection(),
          (this.isProjectionDirty = !0));
      }
      setOptions(e) {
        ((this.options = {
          ...this.options,
          ...e,
          crossfade: e.crossfade === void 0 || e.crossfade,
        }),
          this.addLayoutListener());
      }
      clearMeasurements() {
        ((this.scroll = void 0),
          (this.layout = void 0),
          (this.snapshot = void 0),
          (this.prevTransformTemplateValue = void 0),
          (this.targetDelta = void 0),
          (this.target = void 0),
          (this.isLayoutDirty = !1));
      }
      forceRelativeParentToResolveTarget() {
        this.relativeParent &&
          this.relativeParent.resolvedRelativeTargetAt !== P.timestamp &&
          this.relativeParent.resolveTargetDelta(!0);
      }
      resolveTargetDelta(e = !1) {
        let t = this.getLead();
        ((this.isProjectionDirty ||= t.isProjectionDirty),
          (this.isTransformDirty ||= t.isTransformDirty),
          (this.isSharedProjectionDirty ||= t.isSharedProjectionDirty));
        let n = !!this.resumingFrom || this !== t;
        if (!(
          e ||
          (n && this.isSharedProjectionDirty) ||
          this.isProjectionDirty ||
          this.parent?.isProjectionDirty ||
          this.attemptToResolveRelativeTarget ||
          this.root.updateBlockedByResize
        ))
          return;
        let { layout: r, layoutId: i } = this.options;
        if (!this.layout || !(r || i)) return;
        this.resolvedRelativeTargetAt = P.timestamp;
        let a = this.getClosestProjectingParent();
        (!this.targetDelta &&
          !this.relativeTarget &&
          (this.options.layoutAnchor !== !1 && a && a.layout
            ? this.createRelativeTarget(
                a,
                this.layout.layoutBox,
                a.layout.layoutBox,
              )
            : this.removeRelativeTarget()),
          (this.relativeTarget || this.targetDelta) &&
            (this.target ||
              ((this.target = Z()), (this.targetWithTransforms = Z())),
            this.relativeTarget &&
            this.relativeTargetOrigin &&
            this.relativeParent &&
            this.relativeParent.target
              ? (this.forceRelativeParentToResolveTarget(),
                ko(
                  this.target,
                  this.relativeTarget,
                  this.relativeParent.target,
                  this.options.layoutAnchor || void 0,
                ))
              : this.targetDelta
                ? (this.resumingFrom
                    ? this.applyTransform(
                        this.layout.layoutBox,
                        !1,
                        this.target,
                        !0,
                      )
                    : yo(this.target, this.layout.layoutBox),
                  Ra(this.target, this.targetDelta))
                : yo(this.target, this.layout.layoutBox),
            this.attemptToResolveRelativeTarget &&
              ((this.attemptToResolveRelativeTarget = !1),
              this.options.layoutAnchor !== !1 &&
              a &&
              !!a.resumingFrom == !!this.resumingFrom &&
              !a.options.layoutScroll &&
              a.target &&
              this.animationProgress !== 1
                ? this.createRelativeTarget(a, this.target, a.target)
                : (this.relativeParent = this.relativeTarget = void 0)),
            ro.value && is.calculatedTargetDeltas++));
      }
      getClosestProjectingParent() {
        if (!(
          !this.parent ||
          ja(this.parent.latestValues) ||
          Na(this.parent.latestValues)
        ))
          return this.parent.isProjecting()
            ? this.parent
            : this.parent.getClosestProjectingParent();
      }
      isProjecting() {
        return !!(
          (this.relativeTarget ||
            this.targetDelta ||
            this.options.layoutRoot) &&
          this.layout
        );
      }
      createRelativeTarget(e, t, n) {
        ((this.relativeParent = e),
          this.forceRelativeParentToResolveTarget(),
          (this.relativeTarget = Z()),
          (this.relativeTargetOrigin = Z()),
          jo(
            this.relativeTargetOrigin,
            t,
            n,
            this.options.layoutAnchor || void 0,
          ),
          yo(this.relativeTarget, this.relativeTargetOrigin));
      }
      removeRelativeTarget() {
        this.relativeParent = this.relativeTarget = void 0;
      }
      calcProjection() {
        let e = this.getLead(),
          t = !!this.resumingFrom || this !== e,
          n = !0;
        if (
          ((this.isProjectionDirty || this.parent?.isProjectionDirty) &&
            (n = !1),
          t &&
            (this.isSharedProjectionDirty || this.isTransformDirty) &&
            (n = !1),
          this.resolvedRelativeTargetAt === P.timestamp && (n = !1),
          n)
        )
          return;
        let { layout: r, layoutId: i } = this.options;
        if (
          ((this.isTreeAnimating = !!(
            (this.parent && this.parent.isTreeAnimating) ||
            this.currentAnimation ||
            this.pendingAnimation
          )),
          this.isTreeAnimating ||
            (this.targetDelta = this.relativeTarget = void 0),
          !this.layout || !(r || i))
        )
          return;
        yo(this.layoutCorrected, this.layout.layoutBox);
        let a = this.treeScale.x,
          o = this.treeScale.y;
        (Va(this.layoutCorrected, this.treeScale, this.path, t),
          e.layout &&
            !e.target &&
            (this.treeScale.x !== 1 || this.treeScale.y !== 1) &&
            ((e.target = e.layout.layoutBox), (e.targetWithTransforms = Z())));
        let { target: s } = e;
        s
          ? (!this.projectionDelta || !this.prevProjectionDelta
              ? this.createProjectionDeltas()
              : (bo(this.prevProjectionDelta.x, this.projectionDelta.x),
                bo(this.prevProjectionDelta.y, this.projectionDelta.y)),
            Do(
              this.projectionDelta,
              this.layoutCorrected,
              s,
              this.latestValues,
            ),
            (this.treeScale.x === a &&
              this.treeScale.y === o &&
              Jo(this.projectionDelta.x, this.prevProjectionDelta.x) &&
              Jo(this.projectionDelta.y, this.prevProjectionDelta.y)) ||
              ((this.hasProjected = !0),
              this.scheduleRender(),
              this.notifyListeners(`projectionUpdate`, s)),
            ro.value && is.calculatedProjections++)
          : this.prevProjectionDelta &&
            (this.createProjectionDeltas(), this.scheduleRender());
      }
      hide() {
        this.isVisible = !1;
      }
      show() {
        this.isVisible = !0;
      }
      scheduleRender(e = !0) {
        if ((this.options.visualElement?.scheduleRender(), e)) {
          let e = this.getStack();
          e && e.scheduleRender();
        }
        this.resumingFrom &&
          !this.resumingFrom.instance &&
          (this.resumingFrom = void 0);
      }
      createProjectionDeltas() {
        ((this.prevProjectionDelta = zo()),
          (this.projectionDelta = zo()),
          (this.projectionDeltaWithTransform = zo()));
      }
      setAnimationOrigin(e, t = !1, n) {
        let r = this.snapshot,
          i = r ? r.latestValues : {},
          a = { ...this.latestValues },
          o = zo();
        ((this.relativeParent && this.relativeParent.options.layoutRoot) ||
          (this.relativeTarget = this.relativeTargetOrigin = void 0),
          (this.attemptToResolveRelativeTarget = !t));
        let s = Z(),
          c =
            (r ? r.source : void 0) !==
            (this.layout ? this.layout.source : void 0),
          l = this.getStack(),
          u = !l || l.members.length <= 1,
          d = !(!c || u || this.options.crossfade !== !0 || this.path.some(js));
        this.animationProgress = 0;
        let f,
          p = n?.interpolateProjection(e);
        ((this.mixTargetDelta = (t) => {
          let n = t / 1e3,
            r = p?.(n);
          (r
            ? ((o.x.translate = r.x),
              (o.x.scale = K(e.x.scale, 1, n)),
              (o.x.origin = e.x.origin),
              (o.x.originPoint = e.x.originPoint),
              (o.y.translate = r.y),
              (o.y.scale = K(e.y.scale, 1, n)),
              (o.y.origin = e.y.origin),
              (o.y.originPoint = e.y.originPoint))
            : (Os(o.x, e.x, n), Os(o.y, e.y, n)),
            this.setTargetDelta(o),
            this.relativeTarget &&
              this.relativeTargetOrigin &&
              this.layout &&
              this.relativeParent &&
              this.relativeParent.layout &&
              (jo(
                s,
                this.layout.layoutBox,
                this.relativeParent.layout.layoutBox,
                this.options.layoutAnchor || void 0,
              ),
              As(this.relativeTarget, this.relativeTargetOrigin, s, n),
              f && Wo(this.relativeTarget, f) && (this.isProjectionDirty = !1),
              (f ||= Z()),
              yo(f, this.relativeTarget)),
            c &&
              ((this.animationValues = a),
              po(a, i, this.latestValues, n, d, u)),
            r &&
              r.rotate !== void 0 &&
              ((this.animationValues ||= a),
              (this.animationValues.pathRotation = r.rotate)),
            this.root.scheduleUpdateProjection(),
            this.scheduleRender(),
            (this.animationProgress = n));
        }),
          this.mixTargetDelta(this.options.layoutRoot ? 1e3 : 0));
      }
      startAnimation(e) {
        (this.notifyListeners(`animationStart`),
          this.currentAnimation?.stop(),
          this.resumingFrom?.currentAnimation?.stop(),
          (this.pendingAnimation &&= (St(this.pendingAnimation), void 0)),
          (this.pendingAnimation = q.update(() => {
            ((rs.hasAnimatedSinceResize = !0),
              (this.motionValue ||= ai(0)),
              this.motionValue.jump(0, !1),
              (this.currentAnimation = to(this.motionValue, [0, 1e3], {
                ...e,
                velocity: 0,
                isSync: !0,
                onUpdate: (t) => {
                  (this.mixTargetDelta(t), e.onUpdate && e.onUpdate(t));
                },
                onComplete: () => {
                  (e.onComplete && e.onComplete(), this.completeAnimation());
                },
              })),
              sn(this.currentAnimation, this),
              this.resumingFrom &&
                (this.resumingFrom.currentAnimation = this.currentAnimation),
              (this.pendingAnimation = void 0));
          })));
      }
      completeAnimation() {
        this.resumingFrom &&
          ((this.resumingFrom.currentAnimation = void 0),
          (this.resumingFrom.preserveOpacity = void 0));
        let e = this.getStack();
        (e && e.exitAnimationComplete(),
          (this.resumingFrom =
            this.currentAnimation =
            this.animationValues =
              void 0),
          this.notifyListeners(`animationComplete`));
      }
      finishAnimation() {
        (this.currentAnimation &&
          (this.mixTargetDelta && this.mixTargetDelta(os),
          this.currentAnimation.stop()),
          this.completeAnimation());
      }
      applyTransformsToTarget() {
        let e = this.getLead(),
          { targetWithTransforms: t, layout: n, latestValues: r } = e,
          { target: i } = e;
        if (t && i && n) {
          if (
            this !== e &&
            this.layout &&
            n &&
            Ls(this.options.animationType, this.layout.layoutBox, n.layoutBox)
          ) {
            i = this.target || Z();
            let t = X(this.layout.layoutBox.x);
            ((i.x.min = e.target.x.min), (i.x.max = i.x.min + t));
            let n = X(this.layout.layoutBox.y);
            ((i.y.min = e.target.y.min), (i.y.max = i.y.min + n));
          }
          (yo(t, i),
            Ga(t, r),
            Do(this.projectionDeltaWithTransform, this.layoutCorrected, t, r));
        }
      }
      registerSharedNode(e, t) {
        (this.sharedNodes.has(e) || this.sharedNodes.set(e, new Yo()),
          this.sharedNodes.get(e).add(t));
        let n = t.options.initialPromotionConfig;
        t.promote({
          transition: n ? n.transition : void 0,
          preserveFollowOpacity:
            n && n.shouldPreserveFollowOpacity
              ? n.shouldPreserveFollowOpacity(t)
              : void 0,
        });
      }
      isLead() {
        let e = this.getStack();
        return !e || e.lead === this;
      }
      getLead() {
        let { layoutId: e } = this.options;
        return (e && this.getStack()?.lead) || this;
      }
      getPrevLead() {
        let { layoutId: e } = this.options;
        return e ? this.getStack()?.prevLead : void 0;
      }
      getStack() {
        let { layoutId: e } = this.options;
        if (e) return this.root.sharedNodes.get(e);
      }
      promote({ needsReset: e, transition: t, preserveFollowOpacity: n } = {}) {
        let r = this.getStack();
        (r && r.promote(this, n),
          e && ((this.projectionDelta = void 0), (this.needsReset = !0)),
          t && this.setOptions({ transition: t }));
      }
      relegate() {
        let e = this.getStack();
        return e ? e.relegate(this) : !1;
      }
      resetSkewAndRotation() {
        let { visualElement: e } = this.options;
        if (!e) return;
        let t = !1,
          { latestValues: n } = e;
        if (
          ((n.z ||
            n.rotate ||
            n.rotateX ||
            n.rotateY ||
            n.rotateZ ||
            n.skewX ||
            n.skewY) &&
            (t = !0),
          !t)
        )
          return;
        let r = {};
        n.z && cs(`z`, e, r, this.animationValues);
        for (let t = 0; t < as.length; t++)
          (cs(`rotate${as[t]}`, e, r, this.animationValues),
            cs(`skew${as[t]}`, e, r, this.animationValues));
        e.render();
        for (let t in r)
          (e.setStaticValue(t, r[t]),
            this.animationValues && (this.animationValues[t] = r[t]));
        e.scheduleRender();
      }
      applyProjectionStyles(e, t) {
        if (!this.instance || this.isSVG) return;
        if (!this.isVisible) {
          e.visibility = `hidden`;
          return;
        }
        let n = this.getTransformTemplate();
        if (this.needsReset) {
          ((this.needsReset = !1),
            (e.visibility = ``),
            (e.opacity = ``),
            (e.pointerEvents = oo(t?.pointerEvents) || ``),
            (e.transform = n ? n(this.latestValues, ``) : `none`));
          return;
        }
        let r = this.getLead();
        if (!this.projectionDelta || !this.layout || !r.target) {
          (this.options.layoutId &&
            ((e.opacity =
              this.latestValues.opacity === void 0
                ? 1
                : this.latestValues.opacity),
            (e.pointerEvents = oo(t?.pointerEvents) || ``)),
            this.hasProjected &&
              !Ma(this.latestValues) &&
              ((e.transform = n ? n({}, ``) : `none`),
              (this.hasProjected = !1)));
          return;
        }
        e.visibility = ``;
        let i = r.animationValues || r.latestValues;
        this.applyTransformsToTarget();
        let a = $o(this.projectionDeltaWithTransform, this.treeScale, i);
        (n && (a = n(i, a)), (e.transform = a));
        let { x: o, y: s } = this.projectionDelta;
        ((e.transformOrigin = `${o.origin * 100}% ${s.origin * 100}% 0`),
          (e.opacity = r.animationValues
            ? r === this
              ? (i.opacity ?? this.latestValues.opacity ?? 1)
              : this.preserveOpacity
                ? this.latestValues.opacity
                : i.opacityExit
            : r === this
              ? i.opacity === void 0
                ? ``
                : i.opacity
              : i.opacityExit === void 0
                ? 0
                : i.opacityExit));
        for (let t in no) {
          if (i[t] === void 0) continue;
          let { correct: n, applyTo: o, isCSSVariable: s } = no[t],
            c = a === `none` ? i[t] : n(i[t], r);
          if (o) {
            let t = o.length;
            for (let n = 0; n < t; n++) e[o[n]] = c;
          } else
            s
              ? (this.options.visualElement.renderState.vars[t] = c)
              : (e[t] = c);
        }
        this.options.layoutId &&
          (e.pointerEvents = r === this ? oo(t?.pointerEvents) || `` : `none`);
      }
      clearSnapshot() {
        this.resumeFrom =
          this.snapshot =
          this.dragSnapshot =
          this.dragAncestor =
            void 0;
      }
      resetTree() {
        (this.root.nodes.forEach((e) => e.currentAnimation?.stop()),
          this.root.nodes.forEach(_s),
          this.root.sharedNodes.clear());
      }
    }
  );
}
function fs(e) {
  (e.updateLayout(), bs(e));
}
function ps(e) {
  let t = e.resumeFrom?.snapshot || e.snapshot;
  if (e.isLead() && e.layout && t && e.hasListeners(`didUpdate`)) {
    let { layoutBox: n, measuredBox: r } = e.layout,
      { animationType: i } = e.options,
      a = t.source !== e.layout.source;
    if (i === `size`)
      es((e) => {
        let r = a ? t.measuredBox[e] : t.layoutBox[e],
          i = X(r);
        ((r.min = n[e].min), (r.max = r.min + i));
      });
    else if (i === `x` || i === `y`) {
      let e = i === `x` ? `y` : `x`;
      vo(a ? t.measuredBox[e] : t.layoutBox[e], n[e]);
    } else
      Ls(i, t.layoutBox, n) &&
        es((r) => {
          let i = a ? t.measuredBox[r] : t.layoutBox[r],
            o = X(n[r]);
          ((i.max = i.min + o),
            e.relativeTarget &&
              !e.currentAnimation &&
              ((e.isProjectionDirty = !0),
              (e.relativeTarget[r].max = e.relativeTarget[r].min + o)));
        });
    let o = zo();
    Do(o, n, t.layoutBox);
    let s = zo();
    a ? Do(s, e.applyTransform(r, !0), t.measuredBox) : Do(s, n, t.layoutBox);
    let c = !Ho(o),
      l = !1;
    if (!e.resumeFrom) {
      let r = e.getClosestProjectingParent();
      if (r && !r.resumeFrom) {
        let { snapshot: i, layout: a } = r;
        if (i && a) {
          let o = e.options.layoutAnchor || void 0,
            s = Z();
          jo(s, t.layoutBox, i.layoutBox, o);
          let c = Z();
          (jo(c, n, a.layoutBox, o),
            Ko(s, c) || (l = !0),
            r.options.layoutRoot &&
              ((e.relativeTarget = c),
              (e.relativeTargetOrigin = s),
              (e.relativeParent = r)));
        }
      }
    }
    e.notifyListeners(`didUpdate`, {
      layout: n,
      snapshot: t,
      delta: s,
      layoutDelta: o,
      hasLayoutChanged: c,
      hasRelativeLayoutChanged: l,
    });
  } else if (e.isLead()) {
    let { onExitComplete: t } = e.options;
    t && t();
  }
  e.options.transition = void 0;
}
function ms(e) {
  (ro.value && is.nodes++,
    e.parent &&
      (e.isProjecting() || (e.isProjectionDirty = e.parent.isProjectionDirty),
      (e.isSharedProjectionDirty ||= !!(
        e.isProjectionDirty ||
        e.parent.isProjectionDirty ||
        e.parent.isSharedProjectionDirty
      )),
      (e.isTransformDirty ||= e.parent.isTransformDirty)));
}
function hs(e) {
  e.isProjectionDirty = e.isSharedProjectionDirty = e.isTransformDirty = !1;
}
function gs(e) {
  e.clearSnapshot();
}
function _s(e) {
  e.clearMeasurements();
}
function vs(e) {
  ((e.isLayoutDirty = !0), e.updateLayout());
}
function ys(e) {
  e.isLayoutDirty = !1;
}
function bs(e) {
  let { snapshot: t, dragAncestor: n } = e,
    r = n?.isAnimationBlocked && n.layout;
  if (!t || !r || e.resumeFrom || e.isAnimationBlocked) return;
  let i = n.dragSnapshot;
  es((e) => Ha(t.layoutBox[e], r.layoutBox[e].min - i.layoutBox[e].min));
}
function xs(e) {
  e.isAnimationBlocked &&
    e.layout &&
    !e.isLayoutDirty &&
    ((e.snapshot = e.dragSnapshot || e.layout), (e.isLayoutDirty = !0));
}
function Ss(e) {
  e.relativeTarget &&
    e.relativeParent?.isLayoutDirty &&
    (e.currentAnimation
      ? (e.isLayoutDirty = !0)
      : ((e.targetDelta = void 0), e.removeRelativeTarget()));
}
function Cs(e) {
  let { visualElement: t } = e.options;
  (t && t.getProps().onBeforeLayoutMeasure && t.notify(`BeforeLayoutMeasure`),
    e.resetTransform());
}
function ws(e) {
  (e.finishAnimation(),
    (e.targetDelta = e.relativeTarget = e.target = void 0),
    (e.isProjectionDirty = !0));
}
function Ts(e) {
  e.resolveTargetDelta();
}
function Es(e) {
  e.calcProjection();
}
function Ds(e) {
  e.resetSkewAndRotation();
}
function Os(e, t, n) {
  ((e.translate = K(t.translate, 0, n)),
    (e.scale = K(t.scale, 1, n)),
    (e.origin = t.origin),
    (e.originPoint = t.originPoint));
}
function ks(e, t, n, r) {
  ((e.min = K(t.min, n.min, r)), (e.max = K(t.max, n.max, r)));
}
function As(e, t, n, r) {
  (ks(e.x, t.x, n.x, r), ks(e.y, t.y, n.y, r));
}
function js(e) {
  return e.animationValues && e.animationValues.opacityExit !== void 0;
}
var Ms = { duration: 0.45, ease: [0.4, 0, 0.1, 1] },
  Ns = (e) =>
    typeof navigator < `u` &&
    navigator.userAgent &&
    navigator.userAgent.toLowerCase().includes(e),
  Ps = Ns(`applewebkit/`) && !Ns(`chrome/`) ? Math.round : y;
function Fs(e) {
  ((e.min = Ps(e.min)), (e.max = Ps(e.max)));
}
function Is(e) {
  (Fs(e.x), Fs(e.y));
}
function Ls(e, t, n) {
  return (
    e === `position` || (e === `preserve-aspect` && !To(qo(t), qo(n), 0.2))
  );
}
function Rs(e) {
  return e !== e.root && e.scroll?.wasRoot;
}
function zs(e, t, n, r = { passive: !0 }) {
  return (e.addEventListener(t, n, r), () => e.removeEventListener(t, n, r));
}
var Bs = ds({
    attachResizeListener: (e, t) => zs(e, `resize`, t),
    measureScroll: () => ({
      x: document.documentElement.scrollLeft || document.body?.scrollLeft || 0,
      y: document.documentElement.scrollTop || document.body?.scrollTop || 0,
    }),
    checkIsScrollRoot: () => !0,
  }),
  Vs = { current: void 0 },
  Hs = ds({
    measureScroll: (e) => ({ x: e.scrollLeft, y: e.scrollTop }),
    defaultParent: () => {
      if (!Vs.current) {
        let e = new Bs({});
        (e.mount(window), e.setOptions({ layoutScroll: !0 }), (Vs.current = e));
      }
      return Vs.current;
    },
    resetTransform: (e, t) => {
      e.style.transform = t === void 0 ? `none` : t;
    },
    checkIsScrollRoot: (e) => window.getComputedStyle(e).position === `fixed`,
  }),
  Us = new WeakMap();
function Ws(e) {
  return typeof e == `object` && !!e && typeof e.start == `function`;
}
function Gs(e) {
  return typeof e == `string` || Array.isArray(e);
}
var Ks = [
    `animate`,
    `whileInView`,
    `whileFocus`,
    `whileHover`,
    `whileTap`,
    `whileDrag`,
    `exit`,
  ],
  qs = [`initial`].concat(Ks);
function Js(e) {
  if (Ws(e.animate)) return !0;
  for (let t = 0; t < qs.length; t++) if (Gs(e[qs[t]])) return !0;
  return !1;
}
function Ys(e) {
  return !!(Js(e) || e.variants);
}
function Xs(e, t, n) {
  for (let r in t) {
    let i = t[r],
      a = n[r];
    if (Y(i)) e.addValue(r, i);
    else if (Y(a)) e.addValue(r, ai(i, { owner: e }));
    else if (a !== i) {
      if (e.hasValue(r)) {
        let t = e.getValue(r);
        t.liveStyle === !0 ? t.jump(i) : t.hasAnimated || t.set(i);
      } else {
        let t = e.getStaticValue(r);
        e.addValue(r, ai(t === void 0 ? i : t, { owner: e }));
      }
    }
  }
  for (let r in n) t[r] === void 0 && e.removeValue(r);
  return t;
}
var Zs = { current: null },
  Qs = { current: !1 },
  $s = typeof window < `u`;
function ec() {
  if (((Qs.current = !0), $s)) {
    if (window.matchMedia) {
      let e = window.matchMedia(`(prefers-reduced-motion)`),
        t = () => (Zs.current = e.matches);
      (e.addEventListener(`change`, t), t());
    } else Zs.current = !1;
  }
}
var tc = [
    `AnimationStart`,
    `AnimationComplete`,
    `Update`,
    `BeforeLayoutMeasure`,
    `LayoutMeasure`,
    `LayoutAnimationStart`,
    `LayoutAnimationComplete`,
  ],
  nc = {};
function rc(e) {
  nc = e;
}
function ic() {
  return nc;
}
var ac = class {
    scrapeMotionValuesFromProps(e, t, n) {
      return {};
    }
    constructor(
      {
        parent: e,
        props: t,
        presenceContext: n,
        reducedMotionConfig: r,
        skipAnimations: i,
        blockInitialAnimation: a,
        visualState: o,
      },
      s = {},
    ) {
      ((this.current = null),
        (this.children = new Set()),
        (this.isVariantNode = !1),
        (this.isControllingVariants = !1),
        (this.shouldReduceMotion = null),
        (this.shouldSkipAnimations = !1),
        (this.values = new Map()),
        (this.KeyframeResolver = nr),
        (this.features = {}),
        (this.valueSubscriptions = new Map()),
        (this.prevMotionValues = {}),
        (this.hasBeenMounted = !1),
        (this.events = {}),
        (this.propEventSubscriptions = {}),
        (this.notifyUpdate = () => this.notify(`Update`, this.latestValues)),
        (this.render = () => {
          this.current &&
            (this.triggerBuild(),
            this.renderInstance(
              this.current,
              this.renderState,
              this.props.style,
              this.projection,
            ));
        }),
        (this.renderScheduledAt = 0),
        (this.scheduleRender = () => {
          let e = F.now();
          this.renderScheduledAt < e &&
            ((this.renderScheduledAt = e), q.render(this.render, !1, !0));
        }));
      let { latestValues: c, renderState: l } = o;
      ((this.latestValues = c),
        (this.baseTarget = { ...c }),
        (this.initialValues = t.initial ? { ...c } : {}),
        (this.renderState = l),
        (this.parent = e),
        (this.props = t),
        (this.presenceContext = n),
        (this.depth = e ? e.depth + 1 : 0),
        (this.reducedMotionConfig = r),
        (this.skipAnimationsConfig = i),
        (this.options = s),
        (this.blockInitialAnimation = !!a),
        (this.isControllingVariants = Js(t)),
        (this.isVariantNode = Ys(t)),
        this.isVariantNode && (this.variantChildren = new Set()),
        (this.manuallyAnimateOnMount = !!(e && e.current)));
      let { willChange: u, ...d } = this.scrapeMotionValuesFromProps(
        t,
        {},
        this,
      );
      for (let e in d) {
        let t = d[e];
        c[e] !== void 0 && Y(t) && t.set(c[e]);
      }
    }
    mount(e) {
      if (this.hasBeenMounted)
        for (let e in this.initialValues)
          (this.values.get(e)?.jump(this.initialValues[e]),
            (this.latestValues[e] = this.initialValues[e]));
      if (
        ((this.current = e),
        Us.set(e, this),
        this.projection &&
          !this.projection.instance &&
          this.projection.mount(e),
        this.isVariantNode && !this.isControllingVariants)
      ) {
        let e = this;
        do e = e.props.inherit !== !1 && e.parent;
        while (e && !e.isVariantNode);
        if (e) {
          let { variantChildren: t } = e;
          (t.add(this), (this.removeFromVariantTree = () => t.delete(this)));
        }
      }
      (this.values.forEach((e, t) => this.bindToMotionValue(t, e)),
        this.reducedMotionConfig === `never`
          ? (this.shouldReduceMotion = !1)
          : this.reducedMotionConfig === `always`
            ? (this.shouldReduceMotion = !0)
            : (Qs.current || ec(), (this.shouldReduceMotion = Zs.current)),
        (this.shouldSkipAnimations = this.skipAnimationsConfig ?? !1),
        this.parent?.addChild(this),
        this.update(this.props, this.presenceContext),
        (this.hasBeenMounted = !0));
    }
    unmount() {
      (this.projection && this.projection.unmount(),
        St(this.notifyUpdate),
        St(this.render),
        this.valueSubscriptions.forEach((e) => e()),
        this.valueSubscriptions.clear(),
        this.removeFromVariantTree && this.removeFromVariantTree(),
        this.parent?.removeChild(this));
      for (let e in this.events) this.events[e].clear();
      for (let e in this.features) {
        let t = this.features[e];
        t && (t.unmount(), (t.isMounted = !1));
      }
      this.current = null;
    }
    addChild(e) {
      (this.children.add(e),
        (this.enteringChildren ??= new Set()),
        this.enteringChildren.add(e));
    }
    removeChild(e) {
      (this.children.delete(e),
        this.enteringChildren && this.enteringChildren.delete(e));
    }
    bindToMotionValue(e, t) {
      if (
        (this.valueSubscriptions.has(e) && this.valueSubscriptions.get(e)(),
        t.accelerate && wr.has(e) && this.current instanceof HTMLElement)
      ) {
        let {
            factory: n,
            keyframes: r,
            times: i,
            ease: a,
            duration: o,
          } = t.accelerate,
          s = new hr({
            element: this.current,
            name: e,
            keyframes: r,
            times: i,
            ease: a,
            duration: C(o),
          }),
          c = n(s);
        this.valueSubscriptions.set(e, () => {
          (c(), s.cancel());
        });
        return;
      }
      let n = Rn.has(e);
      n && this.onBindTransform && this.onBindTransform();
      let r = t.on(`change`, (t) => {
          ((this.latestValues[e] = t),
            this.props.onUpdate && q.preRender(this.notifyUpdate),
            n &&
              (this.projection && (this.projection.isTransformDirty = !0),
              Pr.get(this.current)?.check()),
            this.scheduleRender());
        }),
        i;
      (typeof window < `u` &&
        window.MotionCheckAppearSync &&
        (i = window.MotionCheckAppearSync(this, e, t)),
        this.valueSubscriptions.set(e, () => {
          (r(), i && i());
        }));
    }
    sortNodePosition(e) {
      return !this.current ||
        !e.current ||
        !this.sortInstanceNodePosition ||
        this.type !== e.type
        ? 0
        : this.sortInstanceNodePosition(this.current, e.current);
    }
    updateFeatures() {
      let e = `animation`;
      for (e in nc) {
        let t = nc[e];
        if (!t) continue;
        let { isEnabled: n, Feature: r } = t;
        if (
          (!this.features[e] &&
            r &&
            n(this.props) &&
            (this.features[e] = new r(this)),
          this.features[e])
        ) {
          let t = this.features[e];
          t.isMounted ? t.update() : (t.mount(), (t.isMounted = !0));
        }
      }
    }
    triggerBuild() {
      this.build(this.renderState, this.latestValues, this.props);
    }
    measureViewportBox() {
      return this.current
        ? this.measureInstanceViewportBox(this.current, this.props)
        : Z();
    }
    getStaticValue(e) {
      return this.latestValues[e];
    }
    setStaticValue(e, t) {
      this.latestValues[e] = t;
    }
    update(e, t) {
      let { transformTemplate: n, onUpdate: r } = this.props;
      ((e.transformTemplate || n) && this.scheduleRender(),
        ((e.transformTemplate && !n) || (e.onUpdate && !r)) &&
          Pr.get(this.current)?.demote(),
        (this.prevProps = this.props),
        (this.props = e),
        (this.prevPresenceContext = this.presenceContext),
        (this.presenceContext = t));
      for (let t = 0; t < tc.length; t++) {
        let n = tc[t];
        this.propEventSubscriptions[n] &&
          (this.propEventSubscriptions[n](),
          delete this.propEventSubscriptions[n]);
        let r = e[`on` + n];
        r && (this.propEventSubscriptions[n] = this.on(n, r));
      }
      ((this.prevMotionValues = Xs(
        this,
        this.scrapeMotionValuesFromProps(e, this.prevProps || {}, this),
        this.prevMotionValues,
      )),
        this.handleChildMotionValue && this.handleChildMotionValue());
    }
    getProps() {
      return this.props;
    }
    getVariant(e) {
      return this.props.variants ? this.props.variants[e] : void 0;
    }
    getDefaultTransition() {
      return this.props.transition;
    }
    getTransformPagePoint() {
      return this.props.transformPagePoint;
    }
    addValue(e, t) {
      let n = this.values.get(e);
      if (t !== n) {
        (n && this.removeValue(e),
          this.bindToMotionValue(e, t),
          this.values.set(e, t));
        let r = t.get();
        r !== void 0 && (this.latestValues[e] = r);
      }
    }
    removeValue(e) {
      this.values.delete(e);
      let t = this.valueSubscriptions.get(e);
      (t && (t(), this.valueSubscriptions.delete(e)),
        delete this.latestValues[e],
        this.removeValueFromRenderState(e, this.renderState));
    }
    hasValue(e) {
      return this.values.has(e);
    }
    getValue(e, t) {
      if (this.props.values && this.props.values[e])
        return this.props.values[e];
      let n = this.values.get(e);
      return (
        n === void 0 &&
          t !== void 0 &&
          ((n = ai(t ?? this.getDefaultValue?.(e), { owner: this })),
          this.addValue(e, n)),
        n
      );
    }
    readValue(e, t) {
      let n =
        this.latestValues[e] !== void 0 || !this.current
          ? this.latestValues[e]
          : (this.getBaseTargetFromProps(this.props, e) ??
            this.readValueFromInstance(this.current, e, this.options));
      return (
        n != null &&
          (typeof n == `string` && (h(n) || _(n))
            ? (n = parseFloat(n))
            : typeof n != `number` && !W.test(n) && W.test(t) && (n = Cn(e, t)),
          this.setBaseTarget(e, Y(n) ? n.get() : n)),
        Y(n) ? n.get() : n
      );
    }
    setBaseTarget(e, t) {
      this.baseTarget[e] = t;
    }
    on(e, t) {
      return (
        this.events[e] || (this.events[e] = new S()),
        this.events[e].add(t)
      );
    }
    notify(e, ...t) {
      this.events[e] && this.events[e].notify(...t);
    }
    scheduleRenderMicrotask() {
      $a.render(this.render);
    }
  },
  oc = class extends ac {
    constructor() {
      (super(...arguments), (this.KeyframeResolver = Wi));
    }
    sortInstanceNodePosition(e, t) {
      return e.compareDocumentPosition(t) & 2 ? 1 : -1;
    }
    getBaseTargetFromProps(e, t) {
      let n = e.style;
      return n ? n[t] : void 0;
    }
    removeValueFromRenderState(e, { vars: t, style: n }) {
      (delete t[e], delete n[e]);
    }
    handleChildMotionValue() {
      this.childSubscription &&
        (this.childSubscription(), delete this.childSubscription);
      let { children: e } = this.props;
      Y(e) &&
        (this.childSubscription = e.on(`change`, (e) => {
          this.current && (this.current.textContent = `${e}`);
        }));
    }
  };
function sc(e, { style: t, vars: n }, r, i) {
  let a = e.style,
    o;
  for (o in t) a[o] = t[o];
  for (o in (i?.applyProjectionStyles(a, r), n)) a.setProperty(o, n[o]);
}
function cc(e, { layout: t, layoutId: n }) {
  return (
    Rn.has(e) ||
    e.startsWith(`origin`) ||
    ((t || n !== void 0) && (!!no[e] || e === `opacity`))
  );
}
function lc(e, t, n) {
  let r = e.style,
    i = t?.style,
    a = {};
  if (!r) return a;
  for (let t in r)
    (Y(r[t]) ||
      (i && Y(i[t])) ||
      cc(t, e) ||
      n?.getValue(t)?.liveStyle !== void 0) &&
      (a[t] = r[t]);
  return a;
}
function uc(e) {
  return window.getComputedStyle(e);
}
var dc = class extends oc {
    constructor() {
      (super(...arguments), (this.type = `html`), (this.renderInstance = sc));
    }
    mount(e) {
      (e.style, super.mount(e));
    }
    readValueFromInstance(e, t) {
      if (Rn.has(t)) return this.projection?.isProjecting ? Nn(t) : Fn(e, t);
      {
        let n = uc(e),
          r = (ge(t) ? n.getPropertyValue(t) : n[t]) || 0;
        return typeof r == `string` ? r.trim() : r;
      }
    }
    measureInstanceViewportBox(e, { transformPagePoint: t }) {
      return Ka(e, t);
    }
    build(e, t, n) {
      ga(e, t, n.transformTemplate);
    }
    scrapeMotionValuesFromProps(e, t, n) {
      return lc(e, t, n);
    }
  },
  fc = (e) =>
    e.pointerType === `mouse`
      ? typeof e.button != `number` || e.button <= 0
      : e.isPrimary !== !1;
function pc(e) {
  return { point: { x: e.pageX, y: e.pageY } };
}
var mc = (e) => (t) => fc(t) && e(t, pc(t));
function hc(e, t, n, r) {
  return zs(e, t, mc(n), r);
}
var gc = new WeakMap(),
  _c,
  vc = (e, t, n) => (r, i) =>
    i && i[0]
      ? i[0][e + `Size`]
      : ea(r) && `getBBox` in r
        ? r.getBBox()[t]
        : r[n],
  yc = vc(`inline`, `width`, `offsetWidth`),
  bc = vc(`block`, `height`, `offsetHeight`);
function xc({ target: e, borderBoxSize: t }) {
  gc.get(e)?.forEach((n) => {
    n(e, {
      get width() {
        return yc(e, t);
      },
      get height() {
        return bc(e, t);
      },
    });
  });
}
function Sc(e) {
  e.forEach(xc);
}
function Cc() {
  typeof ResizeObserver < `u` && (_c = new ResizeObserver(Sc));
}
function wc(e, t) {
  _c || Cc();
  let n = ia(e);
  return (
    n.forEach((e) => {
      let n = gc.get(e);
      (n || ((n = new Set()), gc.set(e, n)), n.add(t), _c?.observe(e));
    }),
    () => {
      n.forEach((e) => {
        let n = gc.get(e);
        (n?.delete(t), n?.size || _c?.unobserve(e));
      });
    }
  );
}
var Tc = new Set(),
  Ec;
function Dc() {
  ((Ec = () => {
    let e = {
      get width() {
        return window.innerWidth;
      },
      get height() {
        return window.innerHeight;
      },
    };
    Tc.forEach((t) => t(e));
  }),
    window.addEventListener(`resize`, Ec));
}
function Oc(e) {
  return (
    Tc.add(e),
    Ec || Dc(),
    () => {
      (Tc.delete(e),
        !Tc.size &&
          typeof Ec == `function` &&
          (window.removeEventListener(`resize`, Ec), (Ec = void 0)));
    }
  );
}
function kc(e, t) {
  return na(typeof e == `function` ? Oc(e) : wc(e, t));
}
var Ac = (e, t) => Math.abs(e - t);
function jc(e, t) {
  let n = Ac(e.x, t.x),
    r = Ac(e.y, t.y);
  return Math.sqrt(n ** 2 + r ** 2);
}
var Mc = new Set([`auto`, `scroll`]),
  Nc = class {
    constructor(
      e,
      t,
      {
        transformPagePoint: n,
        contextWindow: r = window,
        dragSnapToOrigin: i = !1,
        distanceThreshold: a = 3,
        element: o,
      } = {},
    ) {
      if (
        ((this.startEvent = null),
        (this.lastMoveEvent = null),
        (this.lastMoveEventInfo = null),
        (this.lastRawMoveEventInfo = null),
        (this.handlers = {}),
        (this.contextWindow = window),
        (this.scrollPositions = new Map()),
        (this.removeScrollListeners = null),
        (this.onElementScroll = (e) => {
          this.handleScroll(e.target);
        }),
        (this.onWindowScroll = () => {
          this.handleScroll(window);
        }),
        (this.updatePoint = () => {
          if (!(this.lastMoveEvent && this.lastMoveEventInfo)) return;
          ((this.hasPendingMove = !1),
            this.lastRawMoveEventInfo &&
              (this.lastMoveEventInfo = Pc(
                this.lastRawMoveEventInfo,
                this.transformPagePoint,
              )));
          let e = Ic(this.lastMoveEventInfo, this.history),
            t = this.startEvent !== null,
            n = jc(e.offset, { x: 0, y: 0 }) >= this.distanceThreshold;
          if (!t && !n) return;
          let { point: r } = e;
          this.history.push({ ...r, timestamp: F.now() });
          let { onStart: i, onMove: a } = this.handlers;
          (t ||
            (i && i(this.lastMoveEvent, e),
            (this.startEvent = this.lastMoveEvent)),
            a && a(this.lastMoveEvent, e));
        }),
        (this.handlePointerMove = (e, t) => {
          (this.handleScroll(window),
            (this.lastMoveEvent = e),
            (this.lastRawMoveEventInfo = t),
            (this.lastMoveEventInfo = Pc(t, this.transformPagePoint)),
            (this.hasPendingMove = !0),
            q.update(this.updatePoint, !0));
        }),
        (this.handlePointerUp = (e, t) => {
          (this.hasPendingMove && this.updatePoint(), this.end());
          let { onEnd: n, onSessionEnd: r, resumeAnimation: i } = this.handlers;
          if (
            ((this.dragSnapToOrigin || !this.startEvent) && i && i(),
            !(this.lastMoveEvent && this.lastMoveEventInfo))
          )
            return;
          let a = Ic(
            e.type === `pointercancel`
              ? this.lastMoveEventInfo
              : Pc(t, this.transformPagePoint),
            this.history,
          );
          (this.startEvent && n && n(e, a), r && r(e, a));
        }),
        !fc(e))
      )
        return;
      ((this.dragSnapToOrigin = i),
        (this.handlers = t),
        (this.transformPagePoint = n),
        (this.distanceThreshold = a),
        (this.contextWindow = r || window));
      let s = Pc(pc(e), this.transformPagePoint),
        { point: c } = s,
        { timestamp: l } = P;
      this.history = [{ ...c, timestamp: l }];
      let { onSessionStart: u } = t;
      u && u(e, Ic(s, this.history));
      let d = { passive: !0, capture: !0 };
      ((this.removeListeners = b(
        hc(this.contextWindow, `pointermove`, this.handlePointerMove, d),
        hc(this.contextWindow, `pointerup`, this.handlePointerUp, d),
        hc(this.contextWindow, `pointercancel`, this.handlePointerUp, d),
      )),
        o && this.startScrollTracking(o));
    }
    startScrollTracking(e) {
      let t = e.parentElement;
      for (; t;) {
        let e = getComputedStyle(t);
        ((Mc.has(e.overflowX) || Mc.has(e.overflowY)) &&
          this.scrollPositions.set(t, { x: t.scrollLeft, y: t.scrollTop }),
          (t = t.parentElement));
      }
      (this.scrollPositions.set(window, {
        x: window.scrollX,
        y: window.scrollY,
      }),
        window.addEventListener(`scroll`, this.onElementScroll, {
          capture: !0,
        }),
        window.addEventListener(`scroll`, this.onWindowScroll),
        (this.removeScrollListeners = () => {
          (window.removeEventListener(`scroll`, this.onElementScroll, {
            capture: !0,
          }),
            window.removeEventListener(`scroll`, this.onWindowScroll));
        }));
    }
    handleScroll(e) {
      let t = this.scrollPositions.get(e);
      if (!t) return;
      let n = e === window,
        r = n
          ? { x: window.scrollX, y: window.scrollY }
          : { x: e.scrollLeft, y: e.scrollTop },
        i = { x: r.x - t.x, y: r.y - t.y };
      (i.x !== 0 || i.y !== 0) &&
        (n
          ? this.lastMoveEventInfo &&
            ((this.lastMoveEventInfo.point.x += i.x),
            (this.lastMoveEventInfo.point.y += i.y))
          : this.history.length > 0 &&
            ((this.history[0].x -= i.x), (this.history[0].y -= i.y)),
        this.scrollPositions.set(e, r),
        q.update(this.updatePoint, !0));
    }
    updateHandlers(e) {
      this.handlers = e;
    }
    end() {
      (this.removeListeners && this.removeListeners(),
        this.removeScrollListeners && this.removeScrollListeners(),
        this.scrollPositions.clear(),
        St(this.updatePoint));
    }
  };
function Pc(e, t) {
  return t ? { point: t(e.point) } : e;
}
function Fc(e, t) {
  return { x: e.x - t.x, y: e.y - t.y };
}
function Ic({ point: e }, t) {
  return {
    point: e,
    delta: Fc(e, Rc(t)),
    offset: Fc(e, Lc(t)),
    velocity: zc(t, 0.1),
  };
}
function Lc(e) {
  return e[0];
}
function Rc(e) {
  return e[e.length - 1];
}
function zc(e, t) {
  if (e.length < 2) return { x: 0, y: 0 };
  let n = e.length - 1,
    r = null,
    i = Rc(e);
  for (; n >= 0 && ((r = e[n]), !(i.timestamp - r.timestamp > C(t)));) n--;
  if (!r) return { x: 0, y: 0 };
  r === e[0] &&
    e.length > 2 &&
    i.timestamp - r.timestamp > C(t) * 2 &&
    (r = e[1]);
  let a = w(i.timestamp - r.timestamp);
  if (a === 0) return { x: 0, y: 0 };
  let o = { x: (i.x - r.x) / a, y: (i.y - r.y) / a };
  return (o.x === 1 / 0 && (o.x = 0), o.y === 1 / 0 && (o.y = 0), o);
}
var Bc = new Set([`BUTTON`, `INPUT`, `SELECT`, `TEXTAREA`, `A`]);
function Vc(e) {
  return Bc.has(e.tagName) || e.isContentEditable === !0;
}
var Hc = new Set([`INPUT`, `SELECT`, `TEXTAREA`]);
function Uc(e) {
  return Hc.has(e.tagName) || e.isContentEditable === !0;
}
var Wc = { x: !1, y: !1 };
function Gc() {
  return Wc.x || Wc.y;
}
function Kc(e) {
  return e === `x` || e === `y`
    ? Wc[e]
      ? null
      : ((Wc[e] = !0),
        () => {
          Wc[e] = !1;
        })
    : Wc.x || Wc.y
      ? null
      : ((Wc.x = Wc.y = !0),
        () => {
          Wc.x = Wc.y = !1;
        });
}
function qc(e, { min: t, max: n }, r) {
  return (
    t !== void 0 && e < t
      ? (e = r ? K(t, e, r.min) : Math.max(e, t))
      : n !== void 0 && e > n && (e = r ? K(n, e, r.max) : Math.min(e, n)),
    e
  );
}
function Jc(e, t, n) {
  return {
    min: t === void 0 ? void 0 : e.min + t,
    max: n === void 0 ? void 0 : e.max + n - (e.max - e.min),
  };
}
function Yc(e, { top: t, left: n, bottom: r, right: i }) {
  return { x: Jc(e.x, n, i), y: Jc(e.y, t, r) };
}
function Xc(e, t) {
  let n = t.min - e.min,
    r = t.max - e.max;
  return (
    t.max - t.min < e.max - e.min && ([n, r] = [r, n]),
    { min: n, max: r }
  );
}
function Zc(e, t) {
  return { x: Xc(e.x, t.x), y: Xc(e.y, t.y) };
}
function Qc(e, t) {
  let n = 0.5,
    r = X(e),
    i = X(t);
  return (
    i > r
      ? (n = x(t.min, t.max - r, e.min))
      : r > i && (n = x(e.min, e.max - i, t.min)),
    p(0, 1, n)
  );
}
function $c(e, t) {
  let n = {};
  return (
    t.min !== void 0 && (n.min = t.min - e.min),
    t.max !== void 0 && (n.max = t.max - e.min),
    n
  );
}
var el = 0.35;
function tl(e = el) {
  return (
    e === !1 ? (e = 0) : e === !0 && (e = el),
    { x: nl(e, `left`, `right`), y: nl(e, `top`, `bottom`) }
  );
}
function nl(e, t, n) {
  return { min: rl(e, t), max: rl(e, n) };
}
function rl(e, t) {
  return typeof e == `number` ? e : e[t] || 0;
}
var il = new WeakMap(),
  al = class {
    constructor(e, t = () => e.getProps()) {
      ((this.openDragLock = null),
        (this.isDragging = !1),
        (this.currentDirection = null),
        (this.originPoint = { x: 0, y: 0 }),
        (this.constraints = !1),
        (this.hasMutatedConstraints = !1),
        (this.elastic = Z()),
        (this.latestPointerEvent = null),
        (this.latestPanInfo = null),
        (this.visualElement = e),
        (this.readProps = t));
    }
    start(e, { snapToCursor: t = !1, distanceThreshold: n } = {}) {
      let { presenceContext: r } = this.visualElement;
      if (r && r.isPresent === !1) return;
      let i = (e) => {
          (t && this.snapToCursor(e), this.stopAnimation());
        },
        a = (e, t) => {
          let { drag: n, dragPropagation: r, onDragStart: i } = this.getProps();
          if (
            n &&
            !r &&
            (this.openDragLock && this.openDragLock(),
            (this.openDragLock = Kc(n)),
            !this.openDragLock)
          )
            return;
          ((this.latestPointerEvent = e),
            (this.latestPanInfo = t),
            (this.isDragging = !0),
            (this.currentDirection = null),
            this.resolveConstraints(),
            this.visualElement.projection &&
              ((this.visualElement.projection.isAnimationBlocked = !0),
              (this.visualElement.projection.target = void 0)),
            es((e) => {
              let t = this.getAxisMotionValue(e).get() || 0;
              if (
                (ve(t) && (t = vi(t, this.visualElement.current) || 0),
                z.test(t))
              )
                t = parseFloat(t);
              else if (R.test(t)) {
                let { projection: n } = this.visualElement;
                if (n && n.layout) {
                  let r = n.layout.layoutBox[e];
                  r && (t = X(r) * (parseFloat(t) / 100));
                }
              }
              this.originPoint[e] = t;
            }),
            i && q.update(() => i(e, t), !1, !0),
            ki(this.visualElement, `transform`));
          let { animationState: a } = this.visualElement;
          a && a.setActive(`whileDrag`, !0);
        },
        o = (e, t) => {
          ((this.latestPointerEvent = e), (this.latestPanInfo = t));
          let {
            dragPropagation: n,
            dragDirectionLock: r,
            onDirectionLock: i,
            onDrag: a,
          } = this.getProps();
          if (!n && !this.openDragLock) return;
          let { offset: o } = t;
          if (r && this.currentDirection === null) {
            if (
              ((this.currentDirection = dl(o)), this.currentDirection === null)
            )
              return;
            i && i(this.currentDirection);
          }
          (this.updateAxis(`x`, t.point, o),
            this.updateAxis(`y`, t.point, o),
            this.visualElement.render(),
            a && q.update(() => a(e, t), !1, !0));
        },
        s = (e, t) => {
          ((this.latestPointerEvent = e),
            (this.latestPanInfo = t),
            this.stop(e, t),
            (this.latestPointerEvent = null),
            (this.latestPanInfo = null));
        },
        c = () => {
          let { dragSnapToOrigin: e } = this.getProps();
          (e || this.constraints) && this.startAnimation({ x: 0, y: 0 });
        },
        { dragSnapToOrigin: l } = this.getProps();
      this.panSession = new Nc(
        e,
        {
          onSessionStart: i,
          onStart: a,
          onMove: o,
          onSessionEnd: s,
          resumeAnimation: c,
        },
        {
          transformPagePoint: this.visualElement.getTransformPagePoint(),
          dragSnapToOrigin: l,
          distanceThreshold: n,
          contextWindow: this.visualElement.current?.ownerDocument.defaultView,
          element: this.visualElement.current,
        },
      );
    }
    stop(e, t, n) {
      let r = e || this.latestPointerEvent,
        i = t || this.latestPanInfo,
        a = this.isDragging;
      if ((this.cancel(), !a || !i || !r)) return;
      let { velocity: o } = i;
      this.startAnimation(o, n);
      let { onDragEnd: s } = this.getProps();
      s && q.postRender(() => s(r, i));
    }
    cancel() {
      this.isDragging = !1;
      let { projection: e, animationState: t } = this.visualElement;
      (e && (e.isAnimationBlocked = !1), this.endPanSession());
      let { dragPropagation: n } = this.getProps();
      (!n &&
        this.openDragLock &&
        (this.openDragLock(), (this.openDragLock = null)),
        t && t.setActive(`whileDrag`, !1));
    }
    endPanSession() {
      (this.panSession && this.panSession.end(), (this.panSession = void 0));
    }
    updateAxis(e, t, n) {
      let { drag: r } = this.getProps();
      if (!n || !ul(e, r, this.currentDirection)) return;
      let i = this.getAxisMotionValue(e),
        a = this.originPoint[e] + n[e];
      (this.constraints &&
        this.constraints[e] &&
        (a = qc(a, this.constraints[e], this.elastic[e])),
        i.set(a));
    }
    resolveConstraints() {
      let { dragConstraints: e, dragElastic: t } = this.getProps(),
        n =
          this.visualElement.projection && !this.visualElement.projection.layout
            ? this.visualElement.projection.measure(!1)
            : this.visualElement.projection?.layout,
        r = this.constraints;
      (ol(e)
        ? (this.constraints ||= this.resolveRefConstraints())
        : (this.constraints = e && n ? Yc(n.layoutBox, e) : !1),
        (this.elastic = tl(t)),
        r !== this.constraints &&
          !ol(e) &&
          n &&
          this.constraints &&
          !this.hasMutatedConstraints &&
          es((e) => {
            this.constraints !== !1 &&
              this.getAxisMotionValue(e) &&
              (this.constraints[e] = $c(n.layoutBox[e], this.constraints[e]));
          }));
    }
    resolveRefConstraints() {
      let { dragConstraints: e, onMeasureDragConstraints: t } = this.getProps();
      if (!ol(e)) return !1;
      let n = sl(e),
        { projection: r } = this.visualElement;
      if (!r || !r.layout) return !1;
      r.root && ((r.root.scroll = void 0), r.root.updateScroll());
      let i = qa(n, r.root, this.visualElement.getTransformPagePoint()),
        a = Zc(r.layout.layoutBox, i);
      if (t) {
        let e = t(Oa(a));
        ((this.hasMutatedConstraints = !!e), e && (a = Da(e)));
      }
      return a;
    }
    startAnimation(e, t) {
      let {
          drag: n,
          dragMomentum: r,
          dragElastic: i,
          dragTransition: a,
          dragSnapToOrigin: o,
          onDragTransitionEnd: s,
        } = this.getProps(),
        c = this.constraints || {},
        l = es((s) => {
          if (!ul(s, t || n, this.currentDirection)) return;
          let l = (c && c[s]) || {};
          (o === !0 || o === s) && (l = { min: 0, max: 0 });
          let u = i ? 200 : 1e6,
            d = i ? 40 : 1e7,
            f = {
              type: `inertia`,
              velocity: r ? e[s] : 0,
              bounceStiffness: u,
              bounceDamping: d,
              timeConstant: 750,
              restDelta: 1,
              restSpeed: 10,
              ...a,
              ...l,
            };
          return this.startAxisValueAnimation(s, f);
        });
      return Promise.all(l).then(s);
    }
    startAxisValueAnimation(e, t) {
      let n = this.getAxisMotionValue(e);
      return (
        ki(this.visualElement, e),
        n.start(hi(e, n, 0, t, this.visualElement, !1))
      );
    }
    stopAnimation() {
      es((e) => this.getAxisMotionValue(e).stop());
    }
    getAxisMotionValue(e) {
      let t = `_drag${e.toUpperCase()}`;
      return (
        this.readProps()[t] ||
        this.visualElement.getValue(e, this.visualElement.latestValues[e] ?? 0)
      );
    }
    snapToCursor({ clientX: e, clientY: t }) {
      let { drag: n } = this.getProps(),
        r = { x: e, y: t },
        i = this.visualElement.getTransformPagePoint()?.(r) || r,
        a = this.visualElement.measureViewportBox();
      es((e) => {
        if (!ul(e, n, this.currentDirection)) return;
        let t = this.getAxisMotionValue(e),
          { min: r, max: o } = a[e];
        t.set((t.get() || 0) + i[e] - K(r, o, 0.5));
      });
    }
    scalePositionWithinConstraints() {
      if (!this.visualElement.current) return;
      let { drag: e, dragConstraints: t } = this.getProps(),
        { projection: n } = this.visualElement;
      if (!ol(t) || !n || !this.constraints) return;
      this.stopAnimation();
      let r = this.constraints,
        i = { x: 0, y: 0 };
      es((e) => {
        let t = this.getAxisMotionValue(e).get();
        i[e] = Qc({ min: t, max: t }, r[e]);
      });
      let { transformTemplate: a } = this.visualElement.getProps();
      ((this.visualElement.current.style.transform = a ? a({}, ``) : `none`),
        n.root && n.root.updateScroll(),
        n.updateLayout(),
        (this.constraints = !1),
        this.resolveConstraints(),
        es((t) => {
          let n = this.getAxisMotionValue(t);
          if (!ul(t, e, null) || !n.get()) return;
          let { min: r, max: a } = this.constraints[t];
          n.set(K(r, a, i[t]));
        }),
        this.visualElement.render());
    }
    addListeners() {
      if (!this.visualElement.current) return;
      il.set(this.visualElement, this);
      let e = this.visualElement.current,
        t = hc(e, `pointerdown`, (t) => {
          let { drag: n, dragListener: r = !0 } = this.getProps(),
            i = t.target,
            a = i !== e && Uc(i);
          n && r && !a && this.start(t);
        }),
        n,
        r = () => {
          let { dragConstraints: t } = this.getProps(),
            r = ol(t) && sl(t);
          r &&
            ((this.constraints = this.resolveRefConstraints()),
            (n ||= ll(e, r, () => this.scalePositionWithinConstraints())));
        },
        { projection: i } = this.visualElement,
        a = i.addEventListener(`measure`, r);
      (i && !i.layout && (i.root && i.root.updateScroll(), i.updateLayout()),
        q.read(r));
      let o = zs(window, `resize`, () => this.scalePositionWithinConstraints()),
        s = i.addEventListener(
          `didUpdate`,
          ({ delta: e, hasLayoutChanged: t }) => {
            this.isDragging &&
              t &&
              (es((t) => {
                if (!ul(t, this.getProps().drag, this.currentDirection)) return;
                let n = this.getAxisMotionValue(t);
                ((this.originPoint[t] += e[t].translate),
                  n.set(n.get() + e[t].translate));
              }),
              this.visualElement.render());
          },
        );
      return () => {
        (o(), t(), a(), s && s(), n && n());
      };
    }
    getProps() {
      let e = this.readProps(),
        {
          drag: t = !1,
          dragDirectionLock: n = !1,
          dragPropagation: r = !1,
          dragConstraints: i = !1,
          dragElastic: a = el,
          dragMomentum: o = !0,
        } = e;
      return {
        ...e,
        drag: t,
        dragDirectionLock: n,
        dragPropagation: r,
        dragConstraints: i,
        dragElastic: a,
        dragMomentum: o,
      };
    }
  };
function ol(e) {
  return !!e && typeof e == `object` && (`current` in e || `nodeType` in e);
}
var sl = (e) => (`current` in e ? e.current : e);
function cl(e) {
  let t = !0;
  return () => {
    t ? (t = !1) : e();
  };
}
function ll(e, t, n) {
  let r = kc(e, cl(n)),
    i = kc(t, cl(n));
  return () => {
    (r(), i());
  };
}
function ul(e, t, n) {
  return (t === !0 || t === e) && (n === null || n === e);
}
function dl(e, t = 10) {
  let n = null;
  return (Math.abs(e.y) > t ? (n = `y`) : Math.abs(e.x) > t && (n = `x`), n);
}
function fl(e, t) {
  let n = ia(e),
    r = new AbortController();
  return [n, { passive: !0, ...t, signal: r.signal }, na(() => r.abort())];
}
function pl(e) {
  return !(e.pointerType === `touch` || Gc());
}
function ml(e, t, n = {}) {
  t = ra(t);
  let [r, i, a] = fl(e, n);
  return (
    r.forEach((e) => {
      let n = !1,
        r = !1,
        a,
        o = () => {
          e.removeEventListener(`pointerleave`, u);
        },
        s = (e) => {
          ((a &&= (a(e), void 0)), o());
        },
        c = (e) => {
          ((n = !1),
            window.removeEventListener(`pointerup`, c),
            window.removeEventListener(`pointercancel`, c),
            r && ((r = !1), s(e)));
        },
        l = () => {
          ((n = !0),
            window.addEventListener(`pointerup`, c, i),
            window.addEventListener(`pointercancel`, c, i));
        },
        u = (e) => {
          e.pointerType !== `touch` && (n ? (r = !0) : s(e));
        };
      (e.addEventListener(
        `pointerenter`,
        (n) => {
          if (!pl(n)) return;
          r = !1;
          let o = t(e, n);
          typeof o == `function` &&
            ((a = o), e.addEventListener(`pointerleave`, u, i));
        },
        i,
      ),
        e.addEventListener(`pointerdown`, l, i));
    }),
    a
  );
}
var hl = (e, t) => (t ? e === t || hl(e, t.parentElement) : !1),
  gl = new WeakSet();
function _l(e) {
  return (t) => {
    t.key === `Enter` && e(t);
  };
}
function vl(e, t) {
  e.dispatchEvent(
    new PointerEvent(`pointer` + t, { isPrimary: !0, bubbles: !0 }),
  );
}
var yl = (e, t) => {
  let n = !1,
    r = _l(() => {
      gl.has(e) || ((n = !0), vl(e, `down`));
    }),
    i = _l(() => {
      n && ((n = !1), vl(e, `up`));
    });
  (e.addEventListener(`keydown`, r, t),
    e.addEventListener(`keyup`, i, t),
    e.addEventListener(
      `blur`,
      () => {
        (e.removeEventListener(`keydown`, r),
          e.removeEventListener(`keyup`, i),
          n && vl(e, `cancel`));
      },
      { ...t, once: !0 },
    ));
};
function bl(e) {
  return fc(e) && !Gc();
}
var xl = new WeakSet();
function Sl(e, t, n = {}) {
  t = ra(t);
  let [r, i, a] = fl(e, n),
    o = (e) => {
      let r = e.currentTarget;
      if (!bl(e) || xl.has(e)) return;
      (gl.add(r), n.stopPropagation && xl.add(e));
      let a = t(r, e),
        o = { ...i, capture: !0 },
        s = (e, t) => {
          (window.removeEventListener(`pointerup`, c, o),
            window.removeEventListener(`pointercancel`, l, o),
            gl.has(r) && gl.delete(r),
            bl(e) && typeof a == `function` && a(e, { success: t }));
        },
        c = (e) => {
          s(
            e,
            r === window ||
              r === document ||
              n.useGlobalTarget ||
              hl(r, e.target),
          );
        },
        l = (e) => {
          s(e, !1);
        };
      (window.addEventListener(`pointerup`, c, o),
        window.addEventListener(`pointercancel`, l, o));
    };
  return (
    r.forEach((e) => {
      ((n.useGlobalTarget ? window : e).addEventListener(`pointerdown`, o, i),
        $i(e) &&
          (e.addEventListener(`focus`, () => yl(e, i), i),
          !Vc(e) && !e.hasAttribute(`tabindex`) && (e.tabIndex = 0)));
    }),
    a
  );
}
var Cl = class {
    constructor(e) {
      ((this.isMounted = !1), (this.node = e));
    }
    update() {}
  },
  wl = new Set([
    `baseFrequency`,
    `diffuseConstant`,
    `kernelMatrix`,
    `kernelUnitLength`,
    `keySplines`,
    `keyTimes`,
    `limitingConeAngle`,
    `markerHeight`,
    `markerWidth`,
    `numOctaves`,
    `targetX`,
    `targetY`,
    `surfaceScale`,
    `specularConstant`,
    `specularExponent`,
    `stdDeviation`,
    `tableValues`,
    `viewBox`,
    `gradientTransform`,
    `pathLength`,
    `startOffset`,
    `textLength`,
    `lengthAdjust`,
  ]),
  Tl = (e) => typeof e == `string` && e.toLowerCase() === `svg`;
function El(e, t, n, r) {
  sc(e, t, void 0, r);
  for (let n in t.attrs) e.setAttribute(wl.has(n) ? n : ha(n), t.attrs[n]);
}
function Dl(e, t, n) {
  let r = lc(e, t, n);
  for (let n in e)
    if (n !== `children` && (Y(e[n]) || Y(t[n]))) {
      let t =
        Ln.indexOf(n) === -1
          ? n
          : `attr` + n.charAt(0).toUpperCase() + n.substring(1);
      r[t] = e[n];
    }
  return r;
}
var Ol = class extends oc {
  constructor() {
    (super(...arguments),
      (this.type = `svg`),
      (this.isSVGTag = !1),
      (this.measureInstanceViewportBox = Z));
  }
  getBaseTargetFromProps(e, t) {
    return Rn.has(t) ? (super.getBaseTargetFromProps(e, t) ?? Nn(t)) : e[t];
  }
  getDefaultValue(e) {
    return Rn.has(e) ? (this.latestValues[e] ?? Nn(e)) : void 0;
  }
  readValueFromInstance(e, t) {
    if (Rn.has(t)) {
      let e = xn(t);
      return (e && e.default) || 0;
    }
    if (ba.includes(t)) {
      let n = getComputedStyle(e)[t];
      if (typeof n == `string` && n) return n.trim();
    }
    return ((t = wl.has(t) ? t : ha(t)), e.getAttribute(t));
  }
  scrapeMotionValuesFromProps(e, t, n) {
    return Dl(e, t, n);
  }
  build(e, t, n) {
    xa(e, t, this.isSVGTag, n.transformTemplate, n.style);
  }
  renderInstance(e, t, n, r) {
    El(e, t, n, r);
  }
  mount(e) {
    ((this.isSVGTag = Tl(e.tagName)), super.mount(e));
  }
};
function kl(e, t) {
  if (!Array.isArray(t)) return !1;
  let n = t.length;
  if (n !== e.length) return !1;
  for (let r = 0; r < n; r++) if (t[r] !== e[r]) return !1;
  return !0;
}
var Al = [...Ks].reverse();
function jl(e) {
  let t = (t) =>
      Promise.all(t.map(({ animation: t, options: n }) => Ii(e, t, n))),
    n = Nl(),
    r = !0,
    i = !1;
  function a(a) {
    let { props: o, parent: s, manuallyAnimateOnMount: c } = e,
      l = r || i,
      u = [],
      d = new Set(),
      f = {},
      p = 1 / 0,
      m = e;
    do m = m.props.inherit !== !1 && m.parent;
    while (m && !m.isControllingVariants);
    if (
      (Al.forEach((t, r) => {
        let i = n[t],
          h = o[t],
          g = m && m.props[t],
          _ = h === void 0 ? (Gs(g) || g === !1 ? g : void 0) : h,
          v = Gs(_),
          y = t === a ? i.isActive : null;
        y === !1 && (p = r);
        let b = v && h === void 0 && !(l && c);
        if (
          ((i.protectedKeys = { ...f }),
          (!i.isActive && y === null) ||
            (!_ && !i.prevProp) ||
            Ws(_) ||
            typeof _ == `boolean`)
        )
          return;
        if (t === `exit` && i.isActive && y !== !0) {
          f = { ...f, ...i.prevResolvedValues };
          return;
        }
        let x = Ml(i.prevProp, _),
          S = x || (v && ((y && !b) || r > p)),
          C = !1,
          w = Array.isArray(_) ? _ : [_],
          T = {};
        if (y !== !1)
          for (let n of w) {
            let {
              transition: r,
              transitionEnd: i,
              ...a
            } = xi(e, n, Si(e, t)) || {};
            T = { ...T, ...a, ...i };
          }
        let { prevResolvedValues: ee } = i;
        for (let t in { ...ee, ...T }) {
          if (t in f) continue;
          let n = T[t],
            r = ee[t],
            a = Array.isArray(n) && Array.isArray(r) ? !kl(n, r) || x : n !== r;
          if (a && n == null) d.add(t);
          else if (a || (n !== void 0 && d.has(t))) {
            ((S = !0), d.delete(t) && (C = !0), (i.needsAnimating[t] = !0));
            let n = e.getValue(t);
            n && (n.liveStyle = !1);
          } else i.protectedKeys[t] = !0;
        }
        if (
          ((i.prevProp = _),
          (i.prevResolvedValues = T),
          i.isActive && (f = { ...f, ...T }),
          S && (!(b && x) || C))
        )
          for (let n of w) {
            let r = { type: t };
            if (typeof n == `string` && l && c && s?.enteringChildren) {
              let t = xi(s, n)?.transition?.delayChildren;
              r.delay = ei(s.enteringChildren, e, t);
            }
            u.push({ animation: n, options: r });
          }
      }),
      d.size)
    ) {
      let { initial: t } = o,
        n = {},
        r =
          typeof t != `boolean` &&
          xi(e, Array.isArray(t) ? t[0] : t, e.presenceContext?.custom);
      (r && r.transition && (n.transition = r.transition),
        d.forEach((i) => {
          let a = e.getValue(i);
          a && (a.liveStyle = !0);
          let s = r && !Array.isArray(t) ? r[i] : void 0,
            c = e.getBaseTargetFromProps(o, i);
          n[i] =
            (s === void 0
              ? c !== void 0 && !Y(c)
                ? c
                : e.initialValues[i] === void 0
                  ? e.baseTarget[i]
                  : void 0
              : s) ?? null;
        }),
        u.push({ animation: n }));
    }
    let h =
      (l && e.blockInitialAnimation) ||
      (r && !c && (o.initial === !1 || o.initial === o.animate));
    return ((r = i = !1), !h && u.length ? t(u) : Promise.resolve());
  }
  function o(t, r) {
    if (n[t].isActive === r) return Promise.resolve();
    (e.variantChildren?.forEach((e) => e.animationState?.setActive(t, r)),
      (n[t].isActive = r));
    let i = a(t);
    for (let e in n) n[e].protectedKeys = {};
    return i;
  }
  return {
    animateChanges: a,
    setActive: o,
    setAnimateFunction: (n) => {
      t = n(e);
    },
    getState: () => n,
    reset: () => {
      ((n = Nl()), (i = !0));
    },
  };
}
function Ml(e, t) {
  return typeof t == `string` ? t !== e : Array.isArray(t) ? !kl(t, e) : !1;
}
function Nl() {
  let e = {};
  for (let t of Ks)
    e[t] = {
      isActive: t === `animate`,
      protectedKeys: {},
      needsAnimating: {},
      prevResolvedValues: {},
    };
  return e;
}
var Pl = (0, o.createContext)({
  transformPagePoint: (e) => e,
  isStatic: !1,
  reducedMotion: `never`,
});
function Fl(e = !0) {
  let t = (0, o.useContext)(u);
  if (t === null) return [!0, null];
  let { isPresent: n, onExitComplete: r, register: i } = t,
    a = (0, o.useId)();
  (0, o.useEffect)(() => {
    if (e) return i(a);
  }, [e]);
  let s = (0, o.useCallback)(() => e && r && r(a), [a, r, e]);
  return !n && r ? [!1, s] : [!0];
}
var Il = (0, o.createContext)({ strict: !1 }),
  Ll = {
    animation: [
      `animate`,
      `variants`,
      `whileHover`,
      `whileTap`,
      `exit`,
      `whileInView`,
      `whileFocus`,
      `whileDrag`,
    ],
    exit: [`exit`],
    drag: [`drag`, `dragControls`],
    focus: [`whileFocus`],
    hover: [`whileHover`, `onHoverStart`, `onHoverEnd`],
    tap: [`whileTap`, `onTap`, `onTapStart`, `onTapCancel`],
    pan: [`onPan`, `onPanStart`, `onPanSessionStart`, `onPanEnd`],
    inView: [`whileInView`, `onViewportEnter`, `onViewportLeave`],
    layout: [`layout`, `layoutId`],
  },
  Rl = !1;
function zl() {
  if (Rl) return;
  let e = {};
  for (let t in Ll) e[t] = { isEnabled: (e) => Ll[t].some((t) => !!e[t]) };
  (rc(e), (Rl = !0));
}
function Bl() {
  return (zl(), ic());
}
function Vl(e) {
  let t = Bl();
  for (let n in e) t[n] = { ...t[n], ...e[n] };
  rc(t);
}
var Hl = (0, o.createContext)({});
function Ul(e, t) {
  if (Js(e)) {
    let { initial: t, animate: n } = e;
    return {
      initial: t === !1 || Gs(t) ? t : void 0,
      animate: Gs(n) ? n : void 0,
    };
  }
  return e.inherit === !1 ? {} : t;
}
function Wl(e) {
  let { initial: t, animate: n } = Ul(e, (0, o.useContext)(Hl));
  return (0, o.useMemo)(() => ({ initial: t, animate: n }), [Gl(t), Gl(n)]);
}
function Gl(e) {
  return Array.isArray(e) ? e.join(` `) : e;
}
var Kl = () => ({ style: {}, transform: {}, transformOrigin: {}, vars: {} });
function ql(e, t, n) {
  for (let r in t) !Y(t[r]) && !cc(r, n) && (e[r] = t[r]);
}
function Jl({ transformTemplate: e }, t) {
  return (0, o.useMemo)(() => {
    let n = Kl();
    return (ga(n, t, e), Object.assign({}, n.vars, n.style));
  }, [t]);
}
function Yl(e, t) {
  let n = e.style || {},
    r = {};
  return (ql(r, n, e), Object.assign(r, Jl(e, t)), r);
}
function Xl(e, t) {
  let n = {},
    r = Yl(e, t);
  return (
    e.drag &&
      e.dragListener !== !1 &&
      ((n.draggable = !1),
      (r.userSelect = r.WebkitUserSelect = r.WebkitTouchCallout = `none`),
      (r.touchAction =
        e.drag === !0 ? `none` : `pan-${e.drag === `x` ? `y` : `x`}`)),
    e.tabIndex === void 0 &&
      (e.onTap || e.onTapStart || e.whileTap) &&
      (n.tabIndex = 0),
    (n.style = r),
    n
  );
}
var Zl = () => ({ ...Kl(), attrs: {} });
function Ql(e, t, n, r) {
  let i = (0, o.useMemo)(() => {
    let n = Zl();
    return (
      xa(n, t, Tl(r), e.transformTemplate, e.style),
      { ...n.attrs, style: { ...n.style } }
    );
  }, [t]);
  if (e.style) {
    let t = {};
    return (ql(t, e.style, e), { ...i, style: { ...t, ...i.style } });
  }
  return i;
}
var $l = new Set(
  `animate.exit.variants.initial.style.values.transition.transformTemplate.custom.inherit.onBeforeLayoutMeasure.onAnimationStart.onAnimationComplete.onUpdate.onDragStart.onDrag.onDragEnd.onMeasureDragConstraints.onDirectionLock.onDragTransitionEnd._dragX._dragY.onHoverStart.onHoverEnd.onViewportEnter.onViewportLeave.globalTapTarget.propagate.ignoreStrict.viewport`.split(
    `.`,
  ),
);
function eu(e) {
  return (
    e.startsWith(`while`) ||
    (e.startsWith(`drag`) && e !== `draggable`) ||
    e.startsWith(`layout`) ||
    e.startsWith(`onTap`) ||
    e.startsWith(`onPan`) ||
    e.startsWith(`onLayout`) ||
    $l.has(e)
  );
}
function tu(e, t) {
  return e.startsWith(`on`) ? !eu(e) : (t?.(e) ?? !eu(e));
}
function nu(e, t, n, r) {
  let i = {};
  for (let a in e)
    (a === `values` && typeof e.values == `object`) ||
      Y(e[a]) ||
      ((tu(a, r) ||
        (n === !0 && eu(a)) ||
        (!t && !eu(a)) ||
        (e.draggable && a.startsWith(`onDrag`))) &&
        (i[a] = e[a]));
  return i;
}
var ru = [
  `animate`,
  `circle`,
  `defs`,
  `desc`,
  `ellipse`,
  `g`,
  `image`,
  `line`,
  `filter`,
  `marker`,
  `mask`,
  `metadata`,
  `path`,
  `pattern`,
  `polygon`,
  `polyline`,
  `rect`,
  `stop`,
  `switch`,
  `symbol`,
  `svg`,
  `text`,
  `tspan`,
  `use`,
  `view`,
];
function iu(e) {
  return typeof e != `string` || e.includes(`-`)
    ? !1
    : !!(ru.indexOf(e) > -1 || /[A-Z]/u.test(e));
}
function au(e, t, n, { latestValues: r }, i, a = !1, s, c) {
  let l = ((s ?? iu(e)) ? Ql : Xl)(t, r, i, e),
    u = nu(t, typeof e == `string`, a, c),
    d = e === o.Fragment ? {} : { ...u, ...l, ref: n },
    { children: f } = t,
    p = (0, o.useMemo)(() => (Y(f) ? f.get() : f), [f]);
  return (0, o.createElement)(e, { ...d, children: p });
}
function ou({ scrapeMotionValuesFromProps: e, createRenderState: t }, n, r, i) {
  return { latestValues: su(n, r, i, e), renderState: t() };
}
function su(e, t, n, r) {
  let i = {},
    a = r(e, {});
  for (let e in a) i[e] = oo(a[e]);
  let { initial: o, animate: s } = e,
    c = Js(e),
    l = Ys(e);
  t &&
    l &&
    !c &&
    e.inherit !== !1 &&
    (o === void 0 && (o = t.initial), s === void 0 && (s = t.animate));
  let u = n ? n.initial === !1 : !1;
  u ||= o === !1;
  let d = u ? s : o;
  if (d && typeof d != `boolean` && !Ws(d)) {
    let t = Array.isArray(d) ? d : [d];
    for (let n = 0; n < t.length; n++) {
      let r = bi(e, t[n]);
      if (r) {
        let { transitionEnd: e, transition: t, ...n } = r;
        for (let e in n) {
          let t = n[e];
          if (Array.isArray(t)) {
            let e = u ? t.length - 1 : 0;
            t = t[e];
          }
          t !== null && (i[e] = t);
        }
        for (let t in e) i[t] = e[t];
      }
    }
  }
  return i;
}
var cu = (e) => (t, n) => {
    let r = (0, o.useContext)(Hl),
      i = (0, o.useContext)(u),
      a = () => ou(e, t, r, i);
    return n ? a() : c(a);
  },
  lu = cu({ scrapeMotionValuesFromProps: lc, createRenderState: Kl }),
  uu = cu({ scrapeMotionValuesFromProps: Dl, createRenderState: Zl }),
  du = Symbol.for(`motionComponentSymbol`);
function fu(e, t, n) {
  let r = (0, o.useRef)(n);
  (0, o.useInsertionEffect)(() => {
    r.current = n;
  });
  let i = (0, o.useRef)(null);
  return (0, o.useCallback)(
    (n) => {
      (n && e.onMount?.(n), t && (n ? t.mount(n) : t.unmount()));
      let a = r.current;
      if (typeof a == `function`) {
        if (n) {
          let e = a(n);
          typeof e == `function` && (i.current = e);
        } else i.current ? (i.current(), (i.current = null)) : a(n);
      } else a && (a.current = n);
    },
    [t],
  );
}
var pu = (0, o.createContext)({});
function mu(e) {
  return (
    e &&
    typeof e == `object` &&
    Object.prototype.hasOwnProperty.call(e, `current`)
  );
}
function hu(e, t, n, r, i, a) {
  let { visualElement: s } = (0, o.useContext)(Hl),
    c = (0, o.useContext)(Il),
    d = (0, o.useContext)(u),
    f = (0, o.useContext)(Pl),
    p = f.reducedMotion,
    m = f.skipAnimations,
    h = (0, o.useRef)(null),
    g = (0, o.useRef)(!1);
  ((r ||= c.renderer),
    !h.current &&
      r &&
      ((h.current = r(e, {
        visualState: t,
        parent: s,
        props: n,
        presenceContext: d,
        blockInitialAnimation: d ? d.initial === !1 : !1,
        reducedMotionConfig: p,
        skipAnimations: m,
        isSVG: a,
      })),
      g.current && h.current && (h.current.manuallyAnimateOnMount = !0)));
  let _ = h.current,
    v = (0, o.useContext)(pu);
  (_ &&
    !_.projection &&
    i &&
    (_.type === `html` || _.type === `svg`) &&
    gu(h.current, n, i, v),
    (0, o.useInsertionEffect)(() => {
      _ && _.props !== n && _.update(n, d);
    }));
  let y = n[Ai],
    b = (0, o.useRef)(
      !!y &&
        typeof window < `u` &&
        !window.MotionHandoffIsComplete?.(y) &&
        window.MotionHasOptimisedAnimation?.(y),
    );
  return (
    l(() => {
      g.current &&
        _ &&
        (_.animationState?.animateChanges(), (_.enteringChildren = void 0));
    }, []),
    l(() => {
      ((g.current = !0),
        _ &&
          ((window.MotionIsMounted = !0),
          _.updateFeatures(),
          _.scheduleRenderMicrotask(),
          b.current && _.animationState && _.animationState.animateChanges()));
    }),
    (0, o.useEffect)(() => {
      _ &&
        (!b.current && _.animationState && _.animationState.animateChanges(),
        (b.current &&=
          (queueMicrotask(() => {
            window.MotionHandoffMarkAsComplete?.(y);
          }),
          !1)),
        (_.enteringChildren = void 0));
    }),
    _
  );
}
function gu(e, t, n, r) {
  let {
      layoutId: i,
      layout: a,
      drag: o,
      dragConstraints: s,
      layoutScroll: c,
      layoutRoot: l,
      layoutAnchor: u,
      layoutCrossfade: d,
    } = t,
    f = (e.projection = new n(
      e.latestValues,
      t[`data-framer-portal-id`] ? void 0 : _u(e.parent),
    ));
  f.setOptions({
    layoutId: i,
    layout: a,
    alwaysMeasureLayout: !!o || (s && mu(s)),
    visualElement: e,
    animationType: typeof a == `string` ? a : `both`,
    initialPromotionConfig: r,
    crossfade: d,
    layoutScroll: c,
    layoutRoot: l,
    layoutAnchor: u,
  });
  let p = f.getStack()?.lead;
  p &&
    !f.root.isUpdateBlocked() &&
    (p.willUpdate(), p.scheduleCheckAfterUnmount());
}
function _u(e) {
  if (e) return e.options.allowProjection === !1 ? _u(e.parent) : e.projection;
}
var Q = r();
function vu(e, { forwardMotionProps: t = !1, type: n } = {}, r, i) {
  r && Vl(r);
  let a = n ? n === `svg` : iu(e),
    s = a ? uu : lu;
  function l(n, l) {
    let u,
      d = yu(n);
    c(() => !!Vs.current?.sharedNodes.get(d)?.lead && n.initial) &&
      (n = { ...n, initial: !1 });
    let f = { ...(0, o.useContext)(Pl), ...n, layoutId: d },
      { isStatic: p, isValidProp: m } = f,
      h = Wl(n),
      g = s(n, p);
    if (!p && typeof window < `u`) {
      bu(f, r);
      let t = xu(f);
      ((u = t.MeasureLayout),
        (h.visualElement = hu(e, g, f, i, t.ProjectionNode, a)));
    }
    return (0, Q.jsxs)(Hl.Provider, {
      value: h,
      children: [
        u && h.visualElement
          ? (0, Q.jsx)(u, { visualElement: h.visualElement, ...f })
          : null,
        au(e, n, fu(g, h.visualElement, l), g, p, t, a, m),
      ],
    });
  }
  l.displayName = `motion.${typeof e == `string` ? e : `create(${e.displayName ?? e.name ?? ``})`}`;
  let u = (0, o.forwardRef)(l);
  return ((u[du] = e), u);
}
function yu({ layoutId: e }) {
  let t = (0, o.useContext)(s).id;
  return t && e !== void 0 ? t + `-` + e : e;
}
function bu(e, t) {
  (0, o.useContext)(Il).strict;
}
function xu(e) {
  let { drag: t, layout: n } = Bl();
  if (!t && !n) return {};
  let r = { ...t, ...n };
  return {
    MeasureLayout:
      t?.isEnabled(e) || n?.isEnabled(e) ? r.MeasureLayout : void 0,
    ProjectionNode: r.ProjectionNode,
  };
}
function Su(e, t) {
  if (typeof Proxy > `u`) return vu;
  let n = new Map(),
    r = (n, r) => vu(n, r, e, t);
  return new Proxy((e, t) => r(e, t), {
    get: (i, a) =>
      a === `create`
        ? r
        : (n.has(a) || n.set(a, vu(a, void 0, e, t)), n.get(a)),
  });
}
var Cu = (e, t) =>
    (t.isSVG ?? iu(e))
      ? new Ol(t)
      : new dc(t, { allowProjection: e !== o.Fragment }),
  wu = class extends Cl {
    constructor(e) {
      (super(e), (e.animationState ||= jl(e)));
    }
    updateAnimationControlsSubscription() {
      let { animate: e } = this.node.getProps();
      Ws(e) && (this.unmountControls = e.subscribe(this.node));
    }
    mount() {
      this.updateAnimationControlsSubscription();
    }
    update() {
      let { animate: e } = this.node.getProps(),
        { animate: t } = this.node.prevProps || {};
      e !== t && this.updateAnimationControlsSubscription();
    }
    unmount() {
      (this.node.animationState.reset(), this.unmountControls?.());
    }
  },
  Tu = 0,
  Eu = {
    animation: { Feature: wu },
    exit: {
      Feature: class extends Cl {
        constructor() {
          (super(...arguments), (this.id = Tu++));
        }
        update() {
          let {
            presenceContext: e,
            prevPresenceContext: t,
            animationState: n,
          } = this.node;
          if (!e || !n) return;
          let { isPresent: r, onExitComplete: i } = e,
            a = t?.isPresent;
          if (r === a) return;
          if (r && a === !1) {
            if (this.exit === !0) {
              let { initial: e } = this.node.getProps();
              if (e && !Array.isArray(e)) {
                let {
                  transition: t,
                  transitionEnd: n,
                  ...r
                } = xi(this.node, e) || {};
                for (let e in r) this.node.getValue(e)?.jump(r[e]);
              }
              ((this.node.blockInitialAnimation = !1),
                n.reset(),
                n.animateChanges());
            } else n.setActive(`exit`, !1);
            this.exit = void 0;
            return;
          }
          let o = (this.exit = n.setActive(`exit`, !r));
          i &&
            !r &&
            o.then(() => {
              this.exit === o && ((this.exit = !0), i(this.id));
            });
        }
        mount() {
          let { register: e, onExitComplete: t } =
            this.node.presenceContext || {};
          (t && t(this.id), e && (this.unmount = e(this.id, this.node)));
        }
        unmount() {}
      },
    },
  },
  Du = class extends Cl {
    constructor(e) {
      (super(e),
        (this.removeGroupControls = y),
        (this.removeListeners = y),
        (this.controls = new al(e)));
    }
    mount() {
      let { dragControls: e } = this.node.getProps();
      (e && (this.removeGroupControls = e.subscribe(this.controls)),
        (this.removeListeners = this.controls.addListeners() || y));
    }
    update() {
      let { dragControls: e, drag: t } = this.node.getProps(),
        { dragControls: n, drag: r } = this.node.prevProps || {};
      (e !== n &&
        (this.removeGroupControls(),
        e && (this.removeGroupControls = e.subscribe(this.controls))),
        r && !t && this.controls.stop(void 0, void 0, r));
    }
    unmount() {
      (this.removeGroupControls(),
        this.removeListeners(),
        this.controls.isDragging || this.controls.endPanSession());
    }
  },
  Ou = ({ current: e }) => (e ? e.ownerDocument.defaultView : null),
  ku = (e) => (t, n) => {
    e && q.update(() => e(t, n), !1, !0);
  },
  Au = class extends Cl {
    constructor() {
      (super(...arguments), (this.removePointerDownListener = y));
    }
    onPointerDown(e) {
      this.session = new Nc(e, this.createPanHandlers(), {
        transformPagePoint: this.node.getTransformPagePoint(),
        contextWindow: Ou(this.node),
      });
    }
    createPanHandlers() {
      let {
        onPanSessionStart: e,
        onPanStart: t,
        onPan: n,
        onPanEnd: r,
      } = this.node.getProps();
      return {
        onSessionStart: ku(e),
        onStart: ku(t),
        onMove: ku(n),
        onEnd: (e, t) => {
          (delete this.session, r && q.postRender(() => r(e, t)));
        },
      };
    }
    mount() {
      this.removePointerDownListener = hc(
        this.node.current,
        `pointerdown`,
        (e) => this.onPointerDown(e),
      );
    }
    update() {
      this.session && this.session.updateHandlers(this.createPanHandlers());
    }
    unmount() {
      (this.removePointerDownListener(), this.session && this.session.end());
    }
  },
  ju = !1,
  Mu = ({ layout: e, layoutDependency: t }) => ({
    layout: e,
    layoutDependency: t,
    animationType: typeof e == `string` ? e : `both`,
  }),
  Nu = class extends o.Component {
    componentDidMount() {
      let {
          visualElement: e,
          layoutGroup: t,
          switchLayoutGroup: n,
          layoutId: r,
        } = this.props,
        { projection: i } = e;
      (i &&
        (t.group && t.group.add(i),
        n && n.register && r && n.register(i),
        ju && i.root.didUpdate(),
        i.addEventListener(`animationComplete`, () => {
          this.safeToRemove();
        }),
        i.setOptions({
          ...i.options,
          ...Mu(this.props),
          onExitComplete: () => this.safeToRemove(),
        })),
        (rs.hasEverUpdated = !0));
    }
    getSnapshotBeforeUpdate(e) {
      let {
          layout: t,
          layoutDependency: n,
          visualElement: r,
          drag: i,
          isPresent: a,
        } = this.props,
        { projection: o } = r;
      return (
        o &&
          ((o.isPresent = a),
          (e.layoutDependency !== n || e.layout !== t) &&
            o.setOptions({ ...o.options, ...Mu(this.props) }),
          (ju = !0),
          i || e.layoutDependency !== n || n === void 0 || e.isPresent !== a
            ? o.willUpdate()
            : this.safeToRemove(),
          e.isPresent !== a &&
            (a
              ? o.promote()
              : o.relegate() ||
                q.postRender(() => {
                  let e = o.getStack();
                  (e && e.members.length) || this.safeToRemove();
                }))),
        null
      );
    }
    componentDidUpdate() {
      let { visualElement: e, layoutAnchor: t } = this.props,
        { projection: n } = e;
      n &&
        ((n.options.layoutAnchor = t),
        n.root.didUpdate(),
        $a.postRender(() => {
          !n.currentAnimation && n.isLead() && this.safeToRemove();
        }));
    }
    componentWillUnmount() {
      let {
          visualElement: e,
          layoutGroup: t,
          switchLayoutGroup: n,
        } = this.props,
        { projection: r } = e;
      ((ju = !0),
        r &&
          (r.scheduleCheckAfterUnmount(),
          t && t.group && t.group.remove(r),
          n && n.deregister && n.deregister(r)));
    }
    safeToRemove() {
      let { safeToRemove: e } = this.props;
      e && e();
    }
    render() {
      return null;
    }
  };
function Pu(e) {
  let [t, n] = Fl(),
    r = (0, o.useContext)(s);
  return (0, Q.jsx)(Nu, {
    ...e,
    layoutGroup: r,
    switchLayoutGroup: (0, o.useContext)(pu),
    isPresent: t,
    safeToRemove: n,
  });
}
var Fu = {
  pan: { Feature: Au },
  drag: { Feature: Du, ProjectionNode: Hs, MeasureLayout: Pu },
};
function Iu(e, t, n) {
  let { props: r } = e;
  e.animationState &&
    r.whileHover &&
    e.animationState.setActive(`whileHover`, n === `Start`);
  let i = r[`onHover` + n];
  i && q.postRender(() => i(t, pc(t)));
}
var Lu = class extends Cl {
    mount() {
      let { current: e } = this.node;
      e &&
        (this.unmount = ml(
          e,
          (e, t) => (Iu(this.node, t, `Start`), (e) => Iu(this.node, e, `End`)),
        ));
    }
    unmount() {}
  },
  Ru = class extends Cl {
    constructor() {
      (super(...arguments), (this.isActive = !1));
    }
    onFocus() {
      let e = !1;
      try {
        e = this.node.current.matches(`:focus-visible`);
      } catch {
        e = !0;
      }
      e &&
        this.node.animationState &&
        (this.node.animationState.setActive(`whileFocus`, !0),
        (this.isActive = !0));
    }
    onBlur() {
      this.isActive &&
        this.node.animationState &&
        (this.node.animationState.setActive(`whileFocus`, !1),
        (this.isActive = !1));
    }
    mount() {
      this.unmount = b(
        zs(this.node.current, `focus`, () => this.onFocus()),
        zs(this.node.current, `blur`, () => this.onBlur()),
      );
    }
    unmount() {}
  };
function zu(e, t, n) {
  let { props: r } = e;
  if (e.current instanceof HTMLButtonElement && e.current.disabled) return;
  e.animationState &&
    r.whileTap &&
    e.animationState.setActive(`whileTap`, n === `Start`);
  let i = r[`onTap` + (n === `End` ? `` : n)];
  i && q.postRender(() => i(t, pc(t)));
}
var Bu = class extends Cl {
    mount() {
      let { current: e } = this.node;
      if (!e) return;
      let { globalTapTarget: t, propagate: n } = this.node.props;
      this.unmount = Sl(
        e,
        (e, t) => (
          zu(this.node, t, `Start`),
          (e, { success: t }) => zu(this.node, e, t ? `End` : `Cancel`)
        ),
        { useGlobalTarget: t, stopPropagation: n?.tap === !1 },
      );
    }
    unmount() {}
  },
  Vu = new WeakMap(),
  Hu = new WeakMap(),
  Uu = (e) => {
    let t = Vu.get(e.target);
    t && t(e);
  },
  Wu = (e) => {
    e.forEach(Uu);
  };
function Gu({ root: e, ...t }) {
  let n = e || document;
  Hu.has(n) || Hu.set(n, {});
  let r = Hu.get(n),
    i = JSON.stringify(t);
  return (
    r[i] || (r[i] = new IntersectionObserver(Wu, { root: e, ...t })),
    r[i]
  );
}
function Ku(e, t, n) {
  let r = Gu(t);
  return (
    Vu.set(e, n),
    r.observe(e),
    () => {
      (Vu.delete(e), r.unobserve(e));
    }
  );
}
var qu = { some: 0, all: 1 },
  Ju = class extends Cl {
    constructor() {
      (super(...arguments), (this.hasEnteredView = !1), (this.isInView = !1));
    }
    startObserver() {
      this.stopObserver?.();
      let { viewport: e = {} } = this.node.getProps(),
        { root: t, margin: n, amount: r = `some`, once: i } = e,
        a = {
          root: t ? t.current : void 0,
          rootMargin: n,
          threshold: typeof r == `number` ? r : qu[r],
        },
        o = (e) => {
          let { isIntersecting: t } = e;
          if (
            this.isInView === t ||
            ((this.isInView = t), i && !t && this.hasEnteredView)
          )
            return;
          (t && (this.hasEnteredView = !0),
            this.node.animationState &&
              this.node.animationState.setActive(`whileInView`, t));
          let { onViewportEnter: n, onViewportLeave: r } = this.node.getProps(),
            a = t ? n : r;
          a && a(e);
        };
      this.stopObserver = Ku(this.node.current, a, o);
    }
    mount() {
      this.startObserver();
    }
    update() {
      if (typeof IntersectionObserver > `u`) return;
      let { props: e, prevProps: t } = this.node;
      [`amount`, `margin`, `root`].some(Yu(e, t)) && this.startObserver();
    }
    unmount() {
      (this.stopObserver?.(), (this.hasEnteredView = !1), (this.isInView = !1));
    }
  };
function Yu({ viewport: e = {} }, { viewport: t = {} } = {}) {
  return (n) => e[n] !== t[n];
}
var Xu = Su(
  Object.assign(
    {},
    Eu,
    {
      inView: { Feature: Ju },
      tap: { Feature: Bu },
      focus: { Feature: Ru },
      hover: { Feature: Lu },
    },
    Fu,
    { layout: { ProjectionNode: Hs, MeasureLayout: Pu } },
  ),
  Cu,
);
function Zu() {
  !Qs.current && ec();
  let [e] = (0, o.useState)(Zs.current);
  return e;
}
function Qu(e) {
  return typeof e == `object` && !Array.isArray(e);
}
function $u(e, t, n, r) {
  return e == null
    ? []
    : typeof e == `string` && Qu(t)
      ? ia(e, n, r)
      : e instanceof NodeList
        ? Array.from(e)
        : Array.isArray(e)
          ? e.filter((e) => e != null)
          : [e];
}
function ed(e, t, n) {
  return e * (t + 1) + n * t;
}
function td(e, t, n, r) {
  return typeof t == `number`
    ? t
    : t.startsWith(`-`) || t.startsWith(`+`)
      ? Math.max(0, e + parseFloat(t))
      : t === `<`
        ? n
        : t.startsWith(`<`)
          ? Math.max(0, n + parseFloat(t.slice(1)))
          : (r.get(t) ?? e);
}
function nd(e, t, n) {
  for (let r = 0; r < e.length; r++) {
    let i = e[r];
    i.at > t && i.at < n && (f(e, i), r--);
  }
}
function rd(e, t, n, r, i, a) {
  nd(e, i, a);
  for (let o = 0; o < t.length; o++)
    e.push({ value: t[o], at: K(i, a, r[o]), easing: le(n, o) });
}
function id(e, t, n = 0) {
  let r = t + 1 + t * n;
  for (let t = 0; t < e.length; t++) e[t] = e[t] / r;
}
function ad(e, t) {
  return e.at === t.at
    ? e.value === null
      ? 1
      : t.value === null
        ? -1
        : 0
    : e.at - t.at;
}
var od = `easeInOut`,
  sd = 20;
function cd(e, { defaultTransition: t = {}, ...n } = {}, r, i) {
  let a = t.duration || 0.3,
    o = new Map(),
    s = new Map(),
    c = {},
    l = new Map(),
    u = 0,
    d = 0,
    f = 0;
  for (let n = 0; n < e.length; n++) {
    let o = e[n];
    if (typeof o == `string`) {
      l.set(o, d);
      continue;
    }
    if (!Array.isArray(o)) {
      l.set(o.name, td(d, o.at, u, l));
      continue;
    }
    let [p, m, h = {}] = o;
    h.at !== void 0 && (d = td(d, h.at, u, l));
    let g = 0,
      _ = (e, n, r, o = 0, s = 0) => {
        let c = dd(e),
          {
            delay: l = 0,
            times: u = Gt(c),
            type: p = t.type || `keyframes`,
            repeat: m,
            repeatType: h,
            repeatDelay: _ = 0,
            ...v
          } = n,
          { ease: y = t.ease || `easeOut`, duration: b } = n,
          x = typeof l == `function` ? l(o, s) : l,
          S = c.length,
          w = pr(p) ? p : i?.[p || `keyframes`];
        if (S <= 2 && w) {
          let e = 100;
          if (S === 2 && md(c)) {
            let t = c[1] - c[0];
            e = Math.abs(t);
          }
          let n = { ...t, ...v };
          b !== void 0 && (n.duration = C(b));
          let r = Ot(n, e, w);
          ((y = r.ease), (b = r.duration));
        }
        b ??= a;
        let T = d + x;
        u.length === 1 && u[0] === 0 && (u[1] = 1);
        let ee = u.length - c.length;
        if (
          (ee > 0 && Wt(u, ee),
          c.length === 1 && c.unshift(null),
          m && `${m}${sd}`,
          m && m < sd)
        ) {
          let e = b > 0 ? _ / b : 0;
          b = ed(b, m, _);
          let t = [...c],
            n = [...u];
          y = Array.isArray(y) ? [...y] : [y];
          let r = [...y],
            i = h === `reverse` || h === `mirror`,
            a = t,
            o = r;
          i &&
            ((a = [...t].reverse()),
            h === `reverse` &&
              (o = [...r]
                .reverse()
                .map((e) => (typeof e == `function` ? k(e) : e))));
          for (let s = 0; s < m; s++) {
            let l = i && s % 2 == 0,
              d = l ? a : t,
              f = l ? o : r,
              p = (s + 1) * (1 + e);
            (e > 0 && (c.push(c[c.length - 1]), u.push(p), y.push(`linear`)),
              c.push(...d));
            for (let e = 0; e < d.length; e++)
              (u.push(n[e] + p), y.push(e === 0 ? `linear` : le(f, e - 1)));
          }
          id(u, m, e);
        }
        let E = T + b;
        (rd(r, c, y, u, T, E), (g = Math.max(x + b, g)), (f = Math.max(E, f)));
      };
    if (Y(p)) {
      let e = ld(p, s);
      _(m, h, ud(`default`, e));
    } else {
      let e = $u(p, m, r, c),
        t = e.length;
      for (let n = 0; n < t; n++) {
        ((m = m), (h = h));
        let r = e[n],
          i = ld(r, s);
        for (let e in m) _(m[e], fd(h, e), ud(e, i), n, t);
      }
    }
    ((u = d), (d += g));
  }
  return (
    s.forEach((e, r) => {
      for (let i in e) {
        let a = e[i];
        a.sort(ad);
        let s = [],
          c = [],
          l = [];
        for (let e = 0; e < a.length; e++) {
          let { at: t, value: n, easing: r } = a[e];
          (s.push(n), c.push(x(0, f, t)), l.push(r || `easeOut`));
        }
        (c[0] !== 0 && (c.unshift(0), s.unshift(s[0]), l.unshift(od)),
          c[c.length - 1] !== 1 && (c.push(1), s.push(null)),
          o.has(r) || o.set(r, { keyframes: {}, transition: {} }));
        let u = o.get(r);
        u.keyframes[i] = s;
        let { type: d, ...p } = t;
        u.transition[i] = { ...p, duration: f, ease: l, times: c, ...n };
      }
    }),
    o
  );
}
function ld(e, t) {
  return (!t.has(e) && t.set(e, {}), t.get(e));
}
function ud(e, t) {
  return (t[e] || (t[e] = []), t[e]);
}
function dd(e) {
  return Array.isArray(e) ? e : [e];
}
function fd(e, t) {
  return e && e[t] ? { ...e, ...e[t] } : { ...e };
}
var pd = (e) => typeof e == `number`,
  md = (e) => e.every(pd);
function hd(e, t) {
  return Y(e) || typeof e == `number` || (typeof e == `string` && !Qu(t));
}
function gd(e, t, n, r) {
  let i = [];
  if (hd(e, t)) i.push(to(e, (Qu(t) && t.default) || t, n && (n.default || n)));
  else {
    if (e == null) return i;
    let a = $u(e, t, r),
      o = a.length;
    for (let e = 0; e < o; e++) {
      let r = a[e],
        s = { ...n };
      (`delay` in s &&
        typeof s.delay == `function` &&
        (s.delay = s.delay(e, o)),
        r instanceof Element
          ? i.push(...Za(r, t, s, Us.get(r)))
          : i.push(...Zi(Yi(r) ?? Qa, r, t, s)));
    }
  }
  return i;
}
function _d(e, t, n) {
  let r = [];
  return (
    cd(
      e.map((e) => {
        if (Array.isArray(e) && typeof e[0] == `function`) {
          let t = e[0],
            n = ai(0);
          return (
            n.on(`change`, t),
            e.length === 1
              ? [n, [0, 1]]
              : e.length === 2
                ? [n, [0, 1], e[1]]
                : [n, e[1], e[2]]
          );
        }
        return e;
      }),
      t,
      n,
      { spring: Bt },
    ).forEach(({ keyframes: e, transition: t }, n) => {
      r.push(...gd(n, e, t));
    }),
    r
  );
}
function vd(e) {
  return Array.isArray(e) && e.some(Array.isArray);
}
function yd(e = {}) {
  let { scope: t, reduceMotion: n, skipAnimations: r } = e;
  function i(e, i, a) {
    let o = [],
      s,
      c = ta.current,
      l = c?.transition,
      u = {};
    if (
      (n !== void 0 && (u.reduceMotion = n),
      r !== void 0 && (u.skipAnimations = r),
      vd(e))
    ) {
      let { onComplete: n, ...r } = i || {};
      (typeof n == `function` && (s = n),
        l && (r.defaultTransition = { ...l, ...r.defaultTransition }),
        (o = _d(e, { ...u, ...r }, t)));
    } else {
      let { onComplete: n, ...r } = a || {};
      (typeof n == `function` && (s = n),
        (o = gd(e, i, { ...u, ...l, ...r }, t)));
    }
    let d = new $r(o);
    return (
      s && d.finished.then(s),
      c && d.finished.then(c.add(() => d.stop())),
      t &&
        (t.animations.push(d),
        d.finished.then(() => {
          f(t.animations, d);
        })),
      d
    );
  }
  return i;
}
var bd = Object.assign(yd(), { addEffect: qi, removeEffect: Ji }),
  xd = t(),
  Sd = [
    [
      [
        { x: 0, y: 0, cols: 6, rows: 6 },
        { x: 6, y: 0, cols: 4, rows: 4 },
        { x: 10, y: 0, cols: 2, rows: 2 },
        { x: 2, y: 6, cols: 2, rows: 2 },
        { x: 10, y: 2, cols: 2, rows: 4 },
        { x: 0, y: 6, cols: 2, rows: 2 },
        { x: 4, y: 6, cols: 2, rows: 2 },
        { x: 6, y: 4, cols: 2, rows: 2 },
        { x: 6, y: 6, cols: 2, rows: 2 },
        { x: 8, y: 6, cols: 2, rows: 2 },
        { x: 8, y: 4, cols: 2, rows: 2 },
        { x: 10, y: 6, cols: 2, rows: 2 },
      ],
      [
        { x: 0, y: 0, cols: 3, rows: 2 },
        { x: 3, y: 0, cols: 6, rows: 6 },
        { x: 9, y: 0, cols: 3, rows: 2 },
        { x: 0, y: 2, cols: 3, rows: 2 },
        { x: 9, y: 2, cols: 3, rows: 2 },
        { x: 0, y: 4, cols: 3, rows: 2 },
        { x: 3, y: 6, cols: 3, rows: 2 },
        { x: 6, y: 6, cols: 2, rows: 2 },
        { x: 0, y: 6, cols: 3, rows: 2 },
        { x: 8, y: 6, cols: 2, rows: 2 },
        { x: 10, y: 6, cols: 2, rows: 2 },
        { x: 9, y: 4, cols: 3, rows: 2 },
      ],
      [
        { x: 0, y: 0, cols: 3, rows: 2 },
        { x: 3, y: 0, cols: 3, rows: 4 },
        { x: 6, y: 0, cols: 6, rows: 6 },
        { x: 0, y: 2, cols: 3, rows: 2 },
        { x: 10, y: 6, cols: 2, rows: 2 },
        { x: 0, y: 4, cols: 2, rows: 4 },
        { x: 4, y: 4, cols: 2, rows: 2 },
        { x: 6, y: 6, cols: 2, rows: 2 },
        { x: 4, y: 6, cols: 2, rows: 2 },
        { x: 8, y: 6, cols: 2, rows: 2 },
        { x: 2, y: 6, cols: 2, rows: 2 },
        { x: 2, y: 4, cols: 2, rows: 2 },
      ],
      [
        { x: 2, y: 0, cols: 2, rows: 2 },
        { x: 4, y: 0, cols: 6, rows: 2 },
        { x: 8, y: 2, cols: 2, rows: 2 },
        { x: 0, y: 2, cols: 6, rows: 6 },
        { x: 10, y: 0, cols: 2, rows: 6 },
        { x: 0, y: 0, cols: 2, rows: 2 },
        { x: 6, y: 2, cols: 2, rows: 2 },
        { x: 6, y: 4, cols: 2, rows: 2 },
        { x: 6, y: 6, cols: 2, rows: 2 },
        { x: 8, y: 6, cols: 2, rows: 2 },
        { x: 8, y: 4, cols: 2, rows: 2 },
        { x: 10, y: 6, cols: 2, rows: 2 },
      ],
      [
        { x: 0, y: 0, cols: 3, rows: 2 },
        { x: 3, y: 0, cols: 4, rows: 2 },
        { x: 10, y: 0, cols: 2, rows: 2 },
        { x: 0, y: 2, cols: 2, rows: 3 },
        { x: 6, y: 2, cols: 6, rows: 6 },
        { x: 0, y: 5, cols: 2, rows: 3 },
        { x: 2, y: 4, cols: 2, rows: 2 },
        { x: 4, y: 4, cols: 2, rows: 2 },
        { x: 4, y: 6, cols: 2, rows: 2 },
        { x: 2, y: 6, cols: 2, rows: 2 },
        { x: 7, y: 0, cols: 3, rows: 2 },
        { x: 2, y: 2, cols: 4, rows: 2 },
      ],
      [
        { x: 0, y: 0, cols: 3, rows: 2 },
        { x: 5, y: 0, cols: 4, rows: 2 },
        { x: 9, y: 0, cols: 3, rows: 2 },
        { x: 3, y: 0, cols: 2, rows: 2 },
        { x: 8, y: 2, cols: 4, rows: 2 },
        { x: 0, y: 2, cols: 6, rows: 6 },
        { x: 6, y: 2, cols: 2, rows: 2 },
        { x: 6, y: 4, cols: 2, rows: 2 },
        { x: 6, y: 6, cols: 2, rows: 2 },
        { x: 8, y: 4, cols: 2, rows: 4 },
        { x: 10, y: 6, cols: 2, rows: 2 },
        { x: 10, y: 4, cols: 2, rows: 2 },
      ],
      [
        { x: 0, y: 0, cols: 4, rows: 2 },
        { x: 4, y: 0, cols: 3, rows: 2 },
        { x: 9, y: 0, cols: 3, rows: 2 },
        { x: 0, y: 2, cols: 2, rows: 3 },
        { x: 10, y: 2, cols: 2, rows: 2 },
        { x: 0, y: 5, cols: 2, rows: 3 },
        { x: 4, y: 2, cols: 6, rows: 6 },
        { x: 10, y: 4, cols: 2, rows: 2 },
        { x: 2, y: 6, cols: 2, rows: 2 },
        { x: 10, y: 6, cols: 2, rows: 2 },
        { x: 7, y: 0, cols: 2, rows: 2 },
        { x: 2, y: 2, cols: 2, rows: 4 },
      ],
      [
        { x: 0, y: 0, cols: 4, rows: 2 },
        { x: 4, y: 0, cols: 4, rows: 2 },
        { x: 8, y: 0, cols: 2, rows: 2 },
        { x: 0, y: 2, cols: 2, rows: 3 },
        { x: 10, y: 0, cols: 2, rows: 2 },
        { x: 0, y: 5, cols: 2, rows: 3 },
        { x: 4, y: 4, cols: 2, rows: 2 },
        { x: 6, y: 2, cols: 6, rows: 6 },
        { x: 4, y: 6, cols: 2, rows: 2 },
        { x: 2, y: 6, cols: 2, rows: 2 },
        { x: 2, y: 4, cols: 2, rows: 2 },
        { x: 2, y: 2, cols: 4, rows: 2 },
      ],
      [
        { x: 0, y: 0, cols: 4, rows: 2 },
        { x: 4, y: 0, cols: 3, rows: 2 },
        { x: 9, y: 0, cols: 3, rows: 2 },
        { x: 0, y: 2, cols: 2, rows: 3 },
        { x: 10, y: 2, cols: 2, rows: 2 },
        { x: 0, y: 5, cols: 2, rows: 3 },
        { x: 2, y: 2, cols: 2, rows: 4 },
        { x: 10, y: 4, cols: 2, rows: 2 },
        { x: 4, y: 2, cols: 6, rows: 6 },
        { x: 2, y: 6, cols: 2, rows: 2 },
        { x: 10, y: 6, cols: 2, rows: 2 },
        { x: 7, y: 0, cols: 2, rows: 2 },
      ],
      [
        { x: 0, y: 0, cols: 4, rows: 2 },
        { x: 4, y: 0, cols: 4, rows: 2 },
        { x: 8, y: 0, cols: 2, rows: 2 },
        { x: 0, y: 2, cols: 2, rows: 3 },
        { x: 10, y: 0, cols: 2, rows: 2 },
        { x: 0, y: 5, cols: 2, rows: 3 },
        { x: 2, y: 4, cols: 2, rows: 2 },
        { x: 4, y: 4, cols: 2, rows: 2 },
        { x: 4, y: 6, cols: 2, rows: 2 },
        { x: 6, y: 2, cols: 6, rows: 6 },
        { x: 2, y: 6, cols: 2, rows: 2 },
        { x: 2, y: 2, cols: 4, rows: 2 },
      ],
      [
        { x: 0, y: 0, cols: 4, rows: 2 },
        { x: 4, y: 0, cols: 4, rows: 2 },
        { x: 8, y: 0, cols: 2, rows: 2 },
        { x: 0, y: 2, cols: 2, rows: 3 },
        { x: 10, y: 0, cols: 2, rows: 2 },
        { x: 0, y: 5, cols: 2, rows: 3 },
        { x: 2, y: 4, cols: 2, rows: 2 },
        { x: 4, y: 4, cols: 2, rows: 2 },
        { x: 4, y: 6, cols: 2, rows: 2 },
        { x: 2, y: 6, cols: 2, rows: 2 },
        { x: 6, y: 2, cols: 6, rows: 6 },
        { x: 2, y: 2, cols: 4, rows: 2 },
      ],
      [
        { x: 0, y: 0, cols: 4, rows: 2 },
        { x: 4, y: 0, cols: 4, rows: 2 },
        { x: 8, y: 0, cols: 2, rows: 2 },
        { x: 0, y: 2, cols: 2, rows: 3 },
        { x: 10, y: 0, cols: 2, rows: 2 },
        { x: 0, y: 5, cols: 2, rows: 3 },
        { x: 2, y: 4, cols: 2, rows: 2 },
        { x: 4, y: 4, cols: 2, rows: 2 },
        { x: 4, y: 6, cols: 2, rows: 2 },
        { x: 2, y: 6, cols: 2, rows: 2 },
        { x: 2, y: 2, cols: 4, rows: 2 },
        { x: 6, y: 2, cols: 6, rows: 6 },
      ],
    ],
    [
      [
        { x: 0, y: 0, cols: 6, rows: 6 },
        { x: 6, y: 0, cols: 2, rows: 2 },
        { x: 6, y: 2, cols: 2, rows: 2 },
        { x: 8, y: 0, cols: 4, rows: 4 },
        { x: 2, y: 6, cols: 2, rows: 2 },
        { x: 6, y: 4, cols: 2, rows: 4 },
        { x: 8, y: 4, cols: 2, rows: 2 },
        { x: 10, y: 4, cols: 2, rows: 2 },
        { x: 0, y: 6, cols: 2, rows: 2 },
        { x: 4, y: 6, cols: 2, rows: 2 },
        { x: 8, y: 6, cols: 2, rows: 2 },
        { x: 10, y: 6, cols: 2, rows: 2 },
      ],
      [
        { x: 0, y: 0, cols: 2, rows: 3 },
        { x: 2, y: 0, cols: 6, rows: 6 },
        { x: 8, y: 2, cols: 4, rows: 2 },
        { x: 8, y: 0, cols: 4, rows: 2 },
        { x: 0, y: 3, cols: 2, rows: 2 },
        { x: 6, y: 6, cols: 2, rows: 2 },
        { x: 8, y: 4, cols: 2, rows: 4 },
        { x: 10, y: 4, cols: 2, rows: 2 },
        { x: 0, y: 5, cols: 2, rows: 3 },
        { x: 2, y: 6, cols: 2, rows: 2 },
        { x: 4, y: 6, cols: 2, rows: 2 },
        { x: 10, y: 6, cols: 2, rows: 2 },
      ],
      [
        { x: 0, y: 0, cols: 2, rows: 3 },
        { x: 2, y: 0, cols: 2, rows: 3 },
        { x: 4, y: 0, cols: 6, rows: 6 },
        { x: 10, y: 0, cols: 2, rows: 4 },
        { x: 0, y: 3, cols: 4, rows: 2 },
        { x: 6, y: 6, cols: 2, rows: 2 },
        { x: 8, y: 6, cols: 2, rows: 2 },
        { x: 10, y: 4, cols: 2, rows: 2 },
        { x: 0, y: 5, cols: 2, rows: 3 },
        { x: 2, y: 5, cols: 2, rows: 3 },
        { x: 4, y: 6, cols: 2, rows: 2 },
        { x: 10, y: 6, cols: 2, rows: 2 },
      ],
      [
        { x: 0, y: 0, cols: 2, rows: 3 },
        { x: 2, y: 0, cols: 2, rows: 3 },
        { x: 4, y: 0, cols: 2, rows: 4 },
        { x: 6, y: 0, cols: 6, rows: 6 },
        { x: 0, y: 3, cols: 4, rows: 2 },
        { x: 6, y: 6, cols: 2, rows: 2 },
        { x: 8, y: 6, cols: 2, rows: 2 },
        { x: 10, y: 6, cols: 2, rows: 2 },
        { x: 0, y: 5, cols: 2, rows: 3 },
        { x: 2, y: 5, cols: 2, rows: 3 },
        { x: 4, y: 6, cols: 2, rows: 2 },
        { x: 4, y: 4, cols: 2, rows: 2 },
      ],
      [
        { x: 0, y: 0, cols: 2, rows: 2 },
        { x: 2, y: 0, cols: 2, rows: 2 },
        { x: 4, y: 0, cols: 4, rows: 2 },
        { x: 8, y: 0, cols: 4, rows: 4 },
        { x: 0, y: 2, cols: 6, rows: 6 },
        { x: 6, y: 4, cols: 2, rows: 2 },
        { x: 8, y: 4, cols: 2, rows: 2 },
        { x: 10, y: 4, cols: 2, rows: 2 },
        { x: 6, y: 6, cols: 2, rows: 2 },
        { x: 6, y: 2, cols: 2, rows: 2 },
        { x: 8, y: 6, cols: 2, rows: 2 },
        { x: 10, y: 6, cols: 2, rows: 2 },
      ],
      [
        { x: 0, y: 0, cols: 2, rows: 4 },
        { x: 2, y: 0, cols: 2, rows: 3 },
        { x: 4, y: 0, cols: 4, rows: 2 },
        { x: 8, y: 0, cols: 2, rows: 2 },
        { x: 2, y: 3, cols: 2, rows: 2 },
        { x: 6, y: 2, cols: 6, rows: 6 },
        { x: 4, y: 4, cols: 2, rows: 2 },
        { x: 10, y: 0, cols: 2, rows: 2 },
        { x: 0, y: 4, cols: 2, rows: 4 },
        { x: 2, y: 5, cols: 2, rows: 3 },
        { x: 4, y: 6, cols: 2, rows: 2 },
        { x: 4, y: 2, cols: 2, rows: 2 },
      ],
      [
        { x: 0, y: 0, cols: 2, rows: 4 },
        { x: 2, y: 0, cols: 2, rows: 3 },
        { x: 4, y: 0, cols: 4, rows: 2 },
        { x: 8, y: 0, cols: 2, rows: 2 },
        { x: 2, y: 3, cols: 2, rows: 2 },
        { x: 4, y: 4, cols: 2, rows: 2 },
        { x: 6, y: 2, cols: 6, rows: 6 },
        { x: 10, y: 0, cols: 2, rows: 2 },
        { x: 0, y: 4, cols: 2, rows: 4 },
        { x: 2, y: 5, cols: 2, rows: 3 },
        { x: 4, y: 6, cols: 2, rows: 2 },
        { x: 4, y: 2, cols: 2, rows: 2 },
      ],
      [
        { x: 0, y: 0, cols: 2, rows: 4 },
        { x: 2, y: 0, cols: 2, rows: 3 },
        { x: 4, y: 0, cols: 4, rows: 2 },
        { x: 8, y: 0, cols: 2, rows: 2 },
        { x: 2, y: 3, cols: 2, rows: 2 },
        { x: 4, y: 4, cols: 2, rows: 2 },
        { x: 4, y: 6, cols: 2, rows: 2 },
        { x: 6, y: 2, cols: 6, rows: 6 },
        { x: 0, y: 4, cols: 2, rows: 4 },
        { x: 2, y: 5, cols: 2, rows: 3 },
        { x: 4, y: 2, cols: 2, rows: 2 },
        { x: 10, y: 0, cols: 2, rows: 2 },
      ],
      [
        { x: 0, y: 0, cols: 2, rows: 2 },
        { x: 4, y: 0, cols: 2, rows: 2 },
        { x: 6, y: 0, cols: 2, rows: 3 },
        { x: 8, y: 0, cols: 4, rows: 4 },
        { x: 2, y: 0, cols: 2, rows: 2 },
        { x: 6, y: 6, cols: 2, rows: 2 },
        { x: 8, y: 4, cols: 2, rows: 2 },
        { x: 10, y: 4, cols: 2, rows: 2 },
        { x: 0, y: 2, cols: 6, rows: 6 },
        { x: 6, y: 3, cols: 2, rows: 3 },
        { x: 8, y: 6, cols: 2, rows: 2 },
        { x: 10, y: 6, cols: 2, rows: 2 },
      ],
      [
        { x: 0, y: 0, cols: 2, rows: 2 },
        { x: 2, y: 0, cols: 2, rows: 2 },
        { x: 4, y: 0, cols: 4, rows: 2 },
        { x: 8, y: 0, cols: 4, rows: 4 },
        { x: 0, y: 2, cols: 2, rows: 2 },
        { x: 8, y: 4, cols: 2, rows: 2 },
        { x: 8, y: 6, cols: 2, rows: 2 },
        { x: 10, y: 4, cols: 2, rows: 2 },
        { x: 0, y: 6, cols: 2, rows: 2 },
        { x: 2, y: 2, cols: 6, rows: 6 },
        { x: 0, y: 4, cols: 2, rows: 2 },
        { x: 10, y: 6, cols: 2, rows: 2 },
      ],
      [
        { x: 0, y: 0, cols: 2, rows: 3 },
        { x: 2, y: 0, cols: 2, rows: 4 },
        { x: 4, y: 0, cols: 4, rows: 2 },
        { x: 8, y: 0, cols: 4, rows: 2 },
        { x: 0, y: 3, cols: 2, rows: 3 },
        { x: 2, y: 4, cols: 2, rows: 2 },
        { x: 10, y: 4, cols: 2, rows: 2 },
        { x: 10, y: 2, cols: 2, rows: 2 },
        { x: 0, y: 6, cols: 2, rows: 2 },
        { x: 2, y: 6, cols: 2, rows: 2 },
        { x: 4, y: 2, cols: 6, rows: 6 },
        { x: 10, y: 6, cols: 2, rows: 2 },
      ],
      [
        { x: 0, y: 0, cols: 2, rows: 4 },
        { x: 2, y: 0, cols: 2, rows: 3 },
        { x: 4, y: 0, cols: 4, rows: 2 },
        { x: 8, y: 0, cols: 2, rows: 2 },
        { x: 2, y: 3, cols: 2, rows: 2 },
        { x: 4, y: 4, cols: 2, rows: 2 },
        { x: 4, y: 6, cols: 2, rows: 2 },
        { x: 10, y: 0, cols: 2, rows: 2 },
        { x: 0, y: 4, cols: 2, rows: 4 },
        { x: 2, y: 5, cols: 2, rows: 3 },
        { x: 4, y: 2, cols: 2, rows: 2 },
        { x: 6, y: 2, cols: 6, rows: 6 },
      ],
    ],
    [
      [
        { x: 0, y: 0, cols: 6, rows: 6 },
        { x: 6, y: 0, cols: 6, rows: 2 },
        { x: 8, y: 2, cols: 2, rows: 4 },
        { x: 10, y: 2, cols: 2, rows: 3 },
        { x: 0, y: 6, cols: 2, rows: 2 },
        { x: 6, y: 4, cols: 2, rows: 2 },
        { x: 10, y: 5, cols: 2, rows: 3 },
        { x: 2, y: 6, cols: 2, rows: 2 },
        { x: 4, y: 6, cols: 2, rows: 2 },
        { x: 6, y: 6, cols: 2, rows: 2 },
        { x: 8, y: 6, cols: 2, rows: 2 },
        { x: 6, y: 2, cols: 2, rows: 2 },
      ],
      [
        { x: 0, y: 0, cols: 4, rows: 4 },
        { x: 6, y: 0, cols: 6, rows: 6 },
        { x: 6, y: 6, cols: 2, rows: 2 },
        { x: 8, y: 6, cols: 2, rows: 2 },
        { x: 0, y: 4, cols: 2, rows: 2 },
        { x: 4, y: 4, cols: 2, rows: 2 },
        { x: 10, y: 6, cols: 2, rows: 2 },
        { x: 0, y: 6, cols: 2, rows: 2 },
        { x: 2, y: 6, cols: 2, rows: 2 },
        { x: 4, y: 6, cols: 2, rows: 2 },
        { x: 2, y: 4, cols: 2, rows: 2 },
        { x: 4, y: 0, cols: 2, rows: 4 },
      ],
      [
        { x: 0, y: 0, cols: 4, rows: 4 },
        { x: 8, y: 0, cols: 2, rows: 2 },
        { x: 6, y: 2, cols: 6, rows: 6 },
        { x: 6, y: 0, cols: 2, rows: 2 },
        { x: 0, y: 4, cols: 2, rows: 2 },
        { x: 4, y: 4, cols: 2, rows: 2 },
        { x: 10, y: 0, cols: 2, rows: 2 },
        { x: 0, y: 6, cols: 2, rows: 2 },
        { x: 2, y: 6, cols: 2, rows: 2 },
        { x: 4, y: 6, cols: 2, rows: 2 },
        { x: 2, y: 4, cols: 2, rows: 2 },
        { x: 4, y: 0, cols: 2, rows: 4 },
      ],
      [
        { x: 0, y: 0, cols: 4, rows: 4 },
        { x: 8, y: 0, cols: 2, rows: 2 },
        { x: 4, y: 4, cols: 2, rows: 2 },
        { x: 6, y: 2, cols: 6, rows: 6 },
        { x: 0, y: 4, cols: 2, rows: 2 },
        { x: 4, y: 2, cols: 2, rows: 2 },
        { x: 10, y: 0, cols: 2, rows: 2 },
        { x: 0, y: 6, cols: 2, rows: 2 },
        { x: 2, y: 6, cols: 2, rows: 2 },
        { x: 4, y: 6, cols: 2, rows: 2 },
        { x: 2, y: 4, cols: 2, rows: 2 },
        { x: 4, y: 0, cols: 4, rows: 2 },
      ],
      [
        { x: 2, y: 0, cols: 4, rows: 2 },
        { x: 6, y: 0, cols: 6, rows: 2 },
        { x: 6, y: 4, cols: 2, rows: 2 },
        { x: 10, y: 4, cols: 2, rows: 2 },
        { x: 0, y: 2, cols: 6, rows: 6 },
        { x: 6, y: 2, cols: 2, rows: 2 },
        { x: 10, y: 6, cols: 2, rows: 2 },
        { x: 0, y: 0, cols: 2, rows: 2 },
        { x: 6, y: 6, cols: 2, rows: 2 },
        { x: 8, y: 6, cols: 2, rows: 2 },
        { x: 8, y: 4, cols: 2, rows: 2 },
        { x: 8, y: 2, cols: 4, rows: 2 },
      ],
      [
        { x: 0, y: 0, cols: 4, rows: 4 },
        { x: 8, y: 0, cols: 2, rows: 2 },
        { x: 10, y: 4, cols: 2, rows: 2 },
        { x: 10, y: 2, cols: 2, rows: 2 },
        { x: 0, y: 4, cols: 2, rows: 2 },
        { x: 4, y: 2, cols: 6, rows: 6 },
        { x: 10, y: 6, cols: 2, rows: 2 },
        { x: 0, y: 6, cols: 2, rows: 2 },
        { x: 2, y: 6, cols: 2, rows: 2 },
        { x: 2, y: 4, cols: 2, rows: 2 },
        { x: 4, y: 0, cols: 4, rows: 2 },
        { x: 10, y: 0, cols: 2, rows: 2 },
      ],
      [
        { x: 0, y: 0, cols: 4, rows: 4 },
        { x: 8, y: 0, cols: 2, rows: 2 },
        { x: 4, y: 4, cols: 2, rows: 2 },
        { x: 10, y: 0, cols: 2, rows: 2 },
        { x: 0, y: 4, cols: 2, rows: 2 },
        { x: 4, y: 2, cols: 2, rows: 2 },
        { x: 6, y: 2, cols: 6, rows: 6 },
        { x: 0, y: 6, cols: 2, rows: 2 },
        { x: 2, y: 6, cols: 2, rows: 2 },
        { x: 4, y: 6, cols: 2, rows: 2 },
        { x: 2, y: 4, cols: 2, rows: 2 },
        { x: 4, y: 0, cols: 4, rows: 2 },
      ],
      [
        { x: 0, y: 0, cols: 4, rows: 2 },
        { x: 6, y: 0, cols: 6, rows: 2 },
        { x: 6, y: 4, cols: 2, rows: 2 },
        { x: 10, y: 2, cols: 2, rows: 3 },
        { x: 4, y: 0, cols: 2, rows: 2 },
        { x: 6, y: 2, cols: 2, rows: 2 },
        { x: 10, y: 5, cols: 2, rows: 3 },
        { x: 0, y: 2, cols: 6, rows: 6 },
        { x: 6, y: 6, cols: 2, rows: 2 },
        { x: 8, y: 6, cols: 2, rows: 2 },
        { x: 8, y: 4, cols: 2, rows: 2 },
        { x: 8, y: 2, cols: 2, rows: 2 },
      ],
      [
        { x: 0, y: 0, cols: 6, rows: 2 },
        { x: 6, y: 0, cols: 6, rows: 2 },
        { x: 8, y: 4, cols: 2, rows: 2 },
        { x: 10, y: 2, cols: 2, rows: 2 },
        { x: 0, y: 4, cols: 2, rows: 2 },
        { x: 0, y: 2, cols: 2, rows: 2 },
        { x: 10, y: 6, cols: 2, rows: 2 },
        { x: 0, y: 6, cols: 2, rows: 2 },
        { x: 2, y: 2, cols: 6, rows: 6 },
        { x: 8, y: 6, cols: 2, rows: 2 },
        { x: 8, y: 2, cols: 2, rows: 2 },
        { x: 10, y: 4, cols: 2, rows: 2 },
      ],
      [
        { x: 0, y: 0, cols: 4, rows: 4 },
        { x: 8, y: 0, cols: 2, rows: 2 },
        { x: 10, y: 4, cols: 2, rows: 2 },
        { x: 10, y: 2, cols: 2, rows: 2 },
        { x: 0, y: 4, cols: 2, rows: 2 },
        { x: 2, y: 4, cols: 2, rows: 2 },
        { x: 10, y: 6, cols: 2, rows: 2 },
        { x: 0, y: 6, cols: 2, rows: 2 },
        { x: 2, y: 6, cols: 2, rows: 2 },
        { x: 4, y: 2, cols: 6, rows: 6 },
        { x: 4, y: 0, cols: 4, rows: 2 },
        { x: 10, y: 0, cols: 2, rows: 2 },
      ],
      [
        { x: 0, y: 0, cols: 4, rows: 4 },
        { x: 8, y: 0, cols: 2, rows: 2 },
        { x: 4, y: 4, cols: 2, rows: 2 },
        { x: 6, y: 0, cols: 2, rows: 2 },
        { x: 0, y: 4, cols: 2, rows: 2 },
        { x: 2, y: 4, cols: 2, rows: 2 },
        { x: 10, y: 0, cols: 2, rows: 2 },
        { x: 0, y: 6, cols: 2, rows: 2 },
        { x: 2, y: 6, cols: 2, rows: 2 },
        { x: 4, y: 6, cols: 2, rows: 2 },
        { x: 6, y: 2, cols: 6, rows: 6 },
        { x: 4, y: 0, cols: 2, rows: 4 },
      ],
      [
        { x: 0, y: 0, cols: 4, rows: 4 },
        { x: 8, y: 0, cols: 2, rows: 2 },
        { x: 4, y: 4, cols: 2, rows: 2 },
        { x: 4, y: 0, cols: 4, rows: 2 },
        { x: 0, y: 4, cols: 2, rows: 2 },
        { x: 4, y: 2, cols: 2, rows: 2 },
        { x: 10, y: 0, cols: 2, rows: 2 },
        { x: 0, y: 6, cols: 2, rows: 2 },
        { x: 2, y: 6, cols: 2, rows: 2 },
        { x: 4, y: 6, cols: 2, rows: 2 },
        { x: 2, y: 4, cols: 2, rows: 2 },
        { x: 6, y: 2, cols: 6, rows: 6 },
      ],
    ],
    [
      [
        { x: 0, y: 0, cols: 6, rows: 6 },
        { x: 6, y: 2, cols: 2, rows: 2 },
        { x: 6, y: 0, cols: 2, rows: 2 },
        { x: 8, y: 0, cols: 2, rows: 6 },
        { x: 10, y: 0, cols: 2, rows: 2 },
        { x: 0, y: 6, cols: 2, rows: 2 },
        { x: 6, y: 6, cols: 2, rows: 2 },
        { x: 6, y: 4, cols: 2, rows: 2 },
        { x: 8, y: 6, cols: 2, rows: 2 },
        { x: 10, y: 2, cols: 2, rows: 6 },
        { x: 2, y: 6, cols: 2, rows: 2 },
        { x: 4, y: 6, cols: 2, rows: 2 },
      ],
      [
        { x: 0, y: 0, cols: 2, rows: 2 },
        { x: 2, y: 0, cols: 6, rows: 6 },
        { x: 8, y: 0, cols: 2, rows: 3 },
        { x: 8, y: 3, cols: 2, rows: 3 },
        { x: 10, y: 0, cols: 2, rows: 4 },
        { x: 0, y: 2, cols: 2, rows: 2 },
        { x: 6, y: 6, cols: 2, rows: 2 },
        { x: 4, y: 6, cols: 2, rows: 2 },
        { x: 8, y: 6, cols: 2, rows: 2 },
        { x: 10, y: 4, cols: 2, rows: 4 },
        { x: 0, y: 4, cols: 2, rows: 4 },
        { x: 2, y: 6, cols: 2, rows: 2 },
      ],
      [
        { x: 0, y: 0, cols: 2, rows: 2 },
        { x: 2, y: 0, cols: 2, rows: 3 },
        { x: 4, y: 0, cols: 6, rows: 6 },
        { x: 10, y: 0, cols: 2, rows: 2 },
        { x: 10, y: 2, cols: 2, rows: 3 },
        { x: 0, y: 2, cols: 2, rows: 2 },
        { x: 2, y: 3, cols: 2, rows: 2 },
        { x: 4, y: 6, cols: 6, rows: 2 },
        { x: 0, y: 4, cols: 2, rows: 2 },
        { x: 10, y: 5, cols: 2, rows: 3 },
        { x: 0, y: 6, cols: 2, rows: 2 },
        { x: 2, y: 5, cols: 2, rows: 3 },
      ],
      [
        { x: 0, y: 0, cols: 2, rows: 2 },
        { x: 2, y: 0, cols: 2, rows: 2 },
        { x: 4, y: 0, cols: 2, rows: 4 },
        { x: 6, y: 0, cols: 6, rows: 6 },
        { x: 7, y: 6, cols: 2, rows: 2 },
        { x: 0, y: 2, cols: 2, rows: 4 },
        { x: 2, y: 2, cols: 2, rows: 2 },
        { x: 4, y: 4, cols: 2, rows: 2 },
        { x: 2, y: 4, cols: 2, rows: 4 },
        { x: 9, y: 6, cols: 3, rows: 2 },
        { x: 0, y: 6, cols: 2, rows: 2 },
        { x: 4, y: 6, cols: 3, rows: 2 },
      ],
      [
        { x: 0, y: 0, cols: 2, rows: 2 },
        { x: 2, y: 0, cols: 2, rows: 2 },
        { x: 4, y: 0, cols: 2, rows: 4 },
        { x: 7, y: 6, cols: 2, rows: 2 },
        { x: 6, y: 0, cols: 6, rows: 6 },
        { x: 0, y: 2, cols: 2, rows: 4 },
        { x: 2, y: 2, cols: 2, rows: 2 },
        { x: 4, y: 4, cols: 2, rows: 2 },
        { x: 2, y: 4, cols: 2, rows: 4 },
        { x: 9, y: 6, cols: 3, rows: 2 },
        { x: 0, y: 6, cols: 2, rows: 2 },
        { x: 4, y: 6, cols: 3, rows: 2 },
      ],
      [
        { x: 3, y: 0, cols: 2, rows: 2 },
        { x: 6, y: 2, cols: 2, rows: 2 },
        { x: 5, y: 0, cols: 2, rows: 2 },
        { x: 8, y: 2, cols: 2, rows: 3 },
        { x: 9, y: 0, cols: 3, rows: 2 },
        { x: 0, y: 2, cols: 6, rows: 6 },
        { x: 7, y: 0, cols: 2, rows: 2 },
        { x: 6, y: 4, cols: 2, rows: 2 },
        { x: 8, y: 5, cols: 2, rows: 3 },
        { x: 10, y: 2, cols: 2, rows: 6 },
        { x: 0, y: 0, cols: 3, rows: 2 },
        { x: 6, y: 6, cols: 2, rows: 2 },
      ],
      [
        { x: 0, y: 0, cols: 2, rows: 2 },
        { x: 2, y: 0, cols: 2, rows: 2 },
        { x: 4, y: 0, cols: 6, rows: 2 },
        { x: 8, y: 2, cols: 2, rows: 2 },
        { x: 10, y: 0, cols: 2, rows: 3 },
        { x: 0, y: 2, cols: 2, rows: 3 },
        { x: 2, y: 2, cols: 6, rows: 6 },
        { x: 8, y: 4, cols: 2, rows: 2 },
        { x: 10, y: 3, cols: 2, rows: 2 },
        { x: 10, y: 5, cols: 2, rows: 3 },
        { x: 0, y: 5, cols: 2, rows: 3 },
        { x: 8, y: 6, cols: 2, rows: 2 },
      ],
      [
        { x: 0, y: 0, cols: 2, rows: 3 },
        { x: 2, y: 0, cols: 2, rows: 2 },
        { x: 4, y: 0, cols: 3, rows: 2 },
        { x: 7, y: 0, cols: 3, rows: 2 },
        { x: 10, y: 0, cols: 2, rows: 6 },
        { x: 0, y: 3, cols: 2, rows: 2 },
        { x: 2, y: 2, cols: 2, rows: 2 },
        { x: 4, y: 2, cols: 6, rows: 6 },
        { x: 2, y: 4, cols: 2, rows: 2 },
        { x: 10, y: 6, cols: 2, rows: 2 },
        { x: 0, y: 5, cols: 2, rows: 3 },
        { x: 2, y: 6, cols: 2, rows: 2 },
      ],
      [
        { x: 0, y: 0, cols: 2, rows: 2 },
        { x: 2, y: 0, cols: 2, rows: 2 },
        { x: 4, y: 0, cols: 6, rows: 2 },
        { x: 8, y: 2, cols: 2, rows: 2 },
        { x: 10, y: 0, cols: 2, rows: 3 },
        { x: 0, y: 2, cols: 2, rows: 3 },
        { x: 10, y: 3, cols: 2, rows: 2 },
        { x: 8, y: 4, cols: 2, rows: 2 },
        { x: 2, y: 2, cols: 6, rows: 6 },
        { x: 10, y: 5, cols: 2, rows: 3 },
        { x: 0, y: 5, cols: 2, rows: 3 },
        { x: 8, y: 6, cols: 2, rows: 2 },
      ],
      [
        { x: 0, y: 0, cols: 2, rows: 2 },
        { x: 2, y: 0, cols: 3, rows: 2 },
        { x: 5, y: 0, cols: 3, rows: 2 },
        { x: 8, y: 0, cols: 2, rows: 2 },
        { x: 10, y: 0, cols: 2, rows: 2 },
        { x: 0, y: 2, cols: 2, rows: 3 },
        { x: 2, y: 2, cols: 2, rows: 2 },
        { x: 4, y: 2, cols: 2, rows: 6 },
        { x: 2, y: 4, cols: 2, rows: 2 },
        { x: 6, y: 2, cols: 6, rows: 6 },
        { x: 0, y: 5, cols: 2, rows: 3 },
        { x: 2, y: 6, cols: 2, rows: 2 },
      ],
      [
        { x: 2, y: 0, cols: 3, rows: 2 },
        { x: 6, y: 2, cols: 2, rows: 2 },
        { x: 5, y: 0, cols: 3, rows: 2 },
        { x: 8, y: 0, cols: 4, rows: 3 },
        { x: 10, y: 3, cols: 2, rows: 2 },
        { x: 0, y: 0, cols: 2, rows: 2 },
        { x: 8, y: 3, cols: 2, rows: 3 },
        { x: 6, y: 4, cols: 2, rows: 2 },
        { x: 8, y: 6, cols: 2, rows: 2 },
        { x: 10, y: 5, cols: 2, rows: 3 },
        { x: 0, y: 2, cols: 6, rows: 6 },
        { x: 6, y: 6, cols: 2, rows: 2 },
      ],
      [
        { x: 0, y: 0, cols: 2, rows: 2 },
        { x: 2, y: 0, cols: 4, rows: 2 },
        { x: 6, y: 0, cols: 2, rows: 2 },
        { x: 8, y: 0, cols: 2, rows: 4 },
        { x: 10, y: 0, cols: 2, rows: 3 },
        { x: 0, y: 2, cols: 2, rows: 2 },
        { x: 0, y: 4, cols: 2, rows: 2 },
        { x: 8, y: 4, cols: 2, rows: 2 },
        { x: 10, y: 3, cols: 2, rows: 3 },
        { x: 8, y: 6, cols: 4, rows: 2 },
        { x: 0, y: 6, cols: 2, rows: 2 },
        { x: 2, y: 2, cols: 6, rows: 6 },
      ],
    ],
  ],
  Cd = [
    [
      { x: 0, y: 0, cols: 3, rows: 2 },
      { x: 3, y: 0, cols: 6, rows: 4 },
      { x: 9, y: 0, cols: 3, rows: 2 },
      { x: 0, y: 2, cols: 3, rows: 2 },
      { x: 9, y: 2, cols: 3, rows: 4 },
      { x: 0, y: 4, cols: 4, rows: 4 },
      { x: 4, y: 4, cols: 2, rows: 2 },
      { x: 6, y: 4, cols: 3, rows: 2 },
      { x: 4, y: 6, cols: 2, rows: 2 },
      { x: 6, y: 6, cols: 2, rows: 2 },
      { x: 8, y: 6, cols: 2, rows: 2 },
      { x: 10, y: 6, cols: 2, rows: 2 },
    ],
    [
      { x: 0, y: 0, cols: 2, rows: 3 },
      { x: 2, y: 0, cols: 2, rows: 3 },
      { x: 4, y: 0, cols: 2, rows: 3 },
      { x: 6, y: 0, cols: 6, rows: 4 },
      { x: 0, y: 3, cols: 6, rows: 2 },
      { x: 6, y: 4, cols: 2, rows: 4 },
      { x: 8, y: 4, cols: 2, rows: 4 },
      { x: 10, y: 4, cols: 2, rows: 2 },
      { x: 0, y: 5, cols: 2, rows: 3 },
      { x: 2, y: 5, cols: 2, rows: 3 },
      { x: 4, y: 5, cols: 2, rows: 3 },
      { x: 10, y: 6, cols: 2, rows: 2 },
    ],
    [
      { x: 0, y: 0, cols: 6, rows: 4 },
      { x: 6, y: 0, cols: 6, rows: 3 },
      { x: 6, y: 3, cols: 4, rows: 3 },
      { x: 10, y: 3, cols: 2, rows: 2 },
      { x: 0, y: 4, cols: 4, rows: 2 },
      { x: 4, y: 4, cols: 2, rows: 2 },
      { x: 10, y: 5, cols: 2, rows: 3 },
      { x: 0, y: 6, cols: 2, rows: 2 },
      { x: 2, y: 6, cols: 2, rows: 2 },
      { x: 4, y: 6, cols: 2, rows: 2 },
      { x: 6, y: 6, cols: 2, rows: 2 },
      { x: 8, y: 6, cols: 2, rows: 2 },
    ],
    [
      { x: 0, y: 0, cols: 2, rows: 2 },
      { x: 2, y: 0, cols: 2, rows: 2 },
      { x: 4, y: 0, cols: 4, rows: 3 },
      { x: 8, y: 0, cols: 2, rows: 4 },
      { x: 10, y: 0, cols: 2, rows: 4 },
      { x: 0, y: 2, cols: 2, rows: 3 },
      { x: 2, y: 2, cols: 2, rows: 2 },
      { x: 4, y: 3, cols: 4, rows: 3 },
      { x: 2, y: 4, cols: 2, rows: 2 },
      { x: 8, y: 4, cols: 4, rows: 4 },
      { x: 0, y: 5, cols: 2, rows: 3 },
      { x: 2, y: 6, cols: 6, rows: 2 },
    ],
  ],
  wd = (e) => e.map((e) => ({ ...e, x: 12 - e.x - e.cols })),
  Td = (e) => e.map((e) => ({ ...e, y: 8 - e.y - e.rows })),
  Ed = [(e) => e, wd, Td, (e) => wd(Td(e))],
  Dd = Cd.flatMap((e) => Ed.map((t) => t(e))),
  Od = Sd.flatMap((e) => Ed.map((t) => e.map(t)));
Dd.length;
var kd = (e, t, n = 0) => {
    let r =
      Math.imul(e, 2654435761) ^
      Math.imul(t, 2246822507) ^
      Math.imul(n | 0, 668265261);
    return (
      (r = Math.imul(r ^ (r >>> 15), 739982445)),
      (r ^= r >>> 12),
      r >>> 0
    );
  },
  Ad = (e, t, n = 0) => {
    let r = kd(e, t, n),
      i = r % Cd.length,
      a = (r >>> 8) % Ed.length;
    return i * Ed.length + a;
  },
  jd = (e, t, n = 0) => Dd[Ad(e, t, n)],
  Md = (e, t, n, r = 0) => (n < 0 || n >= 12 ? null : Od[Ad(e, t, r)][n]),
  Nd = 128,
  Pd = 8,
  $ = Nd + Pd,
  Fd = 12 * $,
  Id = 8 * $,
  Ld = 6 * $ - Pd,
  Rd = 900,
  zd = 400,
  Bd = 0.42,
  Vd = 56,
  Hd = 0.64,
  Ud = [0.65, 0, 0.35, 1],
  Wd = 7,
  Gd = `center`,
  Kd = `minimal`,
  qd = `photo-wall-focus-mode`,
  Jd = 24,
  Yd = 583,
  Xd = 240,
  Zd = 30,
  Qd = 340,
  $d = 120,
  ef = 68,
  tf = 80,
  nf = 72,
  rf = 1200,
  af = 150,
  of = 210,
  sf = 180,
  cf = 18,
  lf = 420,
  uf = 1400,
  df = `cubic-bezier(0.55, 0, 0.9, 0.45)`,
  ff = `cubic-bezier(0.2, 0.7, 0.25, 1)`,
  pf = 650,
  mf = new Set([`0`, `1`, `2`, `3`]),
  hf = 140,
  gf = 1600,
  _f = 1600,
  vf = 420,
  yf = 10,
  bf = 60,
  xf = 15,
  Sf = Object.freeze({
    up: { x: 0, y: -1 },
    down: { x: 0, y: 1 },
    left: { x: -1, y: 0 },
    right: { x: 1, y: 0 },
    "up-right": { x: Math.SQRT1_2, y: -Math.SQRT1_2 },
    "down-right": { x: Math.SQRT1_2, y: Math.SQRT1_2 },
    "up-left": { x: -Math.SQRT1_2, y: -Math.SQRT1_2 },
    "down-left": { x: -Math.SQRT1_2, y: Math.SQRT1_2 },
  }),
  Cf = Math.PI / 6,
  wf = (Math.PI * 3) / 2,
  Tf = Math.PI / 6,
  Ef = 280,
  Df = 2e3,
  Of = 0.7,
  kf = 1.8,
  Af = 0.0018,
  jf = (e, t, n) => Math.min(n, Math.max(t, e)),
  Mf = () => {
    try {
      return localStorage.getItem(qd) === Gd ? Gd : Kd;
    } catch {
      return Kd;
    }
  },
  Nf = (e) => {
    let t = Number(e?.wallpaperCruiseSeconds);
    return Number.isInteger(t) && t >= yf && t <= bf ? t : xf;
  },
  Pf = (e) => {
    let t = String(e?.wallpaperCruiseDirection || ``);
    return Object.hasOwn(Sf, t) ? t : null;
  },
  Ff = Object.freeze([256, 384, 512, 768, 1024, 1536, 2048]),
  If = (e) => {
    let t = window.devicePixelRatio || 1;
    return Math.round(e * t) / t;
  },
  Lf = (e, t, n) => `translate3d(${If(e)}px, ${If(t)}px, 0) scale(${n})`,
  Rf = (e, t, n, r) => {
    ((e.style.transform = Lf(t, n, r)),
      (e.dataset.cameraX = String(If(t).toFixed(2))),
      (e.dataset.cameraY = String(If(n).toFixed(2))));
  },
  zf = (e) => Ff.find((t) => t >= e) || Ff.at(-1),
  Bf = (e, t) => {
    if (!e) return e;
    try {
      let n = new URL(e, window.location.href);
      if (n.pathname.includes(`/api/photo-wall/thumb/`))
        return (
          n.searchParams.set(`size`, String(zf(t))),
          `${n.pathname}${n.search}`
        );
    } catch {}
    return e;
  },
  Vf = new Map(),
  Hf = (e) => {
    let t = e >>> 0;
    return (
      (t ^= t >>> 16),
      (t = Math.imul(t, 2146121005)),
      (t ^= t >>> 15),
      (t = Math.imul(t, 2221713035)),
      (t ^= t >>> 16),
      t >>> 0
    );
  },
  Uf = (...e) => {
    let t = 2166136261;
    for (let n of e)
      ((t = Math.imul(t ^ (Number(n) | 0), 16777619)), (t ^= t >>> 13));
    return Hf(t);
  },
  Wf = (e, t) => {
    let n = Array.from({ length: e }, (e, t) => t);
    for (let e = n.length - 1; e > 0; --e) {
      let r = Hf(t ^ Math.imul(e + 1, 2654435761)) % (e + 1);
      [n[e], n[r]] = [n[r], n[e]];
    }
    return n;
  },
  Gf = (e, t, n, r) => e < n + r && n < e + t,
  Kf = (e, t) =>
    ((e.x + e.cols === t.x || t.x + t.cols === e.x) &&
      Gf(e.y, e.rows, t.y, t.rows)) ||
    ((e.y + e.rows === t.y || t.y + t.rows === e.y) &&
      Gf(e.x, e.cols, t.x, t.cols)),
  qf = (e, t, n) => {
    let r = [];
    return (
      e.forEach((e, i) => {
        t.forEach((t, a) => {
          let o =
              n === `left`
                ? e.x === 0 && t.x + t.cols === 12
                : n === `right`
                  ? e.x + e.cols === 12 && t.x === 0
                  : n === `up`
                    ? e.y === 0 && t.y + t.rows === 8
                    : e.y + e.rows === 8 && t.y === 0,
            s =
              n === `left` || n === `right`
                ? Gf(e.y, e.rows, t.y, t.rows)
                : Gf(e.x, e.cols, t.x, t.cols);
          o && s && r.push([i, a]);
        });
      }),
      r
    );
  },
  Jf = (e, t, n, r = 4096) => {
    if (e.size >= r && !e.has(t)) {
      let t = e.keys().next().value;
      t != null && e.delete(t);
    }
    return (e.set(t, n), n);
  },
  Yf = (e, t, n, r) => Uf(r, e, t, n, 1759714724),
  Xf = (e, t, n, r, i, a) => {
    let o = Yf(e, t, i, a),
      s = Yf(n, r, i, a);
    return o > s || (o === s && (e > n || (e === n && t > r)));
  };
function Zf(e, t, n, r) {
  let i = `${r >>> 0}:${n}:${e}:${t}`,
    a = Vf.get(i);
  if (a) return a;
  if (n <= 0) return [];
  if (n === 1) return Jf(Vf, i, Array(12).fill(0));
  let o = jd(e, t, r),
    s = Array(12).fill(-1),
    c = o.map(() => new Set()),
    l = [
      [`left`, e - 1, t],
      [`right`, e + 1, t],
      [`up`, e, t - 1],
      [`down`, e, t + 1],
    ];
  for (let [i, a, s] of l) {
    if (Xf(e, t, a, s, n, r)) continue;
    let l = jd(a, s, r),
      u = Zf(a, s, n, r);
    for (let [e, t] of qf(o, l, i)) c[e].add(u[t]);
  }
  let u = o.map((e, t) =>
      o.flatMap((n, r) => (r !== t && Kf(e, n) ? [r] : [])),
    ),
    d = o
      .map((e, t) => t)
      .sort(
        (n, i) => u[i].length - u[n].length || Uf(r, e, t, n) - Uf(r, e, t, i),
      ),
    f = new Set();
  for (let i of d) {
    let a = new Set(c[i]);
    for (let e of u[i]) s[e] >= 0 && a.add(s[e]);
    let o = Wf(n, Uf(r, e, t, i, 458671337)),
      l = o.find((e) => !a.has(e) && (n < 12 || !f.has(e)));
    if (((l ??= o.find((e) => !a.has(e))), l == null)) {
      let e = (e) => +!!a.has(e) + (f.has(e) ? 0.25 : 0);
      l = o.reduce((t, n) => (e(n) < e(t) ? n : t), o[0]);
    }
    ((s[i] = l), f.add(l));
  }
  return Jf(Vf, i, s);
}
var Qf = (e, t, n, r, i) => (r <= 0 ? -1 : (Zf(e, t, r, i)[n] ?? 0)),
  $f = (e) => ({
    x: e.x * $,
    y: e.y * $,
    width: e.cols * $ - Pd,
    height: e.rows * $ - Pd,
  }),
  ep = (e, t, n) => `${e}:${t}:${n}`,
  tp = (e, t, n, r) => {
    let i = Md(e, t, n, r)?.[n];
    return i
      ? { x: e * Fd + i.x * $, y: t * Id + i.y * $, width: Ld, height: Ld }
      : null;
  };
function np(e, t, n, r, i = Rd) {
  let a = -e.x / t - i,
    o = (n - e.x) / t + i,
    s = -e.y / t - i,
    c = (r - e.y) / t + i;
  return {
    fromColumn: Math.floor(a / Fd),
    toColumn: Math.floor(o / Fd),
    fromRow: Math.floor(s / Id),
    toRow: Math.floor(c / Id),
  };
}
function rp(e, t = 28) {
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
var ip = rp(Yd).map(({ offset: e, progress: t }) => ({
    offset: e,
    transform: `translate3d(0, ${(-68 * (1 - t)).toFixed(2)}px, 0) scale(${(0.88 + 0.12 * t).toFixed(4)})`,
  })),
  ap = [...ip].reverse().map((e, t, n) => ({
    offset: t / Math.max(1, n.length - 1),
    transform: e.transform,
  }));
function op(e, t) {
  let n = i(e);
  return np({ x: (e - Fd * n) / 2, y: (t - Id * n) / 2 }, n, e, t);
}
var sp = (e, t) =>
  e.fromColumn === t.fromColumn &&
  e.toColumn === t.toColumn &&
  e.fromRow === t.fromRow &&
  e.toRow === t.toRow;
async function cp(e) {
  let t = [...new Set((e || []).filter(Boolean))].slice(0, nf);
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
      new Promise((e) => setTimeout(e, rf)),
    ]));
}
function lp({
  item: e,
  focused: t,
  onBroken: n,
  artworkSize: r,
  focusedArtworkSize: i,
}) {
  let [a, s] = (0, o.useState)(`loaded`),
    u = (0, o.useRef)(null),
    f = (0, o.useRef)(e.id),
    p = Bf(e.src, 1024);
  return (
    (0, o.useLayoutEffect)(() => {
      let n = f.current !== e.id;
      n && ((f.current = e.id), s(`loading`));
      let o = u.current;
      o?.complete && o.naturalWidth > 0 && s(`loaded`);
    }, [e.id, p]),
    (0, Q.jsx)(
      `img`,
      {
        ref: u,
        className: `photo-tile-art${a === `loaded` ? ` is-loaded` : ``}`,
        src: p,
        alt: ``,
        draggable: `false`,
        decoding: `async`,
        onLoad: () => s(`loaded`),
        onError: () => {
          (s(`failed`), n(e.id));
        },
      },
      `${e.id}:small`,
    )
  );
}
var up = (0, o.memo)(
    ({
      item: e,
      rect: t,
      focusRect: n,
      focused: r,
      selected: i,
      pixelScale: a,
      onSelect: s,
      onOpenAlbum: c,
      onBroken: l,
      didDragRef: u,
      handoffSnap: d,
      returnTarget: f,
      interactive: p,
      cameraGapExtra: q,
    }) => {
      let [m, h] = (0, o.useState)(!1),
        g = Zu(),
        _ = `${e.kind}:${e.id}`,
        v = (0, o.useRef)(_);
      ((0, o.useLayoutEffect)(() => {
        v.current !== _ && ((v.current = _), h(!1));
      }, [_]),
        (0, o.useLayoutEffect)(() => {
          d || h(!1);
        }, [d]));
      let y = $f(t),
        b = Math.max(y.width, y.height) * a,
        x = Ld * a,
        S = p && m && !d,
        C = S && !r ? (y.width + Pd * 2) / Math.max(1, y.width) : 1,
        w = S && !r ? (y.height + Pd * 2) / Math.max(1, y.height) : 1,
        T =
          g || d
            ? { duration: 0 }
            : {
                x: { type: `spring`, stiffness: 300, damping: 34 },
                y: { type: `spring`, stiffness: 300, damping: 34 },
                width: { type: `spring`, stiffness: 300, damping: 34 },
                height: { type: `spring`, stiffness: 300, damping: 34 },
                scaleX: { duration: 0.3, ease: `easeOut` },
                scaleY: { duration: 0.3, ease: `easeOut` },
              };
      Math.abs(q) < 0.001 ||
        (T = {
          ...T,
          x: { duration: 0 },
          y: { duration: 0 },
          width: { duration: 0 },
          height: { duration: 0 },
        });
      (0, o.useEffect)(() => {
        p || h(!1);
      }, [p]);
      let ee = (t) => {
        if (p && !u.current) {
          if (e.kind === `album`) {
            let n = t?.currentTarget?.getBoundingClientRect();
            c(e.albumId, {
              x: n ? n.left + n.width / 2 : (t?.clientX ?? 0),
              y: n ? n.top + n.height / 2 : (t?.clientY ?? 0),
              targetKey: ep(e.blockColumn, e.blockRow, e.slotIndex),
              sourceRect: n
                ? {
                    left: n.left,
                    top: n.top,
                    right: n.right,
                    bottom: n.bottom,
                    width: n.width,
                    height: n.height,
                  }
                : null,
            });
          } else r || s();
        }
      };
      return (0, Q.jsx)(Xu.article, {
        role: `button`,
        tabIndex: p ? 0 : -1,
        className: `photo-tile${r ? ` is-focused` : ``}${e.kind === `album` ? ` is-album` : ``}${f ? ` is-return-target` : ``}${p ? `` : ` is-noninteractive`}`,
        "data-cell-key": `${e.blockColumn}:${e.blockRow}`,
        "data-block-key": `${e.blockColumn}:${e.blockRow}`,
        "data-slot-index": e.slotIndex,
        "data-item-id": e.id,
        "data-focus-x": n?.x,
        "data-focus-y": n?.y,
        "data-focus-width": n?.width,
        "data-focus-height": n?.height,
        "aria-label":
          e.kind === `album`
            ? `相簿，${e.title}，${e.count} 张照片`
            : `照片，点击放大`,
        "aria-pressed": i,
        "aria-disabled": !p,
        animate: {
          x: y.x - q,
          y: y.y - q,
          width: y.width + q * 2,
          height: y.height + q * 2,
          scaleX: C,
          scaleY: w,
        },
        transition: T,
        style: { zIndex: r ? 20 : S ? 4 : f ? 3 : 1 },
        initial: !1,
        onPointerEnter: () => {
          p && !d && !u.current && h(!0);
        },
        onPointerMove: () => {
          p && !d && !u.current && !m && h(!0);
        },
        onPointerLeave: () => h(!1),
        onClick: (e) => {
          (e.stopPropagation(), ee(e));
        },
        onKeyDown: (e) => {
          p &&
            (e.key === `Enter` || e.key === ` `) &&
            (e.preventDefault(), ee(e));
        },
        children: (0, Q.jsx)(`div`, {
          className: `photo-tile-face-layer`,
          children: (0, Q.jsx)(lp, {
            item: e,
            focused: r,
            onBroken: l,
            artworkSize: b,
            focusedArtworkSize: x,
          }),
        }),
      });
    },
  ),
  dp = (0, o.memo)(
    ({
      column: e,
      row: t,
      items: n,
      seed: r,
      active: i,
      pixelScale: a,
      onSelect: o,
      onOpenAlbum: s,
      onBroken: c,
      didDragRef: l,
      handoffSnap: u,
      returnTargetKey: d,
      interactive: f,
      cameraGapExtra: q,
    }) => {
      let p = i?.blockColumn === e && i?.blockRow === t,
        m = p ? Md(e, t, i.slotIndex, r) : jd(e, t, r);
      return m
        ? (0, Q.jsx)(`div`, {
            className: `photo-wall-cell${p ? ` is-focus-active` : ``}`,
            "data-cell-key": `${e}:${t}`,
            "data-block-key": `${e}:${t}`,
            style: { left: e * Fd, top: t * Id, width: Fd, height: Id },
            children: m.map((m, h) => {
              let g = n[Qf(e, t, h, n.length, r)];
              if (!g) return null;
              let _ = tp(e, t, h, r),
                v = !!(p && i.slotIndex === h);
              return (0, Q.jsx)(
                up,
                {
                  item: { ...g, blockColumn: e, blockRow: t, slotIndex: h },
                  rect: m,
                  focusRect: _,
                  focused: v,
                  selected: v,
                  pixelScale: a,
                  didDragRef: l,
                  cameraGapExtra: q,
                  onBroken: c,
                  onSelect: () =>
                    o({ blockColumn: e, blockRow: t, slotIndex: h }),
                  onOpenAlbum: s,
                  handoffSnap: u,
                  returnTarget: d === ep(e, t, h),
                  interactive: f,
                },
                `${e}:${t}:${h}`,
              );
            }),
          })
        : null;
    },
  );
function fp() {
  let [e, t] = (0, o.useState)(null),
    [n, r] = (0, o.useState)(() => ({
      width: Math.max(1, window.innerWidth),
      height: Math.max(1, window.innerHeight),
    })),
    [s, c] = (0, o.useState)(null),
    [l, u] = (0, o.useState)(() => new Set()),
    [d, f] = (0, o.useState)(!1),
    [p, m] = (0, o.useState)(null),
    [h, g] = (0, o.useState)({ current: ``, previous: ``, version: 0 }),
    [_, v] = (0, o.useState)(!1),
    [y, b] = (0, o.useState)(!1),
    [x, S] = (0, o.useState)(!1),
    [C, w] = (0, o.useState)(!1),
    [T, ee] = (0, o.useState)(!1),
    E = (0, o.useRef)(!1),
    D = (0, o.useRef)(!1),
    O = (0, o.useRef)(!1),
    k = (0, o.useRef)(!1),
    te = (0, o.useRef)(!1),
    A = (0, o.useRef)(0),
    [j, ne] = (0, o.useState)(Mf),
    [M, re] = (0, o.useState)(() => op(window.innerWidth, window.innerHeight)),
    [cameraGapExtra, setCameraGapExtra] = (0, o.useState)(0),
    ie = (0, o.useRef)(null),
    ae = (0, o.useRef)(null),
    oe = (0, o.useRef)(null),
    se = (0, o.useRef)(null),
    ce = (0, o.useRef)(null),
    le = (0, o.useRef)(null),
    ue = (0, o.useRef)(!1),
    N = (0, o.useRef)(!1),
    de = (0, o.useRef)(0),
    fe = (0, o.useRef)([]),
    P = (0, o.useRef)(null),
    pe = (0, o.useRef)(!1),
    me = (0, o.useRef)([]),
    F = (0, o.useRef)(0),
    I = (0, o.useRef)(!1),
    he = (0, o.useRef)(!1),
    ge = (0, o.useRef)(new Set()),
    _e = (0, o.useRef)(new Map()),
    ve = (0, o.useRef)(0),
    ye = (0, o.useRef)(0),
    be = (0, o.useRef)(!1),
    xe = (0, o.useRef)(new Set()),
    Se = (0, o.useRef)(!1),
    Ce = (0, o.useRef)(null),
    we = (0, o.useRef)(null),
    L = (0, o.useRef)({ x: 0, y: 0, zoom: 1, ready: !1 }),
    Te = (0, o.useRef)(null),
    Ee = (0, o.useRef)(null),
    De = (0, o.useRef)(0),
    Oe = (0, o.useRef)(null),
    ke = (0, o.useRef)(null),
    Ae = (0, o.useRef)(null),
    je = (0, o.useRef)(null),
    Me = (0, o.useRef)(M),
    Ne = (0, o.useRef)(null),
    Pe = (0, o.useRef)(null),
    R = (0, o.useRef)(!1),
    z = (0, o.useRef)(null),
    Fe = (0, o.useRef)(0),
    Ie = (0, o.useRef)({ active: !1, pending: !1, timer: 0 }),
    Le = (0, o.useRef)(0),
    B = Zu(),
    V = (0, o.useRef)({ pendingX: 0, pendingY: 0, frame: 0, lastTime: null }),
    cameraZoomFrame = (0, o.useRef)(0),
    cameraZoomTarget = (0, o.useRef)(1),
    cameraZoomLastTime = (0, o.useRef)(0),
    cameraFocusActive = (0, o.useRef)(!1),
    H = i(n.width),
    Re = (0, o.useMemo)(
      () => (e?.items || []).filter((e) => !l.has(e.id)),
      [e, l],
    ),
    ze = (Number(e?.wallSeed) || 1) >>> 0,
    Be = Re[0]?.large || Re[0]?.src || ``,
    Ve = e?.showPhotoWallControls !== !1,
    He = Ve || _,
    Ue = Ve || C,
    We = (Ve && !T && !x) || y;
  ((oe.current = e),
    (se.current = s),
    (0, o.useEffect)(() => {
      if (Be)
        return (
          g((e) =>
            e.current === Be
              ? e
              : { current: Be, previous: e.current, version: e.version + 1 },
          ),
          clearTimeout(Fe.current),
          (Fe.current = setTimeout(() => {
            g((e) => (e.previous ? { ...e, previous: `` } : e));
          }, 280)),
          () => clearTimeout(Fe.current)
        );
    }, [Be]));
  let Ge = (0, o.useCallback)(() => {
      for (let e of fe.current)
        try {
          e.cancel();
        } catch {}
      ((fe.current = []),
        P.current?.remove(),
        (P.current = null),
        ae.current?.style.removeProperty(`visibility`),
        ae.current?.style.removeProperty(`opacity`),
        ie.current?.style.removeProperty(`pointer-events`));
    }, []),
    Ke = (0, o.useCallback)(
      async (e, r = null) => {
        let i = ++de.current,
          a = !oe.current;
        if ((a && (pe.current = !0), a)) {
          (Ge(), (N.current = !1), t(e), u(new Set()), c(null), m(null));
          return;
        }
        Ge();
        let o = ie.current,
          s = ae.current,
          l = [...document.querySelectorAll(`.photo-tile-face-layer`)];
        if (!o || !s || !l.length) {
          ((N.current = !1), t(e), u(new Set()), c(null), m(null));
          return;
        }
        if (((N.current = !0), (Te.current = null), Ee.current)) {
          try {
            Ee.current.stop();
          } catch {}
          Ee.current = null;
        }
        if (((De.current += 1), z.current)) {
          try {
            z.current.stop();
          } catch {}
          z.current = null;
        }
        (V.current.frame && cancelAnimationFrame(V.current.frame),
          (V.current.frame = 0),
          (V.current.pendingX = 0),
          (V.current.pendingY = 0),
          (V.current.lastTime = null),
          (o.style.pointerEvents = `none`));
        let d = r || { x: n.width / 2, y: n.height / 2 },
          p = o.getBoundingClientRect(),
          h = e.items || [],
          g = (Number(e.wallSeed) || 1) >>> 0,
          _ = le.current,
          v = !!(_ && h.length > 0 && h.every((e) => e.kind === `album`)),
          y = v ? (_.targetKey ?? null) : null,
          b = v
            ? { ..._.camera, zoom: jf(Number(_.camera?.zoom) || 1, Of, kf) }
            : { ...L.current },
          x = { x: L.current.x, y: L.current.y, zoom: L.current.zoom },
          S = H * x.zoom,
          C = Math.max(1, $ * S),
          w = (e) => ({ x: e.left + e.width / 2, y: e.top + e.height / 2 }),
          T = (e) => {
            let t = w(e);
            return Math.min(lf, (Math.hypot(t.x - d.x, t.y - d.y) / C) * cf);
          },
          ee = (e) => (w(e).x < d.x ? -1 : 1),
          E = (e) =>
            e.bottom > p.top &&
            e.top < p.bottom &&
            e.right > p.left &&
            e.left < p.right,
          D = [];
        for (let e of l) {
          let t = e.getBoundingClientRect();
          if (!E(t)) continue;
          let n = e.querySelector(`img`),
            r = e.closest(`.photo-tile`);
          D.push({
            index: D.length,
            x: t.left - p.left,
            y: t.top - p.top,
            width: t.width,
            height: t.height,
            src: n?.currentSrc || n?.src || ``,
            kind: r?.classList.contains(`is-album`) ? `album` : `photo`,
            delay: T(t),
            direction: ee(t),
          });
        }
        let O = [];
        for (let e of document.querySelectorAll(`.photo-wall-cell`)) {
          let [t, n] = String(e.dataset.cellKey || ``)
            .split(`:`)
            .map(Number);
          if (!Number.isInteger(t) || !Number.isInteger(n)) continue;
          let r = jd(t, n, g);
          for (let e = 0; e < r.length; e += 1) {
            let i = r[e],
              a = h[Qf(t, n, e, h.length, g)];
            if (!a) continue;
            let o = p.left + x.x + (t * Fd + i.x * $) * S,
              s = p.top + x.y + (n * Id + i.y * $) * S,
              c = (i.cols * $ - Pd) * S,
              l = (i.rows * $ - Pd) * S,
              u = {
                left: o,
                top: s,
                right: o + c,
                bottom: s + l,
                width: c,
                height: l,
              };
            if (!E(u)) continue;
            let d = Math.max(c, l) * (window.devicePixelRatio || 1);
            O.push({
              index: O.length,
              x: u.left - p.left,
              y: u.top - p.top,
              width: c,
              height: l,
              src: Bf(a.src || ``, d),
              kind: a.kind || `photo`,
              targetKey: ep(t, n, e),
              returnTarget: ep(t, n, e) === y,
              delay: T(u) + af,
              direction: ee(u),
            });
          }
        }
        if (!O.length || !D.length) {
          (o.style.removeProperty(`pointer-events`),
            (N.current = !1),
            t(e),
            u(new Set()),
            c(null),
            m(y));
          return;
        }
        if (
          (await cp([...D.map((e) => e.src), ...O.map((e) => e.src)]),
          i !== de.current)
        )
          return;
        let k = document.createElement(`div`);
        ((k.className = `photo-wall-handoff-layer`),
          k.setAttribute(`aria-hidden`, `true`),
          (k.dataset.wallHandoff = `closing`));
        let te = (e, t, n) => {
          for (let r of e) {
            let e = document.createElement(`div`);
            ((e.className = `photo-wall-handoff-card is-${t}`),
              (e.dataset.handoffPhase = t),
              (e.dataset.handoffIndex = String(r.index)),
              (e.style.left = `${r.x}px`),
              (e.style.top = `${r.y}px`),
              (e.style.width = `${r.width}px`),
              (e.style.height = `${r.height}px`),
              r.src && (e.style.backgroundImage = `url("${r.src}")`),
              r.kind === `album` && e.classList.add(`is-album`),
              r.returnTarget && e.classList.add(`is-return-target`),
              t === `in` &&
                (B
                  ? (e.style.opacity = `0`)
                  : (e.style.transform = `perspective(${uf}px) rotateY(${-r.direction * 90}deg)`)),
              n.append(e),
              (r.node = e));
          }
        };
        (te(D, `out`, k),
          te(O, `in`, k),
          o.append(k),
          (P.current = k),
          (k.dataset.wallHandoff = B ? `fade` : `flip`));
        let A = [];
        if (((s.style.visibility = `hidden`), B)) {
          for (let e of D)
            (e.node.style.removeProperty(`opacity`),
              A.push(
                e.node.animate([{ opacity: 1 }, { opacity: 0 }], {
                  duration: sf,
                  easing: `ease-out`,
                  fill: `both`,
                }),
              ));
          for (let e of O)
            A.push(
              e.node.animate([{ opacity: 0 }, { opacity: 1 }], {
                duration: sf,
                easing: `ease-out`,
                fill: `both`,
              }),
            );
        } else {
          for (let e of D)
            (e.node.style.removeProperty(`opacity`),
              A.push(
                e.node.animate(
                  [
                    { transform: `perspective(1400px) rotateY(0deg)` },
                    {
                      transform: `perspective(1400px) rotateY(${e.direction * 90}deg)`,
                    },
                  ],
                  { duration: af, delay: e.delay, easing: df, fill: `both` },
                ),
              ));
          for (let e of O)
            A.push(
              e.node.animate(
                [
                  {
                    transform: `perspective(${uf}px) rotateY(${-e.direction * 90}deg)`,
                  },
                  { transform: `perspective(${uf}px) rotateY(0deg)` },
                ],
                { duration: of, delay: e.delay, easing: ff, fill: `both` },
              ),
            );
        }
        if (
          ((fe.current = A),
          await Promise.all(A.map((e) => e.finished.catch(() => {}))),
          i !== de.current ||
            ((L.current.x = x.x),
            (L.current.y = x.y),
            (L.current.zoom = x.zoom),
            Rf(s, x.x, x.y, S),
            (0, xd.flushSync)(() => {
              (f(!0), t(e), u(new Set()), c(null), m(y));
            }),
            await new Promise((e) =>
              requestAnimationFrame(() => requestAnimationFrame(e)),
            ),
            i !== de.current))
        )
          return;
        (s.style.removeProperty(`visibility`),
          s.style.removeProperty(`opacity`));
        let j = B
          ? null
          : k.animate([{ opacity: 1 }, { opacity: 0 }], {
              duration: 90,
              easing: `ease-out`,
              fill: `both`,
            });
        if ((j && (await j.finished.catch(() => {})), i !== de.current)) return;
        (k.remove(), P.current === k && (P.current = null));
        for (let e of A)
          try {
            e.cancel();
          } catch {}
        fe.current === A && (fe.current = []);
        let ne = b.x - x.x,
          M = b.y - x.y,
          re = b.zoom - x.zoom;
        if (Math.hypot(ne, M) > 0.5 || Math.abs(re) > 1e-4) {
          if (B)
            ((L.current.x = b.x),
              (L.current.y = b.y),
              (L.current.zoom = b.zoom),
              G());
          else {
            let e = De.current;
            await new Promise((t) => {
              Ee.current = bd(0, 1, {
                duration: Hd,
                ease: Ud,
                onUpdate: (t) => {
                  i === de.current &&
                    e === De.current &&
                    ((L.current.x = x.x + ne * t),
                    (L.current.y = x.y + M * t),
                    (L.current.zoom = x.zoom + re * t),
                    G(!0));
                },
                onComplete: () => {
                  (i !== de.current ||
                    e !== De.current ||
                    ((L.current.x = b.x),
                    (L.current.y = b.y),
                    (L.current.zoom = b.zoom),
                    (Ee.current = null),
                    G()),
                    t());
                },
              });
            });
          }
          if (i !== de.current) return;
        }
        (v && ((le.current = null), (ue.current = !1)),
          o.style.removeProperty(`pointer-events`),
          (N.current = !1),
          requestAnimationFrame(() => f(!1)));
      },
      [Ge, B, H, n.height, n.width],
    ),
    qe = (0, o.useCallback)(() => {
      let e = ie.current;
      if (!e) return [];
      let t = e.getBoundingClientRect(),
        r = Math.max(1, $ * H * L.current.zoom);
      return [...e.querySelectorAll(`.photo-tile-face-layer`)]
        .filter((e) => {
          let t = e.getBoundingClientRect();
          return (
            Math.min(t.bottom, n.height) - Math.max(t.top, 0) >= 1 &&
            Math.min(t.right, n.width) - Math.max(t.left, 0) >= 1
          );
        })
        .map((e) => {
          let n = e.getBoundingClientRect(),
            i = Math.max(0, n.left - t.left) + Math.max(0, n.top - t.top);
          return { face: e, delay: Math.round((i / r) * Zd) };
        });
    }, [H, n.height, n.width]),
    Je = (0, o.useCallback)(() => {
      ((F.current += 1),
        (I.current = !1),
        (he.current = !1),
        (ve.current = 0),
        ge.current.clear(),
        _e.current.clear(),
        (ye.current &&= (cancelAnimationFrame(ye.current), 0)));
      for (let e of me.current)
        try {
          e.cancel();
        } catch {}
      me.current = [];
    }, []),
    Ye = (0, o.useCallback)((e, t = null) => {
      let n = F.current;
      e = revealSchedule(e, t == null ? 900 : t);
      for (let { face: r, delay: i } of e) {
        if (n !== F.current || !I.current || be.current || !r.isConnected)
          continue;
        (_e.current.delete(r), (ve.current += 1));
        let e = t == null ? i : Math.min(i, t),
          a = r.animate(
            [{ opacity: 0 }, { opacity: 0.36, offset: 0.42 }, { opacity: 1 }],
            { duration: Xd, delay: e, easing: `ease-out`, fill: `both` },
          ),
          o = r.animate(ip, {
            duration: Yd,
            delay: e,
            easing: `linear`,
            fill: `both`,
          });
        (me.current.push(a, o),
          Promise.allSettled([a.finished, o.finished])
            .then(() => {
              (r.isConnected &&
                n === F.current &&
                !be.current &&
                (r.style.removeProperty(`opacity`),
                r.style.removeProperty(`transform`)),
                (me.current = me.current.filter((e) => e !== a && e !== o)),
                n === F.current &&
                  ((ve.current = Math.max(0, ve.current - 1)),
                  ve.current === 0 &&
                    _e.current.size === 0 &&
                    ((I.current = !1),
                    (he.current = !1),
                    ge.current.clear(),
                    _e.current.clear())));
            })
            .catch(() => {}));
      }
    }, []),
    Xe = (0, o.useCallback)(() => {
      if (!I.current || !he.current || be.current) return;
      let e = F.current,
        t = () => {
          if (e === F.current && I.current && !be.current)
            for (let { face: e, delay: t } of qe())
              ge.current.has(e) ||
                (ge.current.add(e),
                _e.current.set(e, t),
                (e.style.opacity = `0`),
                (e.style.transform = `translate3d(0, -${ef}px, 0) scale(0.88)`));
        };
      (t(),
        ye.current && cancelAnimationFrame(ye.current),
        (ye.current = requestAnimationFrame(() => {
          ye.current = requestAnimationFrame(() => {
            ((ye.current = 0), t());
            let e = [..._e.current].map(([e, t]) => ({ face: e, delay: t }));
            Ye(e, $d);
          });
        })));
    }, [Ye, qe]),
    Ze = (0, o.useCallback)(() => {
      if (be.current)
        for (let { face: e } of qe())
          xe.current.has(e) || (xe.current.add(e), (e.style.opacity = `0`));
    }, [qe]),
    Qe = (0, o.useCallback)(async () => {
      let e = qe(),
        t = F.current + 1;
      ((F.current = t),
        (I.current = !0),
        (he.current = !1),
        (ve.current = 0),
        (ge.current = new Set(e.map(({ face: e }) => e))),
        _e.current.clear());
      let n = () =>
        window.parent.postMessage(
          { type: `photo-wall:reveal-start` },
          window.location.origin,
        );
      if (!e.length || B) {
        ((I.current = !1), n());
        return;
      }
      for (let { face: t } of e)
        ((t.style.opacity = `0`),
          (t.style.transform = `translate3d(0, -${ef}px, 0) scale(0.88)`));
      if (
        (await waitForImages(
          e.map(({ face: e }) => e),
          { timeoutMs: 4000 },
        ),
        await new Promise((e) =>
          requestAnimationFrame(() => requestAnimationFrame(e)),
        ),
        t !== F.current || be.current)
      ) {
        for (let { face: t } of e)
          (t.style.removeProperty(`opacity`),
            t.style.removeProperty(`transform`));
        return;
      }
      let i = qe(),
        a = new Set(i.map(({ face: e }) => e));
      for (let { face: t } of e)
        a.has(t) ||
          (t.style.removeProperty(`opacity`),
          t.style.removeProperty(`transform`));
      if (!i.length) ((I.current = !1), n());
      else {
        for (let { face: e } of i) ge.current.add(e);
        ((he.current = !0), n(), Ye(i));
      }
    }, [Ye, B, qe]),
    $e = (0, o.useCallback)(() => {
      let e = qe(),
        t = document.querySelector(`.photo-wall-atmosphere`),
        n = () =>
          window.parent.postMessage(
            { type: `photo-wall:exit-animation-complete` },
            window.location.origin,
          );
      e = revealSchedule(e, 600);
      if (!e.length || B) {
        (Je(), t && (t.style.opacity = `0`), n());
        return;
      }
      let r = e.map(({ face: e, delay: t }) => {
        let n = getComputedStyle(e);
        return {
          face: e,
          delay: t,
          opacity: Number(n.opacity),
          transform: n.transform,
        };
      });
      (Je(),
        (be.current = !0),
        (xe.current = new Set(r.map(({ face: e }) => e))));
      let i = Math.max(...e.map(({ delay: e }) => e), 0),
        a = [],
        o = [];
      t &&
        a.push(
          t.animate([{ opacity: 1 }, { opacity: 0 }], {
            duration: 200,
            easing: `ease-in`,
            fill: `forwards`,
          }),
        );
      for (let e of r) {
        let t = i - e.delay,
          n = e.face.animate([{ opacity: e.opacity }, { opacity: 0 }], {
            duration: 200,
            delay: t,
            easing: `ease-in`,
            fill: `both`,
          });
        a.push(n);
        let r = ap.map((t, n) => ({
            ...t,
            transform: n === 0 ? e.transform : t.transform,
          })),
          s = e.face.animate(r, {
            duration: 200,
            delay: t,
            easing: `linear`,
            fill: `both`,
          });
        o.push(s);
      }
      Promise.allSettled([...a, ...o].map((e) => e.finished))
        .then(() => {
          (o.forEach((e) => {
            try {
              e.cancel();
            } catch {}
          }),
            (be.current = !1),
            xe.current.clear(),
            n());
        })
        .catch(() => {
          ((be.current = !1), xe.current.clear(), n());
        });
    }, [Je, B, qe]);
  ((Ce.current = Ke), (we.current = $e));
  let U = (0, o.useCallback)(() => {
      ((cameraFocusActive.current = !1),
        Ee.current?.stop(),
        (Ee.current = null),
        (De.current += 1));
    }, []),
    W = (0, o.useCallback)(() => {
      ((Le.current &&= (cancelAnimationFrame(Le.current), 0)), re(Me.current));
    }, []),
    et = (0, o.useCallback)(() => {
      Le.current ||= requestAnimationFrame(() => {
        ((Le.current = 0), re(Me.current));
      });
    }, []),
    G = (0, o.useCallback)(
      (e = !1) => {
        let t = ae.current;
        if (!t) return;
        Te.current &&
          ((L.current.x = Te.current.x), (L.current.y = Te.current.y));
        let { x: r, y: i, zoom: a } = L.current,
          o = H * a;
        ((je.current = {
          width: n.width,
          height: n.height,
          scale: o,
          x: r,
          y: i,
        }),
          Rf(t, r, i, o),
          (t.dataset.cameraZoom = String(a.toFixed(3))));
        let c = gapCompensation(Pd, 1, a);
        setCameraGapExtra((e) =>
          Math.abs(e - c) < 0.001 ? e : c,
        );
        let s = np(L.current, o, n.width, n.height);
        cameraFocusActive.current ||
          sp(s, Me.current) ||
          ((Me.current = s), e ? et() : W());
      },
      [W, H, et, n.height, n.width],
    );
  Ae.current = G;
  let tt = (0, o.useCallback)(() => G(!1), [G]);
  ((0, o.useEffect)(() => {
    let e = (e) => {
      e.origin === window.location.origin &&
        (e.data?.type === `photo-wall:init`
          ? (cameraZoomFrame.current &&
              (cancelAnimationFrame(cameraZoomFrame.current),
              (cameraZoomFrame.current = 0)),
            (cameraZoomTarget.current = 1),
            (cameraZoomLastTime.current = 0),
            Ce.current(e.data.payload, ce.current),
            (ce.current = null))
          : e.data?.type === `photo-wall:exit-animation` && we.current?.());
    };
    return (
      window.addEventListener(`message`, e),
      Se.current ||
        ((Se.current = !0),
        window.parent.postMessage(
          { type: `photo-wall:ready` },
          window.location.origin,
        )),
      () => window.removeEventListener(`message`, e)
    );
  }, []),
    (0, o.useEffect)(() => {
      let e = ie.current;
      if (!e) return;
      let t = () =>
        r({
          width: Math.max(1, e.clientWidth),
          height: Math.max(1, e.clientHeight),
        });
      t();
      let n = new ResizeObserver(t);
      return (n.observe(e), () => n.disconnect());
    }, [e]),
    (0, o.useLayoutEffect)(() => {
      if (!e || !Re.length) return;
      let t = je.current,
        r = H * L.current.zoom,
        i = !t || t.width !== n.width || t.height !== n.height || t.scale !== r;
      if (!L.current.ready)
        ((L.current.x = (n.width - Fd * r) / 2),
          (L.current.y = 0),
          (L.current.ready = !0));
      else if (t && i) {
        let e = (t.width / 2 - t.x) / t.scale,
          i = (t.height / 2 - t.y) / t.scale;
        ((L.current.x = n.width / 2 - e * r),
          (L.current.y = n.height / 2 - i * r));
      }
      ((je.current = {
        width: n.width,
        height: n.height,
        scale: r,
        x: L.current.x,
        y: L.current.y,
      }),
        G(),
        t && i && (be.current ? Ze() : Xe()));
    }, [G, e, Ze, Re.length, H, Xe, n.height, n.width]),
    (0, o.useLayoutEffect)(() => {
      e && pe.current && ((pe.current = !1), Qe());
    }, [e, Qe]));
  let K = (0, o.useCallback)(() => {
      (clearTimeout(A.current), (A.current = 0));
    }, []),
    nt = (0, o.useCallback)(() => {
      O.current &&
        ((A.current = 0),
        (te.current = !0),
        ee(!0),
        (E.current = !1),
        v(!1),
        (k.current = !1),
        w(!1),
        (D.current = !1),
        b(!1));
    }, []),
    rt = (0, o.useCallback)(() => {
      O.current &&
        (te.current && ((te.current = !1), ee(!1)),
        clearTimeout(A.current),
        (A.current = setTimeout(nt, Df)));
    }, [nt]);
  (0, o.useEffect)(() => {
    let e = (e) => {
      O.current && rt();
      let t =
          e.clientX >= 0 && e.clientY >= 0 && e.clientX < 120 && e.clientY < 76,
        n = e.clientX >= window.innerWidth - 120 && e.clientY < 76,
        r =
          !O.current && e.clientX >= window.innerWidth - 146 && e.clientY < 76;
      (E.current !== t && ((E.current = t), v(t)),
        k.current !== n && ((k.current = n), w(n)),
        D.current !== r && ((D.current = r), b(r)));
    };
    return (
      window.addEventListener(`pointermove`, e, { passive: !0 }),
      () => window.removeEventListener(`pointermove`, e)
    );
  }, [rt]);
  let it = (0, o.useCallback)(() => {
      (z.current?.stop?.(), (z.current = null));
    }, []),
    at = (0, o.useCallback)(() => {
      let e = V.current;
      (e.frame && cancelAnimationFrame(e.frame),
        (e.frame = 0),
        (e.pendingX = 0),
        (e.pendingY = 0),
        (e.lastTime = null));
    }, []),
    ot = (0, o.useCallback)(() => {
      ke.current &&= (cancelAnimationFrame(ke.current), null);
    }, []),
    st = (0, o.useCallback)(
      (e, t) => {
        if ((ot(), Math.hypot(e, t) < 0.5)) return;
        let n = performance.now(),
          r = n,
          i = (a) => {
            let o = Math.min(0.05, Math.max(0, (a - r) / 1e3));
            r = a;
            let s = Math.min(1, (a - n) / _f),
              c = 1 - s * s * (3 - 2 * s);
            ((L.current.x += e * c * o),
              (L.current.y += t * c * o),
              Ae.current?.(!0),
              s < 1
                ? (ke.current = requestAnimationFrame(i))
                : ((ke.current = null), Ae.current?.()));
          };
        ke.current = requestAnimationFrame(i);
      },
      [ot],
    ),
    ct = (0, o.useCallback)(() => {
      (ot(), (Oe.current &&= (cancelAnimationFrame(Oe.current.frame), null)));
      let e = Pf(oe.current),
        t = e ? Sf[e] : null,
        n = Nf(oe.current) * 1e3,
        r = {
          frame: 0,
          startedAt: performance.now(),
          lastTime: null,
          heading: t
            ? Math.atan2(t.y, t.x)
            : Math.random() * Math.PI * 2 - Math.PI,
          speed: 0,
          velocityX: 0,
          velocityY: 0,
          isTurning: !1,
          turnRemaining: 0,
          turnRate: 0,
          lastTurnAngle: null,
          fixedDirection: !!t,
          turnIntervalMs: n,
          nextTurnAt: t ? 1 / 0 : vf + n,
        };
      ae.current && (ae.current.dataset.wallpaperMotion = `straight`);
      let i = (e) => {
        if (Oe.current !== r) return;
        let t = e - r.startedAt,
          n =
            r.lastTime == null
              ? 0
              : Math.min(0.05, Math.max(0, (e - r.lastTime) / 1e3));
        r.lastTime = e;
        let o = Math.min(1, Math.max(0, (t - vf) / gf)),
          s = o * o * (3 - 2 * o);
        if (
          ((r.speed = hf * a(oe.current) * s),
          !r.fixedDirection && !r.isTurning && t >= r.nextTurnAt)
        ) {
          let e = Math.random() < 0.5 ? -1 : 1,
            t = Cf + Math.random() * (wf - Cf);
          if (r.lastTurnAngle !== null) {
            let e = Math.max(Cf, r.lastTurnAngle - Tf),
              n = Math.min(wf, r.lastTurnAngle + Tf),
              i = Math.max(0, e - Cf),
              a = Math.max(0, wf - n);
            i + a > 0 &&
              (t =
                Math.random() * (i + a) < i
                  ? Cf + Math.random() * i
                  : n + Math.random() * a);
          }
          r.lastTurnAngle = t;
          let n = Ef + Math.random() * 480;
          ((r.isTurning = !0),
            (r.turnRemaining = e * t),
            (r.turnRate = Math.max(1, r.speed) / n),
            ae.current && (ae.current.dataset.wallpaperMotion = `arc`));
        }
        let c = 0;
        r.isTurning &&
          n > 0 &&
          ((c =
            Math.sign(r.turnRemaining) *
            Math.min(Math.abs(r.turnRemaining), r.turnRate * n)),
          (r.heading += c),
          (r.turnRemaining -= c),
          Math.abs(r.turnRemaining) < 1e-6 &&
            ((r.turnRemaining = 0),
            (r.isTurning = !1),
            (r.nextTurnAt = t + r.turnIntervalMs),
            ae.current && (ae.current.dataset.wallpaperMotion = `straight`)));
        let l = r.heading - c / 2;
        ((r.velocityX = Math.cos(l) * r.speed),
          (r.velocityY = Math.sin(l) * r.speed),
          (L.current.x += r.velocityX * n),
          (L.current.y += r.velocityY * n),
          Ae.current?.(!0),
          (r.frame = requestAnimationFrame(i)));
      };
      ((Oe.current = r), (r.frame = requestAnimationFrame(i)));
    }, [ot]),
    lt = (0, o.useCallback)(
      (e = !0) => {
        let t = Oe.current;
        return t
          ? (cancelAnimationFrame(t.frame),
            (Oe.current = null),
            ae.current?.removeAttribute(`data-wallpaper-motion`),
            e && st(t.velocityX, t.velocityY),
            !0)
          : !1;
      },
      [st],
    ),
    ut = (0, o.useCallback)(() => {
      if (N.current || O.current) return;
      ((O.current = !0), S(!0), rt(), (D.current = !1), b(!1));
      let e = Ie.current;
      (clearTimeout(e.timer),
        (e.active = !1),
        (e.pending = !1),
        (se.current = null),
        c(null),
        (Te.current = null),
        (R.current = !1),
        U(),
        it(),
        ot(),
        at(),
        ct());
    }, [it, rt, ot, at, ct, U]),
    dt = (0, o.useCallback)(
      () =>
        O.current
          ? ((O.current = !1),
            S(!1),
            K(),
            (te.current = !1),
            ee(!1),
            (D.current = !1),
            b(!1),
            lt(!0),
            !0)
          : !1,
      [K, lt],
    ),
    ft = (0, o.useCallback)(() => {
      O.current ? dt() : ut();
    }, [ut, dt]),
    pt = (0, o.useCallback)(
      (e) => {
        let t = Ie.current;
        if (
          ((Te.current = { x: L.current.x, y: L.current.y }), U(), z.current)
        ) {
          try {
            z.current.stop();
          } catch {}
          z.current = null;
        }
        (V.current.frame && cancelAnimationFrame(V.current.frame),
          (V.current.frame = 0),
          (V.current.pendingX = 0),
          (V.current.pendingY = 0),
          (V.current.lastTime = null),
          (ue.current = !0),
          (se.current = null),
          c(null),
          (t.active = !0),
          (t.pending = e),
          clearTimeout(t.timer),
          (t.timer = setTimeout(() => {
            ((t.active = !1),
              t.pending &&
                ((t.pending = !1),
                window.parent.postMessage(
                  { type: `photo-wall:back` },
                  window.location.origin,
                )));
          }, pf)));
      },
      [U],
    ),
    mt = (0, o.useCallback)(() => {
      if (N.current) return;
      if (dt()) {
        window.parent.postMessage(
          { type: `photo-wall:exit` },
          window.location.origin,
        );
        return;
      }
      let e = Ie.current;
      se.current
        ? pt(!0)
        : e.active ||
          window.parent.postMessage(
            { type: `photo-wall:back` },
            window.location.origin,
          );
    }, [pt, dt]),
    ht = (0, o.useCallback)(() => {
      if (N.current) return;
      if (dt()) {
        window.parent.postMessage(
          { type: `photo-wall:exit` },
          window.location.origin,
        );
        return;
      }
      let e = Ie.current;
      se.current
        ? pt(!1)
        : e.active
          ? (e.pending = !0)
          : window.parent.postMessage(
              { type: `photo-wall:back` },
              window.location.origin,
            );
    }, [pt, dt]);
  (0, o.useEffect)(() => {
    let e = (e) => {
        e.key === `Escape`
          ? (e.preventDefault(), ht())
          : N.current
            ? e.preventDefault()
            : (e.ctrlKey || e.metaKey) &&
              !e.altKey &&
              !e.shiftKey &&
              mf.has(e.key) &&
              (e.preventDefault(),
              !e.repeat &&
                window.parent.postMessage(
                  {
                    type: `photo-wall:window-shortcut`,
                    key: e.key,
                    ctrlKey: e.ctrlKey,
                    metaKey: e.metaKey,
                  },
                  window.location.origin,
                ));
      },
      t = (e) => {
        (e.preventDefault(), e.stopPropagation());
      };
    return (
      window.addEventListener(`keydown`, e),
      window.addEventListener(`dblclick`, t),
      () => {
        (window.removeEventListener(`keydown`, e),
          window.removeEventListener(`dblclick`, t));
      }
    );
  }, [ht]);
  let gt = (0, o.useCallback)(
      (e, t = j) => {
        if (!e) return;
        let r = L.current,
          i = H * r.zoom,
          a,
          o;
        if (t === Gd)
          ((a = n.width / 2 - (e.x + e.width / 2) * i),
            (o = n.height / 2 - (e.y + e.height / 2) * i));
        else {
          let t = r.x + e.x * i,
            s = r.y + e.y * i,
            c = t + e.width * i,
            l = s + e.height * i;
          ((a = r.x),
            (o = r.y),
            c - t > n.width - 48
              ? (a = n.width / 2 - (e.x + e.width / 2) * i)
              : t < Jd
                ? (a += Jd - t)
                : c > n.width - Jd && (a -= c - (n.width - Jd)),
            l - s > n.height - 48
              ? (o = n.height / 2 - (e.y + e.height / 2) * i)
              : s < Jd
                ? (o += Jd - s)
                : l > n.height - Jd && (o -= l - (n.height - Jd)));
        }
        if (Math.abs(a - r.x) < 0.5 && Math.abs(o - r.y) < 0.5) return;
        U();
        let s = De.current,
          c = { x: r.x, y: r.y };
        B
          ? ((r.x = a), (r.y = o), G())
          : ((cameraFocusActive.current = !0),
            (Ee.current = bd(0, 1, {
              duration: Bd,
              ease: [0.22, 1, 0.36, 1],
              onUpdate: (e) => {
                s === De.current &&
                  ((r.x = c.x + (a - c.x) * e),
                  (r.y = c.y + (o - c.y) * e),
                  G(!0));
              },
              onComplete: () => {
                s === De.current &&
                  ((r.x = a),
                  (r.y = o),
                  (cameraFocusActive.current = !1),
                  (Ee.current = null),
                  G());
              },
            })));
      },
      [G, j, B, H, U, n.height, n.width],
    ),
    _t = (0, o.useCallback)(
      (e) => {
        if (O.current) return;
        let t = Ie.current;
        (clearTimeout(t.timer),
          (t.active = !1),
          (t.pending = !1),
          (ue.current = !1),
          (Te.current = null),
          (se.current = e),
          c(e),
          gt(tp(e.blockColumn, e.blockRow, e.slotIndex, ze), j));
      },
      [gt, j, ze],
    ),
    vt = (0, o.useCallback)(() => {
      if (O.current) return;
      let e = j === Gd ? Kd : Gd;
      ne(e);
      try {
        localStorage.setItem(qd, e);
      } catch {}
      s && gt(tp(s.blockColumn, s.blockRow, s.slotIndex, ze), e);
    }, [s, gt, j, ze]),
    yt = (0, o.useCallback)(
      (e) => {
        (u((t) => {
          if (t.has(e)) return t;
          let n = new Set(t);
          return (n.add(e), n);
        }),
          c((t) => {
            if (!t) return t;
            let n = Qf(t.blockColumn, t.blockRow, t.slotIndex, Re.length, ze);
            return Re[n]?.id === e ? null : t;
          }));
      },
      [Re, ze],
    ),
    bt = (0, o.useCallback)(
      (e, t) => {
        N.current ||
          O.current ||
          (U(),
          it(),
          at(),
          (le.current = {
            albumId: Number(e),
            camera: { x: L.current.x, y: L.current.y, zoom: L.current.zoom },
            targetKey: t?.targetKey || null,
            sourceRect: t?.sourceRect || null,
          }),
          (ce.current = t),
          window.parent.postMessage(
            { type: `photo-wall:navigate`, albumId: e },
            window.location.origin,
          ));
      },
      [it, at, U],
    ),
    xt = (0, o.useCallback)(
      (e, t) => {
        it();
        let n = Math.hypot(e, t);
        if (n < 40) return;
        let r = Math.min(n, 4e3),
          i = L.current.x,
          a = L.current.y,
          o = e / n,
          s = t / n,
          c = bd(0, r * 0.3, {
            type: `inertia`,
            velocity: r,
            power: 0.3,
            timeConstant: 280,
            restDelta: 0.5,
            onUpdate: (e) => {
              ((L.current.x = i + e * o), (L.current.y = a + e * s), G(!0));
            },
            onComplete: () => {
              z.current === c && (z.current = null);
            },
          });
        z.current = c;
      },
      [G, it],
    ),
    q = (e) => {
      if (!N.current && e.button === 0 && e.isPrimary) {
        if (((ue.current = !1), e.ctrlKey || e.metaKey)) {
          ((Ne.current = null),
            (Pe.current = {
              id: e.pointerId,
              startX: e.screenX,
              startY: e.screenY,
              dragged: !1,
            }));
          try {
            e.currentTarget.setPointerCapture(e.pointerId);
          } catch {}
        } else
          O.current
            ? e.preventDefault()
            : ((Te.current = null),
              U(),
              tt(),
              it(),
              ot(),
              at(),
              cameraZoomFrame.current &&
                (cancelAnimationFrame(cameraZoomFrame.current),
                (cameraZoomFrame.current = 0)),
              (cameraZoomLastTime.current = 0),
              (R.current = !1),
              (Ne.current = {
                id: e.pointerId,
                startX: e.clientX,
                startY: e.clientY,
                originX: L.current.x,
                originY: L.current.y,
                lastX: e.clientX,
                lastY: e.clientY,
                lastTime: e.timeStamp,
                vx: 0,
                vy: 0,
                dragged: !1,
              }));
      }
    },
    St = (e) => {
      let t = e.clientX < 120 && e.clientY < 76;
      E.current !== t && ((E.current = t), v(t));
      let n = Pe.current;
      if (n && n.id === e.pointerId) {
        let t = e.screenX - n.startX,
          r = e.screenY - n.startY;
        if (!n.dragged && Math.hypot(t, r) <= Wd) return;
        (n.dragged ||
          ((n.dragged = !0),
          (R.current = !0),
          window.parent.postMessage(
            {
              type: `photo-wall:window-move-start`,
              screenX: n.startX,
              screenY: n.startY,
            },
            window.location.origin,
          )),
          e.preventDefault(),
          e.stopPropagation(),
          window.parent.postMessage(
            {
              type: `photo-wall:window-move`,
              screenX: e.screenX,
              screenY: e.screenY,
            },
            window.location.origin,
          ));
        return;
      }
      let r = Ne.current;
      if (!r || r.id !== e.pointerId) return;
      let i = e.clientX - r.startX,
        a = e.clientY - r.startY;
      !r.dragged &&
        Math.hypot(i, a) > Wd &&
        ((r.dragged = !0),
        (R.current = !0),
        e.currentTarget.setPointerCapture(e.pointerId));
      let o = e.timeStamp - r.lastTime;
      (o > 0 &&
        ((r.vx = ((e.clientX - r.lastX) / o) * 1e3),
        (r.vy = ((e.clientY - r.lastY) / o) * 1e3)),
        (r.lastX = e.clientX),
        (r.lastY = e.clientY),
        (r.lastTime = e.timeStamp),
        r.dragged &&
          ((L.current.x = r.originX + i),
          (L.current.y = r.originY + a),
          G(!0)));
    },
    Ct = (e, t = !0) => {
      let n = Ne.current;
      n &&
        n.id === e.pointerId &&
        ((Ne.current = null),
        tt(),
        e.currentTarget.hasPointerCapture(e.pointerId) &&
          e.currentTarget.releasePointerCapture(e.pointerId),
        t && n.dragged && e.timeStamp - n.lastTime <= 80 ? xt(n.vx, n.vy) : G(),
        n.dragged
          ? setTimeout(() => {
              R.current = !1;
            }, 0)
          : (R.current = !1));
    },
    wt = (e, t = !0) => {
      let n = Pe.current;
      !n || n.id !== e.pointerId
        ? Ct(e, t)
        : ((Pe.current = null),
          e.currentTarget?.hasPointerCapture(e.pointerId) &&
            e.currentTarget.releasePointerCapture(e.pointerId),
          n.dragged
            ? (e.preventDefault(),
              e.stopPropagation(),
              window.parent.postMessage(
                { type: `photo-wall:window-move-end` },
                window.location.origin,
              ),
              setTimeout(() => {
                R.current = !1;
              }, 0))
            : (R.current = !1));
    },
    Tt = (0, o.useCallback)(
      (e) => {
        let t = V.current;
        t.frame = 0;
        let n =
          t.lastTime == null
            ? 1e3 / 60
            : Math.min(50, Math.max(0, e - t.lastTime));
        t.lastTime = e;
        let r = 1 - Math.exp(-n / Vd),
          i = t.pendingX * r,
          a = t.pendingY * r,
          o = t.pendingX - i,
          s = t.pendingY - a;
        (Math.hypot(o, s) < 0.5
          ? ((i = t.pendingX),
            (a = t.pendingY),
            (t.pendingX = 0),
            (t.pendingY = 0))
          : ((t.pendingX = o), (t.pendingY = s)),
          (L.current.x += i),
          (L.current.y += a),
          G(!0),
          t.pendingX || t.pendingY
            ? (t.frame = requestAnimationFrame(Tt))
            : (t.lastTime = null));
      },
      [G],
    ),
    Et = (0, o.useCallback)(
      (deltaY) => {
        let camera = L.current;
        if (!cameraZoomFrame.current) {
          cameraZoomTarget.current = camera.zoom;
        }
        cameraZoomTarget.current = jf(
          cameraZoomTarget.current * Math.exp(-deltaY * Af),
          Of,
          kf,
        );
        if (cameraZoomFrame.current) return;
        cameraZoomLastTime.current = 0;
        let step = (time) => {
          let current = L.current,
            elapsed = cameraZoomLastTime.current
              ? Math.min(50, Math.max(0, time - cameraZoomLastTime.current))
              : 1000 / 60;
          cameraZoomLastTime.current = time;
          let target = cameraZoomTarget.current,
            ease = 1 - Math.exp(-elapsed / 70),
            nextZoom = current.zoom + (target - current.zoom) * ease,
            settled = Math.abs(nextZoom - target) < 1e-4;
          if (settled) nextZoom = target;
          let centerX = n.width / 2,
            centerY = n.height / 2;
          current.x =
            centerX - (centerX - current.x) * (nextZoom / current.zoom);
          current.y =
            centerY - (centerY - current.y) * (nextZoom / current.zoom);
          current.zoom = nextZoom;
          G(true);
          if (settled) {
            ((cameraZoomFrame.current = 0),
              (cameraZoomLastTime.current = 0),
              G());
          } else {
            cameraZoomFrame.current = requestAnimationFrame(step);
          }
        };
        cameraZoomFrame.current = requestAnimationFrame(step);
      },
      [G, n.height, n.width],
    ),
    Dt = (0, o.useCallback)(
      (e) => {
        if ((e.preventDefault(), N.current || O.current)) return;
        if (se.current) {
          at();
          return;
        }
        if (
          ((ue.current = !1),
          (Te.current = null),
          U(),
          it(),
          ot(),
          e.ctrlKey || e.metaKey)
        ) {
          at();
          let t = e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? n.height : 1;
          Et(e.deltaY * t);
          return;
        }
        let t = e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? n.height : 1,
          r = e.shiftKey && !e.deltaX,
          i = (r ? e.deltaY : e.deltaX) * t,
          a = (r ? 0 : e.deltaY) * t;
        B
          ? (at(), (L.current.x -= i), (L.current.y -= a), G(!0))
          : ((V.current.pendingX -= i),
            (V.current.pendingY -= a),
            V.current.frame ||
              ((V.current.lastTime = null),
              (V.current.frame = requestAnimationFrame(Tt))));
      },
      [G, it, ot, at, B, Tt, U, n.height, Et],
    );
  if (
    ((0, o.useEffect)(() => {
      let e = ie.current;
      if (e)
        return (
          (e.dataset.cameraZoomControl = `ready`),
          e.addEventListener(`wheel`, Dt, { passive: !1 }),
          () => {
            (e.removeEventListener(`wheel`, Dt),
              delete e.dataset.cameraZoomControl);
          }
        );
    }, [e, Dt]),
    (0, o.useEffect)(
      () => () => {
        (Le.current && cancelAnimationFrame(Le.current),
          ye.current && cancelAnimationFrame(ye.current),
          clearTimeout(Ie.current.timer),
          (Ie.current.active = !1),
          (Ie.current.pending = !1),
          K(),
          (Oe.current &&= (cancelAnimationFrame(Oe.current.frame), null)),
          ot(),
          U(),
          it(),
          at());
      },
      [it, ot, at, K, U],
    ),
    !e)
  )
    return (0, Q.jsx)(`main`, {
      className: `photo-wall-loading`,
      "aria-hidden": `true`,
    });
  if (!Re.length)
    return (0, Q.jsx)(`main`, {
      className: `photo-wall-empty`,
      "aria-label": `没有可显示的照片`,
      children: (0, Q.jsx)(`span`, { children: `没有可显示的照片` }),
    });
  let Ot = Nf(e),
    J = Pf(e),
    kt = [];
  for (let e = M.fromRow; e <= M.toRow; e += 1)
    for (let t = M.fromColumn; t <= M.toColumn; t += 1)
      kt.push({ column: t, row: e });
  let At = Math.max(1, Math.floor(zd / 12));
  if (kt.length > At) {
    let e = np(L.current, H * L.current.zoom, n.width, n.height, 0),
      t = kt.filter(
        ({ column: t, row: n }) =>
          t >= e.fromColumn &&
          t <= e.toColumn &&
          n >= e.fromRow &&
          n <= e.toRow,
      );
    if (t.length >= At) kt.splice(0, kt.length, ...t);
    else {
      let e = (M.fromColumn + M.toColumn) / 2,
        n = (M.fromRow + M.toRow) / 2,
        r = kt
          .filter(
            (e) =>
              !t.some(({ column: t, row: n }) => t === e.column && n === e.row),
          )
          .sort(
            (t, r) =>
              Math.hypot(t.column - e, t.row - n) -
              Math.hypot(r.column - e, r.row - n),
          )
          .slice(0, At - t.length);
      kt.splice(0, kt.length, ...t, ...r);
    }
  }
  let jt = h.current || Be,
    Mt = H * kf * (window.devicePixelRatio || 1);
  return (0, Q.jsxs)(`main`, {
    className: `photo-wall-app${x ? ` is-wallpaper-mode` : ``}${T ? ` is-wallpaper-idle` : ``}`,
    "data-wallpaper-mode": x ? `true` : `false`,
    "data-wallpaper-idle": T ? `true` : `false`,
    "data-wallpaper-cruise-seconds": Ot,
    "data-wallpaper-cruise-direction": J || `timed`,
    children: [
      (0, Q.jsxs)(`div`, {
        className: `photo-wall-atmosphere`,
        "aria-hidden": `true`,
        children: [
          h.previous &&
            (0, Q.jsx)(
              `img`,
              {
                className: `is-previous`,
                src: h.previous,
                alt: ``,
                draggable: `false`,
                decoding: `async`,
              },
              `previous-${h.version}`,
            ),
          jt &&
            (0, Q.jsx)(
              `img`,
              {
                className: `is-current`,
                src: jt,
                alt: ``,
                draggable: `false`,
                decoding: `async`,
              },
              `current-${h.version}`,
            ),
        ],
      }),
      (0, Q.jsx)(`div`, {
        ref: ie,
        className: `photo-wall-field${x ? ` is-wallpaper-mode` : ``}`,
        onPointerDown: q,
        onPointerMove: St,
        onPointerUp: (e) => wt(e, !0),
        onPointerCancel: (e) => wt(e, !1),
        onClick: () => {
          R.current ? (R.current = !1) : (c(null), m(null));
        },
        children: (0, Q.jsx)(`div`, {
          ref: ae,
          className: `photo-wall-world`,
          children: kt.map(({ column: e, row: t }) =>
            (0, Q.jsx)(
              dp,
              {
                column: e,
                row: t,
                items: Re,
                seed: ze,
                active: s,
                pixelScale: Mt,
                onSelect: _t,
                onOpenAlbum: bt,
                onBroken: yt,
                didDragRef: R,
                handoffSnap: d,
                returnTargetKey: p,
                interactive: !x,
                cameraGapExtra,
              },
              `${e}:${t}`,
            ),
          ),
        }),
      }),
      (0, Q.jsx)(`div`, {
        className: `photo-wall-back-zone${He ? ` is-visible` : ``}`,
        children: (0, Q.jsx)(`button`, {
          type: `button`,
          className: `photo-wall-back${He ? ` is-visible` : ``}`,
          "aria-label": x
            ? `退出壁纸模式`
            : s
              ? `收起照片并返回`
              : `返回上一级`,
          onFocus: () => {
            ((E.current = !0), v(!0));
          },
          onBlur: () => {
            ((E.current = !1), v(!1));
          },
          onClick: mt,
          children: (0, Q.jsx)(`svg`, {
            viewBox: `0 0 16 24`,
            fill: `none`,
            stroke: `currentColor`,
            strokeWidth: `2.2`,
            strokeLinecap: `round`,
            strokeLinejoin: `round`,
            "aria-hidden": `true`,
            children: (0, Q.jsx)(`path`, { d: `m12 3.5-8 8.5 8 8.5` }),
          }),
        }),
      }),
      (0, Q.jsxs)(`div`, {
        className: `photo-wall-wallpaper-zone${Ue ? ` is-visible` : ``}`,
        children: [
          (0, Q.jsx)(`button`, {
            type: `button`,
            className: `photo-wall-tools-button photo-wall-focus-button${We ? ` is-visible` : ``}`,
            "data-focus-mode": j,
            disabled: x,
            tabIndex: x ? -1 : 0,
            "aria-label":
              j === Gd
                ? `当前居中聚焦，切换为让位聚焦`
                : `当前让位聚焦，切换为居中聚焦`,
            onFocus: () => {
              ((D.current = !0), b(!0));
            },
            onBlur: () => {
              ((D.current = !1), b(!1));
            },
            onClick: vt,
            children: (0, Q.jsx)(
              Xu.svg,
              {
                viewBox: `0 0 22 22`,
                "aria-hidden": `true`,
                initial: { opacity: 0, scale: 0.82, rotate: -8 },
                animate: { opacity: 1, scale: 1, rotate: 0 },
                transition: { duration: 0.16, ease: `easeOut` },
                children:
                  j === Gd
                    ? (0, Q.jsxs)(Q.Fragment, {
                        children: [
                          (0, Q.jsx)(`rect`, {
                            x: `3`,
                            y: `3`,
                            width: `16`,
                            height: `16`,
                            rx: `3`,
                          }),
                          (0, Q.jsx)(`rect`, {
                            x: `8`,
                            y: `8`,
                            width: `6`,
                            height: `6`,
                            rx: `1.3`,
                          }),
                          (0, Q.jsx)(`path`, {
                            d: `M11 1.8v2M11 18.2v2M1.8 11h2M18.2 11h2`,
                          }),
                        ],
                      })
                    : (0, Q.jsxs)(Q.Fragment, {
                        children: [
                          (0, Q.jsx)(`path`, {
                            d: `M4 7V4h3M15 4h3v3M18 15v3h-3M7 18H4v-3`,
                          }),
                          (0, Q.jsx)(`rect`, {
                            x: `8`,
                            y: `8`,
                            width: `6`,
                            height: `6`,
                            rx: `1.3`,
                          }),
                          (0, Q.jsx)(`path`, {
                            d: `M11 5.5v1M11 15.5v1M5.5 11h1M15.5 11h1`,
                          }),
                        ],
                      }),
              },
              j,
            ),
          }),
          (0, Q.jsx)(`button`, {
            type: `button`,
            className: `photo-wall-tools-button photo-wall-wallpaper-button${Ue ? ` is-visible` : ``}`,
            "data-wallpaper-mode": x ? `true` : `false`,
            "aria-label": x ? `关闭壁纸模式` : `打开壁纸模式`,
            "aria-pressed": x,
            onFocus: () => {
              ((k.current = !0), w(!0));
            },
            onBlur: () => {
              ((k.current = !1), w(!1));
            },
            onClick: ft,
            children: (0, Q.jsx)(`svg`, {
              viewBox: `0 0 22 22`,
              "aria-hidden": `true`,
              style: { overflow: `visible` },
              children: (0, Q.jsx)(`path`, {
                d: `M3.5 6.1 6.5 16l4.5-7.8 4.5 7.8 3-9.9`,
              }),
            }),
          }),
        ],
      }),
    ],
  });
}
export { fp as default };
