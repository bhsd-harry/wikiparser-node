import {getPages, reset} from '@bhsd/test-util';
import {error, info} from '../util/diff';
import Parser from '../../bundle/bundle.min.js'; // eslint-disable-line n/no-missing-import

Parser.config = require('../../config/default');

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
	for (const [name, url] of apis) {
		info(`开始检查${name}：\n`);
		reset();
		try {
			let failed = 0;
			for (const page of await getPages(`${url}/api.php`, name, '10')) {
				const {title, content} = page;
				try {
					Parser.parse(content);
				} catch (e) {
					error(`解析 ${title} 页面时出错！`, e);
					failed++;
				}
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
