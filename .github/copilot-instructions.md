# vscode-git-graph 项目协作提示词

## Harness 工程（最高优先级，先读这段）

本项目维护了一套 **webview 回放 harness 自验证体系**，位于 `.claude/replay/graph-alignment/`。
改 `web-vue/` 任何渲染/交互逻辑后，**先跑 harness 断言拿到绿结果，再交付**。不许让用户手工验证 AI 自己能验证的东西。

### 体系构成

| 文件 | 作用 |
| --- | --- |
| `.claude/replay/graph-alignment/harness.html` | 假后端 webview 页：mock `acquireVsCodeApi`、`window.initialState`、完整 config，IIFE 内 fakeBackend 应答 loadRepoInfo/loadCommits/loadConfig/commitDetails |
| `.claude/replay/graph-alignment/verify.js` | 断言脚本（红/绿输出）：4 对齐场景 + 功能冒烟，作为 Playwright 代码执行 |
| `.claude/replay/README.md` | 回放清单与运行步骤 |

### 运行步骤

1. 改动前端后重新构建：`cd web-vue && npx vite build`（产物进 `media/out.min.*`）
2. 仓库根起静态服务：`python3 -m http.server 8641 --bind 127.0.0.1`（集成浏览器对 `file://` 返回 403，必须走 http）
3. 浏览器打开 `http://127.0.0.1:8641/.claude/replay/graph-alignment/harness.html`，执行 `verify.js` 内容（Playwright 代码）
4. 断言输出 `HARNESS PASS` 即绿；任何 FAIL 先修，不许带红交付

### 断言覆盖

- **对齐**（阈值 1.0px，比较每行行中心 y 与 SVG `circle[data-id]` cy）：boot 500 / loadMore→1000 / refresh→450 / CDV 展开 250px
- **功能冒烟**：dateSanity（日期格式）、headDot（HEAD 圆点）、refLabelColour（分支标签配色）、contextMenu（右键 15 项开合）、findWidget（查找命中 + 关闭）、settingsWidget（开合）

### 已踩过的坑（勿回退）

- **隐藏页面 rAF 永不触发**：App.vue 用 rAF 调度 initEngine，浏览器隐藏 tab 里 rAF 不跑 → boot 永远不发生。harness 顶部已放 rAF→setTimeout(16) polyfill，必须保持在 bundle 之前
- **隐藏页面不能用 Playwright 可信点击**（可见性检查超时），UI 事件一律 `dispatchEvent(new MouseEvent(..., {clientX, clientY}))` 合成
- **`contextMenuActionsVisibility` 必须给完整结构**（7 组子字段），空对象会让 contextMenu 构造崩溃——这是 harness 逼真度问题，不是应用 bug
- **查找关键词必须在已加载行数内**（boot 500 行 → 用 `Commit number 250`，不是 999）
- **findWidget 关闭判定**：close() 是移除 `active` class + `input.disabled=true`，不是给 widget 加 disabled
- **goto 同 URL 不会重载**，需要显式 `page.reload()`
- **page.evaluate 多参数要包成一个对象传**
- **分支标签颜色 `--git-graph-color` 不在 out.min.css**，是后端 `gitGraphView.ts` getHtmlForWebview() 动态注入的，harness 里 `injectColourVars()` 复刻这段

### 真实 VS Code e2e（当前不可用，勿再盲试）

本机 WSL2 + WSLg **无 GPU**：被测 VS Code 实例 GUI 启动后 ~90s 内软件渲染崩溃（SIGTRAP，drmGetDevices2 找不到设备），`--disable-gpu` 无效。曾尝试的现场在 `/tmp/gg-e2e/`（含 launch/measure 脚本与 600 提交测试仓库，可复用脚本；下载的 VS Code 约 300MB，`rm -rf /tmp/gg-e2e/.vscode-test` 可清）。可行替代：在 Windows 宿主 VS Code 里 `Developer: Toggle Developer Tools`，用 CDP 连真 webview 验证。

## 工程约定

- 前端源码在 `web-vue/`（Vue3 + Pinia），**不要改回** `web/` 原生 JS 版；`media/out.min.*` 是构建产物
- 后端 bundle 用 tsdown 编到 `out/`；`src/types.ts` 单独编译为 `out/types.d.ts`，前端经 `backend-types` alias 引用
- 核心状态在 `web-vue/src/stores/gitGraph.ts`（替代原 mainController）；网格对齐逻辑在 `updateGridDimensions()`，渲染统一走 `store.renderGraph()`，不要在 watch 里直接 `store.graph?.render(...)`
- 改完 TS 跑 `npx vue-tsc --noEmit`（web-vue 内）确认无类型错误
- Git 提交直接在当前分支进行，阶段性完成后建议提交落库
