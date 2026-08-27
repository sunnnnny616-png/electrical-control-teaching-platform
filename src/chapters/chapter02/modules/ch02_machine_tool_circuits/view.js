(function installMachineToolCircuitsView(global) {
  "use strict";

  const platform = global.ECTPPlatform = global.ECTPPlatform || {};
  platform.moduleViews = platform.moduleViews || {};
  const MODULE_ID = "ch02_machine_tool_circuits";
  const wireId = (localId) => `${MODULE_ID}__wire__${localId}`;

  function esc(value) {
    return String(value).replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#39;" }[char]));
  }

  function createView(options) {
    const { mountRoot, dispatchAction } = options;
    const cleanups = [];
    let latest = null;

    function wireClass(localId, result, phase = "") {
      const id = wireId(localId);
      const active = result.activeMainWireIds.includes(id) || result.activeControlWireIds.includes(id);
      const partial = !active && result.partialWireIds.includes(id);
      return `machine-wire ${phase}${active ? " is-active" : partial ? " is-partial" : ""}`;
    }

    function polyline(localId, result, phase = "") {
      const id = wireId(localId);
      const definition = latest.data.wires.find((item) => item.wireId === id);
      const points = definition.routePoints.map((point) => `${point.x},${point.y}`).join(" ");
      return `<polyline class="${wireClass(localId, result, phase)}" data-wire-id="${id}" points="${points}" />`;
    }

    function contact(x, y, label, kind, closed, active = false) {
      const bladeY = closed ? y : y - 16;
      return `<g class="machine-device${active ? " is-active" : ""}">
        <text class="machine-label" x="${x + 24}" y="${y - 23}" text-anchor="middle">${esc(label)}</text>
        <line class="machine-symbol" x1="${x}" y1="${y}" x2="${x + 10}" y2="${y}" />
        <line class="machine-symbol" x1="${x + 38}" y1="${y}" x2="${x + 50}" y2="${y}" />
        <circle cx="${x + 10}" cy="${y}" r="3" fill="#27364a" />
        <circle cx="${x + 38}" cy="${y}" r="3" fill="#27364a" />
        <line class="machine-symbol" x1="${x + 10}" y1="${y}" x2="${x + 36}" y2="${bladeY}" />
        ${kind === "nc" ? `<line class="machine-symbol" x1="${x + 27}" y1="${y - 14}" x2="${x + 39}" y2="${y + 8}" />` : ""}
      </g>`;
    }

    function coil(x, y, label, active, timerState = "") {
      return `<g class="machine-device${active ? " is-active" : ""}">
        <text class="machine-label" x="${x + 30}" y="${y - 10}" text-anchor="middle">${esc(label)}</text>
        <rect class="machine-coil" x="${x}" y="${y}" width="60" height="42" />
        ${timerState ? `<path class="machine-timer-mark" d="M${x + 12} ${y + 32} Q${x + 30} ${y + 8} ${x + 48} ${y + 32}"/><text class="machine-label-small" x="${x + 68}" y="${y + 27}" text-anchor="start">${esc(timerState)}</text>` : ""}
      </g>`;
    }

    function breakerPole(x, closed) {
      return `<g class="machine-device${closed ? " is-active" : ""}"><circle cx="${x}" cy="84" r="5" fill="#fff" stroke="#27364a" stroke-width="3"/><line class="machine-symbol" x1="${x}" y1="102" x2="${x + (closed ? 0 : 15)}" y2="${closed ? 122 : 112}"/></g>`;
    }

    function motor(cx, cy, label, running, direction = "forward") {
      return `<g class="machine-device${running ? " is-active" : ""}${direction === "reverse" ? " is-reverse" : ""}">
        <circle cx="${cx}" cy="${cy}" r="50" fill="#fff" stroke="#27364a" stroke-width="3" />
        <g transform="translate(${cx} ${cy})"><circle class="machine-motor-rotor" cx="0" cy="0" r="31"/><path class="machine-motor-arrow" d="M-18 5 A20 20 0 0 1 15 -9 l-3 -9 15 8 -13 10 2 -8"/></g>
        <text class="machine-label" x="${cx}" y="${cy + 5}" text-anchor="middle">${esc(label)}</text>
      </g>`;
    }

    function ca6140(model) {
      const op = model.state.operationState;
      const r = model.result;
      const qf = op.power === "closed";
      const km1 = r.stableDeviceStates.KM1;
      const km2 = r.stableDeviceStates.KM2;
      const running = r.motorStates.M?.running;
      const forward = r.motorStates.M?.direction === "forward";
      return `<rect class="machine-panel" x="18" y="18" width="286" height="584" rx="12"/>
        <text class="machine-panel-title" x="38" y="50">主电路</text>
        <text class="machine-panel-note" x="38" y="70">QF · FU1 · KM1/KM2 · FR · M</text>
        ${polyline("ca_main_l1", r)}${polyline("ca_main_l2", r, "phase-l2")}${polyline("ca_main_l3", r, "phase-l3")}
        ${breakerPole(90, qf)}${breakerPole(168, qf)}${breakerPole(246, qf)}
        <text class="machine-label" x="42" y="116">QF</text>
        ${[90,168,246].map((x) => `<rect class="machine-fuse" x="${x - 7}" y="136" width="14" height="34"/>`).join("")}
        <text class="machine-label" x="42" y="160">FU1</text>
        ${[90,168,246].map((x) => `<g class="machine-device${km1 ? " is-active" : ""}"><line class="machine-symbol" x1="${x}" y1="250" x2="${x + (km1 ? 0 : 15)}" y2="${km1 ? 278 : 266}"/></g>`).join("")}
        <text class="machine-label" x="36" y="274">KM1</text>
        ${[90,168,246].map((x, index) => `<g class="machine-device${km2 ? " is-active" : ""}"><line class="machine-symbol" x1="${x}" y1="314" x2="${x + (km2 ? 0 : (index === 1 ? -15 : 15))}" y2="${km2 ? 342 : 330}"/></g>`).join("")}
        <text class="machine-label" x="36" y="338">KM2</text>
        <g class="machine-device${op.primaryProtection === "overload" ? " is-tripped" : ""}"><rect class="machine-fr" x="68" y="400" width="200" height="42"/><text class="machine-label" x="38" y="428">FR</text></g>
        ${motor(168, 535, "M", running, forward ? "forward" : "reverse")}
        <rect class="machine-panel" x="320" y="18" width="702" height="584" rx="12"/>
        <text class="machine-panel-title" x="342" y="50">控制电路</text>
        <text class="machine-panel-note" x="342" y="70">SB1停止 · SB2正向 · SB3反向 · SQ1/SQ2限位 · KSF/KSR · KT</text>
        <line class="machine-symbol" x1="350" y1="98" x2="350" y2="540"/><line class="machine-symbol" x1="990" y1="98" x2="990" y2="540"/>
        <text class="machine-label-small" x="342" y="91">L</text><text class="machine-label-small" x="984" y="91">N</text>
        ${polyline("ca_forward_rung", r)}${polyline("ca_forward_return", r)}
        ${contact(400,176,"SB1","nc",true)}${contact(485,176,"SB2","no",km1,km1)}${contact(570,176,"KSR","nc",op.caSq2!=="triggered")}${contact(655,176,"SQ2","nc",op.caSq2!=="triggered",op.caSq2==="triggered")}${contact(740,176,"KM2","nc",!km2,km2)}${coil(820,155,"KM1",km1)}${contact(915,176,"FR","nc",op.primaryProtection==="normal",op.primaryProtection==="overload")}
        <polyline class="machine-wire" points="485,176 485,226 520,226"/>${contact(520,226,"KM1","no",km1,km1)}<polyline class="machine-wire" points="570,226 610,226 610,176"/>
        ${polyline("ca_timer_rung", r)}${polyline("ca_timer_return", r)}
        ${contact(420,296,"KT","no",op.caTimer==="completed",op.caTimer!=="idle")}${contact(530,296,"SQ1","nc",op.caSq1!=="triggered",op.caSq1==="triggered")}${contact(640,296,"SQ2","nc",op.caSq2!=="triggered",op.caSq2==="triggered")}${coil(820,275,"KT",r.stableDeviceStates.KT,op.caTimer==="timing"?"延时中":op.caTimer==="completed"?"已完成":"")}
        ${polyline("ca_reverse_rung", r)}${polyline("ca_reverse_return", r)}
        ${contact(400,416,"SB1","nc",true)}${contact(485,416,"SB3","no",km2,km2)}${contact(570,416,"KSF","nc",op.caSq1!=="triggered")}${contact(655,416,"SQ1","nc",op.caSq1!=="triggered",op.caSq1==="triggered")}${contact(740,416,"KM1","nc",!km1,km1)}${coil(820,395,"KM2",km2)}${contact(915,416,"FR","nc",op.primaryProtection==="normal",op.primaryProtection==="overload")}
        <polyline class="machine-wire" points="485,416 485,466 520,466"/>${contact(520,466,"KM2","no",km2,km2)}<polyline class="machine-wire" points="570,466 610,466 610,416"/>
        <rect class="machine-status-chip${running ? " is-on" : ""}" x="430" y="518" width="430" height="48" rx="8"/><text class="machine-status-text" x="645" y="547" text-anchor="middle">${running ? (forward ? "KM1吸合 · 电动机正向运行" : "KM2吸合 · 电动机反向运行") : "KM1/KM2失电 · 电动机停止"}</text>`;
    }

    function z3040(model) {
      const op = model.state.operationState;
      const r = model.result;
      const s = r.stableDeviceStates;
      const contactAt = (x,y,label,kind,closed,active=false) => contact(x,y,label,kind,closed,active);
      return `<rect class="machine-panel" x="18" y="18" width="1004" height="584" rx="12"/>
        <text class="machine-panel-title" x="40" y="50">Z3040摇臂钻床控制电路</text>
        <text class="machine-panel-note" x="40" y="70">主轴单向旋转 · 摇臂升降 · 松开/夹紧 · SQ1/SQ2/SQ3联锁</text>
        <line class="machine-symbol" x1="60" y1="92" x2="60" y2="582"/><line class="machine-symbol" x1="990" y1="92" x2="990" y2="582"/>
        <text class="machine-label-small" x="52" y="86">L</text><text class="machine-label-small" x="984" y="86">N</text>
        <text class="machine-rung-title" x="560" y="106">主轴单向旋转</text>${polyline("z_spindle_rung",r)}${polyline("z_spindle_return",r)}
        ${contactAt(150,126,"SB1","nc",true)}${contactAt(255,126,"SB2","no",s.KM1,s.KM1)}${contactAt(690,126,"KM1","no",s.KM1,s.KM1)}${coil(820,105,"KM1",s.KM1)}${contactAt(915,126,"FR1","nc",op.primaryProtection==="normal",op.primaryProtection==="overload")}
        <polyline class="machine-wire" points="255,126 255,174 310,174"/>${contactAt(310,174,"KM1","no",s.KM1,s.KM1)}<polyline class="machine-wire" points="360,174 410,174 410,126"/>
        <line class="machine-section-rule" x1="80" y1="196" x2="970" y2="196"/><text class="machine-rung-title" x="540" y="214">摇臂升降（KT延时后动作）</text>
        ${polyline("z_timer_rung",r)}${polyline("z_timer_return",r)}${contactAt(150,241,"SB3/SB4","no",op.zTimer!=="idle",op.zTimer!=="idle")}${contactAt(315,241,"SQ2","no",op.zSq2==="triggered",op.zSq2==="triggered")}${coil(820,220,"KT",s.KT,op.zTimer==="timing"?"延时中":op.zTimer==="completed"?"已完成":"")}
        ${polyline("z_up_rung",r)}${polyline("z_up_return",r)}${contactAt(150,306,"SB3 上升","no",op.zRocker==="up",op.zRocker==="up")}${contactAt(315,306,"SQ1-1","nc",op.zSq1Upper!=="triggered",op.zSq1Upper==="triggered")}${contactAt(470,306,"KT","no",op.zTimer==="completed",s.KT)}${contactAt(650,306,"KM3","nc",!s.KM3,s.KM3)}${coil(820,285,"KM2",s.KM2)}
        ${polyline("z_down_rung",r)}${polyline("z_down_return",r)}${contactAt(150,371,"SB4 下降","no",op.zRocker==="down",op.zRocker==="down")}${contactAt(315,371,"SQ1-2","nc",op.zSq1Lower!=="triggered",op.zSq1Lower==="triggered")}${contactAt(470,371,"KT","no",op.zTimer==="completed",s.KT)}${contactAt(650,371,"KM2","nc",!s.KM2,s.KM2)}${coil(820,350,"KM3",s.KM3)}
        <line class="machine-section-rule" x1="80" y1="410" x2="970" y2="410"/><text class="machine-rung-title" x="500" y="430">摇臂松开与夹紧</text>
        ${polyline("z_loosen_rung",r)}${polyline("z_loosen_return",r)}${contactAt(150,456,"SB5 松开","no",op.zClamp==="loosen",op.zClamp==="loosen")}${contactAt(340,456,"SQ2","nc",op.zSq2!=="triggered",op.zSq2==="triggered")}${contactAt(620,456,"KM5","nc",!s.KM5,s.KM5)}${coil(820,435,"KM4",s.KM4)}${contactAt(915,456,"FR2","nc",op.secondaryProtection==="normal",op.secondaryProtection==="overload")}
        ${polyline("z_clamp_rung",r)}${polyline("z_clamp_return",r)}${contactAt(150,526,"SB6 夹紧","no",op.zClamp==="clamp",op.zClamp==="clamp")}${contactAt(340,526,"SQ3","nc",op.zSq3!=="triggered",op.zSq3==="triggered")}${contactAt(620,526,"KM4","nc",!s.KM4,s.KM4)}${coil(820,505,"KM5",s.KM5)}${contactAt(915,526,"FR2","nc",op.secondaryProtection==="normal",op.secondaryProtection==="overload")}
        ${polyline("z_yv_rung",r)}${polyline("z_yv_return",r)}${contactAt(260,574,"SQ2","no",op.zSq2==="triggered",op.zSq2==="triggered")}${coil(660,553,"YV",s.YV)}
        <g class="machine-motion-object"><rect x="760" y="35" width="225" height="43" rx="8"/><text x="872" y="61" text-anchor="middle">摇臂：${r.motorStates.M2?.direction==="up"?"上升":r.motorStates.M2?.direction==="down"?"下降":"停止"} · 夹紧：${op.zClamp==="loosen"?"松开":op.zClamp==="clamp"?"夹紧":"停止"}</text></g>`;
    }

    function bind(selector, eventName, handler) {
      mountRoot.querySelectorAll(selector).forEach((node) => {
        node.addEventListener(eventName, handler);
        cleanups.push(() => node.removeEventListener(eventName, handler));
      });
    }

    function clearListeners() { while (cleanups.length) cleanups.pop()(); }

    function render(model) {
      latest = model;
      clearListeners();
      const variant = model.state.operationState.variant;
      const tabs = Object.entries(model.data.variants).map(([key, item]) => `<button type="button" class="machine-tab" data-variant="${key}" aria-pressed="${variant === key}">${esc(item.shortTitle)}</button>`).join("");
      mountRoot.innerHTML = `<section data-module="${MODULE_ID}"><div class="machine-toolbar"><div class="machine-tabs" aria-label="选择机床线路">${tabs}</div><span class="machine-source">${esc(model.data.variants[variant].source)} · SQ/KT/YV模块内原型</span></div><div class="machine-canvas-shell"><svg class="machine-canvas" viewBox="0 0 1040 620" role="img" aria-label="${esc(model.data.variants[variant].title)}动态原理图">${variant === "ca6140" ? ca6140(model) : z3040(model)}</svg></div></section>`;
      bind("[data-variant]", "click", (event) => dispatchAction("RESET_MODULE", { variant: event.currentTarget.dataset.variant }));
    }

    function unmount() { clearListeners(); if (mountRoot) mountRoot.innerHTML = ""; latest = null; }
    return Object.freeze({ render, unmount, getLatestModel: () => latest });
  }

  platform.moduleViews.createCh02MachineToolCircuitsView = createView;
})(globalThis);
