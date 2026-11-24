"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const root = path.join(__dirname, "..");
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");

/* 退出飞行的控制器：从常量声明一直到 closeViewerWithBackgroundAnimation。 */
const flightBlock = (app) =>
  app.slice(
    app.indexOf("const VIEWER_RETURN_SETTLE_FRAMES"),
    app.indexOf("function closeViewerWithBackgroundAnimation("),
  );

const closeBlock = (app) =>
  app.slice(
    app.indexOf("function closeViewer({ immediate"),
    app.indexOf("function setViewerInfo("),
  );

test("退出查看器期间滚轮仍能翻阅图库：查看器把滚轮转发给图库滚动管线", () => {
  const block = flightBlock(read("web/app.js"));

  /* 捕获阶段 + 非被动，才能抢在舞台缩放 / 翻页之前拦下来。 */
  assert.match(
    block,
    /\$\("#viewer"\)\.addEventListener\(\s*"wheel",[\s\S]*?\{ passive: false, capture: true \},\s*\);/,
  );
  const wheel = block.slice(
    block.indexOf('$("#viewer").addEventListener('),
    block.indexOf("function closeViewerWithBackgroundAnimation("),
  );
  /* 只在真的有飞行层要跟踪时接管，其余情况一律不打扰查看器自己的滚轮。 */
  assert.match(wheel, /if \(!viewerReturnFlight\) return;/);
  assert.match(wheel, /event\.preventDefault\(\);\s*event\.stopPropagation\(\);/);
  /* 触控板自带系统惯性：补齐未走完的位移后交还原生滚动。 */
  assert.match(
    wheel,
    /classifyAlbumWheel\(event\) === "trackpad"[\s\S]*?cancelAlbumWheelScroll\(\{ flush: true \}\);\s*content\.scrollTop \+= event\.deltaY;/,
  );
  /* 鼠标滚轮按 deltaMode 换算后并入既有的逐帧平滑。 */
  assert.match(
    wheel,
    /albumWheelScroll\.pending \+= delta;\s*if \(!albumWheelScroll\.frame\) \{[\s\S]*?requestAnimationFrame\(stepAlbumWheelScroll\);/,
  );
  assert.match(wheel, /ALBUM_WHEEL_SMOOTHING\.lineHeightPx/);
  /* 地图照片栏、照片墙、复制目标另有各自的滚动语义，不接管。 */
  assert.match(wheel, /state\.photoWall \|\| state\.copyTarget \|\| isAlbumMapView\(\)/);
});

test("查看器正在关闭时不再拦住图库的滚轮平滑", () => {
  const app = read("web/app.js");
  const block = flightBlock(app);

  assert.match(
    block,
    /function viewerBlocksGalleryWheel\(\) \{\s*const viewer = \$\("#viewer"\);\s*return !!viewer && !viewer\.hidden && !viewer\.classList\.contains\("is-closing"\);\s*\}/,
  );

  const step = app.slice(
    app.indexOf("function stepAlbumWheelScroll("),
    app.indexOf("function smoothAlbumWheelScroll("),
  );
  assert.match(
    step,
    /if \(!content \|\| state\.photoWall \|\| viewerBlocksGalleryWheel\(\)\) \{/,
  );
  assert.doesNotMatch(step, /!\$\("#viewer"\)\.hidden/);

  const smooth = app.slice(
    app.indexOf("function smoothAlbumWheelScroll("),
    app.indexOf("function photoEntranceSpringFrames("),
  );
  assert.match(smooth, /viewerBlocksGalleryWheel\(\)/);
  assert.doesNotMatch(smooth, /!\$\("#viewer"\)\.hidden/);
});

test("飞回终点按 itemId 实时重算，格子被回收时退回布局盒", () => {
  const block = flightBlock(read("web/app.js"));

  /* 认 id 不认下标：飞行途中列表重排也能一直跟着自己那一格。 */
  assert.match(
    block,
    /const found = state\.items\.findIndex\(\(it\) => Number\(it\?\.id\) === itemId\);/,
  );
  /* 等比布局下要量内层 img，所以走 tileMorphRect 而不是自己算盒子。 */
  assert.match(block, /const rect = tileMorphRect\(node\);/);
  assert.match(block, /return viewerReturnLayoutRect\(target\.index\(\)\);/);
  assert.match(
    block,
    /function viewerReturnLayoutRect\(index\) \{[\s\S]*?virtualPhotoLayoutForIndex\(index\)/,
  );
  /* 只读探测：不许顺手把格子造出来，否则会污染虚拟列表。 */
  assert.doesNotMatch(block, /\btileAt\(/);
  assert.doesNotMatch(block, /ensureVirtualPhotoTile\(/);

  assert.match(
    closeBlock(read("web/app.js")),
    /const returnTarget = createViewerReturnTarget\(lastItem, viewerIndex\);/,
  );
});

test("跟随用 transform 补偿，不改过渡终点，也不动既有缓动", () => {
  const app = read("web/app.js");
  const block = flightBlock(app);

  assert.match(
    block,
    /layer\.style\.transform =\s*`translate3d\(\$\{dx\.toFixed\(2\)\}px, \$\{dy\.toFixed\(2\)\}px, 0\)`;/,
  );
  /* 尺寸变了才重设终点，位移一律用补偿，避免每帧重新计时越追越慢。 */
  assert.match(
    block,
    /if \(Math\.abs\(scaleW - 1\) > 0\.01 \|\| Math\.abs\(scaleH - 1\) > 0\.01\) \{[\s\S]*?flight\.place\(layer, rect\);/,
  );
  /* 控制器不许去改过渡时长 / 缓动：落位手感要保持原样。 */
  assert.doesNotMatch(block, /transitionDuration/);
  assert.doesNotMatch(block, /transitionTimingFunction/);
  assert.doesNotMatch(block, /style\.transition\b/);

  /* 落位判定量的是含 transform 的实际位置，所以滚动中也判得准。 */
  assert.match(
    block,
    /const painted = flight\.layer\.getBoundingClientRect\(\);[\s\S]*?morphRectMatches\(painted, rect\)/,
  );

  /* CSS 里的两段缓动字面量原样保留。 */
  const css = read("web/styles.css");
  assert.match(
    css,
    /\.viewer-zoom-clone\.is-back \{[\s\S]*?width 0\.4s cubic-bezier\(0\.34, 1\.18, 0\.44, 1\)/,
  );
  assert.match(
    css,
    /\.viewer-zoom-clone \{[\s\S]*?width 0\.38s cubic-bezier\(0\.25, 0\.35, 0\.25, 1\)/,
  );
});

test("飞行期间原格子一直藏着，落位 / 取消 / 兜底都会把它还回来", () => {
  const app = read("web/app.js");
  const block = flightBlock(app);

  assert.match(
    block,
    /document\.body\.classList\.add\("viewer-returning"\);/,
  );
  assert.match(
    block,
    /function releaseViewerReturnSourceHold\(\) \{\s*const active = viewerReturnFlight;\s*viewerReturnFlight = null;\s*document\.body\.classList\.remove\("viewer-returning"\);\s*clearViewerSourceTile\(\);\s*viewerReturnFlight = active;\s*\}/,
  );
  /* 落位、就地淡出、被打断、超时兜底，四条出口都要解除。 */
  assert.equal(
    block.match(/releaseViewerReturnSourceHold\(\);/g)?.length ?? 0,
    4,
  );

  /* clearViewerSourceTile 在飞行中让位，改由每帧自愈维护，
     否则 220ms 的查看器隐藏定时器会闪出一帧双图。 */
  assert.match(
    app.slice(
      app.indexOf("function clearViewerSourceTile("),
      app.indexOf("function setPinnedHover("),
    ),
    /if \(viewerReturnFlight\) return;/,
  );
  assert.match(
    block,
    /function syncViewerReturnSourceTile\(target\) \{[\s\S]*?tile\.classList\.add\("is-viewer-source"\);/,
  );
  assert.match(block, /syncViewerReturnSourceTile\(flight\.target\);/);

  /* 重新打开查看器会打断关闭动画，飞行也要一起停。 */
  const cancel = app.slice(
    app.indexOf("function cancelViewerClose("),
    app.indexOf("let viewerFilmstripScrollFrame"),
  );
  assert.match(cancel, /cancelViewerReturnFlight\(\);/);
});

test("四条缩回路径都走同一个跟随控制器", () => {
  const close = closeBlock(read("web/app.js"));

  assert.equal(
    close.match(/beginViewerReturnFlight\(\{/g)?.length ?? 0,
    4,
    "视频状态层 / 视频快照 / 照片状态层 / 照片缩回，四条路径都要接上",
  );
  assert.equal(close.match(/target: returnTarget,/g)?.length ?? 0, 4);
  /* 状态层还要等内层把旋转缩放归零，才算真的落位。 */
  assert.equal(close.match(/extraSettled: \(\) => \{/g)?.length ?? 0, 2);
  /* 淡出的那 150ms 里继续跟随，残影才不会掉队。 */
  assert.equal(
    close.match(/lingerMs: VIEWER_RETURN_LINGER_MS,/g)?.length ?? 0,
    2,
  );

  /* 旧的一套「量一次终点 + 自己数帧」的 tick 已经全部收编。 */
  assert.doesNotMatch(close, /morphRectMatches\(\s*clone\.getBoundingClientRect\(\),\s*targetRect,?\s*\)/);
  assert.doesNotMatch(
    close,
    /morphRectMatches\(\s*stateClose\.wrapper\.getBoundingClientRect\(\),\s*stateClose\.targetRect,?\s*\)/,
  );
});

test("追不上时按 deadline 收尾，照片就地淡出而不是钉在旧位置", () => {
  const block = flightBlock(read("web/app.js"));

  assert.match(block, /const VIEWER_RETURN_DEADLINE_MS = 900;/);
  assert.match(block, /const VIEWER_RETURN_LINGER_MS = 170;/);
  assert.match(block, /const VIEWER_RETURN_SETTLE_FRAMES = 2;/);
  assert.match(
    block,
    /if \(now - flight\.startedAt > flight\.deadlineMs\) \{\s*finishViewerReturnFlight\(flight, false\);/,
  );
  /* 照片已从列表里消失（删除 / 换相簿）时也要收尾，不能让飞行层卡住。 */
  assert.match(
    block,
    /if \(!rect\) \{[\s\S]*?finishViewerReturnFlight\(flight, false\);/,
  );
  /* 连终点都找不到时不许把 viewer-returning 挂在 body 上不管。 */
  assert.match(
    block,
    /if \(!layer \|\| !initial\) \{\s*\/\*[\s\S]*?\*\/\s*releaseViewerReturnSourceHold\(\);\s*onFinish\?\.\(false, null, null\);/,
  );
  /* 另有 failsafe 定时器兜住 rAF 被节流的情况。 */
  assert.match(
    block,
    /flight\.failsafe = setTimeout\(\s*\(\) => finishViewerReturnFlight\(flight, false\),\s*deadlineMs \+ lingerMs \+ 240,\s*\);/,
  );
});

test("落位后进入 linger：只跟随、不再判定，淡出结束才真正收工", () => {
  const block = flightBlock(read("web/app.js"));

  assert.match(block, /if \(flight\.lingerUntil\) \{/);
  assert.match(
    block,
    /applyViewerReturnOffset\(flight, rect, \{ resize: false \}\);/,
  );
  assert.match(
    block,
    /if \(now >= flight\.lingerUntil\) finishViewerReturnFlight\(flight, true\);/,
  );
  /* onFinish 只能被通知一次：linger 结束时的收尾不许再回调一遍。 */
  assert.match(block, /if \(flight\.notified\) return;\s*flight\.notified = true;/);
});

test("飞回的照片只在内容区里露脸：目标出界或交接完成后按内容区裁切", () => {
  const block = flightBlock(read("web/app.js"));

  assert.match(block, /const VIEWER_RETURN_CLIP_AFTER_MS = 220;/);
  /* 裁切区域就是图库内容区：工具栏、标题栏、侧栏和底栏都盖在它上面。 */
  assert.match(
    block,
    /function viewerReturnClipInset\(flight, painted, targetRect, elapsed\) \{[\s\S]*?const box = content\.getBoundingClientRect\(\);/,
  );
  /* 目标格子被滚出内容区时立刻裁；否则等查看器交接完再裁，
     大图开场那一下仍允许压到内容区上沿。 */
  assert.match(
    block,
    /if \(!flight\.clipped && !targetOut && elapsed < VIEWER_RETURN_CLIP_AFTER_MS\)/,
  );
  assert.match(block, /flight\.clipped = true;/);
  /* 四边都从内容区往回量；整张都在区内时不挂 clip-path。 */
  assert.match(
    block,
    /return `inset\(\$\{top\.toFixed\(1\)\}px \$\{right\.toFixed\(1\)\}px \$\{bottom\.toFixed\(1\)\}px \$\{left\.toFixed\(1\)\}px\)`;/,
  );
  assert.match(
    block,
    /if \(flight\.layer\.style\.clipPath !== clip\) flight\.layer\.style\.clipPath = clip;/,
  );
  /* 落位判定复用同一次量框，不额外多读一次布局。 */
  assert.match(
    block,
    /const painted = flight\.layer\.getBoundingClientRect\(\);[\s\S]*?const aligned = morphRectMatches\(painted, rect\);/,
  );
  /* 主循环和淡出 linger 两个分支都要裁：定义 + 两处调用。 */
  assert.equal(block.match(/applyViewerReturnClip\(/g)?.length ?? 0, 3);
  assert.match(block, /done: false,\s*notified: false,\s*clipped: false,/);
});

test("点开照片的进场也守同一条规矩：裁切边从内容区滑到查看器边框", () => {
  const app = read("web/app.js");
  const block = app.slice(
    app.indexOf("const VIEWER_OPEN_CLIP_HANDOFF_MS"),
    app.indexOf("function cancelViewerReturnFlight("),
  );

  /* 与磨砂淡入同长：边界退场时图库刚好被完全盖住。 */
  assert.match(block, /const VIEWER_OPEN_CLIP_HANDOFF_MS = 200;/);
  assert.match(
    block,
    /function viewerOpenClipInset\(painted, elapsed\) \{[\s\S]*?const v = viewer\.getBoundingClientRect\(\);/,
  );
  /* 内容区不在或没尺寸时只守查看器边框，不能拿零矩形去裁。 */
  assert.match(block, /const c = \$\("#content"\)\?\.getBoundingClientRect\(\);/);
  assert.match(block, /if \(c && c\.width > 1 && c\.height > 1\) \{/);
  /* 四边连续插值：交接不跳一下。 */
  assert.match(block, /box\.top = c\.top \+ \(v\.top - c\.top\) \* e;/);
  assert.match(block, /box\.left = c\.left \+ \(v\.left - c\.left\) \* e;/);
  assert.match(
    block,
    /if \(layer\.style\.clipPath !== clip\) layer\.style\.clipPath = clip;/,
  );

  /* 照片 / 视频两条进场：挂上时同步裁一次首帧，tick 里逐帧跟进；
     加上定义本身共五处。 */
  assert.equal(app.match(/applyViewerOpenClip\(/g)?.length ?? 0, 5);
  assert.equal(
    app.match(
      /const painted = clone\.getBoundingClientRect\(\);\s*applyViewerOpenClip\(clone, painted, performance\.now\(\) - started\);\s*const settled = morphRectMatches\(painted, goal\);/g,
    )?.length ?? 0,
    2,
  );
  assert.equal(
    app.match(/applyViewerOpenClip\(clone, clone\.getBoundingClientRect\(\), 0\);/g)
      ?.length ?? 0,
    2,
  );
  /* 落位交接前把裁切摘掉，画面交给舞台里本来就被查看器裁着的原图 / 视频。 */
  assert.equal(app.match(/clone\.style\.clipPath = "";/g)?.length ?? 0, 2);
});
