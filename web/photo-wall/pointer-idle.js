(() => {
  const POINTER_IDLE_MS = 2000;
  const root = document.documentElement;
  let idleTimer = 0;
  let pointerInside = true;
  let windowActive = true;

  function showCursor() {
    root.removeAttribute("data-photo-wall-pointer-idle");
  }

  function clearIdleTimer() {
    window.clearTimeout(idleTimer);
    idleTimer = 0;
  }

  function scheduleIdle() {
    clearIdleTimer();
    showCursor();

    if (
      !pointerInside ||
      !windowActive ||
      document.visibilityState !== "visible"
    ) {
      return;
    }

    idleTimer = window.setTimeout(() => {
      idleTimer = 0;
      if (
        pointerInside &&
        windowActive &&
        document.visibilityState === "visible"
      ) {
        root.setAttribute("data-photo-wall-pointer-idle", "true");
      }
    }, POINTER_IDLE_MS);
  }

  function handlePointerActivity() {
    pointerInside = true;
    scheduleIdle();
  }

  function handlePointerOut(event) {
    if (event.relatedTarget) return;
    handlePointerLeaveWindow();
  }

  function handlePointerLeaveWindow() {
    pointerInside = false;
    clearIdleTimer();
    showCursor();
  }

  function handleVisibilityChange() {
    if (document.visibilityState === "visible") scheduleIdle();
    else {
      clearIdleTimer();
      showCursor();
    }
  }

  document.addEventListener("pointermove", handlePointerActivity, {
    capture: true,
    passive: true,
  });
  document.addEventListener("mousemove", handlePointerActivity, {
    capture: true,
    passive: true,
  });
  document.addEventListener("pointerdown", handlePointerActivity, true);
  document.addEventListener("pointerover", handlePointerActivity, {
    capture: true,
    passive: true,
  });
  document.addEventListener("pointerout", handlePointerOut, true);
  document.addEventListener("mouseout", handlePointerOut, true);
  document.addEventListener("pointerleave", handlePointerLeaveWindow, true);
  document.addEventListener("mouseleave", handlePointerLeaveWindow, true);
  document.addEventListener("visibilitychange", handleVisibilityChange);

  window.addEventListener("message", (event) => {
    if (event.origin !== window.location.origin) return;
    if (event.source !== window.parent || !event.data?.type) return;

    if (event.data.type === "photo-wall:init") {
      root.classList.remove("photo-wall-exiting");
      return;
    }

    if (event.data.type === "photo-wall:exit-animation") {
      root.classList.add("photo-wall-exiting");
      if (
        document.activeElement instanceof HTMLElement &&
        document.activeElement !== document.body
      ) {
        document.activeElement.blur();
      }
    }
  });

  window.addEventListener("blur", () => {
    windowActive = false;
    clearIdleTimer();
    showCursor();
  });
  window.addEventListener("focus", () => {
    windowActive = true;
    scheduleIdle();
  });
})();
