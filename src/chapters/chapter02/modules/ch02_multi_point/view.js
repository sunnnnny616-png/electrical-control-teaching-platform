(function installMultiPointView(global) {
  "use strict";

  const platform = global.ECTPPlatform = global.ECTPPlatform || {};
  platform.moduleViews = platform.moduleViews || {};
  const MODULE_ID = "ch02_multi_point";
  const wireId = (localId) => `${MODULE_ID}__wire__${localId}`;

  function createView(options) {
    const { mountRoot } = options;
    let latest = null;

    function wireClass(localId, result, phase = "") {
      const id = wireId(localId);
      const active = result.activeMainWireIds.includes(id) || result.activeControlWireIds.includes(id);
      const partial = !active && result.partialWireIds.includes(id);
      return `multi-wire ${phase}${active ? " is-active" : partial ? " is-partial" : ""}`;
    }

    function polyline(localId, points, result, phase = "") {
      const id = wireId(localId);
      const definition = latest?.data?.wires?.find((item) => item.wireId === id);
      const geometry = definition ? definition.routePoints.map((point) => `${point.x},${point.y}`).join(" ") : points;
      return `<polyline class="${wireClass(localId, result, phase)}" data-wire-id="${id}" points="${geometry}" />`;
    }

    function contact(x, y, label, kind, closed, active = false) {
      const bladeY = closed ? y : y - 16;
      return `<g class="multi-device${active ? " is-active" : ""}">
        <text class="multi-label" x="${x + 24}" y="${y - 25}" text-anchor="middle">${label}</text>
        <line class="multi-symbol" x1="${x}" y1="${y}" x2="${x + 10}" y2="${y}" />
        <line class="multi-symbol" x1="${x + 38}" y1="${y}" x2="${x + 50}" y2="${y}" />
        <circle cx="${x + 10}" cy="${y}" r="3" fill="#27364a" />
        <circle cx="${x + 38}" cy="${y}" r="3" fill="#27364a" />
        <line class="multi-symbol" x1="${x + 10}" y1="${y}" x2="${x + 36}" y2="${bladeY}" />
        ${kind === "nc" ? `<line class="multi-symbol" x1="${x + 27}" y1="${y - 14}" x2="${x + 39}" y2="${y + 8}" />` : ""}
      </g>`;
    }

    function mainCircuit(state, result) {
      const qfClosed = state.operationState.power === "closed";
      const kmClosed = result.stableDeviceStates.KM1;
      const motorRunning = result.motorStates.M.running;
      const phases = [
        { x: 86, phase: "", id: "l1" },
        { x: 166, phase: "phase-l2", id: "l2" },
        { x: 246, phase: "phase-l3", id: "l3" }
      ];
      const markup = phases.map((phase) => `
        ${polyline(`main_${phase.id}`, `${phase.x},82 ${phase.x},260`, result, phase.phase)}
        ${polyline(`main_${phase.id}_load`, `${phase.x},316 ${phase.x},492`, result, phase.phase)}
        <circle cx="${phase.x}" cy="82" r="6" fill="#fff" stroke="#27364a" stroke-width="3" />
        <g class="multi-device${qfClosed ? " is-active" : ""}"><line class="multi-symbol" x1="${phase.x}" y1="105" x2="${phase.x + (qfClosed ? 0 : 15)}" y2="${qfClosed ? 126 : 116}" /></g>
        <rect x="${phase.x - 7}" y="152" width="14" height="36" fill="#fff" stroke="#27364a" stroke-width="3" />
        <g class="multi-device${kmClosed ? " is-active" : ""}"><line class="multi-symbol" x1="${phase.x}" y1="265" x2="${phase.x + (kmClosed ? 0 : 15)}" y2="${kmClosed ? 293 : 282}" /></g>`).join("");
      return `<rect class="multi-panel" x="18" y="18" width="300" height="584" rx="12" />
        <text class="multi-panel-title" x="38" y="52">主电路</text>
        <text class="multi-label-small" x="38" y="72">QF1 · FU1 · KM1 · FR1 · M</text>
        ${markup}
        <text class="multi-label" x="48" y="122">QF1</text>
        <text class="multi-label" x="48" y="178">FU1</text>
        <text class="multi-label" x="42" y="286">KM1</text>
        <rect x="70" y="372" width="192" height="46" fill="#fff" stroke="#27364a" stroke-width="3" />
        <text class="multi-label" x="48" y="402">FR1</text>
        <g class="multi-device${motorRunning ? " is-active" : ""}">
          <circle cx="166" cy="528" r="54" fill="#fff" stroke="#27364a" stroke-width="3" />
          <circle class="multi-motor-rotor" cx="166" cy="528" r="34" />
          <text class="multi-label" x="166" y="534" text-anchor="middle">M</text>
        </g>`;
    }

    function controlCircuit(state, result) {
      const op = state.operationState;
      const km = result.stableDeviceStates.KM1;
      const lamps = result.extension.indicators;
      return `<rect class="multi-panel" x="334" y="18" width="688" height="584" rx="12" />
        <text class="multi-panel-title" x="356" y="52">控制电路 · 两地启停</text>
        <text class="multi-panel-note" x="356" y="74">停止按钮串联，启动按钮并联，共同控制同一KM1与M</text>
        <line class="multi-symbol" x1="382" y1="106" x2="382" y2="548" />
        <line class="multi-symbol" x1="980" y1="106" x2="980" y2="548" />
        <text class="multi-label-small" x="374" y="98">L</text><text class="multi-label-small" x="976" y="98">N</text>
        <rect x="374" y="118" width="16" height="36" fill="#fff" stroke="#27364a" stroke-width="3" />
        <text class="multi-label" x="344" y="143">FU2</text>
        ${polyline("control_supply", "382,184 422,184", result)}
        ${contact(422, 184, "1SB2", "nc", op.stop1 !== "pressed", op.stop1 === "pressed")}
        ${polyline("stop_1", "472,184 502,184", result)}
        ${contact(502, 184, "2SB2", "nc", op.stop2 !== "pressed", op.stop2 === "pressed")}
        ${polyline("stop_2", "552,184 618,184", result)}
        <polyline class="multi-wire" points="618,184 618,136 652,136" />
        ${contact(652, 136, "1SB1", "no", op.start1 === "pressed", op.start1 === "pressed")}
        ${polyline("start_1", "702,136 790,136 790,184", result)}
        <polyline class="multi-wire" points="618,184 618,224 652,224" />
        ${contact(652, 224, "2SB1", "no", op.start2 === "pressed", op.start2 === "pressed")}
        ${polyline("start_2", "702,224 790,224 790,184", result)}
        <polyline class="multi-wire" points="618,224 618,312 652,312" />
        ${contact(652, 312, "KM1", "no", km, km)}
        ${polyline("self_hold", "702,312 790,312 790,184", result)}
        ${polyline("coil", "790,184 816,184", result)}
        <g class="multi-device${km ? " is-active" : ""}"><text class="multi-label" x="846" y="150" text-anchor="middle">KM1</text><rect class="multi-coil" x="816" y="163" width="60" height="42" /></g>
        <polyline class="multi-wire" points="876,184 904,184" />
        ${contact(904, 184, "FR1", "nc", op.protection === "normal", op.protection === "overload")}
        ${polyline("return", "954,184 980,184", result)}
        ${polyline("indicator_supply", "382,448 538,448", result)}
        ${contact(538, 448, "KM1", "no", km, km)}
        <polyline class="multi-wire" points="588,448 742,448" />
        <polyline class="multi-wire" points="742,448 742,406 786,406" />
        ${polyline("indicator_hl1", "786,406 822,406", result)}
        <g class="multi-device${lamps.HL1.on ? " is-active" : ""}"><circle class="multi-lamp" cx="850" cy="406" r="26" /><line class="multi-symbol" x1="833" y1="389" x2="867" y2="423" /><line class="multi-symbol" x1="867" y1="389" x2="833" y2="423" /><text class="multi-label" x="850" y="370" text-anchor="middle">HL1</text></g>
        <polyline class="multi-wire" points="876,406 930,406 930,448" />
        <polyline class="multi-wire" points="742,448 742,512 786,512" />
        ${polyline("indicator_hl2", "786,512 822,512", result)}
        <g class="multi-device${lamps.HL2.on ? " is-active" : ""}"><circle class="multi-lamp" cx="850" cy="512" r="26" /><line class="multi-symbol" x1="833" y1="495" x2="867" y2="529" /><line class="multi-symbol" x1="867" y1="495" x2="833" y2="529" /><text class="multi-label" x="850" y="476" text-anchor="middle">HL2</text></g>
        <polyline class="multi-wire" points="876,512 930,512 930,448" />
        ${polyline("indicator_return", "930,448 980,448", result)}
        <rect class="multi-prototype-tag" x="894" y="544" width="100" height="24" rx="6" />
        <text class="multi-prototype-text" x="944" y="560" text-anchor="middle">HL 模块内原型</text>`;
    }

    function render(model) {
      latest = model;
      mountRoot.innerHTML = `<section data-module="${MODULE_ID}"><div class="multi-canvas-shell"><svg class="multi-canvas" viewBox="0 0 1040 620" role="img" aria-label="多地点远程控制电路动态原理图">${mainCircuit(model.state, model.result)}${controlCircuit(model.state, model.result)}</svg></div></section>`;
    }

    function unmount() {
      mountRoot.innerHTML = "";
      latest = null;
    }

    return Object.freeze({ render, unmount, getLatestModel: () => latest });
  }

  platform.moduleViews.createCh02MultiPointView = createView;
})(globalThis);
