<script setup lang="ts">
/**
 * App — Git Graph WebView 根组件
 *
 * 布局由全局 main.css 控制（body #view, #content 等）。
 * onMounted → requestAnimationFrame → store.initEngine(viewElem)
 */
import { ref, onMounted } from 'vue';
import { useGitGraphStore } from '@/stores/gitGraph';
import Controls from '@/components/Controls.vue';
import CommitGraph from '@/components/CommitGraph.vue';
import CommitTable from '@/components/CommitTable.vue';
import CommitDetails from '@/components/CommitDetails.vue';

const store = useGitGraphStore();

const viewElem = ref<HTMLElement | null>(null);

onMounted(() => {
  requestAnimationFrame(() => {
    if (viewElem.value) {
      try {
        store.initEngine(viewElem.value);
      } catch (err) {
        showFatalError(err instanceof Error ? err.message + '\n' + (err.stack ?? '') : String(err), 'initEngine');
      }
    } else {
      showFatalError('viewElem is null', 'onMounted');
    }
  });
});

/** 在页面上显示致命错误 */
function showFatalError(message: string, info: string) {
  const overlay = document.createElement('div');
  overlay.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;z-index:99999;background:#1e1e1e;color:#f48771;padding:20px;font-family:monospace;font-size:13px;white-space:pre-wrap;overflow:auto;';
  overlay.textContent = '[Git Graph Fatal Error]\n\n' + message + '\n\nContext: ' + info;
  document.body.appendChild(overlay);
}
</script>

<template>
  <div
    id="view"
    ref="viewElem"
    tabindex="-1"
    :style="{ bottom: store.expandedCommit && store.isCdvDocked ? store.cdvHeightPx : '0' }"
    @click="(e) => store.onBodyClick(e)"
    @contextmenu="(e) => store.onBodyContextMenu(e)"
  >
    <Controls />
    <div id="content">
      <CommitGraph />
      <CommitTable />
    </div>
    <!-- Docked Commit Details View（固定在底部） -->
    <div
      v-if="store.expandedCommit && store.isCdvDocked"
      id="cdv"
      class="docked"
      :style="{ height: store.cdvHeightPx }"
    >
      <CommitDetails />
    </div>
  </div>
</template>
