(function installCh01JogCircuitData(global) {
  "use strict";

  const platform = global.ECTPPlatform = global.ECTPPlatform || {};
  platform.chapterCircuitData = platform.chapterCircuitData || {};
  const moduleId = "ch01_jog";
  const ns = (kind, id) => `${moduleId}__${kind}__${id}`;
  const port = (id, x, y) => Object.freeze({ portId: ns("port", id), x, y });
  const wire = (id, domain, from, to, routePoints, group) => Object.freeze({
    wireId: ns("wire", id), circuitDomain: domain, fromPort: ns("port", from),
    toPort: ns("port", to), routePoints: Object.freeze(routePoints), group
  });
  const component = (id, device, type, partType, label, circuitDomain, geometry) => Object.freeze({
    componentId: ns("cmp", id), deviceId: ns("dev", device), type, partType, label,
    circuitDomain, geometry: Object.freeze({ ...geometry, orientation: 0 })
  });
  const edge = (id, device, from, to, behavior, circuitDomain, electricalRole) => Object.freeze({
    edgeId: ns("edge", id), deviceId: ns("dev", device), fromPort: ns("port", from),
    toPort: ns("port", to), behavior, circuitDomain, electricalRole
  });

  const ports = Object.freeze([
    port("l1", 120, 58), port("l2", 210, 58), port("l3", 300, 58),
    port("qf_l1_in", 120, 100), port("qf_l1_out", 120, 145),
    port("qf_l2_in", 210, 100), port("qf_l2_out", 210, 145),
    port("qf_l3_in", 300, 100), port("qf_l3_out", 300, 145),
    port("fu_l1_in", 120, 170), port("fu_l1_out", 120, 215),
    port("fu_l2_in", 210, 170), port("fu_l2_out", 210, 215),
    port("fu_l3_in", 300, 170), port("fu_l3_out", 300, 215),
    port("km_l1_in", 120, 260), port("km_l1_out", 120, 315),
    port("km_l2_in", 210, 260), port("km_l2_out", 210, 315),
    port("km_l3_in", 300, 260), port("km_l3_out", 300, 315),
    port("fr_l1_in", 120, 350), port("fr_l1_out", 120, 405),
    port("fr_l2_in", 210, 350), port("fr_l2_out", 210, 405),
    port("fr_l3_in", 300, 350), port("fr_l3_out", 300, 405),
    port("m_u", 180, 470), port("m_v", 210, 470), port("m_w", 240, 470),
    port("ctrl_l", 500, 180), port("fu2_l_in", 540, 180), port("fu2_l_out", 590, 180),
    port("sb_in", 650, 180), port("sb_out", 730, 180),
    port("coil_a1", 790, 180), port("coil_a2", 870, 180),
    port("fr_nc_in", 930, 180), port("fr_nc_out", 1010, 180),
    port("fu2_r_in", 1070, 180), port("fu2_r_out", 1120, 180), port("ctrl_r", 1160, 180)
  ]);

  const wires = Object.freeze([
    wire("m01", "main", "l1", "qf_l1_in", [{x:120,y:58},{x:120,y:100}], "main"),
    wire("m02", "main", "l2", "qf_l2_in", [{x:210,y:58},{x:210,y:100}], "main"),
    wire("m03", "main", "l3", "qf_l3_in", [{x:300,y:58},{x:300,y:100}], "main"),
    wire("m04", "main", "qf_l1_out", "fu_l1_in", [{x:120,y:145},{x:120,y:170}], "main"),
    wire("m05", "main", "qf_l2_out", "fu_l2_in", [{x:210,y:145},{x:210,y:170}], "main"),
    wire("m06", "main", "qf_l3_out", "fu_l3_in", [{x:300,y:145},{x:300,y:170}], "main"),
    wire("m07", "main", "fu_l1_out", "km_l1_in", [{x:120,y:215},{x:120,y:260}], "main"),
    wire("m08", "main", "fu_l2_out", "km_l2_in", [{x:210,y:215},{x:210,y:260}], "main"),
    wire("m09", "main", "fu_l3_out", "km_l3_in", [{x:300,y:215},{x:300,y:260}], "main"),
    wire("m10", "main", "km_l1_out", "fr_l1_in", [{x:120,y:315},{x:120,y:350}], "main"),
    wire("m11", "main", "km_l2_out", "fr_l2_in", [{x:210,y:315},{x:210,y:350}], "main"),
    wire("m12", "main", "km_l3_out", "fr_l3_in", [{x:300,y:315},{x:300,y:350}], "main"),
    wire("m13", "main", "fr_l1_out", "m_u", [{x:120,y:405},{x:120,y:445},{x:180,y:445},{x:180,y:470}], "main"),
    wire("m14", "main", "fr_l2_out", "m_v", [{x:210,y:405},{x:210,y:470}], "main"),
    wire("m15", "main", "fr_l3_out", "m_w", [{x:300,y:405},{x:300,y:445},{x:240,y:445},{x:240,y:470}], "main"),
    wire("c01", "control", "ctrl_l", "fu2_l_in", [{x:500,y:180},{x:540,y:180}], "control_supply"),
    wire("c02", "control", "fu2_l_out", "sb_in", [{x:590,y:180},{x:650,y:180}], "control"),
    wire("c03", "control", "sb_out", "coil_a1", [{x:730,y:180},{x:790,y:180}], "control"),
    wire("c04", "control", "coil_a2", "fr_nc_in", [{x:870,y:180},{x:930,y:180}], "control"),
    wire("c05", "control", "fr_nc_out", "fu2_r_in", [{x:1010,y:180},{x:1070,y:180}], "control"),
    wire("c06", "control", "fu2_r_out", "ctrl_r", [{x:1120,y:180},{x:1160,y:180}], "control_supply")
  ]);

  const components = Object.freeze([
    component("qf", "qf", "breaker", "three_pole", "QF", "main", {x:90,y:96,width:240,height:55}),
    component("fu1", "fu1", "fuse", "three_pole", "FU1", "main", {x:90,y:170,width:240,height:45}),
    component("km_main", "km", "contactor", "main_contact", "KM", "main", {x:90,y:260,width:240,height:55}),
    component("fr_main", "fr", "thermal_relay", "thermal_element", "FR", "main", {x:90,y:350,width:240,height:55}),
    component("motor", "motor", "motor", "three_phase", "M", "main", {x:148,y:463,width:124,height:124}),
    component("fu2", "fu2", "fuse", "control", "FU2", "control", {x:540,y:166,width:580,height:28}),
    component("sb", "sb", "push_button", "no", "SB", "control", {x:650,y:158,width:80,height:45}),
    component("km_coil", "km", "contactor", "coil", "KM", "control", {x:790,y:150,width:80,height:60}),
    component("fr_nc", "fr", "thermal_relay", "protection_nc", "FR", "control", {x:930,y:158,width:80,height:45})
  ]);

  const deviceEdges = Object.freeze([
    ...[1,2,3].map((phase) => edge(`qf_${phase}`, "qf", `qf_l${phase}_in`, `qf_l${phase}_out`, "QF", "main", "contact")),
    ...[1,2,3].map((phase) => edge(`fu1_${phase}`, "fu1", `fu_l${phase}_in`, `fu_l${phase}_out`, "STATIC", "main", "protection")),
    ...[1,2,3].map((phase) => edge(`km_main_${phase}`, "km", `km_l${phase}_in`, `km_l${phase}_out`, "NO", "main", "contact")),
    ...[1,2,3].map((phase) => edge(`fr_main_${phase}`, "fr", `fr_l${phase}_in`, `fr_l${phase}_out`, "STATIC", "main", "protection")),
    edge("fu2_left", "fu2", "fu2_l_in", "fu2_l_out", "STATIC", "control", "protection"),
    edge("sb_no", "sb", "sb_in", "sb_out", "NO", "control", "contact"),
    edge("fr_nc", "fr", "fr_nc_in", "fr_nc_out", "NC", "control", "protection"),
    edge("fu2_right", "fu2", "fu2_r_in", "fu2_r_out", "STATIC", "control", "protection"),
    edge("km_coil", "km", "coil_a1", "coil_a2", "COIL", "control", "coil")
  ]);

  platform.chapterCircuitData.ch01Jog = Object.freeze({
    schemaVersion: "1.0", moduleId, mode: "jog", geometryLockId: "ch01_jog_geometry_v1_locked",
    referencePages: Object.freeze([3, 12]), ports, junctions: Object.freeze([]), wires, components, deviceEdges,
    labels: Object.freeze({ title: "电动机点动控制", start: "SB 点动", stop: "松开即停" })
  });
})(globalThis);
