<script setup lang="ts">
/**
 * CommitTable — 提交列表表格
 *
 * 用 Vue v-for 声明式渲染替代原 mainController 的 renderTable innerHTML 拼接。
 * 数据来自 store.commitRows computed（已预格式化）。
 *
 * HTML 结构和 class 名称与原版一致，样式由本组件的 scoped <style> 控制。
 */
import { computed, ref, onMounted, onUpdated, watch, nextTick } from 'vue';
import { useGitGraphStore } from '@/stores/gitGraph';
import IconSvg from '@/components/IconSvg.vue';
import CommitDetails from '@/components/CommitDetails.vue';

const store = useGitGraphStore();

/** 列可见性 */
const colVisibility = computed(() => store.getColumnVisibility());

/** branchLabels 对齐方式 */
const branchLabelsAlignedToGraph = computed(() => store.config.referenceLabels.branchLabelsAlignedToGraph);
const tagLabelsOnRight = computed(() => store.config.referenceLabels.tagLabelsOnRight);

/** commit 表格容器引用（用于滚动） */
const tableElem = ref<HTMLElement | null>(null);

/** 表格布局 class（由 store.makeTableResizable 响应式驱动） */
const tableLayoutClass = computed(() => store.tableLayoutClass);

/** 滚动处理 */
function onScroll() {
  if (tableElem.value) {
    store.scrollTop = tableElem.value.scrollTop;
  }
}

/** 加载更多 commits */
function loadMoreCommits() {
  store.loadMoreCommits();
}

/** 监听 pendingScrollTo，执行滚动 */
watch(() => store.pendingScrollTo, (target) => {
  if (target && tableElem.value) {
    nextTick(() => {
      const id = store.getCommitId(target.hash);
      const elem = tableElem.value?.querySelector(`[data-id="${id}"]`) as HTMLElement | null;
      if (elem) {
        if (target.alwaysCenter) {
          elem.scrollIntoView({ block: 'center' });
        } else {
          elem.scrollIntoView({ block: 'nearest' });
        }
        if (target.flash) {
          elem.classList.add('flash');
          setTimeout(() => elem.classList.remove('flash'), 1000);
        }
      }
      store.pendingScrollTo = null;
    });
  }
});

/** 恢复滚动位置 */
onMounted(() => {
  if (tableElem.value && store.scrollTop) {
    tableElem.value.scrollTop = store.scrollTop;
  }
});

/** 渲染后恢复滚动位置 */
onUpdated(() => {
  if (tableElem.value && store.scrollTop !== tableElem.value.scrollTop) {
    tableElem.value.scrollTop = store.scrollTop;
  }
});
</script>

