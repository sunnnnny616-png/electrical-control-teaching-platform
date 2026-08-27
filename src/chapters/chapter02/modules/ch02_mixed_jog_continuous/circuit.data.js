(function installMixedJogContinuousCircuitData(global) {
  "use strict";

  const platform = global.ECTPPlatform = global.ECTPPlatform || {};
  platform.moduleCircuitData = platform.moduleCircuitData || {};
  const ns = "ch02_mixed_jog_continuous";
  const id = (kind, localId) => `${ns}__${kind}__${localId}`;

  const main = Object.freeze({
    components: Object.freeze([
      { componentId: id("cmp", "qf1"), deviceId: id("dev", "qf1"), type: "breaker", partType: "three_pole", label: "QF1", geometry: { x: 80, y: 72, width: 190, height: 56, orientation: 0 } },
      { componentId: id("cmp", "fu1"), deviceId: id("dev", "fu1"), type: "fuse", partType: "three_phase", label: "FU1", geometry: { x: 80, y: 150, width: 190, height: 52, orientation: 0 } },
      { componentId: id("cmp", "km1_main"), deviceId: id("dev", "km1"), type: "contactor", partType: "main_contact", label: "KM1", geometry: { x: 80, y: 264, width: 190, height: 60, orientation: 0 } },
      { componentId: id("cmp", "fr1_main"), deviceId: id("dev", "fr1"), type: "thermal_relay", partType: "thermal_element", label: "FR1", geometry: { x: 80, y: 370, width: 190, height: 56, orientation: 0 } },
      { componentId: id("cmp", "m1"), deviceId: id("dev", "m1"), type: "motor", partType: "three_phase", label: "M", geometry: { x: 120, y: 472, width: 110, height: 110, orientation: 0 } }
    ]),
    wireIds: Object.freeze([
      id("wire", "main_l1"), id("wire", "main_l2"), id("wire", "main_l3"),
      id("wire", "main_l1_load"), id("wire", "main_l2_load"), id("wire", "main_l3_load")
    ])
  });

  const schemes = Object.freeze({
    scheme1: Object.freeze({
      title: "方式一 · SA转换开关",
      shortTitle: "方式一",
      description: "SA决定KM1辅助常开触点能否进入自锁支路：断开时为点动，闭合时为长动。",
      devices: Object.freeze([
        { componentId: id("cmp", "s1_sb1"), deviceId: id("dev", "sb1"), type: "push_button", partType: "no", label: "SB1" },
        { componentId: id("cmp", "s1_sa"), deviceId: id("dev", "sa"), type: "selector", partType: "maintained", label: "SA" },
        { componentId: id("cmp", "s1_km1_aux"), deviceId: id("dev", "km1"), type: "contactor", partType: "aux_no", label: "KM1" },
        { componentId: id("cmp", "s1_sb2"), deviceId: id("dev", "sb2"), type: "push_button", partType: "nc", label: "SB2" }
      ]),
      wireIds: Object.freeze([id("wire", "s1_supply"), id("wire", "s1_start"), id("wire", "s1_sa"), id("wire", "s1_hold"), id("wire", "s1_stop"), id("wire", "s1_coil"), id("wire", "s1_return")])
    }),
    scheme2: Object.freeze({
      title: "方式二 · SB3复合按钮",
      shortTitle: "方式二",
      description: "SB3按下时先断开自锁支路、再闭合点动支路；释放时先断点动、再恢复自锁支路。",
      devices: Object.freeze([
        { componentId: id("cmp", "s2_sb1"), deviceId: id("dev", "sb1"), type: "push_button", partType: "no", label: "SB1" },
        { componentId: id("cmp", "s2_sb3_no"), deviceId: id("dev", "sb3"), type: "push_button", partType: "no", label: "SB3" },
        { componentId: id("cmp", "s2_sb3_nc"), deviceId: id("dev", "sb3"), type: "push_button", partType: "nc", label: "SB3" },
        { componentId: id("cmp", "s2_km1_aux"), deviceId: id("dev", "km1"), type: "contactor", partType: "aux_no", label: "KM1" },
        { componentId: id("cmp", "s2_sb2"), deviceId: id("dev", "sb2"), type: "push_button", partType: "nc", label: "SB2" }
      ]),
      wireIds: Object.freeze([id("wire", "s2_supply"), id("wire", "s2_long_start"), id("wire", "s2_jog"), id("wire", "s2_jog_nc"), id("wire", "s2_hold"), id("wire", "s2_stop"), id("wire", "s2_coil"), id("wire", "s2_return")])
    }),
    scheme3: Object.freeze({
      title: "方式三 · 中间继电器K",
      shortTitle: "方式三",
      description: "长动支路先使K得电并自锁，K触点再驱动KM1；SB3点动时切断K并直接驱动KM1。",
      devices: Object.freeze([
        { componentId: id("cmp", "s3_sb1"), deviceId: id("dev", "sb1"), type: "push_button", partType: "no", label: "SB1" },
        { componentId: id("cmp", "s3_sb3_nc"), deviceId: id("dev", "sb3"), type: "push_button", partType: "nc", label: "SB3" },
        { componentId: id("cmp", "s3_sb3_no"), deviceId: id("dev", "sb3"), type: "push_button", partType: "no", label: "SB3" },
        { componentId: id("cmp", "s3_k_coil"), deviceId: id("dev", "k"), type: "relay", partType: "coil", label: "K" },
        { componentId: id("cmp", "s3_k_hold"), deviceId: id("dev", "k"), type: "relay", partType: "aux_no", label: "K" },
        { componentId: id("cmp", "s3_k_drive"), deviceId: id("dev", "k"), type: "relay", partType: "aux_no", label: "K" },
        { componentId: id("cmp", "s3_sb2"), deviceId: id("dev", "sb2"), type: "push_button", partType: "nc", label: "SB2" }
      ]),
      wireIds: Object.freeze([id("wire", "s3_supply"), id("wire", "s3_long_start"), id("wire", "s3_k_hold"), id("wire", "s3_jog_nc"), id("wire", "s3_k_coil"), id("wire", "s3_k_drive"), id("wire", "s3_jog"), id("wire", "s3_km_coil"), id("wire", "s3_return")])
    })
  });

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
    makeWire("s1_supply", "control", [[382, 172], [470, 172]], "control_l", "s1_sb1_in"),
    makeWire("s1_start", "control", [[520, 172], [695, 172]], "s1_sb1_out", "s1_sb2_in"),
    makeWire("s1_sa", "control", [[440, 172], [440, 294], [500, 294]], "s1_branch", "s1_sa_in"),
    makeWire("s1_hold", "control", [[550, 294], [590, 294]], "s1_sa_out", "s1_km1_aux_in"),
    makeWire("s1_stop", "control", [[745, 172], [785, 172]], "s1_sb2_out", "s1_km1_a1"),
    makeWire("s1_coil", "control", [[845, 172], [900, 172]], "s1_km1_a2", "s1_fr1_in"),
    makeWire("s1_return", "control", [[950, 172], [980, 172]], "s1_fr1_out", "control_n"),
    makeWire("s2_supply", "control", [[382, 172], [450, 172]], "control_l", "s2_sb1_in"),
    makeWire("s2_long_start", "control", [[500, 172], [690, 172]], "s2_sb1_out", "s2_sb2_in"),
    makeWire("s2_jog", "control", [[520, 278], [665, 278], [665, 172], [690, 172]], "s2_sb3_no_out", "s2_sb2_in"),
    makeWire("s2_jog_nc", "control", [[520, 384], [565, 384]], "s2_sb3_nc_out", "s2_km1_aux_in"),
    makeWire("s2_hold", "control", [[615, 384], [665, 384], [665, 278]], "s2_km1_aux_out", "s2_start_join"),
    makeWire("s2_stop", "control", [[740, 172], [785, 172]], "s2_sb2_out", "s2_km1_a1"),
    makeWire("s2_coil", "control", [[845, 172], [900, 172]], "s2_km1_a2", "s2_fr1_in"),
    makeWire("s2_return", "control", [[950, 172], [980, 172]], "s2_fr1_out", "control_n"),
    makeWire("s3_supply", "control", [[382, 170], [448, 170]], "control_l", "s3_sb1_in"),
    makeWire("s3_long_start", "control", [[498, 170], [600, 170]], "s3_sb1_out", "s3_sb2_in"),
    makeWire("s3_k_hold", "control", [[520, 270], [575, 270], [575, 170], [600, 170]], "s3_k_hold_out", "s3_sb2_in"),
    makeWire("s3_jog_nc", "control", [[650, 170], [685, 170]], "s3_sb2_out", "s3_sb3_nc_in"),
    makeWire("s3_k_coil", "control", [[735, 170], [790, 170]], "s3_sb3_nc_out", "s3_k_a1"),
    makeWire("s3_k_drive", "control", [[505, 386], [635, 386]], "s3_k_drive_out", "s3_km1_a1"),
    makeWire("s3_jog", "control", [[505, 478], [610, 478], [610, 386], [635, 386]], "s3_sb3_no_out", "s3_km1_a1"),
    makeWire("s3_km_coil", "control", [[695, 386], [920, 386], [920, 170]], "s3_km1_a2", "s3_return_join"),
    makeWire("s3_return", "control", [[950, 170], [980, 170]], "s3_fr1_out", "control_n")
  ]);

  const portIds = [...new Set(wires.flatMap((item) => [item.fromPort, item.toPort]))];
  const ports = Object.freeze(portIds.map((portId) => Object.freeze({ portId, kind: "electrical", required: true })));
  const deviceEdges = Object.freeze([
    { edgeId: id("edge", "km1_main"), deviceId: id("dev", "km1"), circuitDomain: "main", electricalRole: "contact", behavior: "NO" },
    { edgeId: id("edge", "km1_aux_no"), deviceId: id("dev", "km1"), circuitDomain: "control", electricalRole: "contact", behavior: "NO" },
    { edgeId: id("edge", "fr1_nc"), deviceId: id("dev", "fr1"), circuitDomain: "control", electricalRole: "protection", behavior: "NC" },
    { edgeId: id("edge", "k_aux_no"), deviceId: id("dev", "k"), circuitDomain: "control", electricalRole: "contact", behavior: "NO", applicableVariant: "scheme3" }
  ].map(Object.freeze));

  platform.moduleCircuitData.ch02MixedJogContinuous = Object.freeze({
    schemaVersion: "1.0",
    moduleId: ns,
    namespace: ns,
    sourceImages: Object.freeze(["原图12", "原图13", "原图14"]),
    main,
    schemes,
    ports,
    wires,
    deviceEdges,
    junctions: Object.freeze([
      { junctionId: id("junction", "start_branch"), circuitDomain: "control" },
      { junctionId: id("junction", "start_join"), circuitDomain: "control" }
    ])
  });
})(globalThis);
