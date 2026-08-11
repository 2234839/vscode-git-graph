/// <reference types="vite/client" />

declare module '*.vue' {
  import type { DefineComponent } from 'vue';
  const component: DefineComponent<{}, {}, any>;
  export default component;
}

/** VS Code WebView 注入的全局 API 工厂函数 */
declare function acquireVsCodeApi(): import('./types').VsCodeApi;
