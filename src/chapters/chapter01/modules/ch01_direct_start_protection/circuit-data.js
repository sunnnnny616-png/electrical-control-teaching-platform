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
    port("l1",150,246),port("l2",212,246),port("l3",274,246),
    port("qf1_l1_in",150,280),port("qf1_l1_out",150,368),port("qf1_l2_in",212,280),port("qf1_l2_out",212,368),port("qf1_l3_in",274,280),port("qf1_l3_out",274,368),
    port("fu1_l1_in",150,404),port("fu1_l1_out",150,452),port("fu1_l2_in",212,404),port("fu1_l2_out",212,452),port("fu1_l3_in",274,404),port("fu1_l3_out",274,452),
    port("km1_l1_in",150,560),port("km1_l1_out",150,650),port("km1_l2_in",212,560),port("km1_l2_out",212,650),port("km1_l3_in",274,560),port("km1_l3_out",274,650),
    port("fr1_l1_in",150,726),port("fr1_l1_out",150,768),port("fr1_l2_in",212,726),port("fr1_l2_out",212,768),port("fr1_l3_in",274,726),port("fr1_l3_out",274,768),
    port("m_u",150,892),port("m_v",212,892),port("m_w",274,892),
    port("ctrl_l",420,297),port("fu2_in",454,297),port("fu2_out",526,297),
    port("sb1_in",620,297),port("sb1_out",676,297),port("hold_in",620,446),port("hold_out",848,446),port("merge",848,297),
    port("sb2_in",848,297),port("sb2_out",904,297),port("coil_a1",1048,297),port("coil_a2",1128,297),
    port("fr_nc_in",1216,297),port("fr_nc_out",1268,297),port("ctrl_r",1324,297)
  ]);

  const wires = Object.freeze([
    wire("m01","main","l1","qf1_l1_in",[{x:150,y:246},{x:150,y:280}],"main"),wire("m02","main","l2","qf1_l2_in",[{x:212,y:246},{x:212,y:280}],"main"),wire("m03","main","l3","qf1_l3_in",[{x:274,y:246},{x:274,y:280}],"main"),
    wire("m04","main","qf1_l1_out","fu1_l1_in",[{x:150,y:368},{x:150,y:404}],"main"),wire("m05","main","qf1_l2_out","fu1_l2_in",[{x:212,y:368},{x:212,y:404}],"main"),wire("m06","main","qf1_l3_out","fu1_l3_in",[{x:274,y:368},{x:274,y:404}],"main"),
    wire("m07","main","fu1_l1_out","km1_l1_in",[{x:150,y:452},{x:150,y:560}],"main"),wire("m08","main","fu1_l2_out","km1_l2_in",[{x:212,y:452},{x:212,y:560}],"main"),wire("m09","main","fu1_l3_out","km1_l3_in",[{x:274,y:452},{x:274,y:560}],"main"),
    wire("m10","main","km1_l1_out","fr1_l1_in",[{x:150,y:650},{x:150,y:726}],"main"),wire("m11","main","km1_l2_out","fr1_l2_in",[{x:212,y:650},{x:212,y:726}],"main"),wire("m12","main","km1_l3_out","fr1_l3_in",[{x:274,y:650},{x:274,y:726}],"main"),
    wire("m13","main","fr1_l1_out","m_u",[{x:150,y:768},{x:150,y:892}],"main"),wire("m14","main","fr1_l2_out","m_v",[{x:212,y:768},{x:212,y:892}],"main"),wire("m15","main","fr1_l3_out","m_w",[{x:274,y:768},{x:274,y:892}],"main"),
    wire("c01","control","ctrl_l","fu2_in",[{x:420,y:297},{x:454,y:297}],"control_supply"),wire("c02","control","fu2_out","sb1_in",[{x:526,y:297},{x:620,y:297}],"control"),
    wire("c03","control","sb1_out","merge",[{x:676,y:297},{x:848,y:297}],"control"),wire("c04","control","hold_out","merge",[{x:848,y:446},{x:848,y:297}],"control"),
    wire("c05","control","merge","sb2_in",[{x:848,y:297},{x:848,y:297}],"control"),wire("c06","control","sb2_out","coil_a1",[{x:904,y:297},{x:1048,y:297}],"control"),
    wire("c07","control","coil_a2","fr_nc_in",[{x:1128,y:297},{x:1216,y:297}],"control"),wire("c08","control","fr_nc_out","ctrl_r",[{x:1268,y:297},{x:1324,y:297}],"control_supply"),
    wire("c09","control","sb1_in","hold_in",[{x:620,y:297},{x:580,y:297},{x:580,y:446},{x:620,y:446}],"control")
  ]);

  const components = Object.freeze([
    component("qf1","qf1","breaker","three_pole","QF1","main",{x:112,y:266,width:200,height:114}),
    component("fu1","fu1","fuse","three_pole","FU1","main",{x:138,y:396,width:148,height:62}),
    component("km1_main","km1","contactor","main_contact","KM1","main",{x:138,y:552,width:148,height:104}),
    component("fr1_main","fr1","thermal_relay","thermal_element","FR1","main",{x:108,y:716,width:208,height:58}),
    component("motor","motor","motor","three_phase","M","main",{x:92,y:844,width:240,height:220}),
    component("fu2","fu2","fuse","control","FU2","control",{x:454,y:288,width:72,height:18}),
    component("sb1","sb1","push_button","no","SB1 启动","control",{x:620,y:283,width:56,height:28}),
    component("km1_aux","km1","contactor","aux_no","KM1 自锁","control",{x:620,y:432,width:228,height:28}),
    component("sb2","sb2","push_button","nc","SB2 停止","control",{x:848,y:283,width:56,height:28}),
    component("km1_coil","km1","contactor","coil","KM1 线圈","control",{x:1048,y:258,width:80,height:78}),
    component("fr1_nc","fr1","thermal_relay","protection_nc","FR1 常闭保护","control",{x:1210,y:276,width:64,height:42})
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
    schemaVersion:"1.0",moduleId,mode:"self_hold",geometryLockId:"ch01_direct_start_protection_geometry_v4_mature_locked",
    referencePages:Object.freeze([11]),ports,junctions:Object.freeze([]),wires,components:Object.freeze(components),deviceEdges,
    labels:Object.freeze({title:"综合直接启动保护",start:"SB1 启动",stop:"SB2 停止"})
  });
})(globalThis);
