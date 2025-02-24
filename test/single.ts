import {diff, error} from '../util/diff';
import './wikiparse';
import type {LintError} from '../base';

const ignored = new Set<LintError.Rule>(['obsolete-attr', 'obsolete-tag', 'table-layout']);
const entities = {lt: '<', gt: '>', amp: '&'};

/**
 * 测试单个页面
 * @param page 页面
 * @param page.pageid 页面ID
 * @param page.title 页面标题
 * @param page.ns 页面命名空间
 * @param page.content 页面源代码
 * @param method 方法
 */
// eslint-disable-next-line @typescript-eslint/no-invalid-void-type
export default async ({pageid, title, ns, content}: SimplePage, method?: string): Promise<LintError[] | void> => {
	content = content.replace(/[\0\x7F]|\r$/gmu, '');
	const include = ns === 10 || title.endsWith('/doc');

	if (!method || method === 'print') {
		console.time(`print: ${title}`);
		const printed = (await wikiparse.print(content, include)).map(([,, s]) => s).join('');
		console.timeEnd(`print: ${title}`);
		const restored = printed.replace(
			/<[^<]+?>|&([lg]t|amp);/gu,
			(_, s?: keyof typeof entities) => s ? entities[s] : '',
		);
		if (restored !== content) {
			error('高亮过程中不可逆地修改了原始文本！');
			return diff(content, restored, pageid);
		}
	}

	if (!method || method === 'lint') {
		console.time(`lint: ${title}`);
		const errors = (await wikiparse.lint(content, include))
			.filter(({rule}) => !ignored.has(rule));
		console.timeEnd(`lint: ${title}`);
		return errors;
	}
	return undefined;
};
