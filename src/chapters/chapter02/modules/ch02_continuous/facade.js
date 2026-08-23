(function installContinuousFacade(global) {
  "use strict";

  const platform = global.ECTPPlatform = global.ECTPPlatform || {};
  platform.moduleFacades = platform.moduleFacades || {};
  const MODULE_ID = "ch02_continuous";
  const ROUTE_ID = "self-lock";

  function clone(value) {
    return value === undefined ? undefined : JSON.parse(JSON.stringify(value));
  }

  function createContinuousFacade(options) {
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
      const energized = Boolean(raw.stableControlState?.km1);
      const motorRunning = Boolean(solver.motorRunning);
      return {
        schemaVersion: contracts.facadeSchemaVersion,
        moduleId: MODULE_ID,
        routeId: ROUTE_ID,
        operation: {
          power: operation.qf1,
          controls: { start: operation.sb1, stop: operation.sb2 },
          protections: { overload: operation.fr1 }
        },
        devices: {
          primaryContactor: { id: "KM1", energized },
          selfHoldContact: { id: "KM1_SELF_HOLD", conductive: Boolean(solver.selfHoldConductive) }
        },
        motor: {
          id: "M",
          state: motorRunning ? "running" : "stopped",
          running: motorRunning,
          direction: motorRunning ? "forward" : "none"
        }
      };
    }

    function normalizeSolverResult(rawInput = readRaw()) {
      const raw = rawInput?.operationState ? rawInput : readRaw();
      const solver = raw.solver;
      const operation = raw.operationState;
      const motorRunning = Boolean(solver.motorRunning);
      return {
        ...contracts.createEmptySolverResult(MODULE_ID),
        stableDeviceStates: {
          KM1: Boolean(raw.stableControlState?.km1),
          KM1_SELF_HOLD: Boolean(solver.selfHoldConductive)
        },
        edgeStates: clone(solver.edgeStates || {}),
        activeMainWireIds: [...(solver.activeMainWireIds || [])],
        activeControlWireIds: [...(solver.activeControlWireIds || [])],
        partialWireIds: [...(solver.partialControlWireIds || [])],
        motorStates: {
          M: { running: motorRunning, direction: motorRunning ? "forward" : "none" }
        },
        protectionStates: {
          FR1: { state: operation.fr1, tripped: operation.fr1 === "overload" }
        },
        converged: solver.converged !== false,
        iterationCount: solver.iterationCount || 0,
        lastAction: { message: String(solver.lastAction || "") },
        extension: {
          activeControlEdgeIds: [...(solver.activeControlEdgeIds || [])],
          activeMainEdgeIds: [...(solver.activeMainEdgeIds || [])],
          controlSupplyBoundary: solver.controlSupplyBoundary || null,
          selfHoldConductive: Boolean(solver.selfHoldConductive)
        }
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
        label: "FR1 过载",
        resetLabel: "FR1 复位",
        tripped: overload,
        toggleAction: "PROTECTION_TOGGLE",
        resetAction: "PROTECTION_RESET"
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
          { slot: "primary", visible: true, label: "启动 SB1", stateText: running ? "已执行" : "待命", buttonClass: "forward", action: "START_PRIMARY_PRESS" },
          { slot: "secondary", visible: true, label: "停止 SB2", stateText: running ? "可执行停止" : "已停止", buttonClass: "stop", action: "STOP_PRIMARY_PRESS" },
          { slot: "tertiary", visible: false },
          { slot: "quaternary", visible: false }
        ],
        protection,
        protections: [protection],
        actionStates: [
          { id: "qf1", label: "QF1", currentState: powerClosed ? "closed" : "open", availableTransitions: [powerClosed ? "open" : "close"], onAction: powerClosed ? "POWER_OPEN" : "POWER_CLOSE", feedbackText: powerClosed ? "QF1 当前已合闸，可再次分闸。" : "QF1 当前断开，可再次合闸。" },
          { id: "sb1", label: "启动 SB1", currentState: running ? "running" : "ready", availableTransitions: [running ? "show_stop_hint" : "start"], onAction: "START_PRIMARY_PRESS", feedbackText: running ? "SB1 是瞬时启动按钮，连续运行后应通过 SB2 停止。" : "按下 SB1 后，系统会依据自锁支路是否建立来决定是否连续运行。" },
          { id: "sb2", label: "停止 SB2", currentState: running ? "running" : "stopped", availableTransitions: [running ? "stop" : "show_stopped_hint"], onAction: "STOP_PRIMARY_PRESS", feedbackText: running ? "SB2 可切开控制回路并解除自锁。" : "设备当前已经停止，再按 SB2 只会给出状态提示。" },
          { id: "fr1_trip", label: "FR1 过载", currentState: overload ? "overload" : "normal", availableTransitions: [overload ? "show_overload_hint" : "trip"], onAction: "PROTECTION_TOGGLE", feedbackText: overload ? "FR1 已处于动作状态。" : "触发 FR1 后，保护触点断开，接触器释放。" },
          { id: "fr1_reset", label: "FR1 复位", currentState: overload ? "overload" : "normal", availableTransitions: [overload ? "reset" : "show_normal_hint"], onAction: "PROTECTION_RESET", feedbackText: overload ? "FR1 可复位回到待启动状态。" : "FR1 当前处于正常状态。" }
        ]
      };
    }

    function getStatusViewModel() {
      const state = getStateSnapshot();
      const overload = state.operation.protections.overload === "overload";
      const energized = state.devices.primaryContactor.energized;
      const selfHold = state.devices.selfHoldContact.conductive;
      return {
        schemaVersion: contracts.facadeSchemaVersion,
        moduleId: MODULE_ID,
        rows: [
          { id: "power", label: "QF1", value: state.operation.power === "closed" ? "已合闸" : "断开", tone: state.operation.power === "closed" ? "on" : "off" },
          { id: "start", label: "启动按钮", value: state.operation.controls.start === "pressed" ? "正在按下" : "未按下", tone: state.operation.controls.start === "pressed" ? "forward" : "off" },
          { id: "stop", label: "停止按钮", value: state.operation.controls.stop === "pressed" ? "正在按下" : "未按下", tone: state.operation.controls.stop === "pressed" ? "error" : "on" },
          { id: "contactor", label: "KM1", value: energized ? "得电" : "失电", tone: energized ? "forward" : "off" },
          { id: "selfHold", label: "自锁", value: selfHold ? "已建立" : "未建立", tone: selfHold ? "forward" : "off" },
          { id: "motor", label: "M", value: state.motor.running ? "运行" : "停止", tone: state.motor.running ? "forward" : "off" },
          { id: "protection", label: "FR1", value: overload ? "已过载" : "正常", tone: overload ? "error" : "on" }
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

    function solve(actionMessage = "continuous facade solve") {
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

  platform.moduleFacades.createContinuousFacade = createContinuousFacade;
})(globalThis);
