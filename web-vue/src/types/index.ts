/**
 * 全局类型定义和 WebView 环境声明
 *
 * 引用后端 src/types.ts 编译出的类型（out/types.d.ts）
 */
import type * as GG from 'backend-types';
import type { DialogSelectInputOption } from '../lib/dialog';
import type { FindWidgetState } from '../lib/findWidget';
import type { SettingsWidgetState } from '../lib/settingsWidget';

/** VS Code WebView API 类型 */
export interface VsCodeApi {
  getState: <T = unknown>() => T | null;
  postMessage: (message: unknown) => void;
  setState: <T = unknown>(state: T) => T;
}

/** acquireVsCodeApi 由 VS Code 在 WebView 环境注入（声明在 env.d.ts 中） */

/** 全局变量类型（由后端 getHtmlForWebview() 注入到 <script> 标签中） */
export interface WindowGlobals {
  initialState: GG.GitGraphViewInitialState;
  globalState: GG.DeepReadonly<GG.GitGraphViewGlobalState>;
  workspaceState: GG.DeepReadonly<GG.GitGraphViewWorkspaceState>;
  vscodeLanguage: string;
}

/** Avatar 图片集合 */
export type AvatarImageCollection = { [email: string]: string };

/** 展开的提交详情 */
export interface ExpandedCommit {
  index: number;
  commitHash: string;
  commitElem: HTMLElement | null;
  compareWithHash: string | null;
  compareWithElem: HTMLElement | null;
  commitDetails: GG.GitCommitDetails | null;
  fileChanges: ReadonlyArray<GG.GitFileChange> | null;
  fileTree: FileTreeFolder | null;
  avatar: string | null;
  codeReview: GG.CodeReview | null;
  lastViewedFile: string | null;
  loading: boolean;
  scrollTop: {
    summary: number;
    fileView: number;
  };
  contextMenuOpen: {
    summary: boolean;
    fileView: number;
  };
}

/** WebView 状态持久化 */
export interface WebViewState {
  readonly currentRepo: string;
  readonly currentRepoLoading: boolean;
  readonly gitRepos: GG.GitRepoSet;
  readonly gitBranches: ReadonlyArray<string>;
  readonly gitBranchHead: string | null;
  readonly gitConfig: GG.GitRepoConfig | null;
  readonly gitRemotes: ReadonlyArray<string>;
  readonly gitStashes: ReadonlyArray<GG.GitStash>;
  readonly gitTags: ReadonlyArray<string>;
  readonly commits: GG.GitCommit[];
  readonly commitHead: string | null;
  readonly avatars: AvatarImageCollection;
  readonly currentBranches: string[] | null;
  readonly currentAuthors: string[] | null;
  readonly currentTags: string[] | null;
  readonly moreCommitsAvailable: boolean;
  readonly maxCommits: number;
  readonly onlyFollowFirstParent: boolean;
  readonly expandedCommit: ExpandedCommit | null;
  readonly scrollTop: number;
  readonly findWidget: FindWidgetState;
  readonly settingsWidget: SettingsWidgetState;
}

/* Commit Details / Comparison View File Tree Types */

export interface FileTreeFile {
  readonly type: 'file';
  readonly name: string;
  readonly index: number;
  reviewed: boolean;
}

export interface FileTreeRepo {
  readonly type: 'repo';
  readonly name: string;
  readonly path: string;
}

export interface FileTreeFolder {
  readonly type: 'folder';
  readonly name: string;
  readonly folderPath: string;
  readonly contents: FileTreeFolderContents;
  open: boolean;
  reviewed: boolean;
}

export type FileTreeLeaf = FileTreeFile | FileTreeRepo;
export type FileTreeNode = FileTreeFolder | FileTreeLeaf;
export type FileTreeFolderContents = { [name: string]: FileTreeNode };

/** Dialog & ContextMenu TargetType */
export const enum TargetType {
  Commit = 'commit',
  CommitDetailsView = 'cdv',
  Ref = 'ref',
  Repo = 'repo',
}

export interface CommitOrRefTarget {
  type: TargetType.Commit | TargetType.Ref | TargetType.CommitDetailsView;
  elem: HTMLElement;
}

export interface RepoTarget {
  type: TargetType.Repo;
}

export interface CommitTarget extends CommitOrRefTarget {
  hash: string;
}

export interface RefTarget extends CommitTarget {
  ref: string;
}

/* Widget states — re-export from lib/ 模块 */
export type { FindWidgetState, SettingsWidgetState };

/**
 * GitGraphView 控制器接口
 *
 * findWidget/settingsWidget 等组件通过此接口与 view 控制器交互，
 * 避免直接依赖 main.ts（解决循环依赖）。
 */
export interface GitGraphView {
  saveState(): void;
  getCommits(): ReadonlyArray<GG.GitCommit>;
  getCommitId(commitHash: string): number | null;
  /** Commits 列配置 */
  getColumnVisibility(): { date: boolean; author: boolean; commit: boolean };
  isCdvOpen(commitHash: string, file: string | null): boolean;
  loadCommitDetails(commitElem: HTMLElement): void;
  scrollToCommit(commitHash: string, highlight: boolean): void;
  getBranches(): ReadonlyArray<string>;
  getBranchOptions(includeShowAll?: boolean): ReadonlyArray<DialogSelectInputOption>;
  getRepoConfig(): GG.GitRepoConfig | null;
  getRepoState(repo: string): GG.GitRepoState | null;
  isConfigLoading(): boolean;
  refresh(hard: boolean, configChanges?: boolean): void;
  renderRepoDropdownOptions(): void;
  requestLoadConfig(): void;
  saveRepoStateValue(repo: string, key: keyof GG.GitRepoState, value: GG.GitRepoState[keyof GG.GitRepoState]): void;
}

/* Re-export GG types for convenience */
export type {
  GitCommit,
  GitRepoSet,
  GitRepoConfig,
  GitGraphViewConfig,
  GitGraphViewInitialState,
  RequestMessage,
  GitStash,
  GitFileChange,
  GitCommitDetails,
  CodeReview,
  GitSignature,
} from 'backend-types';

/** 读取全局变量 helper */
export function getWindowGlobals(): WindowGlobals {
  return {
    initialState: (window as unknown as Record<string, unknown>).initialState as GG.GitGraphViewInitialState,
    globalState: (window as unknown as Record<string, unknown>).globalState as GG.DeepReadonly<GG.GitGraphViewGlobalState>,
    workspaceState: (window as unknown as Record<string, unknown>).workspaceState as GG.DeepReadonly<GG.GitGraphViewWorkspaceState>,
    vscodeLanguage: (window as unknown as Record<string, unknown>).vscodeLanguage as string,
  };
}

/** Config 类型别名 */
export type Config = GG.GitGraphViewConfig;

/** UNCOMMITTED 常量 */
export const UNCOMMITTED = '*';
