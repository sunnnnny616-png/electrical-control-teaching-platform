(function installModuleTemplateFacade(global) {
  "use strict";

  const platform = global.ECTPPlatform = global.ECTPPlatform || {};
  platform.moduleFacades = platform.moduleFacades || {};
  const MODULE_ID = "__MODULE_ID__";
  const ROUTE_ID = "__ROUTE_ID__";

  function clone(value) {
    return value === undefined ? undefined : JSON.parse(JSON.stringify(value));
  }

  function createModuleTemplateFacade(options) {
    const { port } = options;
    const contracts = platform.contracts;
    const requiredPortMethods = [
      "readRawState", "reset", "solve", "togglePower", "startPrimary", "stopPrimary",
      "toggleProtection", "resetProtection", "render", "pause", "unmount",
      "validateGeometry", "runTests", "getFeedback", "getReplaySteps"
    ];
    requiredPortMethods.forEach((method) => {
      if (typeof port?.[method] !== "function") throw new Error(`${MODULE_ID} port requires ${method}()`);
    });

    function readRaw() {
      return port.readRawState();
    }

    function getStateSnapshot() {
      const raw = readRaw();
      const operation = raw.operationState;
      const solver = raw.solver;
      const running = Boolean(solver.motorRunning);
      return {
        schemaVersion: contracts.facadeSchemaVersion,
        moduleId: MODULE_ID,
        routeId: ROUTE_ID,
        operation: {
          power: operation.power,
          controls: { start: operation.start, stop: operation.stop },
          protections: { overload: operation.protection }
        },
        devices: {
          primaryContactor: { id: "__CONTACTOR_ID__", energized: Boolean(raw.stableDeviceState?.primary) }
        },
        motor: {
          id: "__MOTOR_ID__",
          state: running ? "running" : "stopped",
          running,
          direction: running ? "forward" : "none"
        }
      };
    }

    function normalizeSolverResult(rawInput = readRaw()) {
      const raw = rawInput?.operationState ? rawInput : readRaw();
      const solver = raw.solver;
      const operation = raw.operationState;
      const running = Boolean(solver.motorRunning);
      return {
        ...contracts.createEmptySolverResult(MODULE_ID),
        stableDeviceStates: { __CONTACTOR_ID__: Boolean(raw.stableDeviceState?.primary) },
        edgeStates: clone(solver.edgeStates || {}),
        activeMainWireIds: [...(solver.activeMainWireIds || [])],
        activeControlWireIds: [...(solver.activeControlWireIds || [])],
        partialWireIds: [...(solver.partialControlWireIds || [])],
        motorStates: {
          __MOTOR_ID__: { running, direction: running ? "forward" : "none" }
        },
        protectionStates: {
          __PROTECTION_ID__: {
            state: operation.protection,
            tripped: operation.protection === "overload"
          }
        },
        converged: solver.converged !== false,
        iterationCount: solver.iterationCount || 0,
        lastAction: { message: String(solver.lastAction || "") },
        extension: clone(solver.extension || {})
      };
    }

    function getOperationViewModel() {
      const state = getStateSnapshot();
      const powerClosed = state.operation.power === "closed";
      const overload = state.operation.protections.overload === "overload";
      const running = state.motor.running;
      const protection = {
        slot: "primary",
        visible: true,
        label: "__PROTECTION_LABEL__",
        resetLabel: "__PROTECTION_RESET_LABEL__",
        tripped: overload,
        toggleAction: "PROTECTION_TOGGLE",
        resetAction: "PROTECTION_RESET"
      };
      return {
        schemaVersion: contracts.facadeSchemaVersion,
        moduleId: MODULE_ID,
        power: {
          deviceId: "__POWER_DEVICE_ID__",
          closed: powerClosed,
          closeLabel: "__POWER_CLOSE_LABEL__",
          openLabel: "__POWER_OPEN_LABEL__",
          closeEnabled: !powerClosed,
          openEnabled: powerClosed
        },
        controls: [
          { slot: "primary", visible: true, label: "__START_LABEL__", stateText: running ? "已执行" : "待命", buttonClass: "forward", action: "START_PRIMARY_PRESS" },
          { slot: "secondary", visible: true, label: "__STOP_LABEL__", stateText: running ? "可执行停止" : "已停止", buttonClass: "stop", action: "STOP_PRIMARY_PRESS" },
          { slot: "tertiary", visible: false },
          { slot: "quaternary", visible: false }
        ],
        protection,
        protections: [protection],
        actionStates: [
          { id: "power", label: "__POWER_DEVICE_ID__", currentState: powerClosed ? "closed" : "open", availableTransitions: [powerClosed ? "open" : "close"], onAction: powerClosed ? "POWER_OPEN" : "POWER_CLOSE", feedbackText: "__POWER_FEEDBACK__" },
          { id: "start", label: "__START_LABEL__", currentState: running ? "running" : "stopped", availableTransitions: [running ? "show_running_hint" : "start"], onAction: "START_PRIMARY_PRESS", feedbackText: "__START_FEEDBACK__" },
          { id: "stop", label: "__STOP_LABEL__", currentState: running ? "running" : "stopped", availableTransitions: [running ? "stop" : "show_stopped_hint"], onAction: "STOP_PRIMARY_PRESS", feedbackText: "__STOP_FEEDBACK__" },
          { id: "protection", label: "__PROTECTION_LABEL__", currentState: overload ? "overload" : "normal", availableTransitions: [overload ? "show_overload_hint" : "trip"], onAction: "PROTECTION_TOGGLE", feedbackText: "__PROTECTION_FEEDBACK__" }
        ]
      };
    }

    function getStatusViewModel() {
      const state = getStateSnapshot();
      const overload = state.operation.protections.overload === "overload";
      const energized = state.devices.primaryContactor.energized;
      return {
        schemaVersion: contracts.facadeSchemaVersion,
        moduleId: MODULE_ID,
        rows: [
          { id: "power", label: "__POWER_DEVICE_ID__", value: state.operation.power === "closed" ? "已合闸" : "断开", tone: state.operation.power === "closed" ? "on" : "off" },
          { id: "contactor", label: "__CONTACTOR_ID__", value: energized ? "得电" : "失电", tone: energized ? "forward" : "off" },
          { id: "motor", label: "__MOTOR_ID__", value: state.motor.running ? "运行" : "停止", tone: state.motor.running ? "forward" : "off" },
          { id: "protection", label: "__PROTECTION_ID__", value: overload ? "已过载" : "正常", tone: overload ? "error" : "on" }
        ]
      };
    }

    function buildTeachingFeedback() {
      return clone(port.getFeedback());
    }

    function buildReplaySteps() {
      return clone(port.getReplaySteps() || []);
    }

    function dispatchAction(actionInput) {
      const action = typeof actionInput === "string" ? contracts.createAction(actionInput) : actionInput;
      const report = contracts.validateAction(action);
      if (!report.valid) throw new Error(`Invalid ${MODULE_ID} action: ${report.errors.join("; ")}`);
      const current = getStateSnapshot();
      switch (action.type) {
        case "POWER_CLOSE":
          if (current.operation.power !== "closed") port.togglePower();
          break;
        case "POWER_OPEN":
          if (current.operation.power === "closed") port.togglePower();
          break;
        case "START_PRIMARY_PRESS":
          port.startPrimary();
          break;
        case "STOP_PRIMARY_PRESS":
          port.stopPrimary();
          break;
        case "PROTECTION_TOGGLE":
          port.toggleProtection();
          break;
        case "PROTECTION_RESET":
          port.resetProtection();
          break;
        case "RESET_MODULE":
          port.reset();
          port.render();
          break;
        default:
          throw new Error(`${MODULE_ID} does not support ${action.type}`);
      }
      return {
        action,
        state: getStateSnapshot(),
        solverResult: normalizeSolverResult(),
        operationViewModel: getOperationViewModel(),
        statusViewModel: getStatusViewModel(),
        feedback: buildTeachingFeedback()
      };
    }

    return Object.freeze({
      createInitialState: () => { port.reset(); return getStateSnapshot(); },
      getStateSnapshot,
      dispatchAction,
      solve: (actionMessage = "template facade solve") => { port.solve(actionMessage); return normalizeSolverResult(); },
      normalizeSolverResult,
      getOperationViewModel,
      getStatusViewModel,
      buildTeachingFeedback,
      buildReplaySteps,
      mount: () => undefined,
      render: () => port.render(),
      reset: () => { port.reset(); return getStateSnapshot(); },
      pause: () => port.pause(),
      resume: () => undefined,
      unmount: () => port.unmount(),
      validateGeometry: () => port.validateGeometry(),
      runTests: () => port.runTests()
    });
  }

  platform.moduleFacades.createModuleTemplateFacade = createModuleTemplateFacade;
})(globalThis);
