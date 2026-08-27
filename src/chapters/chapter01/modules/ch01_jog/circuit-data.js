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
    port("l1", 218, 255), port("l2", 296, 255), port("l3", 370, 255),
    port("qf_l1_in", 218, 289), port("qf_l1_out", 218, 381),
    port("qf_l2_in", 296, 289), port("qf_l2_out", 296, 381),
    port("qf_l3_in", 370, 289), port("qf_l3_out", 370, 381),
    port("fu_l1_in", 218, 425), port("fu_l1_out", 218, 462),
    port("fu_l2_in", 296, 425), port("fu_l2_out", 296, 462),
    port("fu_l3_in", 370, 425), port("fu_l3_out", 370, 462),
    port("km_l1_in", 218, 569), port("km_l1_out", 218, 661),
    port("km_l2_in", 296, 569), port("km_l2_out", 296, 661),
    port("km_l3_in", 370, 569), port("km_l3_out", 370, 661),
    port("fr_l1_in", 218, 717), port("fr_l1_out", 218, 761),
    port("fr_l2_in", 296, 717), port("fr_l2_out", 296, 761),
    port("fr_l3_in", 370, 717), port("fr_l3_out", 370, 761),
    port("m_u", 218, 852), port("m_v", 296, 852), port("m_w", 370, 852),
    port("ctrl_l", 370, 462), port("fu2_l_in", 416, 426), port("fu2_l_out", 507, 426),
    port("sb_in", 571, 606), port("sb_out", 672, 606),
    port("coil_a1", 767, 606), port("coil_a2", 1025, 606),
    port("fr_nc_in", 1121, 381), port("fr_nc_out", 1198, 381),
    port("fu2_r_in", 416, 462), port("fu2_r_out", 507, 462), port("ctrl_r", 296, 462)
  ]);

  const wires = Object.freeze([
    wire("m01", "main", "l1", "qf_l1_in", [{x:218,y:255},{x:218,y:289}], "main"),
    wire("m02", "main", "l2", "qf_l2_in", [{x:296,y:255},{x:296,y:289}], "main"),
    wire("m03", "main", "l3", "qf_l3_in", [{x:370,y:255},{x:370,y:289}], "main"),
    wire("m04", "main", "qf_l1_out", "fu_l1_in", [{x:218,y:381},{x:218,y:425}], "main"),
    wire("m05", "main", "qf_l2_out", "fu_l2_in", [{x:296,y:381},{x:296,y:425}], "main"),
    wire("m06", "main", "qf_l3_out", "fu_l3_in", [{x:370,y:381},{x:370,y:425}], "main"),
    wire("m07", "main", "fu_l1_out", "km_l1_in", [{x:218,y:462},{x:218,y:569}], "main"),
    wire("m08", "main", "fu_l2_out", "km_l2_in", [{x:296,y:462},{x:296,y:569}], "main"),
    wire("m09", "main", "fu_l3_out", "km_l3_in", [{x:370,y:462},{x:370,y:569}], "main"),
    wire("m10", "main", "km_l1_out", "fr_l1_in", [{x:218,y:661},{x:218,y:717}], "main"),
    wire("m11", "main", "km_l2_out", "fr_l2_in", [{x:296,y:661},{x:296,y:717}], "main"),
    wire("m12", "main", "km_l3_out", "fr_l3_in", [{x:370,y:661},{x:370,y:717}], "main"),
    wire("m13", "main", "fr_l1_out", "m_u", [{x:218,y:761},{x:218,y:852}], "main"),
    wire("m14", "main", "fr_l2_out", "m_v", [{x:296,y:761},{x:296,y:852}], "main"),
    wire("m15", "main", "fr_l3_out", "m_w", [{x:370,y:761},{x:370,y:852}], "main"),
    wire("c01", "control", "ctrl_l", "fu2_l_in", [{x:370,y:462},{x:370,y:426},{x:416,y:426}], "control_supply"),
    wire("c02", "control", "fu2_l_out", "fr_nc_in", [{x:507,y:426},{x:568,y:426},{x:568,y:315},{x:1121,y:315},{x:1121,y:381}], "control"),
    wire("c03", "control", "fr_nc_out", "coil_a2", [{x:1198,y:381},{x:1238,y:381},{x:1238,y:606},{x:1025,y:606}], "control"),
    wire("c04", "control", "coil_a1", "sb_out", [{x:767,y:606},{x:672,y:606}], "control"),
    wire("c05", "control", "sb_in", "fu2_r_out", [{x:571,y:606},{x:568,y:606},{x:568,y:462},{x:507,y:462}], "control"),
    wire("c06", "control", "fu2_r_in", "ctrl_r", [{x:416,y:462},{x:296,y:462}], "control_supply")
  ]);

  const components = Object.freeze([
    component("qf", "qf", "breaker", "three_pole", "QF", "main", {x:183,y:276,width:224,height:116}),
    component("fu1", "fu1", "fuse", "three_pole", "FU1", "main", {x:206,y:419,width:176,height:48}),
    component("km_main", "km", "contactor", "main_contact", "KM", "main", {x:207,y:562,width:174,height:106}),
    component("fr_main", "fr", "thermal_relay", "thermal_element", "FR", "main", {x:162,y:709,width:264,height:58}),
    component("motor", "motor", "motor", "three_phase", "M", "main", {x:141,y:811,width:306,height:265}),
    component("fu2", "fu2", "fuse", "control", "FU2", "control", {x:416,y:417,width:91,height:54}),
    component("sb", "sb", "push_button", "no", "SB", "control", {x:571,y:592,width:101,height:28}),
    component("km_coil", "km", "contactor", "coil", "KM", "control", {x:910,y:542,width:122,height:125}),
    component("fr_nc", "fr", "thermal_relay", "protection_nc", "FR", "control", {x:1111,y:360,width:126,height:42})
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
