import * as GG from 'backend-types';
import {
  SVG_ICONS,
  GIT_FILE_CHANGE_TYPES,
  GIT_SIGNATURE_STATUS_DESCRIPTIONS,
  CLASS_PENDING_REVIEW,
} from './constants';
import { CLASS_CONTEXT_MENU_ACTIVE } from './contextMenu';
import { escapeHtml, alterClass, getChildUl } from './utils';
import {
  type Config,
  type FileTreeFolder,
  type FileTreeNode,
  type FileTreeLeaf,
  type FileTreeFile,
  getWindowGlobals,
} from '../types';

/**
 * 文件树 / 文件视图 HTML 生成与操作函数
 *
 * 从 mainController.ts 提取的模块级函数，供 Pinia store 和（未来）组件使用。
 * 纯函数 + DOM 操作，不持有状态。
 */

const initialState = getWindowGlobals().initialState;

/* ================================================================
 * HTML 生成
 * ================================================================ */

export function generateFileViewHtml(
  folder: FileTreeFolder,
  gitFiles: ReadonlyArray<GG.GitFileChange>,
  lastViewedFile: string | null,
  fileContextMenuOpen: number,
  type: GG.FileViewType,
  isUncommitted: boolean,
) {
  return type === GG.FileViewType.List ?
      generateFileListHtml(folder, gitFiles, lastViewedFile, fileContextMenuOpen, isUncommitted)
    : generateFileTreeHtml(
        folder,
        gitFiles,
        lastViewedFile,
        fileContextMenuOpen,
        isUncommitted,
        true,
      );
}

function generateFileTreeHtml(
  folder: FileTreeFolder,
  gitFiles: ReadonlyArray<GG.GitFileChange>,
  lastViewedFile: string | null,
  fileContextMenuOpen: number,
  isUncommitted: boolean,
  topLevelFolder: boolean,
): string {
  const curFolderInfo =
    topLevelFolder || !(initialState.config as Config).commitDetailsView.fileTreeCompactFolders ?
      { folder, name: folder.name, pathSeg: folder.name }
    : getCurrentFolderInfo(folder, folder.name, folder.name);

  const children = sortFolderKeys(curFolderInfo.folder).map((key) => {
    const cur = curFolderInfo.folder.contents[key];
    return cur.type === 'folder' ?
        generateFileTreeHtml(
          cur,
          gitFiles,
          lastViewedFile,
          fileContextMenuOpen,
          isUncommitted,
          false,
        )
      : generateFileTreeLeafHtml(
          cur.name,
          cur,
          gitFiles,
          lastViewedFile,
          fileContextMenuOpen,
          isUncommitted,
        );
  });

  return (
    (topLevelFolder ? '' : (
      '<li' +
      (curFolderInfo.folder.open ? '' : ' class="closed"') +
      ' data-pathseg="' +
      encodeURIComponent(curFolderInfo.pathSeg) +
      '"><span class="fileTreeFolder' +
      (curFolderInfo.folder.reviewed ? '' : ' ' + CLASS_PENDING_REVIEW) +
      '" title="./' +
      escapeHtml(curFolderInfo.folder.folderPath) +
      '" data-folderpath="' +
      encodeURIComponent(curFolderInfo.folder.folderPath) +
      '"><span class="fileTreeFolderIcon">' +
      (curFolderInfo.folder.open ? SVG_ICONS.openFolder : SVG_ICONS.closedFolder) +
      '</span><span class="gitFolderName">' +
      escapeHtml(curFolderInfo.name) +
      '</span></span>'
    )) +
    '<ul class="fileTreeFolderContents' +
    (curFolderInfo.folder.open ? '' : ' hidden') +
    '">' +
    children.join('') +
    '</ul>' +
    (topLevelFolder ? '' : '</li>')
  );
}

function getCurrentFolderInfo(
  folder: FileTreeFolder,
  name: string,
  pathSeg: string,
): { folder: FileTreeFolder; name: string; pathSeg: string } {
  const keys = Object.keys(folder.contents);
  let child: FileTreeNode;
  return keys.length === 1 && (child = folder.contents[keys[0]]).type === 'folder' ?
      getCurrentFolderInfo(
        child as FileTreeFolder,
        name + ' / ' + child.name,
        pathSeg + '/' + child.name,
      )
    : { folder, name, pathSeg };
}

