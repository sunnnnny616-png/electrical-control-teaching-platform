(function installMachineToolCircuitsDefinition(global) {
  "use strict";

  const platform = global.ECTPPlatform = global.ECTPPlatform || {};
  platform.moduleDefinitions = platform.moduleDefinitions || {};

  platform.moduleDefinitions.createCh02MachineToolCircuits = () => platform.facadeAdapter.createFacadeModuleDefinition({
    circuitData: platform.moduleCircuitData.ch02MachineToolCircuits,
    createFacade: (context) => platform.moduleFacades.createMachineToolCircuitsFacade(context),
    meta: {
      schemaVersion: "1.0",
      chapterId: "ch02",
      moduleId: "ch02_machine_tool_circuits",
      routeId: "machine-tool-circuits",
      order: 7,
      code: "07",
      title: "机床综合线路",
      shortTitle: "机床综合线路",
      simulationLevel: "S2",
      maturity: "M3",
      status: "ready",
      integrationMode: "facade-v1",
      geometryLockId: "ch02_machine_tool_circuits_geometry_v1_locked"
    },
    aliases: ["ch02_machine_tool_circuits"]
  });
})(globalThis);
