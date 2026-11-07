import path from 'path';
import {getPages, reset} from '@bhsd/test-util';
import {
	error,
	info,
} from '../util/diff';
import single from './single';

/* NOT FOR BROWSER ONLY */

import Parser from '../index';

/* NOT FOR BROWSER ONLY END */

const [,, site = ''] = process.argv,
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
		info(`\n开始检查${name}：\n`);
		Parser.config = require(path.join('..', '..', 'config', config));
		reset();
		try {
			let failed = 0;
			const pages = await getPages(
				`${url}/api.php`,
				{
					site: name,
					grcnamespace: '10',
					grclimit: '10',
				},
			);
			for (const page of pages) {
				const {pageid, title, content} = page;
				try {
					// eslint-disable-next-line @typescript-eslint/no-confusing-void-expression
					const errors = await single(page);
				} catch (e) {
					error(`解析 ${title} 页面时出错！`);
					console.error(e);
					failed++;
				}
				console.log();
			}
			if (failed) {
				failures.set(name, failed);
			}
		} catch (e) {
			error(`访问${name}的API端口时出错！`);
			console.error(e);
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
