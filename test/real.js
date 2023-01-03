'use strict';

const {diff} = require('./util'),
	Api = require('./api'),
	Parser = require('../');

const {argv: [,, site = '']} = process,
	apis = [
		['LLWiki', 'https://llwiki.org/mediawiki'],
		['萌娘百科', 'https://zh.moegirl.org.cn'],
		['维基百科', 'https://zh.wikipedia.org/w'],
		['Wikipedia', 'https://en.wikipedia.org/w'],
	].filter(([name]) => name.toLowerCase().includes(site.toLowerCase()));

Parser.debugging = true;

/**
 * 获取最近更改的页面源代码
 * @param {string} url api.php网址
 */
const getPages = async url => {
	const api = new Api(url),
		generatorParams = {generator: 'recentchanges', grcnamespace: '0|10', grclimit: 'max', grctype: 'edit'},
		revisionParams = {prop: 'revisions', rvprop: 'contentmodel|content'};
	/** @type {{query: {pages: MediaWikiPage[]}}} */
	const {query: {pages}} = await api.get({...generatorParams, ...revisionParams});
	return pages.map(({title, ns, revisions}) => ({
		title, ns, content: revisions?.[0]?.contentmodel === 'wikitext' && revisions?.[0]?.content,
	})).filter(({content}) => content);
};

(async () => {
	for (const [name, url] of apis) {
		Parser.debug(`开始检查${name}：`);
		try {
			const revs = await getPages(`${url}/api.php`);
			for (const {title, ns, content} of revs) {
				Parser.info(title);
				try {
					console.time('parse');
					const text = Parser.parse(content, ns === 10).toString();
					console.timeEnd('parse');
					if (text !== content) {
						const printedDiff = await diff(content, text);
						if (printedDiff) {
							console.log(printedDiff);
						} else {
							Parser.error('生成差异失败！');
						}
					}
				} catch (e) {
					Parser.error(`解析${name}的 ${title} 页面时出错！`, e);
				}
			}
		} catch (e) {
			Parser.error(`访问${name}的API端口时出错！`, e);
		}
	}
})();
