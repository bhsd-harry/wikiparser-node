import type {AstElement} from '../lib/element';
import type {
	Token,
} from '../internal';

// @ts-expect-error unconstrained predicate
export type TokenPredicate<T = Token> = (token: AstElement) => token is T;

/**
 * 将选择器转化为类型谓词
 * @param selector 选择器
 * @param scope 作用对象
 * @param has `:has()`伪选择器
 */
export const getCondition = <T>(selector: string, scope: AstElement, has?: Token): TokenPredicate<T> => (
	({type, name}): boolean => selector.split(',').some(str => {
		const [t, ...ns] = str.trim().split('#');
		return (!t || t === type) && ns.every(n => n === name);
	})
) as TokenPredicate<T>;
