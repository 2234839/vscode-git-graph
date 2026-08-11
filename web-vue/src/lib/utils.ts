/**
 * 工具函数模块
 *
 * 从原 web/utils.ts 迁移，去掉全局变量依赖，改为通过回调/参数传入。
 */
import * as GG from 'backend-types';
import {
  HTML_ESCAPES, HTML_UNESCAPES, HTML_ESCAPER_REGEX, HTML_UNESCAPER_REGEX,
  MONTHS, SVG_ICONS, GIT_FILE_CHANGE_TYPES, ID_EVENT_CAPTURE_ELEM,
} from './constants';
import { UNCOMMITTED } from '../types';

/* General Helpers */

export function arraysEqual<T>(a: ReadonlyArray<T>, b: ReadonlyArray<T>, equalElements: (a: T, b: T) => boolean) {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    if (!equalElements(a[i], b[i])) return false;
  }
  return true;
}

export function arraysStrictlyEqual<T>(a: ReadonlyArray<T>, b: ReadonlyArray<T>) {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) return false;
  }
  return true;
}

export function arraysStrictlyEqualIgnoringOrder<T>(a: ReadonlyArray<T>, b: ReadonlyArray<T>) {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    if (b.indexOf(a[i]) === -1) return false;
  }
  return true;
}

export function modifyColourOpacity(colour: string, opacity: number) {
  let fadedCol = 'rgba(0,0,0,0)', match;
  if ((match = colour.match(/rgba\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)\s*\)/)) !== null) {
    fadedCol = 'rgba(' + match[1] + ',' + match[2] + ',' + match[3] + ',' + (parseFloat(match[4]) * opacity).toFixed(2) + ')';
  } else if ((match = colour.match(/#\s*([0-9a-fA-F]+)/)) !== null) {
    let hex = match[1];
    let length = hex.length;
    if (length === 3 || length === 4 || length === 6 || length === 8) {
      let col = length < 5
        ? { r: hex[0] + hex[0], g: hex[1] + hex[1], b: hex[2] + hex[2], a: length === 4 ? hex[3] + hex[3] : 'ff' }
        : { r: hex[0] + hex[1], g: hex[2] + hex[3], b: hex[4] + hex[5], a: length === 8 ? hex[6] + hex[7] : 'ff' };
      fadedCol = 'rgba(' + parseInt(col.r, 16) + ',' + parseInt(col.g, 16) + ',' + parseInt(col.b, 16) + ',' + (parseInt(col.a, 16) * opacity / 255).toFixed(2) + ')';
    }
  } else if ((match = colour.match(/rgb\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)\s*\)/)) !== null) {
    fadedCol = 'rgba(' + match[1] + ',' + match[2] + ',' + match[3] + ',' + opacity + ')';
  }
  return fadedCol;
}

export function pad2(i: number) {
  return i > 9 ? i : '0' + i;
}

export function getRepoName(path: string) {
  const firstSep = path.indexOf('/');
  if (firstSep === path.length - 1 || firstSep === -1) {
    return path;
  } else {
    const p = path.endsWith('/') ? path.substring(0, path.length - 1) : path;
    return p.substring(p.lastIndexOf('/') + 1);
  }
}

export function getSortedRepositoryPaths(repos: GG.GitRepoSet, order: GG.RepoDropdownOrder): ReadonlyArray<string> {
  const repoPaths = Object.keys(repos);
  if (order === GG.RepoDropdownOrder.WorkspaceFullPath) {
    return repoPaths.sort((a, b) => repos[a].workspaceFolderIndex === repos[b].workspaceFolderIndex
      ? a.localeCompare(b)
      : repos[a].workspaceFolderIndex === null
        ? 1
        : repos[b].workspaceFolderIndex === null
          ? -1
          : repos[a].workspaceFolderIndex! - repos[b].workspaceFolderIndex!
    );
  } else if (order === GG.RepoDropdownOrder.FullPath) {
    return repoPaths.sort((a, b) => a.localeCompare(b));
  } else {
    return repoPaths.map((path) => ({ name: repos[path].name || getRepoName(path), path: path }))
      .sort((a, b) => a.name !== b.name ? a.name.localeCompare(b.name) : a.path.localeCompare(b.path))
      .map((x) => x.path);
  }
}

/* HTML Escape / Unescape */

export function escapeHtml(str: string) {
  return str.replace(HTML_ESCAPER_REGEX, (match) => HTML_ESCAPES[match]);
}

