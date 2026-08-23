# ASSET_KEEP_LIST

## 当前保留图片资源

| 文件 | 分类 | 原因 |
|---|---|---|
| `artifacts/reference/main_control_source.png` | A | 当前运行代码直接引用；主电路与控制电路的正式参考原图。 |
| `artifacts/reference/jog_control_source.png` | A | 当前运行代码直接引用；点动控制的正式参考原图。 |
| `artifacts/reference/continuous_control_source.png` | A | 当前运行代码直接引用；长动控制的正式参考原图。 |
| `artifacts/reference/forward_reverse_source.png` | A | 当前运行代码直接引用；正反转控制的正式参考原图。 |
| `artifacts/屏幕截图 2026-08-14 103742.png` | B | 与 `artifacts/reference/jog_control_source.png` 完全同 hash 的历史别名图；仓库内无引用，但 `d:\electric\tmp_jog_check.js` 仍有旧路径依赖，暂不删除。 |

## 分类说明

- `A` = 当前运行代码使用
- `B` = Geometry / 原理图 / 校准参考
