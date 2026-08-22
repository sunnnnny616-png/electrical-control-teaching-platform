# PROJECT_HANDOFF_MAP

## A. 当前入口文件

- 主 HTML / 主 JS / 主 CSS：`index.html`
  - 内联样式：`index.html:7-2765`
  - 页面结构：`index.html:2768-3238`
  - 运行逻辑、模块数据、Solver、回放、API：`index.html:3244-13868`
- 项目说明与启动提示：`README.md:1-20`
- 构建/启动方式：纯静态站点，无打包步骤；可直接打开 `index.html`，也可在仓库根目录下用任意静态服务器启动。
- GitHub Pages 实际入口：`/index.html`

## B. Platform Shell 文件

全部平台壳都在 `index.html`，没有拆分的壳层文件。

- 顶部 Header
  - HTML：`index.html:2769-2771`
  - CSS：`index.html:1339-1353`
  - JS 绑定：`index.html:3542-3545`, `index.html:12008-12055`
- 左侧章节导航
  - HTML：`index.html:2774-2813`
  - CSS：`index.html:1394-1484`
  - JS 绑定：`index.html:3541`, `index.html:13376-13383`, `index.html:13635-13636`
- 中央实验容器
  - HTML：`index.html:2815-3068`
  - CSS：`index.html:1486-1552`
  - JS 渲染：`index.html:8640-9547`, `index.html:9549-10641`, `index.html:10643-11524`, `index.html:12008-12055`
- 右侧操作区
  - HTML：`index.html:3071-3113`
  - CSS：`index.html:2427-2475`
  - JS：按钮事件 `index.html:13457-13532`，操作反馈 `index.html:11799-11924`
- 右侧当前状态
  - HTML：`index.html:3115-3126`
  - CSS：`index.html:2477-2538`
  - JS：状态 refs `index.html:3591-3600`，统一渲染入口 `index.html:12008-12055`
- 右侧动作原理
  - HTML：`index.html:3128-3140`
  - CSS：`index.html:2540-2595`
  - JS：文案来源 `index.html:3244-3299`，教学反馈/回放状态 `index.html:4981-5834`, `index.html:9599-9771`, `index.html:12173-12469`
- 右侧 AI 区域
  - HTML：`index.html:3142-3148`
  - CSS：`index.html:2593-2595`
  - JS：无真实 API，纯占位
- 底部 Playback
  - HTML：`index.html:3205-3238`
  - CSS：`index.html:2597-2764`
  - JS：回放控制 `index.html:13458-13555`，快照/步骤构造 `index.html:4981-5097`
- Footer 隐藏兼容节点
  - 隐藏提示与图例：`index.html:3230-3237`
  - 仅为兼容现有 refs，不再作为正式 UI 展示

## C. UI / CSS 文件

- `index.html` 是唯一 UI 文件。
- 没有独立 `*.css`、`*.js`、模板目录或组件目录。
- 统一文本配置入口：`index.html:3244-3299` 的 `moduleCatalog`
- 统一 DOM refs：`index.html:3540-3629`

## D. 每个实验模块位置

### 1. 正反转

- 模块配置：`index.html:3287-3297`
- Geometry：`index.html:3762-3785`
- portMap：`index.html:3678-3760`
- wires：`index.html:3787-4037`
- deviceEdgeDefs：`index.html:4375-4402`
- operationState：`index.html:3320-3329`
- stableControlState / solver：`index.html:3332-3351`
- Solver：`index.html:4615-4769`
- teaching feedback / playback：`index.html:4981-5834`
- tests：`index.html:6223-6358`

### 2. 主电路与控制电路

- 模块配置：`index.html:3245-3256`
- Geometry：`index.html:3961-4037`
- portMap：`index.html:3869-3959`
- wires：`index.html:3988-4037`
- deviceEdgeDefs：`index.html:4041-4070`
- operationState：`index.html:3412-3421`
- stableControlState：`index.html:3422-3443`
- Solver：`index.html:7921-8068`
- teaching feedback / playback：`index.html:8163-8218`, `index.html:12173-12282`
- tests：`index.html:6078-6219`

### 3. 点动

- 模块配置：`index.html:3258-3272`
- Geometry：`index.html:4130-4175`
- portMap：`index.html:4073-4128`
- wires：`index.html:4147-4175`
- deviceEdgeDefs：`index.html:4179-4197`
- operationState：`index.html:3444-3449`
- stableControlState：`index.html:3450-3472`
- Solver：`index.html:9904-10015`
- teaching feedback / playback：`index.html:10079-10129`, `index.html:12304-12469`
- tests：`index.html:5920-5988`

