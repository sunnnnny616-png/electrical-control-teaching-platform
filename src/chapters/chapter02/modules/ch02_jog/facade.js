(function installJogFacade(global) {
  "use strict";

  const platform = global.ECTPPlatform = global.ECTPPlatform || {};
  platform.moduleFacades = platform.moduleFacades || {};
  const MODULE_ID = "ch02_jog";
  const ROUTE_ID = "jog-control";

  function clone(value) {
    return value === undefined ? undefined : JSON.parse(JSON.stringify(value));
  }

  function createJogFacade(options) {
    const { port } = options;
    const contracts = platform.contracts;
    const requiredPortMethods = [
      "readRawState", "reset", "solve", "togglePower", "pressJog", "releaseJog",
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
      return {
        schemaVersion: contracts.facadeSchemaVersion,
        moduleId: MODULE_ID,
        routeId: ROUTE_ID,
        operation: {
          power: operation.qf,
          controls: { jog: operation.sb },
          protections: { overload: operation.fr }
        },
        devices: {
          primaryContactor: { id: "KM", energized: Boolean(solver.motorRunning) }
        },
        motor: {
          id: "M",
          state: solver.motorRunning ? "running" : "stopped",
          running: Boolean(solver.motorRunning),
          direction: solver.motorRunning ? "forward" : "none"
        }
      };
    }

    function normalizeSolverResult(rawInput = readRaw()) {
      const raw = rawInput?.operationState ? rawInput : readRaw();
      const solver = raw.solver;
      const operation = raw.operationState;
      return {
        ...contracts.createEmptySolverResult(MODULE_ID),
        stableDeviceStates: { KM: Boolean(solver.motorRunning) },
        edgeStates: clone(solver.edgeStates || {}),
        activeMainWireIds: [...(solver.activeMainWireIds || [])],
        activeControlWireIds: [...(solver.activeControlWireIds || [])],
        partialWireIds: [...(solver.partialControlWireIds || [])],
        motorStates: {
          M: { running: Boolean(solver.motorRunning), direction: solver.motorRunning ? "forward" : "none" }
        },
        protectionStates: { FR: { state: operation.fr, tripped: operation.fr === "overload" } },
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
      const jogPressed = state.operation.controls.jog === "pressed";
      const overload = state.operation.protections.overload === "overload";
      return {
        schemaVersion: contracts.facadeSchemaVersion,
        moduleId: MODULE_ID,
        power: {
          deviceId: "QF",
          closed: powerClosed,
          closeLabel: "QF 合闸",
          openLabel: "QF 分闸",
          closeEnabled: !powerClosed,
          openEnabled: powerClosed
        },
        controls: [
          { slot: "primary", visible: false },
          { slot: "secondary", visible: true, label: "SB 点动", stateText: "按住运行 / 松开停止", buttonClass: "forward", pressAction: "JOG_PRESS", releaseAction: "JOG_RELEASE" },
          { slot: "tertiary", visible: false },
          { slot: "quaternary", visible: false }
        ],
        protection: { label: "FR 过载", resetLabel: "FR 复位", tripped: overload, toggleAction: "PROTECTION_TOGGLE", resetAction: "PROTECTION_RESET" },
        actionStates: [
          { id: "qf", label: "QF", currentState: powerClosed ? "closed" : "open", availableTransitions: [powerClosed ? "open" : "close"], onAction: powerClosed ? "POWER_OPEN" : "POWER_CLOSE", feedbackText: powerClosed ? "QF 当前已合闸。" : "QF 当前断开。" },
          { id: "sb", label: "SB 点动", currentState: jogPressed ? "pressed" : "released", availableTransitions: [jogPressed ? "release" : "press"], onAction: jogPressed ? "JOG_RELEASE" : "JOG_PRESS", feedbackText: state.motor.running ? "点动按钮按住时电机运行，松开后立即停止。" : "点动按钮是瞬时动作，不能锁存为持续运行。" },
          { id: "fr_trip", label: "FR 过载", currentState: overload ? "overload" : "normal", availableTransitions: [overload ? "show_overload_hint" : "trip"], onAction: "PROTECTION_TOGGLE", feedbackText: overload ? "FR 已处于动作状态。" : "FR 动作后会切断 KM 控制回路。" },
          { id: "fr_reset", label: "FR 复位", currentState: overload ? "overload" : "normal", availableTransitions: [overload ? "reset" : "show_normal_hint"], onAction: "PROTECTION_RESET", feedbackText: overload ? "FR 可复位回到待机状态。" : "FR 当前处于正常状态。" }
        ]
      };
    }

    function getStatusViewModel() {
      const state = getStateSnapshot();
      const powerClosed = state.operation.power === "closed";
      const jogPressed = state.operation.controls.jog === "pressed";
      const overload = state.operation.protections.overload === "overload";
      const energized = state.devices.primaryContactor.energized;
      return {
        schemaVersion: contracts.facadeSchemaVersion,
        moduleId: MODULE_ID,
        rows: [
          { id: "power", label: "QF", value: powerClosed ? "已合闸" : "断开", tone: powerClosed ? "on" : "off" },
          { id: "jog", label: "SB", value: jogPressed ? "正在按下" : "未按下", tone: jogPressed ? "forward" : "off" },
          { id: "contactor", label: "KM", value: energized ? "得电" : "失电", tone: energized ? "forward" : "off" },
          { id: "motor", label: "M", value: state.motor.running ? "运行" : "停止", tone: state.motor.running ? "forward" : "off" },
          { id: "protection", label: "FR", value: overload ? "已过载" : "正常", tone: overload ? "error" : "on" }
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
        case "JOG_PRESS":
          port.pressJog(action.payload.reason || "facade jog press");
          break;
        case "JOG_RELEASE":
          port.releaseJog(action.payload.reason || "facade jog release");
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
      const result = {
        action,
        state: getStateSnapshot(),
        solverResult: normalizeSolverResult(),
        operationViewModel: getOperationViewModel(),
        statusViewModel: getStatusViewModel(),
        feedback: buildTeachingFeedback()
      };
      contracts.assertFacadeOutputs({
        meta: { moduleId: MODULE_ID },
        getStateSnapshot: () => result.state,
        normalizeSolverResult: () => result.solverResult,
        getOperationViewModel: () => result.operationViewModel,
        getStatusViewModel: () => result.statusViewModel
      });
      return result;
    }

    function solve(actionMessage = "jog facade solve") {
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

  platform.moduleFacades.createJogFacade = createJogFacade;
})(globalThis);