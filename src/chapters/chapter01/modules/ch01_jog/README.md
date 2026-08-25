# ch01_jog

第一章点动控制 M3 模块。

- 参考真源：`电器控制系统_电路图开发(1).pdf` 第 3、12 页。
- 操作链：QF 合闸 -> 按住 SB -> KM 得电 -> 主触点闭合 -> M 运行；松开 SB 后立即停止。
- 保护链：FR 过载 -> 控制 NC 断开 -> KM 释放 -> M 停止；FR 复位不会自动启动。

## 可重复改线

端口、导线、器件和器件边全部定义在 `circuit-data.js`。修改线路时只调整该文件中的 `ports`、`wires`、`components` 或 `deviceEdges`；基础导线与 Current Flow 均读取同一份 `routePoints`，不得另建动画路径。

运行验收：

```bash
node src/chapters/chapter01/modules/tests/acceptance.js
```
