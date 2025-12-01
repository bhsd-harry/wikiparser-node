import {parsers} from '../util/constants';
import {basic, getCondition} from '../util/selector';
import {Ranges} from '../lib/ranges';
import {Title} from '../lib/title';
import {Attributes} from '../lib/attributes';
import type {AstElement} from '../lib/element';
import type {AttributesParentBase} from '../mixin/attributesParent';
import type {Token, AstNodes} from '../internal';

const simplePseudos = new Set([
		'root',
		'first-child',
		'first-of-type',
		'last-child',
		'last-of-type',
		'only-child',
		'only-of-type',
		'empty',
		'parent',
		'header',
		'hidden',
		'visible',
		'only-whitespace',
		'any-link',
		'local-link',
		'invalid',
		'valid',
		'required',
		'optional',
		'scope',
	]),
	complexPseudos = new Set([
		'is',
		'not',
		'nth-child',
		'nth-of-type',
		'nth-last-child',
		'nth-last-of-type',
		'contains',
		'has',
		'lang',
		'regex',
	]),
	specialChars: [string, string][] = [
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
	functionRegex = /^(\s*"[^"]*"\s*|\s*'[^']*'\s*|[^()]*)\)/u,
	grouping = new Set([',', '>', '+', '~']),
	combinator = new Set(['>', '+', '~', '']),
	primitives = new Set(['string', 'number', 'boolean', 'undefined']);

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
const nth = (str: string, i: number): boolean => new Ranges(str).has(i, i + 1);

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
		|| parentNode.getAttribute('protectedChildren').has(childNodes.indexOf(token), childNodes.length);
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
 * 检查是否符合解析后的选择器，不含节点关系
 * @param token 节点
 * @param step 解析后的选择器
 * @param scope 作用对象
 * @param has `:has()`伪选择器
 * @throws `SyntaxError` 错误的正则伪选择器
 * @throws `SyntaxError` 未定义的伪选择器
 */
const matches = (
	token: Token & Partial<AttributesParentBase>,
	step: SelectorArray,
	scope?: AstElement,
	has?: Token,
): boolean => {
	const {parentNode, type, name, childNodes} = token,
		attributes = new Attributes(token);
	return step.every(selector => {
		if (typeof selector === 'string') {
			switch (selector) { // 情形1：简单伪选择器、type和name
				case '':
					return token === has;
				case '*':
					return true;
				case ':root':
					return !parentNode;
				case ':first-child':
					return attributes.index === 1;
				case ':first-of-type':
					return attributes.indexOfType === 1;
				case ':last-child':
					return attributes.lastIndex === 1;
				case ':last-of-type':
					return attributes.lastIndexOfType === 1;
				case ':only-child':
					return attributes.siblingsCount === 1;
				case ':only-of-type':
					return attributes.siblingsCountOfType === 1;
				case ':empty':
					return !childNodes.some(({type: t, data}) => t !== 'text' || data);
				case ':parent':
					return childNodes.some(({type: t, data}) => t !== 'text' || data);
				case ':header':
					return type === 'heading';
				case ':hidden':
					return !token.text();
				case ':visible':
					return Boolean(token.text());
				case ':only-whitespace':
					return !token.text().trim();
				case ':any-link':
					return type === 'link'
						|| type === 'redirect-target'
						|| type === 'free-ext-link'
						|| type === 'magic-link'
						|| type === 'ext-link'
						|| (type === 'file' || type === 'gallery-image') && attributes.link;
				case ':local-link':
					return (type === 'link' || type === 'file' || type === 'gallery-image')
						&& attributes.link instanceof Title
						&& !attributes.link.title;
				case ':invalid':
					return attributes.invalid;
				case ':valid':
					return !attributes.invalid;
				case ':required':
					return isProtected(token) === true;
				case ':optional':
					return isProtected(token) === false;
				case ':scope':
					/* istanbul ignore if */
					if (!scope) {
						throw new SyntaxError('The :scope pseudo-selector must be used with an element node.');
					}
					return token === scope;
				default:
					return basic(selector)(type, name);
			}
		} else if (selector.length === 4) { // 情形2：属性选择器
			const [key, equal, val = '', i] = selector,
				isAttr = typeof token.hasAttr === 'function' && typeof token.getAttr === 'function';
			if (!(key in token || isAttr && token.hasAttr!(key))) {
				return equal === '!=';
			}
			const v = toCase(val, i),
				thisVal = getAttr(token, key);
			if (!equal) {
				return thisVal !== undefined && thisVal !== false;
			}
			/* istanbul ignore else */
			if (equal === '~=') {
				const thisVals = typeof thisVal === 'string' ? thisVal.split(/\s/u) : thisVal;
				return Boolean(thisVals?.[Symbol.iterator as keyof unknown])
					&& [...thisVals as Iterable<unknown>].some(w => typeof w === 'string' && toCase(w, i) === v);
			} else if (!(primitives.has(typeof thisVal) || thisVal instanceof Title)) {
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
		}
		const [s, pseudo] = selector; // 情形3：复杂伪选择器
		switch (pseudo) {
			case 'is':
				return getCondition(s, scope)(token);
			case 'not':
				return !getCondition(s, scope)(token);
			case 'nth-child':
				return nth(s, attributes.index);
			case 'nth-of-type':
				return nth(s, attributes.indexOfType);
			case 'nth-last-child':
				return nth(s, attributes.lastIndex);
			case 'nth-last-of-type':
				return nth(s, attributes.lastIndexOfType);
			case 'contains':
				return token.text().includes(s);
			case 'has': {
				/* istanbul ignore if */
				if (has) {
					throw new SyntaxError('The :has() pseudo-selector cannot be nested.');
				}
				const condition: (child: Token) => boolean = getCondition(s, scope, token),
					childOrSibling = attributes.siblings && /(?:^|,)\s*[+~]/u.test(s)
						? [...token.childNodes, ...attributes.siblings.slice(attributes.siblings.indexOf(token))]
						: token.childNodes;

				/**
				 * 递归查找元素
				 * @param child 子节点
				 */
				const hasElement = (child: AstNodes): boolean =>
					child.type !== 'text' && (condition(child) || child.childNodes.some(hasElement));
				return childOrSibling.some(hasElement);
			}
			case 'lang': {
				/^zh(?:-|$)/iu; // eslint-disable-line @typescript-eslint/no-unused-expressions
				const regex = new RegExp(`^${s}(?:-|$)`, 'iu');
				let node: Token & Partial<AttributesParentBase> | undefined = token;
				for (; node; node = node.parentNode) {
					const lang = node.attributes?.['lang'];
					if (lang !== undefined) {
						return typeof lang === 'string' && regex.test(lang);
					}
				}
				return false;
			}
			case 'regex': {
				const mt = /^([^,]+),\s*\/(.+)\/([a-z]*)$/u.exec(s) as [string, string, string, string] | null;
				/* istanbul ignore if */
				if (!mt) {
					throw new SyntaxError(
						`Wrong usage of the regex pseudo-selector. Use ":regex('attr, /re/i')" format.`,
					);
				}
				try {
					return new RegExp(mt[2], mt[3]).test(String(getAttr(token, mt[1].trim())));
				} catch /* istanbul ignore next */ {
					throw new SyntaxError(`Invalid regular expression: /${mt[2]}/${mt[3]}`);
				}
			}
			/* istanbul ignore next */
			default:
				throw new SyntaxError(`Undefined pseudo-selector: ${pseudo}`);
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
			selector = selector.replaceAll(entity, c);
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
 */
export const checkToken = (
	selector: string,
	scope?: AstElement,
	has?: Token,
) => <T extends Token>(token: Token): token is T => {
	let sanitized = selector.trim();
	if (sanitized.includes('\\')) {
		for (const [c, entity] of specialChars) {
			sanitized = sanitized.replaceAll(`\\${c}`, entity);
		}
	}
	const stack: [[SelectorArray, ...SelectorArray[]], ...SelectorArray[][]] = [[[]]];
	let regex = regularRegex,
		mt = regex.exec(sanitized),
		[condition] = stack,
		[step] = condition;

	/**
	 * 解析简单伪选择器
	 * @param index 伪选择器的终点位置
	 * @throws `SyntaxError` 选择器排序
	 * @throws `SyntaxError` 非法的选择器
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
				/* istanbul ignore if */
				if (step.length > 0) {
					throw new SyntaxError(`Invalid selector!\n${selector}\nType selectors must come first.`);
				} else {
					step.push(piece);
				}
			} else if (piece.startsWith(':')) {
				if (simplePseudos.has(piece.slice(1))) {
					step.push(piece);
				} else /* istanbul ignore else */ if (pieces[i - 1]?.startsWith('#')) {
					pieces[i - 1] += piece;
					pieces.splice(i, 1);
					i--;
				} else {
					throw new SyntaxError(`Undefined pseudo selector!\n${desanitize(piece)}`);
				}
			}
		}
		step.push(...pieces.filter(piece => piece.startsWith('#')).map(desanitize));
	};

	/**
	 * 检查是否需要通用选择器
	 * @throws `SyntaxError` 非法的选择器
	 */
	const needUniversal = (): void => {
		/* istanbul ignore next */
		if (step.length === 0 && (condition.length > 1 || !has)) {
			throw new SyntaxError(`Invalid selector!\n${selector}\nYou may need the universal selector '*'.`);
		}
	};
	while (mt) {
		let {0: syntax, index} = mt;
		if (!syntax.trim()) {
			index += syntax.length;
			const char = sanitized[index]!;
			syntax = grouping.has(char) ? char : '';
		}
		if (syntax === ',') { // 情形1：并列
			pushSimple(index);
			needUniversal();
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
			needUniversal();
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
			const i = sanitized.lastIndexOf(':', index),
				pseudo = sanitized.slice(i + 1, index);
			/* istanbul ignore if */
			if (i === -1 || !complexPseudos.has(pseudo)) {
				throw new SyntaxError(`Undefined pseudo selector!\n${desanitize(sanitized)}`);
			}
			pushSimple(i);
			step.push(pseudo); // 临时存放复杂伪选择器
			regex = functionRegex;
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
		mt = regex.exec(sanitized);
	}
	if (regex === regularRegex) {
		pushSimple();
		needUniversal();
		return stack.some(copy => matchesArray(token, copy, scope, has));
	}
	/* istanbul ignore next */
	throw new SyntaxError(
		`Unclosed '${regex === attributeRegex ? '[' : '('}' in the selector!\n${desanitize(sanitized)}`,
	);
};

parsers['checkToken'] = __filename;
