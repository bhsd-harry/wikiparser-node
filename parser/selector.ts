import type {AstElement} from '../lib/element';
import type {
	Token,
} from '../internal';

// @ts-expect-error unconstrained predicate
export type TokenPredicate<T = Token> = (token: AstElement) => token is T;

/**
 * type和name选择器
 * @param selector
 * @param type
 * @param name
 */
const basic = (selector: string, type: string, name?: string): boolean => {
	if (selector.includes('#')) {
		const i = selector.indexOf('#');
		return (i === 0 || selector.slice(0, i) === type) && selector.slice(i + 1) === name;
	}
	return !selector || selector === type;
};

/**
 * 将选择器转化为类型谓词
 * @param selector 选择器
 * @param scope 作用对象
 * @param has `:has()`伪选择器
 */
export const getCondition = <T>(selector: string, scope: AstElement, has?: Token): TokenPredicate<T> => (
	({type, name}): boolean => selector.split(',').some(str => basic(str.trim(), type, name))
) as TokenPredicate<T>;
