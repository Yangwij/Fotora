/* iOS 17 风格的相簿幻灯片。播放层只读取当前列表里的照片，不修改相簿、排序或筛选。 */
(() => {
  const root = document.getElementById("albumSlideshow");
  if (!root) return;

  const stage = document.getElementById("slideshowStage");
  const intro = document.getElementById("slideshowIntro");
  const title = document.getElementById("slideshowTitle");
  const dateRange = document.getElementById("slideshowDateRange");
  const counter = document.getElementById("slideshowCounter");
  const progress = document.getElementById("slideshowProgress");
  const closeButton = document.getElementById("slideshowClose");
  const topControls = document.getElementById("slideshowTopControls");
  const bottomControls = document.getElementById("slideshowBottomControls");
  const previousButton = document.getElementById("slideshowPrev");
  const toggleButton = document.getElementById("slideshowToggle");
  const nextButton = document.getElementById("slideshowNext");
  const replayButton = document.getElementById("slideshowReplay");
  const returnButton = document.getElementById("slideshowReturn");
  const endCard = document.getElementById("slideshowEndCard");
  const endTitle = document.getElementById("slideshowEndTitle");
  const liveStatus = document.getElementById("slideshowLiveStatus");
  const settingsButton = document.getElementById("slideshowSettingsButton");
  const settingsPanel = document.getElementById("slideshowSettingsPanel");
  const repeatButton = document.getElementById("slideshowRepeat");
  const speedInput = document.getElementById("slideshowSpeed");
  const speedValue = document.getElementById("slideshowSpeedValue");
  const orderButtons = [...root.querySelectorAll("[data-slideshow-order]")];
  const app = document.querySelector(".app");
  const sidebarRailButton = document.getElementById("sidebarRailBtn");
  const reducedMotionQuery = window.matchMedia(
    "(prefers-reduced-motion: reduce)",
  );

  const SINGLE_HOLD_MS = 4500;
  const TRANSITION_MS = 900;
  const PHOTO_MOTION_MS = SINGLE_HOLD_MS + TRANSITION_MS;
  const REDUCED_TRANSITION_MS = 180;
  const TRANSITION_EASING = "cubic-bezier(0.42, 0, 0.58, 1)";
  const INTRO_HOLD_MS = 2300;
  const CONTROLS_IDLE_MS = 2000;
  const SHOW_SLIDESHOW_CONTROLS_KEY = "slideshow-show-function-controls";
  const REPEAT_PLAYBACK_KEY = "slideshow-repeat-playback";
  const PLAYBACK_SPEED_KEY = "slideshow-playback-speed";
  const PLAYBACK_ORDER_KEY = "slideshow-playback-order";
  const DEFAULT_PLAYBACK_ORDER = "sequential";
  const MIN_PLAYBACK_SPEED = 0.5;
  const MAX_PLAYBACK_SPEED = 2;
  const PLAYBACK_SPEED_STEP = 0.25;
  const DEFAULT_PLAYBACK_SPEED = 1;
  const clampPlaybackSpeed = (value) => {
    const number = Number(value);
    if (!Number.isFinite(number)) return DEFAULT_PLAYBACK_SPEED;
    const clamped = Math.min(
      MAX_PLAYBACK_SPEED,
      Math.max(MIN_PLAYBACK_SPEED, number),
    );
    return Math.round(clamped * 100) / 100;
  };
  const normalizePlaybackSpeed = (value) => {
    const clamped = clampPlaybackSpeed(value);
    return Math.round(clamped / PLAYBACK_SPEED_STEP) * PLAYBACK_SPEED_STEP;
  };
  const formatPlaybackSpeed = (value) => {
    const rounded = Math.round(value * 100) / 100;
    return Number.isInteger(rounded)
      ? String(rounded)
      : rounded.toFixed(2).replace(/0$/, "");
  };

  let active = false;
  let photos = [];
  let scenes = [];
  let sceneIndex = -1;
  let currentScene = null;
  let paused = false;
  let ended = false;
  let sceneDueAt = 0;
  let sceneRemaining = 0;
  let sceneTimer = 0;
  let controlsTimer = 0;
  let introTimer = 0;
  let closeTimer = 0;
  let openingFocus = null;
  let sceneAnimations = new Map();
  let progressAnimation = null;
  let preloadCache = [];
  let controlsVisibleOnOpen = readControlsVisibleOnOpen();
  let repeatPlayback = readRepeatPlayback();
  let playbackSpeed = readPlaybackSpeed();
  let playbackOrder = readPlaybackOrder();
  let settingsOpen = false;

  const isReducedMotion = () => reducedMotionQuery.matches;
  function readControlsVisibleOnOpen() {
    try {
      const stored = localStorage.getItem(SHOW_SLIDESHOW_CONTROLS_KEY);
      return stored === null ? true : stored === "true";
    } catch {
      return true;
    }
  }
  function readRepeatPlayback() {
    try {
      return localStorage.getItem(REPEAT_PLAYBACK_KEY) === "true";
    } catch {
      return false;
    }
  }
  function readPlaybackSpeed() {
    try {
      const stored = localStorage.getItem(PLAYBACK_SPEED_KEY);
      return stored === null
        ? DEFAULT_PLAYBACK_SPEED
        : normalizePlaybackSpeed(stored);
    } catch {
      return DEFAULT_PLAYBACK_SPEED;
    }
  }
  function normalizePlaybackOrder(value) {
    return value === "random" ? "random" : DEFAULT_PLAYBACK_ORDER;
  }
  function readPlaybackOrder() {
    try {
      return normalizePlaybackOrder(localStorage.getItem(PLAYBACK_ORDER_KEY));
    } catch {
      return DEFAULT_PLAYBACK_ORDER;
    }
  }
  const itemDate = (item) => Number(item?.taken_at ?? item?.mtime ?? 0) || 0;
  const itemAspect = (item) => {
    const width = Number(item?.width) || 0;
    const height = Number(item?.height) || 0;
    return width > 0 && height > 0 ? width / height : 1.4;
  };
  const photoUrl = (item) => {
    if (typeof itemThumbUrl === "function")
      return itemThumbUrl(item, 1600, "inside");
    const version = `${Number(item?.mtime) || 0}-${Number(item?.size) || 0}-${Number(item?.editRevision) || 0}`;
    return `/api/thumb/${item.id}?size=1600&fit=inside&v=${encodeURIComponent(version)}`;
  };
  const formatDay = (ms) => {
    const date = new Date(ms);
    if (Number.isNaN(date.getTime())) return "";
    return `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日`;
  };
  const formatDateRange = (items) => {
    const dates = items
      .map(itemDate)
      .filter((value) => value > 0)
      .sort((a, b) => a - b);
    if (!dates.length) return "";
    const first = new Date(dates[0]);
    const last = new Date(dates[dates.length - 1]);
    if (first.toDateString() === last.toDateString())
      return formatDay(dates[0]);
    if (first.getFullYear() === last.getFullYear()) {
      return (
        `${first.getFullYear()}年${first.getMonth() + 1}月${first.getDate()}日` +
        ` — ${last.getMonth() + 1}月${last.getDate()}日`
      );
    }
    return `${formatDay(dates[0])} — ${formatDay(dates[dates.length - 1])}`;
  };

  function buildScenes(items) {
    return items.map((item, index) => ({
      items: [item],
      startPhotoIndex: index,
      endPhotoIndex: index,
    }));
  }

  function shufflePhotos(items) {
    const shuffled = [...items];
    for (let index = shuffled.length - 1; index > 0; index -= 1) {
      const swapIndex = Math.floor(Math.random() * (index + 1));
      [shuffled[index], shuffled[swapIndex]] = [
        shuffled[swapIndex],
        shuffled[index],
      ];
    }
    if (shuffled.length > 1 && shuffled[0]?.id === items[0]?.id) {
      const swapIndex = 1 + Math.floor(Math.random() * (shuffled.length - 1));
      [shuffled[0], shuffled[swapIndex]] = [shuffled[swapIndex], shuffled[0]];
    }
    return shuffled;
  }

  function buildPlaybackScenes(currentPhotoId = null) {
    if (playbackOrder !== "random") return buildScenes(photos);
    if (currentPhotoId != null) {
      const currentPhoto = photos.find((item) => item.id === currentPhotoId);
      if (currentPhoto) {
        const remaining = photos.filter((item) => item.id !== currentPhotoId);
        return buildScenes([currentPhoto, ...shufflePhotos(remaining)]);
      }
    }
    return buildScenes(shufflePhotos(photos));
  }

  function createPhoto(item) {
    const photo = document.createElement("figure");
    const source = photoUrl(item);
    const portrait = itemAspect(item) < 0.84;
    photo.className = `slideshow-photo${portrait ? " is-portrait" : ""}`;

    const backdrop = document.createElement("span");
    backdrop.className = "slideshow-photo-backdrop";
    backdrop.style.backgroundImage = `url("${source}")`;

    const image = document.createElement("img");
    image.className = "slideshow-photo-image";
    image.alt = "";
    image.draggable = false;
    image.decoding = "async";
    image.src = source;
    image.addEventListener(
      "error",
      () => {
        image.classList.add("is-unavailable");
        photo.classList.add("has-load-error");
      },
      { once: true },
    );

    photo.append(backdrop, image);
    return photo;
  }

  function createScene(entry, index) {
    const scene = document.createElement("section");
    scene.className = "slideshow-scene is-single";
    scene.dataset.sceneIndex = String(index);
    scene.dataset.photoCount = String(entry.items.length);
    scene.dataset.startPhoto = String(entry.startPhotoIndex + 1);
    scene.dataset.endPhoto = String(entry.endPhotoIndex + 1);
    for (const item of entry.items) scene.append(createPhoto(item));
    return scene;
  }

  function trackAnimation(animation, owner = null) {
    animation.playbackRate = playbackSpeed;
    sceneAnimations.set(animation, owner);
    animation.finished
      .catch(() => {})
      .finally(() => sceneAnimations.delete(animation));
    return animation;
  }

  function cancelSceneAnimations() {
    for (const animation of sceneAnimations.keys()) animation.cancel();
    sceneAnimations = new Map();
    progressAnimation = null;
  }

  function cancelSceneAnimationsFor(node) {
    for (const [animation, owner] of sceneAnimations) {
      if (owner !== node) continue;
      animation.cancel();
      sceneAnimations.delete(animation);
    }
  }

  function pauseSceneAnimations() {
    for (const animation of sceneAnimations.keys()) {
      if (animation.playState === "running") animation.pause();
    }
  }

  function resumeSceneAnimations() {
    for (const animation of sceneAnimations.keys()) {
      if (animation.playState === "paused") animation.play();
    }
  }

  function updatePlaybackSettingsUI() {
    repeatButton.setAttribute("aria-checked", String(repeatPlayback));
    const speedLabel = formatPlaybackSpeed(playbackSpeed);
    speedInput.value = String(playbackSpeed);
    const progressValue =
      (playbackSpeed - MIN_PLAYBACK_SPEED) /
      (MAX_PLAYBACK_SPEED - MIN_PLAYBACK_SPEED);
    speedInput.style.setProperty(
      "--slideshow-speed-fill",
      `${Math.max(0, Math.min(1, progressValue)) * 100}%`,
    );
    speedInput.setAttribute("aria-valuetext", `${speedLabel} 倍速`);
    speedValue.value = `${speedLabel}×`;
    speedValue.textContent = `${speedLabel}×`;
    updatePlaybackOrderUI();
  }

  function updatePlaybackOrderUI() {
    for (const button of orderButtons) {
      button.setAttribute(
        "aria-pressed",
        String(button.dataset.slideshowOrder === playbackOrder),
      );
    }
  }

  function setPlaybackOrder(value, { persist = true, announce = true } = {}) {
    const next = normalizePlaybackOrder(value);
    if (next === playbackOrder) return;

    const currentPhotoId = scenes[sceneIndex]?.items[0]?.id ?? null;
    playbackOrder = next;
    updatePlaybackOrderUI();
    if (persist) {
      try {
        localStorage.setItem(PLAYBACK_ORDER_KEY, playbackOrder);
      } catch {}
    }
    if (!active) return;

    if (ended) {
      replay({ preserveControls: true });
    } else {
      scenes = buildPlaybackScenes(currentPhotoId);
      const nextIndex = scenes.findIndex(
        (scene) => scene.items[0]?.id === currentPhotoId,
      );
      if (nextIndex >= 0) {
        sceneIndex = nextIndex;
        updateCounter(scenes[nextIndex]);
        preloadScene(1);
        preloadScene(2);
      } else {
        renderScene(0, { animateIn: false, preservePrevious: false });
      }
    }
    if (announce) {
      liveStatus.textContent =
        playbackOrder === "random" ? "已切换为随机播放" : "已切换为顺序播放";
    }
  }

  function setRepeatPlayback(value, { persist = true } = {}) {
    const next = Boolean(value);
    if (next === repeatPlayback) {
      updatePlaybackSettingsUI();
      return;
    }
    repeatPlayback = next;
    updatePlaybackSettingsUI();
    if (persist) {
      try {
        localStorage.setItem(REPEAT_PLAYBACK_KEY, String(repeatPlayback));
      } catch {}
    }
    if (!active) return;
    liveStatus.textContent = repeatPlayback
      ? "已开启重复播放"
      : "已关闭重复播放";
    if (repeatPlayback && ended) replay({ preserveControls: true });
  }

  function setPlaybackSpeed(value, { persist = true, snap = true } = {}) {
    const next = snap
      ? normalizePlaybackSpeed(value)
      : clampPlaybackSpeed(value);
    const previous = playbackSpeed;
    playbackSpeed = next;
    updatePlaybackSettingsUI();
    if (persist) {
      try {
        localStorage.setItem(PLAYBACK_SPEED_KEY, String(playbackSpeed));
      } catch {}
    }
    if (!active || ended || next === previous) return;

    for (const animation of sceneAnimations) animation.playbackRate = next;
    if (paused) {
      sceneRemaining = Math.max(20, (sceneRemaining * previous) / next);
      return;
    }
    if (sceneDueAt) {
      const remainingAtCurrentSpeed = Math.max(
        20,
        sceneDueAt - performance.now(),
      );
      const remainingAtBaseSpeed = remainingAtCurrentSpeed * previous;
      scheduleAdvance(remainingAtBaseSpeed / next);
    }
  }

  function settlePlaybackSpeed() {
    setPlaybackSpeed(playbackSpeed);
    speedInput.classList.remove("is-dragging");
  }

  function nudgePlaybackSpeed(direction) {
    const currentStep = Math.round(
      (normalizePlaybackSpeed(playbackSpeed) - MIN_PLAYBACK_SPEED) /
        PLAYBACK_SPEED_STEP,
    );
    const maxStep = Math.round(
      (MAX_PLAYBACK_SPEED - MIN_PLAYBACK_SPEED) / PLAYBACK_SPEED_STEP,
    );
    const nextStep = Math.min(maxStep, Math.max(0, currentStep + direction));
    setPlaybackSpeed(MIN_PLAYBACK_SPEED + nextStep * PLAYBACK_SPEED_STEP);
  }

  function setSettingsOpen(value, { restoreFocus = false } = {}) {
    const next = Boolean(value);
    settingsOpen = next;
    settingsPanel.hidden = !settingsOpen;
    settingsButton.setAttribute("aria-expanded", String(settingsOpen));
    if (settingsOpen) {
      showControls({ autoHide: false });
    } else {
      if (restoreFocus) settingsButton.focus({ preventScroll: true });
      if (active) showControls();
    }
  }

  function sceneTransition() {
    const duration = isReducedMotion() ? REDUCED_TRANSITION_MS : TRANSITION_MS;
    return {
      duration,
      incoming: [{ opacity: 0 }, { opacity: 1 }],
      outgoing: [
        { opacity: 1, offset: 0 },
        { opacity: 1, offset: 0.91 },
        { opacity: 0, offset: 1 },
      ],
    };
  }

  function animateSceneIn(scene, frames, duration) {
    trackAnimation(
      scene.animate(frames, {
        duration,
        easing: TRANSITION_EASING,
        fill: "both",
      }),
      scene,
    );
  }

  function animatePhotos(scene, index) {
    if (isReducedMotion()) return;
    const image = scene.querySelector(".slideshow-photo-image");
    if (!image) return;
    const portrait = Boolean(
      scene.querySelector(".slideshow-photo.is-portrait"),
    );
    const direction = index % 2 === 0 ? 1 : -1;
    const vertical = portrait || index % 5 === 0;
    const travel = index % 3 === 0 ? 1 : 0.85;
    const startScale = index % 4 === 2 ? 1.065 : 1.025;
    const endScale = index % 4 === 2 ? 1.025 : 1.065;
    const start = vertical
      ? `translate3d(0, ${-direction * travel}%, 0) scale(${startScale})`
      : `translate3d(${-direction * travel}%, 0, 0) scale(${startScale})`;
    const end = vertical
      ? `translate3d(0, ${direction * travel}%, 0) scale(${endScale})`
      : `translate3d(${direction * travel}%, 0, 0) scale(${endScale})`;
    trackAnimation(
      image.animate([{ transform: start }, { transform: end }], {
        duration: PHOTO_MOTION_MS,
        easing: "linear",
        fill: "both",
      }),
      scene,
    );
  }

  function animateProgress(duration) {
    progressAnimation?.cancel();
    progressAnimation = trackAnimation(
      progress.animate(
        [{ transform: "scaleX(0)" }, { transform: "scaleX(1)" }],
        {
          duration,
          easing: "linear",
          fill: "both",
        },
      ),
      progress,
    );
  }

  function clearSceneTimer() {
    window.clearTimeout(sceneTimer);
    sceneTimer = 0;
  }

  function scheduleAdvance(delay = null) {
    clearSceneTimer();
    const duration = delay == null ? sceneRemaining : delay;
    if (paused || ended) {
      sceneRemaining = Math.max(0, duration);
      sceneDueAt = 0;
      return;
    }
    sceneRemaining = Math.max(0, duration);
    sceneDueAt = performance.now() + sceneRemaining;
    sceneTimer = window.setTimeout(() => {
      sceneTimer = 0;
      advanceScene();
    }, sceneRemaining);
  }

  function updateControlsState() {
    root.classList.toggle("is-paused", paused || ended);
    toggleButton.setAttribute(
      "aria-label",
      ended ? "重新播放" : paused ? "继续播放" : "暂停",
    );
  }

  function updateCounter(entry) {
    const first = entry.startPhotoIndex + 1;
    const last = entry.endPhotoIndex + 1;
    const range = first === last ? String(first) : `${first}–${last}`;
    counter.textContent = `${range} / ${photos.length}`;
    liveStatus.textContent =
      last === first
        ? `第 ${first} 张，共 ${photos.length} 张`
        : `第 ${first} 到 ${last} 张，共 ${photos.length} 张`;
  }

  function setControlInteractivity(enabled) {
    topControls.inert = !enabled;
    bottomControls.inert = !enabled;
  }

  function hideControls({ force = false } = {}) {
    if (!force && (paused || ended)) return;
    window.clearTimeout(controlsTimer);
    if (settingsOpen) {
      settingsOpen = false;
      settingsPanel.hidden = true;
      settingsButton.setAttribute("aria-expanded", "false");
    }
    root.classList.remove("controls-visible");
    setControlInteractivity(false);
    if (
      topControls.contains(document.activeElement) ||
      bottomControls.contains(document.activeElement)
    ) {
      root.focus({ preventScroll: true });
    }
  }

  function showControls({ autoHide = true } = {}) {
    root.classList.add("controls-visible");
    setControlInteractivity(true);
    window.clearTimeout(controlsTimer);
    if (!autoHide) return;
    controlsTimer = window.setTimeout(() => {
      if (settingsOpen) return;
      if (
        root.contains(document.activeElement) &&
        document.activeElement?.closest?.(
          ".slideshow-top-controls, .slideshow-bottom-controls",
        )
      ) {
        return;
      }
      hideControls({ force: true });
    }, CONTROLS_IDLE_MS);
  }

  function applyControlPreference() {
    window.clearTimeout(controlsTimer);
    if (controlsVisibleOnOpen) {
      showControls();
    } else {
      hideControls({ force: true });
    }
  }

  function setControlsInitiallyVisible(value) {
    const next = value !== false;
    if (next === controlsVisibleOnOpen) return;
    controlsVisibleOnOpen = next;
    if (!active) return;
    applyControlPreference();
  }

  function hideIntro() {
    window.clearTimeout(introTimer);
    intro.classList.add("is-leaving");
    introTimer = window.setTimeout(
      () => {
        intro.hidden = true;
      },
      isReducedMotion() ? 20 : 720,
    );
  }

  function revealEndCard() {
    endCard.hidden = false;
    endCard.animate(
      [
        { opacity: 0, transform: "translate(-50%, -48%) scale(0.97)" },
        { opacity: 1, transform: "translate(-50%, -50%) scale(1)" },
      ],
      {
        duration: isReducedMotion() ? 120 : 420,
        easing: "cubic-bezier(0.2, 0.76, 0.24, 1)",
        fill: "both",
      },
    );
    showControls();
  }

  function showEnd() {
    if (!active) return;
    if (repeatPlayback) {
      replay({ preserveControls: true });
      liveStatus.textContent = "已完成一轮，正在重复播放";
      return;
    }
    clearSceneTimer();
    paused = true;
    ended = true;
    sceneRemaining = 0;
    updateControlsState();
    endTitle.textContent = title.textContent;
    revealEndCard();
    window.setTimeout(() => replayButton.focus({ preventScroll: true }), 40);
  }

  function preloadScene(offset) {
    const entry = scenes[sceneIndex + offset];
    if (!entry) return;
    for (const item of entry.items) {
      const image = new Image();
      image.decoding = "async";
      image.src = photoUrl(item);
      preloadCache.push(image);
    }
    if (preloadCache.length > 8) preloadCache = preloadCache.slice(-8);
  }

  function renderScene(
    index,
    { animateIn = true, preservePrevious = true } = {},
  ) {
    if (!scenes[index]) return;
    endCard.hidden = true;
    ended = false;
    clearSceneTimer();
    const previous = preservePrevious ? currentScene : null;
    if (!preservePrevious) {
      for (const node of [...stage.children]) {
        cancelSceneAnimationsFor(node);
      }
      stage.replaceChildren();
    } else {
      for (const node of [...stage.children]) {
        if (node === previous) continue;
        cancelSceneAnimationsFor(node);
        node.remove();
      }
    }

    sceneIndex = index;
    const entry = scenes[index];
    const scene = createScene(entry, index);
    scene.style.opacity = animateIn ? "0" : "1";
    stage.append(scene);
    currentScene = scene;
    updateCounter(entry);

    const transition = animateIn ? sceneTransition() : null;
    if (previous && transition) {
      const outgoingAnimation = trackAnimation(
        previous.animate(transition.outgoing, {
          duration: transition.duration,
          easing: TRANSITION_EASING,
          fill: "both",
        }),
        previous,
      );
      outgoingAnimation.finished
        .then(() => {
          if (previous !== currentScene) previous.remove();
        })
        .catch(() => {});
    } else if (previous) {
      previous.remove();
    }

    if (transition)
      animateSceneIn(scene, transition.incoming, transition.duration);
    else
      scene.animate([{ opacity: 1 }, { opacity: 1 }], {
        duration: 1,
        fill: "both",
      });
    animatePhotos(scene, index);

    const hold = SINGLE_HOLD_MS / playbackSpeed;
    sceneRemaining = hold;
    progress.getAnimations().forEach((animation) => animation.cancel());
    animateProgress(hold);
    updateControlsState();
    if (paused) {
      sceneDueAt = 0;
      pauseSceneAnimations();
    } else {
      scheduleAdvance(hold);
    }
    preloadScene(1);
    preloadScene(2);
  }

  function advanceScene() {
    if (!active || paused || ended) return;
    if (sceneIndex + 1 < scenes.length) {
      renderScene(sceneIndex + 1, { animateIn: true, preservePrevious: true });
    } else {
      showEnd();
    }
  }

  function goPrevious() {
    if (!active) return;
    const keepPaused = paused && !ended;
    if (ended) {
      paused = true;
      renderScene(scenes.length - 1, {
        animateIn: false,
        preservePrevious: false,
      });
      showControls();
      return;
    }
    if (sceneIndex <= 0) {
      renderScene(0, { animateIn: false, preservePrevious: false });
      if (keepPaused) pauseSceneAnimations();
      return;
    }
    renderScene(sceneIndex - 1, { animateIn: true, preservePrevious: true });
    if (keepPaused) pauseSceneAnimations();
  }

  function goNext() {
    if (!active) return;
    if (ended) {
      replay();
      return;
    }
    const keepPaused = paused;
    if (sceneIndex + 1 < scenes.length) {
      renderScene(sceneIndex + 1, { animateIn: true, preservePrevious: true });
      if (keepPaused) pauseSceneAnimations();
    } else if (repeatPlayback) {
      replay({ preserveControls: true });
    } else {
      showEnd();
    }
  }

  function pausePlayback() {
    if (!active || paused || ended) return;
    clearSceneTimer();
    sceneRemaining = sceneDueAt
      ? Math.max(20, sceneDueAt - performance.now())
      : sceneRemaining;
    sceneDueAt = 0;
    paused = true;
    pauseSceneAnimations();
    updateControlsState();
    showControls();
  }

  function resumePlayback() {
    if (!active) return;
    if (ended) {
      replay();
      return;
    }
    if (!paused) return;
    paused = false;
    updateControlsState();
    resumeSceneAnimations();
    scheduleAdvance(sceneRemaining);
    showControls();
  }

  function togglePlayback() {
    if (paused || ended) resumePlayback();
    else pausePlayback();
  }

  function replay({ preserveControls = false } = {}) {
    if (!active) return;
    clearSceneTimer();
    paused = false;
    ended = false;
    endCard.hidden = true;
    updateControlsState();
    scenes = buildPlaybackScenes();
    sceneIndex = -1;
    renderScene(0, { animateIn: true, preservePrevious: false });
    if (!preserveControls) {
      applyControlPreference();
      root.focus({ preventScroll: true });
    }
  }

  function setInert(value) {
    if (app) app.inert = value;
    if (sidebarRailButton) sidebarRailButton.inert = value;
  }

  function open({ items, title: albumTitle = "幻灯片" } = {}) {
    const playable = (items || []).filter((item) => item?.kind === "photo");
    if (!playable.length) return false;
    window.clearTimeout(closeTimer);
    if (active) close({ immediate: true });

    controlsVisibleOnOpen = readControlsVisibleOnOpen();
    repeatPlayback = readRepeatPlayback();
    playbackSpeed = readPlaybackSpeed();
    playbackOrder = readPlaybackOrder();
    settingsOpen = false;
    settingsPanel.hidden = true;
    settingsButton.setAttribute("aria-expanded", "false");
    updatePlaybackSettingsUI();
    photos = playable;
    scenes = buildPlaybackScenes();
    sceneIndex = -1;
    currentScene = null;
    paused = false;
    ended = false;
    openingFocus =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
    active = true;
    stage.replaceChildren();
    intro.hidden = false;
    intro.classList.remove("is-leaving");
    endCard.hidden = true;
    title.textContent = albumTitle || "幻灯片";
    dateRange.textContent = formatDateRange(photos);
    root.hidden = false;
    root.classList.remove("is-closing");
    document.body.classList.add("slideshow-open");
    setInert(true);
    renderScene(0, { animateIn: true, preservePrevious: false });
    applyControlPreference();
    root.focus({ preventScroll: true });
    introTimer = window.setTimeout(hideIntro, INTRO_HOLD_MS);
    return true;
  }

  function close({ immediate = false } = {}) {
    if (!active && root.hidden) return;
    active = false;
    clearSceneTimer();
    window.clearTimeout(controlsTimer);
    window.clearTimeout(introTimer);
    window.clearTimeout(closeTimer);
    cancelSceneAnimations();
    preloadCache = [];
    settingsOpen = false;
    settingsPanel.hidden = true;
    settingsButton.setAttribute("aria-expanded", "false");
    root.classList.remove("controls-visible");
    setControlInteractivity(false);

    const finish = () => {
      root.hidden = true;
      root.classList.remove("is-closing", "is-paused");
      stage.replaceChildren();
      document.body.classList.remove("slideshow-open");
      setInert(false);
      if (openingFocus?.isConnected)
        openingFocus.focus({ preventScroll: true });
      openingFocus = null;
      photos = [];
      scenes = [];
      sceneIndex = -1;
      currentScene = null;
    };
    if (immediate || isReducedMotion()) {
      finish();
      return;
    }
    root.classList.add("is-closing");
    closeTimer = window.setTimeout(finish, 190);
  }

  function onKeyDown(event) {
    if (
      !active ||
      root.hidden ||
      event.altKey ||
      event.ctrlKey ||
      event.metaKey
    ) {
      return;
    }
    const target = event.target;
    const onRange =
      target instanceof HTMLInputElement && target.type === "range";
    const onControl =
      target instanceof Element && Boolean(target.closest("button, input"));
    const onOrderButton =
      target instanceof Element &&
      Boolean(target.closest("[data-slideshow-order]"));
    if (event.key === "Escape") {
      event.preventDefault();
      event.stopPropagation();
      if (settingsOpen) {
        setSettingsOpen(false, { restoreFocus: true });
      } else {
        close();
      }
      return;
    }
    if (onRange && (event.key === "ArrowLeft" || event.key === "ArrowRight"))
      return;
    if (event.key === "ArrowLeft") {
      if (onOrderButton) return;
      event.preventDefault();
      event.stopPropagation();
      goPrevious();
      showControls();
      return;
    }
    if (event.key === "ArrowRight") {
      if (onOrderButton) return;
      event.preventDefault();
      event.stopPropagation();
      goNext();
      showControls();
      return;
    }
    if (event.key === " " && !onControl) {
      event.preventDefault();
      event.stopPropagation();
      togglePlayback();
      return;
    }
    if (event.key === "Tab") {
      showControls({ autoHide: false });
      const focusable = [
        ...root.querySelectorAll(
          "button:not(:disabled):not([hidden]), input:not(:disabled):not([hidden])",
        ),
      ].filter((element) => element.getClientRects().length > 0);
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (document.activeElement === root) {
        event.preventDefault();
        (event.shiftKey ? last : first).focus();
      } else if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }
  }

  closeButton.addEventListener("click", () => close());
  previousButton.addEventListener("click", goPrevious);
  nextButton.addEventListener("click", goNext);
  toggleButton.addEventListener("click", togglePlayback);
  replayButton.addEventListener("click", replay);
  returnButton.addEventListener("click", () => close());
  settingsButton.addEventListener("click", () => {
    setSettingsOpen(!settingsOpen);
  });
  repeatButton.addEventListener("click", () => {
    setRepeatPlayback(!repeatPlayback);
  });
  for (const button of orderButtons) {
    button.addEventListener("click", () => {
      setPlaybackOrder(button.dataset.slideshowOrder);
    });
    button.addEventListener("keydown", (event) => {
      const nextOrder =
        event.key === "ArrowLeft"
          ? "sequential"
          : event.key === "ArrowRight"
            ? "random"
            : null;
      if (!nextOrder) return;
      event.preventDefault();
      event.stopPropagation();
      setPlaybackOrder(nextOrder);
      orderButtons
        .find((candidate) => candidate.dataset.slideshowOrder === nextOrder)
        ?.focus({ preventScroll: true });
    });
  }
  speedInput.addEventListener("input", () => {
    setPlaybackSpeed(speedInput.value, { persist: false, snap: false });
  });
  speedInput.addEventListener("change", settlePlaybackSpeed);
  speedInput.addEventListener("pointerdown", () => {
    speedInput.classList.add("is-dragging");
  });
  speedInput.addEventListener("pointerup", settlePlaybackSpeed);
  speedInput.addEventListener("pointercancel", settlePlaybackSpeed);
  speedInput.addEventListener("keydown", (event) => {
    const direction = ["ArrowRight", "ArrowUp"].includes(event.key)
      ? 1
      : ["ArrowLeft", "ArrowDown"].includes(event.key)
        ? -1
        : 0;
    if (direction) {
      event.preventDefault();
      event.stopPropagation();
      nudgePlaybackSpeed(direction);
      return;
    }
    if (event.key === "Home" || event.key === "End") {
      event.preventDefault();
      event.stopPropagation();
      setPlaybackSpeed(
        event.key === "Home" ? MIN_PLAYBACK_SPEED : MAX_PLAYBACK_SPEED,
      );
    }
  });

  root.addEventListener("pointermove", () => {
    if (settingsOpen) {
      showControls({ autoHide: false });
      return;
    }
    showControls();
  });
  root.addEventListener("click", (event) => {
    if (event.target.closest("button, .slideshow-settings-panel")) return;
    if (settingsOpen) {
      setSettingsOpen(false);
      showControls();
      return;
    }
    if (root.classList.contains("controls-visible")) {
      hideControls({ force: true });
    } else {
      showControls();
    }
  });
  root.addEventListener("focusin", (event) => {
    if (event.target.closest("button, input"))
      showControls({ autoHide: false });
  });
  window.addEventListener("slideshow-controls-setting", (event) => {
    setControlsInitiallyVisible(event.detail?.show !== false);
  });
  document.addEventListener("keydown", onKeyDown, true);
  document.addEventListener("visibilitychange", () => {
    if (document.hidden && active && !paused) pausePlayback();
  });
  window.addEventListener("blur", () => {
    if (active && !paused && !ended) pausePlayback();
  });

  updatePlaybackSettingsUI();
  window.albumSlideshow = {
    open,
    close,
    replay,
    setControlsInitiallyVisible,
    setControlsEnabled: setControlsInitiallyVisible,
    setAlwaysShowControls: setControlsInitiallyVisible,
    setRepeatPlayback,
    setPlaybackOrder,
    setPlaybackSpeed,
    isOpen: () => active,
    getState: () => ({
      active,
      paused,
      ended,
      sceneIndex,
      sceneCount: scenes.length,
      photoCount: photos.length,
      controlsVisibleOnOpen,
      repeatPlayback,
      playbackSpeed,
      playbackOrder,
      settingsOpen,
      controlsVisible: root.classList.contains("controls-visible"),
      pausedByVisibility: document.hidden,
    }),
  };
})();
