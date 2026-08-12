import { defineStore } from 'pinia';
import { ref, computed, markRaw } from 'vue';
import * as GG from 'backend-types';
import { initI18n, t as translate } from '@/lib/i18n';
import {
  TextFormatter,
  type IssueLinking,
  parseIssueLinkingConfig,
  generateIssueLinkFromMatch,
  isUrlElem,
  isInternalUrlElem,
  isExternalUrlElem,
  CLASS_EXTERNAL_URL,
} from '@/lib/textFormatter';
import { Graph } from '@/lib/graph';
import { Dropdown, type DropdownOption } from '@/lib/dropdown';
import { Dialog, DialogInputType, type DialogInput, type DialogTarget } from '@/lib/dialog';
import {
  ContextMenu,
  type ContextMenuAction,
  type ContextMenuActions,
  type ContextMenuTarget,
} from '@/lib/contextMenu';
import { FindWidget, type FindWidgetState } from '@/lib/findWidget';
import { SettingsWidget, type SettingsWidgetState } from '@/lib/settingsWidget';
import {
  ELLIPSIS,
  CLASS_REF_HEAD,
  CLASS_REF_REMOTE,
  CLASS_REF_TAG,
  CLASS_REF_STASH,
  COLUMN_AUTO,
  COLUMN_HIDDEN,
  COLUMN_MIN_WIDTH,
  COLUMN_LEFT_RIGHT_PADDING,
  CSS_PROP_LIMIT_GRAPH_WIDTH,
  CSS_PROP_FONT_FAMILY,
  CSS_PROP_EDITOR_FONT_FAMILY,
  CSS_PROP_FIND_MATCH_HIGHLIGHT_BACKGROUND,
  CSS_PROP_SELECTION_BACKGROUND,
} from '@/lib/constants';
import {
  SHOW_ALL_BRANCHES,
  getShowRemoteBranches,
  getShowStashes,
  getShowTags,
  getIncludeCommitsMentionedByReflogs,
  getOnlyFollowFirstParent,
  getCommitOrdering,
  getOnRepoLoadShowCheckedOutBranch,
  getOnRepoLoadShowSpecificBranches,
  formatShortDate,
  formatLongDate,
  abbrevCommit,
  escapeHtml,
  unescapeHtml,
  formatCommaSeparatedList,
  findCommitElemWithId,
  getCommitElems,
  handledEvent,
  alterClass,
  arraysEqual,
  arraysStrictlyEqual,
  getBranchLabels,
  getSortedRepositoryPaths,
  ImageResizer,
  EventOverlay,
  modifyColourOpacity,
} from '@/lib/utils';
import {
  generateSignatureHtml,
  alterFileTreeFileReviewed,
  setFileTreeReviewed,
  getFilesInTree,
} from '@/lib/fileView';
import {
  UNCOMMITTED,
  getWindowGlobals,
  type Config,
  type ExpandedCommit,
  type WebViewState,
  type AvatarImageCollection,
  type FileTreeFolder,
  type FileTreeFolderContents,
  type FileTreeFile,
  type GitGraphView,
  type CommitTarget,
  type RefTarget,
  TargetType,
} from '@/types';
import {
  sendMessage,
  showErrorMessage,
  getViewState,
  setViewState,
  updateGlobalViewState,
  getVSCodeStyle,
} from '@/composables/bridge';

/**
 * Git Graph 主 Store — 完整接管应用状态、消息分发、数据加载
 *
 * 这是 Vue3 重构的核心，替代原 mainController.ts 的 GitGraphView class（6300+ 行）。
 * 状态用 ref 管理，渲染由 Vue 组件声明式完成，消息分发在此统一处理。
 */
