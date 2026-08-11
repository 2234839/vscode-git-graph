import * as vscode from 'vscode';
import { AvatarManager } from './avatarManager';
import { CommandManager } from './commands';
import { getConfig } from './config';
import { DataSource } from './dataSource';
import { DiffDocProvider } from './diffDocProvider';
import { ExtensionState } from './extensionState';
import { initI18nBackend, t } from './i18n';
import { onStartUp } from './life-cycle/startup';
import { Logger } from './logger';
import { RepoManager } from './repoManager';
import { StatusBarItem } from './statusBarItem';
import {
	GitExecutable,
	findGit,
	getGitExecutableFromPaths,
	getUnableToFindGitMsg,
	showErrorMessage,
	showInformationMessage
} from './utils';
import { EventEmitter } from './utils/event';

/**
 * Activate Git Graph.
 * @param context The context of the extension.
 */
export async function activate(context: vscode.ExtensionContext) {
	const logger = new Logger();
	logger.log('Starting Git Graph ...');

	initI18nBackend();

	const gitExecutableEmitter = new EventEmitter<GitExecutable>();
	const onDidChangeGitExecutable = gitExecutableEmitter.subscribe;

	const extensionState = new ExtensionState(context, onDidChangeGitExecutable);

	let gitExecutable: GitExecutable | null;
	try {
		gitExecutable = await findGit(extensionState);
		gitExecutableEmitter.emit(gitExecutable);
		logger.log('Using ' + gitExecutable.path + ' (version: ' + gitExecutable.version + ')');
	} catch (_) {
		gitExecutable = null;
		const unableMsg = getUnableToFindGitMsg();
		showErrorMessage(unableMsg);
		logger.logError(unableMsg);
	}

	const configurationEmitter = new EventEmitter<vscode.ConfigurationChangeEvent>();
	const onDidChangeConfiguration = configurationEmitter.subscribe;

	const dataSource = new DataSource(
		gitExecutable,
		onDidChangeConfiguration,
		onDidChangeGitExecutable,
		logger
	);
	const avatarManager = new AvatarManager(dataSource, extensionState, logger);
	const repoManager = new RepoManager(dataSource, extensionState, onDidChangeConfiguration, logger);
	const statusBarItem = new StatusBarItem(
		repoManager.getNumRepos(),
		repoManager.onDidChangeRepos,
		onDidChangeConfiguration,
		logger
	);
	const commandManager = new CommandManager(
		context,
		avatarManager,
		dataSource,
		extensionState,
		repoManager,
		gitExecutable,
		onDidChangeGitExecutable,
		logger
	);
	const diffDocProvider = new DiffDocProvider(dataSource);

	context.subscriptions.push(
		vscode.workspace.registerTextDocumentContentProvider(DiffDocProvider.scheme, diffDocProvider),
		vscode.workspace.onDidChangeConfiguration((event) => {
			if (event.affectsConfiguration('git-graph')) {
				initI18nBackend();
				configurationEmitter.emit(event);
			} else if (event.affectsConfiguration('git.path')) {
				const paths = getConfig().gitPaths;
				if (paths.length === 0) return;

				getGitExecutableFromPaths(paths).then(
					(gitExecutable) => {
						gitExecutableEmitter.emit(gitExecutable);
						const msg =
              t('extNowUsingMsg', gitExecutable.path, gitExecutable.version);
						showInformationMessage(msg);
						logger.log(msg);
						repoManager.searchWorkspaceForRepos();
					},
					() => {
						const msg =
              (paths.length > 1
              	? t('extNewValueNotValid', paths.join('", "'))
              	: t('extNewValueNotMatch', paths.join('", "')));
						showErrorMessage(msg);
						logger.logError(msg);
					}
				);
			}
		}),
		diffDocProvider,
		commandManager,
		statusBarItem,
		repoManager,
		avatarManager,
		dataSource,
		configurationEmitter,
		extensionState,
		gitExecutableEmitter,
		logger
	);
	logger.log('Started Git Graph - Ready to use!');

	extensionState.expireOldCodeReviews();
	onStartUp(context).catch(() => {});
}

/**
 * Deactivate Git Graph.
 */
export function deactivate() {}
