<script setup lang="ts">
/**
 * App — Git Graph WebView 根组件
 *
 * 整体布局：
 * ┌─────────────────────────────────┐
 * │         Controls (顶部栏)        │
 * ├──────────┬──────────────────────┤
 * │   Graph  │     Commit Table      │
 * │   (SVG)  │                      │
 * ├──────────┴──────────────────────┤
 * │          Footer (加载更多)       │
 * └─────────────────────────────────┘
 */
import Controls from '@/components/Controls.vue';
import CommitGraph from '@/components/CommitGraph.vue';
import CommitTable from '@/components/CommitTable.vue';
import { useGitGraphStore } from '@/stores/gitGraph';

const store = useGitGraphStore();
</script>

<template>
  <div id="view" tabindex="-1">
    <Controls />
    <div id="content">
      <CommitGraph />
      <CommitTable />
    </div>
    <div id="footer">
      <div
        v-if="store.moreCommitsAvailable"
        id="loadMoreCommitsBtn"
        class="rounded-btn"
      >
        Load More Commits
      </div>
    </div>
  </div>
</template>

<style>
/* 全局样式（非 scoped）— 确保覆盖整个 WebView */

/* CSS 变量 — Git Graph 颜色配置 */
/* 这些变量会在 getHtmlForWebview() 中被后端注入的内联 <style> 覆盖 */
:root {
  --git-graph-color0: #ff0000;
  --git-graph-color1: #00ff00;
  --git-graph-color2: #0000ff;
}

* {
  box-sizing: border-box;
}

body {
  margin: 0;
  padding: 0;
  font-family: var(--vscode-font-family);
  font-size: var(--vscode-font-size);
  color: var(--vscode-foreground);
  background-color: var(--vscode-editor-background);
  overflow: hidden;
  user-select: none;
}

#view {
  display: flex;
  flex-direction: column;
  height: 100vh;
}

#content {
  flex: 1;
  display: flex;
  overflow: hidden;
}

#commitGraph {
  flex-shrink: 0;
}

#commitTable {
  flex: 1;
  overflow-y: auto;
}

#footer {
  padding: 4px 8px;
  border-top: 1px solid var(--vscode-panel-border);
  text-align: center;
}

.rounded-btn {
  display: inline-block;
  padding: 4px 12px;
  background-color: var(--vscode-button-secondaryBackground);
  color: var(--vscode-button-secondaryForeground);
  border-radius: 4px;
  cursor: pointer;
  font-size: 12px;
}

.rounded-btn:hover {
  opacity: 0.8;
}
</style>