<template>
  <div
    id="commitTable"
    ref="tableElem"
    :class="tableLayoutClass"
    @scroll="onScroll"
  >
    <table>
      <!-- 表头 -->
      <thead>
        <tr id="tableColHeaders" @contextmenu="(e) => store.onTableHeaderContextMenu(e)">
          <th id="tableHeaderGraphCol" class="tableColHeader" data-col="0">
            {{ store.t('colGraph') }}
            <span class="resizeCol right" data-col="0" @mousedown="(e) => store.startColumnResize(e, 0)"></span>
          </th>
          <th class="tableColHeader" data-col="1">
            <span class="resizeCol left" data-col="0" @mousedown="(e) => store.startColumnResize(e, 0)"></span>
            {{ store.t('colDescription') }}
            <span class="resizeCol right" data-col="1" @mousedown="(e) => store.startColumnResize(e, 1)"></span>
          </th>
          <th v-if="colVisibility.date" class="tableColHeader dateCol" data-col="2">
            <span class="resizeCol left" data-col="1" @mousedown="(e) => store.startColumnResize(e, 1)"></span>
            {{ store.t('colDate') }}
            <span class="resizeCol right" data-col="2" @mousedown="(e) => store.startColumnResize(e, 2)"></span>
          </th>
          <th v-if="colVisibility.author" class="tableColHeader authorCol" data-col="3">
            <span class="resizeCol left" data-col="2" @mousedown="(e) => store.startColumnResize(e, 2)"></span>
            {{ store.t('colAuthor') }}
            <span class="resizeCol right" data-col="3" @mousedown="(e) => store.startColumnResize(e, 3)"></span>
          </th>
          <th v-if="colVisibility.commit" class="tableColHeader" data-col="4">
            <span class="resizeCol left" data-col="3" @mousedown="(e) => store.startColumnResize(e, 3)"></span>
            {{ store.t('colCommit') }}
          </th>
        </tr>
      </thead>
      <tbody>

      <!-- commit 行 -->
      <template
        v-for="row in store.commitRows"
        :key="row.index"
      >
      <tr
        :class="['commit', { current: row.isCurrent, mute: row.isMuted, commitDetailsOpen: store.expandedCommit?.commitHash === row.hash }]"
        :data-id="row.index"
        :data-color="row.colour"
        :id="row.isUncommitted ? 'uncommittedChanges' : undefined"
        @click="(e) => store.onCommitRowClick(e, row.index, row.hash)"
        @contextmenu="(e) => store.onCommitRowContextMenu(e, row.index, row.hash)"
        @dblclick="(e) => store.onCommitRowDblClick(e, row.index, row.hash)"
      >
        <!-- Graph 列（空，由 CommitGraph SVG 覆盖） -->
        <td>
          <span class="resizeCol right" data-col="0" @mousedown="(e) => store.startColumnResize(e, 0)"></span>
        </td>

        <!-- Description 列 -->
        <td v-if="branchLabelsAlignedToGraph">
          <span class="resizeCol right" data-col="1"></span>
          <span class="description">
            <span v-if="row.isHead" class="commitHeadDot"></span>
            <span class="text" v-html="row.subject"></span>
            <span v-if="row.body" class="commitbody" v-html="row.body"></span>
          </span>
        </td>
        <td v-else>
          <span class="resizeCol right" data-col="1"></span>
          <span class="description">
            <span v-if="row.isHead" class="commitHeadDot"></span>
            <!-- Ref 标签：branches -->
            <span
              v-for="ref in row.refBranches"
              :key="ref.type + ref.name"
              :class="['gitRef', ref.type, { active: ref.isActive }]"
              :data-name="ref.name"
              @click="(e) => store.onGitRefClick(e, ref.name)"
              @dblclick="(e) => store.onGitRefDblClick(e, row.index, row.hash, e.currentTarget as HTMLElement)"
              @contextmenu="(e) => store.onGitRefContextMenu(e, row.index, row.hash, e.currentTarget as HTMLElement)"
            >
              <IconSvg :name="ref.type === 'stash' ? 'stash' : 'branch'" />
              <span class="gitRefName" :data-fullref="ref.name">{{ ref.type === 'stash' ? ref.name.substring(5) : ref.name }}</span>
              <template v-if="ref.remotes">
                <span
                  v-for="remote in ref.remotes"
                  :key="remote"
                  class="gitRefHeadRemote"
                  :data-remote="remote"
                  :data-fullref="remote + '/' + ref.name"
                >{{ remote }}</span>
              </template>
            </span>
            <!-- Tags (left mode) -->
            <template v-if="!tagLabelsOnRight">
              <span
                v-for="tag in row.refTags"
                :key="tag.name"
                class="gitRef tag"
                :data-name="tag.name"
                :data-tagtype="tag.annotated ? 'annotated' : 'lightweight'"
                @click="(e) => store.onGitRefClick(e, tag.name)"
                @dblclick="(e) => store.onGitRefDblClick(e, row.index, row.hash, e.currentTarget as HTMLElement)"
                @contextmenu="(e) => store.onGitRefContextMenu(e, row.index, row.hash, e.currentTarget as HTMLElement)"
              >
                <IconSvg name="tag" />
                <span class="gitRefName" :data-fullref="tag.name">{{ tag.name }}</span>
              </span>
            </template>
            <span class="text" v-html="row.subject"></span>
            <span v-if="row.body" class="commitbody" v-html="row.body"></span>
            <!-- Tags (right mode) -->
            <span v-if="tagLabelsOnRight && row.refTags.length > 0" class="tagsWrapper">
              <span
                v-for="tag in row.refTags"
                :key="tag.name"
                class="gitRef tag"
                :data-name="tag.name"
                :data-tagtype="tag.annotated ? 'annotated' : 'lightweight'"
                @click="(e) => store.onGitRefClick(e, tag.name)"
                @dblclick="(e) => store.onGitRefDblClick(e, row.index, row.hash, e.currentTarget as HTMLElement)"
                @contextmenu="(e) => store.onGitRefContextMenu(e, row.index, row.hash, e.currentTarget as HTMLElement)"
              >
                <IconSvg name="tag" />
                <span class="gitRefName" :data-fullref="tag.name">{{ tag.name }}</span>
              </span>
            </span>
          </span>
        </td>

        <!-- Date 列 -->
        <td v-if="colVisibility.date" class="dateCol text" :title="row.dateTitle">
          {{ row.date }}
        </td>

        <!-- Author 列 -->
        <td v-if="colVisibility.author" class="authorCol text" :title="row.author + ' <' + row.email + '>'">
          <span v-if="store.config.fetchAvatars" class="avatar" :data-email="row.email">
            <img v-if="row.avatar" class="avatarImg" :src="row.avatar" />
          </span>
          {{ row.author }}
        </td>

        <!-- Commit hash 列 -->
        <td v-if="colVisibility.commit" class="text" :title="row.hash">
          {{ row.shortHash }}
        </td>
      </tr>

      <!-- Commit Details View (inline 模式，紧跟在展开的 commit 行后) -->
      <tr
        v-if="!store.isCdvDocked && store.expandedCommit?.commitHash === row.hash"
        id="cdv"
        class="inline"
        :style="{ height: store.cdvHeightPx }"
      >
        <td><div class="cdvHeightResize" @mousedown="store.startCdvHeightResize($event)"></div></td>
        <td :colspan="store.getNumColumns() - 1">
          <CommitDetails />
        </td>
      </tr>
      </template>
      </tbody>
    </table>

    <!-- Footer：加载更多 -->
    <div id="footer">
      <div
        v-if="store.moreCommitsAvailable"
        id="loadMoreCommitsBtn"
        class="roundedBtn"
        @click="loadMoreCommits"
      >
        {{ store.t('loadMoreCommits') }}
      </div>
    </div>
  </div>
