<script setup lang="ts">
/**
 * Controls — 顶部控制栏
 *
 * 包含：仓库/分支/作者/标签 Dropdown、Show Remote Branches 复选框、
 * Current/Find/Terminal/Settings/Fetch/Refresh 按钮。
 *
 * Dropdown 实例在 store.initEngine 中创建，会自动绑定到 #repoDropdown 等容器。
 * 按钮内部的 SVG 图标通过 v-html 渲染（SVG_ICONS 是安全常量）。
 */
import { ref, computed, onMounted, watch } from 'vue';
import * as GG from 'backend-types';
import { useGitGraphStore } from '@/stores/gitGraph';
import { SVG_ICONS } from '@/lib/constants';
import { getRepoName } from '@/lib/utils';

const store = useGitGraphStore();

/** showRemoteBranches checkbox */
const showRemoteBranchesCheckbox = ref<HTMLInputElement | null>(null);

/** 是否支持 fetch（有 remotes 时才显示 fetch 按钮） */
const fetchSupported = computed(() => store.gitRemotes.length > 0);

/** 是否只有一个 repo */
const singleRepo = computed(() => Object.keys(store.gitRepos).length === 1);

/** 是否正在刷新 */
const isRefreshing = computed(() => store.isRefreshing);

/** fetchBtn title */
const fetchBtnTitle = computed(() =>
  store.config.fetchAndPrune ? store.t('fetchAndPrune') : store.t('fetchFromRemote'),
);

/** refreshBtn title */
const refreshBtnTitle = computed(() =>
  store.isRefreshing ? store.t('refreshing') : store.t('refresh'),
);

/** controls 的动态 class */
const controlsClass = computed(() => ({
  sticky: store.config.stickyHeader,
  fetchSupported: fetchSupported.value,
  singleRepo: singleRepo.value,
}));

onMounted(() => {
  /* showRemoteBranches 初始状态 */
  if (showRemoteBranchesCheckbox.value) {
    showRemoteBranchesCheckbox.value.checked = store.showRemoteBranches;
  }
});

/** 监听 showRemoteBranches 状态变化，更新 checkbox */
watch(() => store.showRemoteBranches, (val) => {
  if (showRemoteBranchesCheckbox.value) {
    showRemoteBranchesCheckbox.value.checked = val;
  }
});

/** toggle showRemoteBranches */
function onToggleShowRemoteBranches() {
  const newVal = showRemoteBranchesCheckbox.value?.checked ?? false;
  store.showRemoteBranches = newVal;
  /* 更新 repoState */
  const repoState = store.getRepoState(store.currentRepo);
  if (repoState) {
    repoState.showRemoteBranchesV2 = newVal
      ? GG.BooleanOverride.Enabled
      : GG.BooleanOverride.Disabled;
    store.saveRepoState();
    store.refresh(true);
  }
}

/** refresh 按钮 */
function onRefresh() {
  if (!isRefreshing.value) {
    store.refresh(true, true);
  }
}

/** find 按钮 */
function onFind() {
  store.findWidget?.show(true);
}

/** terminal 按钮 */
function onTerminal() {
  const repoName = store.gitRepos[store.currentRepo]?.name || getRepoName(store.currentRepo);
  store.runAction({
    command: 'openTerminal',
    repo: store.currentRepo,
    name: repoName,
  } as GG.RequestMessage, '');
}

/** settings 按钮 */
function onSettings() {
  store.settingsWidget?.show(store.currentRepo);
}

/** current 按钮 — 滚动到 HEAD commit */
function onCurrent() {
  if (store.commitHead) {
    store.scrollToCommit(store.commitHead, true, false);
  }
}

/** fetch 按钮 */
function onFetch() {
  store.fetchFromRemotes();
}
</script>

<template>
  <div id="controls" :class="controlsClass">
    <span id="repoControl">
      <span class="unselectable">{{ store.t('repoColon') }}</span>
      <div id="repoDropdown" class="dropdown"></div>
    </span>
    <span id="branchControl">
      <span class="unselectable">{{ store.t('branchColon') }}</span>
      <div id="branchDropdown" class="dropdown"></div>
    </span>
    <span id="authorControl">
      <span class="unselectable">{{ store.t('authorColon') }}</span>
      <div id="authorDropdown" class="dropdown"></div>
    </span>
    <span id="tagControl">
      <span class="unselectable">{{ store.t('tagColon') }}</span>
      <div id="tagDropdown" class="dropdown"></div>
    </span>

    <label id="showRemoteBranchesControl">
      <input
        type="checkbox"
        id="showRemoteBranchesCheckbox"
        tabindex="-1"
        ref="showRemoteBranchesCheckbox"
        @change="onToggleShowRemoteBranches"
      >
      <span class="customCheckbox"></span>
      {{ store.t('showRemoteBranches') }}
    </label>

    <div id="currentBtn" :title="store.t('current')" @click="onCurrent" v-html="SVG_ICONS.current"></div>
    <div id="findBtn" :title="store.t('find')" @click="onFind" v-html="SVG_ICONS.search"></div>
    <div id="terminalBtn" :title="store.t('openTerminal')" @click="onTerminal" v-html="SVG_ICONS.terminal"></div>
    <div id="settingsBtn" :title="store.t('repoSettings')" @click="onSettings" v-html="SVG_ICONS.gear"></div>
    <div id="fetchBtn" :title="fetchBtnTitle" @click="onFetch" v-html="SVG_ICONS.download"></div>
    <div id="refreshBtn" :class="{ refreshing: isRefreshing }" :title="refreshBtnTitle" @click="onRefresh" v-html="isRefreshing ? SVG_ICONS.loading : SVG_ICONS.refresh"></div>
  </div>
