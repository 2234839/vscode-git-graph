/**
 * Git Graph WebView 入口
 *
 * 初始化 Vue3 应用 + Pinia 状态管理
 * 从全局变量（后端注入）读取初始状态，恢复视图状态
 */
import { createApp } from 'vue';
import { createPinia } from 'pinia';
import App from './App.vue';
import { useGitGraphStore } from './stores/gitGraph';
import { getInitialState } from './types';

// 全局样式
import './styles/main.css';

const app = createApp(App);
const pinia = createPinia();

app.use(pinia);

// 从后端注入的全局变量初始化 store
const store = useGitGraphStore(pinia);
const initialState = getInitialState();

if (initialState) {
  store.setRepos(initialState.repos);
  if (initialState.lastActiveRepo) {
    store.setCurrentRepo(initialState.lastActiveRepo);
  }
}

app.mount('#app');
