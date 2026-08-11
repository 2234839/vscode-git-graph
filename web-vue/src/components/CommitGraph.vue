<script setup lang="ts">
/**
 * CommitGraph — SVG Commit 图渲染组件
 *
 * 设计决策：保留命令式 SVG DOM 操作（而非 Vue 声明式 SVG），原因：
 * - 数百个 commit 节点 + 路径段，Vue vDOM diff 开销远大于直接 DOM 操作
 * - graph.ts 已有成熟的布局算法（determinePath）和颜色分配（assignStableColours）
 * - 本组件仅作为 SVG 容器，由 Graph class 在内部管理 DOM
 *
 * 性能优化已实施：
 * - 事件委托：两个 listener 绑在 <g> 上，而非每个 vertex
 * - 离线 DOM 构建：所有子元素先 append 到 group，再一次性插入 SVG
 * - assignStableColours O(V+B)：替代原 O(V×B) 嵌套循环
 */
import { ref, onMounted, onBeforeUnmount } from 'vue';

/** SVG 容器引用 */
const svgContainer = ref<HTMLElement | null>(null);

// TODO: 在后续迁移中，从 @/graph 导入 Graph class
// const graph = new Graph(...)

onMounted(() => {
  // Graph 实例化将在后续迁移步骤中实现
});

onBeforeUnmount(() => {
  // 清理资源
});

// 当 commits 变化时重新渲染
// TODO: watch(() => store.commits, () => graph.render())
</script>

<template>
  <div id="commitGraph" ref="svgContainer" class="commit-graph" />
</template>

<style scoped>
.commit-graph {
  position: relative;
  height: 100%;
}
</style>