export const useGitGraphStore = defineStore('gitGraph', () => {
  /* ================================================================
   * 配置（来自后端注入的 initialState）
   * ================================================================ */
  const { initialState, vscodeLanguage } = getWindowGlobals();
  const globalState = getWindowGlobals().globalState;
  const config = ref<Config>(initialState.config);

  /* ================================================================
   * 仓库状态
   * ================================================================ */
  const gitRepos = ref<GG.GitRepoSet>(initialState.repos);
  const currentRepo = ref<string>('');
  const currentRepoLoading = ref(true);

  /* ---- 刷新状态机 ---- */
  const refreshState = ref({
    inProgress: false,
    hard: true,
    loadRepoInfoRefreshId: initialState.loadRepoInfoRefreshId,
    loadCommitsRefreshId: initialState.loadCommitsRefreshId,
    repoInfoChanges: false,
    configChanges: false,
    requestingRepoInfo: false,
    requestingConfig: false,
  });

  /** 延迟加载视图的目标（如从 Code Review 跳转到特定 commit） */
  let loadViewTo: GG.LoadGitGraphViewTo = initialState.loadViewTo;

  /* ================================================================
   * Git 数据
   * ================================================================ */
  const gitBranches = ref<ReadonlyArray<string>>([]);
  const gitBranchHead = ref<string | null>(null);
  const gitConfig = ref<GG.GitRepoConfig | null>(null);
  const gitRemotes = ref<ReadonlyArray<string>>([]);
  const gitStashes = ref<ReadonlyArray<GG.GitStash>>([]);
  const gitTags = ref<ReadonlyArray<string>>([]);

  /* ================================================================
   * 提交数据
   * ================================================================ */
  const commits = ref<GG.GitCommit[]>([]);
  const commitHead = ref<string | null>(null);
  const commitLookup = ref<{ [hash: string]: number }>({});
  const moreCommitsAvailable = ref(false);
  const maxCommits = ref(config.value.initialLoadCommits);
  const onlyFollowFirstParent = ref(false);
  const renderedGitBranchHead = ref<string | null>(null);

  /* ================================================================
   * 过滤器
   * ================================================================ */
  const currentBranches = ref<string[] | null>(null);
  const currentAuthors = ref<string[] | null>(null);
  const currentTags = ref<string[] | null>(null);

  /* ================================================================
   * 头像
   * ================================================================ */
  const avatars = ref<AvatarImageCollection>({});

  /* ================================================================
   * 展开的 commit details / comparison
   * ================================================================ */
  const expandedCommit = ref<ExpandedCommit | null>(null);

  /* ================================================================
   * 滚动 & UI 状态
   * ================================================================ */
  const scrollTop = ref(0);
  const showRemoteBranches = ref(false);

  /* ================================================================
   * 引擎实例（markRaw 避免 Vue 响应式包裹）
   * ================================================================ */
  /** Graph SVG 引擎 */
  const graph = ref<Graph | null>(null);
  /** Dropdown 实例 */
  const repoDropdown = ref<Dropdown | null>(null);
  const branchDropdown = ref<Dropdown | null>(null);
  const authorDropdown = ref<Dropdown | null>(null);
  const tagDropdown = ref<Dropdown | null>(null);
  /** 其他 widget 实例 */
  const contextMenu = ref<ContextMenu | null>(null);
  const dialog = ref<Dialog | null>(null);
  const findWidget = ref<FindWidget | null>(null);
  const settingsWidget = ref<SettingsWidget | null>(null);
  const eventOverlay = ref<EventOverlay | null>(null);
  const imageResizer = ref<ImageResizer | null>(null);

  /** #view 元素引用 */
  let viewElem: HTMLElement | null = null;
  /** commit 表格元素引用 */
  let tableElem: HTMLElement | null = null;
  /** 表头列容器元素引用 */
  let tableColHeadersElem: HTMLElement | null = null;

  /* ---- 列宽拖拽状态（makeTableResizable / startColumnResize / processResizingColumn / stopResizingColumn 共享） ---- */
  /** 当前各列宽度配置（COLUMN_AUTO / COLUMN_HIDDEN 或像素值） */
  let columnWidths: GG.ColumnWidth[] = [];
  /** 正在拖拽的列号（-1 = 未拖拽） */
  let resizeCol = -1;
  /** 正在拖拽的列在 HTMLCollection 中的索引 */
  let resizeColIndex = -1;
  /** 拖拽起始鼠标 X 坐标 */
  let resizeMouseX = -1;
  /** 表头列 DOM 元素集合（由 makeTableResizable 初始化） */
  let resizeCols: HTMLCollectionOf<HTMLElement> | null = null;

  /* ================================================================
   * 计算属性
   * ================================================================ */
  const numCommits = computed(() => commits.value.length);
  const hasRepo = computed(() => Object.keys(gitRepos.value).length > 0);
  const currentRepoData = computed(() =>
    currentRepo.value ? gitRepos.value[currentRepo.value] : null,
  );
  const isRefreshing = computed(() => refreshState.value.inProgress);

  /** commit 表格行数据（预计算格式化后的值，供 CommitTable.vue v-for 使用） */
  const commitRows = computed(() => {
    if (commits.value.length === 0) return [];

    const currentHash =
      commits.value.length > 0 && commits.value[0].hash === UNCOMMITTED ?
        UNCOMMITTED
      : commitHead.value;

    const vertexColours = graph.value?.getVertexColours() ?? [];
    const mutedCommits = graph.value?.getMutedCommits(currentHash) ?? [];

    const textFormatter = new TextFormatter(
      commits.value,
      currentRepoData.value?.issueLinkingConfig ?? null,
      { emoji: true, issueLinking: true, markdown: config.value.markdown },
    );

    const rows: CommitRowData[] = [];
    for (let i = 0; i < commits.value.length; i++) {
      const commit = commits.value[i];
      const subject = commit.message.split(/\r?\n/)[0];
      let body = '';

      if (config.value.showBodyInline) {
        const lines = commit.message.split(/\r?\n/);
        if (lines.length > 1) {
          lines.shift();
          body = lines.join(' ').replace(/\s+/g, ' ').trim();
        }
      }

      const date = formatShortDate(commit.date, config.value.dateFormat);
      const branchLabels = getBranchLabels(
        commit.heads,
        commit.remotes,
        config.value.referenceLabels.combineLocalAndRemoteBranchLabels,
      );

      /* 分支标签 */
      const refBranches: RefLabel[] = [];
      let branchCheckedOutAtCommit: string | null = null;

      for (const head of branchLabels.heads) {
        const isActive = head.name === gitBranchHead.value;
        if (isActive) branchCheckedOutAtCommit = gitBranchHead.value;
        refBranches.push({
          type: 'head',
          name: head.name,
          isActive,
          remotes: head.remotes,
        });
      }
      for (const remote of branchLabels.remotes) {
        refBranches.push({
          type: 'remote',
          name: remote.name,
          remote: remote.remote,
        });
      }

      /* Tag 标签 */
      const refTags: RefLabel[] = [];
      const tagMap: {
        [name: string]: { name: string; remotes: string[]; annotated: boolean; local: boolean };
      } = {};
      for (const tag of commit.tags) {
        const parts = tag.name.split('/');
        const tName = parts.length > 1 ? parts.slice(1).join('/') : parts[0];
        const tRemote = parts.length > 1 ? parts[0] : null;
        if (!tagMap[tName]) {
          tagMap[tName] = { name: tName, remotes: [], annotated: tag.annotated, local: false };
        }
        if (tRemote) tagMap[tName].remotes.push(tRemote);
        else tagMap[tName].local = true;
      }
      for (const tName in tagMap) {
        const tag = tagMap[tName];
        refTags.push({
          type: 'tag',
          name: tag.name,
          remotes: tag.remotes,
          annotated: tag.annotated,
        });
      }

      /* Stash 标签 */
      if (commit.stash) {
        refBranches.unshift({ type: 'stash', name: commit.stash.selector });
      }

      rows.push({
        index: i,
        hash: commit.hash,
        shortHash: abbrevCommit(commit.hash),
        subject: textFormatter.format(subject),
        body: body ? textFormatter.format(body) : '',
        date: date.formatted,
        dateTitle: date.title,
        author: commit.author,
        email: commit.email,
        avatar: avatars.value[commit.email] ?? null,
        isCurrent: commit.hash === currentHash,
        isHead: commit.hash === commitHead.value,
        isMuted: mutedCommits[i],
        colour: vertexColours[i],
        branchCheckedOutAtCommit,
        refBranches,
        refTags,
        isUncommitted: commit.hash === UNCOMMITTED,
      });
    }
    return rows;
  });

  /* ================================================================
   * i18n 桥接
   * ================================================================ */
  function t(key: string, ...args: (string | number)[]): string {
    return translate(key, ...args);
  }

  /* ================================================================
   * Getters（供外部查询，替代原 GitGraphView 的 public getter）
   * ================================================================ */
  function getCommitId(hash: string): number | null {
    return typeof commitLookup.value[hash] === 'number' ? commitLookup.value[hash] : null;
  }

  function getBranchOptions(includeShowAll?: boolean): DropdownOption[] {
    const options: DropdownOption[] = [];
    if (includeShowAll) options.push({ name: t('showAllBranches'), value: SHOW_ALL_BRANCHES });
    options.push({ name: 'HEAD', value: 'HEAD' });
    for (const pattern of config.value.customBranchGlobPatterns) {
      options.push({ name: t('globPattern', pattern.name), value: pattern.glob });
    }
    for (const branch of gitBranches.value) {
      options.push({
        name: branch.startsWith('remotes/') ? branch.substring(8) : branch,
        value: branch,
      });
    }
    return options;
  }

  function getAuthorOptions(): DropdownOption[] {
    const options: DropdownOption[] = [{ name: t('all'), value: SHOW_ALL_BRANCHES }];
    if (gitConfig.value?.authors) {
      for (const author of gitConfig.value.authors) {
        options.push({ name: author.name, value: author.name });
      }
    }
    return options;
  }

  function getTagOptions(): DropdownOption[] {
    const options: DropdownOption[] = [{ name: t('all'), value: SHOW_ALL_BRANCHES }];
    for (const tag of gitTags.value) {
      options.push({ name: tag, value: tag });
    }
    return options;
  }

  function getColumnVisibility() {
    const colWidths = currentRepoData.value?.columnWidths ?? null;
    if (colWidths !== null) {
      return {
        date: colWidths[1] !== 0 /* COLUMN_HIDDEN */,
        author: colWidths[2] !== 0,
        commit: colWidths[3] !== 0,
      };
    }
    return {
      date: config.value.defaultColumnVisibility.date,
      author: config.value.defaultColumnVisibility.author,
      commit: config.value.defaultColumnVisibility.commit,
    };
  }

  function getRepoState(repo: string): GG.GitRepoState | null {
    return gitRepos.value[repo] ?? null;
  }

  /* ================================================================
   * 数据加载逻辑（翻译自 mainController 的 loadRepos/loadRepo/...）
   * ================================================================ */

  function loadRepos(
    repos: GG.GitRepoSet,
    lastActiveRepo: string | null,
    _loadViewTo: GG.LoadGitGraphViewTo,
  ) {
    gitRepos.value = repos;
    saveState();

    let newRepo: string;
    if (_loadViewTo && currentRepo.value !== _loadViewTo.repo && repos[_loadViewTo.repo]) {
      newRepo = _loadViewTo.repo;
    } else if (!repos[currentRepo.value]) {
      newRepo =
        lastActiveRepo && repos[lastActiveRepo] ?
          lastActiveRepo
        : getSortedRepositoryPaths(repos, config.value.repoDropdownOrder)[0];
    } else {
      newRepo = currentRepo.value;
    }

    if (_loadViewTo) {
      if (_loadViewTo.repo === newRepo) {
        loadViewTo = _loadViewTo;
      } else {
        loadViewTo = null;
        showErrorMessage(t('unableLoadRepoView', _loadViewTo.repo));
      }
    } else {
      loadViewTo = null;
    }

    if (currentRepo.value !== newRepo) {
      loadRepo(newRepo);
      return true;
    } else {
      finaliseRepoLoad(false);
      return false;
    }
  }

  function loadRepo(repo: string) {
    currentRepo.value = repo;
    currentRepoLoading.value = true;
    showRemoteBranches.value = getShowRemoteBranches(gitRepos.value[repo].showRemoteBranchesV2);
    maxCommits.value = config.value.initialLoadCommits;
    gitConfig.value = null;
    gitRemotes.value = [];
    gitStashes.value = [];
    gitTags.value = [];
    currentBranches.value = null;
    currentAuthors.value = null;
    currentTags.value = null;
    closeCommitDetails(false);
    saveState();
    refresh(true);
  }

  function loadRepoInfo(
    branchOptions: ReadonlyArray<string>,
    branchHead: string | null,
    remotes: ReadonlyArray<string>,
    stashes: ReadonlyArray<GG.GitStash>,
    isRepo: boolean,
  ) {
    gitStashes.value = stashes;

    if (
      !isRepo ||
      (!refreshState.value.hard &&
        arraysStrictlyEqual(gitBranches.value, branchOptions) &&
        gitBranchHead.value === branchHead &&
        arraysStrictlyEqual(gitRemotes.value, remotes))
    ) {
      saveState();
      finaliseLoadRepoInfo(false, isRepo);
      return;
    }

    gitBranches.value = branchOptions;
    gitBranchHead.value = branchHead;
    gitRemotes.value = remotes;

    /* 配置 currentBranches */
    const filterCurrentBranches = () => {
      if (
        currentBranches.value &&
        !(currentBranches.value.length === 1 && currentBranches.value[0] === SHOW_ALL_BRANCHES)
      ) {
        const globPatterns = config.value.customBranchGlobPatterns.map((p) => p.glob);
        currentBranches.value = currentBranches.value.filter(
          (b) => gitBranches.value.includes(b) || globPatterns.includes(b) || b === 'HEAD',
        );
      }
    };

    filterCurrentBranches();
    if (!currentBranches.value || currentBranches.value.length === 0) {
      const showCheckedOut = getOnRepoLoadShowCheckedOutBranch(
        gitRepos.value[currentRepo.value].onRepoLoadShowCheckedOutBranch,
        config.value.onRepoLoad.showCheckedOutBranch,
      );
      const showSpecific = getOnRepoLoadShowSpecificBranches(
        gitRepos.value[currentRepo.value].onRepoLoadShowSpecificBranches,
        config.value.onRepoLoad.showSpecificBranches,
      );
      currentBranches.value = [];
      if (showSpecific.length > 0) {
        const globPatterns = config.value.customBranchGlobPatterns.map((p) => p.glob);
        currentBranches.value.push(
          ...showSpecific.filter((b) => gitBranches.value.includes(b) || globPatterns.includes(b)),
        );
      }
      if (
        showCheckedOut &&
        gitBranchHead.value &&
        !currentBranches.value.includes(gitBranchHead.value)
      ) {
        currentBranches.value.push(gitBranchHead.value);
      }
      if (currentBranches.value.length === 0) {
        currentBranches.value.push(SHOW_ALL_BRANCHES);
      }
    }
    filterCurrentBranches();

    if (!currentAuthors.value || currentAuthors.value.length === 0)
      currentAuthors.value = [SHOW_ALL_BRANCHES];
    if (!currentTags.value || currentTags.value.length === 0)
      currentTags.value = [SHOW_ALL_BRANCHES];

    /* 更新 Dropdown */
    branchDropdown.value?.setOptions(getBranchOptions(true), currentBranches.value);
    authorDropdown.value?.setOptions(getAuthorOptions(), currentAuthors.value);
    tagDropdown.value?.setOptions(getTagOptions(), currentTags.value);

    saveState();
    finaliseLoadRepoInfo(true, isRepo);
  }

  function finaliseLoadRepoInfo(repoInfoChanges: boolean, isRepo: boolean) {
    const rs = refreshState.value;
    if (!rs.inProgress) return;

    if (isRepo) {
      rs.repoInfoChanges = rs.repoInfoChanges || repoInfoChanges;
      rs.requestingRepoInfo = false;
      requestLoadCommits();
    } else {
      dialog.value?.closeActionRunning();
      rs.inProgress = false;
      loadViewTo = null;
      sendMessage({ command: 'loadRepos', check: true } as GG.RequestMessage);
    }
  }

  function loadCommits(
    newCommits: GG.GitCommit[],
    head: string | null,
    tags: ReadonlyArray<string>,
    moreAvailable: boolean,
    onlyFF: boolean,
  ) {
    const tagsChanged = !arraysStrictlyEqual(gitTags.value, tags);
    gitTags.value = tags;

    if (tagsChanged) {
      if (
        currentTags.value &&
        !(currentTags.value.length === 1 && currentTags.value[0] === SHOW_ALL_BRANCHES)
      ) {
        currentTags.value = currentTags.value.filter((tag) => gitTags.value.includes(tag));
      }
      if (!currentTags.value || currentTags.value.length === 0)
        currentTags.value = [SHOW_ALL_BRANCHES];
      tagDropdown.value?.setOptions(getTagOptions(), currentTags.value);
    }

    /* 无变化的快速路径 */
    if (
      !currentRepoLoading.value &&
      !refreshState.value.hard &&
      moreCommitsAvailable.value === moreAvailable &&
      onlyFollowFirstParent.value === onlyFF &&
      commitHead.value === head &&
      newCommits.length > 0 &&
      arraysEqual(
        commits.value,
        newCommits,
        (a, b) =>
          a.hash === b.hash &&
          arraysStrictlyEqual(a.heads, b.heads) &&
          arraysEqual(a.tags, b.tags, (a, b) => a.name === b.name && a.annotated === b.annotated) &&
          arraysEqual(a.remotes, b.remotes, (a, b) => a.name === b.name && a.remote === b.remote) &&
          arraysStrictlyEqual(a.parents, b.parents) &&
          !!(
            (a.stash === null && b.stash === null) ||
            (a.stash && b.stash && a.stash.selector === b.stash.selector)
          ),
      ) &&
      renderedGitBranchHead.value === gitBranchHead.value
    ) {
      if (commits.value[0].hash === UNCOMMITTED) {
        commits.value[0] = newCommits[0];
        saveState();
      } else if (tagsChanged) {
        saveState();
      }
      finaliseLoadCommits();
      return;
    }

    const wasLoading = currentRepoLoading.value;
    currentRepoLoading.value = false;
    moreCommitsAvailable.value = moreAvailable;
    onlyFollowFirstParent.value = onlyFF;
    commits.value = newCommits;
    commitHead.value = head;

    /* 重建 commitLookup */
    const lookup: { [hash: string]: number } = {};
    const avatarsNeeded: { [email: string]: string[] } = {};
    let expandedVisible = false;
    let expandedCompareVisible = false;

    for (let i = 0; i < newCommits.length; i++) {
      const c = newCommits[i];
      lookup[c.hash] = i;
      if (expandedCommit.value) {
        if (expandedCommit.value.commitHash === c.hash) expandedVisible = true;
        else if (expandedCommit.value.compareWithHash === c.hash) expandedCompareVisible = true;
      }
      if (
        config.value.fetchAvatars &&
        typeof avatars.value[c.email] !== 'string' &&
        c.email !== ''
      ) {
        if (!avatarsNeeded[c.email]) avatarsNeeded[c.email] = [c.hash];
        else avatarsNeeded[c.email].push(c.hash);
      }
    }
    commitLookup.value = lookup;

    if (
      expandedCommit.value &&
      (!expandedVisible ||
        (expandedCommit.value.compareWithHash !== null && !expandedCompareVisible))
    ) {
      closeCommitDetails(false);
    }

    saveState();

    /* 加载 commits 到 Graph 引擎 */
    graph.value?.loadCommits(
      commits.value,
      commitHead.value,
      commitLookup.value,
      onlyFollowFirstParent.value,
    );
    renderedGitBranchHead.value = gitBranchHead.value;

    /* Graph SVG 渲染由 CommitGraph.vue 的 watch 自动触发 */

    if (wasLoading && config.value.onRepoLoad.scrollToHead && commitHead.value) {
      scrollToCommit(commitHead.value, true, false);
    }

    finaliseLoadCommits();
    requestAvatars(avatarsNeeded);
  }

  function finaliseLoadCommits() {
    const rs = refreshState.value;
    if (rs.inProgress) {
      dialog.value?.closeActionRunning();
      rs.inProgress = false;
    }
    /** 动态设置 Graph SVG 的 Y 偏移，跳过表头高度 */
    const headerElem = document.getElementById('tableColHeaders');
    if (headerElem) {
      config.value.graph.grid.offsetY = headerElem.offsetHeight + config.value.graph.grid.y / 2;
    }
    finaliseRepoLoad(true);
  }

  function finaliseRepoLoad(didLoadRepoData: boolean) {
    if (loadViewTo && currentRepo.value === loadViewTo.repo) {
      if (loadViewTo.findCommitHash) {
        const idx = getCommitId(loadViewTo.findCommitHash);
        if (idx !== null) {
          scrollToCommit(loadViewTo.findCommitHash, true, true);
          /* Commit details 打开逻辑后续在 CommitTable 事件中处理 */
        } else if (moreCommitsAvailable.value) {
          loadMoreCommits();
          return;
        } else {
          showErrorMessage(t('noCommitsFound'));
        }
        loadViewTo = null;
      } else if (loadViewTo.runCommandOnLoad) {
        if (loadViewTo.runCommandOnLoad === 'fetch') {
          fetchFromRemotes();
        }
        loadViewTo = null;
      } else {
        loadViewTo = null;
      }
    }

    if (gitConfig.value === null || (didLoadRepoData && refreshState.value.configChanges)) {
      requestLoadConfig();
    }
  }

  function clearCommits() {
    closeDialogAndContextMenu();
    moreCommitsAvailable.value = false;
    commits.value = [];
    commitHead.value = null;
    commitLookup.value = {};
    renderedGitBranchHead.value = null;
    closeCommitDetails(false);
    saveState();
    graph.value?.loadCommits(
      commits.value,
      commitHead.value,
      commitLookup.value,
      onlyFollowFirstParent.value,
    );
  }

  /* ================================================================
   * 响应处理（后端消息 → store）
   * ================================================================ */

  function processLoadRepoInfoResponse(msg: GG.ResponseLoadRepoInfo) {
    if (msg.error === null) {
      const rs = refreshState.value;
      if (rs.inProgress && rs.loadRepoInfoRefreshId === msg.refreshId) {
        loadRepoInfo(msg.branches, msg.head, msg.remotes, msg.stashes, msg.isRepo);
      }
    } else {
      displayLoadDataError(t('unableLoadRepoInfo'), msg.error);
    }
  }

  function processLoadCommitsResponse(msg: GG.ResponseLoadCommits) {
    if (msg.error === null) {
      const rs = refreshState.value;
      if (rs.inProgress && rs.loadCommitsRefreshId === msg.refreshId) {
        loadCommits(
          msg.commits,
          msg.head,
          msg.tags,
          msg.moreCommitsAvailable,
          msg.onlyFollowFirstParent,
        );
      }
    } else {
      const error =
        gitBranches.value.length === 0 && msg.error.indexOf("bad revision 'HEAD'") > -1 ?
          t('noCommitsInRepo')
        : msg.error;
      displayLoadDataError(t('unableLoadCommits'), error);
    }
  }

  function processLoadConfig(msg: GG.ResponseLoadConfig) {
    refreshState.value.requestingConfig = false;
    if (msg.config !== null && currentRepo.value === msg.repo) {
      gitConfig.value = msg.config;
      saveState();
    }
    settingsWidget.value?.refresh();
    authorDropdown.value?.setOptions(getAuthorOptions(), currentAuthors.value);
  }

  function displayLoadDataError(message: string, reason: string) {
    clearCommits();
    refreshState.value.inProgress = false;
    loadViewTo = null;
    dialog.value?.showError(message, reason, t('retry'), () => refresh(true));
  }

  function loadAvatar(email: string, image: string) {
    avatars.value[email] = image;
    saveState();
  }

  /* ================================================================
   * 刷新 & 请求
   * ================================================================ */

  function refresh(hard: boolean, configChanges = false) {
    if (hard) clearCommits();
    requestLoadRepoInfoAndCommits(hard, false, configChanges);
  }

  function requestLoadRepoInfo() {
    const repoState = gitRepos.value[currentRepo.value];
    sendMessage({
      command: 'loadRepoInfo',
      repo: currentRepo.value,
      refreshId: ++refreshState.value.loadRepoInfoRefreshId,
      showRemoteBranches: getShowRemoteBranches(repoState.showRemoteBranchesV2),
      showStashes: getShowStashes(repoState.showStashes, config.value.showStashes),
      hideRemotes: repoState.hideRemotes,
    } as GG.RequestMessage);
  }

  function requestLoadCommits() {
    const repoState = gitRepos.value[currentRepo.value];
    const branches =
      (
        !currentBranches.value ||
        (currentBranches.value.length === 1 && currentBranches.value[0] === SHOW_ALL_BRANCHES)
      ) ?
        null
      : currentBranches.value;
    const authors =
      (
        !currentAuthors.value ||
        (currentAuthors.value.length === 1 && currentAuthors.value[0] === SHOW_ALL_BRANCHES)
      ) ?
        null
      : currentAuthors.value;
    const tags =
      (
        !currentTags.value ||
        (currentTags.value.length === 1 && currentTags.value[0] === SHOW_ALL_BRANCHES)
      ) ?
        null
      : currentTags.value;

    sendMessage({
      command: 'loadCommits',
      repo: currentRepo.value,
      refreshId: ++refreshState.value.loadCommitsRefreshId,
      branches,
      authors,
      tags,
      maxCommits: maxCommits.value,
      showTags: getShowTags(repoState.showTags, config.value.showTags),
      showRemoteBranches: getShowRemoteBranches(repoState.showRemoteBranchesV2),
      includeCommitsMentionedByReflogs: getIncludeCommitsMentionedByReflogs(
        repoState.includeCommitsMentionedByReflogs,
        config.value.includeCommitsMentionedByReflogs,
      ),
      onlyFollowFirstParent: getOnlyFollowFirstParent(
        repoState.onlyFollowFirstParent,
        config.value.onlyFollowFirstParent,
      ),
      commitOrdering: getCommitOrdering(repoState.commitOrdering),
      remotes: gitRemotes.value,
      hideRemotes: repoState.hideRemotes,
      stashes: gitStashes.value,
    } as GG.RequestMessage);
  }

  function requestLoadRepoInfoAndCommits(
    hard: boolean,
    skipRepoInfo: boolean,
    configChanges = false,
  ) {
    const rs = refreshState.value;
    if (rs.inProgress) {
      rs.hard = rs.hard || hard;
      rs.configChanges = rs.configChanges || configChanges;
      if (!skipRepoInfo) rs.loadCommitsRefreshId++;
    } else {
      rs.hard = hard;
      rs.inProgress = true;
      rs.repoInfoChanges = false;
      rs.configChanges = configChanges;
      rs.requestingRepoInfo = false;
    }

    if (skipRepoInfo) {
      if (!rs.requestingRepoInfo) requestLoadCommits();
    } else {
      rs.requestingRepoInfo = true;
      requestLoadRepoInfo();
    }
  }

  function requestLoadConfig() {
    refreshState.value.requestingConfig = true;
    sendMessage({
      command: 'loadConfig',
      repo: currentRepo.value,
      remotes: gitRemotes.value,
    } as GG.RequestMessage);
    settingsWidget.value?.refresh();
  }

  function requestCommitDetails(hash: string, refreshFlag: boolean) {
    const commit = commits.value[commitLookup.value[hash]];
    sendMessage({
      command: 'commitDetails',
      repo: currentRepo.value,
      commitHash: hash,
      hasParents: commit.parents.length > 0,
      stash: commit.stash,
      avatarEmail: config.value.fetchAvatars && hash !== UNCOMMITTED ? commit.email : null,
      refresh: refreshFlag,
    } as GG.RequestMessage);
  }

  function requestCommitComparison(hash: string, compareWithHash: string, refreshFlag: boolean) {
    const order = getCommitOrder(hash, compareWithHash);
    sendMessage({
      command: 'compareCommits',
      repo: currentRepo.value,
      commitHash: hash,
      compareWithHash,
      fromHash: order.from,
      toHash: order.to,
      refresh: refreshFlag,
    } as GG.RequestMessage);
  }

  function requestAvatars(needed: { [email: string]: string[] }) {
    const emails = Object.keys(needed);
    const remote =
      gitRemotes.value.length > 0 ?
        gitRemotes.value.includes('origin') ?
          'origin'
        : gitRemotes.value[0]
      : null;
    for (const email of emails) {
      sendMessage({
        command: 'fetchAvatar',
        repo: currentRepo.value,
        remote,
        email,
        commits: needed[email],
      } as GG.RequestMessage);
    }
  }

  function getCommitOrder(hash: string, compareWithHash: string) {
    const h1 = getCommitId(hash);
    const h2 = getCommitId(compareWithHash);
    if (h1 !== null && h2 !== null && h1 < h2) {
      return { from: hash, to: compareWithHash };
    }
    return { from: compareWithHash, to: hash };
  }

  /* ================================================================
   * Git 操作
   * ================================================================ */

  function fetchFromRemotes() {
    sendMessage({
      command: 'fetch',
      repo: currentRepo.value,
      prune: config.value.fetchAndPrune,
      pruneTags: config.value.fetchAndPruneTags,
    } as GG.RequestMessage);
    dialog.value?.showActionRunning(t('fetchingFromRemotes'));
  }

  function loadMoreCommits() {
    maxCommits.value += config.value.loadMoreCommits;
    saveState();
    requestLoadRepoInfoAndCommits(false, true);
  }

  function scrollToCommit(hash: string, alwaysCenter: boolean, flash: boolean) {
    /* 由 CommitTable.vue 处理实际 DOM 滚动 */
    pendingScrollTo.value = { hash, alwaysCenter, flash };
  }

  let pendingScrollTo = ref<{ hash: string; alwaysCenter: boolean; flash: boolean } | null>(null);

  /* ================================================================
   * Commit Details 展开/关闭
   * ================================================================ */

  /** 通过 hash 查找对应的 commit 行 DOM 元素（.commit[data-hash]） */

  function loadCommitDetails(index: number, hash: string) {
    closeCommitDetails(false);
    expandedCommit.value = {
      index,
      commitHash: hash,
      commitElem: null,
      compareWithHash: null,
      compareWithElem: null,
      commitDetails: null,
      fileChanges: null,
      fileTree: null,
      avatar: null,
      codeReview: null,
      lastViewedFile: null,
      loading: true,
      scrollTop: { summary: 0, fileView: 0 },
      contextMenuOpen: { summary: false, fileView: -1 },
    };
    saveState();
    requestCommitDetails(hash, false);
  }

  function loadCommitComparison(
    index: number,
    hash: string,
    _compareIndex: number,
    compareHash: string,
  ) {
    if (expandedCommit.value) {
      if (expandedCommit.value.commitHash !== hash) closeCommitDetails(false);
      else if (expandedCommit.value.compareWithHash !== compareHash) closeCommitComparison(false);
    }

    expandedCommit.value = {
      index,
      commitHash: hash,
      commitElem: null,
      compareWithHash: compareHash,
      compareWithElem: null,
      commitDetails: null,
      fileChanges: null,
      fileTree: null,
      avatar: null,
      codeReview: null,
      lastViewedFile: null,
      loading: true,
      scrollTop: { summary: 0, fileView: 0 },
      contextMenuOpen: { summary: false, fileView: -1 },
    };
    saveState();
    requestCommitComparison(hash, compareHash, false);
  }

  function closeCommitDetails(saveAndRender: boolean) {
    const ec = expandedCommit.value;
    if (ec === null) return;

    closeCdvContextMenuIfOpen(ec);
    expandedCommit.value = null;
    if (saveAndRender) {
      saveState();
      graph.value?.render(null);
    }
  }

  function closeCommitComparison(saveAndRequestCommitDetails: boolean) {
    if (expandedCommit.value) {
      expandedCommit.value.compareWithHash = null;
      expandedCommit.value.compareWithElem = null;
    }
    if (saveAndRequestCommitDetails && expandedCommit.value) {
      requestCommitDetails(expandedCommit.value.commitHash, false);
    }
  }

  function showCommitDetails(
    details: GG.GitCommitDetails,
    fileTree: FileTreeFolder | null,
    avatar: string | null,
    codeReview: GG.CodeReview | null,
    lastViewedFile: string | null,
    _refresh: boolean,
  ) {
    if (
      !expandedCommit.value ||
      expandedCommit.value.commitHash !== details.hash ||
      expandedCommit.value.compareWithHash !== null
    )
      return;
    expandedCommit.value.commitDetails = details;
    expandedCommit.value.fileChanges = details.fileChanges;
    expandedCommit.value.fileTree = fileTree;
    expandedCommit.value.avatar = avatar;
    expandedCommit.value.codeReview = codeReview;
    expandedCommit.value.lastViewedFile = lastViewedFile;
    expandedCommit.value.loading = false;
    saveState();
  }

  function showCommitComparison(
    hash: string,
    compareWithHash: string,
    fileChanges: ReadonlyArray<GG.GitFileChange>,
    fileTree: FileTreeFolder | null,
    codeReview: GG.CodeReview | null,
    lastViewedFile: string | null,
    _refresh: boolean,
  ) {
    if (
      !expandedCommit.value ||
      expandedCommit.value.commitHash !== hash ||
      expandedCommit.value.compareWithHash !== compareWithHash
    )
      return;
    expandedCommit.value.fileChanges = fileChanges;
    expandedCommit.value.fileTree = fileTree;
    expandedCommit.value.codeReview = codeReview;
    expandedCommit.value.lastViewedFile = lastViewedFile;
    expandedCommit.value.loading = false;
    saveState();
  }

  /* ================================================================
   * Commit Details View (CDV) 渲染与交互
   * ================================================================ */

  function getNumColumns() {
    const colVisibility = getColumnVisibility();
    return (
      2 +
      (colVisibility.date ? 1 : 0) +
      (colVisibility.author ? 1 : 0) +
      (colVisibility.commit ? 1 : 0)
    );
  }

  const isCdvDocked = computed(
    () => config.value.commitDetailsView.location === GG.CommitDetailsViewLocation.DockedToBottom,
  );

  /** CDV 高度（px），由 repoState.cdvHeight 控制 */
  const cdvHeightPx = computed(() => {
    const rs = gitRepos.value[currentRepo.value];
    if (!rs) return '300px';
    let height = rs.cdvHeight;
    const windowHeight = window.innerHeight;
    if (height > windowHeight - 40) {
      height = Math.max(windowHeight - 40, 100);
    }
    return height + 'px';
  });

  function isCdvOpen(commitHash: string, compareWithHash: string | null) {
    return (
      expandedCommit.value !== null &&
      expandedCommit.value.commitHash === commitHash &&
      expandedCommit.value.compareWithHash === compareWithHash
    );
  }

  /** CDV 高度拖拽 — 由 CommitDetails.vue 的 @mousedown 触发 */
  function startCdvHeightResize(e: MouseEvent) {
    const startY = e.pageY;
    const docked = isCdvDocked.value;
    const windowHeight = window.innerHeight;
    const repoState = gitRepos.value[currentRepo.value];

    const processResizingCdvHeight: EventListener = (ev) => {
      const mouseEvent = ev as MouseEvent;
      const delta = mouseEvent.pageY - startY;
      let height = repoState.cdvHeight + (docked ? -delta : delta);
      if (height < 100) height = 100;
      else if (height > 600) height = 600;
      if (height > windowHeight - 40) height = Math.max(windowHeight - 40, 100);

      if (repoState.cdvHeight !== height) {
        repoState.cdvHeight = height;
        if (!docked) graph.value?.render(expandedCommit.value);
      }
    };
    const stopResizingCdvHeight: EventListener = (ev) => {
      processResizingCdvHeight(ev);
      saveRepoState();
      eventOverlay.value?.remove();
    };

    eventOverlay.value?.create('rowResize', processResizingCdvHeight, stopResizingCdvHeight);
  }

  /** CDV 分隔条拖拽 — 由 CommitDetails.vue 的 @mousedown 触发 */
  function startCdvDividerDrag(_e: MouseEvent) {
    const contentElem = document.getElementById('cdvContent');
    if (contentElem === null) return;

    const bounds = contentElem.getBoundingClientRect();
    const minX = bounds.left;
    const width = bounds.width;
    const repoState = gitRepos.value[currentRepo.value];

    const processDraggingCdvDivider: EventListener = (ev) => {
      let percent = ((ev as MouseEvent).clientX - minX) / width;
      if (percent < 0.2) percent = 0.2;
      else if (percent > 0.8) percent = 0.8;
      if (repoState.cdvDivider !== percent) {
        repoState.cdvDivider = percent;
      }
    };
    const stopDraggingCdvDivider: EventListener = (ev) => {
      processDraggingCdvDivider(ev);
      saveRepoState();
      eventOverlay.value?.remove();
    };

    eventOverlay.value?.create('colResize', processDraggingCdvDivider, stopDraggingCdvDivider);
  }

  /**
   * 更新 CDV 中某个文件的状态（reviewed / lastViewed）
   * 纯数据操作，不再操作 DOM。Vue 组件通过响应式数据自动更新 UI。
   */
  function cdvUpdateFileState(
    file: GG.GitFileChange,
    isReviewed: boolean | null,
    fileWasViewed: boolean,
  ) {
    const ec = expandedCommit.value;
    const filePath = file.newFilePath;
    if (ec === null || ec.fileTree === null) return;

    if (fileWasViewed) {
      ec.lastViewedFile = filePath;
    }

    if (ec.codeReview !== null) {
      if (isReviewed !== null) {
        if (isReviewed) {
          ec.codeReview.remainingFiles = ec.codeReview.remainingFiles.filter(
            (path: string) => path !== filePath,
          );
        } else {
          ec.codeReview.remainingFiles.push(filePath);
        }
        alterFileTreeFileReviewed(ec.fileTree, filePath, isReviewed);
      }

      sendMessage({
        command: 'updateCodeReview',
        repo: currentRepo.value,
        id: ec.codeReview.id,
        remainingFiles: ec.codeReview.remainingFiles,
        lastViewedFile: ec.lastViewedFile,
      });

      if (ec.codeReview.remainingFiles.length === 0) {
        ec.codeReview = null;
      }
    }

    saveState();
  }

  function getFileViewType() {
    const repoState = gitRepos.value[currentRepo.value];
    return repoState.fileViewType === GG.FileViewType.Default ?
        config.value.commitDetailsView.fileViewType
      : repoState.fileViewType;
  }

  function setFileViewType(type: GG.FileViewType) {
    gitRepos.value[currentRepo.value].fileViewType = type;
    saveRepoState();
  }

  /** 切换文件视图类型 — 只更新状态，Vue 组件自动重渲染 */
  function changeFileViewType(type: GG.FileViewType) {
    const ec = expandedCommit.value;
    if (ec === null) return;
    closeCdvContextMenuIfOpen(ec);
    setFileViewType(type);
  }

  /** 展开/折叠所有文件夹 — 操作 fileTree 数据，Vue 组件自动更新 */
  function openFolders(open: boolean) {
    const ec = expandedCommit.value;
    if (ec === null || ec.fileTree === null) return;
    /** 递归设置所有文件夹的 open 状态 */
    const setOpenRecursive = (folder: FileTreeFolder) => {
      folder.open = open;
      for (const key of Object.keys(folder.contents)) {
        const cur = folder.contents[key];
        if (cur.type === 'folder') {
          setOpenRecursive(cur);
        }
      }
    };
    setOpenRecursive(ec.fileTree);
    saveState();
  }

  /* ================================================================
   * 文件操作（由 Vue 组件事件触发）
   * ================================================================ */

  /** 获取文件对应的 commit hash */
  function getCommitHashForFile(file: GG.GitFileChange, ec: ExpandedCommit) {
    const commit = commits.value[commitLookup.value[ec.commitHash]];
    if (ec.compareWithHash !== null) {
      return getCommitOrder(ec.commitHash, ec.compareWithHash).to;
    } else if (commit.stash !== null && file.type === GG.GitFileStatus.Untracked) {
      return commit.stash.untrackedFilesHash!;
    } else {
      return ec.commitHash;
    }
  }

  /** 查看文件 diff — 由 Vue 组件 @click 触发 */
  function viewFileDiff(file: GG.GitFileChange) {
    const ec = expandedCommit.value;
    if (ec === null) return;

    const commit = commits.value[commitLookup.value[ec.commitHash]];
    let fromHash: string, toHash: string;
    let fileStatus = file.type;
    if (ec.compareWithHash !== null) {
      const order = getCommitOrder(ec.commitHash, ec.compareWithHash);
      fromHash = order.from;
      toHash = order.to;
    } else if (commit.stash !== null) {
      if (fileStatus === GG.GitFileStatus.Untracked) {
        fromHash = commit.stash.untrackedFilesHash!;
        toHash = commit.stash.untrackedFilesHash!;
        fileStatus = GG.GitFileStatus.Added;
      } else {
        fromHash = commit.stash.baseHash;
        toHash = ec.commitHash;
      }
    } else {
      fromHash = ec.commitHash;
      toHash = ec.commitHash;
    }

    cdvUpdateFileState(file, true, true);
    sendMessage({
      command: 'viewDiff',
      repo: currentRepo.value,
      fromHash,
      toHash,
      oldFilePath: file.oldFilePath,
      newFilePath: file.newFilePath,
      type: fileStatus,
    });
  }

  /** 复制文件路径 */
  function copyFilePath(file: GG.GitFileChange, absolute: boolean) {
    sendMessage({
      command: 'copyFilePath',
      repo: currentRepo.value,
      filePath: file.newFilePath,
      absolute,
    });
  }

  /** 查看文件在某个版本的状态 */
  function viewFileAtRevision(file: GG.GitFileChange) {
    const ec = expandedCommit.value;
    if (ec === null) return;
    cdvUpdateFileState(file, true, true);
    sendMessage({
      command: 'viewFileAtRevision',
      repo: currentRepo.value,
      hash: getCommitHashForFile(file, ec),
      filePath: file.newFilePath,
    });
  }

  /** 查看 diff（与工作目录文件比较） */
  function viewFileDiffWithWorkingFile(file: GG.GitFileChange) {
    const ec = expandedCommit.value;
    if (ec === null) return;
    cdvUpdateFileState(file, null, true);
    sendMessage({
      command: 'viewDiffWithWorkingFile',
      repo: currentRepo.value,
      hash: getCommitHashForFile(file, ec),
      filePath: file.newFilePath,
    });
  }

  /** 打开文件 */
  function openFile(file: GG.GitFileChange) {
    const ec = expandedCommit.value;
    if (ec === null) return;
    cdvUpdateFileState(file, true, true);
    sendMessage({
      command: 'openFile',
      repo: currentRepo.value,
      hash: getCommitHashForFile(file, ec),
      filePath: file.newFilePath,
    });
  }

  /** 重置文件到某个版本 */
  function resetFileToRevision(file: GG.GitFileChange) {
    const ec = expandedCommit.value;
    if (ec === null) return;
    const commitHash = getCommitHashForFile(file, ec);
    dialog.value?.showConfirmation(
      'Are you sure you want to reset <b><i>' +
        escapeHtml(file.newFilePath) +
        "</i></b> to it's state at commit <b><i>" +
        abbrevCommit(commitHash) +
        '</i></b>? Any uncommitted changes made to this file will be overwritten.',
      'Yes, reset file',
      () => {
        runAction(
          {
            command: 'resetFileToRevision',
            repo: currentRepo.value,
            commitHash,
            filePath: file.newFilePath,
          } as GG.RequestMessage,
          'Resetting file',
        );
      },
      {
        type: TargetType.CommitDetailsView,
        hash: commitHash,
        elem: null as unknown as HTMLElement,
      },
    );
  }

  /** 文件右键菜单 — 由 Vue 组件 @contextmenu 触发 */
  function showFileContextMenu(mouseEvent: MouseEvent, file: GG.GitFileChange, index: number) {
    const ec = expandedCommit.value;
    if (ec === null || ec.fileChanges === null) return;
    handledEvent(mouseEvent);

    const commitOrder = getCommitOrder(
      ec.commitHash,
      ec.compareWithHash === null ? ec.commitHash : ec.compareWithHash,
    );
    const isUncommitted = commitOrder.to === UNCOMMITTED;

    closeCdvContextMenuIfOpen(ec);
    ec.contextMenuOpen.fileView = index;

    const target: ContextMenuTarget & CommitTarget = {
      type: TargetType.CommitDetailsView,
      hash: ec.commitHash,
      index: commitLookup.value[ec.commitHash],
      elem: null as unknown as HTMLElement,
    };
    const diffPossible =
      file.type === GG.GitFileStatus.Untracked ||
      (file.additions !== null && file.deletions !== null);
    const fileExistsAtThisRevision = file.type !== GG.GitFileStatus.Deleted && !isUncommitted;
    const fileExistsAtThisRevisionAndDiffPossible = fileExistsAtThisRevision && diffPossible;
    const codeReviewInProgressAndNotReviewed =
      ec.codeReview !== null && ec.codeReview.remainingFiles.includes(file.newFilePath);
    const visibility = config.value.contextMenuActionsVisibility.commitDetailsViewFile;

    contextMenu.value?.show(
      [
        [
          {
            title: 'View Diff',
            visible: visibility.viewDiff && diffPossible,
            onClick: () => viewFileDiff(file),
          },
          {
            title: 'View File at this Revision',
            visible: visibility.viewFileAtThisRevision && fileExistsAtThisRevisionAndDiffPossible,
            onClick: () => viewFileAtRevision(file),
          },
          {
            title: 'View Diff with Working File',
            visible: visibility.viewDiffWithWorkingFile && fileExistsAtThisRevisionAndDiffPossible,
            onClick: () => viewFileDiffWithWorkingFile(file),
          },
          {
            title: 'Open File',
            visible: visibility.openFile && file.type !== GG.GitFileStatus.Deleted,
            onClick: () => openFile(file),
          },
        ],
        [
          {
            title: 'Mark as Reviewed',
            visible: visibility.markAsReviewed && codeReviewInProgressAndNotReviewed,
            onClick: () => cdvUpdateFileState(file, true, false),
          },
          {
            title: 'Mark as Not Reviewed',
            visible:
              visibility.markAsNotReviewed &&
              ec.codeReview !== null &&
              !codeReviewInProgressAndNotReviewed,
            onClick: () => cdvUpdateFileState(file, false, false),
          },
        ],
        [
          {
            title: 'Reset File to this Revision' + ELLIPSIS,
            visible:
              visibility.resetFileToThisRevision &&
              fileExistsAtThisRevision &&
              ec.compareWithHash === null,
            onClick: () => resetFileToRevision(file),
          },
        ],
        [
          {
            title: 'Copy Absolute File Path to Clipboard',
            visible: visibility.copyAbsoluteFilePath,
            onClick: () => copyFilePath(file, true),
          },
          {
            title: 'Copy Relative File Path to Clipboard',
            visible: visibility.copyRelativeFilePath,
            onClick: () => copyFilePath(file, false),
          },
        ],
      ],
      false,
      target,
      mouseEvent,
      isCdvDocked.value ? document.body : viewElem!,
      () => {
        ec.contextMenuOpen.fileView = -1;
      },
    );
  }

  function closeCdvContextMenuIfOpen(ec: ExpandedCommit) {
    if (ec.contextMenuOpen.summary || ec.contextMenuOpen.fileView > -1) {
      ec.contextMenuOpen.summary = false;
      ec.contextMenuOpen.fileView = -1;
      contextMenu.value?.close();
    }
  }

  /* ---- Code Review ---- */

  function startCodeReview(
    commitHash: string,
    compareWithHash: string | null,
    codeReview: GG.CodeReview,
  ) {
    if (
      expandedCommit.value === null ||
      expandedCommit.value.commitHash !== commitHash ||
      expandedCommit.value.compareWithHash !== compareWithHash
    )
      return;
    saveAndRenderCodeReview(codeReview);
  }

  function endCodeReview() {
    if (expandedCommit.value === null || expandedCommit.value.codeReview === null) return;
    saveAndRenderCodeReview(null);
  }

  /** 保存并更新 Code Review — 纯数据操作，Vue 组件自动更新 UI */
  function saveAndRenderCodeReview(codeReview: GG.CodeReview | null) {
    const ec = expandedCommit.value;
    if (ec === null || ec.fileTree === null) return;

    ec.codeReview = codeReview;
    setFileTreeReviewed(ec.fileTree, codeReview === null);
    saveState();
  }

  /** CDV Code Review 按钮点击 — 由 Vue 组件 @click 触发 */
  function onCdvCodeReviewClick() {
    const ec = expandedCommit.value;
    if (ec === null) return;
    if (ec.codeReview !== null) {
      sendMessage({
        command: 'endCodeReview',
        repo: currentRepo.value,
        id: ec.codeReview.id,
      });
      endCodeReview();
    } else {
      const order = getCommitOrder(
        ec.commitHash,
        ec.compareWithHash === null ? ec.commitHash : ec.compareWithHash,
      );
      const id = ec.compareWithHash !== null ? order.from + '-' + order.to : ec.commitHash;
      sendMessage({
        command: 'startCodeReview',
        repo: currentRepo.value,
        id,
        commitHash: ec.commitHash,
        compareWithHash: ec.compareWithHash,
        files: getFilesInTree(ec.fileTree!, ec.fileChanges!),
        lastViewedFile: ec.lastViewedFile,
      });
    }
  }

  /** CDV External Diff 按钮点击 — 由 Vue 组件 @click 触发 */
  function onCdvExternalDiffClick() {
    const ec = expandedCommit.value;
    if (
      ec === null ||
      gitConfig.value === null ||
      (gitConfig.value.diffTool === null && gitConfig.value.guiDiffTool === null)
    )
      return;
    const order = getCommitOrder(
      ec.commitHash,
      ec.compareWithHash === null ? ec.commitHash : ec.compareWithHash,
    );
    runAction(
      {
        command: 'openExternalDirDiff',
        repo: currentRepo.value,
        fromHash: order.from,
        toHash: order.to,
        isGui: gitConfig.value.guiDiffTool !== null,
      } as GG.RequestMessage,
      'Opening External Directory Diff',
    );
  }

  /** 在 Dialog 中展示 Tag 详情 */
  function renderTagDetails(tagName: string, commitHash: string, details: GG.GitTagDetails) {
    const textFormatter = new TextFormatter(
      commits.value,
      gitRepos.value[currentRepo.value].issueLinkingConfig,
      {
        commits: true,
        emoji: true,
        issueLinking: true,
        markdown: config.value.markdown,
        multiline: true,
        urls: true,
      },
    );
    dialog.value?.showMessage(
      'Tag <b><i>' +
        escapeHtml(tagName) +
        '</i></b><br><span class="messageContent">' +
        '<b>' +
        t('objDetail') +
        '</b>' +
        escapeHtml(details.hash) +
        '<br>' +
        '<b>' +
        t('commitDetail') +
        '</b>' +
        escapeHtml(commitHash) +
        '<br>' +
        '<b>' +
        t('tagCreator') +
        '</b>' +
        escapeHtml(details.taggerName) +
        ' &lt;<a class="' +
        CLASS_EXTERNAL_URL +
        '" href="mailto:' +
        escapeHtml(details.taggerEmail) +
        '" tabindex="-1">' +
        escapeHtml(details.taggerEmail) +
        '</a>&gt;' +
        (details.signature ? generateSignatureHtml(details.signature) : '') +
        '<br>' +
        '<b>' +
        t('dateLabel') +
        '</b>' +
        formatLongDate(details.taggerDate, initialState.config.dateFormat.iso) +
        '<br><br>' +
        textFormatter.format(details.message) +
        '</span>',
    );
  }

  /* ================================================================
   * 状态持久化
   * ================================================================ */

  function saveState() {
    let ec: ExpandedCommit | null = null;
    if (expandedCommit.value) {
      ec = {
        ...expandedCommit.value,
        commitElem: null,
        compareWithElem: null,
        contextMenuOpen: { summary: false, fileView: -1 },
      };
    }
    setViewState<WebViewState>({
      currentRepo: currentRepo.value,
      currentRepoLoading: currentRepoLoading.value,
      gitRepos: gitRepos.value,
      gitBranches: gitBranches.value,
      gitBranchHead: gitBranchHead.value,
      gitConfig: gitConfig.value,
      gitRemotes: gitRemotes.value,
      gitStashes: gitStashes.value,
      gitTags: gitTags.value,
      commits: commits.value,
      commitHead: commitHead.value,
      avatars: avatars.value,
      currentBranches: currentBranches.value,
      currentAuthors: currentAuthors.value,
      currentTags: currentTags.value,
      moreCommitsAvailable: moreCommitsAvailable.value,
      maxCommits: maxCommits.value,
      onlyFollowFirstParent: onlyFollowFirstParent.value,
      expandedCommit: ec,
      scrollTop: scrollTop.value,
      findWidget: (findWidget.value?.getState() ?? null) as FindWidgetState,
      settingsWidget: (settingsWidget.value?.getState() ?? null) as SettingsWidgetState,
    });
  }

  function saveRepoState() {
    sendMessage({
      command: 'setRepoState',
      repo: currentRepo.value,
      state: gitRepos.value[currentRepo.value],
    } as GG.RequestMessage);
  }

  function saveRepoStateValue<K extends keyof GG.GitRepoState>(
    repo: string,
    key: K,
    value: GG.GitRepoState[K],
  ) {
    if (repo === currentRepo.value) {
      gitRepos.value[currentRepo.value][key] = value;
      saveRepoState();
    }
  }

  /** 保存列宽配置（只存 Graph/Date/Author/Commit 四列，Description 列始终 AUTO） */
  function saveColumnWidths(columnWidths: GG.ColumnWidth[]) {
    const repoState = gitRepos.value[currentRepo.value];
    if (!repoState) return;
    repoState.columnWidths = [columnWidths[0], columnWidths[2], columnWidths[3], columnWidths[4]];
    saveRepoState();
  }

  /* ================================================================
   * Dialog / ContextMenu 辅助
   * ================================================================ */

  function closeDialogAndContextMenu() {
    if (dialog.value?.isOpen()) dialog.value.close();
    if (contextMenu.value?.isOpen()) contextMenu.value.close();
  }

  function runAction(msg: GG.RequestMessage, action: string) {
    dialog.value?.showActionRunning(action);
    sendMessage(msg);
  }

  /* ================================================================
   * 消息分发器（处理所有后端 → WebView 的消息）
   * ================================================================ */

  function handleResponseMessage(msg: GG.ResponseMessage) {
    switch (msg.command) {
      case 'loadCommits':
        processLoadCommitsResponse(msg);
        break;
      case 'loadConfig':
        processLoadConfig(msg);
        break;
      case 'loadRepoInfo':
        processLoadRepoInfoResponse(msg);
        break;
      case 'loadRepos':
        loadRepos(msg.repos, msg.lastActiveRepo, msg.loadViewTo);
        break;
      case 'fetchAvatar':
        if (msg.image) {
          imageResizer.value?.resize(msg.image, (resized) => loadAvatar(msg.email, resized));
        }
        break;
      case 'commitDetails':
        if (msg.commitDetails) {
          showCommitDetails(
            msg.commitDetails,
            createFileTree(msg.commitDetails.fileChanges, msg.codeReview),
            msg.avatar,
            msg.codeReview,
            msg.codeReview?.lastViewedFile ?? null,
            msg.refresh,
          );
        } else {
          closeCommitDetails(true);
          dialog.value?.showError(t('unableLoadCommitDetails'), msg.error, null, null);
        }
        break;
      case 'compareCommits':
        if (msg.error === null) {
          showCommitComparison(
            msg.commitHash,
            msg.compareWithHash,
            msg.fileChanges,
            createFileTree(msg.fileChanges, msg.codeReview),
            msg.codeReview,
            msg.codeReview?.lastViewedFile ?? null,
            msg.refresh,
          );
        } else {
          closeCommitComparison(true);
          dialog.value?.showError(t('unableLoadCommitComparison'), msg.error, null, null);
        }
        break;
      case 'startCodeReview':
        if (msg.error === null && msg.codeReview) {
          startCodeReview(msg.commitHash, msg.compareWithHash, msg.codeReview);
        } else if (msg.error) {
          dialog.value?.showError('Unable to Start Code Review', msg.error, null, null);
        }
        break;
      case 'updateCodeReview':
        if (msg.error) {
          dialog.value?.showError('Unable to update Code Review', msg.error, null, null);
        }
        break;
      case 'tagDetails':
        if (msg.details) {
          renderTagDetails(msg.tagName, msg.commitHash, msg.details);
        } else {
          dialog.value?.showError('Unable to retrieve Tag Details', msg.error, null, null);
        }
        break;
      case 'refresh':
        refresh(false);
        break;
      case 'fetch':
        if (msg.error === null) refresh(false);
        else dialog.value?.showError(t('fetchingFromRemotes'), msg.error, null, null);
        break;
      case 'addTag':
      case 'checkoutBranch':
      case 'createBranch':
      case 'deleteBranch':
      case 'deleteTag':
      case 'merge':
      case 'rebase':
      case 'pushBranch':
      case 'pushTag':
      case 'pullBranch':
      case 'resetToCommit':
      case 'revertCommit':
      case 'cherrypickCommit':
      case 'dropCommit':
      case 'dropStash':
      case 'applyStash':
      case 'popStash':
      case 'pushStash':
      case 'renameBranch':
      case 'undoLastCommit':
      case 'editCommitMessage':
      case 'checkoutCommit':
      case 'cleanUntrackedFiles':
      case 'branchFromStash':
      case 'fetchIntoLocalBranch':
      case 'deleteRemoteBranch':
      case 'pruneRemote':
      case 'addRemote':
      case 'deleteRemote':
      case 'editRemote':
      case 'exportRepoConfig':
        /* 这些命令的成功/失败处理：成功则刷新，失败则显示错误 */
        {
          const errors = (msg as { errors?: GG.ErrorInfo[] }).errors;
          const error = (msg as { error?: GG.ErrorInfo }).error;
          if (errors) {
            const reduced = reduceErrorInfos(errors);
            if (reduced.error)
              dialog.value?.showError('Git operation failed', reduced.error, null, null);
            if (reduced.partialOrCompleteSuccess) refresh(false);
          } else if (error) {
            dialog.value?.showError('Git operation failed', error, null, null);
          } else {
            refresh(false);
          }
        }
        break;
      default:
        /* 其他命令（openFile, viewDiff, copyToClipboard 等）不需要 store 处理 */
        break;
    }
  }

  function reduceErrorInfos(errors: GG.ErrorInfo[]) {
    let error: GG.ErrorInfo = null;
    let partialOrCompleteSuccess = false;
    for (const e of errors) {
      if (e !== null) error = error !== null ? error + '\n\n' + e : e;
      else partialOrCompleteSuccess = true;
    }
    return { error, partialOrCompleteSuccess };
  }

  /* ================================================================
   * 文件树构建（从 mainController 移植）
   * ================================================================ */
  function createFileTree(
    gitFiles: ReadonlyArray<GG.GitFileChange>,
    codeReview: GG.CodeReview | null,
  ): FileTreeFolder | null {
    let contents: FileTreeFolderContents = {};
    let cur: FileTreeFolder;
    let files: FileTreeFolder = {
      type: 'folder',
      name: '',
      folderPath: '',
      contents: contents,
      open: true,
      reviewed: true,
    };

    for (let i = 0; i < gitFiles.length; i++) {
      cur = files;
      const path = gitFiles[i].newFilePath.split('/');
      let absPath = currentRepo.value;
      for (let j = 0; j < path.length; j++) {
        absPath += '/' + path[j];
        if (typeof gitRepos.value[absPath] !== 'undefined') {
          if (typeof cur.contents[path[j]] === 'undefined') {
            cur.contents[path[j]] = { type: 'repo', name: path[j], path: absPath };
          }
          break;
        } else if (j < path.length - 1) {
          if (typeof cur.contents[path[j]] === 'undefined') {
            contents = {};
            cur.contents[path[j]] = {
              type: 'folder',
              name: path[j],
              folderPath: absPath.substring(currentRepo.value.length + 1),
              contents: contents,
              open: true,
              reviewed: true,
            };
          }
          cur = cur.contents[path[j]] as FileTreeFolder;
        } else if (path[j] !== '') {
          cur.contents[path[j]] = {
            type: 'file',
            name: path[j],
            index: i,
            reviewed:
              codeReview === null || !codeReview.remainingFiles.includes(gitFiles[i].newFilePath),
          };
        }
      }
    }
    if (codeReview !== null) calcFileTreeFoldersReviewed(files);
    return files;
  }

  function calcFileTreeFoldersReviewed(folder: FileTreeFolder) {
    const calc = (folder: FileTreeFolder) => {
      let reviewed = true;
      const keys = Object.keys(folder.contents);
      for (const key of keys) {
        const cur = folder.contents[key];
        if (
          (cur.type === 'folder' && !calc(cur as FileTreeFolder)) ||
          (cur.type === 'file' && !(cur as FileTreeFile).reviewed)
        ) {
          reviewed = false;
        }
      }
      folder.reviewed = reviewed;
      return reviewed;
    };
    calc(folder);
  }

  /* ================================================================
   * 辅助：获取推送默认 remote
   * ================================================================ */
  function getPushRemote(branch: string | null = null): string {
    const possibleRemotes: (string | null)[] = [];
    if (gitConfig.value !== null) {
      if (branch !== null && typeof gitConfig.value.branches[branch] !== 'undefined') {
        possibleRemotes.push(
          gitConfig.value.branches[branch].pushRemote,
          gitConfig.value.branches[branch].remote,
        );
      }
      possibleRemotes.push(gitConfig.value.pushDefault);
    }
    possibleRemotes.push('origin');
    return (
      possibleRemotes.find((remote) => remote !== null && gitRemotes.value.includes(remote)) ||
      gitRemotes.value[0]
    );
  }

  /* ================================================================
   * 上下文菜单操作 & Git 操作（从 mainController 移植）
   * ================================================================ */

  /** 分支上下文菜单 */
  function getBranchContextMenuActions(target: DialogTarget & RefTarget): ContextMenuActions {
    const refName = target.ref;
    const visibility = config.value.contextMenuActionsVisibility.branch;
    const isSelectedInBranchesDropdown = branchDropdown.value?.isSelected(refName) ?? false;

    return [
      [
        {
          title: t('checkoutBranch'),
          visible: visibility.checkout && gitBranchHead.value !== refName,
          onClick: () => checkoutBranchAction(refName, null, null, target),
        },
        {
          title: t('compareDots'),
          visible: true,
          onClick: () => {
            const options = gitBranches.value
              .filter((b) => b !== refName && !b.startsWith('remotes/'))
              .map((b) => ({ name: b, value: b }));
            if (options.length === 0) {
              dialog.value?.showError(t('compareBranch'), t('noBranchesToCompare'), 'Close', null);
              return;
            }
            dialog.value?.showSelect(
              t('selectBranchToCompare', '<b><i>' + escapeHtml(refName) + '</i></b>'),
              options[0].value,
              options,
              t('compareBtn'),
              (compareBranch) => {
                const refCommitIndex = commits.value.findIndex((c) => c.heads.includes(refName));
                const compareCommitIndex = commits.value.findIndex((c) =>
                  c.heads.includes(compareBranch),
                );
                if (refCommitIndex > -1 && compareCommitIndex > -1) {
                  const commitElem = findCommitElemWithId(getCommitElems(), refCommitIndex);
                  const compareElem = findCommitElemWithId(getCommitElems(), compareCommitIndex);
                  if (commitElem && compareElem) {
                    compareCommitsByElems(commitElem, compareElem);
                  } else {
                    dialog.value?.showError(
                      t('compareBranch'),
                      t('compareBranchNotFound'),
                      'Close',
                      null,
                    );
                  }
                } else {
                  dialog.value?.showError(
                    t('compareBranch'),
                    t('compareBranchNotFound'),
                    'Close',
                    null,
                  );
                }
              },
              target,
            );
          },
        },
        {
          title: t('renameBranch') + ELLIPSIS,
          visible: visibility.rename,
          onClick: () => {
            dialog.value?.showRefInput(
              t('enterBranchNewName', '<b><i>' + escapeHtml(refName) + '</i></b>'),
              refName,
              'Rename Branch',
              (newName) => {
                runAction(
                  {
                    command: 'renameBranch',
                    repo: currentRepo.value,
                    oldName: refName,
                    newName: newName,
                  } as GG.RequestMessage,
                  t('renamingBranch'),
                );
              },
              target,
            );
          },
        },
        {
          title: t('createBranch') + ELLIPSIS,
          visible: visibility.createBranch,
          onClick: () => createBranchAction(target.hash, '', true, target),
        },
        {
          title: t('deleteBranch') + ELLIPSIS,
          visible: visibility.delete && gitBranchHead.value !== refName,
          onClick: () => {
            const remotesWithBranch = gitRemotes.value.filter((remote) =>
              gitBranches.value.includes('remotes/' + remote + '/' + refName),
            );
            const inputs: DialogInput[] = [
              {
                type: DialogInputType.Checkbox,
                name: t('forceDelete'),
                value: config.value.dialogDefaults.deleteBranch.forceDelete,
              },
            ];
            if (remotesWithBranch.length > 0) {
              inputs.push({
                type: DialogInputType.Checkbox,
                name: t('deleteOnRemote') + (gitRemotes.value.length > 1 ? 's' : ''),
                value: false,
                info:
                  'This branch is on the remote' +
                  (remotesWithBranch.length > 1 ? 's: ' : ' ') +
                  formatCommaSeparatedList(remotesWithBranch.map((remote) => '"' + remote + '"')),
              });
            }
            dialog.value?.showForm(
              t('confirmDeleteBranch', '<b><i>' + escapeHtml(refName) + '</i></b>'),
              inputs,
              t('yesDelete'),
              (values) => {
                runAction(
                  {
                    command: 'deleteBranch',
                    repo: currentRepo.value,
                    branchName: refName,
                    forceDelete: values[0] as boolean,
                    deleteOnRemotes:
                      remotesWithBranch.length > 0 && (values[1] as boolean) ?
                        remotesWithBranch
                      : [],
                  } as GG.RequestMessage,
                  t('deletingBranch'),
                );
              },
              target,
            );
          },
        },
        {
          title: t('mergeIntoCurrent') + ELLIPSIS,
          visible: visibility.merge && gitBranchHead.value !== refName,
          onClick: () => mergeAction(refName, refName, GG.MergeActionOn.Branch, target),
        },
        {
          title: t('rebaseCurrentOntoBranch') + ELLIPSIS,
          visible: visibility.rebase && gitBranchHead.value !== refName,
          onClick: () => rebaseAction(refName, refName, GG.RebaseActionOn.Branch, target),
        },
        {
          title: t('pushBranch') + ELLIPSIS,
          visible: visibility.push && gitRemotes.value.length > 0,
          onClick: () => {
            const multipleRemotes = gitRemotes.value.length > 1;
            const inputs: DialogInput[] = [
              { type: DialogInputType.Checkbox, name: t('setUpstream'), value: true },
              {
                type: DialogInputType.Radio,
                name: t('pushMode'),
                options: [
                  { name: t('pushNormal'), value: GG.GitPushBranchMode.Normal },
                  { name: t('forceWithLease'), value: GG.GitPushBranchMode.ForceWithLease },
                  { name: t('force'), value: GG.GitPushBranchMode.Force },
                ],
                default: GG.GitPushBranchMode.Normal,
              },
            ];

            if (multipleRemotes) {
              inputs.unshift({
                type: DialogInputType.Select,
                name: t('pushToRemote'),
                defaults: [getPushRemote(refName)],
                options: gitRemotes.value.map((remote) => ({ name: remote, value: remote })),
                multiple: true,
              });
            }

            dialog.value?.showForm(
              multipleRemotes ?
                t('confirmPushBranchMulti', '<b><i>' + escapeHtml(refName) + '</i></b>')
              : t(
                  'confirmPushBranch',
                  '<b><i>' + escapeHtml(refName) + '</i></b>',
                  '<b><i>' + escapeHtml(gitRemotes.value[0]) + '</i></b>',
                ),
              inputs,
              t('yesPush'),
              (values) => {
                const remotes =
                  multipleRemotes ? (values.shift() as string[]) : [gitRemotes.value[0]];
                const setUpstream = values[0] as boolean;
                runAction(
                  {
                    command: 'pushBranch',
                    repo: currentRepo.value,
                    branchName: refName,
                    remotes: remotes,
                    setUpstream: setUpstream,
                    mode: values[1] as GG.GitPushBranchMode,
                    willUpdateBranchConfig:
                      setUpstream &&
                      remotes.length > 0 &&
                      (gitConfig.value === null ||
                        typeof gitConfig.value.branches[refName] === 'undefined' ||
                        gitConfig.value.branches[refName].remote !== remotes[remotes.length - 1]),
                  } as GG.RequestMessage,
                  t('pushingBranch'),
                );
              },
              target,
            );
          },
        },
        {
          title: t('pullBranch') + ELLIPSIS,
          visible: visibility.pull && gitRemotes.value.length > 0,
          onClick: () => {
            dialog.value?.showForm(
              t(
                'confirmUpdateLocal',
                '<b><i>' + escapeHtml(gitRemotes.value[0] + '/' + refName) + '</i></b>',
                '<b><i>' + escapeHtml(refName) + '</i></b>',
              ),
              [
                {
                  type: DialogInputType.Checkbox,
                  name: t('forceUpdate'),
                  value: config.value.dialogDefaults.fetchIntoLocalBranch.forceFetch,
                  info: 'Force the local branch to be reset to the remote branch (discard local commits).',
                },
              ],
              t('yesUpdate'),
              (values) => {
                runAction(
                  {
                    command: 'fetchIntoLocalBranch',
                    repo: currentRepo.value,
                    remote: gitRemotes.value[0],
                    remoteBranch: refName,
                    localBranch: refName,
                    force: values[0] as boolean,
                  } as GG.RequestMessage,
                  t('updatingBranch'),
                );
              },
              target,
            );
          },
        },
      ],
      [
        getViewIssueAction(refName, visibility.viewIssue, target),
        {
          title: t('createPullRequest') + ELLIPSIS,
          visible:
            visibility.createPullRequest &&
            gitRepos.value[currentRepo.value].pullRequestConfig !== null,
          onClick: () => {
            const prConfig = gitRepos.value[currentRepo.value].pullRequestConfig;
            if (prConfig === null) return;
            dialog.value?.showCheckbox(
              t('confirmCreatePR', '<b><i>' + escapeHtml(refName) + '</i></b>'),
              t('pushBeforePR'),
              true,
              t('yesCreatePR'),
              (push) => {
                runAction(
                  {
                    command: 'createPullRequest',
                    repo: currentRepo.value,
                    config: prConfig,
                    sourceRemote: prConfig.sourceRemote,
                    sourceOwner: prConfig.sourceOwner,
                    sourceRepo: prConfig.sourceRepo,
                    sourceBranch: refName,
                    push: push,
                  } as GG.RequestMessage,
                  t('creatingPR'),
                );
              },
              target,
            );
          },
        },
      ],
      [
        {
          title: t('createArchive'),
          visible: visibility.createArchive,
          onClick: () => {
            runAction(
              {
                command: 'createArchive',
                repo: currentRepo.value,
                ref: refName,
              } as GG.RequestMessage,
              t('creatingArchive'),
            );
          },
        },
        {
          title: t('selectInBranchesDropdown'),
          visible: visibility.selectInBranchesDropdown && !isSelectedInBranchesDropdown,
          onClick: () => branchDropdown.value?.selectOption(refName),
        },
        {
          title: t('unselectInBranchesDropdown'),
          visible: visibility.unselectInBranchesDropdown && isSelectedInBranchesDropdown,
          onClick: () => branchDropdown.value?.unselectOption(refName),
        },
      ],
      [
        {
          title: t('copyBranchName'),
          visible: visibility.copyName,
          onClick: () => {
            sendMessage({
              command: 'copyToClipboard',
              type: t('copyBranchNameType'),
              data: refName,
            } as GG.RequestMessage);
          },
        },
      ],
    ];
  }

  /** Commit 上下文菜单 */
  function getCommitContextMenuActions(target: DialogTarget & CommitTarget): ContextMenuActions {
    const hash = target.hash;
    const visibility = config.value.contextMenuActionsVisibility.commit;
    const commit = commits.value[commitLookup.value[hash]];
    return [
      [
        {
          title: t('addTag') + ELLIPSIS,
          visible: visibility.addTag,
          onClick: () =>
            addTagAction(hash, '', config.value.dialogDefaults.addTag.type, '', null, target),
        },
        {
          title: t('createBranch') + ELLIPSIS,
          visible: visibility.createBranch,
          onClick: () =>
            createBranchAction(hash, '', config.value.dialogDefaults.createBranch.checkout, target),
        },
      ],
      [
        {
          title: t('checkoutDots') + (globalState.alwaysAcceptCheckoutCommit ? '' : ELLIPSIS),
          visible: visibility.checkout,
          onClick: () => {
            const checkoutCommit = () =>
              runAction(
                {
                  command: 'checkoutCommit',
                  repo: currentRepo.value,
                  commitHash: hash,
                } as GG.RequestMessage,
                t('checkingOutCommit'),
              );
            if (globalState.alwaysAcceptCheckoutCommit) {
              checkoutCommit();
            } else {
              dialog.value?.showCheckbox(
                t('confirmCheckoutCommit', '<b><i>' + abbrevCommit(hash) + '</i></b>'),
                t('alwaysConfirm'),
                false,
                t('yesCheckout'),
                (alwaysAccept) => {
                  if (alwaysAccept) {
                    updateGlobalViewState('alwaysAcceptCheckoutCommit', true);
                  }
                  checkoutCommit();
                },
                target,
              );
            }
          },
        },
        {
          title: t('cherryPick') + ELLIPSIS,
          visible: visibility.cherrypick,
          onClick: () => {
            const isMerge = commit.parents.length > 1;
            const inputs: DialogInput[] = [];
            if (isMerge) {
              const options = commit.parents.map((parentHash: string, index: number) => ({
                name:
                  abbrevCommit(parentHash) +
                  (typeof commitLookup.value[parentHash] === 'number' ?
                    ': ' + commits.value[commitLookup.value[parentHash]].message
                  : ''),
                value: (index + 1).toString(),
              }));
              inputs.push({
                type: DialogInputType.Select,
                name: t('parentCommitHash'),
                options: options,
                default: '1',
                info: 'Choose the parent hash on the main branch, to cherry pick the commit relative to.',
              });
            }
            inputs.push(
              {
                type: DialogInputType.Checkbox,
                name: t('recordOrigin'),
                value: config.value.dialogDefaults.cherryPick.recordOrigin,
                info: 'Record that this commit was the origin of the cherry pick by appending a line to the original commit message that states "(cherry picked from commit ...​)".',
              },
              {
                type: DialogInputType.Checkbox,
                name: t('noCommit'),
                value: config.value.dialogDefaults.cherryPick.noCommit,
                info: 'Cherry picked changes will be staged but not committed, so that you can select and commit specific parts of this commit.',
              },
            );

            dialog.value?.showForm(
              t('confirmCherryPick', '<b><i>' + abbrevCommit(hash) + '</i></b>'),
              inputs,
              t('yesCherryPick'),
              (values) => {
                const parentIndex = isMerge ? parseInt(values.shift() as string) : 0;
                runAction(
                  {
                    command: 'cherrypickCommit',
                    repo: currentRepo.value,
                    commitHash: hash,
                    parentIndex: parentIndex,
                    recordOrigin: values[0] as boolean,
                    noCommit: values[1] as boolean,
                  } as GG.RequestMessage,
                  t('cherryPickingCommit'),
                );
              },
              target,
            );
          },
        },
        {
          title: t('revert') + ELLIPSIS,
          visible: visibility.revert,
          onClick: () => {
            if (commit.parents.length > 1) {
              const options = commit.parents.map((parentHash: string, index: number) => ({
                name:
                  abbrevCommit(parentHash) +
                  (typeof commitLookup.value[parentHash] === 'number' ?
                    ': ' + commits.value[commitLookup.value[parentHash]].message
                  : ''),
                value: (index + 1).toString(),
              }));
              dialog.value?.showSelect(
                t('confirmRevertMerge', '<b><i>' + abbrevCommit(hash) + '</i></b>'),
                '1',
                options,
                t('yesRevert'),
                (parentIndex) => {
                  runAction(
                    {
                      command: 'revertCommit',
                      repo: currentRepo.value,
                      commitHash: hash,
                      parentIndex: parseInt(parentIndex),
                    } as GG.RequestMessage,
                    t('revertingCommit'),
                  );
                },
                target,
              );
            } else {
              dialog.value?.showConfirmation(
                t('confirmRevertCommit', '<b><i>' + abbrevCommit(hash) + '</i></b>'),
                t('yesRevert'),
                () => {
                  runAction(
                    {
                      command: 'revertCommit',
                      repo: currentRepo.value,
                      commitHash: hash,
                      parentIndex: 0,
                    } as GG.RequestMessage,
                    t('revertingCommit'),
                  );
                },
                target,
              );
            }
          },
        },
        {
          title: t('undoLastCommit') + ELLIPSIS,
          visible: visibility.undo && hash === commitHead.value,
          onClick: () => {
            dialog.value?.showConfirmation(
              t('confirmUndoLast'),
              t('yesUndoLast'),
              () => {
                runAction(
                  { command: 'undoLastCommit', repo: currentRepo.value } as GG.RequestMessage,
                  t('undoingLastCommit'),
                );
              },
              target,
            );
          },
        },
        {
          title: t('editCommitMessage') + ELLIPSIS,
          visible: visibility.editMessage,
          onClick: () => editCommitMessageAction(target),
        },
        {
          title: t('drop') + ELLIPSIS,
          visible:
            visibility.drop && (graph.value?.dropCommitPossible(commitLookup.value[hash]) ?? false),
          onClick: () => {
            dialog.value?.showConfirmation(
              t('confirmDropCommit', '<b><i>' + abbrevCommit(hash) + '</i></b>') +
                (onlyFollowFirstParent.value ? '<br/><i>' + t('dropCommitWarning') + '</i>' : ''),
              t('yesDrop'),
              () => {
                runAction(
                  {
                    command: 'dropCommit',
                    repo: currentRepo.value,
                    commitHash: hash,
                  } as GG.RequestMessage,
                  t('droppingCommit'),
                );
              },
              target,
            );
          },
        },
      ],
      [
        {
          title: t('mergeIntoCurrent') + ELLIPSIS,
          visible: visibility.merge,
          onClick: () => mergeAction(hash, abbrevCommit(hash), GG.MergeActionOn.Commit, target),
        },
        {
          title: t('rebaseCurrentOntoCommit') + ELLIPSIS,
          visible: visibility.rebase,
          onClick: () => rebaseAction(hash, abbrevCommit(hash), GG.RebaseActionOn.Commit, target),
        },
        {
          title: t('resetCurrentToCommit') + ELLIPSIS,
          visible: visibility.reset,
          onClick: () => {
            dialog.value?.showSelect(
              t(
                'confirmResetToCommit',
                gitBranchHead.value !== null ?
                  ' <b><i>' +
                    escapeHtml(gitBranchHead.value) +
                    '</i></b>（' +
                    t('currentBranchLabel') +
                    '）'
                : t('currentBranchLabel'),
                '<b><i>' + abbrevCommit(hash) + '</i></b>',
              ),
              config.value.dialogDefaults.resetCommit.mode,
              [
                { name: t('resetSoft'), value: GG.GitResetMode.Soft },
                { name: t('resetMixed'), value: GG.GitResetMode.Mixed },
                { name: t('resetHard'), value: GG.GitResetMode.Hard },
              ],
              t('yesReset'),
              (mode) => {
                runAction(
                  {
                    command: 'resetToCommit',
                    repo: currentRepo.value,
                    commit: hash,
                    resetMode: mode as GG.GitResetMode,
                  } as GG.RequestMessage,
                  t('resettingToCommit'),
                );
              },
              target,
            );
          },
        },
      ],
      [
        {
          title: t('copyCommitHash'),
          visible: visibility.copyHash,
          onClick: () => {
            sendMessage({
              command: 'copyToClipboard',
              type: t('copyCommitHashType'),
              data: hash,
            } as GG.RequestMessage);
          },
        },
        {
          title: t('copyCommitSubject'),
          visible: visibility.copySubject,
          onClick: () => {
            sendMessage({
              command: 'copyToClipboard',
              type: t('copyCommitSubjectType'),
              data: commit.message,
            } as GG.RequestMessage);
          },
        },
      ],
    ];
  }

  /** 远程分支上下文菜单 */
  function getRemoteBranchContextMenuActions(
    remote: string,
    target: DialogTarget & RefTarget,
  ): ContextMenuActions {
    const refName = target.ref;
    const visibility = config.value.contextMenuActionsVisibility.remoteBranch;
    const branchName = remote !== '' ? refName.substring(remote.length + 1) : '';
    const prefixedRefName = 'remotes/' + refName;
    const isSelectedInBranchesDropdown = branchDropdown.value?.isSelected(prefixedRefName) ?? false;
    return [
      [
        {
          title: t('checkoutBranch') + ELLIPSIS,
          visible: visibility.checkout,
          onClick: () => checkoutBranchAction(refName, remote, null, target),
        },
        {
          title: t('createBranch') + ELLIPSIS,
          visible: visibility.createBranch,
          onClick: () => createBranchAction(target.hash, branchName, true, target),
        },
        {
          title: t('deleteRemoteBranch') + ELLIPSIS,
          visible: visibility.delete && remote !== '',
          onClick: () => {
            dialog.value?.showConfirmation(
              t('confirmDeleteRemoteBranch', '<b><i>' + escapeHtml(refName) + '</i></b>'),
              t('yesDelete'),
              () => {
                runAction(
                  {
                    command: 'deleteRemoteBranch',
                    repo: currentRepo.value,
                    branchName: branchName,
                    remote: remote,
                  } as GG.RequestMessage,
                  t('deletingRemoteBranch'),
                );
              },
              target,
            );
          },
        },
        {
          title: t('fetchIntoLocalBranch') + ELLIPSIS,
          visible:
            visibility.fetch &&
            remote !== '' &&
            gitBranches.value.includes(branchName) &&
            gitBranchHead.value !== branchName,
          onClick: () => {
            dialog.value?.showForm(
              t(
                'confirmFetchIntoLocal',
                '<b><i>' + escapeHtml(refName) + '</i></b>',
                '<b><i>' + escapeHtml(branchName) + '</i></b>',
              ),
              [
                {
                  type: DialogInputType.Checkbox,
                  name: t('forceFetch'),
                  value: config.value.dialogDefaults.fetchIntoLocalBranch.forceFetch,
                  info: 'Force the local branch to be reset to this remote branch.',
                },
              ],
              t('yesFetch'),
              (values) => {
                runAction(
                  {
                    command: 'fetchIntoLocalBranch',
                    repo: currentRepo.value,
                    remote: remote,
                    remoteBranch: branchName,
                    localBranch: branchName,
                    force: values[0] as boolean,
                  } as GG.RequestMessage,
                  t('fetchingBranch'),
                );
              },
              target,
            );
          },
        },
        {
          title: t('mergeIntoCurrent') + ELLIPSIS,
          visible: visibility.merge,
          onClick: () =>
            mergeAction(refName, refName, GG.MergeActionOn.RemoteTrackingBranch, target),
        },
        {
          title: t('pullIntoCurrent') + ELLIPSIS,
          visible: visibility.pull && remote !== '',
          onClick: () => {
            dialog.value?.showForm(
              t(
                'confirmPullRemote',
                '<b><i>' + escapeHtml(refName) + '</i></b>',
                gitBranchHead.value !== null ?
                  ' <b><i>' +
                    escapeHtml(gitBranchHead.value) +
                    '</i></b>（' +
                    t('currentBranchLabel') +
                    '）'
                : t('currentBranchLabel'),
              ),
              [
                {
                  type: DialogInputType.Checkbox,
                  name: t('createNewCommitEvenFF'),
                  value: config.value.dialogDefaults.pullBranch.noFastForward,
                },
                {
                  type: DialogInputType.Checkbox,
                  name: t('squashCommits'),
                  value: config.value.dialogDefaults.pullBranch.squash,
                  info: 'Create a single commit on the current branch whose effect is the same as merging this remote branch.',
                },
              ],
              t('yesPull'),
              (values) => {
                runAction(
                  {
                    command: 'pullBranch',
                    repo: currentRepo.value,
                    branchName: branchName,
                    remote: remote,
                    createNewCommit: values[0] as boolean,
                    squash: values[1] as boolean,
                  } as GG.RequestMessage,
                  t('pullingBranch'),
                );
              },
              target,
            );
          },
        },
      ],
      [
        getViewIssueAction(refName, visibility.viewIssue, target),
        {
          title: t('createPullRequest'),
          visible:
            visibility.createPullRequest &&
            gitRepos.value[currentRepo.value].pullRequestConfig !== null &&
            branchName !== 'HEAD' &&
            (gitRepos.value[currentRepo.value].pullRequestConfig!.sourceRemote === remote ||
              gitRepos.value[currentRepo.value].pullRequestConfig!.destRemote === remote),
          onClick: () => {
            const prConfig = gitRepos.value[currentRepo.value].pullRequestConfig;
            if (prConfig === null) return;
            const isDestRemote = prConfig.destRemote === remote;
            runAction(
              {
                command: 'createPullRequest',
                repo: currentRepo.value,
                config: prConfig,
                sourceRemote: isDestRemote ? prConfig.destRemote! : prConfig.sourceRemote,
                sourceOwner: isDestRemote ? prConfig.destOwner : prConfig.sourceOwner,
                sourceRepo: isDestRemote ? prConfig.destRepo : prConfig.sourceRepo,
                sourceBranch: branchName,
                push: false,
              } as GG.RequestMessage,
              t('creatingPR'),
            );
          },
        },
      ],
      [
        {
          title: t('createArchive'),
          visible: visibility.createArchive,
          onClick: () => {
            runAction(
              {
                command: 'createArchive',
                repo: currentRepo.value,
                ref: refName,
              } as GG.RequestMessage,
              t('creatingArchive'),
            );
          },
        },
        {
          title: t('selectInBranchesDropdown'),
          visible: visibility.selectInBranchesDropdown && !isSelectedInBranchesDropdown,
          onClick: () => branchDropdown.value?.selectOption(prefixedRefName),
        },
        {
          title: t('unselectInBranchesDropdown'),
          visible: visibility.unselectInBranchesDropdown && isSelectedInBranchesDropdown,
          onClick: () => branchDropdown.value?.unselectOption(prefixedRefName),
        },
      ],
      [
        {
          title: t('copyBranchName'),
          visible: visibility.copyName,
          onClick: () => {
            sendMessage({
              command: 'copyToClipboard',
              type: t('copyBranchNameType'),
              data: refName,
            } as GG.RequestMessage);
          },
        },
      ],
    ];
  }

  /** Stash 上下文菜单 */
  function getStashContextMenuActions(target: DialogTarget & RefTarget): ContextMenuActions {
    const hash = target.hash;
    const selector = target.ref;
    const visibility = config.value.contextMenuActionsVisibility.stash;
    return [
      [
        {
          title: t('applyStash') + ELLIPSIS,
          visible: visibility.apply,
          onClick: () => {
            dialog.value?.showForm(
              t('confirmApplyStash', '<b><i>' + escapeHtml(selector.substring(5)) + '</i></b>'),
              [
                {
                  type: DialogInputType.Checkbox,
                  name: t('reinstateIndex'),
                  value: config.value.dialogDefaults.applyStash.reinstateIndex,
                  info: "Attempt to reinstate the indexed changes, in addition to the working tree's changes.",
                },
              ],
              t('yesApplyStash'),
              (values) => {
                runAction(
                  {
                    command: 'applyStash',
                    repo: currentRepo.value,
                    selector: selector,
                    reinstateIndex: values[0] as boolean,
                  } as GG.RequestMessage,
                  t('applyingStash'),
                );
              },
              target,
            );
          },
        },
        {
          title: t('createBranchFromStash') + ELLIPSIS,
          visible: visibility.createBranch,
          onClick: () => {
            dialog.value?.showRefInput(
              t(
                'createBranchFromStashMsg',
                '<b><i>' + escapeHtml(selector.substring(5)) + '</i></b>',
              ),
              '',
              'Create Branch',
              (branchName) => {
                runAction(
                  {
                    command: 'branchFromStash',
                    repo: currentRepo.value,
                    selector: selector,
                    branchName: branchName,
                  } as GG.RequestMessage,
                  t('creatingBranch'),
                );
              },
              target,
            );
          },
        },
        {
          title: t('popStash') + ELLIPSIS,
          visible: visibility.pop,
          onClick: () => {
            dialog.value?.showForm(
              t('confirmPopStash', '<b><i>' + escapeHtml(selector.substring(5)) + '</i></b>'),
              [
                {
                  type: DialogInputType.Checkbox,
                  name: t('reinstateIndex'),
                  value: config.value.dialogDefaults.popStash.reinstateIndex,
                  info: "Attempt to reinstate the indexed changes, in addition to the working tree's changes.",
                },
              ],
              t('yesPopStash'),
              (values) => {
                runAction(
                  {
                    command: 'popStash',
                    repo: currentRepo.value,
                    selector: selector,
                    reinstateIndex: values[0] as boolean,
                  } as GG.RequestMessage,
                  t('poppingStash'),
                );
              },
              target,
            );
          },
        },
        {
          title: t('dropStash') + ELLIPSIS,
          visible: visibility.drop,
          onClick: () => {
            dialog.value?.showConfirmation(
              t('confirmDropStash', '<b><i>' + escapeHtml(selector.substring(5)) + '</i></b>'),
              t('yesDrop'),
              () => {
                runAction(
                  {
                    command: 'dropStash',
                    repo: currentRepo.value,
                    selector: selector,
                  } as GG.RequestMessage,
                  t('droppingStash'),
                );
              },
              target,
            );
          },
        },
      ],
      [
        {
          title: t('copyStashName'),
          visible: visibility.copyName,
          onClick: () => {
            sendMessage({
              command: 'copyToClipboard',
              type: t('stashNameType'),
              data: selector,
            } as GG.RequestMessage);
          },
        },
        {
          title: t('copyStashHash'),
          visible: visibility.copyHash,
          onClick: () => {
            sendMessage({
              command: 'copyToClipboard',
              type: t('stashHashType'),
              data: hash,
            } as GG.RequestMessage);
          },
        },
      ],
    ];
  }

  /** Tag 上下文菜单 */
  function getTagContextMenuActions(
    isAnnotated: boolean,
    target: DialogTarget & RefTarget,
  ): ContextMenuActions {
    const hash = target.hash;
    const tagName = target.ref;
    const visibility = config.value.contextMenuActionsVisibility.tag;
    return [
      [
        {
          title: t('viewDetails'),
          visible: visibility.viewDetails && isAnnotated,
          onClick: () => {
            runAction(
              {
                command: 'tagDetails',
                repo: currentRepo.value,
                tagName: tagName,
                commitHash: hash,
              } as GG.RequestMessage,
              t('fetchingTagDetails'),
            );
          },
        },
        {
          title: t('deleteTag') + ELLIPSIS,
          visible: visibility.delete,
          onClick: () => {
            const message = t('confirmDeleteTag', '<b><i>' + escapeHtml(tagName) + '</i></b>');
            if (gitRemotes.value.length > 1) {
              const options = [{ name: t('dontDeleteAnyRemote'), value: '-1' }];
              gitRemotes.value.forEach((remote, i) =>
                options.push({ name: remote, value: i.toString() }),
              );
              dialog.value?.showSelect(
                message + '<br>' + t('alsoDeleteOnRemoteQ'),
                '-1',
                options,
                t('yesDelete'),
                (remoteIndex) => {
                  deleteTagAction(
                    tagName,
                    remoteIndex !== '-1' ? gitRemotes.value[parseInt(remoteIndex)] : null,
                  );
                },
                target,
              );
            } else if (gitRemotes.value.length === 1) {
              dialog.value?.showCheckbox(
                message,
                t('alsoDeleteOnRemote'),
                false,
                t('yesDelete'),
                (deleteOnRemote) => {
                  deleteTagAction(tagName, deleteOnRemote ? gitRemotes.value[0] : null);
                },
                target,
              );
            } else {
              dialog.value?.showConfirmation(
                message,
                t('yesDelete'),
                () => {
                  deleteTagAction(tagName, null);
                },
                target,
              );
            }
          },
        },
        {
          title: t('pushTag') + ELLIPSIS,
          visible: visibility.push && gitRemotes.value.length > 0,
          onClick: () => {
            const runPushTagAction = (remotes: string[]) => {
              runAction(
                {
                  command: 'pushTag',
                  repo: currentRepo.value,
                  tagName: tagName,
                  remotes: remotes,
                  commitHash: hash,
                  skipRemoteCheck: globalState.pushTagSkipRemoteCheck,
                } as GG.RequestMessage,
                t('pushingTag'),
              );
            };

            if (gitRemotes.value.length === 1) {
              dialog.value?.showConfirmation(
                t(
                  'confirmPushTag',
                  '<b><i>' + escapeHtml(tagName) + '</i></b>',
                  '<b><i>' + escapeHtml(gitRemotes.value[0]) + '</i></b>',
                ),
                t('yesPush'),
                () => {
                  runPushTagAction([gitRemotes.value[0]]);
                },
                target,
              );
            } else if (gitRemotes.value.length > 1) {
              const defaults = [getPushRemote()];
              const options = gitRemotes.value.map((remote) => ({ name: remote, value: remote }));
              dialog.value?.showMultiSelect(
                t('confirmPushTagMulti', '<b><i>' + escapeHtml(tagName) + '</i></b>'),
                defaults,
                options,
                t('yesPush'),
                (remotes) => {
                  runPushTagAction(remotes);
                },
                target,
              );
            }
          },
        },
      ],
      [
        {
          title: t('createArchive'),
          visible: visibility.createArchive,
          onClick: () => {
            runAction(
              {
                command: 'createArchive',
                repo: currentRepo.value,
                ref: tagName,
              } as GG.RequestMessage,
              t('creatingArchive'),
            );
          },
        },
        {
          title: t('copyTagName'),
          visible: visibility.copyName,
          onClick: () => {
            sendMessage({
              command: 'copyToClipboard',
              type: t('tagNameType'),
              data: tagName,
            } as GG.RequestMessage);
          },
        },
      ],
    ];
  }

  /** 未提交更改上下文菜单 */
  function getUncommittedChangesContextMenuActions(
    target: DialogTarget & CommitTarget,
  ): ContextMenuActions {
    const visibility = config.value.contextMenuActionsVisibility.uncommittedChanges;
    return [
      [
        {
          title: t('stashUncommitted') + ELLIPSIS,
          visible: visibility.stash,
          onClick: () => {
            dialog.value?.showForm(
              t('confirmStashUncommitted'),
              [
                {
                  type: DialogInputType.Text,
                  name: t('message'),
                  default: '',
                  placeholder: t('optional'),
                },
                {
                  type: DialogInputType.Checkbox,
                  name: t('includeUntracked'),
                  value: config.value.dialogDefaults.stashUncommittedChanges.includeUntracked,
                  info: 'Include all untracked files in the stash, and then clean them from the working directory.',
                },
              ],
              t('yesStash'),
              (values) => {
                runAction(
                  {
                    command: 'pushStash',
                    repo: currentRepo.value,
                    message: values[0] as string,
                    includeUntracked: values[1] as boolean,
                  } as GG.RequestMessage,
                  t('stashingUncommitted'),
                );
              },
              target,
            );
          },
        },
      ],
      [
        {
          title: t('resetUncommitted') + ELLIPSIS,
          visible: visibility.reset,
          onClick: () => {
            dialog.value?.showSelect(
              t('confirmResetUncommitted'),
              config.value.dialogDefaults.resetUncommitted.mode,
              [
                { name: t('resetMixed'), value: GG.GitResetMode.Mixed },
                { name: t('resetHard'), value: GG.GitResetMode.Hard },
              ],
              t('yesReset'),
              (mode) => {
                runAction(
                  {
                    command: 'resetToCommit',
                    repo: currentRepo.value,
                    commit: 'HEAD',
                    resetMode: mode as GG.GitResetMode,
                  } as GG.RequestMessage,
                  t('resettingUncommitted'),
                );
              },
              target,
            );
          },
        },
        {
          title: t('cleanUntracked') + ELLIPSIS,
          visible: visibility.clean,
          onClick: () => {
            dialog.value?.showCheckbox(
              t('confirmCleanUntracked'),
              t('cleanUntrackedDirs'),
              true,
              t('yesClean'),
              (directories) => {
                runAction(
                  {
                    command: 'cleanUntrackedFiles',
                    repo: currentRepo.value,
                    directories: directories,
                  } as GG.RequestMessage,
                  t('cleaningUntracked'),
                );
              },
              target,
            );
          },
        },
      ],
      [
        {
          title: t('openSourceControlView'),
          visible: visibility.openSourceControlView,
          onClick: () => {
            sendMessage({ command: 'viewScm' } as GG.RequestMessage);
          },
        },
      ],
    ];
  }

  /** 查看关联 Issue 的菜单项 */
  function getViewIssueAction(
    refName: string,
    visible: boolean,
    target: DialogTarget & RefTarget,
  ): ContextMenuAction {
    const issueLinks: { url: string; displayText: string }[] = [];

    let issueLinking: IssueLinking | null;
    let match: RegExpExecArray | null;
    if (
      visible &&
      (issueLinking = parseIssueLinkingConfig(
        gitRepos.value[currentRepo.value].issueLinkingConfig,
      )) !== null
    ) {
      issueLinking.regexp.lastIndex = 0;
      while ((match = issueLinking.regexp.exec(refName))) {
        if (match[0].length === 0) break;
        issueLinks.push({
          url: generateIssueLinkFromMatch(match, issueLinking),
          displayText: match[0],
        });
      }
    }

    return {
      title: t('viewIssue') + (issueLinks.length > 1 ? ELLIPSIS : ''),
      visible: issueLinks.length > 0,
      onClick: () => {
        if (issueLinks.length > 1) {
          dialog.value?.showSelect(
            t('selectIssueToView'),
            '0',
            issueLinks.map((issueLink, i) => ({
              name: issueLink.displayText,
              value: i.toString(),
            })),
            t('viewIssue'),
            (value) => {
              sendMessage({
                command: 'openExternalUrl',
                url: issueLinks[parseInt(value)].url,
              } as GG.RequestMessage);
            },
            target,
          );
        } else if (issueLinks.length === 1) {
          sendMessage({ command: 'openExternalUrl', url: issueLinks[0].url } as GG.RequestMessage);
        }
      },
    };
  }

  /* ---- Git 操作方法 ---- */

  /** 添加 Tag */
  function addTagAction(
    hash: string,
    initialName: string,
    initialType: GG.TagType,
    initialMessage: string,
    initialPushToRemote: string | null,
    target: DialogTarget & CommitTarget,
    isInitialLoad: boolean = true,
  ) {
    let mostRecentTagsIndex = -1;
    for (let i = 0; i < commits.value.length; i++) {
      if (
        commits.value[i].tags.length > 0 &&
        (mostRecentTagsIndex === -1 ||
          commits.value[i].date > commits.value[mostRecentTagsIndex].date)
      ) {
        mostRecentTagsIndex = i;
      }
    }
    const mostRecentTagsRaw =
      mostRecentTagsIndex > -1 ?
        commits.value[mostRecentTagsIndex].tags.map((tag: GG.GitCommitTag) => {
          const parts = tag.name.split('/');
          return parts.length > 1 ? parts.slice(1).join('/') : parts[0];
        })
      : [];
    const mostRecentTags = mostRecentTagsRaw.map((tag) => '"' + tag + '"');
    if (initialName === '' && mostRecentTagsRaw.length > 0) {
      const m = mostRecentTagsRaw[0].match(/^(.*?)(\d+)$/);
      if (m) {
        initialName = m[1] + (parseInt(m[2]) + 1);
      }
    }

    const inputs: DialogInput[] = [
      {
        type: DialogInputType.TextRef,
        name: 'Name',
        default: initialName,
        info:
          mostRecentTags.length > 0 ?
            'The most recent tag' +
            (mostRecentTags.length > 1 ? 's' : '') +
            ' in the loaded commits ' +
            (mostRecentTags.length > 1 ? 'are' : 'is') +
            ' ' +
            formatCommaSeparatedList(mostRecentTags) +
            '.'
          : undefined,
      },
      {
        type: DialogInputType.Select,
        name: t('type'),
        default: initialType === GG.TagType.Annotated ? 'annotated' : 'lightweight',
        options: [
          { name: t('tagTypeAnnotated'), value: 'annotated' },
          { name: t('tagTypeLightweight'), value: 'lightweight' },
        ],
      },
      {
        type: DialogInputType.Text,
        name: t('message'),
        default: initialMessage,
        placeholder: t('optional'),
        info: 'A message can only be added to an annotated tag.',
      },
    ];
    if (gitRemotes.value.length > 1) {
      const options = [{ name: t('dontPush'), value: '-1' }];
      gitRemotes.value.forEach((remote, i) => options.push({ name: remote, value: i.toString() }));
      const defaultOption =
        initialPushToRemote !== null ? gitRemotes.value.indexOf(initialPushToRemote)
        : isInitialLoad ? gitRemotes.value.indexOf(getPushRemote())
        : -1;
      inputs.push({
        type: DialogInputType.Select,
        name: t('pushToRemote'),
        options: options,
        default: defaultOption.toString(),
        info: 'Once this tag has been added, push it to this remote.',
      });
    } else if (gitRemotes.value.length === 1) {
      const defaultValue = initialPushToRemote !== null || isInitialLoad;
      inputs.push({
        type: DialogInputType.Checkbox,
        name: t('pushToRemote'),
        value: defaultValue,
        info: 'Once this tag has been added, push it to the repositories remote.',
      });
    }

    dialog.value?.showForm(
      t('addTagToCommit', '<b><i>' + abbrevCommit(hash) + '</i></b>'),
      inputs,
      t('addTag'),
      (values) => {
        const tagName = values[0] as string;
        const type =
          (values[1] as string) === 'annotated' ? GG.TagType.Annotated : GG.TagType.Lightweight;
        const message = values[2] as string;
        const pushToRemote =
          gitRemotes.value.length > 1 && (values[3] as string) !== '-1' ?
            gitRemotes.value[parseInt(values[3] as string)]
          : gitRemotes.value.length === 1 && (values[3] as boolean) ? gitRemotes.value[0]
          : null;

        const runAddTagAction = (force: boolean) => {
          runAction(
            {
              command: 'addTag',
              repo: currentRepo.value,
              tagName: tagName,
              commitHash: hash,
              type: type,
              message: message,
              pushToRemote: pushToRemote,
              pushSkipRemoteCheck: globalState.pushTagSkipRemoteCheck,
              force: force,
            } as GG.RequestMessage,
            t('addingTag'),
          );
        };

        if (gitTags.value.includes(tagName)) {
          dialog.value?.showTwoButtons(
            t('tagExists', '<b><i>' + escapeHtml(tagName) + '</i></b>'),
            t('yesReplaceTag'),
            () => {
              runAddTagAction(true);
            },
            t('noChooseAnotherTag'),
            () => {
              addTagAction(hash, tagName, type, message, pushToRemote, target, false);
            },
            target,
          );
        } else {
          runAddTagAction(false);
        }
      },
      target,
    );
  }

  /** 检出分支 */
  function checkoutBranchAction(
    refName: string,
    remote: string | null,
    prefillName: string | null,
    target: DialogTarget & (CommitTarget | RefTarget),
  ) {
    if (remote !== null) {
      dialog.value?.showRefInput(
        t('checkoutNewBranchName', '<b><i>' + escapeHtml(refName) + '</i></b>'),
        prefillName !== null ? prefillName
        : remote !== '' ? refName.substring(remote.length + 1)
        : refName,
        t('checkoutBranch'),
        (newBranch) => {
          if (gitBranches.value.includes(newBranch)) {
            const canPullFromRemote = remote !== '';
            dialog.value?.showTwoButtons(
              t('nameUsedByBranch', '<b><i>' + escapeHtml(newBranch) + '</i></b>'),
              t('chooseAnotherName'),
              () => {
                checkoutBranchAction(refName, remote, newBranch, target);
              },
              t('checkoutExisting') +
                (canPullFromRemote ? ' ' + t('checkoutExistingAndPullSuffix') : ''),
              () => {
                runAction(
                  {
                    command: 'checkoutBranch',
                    repo: currentRepo.value,
                    branchName: newBranch,
                    remoteBranch: null,
                    pullAfterwards:
                      canPullFromRemote ?
                        {
                          branchName: refName.substring(remote.length + 1),
                          remote: remote,
                          createNewCommit: config.value.dialogDefaults.pullBranch.noFastForward,
                          squash: config.value.dialogDefaults.pullBranch.squash,
                        }
                      : null,
                  } as GG.RequestMessage,
                  t('checkingOutBranch') +
                    (canPullFromRemote ? ' ' + t('checkoutExistingAndPullSuffix') : ''),
                );
              },
              target,
            );
          } else {
            runAction(
              {
                command: 'checkoutBranch',
                repo: currentRepo.value,
                branchName: newBranch,
                remoteBranch: refName,
                pullAfterwards: null,
              } as GG.RequestMessage,
              t('checkingOutBranch'),
            );
          }
        },
        target,
      );
    } else {
      runAction(
        {
          command: 'checkoutBranch',
          repo: currentRepo.value,
          branchName: refName,
          remoteBranch: null,
          pullAfterwards: null,
        } as GG.RequestMessage,
        t('checkingOutBranch'),
      );
    }
  }

  /** 创建分支 */
  function createBranchAction(
    hash: string,
    initialName: string,
    initialCheckOut: boolean,
    target: DialogTarget & CommitTarget,
  ) {
    dialog.value?.showForm(
      t('createBranchAt', '<b><i>' + abbrevCommit(hash) + '</i></b>'),
      [
        { type: DialogInputType.TextRef, name: 'Name', default: initialName },
        { type: DialogInputType.Checkbox, name: 'Check out', value: initialCheckOut },
      ],
      t('createBranch'),
      (values) => {
        const branchName = values[0] as string;
        const checkOut = values[1] as boolean;
        if (gitBranches.value.includes(branchName)) {
          dialog.value?.showTwoButtons(
            t('branchExists', '<b><i>' + escapeHtml(branchName) + '</i></b>'),
            t('yesReplaceBranch'),
            () => {
              runAction(
                {
                  command: 'createBranch',
                  repo: currentRepo.value,
                  branchName: branchName,
                  commitHash: hash,
                  checkout: checkOut,
                  force: true,
                } as GG.RequestMessage,
                t('creatingBranch'),
              );
            },
            t('noChooseAnotherBranch'),
            () => {
              createBranchAction(hash, branchName, checkOut, target);
            },
            target,
          );
        } else {
          runAction(
            {
              command: 'createBranch',
              repo: currentRepo.value,
              branchName: branchName,
              commitHash: hash,
              checkout: checkOut,
              force: false,
            } as GG.RequestMessage,
            t('creatingBranch'),
          );
        }
      },
      target,
    );
  }

  /** 删除 Tag */
  function deleteTagAction(refName: string, deleteOnRemote: string | null) {
    runAction(
      {
        command: 'deleteTag',
        repo: currentRepo.value,
        tagName: refName,
        deleteOnRemote: deleteOnRemote,
      } as GG.RequestMessage,
      t('deletingTag'),
    );
  }

  /** 从 remote 获取 */
  function fetchFromRemotesAction() {
    runAction(
      {
        command: 'fetch',
        repo: currentRepo.value,
        name: null,
        prune: config.value.fetchAndPrune,
        pruneTags: config.value.fetchAndPruneTags,
      } as GG.RequestMessage,
      t('fetchingFromRemotes'),
    );
  }

  /** Merge 操作 */
  function mergeAction(
    obj: string,
    name: string,
    actionOn: GG.MergeActionOn,
    target: DialogTarget & (CommitTarget | RefTarget),
  ) {
    dialog.value?.showForm(
      t(
        'confirmMerge',
        actionOn.toLowerCase(),
        '<b><i>' + escapeHtml(name) + '</i></b>',
        gitBranchHead.value !== null ?
          ' <b><i>' +
            escapeHtml(gitBranchHead.value) +
            '</i></b>（' +
            t('currentBranchLabel') +
            '）'
        : t('currentBranchLabel'),
      ),
      [
        {
          type: DialogInputType.Checkbox,
          name: t('createNewCommitEvenFF'),
          value: config.value.dialogDefaults.merge.noFastForward,
        },
        {
          type: DialogInputType.Checkbox,
          name: t('squashCommits'),
          value: config.value.dialogDefaults.merge.squash,
          info:
            'Create a single commit on the current branch whose effect is the same as merging this ' +
            actionOn.toLowerCase() +
            '.',
        },
        {
          type: DialogInputType.Checkbox,
          name: t('noCommit'),
          value: config.value.dialogDefaults.merge.noCommit,
          info: 'The changes of the merge will be staged but not committed, so that you can review and/or modify the merge result before committing.',
        },
      ],
      t('yesMerge'),
      (values) => {
        runAction(
          {
            command: 'merge',
            repo: currentRepo.value,
            obj: obj,
            actionOn: actionOn,
            createNewCommit: values[0] as boolean,
            squash: values[1] as boolean,
            noCommit: values[2] as boolean,
          } as GG.RequestMessage,
          'Merging ' + actionOn,
        );
      },
      target,
    );
  }

  /** Rebase 操作 */
  function rebaseAction(
    obj: string,
    name: string,
    actionOn: GG.RebaseActionOn,
    target: DialogTarget & (CommitTarget | RefTarget),
  ) {
    dialog.value?.showForm(
      t(
        'confirmRebase',
        gitBranchHead.value !== null ?
          ' <b><i>' +
            escapeHtml(gitBranchHead.value) +
            '</i></b>（' +
            t('currentBranchLabel') +
            '）'
        : t('currentBranchLabel'),
        actionOn.toLowerCase(),
        '<b><i>' + escapeHtml(name) + '</i></b>',
      ),
      [
        {
          type: DialogInputType.Checkbox,
          name: 'Launch Interactive Rebase in new Terminal',
          value: config.value.dialogDefaults.rebase.interactive,
        },
        {
          type: DialogInputType.Checkbox,
          name: 'Ignore Date',
          value: config.value.dialogDefaults.rebase.ignoreDate,
          info: 'Only applicable to a non-interactive rebase.',
        },
      ],
      t('yesRebase'),
      (values) => {
        const interactive = values[0] as boolean;
        runAction(
          {
            command: 'rebase',
            repo: currentRepo.value,
            obj: obj,
            actionOn: actionOn,
            ignoreDate: values[1] as boolean,
            interactive: interactive,
          } as GG.RequestMessage,
          interactive ? 'Launching Interactive Rebase' : 'Rebasing on ' + actionOn,
        );
      },
      target,
    );
  }

  /** 编辑提交消息 */
  function editCommitMessageAction(target: DialogTarget & CommitTarget) {
    const hash = target.hash;
    const commit = commits.value[commitLookup.value[hash]];

    dialog.value?.showForm(
      `Edit commit message for <b><i>${abbrevCommit(hash)}</i></b>:`,
      [
        {
          type: DialogInputType.Textarea,
          lines: 5,
          name: 'Commit Message',
          default: commit.message,
          placeholder: 'Enter the new commit message',
        },
      ],
      'Update Message',
      (values) => {
        const newMessage = values[0] as string;
        if (newMessage.trim() === '') {
          dialog.value?.showError('Commit message cannot be empty.', null, null, null);
          return;
        }
        if (newMessage === commit.message) {
          return;
        }
        runAction(
          {
            command: 'editCommitMessage',
            repo: currentRepo.value,
            commitHash: hash,
            message: newMessage,
          } as GG.RequestMessage,
          'Editing Commit Message',
        );
      },
      target,
    );
  }

  /** 通过 DOM 元素比较两个 commit（适配上下文菜单的 compare 功能） */
  function compareCommitsByElems(commitElem: HTMLElement, compareElem: HTMLElement) {
    const commitId = parseInt(commitElem.dataset.id || '0');
    const compareId = parseInt(compareElem.dataset.id || '0');
    const commitHash = commits.value[commitId]?.hash;
    const compareHash = commits.value[compareId]?.hash;
    if (commitHash && compareHash) {
      loadCommitComparison(commitId, commitHash, compareId, compareHash);
    }
  }

  /* ================================================================
   * 事件系统（键盘、表格点击/双击/右键、URL 点击、窗口大小变化）
   * ================================================================ */

  /** 获取 commit 元素对应的 commit 数据 */
  function getCommitOfElem(elem: HTMLElement): GG.GitCommit | null {
    const id = parseInt(elem.dataset.id || '-1');
    return id >= 0 && id < commits.value.length ? commits.value[id] : null;
  }

  /** 全局键盘事件处理（绑定到 document） */
  function onKeyDown(e: KeyboardEvent) {
    if (contextMenu.value?.isOpen()) {
      if (e.key === 'Escape') {
        contextMenu.value.close();
        handledEvent(e);
      }
    } else if (dialog.value?.isOpen()) {
      if (e.key === 'Escape') {
        dialog.value.close();
        handledEvent(e);
      } else if (e.keyCode ? e.keyCode === 13 : e.key === 'Enter') {
        dialog.value.submit();
        handledEvent(e);
      }
    } else if (expandedCommit.value !== null && (e.key === 'ArrowUp' || e.key === 'ArrowDown')) {
      const curHashIndex = commitLookup.value[expandedCommit.value.commitHash] ?? -1;
      let newHashIndex = -1;

      if (e.ctrlKey || e.metaKey) {
        if (e.shiftKey) {
          if (e.key === 'ArrowUp')
            newHashIndex = graph.value?.getAlternativeChildIndex(curHashIndex) ?? -1;
          else if (e.key === 'ArrowDown')
            newHashIndex = graph.value?.getAlternativeParentIndex(curHashIndex) ?? -1;
        } else {
          if (e.key === 'ArrowUp')
            newHashIndex = graph.value?.getFirstChildIndex(curHashIndex) ?? -1;
          else if (e.key === 'ArrowDown')
            newHashIndex = graph.value?.getFirstParentIndex(curHashIndex) ?? -1;
        }
      } else {
        if (e.key === 'ArrowUp' && curHashIndex > 0) newHashIndex = curHashIndex - 1;
        else if (e.key === 'ArrowDown' && curHashIndex < commits.value.length - 1)
          newHashIndex = curHashIndex + 1;
      }

      if (newHashIndex > -1) {
        handledEvent(e);
        const elem = findCommitElemWithId(getCommitElems(), newHashIndex);
        if (elem) {
          const commit = getCommitOfElem(elem);
          if (commit) loadCommitDetails(newHashIndex, commit.hash);
        }
      }
    } else if (e.key && (e.ctrlKey || e.metaKey)) {
      const key = e.key.toLowerCase();
      const keybindings = config.value.keybindings;
      if (key === keybindings.scrollToStash) {
        scrollToStash(!e.shiftKey);
        handledEvent(e);
      } else if (!e.shiftKey) {
        if (key === keybindings.refresh) {
          refresh(true, true);
          handledEvent(e);
        } else if (key === keybindings.find) {
          findWidget.value?.show(true);
          handledEvent(e);
        } else if (key === keybindings.scrollToHead && commitHead.value !== null) {
          scrollToCommit(commitHead.value, true, true);
          handledEvent(e);
        }
      }
    } else if (e.key === 'Escape') {
      if (repoDropdown.value?.isOpen()) {
        repoDropdown.value.close();
        handledEvent(e);
      } else if (branchDropdown.value?.isOpen()) {
        branchDropdown.value.close();
        handledEvent(e);
      } else if (authorDropdown.value?.isOpen()) {
        authorDropdown.value.close();
        handledEvent(e);
      } else if (settingsWidget.value?.isVisible()) {
        settingsWidget.value.close();
        handledEvent(e);
      } else if (findWidget.value?.isVisible()) {
        findWidget.value.close();
        handledEvent(e);
      } else if (expandedCommit.value !== null) {
        closeCommitDetails(true);
        handledEvent(e);
      }
    }
  }

  /** 点击 commit 行 — 展开/关闭详情或加载比较 */
  function onCommitRowClick(e: MouseEvent, commitIndex: number, commitHash: string) {
    if (expandedCommit.value !== null) {
      if (expandedCommit.value.commitHash === commitHash) {
        closeCommitDetails(true);
      } else if (e.ctrlKey || e.metaKey) {
        if (expandedCommit.value.compareWithHash === commitHash) {
          closeCommitComparison(true);
        } else {
          const curId = getCommitId(expandedCommit.value.commitHash);
          if (curId !== null)
            loadCommitComparison(curId, expandedCommit.value.commitHash, commitIndex, commitHash);
        }
      } else {
        loadCommitDetails(commitIndex, commitHash);
      }
    } else {
      loadCommitDetails(commitIndex, commitHash);
    }
  }

  /** 双击 commit 行（当前无操作，预留） */
  function onCommitRowDblClick(_e: MouseEvent, _commitIndex: number, _commitHash: string) {
    /* commit 行双击无操作 */
  }

  /** 右键 commit 行 — 显示 commit 上下文菜单 */
  function onCommitRowContextMenu(e: MouseEvent, commitIndex: number, commitHash: string) {
    const commitElem = (e.currentTarget as HTMLElement).closest('.commit') as HTMLElement;
    const commit = commits.value[commitIndex];
    if (!commit) return;

    handledEvent(e);

    const target: ContextMenuTarget & DialogTarget & CommitTarget = {
      type: TargetType.Commit,
      hash: commitHash,
      index: commitIndex,
      elem: commitElem,
    };

    let actions: ContextMenuActions;
    if (commit.hash === UNCOMMITTED) {
      actions = getUncommittedChangesContextMenuActions(target);
    } else if (commit.stash !== null) {
      target.ref = commit.stash.selector;
      actions = getStashContextMenuActions(target as RefTarget);
    } else {
      actions = getCommitContextMenuActions(target);
    }

    contextMenu.value?.show(actions, false, target, e, viewElem!);
  }

  /** 点击 gitRef 标签 — 阻止冒泡、关闭上下文菜单 */
  function onGitRefClick(e: MouseEvent, _refName: string) {
    e.stopPropagation();
    if (contextMenu.value?.isOpen()) contextMenu.value.close();
  }

  /** 双击 gitRef 标签 — checkout branch */
  function onGitRefDblClick(
    e: MouseEvent,
    commitIndex: number,
    commitHash: string,
    refElem: HTMLElement,
  ) {
    e.stopPropagation();
    closeDialogAndContextMenu();

    if (
      !refElem.classList.contains(CLASS_REF_HEAD) &&
      !refElem.classList.contains(CLASS_REF_REMOTE)
    ) {
      return;
    }

    let refName = unescapeHtml(refElem.dataset.name || '');
    let isHead = refElem.classList.contains(CLASS_REF_HEAD);
    /** 双击的目标可能是 gitRefHeadRemote 子元素 */
    const eventTarget = e.target as HTMLElement;
    let isRemoteCombinedWithHead = eventTarget.classList.contains('gitRefHeadRemote');
    let sourceElem = (refElem.children[1] || refElem) as HTMLElement;

    if (isHead && isRemoteCombinedWithHead) {
      refName = unescapeHtml(eventTarget.dataset.fullref || '');
      sourceElem = eventTarget;
      isHead = false;
    }

    const target: ContextMenuTarget & DialogTarget & RefTarget = {
      type: TargetType.Ref,
      hash: commitHash,
      index: commitIndex,
      ref: refName,
      elem: sourceElem,
    };
    checkoutBranchAction(
      refName,
      isHead ? null : (
        unescapeHtml((isRemoteCombinedWithHead ? eventTarget : refElem).dataset.remote || '')
      ),
      null,
      target,
    );
  }

  /** 右键 gitRef 标签 — 显示 ref 上下文菜单（branch/remote/tag/stash） */
  function onGitRefContextMenu(
    e: MouseEvent,
    commitIndex: number,
    commitHash: string,
    refElem: HTMLElement,
  ) {
    handledEvent(e);

    const target: ContextMenuTarget & DialogTarget & RefTarget = {
      type: TargetType.Ref,
      hash: commitHash,
      index: commitIndex,
      ref: unescapeHtml(refElem.dataset.name || ''),
      elem: (refElem.children[1] || refElem) as HTMLElement,
    };

    let actions: ContextMenuActions;
    if (refElem.classList.contains(CLASS_REF_STASH)) {
      actions = getStashContextMenuActions(target);
    } else if (refElem.classList.contains(CLASS_REF_TAG)) {
      actions = getTagContextMenuActions(refElem.dataset.tagtype === 'annotated', target);
    } else {
      let isHead = refElem.classList.contains(CLASS_REF_HEAD);
      /** 右键的目标可能是 gitRefHeadRemote 子元素 */
      const eventTarget = e.target as HTMLElement;
      let isRemoteCombinedWithHead = eventTarget.classList.contains('gitRefHeadRemote');
      if (isHead && isRemoteCombinedWithHead) {
        target.ref = unescapeHtml(eventTarget.dataset.fullref || '');
        target.elem = eventTarget;
        isHead = false;
      }
      if (isHead) {
        actions = getBranchContextMenuActions(target);
      } else {
        const remote = unescapeHtml(
          (isRemoteCombinedWithHead ? eventTarget : refElem).dataset.remote || '',
        );
        actions = getRemoteBranchContextMenuActions(remote, target);
      }
    }

    contextMenu.value?.show(actions, false, target, e, viewElem!);
  }

  /** body 点击 — 跟随内部 commit 链接 */
  function onBodyClick(e: MouseEvent) {
    if (e.target !== null && isInternalUrlElem(e.target as Element)) {
      const value = unescapeHtml((e.target as HTMLElement).dataset.value || '');
      switch ((e.target as HTMLElement).dataset.type || '') {
        case 'commit':
          if (
            typeof commitLookup.value[value] === 'number' &&
            (expandedCommit.value === null ||
              expandedCommit.value.commitHash !== value ||
              expandedCommit.value.compareWithHash !== null)
          ) {
            const id = commitLookup.value[value];
            loadCommitDetails(id, value);
          }
          break;
      }
    }
  }

  /** body 右键 — URL 上下文菜单（外部链接复制） */
  function onBodyContextMenu(e: MouseEvent) {
    if (e.target === null) return;
    if (isUrlElem(e.target as Element)) {
      if (isInternalUrlElem(e.target as Element)) {
        handledEvent(e);
        /* 内部 URL 的上下文菜单 */
      } else if (isExternalUrlElem(e.target as Element)) {
        handledEvent(e);
        const href = unescapeHtml((e.target as HTMLElement).dataset.value || '');
        contextMenu.value?.show(
          [
            [
              {
                title: t('copyLink'),
                visible: true,
                onClick: () =>
                  sendMessage({
                    command: 'copyToClipboard',
                    type: 'text',
                    data: href,
                  } as unknown as GG.RequestMessage),
              },
            ],
          ],
          false,
          null,
          e,
          viewElem!,
        );
      }
    }
  }

  /* ================================================================
   * 表格列调整 & 观察者（翻译自 mainController makeTableResizable / observe*）
   * ================================================================ */

  /** 对齐表头到控制栏（stickyHeader 开启时） */
  function alignTableHeaderToControls() {
    if (!tableColHeadersElem) {
      return;
    }
  }

  /** 将表格切换为固定布局，按 columnWidths 设置各列像素宽度 */
  function makeTableFixedLayout() {
    if (!resizeCols || !tableElem) return;
    const cols = resizeCols;
    cols[0].style.width = columnWidths[0] + 'px';
    cols[0].style.padding = '';
    for (let i = 2; i < cols.length; i++) {
      cols[i].style.width = columnWidths[parseInt(cols[i].dataset.col!)] + 'px';
    }
    tableElem.className = 'fixedLayout';
    tableElem.style.removeProperty(CSS_PROP_LIMIT_GRAPH_WIDTH);
    graph.value?.limitMaxWidth(columnWidths[0] + COLUMN_LEFT_RIGHT_PADDING);
  }

  /**
   * 初始化表格列宽与布局（由 initEngine 调用）。
   *
   * 列拖拽 mousedown 和表头右键菜单已迁移为 Vue 事件绑定
   * （CommitTable.vue 中 `@mousedown="store.startColumnResize(e, colNum)"`
   * 和 `@contextmenu="store.onTableHeaderContextMenu(e)"`），此处不再注册 addEventListener。
   */
  function makeTableResizable() {
    const colHeadersElem = document.getElementById('tableColHeaders');
    tableElem = document.getElementById('commitTable');
    tableColHeadersElem = colHeadersElem;
    if (!colHeadersElem || !tableElem) return;

    resizeCols = document.getElementsByClassName('tableColHeader') as HTMLCollectionOf<HTMLElement>;
    const cols = resizeCols;

    /** resizeCol span 已由 Vue 模板渲染，此处不再 innerHTML 注入 */

    const cWidths = gitRepos.value[currentRepo.value]?.columnWidths ?? null;
    if (cWidths === null) {
      /** 首次查看仓库时初始化自动列布局 */
      const defaults = config.value.defaultColumnVisibility;
      columnWidths = [
        COLUMN_AUTO,
        COLUMN_AUTO,
        defaults.date ? COLUMN_AUTO : COLUMN_HIDDEN,
        defaults.author ? COLUMN_AUTO : COLUMN_HIDDEN,
        defaults.commit ? COLUMN_AUTO : COLUMN_HIDDEN,
      ];
      saveColumnWidths(columnWidths);
    } else {
      columnWidths = [cWidths[0], COLUMN_AUTO, cWidths[1], cWidths[2], cWidths[3]];
    }

    if (columnWidths[0] !== COLUMN_AUTO) {
      /** 表格使用固定布局 */
      makeTableFixedLayout();
    } else {
      /** 表格使用自动布局 */
      tableElem.className = 'autoLayout';

      let colWidth = cols[0].offsetWidth;
      let graphWidth = graph.value?.getContentWidth() ?? 0;
      const maxWidth = Math.round(viewElem!.clientWidth * 0.333);
      if (Math.max(graphWidth, colWidth) > maxWidth) {
        graph.value?.limitMaxWidth(maxWidth);
        graphWidth = maxWidth;
        tableElem.className += ' limitGraphWidth';
        tableElem.style.setProperty(CSS_PROP_LIMIT_GRAPH_WIDTH, maxWidth + 'px');
      } else {
        graph.value?.limitMaxWidth(-1);
        tableElem.style.removeProperty(CSS_PROP_LIMIT_GRAPH_WIDTH);
      }

      if (colWidth < Math.max(graphWidth, 64)) {
        cols[0].style.padding =
          '6px ' +
          Math.floor((Math.max(graphWidth, 64) - (colWidth - COLUMN_LEFT_RIGHT_PADDING)) / 2) +
          'px';
      }
    }
  }

  /** eventOverlay mousemove 回调：拖拽过程中实时调整列宽 */
  const processResizingColumn: EventListener = (e) => {
    if (resizeCol > -1 && resizeCols) {
      const cols = resizeCols;
      const mouseEvent = e as MouseEvent;
      let mouseDeltaX = mouseEvent.clientX - resizeMouseX;

      if (resizeCol === 0) {
        if (columnWidths[0] + mouseDeltaX < COLUMN_MIN_WIDTH)
          mouseDeltaX = -columnWidths[0] + COLUMN_MIN_WIDTH;
        if (cols[1].clientWidth - COLUMN_LEFT_RIGHT_PADDING - mouseDeltaX < COLUMN_MIN_WIDTH)
          mouseDeltaX = cols[1].clientWidth - COLUMN_LEFT_RIGHT_PADDING - COLUMN_MIN_WIDTH;
        columnWidths[0] += mouseDeltaX;
        cols[0].style.width = columnWidths[0] + 'px';
        graph.value?.limitMaxWidth(columnWidths[0] + COLUMN_LEFT_RIGHT_PADDING);
      } else {
        const colWidth =
          resizeCol !== 1 ?
            columnWidths[resizeCol]
          : cols[1].clientWidth - COLUMN_LEFT_RIGHT_PADDING;
        let nextCol = resizeCol + 1;
        while (columnWidths[nextCol] === COLUMN_HIDDEN) nextCol++;

        if (colWidth + mouseDeltaX < COLUMN_MIN_WIDTH) mouseDeltaX = -colWidth + COLUMN_MIN_WIDTH;
        if (columnWidths[nextCol] - mouseDeltaX < COLUMN_MIN_WIDTH)
          mouseDeltaX = columnWidths[nextCol] - COLUMN_MIN_WIDTH;
        if (resizeCol !== 1) {
          columnWidths[resizeCol] += mouseDeltaX;
          cols[resizeColIndex].style.width = columnWidths[resizeCol] + 'px';
        }
        columnWidths[nextCol] -= mouseDeltaX;
        cols[resizeColIndex + 1].style.width = columnWidths[nextCol] + 'px';
      }
      resizeMouseX = mouseEvent.clientX;
    }
  };

  /** eventOverlay mouseup 回调：结束拖拽，持久化列宽 */
  const stopResizingColumn: EventListener = () => {
    if (resizeCol > -1) {
      resizeCol = -1;
      resizeColIndex = -1;
      resizeMouseX = -1;
      eventOverlay.value?.remove();
      saveColumnWidths(columnWidths);
    }
  };

  /**
   * 开始拖拽调整列宽（由 CommitTable.vue 的 resizeCol span `@mousedown` 触发）。
   */
  function startColumnResize(
    /** 鼠标按下事件 */
    e: MouseEvent,
    /** 被拖拽的列号（对应 dataset.col） */
    colNum: number,
  ) {
    if (!resizeCols) return;

    const cols = resizeCols;
    /** 如果目标列被隐藏，向左退到最近的可见列 */
    resizeCol = colNum;
    while (columnWidths[resizeCol] === COLUMN_HIDDEN) resizeCol--;
    resizeMouseX = e.clientX;

    const isAuto = columnWidths[0] === COLUMN_AUTO;
    for (let i = 0; i < cols.length; i++) {
      const curCol = parseInt(cols[i].dataset.col!);
      if (isAuto && curCol !== 1)
        columnWidths[curCol] = cols[i].clientWidth - COLUMN_LEFT_RIGHT_PADDING;
      if (curCol === resizeCol) resizeColIndex = i;
    }
    if (isAuto) makeTableFixedLayout();
    eventOverlay.value?.create('colResize', processResizingColumn, stopResizingColumn);
  }

  /**
   * 表头右键菜单：列显示/隐藏 + 提交排序方式（由 CommitTable.vue 的 `<tr> @contextmenu` 触发）。
   */
  function onTableHeaderContextMenu(
    /** 右键菜单事件 */
    e: MouseEvent,
  ) {
    handledEvent(e);

    const toggleColumnState = (colNum: number, defaultWidth: number) => {
      columnWidths[colNum] =
        columnWidths[colNum] !== COLUMN_HIDDEN ? COLUMN_HIDDEN
        : columnWidths[0] === COLUMN_AUTO ? COLUMN_AUTO
        : defaultWidth - COLUMN_LEFT_RIGHT_PADDING;
      saveColumnWidths(columnWidths);
      /** Vue 响应式：saveColumnWidths 修改 gitRepos → getColumnVisibility computed 自动重算 → CommitTable 重渲染 */
    };

    const commitOrdering = getCommitOrdering(gitRepos.value[currentRepo.value]?.commitOrdering);
    const changeCommitOrdering = (repoCommitOrdering: GG.RepoCommitOrdering) => {
      saveRepoStateValue(currentRepo.value, 'commitOrdering', repoCommitOrdering);
      refresh(true);
    };

    contextMenu.value?.show(
      [
        [
          {
            title: t('colDate'),
            visible: true,
            checked: columnWidths[2] !== COLUMN_HIDDEN,
            onClick: () => toggleColumnState(2, 128),
          },
          {
            title: t('colAuthor'),
            visible: true,
            checked: columnWidths[3] !== COLUMN_HIDDEN,
            onClick: () => toggleColumnState(3, 128),
          },
          {
            title: t('colCommit'),
            visible: true,
            checked: columnWidths[4] !== COLUMN_HIDDEN,
            onClick: () => toggleColumnState(4, 80),
          },
        ],
        [
          {
            title: 'Commit Timestamp Order',
            visible: true,
            checked: commitOrdering === GG.CommitOrdering.Date,
            onClick: () => changeCommitOrdering(GG.RepoCommitOrdering.Date),
          },
          {
            title: 'Author Timestamp Order',
            visible: true,
            checked: commitOrdering === GG.CommitOrdering.AuthorDate,
            onClick: () => changeCommitOrdering(GG.RepoCommitOrdering.AuthorDate),
          },
          {
            title: 'Topological Order',
            visible: true,
            checked: commitOrdering === GG.CommitOrdering.Topological,
            onClick: () => changeCommitOrdering(GG.RepoCommitOrdering.Topological),
          },
        ],
      ],
      true,
      null,
      e,
      viewElem!,
    );
  }

  /** 观察窗口大小变化 — 重新渲染 graph + 对齐表头 */
  function observeWindowSizeChanges() {
    let windowWidth = window.outerWidth;
    let windowHeight = window.outerHeight;
    window.addEventListener('resize', () => {
      if (windowWidth === window.outerWidth && windowHeight === window.outerHeight) {
        graph.value?.render(expandedCommit.value);
      } else {
        windowWidth = window.outerWidth;
        windowHeight = window.outerHeight;
      }

      if (config.value.stickyHeader) {
        alignTableHeaderToControls();
      }
    });
  }

  /** 观察 VSCode webview 样式变化（字体、颜色主题切换） */
  function observeWebviewStyleChanges() {
    let fontFamily = getVSCodeStyle(CSS_PROP_FONT_FAMILY);
    let editorFontFamily = getVSCodeStyle(CSS_PROP_EDITOR_FONT_FAMILY);
    let findMatchColour = getVSCodeStyle(CSS_PROP_FIND_MATCH_HIGHLIGHT_BACKGROUND);
    let selectionBackgroundColor = !!getVSCodeStyle(CSS_PROP_SELECTION_BACKGROUND);

    const setFlashColour = (colour: string) => {
      document.body.style.setProperty('--git-graph-flashPrimary', modifyColourOpacity(colour, 0.7));
      document.body.style.setProperty(
        '--git-graph-flashSecondary',
        modifyColourOpacity(colour, 0.5),
      );
    };
    const setSelectionBackgroundColorExists = () => {
      alterClass(document.body, 'selection-background-color-exists', selectionBackgroundColor);
    };

    findWidget.value?.setColour(findMatchColour);
    setFlashColour(findMatchColour);
    setSelectionBackgroundColorExists();

    new MutationObserver(() => {
      const ff = getVSCodeStyle(CSS_PROP_FONT_FAMILY);
      const eff = getVSCodeStyle(CSS_PROP_EDITOR_FONT_FAMILY);
      const fmc = getVSCodeStyle(CSS_PROP_FIND_MATCH_HIGHLIGHT_BACKGROUND);
      const sbc = !!getVSCodeStyle(CSS_PROP_SELECTION_BACKGROUND);

      if (ff !== fontFamily || eff !== editorFontFamily) {
        fontFamily = ff;
        editorFontFamily = eff;
        repoDropdown.value?.refresh();
        branchDropdown.value?.refresh();
        authorDropdown.value?.refresh();
        tagDropdown.value?.refresh();
      }
      if (fmc !== findMatchColour) {
        findMatchColour = fmc;
        findWidget.value?.setColour(findMatchColour);
        setFlashColour(findMatchColour);
      }
      if (selectionBackgroundColor !== sbc) {
        selectionBackgroundColor = sbc;
        setSelectionBackgroundColorExists();
      }
    }).observe(document.documentElement, { attributes: true, attributeFilter: ['style'] });
  }

  /** 观察 view 滚动 — 自动加载更多 commits、保存 scrollTop */
  function observeViewScroll() {
    if (!viewElem) return;
    let active = viewElem.scrollTop > 0;
    let timeout: number | null = null;

    viewElem.addEventListener('scroll', () => {
      const curScrollTop = viewElem!.scrollTop;
      if (active !== curScrollTop > 0) {
        active = curScrollTop > 0;
      }

      if (
        config.value.loadMoreCommitsAutomatically &&
        moreCommitsAvailable.value &&
        !refreshState.value.inProgress
      ) {
        const viewHeight = viewElem!.clientHeight;
        const contentHeight = viewElem!.scrollHeight;
        if (
          curScrollTop > 0 &&
          viewHeight > 0 &&
          contentHeight > 0 &&
          curScrollTop + viewHeight >= contentHeight - 25
        ) {
          /** 用户滚动到底部 25px 内，自动加载更多 commits */
          loadMoreCommits();
        }
      }

      if (timeout !== null) clearTimeout(timeout);
      timeout = window.setTimeout(() => {
        scrollTop.value = curScrollTop;
        saveState();
        timeout = null;
      }, 250);
    });
  }

  /** 滚动到 stash */
  function scrollToStash(next: boolean) {
    const stashCommits: number[] = [];
    for (let i = 0; i < commits.value.length; i++) {
      if (commits.value[i].stash !== null) stashCommits.push(i);
    }
    if (stashCommits.length === 0) return;

    let targetIdx: number;
    if (next) {
      const first = stashCommits[0];
      targetIdx = stashCommits.find((idx) => idx > (expandedCommit.value?.index ?? -1)) ?? first;
    } else {
      const last = stashCommits[stashCommits.length - 1];
      const reversed = [...stashCommits].reverse();
      targetIdx = reversed.find((idx) => idx < (expandedCommit.value?.index ?? Infinity)) ?? last;
    }

    const elem = findCommitElemWithId(getCommitElems(), targetIdx);
    if (elem) {
      const commit = getCommitOfElem(elem);
      if (commit) {
        scrollToCommit(commit.hash, false, false);
        loadCommitDetails(targetIdx, commit.hash);
      }
    }
  }

  /* ================================================================
   * 初始化引擎（由 App.vue onMounted 调用）
   * ================================================================ */

  function initEngine(viewEl: HTMLElement) {
    viewElem = viewEl;

    /* i18n */
    initI18n(config.value.language, vscodeLanguage);

    /* TextFormatter emoji 注册 */
    TextFormatter.registerCustomEmojiMappings(config.value.customEmojiShortcodeMappings);

    /* 创建引擎实例（markRaw 避免 Vue 响应式包裹） */
    const overlay = markRaw(new EventOverlay());
    eventOverlay.value = overlay;

    contextMenu.value = markRaw(new ContextMenu());
    dialog.value = markRaw(new Dialog(overlay, closeDialogAndContextMenu));
    imageResizer.value = markRaw(new ImageResizer());

    /* Graph SVG 引擎 */
    graph.value = markRaw(
      new Graph(
        'commitGraph',
        viewEl,
        config.value.graph,
        config.value.mute,
        config.value.referenceLabels.combineLocalAndRemoteBranchLabels,
      ),
    );

    /* Dropdown */
    repoDropdown.value = markRaw(
      new Dropdown('repoDropdown', true, false, t('repo'), (values) => loadRepo(values[0])),
    );
    branchDropdown.value = markRaw(
      new Dropdown('branchDropdown', false, true, t('branch'), (values) => {
        currentBranches.value = values;
        maxCommits.value = config.value.initialLoadCommits;
        saveState();
        clearCommits();
        requestLoadRepoInfoAndCommits(true, true);
      }),
    );
    authorDropdown.value = markRaw(
      new Dropdown('authorDropdown', false, true, t('author'), (values) => {
        currentAuthors.value = values;
        maxCommits.value = config.value.initialLoadCommits;
        saveState();
        clearCommits();
        requestLoadRepoInfoAndCommits(true, true);
      }),
    );
    tagDropdown.value = markRaw(
      new Dropdown('tagDropdown', false, true, t('tag'), (values) => {
        currentTags.value = values;
        maxCommits.value = config.value.initialLoadCommits;
        saveState();
        clearCommits();
        requestLoadRepoInfoAndCommits(true, true);
      }),
    );

    /* FindWidget / SettingsWidget — 创建 GitGraphView adapter 传入 */
    const ggInterface: GitGraphView = {
      saveState: () => saveState(),
      getCommits: () => commits.value,
      getCommitId: (hash: string) => getCommitId(hash),
      getColumnVisibility: () => getColumnVisibility(),
      isCdvOpen: (commitHash: string, file: string | null) => {
        if (!expandedCommit.value || expandedCommit.value.commitHash !== commitHash) return false;
        return file === null || expandedCommit.value.lastViewedFile === file;
      },
      loadCommitDetails: (commitElem: HTMLElement) => {
        const id = parseInt(commitElem.dataset.id || '0');
        const hash = commits.value[id]?.hash;
        if (hash) loadCommitDetails(id, hash);
      },
      scrollToCommit: (commitHash: string, _highlight: boolean) =>
        scrollToCommit(commitHash, true, false),
      getBranches: () => gitBranches.value,
      getBranchOptions: (includeShowAll?: boolean) => getBranchOptions(includeShowAll),
      getRepoConfig: () => gitConfig.value,
      getRepoState: (repo: string) => getRepoState(repo),
      isConfigLoading: () => refreshState.value.requestingConfig,
      refresh: (hard: boolean, configChanges?: boolean) => refresh(hard, configChanges),
      renderRepoDropdownOptions: () => {
        /* TODO: Dropdown 渲染由 Vue 接管，此方法可空实现 */
      },
      requestLoadConfig: () => requestLoadConfig(),
      saveRepoStateValue: (repo: string, key, value) =>
        saveRepoStateValue(repo, key as never, value as never),
    };

    findWidget.value = markRaw(new FindWidget(ggInterface));
    settingsWidget.value = markRaw(
      new SettingsWidget(ggInterface, dialog.value as Dialog, runAction),
    );

    /* 恢复或初始化状态 */
    const prevState = getViewState<WebViewState>();
    if (prevState && !prevState.currentRepoLoading && gitRepos.value[prevState.currentRepo]) {
      currentRepo.value = prevState.currentRepo;
      currentBranches.value = prevState.currentBranches;
      currentAuthors.value = prevState.currentAuthors;
      currentTags.value = prevState.currentTags;
      maxCommits.value = prevState.maxCommits;
      expandedCommit.value = prevState.expandedCommit;
      avatars.value = prevState.avatars;
      gitConfig.value = prevState.gitConfig;
      loadRepoInfo(
        prevState.gitBranches,
        prevState.gitBranchHead,
        prevState.gitRemotes,
        prevState.gitStashes,
        true,
      );
      loadCommits(
        prevState.commits,
        prevState.commitHead,
        prevState.gitTags,
        prevState.moreCommitsAvailable,
        prevState.onlyFollowFirstParent,
      );
      showRemoteBranches.value = getShowRemoteBranches(
        gitRepos.value[prevState.currentRepo].showRemoteBranchesV2,
      );
    }

    if (!loadRepos(gitRepos.value, initialState.lastActiveRepo, loadViewTo)) {
      if (prevState) {
        scrollTop.value = prevState.scrollTop;
        viewEl.scroll(0, scrollTop.value);
      }
      requestLoadRepoInfoAndCommits(false, false);
    }

    /* 注册消息监听 */
    window.addEventListener('message', (event) => {
      handleResponseMessage(event.data as GG.ResponseMessage);
    });

    /* ===== 事件系统 ===== */
    document.addEventListener('keydown', onKeyDown);
    /* 表格点击/双击/右键、URL 点击/右键已迁移为 Vue 模板事件绑定
     * （CommitTable.vue @click/@dblclick/@contextmenu, App.vue @click/@contextmenu） */

    /* ===== 观察者 & 表格列调整 ===== */
    makeTableResizable();
    observeViewScroll();
    observeWebviewStyleChanges();
    observeWindowSizeChanges();

    /* 设置全局 CSS 变量 */
    document.body.style.setProperty('--git-graph-fontSize', config.value.graph.fontSize + 'px');
    document.body.style.setProperty('--git-graph-rowHeight', config.value.graph.rowHeight + 'px');
  }

  /* ================================================================
   * 类型导出
   * ================================================================ */

  return {
    // Config
    config,
    // State
    gitRepos,
    currentRepo,
    currentRepoLoading,
    gitBranches,
    gitBranchHead,
    gitConfig,
    gitRemotes,
    gitStashes,
    gitTags,
    commits,
    commitHead,
    commitLookup,
    moreCommitsAvailable,
    maxCommits,
    onlyFollowFirstParent,
    currentBranches,
    currentAuthors,
    currentTags,
    avatars,
    expandedCommit,
    scrollTop,
    showRemoteBranches,
    refreshState,
    // Engine refs
    graph,
    repoDropdown,
    branchDropdown,
    authorDropdown,
    tagDropdown,
    contextMenu,
    dialog,
    findWidget,
    settingsWidget,
    // Computed
    numCommits,
    hasRepo,
    currentRepoData,
    isRefreshing,
    commitRows,
    pendingScrollTo,
    // Methods
    t,
    getCommitId,
    getBranchOptions,
    getAuthorOptions,
    getTagOptions,
    getColumnVisibility,
    getRepoState,
    loadRepos,
    loadRepo,
    refresh,
    loadMoreCommits,
    requestLoadConfig,
    requestCommitDetails,
    requestCommitComparison,
    fetchFromRemotes,
    scrollToCommit,
    loadCommitDetails,
    loadCommitComparison,
    closeCommitDetails,
    closeCommitComparison,
    showCommitDetails,
    showCommitComparison,
    isCdvDocked,
    cdvHeightPx,
    isCdvOpen,
    getNumColumns,
    startCdvHeightResize,
    startCdvDividerDrag,
    startColumnResize,
    onTableHeaderContextMenu,
    onCommitRowClick,
    onCommitRowDblClick,
    onCommitRowContextMenu,
    onGitRefClick,
    onGitRefDblClick,
    onGitRefContextMenu,
    onBodyClick,
    onBodyContextMenu,
    viewFileDiff,
    showFileContextMenu,
    onCdvCodeReviewClick,
    onCdvExternalDiffClick,
    startCodeReview,
    endCodeReview,
    renderTagDetails,
    getCommitOrder,
    getFileViewType,
    changeFileViewType,
    openFolders,
    saveState,
    saveRepoState,
    saveRepoStateValue,
    handleResponseMessage,
    initEngine,
    runAction,
    // Context Menu Actions
    getBranchContextMenuActions,
    getCommitContextMenuActions,
    getRemoteBranchContextMenuActions,
    getStashContextMenuActions,
    getTagContextMenuActions,
    getUncommittedChangesContextMenuActions,
    getViewIssueAction,
    // Git Actions
    getPushRemote,
    addTagAction,
    checkoutBranchAction,
    createBranchAction,
    deleteTagAction,
    fetchFromRemotesAction,
    mergeAction,
    rebaseAction,
    editCommitMessageAction,
    compareCommitsByElems,
    scrollToStash,
  };
});

/* ================================================================
 * 类型定义（供 Vue 组件使用）
 * ================================================================ */

export interface CommitRowData {
  index: number;
  hash: string;
  shortHash: string;
  subject: string;
  body: string;
  date: string;
  dateTitle: string;
  author: string;
  email: string;
  avatar: string | null;
  isCurrent: boolean;
  isHead: boolean;
  isMuted: boolean;
  colour: number;
  branchCheckedOutAtCommit: string | null;
  refBranches: RefLabel[];
  refTags: RefLabel[];
  isUncommitted: boolean;
}

export interface RefLabel {
  type: 'head' | 'remote' | 'tag' | 'stash';
  name: string;
  isActive?: boolean;
  remote?: string | null;
  remotes?: string[];
  annotated?: boolean;
}
