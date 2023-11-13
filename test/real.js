'use strict';

const {diff} = require('../dist/util/diff'),
	{Api} = require('./api'),
	{default: Parser} = require('..');

const {argv: [,, site = '']} = process,
	apis = [
		['LLWiki', 'https://llwiki.org/mediawiki', 'llwiki'],
		['萌娘百科', 'https://zh.moegirl.org.cn', 'moegirl'],
		['维基百科', 'https://zh.wikipedia.org/w', 'zhwiki'],
	].filter(([name]) => name.toLowerCase().includes(site.toLowerCase()));

Parser.i18n = './i18n/zh-hans';
Parser.debugging = true;
Parser.warning = false;

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
	for (const [name, url, config] of apis) {
		Parser.debug(`开始检查${name}：`);
		Parser.config = `./config/${config}`;
		try {
			const revs = await getPages(`${url}/api.php`);
			for (const {title, ns, content} of revs) {
				try {
					console.time(title);
					const root = Parser.parse(content, ns === 10 && !title.endsWith('/doc'));
					console.timeEnd(title);
					console.time(title);
					const errors = root.lint();
					console.timeEnd(title);
					console.log(errors);
					const textErrors = errors.filter(
						({message}) => /^(?:孤立的|URL中的全角标点|未匹配的闭合标签)/u.test(message),
					);
					if (textErrors.length === 0) {
						continue;
					}
					const lines = content.split('\n');
					textErrors.sort(
						({startLine: aLine, startCol: aCol}, {startLine: bLine, startCol: bCol}) =>
							bLine - aLine || bCol - aCol,
					);
					for (const {startLine, startCol, endCol} of textErrors) {
						const line = lines[startLine];
						lines[startLine] = `${line.slice(0, startCol)}${line.slice(endCol)}`;
					}
					await diff(content, lines.join('\n'));
				} catch (e) {
					Parser.error(`解析${name}的 ${title} 页面时出错！`, e);
				}
			}
		} catch (e) {
			Parser.error(`访问${name}的API端口时出错！`, e);
		}
	}
})();
