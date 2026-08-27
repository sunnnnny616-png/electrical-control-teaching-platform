# ch02_multi_point

第二章“多地点远程控制”增量实验模块。两个停止按钮串联，两个启动按钮并联，共同控制同一KM1和电机。

## 模块边界

- `moduleId`: `ch02_multi_point`
- `routeId`: `multi-point-control`
- `order`: `6`
- 内部 ID 全部使用 `ch02_multi_point__*` 命名空间。
- CSS 只在 `[data-module="ch02_multi_point"]` 下生效。
- 不修改公共组件、Simulation Core、Registry、Schema 或第二章成熟模块。

## 差异化功能

- 1SB1 / 2SB1：并联启动，任一地点可启动并建立KM1自锁。
- 1SB2 / 2SB2：串联停止，任一地点可切断整条控制回路。
- HL1 / HL2：仅作为本模块的可选原型显示，状态来自 Solver Result `extension.indicators`；不宣称为公共HL最终标准。
- FR1：过载时切断KM1线圈回路，复位不会直接启动电机。

## 文件职责

- `circuit.data.js`：元件、ports、wires、routePoints、junctions、deviceEdges 与参考来源。
- `solver.js`：串联停止、并联启动、自锁、保护与主回路求解。
- `teaching.js`：真实求解结果对应的教学反馈与回放步骤。
- `view.js` / `module.css`：模块内 SVG 原理图与隔离样式。
- `facade.js` / `module.js`：Module Contract 1.1 / facade-v1 接入。

## 验收

`runTests()` 覆盖两个地点的启停、自锁、FR1与HL原型状态；`validateGeometry()` 检查命名空间、重复ID与Geometry Lock。
