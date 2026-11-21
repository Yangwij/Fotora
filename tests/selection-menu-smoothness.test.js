"use strict";

/* 选择模式跳闪修复（选择栏浮层化）+ 主菜单子菜单收合平滑。 */

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const root = path.join(__dirname, "..");
const read = (file) => fs.readFileSync(path.join(root, "web", file), "utf8");

test("选择栏是浮层，伸缩不改变内容区高度，消除选择/全选/取消跳闪", () => {
  const css = read("styles.css");
  const selbar = css.slice(
    css.indexOf(".selbar {"),
    css.indexOf(".selbar[hidden] {"),
  );
  /* 绝对定位浮层：内容区高度恒定，窗口网格不会被反复重同步。 */
  assert.match(selbar, /position: absolute;/);
  assert.match(selbar, /bottom: 0;/);
  /* 用 transform 滑入滑出，不再动画 height（那会挤占内容高度）。 */
  assert.match(selbar, /transition:\s*transform/);
  assert.doesNotMatch(selbar, /height 0\.22s/);

  const collapsed = css.slice(
    css.indexOf(".selbar.is-collapsed {"),
    css.indexOf(".selbar-count {"),
  );
  assert.match(collapsed, /transform: translateY\(100%\);/);
  assert.doesNotMatch(collapsed, /height: 0;/);
});

test("选择态复用缓存视图不重建网格，消除选择/全选照片区域闪动", () => {
  const app = read("app.js");
  /* ordinaryContentView 的「需重建」条件不再包含 state.select：
     选择态不改变网格结构，应复用缓存，避免整片图片重载闪动。 */
  const fn = app.slice(
    app.indexOf("function ordinaryContentView()"),
    app.indexOf("function trimContentCache("),
  );
  assert.match(
    fn,
    /state\.copyTarget \|\|\s*state\.edit \|\|\s*state\.filmstrip/,
  );
  assert.doesNotMatch(fn, /state\.select \|\|/);
  /* 复用后统一刷新勾选类，保证缓存视图选择态正确。 */
  assert.match(app, /function syncGridSelectionClasses\(\)/);
  assert.match(
    app,
    /"select-mode",\s*state\.select && !state\.copyTarget,\s*\);[\s\S]*?syncGridSelectionClasses\(\);/,
  );
  /* 同一视图只切换外壳和勾选类，不再重跑照片布局与观察器。 */
  assert.match(
    app,
    /if \(!reusedContentView\) \{\s*if \(filmstripVisible\) syncFilmstripView\(\);\s*else applyPhotoGridLayouts\(\);\s*\}/,
  );
  assert.match(
    app,
    /if \(!reusedContentView\) \{\s*observeGalleryImageTiles\(photoLayoutGrids\(\)\);\s*scheduleProgressivePhotoGridFill\(\);\s*\}/,
  );
});

test("照片修改后重新对齐内容缓存，再进入选择不重建网格", () => {
  const app = read("app.js");
  const refresh = app.slice(
    app.indexOf("function refreshItemsInPlace("),
    app.indexOf("function applyRatingState("),
  );
  const rating = app.slice(
    app.indexOf("function applyRatingState("),
    app.indexOf("async function saveItemRating("),
  );
  const editor = app.slice(
    app.indexOf("async function refreshViewerAfterEdit("),
    app.indexOf("async function openPhotoEditor("),
  );

  for (const source of [refresh, rating, editor]) {
    assert.match(source, /rebaseRenderedContentViewAfterMetadataUpdate\(\);/);
  }
  assert.doesNotMatch(
    refresh,
    /rebaseRenderedContentViewAfterMetadataUpdate\(\);[\s\S]*?render\(\);/,
  );
});

