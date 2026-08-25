import * as path from 'path';
import * as vscode from 'vscode';
import { DataSource } from './dataSource';
import { GitFileStatus } from './types';
import { UNCOMMITTED, getPathFromStr } from './utils';
import { Disposable, toDisposable } from './utils/disposable';
import { t } from './i18n';

export const enum DiffSide {
  Old,
  New,
}

/**
 * Manages providing a specific revision of a repository file for use in the Visual Studio Code Diff View.
 */
export class DiffDocProvider extends Disposable implements vscode.TextDocumentContentProvider {
  public static scheme = 'git-graph';
  private readonly dataSource: DataSource;
  private readonly docs = new Map<string, DiffDocument>();
  private readonly onDidChangeEventEmitter = new vscode.EventEmitter<vscode.Uri>();

  /**
   * Creates the Git Graph Diff Document Provider.
   * @param dataSource The Git Graph DataSource instance.
   */
  constructor(dataSource: DataSource) {
  	super();
  	this.dataSource = dataSource;

  	this.registerDisposables(
  		vscode.workspace.onDidCloseTextDocument((doc) => this.docs.delete(doc.uri.toString())),
  		this.onDidChangeEventEmitter,
  		toDisposable(() => this.docs.clear())
  	);
  }

  /**
   * An event to signal a resource has changed.
   */
  get onDidChange() {
  	return this.onDidChangeEventEmitter.event;
  }

  /**
   * Provides the content of a text document at a specific Git revision.
   * @param uri The `git-graph://file.ext?encoded-data` URI.
   * @returns The content of the text document.
   */
  public async provideTextDocumentContent(uri: vscode.Uri): Promise<string> {
  	try {
  		const document = this.docs.get(uri.toString());
  		if (document) {
  			return document.value;
  		}

  		const request = decodeDiffDocUri(uri);
  		if (!request.exists) {
  			return '';
  		}

  		return await this.dataSource
  			.getCommitFile(request.repo, request.commit, request.filePath)
  			.then(
  				(contents) => {
  					const document = new DiffDocument(contents);
  					this.docs.set(uri.toString(), document);
  					return document.value;
  				},
  				(errorMessage) => {
  					vscode.window.showErrorMessage(t('ddlUnableGetFile') + errorMessage);
  					return '';
  				}
  			);
  	} catch (err) {
  		return t('ddlInternalError') + (err instanceof Error ? err.message : err);
  	}
  }
}

/**
 * Represents the content of a Diff Document.
 */
class DiffDocument {
  private readonly body: string;

  /**
   * Creates a Diff Document with the specified content.
   * @param body The content of the document.
   */
  constructor(body: string) {
  	this.body = body;
  }

  /**
   * Get the content of the Diff Document.
   */
  get value() {
  	return this.body;
  }
}

/**
 * Provides a specific revision of a binary repository file (e.g. images) to Visual Studio Code.
 * Unlike the TextDocumentContentProvider above, a FileSystemProvider returns raw bytes,
 * which enables VS Code's built-in viewers for images, PDFs, audio and video.
 */
export class BinaryDocProvider extends Disposable implements vscode.FileSystemProvider {
  public static scheme = 'git-graph-bin';
  private readonly dataSource: DataSource;
  private readonly onDidChangeFileEmitter = new vscode.EventEmitter<vscode.FileChangeEvent[]>();

  /**
   * Creates the Git Graph Binary Document Provider.
   * @param dataSource The Git Graph DataSource instance.
   */
  constructor(dataSource: DataSource) {
    super();
    this.dataSource = dataSource;
    this.registerDisposables(this.onDidChangeFileEmitter);
  }

  get onDidChangeFile() {
    return this.onDidChangeFileEmitter.event;
  }

  public watch(): vscode.Disposable {
    return new vscode.Disposable(() => {});
  }

  /**
   * Returns a basic file stat.
   */
  public stat(): vscode.FileStat {
    return { type: vscode.FileType.File, ctime: 0, mtime: 0, size: 0 };
  }

  public readDirectory(): Thenable<[string, vscode.FileType][]> {
    return Promise.reject(vscode.FileSystemError.NoPermissions());
  }

  public createDirectory(): void {
    throw vscode.FileSystemError.NoPermissions();
  }

