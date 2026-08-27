"use strict";

const fs = require("fs");
const path = require("path");
const vm = require("vm");

const root = path.resolve(__dirname, "../../../../../..");
const files = [
  "src/schemas/module-contract.js",
  "src/platform/runtime/runtime-scope.js",
  "src/registry/module-registry.js",
  "src/platform/module-adapter/facade-module-adapter.js",
  "src/chapters/chapter02/modules/ch02_machine_tool_circuits/circuit.data.js",
  "src/chapters/chapter02/modules/ch02_machine_tool_circuits/solver.js",
  "src/chapters/chapter02/modules/ch02_machine_tool_circuits/view.js",
  "src/chapters/chapter02/modules/ch02_machine_tool_circuits/teaching.js",
  "src/chapters/chapter02/modules/ch02_machine_tool_circuits/facade.js",
  "src/chapters/chapter02/modules/ch02_machine_tool_circuits/module.js"
];

const context = vm.createContext({ console, setTimeout, clearTimeout, AbortController });
files.forEach((file) => vm.runInContext(fs.readFileSync(path.join(root, file), "utf8"), context, { filename: file }));
const platform = context.ECTPPlatform;
const definition = platform.moduleDefinitions.createCh02MachineToolCircuits();
const scope = platform.runtime.createRuntimeScope(definition.meta.moduleId);
const instance = definition.create({ scope, mountRoot: null, services: {} });
const action = (type, payload = {}) => platform.contracts.createAction(type, payload, "acceptance");
const checks = [];
const check = (name, condition) => checks.push({ name, passed: Boolean(condition) });
const publicIndex = fs.readFileSync(path.join(root, "index.html"), "utf8");
const viewSource = fs.readFileSync(path.join(root, "src/chapters/chapter02/modules/ch02_machine_tool_circuits/view.js"), "utf8");

check("Module Contract有效", platform.contracts.validateModuleContract(instance).valid);
check("Facade输出有效", (() => { try { platform.contracts.assertFacadeOutputs(instance); return true; } catch (_) { return false; } })());
check("模块内Solver与Geometry测试通过", instance.runTests().passed);
check("正式公共层加载机床模块资源", publicIndex.includes("ch02_machine_tool_circuits/module.js") && publicIndex.includes("ch02_machine_tool_circuits/module.css"));
check("正式公共层注册机床综合线路", publicIndex.includes("platform.moduleDefinitions.createCh02MachineToolCircuits()"));
check("第二章菜单顺序为05", definition.meta.chapterId === "ch02" && definition.meta.code === "05" && definition.meta.order === 5);
check("公共层扩展操作区已接入", publicIndex.includes('id="moduleExtraControls"') && publicIndex.includes("control.payload || {}"));

const renderFixture = (operationState) => {
  const solver = platform.moduleSolvers.ch02MachineToolCircuits;
  const solved = solver.solve(solver.createInitialState({ operationState }));
  const rootNode = { innerHTML: "", querySelectorAll: () => [] };
  const view = platform.moduleViews.createCh02MachineToolCircuitsView({ mountRoot: rootNode, dispatchAction: () => undefined });
  view.render({ data: platform.moduleCircuitData.ch02MachineToolCircuits, state: solved.state, result: solved.solverResult });
  return rootNode.innerHTML;
};
const caVisual = renderFixture({ variant: "ca6140", power: "closed", caCommand: "forward" });
const zVisual = renderFixture({ variant: "z3040", power: "closed", zRocker: "up", zClamp: "loosen", zTimer: "completed", zSq2: "triggered" });
const maturePieces = ["sim-terminal-outer", "sim-fuse-shell", "sim-contact-frame", "sim-button-cap-forward", "sim-coil-body", "sim-fr-channel", "sim-motor-shell"];
check("两张图使用成熟元器件视觉体系", maturePieces.every((className) => caVisual.includes(className)) && maturePieces.every((className) => zVisual.includes(className)));
check("电路画布比例与成熟模块一致", caVisual.includes('viewBox="0 0 1498 1135"') && zVisual.includes('viewBox="0 0 1498 1135"'));
check("导线采用端子间分段渲染", (caVisual.match(/data-segment-index=/g) || []).length > 40 && (zVisual.match(/data-segment-index=/g) || []).length > 30);
check("Z3040线圈导线精确收口", zVisual.includes('points="1032,570 1080,570"') && zVisual.includes('points="1190,570 1210,570"'));
check("电机转子使用稳定双层锚点", /<g transform="translate\(305 945\)"><g class="sim-motor-rotor forward">/.test(caVisual));
check("画布无旧版近似面板与贯穿线", !caVisual.includes("machine-panel") && !zVisual.includes("machine-panel"));
check("辅助触点采用标准单活动触片", caVisual.includes('class="sim-contact-blade') && zVisual.includes('class="sim-contact-blade') && !caVisual.includes("sim-nc-mark") && !zVisual.includes("sim-nc-mark"));
check("辅助触点闭合时精确连接固定触点", viewSource.includes("bladeStart=l+4,bladeEnd=r-4") && viewSource.includes("bladeEndY=closed?y:y-10"));

