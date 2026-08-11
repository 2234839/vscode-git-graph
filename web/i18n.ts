/* i18n: Internationalization module for Git Graph WebView */

/**
 * Supported UI languages.
 * - "auto": follow VS Code's display language
 * - "zh": Chinese
 * - "en": English
 */
type Language = 'zh' | 'en';

/**
 * The active language, set during initialization from config.
 * Defaults to 'zh' (matching the hardcoded strings in source).
 */
let activeLanguage: Language = 'zh';

/**
 * Whether the language was auto-detected from VS Code.
 */
let isAutoLanguage = true;

/**
 * The resolved effective language (after auto detection).
 */
let effectiveLanguage: Language = 'zh';

/**
 * Translation dictionary: Chinese key → English value.
 * Used when effectiveLanguage === 'en'.
 */
const translations: Record<string, string> = {
	// === Common UI ===
	'取消': 'Cancel',
	'关闭': 'Close',
	'保存': 'Save',
	'编辑': 'Edit',
	'移除': 'Remove',
	'删除': 'Delete',
	'添加': 'Add',
	'是': 'Yes',
	'否': 'No',
	'确定': 'OK',
	'返回': 'Back',
	'下一步': 'Next',
	'上一步': 'Previous',
	'重试': 'Retry',
	'刷新': 'Refresh',
	'全部': 'All',
	'名称': 'Name',
	'类型': 'Type',
	'加载中 ...': 'Loading ...',
	'加载中...': 'Loading...',
	'未设置': 'Not Set',
	'可选': 'Optional',
	'普通': 'Normal',
	'强制': 'Force',
	'强制（带租约）': 'Force (with lease)',
	'本地': 'Local',
	'全局': 'Global',

	// === Top-level controls ===
	'仓库': 'Repository',
	'分支': 'Branch',
	'作者': 'Author',
	'标签': 'Tag',
	'当前': 'Current',
	'查找': 'Find',
	'仓库设置': 'Repository Settings',
	'为此仓库打开终端': 'Open Terminal for this Repository',
	'显示远程分支': 'Show Remote Branches',
	'从远程获取': 'Fetch from Remote',
	'并清理': ' and Prune',
	'正在打开终端': 'Opening Terminal',
	'正在刷新': 'Refreshing',
	'重新扫描当前工作区以查找仓库': 'Rescan Workspace for Repositories',

	// === Dropdown ===
	'显示全部': 'Show All',
	'通配符: ': 'Glob: ',

	// === Table headers ===
	'图形': 'Graph',
	'描述': 'Description',
	'日期': 'Date',
	'提交': 'Commit',

	// === Load more / loading ===
	'加载更多提交': 'Load More Commits',

	// === Commit details ===
	'对象: ': 'Object: ',
	'提交: ': 'Commit: ',
	'标签创建者: ': 'Tag Created By: ',
	'日期: ': 'Date: ',
	'此提交当前已检出': 'This commit is currently checked out',
	'当前已检出至此提交': ' is currently checked out at this commit',

	// === Context Menu: Branch ===
	'检出分支': 'Checkout Branch',
	'检出分支…': 'Checkout Branch…',
	'比较...': 'Compare...',
	'比较': 'Compare',
	'比较分支': 'Compare Branch',
	'没有其他本地分支可比较。': 'There are no other local branches to compare with.',
	'选择要比较的分支': 'Select a branch to compare with',
	'重命名分支': 'Rename Branch',
	'输入分支': 'Enter the new name of branch',
	'的新名称：': ':</p>',
	'正在重命名分支': 'Renaming Branch',
	'创建分支': 'Create Branch',
	'删除分支': 'Delete Branch',
	'强制删除': 'Force Delete',
	'在远程删除此分支': 'Delete this branch on the remote',
	'确定要删除分支': 'Are you sure you want to delete branch',
	'是，删除': 'Yes, Delete',
	'正在删除分支': 'Deleting Branch',
	'合并到当前分支': 'Merge into Current Branch',
	'将当前分支变基到分支': 'Rebase Current Branch onto Branch',
	'推送分支': 'Push Branch',
	'设置上游': 'Set Upstream',
	'推送模式': 'Push Mode',
	'推送到远程': 'Push to Remote',
	'确定要推送分支': 'Are you sure you want to push branch',
	'到远程': ' to remote',
	'是，推送': 'Yes, Push',
	'正在推送分支': 'Pushing Branch',
	'拉取分支': 'Pull Branch',
	'拉取到当前分支': 'Pull into Current Branch',
	'确定要用': 'Are you sure you want to update the local branch',
	'的最新更改更新本地分支': ' with the latest changes from',
	'强制更新': 'Force Update',
	'是，更新': 'Yes, Update',
	'正在更新分支': 'Updating Branch',
	'创建 Pull Request': 'Create Pull Request',
	'确定要为分支': 'Are you sure you want to create a Pull Request for branch',
	'创建 Pull Request 吗？': '?',
	'创建 Pull Request 前先推送分支': 'Push branch before creating Pull Request',
	'是，创建 Pull Request': 'Yes, Create Pull Request',
	'正在创建 Pull Request': 'Creating Pull Request',
	'创建归档': 'Create Archive',
	'正在创建归档': 'Creating Archive',
	'在分支下拉菜单中选中': 'Select in Branches Dropdown',
	'在分支下拉菜单中取消选中': 'Unselect in Branches Dropdown',
	'复制分支名到剪贴板': 'Copy Branch Name to Clipboard',
	'分支名': 'Branch Name',
	'添加标签': 'Add Tag',
	'检出': 'Checkout',
	'正在检出提交': 'Checking Out Commit',
	'确定要检出提交': 'Are you sure you want to checkout commit',
	'状态。': ' state.',
	'始终确认': 'Always Confirm',
	'是，检出': 'Yes, Checkout',
	'拣选': 'Cherry Pick',
	'父提交哈希': 'Parent Commit Hash',
	'记录来源': 'Record Origin',
	'不提交': 'No Commit',
	'确定要拣选提交': 'Are you sure you want to cherry pick commit',
	'是，拣选': 'Yes, Cherry Pick',
	'正在拣选提交': 'Cherry Picking Commit',
	'还原': 'Revert',
	'确定要还原合并提交': 'Are you sure you want to revert merge commit',
	'吗？选择主分支上的父提交哈希，以相对于该提交进行还原：': '? Select the parent commit hash on the main branch to revert relative to:',
	'是，还原': 'Yes, Revert',
	'正在还原提交': 'Reverting Commit',
	'确定要还原提交': 'Are you sure you want to revert commit',
	'重置上次提交（软重置）': 'Undo Last Commit (Soft Reset)',
	'确定要重置上次提交吗？这会将提交的所有更改保留为未提交的更改。': 'Are you sure you want to undo the last commit? This will keep all changes of the commit as uncommitted changes.',
	'是，重置上次提交': 'Yes, Undo Last Commit',
	'正在重置上次提交': 'Undoing Last Commit',
	'编辑提交信息': 'Edit Commit Message',
	'丢弃': 'Drop',
	'确定要永久丢弃提交': 'Are you sure you want to permanently drop commit',
	'是，丢弃': 'Yes, Drop',
	'正在丢弃提交': 'Dropping Commit',
	'将当前分支变基到此提交': 'Rebase Current Branch onto this Commit',
	'将当前分支重置到此提交': 'Reset Current Branch to this Commit',
	'确定要将': 'Are you sure you want to reset',
	'当前分支': 'the current branch',
	'当前分支）': 'the current branch)',
	'重置到提交': 'reset to commit',
	'软 - 保留所有更改，但重置 HEAD': 'Soft - Keep all changes, but reset HEAD',
	'混合 - 保留工作区，但重置索引': 'Mixed - Keep the working tree, but reset the index',
	'硬 - 丢弃所有更改': 'Hard - Discard all changes',
	'是，重置': 'Yes, Reset',
	'正在重置到提交': 'Resetting to Commit',
	'复制提交哈希到剪贴板': 'Copy Commit Hash to Clipboard',
	'提交哈希': 'Commit Hash',
	'复制提交主题到剪贴板': 'Copy Commit Subject to Clipboard',
	'提交主题': 'Commit Subject',

	// === Remote Branch context menu ===
	'删除远程分支': 'Delete Remote Branch',
	'确定要删除远程分支': 'Are you sure you want to delete the remote branch',
	'正在删除远程分支': 'Deleting Remote Branch',
	'获取到本地分支': 'Fetch into Local Branch',
	'确定要将远程分支': 'Are you sure you want to fetch the remote branch',
	'强制获取': 'Force Fetch',
	'是，获取': 'Yes, Fetch',
	'正在获取分支': 'Fetching Branch',
	'合并到': 'Merge into',
	'拉取到': 'Pull into',
	'吗？如果需要合并：': '? If a merge is required:',
	'即使可以快进也创建新提交': 'Create a new commit even if fast-forward is possible',
	'压缩提交': 'Squash Commits',
	'是，拉取': 'Yes, Pull',
	'正在拉取分支': 'Pulling Branch',

	// === Stash context menu ===
	'应用储藏': 'Apply Stash',
	'确定要应用储藏': 'Are you sure you want to apply stash',
	'恢复索引': 'Reinstate Index',
	'是，应用储藏': 'Yes, Apply Stash',
	'正在应用储藏': 'Applying Stash',
	'从储藏创建分支': 'Create Branch from Stash',
	'从储藏': 'From stash',
	'创建分支，名称为：': ', with name:',
	'弹出储藏': 'Pop Stash',
	'确定要弹出储藏': 'Are you sure you want to pop stash',
	'是，弹出储藏': 'Yes, Pop Stash',
	'正在弹出储藏': 'Popping Stash',
	'丢弃储藏': 'Drop Stash',
	'确定要丢弃储藏': 'Are you sure you want to drop stash',
	'正在丢弃储藏': 'Dropping Stash',
	'复制储藏名到剪贴板': 'Copy Stash Name to Clipboard',
	'储藏名': 'Stash Name',
	'复制储藏哈希到剪贴板': 'Copy Stash Hash to Clipboard',
	'储藏哈希': 'Stash Hash',

	// === Tag context menu ===
	'查看详情': 'View Details',
	'正在获取标签详情': 'Fetching Tag Details',
	'删除标签': 'Delete Tag',
	'确定要删除标签': 'Are you sure you want to delete tag',
	'不在任何远程上删除': 'Don\'t delete on any remote',
	'是否还要在远程上删除此标签：': '<br>Would you also like to delete it on a remote:',
	'同时在远程删除': 'Also delete on remote',
	'推送标签': 'Push Tag',
	'确定要将标签': 'Are you sure you want to push tag',
	'确定要推送标签': 'Are you sure you want to push tag',
	'吗？选择要推送标签到的远程：': '? Select the remotes you want to push the tag to:',
	'正在推送标签': 'Pushing Tag',
	'复制标签名到剪贴板': 'Copy Tag Name to Clipboard',
	'标签名': 'Tag Name',

	// === Uncommitted Changes context menu ===
	'储藏未提交的更改': 'Stash Uncommitted Changes',
	'确定要储藏<b>未提交的更改</b>吗？': 'Are you sure you want to stash the <b>uncommitted changes</b>?',
	'信息': 'Message',
	'包含未跟踪文件': 'Include Untracked Files',
	'是，储藏': 'Yes, Stash',
	'正在储藏未提交的更改': 'Stashing Uncommitted Changes',
	'重置未提交的更改': 'Reset Uncommitted Changes',
	'确定要将<b>未提交的更改</b>重置为 <b>HEAD</b> 吗？': 'Are you sure you want to reset the <b>uncommitted changes</b> to <b>HEAD</b>?',
	'正在重置未提交的更改': 'Resetting Uncommitted Changes',
	'清理未跟踪文件': 'Clean Untracked Files',
	'确定要清理所有未跟踪文件吗？': 'Are you sure you want to clean all untracked files?',
	'清理未跟踪目录': 'Clean Untracked Directories',
	'是，清理': 'Yes, Clean',
	'正在清理未跟踪文件': 'Cleaning Untracked Files',
	'打开源代码管理视图': 'Open Source Control View',

	// === Issue Linking ===
	'查看 Issue': 'View Issue',
	'选择要查看的此分支的 Issue：': 'Select an Issue of this branch to view:',
	'提交详情': 'Commit Details',
	'提交对比': 'Commit Comparison',

	// === Add Tag Dialog ===
	'附注': 'Annotated',
	'轻量': 'Lightweight',
	'不推送': 'Don\'t Push',
	'为提交': 'Add tag to commit',
	'添加标签：': ':',
	'的标签已存在，是否要用此新标签替换它？': ' already exists. Would you like to replace it with this new tag?',
	'是，替换现有标签': 'Yes, Replace Existing Tag',
	'否，选择另一个标签名': 'No, choose a different tag name',

	// === Create Branch Dialog ===
	'在提交': 'Create branch at commit',
	'处创建分支：': ':',
	'的分支已存在，是否要用此新分支替换它？': ' already exists. Would you like to replace it with this new branch?',
	'是，替换现有分支': 'Yes, Replace Existing Branch',
	'否，选择另一个分支名': 'No, choose a different branch name',

	// === Merge/Rebase Dialogs ===
	'确定要将 ': 'Are you sure you want to merge ',
	// '合并到' already defined above
	'吗？': '?',
	'是，合并': 'Yes, Merge',
	'变基到': 'rebase onto',
	'是，变基': 'Yes, Rebase',

	// === Error messages ===
	'无法': 'Unable to ',
	'，输入了一个或多个无效字符。': ', one or more invalid characters were entered.',
	'错误：': 'Error: ',
	'无法从远程获取': 'Unable to Fetch from Remote(s)',
	'无法恢复代码审查，在此仓库最近加载的': 'Unable to restore the code review, as it was not found within the most recent',
	'个提交中未找到。': ' commits loaded in this repository.',
	'无法加载仓库信息': 'Unable to Load Repository Info',
	'无法加载提交': 'Unable to Load Commits',
	'无法加载提交对比': 'Unable to Load Commit Comparison',
	'无法加载提交详情': 'Unable to Load Commit Details',
	'无法为仓库': 'Unable to load the Git Graph View for repository',
	'加载 Git Graph 视图。它当前未包含在 Git Graph 中。': '. It is not currently included in Git Graph.',
	'在此仓库中未找到提交。': 'No commits were found in this repository.',
	'此仓库中没有提交。': 'There are no commits in this repository.',
	'在当前视图中找不到所选分支的提交。请尝试加载更多提交。': 'The commits of the selected branch could not be found in the current view. Please try loading more commits.',

	// === Checkout Branch Dialog ===
	// '检出' already defined above
	'时要创建的新分支名称：': ' being checked out, to create:',
	'检出已有分支': 'Checkout Existing Branch',
	'并拉取更改': ' and Pull Changes',
	'已被另一个分支使用：': ' is already used by another branch:',
	'选择另一个分支名': 'Choose a different branch name',
	'正在检出分支': 'Checking Out Branch',

	// === Find Widget ===
	'区分大小写': 'Match Case',
	'使用正则表达式': 'Use Regular Expression',
	'上一个匹配项 (Shift+Enter)': 'Previous Match (Shift+Enter)',
	'下一个匹配项 (Enter)': 'Next Match (Enter)',
	'为当前匹配项打开提交详情视图': 'Open the Commit Details View for the current match',
	'关闭 (Escape)': 'Close (Escape)',
	'不能使用会产生零长度匹配的正则表达式': 'Cannot use a regular expression that yields zero-length matches.',
	'无结果': 'No Results',
	'第': 'Result',

	// === Settings Widget ===
	// '仓库设置' already defined above
	'常规': 'General',
	'名称：': 'Name: ',
	'（来自文件系统的默认名称）': ' (default name from file system)',
	'编辑名称': 'Edit Name',
	'删除名称': 'Delete Name',
	'初始分支：': 'Initial Branches: ',
	'编辑初始分支': 'Edit Initial Branches',
	'清除初始分支': 'Clear Initial Branches',
	'显示储藏': 'Show Stashes',
	'显示标签': 'Show Tags',
	'包含仅在 reflog 中提及的提交': 'Include commits only mentioned by reflogs',
	'仅在显示所有分支时适用。': 'Only applicable when all branches are being displayed.',
	'仅跟随提交的第一个父提交': 'Only Follow the First Parent of Commits',
	'在发现要加载的提交时，仅跟随第一个父提交，而不是跟随所有父提交。': 'Only follow the first parent of commits when discovering commits to load, instead of following all parents.',
	'用户详情': 'User Details',
	'用户名：': 'User Name: ',
	'用户邮箱：': 'User Email: ',
	'用户详情（如姓名和邮箱）被 Git 用于记录提交对象的作者和提交者。': 'User Details (such as name and email) are used by Git to record the author and committer of commit objects.',
	'添加用户详情': 'Add User Details',
	'远程配置': 'Remotes',
	'远程仓库': 'Remote',
	'操作': 'Actions',
	'获取': 'Fetch',
	'推送': 'Push',
	'此仓库未配置任何远程仓库。': 'There are no remote repositories configured for this repository.',
	'添加远程仓库': 'Add Remote',
	'点击': 'Click to ',
	'显示': 'show',
	'隐藏': 'hide',
	'此远程仓库的分支。': ' this remote\'s branches.',
	'从远程仓库获取': 'Fetch from Remote',
	'清理远程仓库': 'Prune Remote',
	'编辑远程仓库': 'Edit Remote',
	'删除远程仓库': 'Delete Remote',
	'Issue 链接': 'Issue Linking',
	'Issue 正则：': 'Issue Regexp: ',
	'添加 Issue 链接': 'Add Issue Linking',
	'Issue 链接将提交和标签消息中的 Issue 编号转换为超链接，点击可在您的 Issue 跟踪系统中打开该 Issue。如果分支名称包含 Issue 编号，可通过分支的右键菜单查看该 Issue。': 'Issue Linking transforms issue numbers in commit and tag messages into hyperlinks that open the issue in your issue tracker. If a branch name contains an issue number, the issue can be viewed via the branch\'s context menu.',
	'编辑此仓库的 Issue 链接': 'Edit the Issue Linking for this repository',
	'为此仓库添加 Issue 链接': 'Add Issue Linking to this repository',
	'Pull Request 创建': 'Pull Request Creation',
	'提供商：': 'Provider: ',
	'源仓库：': 'Source Repo: ',
	'目标仓库：': 'Destination Repo: ',
	'目标分支：': 'Destination Branch: ',
	'配置"Pull Request 创建"集成': 'Configure "Pull Request Creation" Integration',
	'Pull Request 创建功能可自动从分支的右键菜单中打开并预填 Pull Request 表单。': 'Pull Request Creation can automatically open and pre-fill a Pull Request form from a branch\'s context menu.',
	'Git Graph 配置': 'Git Graph Configuration',
	'打开 Git Graph 扩展设置': 'Open Git Graph Extension Settings',
	'导出仓库配置': 'Export Repository Config',

	// === Settings Dialogs ===
	'为此仓库指定一个名称：': 'Specify a name for this repository:',
	'保存名称': 'Save Name',
	'确定要删除此仓库手动配置的名称': 'Are you sure you want to delete the manually configured name',
	'并使用文件系统中的默认名称': 'of this repository, and use the default name from the file system',
	// '吗？' already defined above
	'配置初始分支': 'Configure Initial Branches',
	'配置在此仓库加载到 Git Graph 视图时初始显示的分支。': 'Configure the branches that are initially displayed when this repository is loaded into the Git Graph View.',
	'注意：当"已检出分支"被禁用，且未选择任何"特定分支"时，将显示所有分支。': 'Note: When "Checked Out Branches" is disabled, and no "Specific Branches" are selected, all branches will be displayed.',
	'已检出分支': 'Checked Out Branches',
	'特定分支': 'Specific Branches',
	'保存配置': 'Save Configuration',
	'确定要清除在此仓库加载到 Git Graph 视图时初始显示的分支吗？': 'Are you sure you want to clear the branches that are initially displayed when this repository is loaded into the Git Graph View?',
	'是，清除': 'Yes, Clear',
	'设置 Git 用于记录提交对象作者和提交者的用户名和邮箱：': 'Set the user name and email that Git will use to record the author and committer of commit objects:',
	'用户名': 'User Name',
	'用户邮箱': 'User Email',
	'全局使用': 'Use Globally',
	'对所有 Git 仓库全局使用此"用户名"和"用户邮箱"（可按仓库覆盖）。': 'Use this "User Name" and "User Email" globally for all Git repositories (can be overridden per repository).',
	'设置用户详情': 'Set User Details',
	'确定要移除': 'Are you sure you want to remove the',
	'配置的': ' configured',
	'用户名和邮箱吗？这些信息被 Git 用于记录提交对象的作者和提交者。': ' user name and email? These are used by Git to record the author and committer of commit objects.',
	'是，移除': 'Yes, Remove',
	'移除用户详情': 'Remove User Details',
	'留空则使用 Fetch URL': 'Leave blank to use the Fetch URL',
	'为此仓库添加新的远程仓库：': 'Add a new remote repository to this repository:',
	'立即获取': 'Fetch Immediately',
	// '添加远程仓库' already defined above
	// '编辑远程仓库' already defined above
	'保存更改': 'Save Changes',
	'保存远程仓库更改': 'Save Remote Changes',
	'确定要删除远程仓库': 'Are you sure you want to delete the remote repository',
	'确定要从远程仓库': 'Are you sure you want to fetch from the remote repository',
	'获取吗？': '?',
	'清理': 'Prune',
	'获取前，移除远程仓库上已不存在的远程跟踪引用。': 'Remove any remote-tracking references that no longer exist on the remote repository, before fetching.',
	'清理标签': 'Prune Tags',
	'获取前，移除远程仓库上已不存在的本地标签。需要 Git >= 2.17.0，且启用"清理"。': 'Remove any local tags that no longer exist on the remote repository, before fetching. Requires Git >= 2.17.0, and "Prune" to be enabled.',
	'确定要清理远程仓库': 'Are you sure you want to prune the remote repository',
	'上已不存在的远程跟踪引用吗？': ' of remote-tracking references that no longer exist?',
	// '是，清理' already defined above (using 'Yes, Clean' - close enough for prune context)
	'确定要移除 Git Graph 中': 'Are you sure you want to remove the',
	'此仓库的 Issue 链接': ' Issue Linking of this repository from Git Graph',
	'全局配置的': ' globally configured',
	' Issue 链接': ' Issue Linking',
	'无法配置"Pull Request 创建"集成': 'Unable to Configure "Pull Request Creation" Integration',
	'仓库必须至少有一个远程仓库才能配置"Pull Request 创建"集成。当前仓库没有任何远程仓库。': 'The repository must have at least one remote repository to configure the "Pull Request Creation" integration. This repository does not have any remote repositories.',
	'确定要移除已配置的"Pull Request 创建"集成吗？': 'Are you sure you want to remove the configured "Pull Request Creation" integration?',
	'导出 Git Graph 仓库配置将生成一个可提交到此仓库的文件。它允许其他在此仓库中工作的人使用相同的配置。': 'Exporting the Git Graph repository configuration will generate a file that can be committed to this repository. It allows other people working in this repository to use the same configuration.',
	'是，导出': 'Yes, Export',
	// '导出仓库配置' already defined above

	// === Dialog misc ===
	'分离头指针（detached HEAD）': 'detached HEAD',
	'仅跟踪提交的第一个父提交': 'Only Follow the First Parent of Commits',
	'后，可能会有一些提交从 Git Graph 视图中隐藏，这可能会影响执行此操作的结果。': ', some commits may be hidden from the Git Graph View, which could affect the outcome of this action.',
	'注意：启用': 'Note: Enabling "',
	'正在删除标签': 'Deleting Tag',
	'正在添加标签': 'Adding Tag',
	'正在从远程获取': 'Fetching from Remote(s)',
	// '名称' already defined above
	'名为': 'The name'
};

