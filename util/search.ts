/**
 * 二分法查找索引
 * @param haystack 数组
 * @param needle 目标值
 * @param comparator 比较函数
 * @author The Dark Sky Company, LLC <support@darkskyapp.com>
 * @license CC0-1.0
 * @see https://github.com/darkskyapp/binary-search/blob/master/index.js
 */
export default <T>(
	haystack: T[],
	needle: number,
	comparator: (item: T, needle: number) => number,
): number => {
	let low = 0,
		high = haystack.length - 1;
	while (low <= high) {
		// The naive `low + high >>> 1` could fail for array lengths > 2**31
		// because `>>>` converts its operands to int32. `low + (high - low >>> 1)`
		// works for array lengths <= 2**32-1 which is also Javascript's max array
		// length.
		const mid = low + (high - low >>> 1), // eslint-disable-line no-bitwise
			cmp = comparator(haystack[mid]!, needle);
		if (cmp < 0) {
			low = mid + 1;
		} else if (cmp > 0) {
			high = mid - 1;
		} else {
			// Key found.
			return mid;
		}
	}
	// Key not found.
	return low;
};
