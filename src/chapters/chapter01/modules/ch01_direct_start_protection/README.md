# ch01_direct_start_protection

第一章综合直接启动保护 M3 模块。

- 参考真源：`电器控制系统_电路图开发(1).pdf` 第 11 页。
- 启动链：QF1 合闸 -> SB1 瞬时启动 -> KM1 得电 -> 辅助 NO 自锁 -> 主触点闭合 -> M 连续运行。
- 停止链：SB2 常闭触点断开 -> KM1 释放 -> 自锁解除 -> M 停止。
- 保护链：FR1 过载 -> 控制 NC 断开 -> KM1 释放 -> M 停止；复位后仍需重新启动。
- FU 当前按项目规范保持正常导通，不伪造尚未冻结的熔断状态。

## 可重复改线

端口、导线、器件和器件边全部定义在 `circuit-data.js`。修改线路时只调整该文件中的数据；Solver、SVG 基础线、Current Flow 和 Geometry 验收会读取同一拓扑，避免多套线路不一致。

运行验收：

```bash
node src/chapters/chapter01/modules/tests/acceptance.js
```