/**
 * Initialize the i18n module with the configured language.
 * Called once during GitGraphView construction.
 */
function initI18n(language: string, vscodeLanguage?: string) {
	isAutoLanguage = language === 'auto' || !language;

	if (isAutoLanguage) {
		// Auto-detect from VS Code language
		effectiveLanguage = (vscodeLanguage && vscodeLanguage.startsWith('en')) ? 'en' : 'zh';
	} else {
		effectiveLanguage = language === 'en' ? 'en' : 'zh';
	}

	activeLanguage = effectiveLanguage;

	if (activeLanguage === 'en') {
		startDomTranslation();
	}
}

/**
 * Translate a Chinese string to the active language.
 * If the active language is Chinese, returns the input unchanged.
 * If English, looks up the translation dictionary.
 */
function t(zh: string): string {
	if (activeLanguage === 'zh') return zh;
	return translations[zh] ?? zh;
}

/**
 * Returns true if the effective language is English.
 */
function isEnglish(): boolean {
	return activeLanguage === 'en';
}

/**
 * Returns true if the effective language is Chinese.
 */
function isChinese(): boolean {
	return activeLanguage === 'zh';
}

// ============================================================
// DOM-level Runtime Translation
// ============================================================

/**
 * Attributes whose values should be translated.
 */
