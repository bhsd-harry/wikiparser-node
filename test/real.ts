import {getPages, reset} from '@bhsd/test-util';
import {error, info, diff} from '../util/diff';
import single from './single';
import lsp from './lsp';

/* NOT FOR BROWSER ONLY */

import Parser from '../index';

/* NOT FOR BROWSER ONLY END */

const i18n: Record<string, string> = require('../../i18n/zh-hans');
Parser.i18n = i18n;

const {argv: [,, site = '']} = process,
	apis = ([
		['LLWiki', 'https://llwiki.org/mediawiki', 'llwiki'],
		['维基百科', 'https://zh.wikipedia.org/w', 'zhwiki'],
		['Wikipedia', 'https://en.wikipedia.org/w', 'enwiki'],
		['ウィキペディア', 'https://ja.wikipedia.org/w', 'jawiki'],
		['MediaWiki', 'https://www.mediawiki.org/w', 'mediawikiwiki'],
	] as const).filter(([name]) => name.toLowerCase().includes(site.toLowerCase()));

(async () => {
	const failures = new Map<string, number>();
	for (const [name, url, config] of apis) {
		info(`开始检查${name}：\n`);
		Parser.config = config;
		reset();
		try {
			let failed = 0;
			for (const page of await getPages(`${url}/api.php`, name, '10')) {
				const {pageid, title, content} = page;
				try {
					const errors = await single(page);
					if (!errors) {
						throw new Error('解析错误');
					} else if (errors.length > 0) {
						console.log(errors.map(({message, severity}) => ({message, severity})));
						errors.sort(({startIndex: a}, {startIndex: b}) => b - a);
						let text = content,
							firstStart = Infinity;
						for (const {startIndex, endIndex} of errors) {
							if (endIndex <= firstStart) {
								text = text.slice(0, startIndex) + text.slice(endIndex);
								firstStart = startIndex;
							} else {
								firstStart = Math.min(firstStart, startIndex);
							}
						}
						await diff(content, text, pageid);
					}
					await lsp(page, true);
				} catch (e) {
					error(`解析 ${title} 页面时出错！`, e);
					failed++;
				}
				console.log();
			}
			if (failed) {
				failures.set(name, failed);
			}
		} catch (e) {
			error(`访问${name}的API端口时出错！`, e);
		}
	}
	if (failures.size > 0) {
		let total = 0;
		for (const [name, failed] of failures) {
			error(`${name}：${failed} 个页面解析失败！`);
			total += failed;
		}
		throw new Error(`共有 ${total} 个页面解析失败！`);
	}
})();
