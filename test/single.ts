import {diff} from '../util/diff';
import type {Parser, LintError} from '../base';

const ignored = new Set<LintError.Rule>(['obsolete-attr', 'obsolete-tag', 'table-layout']);

/**
 * 测试单个页面
 * @param Parser 解析器
 * @param page 页面
 * @param page.pageid 页面ID
 * @param page.title 页面标题
 * @param page.ns 页面命名空间
 * @param page.content 页面源代码
 */
export const single = async (Parser: Parser, {pageid, title, ns, content}: SimplePage): Promise<LintError[]> => {
	content = content.replace(/[\0\x7F]/gu, '');
	console.time(`parse: ${title}`);
	const token = Parser.parse(content, ns === 10 || title.endsWith('/doc'));
	console.timeEnd(`parse: ${title}`);
	const parsed = String(token);
	if (parsed !== content) {
		await diff(content, parsed, pageid);
		throw new Error('解析过程中不可逆地修改了原始文本！');
	}

	console.time(`lint: ${title}`);
	const errors = token.lint().filter(({rule}) => !ignored.has(rule));
	console.timeEnd(`lint: ${title}`);
	return errors;
};
