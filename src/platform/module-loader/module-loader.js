(function installModuleLoader(global) {
  "use strict";

  const platform = global.ECTPPlatform = global.ECTPPlatform || {};

  function createModuleLoader(options) {
    const { registry, mountRoot, services = {}, setActiveModuleId = () => {} } = options;
    let current = null;
    let transitionCount = 0;

    function disposeCurrent(reason = "module-switch") {
      if (!current) return;
      const { instance, scope } = current;
      try {
        instance.pause({ reason });
      } finally {
        try {
          instance.unmount({ reason });
        } finally {
          scope.dispose();
        }
      }
      current = null;
    }

    function load(id, loadOptions = {}) {
      const definition = registry.require(id);
      if (current?.definition.meta.moduleId === definition.meta.moduleId && !loadOptions.force) {
        return current.instance;
      }
      disposeCurrent("module-switch");
      const scope = platform.runtime.createRuntimeScope(definition.meta.moduleId);
      const context = Object.freeze({ mountRoot, services, scope, reason: loadOptions.reason || "load" });
      const instance = definition.create(context);
      platform.contracts.assertModuleContract(instance);
      const initialState = instance.createInitialState();
      setActiveModuleId(definition.meta.routeId, definition.meta.moduleId);
      instance.mount({ initialState });
      instance.render();
      current = { definition, instance, scope };
      transitionCount += 1;
      return instance;
    }

    function resetCurrent() {
      if (!current) return null;
      const nextState = current.instance.reset();
      current.instance.render();
      return nextState;
    }

    function diagnostics() {
      return {
        transitionCount,
        currentModuleId: current?.definition.meta.moduleId || null,
        currentRouteId: current?.definition.meta.routeId || null,
        currentScope: current?.scope.diagnostics() || null
      };
    }

    function destroy() {
      disposeCurrent("platform-destroy");
    }

    return Object.freeze({
      load,
      resetCurrent,
      getCurrent: () => current,
      diagnostics,
      destroy
    });
  }

  platform.loader = Object.freeze({ createModuleLoader });
})(globalThis);