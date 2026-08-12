<script setup lang="ts">
/**
 * CommitDetails — 提交详情视图 (CDV)
 *
 * 从 store.expandedCommit 响应式获取数据，完全用 Vue 声明式模板渲染。
 * 替代原 store.renderCommitDetailsView 的 innerHTML 拼接方案。
 *
 * 此组件只渲染 CDV 的**内容部分**（不含 <tr> 包裹）。
 * - inline 模式：由 CommitTable.vue 负责将其放在正确的 <tr> 中
 * - docked 模式：由 App.vue 作为 position:fixed 底部面板渲染
 */
import { computed } from 'vue';
import * as GG from 'backend-types';
import { useGitGraphStore } from '@/stores/gitGraph';
import { SVG_ICONS, GIT_SIGNATURE_STATUS_DESCRIPTIONS, CLASS_PENDING_REVIEW } from '@/lib/constants';
import { CLASS_CONTEXT_MENU_ACTIVE } from '@/lib/contextMenu';
import { formatLongDate } from '@/lib/utils';
import { TextFormatter, CLASS_EXTERNAL_URL, CLASS_INTERNAL_URL } from '@/lib/textFormatter';
import { UNCOMMITTED, type FileTreeFolder } from '@/types';
import IconSvg from './IconSvg.vue';
import FileTreeItem from './FileTreeItem.vue';

const store = useGitGraphStore();

/* ================================================================
 * 响应式数据派生
 * ================================================================ */

const ec = computed(() => store.expandedCommit);
const isLoading = computed(() => ec.value?.loading === true);
const isComparison = computed(() => ec.value?.compareWithHash !== null);
const isUncommitted = computed(() => ec.value?.commitHash === UNCOMMITTED);

/** commit 顺序（from / to） */
const commitOrder = computed(() => {
  if (!ec.value) return { from: '', to: '' };
  return store.getCommitOrder(
    ec.value.commitHash,
    ec.value.compareWithHash === null ? ec.value.commitHash : ec.value.compareWithHash
  );
});

/** 是否可进行 Code Review */
const codeReviewPossible = computed(() => {
  if (!ec.value || ec.value.loading) return false;
  return commitOrder.value.to !== UNCOMMITTED;
});

/** 是否可进行 External Diff */
const externalDiffPossible = computed(() => {
  if (!ec.value || ec.value.loading) return false;
  if (ec.value.compareWithHash !== null) return true;
  const commit = store.commits[store.commitLookup[ec.value.commitHash]];
  return commit ? commit.parents.length > 0 : false;
});

/** CDV 分隔条位置（百分比） */
const cdvDividerPercent = computed(() => {
  const repoState = store.gitRepos[store.currentRepo];
  if (!repoState) return '50%';
  return (repoState.cdvDivider * 100).toFixed(2) + '%';
});

/** 文件视图类型 */
const fileViewType = computed(() => store.getFileViewType());
const isListView = computed(() => fileViewType.value === GG.FileViewType.List);

/** Code Review 是否激活 */
const codeReviewActive = computed(() => ec.value?.codeReview !== null);

/** External Diff 按钮是否可用 */
const externalDiffEnabled = computed(() => {
  return store.gitConfig !== null &&
    (store.gitConfig.diffTool !== null || store.gitConfig.guiDiffTool !== null);
});

/** External Diff 工具名称 */
const externalDiffToolName = computed(() => {
  if (!store.gitConfig) return null;
  return store.gitConfig.guiDiffTool ?? store.gitConfig.diffTool;
});

/** loading 提示文本类型 */
const loadingTextType = computed(() => {
  if (!ec.value) return 'commitDetails';
  if (ec.value.compareWithHash !== null) return 'commitComparison';
  return ec.value.commitHash !== UNCOMMITTED ? 'commitDetails' : 'uncommittedChanges';
});

/** commit 详情数据 */
const commitDetails = computed(() => ec.value?.commitDetails);

/** parents 列表（用于判断哪些 parent 在当前 commits 中） */
const parents = computed(() => {
  if (!commitDetails.value) return [];
  return commitDetails.value.parents.map((parent) => ({
    hash: parent,
    exists: typeof store.commitLookup[parent] === 'number',
  }));
});

