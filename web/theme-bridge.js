/* 配色主题桥接：主窗口和地图、照片墙 iframe 共用同一套 CSS 颜色。 */
(() => {
  const COLOR_THEME_KEY = "color-theme";
  const FONT_THEME_KEY = "font-theme";
  const themes = new Set(["default", "warm", "mist", "claude"]);
  const fonts = new Set(["pingfang", "anthropic"]);
  const preserveMapLanguage = window.location.pathname.startsWith("/map/");

  function normalize(theme) {
    return themes.has(theme) ? theme : "default";
  }

  function apply(theme) {
    const next = normalize(theme);
    document.documentElement.dataset.colorTheme = next;
    try {
      localStorage.setItem(COLOR_THEME_KEY, next);
    } catch {}
    return next;
  }

  function applyFont(theme, { persist = true } = {}) {
    const next = preserveMapLanguage
      ? "pingfang"
      : fonts.has(theme)
        ? theme
        : "pingfang";
    document.documentElement.dataset.fontTheme = next;
    window.FotoraLanguage?.setLanguage(theme === "anthropic" ? "en" : "zh-CN");
    if (!preserveMapLanguage) {
      window.dispatchEvent(
        new CustomEvent("fotora:language-change", {
          detail: { language: theme === "anthropic" ? "en" : "zh-CN" },
        }),
      );
      if (persist) {
        try {
          localStorage.setItem(FONT_THEME_KEY, next);
        } catch {}
      }
    } else {
      window.dispatchEvent(
        new CustomEvent("fotora:language-change", {
          detail: { language: theme === "anthropic" ? "en" : "zh-CN" },
        }),
      );
    }
    return next;
  }

  try {
    apply(localStorage.getItem(COLOR_THEME_KEY));
    applyFont(localStorage.getItem(FONT_THEME_KEY), { persist: false });
  } catch {
    apply("default");
    applyFont("pingfang", { persist: false });
  }

  window.addEventListener("message", (event) => {
    if (event.origin !== window.location.origin) return;
    if (event.data?.type === "photo:color-theme") {
      apply(event.data.theme);
    }
    if (event.data?.type === "photo:font-theme") {
      applyFont(event.data.theme, { persist: false });
    }
  });

  window.addEventListener("storage", (event) => {
    if (event.key === COLOR_THEME_KEY) apply(event.newValue);
    if (event.key === FONT_THEME_KEY)
      applyFont(event.newValue, { persist: false });
  });
})();