### 4. 长动

- 模块配置：`index.html:3274-3284`
- Geometry：`index.html:4254-4299`
- portMap：`index.html:4200-4252`
- wires：`index.html:4272-4299`
- deviceEdgeDefs：`index.html:4303-4322`
- operationState：`index.html:3473-3479`
- stableControlState：`index.html:3480-3494`
- Solver：`index.html:8798-8912`
- teaching feedback / playback：`index.html:8977-9035`, `index.html:9599-9771`
- tests：`index.html:5992-6074`

## E. 每个 Solver 位置

- 正反转：`solveControlCircuit` / `recomputeElectricalSolver` 在 `index.html:4615-4769`
- 主电路与控制电路：`solveMainControlControlCircuit` / `recomputeMainControlSolver` 在 `index.html:7921-8068`
- 长动：`solveContinuousControlControlCircuit` / `recomputeContinuousControlSolver` 在 `index.html:8798-8912`
- 点动：`solveJogControlControlCircuit` / `recomputeJogControlSolver` 在 `index.html:9904-10015`

## F. 公共 / 重复元件代码位置

### 已公共化，但仍集中在单文件中

- 标签：`createFormalTextLabel` `index.html:6838`
- 端子：`createSimTerminal` `index.html:7021`
- 按钮：`createPushButton` `index.html:7208`
- 线圈：`createCoil` `index.html:7291`
- QF：`createQf1Component` `index.html:7362`
- FU：`createFuseComponent` `index.html:7497`
- FR：`createFrMain` `index.html:7562`
- M（正反转通用电机）：`createMotorComponent` `index.html:7645`

### 仍散落 / 模块内特化

- 主电路双电机：`createMainControlMotorComponent` `index.html:8272`
- 长动电机：`createContinuousControlMotorComponent` `index.html:9184`
- 点动电机：`createJogControlMotorComponent` `index.html:10278`
- 各模块的 portMap / wires / deviceEdgeDefs 仍各自独立，尚未抽公共 Schema

## G. Assets 保留清单

见 `ASSET_KEEP_LIST.md`

## H. 已删除废弃 Assets

见 `DELETED_ASSETS.md`

## I. Tests 位置

- 仓库内：所有正式测试入口仍在 `index.html`
  - 正反转：`runSolverTests` `index.html:6223-6358`
  - 主电路：`runMainControlSolverTests` `index.html:6078-6219`
  - 长动：`runContinuousControlSolverTests` `index.html:5992-6074`
  - 点动：`runJogControlSolverTests` `index.html:5920-5988`
  - 对外 API：`window.solverApi.runTests()` `index.html:13868`
- 仓库外辅助审计脚本
  - `d:\electric\continuous_control_playwright.spec.js`
  - `d:\electric\main_control_logic_audit.js`
  - `d:\electric\main_control_button_principle_check.js`
  - `d:\electric\main_control_playback_control_check.js`
  - `d:\electric\jog_control_logic_audit.js`
  - `d:\electric\tmp_jog_check.js`
  - `d:\electric\pw-temp\verify_github_pages_release.js`
  - `d:\electric\pw-temp\verify_module_cleanup.js`

## J. Codex 后续允许优先重构的区域

### SAFE TO REFACTOR

- `index.html` 平台壳与右侧信息布局：`1332-3238`
- `moduleCatalog` 文案层：`3244-3299`
- refs / render 组织方式：`3540-3629`, `12008-12055`
- 公共渲染函数的抽文件工作：`6838-7645`
- 校准/审计/文档脚本的仓库内外整理

## K. Codex 后续禁止轻易修改的成熟区域

### DO NOT BREAK

- 正反转成熟拓扑数据：`3678-4403`
- 主电路成熟拓扑数据：`3869-4071`
- 点动成熟拓扑数据：`4073-4198`
- 长动成熟拓扑数据：`4200-4323`
- 各模块 Solver 导通与稳态规则：`4615-4769`, `7921-8068`, `8798-8912`, `9904-10015`
- 教学回放与当前流路径构造：`4981-5834`, `9599-9771`, `12173-12469`

## L. 当前技术债

- 单文件过大：HTML / CSS / JS / 数据 / Solver / tests 全在 `index.html`
- 公共元件虽已初步统一，但仍未抽成独立模块
- 右侧提示文案仍依赖隐藏兼容节点 `infoTitle / infoText / tipText`
- 顶层 `artifacts` 还存在 1 张历史别名图，因外部旧脚本引用而暂保留
- 外部验证脚本分散在 `d:\electric`，未并入仓库
