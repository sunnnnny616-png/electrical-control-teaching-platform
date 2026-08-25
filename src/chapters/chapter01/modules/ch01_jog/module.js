(function installCh01JogDefinition(global) {
  "use strict";
  const platform = global.ECTPPlatform = global.ECTPPlatform || {};
  platform.moduleDefinitions = platform.moduleDefinitions || {};
  platform.moduleDefinitions.createCh01Jog = () => platform.facadeAdapter.createFacadeModuleDefinition({
    circuitData: platform.chapterCircuitData.ch01Jog,
    createFacade: () => platform.moduleFacades.createCh01JogFacade(),
    meta: {
      schemaVersion: "1.0", chapterId: "ch01", moduleId: "ch01_jog", routeId: "ch01-jog-control",
      order: 1, code: "01", title: "点动控制", shortTitle: "点动控制",
      simulationLevel: "S2", maturity: "M3", status: "ready", integrationMode: "facade-v1",
      geometryLockId: "ch01_jog_geometry_v1_locked"
    },
    aliases: ["ch01_jog"]
  });
})(globalThis);
