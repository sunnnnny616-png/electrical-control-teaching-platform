(function installMachineToolCircuitData(global) {
  "use strict";

  const platform = global.ECTPPlatform = global.ECTPPlatform || {};
  platform.moduleCircuitData = platform.moduleCircuitData || {};
  const ns = "ch02_machine_tool_circuits";
  const id = (kind, localId) => `${ns}__${kind}__${localId}`;

  function component(localId, deviceId, type, partType, label, x, y, width, height, variant) {
    return Object.freeze({
      componentId: id("cmp", localId), deviceId: id("dev", deviceId), type, partType,
      label, geometry: Object.freeze({ x, y, width, height, orientation: 0 }), variant
    });
  }

  function wire(localId, variant, circuitDomain, points, from, to) {
    return Object.freeze({
      wireId: id("wire", localId), variant, circuitDomain,
      fromPort: id("port", from), toPort: id("port", to),
      routePoints: Object.freeze(points.map(([x, y]) => Object.freeze({ x, y })))
    });
  }

  const components = Object.freeze([
    component("ca_qf", "ca_qf", "breaker", "three_pole", "QF", 58, 75, 220, 48, "ca6140"),
    component("ca_fu1", "ca_fu1", "fuse", "three_phase", "FU1", 58, 132, 220, 38, "ca6140"),
    component("ca_km1_main", "ca_km1", "contactor", "main_contact", "KM1", 58, 246, 220, 48, "ca6140"),
    component("ca_km2_main", "ca_km2", "contactor", "main_contact", "KM2", 58, 308, 220, 48, "ca6140"),
    component("ca_fr", "ca_fr", "thermal_relay", "thermal_element", "FR", 58, 398, 220, 44, "ca6140"),
    component("ca_m", "ca_m", "motor", "three_phase", "M", 115, 475, 110, 110, "ca6140"),
    component("ca_km1_coil", "ca_km1", "contactor", "coil", "KM1", 820, 155, 60, 42, "ca6140"),
    component("ca_km2_coil", "ca_km2", "contactor", "coil", "KM2", 820, 395, 60, 42, "ca6140"),
    component("ca_kt_coil", "ca_kt", "timer_relay", "coil", "KT", 820, 275, 60, 42, "ca6140"),
    component("z_km1_coil", "z_km1", "contactor", "coil", "KM1", 820, 105, 60, 42, "z3040"),
    component("z_kt_coil", "z_kt", "timer_relay", "coil", "KT", 820, 220, 60, 42, "z3040"),
    component("z_km2_coil", "z_km2", "contactor", "coil", "KM2", 820, 285, 60, 42, "z3040"),
    component("z_km3_coil", "z_km3", "contactor", "coil", "KM3", 820, 350, 60, 42, "z3040"),
    component("z_km4_coil", "z_km4", "contactor", "coil", "KM4", 820, 435, 60, 42, "z3040"),
    component("z_km5_coil", "z_km5", "contactor", "coil", "KM5", 820, 505, 60, 42, "z3040"),
    component("z_yv", "z_yv", "solenoid", "coil", "YV", 660, 555, 60, 38, "z3040")
  ]);

  const wires = Object.freeze([
    wire("ca_main_l1", "ca6140", "main", [[90, 84], [90, 500]], "ca_l1", "ca_m_u"),
    wire("ca_main_l2", "ca6140", "main", [[168, 84], [168, 500]], "ca_l2", "ca_m_v"),
    wire("ca_main_l3", "ca6140", "main", [[246, 84], [246, 500]], "ca_l3", "ca_m_w"),
    wire("ca_forward_rung", "ca6140", "control", [[350, 176], [820, 176]], "ca_l", "ca_km1_a1"),
    wire("ca_forward_return", "ca6140", "control", [[880, 176], [990, 176]], "ca_km1_a2", "ca_n"),
    wire("ca_timer_rung", "ca6140", "control", [[350, 296], [820, 296]], "ca_l", "ca_kt_a1"),
    wire("ca_timer_return", "ca6140", "control", [[880, 296], [990, 296]], "ca_kt_a2", "ca_n"),
    wire("ca_reverse_rung", "ca6140", "control", [[350, 416], [820, 416]], "ca_l", "ca_km2_a1"),
    wire("ca_reverse_return", "ca6140", "control", [[880, 416], [990, 416]], "ca_km2_a2", "ca_n"),
    wire("z_spindle_rung", "z3040", "control", [[60, 126], [820, 126]], "z_l", "z_km1_a1"),
    wire("z_spindle_return", "z3040", "control", [[880, 126], [990, 126]], "z_km1_a2", "z_n"),
    wire("z_timer_rung", "z3040", "control", [[60, 241], [820, 241]], "z_l", "z_kt_a1"),
    wire("z_timer_return", "z3040", "control", [[880, 241], [990, 241]], "z_kt_a2", "z_n"),
    wire("z_up_rung", "z3040", "control", [[60, 306], [820, 306]], "z_l", "z_km2_a1"),
    wire("z_up_return", "z3040", "control", [[880, 306], [990, 306]], "z_km2_a2", "z_n"),
    wire("z_down_rung", "z3040", "control", [[60, 371], [820, 371]], "z_l", "z_km3_a1"),
    wire("z_down_return", "z3040", "control", [[880, 371], [990, 371]], "z_km3_a2", "z_n"),
    wire("z_loosen_rung", "z3040", "control", [[60, 456], [820, 456]], "z_l", "z_km4_a1"),
    wire("z_loosen_return", "z3040", "control", [[880, 456], [990, 456]], "z_km4_a2", "z_n"),
    wire("z_clamp_rung", "z3040", "control", [[60, 526], [820, 526]], "z_l", "z_km5_a1"),
    wire("z_clamp_return", "z3040", "control", [[880, 526], [990, 526]], "z_km5_a2", "z_n"),
    wire("z_yv_rung", "z3040", "control", [[60, 574], [660, 574]], "z_l", "z_yv_a1"),
    wire("z_yv_return", "z3040", "control", [[720, 574], [990, 574]], "z_yv_a2", "z_n")
  ]);

  const ports = Object.freeze([...new Set(wires.flatMap((item) => [item.fromPort, item.toPort]))]
    .map((portId) => Object.freeze({ portId, kind: "electrical", required: true })));

  const deviceEdges = Object.freeze([
    ["ca_km1_main", "ca_km1", "main", "contact", "NO"],
    ["ca_km2_main", "ca_km2", "main", "contact", "NO"],
    ["ca_fr_nc", "ca_fr", "control", "protection", "NC"],
    ["ca_sq1_nc", "ca_sq1", "control", "contact", "NC"],
    ["ca_sq2_nc", "ca_sq2", "control", "contact", "NC"],
    ["ca_kt_no", "ca_kt", "control", "contact", "TIMED_NO"],
    ["z_km1_main", "z_km1", "main", "contact", "NO"],
    ["z_sq1_upper", "z_sq1", "control", "contact", "NC"],
    ["z_sq1_lower", "z_sq1", "control", "contact", "NC"],
    ["z_sq2_nc", "z_sq2", "control", "contact", "NC"],
    ["z_sq3_nc", "z_sq3", "control", "contact", "NC"],
    ["z_kt_no", "z_kt", "control", "contact", "TIMED_NO"]
  ].map(([localId, device, circuitDomain, electricalRole, behavior]) => Object.freeze({
    edgeId: id("edge", localId), deviceId: id("dev", device), circuitDomain, electricalRole, behavior
  })));

  platform.moduleCircuitData.ch02MachineToolCircuits = Object.freeze({
    schemaVersion: "1.0",
    moduleId: ns,
    namespace: ns,
    geometryLockId: "ch02_machine_tool_circuits_geometry_v1_locked",
    sourceImages: Object.freeze(["原图27 · 第二章第90页", "原图28 · 第二章第104页"]),
    variants: Object.freeze({
      ca6140: Object.freeze({ title: "CA6140卧式车床电气控制线路", shortTitle: "CA6140车床", source: "第二章第90页" }),
      z3040: Object.freeze({ title: "Z3040摇臂钻床电气控制线路", shortTitle: "Z3040钻床", source: "第二章第104页" })
    }),
    components, ports, wires, deviceEdges,
    junctions: Object.freeze([
      { junctionId: id("junction", "ca_stop_branch"), circuitDomain: "control" },
      { junctionId: id("junction", "z_lift_branch"), circuitDomain: "control" },
      { junctionId: id("junction", "z_hydraulic_branch"), circuitDomain: "control" }
    ])
  });
})(globalThis);
