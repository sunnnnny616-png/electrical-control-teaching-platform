(function installRuntimeScope(global) {
  "use strict";

  const platform = global.ECTPPlatform = global.ECTPPlatform || {};

  function createRuntimeScope(moduleId) {
    const controller = new AbortController();
    const timeouts = new Set();
    const intervals = new Set();
    const cleanups = new Set();
    let disposed = false;

    function assertActive() {
      if (disposed) throw new Error(`Runtime scope for ${moduleId} is disposed`);
    }

    function timeout(callback, delay) {
      assertActive();
      const id = global.setTimeout(() => {
        timeouts.delete(id);
        if (!disposed) callback();
      }, delay);
      timeouts.add(id);
      return id;
    }

    function clearTimeoutId(id) {
      global.clearTimeout(id);
      timeouts.delete(id);
    }

    function interval(callback, delay) {
      assertActive();
      const id = global.setInterval(() => {
        if (!disposed) callback();
      }, delay);
      intervals.add(id);
      return id;
    }

    function clearIntervalId(id) {
      global.clearInterval(id);
      intervals.delete(id);
    }

    function addCleanup(cleanup) {
      assertActive();
      if (typeof cleanup === "function") cleanups.add(cleanup);
      return () => cleanups.delete(cleanup);
    }

    function dispose() {
      if (disposed) return;
      disposed = true;
      controller.abort();
      timeouts.forEach((id) => global.clearTimeout(id));
      intervals.forEach((id) => global.clearInterval(id));
      timeouts.clear();
      intervals.clear();
      cleanups.forEach((cleanup) => {
        try {
          cleanup();
        } catch (error) {
          console.error(`Cleanup failed for ${moduleId}`, error);
        }
      });
      cleanups.clear();
    }

    return Object.freeze({
      moduleId,
      signal: controller.signal,
      timeout,
      clearTimeout: clearTimeoutId,
      interval,
      clearInterval: clearIntervalId,
      addCleanup,
      dispose,
      diagnostics: () => ({
        moduleId,
        disposed,
        timeoutCount: timeouts.size,
        intervalCount: intervals.size,
        cleanupCount: cleanups.size
      })
    });
  }

  platform.runtime = Object.freeze({ createRuntimeScope });
})(globalThis);