/** Author Date 和 Committer Date 是否不同 */
const hasDifferentDates = computed(() => {
  if (!commitDetails.value) return false;
  return commitDetails.value.authorDate !== commitDetails.value.committerDate;
});

/** 格式化后的 commit body HTML（由 TextFormatter 生成，安全） */
const formattedBody = computed(() => {
  if (!commitDetails.value) return '';
  const repoState = store.gitRepos[store.currentRepo];
  const formatter = new TextFormatter(
    store.commits,
    repoState?.issueLinkingConfig ?? null,
    { commits: true, emoji: true, issueLinking: true, markdown: store.config.markdown, multiline: true, urls: true }
  );
  return formatter.format(commitDetails.value.body);
});

/* ================================================================
 * 文件列表模式：扁平化文件
 * ================================================================ */

/** 排序文件夹的 keys */
function sortFolderKeys(folder: FileTreeFolder): string[] {
  const keys = Object.keys(folder.contents);
  keys.sort((a, b) =>
    folder.contents[a].type !== 'file' && folder.contents[b].type === 'file' ? -1
      : folder.contents[a].type === 'file' && folder.contents[b].type !== 'file' ? 1
        : folder.contents[a].name.localeCompare(folder.contents[b].name)
  );
  return keys;
}

/** 扁平化文件列表中每项的数据 */
interface FlatFileItem {
  relPath: string;
  /** FileTreeFile 的 index（用于 contextMenu 定位） */
  index: number;
  /** 文件是否已 review */
  reviewed: boolean;
  file: GG.GitFileChange | null;
  diffPossible: boolean;
  changeTypeMessage: string;
  showAddDel: boolean;
  isLastViewed: boolean;
  contextMenuActive: boolean;
}

/** 文件列表模式：扁平化所有文件（带预计算信息） */
const flatFileList = computed<FlatFileItem[]>(() => {
  if (!ec.value?.fileTree || !ec.value?.fileChanges) return [];
  const fileChanges = ec.value.fileChanges;
  const lastViewedFile = ec.value.lastViewedFile;
  const contextMenuIndex = ec.value.contextMenuOpen.fileView;

  const typeMap: Record<string, string> = { 'A': 'Added', 'M': 'Modified', 'D': 'Deleted', 'R': 'Renamed', 'U': 'Untracked' };

  const sortLeaves = (folder: FileTreeFolder, folderPath: string): FlatFileItem[] => {
    let items: FlatFileItem[] = [];
    for (const key of sortFolderKeys(folder)) {
      const cur = folder.contents[key];
      const relPath = (folderPath !== '' ? folderPath + '/' : '') + cur.name;
      if (cur.type === 'folder') {
        items = items.concat(sortLeaves(cur, relPath));
      } else if (cur.type === 'file') {
        const file = fileChanges[cur.index];
        const diffPossible = file.type === GG.GitFileStatus.Untracked ||
          (file.additions !== null && file.deletions !== null);
        const baseType = typeMap[file.type] ?? file.type;
        const changeTypeMessage = file.type === GG.GitFileStatus.Renamed
          ? baseType + ' (' + file.oldFilePath + ' → ' + file.newFilePath + ')'
          : baseType;
        const showAdd = file.type !== GG.GitFileStatus.Added &&
          file.type !== GG.GitFileStatus.Untracked &&
          file.type !== GG.GitFileStatus.Deleted &&
          file.additions !== null && file.deletions !== null;
        items.push({
          relPath,
          index: cur.index,
          reviewed: cur.reviewed,
          file,
          diffPossible,
          changeTypeMessage,
          showAddDel: showAdd,
          isLastViewed: file.newFilePath === lastViewedFile,
          contextMenuActive: cur.index === contextMenuIndex,
        });
      }
    }
    return items;
  };
  return sortLeaves(ec.value.fileTree, '');
});

/** 获取根文件夹的排序子项 */
const rootChildren = computed(() => {
  if (!ec.value?.fileTree) return [];
  return sortFolderKeys(ec.value.fileTree).map((key) => ({
    key,
    node: ec.value!.fileTree!.contents[key],
  }));
});

