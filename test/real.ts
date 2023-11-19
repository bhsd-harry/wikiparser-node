import {diff} from '../util/diff';
import {Api} from './api';
import Parser = require('../index');

const {argv: [,, site = '']} = process,
	apis = ([
		['LLWiki', 'https://llwiki.org/mediawiki', 'llwiki'],
		['萌娘百科', 'https://zh.moegirl.org.cn', 'moegirl'],
		['维基百科', 'https://zh.wikipedia.org/w', 'zhwiki'],
	] as [string, string, string][]).filter(([name]) => name.toLowerCase().includes(site.toLowerCase()));

Parser.i18n = 'zh-hans';

const debug = /** @implements */ (msg: string, ...args: unknown[]): void => {
	console.debug('\x1B[34m%s\x1B[0m', msg, ...args);
};
const error = /** @implements */ (msg: string, ...args: unknown[]): void => {
	console.error('\x1B[31m%s\x1B[0m', msg, ...args);
};

/**
 * 获取最近更改的页面源代码
 * @param url api.php网址
 */
const getPages = async (url: string): Promise<{title: string, ns: number, content: string}[]> =>
	(await new Api(url).get({
		generator: 'recentchanges',
		grcnamespace: '0|10',
		grclimit: 'max',
		grctype: 'edit',
		prop: 'revisions',
		rvprop: 'contentmodel|content',
	})).query.pages.map(({title, ns, revisions}) => ({
		title,
		ns,
		content: revisions?.[0]?.contentmodel === 'wikitext' && revisions[0].content,
	})).filter(({content}) => content) as {title: string, ns: number, content: string}[];

(async (): Promise<void> => {
	for (const [name, url, config] of apis) {
		debug(`开始检查${name}：`);
		Parser.config = config;
		try {
			for (const {title, ns, content} of await getPages(`${url}/api.php`)) {
				try {
					console.time(title);
					const root = Parser.parse(content, ns === 10 && !title.endsWith('/doc'));
					console.timeEnd(title);
					const restored = String(root);
					if (restored !== content) {
						error('解析过程中不可逆地修改了原始文本！');
						await diff(content, restored);
					}
					console.time(title);
					const errors = root.lint();
					console.timeEnd(title);
					console.log(errors);
					if (errors.length === 0) {
						continue;
					}
					errors.sort(
						({startLine: aLine, startCol: aCol}, {startLine: bLine, startCol: bCol}) =>
							bLine - aLine || bCol - aCol,
					);
					const lines = content.split('\n');
					for (const {startLine, startCol, endCol} of errors) {
						const line = lines[startLine]!;
						lines[startLine] = `${line.slice(0, startCol)}${line.slice(endCol)}`;
					}
					await diff(content, lines.join('\n'));
				} catch (e) {
					error(`解析${name}的 ${title} 页面时出错！`, e);
				}
			}
		} catch (e) {
			error(`访问${name}的API端口时出错！`, e);
		}
	}
})();
