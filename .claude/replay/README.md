# 标准场景回放脚本集

断言式脚本，输出红/绿 + 失败原因。登记处：新增/变更脚本在此表登记并回链对应 `doc/*.md`。

| 脚本 | 场景 | 断言 | 关联文档 |
|---|---|---|---|
| `graph-alignment/` | 图表节点与 commit 表格行对齐 + 全功能冒烟 | 4 个对齐场景圆点 cy 与行中心最大偏差 ≤ 1px，且 6 项功能冒烟全过（红/绿） | `doc/fix-graph-table-alignment.md` |

## graph-alignment — 图表/表格对齐

- **运行**：
  1. 仓库根起静态服务：`python3 -m http.server 8641 --bind 127.0.0.1`（集成浏览器对 `file://` 返回 403，必须走 http）
  2. 浏览器打开 `http://127.0.0.1:8641/.claude/replay/graph-alignment/harness.html`
  3. 将 `graph-alignment/verify.js` 内容作为 Playwright 代码在 harness 页面上执行，返回 `{pass, failedScenarios, scenarios}` 即红/绿结果
- **原理**：`harness.html` mock `acquireVsCodeApi` + `window.initialState` + 假后端（应答 `loadRepoInfo`/`loadCommits`/`loadConfig`），加载真实的 `media/out.min.js`，驱动 app 完成三个场景后量取每个 SVG 圆点 `cy` 与对应 `tr.commit` 行中心的偏差（同一坐标系，`#content` 为原点）
- **场景**：
  - 对齐（阈值 1.0px，全量行配对，不抽样）：boot（500 行基线）/ loadMore（500→1000）/ refresh（→450，模拟切到提交更少的分支）/ CDV 展开 250px（commit 详情面板改变表格几何后再量）
  - 功能冒烟：dateSanity（日期格式）/ headDot（HEAD 圆点）/ refLabelColour（分支标签配色，需 `injectColourVars()`）/ contextMenu（右键 15 项开合，合成事件 + clientX/Y）/ findWidget（`Commit number 250` 命中 1 of 1 + 关闭收起）/ settingsWidget（开合）
- **历史根因**：commits 变化后在 Vue 更新 DOM 前同步反推行高 → `grid.y` 错误 → 偏差随行号线性累积（修复前 loadMore 场景最后一行偏 1.2 万像素）
- **注意**：
  - 改 `web-vue` 渲染相关代码后必须先 `npx vite build` 重建 `media/out.min.js`，再跑本脚本
  - 隐藏页面 rAF 永不触发（App.vue 用 rAF 调度 initEngine）→ harness 顶部有 rAF→setTimeout(16) polyfill，必须在 bundle 之前，勿删
  - 隐藏页面不能用 Playwright 可信点击，UI 事件一律合成事件 + clientX/clientY
  - `contextMenuActionsVisibility` 必须给完整结构（7 组子字段），空对象会让 contextMenu 构造崩溃（harness 逼真度问题，非应用 bug）
  - goto 同 URL 不会重载，脚本内显式 `page.reload()`；page.evaluate 多参数要包成一个对象传
