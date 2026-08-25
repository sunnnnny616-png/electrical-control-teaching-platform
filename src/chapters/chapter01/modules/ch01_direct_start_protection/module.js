(function installCh01DirectProtectionDefinition(global) {
  "use strict";
  const platform = global.ECTPPlatform = global.ECTPPlatform || {};
  platform.moduleDefinitions = platform.moduleDefinitions || {};
  platform.moduleDefinitions.createCh01DirectStartProtection = () => platform.facadeAdapter.createFacadeModuleDefinition({
    circuitData: platform.chapterCircuitData.ch01DirectStartProtection,
    createFacade: () => platform.moduleFacades.createCh01DirectStartProtectionFacade(),
    meta: {
      schemaVersion: "1.0", chapterId: "ch01", moduleId: "ch01_direct_start_protection", routeId: "ch01-direct-start-protection",
      order: 2, code: "02", title: "综合直接启动保护", shortTitle: "综合直接启动保护",
      simulationLevel: "S2", maturity: "M3", status: "ready", integrationMode: "facade-v1",
      geometryLockId: "ch01_direct_start_protection_geometry_v4_mature_locked"
    },
    aliases: ["ch01_direct_start_protection"]
  });
})(globalThis);
