<script setup lang="ts">
/**
 * FileTreeItem — 文件树递归渲染组件
 *
 * 根据 node.type 渲染：
 * - folder: 显示文件夹图标 + 名称，可折叠/展开，递归渲染子项
 * - file: 显示文件图标 + 名称 + 增删统计，可点击查看 diff
 * - repo: 显示子模块链接，可点击切换仓库
 *
 * 注意：组件名必须在 script 中声明，因为递归组件需要通过名称自引用。
 */
import { computed } from 'vue';
import * as GG from 'backend-types';
import { useGitGraphStore } from '@/stores/gitGraph';
import { CLASS_PENDING_REVIEW } from '@/lib/constants';
import { CLASS_CONTEXT_MENU_ACTIVE } from '@/lib/contextMenu';
import { type FileTreeNode, type FileTreeFolder, type FileTreeFile } from '@/types';
import IconSvg from './IconSvg.vue';

defineOptions({ name: 'FileTreeItem' });

const store = useGitGraphStore();

/** 当前节点 */
const props = defineProps<{
  node: FileTreeNode;
  /** 路径段（用于 data-pathseg） */
  pathSeg: string;
  /** 显示名称（compactFolders 模式下可能是合并的多级名称） */
  displayName?: string;
  /** 是否为顶层节点 */
  topLevel?: boolean;
}>();

/** 当前展开的 commit */
const ec = computed(() => store.expandedCommit);

/** compactFolders 配置 */
const compactFolders = computed(() => store.config.commitDetailsView.fileTreeCompactFolders);

/** 文件夹：获取合并后的信息（compactFolders 模式） */
const folderInfo = computed(() => {
  if (props.node.type !== 'folder') return null;
  if (props.topLevel || !compactFolders.value) {
    return { folder: props.node, name: props.displayName ?? props.node.name, pathSeg: props.pathSeg };
  }
  return getCompactFolderInfo(props.node, props.displayName ?? props.node.name, props.pathSeg);
});

/** 合并紧凑文件夹 */
function getCompactFolderInfo(folder: FileTreeFolder, name: string, pathSeg: string): { folder: FileTreeFolder; name: string; pathSeg: string } {
  const keys = Object.keys(folder.contents);
  if (keys.length === 1) {
    const child = folder.contents[keys[0]];
    if (child.type === 'folder') {
      return getCompactFolderInfo(child, name + ' / ' + child.name, pathSeg + '/' + child.name);
    }
  }
  return { folder, name, pathSeg };
}

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

/** 获取排序后的子项 */
function getSortedChildren(folder: FileTreeFolder): { key: string; node: FileTreeNode }[] {
  return sortFolderKeys(folder).map((key) => ({ key, node: folder.contents[key] }));
}

/** 获取文件变更信息 */
function getFileChange(leaf: FileTreeFile): GG.GitFileChange | null {
  if (!ec.value?.fileChanges) return null;
  return ec.value.fileChanges[leaf.index];
}

/** 判断文件是否可以 diff */
function isDiffPossible(file: GG.GitFileChange): boolean {
  return file.type === GG.GitFileStatus.Untracked ||
    (file.additions !== null && file.deletions !== null);
}

/** 文件变更类型描述 */
function getChangeTypeMessage(file: GG.GitFileChange): string {
  const typeMap: Record<string, string> = { 'A': 'Added', 'M': 'Modified', 'D': 'Deleted', 'R': 'Renamed', 'U': 'Untracked' };
  const base = typeMap[file.type] ?? file.type;
  if (file.type === GG.GitFileStatus.Renamed) {
    return base + ' (' + file.oldFilePath + ' → ' + file.newFilePath + ')';
  }
  return base;
}

/** 文件是否显示 additions/deletions */
function showAddDel(file: GG.GitFileChange): boolean {
  return file.type !== GG.GitFileStatus.Added &&
    file.type !== GG.GitFileStatus.Untracked &&
    file.type !== GG.GitFileStatus.Deleted &&
    file.additions !== null && file.deletions !== null;
}

/** repo 节点的 path（类型安全访问） */
const repoPath = computed<string>(() => {
  return props.node.type === 'repo' ? props.node.path : '';
});

/** enhancedAccessibility 配置 */
const enhancedAccessibility = computed(() => store.config.enhancedAccessibility);

/** 文件节点：获取文件变更信息（computed） */
const fileInfo = computed<{ file: GG.GitFileChange | null }>(() => {
  if (props.node.type !== 'file') return { file: null };
  return { file: getFileChange(props.node) };
});

