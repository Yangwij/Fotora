const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const root = path.join(__dirname, "..");
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");

test("界面语言只由已保存设置决定，不再接受 URL 强制英文", () => {
  const page = read("web/index.html");
  const app = read("web/app.js");

  assert.doesNotMatch(
    page,
    /URLSearchParams\(window\.location\.search\).*font/s,
  );
  assert.doesNotMatch(app, /searchParams\.get\("font"\)/);
  assert.match(
    page,
    /document\.documentElement\.dataset\.uiLanguage\s*=\s*fontTheme === "anthropic" \? "en" : "zh-CN"/,
  );
});

test("英文界面所有文字和数字使用 Source Serif 4", () => {
  const css = read("web/theme-palettes.css");

  assert.match(
    css,
    /:root\[data-font-theme="anthropic"\] body \*[\s\S]*?"Fotora Source Serif"[\s\S]*?!important/,
  );
});

test("英文主菜单与选择菜单共用加宽尺寸", () => {
  const styles = read("web/styles.css");
  const settings = read("web/settings-dialog.css");
  const settingsScript = read("web/settings-dialog.js");

  assert.match(
    styles,
    /:root\[data-font-theme="anthropic"\] \.popmenu\s*\{[\s\S]*?min\(280px, calc\(100vw - 20px\)\)/,
  );
  assert.match(
    settings,
    /:root\[data-font-theme="anthropic"\] \.ux-settings-dialog\s*\{[\s\S]*?min\(920px/,
  );
  assert.match(
    settingsScript,
    /const pageWidth = Math\.max\(\s*268,\s*Math\.min\(540, Math\.max\(\.\.\.regularWidths\)\),?\s*\)/,
  );
  assert.match(settingsScript, /key: "photoWallDefaultKind",\s*wide: true,/);
  assert.match(
    settingsScript,
    /data-ux-wide="\$\{row\.wide === true \? "true" : "false"\}"[\s\S]*?segmented\.dataset\.uxWide === "true"[\s\S]*?Math\.max\(pageWidth, Math\.min\(540, width\)\)/,
  );
  assert.match(
    settingsScript,
    /measurer\.style\.fontWeight = "600"[\s\S]*?window\.FotoraLanguage\?\.translateValue\?\.\([\s\S]*?measurer\.getBoundingClientRect\(\)\.width/,
  );
  assert.match(read("web/ui-language.js"), /照片墙与幻灯片: "Photo Wall"/);
});

test("地图跳过界面翻译并维持中文与苹方字体", () => {
  const language = read("web/ui-language.js");
  const bridge = read("web/theme-bridge.js");
  const map = read("web/map/map.js");
  const locations = read("web/map/locations.js");
  const albumMap = read("web/map/album-map.js");

  assert.match(
    language,
    /window\.location\.pathname\.startsWith\("\/map\/"\)[\s\S]*?mapLanguage = "zh-CN"[\s\S]*?getLanguage: \(\) => mapLanguage/,
  );
  assert.match(
    bridge,
    /const preserveMapLanguage = window\.location\.pathname\.startsWith\("\/map\/"\)/,
  );
  assert.match(bridge, /const next = preserveMapLanguage\s*\?\s*"pingfang"/);
  assert.match(
    map,
    /Search for place[\s\S]*?Offline mode · Local world map only/,
  );
  assert.match(map, /搜索地点或输入地址[\s\S]*?离线模式 · 仅本地世界底图/);
  for (const source of [locations, albumMap]) {
    assert.match(source, /"Search for place"[\s\S]*?: "搜索地点"/);
    assert.match(source, /syncSearchLanguage/);
  }
});

test("Electron 原生可见入口跟随界面语言", () => {
  const main = read("electron/main.js");

  assert.match(
    main,
    /function usesEnglishInterface\(settings = readSettingsFile\(\)\)/,
  );
  assert.match(main, /localizedText\("重新启动", "Restart"\)/);
  assert.match(
    main,
    /localizedText\("选择导出位置", "Choose Export Destination"\)/,
  );
  assert.match(
    main,
    /localizedText\(\s*"选择照片库根文件夹[^"]+",\s*"Choose Library Folder"/,
  );
});

test("时间分组使用完整英文日期而不是中文年月日", () => {
  const app = read("web/app.js");
  const slideshow = read("web/slideshow.js");

  assert.match(
    app,
    /if \(uiLanguageIsEnglish\(\)\)[\s\S]*?EN_MONTH_YEAR_FORMAT\.format\(date\)[\s\S]*?EN_LONG_DATE_FORMAT\.format\(date\)/,
  );
  assert.match(app, /Saturday|weekday: "long"/);
  assert.match(
    slideshow,
    /if \(isEnglishUI\(\)\) return EN_DAY_FORMAT\.format\(date\)/,
  );
});

test("图库选择弹窗在英文模式下使用完整英文标题", () => {
  const page = read("web/index.html");
  const app = read("web/app.js");

  assert.match(page, /library-picker-title-prefix/);
  assert.match(page, /library-picker-title-suffix/);
  assert.match(app, /uiLanguageIsEnglish\(\) \? "Add Items from " : "从 "/);
  assert.match(app, /This is the only album in the library\./);
});

test("可见菜单、编辑器与照片墙文案包含英文映射", () => {
  const language = read("web/ui-language.js");

  for (const pair of [
    ["胶片预览", "Filmstrip Preview"],
    ["布局调整", "Photo Layout"],
    ["类型过滤", "Filter by File Extension"],
    ["加入相簿", "Add to Album"],
    ["调整时间", "Adjust Capture Time"],
    ["全部相簿", "All Albums"],
    ["部分相簿", "Some Albums"],
    ["完成", "Done"],
    ["复原", "Revert"],
    ["自由裁剪", "Free Crop"],
    ["原始", "Original"],
  ]) {
    assert.match(
      language,
      new RegExp(
        `${pair[0]}:\\s*"${pair[1].replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}"`,
      ),
      `${pair[0]} should translate to ${pair[1]}`,
    );
  }
});

test("英文项目右键菜单完整翻译并加宽避免截断", () => {
  const app = read("web/app.js");
  const language = read("web/ui-language.js");
  const contextRows = app.slice(
    app.indexOf("function contextMenuRows("),
    app.indexOf("let contextDetailOpen ="),
  );

  for (const [chinese, english] of [
    ["显示图库", "Show in Library"],
    ["设为封面", "Set as Album Cover"],
    ["删除照片", "Delete Photo"],
    ["删除视频", "Delete Video"],
  ]) {
    assert.match(contextRows, new RegExp(chinese));
    assert.match(language, new RegExp(`${chinese}: "${english}"`));
  }
  assert.match(app, /CONTEXT_MENU_ENGLISH_WIDTH = 248;/);
  assert.match(
    app,
    /uiLanguageIsEnglish\(\)\s*\?\s*CONTEXT_MENU_ENGLISH_WIDTH\s*:\s*CONTEXT_MENU_STANDARD_WIDTH/,
  );
});

test("空状态和移除确认框统一经过英文翻译", () => {
  const app = read("web/app.js");
  const language = read("web/ui-language.js");

  assert.match(
    app,
    /function renderEmpty\(text, modifier = ""\)\s*{\s*const localizedText = uiText\(text\)/,
  );
  assert.match(app, /const text = uiText\(isFolder \?/);
  assert.match(
    app,
    /function askConfirm\([\s\S]*?\$\("#askTitle"\)\.textContent = uiText\(title\);[\s\S]*?\$\("#askMsg"\)\.textContent = uiText\(message\);[\s\S]*?\$\("#askNote"\)\.textContent = uiText\(note\);[\s\S]*?\$\("#askOk"\)\.textContent = uiText\(actionText\)/,
  );
  assert.match(
    language,
    /这个文件夹里还没有相簿:\s*"This folder has no albums yet\."/,
  );
  assert.match(language, /最近删除里没有东西:\s*"Recently Deleted is empty\."/);
  assert.match(language, /此操作不可撤销:\s*"This action cannot be undone\."/);
  assert.match(language, /移除:\s*"Remove"/);
});

test("英文界面会翻译名称输入框占位文字但保留输入值", () => {
  const language = read("web/ui-language.js");
  const page = read("web/index.html");
  const skipSelector = language.slice(
    language.indexOf("const SKIP_SELECTOR = ["),
    language.indexOf("const textState"),
  );

  assert.match(page, /class="name-input"[\s\S]*?placeholder="标题"/);
  assert.match(language, /标题:\s*"Title"/);
  assert.doesNotMatch(skipSelector, /\.name-input/);
  assert.doesNotMatch(skipSelector, /\.menu-inline-input/);
  assert.doesNotMatch(
    language,
    /element\.(?:value|textContent)\s*=\s*translateValue/,
  );
});

test("英文界面的名称对话框、错误弹窗和常见提示统一翻译", () => {
  const app = read("web/app.js");
  const language = read("web/ui-language.js");

  assert.match(
    app,
    /const nativeUiAlert = window\.alert\.bind\(window\);\s*window\.alert = \(message\) => nativeUiAlert\(uiText\(message\)\);/,
  );
  assert.ok(
    app.indexOf("window.alert = (message)") < app.indexOf("alert(err.message)"),
  );
  assert.match(
    app,
    /\$\("#nameTitle"\)\.textContent = uiText\(title\);\s*\$\("#nameMessage"\)\.textContent = uiText\(message\);/,
  );

  for (const [source, translated] of [
    ["缩略图使用柔和圆角", "Use softly rounded thumbnail corners."],
    ["缩略图使用直角边界", "Use square thumbnail corners."],
    ["图库中找不到这个项目", "This item could not be found in the library."],
    ["项目详细", "Item Details"],
    ["继续播放", "Resume playback"],
    ["未命名项目", "Untitled item"],
    ["磁盘路径不可用", "Disk path unavailable"],
    ["请先点击地图放置大头针", "Click the map to place a pin first."],
    [
      "这段实况视频暂时无法播放",
      "This Live Photo video cannot be played right now.",
    ],
  ]) {
    assert.match(
      language,
      new RegExp(
        `${source}:\\s*"${translated.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}"`,
      ),
    );
  }
});

test("切换图库的状态和 Toast 提示包含英文翻译", () => {
  const language = read("web/ui-language.js");

  assert.match(
    language,
    /只有一个可用图库:\s*"Only one library is available\."/,
  );
  assert.match(
    language,
    /未导入文件夹:\s*"No library folders have been imported\."/,
  );
  assert.match(
    language,
    /"正在导入图库，请等待当前任务完成":\s*"A library import is already running\. Wait for it to finish\."/,
  );
  assert.match(
    language,
    /先按顺序选择照片或视频:\s*"Select photos or videos in the required order first\."/,
  );
  assert.match(
    language,
    /core\.match\(\/\^正在切换到\\s\+\(\.\+\)\$\/\)[\s\S]*?Switching to \$\{match\[1\]\}…/,
  );
});

test("切换语言就地重算时间分组日期标题，不重渲染不丢现场（039）", () => {
  const app = read("web/app.js");
  const bridge = read("web/theme-bridge.js");

  /* 主窗口语言切换广播事件，地图分支原有广播保留。 */
  assert.match(
    bridge,
    /if \(!preserveMapLanguage\) \{\s*window\.dispatchEvent\(\s*new CustomEvent\("fotora:language-change"/,
  );
  /* 应用监听事件，按日期键就地重算标题。 */
  assert.match(
    app,
    /window\.addEventListener\("fotora:language-change", \(\) => \{[\s\S]*?data-timeline-group[\s\S]*?libraryTimelineGroupLabelForDate\(date\)/,
  );
  /* 渲染与热重算共用同一个格式化函数，避免两套日期文案漂移。 */
  assert.match(
    app,
    /function libraryTimelineGroupLabel\(item\) \{[\s\S]*?return libraryTimelineGroupLabelForDate\(date\);/,
  );
  assert.match(app, /function libraryTimelineGroupLabelForDate\(date\) \{/);
});
