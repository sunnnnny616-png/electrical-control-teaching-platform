(function installCh01DirectProtectionFacade(global) {
  "use strict";
  const platform = global.ECTPPlatform = global.ECTPPlatform || {};
  platform.moduleFacades = platform.moduleFacades || {};
  platform.moduleFacades.createCh01DirectStartProtectionFacade = () => platform.chapterRuntimes.createDirectStartFacade({
    moduleId: "ch01_direct_start_protection",
    routeId: "ch01-direct-start-protection",
    circuitData: platform.chapterCircuitData.ch01DirectStartProtection,
    mode: "self_hold",
    copy: {
      title: "综合直接启动保护实验",
      initialTitle: "综合直接启动保护原理",
      initialText: "QF1、FU、KM1、FR1 和 M 构成完整直接启动链路；SB1 启动并自锁，SB2 停止，FR1 过载时切断控制回路。",
      powerTitle: "QF1 动作反馈",
      powerOn: "QF1 已合闸，主回路和控制回路进入待启动状态。",
      powerOff: "QF1 已分闸，KM1 自锁解除，电动机停止。"
    }
  });
})(globalThis);
