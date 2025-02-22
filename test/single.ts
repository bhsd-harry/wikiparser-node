import {diff, error} from '../util/diff';
import type {LintError} from '../base';

/* NOT FOR BROWSER ONLY */

import Parser = require('../index');

/* NOT FOR BROWSER ONLY END */

/* NOT FOR BROWSER */

Parser.viewOnly = true;

/* NOT FOR BROWSER END */

const ignored = new Set<LintError.Rule>(['obsolete-attr', 'obsolete-tag', 'table-layout']);
const entities = {lt: '<', gt: '>', amp: '&'};

/**
 * 测试单个页面
 * @param page 页面
 * @param page.pageid 页面ID
 * @param page.title 页面标题
 * @param page.ns 页面命名空间
 * @param page.content 页面源代码
 */
export default ({pageid, title, ns, content}: SimplePage): LintError[] | Promise<void> => {
	content = content.replace(/[\0\x7F]|\r$/gmu, '');
	console.time(`parse: ${title}`);
	const token = Parser.parse(content, ns === 10 || title.endsWith('/doc'));
	console.timeEnd(`parse: ${title}`);
	const parsed = token.toString();
	if (parsed !== content) {
		error('解析过程中不可逆地修改了原始文本！');
		return diff(content, parsed, pageid);
	}
	const set = new Set<string>();
	for (const t of token.querySelectorAll('')) {
		if (!t.getAttribute('built')) {
			set.add(`${t.type}#${t.name ?? ''}`);
		}
	}
	if (set.size > 0) {
		error('未构建的节点：', set);
	}

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

	/* NOT FOR BROWSER */

	console.time(`html: ${title}`);
	token.toHtml();
	console.timeEnd(`html: ${title}`);
	const reparsed = token.toString();
	if (reparsed !== content) {
		error('渲染HTML过程中不可逆地修改了原始文本！');
		return diff(content, reparsed, pageid);
	}

	/* NOT FOR BROWSER END */

	console.time(`lint: ${title}`);
	const errors = token.lint().filter(({rule}) => !ignored.has(rule));
	console.timeEnd(`lint: ${title}`);
	return errors;
};
