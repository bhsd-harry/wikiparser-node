import * as inspector from 'inspector';
import {writeFileSync} from 'fs';
import {diff, error} from '../util/diff';
import type {Parser, LintError} from '../base';

declare type Token = ReturnType<Parser['parse']>;

const ignored = new Set<LintError.Rule>(['obsolete-attr', 'obsolete-tag', 'table-layout']);

/**
 * 测试单个页面
 * @param Parser 解析器
 * @param page 页面
 * @param page.pageid 页面ID
 * @param page.title 页面标题
 * @param page.ns 页面命名空间
 * @param page.content 页面源代码
 * @param profiling 是否启用性能分析
 */
export const single = async (
	Parser: Parser,
	{pageid, title, ns, content}: SimplePage,
	profiling?: boolean,
): Promise<LintError[]> => {
	content = content.replace(/[\0\x7F]/gu, '');
	console.time(`parse: ${title}`);
	const parse = /** @ignore */ (): Token => Parser.parse(content, ns === 10 || title.endsWith('/doc'));
	const token = await new Promise<Token>(resolve => {
		if (profiling) {
			const session = new inspector.Session();
			session.connect();
			session.post('Profiler.enable', () => {
				session.post('Profiler.start', () => {
					const t = parse();
					session.post('Profiler.stop', (_, {profile}) => {
						writeFileSync('test/prof.txt', JSON.stringify(profile, null, '\t'));
						session.disconnect();
						resolve(t);
					});
				});
			});
		} else {
			resolve(parse());
		}
	});
	console.timeEnd(`parse: ${title}`);
	const parsed = String(token);
	if (parsed !== content) {
		await diff(content, parsed, pageid);
		throw new Error('解析过程中不可逆地修改了原始文本！');
	}
	const set = new Set<string>();
	for (const t of token.querySelectorAll('*')) {
		if (!t.getAttribute('built')) {
			set.add(`${t.type}#${t.name ?? ''}`);
		}
	}
	if (set.size > 0) {
		error('未构建的节点：', set);
	}

	console.time(`lint: ${title}`);
	const errors = token.lint().filter(({rule}) => !ignored.has(rule));
	console.timeEnd(`lint: ${title}`);
	return errors;
};
