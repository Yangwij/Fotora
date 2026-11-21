/* 界面语言：苹方字体方案 = 中文，Anthropic 字体方案 = English。 */
(() => {
  /* Map surfaces intentionally keep their existing Chinese UI and provider
     content, even while the surrounding desktop application is in English. */
  if (window.location.pathname.startsWith("/map/")) {
    let mapLanguage = "zh-CN";
    try {
      mapLanguage =
        localStorage.getItem("font-theme") === "anthropic" ? "en" : "zh-CN";
    } catch {}
    document.documentElement.dataset.uiLanguage = mapLanguage;
    window.FotoraLanguage = Object.freeze({
      setLanguage(next) {
        mapLanguage = next === "en" ? "en" : "zh-CN";
        document.documentElement.dataset.uiLanguage = mapLanguage;
      },
      translate() {},
      translateValue: (value) => value,
      getLanguage: () => mapLanguage,
    });
    return;
  }

  const TEXT = Object.freeze({
    图库: "Library",
    照片墙: "Photo Wall",
    所有相簿: "All Albums",
    地点: "Places",
    地点足迹: "Places",
    收藏: "Favorites",
    未归档: "Unfiled",
    最近删除: "Recently Deleted",
    导入图库: "Import Library",
    "导入图库（Alt+D）": "Import Library (Alt+D)",
    切换图库: "Switch Library",
    收起图库: "Collapse Library",
    展开图库: "Expand Library",
    还没有导入图库: "No libraries imported yet",
    未导入文件夹: "No library folders have been imported.",
    只有一个可用图库: "Only one library is available.",
    "正在导入图库，请等待当前任务完成":
      "A library import is already running. Wait for it to finish.",
    取消这次图库导入: "Cancel this library import",
    取消这次项目导出: "Cancel this export",
    已取消导入: "Import canceled",
    已取消导入图库: "Library import canceled",
    已取消导出: "Export canceled",
    这次导入已经结束: "This import has already finished.",
    先按顺序选择照片或视频:
      "Select photos or videos in the required order first.",
    未知路径: "Unknown path",
    这个根目录暂时无法访问: "This library folder is unavailable.",
    设置: "Settings",
    年: "Years",
    月: "Months",
    日: "Days",
    所有照片: "All Photos",
    选择: "Select",
    取消选择: "Deselect",
    排序: "Sort",
    更多: "More",
    更多显示选项: "More display options",
    新建相簿: "New Album",
    添加项目: "Add Items",
    移动: "Move",
    删除: "Delete",
    全选: "Select All",
    取消全选: "Deselect All",
    全部删除: "Delete All",
    全部恢复: "Restore All",
    恢复: "Restore",
    收起: "Collapse",
    展开: "Expand",
    完成: "Done",
    取消: "Cancel",
    存储: "Save",
    调整: "Adjust",
    编辑: "Edit",
    编辑照片: "Edit Photo",
    照片查看器: "Photo Viewer",
    查看器: "Viewer",
    项目信息: "Item Info",
    项目信息卡: "Item Info",
    胶片栏: "Filmstrip",
    查看器胶片栏: "Viewer filmstrip",
    照片分类评级: "Photo rating",
    分类评级: "Rating",
    实况照片: "Live Photo",
    照片: "Photo",
    视频: "Video",
    项目: "Item",
    相簿: "Album",
    相簿名称: "Album name",
    重命名相簿: "Rename album",
    项目操作: "Item actions",
    选择操作: "Selection actions",
    移动到相簿: "Move to album",
    添加所选项目: "Add selected items",
    项目来源: "Item source",
    返回上一级: "Go back",
    返回相簿: "Back to albums",
    上一张: "Previous",
    下一张: "Next",
    暂停: "Pause",
    播放: "Play",
    关闭: "Close",
    重新播放: "Replay",
    重复播放: "Repeat",
    播放结束: "Playback finished",
    播放顺序: "Playback order",
    播放设置: "Playback settings",
    播放进度: "Playback progress",
    调整播放速度: "Adjust playback speed",
    幻灯片: "Slideshow",
    幻灯片播放控制: "Slideshow controls",
    幻灯片播放设置: "Slideshow settings",
    关闭幻灯片: "Close slideshow",
    顺序: "Sequential",
    随机: "Shuffle",
    调整速度: "Speed",
    时间轴: "Timeline",
    调整拍摄时间: "Adjust capture time",
    修改拍摄时间: "Change capture time",
    调整位置信息: "Adjust location",
    "在地图上选择位置。点击打勾后只保存到“照片”，不会修改磁盘原文件。":
      "Choose a location on the map. Confirming saves the change only in Fotora and never modifies the original file.",
    应用位置并继续下一张: "Apply location and continue",
    "添加位置…": "Add location…",
    正在定位: "Locating",
    准备地图: "Preparing map",
    重试地图: "Retry map",
    重试: "Retry",
    重新载入地图: "Reload map",
    地点地图: "Places map",
    相簿地图: "Album map",
    地点地图照片胶片栏: "Places map filmstrip",
    相簿地图照片胶片栏: "Album map filmstrip",
    照片网格: "Photo Grid",
    通用: "General",
    快捷键: "Shortcuts",
    窗口控制: "Window controls",
    "切换全屏（Ctrl+0）": "Toggle full screen (Ctrl+0)",
    最小化窗口: "Minimize window",
    最小化: "Minimize",
    最大化窗口: "Maximize window",
    最大化: "Maximize",
    关闭窗口: "Close window",
    红绿灯窗口控制: "Traffic-light window controls",
    "Windows 窗口控制": "Windows window controls",
    收起相簿栏: "Collapse sidebar",
    展开相簿栏: "Expand sidebar",
    图库时间分组: "Library time grouping",
    在当前相簿里新建一个相簿: "Create an album in the current album",
    在文件资源管理器中显示项目: "Show item in File Explorer",
    项目位置预览准备区: "Item location preview",
    标题: "Title",
    相簿栏入口: "Sidebar entries",
    常规: "General",
    外观: "Appearance",
    明暗模式: "Color mode",
    跟随系统: "Use system setting",
    浅色: "Light",
    深色: "Dark",
    配色主题: "Color theme",
    主题样式: "Theme style",
    原色: "Original",
    暖纸: "Warm Paper",
    雾岚: "Mist",
    杏陶: "Clay",
    界面语言: "Interface language",
    中文: "中文",
    英文: "English",
    窗口控件: "Window controls",
    红绿灯: "Traffic lights",
    隐藏: "Hidden",
    标题栏样式: "Title bar",
    标准: "Standard",
    透明: "Transparent",
    磨砂: "Blur",
    显示窗口边框: "Show window border",
    显示设置按钮: "Show Settings button",
    显示展开箭头: "Show Expand Arrow",
    启动与关闭: "Startup & Close",
    启动页面: "Start page",
    关闭主窗口时: "When closing the main window",
    "退出 Fotora": "Quit Fotora",
    最小化到托盘: "Minimize to tray",
    数据管理: "Data management",
    清除所有数据: "Clear All Data",
    "将永久删除 Fotora 的应用数据文件夹（默认位于 %LOCALAPPDATA%\\Fotora），包括图库索引、相册、收藏、评分、编辑与裁剪、界面设置和缩略图等缓存。不会删除图库源文件夹中的原始照片和视频，也不会删除已经导出的文件。确认后会退出 Fotora，删除完成后自动重新启动。":
      "This permanently deletes Fotora’s app data folder (by default, %LOCALAPPDATA%\\Fotora), including the library index, albums, favorites, ratings, edits and crops, interface settings, and thumbnail caches. Original photos and videos in library source folders will not be deleted, nor will files you have already exported. After confirmation, Fotora will quit and restart automatically once the folder has been removed.",
    图库与相簿栏: "Library & Sidebar",
    图库浏览: "Library browsing",
    默认照片布局: "Default photo layout",
    原始比例: "Original ratio",
    方形网格: "Square grid",
    等高成行: "Justified",
    等宽成列: "Masonry",
    缩略图边角: "Thumbnail corners",
    圆角: "Rounded",
    直角: "Square",
    显示拖动滑块: "Show drag slider",
    显示时间刻度: "Show time scale",
    显示时间轴: "Show timeline",
    显示时间按钮: "Show time buttons",
    隐藏时间快捷按钮: "Hide quick time buttons",
    "显示“未归档”卡": "Show Unfiled card",
    "显示“照片墙”卡": "Show Photo Wall card",
    "显示“所有相簿”卡": "Show All Albums card",
    静音预览实况照片: "Mute Live Photo previews",
    自动播放实况照片: "Auto-play Live Photos",
    照片栏位置: "Filmstrip position",
    默认照片墙: "Default Photo Wall",
    纵向画廊方向: "Masonry cruise direction",
    巡航节奏与方向: "Cruise timing and direction",
    自定义巡航时长: "Custom cruise duration",
    顶部: "Top",
    底部: "Bottom",
    左侧: "Left",
    右侧: "Right",
    错落磁贴: "Scattered Tiles",
    嵌合拼图: "Interlocking Mosaic",
    纵向画廊: "Vertical Gallery",
    横向胶卷: "Horizontal Filmstrip",
    换向方式: "Cruise direction",
    换向间隔: "Direction interval",
    自动换向: "Automatic direction",
    自定义: "Custom",
    "⬆️ 向上": "⬆️ Up",
    "⬇️ 向下": "⬇️ Down",
    "⬅️ 向左": "⬅️ Left",
    "➡️ 向右": "➡️ Right",
    "↗️ 向右上": "↗️ Up right",
    "↘️ 向右下": "↘️ Down right",
    "↖️ 向左上": "↖️ Up left",
    "↙️ 向左下": "↙️ Down left",
    分钟: "min",
    界面名称: "Interface Names",
    入口名称: "Entry names",
    图库标题: "Library title",
    图库入口: "Library entry",
    照片墙入口: "Photo Wall entry",
    所有相簿入口: "All Albums entry",
    未归档入口: "Unfiled entry",
    悬停展开相簿栏: "Expand sidebar on hover",
    "悬停显示“导入图库”": "Show Import Library on hover",
    "悬停显示“切换图库”": "Show Switch Library on hover",
    "悬停显示“最近删除”": "Show Recently Deleted on hover",
    预览与查看器: "Preview & Viewer",
    背景虚化: "Blur background",
    显示四边留白: "Show viewer margin",
    等比放大照片: "Fit photo to viewer",
    显示照片栏: "Show filmstrip",
    显示编辑按钮: "Show Edit button",
    悬停显示编辑按钮: "Show Edit button on hover",
    显示切换按钮: "Show navigation buttons",
    照片预览: "Photo preview",
    预览尺寸: "Preview size",
    紧凑: "Compact",
    适中: "Medium",
    宽大: "Large",
    滚轮行为: "Mouse wheel action",
    "切换 / Ctrl 缩放": "Navigate / Ctrl to zoom",
    "缩放 / Ctrl 切换": "Zoom / Ctrl to navigate",
    自动播放下一个视频: "Auto-play next video",
    循环播放视频: "Loop video",
    静音预览: "Mute previews",
    照片墙与幻灯片: "Photo Wall",
    显示照片墙按钮: "Show Photo Wall controls",
    显示幻灯片按钮: "Show Slideshow controls",
    显示照片墙边框: "Show Photo Wall border",
    巡航速度: "Cruise speed",
    巡航换向: "Cruise direction",
    快: "Fast",
    中: "Medium",
    慢: "Slow",
    缓: "Gentle",
    地图与位置: "Maps & Places",
    地图界面: "Map interface",
    地图类型: "Map type",
    矢量: "Vector",
    卫星: "Satellite",
    瓦片地图: "Tile map",
    高德: "AutoNavi",
    谷歌: "Google",
    地图行为: "Map behavior",
    飞行速度: "Flight speed",
    显示地图按钮: "Show map controls",
    显示地图照片栏: "Show map filmstrip",
    界面按钮: "Interface buttons",
    "始终显示“设置”按钮": "Always show Settings button",
    "显示“导入图库”": "Show Import Library",
    "显示“切换图库”": "Show Switch Library",
    "显示“最近删除”": "Show Recently Deleted",
    "显示“未归档”卡": "Show Unfiled card",
    "显示“所有相簿”卡": "Show All Albums card",
    "显示“照片墙”入口": "Show Photo Wall entry",
    显示照片墙边框: "Show Photo Wall border",
    确认并关闭设置: "Apply and close Settings",
    设置分类: "Settings categories",
    打开相簿: "Open Albums",
    关闭幻灯片: "Close Slideshow",
    "关闭浮层 / 返回上一级": "Close panel / Go back",
    "关闭窗口 / 从托盘打开": "Close window / Open from tray",
    "全屏 / 退出全屏": "Full screen / Exit full screen",
    "全屏 / 最大化 / 最小化 / 关闭窗口":
      "Full screen / Maximize / Minimize / Close",
    "最大化 / 还原窗口": "Maximize / Restore window",
    "最小化 / 恢复窗口": "Minimize / Restore window",
    "退出壁纸模式 / 返回": "Exit wallpaper mode / Back",
    "显示 / 关闭快捷键表": "Show / Hide shortcuts",
    退出幻灯片: "Exit slideshow",
    退出选择: "Exit selection",
    进入选择: "Enter selection",
    拷贝所选: "Copy selected",
    删除所选: "Delete selected",
    "收藏 / 取消收藏": "Favorite / Unfavorite",
    "上一张 / 下一张": "Previous / Next",
    "第一张 / 最后一张": "First / Last",
    "暂停 / 继续": "Pause / Resume",
    "播放 / 暂停视频": "Play / Pause video",
    "全选 / 取消全选": "Select All / Deselect All",
    "勾选 / 取消勾选": "Check / Uncheck",
    撤销上一步: "Undo",
    切换照片布局: "Change photo layout",
    缩放照片网格: "Change grid size",
    "缩放 / 还原": "Zoom / Reset",
    "顺时针 / 逆时针旋转 90°": "Rotate 90° clockwise / counterclockwise",
    "Ctrl + 滚轮": "Ctrl + Scroll",
    空格: "Space",
    鼠标右键: "Right click",
    按: "Press",
    或: "or",
    关闭: "Close",
    撤销: "Undo",
    重做: "Redo",
    还原: "Reset",
    恢复默认封面: "Restore default cover",
    设为视频封面: "Set as video cover",
    "正在准备照片…": "Preparing photo…",
    裁剪比例: "Crop aspect",
    自由裁剪: "Free Crop",
    原始: "Original",
    横: "Landscape",
    竖: "Portrait",
    视频预览进度: "Video preview position",
    照片编辑预览: "Photo edit preview",
    左上裁剪: "Crop from top left",
    上边裁剪: "Crop from top",
    右上裁剪: "Crop from top right",
    右边裁剪: "Crop from right",
    右下裁剪: "Crop from bottom right",
    下边裁剪: "Crop from bottom",
    左下裁剪: "Crop from bottom left",
    左边裁剪: "Crop from left",
    取消裁剪: "Cancel Crop",
    确认裁剪: "Apply Crop",
    恢复自动裁剪: "Restore Automatic Crop",
    恢复当前裁剪位置: "Restore Current Crop",
    "正在打开图库…": "Opening library…",
    "正在读取图库…": "Reading library…",
    "正在整理照片…": "Organizing photos…",
    "正在准备首屏…": "Preparing library…",
    "正在载入图库…": "Loading library…",
    "正在载入地点…": "Loading places…",
    "正在载入相簿地图…": "Loading album map…",
    "正在搜索地点…": "Searching places…",
    这个相簿里还没有可显示的照片: "This album has no photos to display.",
    这个文件夹里还没有相簿: "This folder has no albums yet.",
    没有其他相簿可以移动: "There are no other albums to move to.",
    没有其他相簿可以添加: "There are no other albums to add to.",
    这个相簿里没有子相簿: "This album has no subalbums.",
    没有可预览的照片或视频: "There are no photos or videos to preview.",
    这个地点没有可显示的项目: "There are no items to display for this place.",
    没有符合当前位置筛选的项目: "No items match the current location filter.",
    没有选择文件类型: "No file types are selected.",
    没有符合当前过滤的项目: "No items match the current filter.",
    没有符合当前筛选的项目: "No items match the current filters.",
    没有照片: "No photos.",
    没有视频: "No videos.",
    图库里还没有照片或视频: "This library has no photos or videos yet.",
    收藏里还没有照片或视频: "There are no photos or videos in Favorites.",
    最近删除里没有东西: "Recently Deleted is empty.",
    这个文件夹还是空的: "This folder is empty.",
    这个相簿还是空的: "This album is empty.",
    照片不存在: "The photo does not exist.",
    视频不存在: "The video does not exist.",
    项目不存在: "The item does not exist.",
    文件不存在: "The file does not exist.",
    文件夹不存在: "The folder does not exist.",
    没能保存位置: "Could not save the location.",
    没能写入拍摄时间: "Could not save the capture time.",
    没能修改拍摄设备: "Could not update the camera information.",
    没有选择文件夹: "No folder was selected.",
    没有选中任何东西: "Nothing is selected.",
    没有选中任何照片: "No photos are selected.",
    没有文件被改名: "No files were renamed.",
    请先完成或取消照片编辑: "Finish or cancel photo editing first.",
    这不是视频: "This is not a video.",
    这个格式不可编辑: "This format cannot be edited.",
    这个格式没法在浏览器里显示:
      "This format cannot be displayed in the viewer.",
    这个格式暂时无法读取: "This format cannot be read right now.",
    这个视频不可编辑: "This video cannot be edited.",
    这个视频暂时无法播放: "This video cannot be played right now.",
    地图无法载入: "The map could not be loaded.",
    地图暂时无法显示: "The map is temporarily unavailable.",
    "地图正在恢复…": "Restoring map…",
    地点搜索服务不可用: "Place search is unavailable.",
    高德搜索服务不可用: "AutoNavi search is unavailable.",
    离线模式不能搜索地点: "Place search is unavailable offline.",
    请输入要搜索的地点: "Enter a place to search.",
    没有找到这个地点: "Place not found.",
    "搜索失败，请检查网络连接": "Search failed. Check the network connection.",
    "照片墙载入超时，请重试": "Photo Wall timed out. Try again.",
    已选择: "Selected",
    张照片: "photos",
    个项目: "items",
    个相簿: "albums",
    个视频: "videos",
    视频: "Video",
    照片: "Photo",
    全部: "All",
    向下: "Down",
    向上: "Up",
    向左: "Left",
    向右: "Right",
    向左上: "Up left",
    向右上: "Up right",
    向左下: "Down left",
    向右下: "Down right",
    自动放大照片: "Auto-zoom photos",
    默认原始比例: "Default original ratio",
    "使用 Windows 风格的右上角按钮。":
      "Use Windows-style controls in the top-right corner.",
    "使用左上角圆形彩色窗口按钮。":
      "Use circular window controls in the top-left corner.",
    "隐藏后：Ctrl+1 最小化/恢复，Ctrl+2 最大化/还原，Ctrl+3 或 Alt+W 按“关闭窗口”设置执行。":
      "When hidden: Ctrl+1 minimizes/restores, Ctrl+2 maximizes/restores, Ctrl+3 or Alt+W follows the close behavior.",
    "跟随 Windows 外观。": "Follow the Windows appearance.",
    "浅色模式。": "Use the light appearance.",
    "深色模式。": "Use the dark appearance.",
    "暖白画布与陶土色强调。": "Warm paper surfaces with terracotta accents.",
    "冷灰画布与雾蓝强调。": "Cool gray surfaces with mist-blue accents.",
    "奶油纸张、墨色文字与陶土橙强调。":
      "Cream paper, ink text, and terracotta accents.",
    "保留 Fotora 当前的灰蓝配色。":
      "Keep Fotora's current neutral gray and blue palette.",
    缩略图使用柔和圆角: "Use softly rounded thumbnail corners.",
    缩略图使用直角边界: "Use square thumbnail corners.",
    "滚轮缩放，Ctrl+滚轮切换。":
      "Scroll to zoom; use Ctrl+scroll to switch items.",
    "滚轮切换，Ctrl+滚轮缩放。":
      "Scroll to switch items; use Ctrl+scroll to zoom.",
    快速完成地图移动: "Move the map quickly.",
    以适中速度移动地图: "Move the map at a medium speed.",
    以较慢速度移动地图: "Move the map slowly.",
    以缓慢速度移动地图: "Move the map very slowly.",
    "中文界面，使用内置 Noto Sans SC。":
      "Chinese interface using bundled Noto Sans SC.",
    "英文界面，使用内置 Inter 与 Source Serif 4。":
      "English interface using bundled Inter and Source Serif 4.",
    "优先使用本机已安装的 Anthropic 字体。":
      "Use Anthropic fonts installed on this computer.",
    "启动后进入图库。": "Open the Library on launch.",
    "启动后进入所有相簿。": "Open All Albums on launch.",
    "关闭窗口并结束应用进程。": "Close the window and quit the app.",
    "隐藏窗口并继续在后台运行；按 Ctrl+3 或 Alt+W 可重新打开。":
      "Hide the window and keep running in the background; use Ctrl+3 or Alt+W to reopen.",
    照片不存在: "Photo not found.",
    相簿不存在: "Album not found.",
    根目录不存在: "Library root not found.",
    "根目录已经切换，请重新操作": "The library root changed. Please try again.",
    相簿封面已不存在: "Album cover no longer exists.",
    所选项目没有在软件内修改过的位置:
      "The selected items have no location changes in Fotora.",
    所选项目没有在软件内修改过的拍摄时间:
      "The selected items have no capture-time changes in Fotora.",
    "不会删除磁盘文件，也不影响其他根目录。":
      "This does not delete disk files or affect other library roots.",
    恢复选中的相簿和照片视频: "Restore selected albums and media",
    删除选中的相簿和照片视频: "Delete selected albums and media",
    此操作不可撤销: "This action cannot be undone.",
    移除: "Remove",
    图库中找不到这个项目: "This item could not be found in the library.",
    项目详细: "Item Details",
    这些项目已经在相簿里: "These items are already in the album.",
    继续播放: "Resume playback",
    导出只能在照片桌面应用中使用:
      "Export is only available in the desktop app.",
    调整项目位置: "Adjust Item Location",
    "1 倍": "1×",
    "写入失败，请重试": "Save failed. Try again.",
    还没有可选择的相簿: "There are no albums to choose from.",
    还没有包含照片的相簿: "No albums contain photos yet.",
    照片墙风格: "Photo Wall style",
    未命名项目: "Untitled item",
    磁盘路径不可用: "Disk path unavailable",
    请先点击地图放置大头针: "Click the map to place a pin first.",
    这段实况视频暂时无法播放:
      "This Live Photo video cannot be played right now.",
    这段实况视频暂时没有可显示的画面:
      "This Live Photo video has no frame to display right now.",
    这段实况视频的编码暂时无法播放:
      "This Live Photo video cannot be played with the current codec.",
    照片墙里还没有可播放的相簿: "There are no albums to play on Photo Wall.",
    纵向画廊里还没有可播放的相簿:
      "There are no albums to play in the Vertical Gallery.",
    纵向画廊里还没有可播放的照片:
      "There are no photos to play in the Vertical Gallery.",
    横向胶卷里还没有可播放的相簿:
      "There are no albums to play in the Horizontal Filmstrip.",
    嵌合拼图里还没有可播放的相簿:
      "There are no albums to play in the Interlocking Mosaic.",
    嵌合拼图里还没有可播放的照片:
      "There are no photos to play in the Interlocking Mosaic.",
    应用位置并继续下一张: "Apply location and continue",
    照片比例: "Photo ratio",
    选择照片比例: "Choose photo ratio",
    未命名地点: "Unnamed place",
    未选择: "Not selected",
    不可用: "Unavailable",
    加载中: "Loading",
    胶片预览: "Filmstrip Preview",
    分类评级: "Rating",
    放映照片: "Slideshow",
    显示地图: "Show Map",
    布局调整: "Photo Layout",
    项目排序: "Sort By",
    位置筛选: "Filter by Location",
    媒体筛选: "Filter by Media",
    设备筛选: "Filter by Camera",
    类型筛选: "Filter by Format",
    类型过滤: "Filter by File Extension",
    批量编号: "Batch Renumber",
    相簿更名: "Rename Album",
    删除相簿: "Delete Album",
    最新到最旧: "Newest First",
    最旧到最新: "Oldest First",
    按名称正序: "Name A–Z",
    按名称逆序: "Name Z–A",
    自定义顺序: "Custom Order",
    已有位置: "Has Location",
    未有位置: "No Location",
    已有修改: "Location Edited",
    未有修改: "Location Not Edited",
    加入相簿: "Add to Album",
    移出相簿: "Remove from Album",
    收藏项目: "Add to Favorites",
    取消收藏: "Remove from Favorites",
    显示图库: "Show in Library",
    设为封面: "Set as Album Cover",
    删除照片: "Delete Photo",
    删除视频: "Delete Video",
    调整时间: "Adjust Capture Time",
    调整位置: "Adjust Location",
    调整设备: "Change Camera",
    还原位置: "Restore Original Location",
    还原设备: "Restore Original Camera",
    还原时间: "Restore Original Time",
    还原评级: "Clear Rating",
    拷贝项目: "Copy Items",
    导出项目: "Export Items",
    日期: "Date",
    尺寸: "Dimensions",
    相机: "Camera",
    镜头: "Lens",
    参数: "Details",
    实况: "Live",
    大小: "Size",
    无相机信息: "No camera information",
    无镜头信息: "No lens information",
    没有拍摄时间: "No capture time",
    "照片 + 伴随视频": "Photo + Paired Video",
    未标注日期: "Date Unknown",
    全部相簿: "All Albums",
    部分相簿: "Some Albums",
    全部照片: "All Photos",
    部分照片: "Some Photos",
    部分: "Some",
    当前: "Current",
    新建相簿: "New Album",
    新建文件夹: "New Folder",
    "请为此相簿输入名称。": "Enter a name for this album.",
    "请为此文件夹输入名称。": "Enter a name for this folder.",
    确定: "OK",
    "彻底删除这些项目？": "Delete these items permanently?",
    "彻底删除这个项目？": "Delete this item permanently?",
    "彻底删除这个视频？": "Delete this video permanently?",
    "彻底删除这些视频？": "Delete these videos permanently?",
    "彻底删除这张照片？": "Delete this photo permanently?",
    "彻底删除这些照片？": "Delete these photos permanently?",
    "彻底删除这些相簿？": "Delete these albums permanently?",
    "彻底删除这个相簿？": "Delete this album permanently?",
    "彻底删除后无法恢复，但磁盘文件会保留。":
      "Permanently deleted items cannot be restored, but disk files are retained.",
    复原: "Revert",
    照片裁剪预览: "Photo Crop Preview",
    视频裁剪预览: "Video Crop Preview",
    "正在准备视频画面…": "Preparing video frame…",
    照片预览加载失败: "Couldn’t load the photo preview.",
    视频裁剪预览加载失败: "Couldn’t load the video preview.",
    "加载失败，点击重试": "Couldn’t load this photo. Click to retry.",
    视频画面切换失败: "Couldn’t switch the video frame.",
    保存编辑失败: "Couldn’t save changes.",
    复原失败: "Couldn’t revert changes.",
    这个项目不可编辑: "This item can’t be edited.",
    裁剪视频: "Edit Video",
    横向比例: "Landscape",
    竖向比例: "Portrait",
    其他: "Other",
    文件编号: "File Numbering",
    时间编号: "Time Numbering",
    "IMG / V 五位序号": "IMG / V Five-digit Sequence",
    下划五位序号: "Underscore Five-digit Sequence",
    空格四位序号: "Space Four-digit Sequence",
    空格动态序号: "Space Variable Sequence",
    按小时分组: "Group by Hour",
    按分钟分组: "Group by Minute",
    按秒钟分组: "Group by Second",
    播放全部照片: "Play All Photos",
    播放部分照片: "Play Some Photos",
    已切换为随机播放: "Switched to shuffle.",
    已切换为顺序播放: "Switched to sequential playback.",
    已开启重复播放: "Repeat playback enabled.",
    已关闭重复播放: "Repeat playback disabled.",
    "已完成一轮，正在重复播放": "Playback restarted and is repeating.",
    文件已不存在: "The file no longer exists.",
    文件已不在磁盘上: "The file is no longer on disk.",
    没有可以撤销的操作: "There is nothing to undo.",
    没能撤销这次移动: "Couldn’t undo this move.",
    "没能撤销恢复：文件可能正被别的程序打开着":
      "Couldn’t undo the restore because another program may be using the file.",
    "没能从最近删除恢复：文件可能正被别的程序打开着":
      "Couldn’t restore from Recently Deleted because another program may be using the file.",
    这个撤销记录已经过时了: "This undo record is no longer available.",
    这个视频暂时无法生成兼容预览:
      "This video can’t be prepared for playback right now.",
    "这个 RAW 里没有可用的内嵌预览，暂时无法裁剪":
      "This RAW file has no embedded preview and can’t be cropped right now.",
    这个相簿没有带位置信息的照片:
      "This album has no photos with location information.",
    "只读查看照片在地图上的位置。": "View the photo’s location on the map.",
    可以搜索或直接点击地图: "Search for a place or click the map.",
    "可以稍后重试，或继续使用离线世界底图":
      "Try again later, or continue with the offline world map.",
    "地图加载时间较长，可以重试或继续使用离线底图":
      "The map is taking a while to load. Try again or continue with the offline map.",
    "仍无法载入地图，请稍后重试":
      "The map still can’t be loaded. Try again later.",
    保存照片位置失败: "Couldn’t save the photo location.",
    没能删掉: "Couldn’t delete the items.",
    "这些文件可能正被别的程序打开着，稍后再试":
      "These files may be in use by another program. Try again later.",
    没有项目被恢复: "No items were restored.",
    没有项目被删除: "No items were deleted.",
    没有可移除的项目: "There are no items to remove.",
    这个项目暂时不能编辑: "This item can’t be edited right now.",
    请先完成或取消照片编辑: "Finish or cancel editing first.",
    相簿文件夹暂时无法移动: "The album folder can’t be moved right now.",
    文件可能正被别的程序打开着: "The file may be in use by another program.",
    未归档不能解散: "Unfiled can’t be dissolved.",
    照片尺寸无效: "The photo dimensions are invalid.",
    这不是可播放的视频: "This is not a playable video.",
    这个视频暂时无法读取: "This video can’t be read right now.",
    这个格式不能生成编辑后的照片: "This format can’t produce an edited photo.",
    只能编辑照片或视频: "Only photos and videos can be edited.",
    "RAW 照片只支持软件内裁剪和几何调整":
      "RAW photos only support in-app cropping and geometry changes.",
    只能为视频设置封面: "Only videos can have a cover set.",
    根文件夹不存在: "The library folder does not exist.",
    相簿库不存在: "The library does not exist.",
    只能导入当前根目录里面的子文件夹:
      "Only folders inside the current library root can be imported.",
    这个文件夹已经不存在了: "This folder no longer exists.",
    这个文件夹已经导入过了: "This folder has already been imported.",
    拍摄时间无效: "The capture time is invalid.",
    没有可写入的拍摄时间: "There is no capture time to write.",
    没有选中任何项目: "No items are selected.",
    不支持这个拍摄设备: "This camera is not supported.",
    纬度和经度需要同时填写: "Latitude and longitude must both be provided.",
    "纬度必须在 -90 到 90 之间": "Latitude must be between -90 and 90.",
    "经度必须在 -180 到 180 之间": "Longitude must be between -180 and 180.",
    只能裁剪照片: "Only photos can be cropped.",
    这不是一个文件夹: "This is not a folder.",
    相簿顺序无效: "The album order is invalid.",
    相簿顺序里有重复项: "The album order contains duplicates.",
    有相簿已经不存在了: "One or more albums no longer exist.",
    只能在同一层相簿之间排序:
      "Albums can only be reordered within the same level.",
    "相簿列表刚刚有变化，请重试": "The album list just changed. Try again.",
    相簿刚刚被移走了: "The album was just removed.",
    没有选中有效的项目: "No valid items are selected.",
    这个项目不在当前相簿里: "This item is not in the current album.",
    这个相簿已经不在当前相簿列表里:
      "This album is no longer in the current album list.",
    目标相簿不存在: "The destination album does not exist.",
    原相簿不存在: "The original album does not exist.",
    相簿集合已经不存在: "The album collection no longer exists.",
    相簿文件夹已不在最近删除里:
      "The album folder is no longer in Recently Deleted.",
    原来的根文件夹已不存在: "The original library folder no longer exists.",
    原位置不在当前相簿库里:
      "The original location is not in the current library.",
    名字不能为空: "The name can’t be empty.",
    这个名字不能用: "This name can’t be used.",
    名字太长了: "The name is too long.",
    未归档不能包含子相簿: "Unfiled can’t contain child albums.",
    未归档不能重命名: "Unfiled can’t be renamed.",
    撤销记录不完整: "The undo record is incomplete.",
    相簿已经存在: "The album already exists.",
    "重名太多，换不过来了": "There are too many duplicate names.",
    文件名不能为空: "The file name can’t be empty.",
    "文件名含有 Windows 不允许的字符":
      "The file name contains characters not allowed by Windows.",
    文件名不能以空格或句点结尾:
      "The file name can’t end with a space or period.",
    文件名太长: "The file name is too long.",
    没有可改名的照片: "There are no photos to rename.",
    编号只处理照片和视频: "Only photos and videos can be renumbered.",
    "同一时间组里的项目太多，无法保留原有分组":
      "There are too many items in one time group to preserve the original grouping.",
    这张照片读不出来: "This photo can’t be read.",
    浏览器没法准备这张照片: "The browser can’t prepare this photo for copying.",
    照片转换失败: "The photo couldn’t be converted.",
    当前环境不支持写入剪贴板:
      "Copying images isn’t supported in this environment.",
    写入剪贴板失败: "Couldn’t write to the clipboard.",
    浏览器预览里只能复制一张照片:
      "Only one photo can be copied in the browser preview.",
    "正在导出，请稍候…": "Exporting…",
    "正在导出项目，请等待当前任务完成":
      "An export is already running. Wait for it to finish.",
    导出失败: "Export failed.",
    "导出完成：所选项目已在目标位置":
      "Export complete. The selected items are already at the destination.",
    "导出完成：没有项目被导出": "Export complete. No items were exported.",
    "正在保存到“照片”…": "Saving to Fotora…",
    已更新拍摄时间: "Capture time updated.",
    "正在保存拍摄设备…": "Saving camera information…",
    "正在还原设备…": "Restoring camera information…",
    "正在还原位置…": "Restoring location…",
    "正在还原拍摄时间…": "Restoring capture time…",
    当前页面没有可编号的照片或视频:
      "There are no photos or videos to renumber on this page.",
    "按最终顺序依次点击照片或视频；Ctrl+A 会从当前第一项开始全选":
      "Select photos or videos in their final order. Ctrl+A selects from the first item.",
    "按最终顺序依次点击照片或视频；Ctrl+A 会从当前第一项开始编号":
      "Select photos or videos in their final order. Ctrl+A numbers from the first item.",
    "只修改软件内的有效拍摄时间，不改磁盘原文件或 EXIF。":
      "Only the effective capture time in Fotora is changed; disk files and EXIF metadata are not modified.",
    这个视频暂时无法播放: "This video can’t be played right now.",
    用系统播放器打开: "Open in System Player",
    "正在写入拍摄时间…": "Writing capture time…",
    切换窗口模式失败: "Couldn’t change the window mode.",
    "连不上本地服务：": "Can’t connect to the local service:",
    "先在项目目录运行 npm start":
      "Run npm start in the project directory first.",
    "这是根文件夹本身，不能删除；换文件夹请点「选择文件夹」":
      "The library root itself can’t be deleted. To change folders, choose a different library folder.",
    没有可调整位置的项目: "There are no items with editable locations.",
    "该位置仅保存在“照片”中，磁盘原文件未被修改":
      "This location is saved only in Fotora; the original disk file was not modified.",
    "位置来自磁盘 EXIF；点击可调整":
      "This location comes from the disk file’s EXIF metadata. Click to adjust it.",
    "如果目录已经被删除或移动，点击“确定”将从软件中移除记录。":
      "If the folder was deleted or moved, choose OK to remove its record from Fotora.",
    "将清除该根目录的索引、相簿、收藏、编辑参数和最近删除记录，":
      "This clears the folder’s index, albums, favorites, edit data, and Recently Deleted records,",
    "如果只是移动硬盘或网络目录暂时离线，请点击“取消”保留记录。":
      "If this is only an offline drive or network folder, choose Cancel to keep the record.",
    "要把它此刻的内容导入为软件相簿吗？":
      "Import the folder’s current contents as a Fotora album?",
    "只导入现在的照片；之后放进这个文件夹的新照片会进入“未归档”。选择取消后，本次导入不再询问。":
      "Only the current photos are imported. New photos added later go to Unfiled. Choosing Cancel stops this import prompt.",
    导入为相簿: "Import as Album",
    名称不能为空: "The name can’t be empty.",
    "按顺序修改文件名？": "Rename Files in Sequence?",
    开始编号: "Start Numbering",
    "按顺序写入拍摄时间？": "Write Capture Times in Sequence?",
    写入时间: "Write Times",
  });

  const ATTRIBUTES = Object.freeze([
    "aria-label",
    "title",
    "placeholder",
    "alt",
  ]);
  const SKIP_SELECTOR = [
    "[contenteditable='true']",
    ".viewer-info-file-name",
    ".viewer-info-path",
    ".pe-video-time",
    ".pe-video-duration",
  ].join(",");
  const textState = new WeakMap();
  const attributeState = new WeakMap();
  let language = "zh-CN";
  let observer = null;
  let translating = false;

  function hasCjk(value) {
    return /[\u3400-\u9fff]/.test(String(value || ""));
  }

  function translateDate(value) {
    const match = value.match(
      /^(\d{4})年(\d{1,2})月(\d{1,2})日\s*星期([一二三四五六日天])$/,
    );
    if (!match) return null;
    const weekdays = {
      一: "Monday",
      二: "Tuesday",
      三: "Wednesday",
      四: "Thursday",
      五: "Friday",
      六: "Saturday",
      日: "Sunday",
      天: "Sunday",
    };
    const date = new Date(
      Number(match[1]),
      Number(match[2]) - 1,
      Number(match[3]),
    );
    const month = date.toLocaleString("en-US", { month: "long" });
    return `${weekdays[match[4]]}, ${month} ${date.getDate()}, ${date.getFullYear()}`;
  }

  function translateValue(value) {
    if (language !== "en" || !hasCjk(value)) return value;
    const source = String(value);
    const leading = source.match(/^\s*/)?.[0] || "";
    const trailing = source.match(/\s*$/)?.[0] || "";
    const core = source.trim();
    if (!core) return value;
    if (Object.hasOwn(TEXT, core)) {
      return `${leading}${TEXT[core]}${trailing}`;
    }

    let match = core.match(/^(\d{4})年$/);
    if (match) return `${leading}${match[1]}${trailing}`;

    match = core.match(/^(\d{4})年(\d{1,2})月$/);
    if (match) {
      const date = new Date(Number(match[1]), Number(match[2]) - 1, 1);
      const month = date.toLocaleString("en-US", { month: "long" });
      return `${leading}${month} ${match[1]}${trailing}`;
    }

    const date = translateDate(core);
    if (date) return `${leading}${date}${trailing}`;

    match = core.match(/^已选择\s+(\d+)\s+(张照片|个项目|个相簿|个视频)$/);
    if (match) {
      const count = Number(match[1]);
      const units = {
        张照片: ["photo", "photos"],
        个项目: ["item", "items"],
        个相簿: ["album", "albums"],
        个视频: ["video", "videos"],
      }[match[2]];
      const unit = units[count === 1 ? 0 : 1];
      return `${leading}${count} ${unit} selected${trailing}`;
    }
    match = core.match(/^(\d+)\s+(张照片|个项目|个相簿|个视频)$/);
    if (match) {
      const count = Number(match[1]);
      const units = {
        张照片: ["photo", "photos"],
        个项目: ["item", "items"],
        个相簿: ["album", "albums"],
        个视频: ["video", "videos"],
      }[match[2]];
      const unit = units[count === 1 ? 0 : 1];
      return `${leading}${count} ${unit}${trailing}`;
    }
    match = core.match(/^(照片|视频)，(.+)；(打开大图|打开查看器)$/);
    if (match) {
      return `${leading}${match[1] === "视频" ? "Video" : "Photo"}: ${match[2]}. Open viewer${trailing}`;
    }
    match = core.match(/^照片，(.+)，打开大图$/);
    if (match) {
      return `${leading}Photo: ${match[1]}. Open viewer${trailing}`;
    }
    match = core.match(/^评分\s*(\d+)\s*星$/);
    if (match) {
      return `${leading}Rated ${match[1]} stars${trailing}`;
    }
    match = core.match(/^已选择\s+(\d+)\s+(个项目|张照片)$/);
    if (match) {
      const count = Number(match[1]);
      const unit =
        match[2] === "张照片"
          ? count === 1
            ? "photo"
            : "photos"
          : count === 1
            ? "item"
            : "items";
      return `${leading}${count} ${unit} selected${trailing}`;
    }
    match = core.match(/^(.+)，目录不可用$/);
    if (match) {
      return `${leading}${match[1]}, folder unavailable${trailing}`;
    }
    match = core.match(/^正在导入\s+(.+)$/);
    if (match) return `${leading}Importing ${match[1]}${trailing}`;
    match = core.match(/^正在取消导入\s+(.+)$/);
    if (match) return `${leading}Canceling import of ${match[1]}${trailing}`;
    match = core.match(/^取消导入失败：(.+)$/);
    if (match)
      return `${leading}Couldn’t cancel the library import: ${match[1]}${trailing}`;
    match = core.match(/^正在切换到\s+(.+)$/);
    if (match) return `${leading}Switching to ${match[1]}…${trailing}`;
    match = core.match(/^文件夹不存在：(.+)$/);
    if (match) return `${leading}Folder not found: ${match[1]}${trailing}`;
    match = core.match(/^这个根目录暂时无法访问：(.+)$/);
    if (match) {
      return `${leading}This library folder is unavailable: ${match[1]}${trailing}`;
    }
    match = core.match(/^正在导出\s+(\d+)\/(\d+)$/);
    if (match) return `${leading}Exporting ${match[1]}/${match[2]}${trailing}`;
    match = core.match(/^正在取消导出\s+(\d+)\/(\d+)$/);
    if (match) {
      return `${leading}Canceling export ${match[1]}/${match[2]}${trailing}`;
    }
    match = core.match(/^取消导出失败：(.+)$/);
    if (match) {
      return `${leading}Couldn’t cancel the export: ${match[1]}${trailing}`;
    }
    match = core.match(/^刷新图库失败：(.+)$/);
    if (match)
      return `${leading}Couldn’t refresh the library: ${match[1]}${trailing}`;
    match = core.match(/^刷新封面失败：(.+)$/);
    if (match)
      return `${leading}Couldn’t refresh covers: ${match[1]}${trailing}`;
    match = core.match(/^切换窗口失败：(.+)$/);
    if (match)
      return `${leading}Couldn’t change the window state: ${match[1]}${trailing}`;
    match = core.match(/^没能撤销：(.+)$/);
    if (match) return `${leading}Couldn’t undo: ${match[1]}${trailing}`;
    match = core.match(/^没能保存位置：(.+)$/);
    if (match)
      return `${leading}Couldn’t save the location: ${match[1]}${trailing}`;
    match = core.match(/^没能写入拍摄时间：(.+)$/);
    if (match)
      return `${leading}Couldn’t write the capture time: ${match[1]}${trailing}`;
    match = core.match(/^没能修改拍摄设备：(.+)$/);
    if (match)
      return `${leading}Couldn’t update the camera: ${match[1]}${trailing}`;
    match = core.match(/^没能移动：(.+)$/);
    if (match)
      return `${leading}Couldn’t move the items: ${match[1]}${trailing}`;
    match = core.match(/^保存照片位置失败：(.+)$/);
    if (match)
      return `${leading}Couldn’t save the photo location: ${match[1]}${trailing}`;
    match = core.match(/^第\s+(\d+)\s+张，共\s+(\d+)\s+张$/);
    if (match) {
      return `${leading}Photo ${match[1]} of ${match[2]}${trailing}`;
    }
    match = core.match(/^第\s+(\d+)\s+到\s+(\d+)\s+张，共\s+(\d+)\s+张$/);
    if (match) {
      return `${leading}Photos ${match[1]} through ${match[2]} of ${match[3]}${trailing}`;
    }
    match = core.match(/^正在准备 ([\d,]+) 张照片的位置…$/);
    if (match) {
      return `${leading}Preparing locations for ${match[1]} photos…${trailing}`;
    }
    match = core.match(/^地点信息暂时无法读取，地图仍可查看：(.+)$/);
    if (match) {
      return `${leading}Location information is temporarily unavailable. The map is still available: ${match[1]}${trailing}`;
    }
    match = core.match(/^相簿顺序没能保存：(.+)$/);
    if (match) {
      return `${leading}Couldn’t save the album order: ${match[1]}${trailing}`;
    }
    match = core.match(/^复制失败：(.+)$/);
    if (match) return `${leading}Copy failed: ${match[1]}${trailing}`;
    match = core.match(/^导出完成：(\d+) 个成功，(\d+) 个失败$/);
    if (match) {
      return `${leading}Export complete. ${match[1]} succeeded and ${match[2]} failed.${trailing}`;
    }
    match = core.match(/^导出完成：已导出 (\d+) 个项目$/);
    if (match) {
      return `${leading}Export complete. ${match[1]} items exported.${trailing}`;
    }
    match = core.match(/^导出失败：(.+)$/);
    if (match) return `${leading}Export failed: ${match[1]}${trailing}`;
    match = core.match(/^已还原 (\d+) 张照片的评级$/);
    if (match) {
      return `${leading}Rating cleared for ${match[1]} photos.${trailing}`;
    }
    match = core.match(/^已保存 (\d+) 项，(\d+) 项没能保存$/);
    if (match) {
      return `${leading}${match[1]} items saved; ${match[2]} couldn’t be saved.${trailing}`;
    }
    match = core.match(/^已更新 (\d+) 项拍摄时间$/);
    if (match) {
      return `${leading}Capture time updated for ${match[1]} items.${trailing}`;
    }
    match = core.match(/^已还原 (\d+) 项，(\d+) 项失败$/);
    if (match) {
      return `${leading}${match[1]} items restored; ${match[2]} failed.${trailing}`;
    }
    match = core.match(/^已还原 (\d+) 项位置$/);
    if (match) {
      return `${leading}Location restored for ${match[1]} items.${trailing}`;
    }
    match = core.match(/^已还原 (\d+) 项拍摄时间$/);
    if (match) {
      return `${leading}Capture time restored for ${match[1]} items.${trailing}`;
    }
    match = core.match(/^拍摄设备已改为 (.+)$/);
    if (match) return `${leading}Camera changed to ${match[1]}${trailing}`;
    match = core.match(/^检测到新文件夹「(.+)」$/);
    if (match) return `${leading}New folder detected: “${match[1]}”${trailing}`;
    match = core.match(/^从 Fotora 中移除“(.+)”？$/);
    if (match) {
      return `${leading}Remove “${match[1]}” from Fotora?${trailing}`;
    }
    match = core.match(/^文件夹：(.+)$/);
    if (match) return `${leading}Folder: ${match[1]}${trailing}`;
    match = core.match(/^没有(.+)拍摄的项目$/);
    if (match)
      return `${leading}No items captured with ${match[1]}.${trailing}`;
    match = core.match(/^没有(.+)项目$/);
    if (match) return `${leading}No ${match[1]} items.${trailing}`;
    match = core.match(/^位置：(.+)$/);
    if (match) return `${leading}Location: ${match[1]}${trailing}`;
    match = core.match(
      /^将修改 (\d+) 个项目；保留原扩展名，不移动文件夹。目标名称已存在时会覆盖同名文件。$/,
    );
    if (match) {
      return `${leading}This changes ${match[1]} items, keeps their extensions, and does not move folders. Existing files with the same names will be replaced.${trailing}`;
    }
    match = core.match(
      /^将按当前点击顺序写入 (\d+) 个项目，共 (\d+) 个时间组。$/,
    );
    if (match) {
      return `${leading}Capture times will be written for ${match[1]} items in the current click order across ${match[2]} time groups.${trailing}`;
    }
    match = core.match(/^已按顺序修改 (\d+) 个文件名，覆盖 (\d+) 个同名文件$/);
    if (match) {
      return `${leading}Renamed ${match[1]} files and replaced ${match[2]} files with the same names.${trailing}`;
    }
    match = core.match(/^已按顺序修改 (\d+) 个文件名$/);
    if (match)
      return `${leading}Renamed ${match[1]} files in sequence.${trailing}`;
    match = core.match(/^已按 1→(\d+) 写入拍摄时间$/);
    if (match) {
      return `${leading}Capture times written from 1 through ${match[1]}.${trailing}`;
    }
    match = core.match(/^编号失败：(.+)$/);
    if (match) return `${leading}Numbering failed: ${match[1]}${trailing}`;
    match = core.match(/^保存位置失败：(.+)$/);
    if (match)
      return `${leading}Could not save the location: ${match[1]}${trailing}`;
    match = core.match(/^(.+)没有可用的拍摄时间$/);
    if (match)
      return `${leading}${match[1]} has no available capture time.${trailing}`;
    match = core.match(/^(\d+) 个不同位置$/);
    if (match) return `${leading}${match[1]} different locations${trailing}`;
    return value;
  }

  function shouldSkip(node) {
    const element =
      node.nodeType === Node.ELEMENT_NODE ? node : node.parentElement;
    return Boolean(element?.closest?.(SKIP_SELECTOR));
  }

  function translateTextNode(node) {
    if (!node || shouldSkip(node)) return;
    const state = textState.get(node);
    if (language !== "en") {
      if (state && node.data === state.english) node.data = state.chinese;
      return;
    }
    const source =
      state && node.data === state.english ? state.chinese : node.data;
    const translated = translateValue(source);
    if (translated === source) return;
    textState.set(node, { chinese: source, english: translated });
    if (node.data !== translated) node.data = translated;
  }

  function translateElementAttributes(element) {
    if (shouldSkip(element)) return;
    let states = attributeState.get(element);
    for (const attribute of ATTRIBUTES) {
      if (!element.hasAttribute(attribute)) continue;
      const current = element.getAttribute(attribute);
      const state = states?.get(attribute);
      if (language !== "en") {
        if (state && current === state.english) {
          element.setAttribute(attribute, state.chinese);
        }
        continue;
      }
      const source =
        state && current === state.english ? state.chinese : current;
      const translated = translateValue(source);
      if (translated === source) continue;
      if (!states) {
        states = new Map();
        attributeState.set(element, states);
      }
      states.set(attribute, { chinese: source, english: translated });
      if (element.getAttribute(attribute) !== translated) {
        element.setAttribute(attribute, translated);
      }
    }
  }

  function translateTree(root) {
    if (!root) {
      observer?.takeRecords();
      return;
    }
    if (!translating && observer?.takeRecords) {
      observer.takeRecords();
    }
    translating = true;
    try {
      if (root.nodeType === Node.TEXT_NODE) {
        translateTextNode(root);
      } else {
        const walker = document.createTreeWalker(
          root,
          NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT,
        );
        let node = walker.currentNode;
        while (node) {
          if (node.nodeType === Node.TEXT_NODE) translateTextNode(node);
          else if (node.nodeType === Node.ELEMENT_NODE) {
            translateElementAttributes(node);
          }
          node = walker.nextNode();
        }
      }
    } finally {
      translating = false;
    }
  }

  function connectObserver() {
    if (observer) observer.disconnect();
    /* iframe 被快速销毁时，DOMContentLoaded 回调可能跑在已丢弃的文档上，
       此时 documentElement 为 null，observe 会抛未捕获异常。安全跳过。 */
    const root = document.documentElement;
    if (!root) return;
    observer = new MutationObserver((records) => {
      if (translating) return;
      for (const record of records) {
        if (record.type === "characterData") {
          translateTextNode(record.target);
        } else if (record.type === "attributes" && record.target) {
          translateElementAttributes(record.target);
        } else {
          for (const node of record.addedNodes) translateTree(node);
        }
      }
    });
    try {
      observer.observe(root, {
        subtree: true,
        childList: true,
        characterData: true,
        attributes: true,
        attributeFilter: ATTRIBUTES,
      });
    } catch {
      /* 文档在建立观察的瞬间被销毁：放弃本次观察，不抛未捕获异常。 */
      observer = null;
    }
  }

  function setLanguage(next, { translateNow = true } = {}) {
    language = next === "en" ? "en" : "zh-CN";
    if (!document.documentElement) return;
    document.documentElement.lang = language;
    document.documentElement.dataset.uiLanguage =
      language === "en" ? "en" : "zh-CN";
    if (translateNow && document.body) translateTree(document.body);
  }

  window.FotoraLanguage = Object.freeze({
    setLanguage,
    translate: translateTree,
    translateValue,
    getLanguage: () => language,
  });

  if (document.readyState === "loading") {
    document.addEventListener(
      "DOMContentLoaded",
      () => {
        if (!document.documentElement) return;
        connectObserver();
        setLanguage(document.documentElement.lang === "en" ? "en" : "zh-CN");
      },
      { once: true },
    );
  } else {
    if (!document.documentElement) return;
    connectObserver();
    setLanguage(document.documentElement.lang === "en" ? "en" : "zh-CN");
  }
})();
