/* NOT FOR BROWSER */

import {decodeHtml, sanitizeAlt} from './string';
import type * as parse5 from 'parse5';
import type {RenderOpt} from '../base';
import type {AstNodes, ListRangeToken, Token} from '../internal';

declare type Prefix = '#' | '*' | ';' | ':';
declare interface State {

	/** whether a `<dt>` tag is open */
	dt: boolean[];
}
declare type Element = parse5.DefaultTreeAdapterTypes.Element;
declare type TextNode = parse5.DefaultTreeAdapterTypes.TextNode;
declare type Fragment = parse5.DefaultTreeAdapterTypes.DocumentFragment;
declare type ChildNode = Element | TextNode;

/* NOT FOR BROWSER END */

declare type HTMLChildNode = HTMLElement | Text;

/**
 * get common prefix length
 * @param prefix
 * @param lastPrefix
 */
export const getCommon = (prefix: string, lastPrefix: string): number =>
	prefix.startsWith(lastPrefix) ? lastPrefix.length : [...lastPrefix].findIndex((ch, i) => ch !== prefix[i]);

/* NOT FOR BROWSER */

/**
 * get next list item
 * @param char list syntax
 * @param state
 * @param state.dt
 */
const nextItem = (char: Prefix, {dt}: State): string => {
	if (char === '*' || char === '#') {
		return '</li>\n<li>';
	}
	const {length} = dt,
		close = dt.at(-1) ? '</dt>\n' : '</dd>\n';
	if (char === ';') {
		dt[length - 1] = true;
		return `${close}<dt>`;
	}
	dt[length - 1] = false;
	return `${close}<dd>`;
};

/**
 * close list item
 * @param chars list syntax
 * @param state
 * @param state.dt
 */
const closeList = (chars: string, {dt}: State): string => {
	let result = '';
	for (let i = chars.length - 1; i >= 0; i--) {
		const char = chars[i] as Prefix;
		switch (char) {
			case '*':
			case '#':
				result += `</li></${char === '*' ? 'ul' : 'ol'}>`;
				break;
			case ':':
				result += `</${dt.pop() ? 'dt' : 'dd'}></dl>`;
			// no default
		}
	}
	return result;
};

/**
 * open list item
 * @param chars list syntax
 * @param state
 * @param state.dt
 */
const openList = (chars: string, {dt}: State): string => {
	let result = '';
	for (const char of chars) {
		switch (char as Prefix) {
			case '*':
			case '#':
				result += `<${char === '*' ? 'ul' : 'ol'}><li>`;
				break;
			case ':':
				dt.push(false);
				result += '<dl><dd>';
				break;
			default:
				dt.push(true);
				result += '<dl><dt>';
		}
	}
	return result;
};

/**
 * convert to HTML
 * @param childNodes a Token's contents
 * @param separator delimiter between nodes
 * @param opt options
 */