export function unescapeHtml(str: string) {
  return str.replace(HTML_UNESCAPER_REGEX, (match) => HTML_UNESCAPES[match]);
}

/* Formatters */

export function formatCommaSeparatedList(items: string[]) {
  let str = '';
  for (let i = 0; i < items.length; i++) {
    str += (i > 0 ? (i < items.length - 1 ? ', ' : ' & ') : '') + items[i];
  }
  return str;
}

export function formatShortDate(unixTimestamp: number, dateFormat: GG.DateFormat) {
  const date = new Date(unixTimestamp * 1000);
  let dateStr = dateFormat.iso
    ? date.getFullYear() + '-' + pad2(date.getMonth() + 1) + '-' + pad2(date.getDate())
    : date.getDate() + ' ' + MONTHS[date.getMonth()] + ' ' + date.getFullYear();
  let hourMinsStr = pad2(date.getHours()) + ':' + pad2(date.getMinutes());
  let formatted;

  if (dateFormat.type === GG.DateFormatType.DateAndTime) {
    formatted = dateStr + ' ' + hourMinsStr;
  } else if (dateFormat.type === GG.DateFormatType.DateOnly) {
    formatted = dateStr;
  } else {
    let diff = Math.round((new Date()).getTime() / 1000) - unixTimestamp, unit;
    if (diff < 60) { unit = 'second'; }
    else if (diff < 3600) { unit = 'minute'; diff /= 60; }
    else if (diff < 86400) { unit = 'hour'; diff /= 3600; }
    else if (diff < 604800) { unit = 'day'; diff /= 86400; }
    else if (diff < 2629800) { unit = 'week'; diff /= 604800; }
    else if (diff < 31557600) { unit = 'month'; diff /= 2629800; }
    else { unit = 'year'; diff /= 31557600; }
    diff = Math.round(diff);
    formatted = diff + ' ' + unit + (diff !== 1 ? 's' : '') + ' ago';
  }
  return {
    title: dateStr + ' ' + hourMinsStr + ':' + pad2(date.getSeconds()),
    formatted: formatted,
  };
}

export function formatLongDate(unixTimestamp: number, isoDateFormat: boolean) {
  const date = new Date(unixTimestamp * 1000);
  if (isoDateFormat) {
    let timezoneOffset = date.getTimezoneOffset();
    let absoluteTimezoneOffset = Math.abs(timezoneOffset);
    let timezone = timezoneOffset === 0 ? 'Z' : ' ' + (timezoneOffset < 0 ? '+' : '-') + pad2(Math.floor(absoluteTimezoneOffset / 60)) + pad2(absoluteTimezoneOffset % 60);
    return date.getFullYear() + '-' + pad2(date.getMonth() + 1) + '-' + pad2(date.getDate()) + ' ' + pad2(date.getHours()) + ':' + pad2(date.getMinutes()) + ':' + pad2(date.getSeconds()) + timezone;
  } else {
    return date.toString();
  }
}

/* DOM Helpers */

export function addListenerToClass(className: string, event: string, eventListener: EventListener) {
  addListenerToCollectionElems(document.getElementsByClassName(className), event, eventListener);
}

export function addListenerToCollectionElems(elems: HTMLCollectionOf<Element>, event: string, eventListener: EventListener) {
  for (let i = 0; i < elems.length; i++) {
    elems[i].addEventListener(event, eventListener);
  }
}

export function insertAfter(newNode: HTMLElement, referenceNode: HTMLElement) {
  referenceNode.parentNode!.insertBefore(newNode, referenceNode.nextSibling);
}

export function insertBeforeFirstChildWithClass(newChild: HTMLElement, parent: HTMLElement, className: string) {
  let referenceNode: Node | null = null;
  for (let i = 0; i < parent.children.length; i++) {
    if (parent.children[i].classList.contains(className)) {
      referenceNode = parent.children[i];
      break;
    }
  }
  parent.insertBefore(newChild, referenceNode);
}

export function alterClass(elem: HTMLElement, className: string, state: boolean) {
  if (elem.classList.contains(className) !== state) {
    if (state) elem.classList.add(className);
    else elem.classList.remove(className);
    return true;
  }
  return false;
}

export function alterClassOfCollection(elems: HTMLCollectionOf<HTMLElement>, className: string, state: boolean) {
  const lockedElems = [];
  for (let i = 0; i < elems.length; i++) lockedElems.push(elems[i]);
  for (let i = 0; i < lockedElems.length; i++) alterClass(lockedElems[i], className, state);
}

