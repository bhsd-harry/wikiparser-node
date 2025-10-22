import bs from 'binary-search';

/**
 * 二分法查找索引
 * @param haystack 数组
 * @param needle 目标值
 * @param comparator 比较函数
 */
export default <T>(
	haystack: T[],
	needle: number,
	comparator: (item: T, needle: number) => number,
): number => {
	const found = bs(haystack, needle, comparator);
	return found < 0 ? ~found : found; // eslint-disable-line no-bitwise
};
