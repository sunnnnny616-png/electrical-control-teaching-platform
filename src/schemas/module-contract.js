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
    "getStateSnapshot",
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
  const facadeSchemaVersion = "1.0";
  const actionTypes = Object.freeze([
    "POWER_CLOSE",
    "POWER_OPEN",
    "STOP_PRESS",
    "START_FORWARD_PRESS",
    "START_REVERSE_PRESS",
    "JOG_PRESS",
    "JOG_RELEASE",
    "PROTECTION_TOGGLE",
    "PROTECTION_RESET",
    "RESET_MODULE"
  ]);

  function isRecord(value) {
    return Boolean(value) && typeof value === "object" && !Array.isArray(value);
  }

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

  function createAction(type, payload = {}, source = "platform") {
    return Object.freeze({
      schemaVersion: facadeSchemaVersion,
      type,
      payload: isRecord(payload) ? { ...payload } : {},
      source,
      timestamp: Date.now()
    });
  }

  function validateAction(action) {
    const errors = [];
    if (!isRecord(action)) return { valid: false, errors: ["action must be an object"] };
    if (action.schemaVersion !== facadeSchemaVersion) errors.push("action.schemaVersion must be 1.0");
    if (!actionTypes.includes(action.type)) errors.push(`unsupported action.type: ${action.type}`);
    if (!isRecord(action.payload)) errors.push("action.payload must be an object");
    if (typeof action.source !== "string" || !action.source) errors.push("action.source is required");
    return { valid: errors.length === 0, errors };
  }

  function validateStateSnapshot(snapshot) {
    const errors = [];
    if (!isRecord(snapshot)) return { valid: false, errors: ["state snapshot must be an object"] };
    if (snapshot.schemaVersion !== facadeSchemaVersion) errors.push("state.schemaVersion must be 1.0");
    if (typeof snapshot.moduleId !== "string" || !snapshot.moduleId) errors.push("state.moduleId is required");
    if (!isRecord(snapshot.operation)) errors.push("state.operation must be an object");
    if (!isRecord(snapshot.devices)) errors.push("state.devices must be an object");
    if (!isRecord(snapshot.motor)) errors.push("state.motor must be an object");
    return { valid: errors.length === 0, errors };
  }

  function validateSolverResult(result) {
    const errors = [];
    if (!isRecord(result)) return { valid: false, errors: ["solver result must be an object"] };
    if (result.schemaVersion !== facadeSchemaVersion) errors.push("solverResult.schemaVersion must be 1.0");
    if (typeof result.moduleId !== "string" || !result.moduleId) errors.push("solverResult.moduleId is required");
    ["stableDeviceStates", "edgeStates", "motorStates", "protectionStates", "extension"].forEach((field) => {
      if (!isRecord(result[field])) errors.push(`solverResult.${field} must be an object`);
    });
    ["activeMainWireIds", "activeControlWireIds", "partialWireIds"].forEach((field) => {
      if (!Array.isArray(result[field])) errors.push(`solverResult.${field} must be an array`);
    });
    if (typeof result.converged !== "boolean") errors.push("solverResult.converged must be boolean");
    if (!Number.isInteger(result.iterationCount) || result.iterationCount < 0) errors.push("solverResult.iterationCount must be a non-negative integer");
    return { valid: errors.length === 0, errors };
  }

  function validateOperationViewModel(viewModel) {
    const errors = [];
    if (!isRecord(viewModel)) return { valid: false, errors: ["operation view model must be an object"] };
    if (viewModel.schemaVersion !== facadeSchemaVersion) errors.push("operationViewModel.schemaVersion must be 1.0");
    if (typeof viewModel.moduleId !== "string" || !viewModel.moduleId) errors.push("operationViewModel.moduleId is required");
    if (!isRecord(viewModel.power)) errors.push("operationViewModel.power must be an object");
    if (!Array.isArray(viewModel.controls)) errors.push("operationViewModel.controls must be an array");
    if (!Array.isArray(viewModel.actionStates)) errors.push("operationViewModel.actionStates must be an array");
    return { valid: errors.length === 0, errors };
  }

  function validateStatusViewModel(viewModel) {
    const errors = [];
    if (!isRecord(viewModel)) return { valid: false, errors: ["status view model must be an object"] };
    if (viewModel.schemaVersion !== facadeSchemaVersion) errors.push("statusViewModel.schemaVersion must be 1.0");
    if (typeof viewModel.moduleId !== "string" || !viewModel.moduleId) errors.push("statusViewModel.moduleId is required");
    if (!Array.isArray(viewModel.rows)) errors.push("statusViewModel.rows must be an array");
    return { valid: errors.length === 0, errors };
  }

  function assertReport(report, label) {
    if (!report.valid) throw new Error(`${label}: ${report.errors.join("; ")}`);
    return report;
  }

  function assertFacadeOutputs(module) {
    const moduleId = module?.meta?.moduleId || "unknown-module";
    assertReport(validateStateSnapshot(module.getStateSnapshot()), `Invalid State Facade for ${moduleId}`);
    assertReport(validateSolverResult(module.normalizeSolverResult()), `Invalid Solver Result Facade for ${moduleId}`);
    assertReport(validateOperationViewModel(module.getOperationViewModel()), `Invalid Operation ViewModel for ${moduleId}`);
    assertReport(validateStatusViewModel(module.getStatusViewModel()), `Invalid Status ViewModel for ${moduleId}`);
    return module;
  }

  function createEmptySolverResult(moduleId = "") {
    return {
      schemaVersion: facadeSchemaVersion,
      moduleId,
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
    moduleContractVersion: "1.1",
    facadeSchemaVersion,
    actionTypes,
    requiredMetaFields: Object.freeze([...requiredMetaFields]),
    requiredMethods: Object.freeze([...requiredMethods]),
    validateModuleMeta,
    validateModuleContract,
    assertModuleContract,
    createAction,
    validateAction,
    validateStateSnapshot,
    createEmptySolverResult,
    validateSolverResult,
    validateOperationViewModel,
    validateStatusViewModel,
    assertFacadeOutputs
  });
})(globalThis);
