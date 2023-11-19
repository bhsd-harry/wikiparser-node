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
Parser.debugging = true;
Parser.warning = false;

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
	const {error} = Parser;
	for (const [name, url, config] of apis) {
		Parser.debug(`开始检查${name}：`);
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
					await diff(content, text);
				} catch (e) {
					error(`解析${name}的 ${title} 页面时出错！`, e);
				}
			}
		} catch (e) {
			error(`访问${name}的API端口时出错！`, e);
		}
	}
})();
