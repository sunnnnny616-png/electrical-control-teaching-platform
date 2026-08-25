(function installDirectStartRuntime(global) {
  "use strict";

  const platform = global.ECTPPlatform = global.ECTPPlatform || {};
  platform.chapterRuntimes = platform.chapterRuntimes || {};

  const clone = (value) => value === undefined ? undefined : JSON.parse(JSON.stringify(value));
  const escapeHtml = (value) => String(value).replace(/[&<>"']/g, (character) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#39;"
  })[character]);
  const pathData = (points) => points.map((point, index) => `${index ? "L" : "M"}${point.x} ${point.y}`).join(" ");

  function appendGraphItem(adjacency, fromPort, toPort, item) {
    if (!adjacency.has(fromPort)) adjacency.set(fromPort, []);
    if (!adjacency.has(toPort)) adjacency.set(toPort, []);
    adjacency.get(fromPort).push({ to: toPort, item });
    adjacency.get(toPort).push({ to: fromPort, item });
  }

  function findPathItems(adjacency, startPort, endPort) {
    if (startPort === endPort) return [];
    const queue = [startPort];
    const visited = new Set(queue);
    const previous = new Map();
    while (queue.length) {
      const current = queue.shift();
      for (const neighbor of adjacency.get(current) || []) {
        if (visited.has(neighbor.to)) continue;
        visited.add(neighbor.to);
        previous.set(neighbor.to, { port: current, item: neighbor.item });
        if (neighbor.to === endPort) {
          const path = [];
          let cursor = endPort;
          while (previous.has(cursor)) {
            const step = previous.get(cursor);
            path.unshift(step.item);
            cursor = step.port;
          }
          return path;
        }
        queue.push(neighbor.to);
      }
    }
    return [];
  }

  function collectReachablePorts(adjacency, startPort) {
    const visited = new Set([startPort]);
    const queue = [startPort];
    while (queue.length) {
      const current = queue.shift();
      (adjacency.get(current) || []).forEach((neighbor) => {
        if (visited.has(neighbor.to)) return;
        visited.add(neighbor.to);
        queue.push(neighbor.to);
      });
    }
    return visited;
  }

  function collectPathMembership(items) {
    const wireIds = new Set();
    const edgeIds = new Set();
    items.forEach((item) => {
      if (item.type === "wire") wireIds.add(item.wireId);
      if (item.type === "edge") edgeIds.add(item.edgeId);
    });
    return { wireIds, edgeIds };
  }

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

    function getEdgeConductive(edge, operation, assumedKm, includeCoil = true) {
      const powerClosed = operation.qf === "closed";
      const protectionNormal = operation.fr === "normal";
      if (edge.behavior === "STATIC") return true;
      if (edge.behavior === "QF") return powerClosed;
      if (edge.behavior === "COIL") return includeCoil;
      if (edge.behavior === "NC") {
        return edge.edgeId.includes("fr") ? protectionNormal : operation.stop !== "pressed";
      }
      if (edge.behavior === "NO") {
        if (edge.edgeId.includes("km")) return Boolean(assumedKm);
        return mode === "jog" ? operation.jog === "pressed" : operation.start === "pressed";
      }
      return false;
    }

    function buildElectricalGraph(domain, operation, assumedKm) {
      const adjacency = new Map();
      circuitData.wires
        .filter((wire) => wire.circuitDomain === domain)
        .forEach((wire) => appendGraphItem(adjacency, wire.fromPort, wire.toPort, { type: "wire", wireId: wire.wireId }));
      circuitData.deviceEdges
        .filter((edge) => edge.circuitDomain === domain && getEdgeConductive(edge, operation, assumedKm, true))
        .forEach((edge) => appendGraphItem(adjacency, edge.fromPort, edge.toPort, { type: "edge", edgeId: edge.edgeId }));
      return adjacency;
    }

    function solveControlCircuit(operation, previousKm) {
      const sourcePort = `${moduleId}__port__ctrl_l`;
      const returnPort = `${moduleId}__port__ctrl_r`;
      const coilEdgeId = circuitData.deviceEdges.find((edge) => edge.behavior === "COIL")?.edgeId;
      let assumedKm = Boolean(previousKm);
      let iterationCount = 0;
      let converged = false;
      let path = [];

      while (iterationCount < 8) {
        iterationCount += 1;
        const graph = buildElectricalGraph("control", operation, assumedKm);
        path = operation.qf === "closed" ? findPathItems(graph, sourcePort, returnPort) : [];
        const nextKm = Boolean(coilEdgeId && path.some((item) => item.edgeId === coilEdgeId));
        if (nextKm === assumedKm) {
          converged = true;
          assumedKm = nextKm;
          break;
        }
        assumedKm = nextKm;
      }

      const graph = buildElectricalGraph("control", operation, assumedKm);
      path = operation.qf === "closed" ? findPathItems(graph, sourcePort, returnPort) : [];
      const membership = collectPathMembership(path);
      const partialWireIds = new Set();
      if (operation.qf === "closed" && !assumedKm) {
        const reachable = collectReachablePorts(graph, sourcePort);
        circuitData.wires.filter((wire) => wire.circuitDomain === "control").forEach((wire) => {
          if (reachable.has(wire.fromPort) && reachable.has(wire.toPort)) partialWireIds.add(wire.wireId);
        });
      }
      return {
        kmEnergized: assumedKm,
        converged,
        iterationCount,
        activeWireIds: membership.wireIds,
        activeEdgeIds: membership.edgeIds,
        partialWireIds
      };
    }

    function solveMainCircuit(operation, kmEnergized) {
      const graph = buildElectricalGraph("main", operation, kmEnergized);
      const phasePorts = [["l1", "m_u"], ["l2", "m_v"], ["l3", "m_w"]];
      const paths = phasePorts.map(([source, load]) => findPathItems(
        graph,
        `${moduleId}__port__${source}`,
        `${moduleId}__port__${load}`
      ));
      const motorRunning = paths.every((path) => path.length > 0);
      const activeWireIds = new Set();
      const activeEdgeIds = new Set();
      if (motorRunning) {
        paths.forEach((path) => {
          const membership = collectPathMembership(path);
          membership.wireIds.forEach((wireId) => activeWireIds.add(wireId));
          membership.edgeIds.forEach((edgeId) => activeEdgeIds.add(edgeId));
        });
      }
      return { motorRunning, activeWireIds, activeEdgeIds };
    }

    function evaluate(operation, previousKm = false, lastAction = "initial") {
      const control = solveControlCircuit(operation, previousKm);
      const main = solveMainCircuit(operation, control.kmEnergized);
      const edgeStates = {};
      circuitData.deviceEdges.forEach((edge) => {
        edgeStates[edge.edgeId] = {
          conductive: edge.behavior === "COIL"
            ? control.kmEnergized
            : getEdgeConductive(edge, operation, control.kmEnergized, false),
          deviceState: edge.behavior === "COIL" || edge.edgeId.includes("km")
            ? (control.kmEnergized ? "energized" : "deenergized")
            : undefined
        };
      });
      return {
        ...contracts.createEmptySolverResult(moduleId),
        stableDeviceStates: { KM: control.kmEnergized },
        edgeStates,
        activeMainWireIds: [...main.activeWireIds],
        activeControlWireIds: [...control.activeWireIds],
        partialWireIds: [...control.partialWireIds],
        motorStates: { M: { running: main.motorRunning, direction: main.motorRunning ? "forward" : "none" } },
        protectionStates: { FR: { state: operation.fr, tripped: operation.fr === "overload" } },
        converged: control.converged,
        iterationCount: control.iterationCount,
        lastAction: { message: lastAction },
        extension: {
          activeControlEdgeIds: [...control.activeEdgeIds],
          activeMainEdgeIds: [...main.activeEdgeIds],
          selfHoldConductive: mode === "self_hold" && control.kmEnergized,
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
        ...(mode === "jog" ? [{ id: "jogButton", label: "SB", value: current.operation.controls.jog === "pressed" ? "正在按下" : "未按下", tone: current.operation.controls.jog === "pressed" ? "forward" : "off" }] : []),
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
        const localWireId = wire.wireId.split("__wire__")[1] || "";
        const phaseIndex = wire.circuitDomain === "main" ? ((Number(localWireId.slice(1)) - 1) % 3) + 1 : 0;
        const phaseClass = phaseIndex ? `ch01-phase-l${phaseIndex}` : "";
        const overlay = active.has(wire.wireId) ? `<path class="ch01-wire-flow ${domainClass} ${phaseClass}" d="${d}" />` : partial.has(wire.wireId) ? `<path class="ch01-wire-partial" d="${d}" />` : "";
        return `<g data-wire-id="${wire.wireId}"><path class="ch01-wire-base ${domainClass} ${phaseClass}" d="${d}" />${overlay}</g>`;
      }).join("");
    }

    function poleContact(x, y, closed, label, height = 45) {
      return `<g><circle cx="${x}" cy="${y}" r="4" class="ch01-terminal"/><circle cx="${x}" cy="${y + height}" r="4" class="ch01-terminal"/><line x1="${x}" y1="${y + 5}" x2="${closed ? x : x + 20}" y2="${y + height - 5}" class="ch01-contact ${closed ? "is-closed" : ""}"/><text x="${x - 18}" y="${y + (height / 2) + 6}" class="ch01-device-label">${label}</text></g>`;
    }

    function horizontalContact(x1, x2, y, closed, label, terminalLeft, terminalRight) {
      const bladeEndX = closed ? x2 - 6 : x2 - 12;
      const bladeEndY = closed ? y : y - 20;
      return `<g><rect class="ch01-hit-target" x="${x1 - 12}" y="${y - 34}" width="${x2 - x1 + 24}" height="68" rx="10"/><circle cx="${x1}" cy="${y}" r="4" class="ch01-terminal"/><circle cx="${x2}" cy="${y}" r="4" class="ch01-terminal"/><line x1="${x1 + 6}" y1="${y}" x2="${bladeEndX}" y2="${bladeEndY}" class="ch01-contact ${closed ? "is-closed" : ""}"/><text x="${(x1 + x2) / 2}" y="${y - 27}" class="ch01-device-label ch01-label-centered">${label}</text><text x="${x1}" y="${y + 24}" class="ch01-terminal-number">${terminalLeft}</text><text x="${x2}" y="${y + 24}" class="ch01-terminal-number">${terminalRight}</text></g>`;
    }

    function targetTerminal(x, y) {
      return `<circle cx="${x}" cy="${y}" r="5" class="ch01-terminal"/><circle cx="${x}" cy="${y}" r="2.1" class="ch01-terminal-core"/>`;
    }

    function targetVerticalDevice(x, top, bottom, closed, kind = "contact") {
      const bladeEndX = closed ? x : x + 19;
      const bladeEndY = closed ? top + 17 : top + 37;
      return `<g class="ch01-device-channel ${kind}"><rect x="${x - 18}" y="${top - 8}" width="36" height="${bottom - top + 16}" rx="11"/><circle cx="${x}" cy="${top + 14}" r="4" class="ch01-contact-fixed"/><circle cx="${x}" cy="${bottom - 14}" r="4" class="ch01-contact-fixed"/><line x1="${x}" y1="${bottom - 20}" x2="${bladeEndX}" y2="${bladeEndY}" class="ch01-contact ${closed ? "is-closed" : ""}"/>${targetTerminal(x, top)}${targetTerminal(x, bottom)}</g>`;
    }

    function targetFuse(x1, x2, y, label = "") {
      return `<g class="ch01-target-fuse"><rect x="${x1}" y="${y - 11}" width="${x2 - x1}" height="22" rx="8"/><line x1="${x1 + 10}" y1="${y}" x2="${x2 - 10}" y2="${y}"/>${targetTerminal(x1, y)}${targetTerminal(x2, y)}${label ? `<text x="${(x1 + x2) / 2}" y="${y - 22}" class="ch01-device-label ch01-label-centered">${label}</text>` : ""}</g>`;
    }

    function renderTargetJogSvg(display) {
      const powerClosed = display.operation.qf === "closed";
      const km = display.kmEnergized;
      const overload = display.operation.fr === "overload";
      const jogPressed = display.operation.jog === "pressed";
      const phases = [[218,"A"],[296,"B"],[370,"C"]];
      const supplies = phases.map(([x,label]) => `<g>${targetTerminal(x,255)}<text x="${x}" y="232" class="ch01-phase-label">${label}</text></g>`).join("");
      const qf = phases.map(([x]) => targetVerticalDevice(x,289,381,powerClosed,"qf")).join("");
      const fu1 = phases.map(([x],index) => `<g class="ch01-target-fuse vertical"><rect x="${x - 12}" y="419" width="24" height="48" rx="7"/><path d="M${x} 426 l-5 9 l10 9 l-10 9 l5 8"/>${targetTerminal(x,425)}${targetTerminal(x,462)}${index === 1 ? `<text x="${x}" y="405" class="ch01-device-label ch01-label-centered">FU1</text>` : ""}</g>`).join("");
      const mainContacts = phases.map(([x]) => targetVerticalDevice(x,569,661,km,"km")).join("");
      const frChannels = phases.map(([x]) => `<g class="ch01-fr-channel ${overload ? "is-overload" : ""}"><rect x="${x - 13}" y="709" width="26" height="58" rx="8"/><path d="M${x - 6} 719 l12 7 l-12 7 l12 7 l-12 7 l12 7"/>${targetTerminal(x,717)}${targetTerminal(x,761)}</g>`).join("");
      const motorFins = [-34,-22,-11,0,11,22,34].map((dx)=>`<line x1="${296 + dx}" y1="886" x2="${296 + dx}" y2="964"/>`).join("");
      return `<svg class="ch01-circuit-svg ch01-target-jog" data-module="${moduleId}" viewBox="0 0 1400 1100" role="img" aria-label="${escapeHtml(copy.title)}电路图">
        <g class="ch01-wires">${wireMarkup(display)}</g>
        <g class="ch01-target-labels"><text x="290" y="1060" class="ch01-zone-title main">主电路</text><text x="820" y="282" class="ch01-zone-title control">控制电路</text></g>
        <g class="ch01-supplies">${supplies}</g>
        <g data-action="${powerClosed ? "POWER_OPEN" : "POWER_CLOSE"}" class="ch01-clickable ch01-qf">${qf}<text x="296" y="274" class="ch01-device-label ch01-label-centered">QF</text></g>
        <g class="ch01-fuse">${fu1}</g>
        <g class="ch01-km-main ${km ? "is-active" : ""}">${mainContacts}<text x="296" y="548" class="ch01-device-label ch01-label-centered">KM</text></g>
        <g data-action="PROTECTION_TOGGLE" class="ch01-clickable ch01-target-fr">${frChannels}<text x="296" y="696" class="ch01-device-label ch01-label-centered">FR</text></g>
        <g class="ch01-target-motor ${display.motorRunning ? "is-running" : ""} ${overload ? "is-fault" : ""}"><rect x="270" y="858" width="52" height="22" rx="6"/>${targetTerminal(218,852)}${targetTerminal(296,852)}${targetTerminal(370,852)}<path d="M218 852 L278 870 M296 852 L296 870 M370 852 L314 870"/><circle cx="296" cy="925" r="58"/><circle cx="250" cy="925" r="15"/><circle cx="342" cy="925" r="15"/><g class="ch01-motor-fins">${motorFins}</g><g class="ch01-rotor"><circle cx="296" cy="925" r="16"/><line x1="272" y1="925" x2="320" y2="925"/><line x1="296" y1="901" x2="296" y2="949"/></g><rect class="ch01-motor-base" x="238" y="984" width="116" height="18" rx="7"/><text x="296" y="1030" class="ch01-device-label ch01-label-centered">M</text></g>
        <g class="ch01-control-components">
          ${targetFuse(416,507,426,"FU2")}${targetFuse(416,507,462)}
          <g data-action="JOG_PRESS" data-release-action="JOG_RELEASE" class="ch01-clickable ch01-target-sb">${horizontalContact(571,672,606,jogPressed,"SB 点动按钮","13","14")}<circle cx="622" cy="568" r="15" class="ch01-push-cap"/><line x1="622" y1="583" x2="622" y2="594" class="ch01-push-stem"/></g>
          <g class="ch01-target-coil ${km ? "is-active" : ""}">${targetTerminal(767,606)}${targetTerminal(1025,606)}<line x1="767" y1="606" x2="910" y2="606"/><rect x="910" y="542" width="122" height="125" rx="14"/><path d="M925 620 C935 570 945 570 955 620 S975 670 985 620 S1005 570 1015 620"/><text x="971" y="522" class="ch01-device-label ch01-label-centered">KM 线圈</text></g>
          <g data-action="PROTECTION_TOGGLE" class="ch01-clickable ch01-target-fr-nc">${horizontalContact(1121,1198,381,!overload,"FR 常闭保护触点","95","96")}<rect x="1109" y="356" width="101" height="50" rx="11"/></g>
        </g>
      </svg>`;
    }

    function renderSvg(display) {
      if (mode === "jog") return renderTargetJogSvg(display);
      const powerClosed = display.operation.qf === "closed";
      const km = display.kmEnergized;
      const overload = display.operation.fr === "overload";
      const startClosed = mode === "jog" ? display.operation.jog === "pressed" : display.operation.start === "pressed";
      const stopClosed = mode === "jog" ? true : display.operation.stop !== "pressed";
      const qfLabel = mode === "jog" ? "QF" : "QF1";
      const kmLabel = mode === "jog" ? "KM" : "KM1";
      const frLabel = mode === "jog" ? "FR" : "FR1";
      const control = mode === "jog" ? `
        <g data-action="JOG_PRESS" data-release-action="JOG_RELEASE" class="ch01-clickable">${horizontalContact(650,730,180,startClosed,"SB","13","14")}</g>
        <g class="ch01-coil ${km ? "is-active" : ""}"><rect x="790" y="150" width="80" height="60" rx="8"/><text x="830" y="187">KM</text><text x="790" y="230" class="ch01-terminal-number">A1</text><text x="870" y="230" class="ch01-terminal-number">A2</text></g>
        <g data-action="PROTECTION_TOGGLE" class="ch01-clickable">${horizontalContact(930,1010,180,!overload,"FR","95","96")}</g>
        <g class="ch01-fuse ch01-fuse-control"><rect x="540" y="166" width="50" height="28"/><line x1="548" y1="180" x2="582" y2="180"/><text x="565" y="145">FU2</text></g>
        <g class="ch01-fuse ch01-fuse-control"><rect x="1070" y="166" width="50" height="28"/><line x1="1078" y1="180" x2="1112" y2="180"/></g>
      ` : `
        <g data-action="START_PRIMARY_PRESS" class="ch01-clickable">${horizontalContact(650,740,150,startClosed,"SB1","13","14")}</g>
        <g class="ch01-aux ${km ? "is-active" : ""}">${horizontalContact(650,740,225,km,"KM1","13","14")}</g>
        <g data-action="STOP_PRIMARY_PRESS" class="ch01-clickable">${horizontalContact(830,910,150,stopClosed,"SB2","11","12")}</g>
        <g class="ch01-coil ${km ? "is-active" : ""}"><rect x="960" y="120" width="80" height="60" rx="8"/><text x="1000" y="157">KM1</text><text x="960" y="201" class="ch01-terminal-number">A1</text><text x="1040" y="201" class="ch01-terminal-number">A2</text></g>
        <g data-action="PROTECTION_TOGGLE" class="ch01-clickable">${horizontalContact(1090,1170,150,!overload,"FR1","95","96")}</g>
        <g class="ch01-fuse ch01-fuse-control"><rect x="540" y="136" width="50" height="28"/><line x1="548" y1="150" x2="582" y2="150"/><text x="565" y="115">FU</text></g>
      `;
      return `<svg class="ch01-circuit-svg" data-module="${moduleId}" viewBox="0 0 1280 610" role="img" aria-label="${escapeHtml(copy.title)}电路图">
        <text x="42" y="38" class="ch01-zone-title main">主电路</text><text x="480" y="38" class="ch01-zone-title control">控制电路</text>
        <g class="ch01-wires">${wireMarkup(display)}</g>
        <g class="ch01-supplies"><text x="120" y="42">L1</text><text x="210" y="42">L2</text><text x="300" y="42">L3</text></g>
        <g data-action="${powerClosed ? "POWER_OPEN" : "POWER_CLOSE"}" class="ch01-clickable ch01-qf">${poleContact(120,100,powerClosed,qfLabel)}${poleContact(210,100,powerClosed,"")}${poleContact(300,100,powerClosed,"")}</g>
        <g class="ch01-fuse">${[120,210,300].map((x,index)=>`<rect x="${x-10}" y="170" width="20" height="45"/><line x1="${x}" y1="176" x2="${x}" y2="209"/>${index===0?'<text x="75" y="198">FU1</text>':''}`).join("")}</g>
        <g class="ch01-km-main ${km ? "is-active" : ""}">${poleContact(120,260,km,kmLabel,55)}${poleContact(210,260,km,"",55)}${poleContact(300,260,km,"",55)}</g>
        <g data-action="PROTECTION_TOGGLE" class="ch01-fr-main ch01-clickable ${overload ? "is-overload" : ""}"><rect x="90" y="350" width="240" height="55" rx="8"/><path d="M110 378 h35 l12 -14 l18 28 l18 -28 l18 28 l18 -28 l18 14 h55"/><text x="48" y="384">${frLabel}</text></g>
        <g class="ch01-motor ${display.motorRunning ? "is-running" : ""} ${overload ? "is-fault" : ""}"><rect class="ch01-motor-terminal-block" x="166" y="456" width="88" height="30" rx="6"/><circle class="ch01-motor-terminal" cx="180" cy="470" r="4"/><circle class="ch01-motor-terminal" cx="210" cy="470" r="4"/><circle class="ch01-motor-terminal" cx="240" cy="470" r="4"/><circle cx="210" cy="535" r="62"/><path class="ch01-rotor" d="M210 492 l14 30 l30 13 l-30 14 l-14 30 l-14-30 l-30-14 l30-13z"/><text x="210" y="546">M</text></g>
        <g class="ch01-control-components">${control}</g>
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
      const namespacePrefix = `${moduleId}__`;
      const unique = (items, key, label) => {
        const seen = new Set();
        items.forEach((item) => { if (seen.has(item[key])) errors.push(`duplicate ${label}: ${item[key]}`); seen.add(item[key]); });
        return seen;
      };
      const ports = unique(circuitData.ports, "portId", "portId");
      const portMap = new Map(circuitData.ports.map((item) => [item.portId, item]));
      unique(circuitData.wires, "wireId", "wireId");
      unique(circuitData.components, "componentId", "componentId");
      unique(circuitData.deviceEdges, "edgeId", "edgeId");
      circuitData.ports.forEach((item) => {
        if (!item.portId.startsWith(`${namespacePrefix}port__`)) errors.push(`invalid port namespace: ${item.portId}`);
      });
      circuitData.components.forEach((component) => {
        if (!component.componentId.startsWith(`${namespacePrefix}cmp__`)) errors.push(`invalid component namespace: ${component.componentId}`);
        if (!component.deviceId.startsWith(`${namespacePrefix}dev__`)) errors.push(`invalid device namespace: ${component.deviceId}`);
        const geometry = component.geometry || {};
        ["x", "y", "width", "height", "orientation"].forEach((field) => {
          if (!Number.isFinite(geometry[field])) errors.push(`missing geometry.${field}: ${component.componentId}`);
        });
      });
      circuitData.wires.forEach((wire) => {
        if (!wire.wireId.startsWith(`${namespacePrefix}wire__`)) errors.push(`invalid wire namespace: ${wire.wireId}`);
        if (!ports.has(wire.fromPort)) errors.push(`missing fromPort: ${wire.fromPort}`);
        if (!ports.has(wire.toPort)) errors.push(`missing toPort: ${wire.toPort}`);
        if (!Array.isArray(wire.routePoints) || wire.routePoints.length < 2) {
          errors.push(`invalid routePoints: ${wire.wireId}`);
          return;
        }
        const from = portMap.get(wire.fromPort);
        const to = portMap.get(wire.toPort);
        const first = wire.routePoints[0];
        const last = wire.routePoints[wire.routePoints.length - 1];
        if (from && (first.x !== from.x || first.y !== from.y)) errors.push(`route start mismatch: ${wire.wireId}`);
        if (to && (last.x !== to.x || last.y !== to.y)) errors.push(`route end mismatch: ${wire.wireId}`);
      });
      circuitData.deviceEdges.forEach((edge) => {
        if (!edge.edgeId.startsWith(`${namespacePrefix}edge__`)) errors.push(`invalid edge namespace: ${edge.edgeId}`);
        if (!edge.deviceId.startsWith(`${namespacePrefix}dev__`)) errors.push(`invalid edge device namespace: ${edge.deviceId}`);
        if (!ports.has(edge.fromPort)) errors.push(`missing edge fromPort: ${edge.fromPort}`);
        if (!ports.has(edge.toPort)) errors.push(`missing edge toPort: ${edge.toPort}`);
        if (!edge.circuitDomain || !edge.electricalRole) errors.push(`missing edge classification: ${edge.edgeId}`);
      });
      return { valid: errors.length === 0, errors, counts: { ports: circuitData.ports.length, wires: circuitData.wires.length, components: circuitData.components.length, deviceEdges: circuitData.deviceEdges.length, danglingWires: errors.filter((error)=>/Port|route (start|end)/.test(error)).length } };
    }

    function runTests() {
      const tests = [];
      const test = (name, assertion) => tests.push({ name, passed: Boolean(assertion) });
      const open = createOperationState();
      test("QF open prevents energization", !evaluate(open, false).motorStates.M.running);
      if (mode === "jog") {
        const ready = { qf: "closed", jog: "pressed", fr: "normal" };
        const energized = evaluate(ready, false);
        test("pressed jog starts motor", energized.motorStates.M.running);
        test("jog solver converges from topology", energized.converged && energized.iterationCount > 0);
        test("jog current flow uses connected routes", energized.activeMainWireIds.length === 15 && energized.activeControlWireIds.length === 6);
        test("released jog stops motor", !evaluate({ ...ready, jog: "released" }, true).motorStates.M.running);
        test("overload blocks jog", !evaluate({ ...ready, fr: "overload" }, false).motorStates.M.running);
      } else {
        const press = { qf: "closed", start: "pressed", stop: "released", fr: "normal" };
        const energized = evaluate(press, false).stableDeviceStates.KM;
        test("start press energizes KM1", energized);
        const held = evaluate({ ...press, start: "released" }, energized);
        test("self-hold survives release", held.motorStates.M.running);
        test("self-hold flow comes from auxiliary path", held.activeControlWireIds.includes(`${moduleId}__wire__c09`) && held.activeControlWireIds.includes(`${moduleId}__wire__c04`));
        test("direct-start main flow uses all three connected phases", held.activeMainWireIds.length === 15);
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
