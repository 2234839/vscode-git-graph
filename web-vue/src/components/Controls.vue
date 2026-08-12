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
  /* 由后端处理 */
  store.runAction({ command: 'openTerminal', repo: store.currentRepo } as never, '');
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
/* 控制栏样式由全局 main.css 控制 */
</style>
