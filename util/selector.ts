import type {AstElement} from '../lib/element';
import type {Token} from '../internal';

// @ts-expect-error unconstrained predicate
export type TokenPredicate<T = Token> = (token: AstElement) => token is T;
declare type BasicCondition = (type: string, name?: string) => boolean;

/**
 * type和name选择器
 * @param selector
 */
export const basic = (selector: string): BasicCondition => {
	if (selector.includes('#')) {
		const i = selector.indexOf('#'),
			targetType = selector.slice(0, i),
			targetName = selector.slice(i + 1);
		return (type, name) => (i === 0 || type === targetType) && name === targetName;
	}
	return selector ? (type): boolean => type === selector : (): true => true;
};

/**
 * 将选择器转化为类型谓词
 * @param selector 选择器
 * @param scope 作用对象
 * @param has `:has()`伪选择器
 */
export const getCondition = <T>(selector: string, scope?: AstElement, has?: Token): TokenPredicate<T> => {
	/* NOT FOR BROWSER */

	if (/[^a-z\-,#\s]|(?<![\s,])\s+(?![\s,])/u.test(selector.trim())) {
		const {checkToken}: typeof import('../parser/selector') = require('../parser/selector');
		return checkToken(selector, scope, has) as TokenPredicate<T>;
	}

	/* NOT FOR BROWSER END */

	const parts = selector.split(',').map(str => basic(str.trim()));
	return (({type, name}): boolean => parts.some(condition => condition(type, name))) as TokenPredicate<T>;
};
