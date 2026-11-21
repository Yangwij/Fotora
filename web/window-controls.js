(() => {
  const api = window.albumWindow;
  if (!api) {
    document.documentElement.classList.add("browser-preview");
    return;
  }

  const setMaximized = (value) => {
    const maximized = Boolean(value);
    document.documentElement.classList.toggle("is-maximized", maximized);
    for (const button of document.querySelectorAll(
      '[data-window-action="toggle-maximize"]',
    )) {
      const label = maximized ? "还原窗口" : "最大化窗口";
      button.setAttribute("aria-label", label);
      button.title = maximized ? "还原" : "最大化";
    }
  };
  const setFullscreen = (value) => {
    document.documentElement.classList.toggle("is-fullscreen", Boolean(value));
  };
  let fullscreenPending = false;

  const toggleFullscreen = async () => {
    if (fullscreenPending) return;
    fullscreenPending = true;
    document.dispatchEvent(new CustomEvent("album:fullscreen-will-change"));
    try {
      const result = await api.toggleFullscreen();
      setFullscreen(result && result.fullscreen);
      document.dispatchEvent(
        new CustomEvent("album:fullscreen-changed", {
          detail: { fullscreen: Boolean(result && result.fullscreen) },
        }),
      );
    } catch {
    } finally {
      fullscreenPending = false;
    }
  };

  document.addEventListener("keydown", (event) => {
    if (event.repeat || event.shiftKey) return;
    const key = String(event.key || "").toLowerCase();
    const primary = event.ctrlKey || event.metaKey;
    if (event.altKey && !primary && key === "w") {
      event.preventDefault();
      api.close();
      return;
    }
    if (event.altKey || !primary) return;

    if (key === "0") {
      event.preventDefault();
      toggleFullscreen();
      return;
    }
    if (key === "1") {
      event.preventDefault();
      api.minimize();
      return;
    }
    if (key === "2") {
      event.preventDefault();
      api
        .toggleMaximize()
        .then((result) => {
          setMaximized(result && result.maximized);
        })
        .catch(() => {});
      return;
    }
    if (key === "3") {
      event.preventDefault();
      api.close();
    }
  });

  api
    .isMaximized()
    .then(setMaximized)
    .catch(() => {});
  api.onMaximizedChange(setMaximized);
  api
    .isFullscreen()
    .then(setFullscreen)
    .catch(() => {});
  api.onFullscreenChange(setFullscreen);

  document.querySelectorAll("[data-window-action]").forEach((button) => {
    button.addEventListener("click", async () => {
      const action = button.dataset.windowAction;
      if (action === "toggle-fullscreen") {
        await toggleFullscreen();
        return;
      }
      if (action === "minimize") {
        api.minimize();
        return;
      }
      if (action === "close") {
        api.close();
        return;
      }
      if (action === "toggle-maximize") {
        try {
          const result = await api.toggleMaximize();
          setMaximized(result && result.maximized);
        } catch {}
      }
    });
  });
})();
