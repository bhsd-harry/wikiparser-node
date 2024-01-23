import {diff} from '../util/diff';
import {tidy} from '../util/string';
import {Api} from './api';
import Parser = require('../index');

const {argv: [,, site = '']} = process,
	apis = ([
		['LLWiki', 'https://llwiki.org/mediawiki', 'llwiki'],
		// ['萌娘百科', 'https://zh.moegirl.org.cn', 'moegirl'],
		['维基百科', 'https://zh.wikipedia.org/w', 'zhwiki'],
		['Wikipedia', 'https://en.wikipedia.org/w', 'enwiki'],
	] as const).filter(([name]) => name.toLowerCase().includes(site.toLowerCase()));

Parser.i18n = require('../../i18n/zh-hans');

/**
 * 获取最近更改的页面源代码
 * @param url api.php网址
 */
const getPages = async (url: string): Promise<SimplePage[]> =>
	(await new Api(url).get({
		generator: 'recentchanges',
		grcnamespace: '0|10',
		grclimit: 10,
		grctype: 'edit',
		prop: 'revisions',
		rvprop: 'contentmodel|content',
	})).query.pages.map(({title, ns, revisions}) => ({
		title,
		ns,
		content: revisions?.[0]?.contentmodel === 'wikitext' && revisions[0].content,
	})).filter((page): page is SimplePage => page.content !== false);

(async () => {
	for (const [name, url, config] of apis) {
		info(`开始检查${name}：`);
		Parser.config = require(`../../config/${config}`);
		try {
			/* eslint-disable no-await-in-loop */
			for (const {title, ns, content} of await getPages(`${url}/api.php`)) {
				const cleaned = tidy(content);
				try {
					console.time(title);
					const root = Parser.parse(cleaned, ns === 10 && !title.endsWith('/doc'));
					console.timeEnd(title);
					const restored = String(root);
					if (restored !== cleaned) {
						error('解析过程中不可逆地修改了原始文本！');
						await diff(cleaned, restored);
					}
					console.time(title);
					const errors = root.lint();
					console.timeEnd(title);
					console.log(errors.map(({message, severity}) => ({message, severity})));
					if (errors.length === 0) {
						continue;
					}
					errors.sort(({startIndex: a}, {startIndex: b}) => b - a);
					let text = cleaned,
						firstStart = Infinity;
					for (const {startIndex, endIndex} of errors) {
						if (endIndex < firstStart) {
							text = `${text.slice(0, startIndex)}${text.slice(endIndex)}`;
							firstStart = startIndex;
						} else {
							firstStart = Math.min(firstStart, startIndex);
						}
					}
					await diff(cleaned, text);
				} catch (e) {
					error(`解析${name}的 ${title} 页面时出错！`, e);
				}
			}
			/* eslint-enable no-await-in-loop */
		} catch (e) {
			error(`访问${name}的API端口时出错！`, e);
		}
	}
})();
