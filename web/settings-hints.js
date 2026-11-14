(() => {
  const menu = document.getElementById("popMenu");
  const bubble = document.getElementById("settingsOptionHint");
  if (!menu || !bubble) return;

  const HINT_DELAY_MS = 700;
  const POINTER_RESET_PX = 3;
  const VIEWPORT_MARGIN = 10;
  const ANCHOR_GAP = 10;
  const POINTER_CLEARANCE = 14;
  let target = null;
  let shownTarget = null;
  let showTimer = 0;
  let hideTimer = 0;
  let lastPointer = { x: 0, y: 0 };
  let showOrigin = { x: 0, y: 0 };

  const clearShowTimer = () => {
    window.clearTimeout(showTimer);
    showTimer = 0;
  };

  const clearHideTimer = () => {
    window.clearTimeout(hideTimer);
    hideTimer = 0;
  };

  const hide = () => {
    clearShowTimer();
    target = null;
    if (shownTarget) {
      shownTarget.removeAttribute("aria-describedby");
      shownTarget = null;
    }
    bubble.classList.remove("is-visible");
    bubble.setAttribute("aria-hidden", "true");
    clearHideTimer();
    hideTimer = window.setTimeout(() => {
      hideTimer = 0;
      bubble.hidden = true;
    }, 115);
  };

  const settingsTargetFromEvent = (event) => {
    if (
      event.pointerType &&
      event.pointerType !== "mouse" &&
      event.pointerType !== "pen"
    )
      return null;
    const candidate =
      event.target instanceof Element
        ? event.target.closest("[data-settings-hint]")
        : null;
    return candidate &&
      menu.classList.contains("is-settings") &&
      menu.contains(candidate)
      ? candidate
      : null;
  };

  const clamp = (value, minimum, maximum) =>
    Math.min(Math.max(value, minimum), Math.max(minimum, maximum));

  const overlapsPointer = (candidate, width, height) => {
    const left = candidate.x;
    const top = candidate.y;
    const right = left + width;
    const bottom = top + height;
    return (
      lastPointer.x >= left - POINTER_CLEARANCE &&
      lastPointer.x <= right + POINTER_CLEARANCE &&
      lastPointer.y >= top - POINTER_CLEARANCE &&
      lastPointer.y <= bottom + POINTER_CLEARANCE
    );
  };

  const placeBubble = (anchor) => {
    const anchorRect = anchor.getBoundingClientRect();
    const width = bubble.offsetWidth;
    const height = bubble.offsetHeight;
    const viewportWidth = document.documentElement.clientWidth;
    const viewportHeight = document.documentElement.clientHeight;
    const centeredX = clamp(
      lastPointer.x - width / 2,
      VIEWPORT_MARGIN,
      viewportWidth - VIEWPORT_MARGIN - width,
    );
    const centeredY = clamp(
      anchorRect.top + (anchorRect.height - height) / 2,
      VIEWPORT_MARGIN,
      viewportHeight - VIEWPORT_MARGIN - height,
    );
    const candidates = [
      {
        x: anchorRect.right + ANCHOR_GAP,
        y: centeredY,
      },
      {
        x: anchorRect.left - ANCHOR_GAP - width,
        y: centeredY,
      },
      {
        x: centeredX,
        y: anchorRect.top - ANCHOR_GAP - height,
      },
      {
        x: centeredX,
        y: anchorRect.bottom + ANCHOR_GAP,
      },
    ].map((candidate) => ({
      x: clamp(
        candidate.x,
        VIEWPORT_MARGIN,
        viewportWidth - VIEWPORT_MARGIN - width,
      ),
      y: clamp(
        candidate.y,
        VIEWPORT_MARGIN,
        viewportHeight - VIEWPORT_MARGIN - height,
      ),
    }));

    const placement = candidates.find(
      (candidate) => !overlapsPointer(candidate, width, height),
    );
    if (!placement) return false;
    bubble.style.left = `${Math.round(placement.x)}px`;
    bubble.style.top = `${Math.round(placement.y)}px`;
    return true;
  };

  const show = () => {
    showTimer = 0;
    if (
      !target ||
      !target.isConnected ||
      !menu.classList.contains("is-settings") ||
      !target.dataset.settingsHint
    )
      return;
    clearHideTimer();
    bubble.textContent = target.dataset.settingsHint;
    bubble.hidden = false;
    bubble.classList.remove("is-visible");
    bubble.setAttribute("aria-hidden", "false");
    if (!placeBubble(target)) {
      bubble.hidden = true;
      bubble.setAttribute("aria-hidden", "true");
      return;
    }
    shownTarget = target;
    target.setAttribute("aria-describedby", bubble.id);
    requestAnimationFrame(() => {
      if (shownTarget === target) bubble.classList.add("is-visible");
    });
  };

  const schedule = (nextTarget, event) => {
    if (!nextTarget) {
      hide();
      return;
    }
    clearShowTimer();
    if (shownTarget && shownTarget !== nextTarget) hide();
    target = nextTarget;
    lastPointer = { x: event.clientX, y: event.clientY };
    showOrigin = { x: event.clientX, y: event.clientY };
    showTimer = window.setTimeout(show, HINT_DELAY_MS);
  };

  document.addEventListener("pointerover", (event) => {
    const nextTarget = settingsTargetFromEvent(event);
    if (!nextTarget || nextTarget === target) return;
    schedule(nextTarget, event);
  });

  document.addEventListener("pointerout", (event) => {
    const leaving = settingsTargetFromEvent(event);
    if (!leaving || leaving !== target) return;
    const related = event.relatedTarget;
    if (related instanceof Node && leaving.contains(related)) return;
    hide();
  });

  document.addEventListener(
    "pointermove",
    (event) => {
      const nextTarget = settingsTargetFromEvent(event);
      if (!nextTarget) {
        if (target || shownTarget) hide();
        return;
      }
      lastPointer = { x: event.clientX, y: event.clientY };
      if (nextTarget !== target) {
        schedule(nextTarget, event);
        return;
      }
      if (
        Math.hypot(
          event.clientX - showOrigin.x,
          event.clientY - showOrigin.y,
        ) <= POINTER_RESET_PX
      )
        return;
      if (shownTarget) hide();
      clearShowTimer();
      target = nextTarget;
      showOrigin = { x: event.clientX, y: event.clientY };
      showTimer = window.setTimeout(show, HINT_DELAY_MS);
    },
    { passive: true },
  );

  document.addEventListener("pointerdown", hide, true);
  document.addEventListener("scroll", hide, true);
  window.addEventListener("resize", hide);
  window.addEventListener("blur", hide);
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" || event.key === "Tab") hide();
  });
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) hide();
  });

  new MutationObserver(() => {
    if (target || shownTarget) hide();
  }).observe(menu, { childList: true, subtree: true });
})();
