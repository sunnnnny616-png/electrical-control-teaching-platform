(function installCh01JogFacade(global) {
  "use strict";
  const platform = global.ECTPPlatform = global.ECTPPlatform || {};
  platform.moduleFacades = platform.moduleFacades || {};
  platform.moduleFacades.createCh01JogFacade = () => platform.chapterRuntimes.createDirectStartFacade({
    moduleId: "ch01_jog",
    routeId: "ch01-jog-control",
    circuitData: platform.chapterCircuitData.ch01Jog,
    mode: "jog",
    copy: {
      title: "点动控制演示",
      initialTitle: "点动控制原理",
      initialText: "按住 SB 时 KM 线圈得电，主触点闭合，电动机运行；松开 SB 后线圈立即失电，电动机停止。",
      powerTitle: "QF 动作反馈",
      powerOn: "QF 已合闸，主回路和控制取电支路具备供电条件。",
      powerOff: "QF 已分闸，KM 与电动机均失去供电条件。"
    }
  });
})(globalThis);