function generateFileListHtml(
  folder: FileTreeFolder,
  gitFiles: ReadonlyArray<GG.GitFileChange>,
  lastViewedFile: string | null,
  fileContextMenuOpen: number,
  isUncommitted: boolean,
) {
  const sortLeaves = (folder: FileTreeFolder, folderPath: string) => {
    let keys = sortFolderKeys(folder);
    let items: { relPath: string; leaf: FileTreeLeaf }[] = [];
    for (const key of keys) {
      let cur = folder.contents[key];
      let relPath = (folderPath !== '' ? folderPath + '/' : '') + cur.name;
      if (cur.type === 'folder') {
        items = items.concat(sortLeaves(cur, relPath));
      } else {
        items.push({ relPath, leaf: cur });
      }
    }
    return items;
  };
  let sortedLeaves = sortLeaves(folder, '');
  let html = '';
  for (const item of sortedLeaves) {
    html += generateFileTreeLeafHtml(
      item.relPath,
      item.leaf,
      gitFiles,
      lastViewedFile,
      fileContextMenuOpen,
      isUncommitted,
    );
  }
  return '<ul class="fileTreeFolderContents">' + html + '</ul>';
}

function generateFileTreeLeafHtml(
  name: string,
  leaf: FileTreeLeaf,
  gitFiles: ReadonlyArray<GG.GitFileChange>,
  lastViewedFile: string | null,
  fileContextMenuOpen: number,
  isUncommitted: boolean,
) {
  let encodedName = encodeURIComponent(name),
    escapedName = escapeHtml(name);
  if (leaf.type === 'file') {
    const fileTreeFile: GG.GitFileChange = gitFiles[leaf.index];
    const type = fileTreeFile.type;
    const textFile = fileTreeFile.additions !== null && fileTreeFile.deletions !== null;
    const diffPossible = type === GG.GitFileStatus.Untracked || textFile;
    const changeTypeMessage =
      GIT_FILE_CHANGE_TYPES[type] +
      (type === GG.GitFileStatus.Renamed ?
        ' (' +
        escapeHtml(fileTreeFile.oldFilePath) +
        ' → ' +
        escapeHtml(fileTreeFile.newFilePath) +
        ')'
      : '');
    return (
      '<li data-pathseg="' +
      encodedName +
      '"><span class="fileTreeFileRecord' +
      (leaf.index === fileContextMenuOpen ? ' ' + CLASS_CONTEXT_MENU_ACTIVE : '') +
      '" data-index="' +
      leaf.index +
      '"><span class="fileTreeFile' +
      (diffPossible ? ' gitDiffPossible' : '') +
      (leaf.reviewed ? '' : ' ' + CLASS_PENDING_REVIEW) +
      '" title="' +
      (diffPossible ? 'Click to View Diff' : (
        'Unable to View Diff' +
        (type !== GG.GitFileStatus.Deleted ? ' (this is a binary file)' : '')
      )) +
      ' • ' +
      changeTypeMessage +
      '"><span class="fileTreeFileIcon">' +
      SVG_ICONS.file +
      '</span><span class="gitFileName ' +
      type +
      '">' +
      escapedName +
      '</span></span>' +
      ((initialState.config as Config).enhancedAccessibility ?
        '<span class="fileTreeFileType" title="' + changeTypeMessage + '">' + type + '</span>'
      : '') +
      ((
        type !== GG.GitFileStatus.Added &&
        type !== GG.GitFileStatus.Untracked &&
        type !== GG.GitFileStatus.Deleted &&
        textFile
      ) ?
        '<span class="fileTreeFileAddDel">(<span class="fileTreeFileAdd" title="' +
        fileTreeFile.additions +
        ' addition' +
        (fileTreeFile.additions !== 1 ? 's' : '') +
        '">+' +
        fileTreeFile.additions +
        '</span>|<span class="fileTreeFileDel" title="' +
        fileTreeFile.deletions +
        ' deletion' +
        (fileTreeFile.deletions !== 1 ? 's' : '') +
        '">-' +
        fileTreeFile.deletions +
        '</span>)</span>'
      : '') +
      (fileTreeFile.newFilePath === lastViewedFile ?
        '<span id="cdvLastFileViewed" title="Last File Viewed">' + SVG_ICONS.eyeOpen + '</span>'
      : '') +
      '<span class="copyGitFile fileTreeFileAction" title="Copy Absolute File Path to Clipboard">' +
      SVG_ICONS.copy +
      '</span>' +
      (type !== GG.GitFileStatus.Deleted ?
        (diffPossible && !isUncommitted ?
          '<span class="viewGitFileAtRevision fileTreeFileAction" title="View File at this Revision">' +
          SVG_ICONS.commit +
          '</span>'
        : '') +
        '<span class="openGitFile fileTreeFileAction" title="Open File">' +
        SVG_ICONS.openFile +
        '</span>'
      : '') +
      '</span></li>'
    );
  } else {
    return (
      '<li data-pathseg="' +
      encodedName +
      '"><span class="fileTreeRepo" data-path="' +
      encodeURIComponent(leaf.path) +
      '" title="Click to View Repository"><span class="fileTreeRepoIcon">' +
      SVG_ICONS.closedFolder +
      '</span>' +
      escapedName +
      '</span></li>'
    );
  }
}

