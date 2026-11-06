import {basic} from '../util/selector';
import type {AstElement} from '../lib/element';
import type {AttributesParentBase} from '../mixin/attributesParent';
import type {Token} from '../internal';

const specialChars: [string, string][] = [
		['[', '&lbrack;'],
		[']', '&rbrack;'],
		['(', '&lpar;'],
		[')', '&rpar;'],
		['"', '&quot;'],
		[`'`, '&apos;'],
		[':', '&colon;'],
		['\\', '&bsol;'],
		['&', '&amp;'],
	],
	regularRegex = /[[(,>+~]|\s+/u,
	attributeRegex = /^\s*(\w+)\s*(?:([~|^$*!]?=)\s*("[^"]*"|'[^']*'|[^\s[\]]+)(?:\s+(i))?\s*)?\]/u,
	grouping = new Set([',', '>', '+', '~']),
	combinator = new Set(['>', '+', '~', '']);

/**
 * optionally convert to lower cases
 * @param val 属性值
 * @param i 是否对大小写不敏感
 */
const toCase = (val: string, i: unknown): string => i ? val.toLowerCase() : val;

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
	const val = token[key as keyof Token]; // eslint-disable-line @typescript-eslint/unbound-method
	return val instanceof RegExp ? val.source : val;
};

/**
 * 检查是否符合解析后的选择器，不含节点关系
 * @param token 节点
 * @param step 解析后的选择器
 * @param scope 作用对象
 * @param has `:has()`伪选择器
 * @throws `SyntaxError` 未定义的伪选择器或错误的正则伪选择器
 */
const matches = (
	token: Token & Partial<AttributesParentBase>,
	step: SelectorArray,
	// eslint-disable-next-line @typescript-eslint/no-unused-vars
	scope?: AstElement,
	has?: Token,
): boolean => {
	const {type, name} = token;
	return step.every(selector => {
		if (typeof selector === 'string') {
			switch (selector) { // 情形1：简单伪选择器、type和name
				case '':
					return token === has;
				case '*':
					return true;
				default:
					return basic(selector)(type, name);
			}
		} else { // 情形2：属性选择器
			const [key, equal, val = '', i] = selector;
			if (!(key in token || typeof token.hasAttr === 'function' && token.hasAttr(key))) {
				return false;
			}
			const thisVal = getAttr(token, key);
			if (!equal) {
				return thisVal !== undefined && thisVal !== false;
			}
			const v = toCase(val, i);
			if (equal === '~=') {
				const thisVals = typeof thisVal === 'string' ? thisVal.split(/\s/u) : thisVal;
				return Boolean(thisVals?.[Symbol.iterator as keyof unknown])
					&& Iterator.from(thisVals as Iterable<unknown>)
						.some(w => typeof w === 'string' && toCase(w, i) === v);
			}
			const stringVal = toCase(String(thisVal), i);
			return stringVal === v;
		}
	});
};

/**
 * 检查是否符合解析后的选择器
 * @param token 节点
 * @param copy 解析后的选择器
 * @param scope 作用对象
 * @param has `:has()`伪选择器
 */
const matchesArray = (token: Token, copy: readonly SelectorArray[], scope?: AstElement, has?: Token): boolean => {
	const condition = [...copy];
	if (matches(token, condition.pop()!, scope, has)) {
		const {parentNode, previousElementSibling} = token;
		switch (condition.at(-1)?.relation) {
			case undefined:
				return true;
			case '>':
				return Boolean(parentNode && matchesArray(parentNode, condition, scope, has));
			case '+':
				return Boolean(previousElementSibling && matchesArray(previousElementSibling, condition, scope, has));
			case '~': {
				if (!parentNode) {
					return false;
				}
				const {children} = parentNode;
				return children.slice(0, children.indexOf(token))
					.some(child => matchesArray(child, condition, scope, has));
			}
			default: // ' '
				return token.getAncestors().some(ancestor => matchesArray(ancestor, condition, scope, has));
		}
	}
	return false;
};

/**
 * 还原转义符号
 * @param selector
 */
const desanitize = (selector: string): string => {
	if (selector.includes('&') && selector.includes(';')) {
		for (const [c, entity] of specialChars) {
			selector = selector.replaceAll(entity, () => c);
		}
	}
	return selector.trim();
};

/**
 * 去除首尾的引号
 * @param val 属性值或伪选择器函数的参数
 */
const deQuote = (val: string): string => /^(["']).*\1$/u.test(val) ? val.slice(1, -1) : val.trim();

/**
 * 检查节点是否符合选择器
 * @param selector
 * @param scope 作用对象
 * @param has `:has()`伪选择器
 * @throws `SyntaxError` 非法的选择器
 */
export const checkToken = (
	selector: string,
	scope?: AstElement,
	has?: Token,
) => <T extends Token>(token: Token): token is T => {
	let sanitized = selector.trim();
	if (sanitized.includes('\\')) {
		for (const [c, entity] of specialChars) {
			sanitized = sanitized.replaceAll(`\\${c}`, () => entity);
		}
	}
	const stack: [[SelectorArray, ...SelectorArray[]], ...SelectorArray[][]] = [[[]]];
	let regex = regularRegex,
		[condition] = stack,
		[step] = condition;

	/**
	 * 解析简单伪选择器
	 * @param index 伪选择器的终点位置
	 * @throws `SyntaxError` 选择器排序不当或非法的选择器
	 */
	const pushSimple = (index?: number): void => {
		const str = sanitized.slice(0, index).trim();
		if (!str) {
			return;
		}
		const pieces = str.split(/(?=[:#])/u);
		for (let i = 0; i < pieces.length; i++) {
			const piece = pieces[i]!;
			if (!/^[:#]/u.test(piece)) {
				step.push(piece);
			} else if (piece.startsWith(':')) {
				// eslint-disable-next-line unicorn/no-lonely-if
				if (pieces[i - 1]?.startsWith('#')) {
					pieces[i - 1] += piece;
					pieces.splice(i, 1);
					i--;
				}
			}
		}
		step.push(...pieces.filter(piece => piece.startsWith('#')).map(desanitize));
	};
	for (let mt = regex.exec(sanitized); mt; mt = regex.exec(sanitized)) {
		let {0: syntax, index} = mt;
		if (!syntax.trim()) {
			index += syntax.length;
			const char = sanitized[index]!;
			syntax = grouping.has(char) ? char : '';
		}
		if (syntax === ',') { // 情形1：并列
			pushSimple(index);
			condition = [[]];
			[step] = condition;
			stack.push(condition);
		} else if (combinator.has(syntax)) { // 情形2：关系
			if (
				has && syntax && condition.length === 1 && step.length === 0 && !sanitized.slice(0, index).trim()
			) {
				step.push('');
			} else {
				pushSimple(index);
			}
			step.relation = syntax;
			step = [];
			condition.push(step);
		} else if (syntax === '[') { // 情形3：属性开启
			pushSimple(index);
			regex = attributeRegex;
		} else if (syntax.endsWith(']')) { // 情形4：属性闭合
			mt[3] &&= desanitize(deQuote(mt[3]));
			step.push(mt.slice(1) as [string, string | undefined, string | undefined, string | undefined]);
			regex = regularRegex;
		} else if (syntax === '(') { // 情形5：伪选择器开启
		} else { // 情形6：伪选择器闭合
			mt.push(step.pop() as string);
			mt[1] &&= deQuote(mt[1]);
			step.push(mt.slice(1) as [string, string]);
			regex = regularRegex;
		}
		sanitized = sanitized.slice(index + syntax.length);
		if (grouping.has(syntax)) {
			sanitized = sanitized.trim();
		}
	}
	pushSimple();
	return stack.some(copy => matchesArray(token, copy, scope, has));
};