export function getChildNodesWithTextContent(elem: Node) {
  let textChildren: Node[] = [];
  for (let i = 0; i < elem.childNodes.length; i++) {
    if (elem.childNodes[i].childNodes.length > 0) {
      textChildren.push(...getChildNodesWithTextContent(elem.childNodes[i]));
    } else if (elem.childNodes[i].textContent !== null && elem.childNodes[i].textContent !== '') {
      textChildren.push(elem.childNodes[i]);
    }
  }
  return textChildren;
}

export function getChildrenWithClassName(elem: Element, className: string) {
  let children: Element[] = [];
  for (let i = 0; i < elem.children.length; i++) {
    if (elem.children[i].children.length > 0) {
      children.push(...getChildrenWithClassName(elem.children[i], className));
    } else if (elem.children[i].className === className) {
      children.push(elem.children[i]);
    }
  }
  return children;
}

export function getChildUl(elem: HTMLElement) {
  for (let i = 0; i < elem.children.length; i++) {
    if (elem.children[i].tagName === 'UL') return <HTMLUListElement>elem.children[i];
  }
  return null;
}

export function observeElemScroll(id: string, initialScrollTop: number, onScroll: (scrollTop: number) => void, onScrolled: () => void) {
  const elem = document.getElementById(id);
  if (elem === null) return;
  let timeout: ReturnType<typeof setTimeout> | null = null;
  elem.scroll(0, initialScrollTop);
  elem.addEventListener('scroll', () => {
    const el = document.getElementById(id);
    if (el === null) return;
    onScroll(el.scrollTop);
    if (timeout !== null) clearTimeout(timeout);
    timeout = setTimeout(() => { onScrolled(); timeout = null; }, 250);
  });
}

export function getCommitElems() {
  return <HTMLCollectionOf<HTMLElement>>document.getElementsByClassName('commit');
}

/* RepoState config helpers (从 main.ts 迁移，接受 config 参数) */

/** 解析 BooleanOverride 为实际 boolean */
export function getShowStashes(repoValue: GG.BooleanOverride, configShowStashes: boolean) {
  return repoValue === GG.BooleanOverride.Default ? configShowStashes : repoValue === GG.BooleanOverride.Enabled;
}

export function getShowTags(repoValue: GG.BooleanOverride, configShowTags: boolean) {
  return repoValue === GG.BooleanOverride.Default ? configShowTags : repoValue === GG.BooleanOverride.Enabled;
}

export function getIncludeCommitsMentionedByReflogs(repoValue: GG.BooleanOverride, configValue: boolean) {
  return repoValue === GG.BooleanOverride.Default ? configValue : repoValue === GG.BooleanOverride.Enabled;
}

export function getOnlyFollowFirstParent(repoValue: GG.BooleanOverride, configValue: boolean) {
  return repoValue === GG.BooleanOverride.Default ? configValue : repoValue === GG.BooleanOverride.Enabled;
}

export function getOnRepoLoadShowCheckedOutBranch(repoValue: GG.BooleanOverride, configValue: boolean) {
  return repoValue === GG.BooleanOverride.Default ? configValue : repoValue === GG.BooleanOverride.Enabled;
}

export function getOnRepoLoadShowSpecificBranches(repoValue: ReadonlyArray<string> | null, configValue: ReadonlyArray<string>): ReadonlyArray<string> {
  return repoValue === null ? configValue : repoValue;
}

/** 缩写 commit hash 到 8 位 */
export function abbrevCommit(commitHash: string) {
  return commitHash.substring(0, 8);
}

/**
 * 计算分支标签（heads + remotes），根据配置决定是否合并显示
 * @param combineLocalAndRemote 是否合并本地和远程分支标签
 */
export function getBranchLabels(heads: ReadonlyArray<string>, remotes: ReadonlyArray<GG.GitCommitRemote>, combineLocalAndRemote: boolean) {
  let headLabels: { name: string; remotes: string[] }[] = [],
    headLookup: { [name: string]: number } = {},
    remoteLabels: ReadonlyArray<GG.GitCommitRemote>;
  for (let i = 0; i < heads.length; i++) {
    headLabels.push({ name: heads[i], remotes: [] });
    headLookup[heads[i]] = i;
  }
  if (combineLocalAndRemote) {
    let remainingRemoteLabels: GG.GitCommitRemote[] = [];
    for (let i = 0; i < remotes.length; i++) {
      if (remotes[i].remote !== null) {
        let branchName = remotes[i].name.substring(remotes[i].remote!.length + 1);
        if (typeof headLookup[branchName] === 'number') {
          headLabels[headLookup[branchName]].remotes.push(remotes[i].remote!);
          continue;
        }
      }
      remainingRemoteLabels.push(remotes[i]);
    }
    remoteLabels = remainingRemoteLabels;
  } else {
    remoteLabels = remotes;
  }
  return { heads: headLabels, remotes: remoteLabels };
}

