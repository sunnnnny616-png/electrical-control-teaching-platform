(function installMainControlFacade(global) {
  "use strict";

  const platform = global.ECTPPlatform = global.ECTPPlatform || {};
  platform.moduleFacades = platform.moduleFacades || {};
  const MODULE_ID = "ch02_main_control";
  const ROUTE_ID = "main-control";

  function clone(value) {
    return value === undefined ? undefined : JSON.parse(JSON.stringify(value));
  }

  function createMainControlFacade(options) {
    const { port } = options;
    const contracts = platform.contracts;
    const requiredPortMethods = [
      "readRawState", "reset", "solve", "togglePower",
      "startPrimary", "stopPrimary", "startSecondary", "stopSecondary",
      "toggleProtection", "resetProtection", "toggleSecondaryProtection", "resetSecondaryProtection",
      "render", "pause", "unmount", "validateGeometry", "runTests", "getFeedback", "getReplaySteps"
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
      const motor1Running = solver.motorStates?.motor1 === "running";
      const motor2Running = solver.motorStates?.motor2 === "running";
      return {
        schemaVersion: contracts.facadeSchemaVersion,
        moduleId: MODULE_ID,
        routeId: ROUTE_ID,
        operation: {
          power: operation.qf1,
          controls: {
            stopPrimary: operation.sb1,
            startPrimary: operation.sb2,
            stopSecondary: operation.sb3,
            startSecondary: operation.sb4
          },
          protections: { primary: operation.fr1, secondary: operation.fr2 }
        },
        devices: {
          primaryContactor: { id: "KM1", energized: Boolean(raw.stableControlState?.km1) },
          secondaryContactor: { id: "KM2", energized: Boolean(raw.stableControlState?.km2) }
        },
        motor: {
          id: "dual-motor",
          state: motor1Running && motor2Running ? "both-running" : motor1Running ? "primary-running" : motor2Running ? "secondary-running" : "stopped",
          running: motor1Running || motor2Running,
          direction: "none",
          channels: {
            M1: { running: motor1Running, state: motor1Running ? "running" : "stopped" },
            M2: { running: motor2Running, state: motor2Running ? "running" : "stopped" }
          }
        }
      };
    }

    function normalizeSolverResult(rawInput = readRaw()) {
      const raw = rawInput?.operationState ? rawInput : readRaw();
      const solver = raw.solver;
      const operation = raw.operationState;
      const motor1Running = solver.motorStates?.motor1 === "running";
      const motor2Running = solver.motorStates?.motor2 === "running";
      return {
        ...contracts.createEmptySolverResult(MODULE_ID),
        stableDeviceStates: {
          KM1: Boolean(raw.stableControlState?.km1),
          KM2: Boolean(raw.stableControlState?.km2)
        },
        edgeStates: clone(solver.edgeStates || {}),
        activeMainWireIds: [...(solver.activeMainWireIds || [])],
        activeControlWireIds: [...(solver.activeControlWireIds || [])],
        partialWireIds: [...(solver.partialControlWireIds || [])],
        motorStates: {
          M1: { running: motor1Running, direction: "none", state: motor1Running ? "running" : "stopped" },
          M2: { running: motor2Running, direction: "none", state: motor2Running ? "running" : "stopped" }
        },
        protectionStates: {
          FR1: { state: operation.fr1, tripped: operation.fr1 === "overload" },
          FR2: { state: operation.fr2, tripped: operation.fr2 === "overload" }
        },
        converged: solver.converged !== false,
        iterationCount: solver.iterationCount || 0,
        lastAction: { message: String(solver.lastAction || "") },
        extension: {
          activeControlEdgeIds: [...(solver.activeControlEdgeIds || [])],
          activeMainEdgeIds: [...(solver.activeMainEdgeIds || [])],
          controlSupplyBoundary: solver.controlSupplyBoundary || null
        }
      };
    }

    function getOperationViewModel() {
      const state = getStateSnapshot();
      const powerClosed = state.operation.power === "closed";
      const motor1Running = state.motor.channels.M1.running;
      const motor2Running = state.motor.channels.M2.running;
      const fr1Overload = state.operation.protections.primary === "overload";
      const fr2Overload = state.operation.protections.secondary === "overload";
      const primaryProtection = {
        slot: "primary", visible: true, label: "FR1 过载", resetLabel: "FR1 复位",
        tripped: fr1Overload, toggleAction: "PROTECTION_TOGGLE", resetAction: "PROTECTION_RESET"
      };
      const secondaryProtection = {
        slot: "secondary", visible: true, label: "FR2 过载", resetLabel: "FR2 复位",
        tripped: fr2Overload, toggleAction: "PROTECTION_SECONDARY_TOGGLE", resetAction: "PROTECTION_SECONDARY_RESET"
      };
      return {
        schemaVersion: contracts.facadeSchemaVersion,
        moduleId: MODULE_ID,
        power: {
          deviceId: "QF1",
          closed: powerClosed,
          closeLabel: "QF1 合闸",
          openLabel: "QF1 分闸",
          closeEnabled: !powerClosed,
          openEnabled: powerClosed
        },
        controls: [
          { slot: "primary", visible: true, label: "停止 SB1", stateText: motor1Running ? "可执行停止" : "已停止", buttonClass: "stop", action: "STOP_PRIMARY_PRESS" },
          { slot: "secondary", visible: true, label: "启动 SB2", stateText: motor1Running ? "已执行" : "待命", buttonClass: "forward", action: "START_PRIMARY_PRESS" },
          { slot: "tertiary", visible: true, label: "停止 SB3", stateText: motor2Running ? "可执行停止" : "已停止", buttonClass: "stop", action: "STOP_SECONDARY_PRESS" },
          { slot: "quaternary", visible: true, label: "启动 SB4", stateText: motor2Running ? "已执行" : "待命", buttonClass: "forward", action: "START_SECONDARY_PRESS" }
        ],
        protection: primaryProtection,
        protections: [primaryProtection, secondaryProtection],
        actionStates: [
          { id: "qf1", label: "QF1", currentState: powerClosed ? "closed" : "open", availableTransitions: [powerClosed ? "open" : "close"], onAction: powerClosed ? "POWER_OPEN" : "POWER_CLOSE", feedbackText: powerClosed ? "QF1 当前已合闸。" : "QF1 当前断开。" },
          { id: "sb1", label: "停止 SB1", currentState: motor1Running ? "running" : "stopped", availableTransitions: [motor1Running ? "stop" : "show_stopped_hint"], onAction: "STOP_PRIMARY_PRESS", feedbackText: motor1Running ? "SB1 用于停止 1M。" : "1M 当前已经停止。" },
          { id: "sb2", label: "启动 SB2", currentState: motor1Running ? "running" : "stopped", availableTransitions: [motor1Running ? "show_running_hint" : "start"], onAction: "START_PRIMARY_PRESS", feedbackText: motor1Running ? "1M 当前已经运行。" : "SB2 会尝试建立 KM1 控制回路。" },
          { id: "sb3", label: "停止 SB3", currentState: motor2Running ? "running" : "stopped", availableTransitions: [motor2Running ? "stop" : "show_stopped_hint"], onAction: "STOP_SECONDARY_PRESS", feedbackText: motor2Running ? "SB3 用于停止 2M。" : "2M 当前已经停止。" },
          { id: "sb4", label: "启动 SB4", currentState: motor2Running ? "running" : "stopped", availableTransitions: [motor2Running ? "show_running_hint" : "start"], onAction: "START_SECONDARY_PRESS", feedbackText: motor2Running ? "2M 当前已经运行。" : "SB4 会尝试建立 KM2 控制回路。" },
          { id: "fr1_trip", label: "FR1 过载", currentState: fr1Overload ? "overload" : "normal", availableTransitions: [fr1Overload ? "show_overload_hint" : "trip"], onAction: "PROTECTION_TOGGLE", feedbackText: fr1Overload ? "FR1 已处于动作状态。" : "FR1 仅保护 1M 支路。" },
          { id: "fr1_reset", label: "FR1 复位", currentState: fr1Overload ? "overload" : "normal", availableTransitions: [fr1Overload ? "reset" : "show_normal_hint"], onAction: "PROTECTION_RESET", feedbackText: fr1Overload ? "FR1 可复位到待命状态。" : "FR1 当前处于正常状态。" },
          { id: "fr2_trip", label: "FR2 过载", currentState: fr2Overload ? "overload" : "normal", availableTransitions: [fr2Overload ? "show_overload_hint" : "trip"], onAction: "PROTECTION_SECONDARY_TOGGLE", feedbackText: fr2Overload ? "FR2 已处于动作状态。" : "FR2 仅保护 2M 支路。" },
          { id: "fr2_reset", label: "FR2 复位", currentState: fr2Overload ? "overload" : "normal", availableTransitions: [fr2Overload ? "reset" : "show_normal_hint"], onAction: "PROTECTION_SECONDARY_RESET", feedbackText: fr2Overload ? "FR2 可复位到待命状态。" : "FR2 当前处于正常状态。" }
        ]
      };
    }

    function getStatusViewModel() {
      const state = getStateSnapshot();
      const motor1Running = state.motor.channels.M1.running;
      const motor2Running = state.motor.channels.M2.running;
      const fr1Overload = state.operation.protections.primary === "overload";
      const fr2Overload = state.operation.protections.secondary === "overload";
      return {
        schemaVersion: contracts.facadeSchemaVersion,
        moduleId: MODULE_ID,
        rows: [
          { id: "power", label: "QF1", value: state.operation.power === "closed" ? "已合闸" : "断开", tone: state.operation.power === "closed" ? "on" : "off" },
          { id: "primaryContactor", label: "KM1", value: state.devices.primaryContactor.energized ? "得电" : "失电", tone: state.devices.primaryContactor.energized ? "forward" : "off" },
          { id: "primaryMotor", label: "1M", value: motor1Running ? "运行" : "停止", tone: motor1Running ? "forward" : "off" },
          { id: "primaryProtection", label: "FR1", value: fr1Overload ? "已过载" : "正常", tone: fr1Overload ? "error" : "on" },
          { id: "secondaryContactor", label: "KM2", value: state.devices.secondaryContactor.energized ? "得电" : "失电", tone: state.devices.secondaryContactor.energized ? "forward" : "off" },
          { id: "secondaryMotor", label: "2M", value: motor2Running ? "运行" : "停止", tone: motor2Running ? "forward" : "off" },
          { id: "secondaryProtection", label: "FR2", value: fr2Overload ? "已过载" : "正常", tone: fr2Overload ? "error" : "on" }
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
        case "START_SECONDARY_PRESS":
          port.startSecondary();
          break;
        case "STOP_SECONDARY_PRESS":
          port.stopSecondary();
          break;
        case "PROTECTION_TOGGLE":
          port.toggleProtection();
          break;
        case "PROTECTION_RESET":
          port.resetProtection();
          break;
        case "PROTECTION_SECONDARY_TOGGLE":
          port.toggleSecondaryProtection();
          break;
        case "PROTECTION_SECONDARY_RESET":
          port.resetSecondaryProtection();
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

    function solve(actionMessage = "main control facade solve") {
      port.solve(actionMessage);
      return normalizeSolverResult();
    }

    return Object.freeze({
      createInitialState: () => { port.reset(); return getStateSnapshot(); },
      getStateSnapshot,
      dispatchAction,
      solve,
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

  platform.moduleFacades.createMainControlFacade = createMainControlFacade;
})(globalThis);
