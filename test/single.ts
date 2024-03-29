import {diff} from '../util/diff';
import type {Parser, LintError} from '../base';

const ignored = new Set<LintError.Rule>(['obsolete-attr', 'obsolete-tag', 'table-layout']);
const entities = {lt: '<', gt: '>', amp: '&'};

/**
 * 测试单个页面
 * @param Parser 解析器
 * @param page 页面
 * @param page.pageid 页面ID
 * @param page.title 页面标题
 * @param page.ns 页面命名空间
 * @param page.content 页面源代码
 */
export const single = async (Parser: Parser, {pageid, title, ns, content}: SimplePage): Promise<void> => {
	content = content.replace(/[\0\x7F]/gu, '');
	console.time(`parse: ${title}`);
	const token = Parser.parse(content, ns === 10 || title.endsWith('/doc'));
	console.timeEnd(`parse: ${title}`);
	const parsed = String(token);
	if (parsed !== content) {
		await diff(content, parsed, pageid);
		throw new Error('解析过程中不可逆地修改了原始文本！');
	}

	console.time(`print: ${title}`);
	const printed = token.print();
	console.timeEnd(`print: ${title}`);
	const restored = printed.replace(
		/<[^<]+?>|&([lg]t|amp);/gu,
		(_, s?: keyof typeof entities) => s ? entities[s] : '',
	);
	if (restored !== content) {
		await diff(content, restored, pageid);
		throw new Error('渲染HTML过程中不可逆地修改了原始文本！');
	}

	console.time(`lint: ${title}`);
	const errors = token.lint().filter(({rule}) => !ignored.has(rule));
	console.timeEnd(`lint: ${title}`);
	console.log(errors.map(({message, severity}) => ({message, severity})));
	if (errors.length === 0) {
		return;
	}
	errors.sort(({startIndex: a}, {startIndex: b}) => b - a);
	let text = content,
		firstStart = Infinity;
	for (const {startIndex, endIndex} of errors) {
		if (endIndex < firstStart) {
			text = `${text.slice(0, startIndex)}${text.slice(endIndex)}`;
			firstStart = startIndex;
		} else {
			firstStart = Math.min(firstStart, startIndex);
		}
	}
	await diff(content, text, pageid);
};