export function findCommitElemWithId(elems: HTMLCollectionOf<HTMLElement>, id: number | null) {
  if (id === null) return null;
  let findIdStr = id.toString();
  for (let i = 0; i < elems.length; i++) {
    if (findIdStr === elems[i].dataset.id) return elems[i];
  }
  return null;
}

export function handledEvent(event: Event) {
  event.preventDefault();
  event.stopPropagation();
}

export function getNonce() {
  let text = '';
  const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  for (let i = 0; i < 32; i++) text += possible.charAt(Math.floor(Math.random() * possible.length));
  return text;
}

/* Image Resizer */

export class ImageResizer {
  private canvas: HTMLCanvasElement | null = null;
  private context: CanvasRenderingContext2D | null = null;

  public resize(dataUri: string, callback: (dataUri: string) => void) {
    if (this.canvas === null) this.canvas = document.createElement('canvas');
    if (this.context === null) this.context = this.canvas.getContext('2d');
    if (this.context === null) { callback(dataUri); return; }

    let image = new Image();
    image.onload = () => {
      let outputDataUri = '';
      if (this.canvas === null || this.context === null) {
        outputDataUri = dataUri;
      } else {
        let size = Math.ceil(18 * window.devicePixelRatio);
        if (this.canvas.width !== size) this.canvas.width = size;
        if (this.canvas.height !== size) this.canvas.height = size;
        this.context.clearRect(0, 0, size, size);
        this.context.drawImage(image, 0, 0, size, size);
        outputDataUri = this.canvas.toDataURL();
      }
      callback(outputDataUri);
    };
    image.src = dataUri;
  }
}

/* Event Overlay */

let _contextMenuCloseFn: (() => boolean) | null = null;

/**
 * 注入 contextMenu.close 回调（解决循环依赖）
 */
export function setContextMenuCloseFn(fn: (() => boolean) | null) {
  _contextMenuCloseFn = fn;
}

export class EventOverlay {
  private move: EventListener | null = null;
  private stop: EventListener | null = null;

  /**
   * Create an event overlay.
   * @param className The class name to be used for the event overlay.
   * @param move A callback to be invoked if the user moves the mouse over the event overlay.
   * @param stop A callback to be invoked if the user moves the mouse off the event overlay.
   */
  public create(className: string, move: EventListener | null, stop: EventListener | null) {
    if (document.getElementById(ID_EVENT_CAPTURE_ELEM) !== null) this.remove();

    const eventOverlayElem = document.createElement('div');
    eventOverlayElem.id = ID_EVENT_CAPTURE_ELEM;
    eventOverlayElem.className = className;

    this.move = move;
    this.stop = stop;
    if (this.move !== null) {
      eventOverlayElem.addEventListener('mousemove', this.move);
    }
    if (this.stop !== null) {
      eventOverlayElem.addEventListener('mouseup', this.stop);
      eventOverlayElem.addEventListener('mouseleave', this.stop);
    }

    if (_contextMenuCloseFn !== null) {
      _contextMenuCloseFn();
    }

    document.body.appendChild(eventOverlayElem);
  }

  /**
   * Remove the event overlay that is currently active in the view.
   */
  public remove() {
    let eventOverlayElem = document.getElementById(ID_EVENT_CAPTURE_ELEM);
    if (eventOverlayElem === null) return;

    if (this.move !== null) {
      eventOverlayElem.removeEventListener('mousemove', this.move);
      this.move = null;
    }
    if (this.stop !== null) {
      eventOverlayElem.removeEventListener('mouseup', this.stop);
      eventOverlayElem.removeEventListener('mouseleave', this.stop);
      this.stop = null;
    }

    document.body.removeChild(eventOverlayElem);
  }
}

/* Re-export commonly used */
export { SVG_ICONS, GIT_FILE_CHANGE_TYPES };
export { UNCOMMITTED };
