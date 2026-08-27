(function installMachineToolCircuitsSolver(global) {
  "use strict";

  const platform = global.ECTPPlatform = global.ECTPPlatform || {};
  platform.moduleSolvers = platform.moduleSolvers || {};
  const MODULE_ID = "ch02_machine_tool_circuits";
  const wire = (localId) => `${MODULE_ID}__wire__${localId}`;
  const edge = (localId) => `${MODULE_ID}__edge__${localId}`;

  function clone(value) { return JSON.parse(JSON.stringify(value)); }

  function createInitialState(overrides = {}) {
    const base = {
      schemaVersion: "1.0",
      operationState: {
        power: "open",
        variant: "ca6140",
        primaryProtection: "normal",
        secondaryProtection: "normal",
        caCommand: "stopped",
        caSq1: "released",
        caSq2: "released",
        caTimer: "idle",
        zSpindle: "stopped",
        zRocker: "stopped",
        zClamp: "stopped",
        zSq1Upper: "released",
        zSq1Lower: "released",
        zSq2: "released",
        zSq3: "released",
        zTimer: "idle"
      },
      stableDeviceState: {
        km1: false, km2: false, km3: false, km4: false, km5: false,
        kt: false, yv: false
      },
      lastAction: { type: "RESET_MODULE", message: "模块已复位" }
    };
    return {
      ...base,
      operationState: { ...base.operationState, ...(overrides.operationState || {}) },
      stableDeviceState: { ...base.stableDeviceState, ...(overrides.stableDeviceState || {}) },
      lastAction: overrides.lastAction || base.lastAction
    };
  }

  function solveCa(state) {
    const op = state.operationState;
    const powered = op.power === "closed";
    const healthy = op.primaryProtection === "normal";
    const forwardAllowed = op.caSq2 !== "triggered";
    const reverseAllowed = op.caSq1 !== "triggered";
    const forward = powered && healthy && op.caCommand === "forward" && forwardAllowed;
    const reverse = powered && healthy && op.caCommand === "reverse" && reverseAllowed;
    const timing = powered && op.caTimer === "timing";
    const activeControl = [];
    const activeMain = [];
    const partial = [];
    if (powered) {
      partial.push(wire("ca_forward_rung"), wire("ca_reverse_rung"), wire("ca_timer_rung"));
      if (forward) activeControl.push(wire("ca_forward_rung"), wire("ca_forward_return"));
      if (reverse) activeControl.push(wire("ca_reverse_rung"), wire("ca_reverse_return"));
      if (timing) activeControl.push(wire("ca_timer_rung"), wire("ca_timer_return"));
    }
    if (forward || reverse) activeMain.push(wire("ca_main_l1"), wire("ca_main_l2"), wire("ca_main_l3"));
    return {
      stable: { km1: forward, km2: reverse, km3: false, km4: false, km5: false, kt: timing, yv: false },
      activeControl, activeMain, partial,
      motorStates: { M: { running: forward || reverse, direction: forward ? "forward" : reverse ? "reverse" : "none" } },
      protectionStates: {
        FR: { state: op.primaryProtection, tripped: !healthy },
        SQ1: { state: op.caSq1, triggered: op.caSq1 === "triggered" },
        SQ2: { state: op.caSq2, triggered: op.caSq2 === "triggered" }
      },
      extension: { variant: "ca6140", timerState: op.caTimer, forwardAllowed, reverseAllowed }
    };
  }

  function solveZ(state) {
    const op = state.operationState;
    const powered = op.power === "closed";
    const spindleHealthy = op.primaryProtection === "normal";
    const hydraulicHealthy = op.secondaryProtection === "normal";
    const spindle = powered && spindleHealthy && op.zSpindle === "running";
    const timerTiming = powered && hydraulicHealthy && op.zTimer === "timing";
    const timerComplete = powered && hydraulicHealthy && op.zTimer === "completed";
    const loosened = op.zSq2 === "triggered";
    const up = timerComplete && loosened && op.zRocker === "up" && op.zSq1Upper !== "triggered";
    const down = timerComplete && loosened && op.zRocker === "down" && op.zSq1Lower !== "triggered";
    const loosen = powered && hydraulicHealthy && op.zClamp === "loosen" && !loosened;
    const clamp = powered && hydraulicHealthy && op.zClamp === "clamp" && op.zSq3 !== "triggered";
    const hydraulicPump = timerTiming || timerComplete || loosen || clamp;
    const yv = loosen || up || down;
    const activeControl = [];
    const activeMain = [];
    const partial = [];
    if (powered) {
      ["z_spindle_rung", "z_timer_rung", "z_up_rung", "z_down_rung", "z_loosen_rung", "z_clamp_rung", "z_yv_rung"]
        .forEach((id) => partial.push(wire(id)));
      if (spindle) activeControl.push(wire("z_spindle_rung"), wire("z_spindle_return"));
      if (timerTiming || timerComplete) activeControl.push(wire("z_timer_rung"), wire("z_timer_return"));
      if (up) activeControl.push(wire("z_up_rung"), wire("z_up_return"));
      if (down) activeControl.push(wire("z_down_rung"), wire("z_down_return"));
      if (loosen || hydraulicPump) activeControl.push(wire("z_loosen_rung"), wire("z_loosen_return"));
      if (clamp) activeControl.push(wire("z_clamp_rung"), wire("z_clamp_return"));
      if (yv) activeControl.push(wire("z_yv_rung"), wire("z_yv_return"));
    }
    if (spindle) activeMain.push("z3040__main__spindle");
    if (up || down) activeMain.push("z3040__main__rocker");
    if (hydraulicPump) activeMain.push("z3040__main__hydraulic");
    return {
      stable: { km1: spindle, km2: up, km3: down, km4: hydraulicPump && !clamp, km5: clamp, kt: timerTiming || timerComplete, yv },
      activeControl, activeMain, partial,
      motorStates: {
        M1: { running: spindle, direction: spindle ? "forward" : "none" },
        M2: { running: up || down, direction: up ? "up" : down ? "down" : "none" },
        M3: { running: hydraulicPump, direction: hydraulicPump ? "forward" : "none" }
      },
      protectionStates: {
        FR1: { state: op.primaryProtection, tripped: !spindleHealthy },
        FR2: { state: op.secondaryProtection, tripped: !hydraulicHealthy },
        SQ1_UP: { state: op.zSq1Upper, triggered: op.zSq1Upper === "triggered" },
        SQ1_DOWN: { state: op.zSq1Lower, triggered: op.zSq1Lower === "triggered" },
        SQ2: { state: op.zSq2, triggered: op.zSq2 === "triggered" },
        SQ3: { state: op.zSq3, triggered: op.zSq3 === "triggered" }
      },
      extension: { variant: "z3040", timerState: op.zTimer, rocker: op.zRocker, clamp: op.zClamp, loosened }
    };
  }

  function solve(state) {
    const resolved = state.operationState.variant === "z3040" ? solveZ(state) : solveCa(state);
    const nextState = clone(state);
    nextState.stableDeviceState = clone(resolved.stable);
    const stable = resolved.stable;
    return {
      state: nextState,
      solverResult: {
        schemaVersion: "1.0",
        moduleId: MODULE_ID,
        stableDeviceStates: { KM1: stable.km1, KM2: stable.km2, KM3: stable.km3, KM4: stable.km4, KM5: stable.km5, KT: stable.kt, YV: stable.yv },
        edgeStates: {
          [edge("ca_km1_main")]: stable.km1,
          [edge("ca_km2_main")]: stable.km2,
          [edge("ca_fr_nc")]: state.operationState.primaryProtection === "normal",
          [edge("ca_sq1_nc")]: state.operationState.caSq1 !== "triggered",
          [edge("ca_sq2_nc")]: state.operationState.caSq2 !== "triggered",
          [edge("ca_kt_no")]: state.operationState.caTimer === "completed",
          [edge("z_km1_main")]: stable.km1,
          [edge("z_sq1_upper")]: state.operationState.zSq1Upper !== "triggered",
          [edge("z_sq1_lower")]: state.operationState.zSq1Lower !== "triggered",
          [edge("z_sq2_nc")]: state.operationState.zSq2 !== "triggered",
          [edge("z_sq3_nc")]: state.operationState.zSq3 !== "triggered",
          [edge("z_kt_no")]: state.operationState.zTimer === "completed"
        },
        activeMainWireIds: resolved.activeMain,
        activeControlWireIds: resolved.activeControl,
        partialWireIds: resolved.partial,
        motorStates: resolved.motorStates,
        protectionStates: resolved.protectionStates,
        converged: true,
        iterationCount: 1,
        lastAction: clone(state.lastAction),
        extension: resolved.extension
      }
    };
  }

  function runTests() {
    const cases = [];
    const check = (name, condition) => cases.push({ name, passed: Boolean(condition) });
    const result = (operationState) => solve(createInitialState({ operationState })).solverResult;
    check("CA6140断电时不能启动", !result({ caCommand: "forward" }).motorStates.M.running);
    check("CA6140正向启动时KM1吸合", result({ power: "closed", caCommand: "forward" }).stableDeviceStates.KM1);
    check("CA6140反向启动时KM2吸合", result({ power: "closed", caCommand: "reverse" }).stableDeviceStates.KM2);
    check("CA6140正反接触器不可同时吸合", (() => { const r = result({ power: "closed", caCommand: "forward" }); return !(r.stableDeviceStates.KM1 && r.stableDeviceStates.KM2); })());
    check("CA6140 SQ2限制正向", !result({ power: "closed", caCommand: "forward", caSq2: "triggered" }).motorStates.M.running);
    check("CA6140 SQ1限制反向", !result({ power: "closed", caCommand: "reverse", caSq1: "triggered" }).motorStates.M.running);
    check("CA6140 FR过载切断电机", !result({ power: "closed", caCommand: "forward", primaryProtection: "overload" }).motorStates.M.running);
    check("Z3040主轴启动KM1吸合", result({ variant: "z3040", power: "closed", zSpindle: "running" }).stableDeviceStates.KM1);
    check("Z3040延时未完成摇臂不动作", !result({ variant: "z3040", power: "closed", zRocker: "up", zTimer: "timing" }).motorStates.M2.running);
    check("Z3040延时完成且SQ2到位后摇臂上升", result({ variant: "z3040", power: "closed", zRocker: "up", zTimer: "completed", zSq2: "triggered" }).motorStates.M2.direction === "up");
    check("Z3040上下接触器不可同时吸合", (() => { const r = result({ variant: "z3040", power: "closed", zRocker: "down", zTimer: "completed", zSq2: "triggered" }); return !(r.stableDeviceStates.KM2 && r.stableDeviceStates.KM3); })());
    check("Z3040 SQ1上限位停止上升", !result({ variant: "z3040", power: "closed", zRocker: "up", zTimer: "completed", zSq2: "triggered", zSq1Upper: "triggered" }).motorStates.M2.running);
    check("Z3040 SQ3夹紧到位停止夹紧", !result({ variant: "z3040", power: "closed", zClamp: "clamp", zSq3: "triggered" }).stableDeviceStates.KM5);
    check("Z3040 FR2过载切断液压回路", !result({ variant: "z3040", power: "closed", zClamp: "loosen", secondaryProtection: "overload" }).motorStates.M3.running);
    return { passed: cases.every((item) => item.passed), cases };
  }

  platform.moduleSolvers.ch02MachineToolCircuits = Object.freeze({ createInitialState, solve, runTests });
})(globalThis);
