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
#commitGraph {
	display: block;
	position: absolute;
	left: 0;
	top: 0;
	z-index: 2;
	pointer-events: none;
	-webkit-user-select: none;
	user-select: none;
}

/* SVG 由 graph 引擎动态注入，必须用 :deep() */
#commitGraph :deep(circle) {
	pointer-events: all;
}
#commitGraph :deep(circle.current) {
	fill: var(--vscode-editor-background);
	stroke-width: 2;
}
#commitGraph :deep(circle:not(.current)) {
	stroke: var(--vscode-editor-background);
	stroke-width: 1;
	stroke-opacity: 0.75;
}
#commitGraph :deep(circle.stashInner) {
	stroke-opacity: 1;
	pointer-events: none;
	fill: transparent;
}
#commitGraph :deep(path.shadow) {
	fill: none;
	stroke: var(--vscode-editor-background);
	stroke-opacity: 0.75;
	stroke-width: 4;
}
#commitGraph :deep(path.line) {
	fill: none;
	stroke-width: 2;
}
</style>

<!-- graphTooltip 由 graph 引擎动态创建并 appendChild 到 document.body，无法 scoped -->
<style>
#graphTooltip {
	display: block;
	position: absolute;
	pointer-events: none;
}
#graphTooltipPointer {
	position: absolute;
	display: block;
	width: 30px;
	height: 2px;
	left: 4px;
	top: 0;
	margin-top: -1px;
	z-index: 4;
}
#graphTooltipContent {
	position: relative;
	left: 23px;
	top: 0;
	background-color: var(--vscode-menu-background);
	border-width: 2px;
	border-style: solid;
	border-radius: 5px;
	color: var(--vscode-menu-foreground);
	font-size: 13px;
	line-height: 22px;
	white-space: normal;
	z-index: 5;
}
#graphTooltipShadow {
	position: absolute;
	left: 23px;
	top: 0;
	border-radius: 5px;
	box-shadow: 0 0 30px 5px var(--vscode-widget-shadow);
	z-index: 3;
}
.graphTooltipTitle, .graphTooltipSection {
	padding: 3px 10px;
}
.graphTooltipTitle {
	text-align: center;
	font-weight: 700;
}
.graphTooltipSection {
	border-top: 1px solid rgba(128, 128, 128, 0.5);
}
.graphTooltipRef, .graphTooltipCombinedRef {
	display: inline-block;
	height: 18px;
	line-height: 18px;
}
.graphTooltipRef {
	margin: 2px;
	padding: 0 5px;
	background-color: rgba(128, 128, 128, 0.15);
	border-radius: 5px;
	border: 1px solid rgba(128, 128, 128, 0.75);
	vertical-align: top;
	font-size: 12px;
	cursor: default;
}
.graphTooltipCombinedRef {
	margin-left: 5px;
	padding-left: 5px;
	border-left: 1px solid rgba(128, 128, 128, 0.45);
	font-style: italic;
}
</style>
