/**
 * Git Graph WebView 入口（Vue3 版）
 *
 * 创建 Vue 应用实例，挂载到后端模板提供的 #app 元素上。
 * App.vue 在 onMounted 中初始化 GitGraphView 引擎。
 */
import { createApp } from 'vue';
import { createPinia } from 'pinia';
import App from './App.vue';

/* 全局样式（顺序重要：main.css 先加载，组件样式覆盖） */
import './styles/main.css';
import './styles/contextMenu.css';
import './styles/dialog.css';
import './styles/dropdown.css';
import './styles/findWidget.css';
import './styles/settingsWidget.css';

const app = createApp(App);
app.use(createPinia());

/** 全局错误捕获 — 在页面上显示错误，避免白屏无法诊断 */
app.config.errorHandler = (err, _instance, info) => {
  console.error('[Git Graph Vue] Vue error:', err, info);
  showFatalError(err instanceof Error ? err.message + '\n' + (err.stack ?? '') : String(err), info);
};

window.addEventListener('error', (event) => {
  console.error('[Git Graph Vue] Window error:', event.error);
  showFatalError(
    event.error?.message ?? String(event.message),
    event.error?.stack ?? event.filename + ':' + event.lineno,
  );
});

window.addEventListener('unhandledrejection', (event) => {
  console.error('[Git Graph Vue] Unhandled rejection:', event.reason);
});

/** 在页面上显示致命错误（替代白屏） */
function showFatalError(message: string, info: string) {
  const existing = document.getElementById('fatal-error-overlay');
  if (existing) {
    existing.textContent += '\n\n---\n' + message + '\n' + info;
    return;
  }
  const overlay = document.createElement('div');
  overlay.id = 'fatal-error-overlay';
  overlay.style.cssText =
    'position:fixed;top:0;left:0;right:0;bottom:0;z-index:99999;background:#1e1e1e;color:#f48771;padding:20px;font-family:monospace;font-size:13px;white-space:pre-wrap;overflow:auto;';
  overlay.textContent = '[Git Graph Fatal Error]\n\n' + message + '\n\nContext: ' + info;
  document.body.appendChild(overlay);
}

try {
  app.mount('#app');
} catch (e) {
  showFatalError(
    e instanceof Error ? e.message + '\n' + (e.stack ?? '') : String(e),
    'app.mount failed',
  );
}
