/**
 * VS Code WebView 通信桥
 *
 * 提供 sendMessage / showErrorMessage / updateGlobalViewState / updateWorkspaceViewState
 * 等全局函数的模块化版本。
 *
 * 在 main.ts 初始化时调用 initBridge() 注入 VsCodeApi 实例。
 */
import type { VsCodeApi } from '../types';
import * as GG from 'backend-types';
import { getWindowGlobals } from '../types';

let api: VsCodeApi | null = null;

/**
 * 初始化通信桥——在应用入口调用一次
 */
export function initBridge(): VsCodeApi {
  if (api === null) {
    api = acquireVsCodeApi();
  }
  return api;
}

/**
 * 获取 VsCodeApi 实例
 */
export function getApi(): VsCodeApi {
  if (api === null) {
    api = acquireVsCodeApi();
  }
  return api;
}

/**
 * 向扩展后端发送消息
 */
export function sendMessage(msg: GG.RequestMessage) {
  getApi().postMessage(msg);
}

/**
 * 显示 VS Code 错误消息
 */
export function showErrorMessage(message: string) {
  sendMessage({ command: 'showErrorMessage', message: message } as GG.RequestMessage);
}

/**
 * 更新 Global View State
 */
export function updateGlobalViewState<K extends keyof GG.GitGraphViewGlobalState>(key: K, value: GG.GitGraphViewGlobalState[K]) {
  const gs = getWindowGlobals().globalState as GG.DeepWriteable<GG.GitGraphViewGlobalState>;
  gs[key] = value;
  sendMessage({ command: 'setGlobalViewState', state: getWindowGlobals().globalState } as GG.RequestMessage);
}

/**
 * 更新 Workspace View State
 */
export function updateWorkspaceViewState<K extends keyof GG.GitGraphViewWorkspaceState>(key: K, value: GG.GitGraphViewWorkspaceState[K]) {
  const ws = getWindowGlobals().workspaceState as GG.DeepWriteable<GG.GitGraphViewWorkspaceState>;
  ws[key] = value;
  sendMessage({ command: 'setWorkspaceViewState', state: getWindowGlobals().workspaceState } as GG.RequestMessage);
}

/**
 * 获取 VS Code 样式变量
 */
export function getVSCodeStyle(name: string) {
  return document.documentElement.style.getPropertyValue(name);
}

/**
 * 获取 WebView 状态
 */
export function getViewState<T = unknown>(): T | null {
  return getApi().getState<T>();
}

/**
 * 保存 WebView 状态
 */
export function setViewState<T = unknown>(state: T): T {
  return getApi().setState<T>(state);
}
