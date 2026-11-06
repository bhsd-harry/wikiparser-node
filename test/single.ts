import {
	error,
	diff,
} from '../util/diff';
import type {SimplePage} from '@bhsd/test-util';

/* NOT FOR BROWSER ONLY */

import Parser from '../index';

/* NOT FOR BROWSER ONLY END */

/* NOT FOR BROWSER */

Parser.viewOnly = true;
Parser.internal = true;

/* NOT FOR BROWSER END */

/**
 * 测试单个页面
 * @param page 页面
 * @param page.pageid 页面ID
 * @param page.title 页面标题
 * @param page.ns 页面命名空间
 * @param page.content 页面源代码
 * @param method 方法
 */
export default async (
	{pageid, title, ns, content}: SimplePage,
	method?: string,
): Promise<
	void
> => {
	content = content.replaceAll(/[\0\x7F]|\r$/gmu, '');
	const include = ns === 10 || title.endsWith('/doc');

	/* NOT FOR BROWSER ONLY */

	console.time(`parse: ${title}`);
	const token = Parser.parse(content, title, include);
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
			error('未构建的节点：');
			console.error(set);
		}
	}

	/* NOT FOR BROWSER ONLY END */

	/* NOT FOR BROWSER */

	if (!method || method === 'html') {
		console.time(`html: ${title}`);
		token.toHtml();
		console.timeEnd(`html: ${title}`);
		const reparsed = token.toString();
		if (reparsed !== content) {
			error('渲染HTML过程中不可逆地修改了原始文本！');
			return diff(content, reparsed, pageid);
		}
	}

	/* NOT FOR BROWSER END */

	return undefined;
};
