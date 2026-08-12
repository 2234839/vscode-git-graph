<script setup lang="ts">
/**
 * App — Git Graph WebView 根组件
 *
 * 全局基础样式（body、#view、#content、通用按钮/链接/checkbox 等）在本文件的非 scoped <style> 中。
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

<!-- 全局基础样式：body 级、通用组件 class、事件捕获层 -->
<style>
/* Body */
body {
	display: block;
	position: fixed;
	top: 0;
	left: 0;
	right: 0;
	bottom: 0;
	margin: 0;
	padding: 0;
}
body.unableToLoad {
	margin: 0 20px;
}
body.unableToLoad h2, body.unableToLoad h3, body.unableToLoad p {
	text-align: center;
}
body #view {
	display: block;
	position: fixed;
	top: 0;
	left: 0;
	right: 0;
	bottom: 0;
	background-color: var(--vscode-editor-background);
	overflow-x: hidden;
	overflow-y: auto;
}
body #view:focus {
	outline: none;
}
body.selection-background-color-exists ::-moz-selection {
	background-color: var(--vscode-selection-background);
}
body.selection-background-color-exists ::selection {
	background-color: var(--vscode-selection-background);
}
code {
	line-height: 1;
}

/* Content */
#content {
	position: relative;
}

/* Overlays — 由 JS 动态控制 */
#eventCaptureElem {
	display: block;
	position: fixed;
	left: 0;
	right: 0;
	top: 0;
	bottom: 0;
	z-index: 40;
}
#eventCaptureElem.rowResize {
	cursor: row-resize;
}
#eventCaptureElem.colResize {
	cursor: col-resize;
}

/* Loader */
#loadingHeader {
	text-align: center;
	line-height: 32px;
	-webkit-user-select: none;
	user-select: none;
}
#loadingHeader svg {
	display: inline;
	fill: var(--vscode-editor-foreground);
	margin-right: 10px;
	vertical-align: top;
	animation: loadingIconAnimation 2s linear infinite;
}
@keyframes loadingIconAnimation {
	0%   { transform: rotate(0deg); opacity: 0.7; }
	25%  { opacity: 1; }
	50%  { opacity: 0.7; }
	75%  { opacity: 1; }
	100% { transform: rotate(360deg); opacity: 0.7; }
}

/* Buttons */
#loadMoreCommitsBtn, #rescanForReposBtn {
	height: 28px;
	margin: 10px auto;
	border-radius: 14px;
	line-height: 28px;
}
#loadMoreCommitsBtn { width: 180px; }
#rescanForReposBtn { width: 350px; }
.roundedBtn {
	display: block;
	background-color: rgba(128, 128, 128, 0.1);
	border: 1px solid rgba(128, 128, 128, 0.5);
	font-size: 13px;
	text-align: center;
	cursor: pointer;
	-webkit-user-select: none;
	user-select: none;
}
.roundedBtn:hover {
	background-color: rgba(128, 128, 128, 0.2);
}

/* Links */
a, span.internalUrl {
	color: var(--vscode-textLink-foreground);
	cursor: pointer;
	text-decoration: underline;
}
a:hover, span.internalUrl:hover {
	color: var(--vscode-textLink-activeForeground);
}
a:focus, span.internalUrl:focus {
	outline: 1px solid var(--vscode-focusBorder);
	outline-offset: -1px;
	-webkit-user-select: none;
	user-select: none;
}

/* Checkboxes & Radio Inputs */
input[type=checkbox], input[type=radio] {
	position: absolute;
	width: 0;
	height: 0;
	opacity: 0;
}
.customCheckbox, .customRadio {
	display: inline-block;
	background-color: rgba(128, 128, 128, 0.1);
	border: 1px solid rgba(128, 128, 128, 0.5);
	vertical-align: middle;
}
label:hover > .customCheckbox, label:hover > .customRadio {
	background-color: rgba(128, 128, 128, 0.2);
}
.customCheckbox:after, .customRadio:after {
	content: "";
	display: none;
}
.customCheckbox {
	width: 15px;
	height: 15px;
	border-radius: 3px;
	margin-top: -2px;
}
label > input[type=checkbox]:checked ~ .customCheckbox:after {
	position: relative;
	display: block;
	left: 5px;
	top: 2px;
	width: 3px;
	height: 7px;
	border: solid var(--vscode-editor-foreground);
	border-width: 0 2px 2px 0;
	transform: rotate(45deg);
}
.customRadio {
	width: 13px;
	height: 13px;
	border-radius: 7.5px;
	margin-top: -1px;
}
label > input[type=radio]:checked ~ .customRadio:after {
	position: relative;
	display: block;
	left: 4px;
	top: 4px;
	width: 5px;
	height: 5px;
	background-color: var(--vscode-editor-foreground);
	border-radius: 2.5px;
}

/* 通用 user-select:none */
.unselectable {
	-webkit-user-select: none;
	user-select: none;
}
</style>
