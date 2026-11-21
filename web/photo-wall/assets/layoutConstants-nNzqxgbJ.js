function e(e) {
  return e < 640 ? 0.52 : e < 1100 ? 0.64 : 0.76;
}
function t(t) {
  return 8 * e(t);
}
function r(e, t, n) {
  let i = Math.max(0.01, Number(t) || 1),
    a = Math.max(0.01, Number(n) || i);
  return (Number(e) || 0) * 0.5 * (1 - i / a);
}
export { t as n, e as t, r as gapCompensation };
