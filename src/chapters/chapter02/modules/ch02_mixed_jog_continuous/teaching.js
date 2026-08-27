(function installMixedJogContinuousTeaching(global) {
  "use strict";

  const platform = global.ECTPPlatform = global.ECTPPlatform || {};
  platform.moduleTeaching = platform.moduleTeaching || {};
  const names = {
    scheme1: "方式一（SA转换开关）",
    scheme2: "方式二（SB3复合按钮）",
    scheme3: "方式三（中间继电器K）"
  };

  function buildFeedback(state, result) {
    const operation = state.operationState;
    const running = result.motorStates.M.running;
    const overload = operation.protection === "overload";
    const lastType = state.lastAction?.type || "RESET_MODULE";
    let title = names[operation.variant];
    let text = "合上QF1后，选择点动或长动操作，观察控制回路、KM1与电机状态的因果关系。";
    let tone = "info";

    if (overload) {
      title = "FR1过载保护动作";
      text = "FR1常闭保护触点断开，KM1释放，主触点断开，电机停止；复位后仍需重新启动。";
      tone = "error";
    } else if (lastType === "POWER_CLOSE") {
      title = "QF1已合闸";
      text = "主回路与控制回路获得电源，但尚无启动条件，KM1保持失电。";
      tone = "on";
    } else if (lastType === "POWER_OPEN") {
      title = "QF1已分闸";
      text = "控制电源被切断，KM1与K（方式三）释放，电机停止。";
    } else if (lastType === "JOG_PRESS" && running) {
      title = "点动通路建立";
      text = operation.variant === "scheme3"
        ? "SB3点动触点直接使KM1得电，同时切断K的长动保持支路；松开SB3后KM1释放。"
        : operation.variant === "scheme2"
          ? "SB3先断开自锁支路，再闭合点动支路使KM1得电；松开时按先断后合顺序避免形成自锁。"
          : "SA处于点动位置，KM1只在SB1（点动操作）保持按下期间得电。";
      tone = "forward";
    } else if (lastType === "START_PRIMARY_PRESS" && running) {
      title = "长动回路已建立";
      text = operation.variant === "scheme3"
        ? "SB1使中间继电器K得电并自锁，K常开触点闭合后驱动KM1，电机连续运行。"
        : "启动按钮建立初始通路，KM1得电后辅助常开触点闭合，自锁支路接替启动按钮维持运行。";
      tone = "forward";
    } else if (lastType === "STOP_PRIMARY_PRESS") {
      title = "SB2停止";
      text = "SB2常闭触点瞬时断开，保持回路失去电流，KM1（及K）释放，电机停止。";
    } else if (lastType === "JOG_RELEASE") {
      title = running ? "释放点动按钮，既有长动保持仍有效" : "释放点动按钮";
      text = running ? "系统原先已处于长动保持状态，释放点动按钮后由保持支路继续供电。" : "点动通路断开，KM1释放，电机立即停止。";
    }

    return { schemaVersion: "1.0", moduleId: "ch02_mixed_jog_continuous", title, text, tone };
  }

  function buildReplaySteps(state, result) {
    const operation = state.operationState;
    const steps = [
      { id: "power", title: "控制电源", text: operation.power === "closed" ? "QF1闭合，控制回路具备供电条件。" : "QF1断开，所有控制支路无电。" },
      { id: "input", title: "操作输入", text: operation.start === "pressed" || operation.jog === "pressed" ? "启动或点动按钮正在建立输入通路。" : "瞬时按钮均已释放。" },
      { id: "control", title: operation.variant === "scheme3" ? "K与KM1状态" : "KM1状态", text: operation.variant === "scheme3" ? `K${result.stableDeviceStates.K ? "得电" : "失电"}，KM1${result.stableDeviceStates.KM1 ? "得电" : "失电"}。` : `KM1${result.stableDeviceStates.KM1 ? "得电" : "失电"}。` },
      { id: "load", title: "主回路与电机", text: result.motorStates.M.running ? "KM1主触点闭合，三相电源完整到达M，电机运行。" : "KM1主触点断开或保护条件不满足，M停止。" }
    ];
    return steps;
  }

  platform.moduleTeaching.ch02MixedJogContinuous = Object.freeze({ buildFeedback, buildReplaySteps });
})(globalThis);
