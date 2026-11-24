"use strict";
/**
 * 缩略图任务调度：把「用户正在看的这一格」和「后台慢慢补的预生成」分开排队。
 *
 * 以前每个缩略图请求都直接开工，滚一下就能同时拉起几十个 sharp / exiftool /
 * ffmpeg，CPU 被抢光，可见区那张反而最慢。这里做三件事：
 *   1. 总量封顶，按权重计（普通照片 1、RAW 2、视频 3，视频要抽帧最贵）；
 *   2. 前台队列永远先出队；后台只在名额有空余时插进来，且最多占 1 份，
 *      完全没有前台任务时才放开到 3 份；
 *   3. 用户滚到某张还在排队的后台任务时，把它提到前台队首，同时脱离那一批的
 *      取消信号 —— 「滑到哪里就先加载哪里」靠的就是这一步。
 *
 * 这个文件不依赖项目里的任何模块，方便单独测。
 */
const os = require("node:os");

/* 排队上限：超出的直接拒掉。预热请求最多几千张，正常情况碰不到。 */
const MAX_QUEUE = 4096;
const MAX_WEIGHT = 8;

function positiveInt(value, fallback) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : fallback;
}

function jobError(code, message) {
  const err = new Error(message);
  err.code = code;
  return err;
}

/** 任务是不是被取消掉的（连接断开 / 用户滚走了），用来和真正的生成失败区分开。 */
const isThumbJobCancelled = (err) => err?.code === "THUMB_JOB_ABORTED";

