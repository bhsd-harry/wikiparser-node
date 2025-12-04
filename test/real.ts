import {getPages, reset} from '@bhsd/test-util';
import {error, info} from '../util/diff';
import single from './single';

const {argv: [,, site = '']} = process,
	apis = ([
		['LLWiki', 'https://llwiki.org/mediawiki', 'llwiki'],
		['维基百科', 'https://zh.wikipedia.org/w', 'zhwiki'],
		['Wikipedia', 'https://en.wikipedia.org/w', 'enwiki'],
		['ウィキペディア', 'https://ja.wikipedia.org/w', 'jawiki'],
		['MediaWiki', 'https://www.mediawiki.org/w', 'mediawikiwiki'],
	] as const).filter(([name]) => name.toLowerCase().includes(site.toLowerCase()));

(async () => {
	for (const [name, url, config] of apis) {
		info(`开始检查${name}：\n`);
		reset();
		try {
			for (const page of await getPages(`${url}/api.php`, name, '10')) {
				await single(page);
			}
		} catch (e) {
			error(`访问${name}的API端口时出错！`, e);
		}
	}
})();
