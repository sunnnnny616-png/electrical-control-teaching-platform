(function installDirectStartRuntime(global) {
  "use strict";

  const platform = global.ECTPPlatform = global.ECTPPlatform || {};
  platform.chapterRuntimes = platform.chapterRuntimes || {};

  const clone = (value) => value === undefined ? undefined : JSON.parse(JSON.stringify(value));
  const escapeHtml = (value) => String(value).replace(/[&<>"']/g, (character) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#39;"
  })[character]);
  const pathData = (points) => points.map((point, index) => `${index ? "L" : "M"}${point.x} ${point.y}`).join(" ");

  function createDirectStartFacade(options) {
    const { moduleId, routeId, circuitData, mode, copy } = options;
    const contracts = platform.contracts;
    let context = null;
    let state = null;
    let solverResult = null;
    let feedback = null;
    let replaySteps = [];
    let replayIndex = -1;
    let replayTimer = null;
    let playbackSpeed = 1;

    function createOperationState() {
      return mode === "jog"
        ? { qf: "open", jog: "released", fr: "normal" }
        : { qf: "open", start: "released", stop: "released", fr: "normal" };
    }

    function evaluate(operation, previousKm = false, lastAction = "initial") {
      const powerClosed = operation.qf === "closed";
      const protectionNormal = operation.fr === "normal";
      let kmEnergized = false;
      if (mode === "jog") {
        kmEnergized = powerClosed && protectionNormal && operation.jog === "pressed";
      } else {
        const stopConductive = operation.stop !== "pressed";
        const startPath = operation.start === "pressed";
        const selfHoldPath = Boolean(previousKm);
        kmEnergized = powerClosed && protectionNormal && stopConductive && (startPath || selfHoldPath);
      }
      const motorRunning = powerClosed && protectionNormal && kmEnergized;
      const mainWireIds = circuitData.wires.filter((wire) => wire.circuitDomain === "main").map((wire) => wire.wireId);
      const controlWireIds = circuitData.wires.filter((wire) => wire.circuitDomain === "control").map((wire) => wire.wireId);
      const supplyWireIds = circuitData.wires.filter((wire) => wire.group === "control_supply").map((wire) => wire.wireId);
      const controlComplete = kmEnergized;
      const edgeStates = {};
      circuitData.deviceEdges.forEach((edge) => {
        if (edge.behavior === "QF") edgeStates[edge.edgeId] = powerClosed;
        else if (edge.behavior === "COIL") edgeStates[edge.edgeId] = kmEnergized;
        else if (edge.behavior === "NC") edgeStates[edge.edgeId] = edge.edgeId.includes("fr") ? protectionNormal : operation.stop !== "pressed";
        else if (edge.edgeId.includes("aux")) edgeStates[edge.edgeId] = kmEnergized;
        else if (edge.edgeId.includes("sb1") || edge.edgeId.endsWith("sb_no")) edgeStates[edge.edgeId] = mode === "jog" ? operation.jog === "pressed" : operation.start === "pressed";
        else edgeStates[edge.edgeId] = kmEnergized;
      });
      return {
        ...contracts.createEmptySolverResult(moduleId),
        stableDeviceStates: { KM: kmEnergized },
        edgeStates,
        activeMainWireIds: motorRunning ? mainWireIds : [],
        activeControlWireIds: controlComplete ? controlWireIds : powerClosed ? supplyWireIds : [],
        partialWireIds: powerClosed && !controlComplete ? supplyWireIds : [],
        motorStates: { M: { running: motorRunning, direction: motorRunning ? "forward" : "none" } },
        protectionStates: { FR: { state: operation.fr, tripped: operation.fr === "overload" } },
        converged: true,
        iterationCount: mode === "jog" ? 1 : 2,
        lastAction: { message: lastAction },
        extension: {
          selfHoldConductive: mode === "self_hold" && kmEnergized,
          controlSupplyBoundary: "QF/FU downstream two-wire control supply",
          referencePages: [...circuitData.referencePages]
        }
      };
    }

    function setFeedback(title, text, tone = "info", actionId = "idle") {
      feedback = { title, text, tone, actionId };
      context?.services?.setActionFeedback?.({ label: title, feedbackText: text, tone, actionId });
    }

    function snapshot(label = "snapshot") {
      return {
        label,
        operation: clone(state.operation),
        kmEnergized: Boolean(solverResult.stableDeviceStates.KM),
        motorRunning: Boolean(solverResult.motorStates.M.running),
        activeMainWireIds: [...solverResult.activeMainWireIds],
        activeControlWireIds: [...solverResult.activeControlWireIds],
        partialWireIds: [...solverResult.partialWireIds]
      };
    }

    function replayStep(title, text, display, tone = "standard") {
      return Object.freeze({ title, text, tone, display: clone(display) });
    }

    function setReplay(steps) {
      pausePlayback();
      replaySteps = steps;
      replayIndex = -1;
    }

    function solveNow(message) {
      solverResult = evaluate(state.operation, solverResult?.stableDeviceStates?.KM, message);
      return solverResult;
    }

    function runMomentary(key, pressedMessage, releasedMessage) {
      const before = snapshot("before");
      state.operation[key] = "pressed";
      solveNow(pressedMessage);
      const pressed = snapshot("pressed");
      state.operation[key] = "released";
      solveNow(releasedMessage);
      const final = snapshot("released");
      return { before, pressed, final };
    }

    function dispatchAction(actionInput) {
      const action = typeof actionInput === "string" ? contracts.createAction(actionInput) : actionInput;
      const report = contracts.validateAction(action);
      if (!report.valid) throw new Error(`Invalid ${moduleId} action: ${report.errors.join("; ")}`);

      if (action.type === "POWER_CLOSE") {
        const before = snapshot("power open");
        state.operation.qf = "closed";
        solveNow("QF close");
        const after = snapshot("power closed");
        setFeedback(copy.powerTitle, copy.powerOn, "success", "qf");
        setReplay([
          replayStep("QF 合闸", "三极主触点同时闭合，主回路及控制取电支路具备供电条件。", after),
          replayStep("系统待命", mode === "jog" ? "仍需按住 SB，KM 线圈才会得电。" : "仍需按下 SB1，KM1 才能建立自锁。", after, "final")
        ]);
      } else if (action.type === "POWER_OPEN") {
        state.operation.qf = "open";
        if (mode === "jog") state.operation.jog = "released";
        solveNow("QF open");
        const after = snapshot("power open");
        setFeedback(copy.powerTitle, copy.powerOff, "info", "qf");
        setReplay([replayStep("QF 分闸", "三极主触点同时断开，KM 失电，电动机停止。", after, "final")]);
      } else if (action.type === "JOG_PRESS" && mode === "jog") {
        const before = snapshot("before jog");
        state.operation.jog = "pressed";
        solveNow("SB jog press");
        const pressed = snapshot("jog pressed");
        const successful = pressed.motorRunning;
        setFeedback("SB 点动反馈", successful ? "按住 SB 后控制回路闭合，KM 得电，电动机运行。" : state.operation.fr === "overload" ? "FR 已过载，保护常闭触点断开，KM 不能得电。" : "QF 未合闸，按下 SB 也不能启动。", successful ? "success" : state.operation.fr === "overload" ? "warning" : "info", "sb");
        setReplay(successful ? [
          replayStep("系统待命", "QF 已合闸、FR 正常，电路等待点动指令。", before),
          replayStep("按住 SB", "SB 常开触点闭合，控制回路形成完整通路。", pressed, "key"),
          replayStep("KM 线圈得电", "KM 三极主触点同步闭合。", pressed, "key"),
          replayStep("电动机运行", "三相电流经 QF、FU1、KM、FR 进入电动机。", pressed, "final")
        ] : [
          replayStep("按住 SB", "点动按钮已动作，但启动条件仍需由 Solver 判断。", pressed, "key"),
          replayStep("启动被阻止", state.operation.fr === "overload" ? "FR 常闭触点处于断开状态。" : "QF 处于分闸状态。", pressed, "blocked")
        ]);
      } else if (action.type === "JOG_RELEASE" && mode === "jog") {
        if (state.operation.jog !== "pressed") return buildDispatchResult(action);
        const before = snapshot("jog running");
        state.operation.jog = "released";
        solveNow("SB jog release");
        const after = snapshot("jog released");
        setFeedback("SB 点动反馈", "松开 SB 后控制回路立即断开，KM 释放，电动机停止。", "info", "sb");
        setReplay([
          replayStep("松开 SB", "SB 常开触点恢复断开。", before, "key"),
          replayStep("KM 线圈失电", "点动线路没有自锁支路，线圈不能继续保持。", after, "key"),
          replayStep("电动机停止", "KM 三极主触点断开，主回路失电。", after, "final")
        ]);
      } else if (action.type === "START_PRIMARY_PRESS" && mode === "self_hold") {
        const cycle = runMomentary("start", "SB1 press", "SB1 release");
        const successful = cycle.final.motorRunning;
        setFeedback("SB1 启动反馈", successful ? "SB1 松开后，KM1 辅助常开触点维持线圈得电，电动机连续运行。" : state.operation.fr === "overload" ? "FR1 已过载，启动回路被保护触点切断。" : "QF1 未合闸，启动按钮不能使 KM1 得电。", successful ? "success" : state.operation.fr === "overload" ? "warning" : "info", "sb1");
        setReplay(successful ? [
          replayStep("按下 SB1", "启动按钮常开触点闭合。", cycle.pressed, "key"),
          replayStep("KM1 线圈得电", "KM1 主触点和辅助常开触点同时闭合。", cycle.pressed, "key"),
          replayStep("SB1 松开", "启动按钮复位，电流改经 KM1 辅助触点。", cycle.final, "key"),
          replayStep("自锁连续运行", "主回路持续接通，电动机保持运行。", cycle.final, "final")
        ] : [replayStep("启动条件不满足", state.operation.fr === "overload" ? "FR1 保护触点断开。" : "QF1 尚未合闸。", cycle.final, "blocked")]);
      } else if (action.type === "STOP_PRIMARY_PRESS" && mode === "self_hold") {
        const cycle = runMomentary("stop", "SB2 press", "SB2 release");
        setFeedback("SB2 停止反馈", "SB2 常闭触点断开，自锁解除，KM1 释放，电动机停止。", "info", "sb2");
        setReplay([
          replayStep("按下 SB2", "停止按钮常闭触点断开，控制回路被切开。", cycle.pressed, "key"),
          replayStep("KM1 释放", "线圈失电后主触点与辅助触点同时复位。", cycle.pressed, "key"),
          replayStep("电动机停止", "SB2 松开只恢复停止触点，不会自动重新启动。", cycle.final, "final")
        ]);
      } else if (action.type === "PROTECTION_TOGGLE") {
        state.operation.fr = "overload";
        if (mode === "jog") state.operation.jog = "released";
        solveNow("FR overload");
        const after = snapshot("overload");
        setFeedback("FR 过载反馈", "FR 过载动作，控制回路常闭触点断开，KM 失电，电动机停止。", "warning", "fr_trip");
        setReplay([
          replayStep("FR 检测到过载", "热继电器进入过载状态。", after, "blocked"),
          replayStep("保护触点断开", "控制回路在 FR 常闭触点处被切断。", after, "blocked"),
          replayStep("电动机停止", "KM 释放，三极主触点断开。", after, "final")
        ]);
      } else if (action.type === "PROTECTION_RESET") {
        state.operation.fr = "normal";
        solveNow("FR reset");
        const after = snapshot("protection reset");
        setFeedback("FR 复位反馈", "FR 已恢复正常，但系统不会自动重启，需重新执行启动操作。", "info", "fr_reset");
        setReplay([
          replayStep("FR 复位", "保护常闭触点重新闭合。", after),
          replayStep("保持停机", "复位不等于启动，KM 仍保持释放。", after, "final")
        ]);
      } else if (action.type === "RESET_MODULE") {
        reset();
      } else {
        throw new Error(`${moduleId} does not support ${action.type}`);
      }

      context?.services?.renderShell?.();
      return buildDispatchResult(action);
    }

    function buildDispatchResult(action) {
      return {
        action,
        state: getStateSnapshot(),
        solverResult: normalizeSolverResult(),
        operationViewModel: getOperationViewModel(),
        statusViewModel: getStatusViewModel(),
        feedback: buildTeachingFeedback()
      };
    }

    function getStateSnapshot() {
      const km = Boolean(solverResult.stableDeviceStates.KM);
      const running = Boolean(solverResult.motorStates.M.running);
      const controls = mode === "jog" ? { jog: state.operation.jog } : { start: state.operation.start, stop: state.operation.stop };
      return {
        schemaVersion: contracts.facadeSchemaVersion,
        moduleId,
        routeId,
        operation: { power: state.operation.qf, controls, protections: { overload: state.operation.fr } },
        devices: { primaryContactor: { id: mode === "jog" ? "KM" : "KM1", energized: km }, selfHoldContact: { conductive: mode === "self_hold" && km } },
        motor: { id: "M", state: running ? "running" : "stopped", running, direction: running ? "forward" : "none" }
      };
    }

    function normalizeSolverResult() {
      return clone(solverResult);
    }

    function getOperationViewModel() {
      const current = getStateSnapshot();
      const powerClosed = current.operation.power === "closed";
      const overload = current.operation.protections.overload === "overload";
      const controls = mode === "jog" ? [
        { slot: "primary", visible: false },
        { slot: "secondary", visible: true, label: "SB 点动", stateText: current.operation.controls.jog === "pressed" ? "正在按住" : "按住运行 / 松开停止", buttonClass: "forward", pressAction: "JOG_PRESS", releaseAction: "JOG_RELEASE" },
        { slot: "tertiary", visible: false }, { slot: "quaternary", visible: false }
      ] : [
        { slot: "primary", visible: true, label: "启动 SB1", stateText: current.motor.running ? "已自锁运行" : "待命", buttonClass: "forward", action: "START_PRIMARY_PRESS" },
        { slot: "secondary", visible: true, label: "停止 SB2", stateText: current.motor.running ? "可停止" : "已停止", buttonClass: "stop", action: "STOP_PRIMARY_PRESS" },
        { slot: "tertiary", visible: false }, { slot: "quaternary", visible: false }
      ];
      return {
        schemaVersion: contracts.facadeSchemaVersion,
        moduleId,
        power: { deviceId: mode === "jog" ? "QF" : "QF1", closed: powerClosed, closeLabel: `${mode === "jog" ? "QF" : "QF1"} 合闸`, openLabel: `${mode === "jog" ? "QF" : "QF1"} 分闸`, closeEnabled: !powerClosed, openEnabled: powerClosed },
        controls,
        protection: { slot: "primary", visible: true, label: `${mode === "jog" ? "FR" : "FR1"} 过载`, resetLabel: `${mode === "jog" ? "FR" : "FR1"} 复位`, tripped: overload, toggleAction: "PROTECTION_TOGGLE", resetAction: "PROTECTION_RESET" },
        actionStates: [
          { id: "qf", label: mode === "jog" ? "QF" : "QF1", currentState: powerClosed ? "closed" : "open", availableTransitions: [powerClosed ? "open" : "close"], onAction: powerClosed ? "POWER_OPEN" : "POWER_CLOSE", feedbackText: powerClosed ? "当前已合闸。" : "当前处于分闸状态。" },
          { id: mode === "jog" ? "sb" : "sb1", label: mode === "jog" ? "SB 点动" : "启动 SB1", currentState: current.motor.running ? "running" : "ready", availableTransitions: ["operate"], onAction: mode === "jog" ? "JOG_PRESS" : "START_PRIMARY_PRESS", feedbackText: mode === "jog" ? "按住运行，松开停止。" : "启动后由 KM1 辅助触点自锁。" },
          ...(mode === "self_hold" ? [{ id: "sb2", label: "停止 SB2", currentState: current.motor.running ? "running" : "stopped", availableTransitions: ["stop"], onAction: "STOP_PRIMARY_PRESS", feedbackText: "停止按钮切断自锁回路。" }] : []),
          { id: "fr_trip", label: "FR 过载", currentState: overload ? "overload" : "normal", availableTransitions: ["trip"], onAction: "PROTECTION_TOGGLE", feedbackText: "过载会切断控制回路。" },
          { id: "fr_reset", label: "FR 复位", currentState: overload ? "overload" : "normal", availableTransitions: ["reset"], onAction: "PROTECTION_RESET", feedbackText: "复位后不会自动重启。" }
        ]
      };
    }

    function getStatusViewModel() {
      const current = getStateSnapshot();
      const powerClosed = current.operation.power === "closed";
      const overload = current.operation.protections.overload === "overload";
      const kmLabel = mode === "jog" ? "KM" : "KM1";
      const rows = [
        { id: "power", label: mode === "jog" ? "QF" : "QF1", value: powerClosed ? "已合闸" : "断开", tone: powerClosed ? "on" : "off" },
        { id: "contactor", label: kmLabel, value: current.devices.primaryContactor.energized ? "得电" : "失电", tone: current.devices.primaryContactor.energized ? "forward" : "off" },
        { id: "motor", label: "M", value: current.motor.running ? "运行" : "停止", tone: current.motor.running ? "forward" : "off" },
        { id: "protection", label: mode === "jog" ? "FR" : "FR1", value: overload ? "已过载" : "正常", tone: overload ? "error" : "on" }
      ];
      if (mode === "self_hold") rows.splice(2, 0, { id: "selfHold", label: "自锁", value: current.devices.selfHoldContact.conductive ? "已建立" : "未建立", tone: current.devices.selfHoldContact.conductive ? "forward" : "off" });
      return { schemaVersion: contracts.facadeSchemaVersion, moduleId, rows };
    }

    function buildTeachingFeedback() {
      return clone(feedback);
    }

    function buildReplaySteps() {
      return clone(replaySteps);
    }

    function wireMarkup(display) {
      const active = new Set([...(display.activeMainWireIds || []), ...(display.activeControlWireIds || [])]);
      const partial = new Set(display.partialWireIds || []);
      return circuitData.wires.map((wire) => {
        const d = pathData(wire.routePoints);
        const domainClass = wire.circuitDomain === "main" ? "ch01-wire-main" : "ch01-wire-control";
        const overlay = active.has(wire.wireId) ? `<path class="ch01-wire-flow ${domainClass}" d="${d}" />` : partial.has(wire.wireId) ? `<path class="ch01-wire-partial" d="${d}" />` : "";
        return `<g data-wire-id="${wire.wireId}"><path class="ch01-wire-base ${domainClass}" d="${d}" />${overlay}</g>`;
      }).join("");
    }

    function poleContact(x, y, closed, label) {
      return `<g><circle cx="${x}" cy="${y}" r="4" class="ch01-terminal"/><circle cx="${x}" cy="${y + 45}" r="4" class="ch01-terminal"/><line x1="${x}" y1="${y}" x2="${closed ? x : x + 20}" y2="${y + 38}" class="ch01-contact ${closed ? "is-closed" : ""}"/><text x="${x - 18}" y="${y + 25}" class="ch01-device-label">${label}</text></g>`;
    }

    function renderSvg(display) {
      const powerClosed = display.operation.qf === "closed";
      const km = display.kmEnergized;
      const overload = display.operation.fr === "overload";
      const startClosed = mode === "jog" ? display.operation.jog === "pressed" : display.operation.start === "pressed";
      const stopClosed = mode === "jog" ? true : display.operation.stop !== "pressed";
      const qfLabel = mode === "jog" ? "QF" : "QF1";
      const kmLabel = mode === "jog" ? "KM" : "KM1";
      const frLabel = mode === "jog" ? "FR" : "FR1";
      const control = mode === "jog" ? `
        <g data-action="JOG_PRESS" data-release-action="JOG_RELEASE" class="ch01-clickable">${poleContact(690,158,startClosed,"SB")}</g>
        <g class="ch01-coil ${km ? "is-active" : ""}"><rect x="790" y="150" width="80" height="60" rx="8"/><text x="830" y="187">KM</text></g>
        <g data-action="PROTECTION_TOGGLE" class="ch01-clickable">${poleContact(970,158,!overload,"FR")}</g>
        <g class="ch01-fuse ch01-fuse-control"><rect x="540" y="166" width="50" height="28"/><line x1="548" y1="180" x2="582" y2="180"/><text x="565" y="145">FU2</text></g>
        <g class="ch01-fuse ch01-fuse-control"><rect x="1070" y="166" width="50" height="28"/><line x1="1078" y1="180" x2="1112" y2="180"/></g>
      ` : `
        <g data-action="START_PRIMARY_PRESS" class="ch01-clickable">${poleContact(695,128,startClosed,"SB1")}</g>
        <g class="ch01-aux ${km ? "is-active" : ""}">${poleContact(695,203,km,"KM1")}</g>
        <g data-action="STOP_PRIMARY_PRESS" class="ch01-clickable">${poleContact(870,128,stopClosed,"SB2")}</g>
        <g class="ch01-coil ${km ? "is-active" : ""}"><rect x="960" y="120" width="80" height="60" rx="8"/><text x="1000" y="157">KM1</text></g>
        <g data-action="PROTECTION_TOGGLE" class="ch01-clickable">${poleContact(1130,128,!overload,"FR1")}</g>
        <g class="ch01-fuse ch01-fuse-control"><rect x="540" y="136" width="50" height="28"/><line x1="548" y1="150" x2="582" y2="150"/><text x="565" y="115">FU</text></g>
      `;
      return `<svg class="ch01-circuit-svg" data-module="${moduleId}" viewBox="0 0 1280 620" role="img" aria-label="${escapeHtml(copy.title)}电路图">
        <text x="42" y="38" class="ch01-zone-title main">主电路</text><text x="480" y="38" class="ch01-zone-title control">控制电路</text>
        <g class="ch01-wires">${wireMarkup(display)}</g>
        <g class="ch01-supplies"><text x="120" y="42">L1</text><text x="210" y="42">L2</text><text x="300" y="42">L3</text></g>
        <g data-action="${powerClosed ? "POWER_OPEN" : "POWER_CLOSE"}" class="ch01-clickable ch01-qf">${poleContact(120,100,powerClosed,qfLabel)}${poleContact(210,100,powerClosed,"")}${poleContact(300,100,powerClosed,"")}</g>
        <g class="ch01-fuse">${[120,210,300].map((x,index)=>`<rect x="${x-10}" y="170" width="20" height="45"/><line x1="${x}" y1="176" x2="${x}" y2="209"/>${index===0?'<text x="75" y="198">FU1</text>':''}`).join("")}</g>
        <g class="ch01-km-main ${km ? "is-active" : ""}">${poleContact(120,260,km,kmLabel)}${poleContact(210,260,km,"")}${poleContact(300,260,km,"")}</g>
        <g data-action="PROTECTION_TOGGLE" class="ch01-fr-main ch01-clickable ${overload ? "is-overload" : ""}"><rect x="90" y="350" width="240" height="55" rx="8"/><path d="M110 378 h35 l12 -14 l18 28 l18 -28 l18 28 l18 -28 l18 14 h55"/><text x="48" y="384">${frLabel}</text></g>
        <g class="ch01-motor ${display.motorRunning ? "is-running" : ""} ${overload ? "is-fault" : ""}"><circle cx="210" cy="525" r="62"/><text x="210" y="536">M</text><path class="ch01-rotor" d="M210 482 l14 30 l30 13 l-30 14 l-14 30 l-14-30 l-30-14 l30-13z"/></g>
        <g class="ch01-control-components">${control}</g>
        <g class="ch01-state-badge ${overload ? "error" : display.motorRunning ? "running" : "idle"}"><rect x="500" y="470" width="680" height="92" rx="16"/><text x="530" y="510">${overload ? "保护动作：FR 常闭触点断开，KM 释放" : display.motorRunning ? mode === "jog" ? "运行：SB 按住，KM 得电，电机转动" : "运行：KM1 自锁保持，电机连续转动" : powerClosed ? "待命：电源已接通，等待操作" : "断电：QF 处于分闸状态"}</text><text x="530" y="542" class="sub">${mode === "jog" ? "点动无自锁，松开按钮立即停止" : "SB1 启动 / SB2 停止 / FR1 过载保护"}</text></g>
      </svg>`;
    }

    function renderPlaybackDom() {
      if (!context) return;
      const doc = global.document;
      const list = doc.getElementById("principleStepList");
      const show = doc.getElementById("showPrinciplePlayback");
      const prev = doc.getElementById("playbackPrev");
      const toggle = doc.getElementById("playbackToggle");
      const next = doc.getElementById("playbackNext");
      const note = doc.getElementById("currentStepText");
      if (!list || !show || !prev || !toggle || !next || !note) return;
      show.disabled = replaySteps.length === 0;
      prev.disabled = replayIndex <= 0;
      next.disabled = replayIndex < 0 || replayIndex >= replaySteps.length - 1;
      toggle.disabled = replaySteps.length === 0;
      toggle.textContent = replayTimer ? "暂停" : "播放";
      list.innerHTML = replaySteps.length ? replaySteps.map((step,index)=>`<div class="principle-step-item ${index < replayIndex ? "complete" : index === replayIndex ? "active" : "pending"}"><span class="principle-step-marker">${index < replayIndex ? "✓" : index === replayIndex ? "●" : "○"}</span><span class="principle-step-text">${escapeHtml(step.title)}：${escapeHtml(step.text)}</span></div>`).join("") : '<div class="principle-step-item pending"><span class="principle-step-marker">○</span><span class="principle-step-text">执行一次操作后，可点击“展示原理”查看教学步骤。</span></div>';
      note.textContent = replayIndex >= 0 ? `当前步骤：${replaySteps[replayIndex].title}。${replaySteps[replayIndex].text}` : "当前步骤：等待操作。";
      [0.5,1,1.5].forEach((speed) => doc.getElementById(`playbackSpeed${speed === 0.5 ? "05" : speed === 1 ? "10" : "15"}`)?.classList.toggle("active", playbackSpeed === speed));
    }

    function currentDisplay() {
      return replayIndex >= 0 && replaySteps[replayIndex] ? replaySteps[replayIndex].display : snapshot("current");
    }

    function render() {
      if (!context) return;
      const canvas = global.document.getElementById("chapterModuleCanvas");
      if (canvas) canvas.innerHTML = `<div class="ch01-native-module" data-module="${moduleId}">${renderSvg(currentDisplay())}</div>`;
      renderPlaybackDom();
    }

    function pausePlayback() {
      if (replayTimer !== null && context) context.scope.clearInterval(replayTimer);
      replayTimer = null;
    }

    function stepReplay(delta) {
      if (!replaySteps.length) return;
      replayIndex = Math.max(0, Math.min(replaySteps.length - 1, replayIndex + delta));
      if (replayIndex === replaySteps.length - 1) pausePlayback();
      render();
    }

    function togglePlayback() {
      if (!replaySteps.length || !context) return;
      if (replayTimer !== null) {
        pausePlayback();
        render();
        return;
      }
      if (replayIndex < 0 || replayIndex >= replaySteps.length - 1) replayIndex = 0;
      replayTimer = context.scope.interval(() => stepReplay(1), 1600 / playbackSpeed);
      render();
    }

    function bindPlaybackControls() {
      const doc = global.document;
      const bindings = [
        ["showPrinciplePlayback", () => { replayIndex = replaySteps.length ? 0 : -1; render(); }],
        ["playbackPrev", () => stepReplay(-1)], ["playbackNext", () => stepReplay(1)], ["playbackToggle", togglePlayback],
        ["playbackSpeed05", () => { playbackSpeed = 0.5; pausePlayback(); render(); }],
        ["playbackSpeed10", () => { playbackSpeed = 1; pausePlayback(); render(); }],
        ["playbackSpeed15", () => { playbackSpeed = 1.5; pausePlayback(); render(); }]
      ];
      bindings.forEach(([id, handler]) => doc.getElementById(id)?.addEventListener("click", (event) => {
        event.preventDefault(); event.stopImmediatePropagation(); handler();
      }, { capture: true, signal: context.scope.signal }));
      const canvas = doc.getElementById("chapterModuleCanvas");
      canvas?.addEventListener("click", (event) => {
        const target = event.target.closest?.("[data-action]");
        if (!target || target.dataset.releaseAction) return;
        dispatchAction(target.dataset.action);
      }, { signal: context.scope.signal });
      canvas?.addEventListener("pointerdown", (event) => {
        const target = event.target.closest?.("[data-release-action]");
        if (!target) return;
        event.preventDefault();
        dispatchAction(target.dataset.action);
      }, { signal: context.scope.signal });
      ["pointerup", "pointerleave", "pointercancel"].forEach((eventName) => canvas?.addEventListener(eventName, () => {
        if (mode === "jog" && state.operation.jog === "pressed") dispatchAction("JOG_RELEASE");
      }, { signal: context.scope.signal }));
    }

    function validateGeometry() {
      const errors = [];
      const unique = (items, key, label) => {
        const seen = new Set();
        items.forEach((item) => { if (seen.has(item[key])) errors.push(`duplicate ${label}: ${item[key]}`); seen.add(item[key]); });
        return seen;
      };
      const ports = unique(circuitData.ports, "portId", "portId");
      unique(circuitData.wires, "wireId", "wireId");
      unique(circuitData.components, "componentId", "componentId");
      unique(circuitData.deviceEdges, "edgeId", "edgeId");
      circuitData.components.forEach((component) => {
        const geometry = component.geometry || {};
        ["x", "y", "width", "height", "orientation"].forEach((field) => {
          if (!Number.isFinite(geometry[field])) errors.push(`missing geometry.${field}: ${component.componentId}`);
        });
      });
      circuitData.wires.forEach((wire) => {
        if (!ports.has(wire.fromPort)) errors.push(`missing fromPort: ${wire.fromPort}`);
        if (!ports.has(wire.toPort)) errors.push(`missing toPort: ${wire.toPort}`);
        if (!Array.isArray(wire.routePoints) || wire.routePoints.length < 2) errors.push(`invalid routePoints: ${wire.wireId}`);
      });
      circuitData.deviceEdges.forEach((edge) => {
        if (!ports.has(edge.fromPort)) errors.push(`missing edge fromPort: ${edge.fromPort}`);
        if (!ports.has(edge.toPort)) errors.push(`missing edge toPort: ${edge.toPort}`);
      });
      return { valid: errors.length === 0, errors, counts: { ports: circuitData.ports.length, wires: circuitData.wires.length, components: circuitData.components.length, deviceEdges: circuitData.deviceEdges.length, danglingWires: errors.filter((error)=>error.includes("Port")).length } };
    }

    function runTests() {
      const tests = [];
      const test = (name, assertion) => tests.push({ name, passed: Boolean(assertion) });
      const open = createOperationState();
      test("QF open prevents energization", !evaluate(open, false).motorStates.M.running);
      if (mode === "jog") {
        const ready = { qf: "closed", jog: "pressed", fr: "normal" };
        test("pressed jog starts motor", evaluate(ready, false).motorStates.M.running);
        test("released jog stops motor", !evaluate({ ...ready, jog: "released" }, true).motorStates.M.running);
        test("overload blocks jog", !evaluate({ ...ready, fr: "overload" }, false).motorStates.M.running);
      } else {
        const press = { qf: "closed", start: "pressed", stop: "released", fr: "normal" };
        const energized = evaluate(press, false).stableDeviceStates.KM;
        test("start press energizes KM1", energized);
        test("self-hold survives release", evaluate({ ...press, start: "released" }, energized).motorStates.M.running);
        test("stop press drops KM1", !evaluate({ ...press, start: "released", stop: "pressed" }, true).stableDeviceStates.KM);
        test("overload drops KM1", !evaluate({ ...press, start: "released", fr: "overload" }, true).stableDeviceStates.KM);
        test("reset does not auto restart", !evaluate({ ...press, start: "released", fr: "normal" }, false).motorStates.M.running);
      }
      const geometry = validateGeometry();
      test("geometry and topology valid", geometry.valid);
      return { passed: tests.every((item) => item.passed), total: tests.length, passedCount: tests.filter((item)=>item.passed).length, tests, geometry };
    }

    function reset() {
      pausePlayback();
      state = { operation: createOperationState() };
      solverResult = evaluate(state.operation, false, "module reset");
      feedback = { title: copy.initialTitle, text: copy.initialText, tone: "info", actionId: "idle" };
      replaySteps = [];
      replayIndex = -1;
      if (context) render();
      return getStateSnapshot();
    }

    reset();
    return Object.freeze({
      createInitialState: reset,
      getStateSnapshot,
      dispatchAction,
      solve: (message = "facade solve") => { solveNow(message); return normalizeSolverResult(); },
      normalizeSolverResult,
      getOperationViewModel,
      getStatusViewModel,
      buildTeachingFeedback,
      buildReplaySteps,
      mount: (_payload, nextContext) => { context = nextContext; bindPlaybackControls(); },
      render,
      reset,
      pause: pausePlayback,
      resume: () => undefined,
      unmount: () => { pausePlayback(); const canvas = global.document.getElementById("chapterModuleCanvas"); if (canvas) canvas.innerHTML = ""; context = null; },
      validateGeometry,
      runTests
    });
  }

  platform.chapterRuntimes.createDirectStartFacade = createDirectStartFacade;
})(globalThis);