/** 文件 diff 提示文本 */
function fileDiffTooltip(item: FlatFileItem): string {
  if (!item.file) return '';
  const diffMsg = item.diffPossible
    ? 'Click to View Diff'
    : 'Unable to View Diff' + (item.file.type !== GG.GitFileStatus.Deleted ? ' (this is a binary file)' : '');
  return diffMsg + ' • ' + item.changeTypeMessage;
}

/* ================================================================
 * 签名信息
 * ================================================================ */

/** 获取签名的图标名称 */
function getSignatureIcon(status: GG.GitSignatureStatus): keyof typeof SVG_ICONS {
  if (status === GG.GitSignatureStatus.GoodAndValid) return 'passed';
  if (status === GG.GitSignatureStatus.Bad) return 'failed';
  return 'inconclusive';
}

/** 获取签名描述 */
function getSignatureDescription(signature: GG.GitSignature): string {
  return GIT_SIGNATURE_STATUS_DESCRIPTIONS[signature.status] +
    ': Signed by ' + (signature.signer !== '' ? signature.signer : '<Unknown>') +
    ' (GPG Key Id: ' + (signature.key !== '' ? signature.key : '<Unknown>') + ')';
}

/* ================================================================
 * 事件处理
 * ================================================================ */

function onClose() {
  store.closeCommitDetails(true);
}

function onChangeFileViewType(type: GG.FileViewType) {
  store.changeFileViewType(type);
}

function onOpenFolders(open: boolean) {
  store.openFolders(open);
}

function onCodeReview() {
  store.onCdvCodeReviewClick();
}

function onExternalDiff() {
  store.onCdvExternalDiffClick();
}

function onHeightResizeMouseDown(event: MouseEvent) {
  store.startCdvHeightResize(event);
}

function onDividerMouseDown(event: MouseEvent) {
  store.startCdvDividerDrag(event);
}

function onInternalCommitClick(event: MouseEvent, hash: string) {
  event.preventDefault();
  store.scrollToCommit(hash, true, true);
}

function onFileClick(item: FlatFileItem) {
  if (item.file && item.diffPossible) {
    store.viewFileDiff(item.file);
  }
}

function onFileContextMenu(event: MouseEvent, item: FlatFileItem) {
  event.preventDefault();
  event.stopPropagation();
  if (item.file) {
    store.showFileContextMenu(event, item.file, item.index);
  }
}
</script>