</template>

<style scoped>
/* Commit Table 布局 */
#commitTable {
	z-index: 1;
}
#commitTable table {
	width: 100%;
	border-collapse: collapse;
}
#commitTable table, #commitTable tbody, #commitTable tr, #commitTable th, #commitTable td {
	padding: 0;
	margin: 0;
}
#commitTable th, #commitTable td {
	white-space: nowrap;
	font-size: var(--git-graph-fontSize, 13px);
	cursor: default;
	text-overflow: ellipsis;
	overflow: hidden;
	-webkit-user-select: none;
	user-select: none;
}
#commitTable td {
	line-height: var(--git-graph-rowHeight, 24px);
	padding: 0 4px;
}
#commitTable th {
	border-bottom: 1px solid transparent;
	box-shadow: 0 1px 0 rgba(128, 128, 128, 0.5);
	line-height: 18px;
	padding: 6px 12px;
}
#commitTable tr.commit td {
	cursor: pointer;
}

#commitTable tr.commit.current span.description :deep(.text) {
	font-weight: bold;
}

#commitTable tr.commit span.description {
	display: flex;
}
#commitTable tr.commit span.description .commitHeadDot,
#commitTable tr.commit td span.description .gitRef {
	flex-shrink: 0;
}
#commitTable tr.commit span.description .text {
	display: inline-block;
	text-overflow: ellipsis;
	white-space: nowrap;
	overflow: hidden;
	margin-right: 1em;
}
#commitTable tr.commit span.description :deep(.commitbody) {
	opacity: 0.5;
}

#commitTable tr.commit.mute td.text,
#commitTable tr.commit.mute span.description .text {
	opacity: 0.5;
}

#commitTable.fixedLayout table {
	table-layout: fixed;
}
#commitTable.autoLayout.limitGraphWidth td:first-child,
#commitTable.autoLayout.limitGraphWidth th:first-child {
	max-width: var(--limitGraphWidth);
	box-sizing: border-box;
}
#commitTable.autoLayout td:nth-child(2),
#commitTable.autoLayout th:nth-child(2) {
	width: 100%;
	max-width: 0;
}
#commitTable.autoLayout td.authorCol,
#commitTable.autoLayout th.authorCol {
	max-width: 124px;
}
@media screen and (min-width: 775px) and (max-width: 850px) {
	#commitTable.autoLayout td.dateCol, #commitTable.autoLayout th.dateCol,
	#commitTable.autoLayout td.authorCol, #commitTable.autoLayout th.authorCol {
		max-width: 100px;
	}
}
@media screen and (min-width: 700px) and (max-width: 775px) {
	#commitTable.autoLayout td.dateCol, #commitTable.autoLayout th.dateCol,
	#commitTable.autoLayout td.authorCol, #commitTable.autoLayout th.authorCol {
		max-width: 90px;
	}
}
@media screen and (max-width: 700px) {
	#commitTable.autoLayout td.dateCol, #commitTable.autoLayout th.dateCol,
	#commitTable.autoLayout td.authorCol, #commitTable.autoLayout th.authorCol {
		max-width: 80px;
	}
}

.tableColHeader {
	position: relative;
}
#tableColHeaders.sticky .tableColHeader {
	position: sticky;
	top: inherit;
	z-index: 11;
	background-color: var(--vscode-editor-background);
}
.resizeCol {
	position: absolute;
	top: 0;
	height: 100%;
	display: block;
	width: 6px;
	cursor: col-resize;
}
.resizeCol.left { left: 0; }
.resizeCol.right { right: 0; }

