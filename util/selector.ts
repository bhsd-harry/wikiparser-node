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
	return type => type === selector;
};

/**
 * 将选择器转化为类型谓词
 * @param selector 选择器
 * @param scope 作用对象
 * @param has `:has()`伪选择器
 */
export const getCondition = <T>(selector: string, scope?: AstElement, has?: Token): TokenPredicate<T> => {
	selector = selector.trim();
	/* c8 ignore next 3 */
	if (!selector) {
		return (() => true) as unknown as TokenPredicate<T>;
	}
	const parts = selector.split(',').map(str => str.trim()).filter(str => str !== '').map(basic);
	return (({type, name}): boolean => parts.some(condition => condition(type, name))) as TokenPredicate<T>;
};
