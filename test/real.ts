import {getPages, reset} from '@bhsd/test-util';
import {
	error,
	info,
} from '../util/diff';
import single from './single';

const [,, site = ''] = process.argv,
	apis = ([
		['LLWiki', 'https://llwiki.org/mediawiki', 'llwiki'],
		['维基百科', 'https://zh.wikipedia.org/w', 'zhwiki'],
		['Wikipedia', 'https://en.wikipedia.org/w', 'enwiki'],
		['ウィキペディア', 'https://ja.wikipedia.org/w', 'jawiki'],
		['MediaWiki', 'https://www.mediawiki.org/w', 'mediawikiwiki'],
	] as const).filter(([name]) => name.toLowerCase().includes(site.toLowerCase()));

(async () => {
	for (const [name, url, config] of apis) {
		info(`\n开始检查${name}：\n`);
		reset();
		try {
			const pages = await getPages(
				`${url}/api.php`,
				{
					site: name,
				},
			);
			for (const page of pages) {
				// eslint-disable-next-line @typescript-eslint/no-confusing-void-expression
				const errors = await single(page);
			}
		} catch (e) {
			error(`访问${name}的API端口时出错！`);
			console.error(e);
		}
	}
})();
