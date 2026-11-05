/**
 * 使用`String#indexOf`避免正则表达式的回溯
 * @param wikitext 源文本
 * @param start 起始字符串
 * @param end 结束字符串
 * @param insensitive 是否忽略大小写
 * @param matched 匹配到的内容处理函数
 * @param unmatched 未匹配到的内容处理函数
 */
export const safeStringReplace = (
	wikitext: string,
	start: string,
	end: string,
	insensitive: boolean,
	matched: (inner: string, open: string, close: string) => string,
	unmatched = (str: string): string => str,
): string => {
	const text = insensitive ? wikitext.toLowerCase() : wikitext,
		lStart = start.length,
		lEnd = end.length;
	let result = '',
		lastIndex = 0,
		i: number,
		j: number,
		index: number;
	const update = /** @ignore */ (): [number, number, number] => {
		i = text.indexOf(start, lastIndex);
		index = i + lStart;
		return [i, text.indexOf(end, index), index];
	};
	for ([i, j, index] = update(); i !== -1 && j !== -1; [i, j, index] = update()) {
		result += unmatched(wikitext.slice(lastIndex, i));
		lastIndex = j + lEnd;
		result += matched(
			wikitext.slice(index, j),
			insensitive ? wikitext.slice(i, index) : start,
			insensitive ? wikitext.slice(j, lastIndex) : end,
		);
	}
	return result + unmatched(wikitext.slice(lastIndex));
};

/**
 * 使用`RegExp#exec`避免正则表达式的回溯
 * @param wikitext 源文本
 * @param start 起始正则表达式
 * @param end 结束字符串
 * @param matched 匹配到的内容处理函数
 */
export const safePatternReplace = (
	wikitext: string,
	start: RegExp,
	end: string,
	matched: (inner: string, m: RegExpExecArray) => string | false,
): string => {
	let result = '',
		lastIndex = 0;
	start.lastIndex = 0;
	for (let mt = start.exec(wikitext); mt; mt = start.exec(wikitext)) {
		const i = wikitext.indexOf(end, start.lastIndex);
		if (i === -1) {
			break;
		}
		const {index} = mt;
		result += wikitext.slice(lastIndex, index);
		lastIndex = i + end.length;
		const r = matched(wikitext.slice(start.lastIndex, i), mt);
		if (r === false) {
			({lastIndex} = start);
			result += wikitext.slice(index, lastIndex);
		} else {
			result += r;
			start.lastIndex = lastIndex;
		}
	}
	return result + wikitext.slice(lastIndex);
};
