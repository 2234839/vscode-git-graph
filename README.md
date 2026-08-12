# Git Graph 中文版

查看 Git 仓库的分支与标签图谱，并直接在图谱上执行 Git 操作。

本扩展是基于 [Git Graph](https://github.com/mhutchie/vscode-git-graph) 的中文化增强 fork，在原版基础上进行了 **Vue3 架构重写**、界面全面中文化、分支颜色稳定性优化、构建现代化等深度改进。

## 相比原项目的改进

### 🏗️ 架构重写：Vue3 声明式渲染

原项目使用原生 JavaScript + 手动 DOM 操作（`innerHTML` 拼接），本 fork 将整个 WebView 前端迁移到 **Vue 3 + Vite + Pinia + TypeScript** 声明式架构：

- **组件化**：CommitGraph、CommitTable、CommitDetails、Controls 等拆分为独立 Vue 组件，CSS 采用 scoped 隔离
- **状态管理**：用 Pinia store 统一管理 Git Graph 状态，告别手动 DOM 同步
- **类型安全**：前后端共享 TypeScript 类型定义，消除类型不一致隐患
- **CSS 组件化**：1052 行全局 CSS 拆解到各组件 scoped 样式，杜绝样式冲突

### 🎨 分支颜色稳定性

原项目中合并后的分支颜色会重复或突变。本 fork 实现了**基于分支名分配颜色**的算法，彻底解耦 lane（泳道）与颜色，保证同一条分支在历史中颜色始终一致。

### 🌍 国际化与中文化

- 界面全面中文化，命令面板、右键菜单、设置项均为中文
- 重写国际化系统为语义 key 方式，支持 **UI 语言切换**（auto/zh/en）
- VS Code 命令直接显示中文（如 `Git Graph: 查看 Git Graph（git log）`）

### ⚡ 构建现代化

| 项目 | 原项目 | 本 fork |
|---|---|---|
| 后端构建 | tsc 散列编译 | **tsdown bundle**，依赖内联 |
| VSIX 大小 | ~14 MB（含全部 node_modules） | **~380 KB**（零 node_modules） |
| 前端构建 | 手写 uglify-js 压缩 | **Vite + Vue3**，HMR 热更新开发 |
| 依赖管理 | 整个 node_modules 打包 | 运行时零依赖（iconv-lite 内联） |

### ✨ 功能增强

- **历史搜索**：新增 `Search Commits in History...` 命令，支持按 message/author/hash 搜索整个仓库历史
- **标签增强**：标签自动递增、远程标签显示、Push to remote 默认选项
- **上下文菜单增强**：Edit Message、Reset Last Commit (Soft)、Create Branch、Pull Branch 等
- **多行输入**：提交/stash/tag 消息输入改为 textarea，正确保留多行换行

## 功能特性

- **分支图谱视图**：以交互式图形展示仓库历史，直观查看分支、合并和标签
- **Git 操作**：直接从图谱上执行各类 Git 操作（检出、合并、变基、推送、拉取等）
- **提交详情**：查看提交的详细信息及文件变更
- **提交对比**：对比任意两个提交之间的差异
- **代码审查**：在提交详情和对比视图中跟踪已审查的文件
- **分支与标签过滤**：按分支和标签过滤图谱显示
- **查找小部件**：按提交信息、作者或哈希搜索提交
- **仓库设置**：配置远程仓库、Issue 关联和 Pull Request 创建
- **高度可定制**：丰富的设置项，自定义图谱的外观和行为

## 安装

1. 下载 `.vsix` 文件
2. 在 VS Code 中通过命令面板运行 `Extensions: Install from VSIX...`
3. 选择下载的 `.vsix` 文件

或命令行安装：

```bash
code --install-extension git-graph-cn-x.x.x.vsix
```

## 使用

- 命令面板搜索 **`Git Graph: 查看 Git Graph（git log）`**
- 或点击源代码管理视图中的 Git Graph 图标

## 右键菜单操作

在图谱中的分支、提交、标签、储藏上右键，即可执行对应的 Git 操作：

- **分支**：检出、重命名、创建、删除、合并、变基、推送、拉取、创建 Pull Request 等
- **提交**：添加标签、创建分支、检出、拣选（Cherry Pick）、撤销、丢弃、重置等
- **标签**：查看详情、删除、推送、创建归档等
- **储藏（Stash）**：应用、弹出、丢弃、从储藏创建分支等

## 扩展设置

所有可用设置请在 VS Code 设置界面中搜索 `git-graph` 查看。

## 更新日志

详见 [CHANGELOG.md](CHANGELOG.md)。

## 致谢

感谢原作者 [mhutchie](https://github.com/mhutchie) 创建了出色的 Git Graph 扩展。

部分图标来源：
- [GitHub Octicons](https://octicons.github.com/)（[许可证](https://github.com/primer/octicons/blob/master/LICENSE)）
- [Icons8](https://icons8.com/icon/pack/free-icons/ios11)（[许可证](https://icons8.com/license)）

## 许可证

详见 [LICENSE](LICENSE)。
