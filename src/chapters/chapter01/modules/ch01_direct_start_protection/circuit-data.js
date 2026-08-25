(function installCh01DirectProtectionCircuitData(global) {
  "use strict";

  const platform = global.ECTPPlatform = global.ECTPPlatform || {};
  platform.chapterCircuitData = platform.chapterCircuitData || {};
  const moduleId = "ch01_direct_start_protection";
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
    port("l1",218,255),port("l2",296,255),port("l3",370,255),
    port("qf1_l1_in",218,289),port("qf1_l1_out",218,381),port("qf1_l2_in",296,289),port("qf1_l2_out",296,381),port("qf1_l3_in",370,289),port("qf1_l3_out",370,381),
    port("fu1_l1_in",218,425),port("fu1_l1_out",218,462),port("fu1_l2_in",296,425),port("fu1_l2_out",296,462),port("fu1_l3_in",370,425),port("fu1_l3_out",370,462),
    port("km1_l1_in",218,569),port("km1_l1_out",218,661),port("km1_l2_in",296,569),port("km1_l2_out",296,661),port("km1_l3_in",370,569),port("km1_l3_out",370,661),
    port("fr1_l1_in",218,717),port("fr1_l1_out",218,761),port("fr1_l2_in",296,717),port("fr1_l2_out",296,761),port("fr1_l3_in",370,717),port("fr1_l3_out",370,761),
    port("m_u",218,852),port("m_v",296,852),port("m_w",370,852),
    port("ctrl_l",430,350),port("fu2_in",460,350),port("fu2_out",540,350),
    port("sb1_in",610,350),port("sb1_out",700,350),port("hold_in",610,500),port("hold_out",700,500),port("merge",760,350),
    port("sb2_in",820,350),port("sb2_out",900,350),port("coil_a1",960,350),port("coil_a2",1060,350),
    port("fr_nc_in",1120,350),port("fr_nc_out",1190,350),port("ctrl_r",1230,350)
  ]);

  const wires = Object.freeze([
    wire("m01","main","l1","qf1_l1_in",[{x:218,y:255},{x:218,y:289}],"main"),wire("m02","main","l2","qf1_l2_in",[{x:296,y:255},{x:296,y:289}],"main"),wire("m03","main","l3","qf1_l3_in",[{x:370,y:255},{x:370,y:289}],"main"),
    wire("m04","main","qf1_l1_out","fu1_l1_in",[{x:218,y:381},{x:218,y:425}],"main"),wire("m05","main","qf1_l2_out","fu1_l2_in",[{x:296,y:381},{x:296,y:425}],"main"),wire("m06","main","qf1_l3_out","fu1_l3_in",[{x:370,y:381},{x:370,y:425}],"main"),
    wire("m07","main","fu1_l1_out","km1_l1_in",[{x:218,y:462},{x:218,y:569}],"main"),wire("m08","main","fu1_l2_out","km1_l2_in",[{x:296,y:462},{x:296,y:569}],"main"),wire("m09","main","fu1_l3_out","km1_l3_in",[{x:370,y:462},{x:370,y:569}],"main"),
    wire("m10","main","km1_l1_out","fr1_l1_in",[{x:218,y:661},{x:218,y:717}],"main"),wire("m11","main","km1_l2_out","fr1_l2_in",[{x:296,y:661},{x:296,y:717}],"main"),wire("m12","main","km1_l3_out","fr1_l3_in",[{x:370,y:661},{x:370,y:717}],"main"),
    wire("m13","main","fr1_l1_out","m_u",[{x:218,y:761},{x:218,y:852}],"main"),wire("m14","main","fr1_l2_out","m_v",[{x:296,y:761},{x:296,y:852}],"main"),wire("m15","main","fr1_l3_out","m_w",[{x:370,y:761},{x:370,y:852}],"main"),
    wire("c01","control","ctrl_l","fu2_in",[{x:430,y:350},{x:460,y:350}],"control_supply"),wire("c02","control","fu2_out","sb1_in",[{x:540,y:350},{x:610,y:350}],"control"),
    wire("c03","control","sb1_out","merge",[{x:700,y:350},{x:760,y:350}],"control"),wire("c04","control","hold_out","merge",[{x:700,y:500},{x:760,y:500},{x:760,y:350}],"control"),
    wire("c05","control","merge","sb2_in",[{x:760,y:350},{x:820,y:350}],"control"),wire("c06","control","sb2_out","coil_a1",[{x:900,y:350},{x:960,y:350}],"control"),
    wire("c07","control","coil_a2","fr_nc_in",[{x:1060,y:350},{x:1120,y:350}],"control"),wire("c08","control","fr_nc_out","ctrl_r",[{x:1190,y:350},{x:1230,y:350}],"control_supply"),
    wire("c09","control","sb1_in","hold_in",[{x:610,y:350},{x:610,y:500}],"control")
  ]);

  const components = Object.freeze([
    component("qf1","qf1","breaker","three_pole","QF1","main",{x:200,y:281,width:188,height:108}),
    component("fu1","fu1","fuse","three_pole","FU1","main",{x:206,y:417,width:176,height:53}),
    component("km1_main","km1","contactor","main_contact","KM1","main",{x:200,y:561,width:188,height:108}),
    component("fr1_main","fr1","thermal_relay","thermal_element","FR1","main",{x:205,y:709,width:178,height:60}),
    component("motor","motor","motor","three_phase","M","main",{x:218,y:852,width:152,height:150}),
    component("fu2","fu2","fuse","control","FU2","control",{x:460,y:339,width:80,height:22}),
    component("sb1","sb1","push_button","no","SB1 启动","control",{x:610,y:316,width:90,height:68}),
    component("km1_aux","km1","contactor","aux_no","KM1 自锁","control",{x:610,y:466,width:90,height:68}),
    component("sb2","sb2","push_button","nc","SB2 停止","control",{x:820,y:316,width:80,height:68}),
    component("km1_coil","km1","contactor","coil","KM1 线圈","control",{x:960,y:292,width:100,height:116}),
    component("fr1_nc","fr1","thermal_relay","protection_nc","FR1 常闭保护","control",{x:1108,y:316,width:94,height:68})
  ]);
  const deviceEdges = Object.freeze([
    ...[1,2,3].map((p)=>edge(`qf1_${p}`,"qf1",`qf1_l${p}_in`,`qf1_l${p}_out`,"QF","main","contact")),
    ...[1,2,3].map((p)=>edge(`fu1_${p}`,"fu1",`fu1_l${p}_in`,`fu1_l${p}_out`,"STATIC","main","protection")),
    ...[1,2,3].map((p)=>edge(`km1_main_${p}`,"km1",`km1_l${p}_in`,`km1_l${p}_out`,"NO","main","contact")),
    ...[1,2,3].map((p)=>edge(`fr1_main_${p}`,"fr1",`fr1_l${p}_in`,`fr1_l${p}_out`,"STATIC","main","protection")),
    edge("fu2","fu2","fu2_in","fu2_out","STATIC","control","protection"),
    edge("sb1_no","sb1","sb1_in","sb1_out","NO","control","contact"),
    edge("km1_aux_no","km1","hold_in","hold_out","NO","control","contact"),
    edge("sb2_nc","sb2","sb2_in","sb2_out","NC","control","contact"),
    edge("fr1_nc","fr1","fr_nc_in","fr_nc_out","NC","control","protection"),
    edge("km1_coil","km1","coil_a1","coil_a2","COIL","control","coil")
  ]);

  platform.chapterCircuitData.ch01DirectStartProtection = Object.freeze({
    schemaVersion:"1.0",moduleId,mode:"self_hold",geometryLockId:"ch01_direct_start_protection_geometry_v3_locked",
    referencePages:Object.freeze([11]),ports,junctions:Object.freeze([]),wires,components:Object.freeze(components),deviceEdges,
    labels:Object.freeze({title:"综合直接启动保护",start:"SB1 启动",stop:"SB2 停止"})
  });
})(globalThis);
