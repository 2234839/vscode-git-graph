/**
 * 前端共享类型定义
 *
 * 这些类型从后端 src/types.ts 自动生成（tsc 编译后在 out/types.js / out/types.d.ts）
 * 前端通过 reference 引入
 */

/// <reference path="../../../out/types.d.ts" />

/**
 * VS Code 注入的初始状态全局变量
 * 由 gitGraphView.ts 的 getHtmlForWebview() 注入到 HTML <script> 标签中
 */
export interface InitialState {
  config: import('../../../out/types').GitGraphViewConfig;
  lastActiveRepo: string | null;
  loadViewTo: import('../../../out/types').LoadGitGraphViewTo;
  repos: import('../../../out/types').GitRepoSet;
  loadRepoInfoRefreshId: number;
  loadCommitsRefreshId: number;
}

/** 从全局变量读取初始状态 */
export function getInitialState(): InitialState {
  return (window as unknown as { initialState: InitialState }).initialState;
}

/** 从全局变量读取全局视图状态 */
export function getGlobalState() {
  return (window as unknown as { globalState: unknown }).globalState;
}

/** 从全局变量读取工作区视图状态 */
export function getWorkspaceState() {
  return (window as unknown as { workspaceState: unknown }).workspaceState;
}

/** VS Code 显示语言 */
export function getVscodeLanguage(): string {
  return (window as unknown as { vscodeLanguage: string }).vscodeLanguage;
}