export function generateSignatureHtml(signature: GG.GitSignature) {
  const status: GG.GitSignatureStatus = signature.status;
  return (
    '<span class="signatureInfo ' +
    status +
    '" title="' +
    GIT_SIGNATURE_STATUS_DESCRIPTIONS[status] +
    ': Signed by ' +
    escapeHtml(signature.signer !== '' ? signature.signer : '<Unknown>') +
    ' (GPG Key Id: ' +
    escapeHtml(signature.key !== '' ? signature.key : '<Unknown>') +
    ')">' +
    (status === GG.GitSignatureStatus.GoodAndValid ? SVG_ICONS.passed
    : status === GG.GitSignatureStatus.Bad ? SVG_ICONS.failed
    : SVG_ICONS.inconclusive) +
    '</span>'
  );
}

/* ================================================================
 * 文件树状态操作
 * ================================================================ */

export function alterFileTreeFolderOpen(folder: FileTreeFolder, folderPath: string, open: boolean) {
  let path = folderPath.split('/'),
    i,
    cur = folder;
  for (i = 0; i < path.length; i++) {
    if (typeof cur.contents[path[i]] !== 'undefined') {
      cur = cur.contents[path[i]] as FileTreeFolder;
      if (i === path.length - 1) cur.open = open;
    } else {
      return;
    }
  }
}

export function alterFileTreeFileReviewed(
  folder: FileTreeFolder,
  filePath: string,
  reviewed: boolean,
) {
  let path = filePath.split('/'),
    i,
    cur = folder,
    folders: FileTreeFolder[] = [folder];
  for (i = 0; i < path.length; i++) {
    if (typeof cur.contents[path[i]] !== 'undefined') {
      if (i < path.length - 1) {
        cur = cur.contents[path[i]] as FileTreeFolder;
        folders.push(cur);
      } else {
        (cur.contents[path[i]] as FileTreeFile).reviewed = reviewed;
      }
    } else {
      break;
    }
  }

  /** 重新计算通向该文件的各级文件夹是否已全部 reviewed（从最深层往上） */
  for (i = folders.length - 1; i >= 0; i--) {
    let keys = Object.keys(folders[i].contents),
      entireFolderReviewed = true;
    for (const key of keys) {
      let cur = folders[i].contents[key];
      if ((cur.type === 'folder' || cur.type === 'file') && !cur.reviewed) {
        entireFolderReviewed = false;
        break;
      }
    }
    folders[i].reviewed = entireFolderReviewed;
  }
}

