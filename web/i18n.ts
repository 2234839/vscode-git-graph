/* i18n: Internationalization module for Git Graph WebView */

type Language = 'zh' | 'en';

/** The active UI language (defaults to 'zh' for Chinese-first extension). */
let activeLanguage: Language = 'zh';

/** Translation entries. */
type Entry = { zh: string; en: string };

/**
 * Master translation table.
 * Key = semantic identifier, Value = { zh, en }.
 */
const STRINGS: Record<string, Entry> = {
	// === Common buttons / words ===
	cancel: { zh: '取消', en: 'Cancel' },
	close: { zh: '关闭', en: 'Close' },
	save: { zh: '保存', en: 'Save' },
	edit: { zh: '编辑', en: 'Edit' },
	remove: { zh: '移除', en: 'Remove' },
	delete: { zh: '删除', en: 'Delete' },
	add: { zh: '添加', en: 'Add' },
	retry: { zh: '重试', en: 'Retry' },
	refresh: { zh: '刷新', en: 'Refresh' },
	name: { zh: '名称', en: 'Name' },
	type: { zh: '类型', en: 'Type' },
	optional: { zh: '可选', en: 'Optional' },
	all: { zh: '全部', en: 'All' },
	loading: { zh: '加载中 ...', en: 'Loading ...' },
	loadingEllipsis: { zh: '加载中...', en: 'Loading...' },
	notSet: { zh: '未设置', en: 'Not Set' },
	local: { zh: '本地', en: 'Local' },
	global: { zh: '全局', en: 'Global' },
	back: { zh: '返回', en: 'Back' },
	next: { zh: '下一步', en: 'Next' },
	prev: { zh: '上一步', en: 'Previous' },

	// === Top toolbar ===
	repo: { zh: '仓库', en: 'Repository' },
	branch: { zh: '分支', en: 'Branch' },
	author: { zh: '作者', en: 'Author' },
	tag: { zh: '标签', en: 'Tag' },
	current: { zh: '当前', en: 'Current' },
	find: { zh: '查找', en: 'Find' },
	repoSettings: { zh: '仓库设置', en: 'Repository Settings' },
	openTerminal: { zh: '为此仓库打开终端', en: 'Open Terminal for this Repository' },
	showRemoteBranches: { zh: '显示远程分支', en: 'Show Remote Branches' },
	fetchFromRemote: { zh: '从远程获取', en: 'Fetch from Remote' },
	fetchAndPrune: { zh: '从远程获取并清理', en: 'Fetch from Remote & Prune' },
	refreshing: { zh: '正在刷新', en: 'Refreshing' },
	openingTerminal: { zh: '正在打开终端', en: 'Opening Terminal' },

	// === Table ===
	colGraph: { zh: '图形', en: 'Graph' },
	colDescription: { zh: '描述', en: 'Description' },
	colDate: { zh: '日期', en: 'Date' },
	colAuthor: { zh: '作者', en: 'Author' },
	colCommit: { zh: '提交', en: 'Commit' },
	loadMoreCommits: { zh: '加载更多提交', en: 'Load More Commits' },

	// === Commit details ===
	objDetail: { zh: '对象: ', en: 'Object: ' },
	commitDetail: { zh: '提交: ', en: 'Commit: ' },
	tagCreator: { zh: '标签创建者: ', en: 'Tag Created By: ' },
	dateLabel: { zh: '日期: ', en: 'Date: ' },
	branchCheckedOutAtCommit: { zh: '分支 {0} 当前已检出至此提交', en: 'Branch {0} is currently checked out at this commit' },
	commitCheckedOut: { zh: '此提交当前已检出', en: 'This commit is currently checked out' },

	// === Dialog ===
	invalidInput: { zh: '无法{0}，输入了一个或多个无效字符。', en: 'Unable to {0}, one or more invalid characters were entered.' },
	errorPrefix: { zh: '错误：', en: 'Error: ' },
	compareBranch: { zh: '比较分支', en: 'Compare Branch' },
	noBranchesToCompare: { zh: '没有其他本地分支可比较。', en: 'There are no other local branches to compare with.' },
	selectBranchToCompare: { zh: '选择要比较的分支 {0}：', en: 'Select a branch to compare with {0}:' },
	compareBtn: { zh: '比较', en: 'Compare' },
	compareBranchNotFound: { zh: '在当前视图中找不到所选分支的提交。请尝试加载更多提交。', en: 'The commits of the selected branch could not be found in the current view. Please try loading more commits.' },

	// === Branch context menu ===
	checkoutBranch: { zh: '检出分支', en: 'Checkout Branch' },
	compareDots: { zh: '比较...', en: 'Compare...' },
	renameBranch: { zh: '重命名分支', en: 'Rename Branch' },
	enterBranchNewName: { zh: '输入分支 {0} 的新名称：', en: 'Enter the new name of branch {0}:' },
	renamingBranch: { zh: '正在重命名分支', en: 'Renaming Branch' },
	createBranch: { zh: '创建分支', en: 'Create Branch' },
	deleteBranch: { zh: '删除分支', en: 'Delete Branch' },
	forceDelete: { zh: '强制删除', en: 'Force Delete' },
	deleteOnRemote: { zh: '在远程删除此分支', en: 'Delete this branch on the remote' },
	confirmDeleteBranch: { zh: '确定要删除分支 {0} 吗？', en: 'Are you sure you want to delete branch {0}?' },
	yesDelete: { zh: '是，删除', en: 'Yes, Delete' },
	deletingBranch: { zh: '正在删除分支', en: 'Deleting Branch' },
	mergeIntoCurrent: { zh: '合并到当前分支', en: 'Merge into Current Branch' },
	rebaseCurrentOntoBranch: { zh: '将当前分支变基到分支', en: 'Rebase Current Branch onto Branch' },
	pushBranch: { zh: '推送分支', en: 'Push Branch' },
	setUpstream: { zh: '设置上游', en: 'Set Upstream' },
	pushMode: { zh: '推送模式', en: 'Push Mode' },
	pushNormal: { zh: '普通', en: 'Normal' },
	forceWithLease: { zh: '强制（带租约）', en: 'Force (with lease)' },
	force: { zh: '强制', en: 'Force' },
	pushToRemote: { zh: '推送到远程', en: 'Push to Remote' },
	confirmPushBranch: { zh: '确定要推送分支 {0} 到远程 {1} 吗？', en: 'Are you sure you want to push branch {0} to remote {1}?' },
	confirmPushBranchMulti: { zh: '确定要推送分支 {0} 吗？', en: 'Are you sure you want to push branch {0}?' },
	yesPush: { zh: '是，推送', en: 'Yes, Push' },
	pushingBranch: { zh: '正在推送分支', en: 'Pushing Branch' },
	pullBranch: { zh: '拉取分支', en: 'Pull Branch' },
	pullIntoCurrent: { zh: '拉取到当前分支', en: 'Pull into Current Branch' },
	confirmUpdateLocal: { zh: '确定要用 {0} 的最新更改更新本地分支 {1} 吗？', en: 'Are you sure you want to update the local branch {1} with the latest changes from {0}?' },
	forceUpdate: { zh: '强制更新', en: 'Force Update' },
	yesUpdate: { zh: '是，更新', en: 'Yes, Update' },
	updatingBranch: { zh: '正在更新分支', en: 'Updating Branch' },
	createPullRequest: { zh: '创建 Pull Request', en: 'Create Pull Request' },
	confirmCreatePR: { zh: '确定要为分支 {0} 创建 Pull Request 吗？', en: 'Are you sure you want to create a Pull Request for branch {0}?' },
	pushBeforePR: { zh: '创建 Pull Request 前先推送分支', en: 'Push branch before creating Pull Request' },
	yesCreatePR: { zh: '是，创建 Pull Request', en: 'Yes, Create Pull Request' },
	creatingPR: { zh: '正在创建 Pull Request', en: 'Creating Pull Request' },
	createArchive: { zh: '创建归档', en: 'Create Archive' },
	creatingArchive: { zh: '正在创建归档', en: 'Creating Archive' },
	selectInBranchesDropdown: { zh: '在分支下拉菜单中选中', en: 'Select in Branches Dropdown' },
	unselectInBranchesDropdown: { zh: '在分支下拉菜单中取消选中', en: 'Unselect in Branches Dropdown' },
	copyBranchName: { zh: '复制分支名到剪贴板', en: 'Copy Branch Name to Clipboard' },
	copyBranchNameType: { zh: '分支名', en: 'Branch Name' },
	addTag: { zh: '添加标签', en: 'Add Tag' },
	checkoutDots: { zh: '检出', en: 'Checkout' },
	checkingOutCommit: { zh: '正在检出提交', en: 'Checking Out Commit' },
	confirmCheckoutCommit: { zh: '确定要检出提交 {0} 吗？这将导致\'分离头指针（detached HEAD）\'状态。', en: 'Are you sure you want to checkout commit {0}? This will result in a \'detached HEAD\' state.' },
	alwaysConfirm: { zh: '始终确认', en: 'Always Confirm' },
	yesCheckout: { zh: '是，检出', en: 'Yes, Checkout' },
	cherryPick: { zh: '拣选', en: 'Cherry Pick' },
	parentCommitHash: { zh: '父提交哈希', en: 'Parent Commit Hash' },
	recordOrigin: { zh: '记录来源', en: 'Record Origin' },
	noCommit: { zh: '不提交', en: 'No Commit' },
	confirmCherryPick: { zh: '确定要拣选提交 {0} 吗？', en: 'Are you sure you want to cherry pick commit {0}?' },
	yesCherryPick: { zh: '是，拣选', en: 'Yes, Cherry Pick' },
	cherryPickingCommit: { zh: '正在拣选提交', en: 'Cherry Picking Commit' },
	revert: { zh: '还原', en: 'Revert' },
	confirmRevertMerge: { zh: '确定要还原合并提交 {0} 吗？选择主分支上的父提交哈希，以相对于该提交进行还原：', en: 'Are you sure you want to revert merge commit {0}? Select the parent commit hash on the main branch to revert relative to:' },
	yesRevert: { zh: '是，还原', en: 'Yes, Revert' },
	revertingCommit: { zh: '正在还原提交', en: 'Reverting Commit' },
	confirmRevertCommit: { zh: '确定要还原提交 {0} 吗？', en: 'Are you sure you want to revert commit {0}?' },
	undoLastCommit: { zh: '重置上次提交（软重置）', en: 'Undo Last Commit (Soft Reset)' },
	confirmUndoLast: { zh: '确定要重置上次提交吗？这会将提交的所有更改保留为未提交的更改。', en: 'Are you sure you want to undo the last commit? This will keep all changes of the commit as uncommitted changes.' },
	yesUndoLast: { zh: '是，重置上次提交', en: 'Yes, Undo Last Commit' },
	undoingLastCommit: { zh: '正在重置上次提交', en: 'Undoing Last Commit' },
	editCommitMessage: { zh: '编辑提交信息', en: 'Edit Commit Message' },
	drop: { zh: '丢弃', en: 'Drop' },
	confirmDropCommit: { zh: '确定要永久丢弃提交 {0} 吗？', en: 'Are you sure you want to permanently drop commit {0}?' },
	dropCommitWarning: { zh: '注意：启用"仅跟踪提交的第一个父提交"后，可能会有一些提交从 Git Graph 视图中隐藏，这可能会影响执行此操作的结果。', en: 'Note: Enabling "Only Follow the First Parent of Commits" may hide some commits from the Git Graph View, which could affect the outcome of this action.' },
	yesDrop: { zh: '是，丢弃', en: 'Yes, Drop' },
	droppingCommit: { zh: '正在丢弃提交', en: 'Dropping Commit' },
	rebaseCurrentOntoCommit: { zh: '将当前分支变基到此提交', en: 'Rebase Current Branch onto this Commit' },
	resetCurrentToCommit: { zh: '将当前分支重置到此提交', en: 'Reset Current Branch to this Commit' },
	confirmResetToCommit: { zh: '确定要将{0}重置到提交 {1} 吗？', en: 'Are you sure you want to reset {0} to commit {1}?' },
	currentBranchLabel: { zh: '当前分支', en: 'the current branch' },
	resetSoft: { zh: '软 - 保留所有更改，但重置 HEAD', en: 'Soft - Keep all changes, but reset HEAD' },
	resetMixed: { zh: '混合 - 保留工作区，但重置索引', en: 'Mixed - Keep the working tree, but reset the index' },
	resetHard: { zh: '硬 - 丢弃所有更改', en: 'Hard - Discard all changes' },
	yesReset: { zh: '是，重置', en: 'Yes, Reset' },
	resettingToCommit: { zh: '正在重置到提交', en: 'Resetting to Commit' },
	copyCommitHash: { zh: '复制提交哈希到剪贴板', en: 'Copy Commit Hash to Clipboard' },
	copyCommitHashType: { zh: '提交哈希', en: 'Commit Hash' },
	copyCommitSubject: { zh: '复制提交主题到剪贴板', en: 'Copy Commit Subject to Clipboard' },
	copyCommitSubjectType: { zh: '提交主题', en: 'Commit Subject' },

	// === Remote Branch context menu ===
	deleteRemoteBranch: { zh: '删除远程分支', en: 'Delete Remote Branch' },
	confirmDeleteRemoteBranch: { zh: '确定要删除远程分支 {0} 吗？', en: 'Are you sure you want to delete the remote branch {0}?' },
	deletingRemoteBranch: { zh: '正在删除远程分支', en: 'Deleting Remote Branch' },
	fetchIntoLocalBranch: { zh: '获取到本地分支', en: 'Fetch into Local Branch' },
	confirmFetchIntoLocal: { zh: '确定要将远程分支 {0} 获取到本地分支 {1} 吗？', en: 'Are you sure you want to fetch the remote branch {0} into local branch {1}?' },
	forceFetch: { zh: '强制获取', en: 'Force Fetch' },
	yesFetch: { zh: '是，获取', en: 'Yes, Fetch' },
	fetchingBranch: { zh: '正在获取分支', en: 'Fetching Branch' },
	confirmPullRemote: { zh: '确定要将远程分支 {0} 拉取到{1}吗？如果需要合并：', en: 'Are you sure you want to pull the remote branch {0} into {1}? If a merge is required:' },
	createNewCommitEvenFF: { zh: '即使可以快进也创建新提交', en: 'Create a new commit even if fast-forward is possible' },
	squashCommits: { zh: '压缩提交', en: 'Squash Commits' },
	yesPull: { zh: '是，拉取', en: 'Yes, Pull' },
	pullingBranch: { zh: '正在拉取分支', en: 'Pulling Branch' },

	// === Stash context menu ===
	applyStash: { zh: '应用储藏', en: 'Apply Stash' },
	confirmApplyStash: { zh: '确定要应用储藏 {0} 吗？', en: 'Are you sure you want to apply stash {0}?' },
	reinstateIndex: { zh: '恢复索引', en: 'Reinstate Index' },
	yesApplyStash: { zh: '是，应用储藏', en: 'Yes, Apply Stash' },
	applyingStash: { zh: '正在应用储藏', en: 'Applying Stash' },
	createBranchFromStash: { zh: '从储藏创建分支', en: 'Create Branch from Stash' },
	createBranchFromStashMsg: { zh: '从储藏 {0} 创建分支，名称为：', en: 'Create a branch from stash {0}, with name:' },
	creatingBranch: { zh: '正在创建分支', en: 'Creating Branch' },
	popStash: { zh: '弹出储藏', en: 'Pop Stash' },
	confirmPopStash: { zh: '确定要弹出储藏 {0} 吗？', en: 'Are you sure you want to pop stash {0}?' },
	yesPopStash: { zh: '是，弹出储藏', en: 'Yes, Pop Stash' },
	poppingStash: { zh: '正在弹出储藏', en: 'Popping Stash' },
	dropStash: { zh: '丢弃储藏', en: 'Drop Stash' },
	confirmDropStash: { zh: '确定要丢弃储藏 {0} 吗？', en: 'Are you sure you want to drop stash {0}?' },
	yesDropStash: { zh: '是，丢弃', en: 'Yes, Drop' },
	droppingStash: { zh: '正在丢弃储藏', en: 'Dropping Stash' },
	copyStashName: { zh: '复制储藏名到剪贴板', en: 'Copy Stash Name to Clipboard' },
	stashNameType: { zh: '储藏名', en: 'Stash Name' },
	copyStashHash: { zh: '复制储藏哈希到剪贴板', en: 'Copy Stash Hash to Clipboard' },
	stashHashType: { zh: '储藏哈希', en: 'Stash Hash' },

	// === Tag context menu ===
	viewDetails: { zh: '查看详情', en: 'View Details' },
	fetchingTagDetails: { zh: '正在获取标签详情', en: 'Fetching Tag Details' },
	deleteTag: { zh: '删除标签', en: 'Delete Tag' },
	confirmDeleteTag: { zh: '确定要删除标签 {0} 吗？', en: 'Are you sure you want to delete tag {0}?' },
	dontDeleteAnyRemote: { zh: '不在任何远程上删除', en: 'Don\'t delete on any remote' },
	alsoDeleteOnRemoteQ: { zh: '是否还要在远程上删除此标签：', en: 'Would you also like to delete it on a remote:' },
	alsoDeleteOnRemote: { zh: '同时在远程删除', en: 'Also delete on remote' },
	pushTag: { zh: '推送标签', en: 'Push Tag' },
	confirmPushTag: { zh: '确定要将标签 {0} 推送到远程 {1} 吗？', en: 'Are you sure you want to push tag {0} to remote {1}?' },
	confirmPushTagMulti: { zh: '确定要推送标签 {0} 吗？选择要推送标签到的远程：', en: 'Are you sure you want to push tag {0}? Select the remotes you want to push the tag to:' },
	pushingTag: { zh: '正在推送标签', en: 'Pushing Tag' },
	copyTagName: { zh: '复制标签名到剪贴板', en: 'Copy Tag Name to Clipboard' },
	tagNameType: { zh: '标签名', en: 'Tag Name' },

	// === Uncommitted changes context menu ===
	stashUncommitted: { zh: '储藏未提交的更改', en: 'Stash Uncommitted Changes' },
	confirmStashUncommitted: { zh: '确定要储藏<b>未提交的更改</b>吗？', en: 'Are you sure you want to stash the <b>uncommitted changes</b>?' },
	message: { zh: '信息', en: 'Message' },
	includeUntracked: { zh: '包含未跟踪文件', en: 'Include Untracked Files' },
	yesStash: { zh: '是，储藏', en: 'Yes, Stash' },
	stashingUncommitted: { zh: '正在储藏未提交的更改', en: 'Stashing Uncommitted Changes' },
	resetUncommitted: { zh: '重置未提交的更改', en: 'Reset Uncommitted Changes' },
	confirmResetUncommitted: { zh: '确定要将<b>未提交的更改</b>重置为 <b>HEAD</b> 吗？', en: 'Are you sure you want to reset the <b>uncommitted changes</b> to <b>HEAD</b>?' },
	resettingUncommitted: { zh: '正在重置未提交的更改', en: 'Resetting Uncommitted Changes' },
	cleanUntracked: { zh: '清理未跟踪文件', en: 'Clean Untracked Files' },
	confirmCleanUntracked: { zh: '确定要清理所有未跟踪文件吗？', en: 'Are you sure you want to clean all untracked files?' },
	cleanUntrackedDirs: { zh: '清理未跟踪目录', en: 'Clean Untracked Directories' },
	yesClean: { zh: '是，清理', en: 'Yes, Clean' },
	cleaningUntracked: { zh: '正在清理未跟踪文件', en: 'Cleaning Untracked Files' },
	openSourceControlView: { zh: '打开源代码管理视图', en: 'Open Source Control View' },

	// === Issue ===
	viewIssue: { zh: '查看 Issue', en: 'View Issue' },
	selectIssueToView: { zh: '选择要查看的此分支的 Issue：', en: 'Select an Issue of this branch to view:' },
	commitDetails: { zh: '提交详情', en: 'Commit Details' },
	commitComparison: { zh: '提交对比', en: 'Commit Comparison' },

	// === Add Tag Dialog ===
	tagTypeAnnotated: { zh: '附注', en: 'Annotated' },
	tagTypeLightweight: { zh: '轻量', en: 'Lightweight' },
	dontPush: { zh: '不推送', en: 'Don\'t Push' },
	addTagToCommit: { zh: '为提交 {0} 添加标签：', en: 'Add tag to commit {0}:' },
	addingTag: { zh: '正在添加标签', en: 'Adding Tag' },
	tagExists: { zh: '名为 {0} 的标签已存在，是否要用此新标签替换它？', en: 'Tag {0} already exists. Would you like to replace it with this new tag?' },
	yesReplaceTag: { zh: '是，替换现有标签', en: 'Yes, Replace Existing Tag' },
	noChooseAnotherTag: { zh: '否，选择另一个标签名', en: 'No, choose a different tag name' },

	// === Create Branch Dialog ===
	createBranchAt: { zh: '在提交 {0} 处创建分支：', en: 'Create branch at commit {0}:' },
	branchExists: { zh: '名为 {0} 的分支已存在，是否要用此新分支替换它？', en: 'Branch {0} already exists. Would you like to replace it with this new branch?' },
	yesReplaceBranch: { zh: '是，替换现有分支', en: 'Yes, Replace Existing Branch' },
	noChooseAnotherBranch: { zh: '否，选择另一个分支名', en: 'No, choose a different branch name' },

	// === Merge/Rebase ===
	confirmMerge: { zh: '确定要将 {0} {1} 合并到{2}吗？', en: 'Are you sure you want to merge the {0} {1} into {2}?' },
	yesMerge: { zh: '是，合并', en: 'Yes, Merge' },
	confirmRebase: { zh: '确定要将{0}变基到 {1} {2} 吗？', en: 'Are you sure you want to rebase {0} onto the {1} {2}?' },
	yesRebase: { zh: '是，变基', en: 'Yes, Rebase' },

	// === Checkout branch dialog ===
	checkoutNewBranchName: { zh: '检出 {0} 时要创建的新分支名称：', en: 'Enter the name of the new branch to create when checking out {0}:' },
	nameUsedByBranch: { zh: '名称 {0} 已被另一个分支使用：', en: 'The name {0} is already used by another branch:' },
	chooseAnotherName: { zh: '选择另一个分支名', en: 'Choose a different branch name' },
	checkoutExisting: { zh: '检出已有分支', en: 'Checkout Existing Branch' },
	checkoutExistingAndPull: { zh: '检出已有分支并拉取更改', en: 'Checkout Existing Branch & Pull Changes' },
	checkingOutBranch: { zh: '正在检出分支', en: 'Checking Out Branch' },
	checkingOutBranchAndPull: { zh: '正在检出分支并拉取更改', en: 'Checking Out Branch & Pulling Changes' },

	// === Errors ===
	unableLoadRepoInfo: { zh: '无法加载仓库信息', en: 'Unable to Load Repository Info' },
	unableLoadCommits: { zh: '无法加载提交', en: 'Unable to Load Commits' },
	unableLoadCommitComparison: { zh: '无法加载提交对比', en: 'Unable to Load Commit Comparison' },
	unableLoadCommitDetails: { zh: '无法加载提交详情', en: 'Unable to Load Commit Details' },
	unableLoadRepoView: { zh: '无法为仓库 "{0}" 加载 Git Graph 视图。它当前未包含在 Git Graph 中。', en: 'Unable to load the Git Graph View for repository "{0}". It is not currently included in Git Graph.' },
	noCommitsFound: { zh: '在此仓库中未找到提交。', en: 'No commits were found in this repository.' },
	noCommitsInRepo: { zh: '此仓库中没有提交。', en: 'There are no commits in this repository.' },
	codeReviewNotFound: { zh: '无法恢复代码审查，在此仓库最近加载的 {0} 个提交中未找到。', en: 'Unable to restore the code review, as it was not found within the most recent {0} commits loaded in this repository.' },
	fetchingFromRemotes: { zh: '正在从远程获取', en: 'Fetching from Remote(s)' },
	deletingTag: { zh: '正在删除标签', en: 'Deleting Tag' },

	// === Find Widget ===
	findPlaceholder: { zh: '查找', en: 'Find' },
	matchCase: { zh: '区分大小写', en: 'Match Case' },
	useRegex: { zh: '使用正则表达式', en: 'Use Regular Expression' },
	prevMatch: { zh: '上一个匹配项 (Shift+Enter)', en: 'Previous Match (Shift+Enter)' },
	nextMatch: { zh: '下一个匹配项 (Enter)', en: 'Next Match (Enter)' },
	openMatchInCdv: { zh: '为当前匹配项打开提交详情视图', en: 'Open the Commit Details View for the current match' },
	closeEscape: { zh: '关闭 (Escape)', en: 'Close (Escape)' },
	regexZeroLength: { zh: '不能使用会产生零长度匹配的正则表达式', en: 'Cannot use a regular expression that yields zero-length matches.' },
	noResults: { zh: '无结果', en: 'No Results' },
	resultPosition: { zh: '第 {0} / {1} 个', en: '{0} of {1}' },

	// === Settings Widget ===
	settingsGeneral: { zh: '常规', en: 'General' },
	settingsNameColon: { zh: '名称：', en: 'Name: ' },
	settingsDefaultNameFromFs: { zh: '（来自文件系统的默认名称）', en: ' (default name from file system)' },
	settingsEditName: { zh: '编辑名称', en: 'Edit Name' },
	settingsDeleteName: { zh: '删除名称', en: 'Delete Name' },
	settingsInitialBranchesColon: { zh: '初始分支：', en: 'Initial Branches: ' },
	settingsEditInitialBranches: { zh: '编辑初始分支', en: 'Edit Initial Branches' },
	settingsClearInitialBranches: { zh: '清除初始分支', en: 'Clear Initial Branches' },
	settingsShowStashes: { zh: '显示储藏', en: 'Show Stashes' },
	settingsShowTags: { zh: '显示标签', en: 'Show Tags' },
	settingsIncludeReflog: { zh: '包含仅在 reflog 中提及的提交', en: 'Include commits only mentioned by reflogs' },
	settingsIncludeReflogInfo: { zh: '仅在显示所有分支时适用。', en: 'Only applicable when all branches are being displayed.' },
	settingsOnlyFirstParent: { zh: '仅跟随提交的第一个父提交', en: 'Only Follow the First Parent of Commits' },
	settingsOnlyFirstParentInfo: { zh: '在发现要加载的提交时，仅跟随第一个父提交，而不是跟随所有父提交。', en: 'Only follow the first parent of commits when discovering commits to load, instead of following all parents.' },
	settingsUserDetails: { zh: '用户详情', en: 'User Details' },
	settingsUserNameColon: { zh: '用户名：', en: 'User Name: ' },
	settingsUserEmailColon: { zh: '用户邮箱：', en: 'User Email: ' },
	settingsUserDetailsDesc: { zh: '用户详情（如姓名和邮箱）被 Git 用于记录提交对象的作者和提交者。', en: 'User Details (such as name and email) are used by Git to record the author and committer of commit objects.' },
	settingsAddUserDetails: { zh: '添加用户详情', en: 'Add User Details' },
	settingsRemotes: { zh: '远程配置', en: 'Remotes' },
	settingsRemoteHeader: { zh: '远程仓库', en: 'Remote' },
	settingsTypeHeader: { zh: '类型', en: 'Type' },
	settingsActionsHeader: { zh: '操作', en: 'Actions' },
	settingsFetchHeader: { zh: '获取', en: 'Fetch' },
	settingsPushHeader: { zh: '推送', en: 'Push' },
	settingsNoRemotes: { zh: '此仓库未配置任何远程仓库。', en: 'There are no remote repositories configured for this repository.' },
	settingsAddRemote: { zh: '添加远程仓库', en: 'Add Remote' },
	settingsClickToShow: { zh: '点击显示此远程仓库的分支。', en: 'Click to show this remote\'s branches.' },
	settingsClickToHide: { zh: '点击隐藏此远程仓库的分支。', en: 'Click to hide this remote\'s branches.' },
	settingsFetchFromRemote: { zh: '从远程仓库获取', en: 'Fetch from Remote' },
	settingsPruneRemote: { zh: '清理远程仓库', en: 'Prune Remote' },
	settingsEditRemote: { zh: '编辑远程仓库', en: 'Edit Remote' },
	settingsDeleteRemote: { zh: '删除远程仓库', en: 'Delete Remote' },
	settingsIssueLinking: { zh: 'Issue 链接', en: 'Issue Linking' },
	settingsIssueRegexpColon: { zh: 'Issue 正则：', en: 'Issue Regexp: ' },
	settingsAddIssueLinking: { zh: '添加 Issue 链接', en: 'Add Issue Linking' },
	settingsIssueLinkingDesc: { zh: 'Issue 链接将提交和标签消息中的 Issue 编号转换为超链接，点击可在您的 Issue 跟踪系统中打开该 Issue。如果分支名称包含 Issue 编号，可通过分支的右键菜单查看该 Issue。', en: 'Issue Linking transforms issue numbers in commit and tag messages into hyperlinks that open the issue in your issue tracker. If a branch name contains an issue number, the issue can be viewed via the branch\'s context menu.' },
	settingsEditIssueLinking: { zh: '编辑此仓库的 Issue 链接', en: 'Edit the Issue Linking for this repository' },
	settingsAddIssueLinkingToRepo: { zh: '为此仓库添加 Issue 链接', en: 'Add Issue Linking to this repository' },
	settingsPRCreation: { zh: 'Pull Request 创建', en: 'Pull Request Creation' },
	settingsProviderColon: { zh: '提供商：', en: 'Provider: ' },
	settingsSourceRepoColon: { zh: '源仓库：', en: 'Source Repo: ' },
	settingsDestRepoColon: { zh: '目标仓库：', en: 'Destination Repo: ' },
	settingsDestBranchColon: { zh: '目标分支：', en: 'Destination Branch: ' },
	settingsConfigurePR: { zh: '配置"Pull Request 创建"集成', en: 'Configure "Pull Request Creation" Integration' },
	settingsPRDesc: { zh: 'Pull Request 创建功能可自动从分支的右键菜单中打开并预填 Pull Request 表单。', en: 'Pull Request Creation can automatically open and pre-fill a Pull Request form from a branch\'s context menu.' },
	settingsGitGraphConfig: { zh: 'Git Graph 配置', en: 'Git Graph Configuration' },
	settingsOpenExtSettings: { zh: '打开 Git Graph 扩展设置', en: 'Open Git Graph Extension Settings' },
	settingsExportRepoConfig: { zh: '导出仓库配置', en: 'Export Repository Config' },

	// === Settings: Language ===
	settingsLanguage: { zh: '界面语言', en: 'UI Language' },
	settingsLanguageAuto: { zh: '自动', en: 'Auto' },
	settingsLanguageZh: { zh: '中文', en: 'Chinese' },
	settingsLanguageEn: { zh: 'English', en: 'English' },

	// === Settings Dialogs ===
	specifyRepoName: { zh: '为此仓库指定一个名称：', en: 'Specify a name for this repository:' },
	saveName: { zh: '保存名称', en: 'Save Name' },
	confirmDeleteRepoName: { zh: '确定要删除此仓库手动配置的名称 {0}，并使用文件系统中的默认名称 {1} 吗？', en: 'Are you sure you want to delete the manually configured name {0} of this repository, and use the default name from the file system {1}?' },
	configureInitialBranches: { zh: '配置初始分支', en: 'Configure Initial Branches' },
	configureInitialBranchesDesc: { zh: '配置在此仓库加载到 Git Graph 视图时初始显示的分支。', en: 'Configure the branches that are initially displayed when this repository is loaded into the Git Graph View.' },
	configureInitialBranchesNote: { zh: '注意：当"已检出分支"被禁用，且未选择任何"特定分支"时，将显示所有分支。', en: 'Note: When "Checked Out Branches" is disabled, and no "Specific Branches" are selected, all branches will be displayed.' },
	checkedOutBranches: { zh: '已检出分支', en: 'Checked Out Branches' },
	specificBranches: { zh: '特定分支', en: 'Specific Branches' },
	saveConfig: { zh: '保存配置', en: 'Save Configuration' },
	confirmClearInitialBranches: { zh: '确定要清除在此仓库加载到 Git Graph 视图时初始显示的分支吗？', en: 'Are you sure you want to clear the branches that are initially displayed when this repository is loaded into the Git Graph View?' },
	yesClear: { zh: '是，清除', en: 'Yes, Clear' },
	setUserDetailsDesc: { zh: '设置 Git 用于记录提交对象作者和提交者的用户名和邮箱：', en: 'Set the user name and email that Git will use to record the author and committer of commit objects:' },
	userName: { zh: '用户名', en: 'User Name' },
	userEmail: { zh: '用户邮箱', en: 'User Email' },
	useGlobally: { zh: '全局使用', en: 'Use Globally' },
	useGloballyInfo: { zh: '对所有 Git 仓库全局使用此"用户名"和"用户邮箱"（可按仓库覆盖）。', en: 'Use this "User Name" and "User Email" globally for all Git repositories (can be overridden per repository).' },
	setUserDetails: { zh: '设置用户详情', en: 'Set User Details' },
	confirmRemoveUserDetails: { zh: '确定要移除{0}配置的</b>用户名和邮箱吗？这些信息被 Git 用于记录提交对象的作者和提交者。', en: 'Are you sure you want to remove the<b>{0} configured</b> user name and email? These are used by Git to record the author and committer of commit objects.' },
	yesRemove: { zh: '是，移除', en: 'Yes, Remove' },
	removeUserDetails: { zh: '移除用户详情', en: 'Remove User Details' },
	pushUrlPlaceholder: { zh: '留空则使用 Fetch URL', en: 'Leave blank to use the Fetch URL' },
	addNewRemote: { zh: '为此仓库添加新的远程仓库：', en: 'Add a new remote repository to this repository:' },
	fetchImmediately: { zh: '立即获取', en: 'Fetch Immediately' },
	saveChanges: { zh: '保存更改', en: 'Save Changes' },
	saveRemoteChanges: { zh: '保存远程仓库更改', en: 'Save Remote Changes' },
	confirmDeleteRemote: { zh: '确定要删除远程仓库 {0} 吗？', en: 'Are you sure you want to delete the remote repository {0}?' },
	confirmFetchFromRemote: { zh: '确定要从远程仓库 {0} 获取吗？', en: 'Are you sure you want to fetch from the remote repository {0}?' },
	prune: { zh: '清理', en: 'Prune' },
	pruneInfo: { zh: '获取前，移除远程仓库上已不存在的远程跟踪引用。', en: 'Remove any remote-tracking references that no longer exist on the remote repository, before fetching.' },
	pruneTags: { zh: '清理标签', en: 'Prune Tags' },
	pruneTagsInfo: { zh: '获取前，移除远程仓库上已不存在的本地标签。需要 Git >= 2.17.0，且启用"清理"。', en: 'Remove any local tags that no longer exist on the remote repository, before fetching. Requires Git >= 2.17.0, and "Prune" to be enabled.' },
	confirmPruneRemote: { zh: '确定要清理远程仓库 {0} 上已不存在的远程跟踪引用吗？', en: 'Are you sure you want to prune the remote repository {0} of remote-tracking references that no longer exist?' },
	yesPrune: { zh: '是，清理', en: 'Yes, Prune' },
	confirmRemoveIssueLinkingRepo: { zh: '确定要移除 Git Graph 中此仓库的 Issue 链接吗？', en: 'Are you sure you want to remove the Issue Linking of this repository from Git Graph?' },
	confirmRemoveIssueLinkingGlobal: { zh: '确定要移除 Git Graph 中全局配置的 Issue 链接吗？', en: 'Are you sure you want to remove the globally configured Issue Linking from Git Graph?' },
	unableConfigPR: { zh: '无法配置"Pull Request 创建"集成', en: 'Unable to Configure "Pull Request Creation" Integration' },
	mustHaveRemote: { zh: '仓库必须至少有一个远程仓库才能配置"Pull Request 创建"集成。当前仓库没有任何远程仓库。', en: 'The repository must have at least one remote repository to configure the "Pull Request Creation" integration. This repository does not have any remote repositories.' },
	confirmRemovePR: { zh: '确定要移除已配置的"Pull Request 创建"集成吗？', en: 'Are you sure you want to remove the configured "Pull Request Creation" integration?' },
	exportConfigDesc: { zh: '导出 Git Graph 仓库配置将生成一个可提交到此仓库的文件。它允许其他在此仓库中工作的人使用相同的配置。', en: 'Exporting the Git Graph repository configuration will generate a file that can be committed to this repository. It allows other people working in this repository to use the same configuration.' },
	yesExport: { zh: '是，导出', en: 'Yes, Export' },
	exportingRepoConfig: { zh: '导出仓库配置', en: 'Export Repository Config' },
	showAllBranches: { zh: '显示全部', en: 'Show All' },
	globPattern: { zh: '通配符: {0}', en: 'Glob: {0}' },

	// === gitGraphView HTML (backend) ===
	unableLoadGitGraph: { zh: '无法加载 Git Graph', en: 'Unable to Load Git Graph' },
	noReposFound: { zh: 'Git Graph 上次扫描时未在当前工作区中找到 Git 仓库。', en: 'Git Graph did not find any Git repositories in the current workspace when it was last scanned.' },
	maxDepthSearchPrefix: { zh: '如果您的仓库位于打开的工作区文件夹的子文件夹中，请确保已正确设置 Git Graph 设置 "git-graph.maxDepthOfRepoSearch"（阅读', en: 'If your repository is located in a subfolder of a workspace folder that is open, please ensure that the Git Graph setting "git-graph.maxDepthOfRepoSearch" is set correctly (read the ' },
	documentation: { zh: '文档', en: 'documentation' },
	maxDepthSearchSuffix: { zh: '了解更多信息）。', en: ' for more information).' },
	rescanWorkspace: { zh: '重新扫描当前工作区以查找仓库', en: 'Rescan Workspace for Repositories' },

	// === Additional keys ===
	checkoutExistingAndPullSuffix: { zh: '并拉取更改', en: '& Pull Changes' },
	uncommittedChanges: { zh: '未提交的更改', en: 'Uncommitted Changes' },

	// === Settings Widget: additional ===
	checkedOutShort: { zh: '已检出', en: 'Checked Out' },
	notARemote: { zh: '不是远程仓库', en: 'Not a Remote' },
	show: { zh: '显示', en: 'Show' },
	hide: { zh: '隐藏', en: 'Hide' },
	clickToShowHide: { zh: '点击{0}此远程仓库的分支。', en: 'Click to {0} this remote\'s branches.' },
	yesDelete2: { zh: '是，删除', en: 'Yes, Delete' },

	// === Issue Linking Dialog ===
	issueLinkingExample: { zh: '以下示例将提交消息中的 <b>#123</b> 链接到 <b>https://github.com/mhutchie/repo/issues/123</b>：', en: 'The following example links <b>#123</b> in a commit message to <b>https://github.com/mhutchie/repo/issues/123</b>:' },
	issueRegexpColon: { zh: 'Issue 正则：', en: 'Issue Regexp: ' },
	issueUrlColon: { zh: 'Issue URL：', en: 'Issue URL: ' },
	issueRegexpLabel: { zh: 'Issue 正则', en: 'Issue Regexp' },
	issueUrlLabel: { zh: 'Issue URL', en: 'Issue URL' },
	issueRegexpInfo: { zh: '一个匹配您的 Issue 编号的正则表达式，包含一个或多个捕获组 ( )，将被替换到"Issue URL"中。', en: 'A regular expression that matches your issue numbers, containing one or more capture groups ( ), to be substituted into the "Issue URL".' },
	issueUrlInfo: { zh: '您的 Issue 跟踪系统中 Issue 的 URL，包含占位符（$1、$2 等），用于"Issue 正则"中捕获的组 ( )。', en: 'The URL of the issue in your issue tracker, containing placeholders ($1, $2, etc.) for the capture groups ( ) in the "Issue Regexp".' },
	issueUseGloballyInfo: { zh: '默认对所有仓库使用此"Issue 正则"和"Issue URL"（可按仓库覆盖）。注意："全局使用"仅适用于大多数仓库使用相同 Issue 链接的情况（例如使用 JIRA 或 Pivotal Tracker 时）。', en: 'Use this "Issue Regexp" and "Issue URL" globally for all repositories by default (can be overridden per repository). Note: "Use Globally" is only recommended if most repositories use the same Issue Linking (e.g. when using JIRA or Pivotal Tracker).' },
	issuePrefilledDetected: { zh: '<i>预填的 Issue 正则表达式是在此仓库的提交消息中检测到的。如有必要请审查和/或更正。</i>', en: '<i>The pre-filled Issue Regular Expression was detected in this repository\'s commit messages. Please review and/or correct it if necessary.</i>' },
	invalidIssueRegexp: { zh: '无效的 Issue 正则', en: 'Invalid Issue Regexp' },
	invalidIssueRegexpNoCapture: { zh: '该正则表达式不包含捕获组 ( )。', en: 'This regular expression does not contain a capture group ( ).' },
	invalidIssueUrl: { zh: '无效的 Issue URL', en: 'Invalid Issue URL' },
	invalidIssueUrlNoPlaceholder: { zh: 'Issue URL 不包含用于 Issue 正则中捕获的 Issue 编号组件的任何占位符（$1、$2 等）。', en: 'The Issue URL does not contain any placeholders ($1, $2, etc.) for the issue number components captured in the Issue Regexp.' },

	// === Pull Request Integration Dialog ===
	prConfigStep1: { zh: '配置"Pull Request 创建"集成（步骤&nbsp;1/2）', en: 'Configure "Pull Request Creation" Integration (Step&nbsp;1/2)' },
	prConfigStep2: { zh: '配置"Pull Request 创建"集成（步骤&nbsp;2/2）', en: 'Configure "Pull Request Creation" Integration (Step&nbsp;2/2)' },
	prProvider: { zh: '提供商', en: 'Provider' },
	prProviderInfo: { zh: '除了内置的公开托管的 Pull Request 提供商外，还可以使用扩展设置"git-graph.customPullRequestProviders"配置自定义提供商（例如用于私有托管的 Pull Request 提供商）。', en: 'In addition to the built-in publicly hosted Pull Request providers, custom providers can be configured via the "git-graph.customPullRequestProviders" extension setting (e.g. for privately hosted Pull Request providers).' },
	prSourceRemote: { zh: '源远程仓库', en: 'Source Remote' },
	prSourceRemoteInfo: { zh: '对应于 Pull Request 源的远程仓库。', en: 'The remote repository corresponding to the source of the Pull Request.' },
	prDestRemote: { zh: '目标远程仓库', en: 'Destination Remote' },
	prDestRemoteInfo: { zh: '对应于 Pull Request 目标/目的地的远程仓库。', en: 'The remote repository corresponding to the destination of the Pull Request.' },
	prHostRootUrl: { zh: '主机根 URL', en: 'Host Root URL' },
	prHostRootUrlInfo: { zh: 'Pull Request 提供商的主机根 URL（例如 https://github.com）。', en: 'The host root URL of the Pull Request provider (e.g. https://github.com).' },
	prSourceOwner: { zh: '源所有者', en: 'Source Owner' },
	prSourceOwnerInfo: { zh: 'Pull Request 源仓库的所有者。', en: 'The owner of the Pull Request\'s source repository.' },
	prSourceRepo: { zh: '源仓库', en: 'Source Repo' },
	prSourceRepoInfo: { zh: 'Pull Request 源仓库的名称。', en: 'The name of the Pull Request\'s source repository.' },
	prDestOwner: { zh: '目标所有者', en: 'Destination Owner' },
	prDestOwnerInfo: { zh: 'Pull Request 目标/目的地仓库的所有者。', en: 'The owner of the Pull Request\'s destination repository.' },
	prDestRepo: { zh: '目标仓库', en: 'Destination Repo' },
	prDestRepoInfo: { zh: 'Pull Request 目标/目的地仓库的名称。', en: 'The name of the Pull Request\'s destination repository.' },
	prDestProjectId: { zh: '目标项目 ID', en: 'Destination Project ID' },
	prDestProjectIdInfo: { zh: 'Pull Request 目标/目的地的 GitLab 项目 ID。留空则使用 GitLab 中配置的默认目标/目的地。', en: 'The GitLab Project ID of the Pull Request\'s destination. Leave blank to use the default destination configured in GitLab.' },
	prDestBranch: { zh: '目标分支', en: 'Destination Branch' },
	prDestBranchInfo: { zh: 'Pull Request 目标/目的地的分支名称。', en: 'The name of the branch at the destination of the Pull Request.' },
	prPrevStep: { zh: '上一步', en: 'Previous' },
	invalidIssueRegexpTitle: { zh: '无效的 Issue 正则', en: 'Invalid Issue Regexp' }
};

/**
 * Initialize the i18n module with the configured language.
 */
function initI18n(language: string, vscodeLanguage?: string) {
	const isAuto = language === 'auto' || !language;
	if (isAuto) {
		activeLanguage = (vscodeLanguage && vscodeLanguage.startsWith('en')) ? 'en' : 'zh';
	} else {
		activeLanguage = language === 'en' ? 'en' : 'zh';
	}
}

/**
 * Get the active language.
 */
function getActiveLanguage(): Language {
	return activeLanguage;
}

/**
 * Translate a key to the active language.
 * Supports {0}, {1}, ... placeholders for runtime substitution.
 */
function t(key: string, ...args: (string | number)[]): string {
	const entry = STRINGS[key];
	if (!entry) return key;
	let text = entry[activeLanguage];
	if (args.length > 0) {
		for (let i = 0; i < args.length; i++) {
			text = text.split('{' + i + '}').join(String(args[i]));
		}
	}
	return text;
}
