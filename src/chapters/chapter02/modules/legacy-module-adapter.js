(function installLegacyModuleAdapter(global) {
  "use strict";

  const platform = global.ECTPPlatform = global.ECTPPlatform || {};

  function createLegacyModuleDefinition(options) {
    const { meta, aliases = [], circuitData, hooks } = options;

    function create(context) {
      let mounted = false;
      const safeCall = (name, fallback) => (...args) => {
        const method = hooks[name];
        return typeof method === "function" ? method(...args, context) : fallback(...args);
      };

      return Object.freeze({
        meta,
        aliases,
        circuitData,
        createInitialState: safeCall("createInitialState", () => ({})),
        dispatchAction: safeCall("dispatchAction", () => null),
        solve: safeCall("solve", () => null),
        normalizeSolverResult: safeCall("normalizeSolverResult", (result) => result),
        getOperationViewModel: safeCall("getOperationViewModel", () => ({})),
        getStatusViewModel: safeCall("getStatusViewModel", () => ({})),
        buildTeachingFeedback: safeCall("buildTeachingFeedback", () => ({})),
        buildReplaySteps: safeCall("buildReplaySteps", () => []),
        mount(payload) {
          mounted = true;
          return typeof hooks.mount === "function" ? hooks.mount(payload, context) : undefined;
        },
        render() {
          if (!mounted) return undefined;
          return typeof hooks.render === "function" ? hooks.render(context) : undefined;
        },
        reset: safeCall("reset", () => ({})),
        pause: safeCall("pause", () => undefined),
        resume: safeCall("resume", () => undefined),
        unmount(payload) {
          try {
            return typeof hooks.unmount === "function" ? hooks.unmount(payload, context) : undefined;
          } finally {
            mounted = false;
          }
        },
        validateGeometry: safeCall("validateGeometry", () => ({ valid: true, errors: [] })),
        runTests: safeCall("runTests", () => ({ passed: true, cases: [] }))
      });
    }

    return Object.freeze({ meta, aliases: Object.freeze([...aliases]), circuitData, create });
  }

  platform.adapters = Object.freeze({ createLegacyModuleDefinition });
})(globalThis);