/** 文件节点的 index（类型安全访问） */
const fileIndex = computed<number>(() => {
  return props.node.type === 'file' ? props.node.index : -1;
});

/** 文件节点的 reviewed 状态（类型安全访问） */
const fileReviewed = computed<boolean>(() => {
  return props.node.type === 'file' ? props.node.reviewed : false;
});

/** 是否为 lastViewedFile */
const isLastViewed = computed(() => {
  if (!fileInfo.value.file || !ec.value) return false;
  return ec.value.lastViewedFile === fileInfo.value.file.newFilePath;
});

/* ================================================================
 * 事件处理
 * ================================================================ */

/** 点击文件夹 → 展开/折叠 */
function onFolderClick(folder: FileTreeFolder) {
  if (!ec.value?.fileTree) return;
  folder.open = !folder.open;
  store.saveState();
}

/** 点击子模块 repo */
function onRepoClick(path: string) {
  store.loadRepos(store.gitRepos, null, { repo: decodeURIComponent(path) });
}

/** 点击文件 → 查看 diff */
function onFileClick(file: GG.GitFileChange | null) {
  if (file && isDiffPossible(file)) {
    store.viewFileDiff(file);
  }
}

/** 文件右键菜单 */
function onFileContextMenu(event: MouseEvent, file: GG.GitFileChange | null, index: number) {
  if (!file) return;
  event.preventDefault();
  event.stopPropagation();
  store.showFileContextMenu(event, file, index);
}

/** 文件 diff 提示文本 */
function fileDiffTooltip(file: GG.GitFileChange): string {
  const diffMsg = isDiffPossible(file)
    ? 'Click to View Diff'
    : 'Unable to View Diff' + (file.type !== GG.GitFileStatus.Deleted ? ' (this is a binary file)' : '');
  return diffMsg + ' • ' + getChangeTypeMessage(file);
}
</script>

<template>
  <!-- 文件夹节点 -->
  <template v-if="node.type === 'folder' && folderInfo">
    <li :class="{ closed: !folderInfo.folder.open }" :data-pathseg="encodeURIComponent(folderInfo.pathSeg)">
      <span
        :class="['fileTreeFolder', { [CLASS_PENDING_REVIEW]: !folderInfo.folder.reviewed }]"
        :title="'./' + folderInfo.folder.folderPath"
        :data-folderpath="encodeURIComponent(folderInfo.folder.folderPath)"
        @click="onFolderClick(folderInfo.folder)"
      >
        <span class="fileTreeFolderIcon">
          <IconSvg :name="folderInfo.folder.open ? 'openFolder' : 'closedFolder'" />
        </span>
        <span class="gitFolderName">{{ folderInfo.name }}</span>
      </span>
      <ul :class="['fileTreeFolderContents', { hidden: !folderInfo.folder.open }]">
        <FileTreeItem
          v-for="child in getSortedChildren(folderInfo.folder)"
          :key="child.key"
          :node="child.node"
          :path-seg="folderInfo.pathSeg + '/' + child.node.name"
          :display-name="child.node.name"
        />
      </ul>
    </li>
  </template>

  <!-- 文件节点 -->
  <template v-else-if="node.type === 'file' && fileInfo.file">
    <li :data-pathseg="encodeURIComponent(pathSeg)">
      <span
        :class="['fileTreeFileRecord', { [CLASS_CONTEXT_MENU_ACTIVE]: ec?.contextMenuOpen.fileView === fileIndex }]"
        :data-index="fileIndex"
        @contextmenu="(e) => onFileContextMenu(e, fileInfo.file!, fileIndex)"
      >
        <span
          :class="['fileTreeFile', { gitDiffPossible: isDiffPossible(fileInfo.file), [CLASS_PENDING_REVIEW]: !fileReviewed }]"
          :title="fileDiffTooltip(fileInfo.file)"
          @click="onFileClick(fileInfo.file)"
        >
          <span class="fileTreeFileIcon"><IconSvg name="file" /></span>
          <span :class="['gitFileName', fileInfo.file.type]">{{ node.name }}</span>
        </span>
        <span v-if="enhancedAccessibility" class="fileTreeFileType" :title="getChangeTypeMessage(fileInfo.file)">
          {{ fileInfo.file.type }}
        </span>
        <span v-if="showAddDel(fileInfo.file)" class="fileTreeFileAddDel">
          (<span class="fileTreeFileAdd">+{{ fileInfo.file.additions }}</span>|<span class="fileTreeFileDel">-{{ fileInfo.file.deletions }}</span>)
        </span>
        <span v-if="isLastViewed" id="cdvLastFileViewed" title="Last File Viewed">
          <IconSvg name="eyeOpen" />
        </span>
      </span>
    </li>
  </template>

  <!-- 子模块 repo 节点 -->
  <template v-else-if="node.type === 'repo'">
    <li :data-pathseg="encodeURIComponent(pathSeg)">
      <span
        class="fileTreeRepo"
        :data-path="encodeURIComponent(repoPath)"
        title="Click to View Repository"
        @click="onRepoClick(repoPath)"
      >
        <span class="fileTreeRepoIcon"><IconSvg name="closedFolder" /></span>
        {{ node.name }}
      </span>
    </li>
  </template>