export const html = (childNodes: Iterable<AstNodes>, separator: string, opt: HtmlOpt = {}): string => {
	let lastPrefix = '';
	const results: string[] = [],
		{removeBlank} = opt,
		state: State = {dt: []};
	delete opt.removeBlank;
	let skip = 0;
	for (const child of childNodes) {
		if (skip) {
			skip--;
			continue;
		}
		let result = child.toHtmlInternal(opt);
		if (child.is('list-range')) {
			const {previousSibling, firstChild, childNodes: chs} = child,
				{innerText} = previousSibling,
				prefix = innerText.trim();
			if (firstChild?.is('list')) { // 嵌套的<dl>
				for (const ch of chs) {
					if (ch.is('list') || ch.is('dd')) {
						ch.firstChild.insertData(0, prefix);
					}
				}
				child.insertAdjacent([...chs], 1);
				continue;
			} else if (
				(child.length > 0 || /\s$/u.test(innerText))
				&& previousSibling.is('list')
				&& !/[;#*]/u.test(innerText)
				&& child.closest('ext-inner#poem,list-range')?.type === 'ext-inner'
			) {
				lastPrefix = '';
				result = `<span class="mw-poem-indented" style="display: inline-block; margin-inline-start: ${
					previousSibling.indent
				}em;">${result}</span>`;
			} else {
				result = result.trim();
				const prefix2 = prefix.replaceAll(';', ':'),
					commonPrefixLength = getCommon(prefix2, lastPrefix);
				let pre = closeList(lastPrefix.slice(commonPrefixLength), state);
				if (prefix.length === commonPrefixLength) {
					pre += nextItem(prefix.slice(-1) as Prefix, state);
				} else {
					if (state.dt.at(-1) && prefix[commonPrefixLength - 1] === ':') {
						pre += nextItem(':', state);
					}
					if (lastPrefix) {
						pre += '\n';
					}
					pre += openList(prefix.slice(commonPrefixLength), state);
				}
				result = pre + result;
				let {nextSibling} = child;
				while (nextSibling?.is('dd')) {
					const next = nextSibling.nextSibling as ListRangeToken;
					result += nextItem(':', state) + next.toHtmlInternal(opt).trim();
					({nextSibling} = next);
					skip += 2;
				}
				if (
					nextSibling?.type === 'text'
					&& nextSibling.data === '\n'
					&& nextSibling.nextVisibleSibling?.is('list')
				) {
					skip += 2;
					lastPrefix = prefix2;
				} else {
					lastPrefix = '';
					result += closeList(prefix2, state);
				}
			}
		}
		results.push(result);
	}
	return (removeBlank ? results.filter(result => result !== '') : results).join(separator);
};

/**
 * get the id of a section heading
 * @param tokens inner tokens of a section heading
 */
export const getId = (tokens: Token | string): string => {
	const content = typeof tokens === 'string' ? tokens : tokens.toHtmlInternal({nocc: true}),
		id = decodeHtml(sanitizeAlt(content.replaceAll('_', ' '))!)
			.replace(/[\s_]+/gu, '_');
	return id.endsWith('_') ? id.slice(0, -1) : id;
};

/**
 * get the toc data
 * @param token
 * @param opt
 * @param opt.toc whether to render toc data
 */
export const getTocData = (token: Token & {tocData?: string}, {toc = true}: RenderOpt = {}): string =>
	toc ? token.tocData ?? '' : '';

const inlineTags = new Set([
	'a',
	'b',
	'bdi',
	'del',
	'i',
	'ins',
	'u',
	'font',
	'big',
	'small',
	'sub',
	'sup',
	'cite',
	'code',
	'em',
	's',
	'strike',
	'strong',
	'tt',
	'var',
	'ruby',
	'rb',
	'rp',
	'rt',
	'rtc',
	'span',
	'abbr',
	'dfn',
	'kbd',
	'samp',
	'data',
	'time',
	'mark',
	'q',
	'bdo',
]);

/** 修正HTML字符串，确保其符合HTML规范 */
export const formalize = (() => {
	NPM: try {
		const {parseFragment, serialize, html: {NS}}: typeof parse5 = require('parse5');
		const body: Element = {
			nodeName: 'body',
			tagName: 'body',
			attrs: [],
			namespaceURI: NS.HTML,
			parentNode: null,
			childNodes: [],
		};

		/**
		 * 将当前收集的内联元素使用`<p>`标签包裹，并添加到子节点列表中
		 * @param cur 当前收集的内联元素
		 * @param childNodes 子节点列表
		 */
		const wrap = (cur: ChildNode[], childNodes: ChildNode[]): void => {
				if (cur.length > 0) {
					childNodes.push({
						nodeName: 'p',
						tagName: 'p',
						attrs: [],
						namespaceURI: NS.HTML,
						parentNode: null,
						childNodes: cur,
					});
				}
			},

			/**
			 * 判断节点是否为文本节点
			 * @param node 节点
			 */
			isText = (node: ChildNode): node is TextNode => node.nodeName === '#text',

			/**
			 * 判断标签是否为内联标签
			 * @param node 标签
			 */
			isInlineTag = (node: Element): boolean => {
				let stack: ChildNode[] = [],
					isEmpty = true,
					child: ChildNode | undefined = node;
				while (child) {
					if (isText(child)) {
						if (child.value.trim()) {
							isEmpty = false;
						}
					} else if (inlineTags.has(child.tagName)) {
						stack = [...stack, ...child.childNodes as ChildNode[]];
					} else {
						return false;
					}
					child = stack.pop();
				}
				return !isEmpty;
			},

			/**
			 * 处理节点，将连续的内联元素包裹在`<p>`标签中
			 * @param parentNode 父节点
			 */
			process = (parentNode: Element | Fragment): void => {
				const childNodes: ChildNode[] = [];
				let cur: ChildNode[] = [];
				for (const child of parentNode.childNodes as ChildNode[]) {
					if (isText(child)) {
						(cur.length > 0 || child.value.trim() ? cur : childNodes).push(child);
					} else if (isInlineTag(child)) {
						cur.push(child);
					} else {
						if (child.tagName === 'blockquote') {
							process(child);
						}
						wrap(cur, childNodes);
						cur = [];
						childNodes.push(child);
					}
				}
				wrap(cur, childNodes);
				parentNode.childNodes = childNodes;
			};
		return (str: string, pWrap = true): string => {
			const doc = parseFragment(body, str, {});
			if (pWrap) {
				process(doc);
			}
			return serialize(doc);
		};
	} catch {}

	/**
	 * 将当前收集的内联元素使用`<p>`标签包裹，并添加到子节点列表中
	 * @param cur 当前收集的内联元素
	 * @param childNodes 子节点列表
	 */
	const wrap = (cur: DocumentFragment, childNodes: DocumentFragment): void => {
			if (cur.hasChildNodes()) {
				const p = document.createElement('p');
				p.replaceChildren(cur);
				childNodes.append(p);
			}
		},

		/**
		 * 判断节点是否为文本节点
		 * @param node 节点
		 */
		isText = (node: HTMLChildNode): node is Text => node.nodeName === '#text',

		/**
		 * 判断标签是否为内联标签
		 * @param node 标签
		 */
		isInlineTag = (node: HTMLElement): boolean => {
			let stack: HTMLChildNode[] = [],
				isEmpty = true,
				child: HTMLChildNode | undefined = node;
			while (child) {
				if (isText(child)) {
					if (child.data.trim()) {
						isEmpty = false;
					}
				} else if (inlineTags.has(child.tagName.toLowerCase())) {
					stack = [...stack, ...child.childNodes as Iterable<HTMLChildNode>];
				} else {
					return false;
				}
				child = stack.pop();
			}
			return !isEmpty;
		},

		/**
		 * 处理节点，将连续的内联元素包裹在`<p>`标签中
		 * @param parentNode 父节点
		 */
		process = (parentNode: HTMLElement): void => {
			const childNodes = document.createDocumentFragment();
			let cur = document.createDocumentFragment();
			for (const child of [...parentNode.childNodes] as HTMLChildNode[]) {
				if (isText(child)) {
					(cur.hasChildNodes() || child.data.trim() ? cur : childNodes).append(child.cloneNode());
				} else if (isInlineTag(child)) {
					cur.append(child);
				} else {
					if (child.tagName === 'BLOCKQUOTE') {
						process(child);
					}
					wrap(cur, childNodes);
					cur = document.createDocumentFragment();
					childNodes.append(child);
				}
			}
			wrap(cur, childNodes);
			parentNode.replaceChildren(childNodes);
		};
	return (str: string, pWrap = true): string => {
		const {body} = new DOMParser().parseFromString(str, 'text/html');
		if (pWrap) {
			process(body);
		}
		return body.innerHTML;
	};
})();
