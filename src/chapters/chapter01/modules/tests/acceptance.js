"use strict";

const fs = require("fs");
const path = require("path");
const vm = require("vm");

const repositoryRoot = path.resolve(__dirname, "../../../../..");
const captureDirectory = process.env.ECTP_CAPTURE_DIR || "";
const circuitCss = fs.readFileSync(path.join(repositoryRoot, "src/chapters/chapter01/modules/chapter01-circuits.css"), "utf8");
const standaloneCircuitCss = circuitCss
  .replaceAll('[data-module^="ch01_"] ', "")
  .replaceAll('[data-module="ch01_jog"] ', "")
  .replaceAll('[data-module="ch01_direct_start_protection"] ', "");
const sources = [
  "src/schemas/module-contract.js",
  "src/platform/runtime/runtime-scope.js",
  "src/registry/module-registry.js",
  "src/platform/module-adapter/facade-module-adapter.js",
  "src/chapters/chapter01/modules/_shared/direct-start-runtime.js",
  "src/chapters/chapter01/modules/ch01_jog/circuit-data.js",
  "src/chapters/chapter01/modules/ch01_direct_start_protection/circuit-data.js",
  "src/chapters/chapter01/modules/ch01_jog/facade.js",
  "src/chapters/chapter01/modules/ch01_direct_start_protection/facade.js",
  "src/chapters/chapter01/modules/ch01_jog/module.js",
  "src/chapters/chapter01/modules/ch01_direct_start_protection/module.js"
];

function createFakeElement() {
  return {
    innerHTML: "",
    textContent: "",
    disabled: false,
    dataset: {},
    classList: { toggle() {} },
    addEventListener() {}
  };
}

const fakeElements = new Map([
  "chapterModuleCanvas", "principleStepList", "showPrinciplePlayback", "playbackPrev",
  "playbackToggle", "playbackNext", "currentStepText", "playbackSpeed05",
  "playbackSpeed10", "playbackSpeed15"
].map((id) => [id, createFakeElement()]));

const sandbox = {
  console,
  setTimeout,
  clearTimeout,
  setInterval,
  clearInterval,
  AbortController,
  document: { getElementById: (id) => fakeElements.get(id) || null }
};
sandbox.globalThis = sandbox;
vm.createContext(sandbox);
sources.forEach((source) => vm.runInContext(
  fs.readFileSync(path.join(repositoryRoot, source), "utf8"),
  sandbox,
  { filename: source }
));

const platform = sandbox.ECTPPlatform;
const definitions = [
  platform.moduleDefinitions.createCh01Jog(),
  platform.moduleDefinitions.createCh01DirectStartProtection()
];
const registry = platform.registry.createModuleRegistry(platform.contracts);
const reports = [];

definitions.forEach((definition) => {
  registry.register(definition);
  const scope = platform.runtime.createRuntimeScope(definition.meta.moduleId);
  const instance = definition.create({
    mountRoot: null,
    services: Object.freeze({ setActionFeedback() {}, renderShell() {} }),
    scope
  });
  platform.contracts.assertModuleContract(instance);
  instance.createInitialState();
  instance.mount({});
  platform.contracts.assertFacadeOutputs(instance);
  const geometry = instance.validateGeometry();
  const behavior = instance.runTests();
  instance.render();
  const initialMarkup = fakeElements.get("chapterModuleCanvas").innerHTML;
  instance.dispatchAction("POWER_CLOSE");
  instance.dispatchAction(definition.meta.moduleId === "ch01_jog" ? "JOG_PRESS" : "START_PRIMARY_PRESS");
  instance.render();
  const activeMarkup = fakeElements.get("chapterModuleCanvas").innerHTML;
  if (captureDirectory) {
    const svg = activeMarkup.match(/<svg[\s\S]*<\/svg>/)?.[0];
    if (svg) {
      fs.mkdirSync(captureDirectory, { recursive: true });
      fs.writeFileSync(
        path.join(captureDirectory, `${definition.meta.moduleId}.svg`),
        svg.replace(">", `><style>${standaloneCircuitCss}</style>`),
        "utf8"
      );
    }
  }
  const renderSmoke = {
    initialSvg: initialMarkup.includes("ch01-circuit-svg"),
    unifiedTargetCircuit: initialMarkup.includes("ch01-target-circuit"),
    activeCurrentFlow: activeMarkup.includes("ch01-wire-flow"),
    namespacedRoot: activeMarkup.includes(`data-module="${definition.meta.moduleId}"`),
    noCanvasStateCard: !activeMarkup.includes("ch01-state-badge"),
    replayReady: instance.buildReplaySteps().length > 0
  };
  if (definition.meta.moduleId === "ch01_jog") instance.dispatchAction("JOG_RELEASE");
  instance.pause({ reason: "acceptance" });
  const lifecycleBeforeUnmount = scope.diagnostics();
  reports.push({ moduleId: definition.meta.moduleId, geometry, behavior, renderSmoke, lifecycleBeforeUnmount });
  instance.unmount({});
  scope.dispose();
  const renderPassed = Object.values(renderSmoke).every(Boolean);
  if (!geometry.valid || !behavior.passed || !renderPassed || lifecycleBeforeUnmount.intervalCount !== 0 || !scope.diagnostics().disposed) {
    throw new Error(`Acceptance failed for ${definition.meta.moduleId}: ${JSON.stringify(reports.at(-1))}`);
  }
});

console.log(JSON.stringify({
  passed: true,
  registry: registry.diagnostics(),
  reports
}, null, 2));
