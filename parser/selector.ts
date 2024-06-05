import {parsers} from '../util/constants';
import {escapeRegExp} from '../util/string';

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
	'required',
	'optional',
]);
const complexPseudos = new Set([
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
]);
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
];
const regularRegex = /[[(,>+~]|\s+/u,
	attributeRegex = /^\s*(\w+)\s*(?:([~|^$*!]?=)\s*("[^"]*"|'[^']*'|[^\s[\]]+)(?:\s+(i))?\s*)?\]/u,
	functionRegex = /^(\s*"[^"]*"\s*|\s*'[^']*'\s*|[^()]*)\)/u,
	grouping = new Set([',', '>', '+', '~']),
	combinator = new Set(['>', '+', '~', '']),
	sanitizeRegex = specialChars.map(([c, escaped]) => [new RegExp(escapeRegExp(`\\${c}`), 'gu'), escaped] as const),
	desanitizeRegex = specialChars.map(([c, escaped]) => [c, new RegExp(escaped, 'gu')] as const);

/**
 * 清理转义符号
 * @param selector
 */
const sanitize = (selector: string): string => {
	for (const [re, escaped] of sanitizeRegex) {
		selector = selector.replace(re, escaped);
	}
	return selector;
};

/**
 * 还原转义符号
 * @param selector
 */
const desanitize = (selector: string): string => {
	for (const [c, re] of desanitizeRegex) {
		selector = selector.replace(re, c);
	}
	return selector.trim();
};

/**
 * 去除首尾的引号
 * @param val 属性值或伪选择器函数的参数
 */
const deQuote = (val: string): string => /^(["']).*\1$/u.test(val) ? val.slice(1, -1) : val.trim();

/**
 * 解析选择器
 * @param selector
 * @throws `SyntaxError` 非法的选择器
 */
export const parseSelector = (selector: string): SelectorArray[][] => {
	selector = selector.trim();
	const stack: [[SelectorArray, ...SelectorArray[]], ...SelectorArray[][]] = [[[]]];
	let sanitized = sanitize(selector),
		regex = regularRegex,
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
				if (step.length > 0) {
					throw new SyntaxError(`Invalid selector!\n${selector}\nType selectors must come first.`);
				} else {
					step.push(piece);
				}
			} else if (piece.startsWith(':')) {
				if (simplePseudos.has(piece.slice(1))) {
					step.push(piece);
				} else if (pieces[i - 1]?.startsWith('#')) {
					pieces[i - 1] += piece;
					pieces.splice(i, 1);
					i--;
				} else {
					throw new SyntaxError(`Undefined pseudo selector!\n${desanitize(piece)}`);
				}
			}
		}
		step.push(...pieces.filter(piece => piece.startsWith('#')).map(piece => desanitize(piece)));
	};

	/**
	 * 检查是否需要通用选择器
	 * @throws `SyntaxError` 非法的选择器
	 */
	const needUniversal = (): void => {
		if (step.length === 0) {
			throw new SyntaxError(`Invalid selector!\n${selector}\nYou may need the universal selector '*'.`);
		}
	};
	while (mt) {
		let {0: syntax, index} = mt;
		if (syntax.trim() === '') {
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
			pushSimple(index);
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
		return stack;
	}
	throw new SyntaxError(
		`Unclosed '${regex === attributeRegex ? '[' : '('}' in the selector!\n${desanitize(sanitized)}`,
	);
};

parsers['parseSelector'] = __filename;
