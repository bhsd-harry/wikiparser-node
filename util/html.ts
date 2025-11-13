/* NOT FOR BROWSER */

import {decodeHtml, sanitizeAlt} from './string';
import type {AstNodes, ListRangeToken, Token, DdToken, ListToken} from '../internal';

/* NOT FOR BROWSER END */

/**
 * get common prefix length
 * @param prefix
 * @param lastPrefix
 */
export const getCommon = (prefix: string, lastPrefix: string): number =>
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
 * @param state.dt
 */
const nextItem = (char: Prefix, {dt}: State): string => {
	if (char === '*' || char === '#') {
		return '</li>\n<li>';
	}
	const {length} = dt,
		close = dt[length - 1] ? '</dt>\n' : '</dd>\n';
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
export const html = (childNodes: readonly AstNodes[], separator: string, opt: HtmlOpt = {}): string => {
	let lastPrefix = '';
	const results: string[] = [],
		{removeBlank} = opt,
		state: State = {dt: []};
	delete opt.removeBlank;
	for (let j = 0; j < childNodes.length; j++) {
		const child = childNodes[j]!;
		let result = child.toHtmlInternal(opt);
		if (child.is<ListRangeToken>('list-range')) {
			const {previousSibling} = child,
				{innerText} = previousSibling;
			if (
				(child.length > 0 || /\s$/u.test(innerText))
				&& previousSibling.is<ListToken>('list')
				&& !/[;#*]/u.test(innerText)
				&& child.closest('ext-inner#poem,list-range')?.type === 'ext-inner'
			) {
				lastPrefix = '';
				result = `<span style="display: inline-block; margin-inline-start: ${
					previousSibling.indent
				}em;">${result}</span>`;
			} else {
				result = result.trim();
				const prefix = innerText.trim(),
					prefix2 = prefix.replaceAll(';', ':'),
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
				while (nextSibling?.is<DdToken>('dd')) {
					const next = nextSibling.nextSibling as ListRangeToken;
					result += nextItem(':', state) + next.toHtmlInternal(opt).trim();
					({nextSibling} = next);
					j += 2;
				}
				if (
					nextSibling?.type === 'text'
					&& nextSibling.data === '\n'
					&& nextSibling.nextVisibleSibling?.is<ListToken>('list')
				) {
					j += 2;
					lastPrefix = prefix2;
				} else {
					lastPrefix = '';
					result += closeList(prefix2, state);
				}
			}
		}
		results.push(result);
	}
	return (removeBlank ? results.filter(Boolean) : results).join(separator);
};

/**
 * get the id of a section heading
 * @param tokens inner tokens of a section heading
 */
export const getId = (tokens: Token | AstNodes[] | string): string => {
	let content: string;
	if (typeof tokens === 'string') {
		content = tokens;
	} else {
		const opt: HtmlOpt = {nocc: true};
		content = Array.isArray(tokens) ? html(tokens, '', opt) : tokens.toHtmlInternal(opt);
	}
	const id = decodeHtml(sanitizeAlt(content.replaceAll('_', ' '))!)
		.replace(/[\s_]+/gu, '_');
	return id.endsWith('_') ? id.slice(0, -1) : id;
};
