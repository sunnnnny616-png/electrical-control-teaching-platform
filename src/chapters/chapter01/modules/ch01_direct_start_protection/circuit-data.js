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
    port("l1",120,58),port("l2",210,58),port("l3",300,58),
    port("qf1_l1_in",120,100),port("qf1_l1_out",120,145),port("qf1_l2_in",210,100),port("qf1_l2_out",210,145),port("qf1_l3_in",300,100),port("qf1_l3_out",300,145),
    port("fu1_l1_in",120,170),port("fu1_l1_out",120,215),port("fu1_l2_in",210,170),port("fu1_l2_out",210,215),port("fu1_l3_in",300,170),port("fu1_l3_out",300,215),
    port("km1_l1_in",120,260),port("km1_l1_out",120,315),port("km1_l2_in",210,260),port("km1_l2_out",210,315),port("km1_l3_in",300,260),port("km1_l3_out",300,315),
    port("fr1_l1_in",120,350),port("fr1_l1_out",120,405),port("fr1_l2_in",210,350),port("fr1_l2_out",210,405),port("fr1_l3_in",300,350),port("fr1_l3_out",300,405),
    port("m_u",120,470),port("m_v",210,470),port("m_w",300,470),
    port("ctrl_l",500,150),port("fu2_in",540,150),port("fu2_out",590,150),
    port("sb1_in",650,150),port("sb1_out",740,150),port("hold_in",650,225),port("hold_out",740,225),port("merge",780,150),
    port("sb2_in",830,150),port("sb2_out",910,150),port("coil_a1",960,150),port("coil_a2",1040,150),
    port("fr_nc_in",1090,150),port("fr_nc_out",1170,150),port("ctrl_r",1210,150)
  ]);

  const wires = Object.freeze([
    wire("m01","main","l1","qf1_l1_in",[{x:120,y:58},{x:120,y:100}],"main"),wire("m02","main","l2","qf1_l2_in",[{x:210,y:58},{x:210,y:100}],"main"),wire("m03","main","l3","qf1_l3_in",[{x:300,y:58},{x:300,y:100}],"main"),
    wire("m04","main","qf1_l1_out","fu1_l1_in",[{x:120,y:145},{x:120,y:170}],"main"),wire("m05","main","qf1_l2_out","fu1_l2_in",[{x:210,y:145},{x:210,y:170}],"main"),wire("m06","main","qf1_l3_out","fu1_l3_in",[{x:300,y:145},{x:300,y:170}],"main"),
    wire("m07","main","fu1_l1_out","km1_l1_in",[{x:120,y:215},{x:120,y:260}],"main"),wire("m08","main","fu1_l2_out","km1_l2_in",[{x:210,y:215},{x:210,y:260}],"main"),wire("m09","main","fu1_l3_out","km1_l3_in",[{x:300,y:215},{x:300,y:260}],"main"),
    wire("m10","main","km1_l1_out","fr1_l1_in",[{x:120,y:315},{x:120,y:350}],"main"),wire("m11","main","km1_l2_out","fr1_l2_in",[{x:210,y:315},{x:210,y:350}],"main"),wire("m12","main","km1_l3_out","fr1_l3_in",[{x:300,y:315},{x:300,y:350}],"main"),
    wire("m13","main","fr1_l1_out","m_u",[{x:120,y:405},{x:120,y:470}],"main"),wire("m14","main","fr1_l2_out","m_v",[{x:210,y:405},{x:210,y:470}],"main"),wire("m15","main","fr1_l3_out","m_w",[{x:300,y:405},{x:300,y:470}],"main"),
    wire("c01","control","ctrl_l","fu2_in",[{x:500,y:150},{x:540,y:150}],"control_supply"),wire("c02","control","fu2_out","sb1_in",[{x:590,y:150},{x:650,y:150}],"control"),
    wire("c03","control","sb1_out","merge",[{x:740,y:150},{x:780,y:150}],"control"),wire("c04","control","hold_out","merge",[{x:740,y:225},{x:780,y:225},{x:780,y:150}],"control"),
    wire("c05","control","merge","sb2_in",[{x:780,y:150},{x:830,y:150}],"control"),wire("c06","control","sb2_out","coil_a1",[{x:910,y:150},{x:960,y:150}],"control"),
    wire("c07","control","coil_a2","fr_nc_in",[{x:1040,y:150},{x:1090,y:150}],"control"),wire("c08","control","fr_nc_out","ctrl_r",[{x:1170,y:150},{x:1210,y:150}],"control_supply"),
    wire("c09","control","sb1_in","hold_in",[{x:650,y:150},{x:650,y:225}],"control")
  ]);

  const components = Object.freeze([
    component("qf1","qf1","breaker","three_pole","QF1","main",{x:90,y:96,width:240,height:55}),
    component("fu1","fu1","fuse","three_pole","FU","main",{x:90,y:170,width:240,height:45}),
    component("km1_main","km1","contactor","main_contact","KM1","main",{x:90,y:260,width:240,height:55}),
    component("fr1_main","fr1","thermal_relay","thermal_element","FR1","main",{x:90,y:350,width:240,height:55}),
    component("motor","motor","motor","three_phase","M","main",{x:148,y:463,width:124,height:124}),
    component("fu2","fu2","fuse","control","FU","control",{x:540,y:136,width:50,height:28}),
    component("sb1","sb1","push_button","no","SB1","control",{x:650,y:128,width:90,height:45}),
    component("km1_aux","km1","contactor","aux_no","KM1","control",{x:650,y:203,width:90,height:45}),
    component("sb2","sb2","push_button","nc","SB2","control",{x:830,y:128,width:80,height:45}),
    component("km1_coil","km1","contactor","coil","KM1","control",{x:960,y:120,width:80,height:60}),
    component("fr1_nc","fr1","thermal_relay","protection_nc","FR1","control",{x:1090,y:128,width:80,height:45})
  ]);
  const deviceEdges = Object.freeze([
    ...[1,2,3].map((p)=>edge(`qf1_${p}`,"qf1",`qf1_l${p}_in`,`qf1_l${p}_out`,"QF","main","contact")),
    ...[1,2,3].map((p)=>edge(`km1_main_${p}`,"km1",`km1_l${p}_in`,`km1_l${p}_out`,"NO","main","contact")),
    edge("sb1_no","sb1","sb1_in","sb1_out","NO","control","contact"),
    edge("km1_aux_no","km1","hold_in","hold_out","NO","control","contact"),
    edge("sb2_nc","sb2","sb2_in","sb2_out","NC","control","contact"),
    edge("fr1_nc","fr1","fr_nc_in","fr_nc_out","NC","control","protection"),
    edge("km1_coil","km1","coil_a1","coil_a2","COIL","control","coil")
  ]);

  platform.chapterCircuitData.ch01DirectStartProtection = Object.freeze({
    schemaVersion:"1.0",moduleId,mode:"self_hold",geometryLockId:"ch01_direct_start_protection_geometry_v1_locked",
    referencePages:Object.freeze([11]),ports,junctions:Object.freeze([]),wires,components:Object.freeze(components),deviceEdges,
    labels:Object.freeze({title:"综合直接启动保护",start:"SB1 启动",stop:"SB2 停止"})
  });
})(globalThis);
