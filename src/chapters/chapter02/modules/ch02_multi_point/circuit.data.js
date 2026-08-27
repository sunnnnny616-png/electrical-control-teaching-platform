(function installMultiPointCircuitData(global) {
  "use strict";

  const platform = global.ECTPPlatform = global.ECTPPlatform || {};
  platform.moduleCircuitData = platform.moduleCircuitData || {};
  const ns = "ch02_multi_point";
  const id = (kind, localId) => `${ns}__${kind}__${localId}`;

  const components = Object.freeze([
    { componentId: id("cmp", "qf1"), deviceId: id("dev", "qf1"), type: "breaker", partType: "three_pole", label: "QF1", circuitDomain: "main" },
    { componentId: id("cmp", "fu1"), deviceId: id("dev", "fu1"), type: "fuse", partType: "three_phase", label: "FU1", circuitDomain: "main" },
    { componentId: id("cmp", "km1_main"), deviceId: id("dev", "km1"), type: "contactor", partType: "main_contact", label: "KM1", circuitDomain: "main" },
    { componentId: id("cmp", "fr1_main"), deviceId: id("dev", "fr1"), type: "thermal_relay", partType: "thermal_element", label: "FR1", circuitDomain: "main" },
    { componentId: id("cmp", "m1"), deviceId: id("dev", "m1"), type: "motor", partType: "three_phase", label: "M", circuitDomain: "main" },
    { componentId: id("cmp", "station1_stop"), deviceId: id("dev", "1sb2"), type: "push_button", partType: "nc", label: "1SB2", circuitDomain: "control" },
    { componentId: id("cmp", "station2_stop"), deviceId: id("dev", "2sb2"), type: "push_button", partType: "nc", label: "2SB2", circuitDomain: "control" },
    { componentId: id("cmp", "station1_start"), deviceId: id("dev", "1sb1"), type: "push_button", partType: "no", label: "1SB1", circuitDomain: "control" },
    { componentId: id("cmp", "station2_start"), deviceId: id("dev", "2sb1"), type: "push_button", partType: "no", label: "2SB1", circuitDomain: "control" },
    { componentId: id("cmp", "km1_aux"), deviceId: id("dev", "km1"), type: "contactor", partType: "aux_no", label: "KM1", circuitDomain: "control" },
    { componentId: id("cmp", "km1_coil"), deviceId: id("dev", "km1"), type: "contactor", partType: "coil", label: "KM1", circuitDomain: "control" },
    { componentId: id("cmp", "fr1_nc"), deviceId: id("dev", "fr1"), type: "thermal_relay", partType: "protection_nc", label: "FR1", circuitDomain: "control" },
    { componentId: id("cmp", "hl1"), deviceId: id("dev", "hl1"), type: "indicator", partType: "lamp", label: "HL1", circuitDomain: "control", maturity: "prototype" },
    { componentId: id("cmp", "hl2"), deviceId: id("dev", "hl2"), type: "indicator", partType: "lamp", label: "HL2", circuitDomain: "control", maturity: "prototype" }
  ]);

  const wireIds = Object.freeze([
    "main_l1", "main_l2", "main_l3", "main_l1_load", "main_l2_load", "main_l3_load",
    "control_supply", "stop_1", "stop_2", "start_1", "start_2", "self_hold", "coil", "return",
    "indicator_supply", "indicator_hl1", "indicator_hl2", "indicator_return"
  ].map((localId) => id("wire", localId)));

  function makeWire(localId, circuitDomain, routePoints, fromPort, toPort) {
    return Object.freeze({
      wireId: id("wire", localId),
      circuitDomain,
      fromPort: id("port", fromPort),
      toPort: id("port", toPort),
      routePoints: Object.freeze(routePoints.map(([x, y]) => Object.freeze({ x, y })))
    });
  }

  const wires = Object.freeze([
    makeWire("main_l1", "main", [[86, 82], [86, 260]], "l1_supply", "km1_l1_in"),
    makeWire("main_l2", "main", [[166, 82], [166, 260]], "l2_supply", "km1_l2_in"),
    makeWire("main_l3", "main", [[246, 82], [246, 260]], "l3_supply", "km1_l3_in"),
    makeWire("main_l1_load", "main", [[86, 316], [86, 492]], "km1_l1_out", "m_u"),
    makeWire("main_l2_load", "main", [[166, 316], [166, 492]], "km1_l2_out", "m_v"),
    makeWire("main_l3_load", "main", [[246, 316], [246, 492]], "km1_l3_out", "m_w"),
    makeWire("control_supply", "control", [[382, 184], [422, 184]], "control_l", "stop1_in"),
    makeWire("stop_1", "control", [[472, 184], [502, 184]], "stop1_out", "stop2_in"),
    makeWire("stop_2", "control", [[552, 184], [618, 184]], "stop2_out", "start_branch"),
    makeWire("start_1", "control", [[702, 136], [790, 136], [790, 184]], "start1_out", "start_join"),
    makeWire("start_2", "control", [[702, 224], [790, 224], [790, 184]], "start2_out", "start_join"),
    makeWire("self_hold", "control", [[702, 312], [790, 312], [790, 184]], "km1_aux_out", "start_join"),
    makeWire("coil", "control", [[790, 184], [816, 184]], "start_join", "km1_a1"),
    makeWire("return", "control", [[954, 184], [980, 184]], "fr1_out", "control_n"),
    makeWire("indicator_supply", "control", [[382, 448], [538, 448]], "control_l", "indicator_km1_in"),
    makeWire("indicator_hl1", "control", [[786, 406], [822, 406]], "indicator_branch_1", "hl1_in"),
    makeWire("indicator_hl2", "control", [[786, 512], [822, 512]], "indicator_branch_2", "hl2_in"),
    makeWire("indicator_return", "control", [[930, 448], [980, 448]], "indicator_join", "control_n")
  ]);
  const portIds = [...new Set(wires.flatMap((item) => [item.fromPort, item.toPort]))];
  const ports = Object.freeze(portIds.map((portId) => Object.freeze({ portId, kind: "electrical", required: true })));
  const deviceEdges = Object.freeze([
    { edgeId: id("edge", "stop_1_nc"), deviceId: id("dev", "1sb2"), circuitDomain: "control", electricalRole: "contact", behavior: "NC" },
    { edgeId: id("edge", "stop_2_nc"), deviceId: id("dev", "2sb2"), circuitDomain: "control", electricalRole: "contact", behavior: "NC" },
    { edgeId: id("edge", "start_1_no"), deviceId: id("dev", "1sb1"), circuitDomain: "control", electricalRole: "contact", behavior: "NO" },
    { edgeId: id("edge", "start_2_no"), deviceId: id("dev", "2sb1"), circuitDomain: "control", electricalRole: "contact", behavior: "NO" },
    { edgeId: id("edge", "km1_aux_no"), deviceId: id("dev", "km1"), circuitDomain: "control", electricalRole: "contact", behavior: "NO" },
    { edgeId: id("edge", "km1_main"), deviceId: id("dev", "km1"), circuitDomain: "main", electricalRole: "contact", behavior: "NO" },
    { edgeId: id("edge", "fr1_nc"), deviceId: id("dev", "fr1"), circuitDomain: "control", electricalRole: "protection", behavior: "NC" }
  ].map(Object.freeze));

  platform.moduleCircuitData.ch02MultiPoint = Object.freeze({
    schemaVersion: "1.0",
    moduleId: ns,
    namespace: ns,
    sourceImage: "原图15",
    geometry: Object.freeze({ viewBox: "0 0 1040 620", lockId: "ch02_multi_point_geometry_v1_locked" }),
    components,
    wireIds,
    ports,
    wires,
    deviceEdges,
    junctions: Object.freeze([
      { junctionId: id("junction", "start_branch"), circuitDomain: "control" },
      { junctionId: id("junction", "start_join"), circuitDomain: "control" },
      { junctionId: id("junction", "indicator_branch"), circuitDomain: "control" }
    ]),
    topology: Object.freeze({
      stopRelation: "series",
      startRelation: "parallel",
      selfHoldDevice: id("dev", "km1"),
      protectionContact: id("cmp", "fr1_nc")
    })
  });
})(globalThis);
