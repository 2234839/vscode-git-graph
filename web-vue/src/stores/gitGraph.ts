import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import type { GitCommit, GitRepoSet } from 'backend-types';

/**
 * Git Graph 主 Store
 *
 * 管理应用的核心状态：仓库列表、当前仓库、提交列表等。
 * 替代原 main.ts 中 GitGraphView class 的 60+ 个实例字段。
 */
export const useGitGraphStore = defineStore('gitGraph', () => {
  /* ---- 仓库状态 ---- */
  const gitRepos = ref<GitRepoSet>({});
  const currentRepo = ref<string>('');
  const currentRepoLoading = ref(true);

  /* ---- Git 数据 ---- */
  const gitBranches = ref<ReadonlyArray<string>>([]);
  const gitBranchHead = ref<string | null>(null);
  const gitRemotes = ref<ReadonlyArray<string>>([]);
  const gitStashes = ref<ReadonlyArray<unknown>>([]);
  const gitTags = ref<ReadonlyArray<string>>([]);

  /* ---- 提交数据 ---- */
  const commits = ref<GitCommit[]>([]);
  const commitHead = ref<string | null>(null);
  const commitLookup = ref<{ [hash: string]: number }>({});
  const moreCommitsAvailable = ref(false);
  const maxCommits = ref(0);
  const onlyFollowFirstParent = ref(false);

  /* ---- 过滤器 ---- */
  const currentBranches = ref<string[] | null>(null);
  const currentAuthors = ref<string[] | null>(null);
  const currentTags = ref<string[] | null>(null);

  /* ---- 头像 ---- */
  const avatars = ref<{ [email: string]: string }>({});

  /* ---- 计算属性 ---- */
  const numCommits = computed(() => commits.value.length);
  const hasRepo = computed(() => Object.keys(gitRepos.value).length > 0);
  const currentRepoData = computed(() =>
    currentRepo.value ? gitRepos.value[currentRepo.value] : null
  );

  /* ---- Actions ---- */
  function setRepos(repos: GitRepoSet) {
    gitRepos.value = repos;
  }

  function setCurrentRepo(repo: string) {
    currentRepo.value = repo;
  }

  function setCommits(newCommits: GitCommit[]) {
    commits.value = newCommits;
    // 重建 lookup
    commitLookup.value = {};
    for (let i = 0; i < newCommits.length; i++) {
      commitLookup.value[newCommits[i].hash] = i;
    }
  }

  function loadAvatar(email: string, image: string) {
    avatars.value[email] = image;
  }

  return {
    // State
    gitRepos,
    currentRepo,
    currentRepoLoading,
    gitBranches,
    gitBranchHead,
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
    // Getters
    numCommits,
    hasRepo,
    currentRepoData,
    // Actions
    setRepos,
    setCurrentRepo,
    setCommits,
    loadAvatar,
  };
});
