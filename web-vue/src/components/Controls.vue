<script setup lang="ts">
/**
 * Controls — 顶部控制栏
 *
 * 包含仓库选择、分支选择、过滤按钮、刷新等控件。
 * 用 Vue 组件替代原 main.ts 中手动 DOM 操作 + addEventListener。
 */
import { computed } from 'vue';
import { useGitGraphStore } from '@/stores/gitGraph';
import { postMessage } from '@/composables/useVsCodeApi';

const store = useGitGraphStore();

/** 仓库列表 */
const repoOptions = computed(() => {
  return Object.keys(store.gitRepos).map((path) => ({
    label: path.split('/').pop() || path,
    value: path,
  }));
});

function onRepoChange(event: Event) {
  const target = event.target as HTMLSelectElement;
  if (target.value) {
    postMessage('loadRepo', { repo: target.value });
  }
}

function onRefresh() {
  postMessage('refresh', { repo: store.currentRepo });
}

function onFetch() {
  postMessage('fetch', { repo: store.currentRepo });
}
</script>

<template>
  <div id="controls">
    <span class="control-group">
      <label class="control-label">Repository:</label>
      <select
        :value="store.currentRepo"
        @change="onRepoChange"
        class="repo-select"
      >
        <option v-for="opt in repoOptions" :key="opt.value" :value="opt.value">
          {{ opt.label }}
        </option>
      </select>
    </span>

    <span class="control-actions">
      <button class="ctrl-btn" title="Refresh" @click="onRefresh">
        ↻
      </button>
      <button class="ctrl-btn" title="Fetch" @click="onFetch">
        ↓
      </button>
    </span>
  </div>
</template>

<style scoped>
#controls {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 4px 8px;
  background-color: var(--vscode-editor-background);
  border-bottom: 1px solid var(--vscode-panel-border);
}

.control-label {
  color: var(--vscode-foreground);
  opacity: 0.7;
  font-size: 12px;
}

.repo-select {
  background: var(--vscode-dropdown-background);
  color: var(--vscode-dropdown-foreground);
  border: 1px solid var(--vscode-dropdown-border);
  padding: 2px 6px;
  font-size: 12px;
}

.ctrl-btn {
  background: var(--vscode-button-secondaryBackground);
  color: var(--vscode-button-secondaryForeground);
  border: none;
  padding: 4px 8px;
  cursor: pointer;
  border-radius: 3px;
  font-size: 14px;
}

.ctrl-btn:hover {
  opacity: 0.8;
}
</style>
