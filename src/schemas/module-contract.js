(function installModuleContract(global) {
  "use strict";

  const platform = global.ECTPPlatform = global.ECTPPlatform || {};
  const requiredMetaFields = [
    "schemaVersion",
    "chapterId",
    "moduleId",
    "routeId",
    "order",
    "title",
    "status"
  ];
  const requiredMethods = [
    "createInitialState",
    "dispatchAction",
    "solve",
    "normalizeSolverResult",
    "getOperationViewModel",
    "getStatusViewModel",
    "buildTeachingFeedback",
    "buildReplaySteps",
    "mount",
    "render",
    "reset",
    "pause",
    "resume",
    "unmount",
    "validateGeometry",
    "runTests"
  ];

  function validateModuleMeta(meta) {
    const errors = [];
    if (!meta || typeof meta !== "object") {
      return ["meta must be an object"];
    }
    requiredMetaFields.forEach((field) => {
      if (meta[field] === undefined || meta[field] === null || meta[field] === "") {
        errors.push(`meta.${field} is required`);
      }
    });
    if (meta.schemaVersion !== "1.0") {
      errors.push(`unsupported schemaVersion: ${meta.schemaVersion}`);
    }
    if (!Number.isInteger(meta.order) || meta.order < 1) {
      errors.push("meta.order must be a positive integer");
    }
    return errors;
  }

  function validateModuleContract(module) {
    const errors = validateModuleMeta(module?.meta);
    if (!module?.circuitData || typeof module.circuitData !== "object") {
      errors.push("circuitData must be an object");
    }
    requiredMethods.forEach((method) => {
      if (typeof module?.[method] !== "function") {
        errors.push(`${method}() is required`);
      }
    });
    return {
      valid: errors.length === 0,
      errors
    };
  }

  function assertModuleContract(module) {
    const report = validateModuleContract(module);
    if (!report.valid) {
      const moduleId = module?.meta?.moduleId || "unknown-module";
      throw new Error(`Invalid Module Contract for ${moduleId}: ${report.errors.join("; ")}`);
    }
    return module;
  }

  function createEmptySolverResult() {
    return {
      stableDeviceStates: {},
      edgeStates: {},
      activeMainWireIds: [],
      activeControlWireIds: [],
      partialWireIds: [],
      motorStates: {},
      protectionStates: {},
      converged: true,
      iterationCount: 0,
      lastAction: {},
      extension: {}
    };
  }

  platform.contracts = Object.freeze({
    moduleContractVersion: "1.0",
    requiredMetaFields: Object.freeze([...requiredMetaFields]),
    requiredMethods: Object.freeze([...requiredMethods]),
    validateModuleMeta,
    validateModuleContract,
    assertModuleContract,
    createEmptySolverResult
  });
})(globalThis);
