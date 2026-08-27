(function installMixedJogContinuousDefinition(global) {
  "use strict";

  const platform = global.ECTPPlatform = global.ECTPPlatform || {};
  platform.moduleDefinitions = platform.moduleDefinitions || {};

  platform.moduleDefinitions.createCh02MixedJogContinuous = () => platform.facadeAdapter.createFacadeModuleDefinition({
    circuitData: platform.moduleCircuitData.ch02MixedJogContinuous,
    createFacade: (context) => platform.moduleFacades.createMixedJogContinuousFacade(context),
    meta: {
      schemaVersion: "1.0",
      chapterId: "ch02",
      moduleId: "ch02_mixed_jog_continuous",
      routeId: "mixed-jog-continuous",
      order: 5,
      code: "05",
      title: "点动与长动混合控制",
      shortTitle: "点动/长动混合",
      simulationLevel: "S2",
      maturity: "M3",
      status: "ready",
      integrationMode: "facade-v1",
      geometryLockId: "ch02_mixed_jog_continuous_geometry_v1_locked"
    },
    aliases: ["ch02_mixed_jog_continuous"]
  });
})(globalThis);
