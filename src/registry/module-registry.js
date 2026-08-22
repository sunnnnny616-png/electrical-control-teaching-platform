(function installModuleRegistry(global) {
  "use strict";

  const platform = global.ECTPPlatform = global.ECTPPlatform || {};

  function createModuleRegistry(contract) {
    const definitions = new Map();
    const aliases = new Map();

    function register(definition) {
      const metaErrors = contract.validateModuleMeta(definition?.meta);
      if (!definition?.circuitData || typeof definition.circuitData !== "object") {
        metaErrors.push("circuitData must be an object");
      }
      if (typeof definition?.create !== "function") {
        metaErrors.push("create() is required");
      }
      if (metaErrors.length) {
        throw new Error(`Invalid module definition: ${metaErrors.join("; ")}`);
      }
      const { moduleId, routeId } = definition.meta;
      if (definitions.has(moduleId)) throw new Error(`Duplicate moduleId: ${moduleId}`);
      if (aliases.has(routeId)) throw new Error(`Duplicate routeId: ${routeId}`);
      definitions.set(moduleId, definition);
      aliases.set(moduleId, moduleId);
      aliases.set(routeId, moduleId);
      (definition.aliases || []).forEach((alias) => {
        if (aliases.has(alias) && aliases.get(alias) !== moduleId) {
          throw new Error(`Duplicate module alias: ${alias}`);
        }
        aliases.set(alias, moduleId);
      });
      return definition;
    }

    function resolve(id) {
      const moduleId = aliases.get(id);
      return moduleId ? definitions.get(moduleId) : null;
    }

    function requireDefinition(id) {
      const definition = resolve(id);
      if (!definition) throw new Error(`Unknown platform module: ${id}`);
      return definition;
    }

    function list() {
      return Array.from(definitions.values()).sort((left, right) => {
        const chapterOrder = left.meta.chapterId.localeCompare(right.meta.chapterId);
        return chapterOrder || left.meta.order - right.meta.order;
      });
    }

    function listByChapter(chapterId) {
      return list().filter((definition) => definition.meta.chapterId === chapterId);
    }

    function diagnostics() {
      return {
        size: definitions.size,
        aliases: Object.fromEntries(aliases),
        modules: list().map((definition) => ({
          moduleId: definition.meta.moduleId,
          routeId: definition.meta.routeId,
          status: definition.meta.status,
          contract: { valid: true, errors: [] }
        }))
      };
    }

    return Object.freeze({ register, resolve, require: requireDefinition, list, listByChapter, diagnostics });
  }

  platform.registry = Object.freeze({ createModuleRegistry });
})(globalThis);