instance.mount();
instance.dispatchAction(action("POWER_CLOSE"));
instance.dispatchAction(action("START_PRIMARY_PRESS", { command: "forward" }));
check("CA6140正向运行", instance.getStateSnapshot().motor.direction === "forward");
check("CA6140动态主回路存在", instance.normalizeSolverResult().activeMainWireIds.length === 3);
check("CA6140动态控制回路存在", instance.normalizeSolverResult().activeControlWireIds.length >= 2);
instance.dispatchAction(action("PROTECTION_SECONDARY_TOGGLE", { command: "caSq2" }));
check("CA6140 SQ2触发立即停止正向", !instance.getStateSnapshot().motor.running);
instance.dispatchAction(action("PROTECTION_SECONDARY_TOGGLE", { command: "caSq2" }));
instance.dispatchAction(action("START_SECONDARY_PRESS", { command: "reverse" }));
check("CA6140反向运行", instance.getStateSnapshot().motor.direction === "reverse");
check("CA6140 KM1/KM2互锁", !(instance.getStateSnapshot().devices.KM1.energized && instance.getStateSnapshot().devices.KM2.energized));
instance.dispatchAction(action("PROTECTION_TOGGLE"));
check("CA6140 FR过载切断", !instance.getStateSnapshot().motor.running);
instance.dispatchAction(action("PROTECTION_RESET"));
check("CA6140复位后不自启动", !instance.getStateSnapshot().motor.running);

instance.dispatchAction(action("RESET_MODULE", { variant: "z3040" }));
instance.dispatchAction(action("POWER_CLOSE"));
instance.dispatchAction(action("START_PRIMARY_PRESS", { command: "spindleStart" }));
check("Z3040主轴运行", instance.normalizeSolverResult().motorStates.M1.running);
instance.dispatchAction(action("START_PRIMARY_PRESS", { command: "rockerUp" }));
check("Z3040 KT延时期间摇臂不动作", !instance.normalizeSolverResult().motorStates.M2.running);
instance.dispatchAction(action("START_SECONDARY_PRESS", { command: "timerComplete" }));
check("Z3040 KT完成后摇臂上升", instance.normalizeSolverResult().motorStates.M2.direction === "up");
check("Z3040升降动态电流存在", instance.normalizeSolverResult().activeControlWireIds.length >= 4);
instance.dispatchAction(action("PROTECTION_SECONDARY_TOGGLE", { command: "zSq1Upper" }));
check("Z3040 SQ1上限位立即停止上升", !instance.normalizeSolverResult().motorStates.M2.running);
instance.dispatchAction(action("STOP_SECONDARY_PRESS", { command: "hydraulicStop" }));
check("Z3040停止升降与液压", !instance.normalizeSolverResult().motorStates.M2.running && !instance.normalizeSolverResult().motorStates.M3.running);
instance.dispatchAction(action("START_PRIMARY_PRESS", { command: "clamp" }));
check("Z3040夹紧时KM5吸合", instance.getStateSnapshot().devices.KM5.energized);
instance.dispatchAction(action("PROTECTION_SECONDARY_TOGGLE", { command: "zSq3" }));
check("Z3040 SQ3夹紧到位立即停止KM5", !instance.getStateSnapshot().devices.KM5.energized);
instance.dispatchAction(action("START_PRIMARY_PRESS", { command: "clamp" }));
instance.dispatchAction(action("PROTECTION_SECONDARY_TOGGLE"));
check("Z3040 FR2过载切断液压", !instance.normalizeSolverResult().motorStates.M3.running);
instance.unmount();
check("卸载后定时器清零", scope.diagnostics().timeoutCount === 0);
scope.dispose();

const failed = checks.filter((item) => !item.passed);
console.log(JSON.stringify({ passed: failed.length === 0, checks, failed }, null, 2));
if (failed.length) process.exitCode = 1;
