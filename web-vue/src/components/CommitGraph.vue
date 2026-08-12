<script setup lang="ts">
/**
 * CommitGraph — Git Graph SVG 可视化
 *
 * 这个组件本身不渲染 SVG，而是提供一个容器 div (#commitGraph)，
 * Graph 引擎（来自 lib/graph.ts）在 store.initEngine 时被实例化，
 * 会将 SVG 渲染到这个容器中。
 *
 * 当 commits 变化时，Graph 引擎的 loadCommits 被调用，
 * 然后渲染自动触发。
 */
import { ref, watch, onMounted, nextTick } from 'vue';
import { useGitGraphStore } from '@/stores/gitGraph';

const store = useGitGraphStore();
const graphContainer = ref<HTMLElement | null>(null);

/**
 * 当 commits 变化时通知 Graph 渲染。
 * Graph 引擎在 store.initEngine 中创建，传入 #commitGraph 元素。
 */
watch(() => store.commits, () => {
  nextTick(() => {
    store.graph?.render(store.expandedCommit);
  });
}, { deep: false });

/** 监听 commitHead 变化 */
watch(() => store.commitHead, () => {
  nextTick(() => {
    store.graph?.render(store.expandedCommit);
  });
});

onMounted(() => {
  /* Graph 引擎在 store.initEngine 中初始化，这里只确保容器存在 */
});
</script>

<template>
  <div id="commitGraph" ref="graphContainer"></div>
</template>

<style scoped>
/* SVG 渲染样式由全局 main.css 控制 */
</style>
