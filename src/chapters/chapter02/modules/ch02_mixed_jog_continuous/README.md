# ch02_mixed_jog_continuous

第二章“点动与长动混合控制”增量实验模块。模块同时保留三种参考接线方案，用于比较不同实现路径，不修改第二章已有点动、长动、正反转等成熟模块。

## 模块边界

- `moduleId`: `ch02_mixed_jog_continuous`
- `routeId`: `mixed-jog-continuous`
- `order`: `5`
- 内部 ID 全部使用 `ch02_mixed_jog_continuous__*` 命名空间。
- CSS 只在 `[data-module="ch02_mixed_jog_continuous"]` 下生效。
- 无 `window` 业务状态、timer、interval 或跨模块私有状态读取。
- 点动的 `pointerup` / `pointercancel` / 页面失焦监听由模块 Runtime Scope 注册和清理；即使操作区在按下后重绘，也能可靠收到松开动作。

## 三种方案

1. 方式一：SA转换开关选择点动/长动；SA闭合时允许KM1辅助常开触点自锁。
2. 方式二：SB3复合按钮采用先断后合/先断后恢复顺序，点动时切断自锁路径。
3. 方式三：中间继电器K负责长动保持，SB3点动时切断K并直接驱动KM1。

## 文件职责

- `circuit.data.js`：元件、ports、wires、routePoints、junctions、deviceEdges 与参考来源。
- `solver.js`：operationState → 稳定设备状态 → Solver Result。
- `teaching.js`：真实求解结果对应的动作原理与回放步骤。
- `view.js` / `module.css`：模块内 SVG 原理图与隔离样式。
- `facade.js` / `module.js`：Module Contract 1.1 / facade-v1 接入。

## 验收

`runTests()` 覆盖断电、三种方案、点动按住/释放、自锁、停止优先、FR1过载/复位不自启与QF1分闸；`validateGeometry()` 检查命名空间、wireId重复与Geometry Lock。
