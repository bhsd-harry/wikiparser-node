import {diff, error} from '../util/diff';
import type {SimplePage} from '@bhsd/common/dist/test';
import type {LintError} from '../base';

/* NOT FOR BROWSER ONLY */

import Parser from '../index';

/* NOT FOR BROWSER ONLY END */

/* PRINT ONLY */

const entities = {lt: '<', gt: '>', amp: '&'};

/* PRINT ONLY END */

const ignored = new Set<LintError.Rule>(['obsolete-attr', 'obsolete-tag', 'table-layout']);

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

	/* NOT FOR BROWSER ONLY */

	console.time(`parse: ${title}`);
	const token = Parser.parse(content, include);
	console.timeEnd(`parse: ${title}`);
	const parsed = token.toString();
	if (parsed !== content) {
		error('解析过程中不可逆地修改了原始文本！');
		return diff(content, parsed, pageid);
	}

	if (method === undefined) {
		const set = new Set<string>();
		for (const t of token.querySelectorAll('')) {
			if (!t.getAttribute('built')) {
				set.add(`${t.type}#${t.name ?? ''}`);
			}
		}
		if (set.size > 0) {
			error('未构建的节点：', set);
		}
	}

	/* NOT FOR BROWSER ONLY END */

	/* PRINT ONLY */

	if (!method || method === 'print') {
		console.time(`print: ${title}`);
		const printed = token.print();
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

	if (!method || method === 'json') {
		console.time(`json: ${title}`);
		token.json();
		console.timeEnd(`json: ${title}`);
	}

	/* PRINT ONLY END */

	if (!method || method === 'lint') {
		console.time(`lint: ${title}`);
		const errors = token.lint()
			.filter(({rule}) => !ignored.has(rule));
		console.timeEnd(`lint: ${title}`);
		return errors;
	}
	return undefined;
};
