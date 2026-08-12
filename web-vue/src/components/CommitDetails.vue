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
/* CDV 样式由全局 main.css 控制 */
</style>
