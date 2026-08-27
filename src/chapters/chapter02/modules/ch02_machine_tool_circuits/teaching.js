(function installMachineToolCircuitsTeaching(global) {
  "use strict";

  const platform = global.ECTPPlatform = global.ECTPPlatform || {};
  platform.moduleTeaching = platform.moduleTeaching || {};

  function buildFeedback(state, result) {
    const op = state.operationState;
    const action = state.lastAction?.message || "等待操作";
    if (op.power === "open") return { title: "电源未接通", text: `${action}。QF处于分闸状态，所有控制回路与电动机均无电流。`, tone: "off" };
    if (op.variant === "ca6140") {
      if (op.primaryProtection === "overload") return { title: "FR过载保护", text: "FR控制常闭触点断开，KM1/KM2线圈失电，主回路被切断；复位后仍需重新启动。", tone: "error" };
      if (result.motorStates.M?.direction === "forward") return { title: "CA6140正向运行", text: "正向支路导通，KM1得电并闭合主触点；KM2互锁保持断开，电动机按正相序运行。", tone: "on" };
      if (result.motorStates.M?.direction === "reverse") return { title: "CA6140反向运行", text: "反向支路导通，KM2得电并完成换相；KM1互锁阻止两个接触器同时吸合。", tone: "on" };
      if (op.caSq1 === "triggered" || op.caSq2 === "triggered") return { title: "行程限位已动作", text: "SQ1/SQ2对应常闭触点断开，受限方向不能再次启动，反方向仍可用于退出限位。", tone: "warning" };
      if (op.caTimer === "timing") return { title: "KT正在延时", text: "停止动作后KT进入计时，动态电流仅显示真实计时支路；延时完成后计时支路释放。", tone: "warning" };
      return { title: "CA6140待机", text: `${action}。KM1、KM2均失电，正反向回路通过电气互锁保持安全。`, tone: "off" };
    }
    if (op.secondaryProtection === "overload") return { title: "FR2液压保护", text: "FR2动作后摇臂升降、夹紧与松开回路均被切断，液压泵M3停止。", tone: "error" };
    if (result.motorStates.M2?.direction === "up") return { title: "摇臂上升", text: "KT延时完成，KM2吸合；KM3互锁断开，SQ1上限位与SQ2联锁持续监测。", tone: "on" };
    if (result.motorStates.M2?.direction === "down") return { title: "摇臂下降", text: "KT延时完成，KM3吸合；KM2互锁断开，SQ1下限位与SQ2联锁持续监测。", tone: "on" };
    if (op.zTimer === "timing") return { title: "升降准备延时", text: "KT正在计时，液压泵先建立松开压力；延时完成后才允许KM2或KM3驱动摇臂。", tone: "warning" };
    if (result.stableDeviceStates.KM5) return { title: "摇臂夹紧", text: "KM5驱动液压泵完成夹紧；SQ3到位后切断回路，防止持续加压。", tone: "on" };
    if (result.stableDeviceStates.KM4) return { title: "摇臂松开/液压准备", text: "KM4与YV建立液压松开通路，为升降或松开动作提供条件。", tone: "on" };
    if (result.motorStates.M1?.running) return { title: "主轴运行", text: "SB2启动后KM1吸合并由辅助常开触点自锁，FR1负责主轴过载保护。", tone: "on" };
    return { title: "Z3040待机", text: `${action}。主轴、摇臂和液压三组子回路均处于安全停止状态。`, tone: "off" };
  }

  function buildReplaySteps(state, result) {
    if (state.operationState.variant === "ca6140") {
      return [
        { title: "电源", text: state.operationState.power === "closed" ? "QF合闸，FU1/FU2后获得电源。" : "QF分闸，全部回路失电。" },
        { title: "方向选择", text: result.motorStates.M?.direction === "forward" ? "KM1吸合，正相序供电。" : result.motorStates.M?.direction === "reverse" ? "KM2吸合，换相供电。" : "KM1/KM2均未吸合。" },
        { title: "互锁与限位", text: "KM1/KM2电气互锁；SQ1/SQ2分别阻止受限方向继续运行。" },
        { title: "保护", text: state.operationState.primaryProtection === "overload" ? "FR已动作并切断线圈回路。" : "FR处于正常导通状态。" }
      ];
    }
    return [
      { title: "主轴", text: result.motorStates.M1?.running ? "KM1吸合，主轴单向旋转。" : "主轴停止。" },
      { title: "升降准备", text: state.operationState.zTimer === "timing" ? "KT正在延时，液压泵先松开摇臂。" : state.operationState.zTimer === "completed" ? "KT已完成，允许升降。" : "KT未启动。" },
      { title: "摇臂运动", text: result.motorStates.M2?.direction === "up" ? "KM2驱动上升。" : result.motorStates.M2?.direction === "down" ? "KM3驱动下降。" : "摇臂停止。" },
      { title: "夹紧联锁", text: "SQ2确认松开到位；SQ3确认夹紧到位并停止液压泵M3。" }
    ];
  }

  platform.moduleTeaching.ch02MachineToolCircuits = Object.freeze({ buildFeedback, buildReplaySteps });
})(globalThis);
