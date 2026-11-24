const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const root = path.join(__dirname, "..");
const css = fs.readFileSync(path.join(root, "web/styles.css"), "utf8");
const html = fs.readFileSync(path.join(root, "web/index.html"), "utf8");

/* 只取顶层规则：媒体查询里的同名规则缩进过，不会被 ^ 匹配到。 */
function rule(source) {
  const pattern = new RegExp(`^${source} \\{[\\s\\S]*?^\\}`, "m");
  const matched = css.match(pattern);
  assert.ok(matched, `styles.css 里找不到规则：${source}`);
  return matched[0];
}

const statusBar = rule("\\.status-bar");
const statusCollapsed = rule("\\.status-bar\\.is-collapsed");
const selbar = rule("\\.selbar");
const selbarCollapsed = rule("\\.selbar\\.is-collapsed");
const selbarIcon = rule("\\.selbar \\.icon-btn");
const selbarIconSvg = rule("\\.selbar \\.icon-btn svg");
const selbarPill = rule("\\.selbar \\.selbar-pill-btn");
const selbarAct = rule("\\.selbar-act");
const numberingDone = rule("\\.selbar #numberingDoneBtn");
const importCancel = rule("\\.status-import-cancel");
const toast = rule("\\.toast");
const main = rule("\\.main");

test("状态条在所有标题栏样式下都是居中浮起的胶囊", () => {
  assert.match(statusBar, /bottom: 12px;/);
  assert.match(statusBar, /width: fit-content;/);
  assert.match(statusBar, /max-width: calc\(100% - 48px\);/);
  assert.match(statusBar, /margin-inline: auto;/);
  assert.match(statusBar, /height: 38px;/);
  assert.match(statusBar, /padding: 0 16px;/);
  assert.match(statusBar, /border: 0;/);
  assert.match(statusBar, /border-radius: 999px;/);
  assert.match(
    statusBar,
    /background: color-mix\(in srgb, var\(--main-bg\) 74%, transparent\);/,
  );
  assert.match(statusBar, /backdrop-filter: blur\(16px\) saturate\(140%\);/);
  assert.match(statusBar, /box-shadow:/);
  assert.doesNotMatch(statusBar, /height: var\(--bottom-bar-thickness\);/);
  assert.doesNotMatch(statusBar, /border-top:/);
});

