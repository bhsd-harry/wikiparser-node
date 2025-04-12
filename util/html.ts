/* NOT FOR BROWSER */

import {Shadow} from './debug';
import type {AstNodes, ListRangeToken, Token} from '../internal';

/* NOT FOR BROWSER END */

/**
 * get common prefix length
 * @param prefix
 * @param lastPrefix
 */
export const getCommon = (prefix: string, lastPrefix: string): number =>
	// eslint-disable-next-line @typescript-eslint/no-misused-spread
	prefix.startsWith(lastPrefix) ? lastPrefix.length : [...lastPrefix].findIndex((ch, i) => ch !== prefix[i]);

/* NOT FOR BROWSER */

declare type Prefix = '#' | '*' | ';' | ':';
declare interface State {

	/** whether a `<dt>` tag is open */
	dt: boolean[];
}

/**
 * get next list item
 * @param char list syntax
 * @param state
 */
const nextItem = (char: Prefix, state: State): string => {
	if (char === '*' || char === '#') {
		return '</li>\n<li>';
	}
	const close = state.dt[0] ? '</dt>\n' : '</dd>\n';
	if (char === ';') {
		state.dt[0] = true;
		return `${close}<dt>`;
	}
	state.dt[0] = false;
	return `${close}<dd>`;
};

/**
 * close list item
 * @param chars list syntax
 * @param state
 */
const closeList = (chars: string, state: State): string => {
	let result = '';
	for (let i = chars.length - 1; i >= 0; i--) {
		const char = chars[i] as Prefix;
		switch (char) {
			case '*':
			case '#':
				result += `</li></${char === '*' ? 'ul' : 'ol'}>`;
				break;
			case ':':
				result += `</${state.dt.shift() ? 'dt' : 'dd'}></dl>`;
				break;
			default:
				//
		}
	}
	return result;
};

/**
 * open list item
 * @param chars list syntax
 * @param state
 */
const openList = (chars: string, state: State): string => {
	let result = '';
	for (const char of chars) {
		switch (char as Prefix) {
			case '*':
			case '#':
				result += `<${char === '*' ? 'ul' : 'ol'}><li>`;
				break;
			case ':':
				state.dt.unshift(false);
				result += '<dl><dd>';
				break;
			default:
				state.dt.unshift(true);
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
export const html = (childNodes: readonly AstNodes[], separator = '', opt?: HtmlOpt): string => {
	let lastPrefix = '';
	const results: string[] = [],
		state: State = {dt: []};
	for (let j = 0; j < childNodes.length; j++) {
		const child = childNodes[j]!;
		let result = child.toHtmlInternal(opt);
		if (child.is<ListRangeToken>('list-range')) {
			result = result.trim();
			const {previousSibling: {firstChild: {data}}} = child,
				prefix = data.trim(),
				prefix2 = prefix.replaceAll(';', ':'),
				commonPrefixLength = getCommon(prefix2, lastPrefix);
			let pre = closeList(lastPrefix.slice(commonPrefixLength), state);
			if (prefix.length === commonPrefixLength) {
				pre += nextItem(prefix.slice(-1) as Prefix, state);
			} else {
				if (state.dt[0] && prefix[commonPrefixLength - 1] === ':') {
					pre += nextItem(':', state);
				}
				if (lastPrefix) {
					pre += '\n';
				}
				pre += openList(prefix.slice(commonPrefixLength), state);
			}
			result = pre + result;
			let {nextSibling} = child;
			while (nextSibling?.type === 'dd') {
				const next = nextSibling.nextSibling as ListRangeToken;
				for (let i = 0; i < nextSibling.indent; i++) {
					result += nextItem(':', state);
				}
				result += next.toHtmlInternal(opt).trim();
				({nextSibling} = next);
				j += 2;
			}
			if (
				nextSibling?.type === 'text'
				&& nextSibling.data === '\n'
				&& nextSibling.nextVisibleSibling?.type === 'list'
			) {
				j += 2;
				lastPrefix = prefix2;
			} else {
				lastPrefix = '';
				result += closeList(prefix2, state);
			}
		}
		results.push(result);
	}
	return results.join(separator);
};

/**
 * basic function of `cloneNode`
 * @param token token to clone
 * @param f empty token constructor
 */
export const cloneNode = <T extends Token>(token: T, f: () => T): T => {
	const cloned = token.cloneChildNodes();
	return Shadow.run(() => {
		const newToken = f();
		newToken.safeAppend(cloned);
		return newToken;
	});
};