const TRANSLATABLE_ATTRS = ['title', 'placeholder', 'alt', 'aria-label', 'value'];

/**
 * Set of tags whose text content should NOT be translated
 * (e.g. code blocks, script/style tags).
 */
const SKIP_TAGS = new Set(['SCRIPT', 'STYLE', 'CODE', 'PRE', 'INPUT', 'TEXTAREA']);

/**
 * Translation keys sorted by length (longest first), cached for performance.
 */
const SORTED_KEYS = Object.keys(translations).sort((a, b) => b.length - a.length);

/**
 * Translate a single text string using the dictionary.
 * Tries exact match first, then tries replacing known substrings.
 */
function translateText(text: string): string {
	const trimmed = text.trim();
	if (trimmed === '') return text;

	// Exact match
	if (translations[trimmed]) {
		return text.replace(trimmed, translations[trimmed]);
	}

	// Substring replacement: try all known keys, longest first (cached)
	let result = text;
	let changed = false;
	for (const key of SORTED_KEYS) {
		if (result.includes(key)) {
			result = result.split(key).join(translations[key]);
			changed = true;
		}
	}

	return changed ? result : text;
}

/**
 * Check if a string contains any Chinese characters.
 */
function containsChinese(text: string): boolean {
	return /[\u4e00-\u9fff]/.test(text);
}

