import {EventEmitter} from 'events';
import {error, info, diff} from '../util/diff';
import single from './single';
import lsp from './lsp';
import {mock} from './wikiparse';
import type {Config} from '../base';

const i18n: Record<string, string> = require('../../i18n/zh-hans');
wikiparse.setI18N(i18n);

EventEmitter.defaultMaxListeners = 15;

const {argv: [,, site = '']} = process,
	apis = ([
		['LLWiki', 'https://llwiki.org/mediawiki', 'llwiki'],
		// ['萌娘百科', 'https://zh.moegirl.org.cn', 'moegirl'],
		['维基百科', 'https://zh.wikipedia.org/w', 'zhwiki'],
		['Wikipedia', 'https://en.wikipedia.org/w', 'enwiki'],
	] as const).filter(([name]) => name.toLowerCase().includes(site.toLowerCase()));

/**
 * 获取最近更改的页面源代码
 * @param url api.php网址
 */
const getPages = async (url: string): Promise<SimplePage[]> => {
	const qs = {
		action: 'query',
		format: 'json',
		formatversion: '2',
		errorformat: 'plaintext',
		generator: 'recentchanges',
		grcnamespace: '0|10',
		grclimit: '10',
		grctype: 'edit|new',
		prop: 'revisions',
		rvprop: 'contentmodel|content',
	};
	// eslint-disable-next-line n/no-unsupported-features/node-builtins
	return (await (await fetch(`${url}?${String(new URLSearchParams(qs))}`)).json() as MediaWikiResponse)
		.query.pages.map(({pageid, title, ns, revisions}) => ({
			pageid,
			title,
			ns,
			content: revisions?.[0]?.contentmodel === 'wikitext' && revisions[0].content,
		})).filter((page): page is SimplePage => page.content !== false);
};

(async () => {
	const failures = new Map<string, number>();
	for (const [name, url, config] of apis) {
		info(`开始检查${name}：\n`);
		const parserConfig: Config = require(`../../config/${config}`);
		wikiparse.setConfig(parserConfig);
		try {
			let failed = 0;
			for (const page of await getPages(`${url}/api.php`)) {
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
					await lsp(page);
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
	setTimeout(() => {
		void mock.worker.terminate();
	}, 1000);
	if (failures.size > 0) {
		let total = 0;
		for (const [name, failed] of failures) {
			error(`${name}：${failed} 个页面解析失败！`);
			total += failed;
		}
		throw new Error(`共有 ${total} 个页面解析失败！`);
	}
})();
