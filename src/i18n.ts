import * as vscode from 'vscode';

/**
 * Supported UI languages.
 */
type Language = 'zh' | 'en';

/** The active language (defaults to 'en' until initI18nBackend() is called). */
let activeLanguage: Language = 'en';

/** Translation entries. */
type Entry = { zh: string; en: string };

/**
 * Master translation table for backend strings.
 * Key = semantic identifier (shared with frontend where applicable).
 */
const STRINGS: Record<string, Entry> = {
	// === gitGraphView HTML ===
	unableLoadGitGraph: { zh: '无法加载 Git Graph', en: 'Unable to Load Git Graph' },
	noReposFound: { zh: 'Git Graph 上次扫描时未在当前工作区中找到 Git 仓库。', en: 'Git Graph did not find any Git repositories in the current workspace when it was last scanned.' },
	maxDepthSearchPrefix: { zh: '如果您的仓库位于打开的工作区文件夹的子文件夹中，请确保已正确设置 Git Graph 设置 "git-graph.maxDepthOfRepoSearch"（阅读', en: 'If your repository is located in a subfolder of a workspace folder that is open, please ensure that the Git Graph setting "git-graph.maxDepthOfRepoSearch" is set correctly (read the ' },
	documentation: { zh: '文档', en: 'documentation' },
	maxDepthSearchSuffix: { zh: '了解更多信息）。', en: ' for more information).' },
	rescanWorkspace: { zh: '重新扫描当前工作区以查找仓库', en: 'Rescan Workspace for Repositories' },
	repoColon: { zh: '仓库: ', en: 'Repository: ' },
	branchColon: { zh: '分支: ', en: 'Branch: ' },
	authorColon: { zh: '作者: ', en: 'Author: ' },
	tagColon: { zh: '标签: ', en: 'Tag: ' },
	current: { zh: '当前', en: 'Current' },
	find: { zh: '查找', en: 'Find' },
	openTerminal: { zh: '为此仓库打开终端', en: 'Open Terminal for this Repository' },
	showRemoteBranches: { zh: '显示远程分支', en: 'Show Remote Branches' },
	repoSettings: { zh: '仓库设置', en: 'Repository Settings' },
	noReposInWorkspace: { zh: '在当前工作区中未找到 Git 仓库。', en: 'No Git repositories were found in the current workspace.' },

	// === commands.ts ===
	cmdSearchCommitsDesc: { zh: '按提交消息、作者或哈希值搜索提交历史（支持正则表达式）', en: 'Search commit history by message, author or hash (regex supported)' },
	cmdSearchCommitsPlaceholder: { zh: '输入搜索关键词', en: 'Enter search keywords' },
	cmdSelectRepo: { zh: '选择要搜索的仓库', en: 'Select a repository to search' },
	cmdSelectCommit: { zh: '选择要在 Git Graph 中查看的提交', en: 'Select a commit to view in Git Graph' },
	cmdSearchError: { zh: '搜索提交历史时出错。', en: 'An error occurred while searching the commit history.' },
	cmdNoCommitsFound: { zh: '未找到匹配该查询的提交。', en: 'No commits were found matching the query.' },
	cmdUnknownSubject: { zh: '<未知提交主题>', en: '<Unknown Commit Subject>' },
	cmdRestoreCR: { zh: '恢复工作区中的特定代码审查...', en: 'Resume a specific Code Review in Workspace...' },
	cmdSelectCR: { zh: '选择要恢复的代码审查：', en: 'Select the Code Review you want to resume:' },
	cmdNoActiveCR: { zh: '当前工作区中没有正在进行的代码审查。', en: 'There are no Code Reviews in progress within the current workspace.' },
	cmdEndCRSuccess: { zh: '已成功结束代码审查', en: 'Successfully ended Code Review' },
	cmdEndCR: { zh: '结束工作区中的特定代码审查...', en: 'End a specific Code Review in Workspace...' },
	cmdSelectEndCR: { zh: '选择要结束的代码审查：', en: 'Select the Code Review you want to end:' },
	cmdEndAllCR: { zh: '已结束工作区中的所有代码审查', en: 'Ended All Code Reviews in Workspace' },
	cmdClearAvatar: { zh: '清除头像缓存', en: 'Clear Avatar Cache' },
	cmdAvatarCleared: { zh: '头像缓存已成功清除。', en: 'The Avatar Cache was successfully cleared.' },
	cmdFetch: { zh: '从远程获取', en: 'Fetch from Remote(s)' },
	cmdSelectRepoFetch: { zh: '选择要在 Git Graph 中打开并从远程获取的仓库：', en: 'Select the repository you want to open in Git Graph, and fetch from remote(s):' },
	cmdViewGitGraph: { zh: '查看 Git Graph', en: 'View Git Graph' },
	cmdNotRecognisedRepo: { zh: '不识别仓库', en: 'is not a recognised repository' },
	cmdCouldNotAdd: { zh: '因此无法将其添加到 Git Graph。', en: ' Therefore it could not be added to Git Graph.' },
	cmdAddedToGG: { zh: '已添加到 Git Graph。', en: ' has been added to Git Graph.' },
	cmdFolder: { zh: '文件夹', en: 'Folder' },
	cmdNotInWorkspace: { zh: '不在当前打开的 Visual Studio Code 工作区内，因此无法添加到 Git Graph。', en: 'is not within the opened Visual Studio Code workspace, and therefore could not be added to Git Graph.' },
	cmdSelectRepoRemove: { zh: '选择要从 Git Graph 中移除的仓库：', en: 'Select a repository to remove from Git Graph:' },
	cmdRemovedFromGG: { zh: '已从 Git Graph 中移除。', en: ' has been removed from Git Graph.' },
	cmdUnableOpenFile: { zh: '无法打开文件：', en: 'Unable to Open File: ' },
	cmdUnableOpenFileNoArgs: { zh: '无法打开文件：该命令未使用所需参数调用。', en: 'Unable to Open File: The command was not called with the required arguments.' },
	cmdOs: { zh: '操作系统: ', en: '\nOS: ' },
	cmdVersion: { zh: '版本：', en: 'Version: ' },
	cmdVersionError: { zh: '获取版本信息时发生意外错误。', en: 'An unexpected error occurred while retrieving version information.' },
	cmdUnexpectedError: { zh: '时发生意外错误。', en: 'An unexpected error occurred while ' },
	cmdRunningCmd: { zh: '运行命令', en: 'Running command' },
	cmdCopy: { zh: '复制', en: 'Copy' },
	cmdNone: { zh: '(无)', en: '(none)' },

	// === dataSource.ts ===
	dsRebasing: { zh: '变基于', en: 'Rebase on' },
	dsOpenExternalDirCompare: { zh: '打开外部目录比较', en: 'Open External Directory Diff' },
	dsMerging: { zh: '合并', en: 'Merge' },
	dsGitSubprocessError: { zh: '启动 Git 子进程时发生意外错误。', en: 'An unexpected error occurred starting the Git subprocess.' },

	// === diffDocProvider.ts ===
	ddlUnableGetFile: { zh: '无法获取文件：', en: 'Unable to retrieve file: ' },
	ddlInternalError: { zh: 'provideTextDocumentContent 内部错误: ', en: 'Internal error in provideTextDocumentContent: ' },

	// === repoManager.ts ===
	rmNotGitRepo: { zh: '不是 Git 仓库。', en: 'is not a Git repository.' },
	rmAlreadyIncluded: { zh: '包含在已知的仓库', en: 'is already included in the known repositories' },
	rmImportConfig: { zh: '导入 Git Graph 仓库配置。', en: 'Import Git Graph repository configuration.' },
	rmInvalidValue: { zh: '的值无效。', en: ' has an invalid value.' },
	rmNo: { zh: '否', en: 'No' },
	rmYes: { zh: '是', en: 'Yes' },
	rmDetectedRepo: { zh: '检测到仓库', en: 'Detected repository' },
	rmChecking: { zh: '检查', en: 'Checking' },
	rmCheckDirError: { zh: '目录是否存在时发生意外错误。此目录用于存储 Git Graph 仓库配置文件。', en: 'An unexpected error occurred while checking if a directory exists. This directory is used to store the Git Graph repository configuration files.' },
	rmConfigFile: { zh: '配置文件', en: 'Configuration file' },
	rmUnableWriteConfig: { zh: '无法将 Git Graph 仓库配置文件写入', en: 'Unable to write the Git Graph repository configuration files to' },
	rmExportSuccess: { zh: '已成功将 Git Graph 仓库配置导出到', en: 'Successfully exported the Git Graph repository configuration to' },
	rmConfigRepoSuccess: { zh: '已成功为仓库', en: 'Successfully configured repository' },
	rmNewerConfig: { zh: '有更新的 Git Graph 仓库配置文件。是否要用新的更改覆盖当前的仓库配置？', en: ' has a newer Git Graph repository configuration file. Would you like to overwrite the current repository configuration with the new changes?' },
	rmIn: { zh: '中', en: ' in ' },
	rmFolder: { zh: '文件夹', en: 'Folder' },

	// === repoManager.ts (带占位符) ===
	rmFolderNotGitRepo: { zh: '文件夹 "{0}" 不是 Git 仓库。', en: 'The folder "{0}" is not a Git repository.' },
	rmFolderAlreadyIncluded: { zh: '文件夹 "{0}" 包含在已知的仓库 "{1}" 中。', en: 'The folder "{0}" is contained within the known repository "{1}".' },
	rmNewerConfigPrompt: { zh: '检测到仓库 "{0}" 有更新的 Git Graph 仓库配置文件。是否要用新的更改覆盖当前的仓库配置？', en: 'A newer Git Graph Repository Configuration File has been detected for the repository "{0}". Would you like to override your current repository configuration with the new changes?' },
	rmConfigRepoSuccessVar: { zh: '已成功为仓库 "{0}" 导入 Git Graph 仓库配置。', en: 'Git Graph Repository Configuration was successfully imported for the repository "{0}".' },
	rmInvalidConfigValue: { zh: '配置文件 "{0}" 中 "{1}" 的值无效。', en: 'The value for "{1}" in the configuration file "{0}" is invalid.' },
	rmUnableWriteConfigVar: { zh: '无法将 Git Graph 仓库配置文件写入 "{0}"。', en: 'Failed to write the Git Graph Repository Configuration File to "{0}".' },
	rmExportSuccessVar: { zh: '已成功将 Git Graph 仓库配置导出到 "{0}"。', en: 'Successfully exported the Git Graph Repository Configuration to "{0}".' },
	rmCheckDirErrorVar: { zh: '检查 "{0}" 目录是否存在时发生意外错误。此目录用于存储 Git Graph 仓库配置文件。', en: 'An unexpected error occurred while checking if the "{0}" directory exists. This directory is used to store the Git Graph Repository Configuration file.' },

	// === statusBarItem.ts ===
	sbiViewGitGraph: { zh: '查看 Git Graph', en: 'View Git Graph' },

	// === utils.ts ===
	utilsThisFeature: { zh: '此功能', en: 'this feature' },
	utilsGitVersion: { zh: '当前安装的是 Git', en: 'Git version' },
	utilsInstallNewer: { zh: '请安装更新版本的 Git 以使用此功能。', en: 'Please install a newer version of Git to use this feature.' },
	utilsSetGitPath: { zh: '设为现有 Git 可执行文件的路径和文件名，或者安装 Git 并重启 Visual Studio Code。', en: 'to the path and filename of an existing Git executable, or install Git and restart Visual Studio Code.' },
	utilsUnableFindGit: { zh: '无法找到 Git 可执行文件。请：将 Visual Studio Code 设置', en: 'Unable to find a Git executable. Either: Set the Visual Studio Code Setting' },
	utilsRequiresNewerGit: { zh: '需要更新版本的 Git (>=', en: 'This feature requires a newer version of Git (>=' },

	// === extension.ts ===
	extNotValidGitPath: { zh: '不包含与有效 Git 可执行文件路径和文件名匹配的字符串', en: 'does not contain a string matching a valid Git executable path and filename' },
	extNewValue: { zh: '的新值（', en: ' to a new value of (' },
	extNowUsing: { zh: '现在使用', en: ' is now using' },
	extNotMatchValidGit: { zh: '与有效 Git 可执行文件的路径和文件名不匹配', en: 'does not match a valid Git executable path and filename' },

	// === commands.ts (带占位符) ===
	cmdAddedToGGVar: { zh: '仓库 "{0}" 已添加到 Git Graph。', en: 'The repository "{0}" was added to Git Graph.' },
	cmdFolderNotInWorkspace: { zh: '文件夹 "{0}" 不在当前打开的 Visual Studio Code 工作区内，因此无法添加到 Git Graph。', en: 'The folder "{0}" is not within the opened Visual Studio Code workspace, and therefore could not be added to Git Graph.' },
	cmdRemovedFromGGVar: { zh: '仓库 "{0}" 已从 Git Graph 中移除。', en: 'The repository "{0}" was removed from Git Graph.' },
	cmdNotRecognisedRepoVar: { zh: 'Git Graph 不识别仓库 "{0}"。', en: 'The repository "{0}" is not known to Git Graph.' },
	cmdEndCRSuccessVar: { zh: '已成功结束代码审查"{0}"。', en: 'Successfully ended Code Review "{0}".' },
	cmdRunningCmdError: { zh: '运行命令"{0}"时发生意外错误。', en: 'An unexpected error occurred while running the command "{0}".' },

	// === utils.ts (带占位符) ===
	utilsUnableFindGitFull: { zh: '无法找到 Git 可执行文件。请：将 Visual Studio Code 设置 "git.path" 设为现有 Git 可执行文件的路径和文件名，或者安装 Git 并重启 Visual Studio Code。', en: 'Unable to find a Git executable. Either: Set the Visual Studio Code Setting "git.path" to the path and filename of an existing Git executable, or install Git and restart Visual Studio Code.' },
	utilsIncompatibleGit: { zh: '{0}需要更新版本的 Git (>= {1})。当前安装的是 Git {2}。请安装更新版本的 Git 以使用此功能。', en: 'A newer version of Git (>= {1}) is required for {0}. Git {2} is currently installed. Please install a newer version of Git to use this feature.' },

	// === extension.ts (带占位符) ===
	extNowUsingMsg: { zh: 'Git Graph 现在使用 {0}（版本：{1}）', en: 'Git Graph is now using {0} (version: {1})' },
	extNewValueNotValid: { zh: '"git.path" 的新值（"{0}"）不包含与有效 Git 可执行文件路径和文件名匹配的字符串。', en: 'The new value of "git.path" ("{0}") does not contain a string matching a valid Git executable path and filename.' },
	extNewValueNotMatch: { zh: '"git.path" 的新值（"{0}"）与有效 Git 可执行文件的路径和文件名不匹配。', en: 'The new value of "git.path" ("{0}") does not match a valid Git executable path and filename.' }
};

/**
 * Initialize the i18n module.
 * Reads the language from VS Code config and resolves auto detection.
 */
export function initI18nBackend() {
	const config = vscode.workspace.getConfiguration('git-graph');
	const language = config.get<string>('language', 'auto');

	if (language === 'auto' || !language) {
		activeLanguage = vscode.env.language.startsWith('en') ? 'en' : 'zh';
	} else {
		activeLanguage = language === 'en' ? 'en' : 'zh';
	}
}

/**
 * Get the active language.
 */
export function getLanguage(): Language {
	return activeLanguage;
}

/**
 * Translate a semantic key to the active language.
 * Supports {0}, {1}, ... placeholders for runtime substitution.
 */
export function t(key: string, ...args: (string | number)[]): string {
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
