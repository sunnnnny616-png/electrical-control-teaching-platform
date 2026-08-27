"use strict";

const fs = require("fs");
const path = require("path");
const vm = require("vm");

const root = path.resolve(__dirname, "../../../../../..");
const output = process.argv[2] || path.join(root, "tmp", "machine-tool-fixtures");
fs.mkdirSync(output, { recursive: true });
const context = vm.createContext({ console, setTimeout, clearTimeout, AbortController });
[
  "src/chapters/chapter02/modules/ch02_machine_tool_circuits/circuit.data.js",
  "src/chapters/chapter02/modules/ch02_machine_tool_circuits/solver.js",
  "src/chapters/chapter02/modules/ch02_machine_tool_circuits/view.js"
].forEach((file) => vm.runInContext(fs.readFileSync(path.join(root, file), "utf8"), context, { filename: file }));

const platform = context.ECTPPlatform;
const data = platform.moduleCircuitData.ch02MachineToolCircuits;
const solver = platform.moduleSolvers.ch02MachineToolCircuits;
const css = fs.readFileSync(path.join(root, "src/chapters/chapter02/modules/ch02_machine_tool_circuits/module.css"), "utf8")
  .replace('[data-module="ch02_machine_tool_circuits"] {', "svg {")
  .replaceAll('[data-module="ch02_machine_tool_circuits"] ', "");

function render(name, operationState) {
  const state = solver.createInitialState({ operationState });
  const solved = solver.solve(state);
  const rootNode = { innerHTML: "", querySelectorAll: () => [] };
  const view = platform.moduleViews.createCh02MachineToolCircuitsView({ mountRoot: rootNode, dispatchAction: () => undefined });
  view.render({ data, state: solved.state, result: solved.solverResult });
  const match = rootNode.innerHTML.match(/<svg[^>]*>([\s\S]*?)<\/svg>/);
  if (!match) throw new Error(`SVG not found for ${name}`);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1498 1135" width="1498" height="1135"><style>${css}</style><rect width="1498" height="1135" fill="#fff"/>${match[1]}</svg>`;
  fs.writeFileSync(path.join(output, `${name}.svg`), svg);
}

render("ca6140-idle", { variant: "ca6140", power: "closed" });
render("ca6140-forward", { variant: "ca6140", power: "closed", caCommand: "forward" });
render("z3040-idle", { variant: "z3040", power: "closed" });
render("z3040-up", { variant: "z3040", power: "closed", zRocker: "up", zClamp: "loosen", zTimer: "completed", zSq2: "triggered" });
console.log(output);