/**
 * Process a single DOM node: translate its text content and attributes.
 */
function translateNode(node: Node) {
	// Text nodes
	if (node.nodeType === Node.TEXT_NODE) {
		const text = node.textContent;
		if (text && containsChinese(text)) {
			const translated = translateText(text);
			if (translated !== text) {
				node.textContent = translated;
			}
		}
		return;
	}

	if (node.nodeType !== Node.ELEMENT_NODE) return;

	const elem = node as Element;

	// Skip certain tags
	if (SKIP_TAGS.has(elem.tagName)) return;

	// Translate attributes
	for (const attr of TRANSLATABLE_ATTRS) {
		const val = elem.getAttribute(attr);
		if (val && containsChinese(val)) {
			const translated = translateText(val);
			if (translated !== val) {
				elem.setAttribute(attr, translated);
			}
		}
	}

	// Recurse into children
	Array.prototype.forEach.call(elem.childNodes, (child: Node) => {
		translateNode(child);
	});
}

/**
 * Start DOM-level translation: translate existing content, then observe mutations.
 */
function startDomTranslation() {
	// Translate existing content
	translateNode(document.body);

	// Observe future DOM changes
	const observer = new MutationObserver((mutations) => {
		for (const mutation of mutations) {
			if (mutation.type === 'childList') {
				for (const node of Array.from(mutation.addedNodes)) {
					if (node.nodeType === Node.TEXT_NODE || node.nodeType === Node.ELEMENT_NODE) {
						translateNode(node);
					}
				}
			} else if (mutation.type === 'characterData') {
				const text = mutation.target.textContent;
				if (text && containsChinese(text)) {
					const translated = translateText(text);
					if (translated !== text) {
						mutation.target.textContent = translated;
					}
				}
			} else if (mutation.type === 'attributes') {
				const elem = mutation.target as Element;
				if (elem) translateNode(elem);
			}
		}
	});

	observer.observe(document.body, {
		childList: true,
		subtree: true,
		characterData: true,
		attributes: true,
		attributeFilter: TRANSLATABLE_ATTRS
	});
}