<template>
  <div v-if="ec" id="cdvContent">
    <!-- Loading 状态 -->
    <div v-if="isLoading" id="cdvLoading">
      <IconSvg name="loading" />
      {{ store.t('loadingEllipsis') }}
      {{ store.t(loadingTextType) }}
    </div>

    <!-- Loaded 状态 -->
    <template v-else>
      <!-- Summary 区域 -->
      <div id="cdvSummary" :style="{ width: cdvDividerPercent }">
        <!-- 单个 commit 详情 -->
        <template v-if="!isComparison">
          <template v-if="!isUncommitted && commitDetails">
            <span :class="['cdvSummaryTop', { withAvatar: ec.avatar !== null }]">
              <span class="cdvSummaryTopRow">
                <span class="cdvSummaryKeyValues">
                  <b>Commit: </b>{{ commitDetails.hash }}<br />
                  <b>Parents: </b>
                  <template v-if="parents.length > 0">
                    <template v-for="(parent, i) in parents" :key="parent.hash">
                      <span v-if="i > 0">, </span>
                      <a
                        v-if="parent.exists"
                        :class="CLASS_INTERNAL_URL"
                        href="#"
                        @click="(e) => onInternalCommitClick(e, parent.hash)"
                      >{{ parent.hash }}</a>
                      <template v-else>{{ parent.hash }}</template>
                    </template>
                  </template>
                  <template v-else>None</template>
                  <br />
                  <b>Author: </b>{{ commitDetails.author }}
                  <template v-if="commitDetails.authorEmail !== ''">
                    &lt;<a :class="CLASS_EXTERNAL_URL" :href="'mailto:' + commitDetails.authorEmail">{{ commitDetails.authorEmail }}</a>&gt;
                  </template>
                  <br />
                  <template v-if="hasDifferentDates">
                    <b>Author Date: </b>{{ formatLongDate(commitDetails.authorDate, store.config.dateFormat.iso) }}<br />
                  </template>
                  <b>Committer: </b>{{ commitDetails.committer }}
                  <template v-if="commitDetails.committerEmail !== ''">
                    &lt;<a :class="CLASS_EXTERNAL_URL" :href="'mailto:' + commitDetails.committerEmail">{{ commitDetails.committerEmail }}</a>&gt;
                  </template>
                  <template v-if="commitDetails.signature">
                    <br />
                    <span
                      :class="['signatureInfo', commitDetails.signature.status]"
                      :title="getSignatureDescription(commitDetails.signature)"
                    >
                      <IconSvg :name="getSignatureIcon(commitDetails.signature.status)" />
                    </span>
                  </template>
                  <br />
                  <b>{{ hasDifferentDates ? 'Committer ' : '' }}Date: </b>{{ formatLongDate(commitDetails.committerDate, store.config.dateFormat.iso) }}
                </span>
                <span v-if="ec.avatar !== null" class="cdvSummaryAvatar">
                  <img :src="ec.avatar" />
                </span>
              </span>
            </span>
            <br /><br />
            <span class="messageContent" v-html="formattedBody"></span>
          </template>
          <!-- 未提交更改 -->
          <template v-else-if="isUncommitted">
            Displaying all uncommitted changes.
          </template>
        </template>

        <!-- 对比模式 -->
        <template v-else>
          Displaying all changes from <b>{{ commitOrder.from }}</b> to
          <b>{{ commitOrder.to !== UNCOMMITTED ? commitOrder.to : 'Uncommitted Changes' }}</b>.
        </template>
      </div>

      <!-- Files 区域 -->
      <div id="cdvFiles" :style="{ left: cdvDividerPercent }">
        <!-- 文件列表模式 -->
        <ul v-if="isListView" class="fileTreeFolderContents">
          <li
            v-for="item in flatFileList"
            :key="item.relPath"
            :data-pathseg="encodeURIComponent(item.relPath)"
          >
            <span
              v-if="item.file"
              :class="['fileTreeFileRecord', { [CLASS_CONTEXT_MENU_ACTIVE]: item.contextMenuActive }]"
              :data-index="item.index"
              @contextmenu="(e) => onFileContextMenu(e, item)"
            >
              <span
                :class="['fileTreeFile', { gitDiffPossible: item.diffPossible, [CLASS_PENDING_REVIEW]: !item.reviewed }]"
                :title="fileDiffTooltip(item)"
                @click="onFileClick(item)"
              >
                <span class="fileTreeFileIcon"><IconSvg name="file" /></span>
                <span :class="['gitFileName', item.file.type]">{{ item.relPath }}</span>
              </span>
              <span v-if="item.showAddDel" class="fileTreeFileAddDel">
                (<span class="fileTreeFileAdd">+{{ item.file.additions }}</span>|<span class="fileTreeFileDel">-{{ item.file.deletions }}</span>)
              </span>
              <span v-if="item.isLastViewed" id="cdvLastFileViewed" title="Last File Viewed">
                <IconSvg name="eyeOpen" />
              </span>
            </span>
          </li>
        </ul>

        <!-- 文件树模式 — 递归渲染 -->
        <ul v-else-if="ec.fileTree" class="fileTreeFolderContents">
          <FileTreeItem
            v-for="child in rootChildren"
            :key="child.key"
            :node="child.node"
            :path-seg="child.node.name"
            :display-name="child.node.name"
            :top-level="true"
          />
        </ul>
      </div>

      <!-- 分隔条 -->
      <div id="cdvDivider" :style="{ left: cdvDividerPercent }" @mousedown="onDividerMouseDown"></div>
    </template>

    <!-- 控制按钮区域 -->
    <div id="cdvControls">
      <div id="cdvClose" class="cdvControlBtn" title="Close" @click="onClose">
        <IconSvg name="close" />
      </div>
      <div
        v-if="codeReviewPossible"
        id="cdvCodeReview"
        :class="['cdvControlBtn', { active: codeReviewActive }]"
        :title="codeReviewActive ? 'End Code Review' : 'Start Code Review'"
        @click="onCodeReview"
      >
        <IconSvg name="review" />
      </div>
      <template v-if="!isLoading">
        <div
          id="cdvFileViewTypeList"
          :class="['cdvControlBtn', 'cdvFileViewTypeBtn', { active: isListView }]"
          title="File List View"
          @click="onChangeFileViewType(GG.FileViewType.List)"
        >
          <IconSvg name="fileList" />
        </div>
        <div
          id="cdvFileViewTypeTree"
          :class="['cdvControlBtn', 'cdvFileViewTypeBtn', { active: !isListView }]"
          title="File Tree View"
          @click="onChangeFileViewType(GG.FileViewType.Tree)"
        >
          <IconSvg name="fileTree" />
        </div>
        <div
          id="cdvCollapse"
          :class="['cdvControlBtn', 'cdvFolderBtn', { hidden: isListView }]"
          title="Collapse Folders"
          @click="onOpenFolders(false)"
        >
          <IconSvg name="collapseAll" />
        </div>
        <div
          id="cdvExpand"
          :class="['cdvControlBtn', 'cdvFolderBtn', { hidden: isListView }]"
          title="Expand Folders"
          @click="onOpenFolders(true)"
        >
          <IconSvg name="expandAll" />
        </div>
      </template>
      <div
        v-if="externalDiffPossible"
        id="cdvExternalDiff"
        :class="['cdvControlBtn', { enabled: externalDiffEnabled }]"
        :title="'Open External Directory Diff' + (externalDiffToolName !== null ? ' with &quot;' + externalDiffToolName + '&quot;' : '')"
        @click="onExternalDiff"
      >
        <IconSvg name="linkExternal" />
      </div>
    </div>

    <!-- 高度调整拖拽条 -->
    <div class="cdvHeightResize" @mousedown="onHeightResizeMouseDown"></div>
  </div>