  /**
   * Reads the raw bytes of a file at a specific Git revision.
   * @param uri The `git-graph-bin://file.ext?encoded-data` URI.
   */
  public async readFile(uri: vscode.Uri): Promise<Uint8Array> {
    const request = decodeDiffDocUri(uri);
    if (!request.exists) {
      return new Uint8Array(0);
    }
    const contents = await this.dataSource.getCommitFileRaw(request.repo, request.commit, request.filePath);
    return new Uint8Array(contents);
  }

  public writeFile(): void {
    throw vscode.FileSystemError.NoPermissions();
  }

  public delete(): void {
    throw vscode.FileSystemError.NoPermissions();
  }

  public rename(): void {
    throw vscode.FileSystemError.NoPermissions();
  }
}

/**
 * File extensions of common binary formats, which VS Code can render with its built-in viewers.
 */
const BINARY_EXTENSIONS = new Set([
  'png', 'jpg', 'jpeg', 'gif', 'webp', 'bmp', 'ico', 'avif', 'tiff', 'tif',
  'pdf', 'mp3', 'wav', 'ogg', 'flac', 'mp4', 'webm', 'mov', 'avi', 'mkv',
  'woff', 'woff2', 'ttf', 'otf', 'eot', 'zip', 'gz', 'tar', 'jar', 'doc',
  'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'exe', 'dll', 'so', 'dylib', 'class', 'wasm'
]);

/**
 * Check whether a file path is likely a binary file, based on its extension.
 * @param filePath The path of the file.
 * @returns Whether the file should be opened through the BinaryDocProvider.
 */
export function isBinaryFilePath(filePath: string): boolean {
  const ext = filePath.split('.').pop();
  return ext !== undefined && BINARY_EXTENSIONS.has(ext.toLowerCase());
}

/* Encoding and decoding URI's */

/**
 * Represents the data passed through `git-graph://file.ext?encoded-data` URI's by the DiffDocProvider.
 */
type DiffDocUriData = {
  filePath: string;
  commit: string;
  repo: string;
  exists: boolean;
};

/**
 * Produce the URI of a file to be used in the Visual Studio Diff View.
 * @param repo The repository the file is within.
 * @param filePath The path of the file.
 * @param commit The commit hash specifying the revision of the file.
 * @param type The Git file status of the change.
 * @param diffSide The side of the Diff View that this URI will be displayed on.
 * @returns A URI of the form `git-graph://file.ext?encoded-data`, `git-graph-bin://file.ext?encoded-data` (binary files) or `file://path/file.ext`
 */
export function encodeDiffDocUri(
	repo: string,
	filePath: string,
	commit: string,
	type: GitFileStatus,
	diffSide: DiffSide
): vscode.Uri {
	if (commit === UNCOMMITTED && type !== GitFileStatus.Deleted) {
		return vscode.Uri.file(path.join(repo, filePath));
	}

	// Binary files are served through the BinaryDocProvider, so VS Code renders
	// them with its built-in viewers (images, PDFs, ...) instead of as text.
	const scheme = isBinaryFilePath(filePath) ? BinaryDocProvider.scheme : DiffDocProvider.scheme;

	const fileDoesNotExist =
    (diffSide === DiffSide.Old && type === GitFileStatus.Added) ||
    (diffSide === DiffSide.New && type === GitFileStatus.Deleted);
	const data: DiffDocUriData = {
		filePath: getPathFromStr(filePath),
		commit: commit,
		repo: repo,
		exists: !fileDoesNotExist
	};

	return vscode.Uri.file(data.filePath + (fileDoesNotExist ? ' (non-existent)' : '')).with({
		scheme: scheme,
		query: Buffer.from(JSON.stringify(data)).toString('base64')
	});
}

/**
 * Decode the data from a `git-graph://file.ext?encoded-data` URI.
 * @param uri The URI to decode data from.
 * @returns The decoded DiffDocUriData.
 */
export function decodeDiffDocUri(uri: vscode.Uri): DiffDocUriData {
	let query = uri.query;
	// In VS Code > 1.38 (and especially 1.80+), URI query parameters may be URL encoded automatically.
	// We must decode the URI component before decoding the base64 string to prevent padding errors.
	if (query.includes('%')) {
		query = decodeURIComponent(query);
	}
	return JSON.parse(Buffer.from(query, 'base64').toString());
}
