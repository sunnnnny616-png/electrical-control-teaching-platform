(function installMultiPointTeaching(global) {
  "use strict";

  const platform = global.ECTPPlatform = global.ECTPPlatform || {};
  platform.moduleTeaching = platform.moduleTeaching || {};
  const MODULE_ID = "ch02_multi_point";

  function buildFeedback(state, result) {
    const operation = state.operationState;
    const last = state.lastAction?.type || "RESET_MODULE";
    const running = result.motorStates.M.running;
    let title = "多地点控制待机";
    let text = "两个停止按钮串联、两个启动按钮并联；任一地点可启动，任一地点可停止。";
    let tone = "info";

    if (operation.protection === "overload") {
      title = "FR1过载保护动作";
      text = "FR1常闭触点断开，KM1释放，两个地点均不能重新启动；复位后需要再次按启动按钮。";
      tone = "error";
    } else if (last === "START_PRIMARY_PRESS" && running) {
      title = "地点1启动成功";
      text = "1SB1闭合形成启动通路，KM1得电；KM1辅助常开触点闭合后建立自锁。";
      tone = "forward";
    } else if (last === "START_SECONDARY_PRESS" && running) {
      title = "地点2启动成功";
      text = "2SB1与1SB1并联，任一启动按钮闭合都能使KM1得电并建立同一自锁通路。";
      tone = "forward";
    } else if (last === "STOP_PRIMARY_PRESS") {
      title = "地点1停止";
      text = "1SB2位于串联停止链中，按下后整条控制回路断开，KM1释放。";
    } else if (last === "STOP_SECONDARY_PRESS") {
      title = "地点2停止";
      text = "2SB2位于同一串联停止链中，任一停止按钮都具有全局停止作用。";
    } else if (last === "POWER_CLOSE") {
      title = "QF1已合闸";
      text = "控制电源已接通，两个启动地点均可发出启动命令。";
      tone = "on";
    } else if (last === "POWER_OPEN") {
      title = "QF1已分闸";
      text = "主回路与控制回路断电，KM1释放，M与HL1/HL2停止显示。";
    }
    return { schemaVersion: "1.0", moduleId: MODULE_ID, title, text, tone };
  }

  function buildReplaySteps(state, result) {
    const operation = state.operationState;
    return [
      { id: "power", title: "QF1供电", text: operation.power === "closed" ? "QF1闭合，控制回路获得电源。" : "QF1断开，控制回路无电。" },
      { id: "stop-chain", title: "串联停止链", text: operation.stop1 === "pressed" || operation.stop2 === "pressed" ? "至少一个停止按钮断开，后续所有支路失电。" : "1SB2与2SB2均闭合，停止链完整。" },
      { id: "start-network", title: "并联启动网络", text: operation.start1 === "pressed" || operation.start2 === "pressed" ? "至少一个启动按钮闭合，KM1获得初始吸合条件。" : result.stableDeviceStates.KM1 ? "启动按钮已释放，由KM1辅助触点维持自锁。" : "两个启动按钮均释放。" },
      { id: "load", title: "负载与指示", text: result.motorStates.M.running ? "KM1主触点闭合，M运行；HL1与HL2同步点亮。" : "KM1主触点断开，M停止；指示灯熄灭。" }
    ];
  }

  platform.moduleTeaching.ch02MultiPoint = Object.freeze({ buildFeedback, buildReplaySteps });
})(globalThis);