.commit > td, #tableColHeaders > th {
	border-right: solid 1px rgba(128, 128, 128, 0.25);
}
.commit > td {
	position: relative;
}
#tableColHeaders > th:last-child, .commit > td:last-child {
	border-right: none;
}

/* Commit Emphasis */
.commitHeadDot {
	width: 6px;
	height: 6px;
	border: 2px solid var(--git-graph-color);
	display: inline-block;
	border-radius: 6px;
	margin-right: 5px;
	vertical-align: top;
	margin-top: 7px;
	cursor: help;
}
#commitTable tr.commit:hover,
#commitTable tr.commit.contextMenuActive,
#commitTable tr.commit.findCurrentCommit:hover,
#commitTable tr.commit.graphVertexActive,
#commitTable tr.commit.dialogActive {
	background-color: rgba(128, 128, 128, 0.15);
}
#commitTable tr.commit.commitDetailsOpen {
	background-color: rgba(128, 128, 128, 0.25);
}
#commitTable tr.commit.commitDetailsOpen:hover,
#commitTable tr.commit.commitDetailsOpen.contextMenuActive,
#commitTable tr.commit.commitDetailsOpen.dialogActive,
#commitTable tr.commit.commitDetailsOpen.graphVertexActive {
	background-color: rgba(128, 128, 128, 0.35);
}
#commitTable tr.commit.findCurrentCommit {
	background-image: linear-gradient(var(--git-graph-findMatchCommit), var(--git-graph-findMatchCommit));
	outline: 1px solid var(--vscode-editor-findMatchHighlightBorder, transparent);
	outline-offset: -1px;
}
#commitTable tr.commit.mute.commitDetailsOpen td.text,
#commitTable tr.commit.mute.commitDetailsOpen span.description .text,
#commitTable tr.commit.mute.findCurrentCommit td.text,
#commitTable tr.commit.mute.findCurrentCommit span.description .text {
	opacity: 1;
}
#commitTable tr.commit.flash {
	animation: flash-commit 0.75s linear;
}
@keyframes flash-commit {
	0%   {}
	20%  { background-color: var(--git-graph-flashPrimary); }
	35%  { background-color: var(--git-graph-flashSecondary); }
	50%  { background-color: var(--git-graph-flashPrimary); }
	65%  { background-color: var(--git-graph-flashPrimary); }
	100% {}
}

/* Ref labels */
.gitRef {
	display: inline-block;
	height: 18px;
	line-height: 18px;
	margin-top: 2px;
	margin-right: 5px;
	background-color: rgba(128, 128, 128, 0.15);
	border-radius: 5px;
	border: 1px solid rgba(128, 128, 128, 0.75);
	vertical-align: top;
	font-size: 12px;
	cursor: default;
	overflow: hidden;
	-webkit-user-select: none;
	user-select: none;
}
.gitRef.active {
	border-color: var(--git-graph-color);
}
.gitRef.active .gitRefName {
	font-weight: bold;
}
.gitRef :deep(svg) {
	background-color: var(--git-graph-color);
	fill: var(--vscode-editor-background);
	width: 14px;
	height: 14px;
	padding: 2px;
	vertical-align: top;
}
.gitRefName, .gitRefHeadRemote {
	display: inline-block;
	height: 18px;
	line-height: 18px;
	padding: 0 5px;
}
.gitRefHeadRemote {
	border-left: 1px solid rgba(128, 128, 128, 0.45);
	font-style: italic;
}
#commitTable tr.commit.commitDetailsOpen:hover .gitRef,
#commitTable tr.commit.commitDetailsOpen.contextMenuActive .gitRef,
#commitTable tr.commit.commitDetailsOpen.dialogActive .gitRef,
#commitTable tr.commit.commitDetailsOpen.graphVertexActive .gitRef {
	background-color: rgba(128, 128, 128, 0.05);
}
.gitRef .contextMenuActive,
.gitRef .dialogActive,
.gitRef .gitRefName:hover,
.gitRef .gitRefHeadRemote:hover {
	background-color: rgba(128, 128, 128, 0.1);
}
.tagsWrapper {
	margin-left: auto;
}

/* Avatar */
.commit .avatar > img {
	display: inline-block;
	width: 18px;
	height: 18px;
	border-radius: 4px;
	vertical-align: top;
	margin-top: 3px;
	margin-right: 4px;
}
</style>

<!-- body 级全局选择器 + high-contrast，无法 scoped -->
<style>
body.vscode-high-contrast #commitTable tr.commit.findCurrentCommit {
	outline-style: dotted;
}
body.branchLabelsAlignedToGraph tr.commit td:first-child .gitRef:last-child {
	margin-right: 0;
}
body.tagLabelsRightAligned .gitRef.tag {
	margin-left: 5px;
	margin-right: 0;
}
</style>
