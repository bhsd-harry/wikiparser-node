import type {AstNodeTypes} from '../lib/node';

export const extUrlCharFirst = '(?:\\[[\\da-f:.]+\\]|[^[\\]<>"\\0-\\x1F\\x7F\\p{Zs}\\uFFFD])';
export const extUrlChar = '(?:[^[\\]<>"\\0-\\x1F\\x7F\\p{Zs}\\uFFFD]|\\0\\d+c\\x7F)*';

/**
 * remove half-parsed comment-like tokens
 * @browser
 * @param str 原字符串
 */
export const removeComment = (str: string): string => str.replace(/\0\d+c\x7F/gu, '');

/**
 * 以HTML格式打印
 * @browser
 * @param childNodes 子节点
 * @param opt 选项
 */
export const print = (childNodes: AstNodeTypes[], opt: PrintOpt = {}): string => {
	const {pre = '', post = '', sep = ''} = opt,
		entities = {'&': 'amp', '<': 'lt', '>': 'gt'};
	return `${pre}${childNodes.map(
		child => child.type === 'text'
			? String(child).replace(/[&<>]/gu, p => `&${entities[p as '&' | '<' | '>']};`)
			: child.print(),
	).join(sep)}${post}`;
};

/**
 * escape special chars for RegExp constructor
 * @browser
 * @param str RegExp source
 */
export const escapeRegExp = (str: string): string => str.replace(/[\\{}()|.?*+^$[\]]/gu, '\\$&');

/**
 * a more sophisticated string-explode function
 * @browser
 * @param start start syntax of a nested AST node
 * @param end end syntax of a nested AST node
 * @param separator syntax for explosion
 * @param str string to be exploded
 */
export const explode = (start: string, end: string, separator: string, str?: string): string[] => {
	if (str === undefined) {
		return [];
	}
	const regex = new RegExp(`${[start, end, separator].map(escapeRegExp).join('|')}`, 'gu'),
		exploded: string[] = [];
	let mt = regex.exec(str),
		depth = 0,
		lastIndex = 0;
	while (mt) {
		const {0: match, index} = mt;
		if (match !== separator) {
			depth += match === start ? 1 : -1;
		} else if (depth === 0) {
			exploded.push(str.slice(lastIndex, index));
			({lastIndex} = regex);
		}
		mt = regex.exec(str);
	}
	exploded.push(str.slice(lastIndex));
	return exploded;
};

/**
 * extract effective wikitext
 * @browser
 * @param childNodes a Token's contents
 * @param separator delimiter between nodes
 */
export const text = (childNodes: (string | AstNodeTypes)[], separator = ''): string =>
	childNodes.map(child => typeof child === 'string' ? child : child.text()).join(separator);

/**
 * decode HTML entities
 * @browser
 * @param str 原字符串
 */
export const decodeHtml = (str: string): string => str.replace(
	/&#(\d+|x[\da-f]+);/giu,
	(_, code: string) => String.fromCodePoint(Number(`${code[0]!.toLowerCase() === 'x' ? '0' : ''}${code}`)),
);

/**
 * optionally convert to lower cases
 * @param val 属性值
 * @param i 是否对大小写不敏感
 */
export const toCase = (val: string, i: unknown): string => i ? val.toLowerCase() : val;

/**
 * escape newlines
 * @param str 原字符串
 */
export const noWrap = (str: string): string => str.replaceAll('\n', '\\n');

/**
 * convert newline in text nodes to single whitespace
 * @param token 父节点
 */
export const normalizeSpace = (token: AstNodeTypes | undefined): void => {
	if (token) {
		for (const child of token.childNodes) {
			if (child.type === 'text') {
				child.replaceData(child.data.replaceAll('\n', ' '));
			}
		}
	}
};
