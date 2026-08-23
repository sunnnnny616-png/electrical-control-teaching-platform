(function installModuleTemplateDefinition(global) {
  "use strict";

  const platform = global.ECTPPlatform = global.ECTPPlatform || {};
  platform.moduleDefinitions = platform.moduleDefinitions || {};

  platform.moduleDefinitions.createModuleTemplate = (options) => platform.facadeAdapter.createFacadeModuleDefinition({
    circuitData: options.circuitData,
    createFacade: () => platform.moduleFacades.createModuleTemplateFacade({ port: options.port }),
    meta: {
      schemaVersion: "1.0",
      chapterId: "__CHAPTER_ID__",
      moduleId: "__MODULE_ID__",
      routeId: "__ROUTE_ID__",
      order: 0,
      code: "00",
      title: "__MODULE_TITLE__",
      shortTitle: "__MODULE_SHORT_TITLE__",
      simulationLevel: "S2",
      maturity: "M1",
      status: "draft",
      integrationMode: "facade-v1",
      geometryLockId: "__GEOMETRY_LOCK_ID__"
    },
    aliases: ["__MODULE_ID__"]
  });
})(globalThis);
