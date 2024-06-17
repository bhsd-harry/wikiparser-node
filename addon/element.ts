import {Ranges} from '../lib/ranges';
import {Title} from '../lib/title';
import type {AttributesParentBase} from '../mixin/attributesParent';
import type {Token} from '../internal';

const primitives = new Set(['string', 'number', 'boolean', 'undefined']);

/**
 * optionally convert to lower cases
 * @param val 属性值
 * @param i 是否对大小写不敏感
 */
const toCase = (val: string, i: unknown): string => i ? val.toLowerCase() : val;

/**
 * 检查某个下标是否符合表达式
 * @param str 表达式
 * @param i 待检查的下标
 */
const nth = (str: string, i: number): boolean => new Ranges(str).applyTo(i + 1).includes(i);

/**
 * 检测:lang()伪选择器
 * @param node 节点
 * @param node.attributes 节点属性
 * @param regex 语言正则
 */
const matchesLang = (
	{attributes}: Token & {attributes?: Record<string, string | true>},
	regex: RegExp,
): boolean | undefined => {
	const lang = attributes?.['lang'];
	return lang === undefined ? undefined : typeof lang === 'string' && regex.test(lang);
};

/**
 * 是否受保护。保护条件来自Token，这里仅提前用于:required和:optional伪选择器。
 * @param token 节点
 */
const isProtected = (token: Token): boolean | undefined => {
	const {parentNode} = token;
	if (!parentNode) {
		return undefined;
	}
	const {childNodes, fixed} = parentNode;
	return fixed
		|| parentNode.getAttribute('protectedChildren').applyTo(childNodes).includes(childNodes.indexOf(token));
};

/**
 * 获取属性
 * @param token 节点
 * @param key 属性键
 */
const getAttr = (token: Token & Partial<AttributesParentBase>, key: string): unknown => {
	if (typeof token.getAttr === 'function') {
		const attr = token.getAttr(key);
		if (attr !== undefined) {
			return attr;
		}
	}
	const val = token[key as keyof Token];
	return val instanceof RegExp ? val.source : val;
};

/**
 * 检查是否符合属性选择器
 * @param token 节点
 * @param key 属性键
 * @param equal 比较符
 * @param val 属性值
 * @param i 是否对大小写不敏感
 * @throws `RangeError` 复杂属性不能用于选择器
 */
const matchesAttr = (
	token: Token & Partial<AttributesParentBase>,
	key: string,
	equal?: string,
	val = '',
	i?: string,
): boolean => {
	const isAttr = typeof token.hasAttr === 'function' && typeof token.getAttr === 'function';
	if (!(key in token) && (!isAttr || !token.hasAttr!(key))) {
		return equal === '!=';
	}
	const v = toCase(val, i),
		thisVal = getAttr(token, key);
	if (!equal) {
		return thisVal !== undefined && thisVal !== false;
	}
	if (equal === '~=') {
		const thisVals = typeof thisVal === 'string' ? thisVal.split(/\s/u) : thisVal;
		return Boolean(thisVals?.[Symbol.iterator as keyof unknown])
			&& [...thisVals as Iterable<unknown>].some(w => typeof w === 'string' && toCase(w, i) === v);
	} else if (!primitives.has(typeof thisVal) && !(thisVal instanceof Title)) {
		throw new RangeError(`The complex attribute ${key} cannot be used in a selector!`);
	}
	const stringVal = toCase(String(thisVal), i);
	switch (equal) {
		case '|=':
			return stringVal === v || stringVal.startsWith(`${v}-`);
		case '^=':
			return stringVal.startsWith(v);
		case '$=':
			return stringVal.endsWith(v);
		case '*=':
			return stringVal.includes(v);
		case '!=':
			return stringVal !== v;
		default: // `=`
			return stringVal === v;
	}
};

/**
 * 检查是否符合解析后的选择器，不含节点关系
 * @param token 节点
 * @param step 解析后的选择器
 * @throws `SyntaxError` 错误的正则伪选择器
 * @throws `SyntaxError` 未定义的伪选择器
 */
