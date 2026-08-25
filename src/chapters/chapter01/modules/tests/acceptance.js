"use strict";

const fs = require("fs");
const path = require("path");
const vm = require("vm");

const repositoryRoot = path.resolve(__dirname, "../../../../..");
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

const sandbox = {
  console,
  setTimeout,
  clearTimeout,
  setInterval,
  clearInterval,
  AbortController,
  document: { getElementById: () => null }
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
  reports.push({ moduleId: definition.meta.moduleId, geometry, behavior });
  instance.unmount({});
  scope.dispose();
  if (!geometry.valid || !behavior.passed || !scope.diagnostics().disposed) {
    throw new Error(`Acceptance failed for ${definition.meta.moduleId}: ${JSON.stringify(reports.at(-1))}`);
  }
});

console.log(JSON.stringify({
  passed: true,
  registry: registry.diagnostics(),
  reports
}, null, 2));
