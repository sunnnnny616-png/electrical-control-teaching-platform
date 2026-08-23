(function installReverseFacade(global) {
  "use strict";

  const platform = global.ECTPPlatform = global.ECTPPlatform || {};
  platform.moduleFacades = platform.moduleFacades || {};
  const MODULE_ID = "ch02_reverse";
  const ROUTE_ID = "forward-reverse";

  function clone(value) {
    return value === undefined ? undefined : JSON.parse(JSON.stringify(value));
  }

  function createReverseFacade(options) {
    const { port } = options;
    const contracts = platform.contracts;
    const requiredPortMethods = [
      "readRawState", "reset", "solve", "togglePower", "pressStop", "pressForward", "pressReverse",
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
      const motorState = solver.motorState || "stopped";
      return {
        schemaVersion: contracts.facadeSchemaVersion,
        moduleId: MODULE_ID,
        routeId: ROUTE_ID,
        operation: {
          power: operation.qf1,
          controls: { stop: operation.sb1, forward: operation.sb2, reverse: operation.sb3 },
          protections: { overload: operation.fr1 }
        },
        devices: {
          forwardContactor: { id: "KM1", energized: Boolean(solver.stableControlState?.ki1) },
          reverseContactor: { id: "KM2", energized: Boolean(solver.stableControlState?.ki2) }
        },
        motor: {
          id: "M",
          state: motorState,
          running: motorState === "forward" || motorState === "reverse",
          direction: motorState === "forward" || motorState === "reverse" ? motorState : "none"
        }
      };
    }

    function normalizeSolverResult(rawInput = readRaw()) {
      const raw = rawInput?.operationState ? rawInput : readRaw();
      const solver = raw.solver;
      const operation = raw.operationState;
      const motorState = solver.motorState || "stopped";
      return {
        ...contracts.createEmptySolverResult(MODULE_ID),
        stableDeviceStates: {
          KM1: Boolean(solver.stableControlState?.ki1),
          KM2: Boolean(solver.stableControlState?.ki2)
        },
        edgeStates: clone(solver.edgeStates || {}),
        activeMainWireIds: [...(solver.activeMainWireIds || [])],
        activeControlWireIds: [...(solver.activeControlWireIds || [])],
        partialWireIds: [...(solver.partialControlWireIds || [])],
        motorStates: {
          M: { running: motorState === "forward" || motorState === "reverse", direction: motorState === "forward" || motorState === "reverse" ? motorState : "none", state: motorState }
        },
        protectionStates: { FR1: { state: operation.fr1, tripped: operation.fr1 === "overload" } },
        converged: solver.converged !== false,
        iterationCount: solver.iterationCount || 0,
        lastAction: { message: String(solver.lastAction || "") },
        extension: {
          activeControlEdgeIds: [...(solver.activeControlEdgeIds || [])],
          activeMainEdgeIds: [...(solver.activeMainEdgeIds || [])],
          activeMainWirePhaseMap: clone(solver.activeMainWirePhaseMap || {}),
          motorPhases: clone(solver.motorPhases || {})
        }
      };
    }

    function getOperationViewModel() {
      const state = getStateSnapshot();
      const powerClosed = state.operation.power === "closed";
      const overload = state.operation.protections.overload === "overload";
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
          { slot: "primary", visible: true, label: "停止 SB1", stateText: "已停止", buttonClass: "stop", action: "STOP_PRESS" },
          { slot: "secondary", visible: true, label: "正转启动 SB2", stateText: state.motor.direction === "forward" ? "运行中" : "待命", buttonClass: "forward", action: "START_FORWARD_PRESS" },
          { slot: "tertiary", visible: true, label: "反转启动 SB3", stateText: state.motor.direction === "reverse" ? "运行中" : "待命", buttonClass: "reverse", action: "START_REVERSE_PRESS" },
          { slot: "quaternary", visible: false }
        ],
        protection: { label: "FR1 过载", resetLabel: "FR1 复位", tripped: overload, toggleAction: "PROTECTION_TOGGLE", resetAction: "PROTECTION_RESET" },
        actionStates: [
          { id: "qf1", label: "QF1", currentState: powerClosed ? "closed" : "open", availableTransitions: [powerClosed ? "open" : "close"], onAction: powerClosed ? "POWER_OPEN" : "POWER_CLOSE", feedbackText: powerClosed ? "QF1 当前已合闸。" : "QF1 当前断开。" },
          { id: "sb1", label: "停止 SB1", currentState: state.motor.state, availableTransitions: [state.motor.state === "stopped" ? "show_stopped_hint" : "stop"], onAction: "STOP_PRESS", feedbackText: state.motor.state === "stopped" ? "设备当前已经停止。" : "SB1 用于停止当前转向运行。" },
          { id: "sb2", label: "正转启动 SB2", currentState: state.motor.state, availableTransitions: [state.motor.direction === "forward" ? "show_forward_hint" : "start_forward"], onAction: "START_FORWARD_PRESS", feedbackText: state.motor.direction === "forward" ? "电机已经处于正转状态。" : "SB2 会尝试建立正转回路。" },
          { id: "sb3", label: "反转启动 SB3", currentState: state.motor.state, availableTransitions: [state.motor.direction === "reverse" ? "show_reverse_hint" : "start_reverse"], onAction: "START_REVERSE_PRESS", feedbackText: state.motor.direction === "reverse" ? "电机已经处于反转状态。" : "SB3 会尝试建立反转回路。" },
          { id: "fr1_trip", label: "FR1 过载", currentState: overload ? "overload" : "normal", availableTransitions: [overload ? "show_overload_hint" : "trip"], onAction: "PROTECTION_TOGGLE", feedbackText: overload ? "FR1 已处于动作状态。" : "FR1 动作后会释放当前接触器。" },
          { id: "fr1_reset", label: "FR1 复位", currentState: overload ? "overload" : "normal", availableTransitions: [overload ? "reset" : "show_normal_hint"], onAction: "PROTECTION_RESET", feedbackText: overload ? "FR1 可复位回到待命状态。" : "FR1 当前处于正常状态。" }
        ]
      };
    }

    function getStatusViewModel() {
      const state = getStateSnapshot();
      const raw = readRaw();
      const phases = raw.solver.motorPhases || {};
      const overload = state.operation.protections.overload === "overload";
      const phaseText = state.motor.direction === "forward"
        ? "L1-U / L2-V / L3-W"
        : state.motor.direction === "reverse"
          ? "L1-W / L2-V / L3-U"
          : "U=- / V=- / W=-";
      return {
        schemaVersion: contracts.facadeSchemaVersion,
        moduleId: MODULE_ID,
        rows: [
          { id: "power", label: "QF1", value: state.operation.power === "closed" ? "已合闸" : "分闸", tone: state.operation.power === "closed" ? "on" : "off" },
          { id: "forwardContactor", label: "KM1", value: state.devices.forwardContactor.energized ? "吸合" : "释放", tone: state.devices.forwardContactor.energized ? "forward" : "off" },
          { id: "reverseContactor", label: "KM2", value: state.devices.reverseContactor.energized ? "吸合" : "释放", tone: state.devices.reverseContactor.energized ? "reverse" : "off" },
          { id: "motor", label: "M", value: state.motor.direction === "forward" ? "正转运行" : state.motor.direction === "reverse" ? "反转运行" : overload ? "故障停止" : "停止", tone: overload ? "error" : state.motor.direction === "forward" ? "forward" : state.motor.direction === "reverse" ? "reverse" : "off" },
          { id: "protection", label: "FR1", value: overload ? "已过载" : "正常", tone: overload ? "error" : "on" },
          { id: "mode", label: "运行状态", value: overload ? "保护动作" : state.motor.running ? state.motor.direction === "forward" ? "正转" : "反转" : state.operation.power === "closed" ? "待机" : "未上电", tone: overload ? "error" : state.motor.direction === "forward" ? "forward" : state.motor.direction === "reverse" ? "reverse" : state.operation.power === "closed" ? "on" : "off" },
          { id: "phase", label: "当前相序", value: phases.U || phases.V || phases.W ? phaseText : "U=- / V=- / W=-", tone: overload ? "error" : state.motor.direction === "forward" ? "forward" : state.motor.direction === "reverse" ? "reverse" : "off" }
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
        case "STOP_PRESS":
          port.pressStop();
          break;
        case "START_FORWARD_PRESS":
          port.pressForward();
          break;
        case "START_REVERSE_PRESS":
          port.pressReverse();
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

    function solve(actionMessage = "reverse facade solve") {
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

  platform.moduleFacades.createReverseFacade = createReverseFacade;
})(globalThis);