import type {AstNodes} from '../lib/node';
import type {ListRangeToken} from '../src/nowiki/listBase';

declare type Prefix = '#' | '*' | ';' | ':';

/**
 * get next list item
 * @param char list syntax
 * @param state
 * @param state.dt whether a <dt> tag is open
 */
const nextItem = (char: Prefix, state: {dt: boolean[]}): string => {
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
 * @param state.dt whether a <dt> tag is open
 */
const closeList = (chars: string, state: {dt: boolean[]}): string => {
	let result = '';
	for (let i = chars.length - 1; i >= 0; i--) {
		switch (chars[i]!) {
			case '*':
				result += '</li></ul>';
				break;
			case '#':
				result += '</li></ol>';
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
				result += '<ul><li>';
				break;
			case '#':
				result += '<ol><li>';
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
				commonPrefixLength = prefix2.startsWith(lastPrefix)
					? lastPrefix.length
					: [...lastPrefix].findIndex((ch, i) => ch !== prefix2[i]);
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
				result += next.toHtmlInternal(nowrap).trim();
				({nextSibling} = next);
				j += 2;
			}
			if (nextSibling?.type === 'text' && nextSibling.data === '\n' && childNodes[j + 2]?.type === 'list') {
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
 * wrap text with <b> and <i> tags
 * @param node
 * @param str
 */
export const font = (node: AstNodes, str: string): string => {
	const {font: {bold, italic}} = node,
		i = str.indexOf('\n');
	const wrap = /** @ignore */ (s: string): string =>
		(bold ? '<b>' : '') + (italic ? '<i>' : '') + s + (italic ? '</i>' : '') + (bold ? '</b>' : '');
	return i === -1 ? wrap(str) : wrap(str.slice(0, i)) + str.slice(i);
};
