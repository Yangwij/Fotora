"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");

const root = path.resolve(__dirname, "..");
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");
const { assertSafeClearTarget, clearDataDirectory } = require(
  path.join(root, "electron", "clear-data.js"),
);

test("清除所有数据入口位于常规设置最底部", () => {
  const dialog = read("web/settings-dialog.js");
  const general = dialog.slice(
    dialog.indexOf('id: "general"'),
    dialog.indexOf('id: "library"'),
  );

  assert.match(general, /title: "启动与关闭"/);
  assert.match(
    general,
    /title: "数据管理",[\s\S]*?type: "clear-data",\s*label: "清除所有数据"/,
  );
  assert.ok(
    general.lastIndexOf('title: "数据管理"') >
      general.lastIndexOf('title: "启动与关闭"'),
  );
  assert.match(
    general,
    /label: "清除所有数据",\s*description: CLEAR_DATA_ROW_DESCRIPTION,/,
  );
  assert.doesNotMatch(
    dialog.slice(
      dialog.indexOf('if (row.type === "clear-data")'),
      dialog.indexOf('if (row.type === "text")'),
    ),
    /ux-settings-row-label/,
  );
});

test("设置行只留一句短说明，详细文案交给确认面板", () => {
  const dialog = read("web/settings-dialog.js");
  const language = read("web/ui-language.js");
  const general = dialog.slice(
    dialog.indexOf('id: "general"'),
    dialog.indexOf('id: "library"'),
  );
  const confirmCopy = dialog.slice(
    dialog.indexOf("const CLEAR_DATA_CONFIRM_TITLE"),
    dialog.indexOf("const CLEAR_DATA_CONFIRM_ACTION"),
  );

  /* 设置行：一句话，不写目录、不写流程 */
  assert.match(
    dialog,
    /const CLEAR_DATA_ROW_DESCRIPTION =\s*"删除本机该应用的数据，不影响原始照片";/,
  );
  assert.doesNotMatch(general, /%LOCALAPPDATA%/);
  assert.doesNotMatch(general, /将删除图库索引/);

  /* 确认面板：删什么、留什么、之后会怎样，三段都在 */
  assert.match(
    confirmCopy,
    /const CLEAR_DATA_CONFIRM_TITLE = "清除 Fotora 的所有数据？";/,
  );
  assert.match(confirmCopy, /将删除图库索引、相簿、收藏、评分/);
  assert.match(
    confirmCopy,
    /编辑与裁剪、拍摄时间与位置修改、界面设置和缩略图缓存/,
  );
  assert.match(dialog, /const CLEAR_DATA_CONFIRM_ACTION = "确认";/);
  assert.match(confirmCopy, /不会删除图库源文件夹里的原始照片和视频/);
  assert.match(confirmCopy, /也不会删除已经导出的文件/);
  assert.match(confirmCopy, /确认后 Fotora 会退出并完成清除/);
  assert.match(confirmCopy, /此操作不可撤销/);

  /* 短说明与详细文案都有英文，长文案整段翻译并保留分行 */
  assert.match(
    language,
    /Deletes the app’s data on this computer\. Your original photos are not affected\./,
  );
  assert.match(
    language,
    /"清除 Fotora 的所有数据？": "Clear all Fotora data\?"/,
  );
  assert.match(language, /This deletes the library index/);
  assert.match(language, /capture time and location changes/);
  assert.match(language, /确认: "Confirm"/);
  assert.match(
    language,
    /Fotora quits once you confirm and finishes clearing the data/,
  );
  assert.match(
    language,
    /Original photos and videos in your library source folders are not deleted/,
  );
  assert.match(language, /暂时无法清除数据: "Can’t clear data right now"/);
  assert.match(language, /知道了: "Got it"/);
  assert.doesNotMatch(language, /app data folder \(by default/);
});

test("清除入口复用移出图库那张确认面板", () => {
  const dialog = read("web/settings-dialog.js");
  const app = read("web/app.js");
  const settingsCss = read("web/settings-dialog.css");
  const styles = read("web/styles.css");
  const removeCall = app.slice(
    app.indexOf("title: `从 Fotora 中移除"),
    app.indexOf("const removedActive ="),
  );

  /* 同一个组件、同一套参数：标题问句 + 正文说明 + 次要信息 + 危险动作，居中 */
  assert.match(
    dialog,
    /askConfirm\(button, \{\s*title: CLEAR_DATA_CONFIRM_TITLE,\s*message: CLEAR_DATA_CONFIRM_MESSAGE,\s*note,\s*actionText: CLEAR_DATA_CONFIRM_ACTION,\s*centered: true,\s*wide: true,\s*\}\);/,
  );
  assert.match(removeCall, /centered: true,/);
  assert.match(dialog, /if \(!\(await confirmed\)\) return;/);
  assert.match(dialog, /await window\.albumWindow\.clearAllData\(\)/);

  /* 确认面板里的次要信息写出真实数据目录，和移除面板写文件夹路径同一做法 */
  assert.match(dialog, /window\.albumWindow\?\.getDataDir\?\.\(\)/);
  assert.match(dialog, /return folder \? `文件夹：\$\{folder\}` : "";/);

  /* 设置弹窗是 90，确认面板必须抬到它上面，否则被压在毛玻璃底下 */
  assert.match(settingsCss, /\.ux-settings-open \.ask \{\s*z-index: 96;\s*\}/);

  /* 确认面板开着时，设置弹窗自己也要被压暗 + 模糊到和最低层同一程度 */
  assert.match(
    settingsCss,
    /\.ux-settings-open \.ask-dim \{\s*background: rgba\(12, 12, 15, 0\.34\);\s*-webkit-backdrop-filter: blur\(8px\);\s*backdrop-filter: blur\(8px\);\s*\}/,
  );

  /* 长文案面板加宽一档：每段最多两行，末行不吊单字 */
  assert.match(
    app,
    /card\.style\.width = `\$\{Math\.min\(askWide \? 420 : 354, available\)\}px`;/,
  );
  assert.match(dialog, /centered: true,\s*wide: true,/);
  assert.match(styles, /\.ask-msg \{[\s\S]*?text-wrap: pretty;/);
  assert.match(styles, /\.ask-note \{[\s\S]*?text-wrap: pretty;/);
  assert.match(
    styles,
    /\.ask-card\.is-alert \.ask-msg \{\s*text-wrap: balance;\s*\}/,
  );

  /* 焦点进面板、收掉后交回设置行；askConfirm 自己不动焦点 */
  assert.match(dialog, /focusAskAction\("askCancel"\)/);
  assert.match(dialog, /button\.focus\(\{ preventScroll: true \}\)/);
  assert.doesNotMatch(
    app.slice(
      app.indexOf("function askConfirm("),
      app.indexOf('$("#ask").addEventListener'),
    ),
    /\.focus\(/,
  );

  /* 面板还开着时不该重复触发，也不该让按钮显出忙碌态 */
  assert.match(dialog, /if \(clearDataBusy\) return;/);
  assert.match(
    dialog,
    /if \(!\(await confirmed\)\) return;\s*button\.disabled = true;\s*button\.setAttribute\("aria-busy", "true"\);/,
  );
});

test("主进程不再弹原生对话框，只负责执行与回报原因", () => {
  const preload = read("electron/preload.js");
  const main = read("electron/main.js");
  const handlerStart = main.indexOf('ipcMain.handle("settings:clear-all-data"');
  const handler = main.slice(
    handlerStart,
    main.indexOf("clearAllDataPending = true;", handlerStart),
  );

  assert.match(
    preload,
    /clearAllData: \(\) => ipcRenderer\.invoke\("settings:clear-all-data"\)/,
  );
  assert.match(
    preload,
    /getDataDir: \(\) => ipcRenderer\.invoke\("settings:data-dir"\)/,
  );
  assert.match(main, /ipcMain\.handle\("settings:data-dir", \(\) => baseDir\)/);

  /* 确认与告知都走界面内面板，主进程里不再有原生弹窗 */
  assert.ok(handler.length > 0);
  assert.doesNotMatch(main, /showClearAllDataConfirmation/);
  assert.doesNotMatch(handler, /dialog\.showMessageBox|dialog\.showErrorBox/);

  /* 正在清除、正在导出、清除失败都把原因回给界面 */
  assert.match(
    handler,
    /if \(clearAllDataPending\) \{\s*return \{\s*ok: false,\s*error:/,
  );
  assert.match(
    handler,
    /if \(activeExport\) \{\s*return \{\s*ok: false,\s*error:/,
  );
  assert.match(handler, /ok: false,\s*error: localizedText\(/);

  /* 确认后留标记、关服务、退出，不安排重启；下次启动见标记先清除 */
  assert.match(
    main,
    /fs\.writeFileSync\(\s*path\.join\(baseDir, CLEAR_DATA_MARKER\),[\s\S]*?shutdown\(\)[\s\S]*?app\.quit\(\)/,
  );
  assert.match(
    main,
    /fs\.existsSync\(path\.join\(baseDir, CLEAR_DATA_MARKER\)\)[\s\S]*?clearDataDirectory\(baseDir,/,
  );
  assert.doesNotMatch(handler, /app\.relaunch|restarting: true/);
});

test("无法清除时用同一张面板的告知样式说明原因", () => {
  const dialog = read("web/settings-dialog.js");
  const app = read("web/app.js");
  const styles = read("web/styles.css");

  assert.match(dialog, /result\?\.ok === false && result\.error/);
  assert.match(
    dialog,
    /title: CLEAR_DATA_BLOCKED_TITLE,\s*message: String\(result\.error\),\s*actionText: CLEAR_DATA_BLOCKED_ACTION,\s*centered: true,\s*alert: true,/,
  );
  assert.match(dialog, /focusAskAction\("askOk"\)/);

  /* 告知模式只收一个动作，仍用同一张卡片，颜色回到中性 */
  assert.match(
    app,
    /\{\s*title,\s*message,\s*note = "",\s*actionText,\s*centered = false,\s*alert = false,\s*wide = false,\s*\}/,
  );
  assert.match(
    app,
    /card\.classList\.toggle\("is-alert", alert\);\s*\$\("#askCancel"\)\.hidden = alert;/,
  );
  assert.match(
    app,
    /querySelectorAll\(\s*"button:not\(:disabled\):not\(\[hidden\]\)",?\s*\)/,
  );
  assert.match(
    styles,
    /\.ask-card\.is-alert \.ask-actions \{\s*grid-template-columns: 1fr;\s*\}/,
  );
  assert.match(
    styles,
    /\.ask-card\.is-alert \.ask-confirm \{\s*color: var\(--text-2\);/,
  );
  /* 多行详细文案靠排版分行，不是挤成一坨 */
  assert.match(styles, /\.ask-msg \{[\s\S]*?white-space: pre-line;/);
  assert.match(styles, /\.ask-note \{[\s\S]*?white-space: pre-line;/);
});

test("清除数据保护磁盘根目录以及用户、应用等父目录", () => {
  const target = path.join(root, "test-fotora-data");
  const protectedPaths = [
    root,
    process.env.LOCALAPPDATA || path.parse(root).root,
    process.env.USERPROFILE || root,
  ];

  assert.equal(assertSafeClearTarget(target, protectedPaths), target);
  assert.throws(
    () => assertSafeClearTarget(path.parse(root).root, protectedPaths),
    /清除目标无效/,
  );
  assert.throws(
    () => assertSafeClearTarget(root, protectedPaths),
    /包含受保护目录/,
  );
});

test("清除数据会删除所选目录及其全部内容", () => {
  const target = fs.mkdtempSync(
    path.join(os.tmpdir(), "fotora-clear-data-test-"),
  );
  fs.mkdirSync(path.join(target, "nested"));
  fs.writeFileSync(path.join(target, "nested", "cache.bin"), "cache");

  const result = clearDataDirectory(target, [
    path.parse(target).root,
    os.homedir(),
  ]);

  assert.equal(result.removed, true);
  assert.equal(fs.existsSync(target), false);
});
