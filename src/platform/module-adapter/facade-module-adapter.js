(function installFacadeModuleAdapter(global) {
  "use strict";

  const platform = global.ECTPPlatform = global.ECTPPlatform || {};

  function createFacadeModuleDefinition(options) {
    const { meta, aliases = [], circuitData, createFacade } = options;
    if (typeof createFacade !== "function") throw new Error(`Facade factory is required for ${meta?.moduleId || "unknown-module"}`);

    function create(context) {
      const facade = createFacade(context);
      let mounted = false;
      const requiredFacadeMethods = [
        "createInitialState",
        "getStateSnapshot",
        "dispatchAction",
        "solve",
        "normalizeSolverResult",
        "getOperationViewModel",
        "getStatusViewModel",
        "buildTeachingFeedback",
        "buildReplaySteps",
        "reset",
        "validateGeometry",
        "runTests"
      ];
      requiredFacadeMethods.forEach((method) => {
        if (typeof facade?.[method] !== "function") throw new Error(`${meta.moduleId} facade requires ${method}()`);
      });

      return Object.freeze({
        meta,
        aliases,
        circuitData,
        createInitialState: (...args) => facade.createInitialState(...args),
        getStateSnapshot: (...args) => facade.getStateSnapshot(...args),
        dispatchAction: (...args) => facade.dispatchAction(...args),
        solve: (...args) => facade.solve(...args),
        normalizeSolverResult: (...args) => facade.normalizeSolverResult(...args),
        getOperationViewModel: (...args) => facade.getOperationViewModel(...args),
        getStatusViewModel: (...args) => facade.getStatusViewModel(...args),
        buildTeachingFeedback: (...args) => facade.buildTeachingFeedback(...args),
        buildReplaySteps: (...args) => facade.buildReplaySteps(...args),
        mount(payload) {
          mounted = true;
          return facade.mount?.(payload, context);
        },
        render() {
          if (!mounted) return undefined;
          return facade.render?.(context);
        },
        reset: (...args) => facade.reset(...args),
        pause: (...args) => facade.pause?.(...args),
        resume: (...args) => facade.resume?.(...args),
        unmount(payload) {
          try {
            return facade.unmount?.(payload, context);
          } finally {
            mounted = false;
          }
        },
        validateGeometry: (...args) => facade.validateGeometry(...args),
        runTests: (...args) => facade.runTests(...args)
      });
    }

    return Object.freeze({ meta, aliases: Object.freeze([...aliases]), circuitData, create });
  }

  platform.facadeAdapter = Object.freeze({ createFacadeModuleDefinition });
})(globalThis);