</template>

<style scoped>
#controls {
	display: block;
	position: relative;
	left: 0;
	right: 0;
	top: 0;
	padding: 4px 132px 4px 0;
	background-color: var(--vscode-editor-background);
	border-bottom: 1px solid rgba(128, 128, 128, 0.5);
	line-height: 32px;
	text-align: center;
	font-weight: 700;
	font-size: 13px;
	-webkit-user-select: none;
	user-select: none;
}
#controls.sticky {
	position: sticky;
	z-index: 12;
}

#repoControl, #branchControl, #showRemoteBranchesControl {
	display: inline-block;
	white-space: nowrap;
	margin: 0 10px;
}
#repoDropdown, #branchDropdown, #authorDropdown {
	margin-left: 3px;
}
#showRemoteBranchesControl > .customCheckbox {
	margin-right: 6px;
}

/* dropdownCurrentValue 由 Dropdown 类动态写入 div，需要 :deep() */
:deep(.dropdownCurrentValue) {
	max-width: 30vw;
}
#controls.singleRepo #repoControl {
	display: none;
}
#controls.singleRepo :deep(.dropdownCurrentValue) {
	max-width: 40vw;
}

#currentBtn, #findBtn, #terminalBtn, #settingsBtn, #fetchBtn, #refreshBtn {
	position: absolute;
	top: 50%;
	width: 20px;
	height: 20px;
	margin-top: -10px;
	cursor: pointer;
	-webkit-user-select: none;
	user-select: none;
}
#currentBtn { right: 130px; }
#findBtn { right: 100px; }
#terminalBtn { right: 70px; }
#settingsBtn { right: 40px; }
#fetchBtn { display: none; right: 40px; }
#refreshBtn { right: 10px; }
#refreshBtn.refreshing { cursor: default; }

/* v-html 的 SVG 需要 :deep() */
#currentBtn :deep(svg), #findBtn :deep(svg), #terminalBtn :deep(svg),
#settingsBtn :deep(svg), #fetchBtn :deep(svg), #refreshBtn :deep(svg) {
	position: absolute;
	fill: var(--vscode-editor-foreground);
	opacity: 0.8;
	stroke: var(--vscode-editor-foreground);
	stroke-opacity: 0.5;
	stroke-width: 0;
}
#currentBtn :deep(svg), #findBtn :deep(svg), #terminalBtn :deep(svg) {
	stroke-width: 0.5px;
}
#currentBtn:hover :deep(svg), #findBtn:hover :deep(svg), #terminalBtn:hover :deep(svg),
#settingsBtn:hover :deep(svg), #fetchBtn:hover :deep(svg), #refreshBtn:hover :deep(svg) {
	opacity: 1;
	stroke-width: 0.5px;
}
#currentBtn:hover :deep(svg), #findBtn:hover :deep(svg), #terminalBtn:hover :deep(svg) {
	stroke-width: 1px;
}
#currentBtn :deep(svg), #findBtn :deep(svg), #terminalBtn :deep(svg), #settingsBtn :deep(svg), #fetchBtn :deep(svg) {
	left: 1px;
	top: 1px;
	width: 18px !important;
	height: 18px !important;
}
#refreshBtn :deep(svg) {
	left: 2px;
	top: 2px;
	width: 16px !important;
	height: 16px !important;
}
#refreshBtn.refreshing :deep(svg) {
	left: 3.25px;
	top: 2px;
	width: 13.5px !important;
	height: 18px !important;
	animation: loadingIconAnimation 2s linear infinite;
}

#controls.fetchSupported {
	padding-right: 162px;
}
#controls.fetchSupported #currentBtn { right: 160px; }
#controls.fetchSupported #findBtn { right: 130px; }
#controls.fetchSupported #terminalBtn { right: 100px; }
#controls.fetchSupported #settingsBtn { right: 70px; }
#controls.fetchSupported #fetchBtn { display: block; }

#controls input:focus {
	outline: none;
}
#controls label {
	cursor: pointer;
	-webkit-user-select: none;
	user-select: none;
}
</style>
