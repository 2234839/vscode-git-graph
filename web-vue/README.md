# web-vue/ — Vue3 + Vite + TypeScript 前端

## 架构概览

```
web-vue/
├── src/
│   ├── App.vue                # 根组件（布局）
│   ├── main.ts                # 应用入口（Vue + Pinia 初始化）
│   ├── components/
│   │   ├── CommitGraph.vue    # SVG commit 图（命令式渲染）
│   │   ├── CommitTable.vue    # 提交列表表格
│   │   └── Controls.vue       # 顶部控制栏
│   ├── composables/
│   │   └── useVsCodeApi.ts    # VS Code WebView API 封装
│   ├── stores/
│   │   └── gitGraph.ts        # Pinia store（核心状态管理）
│   ├── types/
│   │   └── index.ts           # 共享类型定义（引用后端 types）
│   ├── utils/
│   │   └── (待迁移)
│   └── styles/
│       └── main.css           # 全局样式
├── index.html                 # 开发模式 HTML（生产由后端生成）
├── vite.config.ts             # Vite 配置（适配 WebView）
├── tsconfig.json              # TypeScript 配置
└── package.json
```

## 构建系统

### 开发

```bash
cd web-vue && npm install && npm run dev
```

Vite dev server 启动后，可以在浏览器中调试（但无 VS Code API）。

### 生产构建

```bash
cd web-vue && npm run build
```

输出到 `../media/out.min.js` 和 `../media/out.min.css`，由后端 `gitGraphView.ts` 引用。

### 与后端集成

`vite.config.ts` 配置了：
- `base: './'` — 适配 WebView URI
- `cssCodeSplit: false` — CSS 内联不分割
- 单文件输出 `out.min.js` — CSP 兼容

## 迁移状态

| 模块 | 状态 | 说明 |
|------|------|------|
| 项目骨架 | ✅ 完成 | Vite + Vue3 + TS + Pinia |
| WebView 通信 | ✅ 完成 | `useVsCodeApi` composable |
| 状态管理 | ✅ 完成 | Pinia store（核心字段） |
| Controls (顶部栏) | 🔄 骨架 | 需迁移下拉菜单、分支/标签过滤 |
| CommitTable | 🔄 骨架 | 需迁移 textFormatter、分支/标签标签 |
| CommitGraph | 🔄 骨架 | 需迁移 graph.ts（命令式 SVG 保留） |
| Dialog | ❌ 待迁移 | 1084 行，对话框/表单系统 |
| ContextMenu | ❌ 待迁移 | 185 行，右键菜单 |
| FindWidget | ❌ 待迁移 | 469 行，搜索功能 |
| SettingsWidget | ❌ 待迁移 | 1430 行，设置面板 |
| Dropdown | ❌ 待迁移 | 363 行，下拉选择器 |

## 设计决策

### 为什么保留命令式 SVG 渲染？

`graph.ts`（1054行）直接操作 SVG DOM 来绘制 commit 图。迁移到 Vue 声明式 SVG（`v-for` 创建 `<circle>` / `<path>`）会导致：

1. **性能回退** — 数百个节点的虚拟 DOM diff 比直接 DOM 操作慢
2. **算法复杂** — `determinePath()` 布局算法产出的是连续路径段，不适合声明式表达
3. **已有优化** — 事件委托、离线 DOM 构建等优化已实施

因此 `CommitGraph.vue` 仅作为容器，`Graph` class 内部管理 SVG DOM。

### 为什么不用 Vue 的 SVG 渲染？

Vue 的模板系统对 SVG 的支持有限（namespace 需要特殊处理），且大型 SVG 图的响应式追踪开销不可忽视。保留命令式操作是最务实的选择。

## 后端修改指南

迁移完成后，需要修改 `src/gitGraphView.ts` 的 `getHtmlForWebview()`：

1. HTML 模板中将 `<div id="commitTable">` 改为 `<div id="app">`
2. 初始状态注入方式不变（`var initialState = ...`）
3. 引用 `out.min.js` / `out.min.css` 的方式不变
4. 但需确保 `acquireVsCodeApi()` 在 Vue 应用初始化前可被调用

### package.json scripts 更新

将 `compile-web` 从：
```json
"compile-web": "tsc -p ./web && node ./.vscode/package-web.js"
```
改为：
```json
"compile-web": "cd web-vue && npm run build"
```
