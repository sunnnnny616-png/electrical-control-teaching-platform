# 机床综合线路

- `moduleId`: `ch02_machine_tool_circuits`
- `routeId`: `machine-tool-circuits`
- 参考真源：第二章 PPT 第90、104页（筛选报告原图27、28）
- 子电路：CA6140卧式车床、Z3040摇臂钻床
- 成熟度：M3

## 边界

本模块只在自身命名空间内实现 SQ、KT、YV 原型行为，不修改公共 Schema、Platform、第二章四个成熟模块或公共元件标准。

## 验收重点

- CA6140：KM1/KM2互锁、正反方向、SQ1/SQ2限位、FR过载、KT计时。
- Z3040：主轴自锁、摇臂升降时序、KM2/KM3互锁、SQ1/SQ2/SQ3联锁、夹紧/松开、FR1/FR2保护。
- Current Flow 只读取 Solver 的 active/partial wire IDs，使用原始 `routePoints`。
- 模块切换、暂停、卸载时清理 KT 定时器。
