var e = new Set(),
  t = new Set(),
  n = [],
  r = 0,
  i = (t) => {
    for (e.delete(t), e.add(t); e.size > 3600;) {
      let t = e.values().next().value;
      if (t === void 0) break;
      e.delete(t);
    }
  },
  a = () => {
    for (; r < 12 && n.length;) {
      let o = n.shift();
      if (!o || e.has(o) || t.has(o)) continue;
      (t.add(o), (r += 1));
      let s = new Image();
      ((s.decoding = `async`), (s.fetchPriority = `low`));
      let c = () => {
        (t.delete(o), i(o), (r = Math.max(0, r - 1)), a());
      };
      ((s.onload = c), (s.onerror = c), (s.src = o));
    }
  },
  o = (e) => {
    if (!e) return ``;
    try {
      let t = new URL(e, window.location.href);
      if (/\/(?:mosaic|masonry|filmroll)-wall\/thumb\//.test(t.pathname))
        return (t.searchParams.set(`size`, `96`), `${t.pathname}${t.search}`);
    } catch {}
    return e;
  },
  s = (r) => {
    let i = [...new Set(r)].filter((n) => n && !e.has(n) && !t.has(n));
    i.length && ((n = [...i, ...n.filter((e) => !i.includes(e))]), a());
  };
export { s as n, o as t };
