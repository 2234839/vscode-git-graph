# 修复：图表节点与 commit 表格行错位（偏移随滚动累积）

## 目标 / 约束 / 方案

- **现象**：Graph 列的 SVG 节点与右侧 commit 行有时不对应；向下滚动较多后彻底对不上。
- **约束**：SVG 覆盖层按 `y = 行号 × grid.y + offsetY` 画节点，表格行按 CSS 行高排布，两者必须共享同一行高；原版 `web/main.ts renderGraph()` 的行高靠「表格总高 ÷ 行数」反推，Vue 版忠实翻译了算法，但调用时机出了问题。
- **方案**：所有渲染路径统一走 `store.renderGraph()`（内部 nextTick 等 Vue patch 完成后再量网格）。

## 根因

`finaliseLoadCommits()` 在 `commits.value` 赋值后**同步**调用 `updateGridDimensions()`：
此时 Vue 还没把新行渲染进 DOM，量到的是**旧表格高度**，除的却是**新行数**：

- loadMore（500→1000 行）：`derived ≈ 500×24 ÷ 1000 = 12px` → 节点间距减半，最后一行偏 ~1.2 万像素；
- 切到提交更少的分支（1000→450 行）：`derived ≈ 53px` → 同理严重错位；
- 行数小幅变化的场景则表现为每行零点几像素的**线性累积漂移**（越往下越偏）。

雪上加霜：`CommitGraph.vue` 的 `commits`/`commitHead` watch 直接调 `graph.render()`，**跳过**网格同步，把错误的 `grid.y` 画进 SVG，之后没有任何机制纠正。首次加载恰好安全（空表格量出 derived=0，被 `tableHeight > headerHeight` 守卫挡住）——这就是「有时候对不上」的原因。

## 修改（3 处）

1. `web-vue/src/stores/gitGraph.ts` `finaliseLoadCommits()`：同步 `updateGridDimensions()` → `renderGraph()`（自带 nextTick + 去抖）；
2. `web-vue/src/components/CommitGraph.vue` `commits` watch：`graph.render(...)` → `store.renderGraph()`；
3. 同文件 `commitHead` watch：同上。

## 验证方法

回放脚本：`.claude/replay/graph-alignment/`（运行方式见该目录 README，登记在 `.claude/replay/README.md`）。
假后端 harness 加载真实 bundle，量三场景全量行的「圆点 cy vs 行中心」偏差：

| 场景 | 修复前 | 修复后 |
|---|---|---|
| boot 500 行 | 0.5px | 0.5px |
| loadMore 500→1000 | 11993.7px（最后一行） | 0.5px |
| 切小分支 1000→450 | 13185.7px（最后一行） | 0.5px |
| CDV 展开 250px | 未量测（同根因） | 0.5px |

功能冒烟（同一脚本）：dateSanity / headDot / refLabelColour（rgb(255,0,0)，需复刻后端动态注入的颜色映射）/ contextMenu（15 项开合）/ findWidget（`Commit number 250` → 1 of 1 + 关闭收起）/ settingsWidget（开合）——全部 PASS，输出 `HARNESS PASS (align 4 + features 6)`。

## 坑

- 修 bug 前先确认反推式布局的**量测时机**：`commits` 赋值 ≠ DOM 已更新，所有量 DOM 尺寸的代码必须等 nextTick；
- 多条渲染路径（store 直接 render vs watch render）会造成「网格同步被跳过」的暗门，统一收敛到一个入口（`renderGraph()`）；
- 集成浏览器对 `file://` 页面返回 403（不在受信任文件夹），回放 harness 必须经本地 http 服务加载；
- 隐藏页面 rAF 永不触发：App.vue 用 rAF 调度 initEngine，浏览器隐藏 tab 里 rAF 不跑 → boot 永远不发生；harness 用 rAF→setTimeout(16) polyfill 解决（必须在 bundle 之前）；
- webview 的 body 字色/字体与全套 Dark+ CSS 变量、`[data-color=N]{--git-graph-color}` 映射都是后端 getHtmlForWebview() 动态注入的，out.min.css 里没有，浏览器环境必须手动补，否则页面全黑、分支标签全黑；
- 真实 VS Code e2e 在本机 WSLg 不可用（无 GPU，被测实例 GUI ~90s 内软件渲染崩溃 SIGTRAP，`--disable-gpu` 无效），验证走 harness 路线；现场脚本留在 `/tmp/gg-e2e/`。
