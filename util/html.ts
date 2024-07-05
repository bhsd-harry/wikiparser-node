import type {AstNodes} from '../lib/node';
import type {ListRangeToken} from '../src/nowiki/listBase';

/**
 * get common prefix length
 * @param prefix
 * @param lastPrefix
 */
export const getCommon = (prefix: string, lastPrefix: string): number =>
	prefix.startsWith(lastPrefix) ? lastPrefix.length : [...lastPrefix].findIndex((ch, i) => ch !== prefix[i]);

/* NOT FOR BROWSER */

declare type Prefix = '#' | '*' | ';' | ':';

/**
 * mark empty list item
 * @param item list item
 */
const markEmpty = (item: string | undefined): string | undefined =>
	item?.endsWith('<li>') ? `${item.slice(0, -1)} class="mw-empty-elt">` : item;

/**
 * get next list item
 * @param char list syntax
 * @param state
 * @param state.dt whether a <dt> tag is open
 * @param results previous results
 */
const nextItem = (char: Prefix, state: {dt: boolean[]}, results?: string[]): string => {
	if (char === '*' || char === '#') {
		results?.push(markEmpty(results.pop())!);
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
 * @param state.dt whether a <dt> tag is open
 * @param results previous results or last result
 */
const closeList = (chars: string, state: {dt: boolean[]}, results: string[] | string): string => {
	let result = typeof results === 'string' ? results : '';
	for (let i = chars.length - 1; i >= 0; i--) {
		const char = chars[i] as Prefix;
		switch (char) {
			case '*':
			case '#':
				if (i === chars.length - 1) {
					const last = markEmpty(typeof results === 'string' ? results : results.pop())!;
					if (typeof results === 'string') {
						result = last;
					} else {
						results.push(last);
					}
				}
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
 * @param state.dt whether a <dt> tag is open
 */
const openList = (chars: string, state: {dt: boolean[]}): string => {
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
 * @param nowrap whether to normalize newlines
 */
export const html = (childNodes: readonly AstNodes[], separator = '', nowrap?: boolean): string => {
	let lastPrefix = '';
	const results: string[] = [],
		state = {dt: []};
	for (let j = 0; j < childNodes.length; j++) {
		const child = childNodes[j]!;
		let result = child.toHtmlInternal(nowrap);
		if (child.is<ListRangeToken>('list-range')) {
			result = result.trim();
			const {previousSibling: {firstChild: {data}}} = child,
				prefix = data.trim(),
				prefix2 = prefix.replace(/;/gu, ':'),
				commonPrefixLength = getCommon(prefix2, lastPrefix);
			let pre = closeList(lastPrefix.slice(commonPrefixLength), state, results);
			if (prefix.length === commonPrefixLength) {
				pre += nextItem(prefix.slice(-1) as Prefix, state, results);
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
				result += next.toHtmlInternal(nowrap).trim();
				({nextSibling} = next);
				j += 2;
			}
			if (nextSibling?.type === 'text' && nextSibling.data === '\n' && childNodes[j + 2]?.type === 'list') {
				j += 2;
				lastPrefix = prefix2;
			} else {
				lastPrefix = '';
				result = closeList(prefix2, state, result);
			}
		}
		results.push(result);
	}
	return results.join(separator);
};

/**
 * wrap text with <b> and <i> tags
 * @param node
 * @param str
 */
export const font = (node: AstNodes, str: string): string => {
	const {font: {bold, italic}} = node,
		i = str.indexOf('\n');
	const wrap = /** @ignore */ (s: string): string =>
		s && (bold ? '<b>' : '') + (italic ? '<i>' : '') + s + (italic ? '</i>' : '') + (bold ? '</b>' : '');
	return i === -1 ? wrap(str) : wrap(str.slice(0, i)) + str.slice(i);
};