function createThumbScheduler(options = {}) {
  const cpus = Number(os.cpus()?.length) || 4;
  /* 名额总数跟着核数走，但夹在 2~5 之间：再多也只是互相抢磁盘和内存。 */
  const totalSlots = positiveInt(
    options.totalSlots,
    Math.max(2, Math.min(5, cpus - 1)),
  );
  const busyBackgroundSlots = positiveInt(options.backgroundBusySlots, 1);
  /* 空闲时的后台名额：留 1 份给「用户突然滚回来」的前台请求，剩下的都能用来
     补缓存。导入完一整库照片时，这段空闲期是补缩略图的黄金时间，给得太少
     （四核机器上以前只有 1 份）就会看到往下滑一路都是灰骨架。 */
  const idleBackgroundSlots = positiveInt(
    options.backgroundIdleSlots,
    Math.max(1, Math.min(3, totalSlots - 1)),
  );

  const queues = { interactive: [], background: [] };
  /* 只记录还在排队的任务；已经开工的由 thumbs.js 的 inflight 表去重。 */
  const queued = new Map();
  let runningUnits = 0;
  let runningBackgroundUnits = 0;
  let runningCount = 0;
  let startedCount = 0;
  let cancelledCount = 0;

  const queueLength = () =>
    queues.interactive.length + queues.background.length;
  /* 前台「有活」包含正在跑的和还在排队的，两者都该让后台靠边。 */
  const interactivePending = () =>
    queues.interactive.length > 0 || runningUnits > runningBackgroundUnits;

  function capacityFor(lane) {
    if (lane === "interactive") return Math.max(0, totalSlots - runningUnits);
    const ceiling = interactivePending()
      ? busyBackgroundSlots
      : idleBackgroundSlots;
    return Math.max(
      0,
      Math.min(totalSlots - runningUnits, ceiling - runningBackgroundUnits),
    );
  }

  /* 脱离取消信号：任务被提到前台后，就不该再跟着那一批预热一起被取消。 */
  function detach(entry) {
    if (entry.signal && entry.onAbort) {
      entry.signal.removeEventListener("abort", entry.onAbort);
    }
    entry.signal = null;
    entry.onAbort = null;
  }

  function dequeue(entry) {
    const queue = queues[entry.lane];
    const at = queue.indexOf(entry);
    if (at >= 0) queue.splice(at, 1);
  }

  function forget(entry) {
    if (queued.get(entry.key) === entry) queued.delete(entry.key);
  }

  function drop(entry, err) {
    /* 已经开工的让它跑完：结果落盘就是缓存，取消只是白扔一次 CPU。 */
    if (entry.running) return;
    dequeue(entry);
    forget(entry);
    detach(entry);
    entry.cancelled = true;
    cancelledCount += 1;
    entry.reject(err);
  }

  function pick(lane) {
    const queue = queues[lane];
    if (!queue.length) return null;
    const available = capacityFor(lane);
    if (available <= 0) return null;
    /* 用 findIndex 而不是 shift：队首是个大视频时，不该把后面的小照片全堵住。 */
    let at = queue.findIndex((entry) => entry.weight <= available);
    /* 一个都塞不下（双核机器上 totalSlots=2，视频权重 3）时，
       等池子完全空了让它独占一次，否则这张图会永远卡在队首出不来。 */
    if (at < 0 && runningCount === 0) at = 0;
    if (at < 0) return null;
    return queue.splice(at, 1)[0];
  }

  function finish(entry, err, value) {
    runningUnits = Math.max(0, runningUnits - entry.weight);
    runningCount = Math.max(0, runningCount - 1);
    if (entry.lane === "background") {
      runningBackgroundUnits = Math.max(
        0,
        runningBackgroundUnits - entry.weight,
      );
    }
    if (err) entry.reject(err);
    else entry.resolve(value);
    pump();
  }

  function start(entry) {
    dequeue(entry);
    forget(entry);
    detach(entry);
    entry.running = true;
    runningUnits += entry.weight;
    runningCount += 1;
    startedCount += 1;
    if (entry.lane === "background") runningBackgroundUnits += entry.weight;
    let result;
    try {
      result = entry.task({ cancelled: () => entry.cancelled === true });
    } catch (err) {
      result = Promise.reject(err);
    }
    Promise.resolve(result).then(
      (value) => finish(entry, null, value),
      (err) => finish(entry, err, null),
    );
  }

  function pump() {
    for (;;) {
      const next = pick("interactive");
      if (next) {
        start(next);
        continue;
      }
      /* 前台还有排队、只是暂时塞不下（队首太重）：这时不能放后台进来抢名额，
         否则用户真正在看的那张又要多等一轮。 */
      if (queues.interactive.length) return;
      const idle = pick("background");
      if (!idle) return;
      start(idle);
    }
  }

  /**
   * 提交一个任务。同一个 key 只排一次：重复提交拿到同一个 promise，
   * 前台提交撞上还在排队的后台任务时会把它提上来。
   */
  function submit(job = {}) {
    const key = String(job.key ?? "");
    if (!key) {
      return Promise.reject(jobError("THUMB_JOB_NO_KEY", "缩略图任务缺少标识"));
    }
    const lane = job.lane === "background" ? "background" : "interactive";
    const existing = queued.get(key);
    if (existing) {
      if (lane === "interactive") promote(key);
      return existing.promise;
    }
    if (typeof job.task !== "function") {
      return Promise.reject(
        jobError("THUMB_JOB_NO_TASK", "缩略图任务缺少执行体"),
      );
    }
    if (queueLength() >= MAX_QUEUE) {
      return Promise.reject(jobError("THUMB_QUEUE_FULL", "缩略图队列已满"));
    }
    let resolve;
    let reject;
    const promise = new Promise((res, rej) => {
      resolve = res;
      reject = rej;
    });
    /* 后台预热被取消时不一定有人 await，这里先兜一个 handler，
       避免未捕获的 rejection 把整个本地服务带崩。 */
    promise.catch(() => {});
    const entry = {
      key,
      lane,
      promise,
      resolve,
      reject,
      weight: Math.max(
        1,
        Math.min(MAX_WEIGHT, Math.round(Number(job.weight) || 1)),
      ),
      signal:
        job.signal && typeof job.signal.addEventListener === "function"
          ? job.signal
          : null,
      onAbort: null,
      task: job.task,
      running: false,
      cancelled: false,
    };
    queued.set(key, entry);
    if (entry.signal) {
      const abort = () =>
        drop(entry, jobError("THUMB_JOB_ABORTED", "缩略图任务已取消"));
      if (entry.signal.aborted) {
        drop(entry, jobError("THUMB_JOB_ABORTED", "缩略图任务已取消"));
        return promise;
      }
      entry.onAbort = abort;
      entry.signal.addEventListener("abort", abort, { once: true });
    }
    queues[lane].push(entry);
    pump();
    return promise;
  }

  /**
   * 把一个还在排队的任务提到前台队首。
   * 用户滚到某张正在后台预热的照片时调用：它立刻变成「可见区任务」，
   * 用满名额，而且不会再被那一批预热的取消信号带走。
   */
  function promote(key) {
    const entry = queued.get(String(key));
    if (!entry) return false;
    detach(entry);
    dequeue(entry);
    entry.lane = "interactive";
    queues.interactive.unshift(entry);
    pump();
    return true;
  }

  /** 丢掉所有还在排队的任务（关库 / 测试收尾用）。已经在跑的不管。 */
  function clearQueue(reason = "THUMB_JOB_ABORTED") {
    for (const entry of [...queues.interactive, ...queues.background]) {
      drop(entry, jobError(reason, "缩略图队列已清空"));
    }
    queues.interactive.length = 0;
    queues.background.length = 0;
  }

  function stats() {
    return {
      totalSlots,
      busyBackgroundSlots,
      idleBackgroundSlots,
      running: runningCount,
      runningUnits,
      runningBackgroundUnits,
      queuedInteractive: queues.interactive.length,
      queuedBackground: queues.background.length,
      started: startedCount,
      cancelled: cancelledCount,
    };
  }

  return { submit, promote, clearQueue, stats };
}

module.exports = { createThumbScheduler, isThumbJobCancelled };
