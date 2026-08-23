(function installContinuousDefinition(global) {
  "use strict";
  const platform = global.ECTPPlatform = global.ECTPPlatform || {};
  platform.moduleDefinitions = platform.moduleDefinitions || {};
  platform.moduleDefinitions.createCh02Continuous = (options) => platform.facadeAdapter.createFacadeModuleDefinition({
    circuitData: options.circuitData,
    createFacade: () => platform.moduleFacades.createContinuousFacade({ port: options.port }),
    meta: {
      schemaVersion: "1.0",
      chapterId: "ch02",
      moduleId: "ch02_continuous",
      routeId: "self-lock",
      order: 3,
      code: "03",
      title: "长动控制",
      shortTitle: "长动控制",
      simulationLevel: "S2",
      maturity: "M3",
      status: "ready",
      integrationMode: "facade-v1",
      geometryLockId: "continuous_control_geometry_v1_locked"
    },
    aliases: ["ch02_continuous"]
  });
})(globalThis);