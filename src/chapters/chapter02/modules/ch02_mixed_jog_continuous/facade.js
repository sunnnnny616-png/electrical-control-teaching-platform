(function installMixedJogContinuousFacade(global) {
  "use strict";

  const platform = global.ECTPPlatform = global.ECTPPlatform || {};
  platform.moduleFacades = platform.moduleFacades || {};
  const MODULE_ID = "ch02_mixed_jog_continuous";
  const ROUTE_ID = "mixed-jog-continuous";

  function clone(value) {
    return value === undefined ? undefined : JSON.parse(JSON.stringify(value));
  }

  function createFacade(context) {
    const contracts = platform.contracts;
    const solver = platform.moduleSolvers.ch02MixedJogContinuous;
    const teaching = platform.moduleTeaching.ch02MixedJogContinuous;
    const circuitData = platform.moduleCircuitData.ch02MixedJogContinuous;
    if (!contracts || !solver || !teaching || !circuitData) throw new Error(`${MODULE_ID} dependencies did not load`);

    let state = solver.createInitialState();
    let solverResult = solver.solve(state).solverResult;
    let mounted = false;
    let paused = false;
    let releaseGuardInstalled = false;
    const view = context?.mountRoot && platform.moduleViews?.createCh02MixedJogContinuousView
      ? platform.moduleViews.createCh02MixedJogContinuousView({
        mountRoot: context.mountRoot,
        dispatchAction: (type, payload = {}) => dispatchAction(contracts.createAction(type, payload, "module-view"))
      })
      : null;

    function recompute(options = {}) {
      const solved = solver.solve(state, options);
      state = solved.state;
      solverResult = solved.solverResult;
      return solverResult;
    }

    function setLastAction(action, message) {
      state.lastAction = { type: action.type, payload: clone(action.payload), source: action.source, message };
    }

    function getStateSnapshot() {
      const operation = state.operationState;
      return {
        schemaVersion: contracts.facadeSchemaVersion,
        moduleId: MODULE_ID,
        routeId: ROUTE_ID,
        operation: {
          power: operation.power,
          controls: { start: operation.start, jog: operation.jog, stop: operation.stop },
          protections: { overload: operation.protection },
          extension: { variant: operation.variant, mode: operation.mode }
        },
        devices: {
          primaryContactor: { id: "KM1", energized: Boolean(state.stableDeviceState.km1) },
          intermediateRelay: { id: "K", energized: Boolean(state.stableDeviceState.k), applicable: operation.variant === "scheme3" }
        },
        motor: {
          id: "M",
          state: solverResult.motorStates.M.running ? "running" : "stopped",
          running: Boolean(solverResult.motorStates.M.running),
          direction: solverResult.motorStates.M.direction
        }
      };
    }

    function normalizeSolverResult() {
      return clone(solverResult);
    }

    function getOperationViewModel() {
      const snapshot = getStateSnapshot();
      const operation = state.operationState;
      const powerClosed = snapshot.operation.power === "closed";
      const overload = snapshot.operation.protections.overload === "overload";
      const schemeOneJog = operation.variant === "scheme1" && operation.mode === "jog";
      const longVisible = !schemeOneJog;
      const jogVisible = operation.variant !== "scheme1" || schemeOneJog;
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
          { slot: "primary", visible: longVisible, label: operation.variant === "scheme3" ? "SB1 长动启动" : "SB1 长动启动", stateText: snapshot.motor.running ? "保持运行" : "待命", buttonClass: "forward", action: "START_PRIMARY_PRESS" },
          { slot: "secondary", visible: true, label: "SB2 停止", stateText: snapshot.motor.running ? "可停止" : "已停止", buttonClass: "stop", action: "STOP_PRIMARY_PRESS" },
          { slot: "tertiary", visible: jogVisible, label: operation.variant === "scheme1" ? "SB1 点动" : "SB3 点动", stateText: "按住运行 / 松开停止", buttonClass: "forward", pressAction: "JOG_PRESS", releaseAction: "JOG_RELEASE" },
          { slot: "quaternary", visible: false }
        ],
        protection,
        protections: [protection],
        actionStates: [
          { id: "qf1", label: "QF1", currentState: powerClosed ? "closed" : "open", availableTransitions: [powerClosed ? "open" : "close"], onAction: powerClosed ? "POWER_OPEN" : "POWER_CLOSE", feedbackText: powerClosed ? "QF1已合闸。" : "QF1当前断开。" },
          { id: "long_start", label: "长动启动", currentState: snapshot.motor.running ? "running" : "ready", availableTransitions: ["start"], onAction: "START_PRIMARY_PRESS", feedbackText: "长动启动将通过KM1辅助触点或中间继电器K建立保持。" },
          { id: "jog", label: "点动", currentState: operation.jog, availableTransitions: [operation.jog === "pressed" ? "release" : "press"], onAction: operation.jog === "pressed" ? "JOG_RELEASE" : "JOG_PRESS", feedbackText: "点动只在按钮按住期间建立通路。" },
          { id: "stop", label: "SB2停止", currentState: snapshot.motor.running ? "running" : "stopped", availableTransitions: ["stop"], onAction: "STOP_PRIMARY_PRESS", feedbackText: "SB2断开保持回路。" },
          { id: "fr1", label: "FR1", currentState: overload ? "overload" : "normal", availableTransitions: [overload ? "reset" : "trip"], onAction: overload ? "PROTECTION_RESET" : "PROTECTION_TOGGLE", feedbackText: "FR1过载后必须复位并重新启动。" }
        ],
        extension: {
          variants: ["scheme1", "scheme2", "scheme3"],
          activeVariant: operation.variant,
          selectorMode: operation.mode
        }
      };
    }

    function getStatusViewModel() {
      const snapshot = getStateSnapshot();
      const operation = state.operationState;
      const overload = snapshot.operation.protections.overload === "overload";
      const schemeNames = { scheme1: "方式一", scheme2: "方式二", scheme3: "方式三" };
      const rows = [
        { id: "variant", label: "当前方案", value: schemeNames[operation.variant], tone: "on" },
        { id: "power", label: "QF1", value: snapshot.operation.power === "closed" ? "已合闸" : "分闸", tone: snapshot.operation.power === "closed" ? "on" : "off" },
        { id: "contactor", label: "KM1", value: snapshot.devices.primaryContactor.energized ? "得电" : "失电", tone: snapshot.devices.primaryContactor.energized ? "forward" : "off" },
        { id: "motor", label: "M", value: snapshot.motor.running ? "运行" : "停止", tone: snapshot.motor.running ? "forward" : "off" },
        { id: "protection", label: "FR1", value: overload ? "已过载" : "正常", tone: overload ? "error" : "on" }
      ];
      if (operation.variant === "scheme1") rows.splice(1, 0, { id: "mode", label: "SA", value: operation.mode === "continuous" ? "长动" : "点动", tone: operation.mode === "continuous" ? "forward" : "on" });
      if (operation.variant === "scheme3") rows.splice(3, 0, { id: "relay", label: "K", value: snapshot.devices.intermediateRelay.energized ? "得电" : "失电", tone: snapshot.devices.intermediateRelay.energized ? "forward" : "off" });
      return { schemaVersion: contracts.facadeSchemaVersion, moduleId: MODULE_ID, rows };
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

    function dispatchAction(actionInput) {
      const action = typeof actionInput === "string" ? contracts.createAction(actionInput) : actionInput;
      const report = contracts.validateAction(action);
      if (!report.valid) throw new Error(`Invalid ${MODULE_ID} action: ${report.errors.join("; ")}`);
      const operation = state.operationState;
      setLastAction(action, action.type);

      switch (action.type) {
        case "POWER_CLOSE":
          operation.power = "closed";
          setLastAction(action, "QF1合闸");
          recompute();
          break;
        case "POWER_OPEN":
          operation.power = "open";
          state.stableDeviceState = { km1: false, k: false };
          setLastAction(action, "QF1分闸");
          recompute();
          break;
        case "START_PRIMARY_PRESS":
          operation.start = "pressed";
          setLastAction(action, "按下长动启动按钮");
          recompute();
          state.operationState.start = "released";
          recompute();
          break;
        case "JOG_PRESS":
          operation.jog = "pressed";
          setLastAction(action, "按下点动按钮");
          recompute();
          break;
        case "JOG_RELEASE":
          operation.jog = "released";
          setLastAction(action, "释放点动按钮");
          if (operation.variant === "scheme2" || operation.variant === "scheme3") recompute({ forceJogNcOpen: true });
          recompute();
          break;
        case "STOP_PRIMARY_PRESS":
          operation.stop = "pressed";
          setLastAction(action, "按下SB2停止按钮");
          recompute();
          state.operationState.stop = "released";
          recompute();
          break;
        case "START_SECONDARY_PRESS":
          if (operation.variant === "scheme1") {
            operation.mode = action.payload.mode === "jog" ? "jog" : "continuous";
            state.stableDeviceState = { km1: false, k: false };
            setLastAction(action, `SA切换为${operation.mode === "continuous" ? "长动" : "点动"}`);
            recompute();
          }
          break;
        case "PROTECTION_TOGGLE":
          operation.protection = "overload";
          setLastAction(action, "FR1过载动作");
          recompute();
          break;
        case "PROTECTION_RESET":
          operation.protection = "normal";
          setLastAction(action, "FR1已复位，等待重新启动");
          recompute();
          break;
        case "RESET_MODULE": {
          const variant = ["scheme1", "scheme2", "scheme3"].includes(action.payload.variant) ? action.payload.variant : operation.variant;
          const mode = action.payload.mode === "continuous" ? "continuous" : action.payload.mode === "jog" ? "jog" : operation.mode;
          state = solver.createInitialState({ operationState: { variant, mode }, lastAction: { type: action.type, message: "方案已切换并复位" } });
          recompute();
          break;
        }
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

    function releaseJogIfPressed(reason) {
      if (!mounted || state.operationState.jog !== "pressed") return;
      dispatchAction(contracts.createAction("JOG_RELEASE", { reason }, "module-lifecycle"));
    }

    function handleGlobalPointerRelease() {
      releaseJogIfPressed("pointer-release");
    }

    function handleWindowBlur() {
      releaseJogIfPressed("window-blur");
    }

    function handleVisibilityChange() {
      if (global.document?.hidden) releaseJogIfPressed("document-hidden");
    }

    function removeReleaseGuard() {
      if (!releaseGuardInstalled || typeof global.removeEventListener !== "function") return;
      global.removeEventListener("pointerup", handleGlobalPointerRelease);
      global.removeEventListener("pointercancel", handleGlobalPointerRelease);
      global.removeEventListener("blur", handleWindowBlur);
      global.document?.removeEventListener("visibilitychange", handleVisibilityChange);
      releaseGuardInstalled = false;
    }

    function installReleaseGuard() {
      if (releaseGuardInstalled || typeof global.addEventListener !== "function") return;
      global.addEventListener("pointerup", handleGlobalPointerRelease);
      global.addEventListener("pointercancel", handleGlobalPointerRelease);
      global.addEventListener("blur", handleWindowBlur);
      global.document?.addEventListener("visibilitychange", handleVisibilityChange);
      releaseGuardInstalled = true;
      context?.scope?.addCleanup?.(removeReleaseGuard);
    }

    function validateGeometry() {
      const ids = [];
      circuitData.main.components.forEach((item) => ids.push(item.componentId, item.deviceId));
      Object.values(circuitData.schemes).forEach((scheme) => scheme.devices.forEach((item) => ids.push(item.componentId, item.deviceId)));
      const namespaceErrors = ids.filter((item) => !item.startsWith(`${MODULE_ID}__`));
      const wireIds = [...circuitData.main.wireIds, ...Object.values(circuitData.schemes).flatMap((scheme) => scheme.wireIds)];
      const duplicates = wireIds.filter((item, index) => wireIds.indexOf(item) !== index);
      return { valid: namespaceErrors.length === 0 && duplicates.length === 0, namespaceErrors, duplicateWireIds: duplicates, geometryLockId: "ch02_mixed_jog_continuous_geometry_v1_locked" };
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
      mount: () => { mounted = true; paused = false; installReleaseGuard(); return getStateSnapshot(); },
      render,
      reset: () => { state = solver.createInitialState(); recompute(); render(); return getStateSnapshot(); },
      pause: () => { paused = true; },
      resume: () => { paused = false; render(); },
      unmount: () => { removeReleaseGuard(); mounted = false; paused = false; view?.unmount(); },
      validateGeometry,
      runTests
    });
  }

  platform.moduleFacades.createMixedJogContinuousFacade = createFacade;
})(globalThis);
