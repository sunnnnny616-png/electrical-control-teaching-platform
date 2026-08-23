# `_module-template` 使用说明

该目录是第一章、第三章、第四章新模块的复制模板，不会被 `index.html` 自动加载。复制后必须改名并替换所有 `__PLACEHOLDER__`。

## 文件

- `module.js`：Registry 元数据与 Facade Module Adapter 定义。
- `facade.js`：Module Contract 1.1 的标准状态、Action、Solver Result、UI ViewModel、Teaching Feedback 和生命周期门面。
- `port.example.js`：把现有成熟动作、Solver、render、测试入口封装为模块私有 Port 的示例。

## 复制步骤

1. 将整个目录复制到 `src/chapters/<chapter>/modules/<module>/`。
2. 将 `module.js` 中的 factory、moduleId、routeId、标题、顺序和 geometryLockId 改为实际值。
3. 将 `facade.js` 中的模块常量、状态字段映射、器件 ID、按钮文案和状态行改为实际模块。
4. 在页面集成层创建模块私有 Port；Port 是唯一允许读取旧模块内部状态字段的位置。
5. Port 只转发现有 `reset`、动作函数、Solver、render、Geometry 校验和测试入口，不复制或改写它们。
6. 在 `index.html` 按依赖顺序加载 `facade.js`、`module.js`。
7. 在 Registry 注册时传入只读 `circuitData` 和模块私有 `port`。
8. 运行 Contract、Facade 输出、原 Solver 回归、状态隔离、生命周期和 UI 验收。

## 必须实现的门面

- `createInitialState()`
- `getStateSnapshot()`
- `dispatchAction(action)`
- `solve(actionMessage)`
- `normalizeSolverResult()`
- `getOperationViewModel()`
- `getStatusViewModel()`
- `buildTeachingFeedback()`
- `buildReplaySteps()`
- `mount()`、`render()`、`reset()`、`pause()`、`resume()`、`unmount()`
- `validateGeometry()`、`runTests()`

## Action 选择

优先复用 Module Contract 1.1 已有 Action：

- 电源：`POWER_CLOSE`、`POWER_OPEN`
- 单通道：`START_PRIMARY_PRESS`、`STOP_PRIMARY_PRESS`
- 第二通道：`START_SECONDARY_PRESS`、`STOP_SECONDARY_PRESS`
- 正反转：`START_FORWARD_PRESS`、`START_REVERSE_PRESS`、`STOP_PRESS`
- 点动：`JOG_PRESS`、`JOG_RELEASE`
- 保护：`PROTECTION_TOGGLE`、`PROTECTION_RESET`
- 第二保护：`PROTECTION_SECONDARY_TOGGLE`、`PROTECTION_SECONDARY_RESET`
- 模块复位：`RESET_MODULE`

不要把旧函数名作为 Action。旧函数只应出现在私有 Port 内。

## 保护边界

模板迁移禁止修改：

- Geometry、元件位置和已确认视觉
- ports、junctions、wires、deviceEdges
- Solver 输入、规则、迭代和输出语义
- Current Flow 与步骤回放
- 已验证动作函数

如果门面无法从现有 Solver 输出构造标准结果，先记录缺失字段和原因，不直接修改 Solver。

## 成功标准

- Registry 中 `integrationMode` 为 `facade-v1`。
- Module Contract 与四类 Facade 输出校验均通过。
- Platform Shell 不读取模块内部状态字段。
- 模块切换后状态复位，scope 无遗留 timer、interval、listener cleanup。
- 原模块测试全部通过，保护区哈希不变。
- 操作区、状态区和教学反馈由 ViewModel/Facade 输出驱动。

## 回滚

回滚只恢复模块定义、Facade、私有 Port、脚本标签和 Registry 注册。不要通过改动成熟电路数据或 Solver 来回滚门面迁移。