</template>

<!-- fileTree* class 同时被 CommitDetails 的 List 模式使用，必须全局 -->
<style>
.fileTreeFileIcon, .fileTreeFolderIcon, .fileTreeRepoIcon, .fileTreeFileAction, #cdvLastFileViewed {
	position: relative;
	display: inline-block;
	width: 13px;
	height: 18px;
	vertical-align: top;
}
.fileTreeFileIcon, .fileTreeFolderIcon, .fileTreeRepoIcon {
	margin-right: 8px;
}
#cdvLastFileViewed {
	margin-left: 8px;
	cursor: help;
}
.fileTreeFileAction {
	margin-left: 8px;
	opacity: 0;
}
.fileTreeFileAction.viewGitFileAtRevision, .fileTreeFileAction.openGitFile {
	margin-left: 6px;
}
.fileTreeFileRecord:hover .fileTreeFileAction,
.fileTreeFileRecord.contextMenuActive .fileTreeFileAction,
.fileTreeFileRecord.dialogActive .fileTreeFileAction {
	cursor: pointer;
	opacity: 1;
}
/* IconSvg 渲染的 svg */
svg.openFolderIcon, svg.closedFolderIcon, svg.fileIcon, .fileTreeFileAction svg, #cdvLastFileViewed svg {
	position: absolute;
	top: 2.5px;
	height: 13px !important;
	fill: var(--vscode-editor-foreground);
	fill-opacity: 0.6;
}
.fileTreeFileAction.copyGitFile svg {
	top: 3px;
}
.fileTreeFileAction.viewGitFileAtRevision svg, .fileTreeFileAction.openGitFile svg {
	top: 4px;
}
.fileTreeFolder:hover svg.openFolderIcon, .fileTreeFolder:hover svg.closedFolderIcon,
.fileTreeFileRecord:hover svg.fileIcon, .fileTreeFileRecord.contextMenuActive svg.fileIcon,
.fileTreeFileRecord.dialogActive svg.fileIcon,
.fileTreeFileRecord:hover #cdvLastFileViewed svg, .fileTreeFileRecord.contextMenuActive #cdvLastFileViewed svg,
.fileTreeFileRecord.dialogActive #cdvLastFileViewed svg,
.fileTreeRepo:hover svg, .fileTreeFileAction:hover svg {
	fill-opacity: 0.8;
}
svg.openFolderIcon, svg.closedFolderIcon, svg.fileIcon {
	width: 13px;
}
.fileTreeFolderContents.hidden {
	display: none;
}
.fileTreeFolder, .fileTreeRepo {
	cursor: pointer;
}
.fileTreeFile .gitFileName {
	color: var(--vscode-gitDecoration-modifiedResourceForeground);
}
.fileTreeFile .gitFileName.A, .fileTreeFile .gitFileName.U {
	color: var(--vscode-gitDecoration-addedResourceForeground);
}
.fileTreeFile .gitFileName.D {
	color: var(--vscode-gitDecoration-deletedResourceForeground);
}
.fileTreeFile.gitDiffPossible {
	cursor: pointer;
}
.fileTreeFileAddDel, .fileTreeFileType {
	margin-left: 8px;
}
.fileTreeFileType {
	cursor: help;
}
.fileTreeFileAdd, .fileTreeFileDel {
	padding: 0 3px;
	cursor: help;
}
.fileTreeFileAdd {
	color: var(--vscode-gitDecoration-addedResourceForeground);
}
.fileTreeFileDel {
	color: var(--vscode-gitDecoration-deletedResourceForeground);
}
.fileTreeFolder.pendingReview .gitFolderName, .fileTreeFile.pendingReview .gitFileName {
	font-weight: 700;
}
</style>
