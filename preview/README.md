# 第二章新增模块独立预览

该目录只用于 Review 第二章增量模块，不替代平台正式入口，也不修改 `index.html`。

在仓库根目录启动静态服务器：

```text
python -m http.server 8766
```

访问：

```text
http://127.0.0.1:8766/preview/ch02-additions-preview.html
```

预览页加载仓库现有 Module Contract、Runtime Scope、Registry、Loader、Facade Adapter，并仅注册：

- `ch02_mixed_jog_continuous`
- `ch02_multi_point`
- `ch02_machine_tool_circuits`

页面右侧“验收诊断”会显示 Contract、Facade、Solver/Geometry 与生命周期资源计数。