const matches = (
	token: Token & Partial<AttributesParentBase> & {link?: string | Title},
	step: SelectorArray,
): boolean => {
	const {parentNode, type, name, childNodes, link} = token,
		children = parentNode?.children,
		childrenOfType = children?.filter(({type: t}) => t === type),
		siblingsCount = children?.length ?? 1,
		siblingsCountOfType = childrenOfType?.length ?? 1,
		index = (children?.indexOf(token) ?? 0) + 1,
		indexOfType = (childrenOfType?.indexOf(token) ?? 0) + 1,
		lastIndex = siblingsCount - index + 1,
		lastIndexOfType = siblingsCountOfType - indexOfType + 1;
	return step.every(selector => {
		if (typeof selector === 'string') {
			switch (selector) { // 情形1：简单伪选择器、type和name
				case '*':
					return true;
				case ':root':
					return !parentNode;
				case ':first-child':
					return index === 1;
				case ':first-of-type':
					return indexOfType === 1;
				case ':last-child':
					return lastIndex === 1;
				case ':last-of-type':
					return lastIndexOfType === 1;
				case ':only-child':
					return siblingsCount === 1;
				case ':only-of-type':
					return siblingsCountOfType === 1;
				case ':empty':
					return !childNodes.some(({type: t, data}) => t !== 'text' || data);
				case ':parent':
					return childNodes.some(({type: t, data}) => t !== 'text' || data);
				case ':header':
					return type === 'heading';
				case ':hidden':
					return token.text() === '';
				case ':visible':
					return token.text() !== '';
				case ':only-whitespace':
					return token.text().trim() === '';
				case ':any-link':
					return type === 'link'
						|| type === 'free-ext-link'
						|| type === 'magic-link'
						|| type === 'ext-link'
						|| (type === 'file' || type === 'gallery-image') && link;
				case ':local-link':
					return (type === 'link' || type === 'file' || type === 'gallery-image')
						&& link instanceof Title
						&& link.title === '';
				case ':invalid':
					return type === 'table-inter' || type === 'image-parameter' && name === 'invalid';
				case ':required':
					return isProtected(token) === true;
				case ':optional':
					return isProtected(token) === false;
				default: {
					const [t, n] = selector.split('#');
					return (!t || t === type) && (!n || n === name);
				}
			}
		} else if (selector.length === 4) { // 情形2：属性选择器
			return matchesAttr(token, ...selector);
		}
		const [s, pseudo] = selector; // 情形3：复杂伪选择器
		switch (pseudo) {
			case 'is':
				return token.matches(s);
			case 'not':
				return !token.matches(s);
			case 'nth-child':
				return nth(s, index);
			case 'nth-of-type':
				return nth(s, indexOfType);
			case 'nth-last-child':
				return nth(s, lastIndex);
			case 'nth-last-of-type':
				return nth(s, lastIndexOfType);
			case 'contains':
				return token.text().includes(s);
			case 'has':
				return Boolean(token.querySelector<Token>(s));
			case 'lang': {
				// eslint-disable-next-line @typescript-eslint/no-unused-expressions
				/^zh(?:-|$)/iu;
				const regex = new RegExp(`^${s}(?:-|$)`, 'iu');
				for (let node: Token | undefined = token; node; node = node.parentNode) {
					const result = matchesLang(node, regex);
					if (result !== undefined) {
						return result;
					}
				}
				return false;
			}
			case 'regex': {
				const mt = /^([^,]+),\s*\/(.+)\/([a-z]*)$/u.exec(s) as [string, string, string, string] | null;
				if (!mt) {
					throw new SyntaxError(
						`Wrong usage of the regex pseudo-selector. Use ":regex('attr, /re/i')" format.`,
					);
				}
				try {
					return new RegExp(mt[2], mt[3]).test(String(getAttr(token, mt[1].trim())));
				} catch {
					throw new SyntaxError(`Invalid regular expression: /${mt[2]}/${mt[3]}`);
				}
			}
			default:
				throw new SyntaxError(`Undefined pseudo-selector: ${pseudo}`);
		}
	});
};

/**
 * 检查是否符合解析后的选择器
 * @param token 节点
 * @param copy 解析后的选择器
 */
export const matchesArray = (token: Token, copy: readonly SelectorArray[]): boolean => {
	const condition = [...copy],
		step = condition.pop()!;
	if (matches(token, step)) {
		const {parentNode, previousElementSibling} = token;
		switch (condition[condition.length - 1]?.relation) {
			case undefined:
				return true;
			case '>':
				return Boolean(parentNode && matchesArray(parentNode, condition));
			case '+':
				return Boolean(previousElementSibling && matchesArray(previousElementSibling, condition));
			case '~': {
				if (!parentNode) {
					return false;
				}
				const {children} = parentNode;
				return children.slice(0, children.indexOf(token)).some(child => matchesArray(child, condition));
			}
			default: // ' '
				return token.getAncestors().some(ancestor => matchesArray(ancestor, condition));
		}
	}
	return false;
};
