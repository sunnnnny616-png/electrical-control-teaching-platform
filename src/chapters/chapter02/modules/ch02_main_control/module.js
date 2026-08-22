(function installMainControlDefinition(global) {
  "use strict";
  const platform = global.ECTPPlatform = global.ECTPPlatform || {};
  platform.moduleDefinitions = platform.moduleDefinitions || {};
  platform.moduleDefinitions.createCh02MainControl = (options) => platform.adapters.createLegacyModuleDefinition({
    ...options,
    meta: {
      schemaVersion: "1.0",
      chapterId: "ch02",
      moduleId: "ch02_main_control",
      routeId: "main-control",
      order: 1,
      code: "01",
      title: "主电路与控制电路",
      shortTitle: "主电路与控制电路",
      simulationLevel: "S2",
      maturity: "M3",
      status: "ready",
      geometryLockId: "main_control_geometry_v1_locked"
    },
    aliases: ["ch02_main_control"]
  });
})(globalThis);