</template>

<style scoped>
/* cdvContent 是 position:absolute; right:32px，给按钮栏预留空间。
   cdvControls 在 cdvContent 内部，需要 right:-32px 抵消父级偏移，对齐到容器最右 */
#cdvContent {
	position: absolute;
	left: 0;
	right: 32px;
}

#cdvControls {
	position: absolute;
	right: -32px;
	width: 32px;
}

.cdvControlBtn {
	position: relative;
	margin: 4px;
	width: 24px;
	height: 24px;
	cursor: pointer;
}
.cdvControlBtn.active {
	background-color: rgba(128, 128, 128, 0.25);
}
.cdvControlBtn.active:hover {
	background-color: rgba(128, 128, 128, 0.35);
}
.cdvFolderBtn.hidden {
	display: none;
}

#cdvCodeReview {
	border-radius: 4px;
}

#cdvFileViewTypeTree {
	border-radius: 4px 4px 0 0;
	margin-bottom: 0;
}
#cdvFileViewTypeList {
	border-radius: 0 0 4px 4px;
	margin-top: 0;
}
.cdvFileViewTypeBtn {
	background-color: rgba(128, 128, 128, 0.125);
}

#cdvExternalDiff {
	display: none;
}
#cdvExternalDiff.enabled {
	display: block;
}

/* IconSvg 是子组件，需要 :deep() */
.cdvControlBtn :deep(svg) {
	position: absolute;
	width: 20px;
	height: 20px;
	left: 2px;
	top: 2px;
	fill: var(--vscode-editor-foreground);
	fill-opacity: 0.6;
}
.cdvControlBtn:hover :deep(svg),
.cdvControlBtn.active :deep(svg) {
	fill-opacity: 0.75;
}
.cdvControlBtn.active:hover :deep(svg) {
	fill-opacity: 0.9;
}

/* Summary / Files / Loading 区域 */
#cdvSummary, #cdvFiles, #cdvLoading {
	position: absolute;
	top: 0;
	bottom: 0;
	box-sizing: border-box;
	border-right: 1px solid rgba(128, 128, 128, 0.2);
	overflow-x: hidden;
	overflow-y: auto;
}
#cdvDivider {
	position: absolute;
	left: 50%;
	width: 6px;
	cursor: col-resize;
}
#cdvSummary {
	left: 0;
	width: 50%;
	padding: 10px;
	text-overflow: ellipsis;
	-webkit-user-select: text;
	user-select: text;
}

