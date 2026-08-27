(function installMachineToolCircuitsFacade(global) {
  "use strict";

  const platform = global.ECTPPlatform = global.ECTPPlatform || {};
  platform.moduleFacades = platform.moduleFacades || {};
  const MODULE_ID = "ch02_machine_tool_circuits";
  const ROUTE_ID = "machine-tool-circuits";

  function clone(value) { return value === undefined ? undefined : JSON.parse(JSON.stringify(value)); }

  function createFacade(context) {
    const contracts = platform.contracts;
    const solver = platform.moduleSolvers.ch02MachineToolCircuits;
    const teaching = platform.moduleTeaching.ch02MachineToolCircuits;
    const circuitData = platform.moduleCircuitData.ch02MachineToolCircuits;
    if (!contracts || !solver || !teaching || !circuitData) throw new Error(`${MODULE_ID} dependencies did not load`);

    let state = solver.createInitialState();
    let solverResult = solver.solve(state).solverResult;
    let mounted = false;
    let paused = false;
    let timerId = null;
    const view = context?.mountRoot && platform.moduleViews?.createCh02MachineToolCircuitsView
      ? platform.moduleViews.createCh02MachineToolCircuitsView({
        mountRoot: context.mountRoot,
        dispatchAction: (type, payload = {}) => dispatchAction(contracts.createAction(type, payload, "module-view"))
      })
      : null;

    function clearTimer() {
      if (timerId === null) return;
      if (context?.scope?.clearTimeout) context.scope.clearTimeout(timerId);
      else global.clearTimeout(timerId);
      timerId = null;
    }

    function recompute() {
      const solved = solver.solve(state);
      state = solved.state;
      solverResult = solved.solverResult;
      return solverResult;
    }

    function setLastAction(action, message) {
      state.lastAction = { type: action.type, payload: clone(action.payload), source: action.source, message };
    }

    function scheduleTimerComplete(variant) {
      clearTimer();
      const complete = () => {
        timerId = null;
        if (!mounted) return;
        const action = contracts.createAction("START_SECONDARY_PRESS", { command: "timerComplete", variant }, "module-timer");
        dispatchAction(action);
      };
      timerId = context?.scope?.timeout ? context.scope.timeout(complete, 900) : global.setTimeout(complete, 900);
    }

    function getStateSnapshot() {
      const op = state.operationState;
      const variant = op.variant;
      const motors = variant === "ca6140"
        ? { primary: solverResult.motorStates.M }
        : { primary: solverResult.motorStates.M1, rocker: solverResult.motorStates.M2, hydraulic: solverResult.motorStates.M3 };
      return {
        schemaVersion: contracts.facadeSchemaVersion,
        moduleId: MODULE_ID,
        routeId: ROUTE_ID,
        operation: {
          power: op.power,
          controls: variant === "ca6140"
            ? { direction: op.caCommand, timer: op.caTimer }
            : { spindle: op.zSpindle, rocker: op.zRocker, clamp: op.zClamp, timer: op.zTimer },
          protections: { primary: op.primaryProtection, secondary: op.secondaryProtection },
          extension: {
            variant,
            limits: variant === "ca6140"
              ? { SQ1: op.caSq1, SQ2: op.caSq2 }
              : { SQ1_UP: op.zSq1Upper, SQ1_DOWN: op.zSq1Lower, SQ2: op.zSq2, SQ3: op.zSq3 }
          }
        },
        devices: {
          KM1: { energized: Boolean(solverResult.stableDeviceStates.KM1) },
          KM2: { energized: Boolean(solverResult.stableDeviceStates.KM2) },
          KM3: { energized: Boolean(solverResult.stableDeviceStates.KM3) },
          KM4: { energized: Boolean(solverResult.stableDeviceStates.KM4) },
          KM5: { energized: Boolean(solverResult.stableDeviceStates.KM5) },
          KT: { energized: Boolean(solverResult.stableDeviceStates.KT), state: variant === "ca6140" ? op.caTimer : op.zTimer },
          YV: { energized: Boolean(solverResult.stableDeviceStates.YV) }
        },
        motor: {
          id: variant === "ca6140" ? "M" : "M1",
          state: motors.primary?.running ? "running" : "stopped",
          running: Boolean(motors.primary?.running),
          direction: motors.primary?.direction || "none",
          extension: motors
        }
      };
    }

    function normalizeSolverResult() { return clone(solverResult); }

    function control(slot, label, stateText, action, command, buttonClass = "forward") {
      return { slot, visible: true, label, stateText, buttonClass, action, payload: { command } };
    }

    function getOperationViewModel() {
      const op = state.operationState;
      const powerClosed = op.power === "closed";
      const ca = op.variant === "ca6140";
      const controls = ca ? [
        control("primary", "SB2 正向启动", solverResult.motorStates.M?.direction === "forward" ? "正向运行" : "启动正向", "START_PRIMARY_PRESS", "forward"),
        control("secondary", "SB3 反向启动", solverResult.motorStates.M?.direction === "reverse" ? "反向运行" : "启动反向", "START_SECONDARY_PRESS", "reverse"),
        control("tertiary", "SB1 停止", "切断KM1/KM2并启动KT", "STOP_PRIMARY_PRESS", "stop", "stop"),
        control("quaternary", "SQ1 反向限位", op.caSq1 === "triggered" ? "已动作" : "未动作", "PROTECTION_SECONDARY_TOGGLE", "caSq1", "stop"),
        control("quinary", "SQ2 正向限位", op.caSq2 === "triggered" ? "已动作" : "未动作", "PROTECTION_SECONDARY_TOGGLE", "caSq2", "stop")
      ] : [
        control("primary", "SB2 主轴启动", solverResult.motorStates.M1?.running ? "主轴运行" : "启动主轴", "START_PRIMARY_PRESS", "spindleStart"),
        control("secondary", "SB1 主轴停止", "停止主轴", "STOP_PRIMARY_PRESS", "spindleStop", "stop"),
        control("tertiary", "SB3 摇臂上升", op.zRocker === "up" ? "升降流程中" : "启动上升", "START_PRIMARY_PRESS", "rockerUp"),
        control("quaternary", "SB4 摇臂下降", op.zRocker === "down" ? "升降流程中" : "启动下降", "START_SECONDARY_PRESS", "rockerDown"),
        control("quinary", "SB5 松开", op.zClamp === "loosen" ? "松开中" : "启动松开", "START_SECONDARY_PRESS", "loosen"),
        control("senary", "SB6 夹紧", op.zClamp === "clamp" ? "夹紧中" : "启动夹紧", "START_PRIMARY_PRESS", "clamp"),
        control("septenary", "停止升降/液压", "安全停止", "STOP_SECONDARY_PRESS", "hydraulicStop", "stop"),
        control("limit-up", "SQ1 上限位", op.zSq1Upper === "triggered" ? "已动作" : "未动作", "PROTECTION_SECONDARY_TOGGLE", "zSq1Upper", "stop"),
        control("limit-down", "SQ1 下限位", op.zSq1Lower === "triggered" ? "已动作" : "未动作", "PROTECTION_SECONDARY_TOGGLE", "zSq1Lower", "stop"),
        control("limit-loose", "SQ2 松开到位", op.zSq2 === "triggered" ? "已到位" : "未到位", "PROTECTION_SECONDARY_TOGGLE", "zSq2", "stop"),
        control("limit-clamp", "SQ3 夹紧到位", op.zSq3 === "triggered" ? "已到位" : "未到位", "PROTECTION_SECONDARY_TOGGLE", "zSq3", "stop")
      ];
      const primaryProtection = {
        slot: "primary", visible: true, label: ca ? "FR 过载" : "FR1 主轴过载", resetLabel: ca ? "FR 复位" : "FR1 复位",
        tripped: op.primaryProtection === "overload", toggleAction: "PROTECTION_TOGGLE", resetAction: "PROTECTION_RESET",
        togglePayload: { target: "primary" }, resetPayload: { target: "primary" }
      };
      const protections = [primaryProtection];
      if (!ca) protections.push({
        slot: "secondary", visible: true, label: "FR2 液压过载", resetLabel: "FR2 复位",
        tripped: op.secondaryProtection === "overload", toggleAction: "PROTECTION_SECONDARY_TOGGLE", resetAction: "PROTECTION_SECONDARY_RESET",
        togglePayload: { target: "secondary" }, resetPayload: { target: "secondary" }
      });
      return {
        schemaVersion: contracts.facadeSchemaVersion,
        moduleId: MODULE_ID,
        power: { deviceId: "QF", closed: powerClosed, closeLabel: "QF 合闸", openLabel: "QF 分闸", closeEnabled: !powerClosed, openEnabled: powerClosed },
        controls,
        protection: primaryProtection,
        protections,
        actionStates: controls.map((item) => ({ id: item.payload.command, label: item.label, currentState: item.stateText, availableTransitions: [item.action], onAction: item.action, feedbackText: item.stateText })),
        extension: { activeVariant: op.variant, variants: ["ca6140", "z3040"] }
      };
    }

    function getStatusViewModel() {
      const op = state.operationState;
      const on = (flag) => flag ? "得电" : "失电";
      const rows = [
        { id: "variant", label: "当前线路", value: op.variant === "ca6140" ? "CA6140" : "Z3040", tone: "on" },
        { id: "power", label: "QF", value: op.power === "closed" ? "已合闸" : "分闸", tone: op.power === "closed" ? "on" : "off" }
      ];
      if (op.variant === "ca6140") rows.push(
        { id: "km1", label: "KM1", value: on(solverResult.stableDeviceStates.KM1), tone: solverResult.stableDeviceStates.KM1 ? "forward" : "off" },
        { id: "km2", label: "KM2", value: on(solverResult.stableDeviceStates.KM2), tone: solverResult.stableDeviceStates.KM2 ? "forward" : "off" },
        { id: "motor", label: "M", value: solverResult.motorStates.M?.direction === "forward" ? "正向运行" : solverResult.motorStates.M?.direction === "reverse" ? "反向运行" : "停止", tone: solverResult.motorStates.M?.running ? "forward" : "off" },
        { id: "kt", label: "KT", value: op.caTimer === "timing" ? "延时中" : op.caTimer === "completed" ? "已完成" : "未计时", tone: op.caTimer === "timing" ? "warning" : "off" },
        { id: "limits", label: "SQ1 / SQ2", value: `${op.caSq1 === "triggered" ? "动作" : "正常"} / ${op.caSq2 === "triggered" ? "动作" : "正常"}`, tone: op.caSq1 === "triggered" || op.caSq2 === "triggered" ? "error" : "on" }
      );
      else rows.push(
        { id: "spindle", label: "主轴 M1", value: solverResult.motorStates.M1?.running ? "运行" : "停止", tone: solverResult.motorStates.M1?.running ? "forward" : "off" },
        { id: "rocker", label: "摇臂 M2", value: solverResult.motorStates.M2?.direction === "up" ? "上升" : solverResult.motorStates.M2?.direction === "down" ? "下降" : "停止", tone: solverResult.motorStates.M2?.running ? "forward" : "off" },
        { id: "hydraulic", label: "液压 M3", value: solverResult.motorStates.M3?.running ? "运行" : "停止", tone: solverResult.motorStates.M3?.running ? "forward" : "off" },
        { id: "kt", label: "KT", value: op.zTimer === "timing" ? "延时中" : op.zTimer === "completed" ? "已完成" : "未计时", tone: op.zTimer === "timing" ? "warning" : "off" },
        { id: "clamp", label: "夹紧状态", value: op.zClamp === "loosen" ? "松开中" : op.zClamp === "clamp" ? "夹紧中" : "停止", tone: op.zClamp === "stopped" ? "off" : "on" }
      );
      return { schemaVersion: contracts.facadeSchemaVersion, moduleId: MODULE_ID, rows };
    }

    function buildTeachingFeedback() { return teaching.buildFeedback(state, solverResult); }
    function buildReplaySteps() { return teaching.buildReplaySteps(state, solverResult); }

    function render() {
      if (!mounted || paused || !view) return undefined;
      view.render({ data: circuitData, state: clone(state), result: clone(solverResult) });
      context?.services?.onModuleRender?.(MODULE_ID);
      return true;
    }

    function finishCommand(command) {
      if (command === "timerComplete") {
        if (state.operationState.variant === "z3040") {
          state.operationState.zTimer = "completed";
          state.operationState.zSq2 = "triggered";
        }
        else state.operationState.caTimer = "completed";
      }
    }

    function dispatchAction(actionInput) {
      const action = typeof actionInput === "string" ? contracts.createAction(actionInput) : actionInput;
      const report = contracts.validateAction(action);
      if (!report.valid) throw new Error(`Invalid ${MODULE_ID} action: ${report.errors.join("; ")}`);
      const op = state.operationState;
      const command = action.payload?.command || "";
      setLastAction(action, action.type);
      switch (action.type) {
        case "POWER_CLOSE": op.power = "closed"; setLastAction(action, "QF合闸"); break;
        case "POWER_OPEN": op.power = "open"; clearTimer(); state = solver.createInitialState({ operationState: { variant: op.variant }, lastAction: { type: action.type, message: "QF分闸" } }); break;
        case "START_PRIMARY_PRESS":
          if (command === "forward") { op.caCommand = "forward"; op.caTimer = "idle"; }
          else if (command === "spindleStart") op.zSpindle = "running";
          else if (command === "rockerUp") { op.zRocker = "up"; op.zClamp = "loosen"; op.zTimer = "timing"; scheduleTimerComplete("z3040"); }
          else if (command === "clamp") { op.zClamp = "clamp"; op.zRocker = "stopped"; op.zTimer = "idle"; op.zSq2 = "released"; op.zSq3 = "released"; clearTimer(); }
          setLastAction(action, command === "forward" ? "按下SB2正向启动" : command === "spindleStart" ? "按下SB2主轴启动" : command === "rockerUp" ? "按下SB3摇臂上升" : "按下SB6夹紧");
          break;
        case "START_SECONDARY_PRESS":
          if (command === "reverse") { op.caCommand = "reverse"; op.caTimer = "idle"; }
          else if (command === "rockerDown") { op.zRocker = "down"; op.zClamp = "loosen"; op.zTimer = "timing"; scheduleTimerComplete("z3040"); }
          else if (command === "loosen") { op.zClamp = "loosen"; op.zRocker = "stopped"; op.zTimer = "idle"; op.zSq2 = "released"; clearTimer(); }
          else if (command === "timerComplete") finishCommand(command);
          setLastAction(action, command === "reverse" ? "按下SB3反向启动" : command === "rockerDown" ? "按下SB4摇臂下降" : command === "loosen" ? "按下SB5松开" : "KT延时完成");
          break;
        case "STOP_PRIMARY_PRESS":
          if (command === "spindleStop") op.zSpindle = "stopped";
          else { op.caCommand = "stopped"; op.caTimer = "timing"; scheduleTimerComplete("ca6140"); }
          setLastAction(action, command === "spindleStop" ? "按下SB1停止主轴" : "按下SB1停止，KT开始延时");
          break;
        case "STOP_SECONDARY_PRESS": op.zRocker = "stopped"; op.zClamp = "stopped"; op.zTimer = "idle"; clearTimer(); setLastAction(action, "停止升降与液压动作"); break;
        case "PROTECTION_TOGGLE": op.primaryProtection = "overload"; if (op.variant === "ca6140") op.caCommand = "stopped"; else op.zSpindle = "stopped"; setLastAction(action, "主保护过载动作"); break;
        case "PROTECTION_RESET": op.primaryProtection = "normal"; setLastAction(action, "主保护已复位，等待重新启动"); break;
        case "PROTECTION_SECONDARY_TOGGLE":
          if (command === "caSq1") { op.caSq1 = op.caSq1 === "triggered" ? "released" : "triggered"; if (op.caSq1 === "triggered" && op.caCommand === "reverse") op.caCommand = "stopped"; }
          else if (command === "caSq2") { op.caSq2 = op.caSq2 === "triggered" ? "released" : "triggered"; if (op.caSq2 === "triggered" && op.caCommand === "forward") op.caCommand = "stopped"; }
          else if (command === "zSq1Upper") { op.zSq1Upper = op.zSq1Upper === "triggered" ? "released" : "triggered"; if (op.zSq1Upper === "triggered" && op.zRocker === "up") op.zRocker = "stopped"; }
          else if (command === "zSq1Lower") { op.zSq1Lower = op.zSq1Lower === "triggered" ? "released" : "triggered"; if (op.zSq1Lower === "triggered" && op.zRocker === "down") op.zRocker = "stopped"; }
          else if (command === "zSq2") op.zSq2 = op.zSq2 === "triggered" ? "released" : "triggered";
          else if (command === "zSq3") { op.zSq3 = op.zSq3 === "triggered" ? "released" : "triggered"; if (op.zSq3 === "triggered" && op.zClamp === "clamp") op.zClamp = "stopped"; }
          else { op.secondaryProtection = "overload"; op.zRocker = "stopped"; op.zClamp = "stopped"; op.zTimer = "idle"; clearTimer(); }
          setLastAction(action, command ? `${command.toUpperCase()}状态切换` : "FR2过载动作");
          break;
        case "PROTECTION_SECONDARY_RESET": op.secondaryProtection = "normal"; setLastAction(action, "FR2已复位，等待重新启动"); break;
        case "RESET_MODULE": {
          const variant = ["ca6140", "z3040"].includes(action.payload.variant) ? action.payload.variant : op.variant;
          clearTimer(); state = solver.createInitialState({ operationState: { variant }, lastAction: { type: action.type, message: "线路已切换并复位" } });
          break;
        }
        default: throw new Error(`${MODULE_ID} does not support ${action.type}`);
      }
      recompute(); render();
      const output = { action, state: getStateSnapshot(), solverResult: normalizeSolverResult(), operationViewModel: getOperationViewModel(), statusViewModel: getStatusViewModel(), feedback: buildTeachingFeedback() };
      context?.services?.onFacadeOutput?.(output);
      return output;
    }

    function validateGeometry() {
      const ids = circuitData.components.flatMap((item) => [item.componentId, item.deviceId]);
      const namespaceErrors = ids.filter((item) => !item.startsWith(`${MODULE_ID}__`));
      const wireIds = circuitData.wires.map((item) => item.wireId);
      const duplicateWireIds = wireIds.filter((item, index) => wireIds.indexOf(item) !== index);
      const emptyRoutes = circuitData.wires.filter((item) => item.routePoints.length < 2).map((item) => item.wireId);
      return { valid: !namespaceErrors.length && !duplicateWireIds.length && !emptyRoutes.length, namespaceErrors, duplicateWireIds, emptyRoutes, geometryLockId: circuitData.geometryLockId };
    }

    function runTests() {
      const solverReport = solver.runTests();
      const geometry = validateGeometry();
      return { passed: solverReport.passed && geometry.valid, solver: solverReport, geometry };
    }

    return Object.freeze({
      createInitialState: () => { clearTimer(); state = solver.createInitialState(); recompute(); return getStateSnapshot(); },
      getStateSnapshot, dispatchAction,
      solve: (message = "facade solve") => { state.lastAction = { type: "SOLVE", message }; recompute(); return normalizeSolverResult(); },
      normalizeSolverResult, getOperationViewModel, getStatusViewModel, buildTeachingFeedback, buildReplaySteps,
      mount: () => { mounted = true; paused = false; return getStateSnapshot(); },
      render,
      reset: () => { clearTimer(); state = solver.createInitialState(); recompute(); render(); return getStateSnapshot(); },
      pause: () => { paused = true; },
      resume: () => { paused = false; render(); },
      unmount: () => { clearTimer(); mounted = false; paused = false; view?.unmount(); },
      validateGeometry, runTests
    });
  }

  platform.moduleFacades.createMachineToolCircuitsFacade = createFacade;
})(globalThis);
