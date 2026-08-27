(function installMultiPointFacade(global) {
  "use strict";

  const platform = global.ECTPPlatform = global.ECTPPlatform || {};
  platform.moduleFacades = platform.moduleFacades || {};
  const MODULE_ID = "ch02_multi_point";
  const ROUTE_ID = "multi-point-control";

  function clone(value) {
    return value === undefined ? undefined : JSON.parse(JSON.stringify(value));
  }

  function createFacade(context) {
    const contracts = platform.contracts;
    const solver = platform.moduleSolvers.ch02MultiPoint;
    const teaching = platform.moduleTeaching.ch02MultiPoint;
    const circuitData = platform.moduleCircuitData.ch02MultiPoint;
    if (!contracts || !solver || !teaching || !circuitData) throw new Error(`${MODULE_ID} dependencies did not load`);

    let state = solver.createInitialState();
    let solverResult = solver.solve(state).solverResult;
    let mounted = false;
    let paused = false;
    const view = context?.mountRoot && platform.moduleViews?.createCh02MultiPointView
      ? platform.moduleViews.createCh02MultiPointView({ mountRoot: context.mountRoot })
      : null;

    function recompute() {
      const solved = solver.solve(state);
      state = solved.state;
      solverResult = solved.solverResult;
      return solverResult;
    }

    function setLastAction(action, message) {
      state.lastAction = { type: action.type, payload: clone(action.payload), source: action.source, message };
    }

    function getStateSnapshot() {
      const operation = state.operationState;
      const running = solverResult.motorStates.M.running;
      return {
        schemaVersion: contracts.facadeSchemaVersion,
        moduleId: MODULE_ID,
        routeId: ROUTE_ID,
        operation: {
          power: operation.power,
          controls: { start1: operation.start1, stop1: operation.stop1, start2: operation.start2, stop2: operation.stop2 },
          protections: { overload: operation.protection }
        },
        devices: { primaryContactor: { id: "KM1", energized: Boolean(state.stableDeviceState.km1) } },
        motor: { id: "M", state: running ? "running" : "stopped", running, direction: running ? "forward" : "none" }
      };
    }

    function normalizeSolverResult() {
      return clone(solverResult);
    }

    function getOperationViewModel() {
      const snapshot = getStateSnapshot();
      const powerClosed = snapshot.operation.power === "closed";
      const overload = snapshot.operation.protections.overload === "overload";
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
        power: { deviceId: "QF1", closed: powerClosed, closeLabel: "QF1 合闸", openLabel: "QF1 分闸", closeEnabled: !powerClosed, openEnabled: powerClosed },
        controls: [
          { slot: "primary", visible: true, label: "地点1 启动 1SB1", stateText: snapshot.motor.running ? "已运行" : "可启动", buttonClass: "forward", action: "START_PRIMARY_PRESS" },
          { slot: "secondary", visible: true, label: "地点1 停止 1SB2", stateText: snapshot.motor.running ? "可停止" : "已停止", buttonClass: "stop", action: "STOP_PRIMARY_PRESS" },
          { slot: "tertiary", visible: true, label: "地点2 启动 2SB1", stateText: snapshot.motor.running ? "已运行" : "可启动", buttonClass: "forward", action: "START_SECONDARY_PRESS" },
          { slot: "quaternary", visible: true, label: "地点2 停止 2SB2", stateText: snapshot.motor.running ? "可停止" : "已停止", buttonClass: "stop", action: "STOP_SECONDARY_PRESS" }
        ],
        protection,
        protections: [protection],
        actionStates: [
          { id: "qf1", label: "QF1", currentState: powerClosed ? "closed" : "open", availableTransitions: [powerClosed ? "open" : "close"], onAction: powerClosed ? "POWER_OPEN" : "POWER_CLOSE", feedbackText: powerClosed ? "QF1已合闸。" : "QF1当前分闸。" },
          { id: "start1", label: "地点1启动", currentState: snapshot.motor.running ? "running" : "ready", availableTransitions: ["start"], onAction: "START_PRIMARY_PRESS", feedbackText: "1SB1与2SB1并联。" },
          { id: "stop1", label: "地点1停止", currentState: snapshot.motor.running ? "running" : "stopped", availableTransitions: ["stop"], onAction: "STOP_PRIMARY_PRESS", feedbackText: "1SB2与2SB2串联。" },
          { id: "start2", label: "地点2启动", currentState: snapshot.motor.running ? "running" : "ready", availableTransitions: ["start"], onAction: "START_SECONDARY_PRESS", feedbackText: "任一启动按钮均可建立启动通路。" },
          { id: "stop2", label: "地点2停止", currentState: snapshot.motor.running ? "running" : "stopped", availableTransitions: ["stop"], onAction: "STOP_SECONDARY_PRESS", feedbackText: "任一停止按钮均可切断整个控制回路。" },
          { id: "fr1", label: "FR1", currentState: overload ? "overload" : "normal", availableTransitions: [overload ? "reset" : "trip"], onAction: overload ? "PROTECTION_RESET" : "PROTECTION_TOGGLE", feedbackText: "FR1保护触点位于线圈回路。" }
        ]
      };
    }

    function getStatusViewModel() {
      const snapshot = getStateSnapshot();
      const overload = snapshot.operation.protections.overload === "overload";
      const indicators = solverResult.extension.indicators;
      return {
        schemaVersion: contracts.facadeSchemaVersion,
        moduleId: MODULE_ID,
        rows: [
          { id: "power", label: "QF1", value: snapshot.operation.power === "closed" ? "已合闸" : "分闸", tone: snapshot.operation.power === "closed" ? "on" : "off" },
          { id: "station1", label: "地点1", value: "1SB1启动 / 1SB2停止", tone: "on" },
          { id: "station2", label: "地点2", value: "2SB1启动 / 2SB2停止", tone: "on" },
          { id: "contactor", label: "KM1", value: snapshot.devices.primaryContactor.energized ? "得电" : "失电", tone: snapshot.devices.primaryContactor.energized ? "forward" : "off" },
          { id: "motor", label: "M", value: snapshot.motor.running ? "运行" : "停止", tone: snapshot.motor.running ? "forward" : "off" },
          { id: "indicators", label: "HL1 / HL2", value: indicators.HL1.on && indicators.HL2.on ? "点亮（原型）" : "熄灭（原型）", tone: indicators.HL1.on ? "forward" : "off" },
          { id: "protection", label: "FR1", value: overload ? "已过载" : "正常", tone: overload ? "error" : "on" }
        ]
      };
    }

    function buildTeachingFeedback() {
      return teaching.buildFeedback(state, solverResult);
    }

    function buildReplaySteps() {
      return teaching.buildReplaySteps(state, solverResult);
    }

    function render() {
      if (!mounted || paused || !view) return undefined;
      view.render({ data: circuitData, state: clone(state), result: clone(solverResult) });
      context?.services?.onModuleRender?.(MODULE_ID);
      return true;
    }

    function pulseControl(field, action, message) {
      state.operationState[field] = "pressed";
      setLastAction(action, message);
      recompute();
      state.operationState[field] = "released";
      recompute();
    }

    function dispatchAction(actionInput) {
      const action = typeof actionInput === "string" ? contracts.createAction(actionInput) : actionInput;
      const report = contracts.validateAction(action);
      if (!report.valid) throw new Error(`Invalid ${MODULE_ID} action: ${report.errors.join("; ")}`);

      switch (action.type) {
        case "POWER_CLOSE":
          state.operationState.power = "closed";
          setLastAction(action, "QF1合闸");
          recompute();
          break;
        case "POWER_OPEN":
          state.operationState.power = "open";
          state.stableDeviceState.km1 = false;
          setLastAction(action, "QF1分闸");
          recompute();
          break;
        case "START_PRIMARY_PRESS":
          pulseControl("start1", action, "按下地点1启动按钮1SB1");
          break;
        case "STOP_PRIMARY_PRESS":
          pulseControl("stop1", action, "按下地点1停止按钮1SB2");
          break;
        case "START_SECONDARY_PRESS":
          pulseControl("start2", action, "按下地点2启动按钮2SB1");
          break;
        case "STOP_SECONDARY_PRESS":
          pulseControl("stop2", action, "按下地点2停止按钮2SB2");
          break;
        case "PROTECTION_TOGGLE":
          state.operationState.protection = "overload";
          setLastAction(action, "FR1过载动作");
          recompute();
          break;
        case "PROTECTION_RESET":
          state.operationState.protection = "normal";
          setLastAction(action, "FR1已复位，等待重新启动");
          recompute();
          break;
        case "RESET_MODULE":
          state = solver.createInitialState();
          recompute();
          break;
        default:
          throw new Error(`${MODULE_ID} does not support ${action.type}`);
      }

      render();
      const output = {
        action,
        state: getStateSnapshot(),
        solverResult: normalizeSolverResult(),
        operationViewModel: getOperationViewModel(),
        statusViewModel: getStatusViewModel(),
        feedback: buildTeachingFeedback()
      };
      context?.services?.onFacadeOutput?.(output);
      return output;
    }

    function validateGeometry() {
      const componentIds = circuitData.components.map((item) => item.componentId);
      const deviceIds = circuitData.components.map((item) => item.deviceId);
      const namespaceErrors = [...componentIds, ...deviceIds, ...circuitData.wireIds].filter((item) => !item.startsWith(`${MODULE_ID}__`));
      const duplicateComponents = componentIds.filter((item, index) => componentIds.indexOf(item) !== index);
      const duplicateWires = circuitData.wireIds.filter((item, index) => circuitData.wireIds.indexOf(item) !== index);
      return { valid: namespaceErrors.length === 0 && duplicateComponents.length === 0 && duplicateWires.length === 0, namespaceErrors, duplicateComponentIds: duplicateComponents, duplicateWireIds: duplicateWires, geometryLockId: circuitData.geometry.lockId };
    }

    function runTests() {
      const solverReport = solver.runTests();
      const geometryReport = validateGeometry();
      return { passed: solverReport.passed && geometryReport.valid, solver: solverReport, geometry: geometryReport };
    }

    return Object.freeze({
      createInitialState: () => { state = solver.createInitialState(); recompute(); return getStateSnapshot(); },
      getStateSnapshot,
      dispatchAction,
      solve: (message = "facade solve") => { state.lastAction = { type: "SOLVE", message }; recompute(); return normalizeSolverResult(); },
      normalizeSolverResult,
      getOperationViewModel,
      getStatusViewModel,
      buildTeachingFeedback,
      buildReplaySteps,
      mount: () => { mounted = true; paused = false; return getStateSnapshot(); },
      render,
      reset: () => { state = solver.createInitialState(); recompute(); render(); return getStateSnapshot(); },
      pause: () => { paused = true; },
      resume: () => { paused = false; render(); },
      unmount: () => { mounted = false; paused = false; view?.unmount(); },
      validateGeometry,
      runTests
    });
  }

  platform.moduleFacades.createMultiPointFacade = createFacade;
})(globalThis);
