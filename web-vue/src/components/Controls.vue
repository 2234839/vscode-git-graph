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

/** 未合并分支导航条：配置的最大显示数量（0 = 不限制） */
const maxBarEntries = computed(() => store.config.unmergedBranches?.maxBarEntries ?? 5);

/** 未合并分支功能是否启用 */
const unmergedEnabled = computed(() => store.config.unmergedBranches?.enabled ?? true);

/** 导航条中实际显示的分支（受 maxBarEntries 限制） */
const visibleBranches = computed(() => {
  const all = store.unmergedBranchHeads;
  if (store.unmergedBranchBarExpanded || maxBarEntries.value === 0) return all;
  return all.slice(0, maxBarEntries.value);
});

/** 被折叠的分支数量 */
const hiddenCount = computed(() => {
  if (maxBarEntries.value === 0) return 0;
  return Math.max(0, store.unmergedBranchHeads.length - maxBarEntries.value);
});

/** 切换导航条显示/隐藏 */
function toggleBar() {
  store.unmergedBranchBarEnabled = !store.unmergedBranchBarEnabled;
}

/** 基准分支可选项：本地分支列表（不含 HEAD，它已作为固定选项） */
const baseBranchOptions = computed(() =>
  store.gitBranches.filter((b) => !b.startsWith('remotes/'))
);

/** 基准分支切换 */
function onBaseBranchChange(e: Event) {
  const value = (e.target as HTMLSelectElement).value;
  store.setUnmergedBaseBranch(value);
}

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

  <!-- 未合并分支快速导航条 -->
  <div id="unmergedBranchBar" v-if="unmergedEnabled && store.unmergedBranchBarEnabled && visibleBranches.length > 0">
    <span class="unmergedBranchLabel" @click="toggleBar" title="点击切换显示/隐藏">
      <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor" style="vertical-align: -1px; margin-right: 3px; color: var(--vscode-charts-yellow, #cca700);">
        <path d="M1.5 1.75V13.5h13.75a.75.75 0 0 1 0 1.5H.75a.75.75 0 0 1-.75-.75V1.75a.75.75 0 0 1 1.5 0Zm14.28 2.53-5.25 5.25a.75.75 0 0 1-1.06 0L7 7.06l-2.97 2.97a.751.751 0 0 1-1.042-.018.751.751 0 0 1-.018-1.042l3.5-3.5a.75.75 0 0 1 1.06 0l2.47 2.47 4.72-4.72a.751.751 0 0 1 1.042.018.751.751 0 0 1 .018 1.042Z"/>
      </svg>
      Unmerged
    </span>
    <select
      class="unmergedBaseSelect"
      :value="store.unmergedBaseBranch"
      @change="onBaseBranchChange"
      title="选择判断未合并的基准分支"
    >
      <option value="HEAD">HEAD (current)</option>
      <option v-for="branch in baseBranchOptions" :key="branch" :value="branch">{{ branch }}</option>
    </select>
    <span class="unmergedBranchDivider">·</span>
    <span
      v-for="branch in visibleBranches"
      :key="branch.name"
      class="unmergedBranchChip"
      :title="'Jump to ' + branch.name"
      @click="store.scrollToCommit(branch.hash, true, true)"
    >{{ branch.name }}</span>
    <span
      v-if="hiddenCount > 0 && !store.unmergedBranchBarExpanded"
      class="unmergedBranchMore"
      @click="store.unmergedBranchBarExpanded = true"
      :title="'Show ' + hiddenCount + ' more unmerged branches'"
    >+{{ hiddenCount }} more</span>
    <span
      v-if="store.unmergedBranchBarExpanded && hiddenCount > 0"
      class="unmergedBranchMore"
      @click="store.unmergedBranchBarExpanded = false"
    >collapse</span>
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

/* 未合并分支导航条 */
#unmergedBranchBar {
	display: flex;
	flex-wrap: wrap;
	align-items: center;
	gap: 4px;
	padding: 3px 8px 4px 8px;
	background-color: rgba(204, 167, 0, 0.06);
	border-bottom: 1px solid rgba(204, 167, 0, 0.2);
	font-size: 11px;
	line-height: 1.4;
	-webkit-user-select: none;
	user-select: none;
}
.unmergedBranchLabel {
	color: var(--vscode-charts-yellow, #cca700);
	font-weight: 700;
	margin-right: 4px;
	white-space: nowrap;
	cursor: pointer;
}
.unmergedBaseSelect {
	font-size: 11px;
	line-height: 1.4;
	padding: 0 4px;
	border: 1px solid var(--vscode-charts-yellow, #cca700);
	border-radius: 3px;
	background-color: var(--vscode-editor-background);
	color: var(--vscode-editor-foreground);
	cursor: pointer;
	outline: none;
	max-width: 120px;
}
.unmergedBaseSelect:hover {
	background-color: rgba(204, 167, 0, 0.12);
}
.unmergedBaseSelect:focus {
	border-color: var(--vscode-focusBorder, #007fd4);
}
.unmergedBranchDivider {
	color: var(--vscode-charts-yellow, #cca700);
	opacity: 0.5;
	margin: 0 2px;
}
.unmergedBranchChip {
	display: inline-block;
	padding: 1px 8px;
	border: 1px solid var(--vscode-charts-yellow, #cca700);
	border-radius: 10px;
	color: var(--vscode-editor-foreground);
	background-color: rgba(204, 167, 0, 0.08);
	cursor: pointer;
	white-space: nowrap;
	transition: background-color 0.15s;
}
.unmergedBranchChip:hover {
	background-color: rgba(204, 167, 0, 0.25);
}
.unmergedBranchMore {
	display: inline-block;
	padding: 1px 6px;
	color: var(--vscode-charts-yellow, #cca700);
	cursor: pointer;
	white-space: nowrap;
	font-size: 11px;
	text-decoration: underline;
}
</style>
