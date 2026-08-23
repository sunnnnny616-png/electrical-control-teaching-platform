(function installModuleTemplatePortExample(global) {
  "use strict";

  const platform = global.ECTPPlatform = global.ECTPPlatform || {};
  platform.modulePortExamples = platform.modulePortExamples || {};

  function createModuleTemplatePort(legacy) {
    const requiredLegacyMethods = [
      "readRawState", "reset", "solve", "togglePower", "startPrimary", "stopPrimary",
      "toggleProtection", "resetProtection", "render", "pause", "unmount",
      "validateGeometry", "runTests", "getFeedback", "getReplaySteps"
    ];
    requiredLegacyMethods.forEach((method) => {
      if (typeof legacy?.[method] !== "function") throw new Error(`Template port requires legacy.${method}()`);
    });

    return Object.freeze({
      readRawState: () => legacy.readRawState(),
      reset: () => legacy.reset(),
      solve: (actionMessage) => legacy.solve(actionMessage),
      togglePower: () => legacy.togglePower(),
      startPrimary: () => legacy.startPrimary(),
      stopPrimary: () => legacy.stopPrimary(),
      toggleProtection: () => legacy.toggleProtection(),
      resetProtection: () => legacy.resetProtection(),
      render: () => legacy.render(),
      pause: () => legacy.pause(),
      unmount: () => legacy.unmount(),
      validateGeometry: () => legacy.validateGeometry(),
      runTests: () => legacy.runTests(),
      getFeedback: () => legacy.getFeedback(),
      getReplaySteps: () => legacy.getReplaySteps()
    });
  }

  platform.modulePortExamples.createModuleTemplatePort = createModuleTemplatePort;
})(globalThis);
