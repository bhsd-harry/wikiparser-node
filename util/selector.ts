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
 */
export const getCondition = <T>(
	selector: string,
): TokenPredicate<T> => {
	selector = selector.trim();
	const parts = selector.split(',').map(str => str.trim()).filter(str => str !== '').map(basic);
	return (({type, name}): boolean => parts.some(condition => condition(type, name))) as TokenPredicate<T>;
};
