/**
 * VS Code WebView API 封装
 *
 * 在 WebView 环境中，acquireVsCodeApi() 是由 VS Code 注入的全局函数。
 * 它返回一个有限的对象，包含 postMessage / getState / setState。
 * 整个 WebView 生命周期内只能调用一次 acquireVsCodeApi()。
 */

/** VS Code WebView API 类型 */
interface VsCodeApi {
  getState: <T = unknown>() => T | null;
  postMessage: (message: unknown) => void;
  setState: <T = unknown>(state: T) => T;
}

/** VS Code 在 WebView 环境中注入的全局函数 */
declare function acquireVsCodeApi(): VsCodeApi;

/** 缓存的 VS Code API 实例（单例） */
let vsCodeApi: VsCodeApi | null = null;

/**
 * 获取 VS Code WebView API（单例）
 * @returns VsCodeApi 实例
 */
export function useVsCodeApi(): VsCodeApi {
  if (vsCodeApi === null) {
    vsCodeApi = acquireVsCodeApi();
  }
  return vsCodeApi;
}

/**
 * 向扩展后端发送消息
 * @param command 消息命令
 * @param data 消息数据
 */
export function postMessage(command: string, data: Record<string, unknown> = {}): void {
  useVsCodeApi().postMessage({ command, ...data });
}
