/**
 * Git Graph WebView 入口
 *
 * 导入所有 CSS 和核心控制器 mainController.ts
 * mainController.ts 内部通过 window.addEventListener('load', ...) 完成初始化
 */
import './lib/mainController';

// 全局样式（顺序重要：main.css 先加载，组件样式覆盖）
import './styles/main.css';
import './styles/contextMenu.css';
import './styles/dialog.css';
import './styles/dropdown.css';
import './styles/findWidget.css';
import './styles/settingsWidget.css';
