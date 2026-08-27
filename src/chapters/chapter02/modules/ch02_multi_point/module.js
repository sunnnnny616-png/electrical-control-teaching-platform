(function installMultiPointDefinition(global) {
  "use strict";

  const platform = global.ECTPPlatform = global.ECTPPlatform || {};
  platform.moduleDefinitions = platform.moduleDefinitions || {};

  platform.moduleDefinitions.createCh02MultiPoint = () => platform.facadeAdapter.createFacadeModuleDefinition({
    circuitData: platform.moduleCircuitData.ch02MultiPoint,
    createFacade: (context) => platform.moduleFacades.createMultiPointFacade(context),
    meta: {
      schemaVersion: "1.0",
      chapterId: "ch02",
      moduleId: "ch02_multi_point",
      routeId: "multi-point-control",
      order: 6,
      code: "06",
      title: "多地点远程控制",
      shortTitle: "多地点控制",
      simulationLevel: "S2",
      maturity: "M3",
      status: "ready",
      integrationMode: "facade-v1",
      geometryLockId: "ch02_multi_point_geometry_v1_locked"
    },
    aliases: ["ch02_multi_point"]
  });
})(globalThis);
