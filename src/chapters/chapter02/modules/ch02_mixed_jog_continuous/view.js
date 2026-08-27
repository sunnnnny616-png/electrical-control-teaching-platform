(function installMixedJogContinuousView(global) {
  "use strict";

  const platform = global.ECTPPlatform = global.ECTPPlatform || {};
  platform.moduleViews = platform.moduleViews || {};
  const MODULE_ID = "ch02_mixed_jog_continuous";
  const wireId = (localId) => `${MODULE_ID}__wire__${localId}`;

  function esc(value) {
    return String(value).replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#39;" }[char]));
  }

  function createView(options) {
    const { mountRoot, dispatchAction } = options;
    const cleanups = [];
    let latest = null;

    function wireClass(id, result, phase = "") {
      const active = result.activeMainWireIds.includes(id) || result.activeControlWireIds.includes(id);
      const partial = !active && result.partialWireIds.includes(id);
      return `mixed-wire ${phase}${active ? " is-active" : partial ? " is-partial" : ""}`;
    }

    function polyline(localId, points, result, phase = "") {
      const id = wireId(localId);
      const definition = latest?.data?.wires?.find((item) => item.wireId === id);
      const geometry = definition ? definition.routePoints.map((point) => `${point.x},${point.y}`).join(" ") : points;
      return `<polyline class="${wireClass(id, result, phase)}" data-wire-id="${id}" points="${geometry}" />`;
    }

    function contact(x, y, label, kind, closed, active = false) {
      const bladeY = closed ? y : y - 16;
      return `<g class="mixed-device${active ? " is-active" : ""}">
        <text class="mixed-label" x="${x + 24}" y="${y - 26}" text-anchor="middle">${esc(label)}</text>
        <line class="mixed-symbol" x1="${x}" y1="${y}" x2="${x + 10}" y2="${y}" />
        <line class="mixed-symbol" x1="${x + 38}" y1="${y}" x2="${x + 50}" y2="${y}" />
        <circle cx="${x + 10}" cy="${y}" r="3" fill="#27364a" />
        <circle cx="${x + 38}" cy="${y}" r="3" fill="#27364a" />
        <line class="mixed-symbol" x1="${x + 10}" y1="${y}" x2="${x + 36}" y2="${bladeY}" />
        ${kind === "nc" ? `<line class="mixed-symbol" x1="${x + 27}" y1="${y - 14}" x2="${x + 39}" y2="${y + 8}" />` : ""}
      </g>`;
    }

    function coil(x, y, label, active) {
      return `<g class="mixed-device${active ? " is-active" : ""}">
        <text class="mixed-label" x="${x + 30}" y="${y - 12}" text-anchor="middle">${esc(label)}</text>
        <rect class="mixed-coil" x="${x}" y="${y}" width="60" height="42" />
      </g>`;
    }

    function mainCircuit(model) {
      const { state, result } = model;
      const qfClosed = state.operationState.power === "closed";
      const kmClosed = result.stableDeviceStates.KM1;
      const frHealthy = state.operationState.protection === "normal";
      const motorRunning = result.motorStates.M.running;
      const phases = [
        { x: 86, phase: "", id: "l1" },
        { x: 166, phase: "phase-l2", id: "l2" },
        { x: 246, phase: "phase-l3", id: "l3" }
      ];
      const phaseMarkup = phases.map((phase) => `
        ${polyline(`main_${phase.id}`, `${phase.x},82 ${phase.x},260`, result, phase.phase)}
        ${polyline(`main_${phase.id}_load`, `${phase.x},316 ${phase.x},492`, result, phase.phase)}
        <g class="mixed-device${qfClosed ? " is-active" : ""}">
          <circle cx="${phase.x}" cy="82" r="6" fill="#fff" stroke="#27364a" stroke-width="3" />
          <line class="mixed-symbol" x1="${phase.x}" y1="105" x2="${phase.x + (qfClosed ? 0 : 15)}" y2="${qfClosed ? 126 : 116}" />
        </g>
        <rect x="${phase.x - 7}" y="152" width="14" height="36" fill="#fff" stroke="#27364a" stroke-width="3" />
        <g class="mixed-device${kmClosed ? " is-active" : ""}">
          <line class="mixed-symbol" x1="${phase.x}" y1="265" x2="${phase.x + (kmClosed ? 0 : 15)}" y2="${kmClosed ? 293 : 282}" />
        </g>`).join("");
      return `<rect class="mixed-panel" x="18" y="18" width="300" height="584" rx="12" />
        <text class="mixed-panel-title" x="38" y="52">主电路</text>
        <text class="mixed-label-small" x="38" y="72">QF1 · FU1 · KM1 · FR1 · M</text>
        ${phaseMarkup}
        <text class="mixed-label" x="48" y="122">QF1</text>
        <text class="mixed-label" x="48" y="178">FU1</text>
        <text class="mixed-label" x="42" y="286">KM1</text>
        <g class="mixed-device${frHealthy ? "" : " is-tripped"}">
          <rect x="70" y="372" width="192" height="46" fill="#fff" stroke="#27364a" stroke-width="3" />
          <text class="mixed-label" x="48" y="402">FR1</text>
        </g>
        <g class="mixed-device${motorRunning ? " is-active" : ""}">
          <circle cx="166" cy="528" r="54" fill="#fff" stroke="#27364a" stroke-width="3" />
          <circle class="mixed-motor-rotor" cx="166" cy="528" r="34" />
          <text class="mixed-label" x="166" y="534" text-anchor="middle">M</text>
        </g>`;
    }

    function commonControlFrame(title, description) {
      return `<rect class="mixed-panel" x="334" y="18" width="688" height="584" rx="12" />
        <text class="mixed-panel-title" x="356" y="52">${esc(title)}</text>
        <text class="mixed-panel-note" x="356" y="74">${esc(description)}</text>
        <line class="mixed-symbol" x1="382" y1="106" x2="382" y2="520" />
        <line class="mixed-symbol" x1="980" y1="106" x2="980" y2="520" />
        <text class="mixed-label-small" x="374" y="98">L</text>
        <text class="mixed-label-small" x="976" y="98">N</text>
        <rect x="374" y="118" width="16" height="36" fill="#fff" stroke="#27364a" stroke-width="3" />
        <text class="mixed-label" x="344" y="143">FU2</text>`;
    }

    function schemeOne(model) {
      const { state, result, data } = model;
      const op = state.operationState;
      const km = result.stableDeviceStates.KM1;
      const startClosed = op.start === "pressed" || op.jog === "pressed";
      const selectorClosed = op.mode === "continuous";
      return `${commonControlFrame(data.schemes.scheme1.title, data.schemes.scheme1.description)}
        ${polyline("s1_supply", "382,172 470,172", result)}
        ${contact(470, 172, "SB1", "no", startClosed, startClosed)}
        ${polyline("s1_start", "520,172 695,172", result)}
        ${contact(695, 172, "SB2", "nc", op.stop !== "pressed", op.stop === "pressed")}
        ${polyline("s1_stop", "745,172 785,172", result)}
        ${coil(785, 151, "KM1", km)}
        ${polyline("s1_coil", "845,172 900,172", result)}
        ${contact(900, 172, "FR1", "nc", op.protection === "normal", op.protection === "overload")}
        ${polyline("s1_return", "950,172 980,172", result)}
        ${polyline("s1_sa", "440,172 440,294 500,294", result)}
        ${contact(500, 294, "SA", "no", selectorClosed, selectorClosed)}
        ${polyline("s1_hold", "550,294 590,294", result)}
        ${contact(590, 294, "KM1", "no", km, km)}
        <polyline class="mixed-wire" points="640,294 675,294 675,172 695,172" />
        <rect class="mixed-status-chip${selectorClosed ? " is-on" : ""}" x="500" y="350" width="225" height="42" rx="8" />
        <text class="mixed-status-text" x="612" y="376" text-anchor="middle">SA：${selectorClosed ? "长动（允许自锁）" : "点动（禁止自锁）"}</text>`;
    }

    function schemeTwo(model) {
      const { state, result, data } = model;
      const op = state.operationState;
      const km = result.stableDeviceStates.KM1;
      const jog = op.jog === "pressed";
      return `${commonControlFrame(data.schemes.scheme2.title, data.schemes.scheme2.description)}
        ${polyline("s2_supply", "382,172 450,172", result)}
        ${contact(450, 172, "SB1", "no", op.start === "pressed", op.start === "pressed")}
        ${polyline("s2_long_start", "500,172 690,172", result)}
        ${contact(690, 172, "SB2", "nc", op.stop !== "pressed", op.stop === "pressed")}
        ${polyline("s2_stop", "740,172 785,172", result)}
        ${coil(785, 151, "KM1", km)}
        ${polyline("s2_coil", "845,172 900,172", result)}
        ${contact(900, 172, "FR1", "nc", op.protection === "normal", op.protection === "overload")}
        ${polyline("s2_return", "950,172 980,172", result)}
        <polyline class="mixed-wire" points="420,172 420,278 470,278" />
        ${contact(470, 278, "SB3 NO", "no", jog, jog)}
        ${polyline("s2_jog", "520,278 665,278 665,172 690,172", result)}
        <polyline class="mixed-wire" points="420,278 420,384 470,384" />
        ${contact(470, 384, "SB3 NC", "nc", !jog, jog)}
        ${polyline("s2_jog_nc", "520,384 565,384", result)}
        ${contact(565, 384, "KM1", "no", km, km)}
        ${polyline("s2_hold", "615,384 665,384 665,278", result)}
        <line x1="536" y1="245" x2="536" y2="412" stroke="#94a3b8" stroke-width="2" stroke-dasharray="6 5" />
        <text class="mixed-label-small" x="548" y="330">机械联动：先断后合</text>`;
    }

    function schemeThree(model) {
      const { state, result, data } = model;
      const op = state.operationState;
      const km = result.stableDeviceStates.KM1;
      const relayK = result.stableDeviceStates.K;
      const jog = op.jog === "pressed";
      return `${commonControlFrame(data.schemes.scheme3.title, data.schemes.scheme3.description)}
        ${polyline("s3_supply", "382,170 448,170", result)}
        ${contact(448, 170, "SB1", "no", op.start === "pressed", op.start === "pressed")}
        ${polyline("s3_long_start", "498,170 600,170", result)}
        ${contact(600, 170, "SB2", "nc", op.stop !== "pressed", op.stop === "pressed")}
        ${polyline("s3_jog_nc", "650,170 685,170", result)}
        ${contact(685, 170, "SB3 NC", "nc", !jog, jog)}
        ${polyline("s3_k_coil", "735,170 790,170", result)}
        ${coil(790, 149, "K", relayK)}
        <polyline class="mixed-wire" points="850,170 900,170" />
        ${contact(900, 170, "FR1", "nc", op.protection === "normal", op.protection === "overload")}
        ${polyline("s3_return", "950,170 980,170", result)}
        <polyline class="mixed-wire" points="420,170 420,270 470,270" />
        ${contact(470, 270, "K自锁", "no", relayK, relayK)}
        ${polyline("s3_k_hold", "520,270 575,270 575,170 600,170", result)}
        <polyline class="mixed-wire" points="382,386 455,386" />
        ${contact(455, 386, "K", "no", relayK, relayK)}
        ${polyline("s3_k_drive", "505,386 635,386", result)}
        <polyline class="mixed-wire" points="420,386 420,478 455,478" />
        ${contact(455, 478, "SB3 NO", "no", jog, jog)}
        ${polyline("s3_jog", "505,478 610,478 610,386 635,386", result)}
        ${coil(635, 365, "KM1", km)}
        ${polyline("s3_km_coil", "695,386 920,386 920,170", result)}
        <line x1="745" y1="137" x2="500" y2="505" stroke="#94a3b8" stroke-width="2" stroke-dasharray="6 5" />`;
    }

    function bind(selector, eventName, handler) {
      mountRoot.querySelectorAll(selector).forEach((node) => {
        node.addEventListener(eventName, handler);
        cleanups.push(() => node.removeEventListener(eventName, handler));
      });
    }

    function clearListeners() {
      while (cleanups.length) cleanups.pop()();
    }

    function render(model) {
      latest = model;
      clearListeners();
      const op = model.state.operationState;
      const tabs = Object.entries(model.data.schemes).map(([key, scheme]) => `<button type="button" class="mixed-scheme-button" data-variant="${key}" aria-pressed="${op.variant === key}">${esc(scheme.shortTitle)}</button>`).join("");
      mountRoot.innerHTML = `<section data-module="${MODULE_ID}">
        <div class="mixed-toolbar">
          <div class="mixed-scheme-tabs" aria-label="选择混合控制接线方案">${tabs}</div>
          <div class="mixed-mode-tabs" ${op.variant === "scheme1" ? "" : "hidden"} aria-label="SA控制模式">
            <button type="button" class="mixed-mode-button" data-mode="jog" aria-pressed="${op.mode === "jog"}">SA 点动</button>
            <button type="button" class="mixed-mode-button" data-mode="continuous" aria-pressed="${op.mode === "continuous"}">SA 长动</button>
          </div>
        </div>
        <div class="mixed-canvas-shell">
          <svg class="mixed-canvas" viewBox="0 0 1040 620" role="img" aria-label="点动与长动混合控制电路动态原理图">
            ${mainCircuit(model)}
            ${op.variant === "scheme1" ? schemeOne(model) : op.variant === "scheme2" ? schemeTwo(model) : schemeThree(model)}
          </svg>
        </div>
      </section>`;
      bind("[data-variant]", "click", (event) => dispatchAction("RESET_MODULE", { variant: event.currentTarget.dataset.variant }));
      bind("[data-mode]", "click", (event) => dispatchAction("RESET_MODULE", { variant: "scheme1", mode: event.currentTarget.dataset.mode }));
    }

    function unmount() {
      clearListeners();
      if (mountRoot) mountRoot.innerHTML = "";
      latest = null;
    }

    return Object.freeze({ render, unmount, getLatestModel: () => latest });
  }

  platform.moduleViews.createCh02MixedJogContinuousView = createView;
})(globalThis);