export function setFileTreeReviewed(folder: FileTreeFolder, reviewed: boolean) {
  folder.reviewed = reviewed;
  let keys = Object.keys(folder.contents);
  for (const key of keys) {
    let cur = folder.contents[key];
    if (cur.type === 'folder') {
      setFileTreeReviewed(cur, reviewed);
    } else if (cur.type === 'file') {
      cur.reviewed = reviewed;
    }
  }
}

export function calcFileTreeFoldersReviewed(folder: FileTreeFolder) {
  const calc = (folder: FileTreeFolder) => {
    let reviewed = true;
    let keys = Object.keys(folder.contents);
    for (const key of keys) {
      let cur = folder.contents[key];
      if ((cur.type === 'folder' && !calc(cur)) || (cur.type === 'file' && !cur.reviewed))
        reviewed = false;
    }
    folder.reviewed = reviewed;
    return reviewed;
  };
  calc(folder);
}

/* ================================================================
 * 文件树 HTML DOM 更新
 * ================================================================ */

export function updateFileTreeHtml(elem: HTMLElement, folder: FileTreeFolder) {
  let ul = getChildUl(elem);
  if (ul === null) return;

  for (let i = 0; i < ul.children.length; i++) {
    let li = ul.children[i] as HTMLLIElement;
    let pathSeg = decodeURIComponent(li.dataset.pathseg!);
    let child = getChildByPathSegment(folder, pathSeg);
    if (child.type === 'folder') {
      alterClass(li.children[0] as HTMLSpanElement, CLASS_PENDING_REVIEW, !child.reviewed);
      updateFileTreeHtml(li, child);
    } else if (child.type === 'file') {
      alterClass(
        li.children[0].children[0] as HTMLSpanElement,
        CLASS_PENDING_REVIEW,
        !child.reviewed,
      );
    }
  }
}

export function updateFileTreeHtmlFileReviewed(
  elem: HTMLElement,
  folder: FileTreeFolder,
  filePath: string,
) {
  let path = filePath;
  const update = (elem: HTMLElement, folder: FileTreeFolder) => {
    let ul = getChildUl(elem);
    if (ul === null) return;

    for (let i = 0; i < ul.children.length; i++) {
      let li = ul.children[i] as HTMLLIElement;
      let pathSeg = decodeURIComponent(li.dataset.pathseg!);
      if (path === pathSeg || path.startsWith(pathSeg + '/')) {
        let child = getChildByPathSegment(folder, pathSeg);
        if (child.type === 'folder') {
          alterClass(li.children[0] as HTMLSpanElement, CLASS_PENDING_REVIEW, !child.reviewed);
          path = path.substring(pathSeg.length + 1);
          update(li, child);
        } else if (child.type === 'file') {
          alterClass(
            li.children[0].children[0] as HTMLSpanElement,
            CLASS_PENDING_REVIEW,
            !child.reviewed,
          );
        }
        break;
      }
    }
  };
  update(elem, folder);
}

export function getFilesInTree(folder: FileTreeFolder, gitFiles: ReadonlyArray<GG.GitFileChange>) {
  let files: string[] = [];
  const scanFolder = (folder: FileTreeFolder) => {
    let keys = Object.keys(folder.contents);
    for (const key of keys) {
      let cur = folder.contents[key];
      if (cur.type === 'folder') {
        scanFolder(cur);
      } else if (cur.type === 'file') {
        files.push(gitFiles[cur.index].newFilePath);
      }
    }
  };
  scanFolder(folder);
  return files;
}

/* ================================================================
 * 内部工具
 * ================================================================ */

function sortFolderKeys(folder: FileTreeFolder) {
  let keys = Object.keys(folder.contents);
  keys.sort((a, b) =>
    folder.contents[a].type !== 'file' && folder.contents[b].type === 'file' ? -1
    : folder.contents[a].type === 'file' && folder.contents[b].type !== 'file' ? 1
    : folder.contents[a].name.localeCompare(folder.contents[b].name),
  );
  return keys;
}

function getChildByPathSegment(folder: FileTreeFolder, pathSeg: string) {
  let cur: FileTreeNode = folder;
  let comps = pathSeg.split('/');
  for (const comp of comps) {
    cur = (cur as FileTreeFolder).contents[comp];
  }
  return cur;
}
