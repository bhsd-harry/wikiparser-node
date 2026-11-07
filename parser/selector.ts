import {basic} from '../util/selector';
import type {AstElement} from '../lib/element';
import type {AttributesParentBase} from '../mixin/attributesParent';
import type {Token} from '../internal';

const regularRegex = /\[/u,
	attributeRegex = /^(\w+)(=)([^\s[\]]+)\]/u;

/**
 * optionally convert to lower cases
 * @param val 属性值
 * @param i 是否对大小写不敏感
 */
const toCase = (val: string, i: unknown): string => val;

/**
 * 获取属性
 * @param token 节点
 * @param key 属性键
 */
const getAttr = (token: Token & Partial<AttributesParentBase>, key: string): unknown => {
	const val = token[key as keyof Token]; // eslint-disable-line @typescript-eslint/unbound-method
	return val;
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
	scope?: AstElement,
	has?: Token,
): boolean => {
	const {type, name} = token;
	return step.every(selector => {
		if (typeof selector === 'string') {
			switch (selector) { // 情形1：简单伪选择器、type和name
				case '':
					return token === has;
				default:
					return basic(selector)(type, name);
			}
		} else { // 情形2：属性选择器
			const [key,, val = '', i] = selector;
			const thisVal = getAttr(token, key);
			const v = toCase(val, i);
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
	// eslint-disable-next-line unicorn/prefer-boolean-return
	if (matches(token, condition.pop()!, scope, has)) {
		return true;
	}
	return false;
};

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
	let sanitized = selector;
	const stack: [[SelectorArray, ...SelectorArray[]], ...SelectorArray[][]] = [[[]]];
	let regex = regularRegex,
		/* eslint-disable prefer-const */
		[condition] = stack,
		[step] = condition;
		/* eslint-enable prefer-const */

	/**
	 * 解析简单伪选择器
	 * @param index 伪选择器的终点位置
	 * @throws `SyntaxError` 选择器排序不当或非法的选择器
	 */
	const pushSimple = (index?: number): void => {
		const str = sanitized.slice(0, index);
		if (!str) {
			return;
		}
		const piece = str;
		step.push(piece);
	};
	for (let mt = regex.exec(sanitized); mt; mt = regex.exec(sanitized)) {
		// eslint-disable-next-line prefer-const
		let {0: syntax, index} = mt;
		if (syntax === '[') { // 情形3：属性开启
			pushSimple(index);
			regex = attributeRegex;
		} else if (syntax.endsWith(']')) { // 情形4：属性闭合
			step.push(mt.slice(1) as [string, string | undefined, string | undefined, string | undefined]);
			regex = regularRegex;
		}
		sanitized = sanitized.slice(index + syntax.length);
	}
	pushSimple();
	return stack.some(copy => matchesArray(token, copy, scope, has));
};
