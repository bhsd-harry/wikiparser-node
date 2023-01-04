'use strict';

const {diff} = require('./util'),
	Api = require('./api'),
	Parser = require('../');

const {argv: [,, site = '']} = process,
	apis = [
		['LLWiki', 'https://llwiki.org/mediawiki', 'llwiki'],
		['萌娘百科', 'https://zh.moegirl.org.cn', 'moegirl'],
		['维基百科', 'https://zh.wikipedia.org/w', 'zhwiki'],
	].filter(([name]) => name.toLowerCase().includes(site.toLowerCase())),
	complexOrHiddenTypes = [
		// 以下为子节点必为Token的类
		'ext',
		'arg',
		'template',
		'magic-word',
		'parameter',
		'heading',
		'html',
		'table',
		'tr',
		'td',
		'link',
		'category',
		'file',
		'gallery-image',
		'ext-link',
		'converter',
		'converter-flags',
		'converter-rule',
		// 以下为不可见的类
		'noinclude',
		'include',
		'comment',
		'double-underscore',
		'hidden',
		// 以下为SyntaxToken
		'magic-word-name',
		'heading-trail',
		'table-syntax',
	],
	simpleTypes = new Set([
		'parameter-key',
		'parameter-value',
		'html-attr',
		'ext-attr',
		'table-attr',
		'ext-inner',
		'td-inner',
		'image-parameter',
		'arg-default',
		'link-text',
		'ext-link-text',
		'heading-title',
	]),
	possibleSyntax = /[[\]{}<>]/gu;

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
	const moreTypes = new Set();
	for (const [name, url, config] of apis) {
		Parser.debug(`开始检查${name}：`);
		Parser.config = `./config/${config}`;
		try {
			const revs = await getPages(`${url}/api.php`);
			for (const {title, ns, content} of revs) {
				try {
					console.time(title);
					const root = Parser.parse(content, ns === 10);
					console.timeEnd(title);
					await diff(content, String(root));
					for (const token of root.querySelectorAll(`:not(${complexOrHiddenTypes.join()})`)) {
						const {childNodes, type, hidden} = token;
						if (hidden && !simpleTypes.has(type)) {
							moreTypes.add(type);
							continue;
						}
						let first;
						for (let i = 0; i < childNodes.length; i++) {
							const child = childNodes[i];
							if (child && typeof child === 'string') {
								first = i;
								if (child.search(possibleSyntax) >= 0) {
									token.setText(child.replaceAll(possibleSyntax, ''), i);
								}
							}
						}
						if (first === undefined && !simpleTypes.has(type)) {
							moreTypes.add(type);
						}
					}
					await diff(content, String(root));
				} catch (e) {
					Parser.error(`解析${name}的 ${title} 页面时出错！`, e);
				}
			}
		} catch (e) {
			Parser.error(`访问${name}的API端口时出错！`, e);
		}
	}
	if (moreTypes.size > 0) {
		Parser.debug('其他可能不含纯文本子节点的类：', moreTypes);
	}
})();
