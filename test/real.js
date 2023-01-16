'use strict';

const diff = require('../util/diff'),
	Api = require('./api'),
	Parser = require('../'),
	AstText = require('../lib/text');

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
		'imagemap-image',
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
		// 以下为代码不受限的NowikiToken
		'ext-inner#nowiki',
		'ext-inner#pre',
		'ext-inner#score',
		'ext-inner#syntaxhighlight',
		'ext-inner#source',
		'ext-inner#math',
		'ext-inner#chem',
		'ext-inner#ce',
		'ext-inner#graph',
		'ext-inner#mapframe',
		'ext-inner#maplink',
		'ext-inner#quiz',
		'ext-inner#templatedata',
		'ext-inner#timeline',
		'charinsert-line',
	],
	simpleTypes = new Set([
		'ext-inner',
		'ext-attr',
		'html-attr',
		'table-attr',
		'arg-default',
		'parameter-key',
		'parameter-value',
		'heading-title',
		'td-inner',
		'link-target',
		'link-text',
		'image-parameter',
		'ext-link-text',
		'converter-flag',
		'converter-rule-noconvert',
		'converter-rule-to',
	]),
	possibleSyntax = /[{}]+|\[{2,}|\[(?!(?:(?!https?\b)[^[])*\])|(?<=^|\])([^[]*?)\]+|<(?=\s*\/?\w+[\s/>])/giu;

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
					const root = Parser.parse(content, ns === 10 && !title.endsWith('/doc'));
					console.timeEnd(title);
					console.time(title);
					console.log(root.lint());
					console.timeEnd(title);
					for (const token of root.querySelectorAll(`:not(${complexOrHiddenTypes.join()})`)) {
						const {childNodes, type, hidden} = token;
						if (hidden && !simpleTypes.has(type)) {
							moreTypes.add(type);
							continue;
						}
						let first;
						for (let i = 0; i < childNodes.length; i++) {
							const /** @type {AstText} */ {type: childType, data} = childNodes[i];
							if (childType === 'text') {
								first = i;
								if (data.search(possibleSyntax) >= 0) {
									token.setText(data.replaceAll(possibleSyntax, '$1'), i);
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