test("进入选择只同步选择态外壳，不重跑照片界面", () => {
  const app = read("app.js");
  const enter = app.slice(
    app.indexOf("function syncSelectionEntryChrome()"),
    app.indexOf("function enterSelection("),
  );
  const selection = app.slice(
    app.indexOf("function enterSelection("),
    app.indexOf("function toggleSelectAll("),
  );

  assert.match(enter, /syncToolbarForState\(ctx\);/);
  assert.match(enter, /syncGridSelectionClasses\(\);/);
  assert.match(enter, /syncSelectionBar\(\);/);
  assert.match(
    selection,
    /const reusePhotoSurface = Boolean\([\s\S]*?"#content \.photo-grid"[\s\S]*?if \(reusePhotoSurface\) \{\s*syncSelectionEntryChrome\(\);/,
  );
  assert.doesNotMatch(selection, /state\.cursor = focusIndex;\s*render\(\);/);
});

test("删除照片先连续补位，再由接口结果校准", () => {
  const app = read("app.js");
  const trash = app.slice(
    app.indexOf("async function trashSelected("),
    app.indexOf('$("#trashSelBtn").addEventListener("click", trashSelected)'),
  );
  const commit = app.slice(
    app.indexOf("function commitOptimisticPhotoRemoval("),
    app.indexOf("/* 删除选中的照片 / 视频"),
  );
  const ghost = app.slice(
    app.indexOf("function detachPhotoDeleteGhosts("),
    app.indexOf("function cancelPhotoDeleteGhosts("),
  );
  const styles = read("styles.css");

  assert.match(
    trash,
    /const beforeLayout = providedBeforeLayout \|\| capturePhotoLayout\(\);/,
  );
  assert.match(trash, /const previousItemIds = state\.items\.map/);
  assert.ok(
    trash.indexOf("const request = api(") <
      trash.indexOf("commitOptimisticPhotoRemoval("),
  );
  assert.match(
    trash,
    /ghosts = commitOptimisticPhotoRemoval\([\s\S]*?const res = await request;/,
  );
  assert.match(commit, /detachPhotoDeleteGhosts\(beforeLayout, items\);/);
  assert.match(commit, /removeItemsFromCurrentCollection\(items\);/);
  assert.match(
    ghost,
    /ghost\.append\(tile\);\s*document\.body\.append\(ghost\);/,
  );
  assert.match(
    styles,
    /\.photo-delete-ghost \{[\s\S]*?position: fixed;[\s\S]*?pointer-events: none;/,
  );
  assert.match(
    commit,
    /reconcileDeletedPhotoItems\(beforeLayout, previousItemIds\);/,
  );
  assert.doesNotMatch(
    commit,
    /render\(\);\s*animatePhotoReflow\(beforeLayout\);/,
  );
  assert.match(
    trash,
    /failedCount \|\| trashedCount < ids\.length[\s\S]*?await reloadActiveCollection\(\);/,
  );
  const reconcile = app.slice(
    app.indexOf("function reconcileDeletedPhotoItems("),
    app.indexOf("function animatePhotoReflow("),
  );
  assert.doesNotMatch(reconcile, /render\(/);
  assert.match(
    reconcile,
    /grid\.dataset\.windowIndices = nextIndices\.join\(","\);/,
  );
});

test("普通选择轻微下沉，批量编号保持原尺寸", () => {
  const css = read("styles.css");
  assert.match(
    css,
    /\.photo-grid \.tile\.is-selected \{\s*transform: scale\(0\.97\);/,
  );
  assert.match(
    css,
    /#content\.numbering-mode \.photo-grid \.tile,[\s\S]*?#content\.numbering-mode \.photo-grid \.tile:active \{\s*transform: none;/,
  );
  assert.match(
    css,
    /\.photo-grid \.tile\.is-selected \.tile-check \{[\s\S]*?animation: tile-check-fade/,
  );
  const app = read("app.js");
  assert.match(
    app,
    /classList\.toggle\(\s*"numbering-mode",\s*state\.select && !state\.copyTarget && Boolean\(numberingSession\),\s*\)/,
  );
  assert.match(
    app,
    /content\.classList\.toggle\(\s*"numbering-mode",\s*selecting && Boolean\(numberingSession\),\s*\)/,
  );
});

test("批量编号不显示多选项目菜单入口", () => {
  const app = read("app.js");
  const sync = app.slice(
    app.indexOf("function syncSelectionMenuButton("),
    app.indexOf("function toolbarContext("),
  );

  assert.match(
    sync,
    /const shouldShow =\s*state\.select &&\s*!state\.copyTarget &&\s*!isTrash &&\s*!numberingSession &&\s*state\.selected\.size > 0;/,
  );
});

test("移动只在具体相簿的选择模式中出现", () => {
  const app = read("app.js");
  const helper = app.slice(
    app.indexOf("function selectionCanMoveToAlbum()"),
    app.indexOf("/* 底栏：一件没选的时候"),
  );
  const sync = app.slice(
    app.indexOf("function syncSelbar()"),
    app.indexOf("function syncSelbarRovingFocus("),
  );
  const picker = app.slice(
    app.indexOf("function openPicker()"),
    app.indexOf("function cancelPickerAnims()"),
  );

  assert.match(helper, /typeof state\.activeId === "number"/);
  assert.match(helper, /album && !isUnfiledAlbum\(album\)/);
  assert.match(sync, /const canMove = selectionCanMoveToAlbum\(\);/);
  assert.match(
    sync,
    /\$\("#shareBtn"\)\.hidden = trash \|\| numbering \|\| !canMove;/,
  );
  assert.match(
    picker,
    /if \(!selectionCanMoveToAlbum\(\)\) return;[\s\S]*?const items = selectedItems\(\);/,
  );

  const canMoveFor = new Function(
    "state",
    "albumById",
    "isUnfiledAlbum",
    `${helper}\nreturn selectionCanMoveToAlbum;`,
  );
  const albumById = (id) => ({ id, name: "旅行" });
  assert.equal(canMoveFor({ activeId: 7 }, albumById, () => false)(), true);
  assert.equal(
    canMoveFor({ activeId: "library" }, albumById, () => false)(),
    false,
  );
  assert.equal(
    canMoveFor(
      { activeId: 1 },
      (id) => ({ id, name: "未归档" }),
      () => true,
    )(),
    false,
  );
});

test("移动到其他相簿时与删除一样立即退场并连续补位", () => {
  const app = read("app.js");
  const move = app.slice(
    app.indexOf("async function moveSelectedTo("),
    app.indexOf("let copyTargetScrollTop = 0;"),
  );

  assert.match(move, /const request = api\("\/api\/items\/move"/);
  assert.match(
    move,
    /if \(movingSelected\) \{\s*toast\("正在移动到相簿，请稍候"\);\s*return;/,
  );
  assert.match(
    move,
    /Number\(state\.activeId\) === Number\(albumId\)[\s\S]*?return;/,
  );
  assert.match(move, /finally \{\s*movingSelected = false;/);
  assert.match(
    move,
    /ghosts = commitOptimisticPhotoRemoval\(\s*items,\s*beforeLayout,\s*previousItemIds,\s*scrollTop,\s*\);/,
  );
  assert.ok(
    move.indexOf("const request = api(") <
      move.indexOf("ghosts = commitOptimisticPhotoRemoval("),
  );
  assert.match(
    move,
    /restorePhotoRemovalSnapshot\(snapshot, ghosts, scrollTop\);/,
  );
  assert.doesNotMatch(
    move,
    /const res = await request;[\s\S]*?render\(\);\s*animatePhotoReflow\(beforeLayout\);/,
  );
});

test("右上角菜单移出相簿与删除使用同一套即时补位流程", () => {
  const app = read("app.js");
  const remove = app.slice(
    app.indexOf("async function removeSelectedFromAlbum("),
    app.indexOf("/* ---------------------- 按顺序编号"),
  );

  assert.match(
    app,
    /if \(label === "移出相簿"\) \{[\s\S]*?removeSelectedFromAlbum\(actionItems\);/,
  );
  assert.match(
    remove,
    /if \(removingFromAlbum\) \{\s*toast\("正在移出相簿，请稍候"\);\s*return;/,
  );
  assert.match(
    remove,
    /providedAlbumId == null \? null : Number\(providedAlbumId\)/,
  );
  assert.doesNotMatch(remove, /Number\.isInteger\(Number\(providedAlbumId\)\)/);
  assert.match(
    remove,
    /const request = api\(`\/api\/albums\/\$\{albumId\}\/remove-items`/,
  );
  assert.match(
    remove,
    /ghosts = commitOptimisticPhotoRemoval\(\s*items,\s*beforeLayout,\s*previousItemIds,\s*scrollTop,\s*\);/,
  );
  assert.ok(
    remove.indexOf("const request = api(") <
      remove.indexOf("ghosts = commitOptimisticPhotoRemoval("),
  );
  assert.match(
    remove,
    /if \(!removeSucceeded\) \{\s*restorePhotoRemovalSnapshot\(snapshot, ghosts, scrollTop\);/,
  );
});

test("右上角多选菜单锁定打开时的照片快照并稳定按网格顺序执行", () => {
  const app = read("app.js");
  const orderSource = app.slice(
    app.indexOf("const selectedItemsInViewOrder ="),
    app.indexOf("/* 选中的照片写进系统剪贴板"),
  );
  const pickerViewOrder = new Function(
    "state",
    `${orderSource}\nreturn selectedItemsInViewOrder;`,
  );
  const items = [{ id: 10 }, { id: 20 }, { id: 30 }];
  assert.deepEqual(
    pickerViewOrder({ items, selected: new Set([2, 0]) })().map(
      (item) => item.id,
    ),
    [10, 30],
  );

  const open = app.slice(
    app.indexOf("function openMenu("),
    app.indexOf("function cancelMenuAnims("),
  );
  const action = app.slice(
    app.indexOf('$("#popMenu").addEventListener("click"'),
    app.indexOf('$("#popoverShield").addEventListener("click"'),
  );

  assert.match(
    open,
    /selectionMenuItems =\s*kind === "photos" \? selectedItemsInViewOrder\(\) : \[\];/,
  );
  assert.match(
    action,
    /const actionItems =\s*menuKind === "photos" && selectionMenuItems\.length\s*\? selectionMenuItems\s*:\s*selectedItemsInViewOrder\(\);/,
  );
  for (const call of [
    "favoriteSelectedItems(actionItems)",
    "copySelectedItems(actionItems)",
    "exportSelectedItems(actionItems)",
    "removeSelectedFromAlbum(actionItems)",
  ]) {
    assert.ok(action.includes(call), `${call} should use the menu snapshot`);
  }
});

test("收藏与拷贝完成后给出可见回执", () => {
  const app = read("app.js");
  const favorite = app.slice(
    app.indexOf("async function favoriteSelectedItems("),
    app.indexOf("let ratingInFlight = false;"),
  );
  const copy = app.slice(
    app.indexOf("async function copySelectedItems("),
    app.indexOf("let exportInFlight = false;"),
  );

  assert.match(favorite, /toast\(\s*makeFavorite/);
  assert.match(favorite, /已收藏 \$\{items\.length\} 个项目/);
  assert.match(favorite, /已取消收藏 \$\{items\.length\} 个项目/);
  assert.match(copy, /toast\(/);
  assert.match(copy, /已拷贝 \$\{copiedCount\} 个项目/);
  assert.match(copy, /const menuClosed = closeMenu\(\);/);
  assert.match(
    copy,
    /await menuClosed;[\s\S]*?await exitSelection\(\{\s*reuseGrid: true,?\s*\}\);/,
  );
  assert.doesNotMatch(copy, /\brender\(\);/);
});

test("导出成功后等菜单收起并原地退出选择态", () => {
  const app = read("app.js");
  const exportItems = app.slice(
    app.indexOf("async function exportSelectedItems("),
    app.indexOf("const selectedTrashAlbumIds ="),
  );

  assert.match(exportItems, /const menuClosed = closeMenu\(\);/);
  assert.match(
    exportItems,
    /await menuClosed;[\s\S]*?await exitSelection\(\{\s*reuseGrid: true,?\s*\}\);/,
  );
  assert.doesNotMatch(exportItems, /\bexitSelection\(\);/);
});

test("选择后收藏只更新心形与收藏计数，不重建网格", () => {
  const app = read("app.js");
  const favorite = app.slice(
    app.indexOf("async function favoriteItems("),
    app.indexOf("async function favoriteSelectedItems("),
  );
  const syncTile = app.slice(
    app.indexOf("function syncFavoriteTileState("),
    app.indexOf("async function saveFavorite("),
  );

  assert.match(syncTile, /tile\.classList\.toggle\("is-favorite", favorite\)/);
  assert.match(syncTile, /heart\.innerHTML = ICON_FAVORITES/);
  assert.doesNotMatch(syncTile, /replaceWith|innerHTML = itemTile/);
  assert.match(
    favorite,
    /syncFavoriteTileState\(id, makeFavorite\);[\s\S]*?rebaseRenderedContentViewAfterMetadataUpdate\(\);[\s\S]*?renderSidebar\(\);/,
  );
  assert.match(
    favorite,
    /const beforeLayout = removingFromFavorites \? capturePhotoLayout\(\) : null;/,
  );
  assert.match(
    favorite,
    /commitOptimisticPhotoRemoval\(\s*removedItems,\s*beforeLayout,\s*previousItemIds,\s*scrollTop,\s*\)/,
  );
  assert.doesNotMatch(favorite, /\brender\(\);/);
});

test("Ctrl 右键删除直接进入原地删除，不闪选择模式", () => {
  const app = read("app.js");
  const action = app.slice(
    app.indexOf("function runContextAction("),
    app.indexOf("async function ensureProgressiveTileRendered("),
  );
  const removeBranch =
    action.match(/if \(action === "delete"\) \{([\s\S]*?)\n  \}/)?.[1] || "";
  const trash = app.slice(
    app.indexOf("async function trashSelected("),
    app.indexOf('$("#trashSelBtn").addEventListener("click", trashSelected)'),
  );

  assert.match(
    removeBranch,
    /void trashSelected\(\[item\], \{ beforeLayout \}\);/,
  );
  assert.doesNotMatch(removeBranch, /prepareContextSelection/);
  assert.match(
    trash,
    /Array\.isArray\(itemsOverride\)[\s\S]*?: selectedItems\(\);/,
  );
});

test("选择菜单和调整设备卡片使用对齐的圆角控件", () => {
  const app = read("app.js");
  const css = read("styles.css");
  const content = app.slice(
    app.indexOf("function animateMenuContent("),
    app.indexOf("function collapseMenuSubmenuFirst("),
  );
  const camera = app.slice(
    app.indexOf("function syncCameraDeviceDraftUI("),
    app.indexOf("function albumTypeOptionsHTML("),
  );

  assert.match(camera, /group\.classList\.add\("has-camera-actions"\)/);
  assert.doesNotMatch(camera, /anchor\.querySelectorAll\(":scope > svg"\)/);
  assert.doesNotMatch(camera, /data-camera-cancel/);
  assert.match(
    camera,
    /--menu-camera-anchor-center[\s\S]*?anchor\.offsetHeight \/ 2/,
  );
  assert.match(camera, /group\.classList\.toggle\(\s*"has-camera-draft"/);
  assert.match(
    content,
    /\(albumOptions && !editingInline && !editingDate\) \|\|\s*albumSubmenu === "cameraDevice"/,
  );
  assert.doesNotMatch(css, /#popMenu\.is-selection\s*\{[^}]*width:/);
  assert.match(
    css,
    /\.menu-camera-anchor-actions \{\s*position: absolute;\s*top: var\(--menu-camera-anchor-center, 21px\);\s*right: 16px;/,
  );
  assert.match(
    css,
    /\.menu-camera-anchor-action \{[\s\S]*?width: 26px;[\s\S]*?height: 26px;[\s\S]*?border-radius: 50%;[\s\S]*?background: transparent;[\s\S]*?box-shadow: none;/,
  );
  assert.match(
    css,
    /\.menu-camera-anchor-action:hover,\s*\.menu-camera-anchor-action:focus-visible \{\s*background: var\(--accent-hover\);/,
  );
  assert.match(
    css,
    /\.has-camera-actions[\s\S]*?> \.menu-row\s+> svg \{\s*opacity: 0;\s*transform: scale\(0\.78\);/,
  );
  assert.match(
    css,
    /#popMenu\.is-selection\.has-submenu-expanded \{\s*transform: scale\(0\.98\);/,
  );
  assert.match(
    css,
    /#popMenu\.is-selection\.has-submenu-expanded \.menu-submenu-group\.is-expanded \{\s*transform: scale\(1\.0408163265\);/,
  );
  assert.match(
    css,
    /\.menu-camera-device-option \{[\s\S]*?flex-direction: column;[\s\S]*?align-items: flex-start;/,
  );
  assert.match(
    css,
    /\.menu-camera-device-lens \{[\s\S]*?width: 100%;[\s\S]*?text-align: left;/,
  );
});

test("再次点击调整设备只收回设备卡片", () => {
  const app = read("app.js");
  const click = app.slice(
    app.indexOf('$("#popMenu").addEventListener("click"'),
    app.indexOf('$("#popoverShield").addEventListener("click"'),
  );
  const back = click.slice(
    click.indexOf("const back ="),
    click.indexOf("const filterRow"),
  );

  assert.doesNotMatch(click, /data-camera-cancel/);
  assert.match(
    back,
    /const cameraDeviceBack =\s*back && menuKind === "photos" && albumSubmenu === "cameraDevice";/,
  );
  assert.match(back, /if \(back && \(albumOptions \|\| cameraDeviceBack\)\)/);
  assert.match(back, /cameraDeviceDraftActive = false;/);
  assert.match(back, /animateMenuContent\(menuKind\);/);
});

test("文件编号和时间编号完成后都用旧布局连续补位", () => {
  const app = read("app.js");
  const numbering = app.slice(
    app.indexOf("async function applyNumberingSession("),
    app.indexOf("/* 选择模式 / 照片样式 / 菜单 */"),
  );

  assert.equal(
    (numbering.match(/const beforeLayout = capturePhotoLayout\(\);/g) || [])
      .length,
    2,
  );
  assert.equal(
    (
      numbering.match(
        /renderPhotoOrderingChange\(beforeLayout, \{ scrollTop \}\)/g,
      ) || []
    ).length,
    2,
  );
  assert.match(
    numbering,
    /rename-numbered[\s\S]*?const beforeLayout = capturePhotoLayout\(\);[\s\S]*?renderPhotoOrderingChange\(beforeLayout, \{ scrollTop \}\)/,
  );
  assert.match(
    numbering,
    /number-times[\s\S]*?const beforeLayout = capturePhotoLayout\(\);[\s\S]*?renderPhotoOrderingChange\(beforeLayout, \{ scrollTop \}\)/,
  );
  assert.doesNotMatch(
    numbering,
    /await reloadActiveCollection\(\);\s*render\(\);/,
  );
});
