import * as Parser from '../index';

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
	'local-link',
	'read-only',
	'read-write',
	'invalid',
	'required',
	'optional',
]);
const complexPseudos = [
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
];
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
const pseudoRegex = new RegExp(`:(${complexPseudos.join('|')})$`, 'u'),
	regularRegex = /[[(,>+~]|\s+/u,
	attributeRegex = /^\s*(\w+)\s*(?:([~|^$*!]?=)\s*("[^"]*"|'[^']*'|[^\s[\]]+)(?:\s+(i))?\s*)?\]/u,
	functionRegex = /^(\s*"[^"]*"\s*|\s*'[^']*'\s*|[^()]*)\)/u,
	grouping = new Set([',', '>', '+', '~']),
	combinator = new Set(['>', '+', '~', '']);

/**
 * 清理转义符号
 * @param selector
 */
const sanitize = (selector: string): string => {
	for (const [c, escaped] of specialChars) {
		selector = selector.replaceAll(`\\${c}`, escaped);
	}
	return selector;
};

/**
 * 还原转义符号
 * @param selector
 */
const desanitize = (selector: string): string => {
	for (const [c, escaped] of specialChars) {
		selector = selector.replaceAll(escaped, c);
	}
	return selector.trim();
};

/**
 * 去除首尾的引号
 * @param val 属性值或伪选择器函数的参数
 */
const deQuote = (val: string): string => /^(["']).*\1$/u.exec(val)?.[1] ? val.slice(1, -1) : val.trim();

/**
 * 解析简单伪选择器
 * @param step 当前顶部
 * @param str 不含属性和复杂伪选择器的语句
 * @throws `SyntaxError` 非法的选择器
 */
const pushSimple = (step: SelectorArray, str: string): void => {
	const pieces = str.trim().split(':'),
		// eslint-disable-next-line unicorn/explicit-length-check
		i = pieces.slice(1).findIndex(pseudo => simplePseudos.has(pseudo)) + 1 || pieces.length;
	if (pieces.slice(i).some(pseudo => !simplePseudos.has(pseudo))) {
		throw new SyntaxError(`非法的选择器！\n${str}\n可能需要将':'转义为'\\:'。`);
	}
	step.push(desanitize(pieces.slice(0, i).join(':')), ...pieces.slice(i).map(piece => `:${piece}`));
};

/**
 * 解析选择器
 * @param selector
 * @throws `SyntaxError` 非法的选择器
 */
export const parseSelector = (selector: string): SelectorArray[][] => {
	const s = selector.trim(),
		stack: [[SelectorArray, ...SelectorArray[]], ...SelectorArray[][]] = [[[]]];
	let sanitized = sanitize(s),
		regex = regularRegex,
		mt = regex.exec(sanitized),
		[condition] = stack,
		[step] = condition;
	while (mt) {
		let {0: syntax, index} = mt;
		if (syntax.trim() === '') {
			index += syntax.length;
			const char = sanitized[index]!;
			syntax = grouping.has(char) ? char : '';
		}
		if (syntax === ',') { // 情形1：并列
			pushSimple(step, sanitized.slice(0, index));
			condition = [[]];
			[step] = condition;
			stack.push(condition);
		} else if (combinator.has(syntax)) { // 情形2：关系
			pushSimple(step, sanitized.slice(0, index));
			if (!step.some(Boolean)) {
				throw new SyntaxError(`非法的选择器！\n${s}\n可能需要通用选择器'*'。`);
			}
			step.relation = syntax;
			step = [];
			condition.push(step);
		} else if (syntax === '[') { // 情形3：属性开启
			pushSimple(step, sanitized.slice(0, index));
			regex = attributeRegex;
		} else if (syntax.endsWith(']')) { // 情形4：属性闭合
			mt[3] &&= desanitize(deQuote(mt[3]));
			step.push(mt.slice(1) as [string, string | undefined, string | undefined, string | undefined]);
			regex = regularRegex;
		} else if (syntax === '(') { // 情形5：伪选择器开启
			const pseudoExec = pseudoRegex.exec(sanitized.slice(0, index)) as RegExpExecArray & [string, string] | null;
			if (!pseudoExec) {
				throw new SyntaxError(`非法的选择器！\n${desanitize(sanitized)}\n请检查伪选择器是否存在。`);
			}
			pushSimple(step, sanitized.slice(0, pseudoExec.index));
			step.push(pseudoExec[1]); // 临时存放复杂伪选择器
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
		pushSimple(step, sanitized);
		const pseudos = new Set(stack.flat(2).filter(e => typeof e === 'string' && e.startsWith(':')) as string[]);
		if (pseudos.size > 0) {
			Parser.warn('检测到伪选择器，请确认是否需要将":"转义成"\\:"。', pseudos);
		}
		return stack;
	}
	throw new SyntaxError(`非法的选择器！\n${s}\n检测到未闭合的'${regex === attributeRegex ? '[' : '('}'`);
};

Parser.parsers['parseSelector'] = __filename;