test("磨砂标题栏沿用状态胶囊，只替换材质", () => {
  assert.match(
    css,
    /^html\.blur-titlebar \.status-bar \{[\s\S]*?background: var\(--blur-titlebar-surface\);/m,
  );
  assert.doesNotMatch(css, /^html\.transparent-titlebar \.status-bar \{/m);
});

test("选择栏继续贴住底边，状态胶囊浮在它上面", () => {
  assert.match(
    css,
    /--bottom-bar-thickness: calc\(38px \+ var\(--app-frame-bottom\)\);/,
  );
  assert.match(selbar, /height: var\(--bottom-bar-thickness\);/);
  assert.match(selbar, /bottom: 0;/);
  assert.match(
    selbar,
    /var\(--app-frame-bottom\)\s*var\(--toolbar-visible-inset\);/,
  );
  assert.match(statusBar, /height: 38px;/);
  assert.match(statusBar, /bottom: 12px;/);
  assert.match(html, /class="selbar is-collapsed"/);
  assert.match(html, /class="status-bar is-collapsed"/);
});

test("裁切边的压边钉在主区域下沿，不跟底栏一起滑动", () => {
  /* 底栏是带 backdrop-filter 的合成层，进出场整条平移；裁切边那一行会被
     合成器算成底下的照片颜色——静止时像一条缝，滑动途中还跟着栏闪，
     像底栏在回弹。压边画在栏里会跟栏一起移开，所以钉在 .main 下沿：
     整条落在窗框内缩量那一截（本来就被裁掉），再往上多盖 2px，
     抗锯齿那一行就没有照片色可漏，可见的 38px 毛玻璃高度不受影响。 */
  const cap = rule("\\.main::after");
  assert.match(cap, /content: "";/);
  assert.match(cap, /position: absolute;/);
  assert.match(cap, /bottom: 0;/);
  /* 压在两条底栏（z-index 6 / 12）上面，栏从它底下滑进滑出。 */
  assert.match(cap, /z-index: 13;/);
  assert.match(
    cap,
    /height: calc\(var\(--app-frame-bottom\) \+ var\(--bottom-bar-cap-overlap\)\);/,
  );
  /* 必须和窗框用同一个颜色变量，深浅色两套主题才都接得上。 */
  assert.match(cap, /background: var\(--window-frame-bg\);/);
  assert.match(cap, /pointer-events: none;/);
  assert.match(cap, /opacity: 0;/);
  /* 收栏后压边等底栏滑出窗口才淡掉，途中裁切边一直有窗框色盖着。 */
  assert.match(cap, /transition: opacity 90ms linear 260ms;/);
  assert.match(css, /--bottom-bar-cap-overlap: 2px;/);

  /* 只有贴底的选择栏在场时才需要压边，进场不等淡入。 */
  const on = css.match(
    /^\.main:has\(#selbar:not\(\.is-collapsed\)\)::after \{[\s\S]*?^\}/m,
  );
  assert.ok(on, "缺少压边的在场规则");
  assert.match(on[0], /opacity: 1;/);
  assert.match(on[0], /transition: none;/);
  assert.doesNotMatch(
    css,
    /^\.main:has\(#statusBar:not\(\.is-collapsed\)\)::after/m,
  );

  /* 下沿不压裁切边的两种主题要撤掉压边，否则会凭空多一条灰边。 */
  const off = css.match(
    /^html\.transparent-titlebar \.main::after,\nhtml\.hide-glass-border \.main::after \{[\s\S]*?^\}/m,
  );
  assert.ok(off, "缺少压边的例外规则");
  assert.match(off[0], /content: none;/);

  /* 压边不在栏里：栏平移时它不会跟着移开。 */
  assert.doesNotMatch(css, /\.status-bar::before/);
  assert.doesNotMatch(css, /\.selbar::before/);

  /* 压边只补色，不改变选择栏与状态胶囊各自的位置和尺寸。 */
  assert.match(selbar, /bottom: 0;/);
  assert.match(selbar, /height: var\(--bottom-bar-thickness\);/);
  assert.match(statusBar, /bottom: 12px;/);
  assert.match(statusBar, /height: 38px;/);
});

test("两条底栏入场只推不淡，淡出只留在收起那一程", () => {
  assert.match(selbar, /transition: transform 0\.24s/);
  assert.doesNotMatch(selbar, /opacity/);
  assert.match(selbarCollapsed, /transform: translateY\(100%\);/);
  assert.match(selbarCollapsed, /opacity: 0;/);
  assert.match(selbarCollapsed, /transform 0\.24s[\s\S]*?opacity 0\.14s ease;/);

  assert.match(statusBar, /transition: transform 180ms/);
  assert.doesNotMatch(statusBar, /opacity [\d.]+m?s/);
  assert.match(statusCollapsed, /opacity: 0;/);
  assert.match(
    statusCollapsed,
    /transform: translate3d\(\s*0,\s*calc\(100% \+ var\(--status-bar-hide\) \+ var\(--status-bar-lift\)\),\s*0\s*\);/,
  );
  assert.match(
    css,
    /@media \(prefers-reduced-motion: reduce\)[\s\S]*?\.status-bar \{\s*transform: translate3d\(0, var\(--status-bar-lift\), 0\) !important;/,
  );
});

test("底边同时出现两条栏时，状态条抬起、轻提示与回到顶部按钮让位", () => {
  assert.match(
    main,
    /--selbar-stack: 0px;[\s\S]*?--status-stack: 0px;[\s\S]*?--bottom-extra: 0px;/,
  );
  assert.match(
    css,
    /^\.main:has\(#selbar:not\(\.is-collapsed\)\) \{\s*--selbar-stack: var\(--bottom-bar-thickness\);\s*\}/m,
  );
  assert.match(
    css,
    /^\.main:has\(#statusBar:not\(\.is-collapsed\)\) \{\s*--status-stack: var\(--bottom-bar-thickness\);\s*\}/m,
  );
  assert.match(
    css,
    /^\.main:has\(#selbar:not\(\.is-collapsed\)\):has\(#statusBar:not\(\.is-collapsed\)\) \{\s*--bottom-extra: var\(--bottom-bar-thickness\);\s*\}/m,
  );
  assert.match(
    css,
    /^\.main:has\(#selbar:not\(\.is-collapsed\)\) \.status-bar \{\s*--status-bar-lift: calc\(-1 \* var\(--selbar-stack\)\);\s*\}/m,
  );
  assert.match(toast, /bottom: calc\(84px \+ var\(--bottom-extra\)\);/);
  assert.match(
    css,
    /^\.back-to-top\.is-visible \{[\s\S]*?transform: scale\(1\) translateY\(calc\(-1 \* var\(--status-stack\)\)\);/m,
  );
});

test("栏变矮后，里面的按钮和文字也一起收小，仍放得进栏高", () => {
  assert.match(selbarIcon, /width: 28px;\s*height: 28px;/);
  assert.match(selbarIconSvg, /width: 16px;\s*height: 16px;/);
  assert.match(
    selbarPill,
    /min-width: 58px;\s*height: 27px;\s*padding: 0 10px;/,
  );
  assert.match(selbarAct, /height: 27px;\s*padding: 0 7px;/);
  assert.match(selbarAct, /font-size: 14px;/);
  assert.match(numberingDone, /height: 27px;\s*padding: 0 11px;/);
  assert.match(css, /\.selbar-action-label \{[\s\S]*?font-size: 13px;/);
  assert.match(css, /\.selbar-count \{[\s\S]*?font-size: 14px;/);
  /* 状态条上的「取消」与选择栏上的胶囊同高，两条栏看起来是一家人。 */
  assert.match(importCancel, /height: 27px;/);
  assert.match(importCancel, /font-size: 13px;/);

  for (const control of [selbarIcon, selbarPill, selbarAct, numberingDone]) {
    const height = Number(/height: (\d+)px;/.exec(control)[1]);
    assert.ok(height <= 28, `底栏控件高 ${height}px，放不进 38px 的可见栏高`);
  }
});

test("状态条的取消入口只显示文字，原有点击热区保持不变", () => {
  assert.match(importCancel, /min-width: 52px;/);
  assert.match(importCancel, /height: 27px;/);
  assert.match(importCancel, /padding: 0 12px;/);
  assert.match(importCancel, /background: transparent;/);
  assert.match(importCancel, /box-shadow: none;/);
  assert.doesNotMatch(importCancel, /box-shadow:\s*inset/);
  assert.match(
    css,
    /^\.status-import-cancel:hover \{\s*color: var\(--accent\);\s*\}/m,
  );
  assert.match(
    css,
    /^\.status-import-cancel:active \{\s*color: var\(--accent\);\s*transform: scale\(0\.97\);\s*\}/m,
  );
});

test("标题透明时选择栏收成浮起的胶囊，仍贴着底边", () => {
  assert.match(
    css,
    /^html\.transparent-titlebar \.selbar \{[\s\S]*?padding-bottom: 4px;/m,
  );
  assert.match(
    css,
    /^html\.transparent-titlebar #content\.select-mode,\s*html\.blur-titlebar #content\.select-mode \{\s*padding-bottom: 96px;/m,
  );
});

test("选择模式下内容底部让出一条栏的厚度，最后一行不被压住", () => {
  const base = css.match(/^#content\.select-mode \{[\s\S]*?^\}/m);
  assert.ok(base, "缺少默认主题下 #content.select-mode 的底部让位");
  assert.match(
    base[0],
    /padding-bottom: calc\(\s*var\(--content-visible-gutter\) \+ var\(--bottom-bar-thickness\)\s*\);/,
  );
  /* 主题里那两档更宽松的留白写在后面，选择器更具体，仍然生效。 */
  assert.ok(
    css.indexOf("html.transparent-titlebar #content.select-mode") >
      css.indexOf("#content.select-mode {"),
  );
  /* .content 只对 padding-left 做过渡：这次让位不会变成一段动画。 */
  assert.match(
    rule("\\.content"),
    /transition:\s*padding-left var\(--sidebar-motion-duration\)/,
  );
  assert.doesNotMatch(rule("\\.content"), /padding-bottom /);
});