.cdvSummaryTop {
	display: inline-table;
	width: 100%;
}
.cdvSummaryTopRow {
	display: table-row;
}
.cdvSummaryKeyValues, .cdvSummaryAvatar {
	display: table-cell;
	vertical-align: top;
}
.cdvSummaryKeyValues {
	max-width: 0px;
	overflow-x: hidden;
	text-overflow: ellipsis;
}
.cdvSummaryTop.withAvatar .cdvSummaryKeyValues {
	padding-right: 10px;
}
.cdvSummaryAvatar {
	width: 54px;
}
.cdvSummaryAvatar > img {
	width: 54px;
	border-radius: 4px;
}

.signatureInfo {
	cursor: help;
	margin-left: 4px;
	vertical-align: middle;
	line-height: 13px;
}
.signatureInfo :deep(svg) {
	vertical-align: 0 !important;
}
.signatureInfo.G :deep(svg), .signatureInfo.X :deep(svg) {
	fill: #009028;
	opacity: 0.9;
}
.signatureInfo.U :deep(svg), .signatureInfo.Y :deep(svg),
.signatureInfo.R :deep(svg), .signatureInfo.E :deep(svg) {
	fill: #f09000;
	opacity: 1;
}
.signatureInfo.B :deep(svg) {
	fill: #e00000;
	opacity: 0.8;
}

#cdvFiles {
	left: 50%;
	right: 0;
	padding: 4px 8px 8px 0;
	-webkit-user-select: none;
	user-select: none;
}
#cdvFiles ul {
	list-style-type: none;
	-webkit-margin-before: 0;
	-webkit-margin-after: 0;
	-webkit-margin-start: 0px;
	-webkit-margin-end: 0px;
	-webkit-padding-start: 25px;
	margin: 0;
	padding: 0 0 0 25px;
}
#cdvFiles > ul {
	-webkit-padding-start: 10px;
	padding: 0 0 0 10px;
}
#cdvFiles li {
	margin-top: 4px;
	white-space: nowrap;
	text-overflow: ellipsis;
	overflow-x: hidden;
}

#cdvLoading {
	left: 0;
	right: 0;
	padding: 10px;
	-webkit-user-select: none;
	user-select: none;
	text-align: center;
	line-height: 24px;
	text-overflow: ellipsis;
}
#cdvLoading :deep(svg) {
	display: inline-block;
	width: 15px !important;
	height: 20px !important;
	margin-top: 2px;
	margin-right: 8px;
	vertical-align: top;
	fill: var(--vscode-editor-foreground);
	animation: loadingIconAnimation 2s linear infinite;
}

.cdvHeightResize {
	position: absolute;
	left: 0;
	right: 0;
	height: 6px;
	cursor: row-resize;
}
</style>

/* #cdv 容器由父组件 (App.vue docked / CommitTable.vue inline) 渲染，
   这些选择器涉及跨组件 DOM 层级，必须全局 */
<style>
#cdv.inline {
	vertical-align: top;
}
#cdv.inline td {
	background-color: rgba(128, 128, 128, 0.1);
	position: relative;
	font-size: 13px;
	line-height: 18px;
	white-space: normal;
}
#cdv.docked {
	display: block;
	position: fixed;
	left: 0;
	right: 0;
	bottom: 0;
	background-color: rgba(128, 128, 128, 0.1);
	font-size: 13px;
	line-height: 18px;
	white-space: normal;
	cursor: default;
}

/* inline 模式下 cdvContent / cdvControls 的定位调整 */
#cdv.inline #cdvContent,
#cdv.inline #cdvControls {
	top: 0;
	bottom: 2px;
}
#cdv.inline #cdvContent {
	border-left: 1px solid rgba(128, 128, 128, 0.2);
}
#cdv.inline #cdvDivider {
	top: 0;
	bottom: 6px;
}
#cdv.inline .cdvHeightResize {
	bottom: 0;
	border-bottom: 2px solid rgba(128, 128, 128, 0.2);
}

/* docked 模式 */
#cdv.docked #cdvContent,
#cdv.docked #cdvControls {
	top: 2px;
	bottom: 0;
}
#cdv.docked #cdvDivider {
	top: 6px;
	bottom: 0;
}
#cdv.docked .cdvHeightResize {
	top: 0;
	border-top: 2px solid rgba(128, 128, 128, 0.2);
}
</style>
