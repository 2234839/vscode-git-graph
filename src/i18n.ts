import * as vscode from 'vscode';

/**
 * Supported UI languages.
 */
type Language = 'zh' | 'en';

/** The active language. */
let activeLanguage: Language = 'zh';

/** Whether the language was auto-detected. */
let isAutoLanguage = true;

/**
 * Translation dictionary: Chinese key → English value.
 * Used when activeLanguage === 'en'.
 */
const translations: { [key: string]: string } = {
	// === commands.ts ===
	'按提交消息、作者或哈希值搜索提交历史（支持正则表达式）': 'Search commit history by message, author or hash (regex supported)',
	'输入搜索关键词': 'Enter search keywords',
	'选择要搜索的仓库': 'Select a repository to search',
	'选择要在 Git Graph 中查看的提交': 'Select a commit to view in Git Graph',
	'搜索提交历史时出错。': 'An error occurred while searching the commit history.',
	'未找到匹配该查询的提交。': 'No commits were found matching the query.',
	'未知提交主题>': '<Unknown Commit Subject>',
	'恢复工作区中的特定代码审查...': 'Restore a specific code review in the workspace...',
	'选择要恢复的代码审查：': 'Select a code review to restore:',
	'当前工作区中没有正在进行的代码审查。': 'There are no active code reviews in the current workspace.',
	'已成功结束代码审查': 'Successfully ended the code review',
	'结束工作区中的特定代码审查...': 'End a specific code review in the workspace...',
	'选择要结束的代码审查：': 'Select a code review to end:',
	'已结束工作区中的所有代码审查': 'Ended all code reviews in the workspace',
	'清除头像缓存': 'Clear Avatar Cache',
	'头像缓存已成功清除。': 'The avatar cache was successfully cleared.',
	'从远程获取': 'Fetch from Remote',
	'选择要在 Git Graph 中打开并从远程获取的仓库：': 'Select a repository to open in Git Graph and fetch from its remotes:',
	'查看 Git Graph': 'View Git Graph',
	'不识别仓库': 'is not a recognised repository',
	'因此无法将其添加到 Git Graph。': ', so it could not be added to Git Graph.',
	'已添加到 Git Graph。': ' has been added to Git Graph.',
	'文件夹': 'Folder',
	'仓库': 'Repository',
	'不在当前打开的 Visual Studio Code 工作区内，因此无法添加到 Git Graph。': 'is not within the currently open Visual Studio Code workspace, so it could not be added to Git Graph.',
	'选择要从 Git Graph 中移除的仓库：': 'Select a repository to remove from Git Graph:',
	'已从 Git Graph 中移除。': ' has been removed from Git Graph.',
	'无法打开文件：': 'Unable to open file: ',
	'无法打开文件：该命令未使用所需参数调用。': 'Unable to open file: The command was not called with the required arguments.',
	'操作系统: ': 'Operating System: ',
	'版本：': 'Version: ',
	'获取版本信息时发生意外错误。': 'An unexpected error occurred while getting the version information.',
	'时发生意外错误。': 'An unexpected error occurred while ',
	'运行命令': 'Running command',
	'复制': 'Copy',

	// === dataSource.ts ===
	'变基于': 'Rebasing onto',
	'打开外部目录比较': 'Open External Directory Compare',
	'合并': 'Merging',
	'启动 Git 子进程时发生意外错误。': 'An unexpected error occurred starting the Git subprocess.',

	// === diffDocProvider.ts ===
	'无法获取文件：': 'Unable to get file: ',

	// === extension.ts ===
	'不包含与有效 Git 可执行文件路径和文件名匹配的字符串': 'does not contain a string matching a valid Git executable path and filename',
	'的新值（': ' to a new value of (',
	'现在使用': ' is now using',
	'与有效 Git 可执行文件的路径和文件名不匹配': 'does not match a valid Git executable path and filename',

	// === gitGraphView.ts ===
	'仓库设置': 'Repository Settings',
	'仓库:': 'Repository:',
	'分支:': 'Branch:',
	'作者:': 'Author:',
	'标签:': 'Tag:',
	'查找': 'Find',
	'当前': 'Current',
	'为此仓库打开终端': 'Open Terminal for this Repository',
	'显示远程分支': 'Show Remote Branches',
	'无法加载 Git Graph': 'Unable to Load Git Graph',
	'重新扫描当前工作区以查找仓库': 'Rescan Workspace for Repositories',
	'Git Graph 上次扫描时未在当前工作区中找到 Git 仓库。': 'Git Graph did not find any Git repositories in the current workspace when it was last scanned.',
	'如果您的仓库位于打开的工作区文件夹的子文件夹中，请确保已正确设置 Git Graph 设置 "git-graph.maxDepthOfRepoSearch"（阅读': 'If your repository is located in a subfolder of a workspace folder that is open, please ensure that the Git Graph setting "git-graph.maxDepthOfRepoSearch" is set correctly (read the ',
	'文档': 'documentation',
	'了解更多信息）。': ' for more information).',

	// === repoManager.ts ===
	'包含在已知的仓库': 'is already included in the known repositories',
	'不是 Git 仓库。': 'is not a Git repository.',
	'导入 Git Graph 仓库配置。': 'Import Git Graph repository configuration.',
	'的值无效。': ' has an invalid value.',
	'否': 'No',
	'检测到仓库': 'Detected repository',
	'检查': 'Checking',
	'目录是否存在时发生意外错误。此目录用于存储 Git Graph 仓库配置文件。': 'An unexpected error occurred while checking if a directory exists. This directory is used to store the Git Graph repository configuration files.',
	'配置文件': 'Configuration file',
	'是': 'Yes',
	'无法将 Git Graph 仓库配置文件写入': 'Unable to write the Git Graph repository configuration files to',
	'已成功将 Git Graph 仓库配置导出到': 'Successfully exported the Git Graph repository configuration to',
	'已成功为仓库': 'Successfully configured repository',
	'有更新的 Git Graph 仓库配置文件。是否要用新的更改覆盖当前的仓库配置？': ' has a newer Git Graph repository configuration file. Would you like to overwrite the current repository configuration with the new changes?',
	'中': ' in ',

	// === statusBarItem.ts ===

	// === utils.ts ===
	'此功能': 'This feature',
	'当前安装的是 Git': 'Git version',
	'请安装更新版本的 Git 以使用此功能。': 'Please install a newer version of Git to use this feature.',
	'设为现有 Git 可执行文件的路径和文件名，或者安装 Git 并重启 Visual Studio Code。': 'to the path and filename of an existing Git executable, or install Git and restart Visual Studio Code.',
	'无法找到 Git 可执行文件。请：将 Visual Studio Code 设置': 'Unable to find the Git executable. Please: set the Visual Studio Code setting',
	'需要更新版本的 Git (>=': 'This feature requires a newer version of Git (>='
};

/**
 * Initialize the i18n module.
 * Reads the language from VS Code config and resolves auto detection.
 */
export function initI18nBackend() {
	const config = vscode.workspace.getConfiguration('git-graph');
	const language = config.get<string>('language', 'auto');

	isAutoLanguage = language === 'auto' || !language;

	if (isAutoLanguage) {
		const vscodeLang = vscode.env.language;
		activeLanguage = vscodeLang.startsWith('en') ? 'en' : 'zh';
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
 * Translate a Chinese string to the active language.
 * If the active language is Chinese, returns the input unchanged.
 * If English, looks up the translation dictionary.
 */
export function t(zh: string): string {
	if (activeLanguage === 'zh') return zh;
	return translations[zh] ?? zh;
}
