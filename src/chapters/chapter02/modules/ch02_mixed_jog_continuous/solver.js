(function installMixedJogContinuousSolver(global) {
  "use strict";

  const platform = global.ECTPPlatform = global.ECTPPlatform || {};
  platform.moduleSolvers = platform.moduleSolvers || {};
  const MODULE_ID = "ch02_mixed_jog_continuous";
  const wire = (localId) => `${MODULE_ID}__wire__${localId}`;

  function clone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function createInitialState(overrides = {}) {
    return {
      schemaVersion: "1.0",
      operationState: {
        power: "open",
        variant: "scheme1",
        mode: "jog",
        start: "released",
        jog: "released",
        stop: "released",
        protection: "normal",
        ...(overrides.operationState || {})
      },
      stableDeviceState: {
        km1: false,
        k: false,
        ...(overrides.stableDeviceState || {})
      },
      lastAction: overrides.lastAction || { type: "RESET_MODULE", message: "模块已复位" }
    };
  }

  function evaluateStable(operation, previousStable, options = {}) {
    const supply = operation.power === "closed" && operation.protection === "normal" && operation.stop !== "pressed";
    const startPressed = operation.start === "pressed";
    const jogPressed = operation.jog === "pressed";
    const forceJogNcOpen = Boolean(options.forceJogNcOpen);
    let km1 = Boolean(previousStable.km1);
    let relayK = Boolean(previousStable.k);
    let iterationCount = 0;
    let converged = false;

    while (iterationCount < 8 && !converged) {
      iterationCount += 1;
      const beforeKm1 = km1;
      const beforeK = relayK;
      if (operation.variant === "scheme1") {
        const selfHoldEnabled = operation.mode === "continuous";
        km1 = supply && (startPressed || jogPressed || (selfHoldEnabled && km1));
        relayK = false;
      } else if (operation.variant === "scheme2") {
        const sb3NcClosed = !jogPressed && !forceJogNcOpen;
        km1 = supply && (startPressed || jogPressed || (sb3NcClosed && km1));
        relayK = false;
      } else {
        const sb3NcClosed = !jogPressed && !forceJogNcOpen;
        relayK = supply && sb3NcClosed && (startPressed || relayK);
        km1 = supply && (relayK || jogPressed);
      }
      converged = km1 === beforeKm1 && relayK === beforeK;
    }

    return { km1, k: relayK, supply, converged, iterationCount };
  }

  function buildWireResult(operation, stable) {
    const activeControlWireIds = [];
    const partialWireIds = [];
    const activeMainWireIds = [];
    const powered = operation.power === "closed";
    const healthy = operation.protection === "normal";
    const prefix = operation.variant === "scheme1" ? "s1" : operation.variant === "scheme2" ? "s2" : "s3";

    if (powered) {
      partialWireIds.push(wire(`${prefix}_supply`));
      if (healthy) partialWireIds.push(wire(`${prefix}_return`));
      ["main_l1", "main_l2", "main_l3"].forEach((id) => partialWireIds.push(wire(id)));
    }
    if (stable.supply) {
      activeControlWireIds.push(wire(`${prefix}_supply`), wire(`${prefix}_return`));
    }
    if (operation.variant === "scheme1") {
      if (operation.start === "pressed" || operation.jog === "pressed") activeControlWireIds.push(wire("s1_start"));
      if (operation.mode === "continuous") activeControlWireIds.push(wire("s1_sa"));
      if (stable.km1 && operation.mode === "continuous") activeControlWireIds.push(wire("s1_hold"));
      if (stable.km1) activeControlWireIds.push(wire("s1_stop"), wire("s1_coil"));
    } else if (operation.variant === "scheme2") {
      if (operation.start === "pressed") activeControlWireIds.push(wire("s2_long_start"));
      if (operation.jog === "pressed") activeControlWireIds.push(wire("s2_jog"));
      if (stable.km1 && operation.jog !== "pressed") activeControlWireIds.push(wire("s2_jog_nc"), wire("s2_hold"));
      if (stable.km1) activeControlWireIds.push(wire("s2_stop"), wire("s2_coil"));
    } else {
      if (operation.start === "pressed") activeControlWireIds.push(wire("s3_long_start"));
      if (stable.k) activeControlWireIds.push(wire("s3_jog_nc"), wire("s3_k_hold"), wire("s3_k_coil"), wire("s3_k_drive"));
      if (operation.jog === "pressed") activeControlWireIds.push(wire("s3_jog"));
      if (stable.km1) activeControlWireIds.push(wire("s3_km_coil"));
    }
    if (stable.km1 && powered && healthy) {
      ["main_l1", "main_l2", "main_l3", "main_l1_load", "main_l2_load", "main_l3_load"].forEach((id) => activeMainWireIds.push(wire(id)));
    }
    return { activeControlWireIds, partialWireIds, activeMainWireIds };
  }

  function solve(state, options = {}) {
    const operation = clone(state.operationState);
    const stable = evaluateStable(operation, state.stableDeviceState, options);
    const wires = buildWireResult(operation, stable);
    const motorRunning = stable.km1 && stable.supply;
    return {
      state: {
        ...clone(state),
        stableDeviceState: { km1: stable.km1, k: stable.k },
        lastAction: clone(state.lastAction)
      },
      solverResult: {
        schemaVersion: "1.0",
        moduleId: MODULE_ID,
        stableDeviceStates: { KM1: stable.km1, K: stable.k },
        edgeStates: {
          [`${MODULE_ID}__edge__km1_main`]: stable.km1,
          [`${MODULE_ID}__edge__km1_aux_no`]: stable.km1,
          [`${MODULE_ID}__edge__fr1_nc`]: operation.protection === "normal",
          [`${MODULE_ID}__edge__k_aux_no`]: stable.k
        },
        activeMainWireIds: wires.activeMainWireIds,
        activeControlWireIds: wires.activeControlWireIds,
        partialWireIds: wires.partialWireIds,
        motorStates: { M: { running: motorRunning, direction: motorRunning ? "forward" : "none" } },
        protectionStates: { FR1: { state: operation.protection, tripped: operation.protection === "overload" } },
        converged: stable.converged,
        iterationCount: stable.iterationCount,
        lastAction: clone(state.lastAction),
        extension: {
          variant: operation.variant,
          mode: operation.mode,
          relayK: stable.k,
          teachingLabels: { KM1: "KM1", K: "K", M: "M" }
        }
      }
    };
  }

  function runTests() {
    const cases = [];
    function check(name, condition) {
      cases.push({ name, passed: Boolean(condition) });
    }
    function solved(overrides, stable = {}) {
      return solve(createInitialState({ operationState: overrides, stableDeviceState: stable })).solverResult;
    }

    check("断电时任何启动均无效", !solved({ start: "pressed" }).motorStates.M.running);
    check("方式一点动按下运行", solved({ power: "closed", variant: "scheme1", mode: "jog", jog: "pressed" }).motorStates.M.running);
    check("方式一点动释放必停", !solved({ power: "closed", variant: "scheme1", mode: "jog", jog: "released" }, { km1: true }).motorStates.M.running);
    check("方式一长动启动吸合", solved({ power: "closed", variant: "scheme1", mode: "continuous", start: "pressed" }).motorStates.M.running);
    check("方式一长动自锁", solved({ power: "closed", variant: "scheme1", mode: "continuous" }, { km1: true }).stableDeviceStates.KM1);
    check("方式二SB3点动", solved({ power: "closed", variant: "scheme2", jog: "pressed" }).motorStates.M.running);
    check("方式二长动保持", solved({ power: "closed", variant: "scheme2" }, { km1: true }).motorStates.M.running);
    check("方式二释放断开后不自锁", !solve(createInitialState({ operationState: { power: "closed", variant: "scheme2" }, stableDeviceState: { km1: true } }), { forceJogNcOpen: true }).solverResult.motorStates.M.running);
    check("方式三长动使K与KM1同时吸合", (() => {
      const result = solved({ power: "closed", variant: "scheme3", start: "pressed" });
      return result.stableDeviceStates.K && result.stableDeviceStates.KM1;
    })());
    check("方式三K可保持KM1", solved({ power: "closed", variant: "scheme3" }, { k: true, km1: true }).stableDeviceStates.KM1);
    check("方式三点动不吸合K", !solved({ power: "closed", variant: "scheme3", jog: "pressed" }).stableDeviceStates.K);
    check("方式三点动释放必停", !solve(createInitialState({ operationState: { power: "closed", variant: "scheme3" }, stableDeviceState: { km1: true, k: false } }), { forceJogNcOpen: true }).solverResult.motorStates.M.running);
    check("停止按钮切断控制回路", !solved({ power: "closed", stop: "pressed" }, { km1: true, k: true }).motorStates.M.running);
    check("FR1过载切断电机", !solved({ power: "closed", protection: "overload", start: "pressed" }).motorStates.M.running);
    check("FR1复位后不会自行重启", !solved({ power: "closed", protection: "normal" }).motorStates.M.running);
    check("QF1分闸强制释放所有线圈", !solved({ power: "open", variant: "scheme3" }, { km1: true, k: true }).motorStates.M.running);
    return { passed: cases.every((item) => item.passed), cases };
  }

  platform.moduleSolvers.ch02MixedJogContinuous = Object.freeze({ createInitialState, solve, runTests });
})(globalThis);
