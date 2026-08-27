(function installMultiPointSolver(global) {
  "use strict";

  const platform = global.ECTPPlatform = global.ECTPPlatform || {};
  platform.moduleSolvers = platform.moduleSolvers || {};
  const MODULE_ID = "ch02_multi_point";
  const wire = (localId) => `${MODULE_ID}__wire__${localId}`;

  function clone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function createInitialState(overrides = {}) {
    return {
      schemaVersion: "1.0",
      operationState: {
        power: "open",
        start1: "released",
        stop1: "released",
        start2: "released",
        stop2: "released",
        protection: "normal",
        ...(overrides.operationState || {})
      },
      stableDeviceState: { km1: false, ...(overrides.stableDeviceState || {}) },
      lastAction: overrides.lastAction || { type: "RESET_MODULE", message: "模块已复位" }
    };
  }

  function solve(state) {
    const operation = clone(state.operationState);
    const supply = operation.power === "closed" && operation.protection === "normal";
    const stopPathClosed = operation.stop1 !== "pressed" && operation.stop2 !== "pressed";
    const startPathClosed = operation.start1 === "pressed" || operation.start2 === "pressed";
    let km1 = Boolean(state.stableDeviceState.km1);
    let iterationCount = 0;
    let converged = false;
    while (iterationCount < 8 && !converged) {
      iterationCount += 1;
      const before = km1;
      km1 = supply && stopPathClosed && (startPathClosed || km1);
      converged = km1 === before;
    }

    const motorRunning = km1 && supply;
    const activeControlWireIds = [];
    const activeMainWireIds = [];
    const partialWireIds = [];
    if (operation.power === "closed") {
      ["main_l1", "main_l2", "main_l3", "control_supply"].forEach((id) => partialWireIds.push(wire(id)));
    }
    if (supply) {
      activeControlWireIds.push(wire("control_supply"));
      if (operation.stop1 !== "pressed") activeControlWireIds.push(wire("stop_1"));
      if (stopPathClosed) activeControlWireIds.push(wire("stop_2"));
    }
    if (operation.start1 === "pressed") activeControlWireIds.push(wire("start_1"));
    if (operation.start2 === "pressed") activeControlWireIds.push(wire("start_2"));
    if (km1) {
      activeControlWireIds.push(wire("self_hold"), wire("coil"), wire("return"), wire("indicator_supply"), wire("indicator_hl1"), wire("indicator_hl2"), wire("indicator_return"));
    }
    if (motorRunning) {
      ["main_l1", "main_l2", "main_l3", "main_l1_load", "main_l2_load", "main_l3_load"].forEach((id) => activeMainWireIds.push(wire(id)));
    }

    const nextState = { ...clone(state), stableDeviceState: { km1 }, lastAction: clone(state.lastAction) };
    return {
      state: nextState,
      solverResult: {
        schemaVersion: "1.0",
        moduleId: MODULE_ID,
        stableDeviceStates: { KM1: km1 },
        edgeStates: {
          [`${MODULE_ID}__edge__stop_1_nc`]: operation.stop1 !== "pressed",
          [`${MODULE_ID}__edge__stop_2_nc`]: operation.stop2 !== "pressed",
          [`${MODULE_ID}__edge__start_1_no`]: operation.start1 === "pressed",
          [`${MODULE_ID}__edge__start_2_no`]: operation.start2 === "pressed",
          [`${MODULE_ID}__edge__km1_aux_no`]: km1,
          [`${MODULE_ID}__edge__km1_main`]: km1,
          [`${MODULE_ID}__edge__fr1_nc`]: operation.protection === "normal"
        },
        activeMainWireIds,
        activeControlWireIds,
        partialWireIds,
        motorStates: { M: { running: motorRunning, direction: motorRunning ? "forward" : "none" } },
        protectionStates: { FR1: { state: operation.protection, tripped: operation.protection === "overload" } },
        converged,
        iterationCount,
        lastAction: clone(state.lastAction),
        extension: {
          stopRelation: "series",
          startRelation: "parallel",
          indicators: {
            maturity: "prototype",
            HL1: { on: motorRunning, meaning: "运行指示" },
            HL2: { on: motorRunning, meaning: "远端同步指示" }
          }
        }
      }
    };
  }

  function runTests() {
    const cases = [];
    const check = (name, condition) => cases.push({ name, passed: Boolean(condition) });
    const result = (operationState, stableDeviceState = {}) => solve(createInitialState({ operationState, stableDeviceState })).solverResult;
    check("断电时启动无效", !result({ start1: "pressed" }).motorStates.M.running);
    check("地点1可启动", result({ power: "closed", start1: "pressed" }).motorStates.M.running);
    check("地点2可启动", result({ power: "closed", start2: "pressed" }).motorStates.M.running);
    check("KM1辅助触点可自锁", result({ power: "closed" }, { km1: true }).motorStates.M.running);
    check("地点1停止切断串联通路", !result({ power: "closed", stop1: "pressed" }, { km1: true }).motorStates.M.running);
    check("地点2停止切断串联通路", !result({ power: "closed", stop2: "pressed" }, { km1: true }).motorStates.M.running);
    check("任一停止优先于两个启动", !result({ power: "closed", stop1: "pressed", start1: "pressed", start2: "pressed" }, { km1: true }).motorStates.M.running);
    check("FR1过载切断运行", !result({ power: "closed", protection: "overload" }, { km1: true }).motorStates.M.running);
    check("FR1复位后不会自行重启", !result({ power: "closed", protection: "normal" }).motorStates.M.running);
    check("QF1分闸释放KM1", !result({ power: "open" }, { km1: true }).motorStates.M.running);
    const running = result({ power: "closed" }, { km1: true });
    check("HL1与HL2只表现Solver运行结果", running.extension.indicators.HL1.on && running.extension.indicators.HL2.on);
    return { passed: cases.every((item) => item.passed), cases };
  }

  platform.moduleSolvers.ch02MultiPoint = Object.freeze({ createInitialState, solve, runTests });
})(globalThis);
