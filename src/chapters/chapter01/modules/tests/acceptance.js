"use strict";

const fs = require("fs");
const path = require("path");
const vm = require("vm");

const repositoryRoot = path.resolve(__dirname, "../../../../..");
const captureDirectory = process.env.ECTP_CAPTURE_DIR || "";
const circuitCss = fs.readFileSync(path.join(repositoryRoot, "src/chapters/chapter01/modules/chapter01-circuits.css"), "utf8");
const indexHtml = fs.readFileSync(path.join(repositoryRoot, "index.html"), "utf8");
const matureShellCss = [...indexHtml.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/gi)].map((match) => match[1]).join("\n");
const matureFlowCss = matureShellCss.match(/\.current-flow-path\s*\{([\s\S]*?)\}/)?.[1] || "";
const standaloneCircuitCss = `${matureShellCss}\n${circuitCss
  .replaceAll('[data-module^="ch01_"] ', "")
  .replaceAll('[data-module="ch01_jog"] ', "")
  .replaceAll('[data-module="ch01_direct_start_protection"] ', "")}`;
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
  matchMedia: () => ({ matches: true }),
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
    matureCanvasScale: initialMarkup.includes('viewBox="0 0 1498 1135"'),
    matureComponentVisuals: [
      "sim-terminal-outer",
      "sim-fuse-shell",
      "sim-contact-frame",
      "sim-coil-body",
      "sim-fr-channel",
      "sim-motor-shell"
    ].every((className) => initialMarkup.includes(className)),
    matureGeometryExact: definition.meta.moduleId === "ch01_jog"
      ? initialMarkup.includes('x="910" y="542" width="122" height="125"')
        && initialMarkup.includes('x="1111" y="354" width="126" height="54"')
      : initialMarkup.includes('x="1048" y="258" width="80" height="78"')
        && initialMarkup.includes('x="1210" y="270" width="64" height="54"'),
    flexibleCanvasHeight: circuitCss.includes('.ch01-circuit-svg {\n  width: 100%;\n  height: 100%;\n  min-height: 0;'),
    matureLaptopPixelScale: circuitCss.includes('transform: scale(.9384);')
      && circuitCss.includes('transform-origin: center;'),
    matureLaptopInlineScale: initialMarkup.includes('transform:scale(.9384);transform-origin:center'),
    stableMotorRotorAnchor: /<g transform="translate\(\d+ \d+\)"><g class="sim-motor-rotor forward">/.test(activeMarkup),
    standardCoilWinding: definition.meta.moduleId === "ch01_jog"
      ? activeMarkup.includes('d="M928 606 q8 -48.5 16 0')
      : activeMarkup.includes('d="M1066 297 q4.4 -25 8.8 0')
        && !activeMarkup.includes('d="M1066 297 q8 -25 16 0'),
    playbackVisibleAtLaptopHeight: circuitCss.includes('height: calc(100vh - 240px);')
      && circuitCss.includes('min-height: 128px;'),
    matureActiveCurrentFlow: activeMarkup.includes("current-flow-path main phase-l1") && activeMarkup.includes("current-flow-path control"),
    matureFlowAnimationStyle: matureFlowCss.includes("stroke-width: 4.2;")
      && matureFlowCss.includes("vector-effect: non-scaling-stroke;")
      && matureFlowCss.includes("animation: currentFlowLine 1.1s linear infinite;"),
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
