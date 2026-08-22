(function installJogDefinition(global) {
  "use strict";
  const platform = global.ECTPPlatform = global.ECTPPlatform || {};
  platform.moduleDefinitions = platform.moduleDefinitions || {};
  platform.moduleDefinitions.createCh02Jog = (options) => platform.adapters.createLegacyModuleDefinition({
    ...options,
    meta: {
      schemaVersion: "1.0",
      chapterId: "ch02",
      moduleId: "ch02_jog",
      routeId: "jog-control",
      order: 2,
      code: "02",
      title: "点动控制",
      shortTitle: "点动控制",
      simulationLevel: "S2",
      maturity: "M3",
      status: "ready",
      geometryLockId: "jog_control_geometry_v1_locked"
    },
    aliases: ["ch02_jog"]
  });
})(globalThis);