# DELETE_CANDIDATES

## 已审计结果

### 1. `artifacts/屏幕截图 2026-08-14 035421.png`

- 文件大小：181,370 bytes
- 发现位置：仓库顶层 `artifacts/`
- 引用搜索结果：仓库内无引用；`d:\electric` 外部脚本无引用
- 校验结果：SHA256 与 `artifacts/reference/main_control_source.png` 完全一致
- 删除理由：无代码/样式/测试/文档引用，且只是正式参考图的重复副本
- 处理结果：已删除

### 2. `artifacts/屏幕截图 2026-08-14 120443.png`

- 文件大小：339,027 bytes
- 发现位置：仓库顶层 `artifacts/`
- 引用搜索结果：仓库内无引用；`d:\electric` 外部脚本无引用
- 校验结果：SHA256 与 `artifacts/reference/continuous_control_source.png` 完全一致
- 删除理由：无代码/样式/测试/文档引用，且只是正式参考图的重复副本
- 处理结果：已删除

### 3. `artifacts/屏幕截图 2026-08-14 103742.png`

- 文件大小：245,180 bytes
- 发现位置：仓库顶层 `artifacts/`
- 引用搜索结果：仓库内无引用；`d:\electric\tmp_jog_check.js` 仍引用该旧路径
- 校验结果：SHA256 与 `artifacts/reference/jog_control_source.png` 完全一致
- 删除理由：从仓库角度看可删，但外部辅助校验脚本仍依赖旧文件名
- 处理结果：本轮暂缓删除
