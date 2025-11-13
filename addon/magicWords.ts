/* eslint-disable jsdoc/require-jsdoc */
import {posix} from 'path';
import {escape, replaceEntities, sanitizeId, decodeHtml} from '../util/string';
import {parsers} from '../util/constants';
import {getId} from '../util/html';
import Parser from '../index';
import {Token} from '../src/index';
import type {Config} from '../base';
import type {Title} from '../lib/title';

declare interface Locale extends Intl.Locale {
	getTextInfo(): {direction: 'ltr' | 'rtl'};
}
declare interface TestConfig extends Config {
	testArticlePath?: string;
	testServer?: string;
}

const magicWords = [
	'currentmonth',
	'currentmonth1',
	'currentmonthname',
	'currentmonthnamegen',
	'currentmonthabbrev',
	'currentday',
	'currentday2',
	'currentdayname',
	'currentyear',
	'currenttime',
	'currenthour',
	'currentweek',
	'currentdow',
	'currenttimestamp',
	'localmonth',
	'localmonth1',
	'localmonthname',
	'localmonthnamegen',
	'localmonthabbrev',
	'localday',
	'localday2',
	'localdayname',
	'localyear',
	'localtime',
	'localhour',
	'localweek',
	'localdow',
	'localtimestamp',
	'articlepath',
	'server',
	'servername',
	'directionmark',
	'contentlanguage',
	'pagelanguage',
	'userlanguage',
	'revisionsize',
	'numberofarticles',
	'numberoffiles',
	'numberofusers',
	'numberofactiveusers',
	'numberofpages',
	'numberofadmins',
	'numberofedits',
	'numberingroup',
	'pagesincategory',
	'pagesize',
	'ns',
	'nse',
	'urlencode',
	'lcfirst',
	'ucfirst',
	'lc',
	'uc',
	'localurl',
	'localurle',
	'fullurl',
	'fullurle',
	'canonicalurl',
	'canonicalurle',
	'gender',
	'formal',
	'displaytitle',
	'defaultsort',
	'revisionuser',
	'translation',
	'revisionid',
	'revisionday',
	'revisionday2',
	'revisionmonth',
	'revisionmonth1',
	'revisionyear',
	'revisiontimestamp',
	'namespace',
	'namespacee',
	'namespacenumber',
	'talkspace',
	'talkspacee',
	'subjectspace',
	'subjectspacee',
	'pagename',
	'pagenamee',
	'fullpagename',
	'fullpagenamee',
	'subpagename',
	'subpagenamee',
	'rootpagename',
	'rootpagenamee',
	'basepagename',
	'basepagenamee',
	'talkpagename',
	'talkpagenamee',
	'subjectpagename',
	'subjectpagenamee',
	'language',
	'dir',
	'padleft',
	'padright',
	'anchorencode',
	'special',
	'speciale',
	'pageid',
	'contentmodel',
	'tag',
	'rel2abs',
	'titleparts',
	'len',
	'pos',
	'rpos',
	'sub',
	'count',
	'replace',
	'explode',
	'urldecode',
	'if',
	'ifeq',
	'ifexist',
	'iferror',
	'switch',
	'plural',
	'expr',
] as const;
export type MagicWord = typeof magicWords[number];
export const expandedMagicWords = new Set<string>(magicWords);

function urlFunction(config: TestConfig, args: string[], local: true): URL | string;
function urlFunction(config: TestConfig, args: string[]): [(URL | null)?, string?];
function urlFunction(config: TestConfig, args: string[], local?: true): URL | string | [(URL | null)?, string?] {
	const [value, query] = args as [string, string?],
		fallback = (local ? '' : []) as [];
	if (value.includes('\0')) {
		return fallback;
	}
	const title = Parser.normalizeTitle(
		value,
		0,
		false,
		config,
		{halfParsed: true, decode: true, temporary: true, page: ''},
	);
	if (!title.valid) {
		return fallback;
	} else if (title.ns === -2) {
		title.ns = 6;
		title.fragment = undefined;
	}
	const link = title.getUrl(config.testArticlePath),
		protocol = link.startsWith('//') ? 'https:' : '',
		url = URL.parse(protocol + link);
	if (url) {
		url.search = query ? `?${query.replace(/\s/gu, '_')}` : '';
	} else if (local) {
		title.fragment = undefined;
		return title.getUrl(config.testArticlePath) + (query ? `?${query}` : '');
	}
	return local ? url! : [url, protocol];
}

const parseUrl = ({testServer = '', articlePath = testServer}: TestConfig): [URL | null, number] => {
		let offset = 0;
		if (articlePath.startsWith('//')) {
			offset = 6;
			articlePath = `https:${articlePath}`;
		}
		return [URL.parse(articlePath), offset];
	},
	currentMonth1 = (now: Date): string => String(now.getUTCMonth() + 1),
	currentDay = (now: Date): string => String(now.getUTCDate()),
	currentHour = (now: Date): string => String(now.getUTCHours()).padStart(2, '0'),
	currentWeek = (now: Date, firstDay: Date): string =>
		String(Math.ceil((now.getTime() - firstDay.getTime()) / 1e3 / 60 / 60 / 24 / 7)),
	localYear = (now: Date): string => String(now.getFullYear()),
	localMonth1 = (now: Date): string => String(now.getMonth() + 1),
	localMonth = (now: Date): string => localMonth1(now).padStart(2, '0'),
	localDay = (now: Date): string => String(now.getDate()),
	localDay2 = (now: Date): string => localDay(now).padStart(2, '0'),
	localHour = (now: Date): string => String(now.getHours()).padStart(2, '0'),
	localMinute = (now: Date): string => String(now.getMinutes()).padStart(2, '0'),
	ns = ({nsid, namespaces}: Config, args: string[]): string => {
		const [val] = args;
		if (val === undefined) {
			return '';
		}
		let nsVal: number | undefined = Number(val);
		if (Number.isNaN(nsVal)) {
			nsVal = nsid[val.toLowerCase().replaceAll('_', ' ')];
		}
		return namespaces[nsVal!] ?? '';
	},
	dictUrl = {
		20: '+',
		21: '!',
		24: '$',
		28: '(',
		29: ')',
		'2A': '*',
		'2C': ',',
		'2F': '/',
		'3B': ';',
		40: '@',
		'7E': '~',
	},
	strip = (s: string): string => s.replace(/\0\d+.\x7F/gu, ''),
	wfUrlencode = (s: string): string => encodeURIComponent(s.replaceAll(' ', '_'))
		.replace(/%(2[01489ACF]|3B|40|7E)/gu, (_, p) => dictUrl[p as keyof typeof dictUrl]),
	localurl = (config: Config, args: string[]): string => {
		const url = urlFunction(config, args, true);
		return typeof url === 'string' ? url : url.pathname + url.search;
	},
	fullurl = (config: Config, args: string[]): string | false => {
		const [url, protocol] = urlFunction(config, args);
		return url?.href.slice(protocol!.length) ?? false;
	},
	canonicalurl = (config: Config, args: string[]): string | false => {
		const [url] = urlFunction(config, args);
		return url?.href ?? false;
	},
	makeTitle = (page: string, config: Config, nsid = 0, subpage?: boolean): Title | '' => {
		if (page.includes('\0')) {
			return '';
		}
		const title = Parser.normalizeTitle(
			page,
			nsid,
			false,
			config,
			{halfParsed: true, temporary: true, page: subpage ? undefined : ''},
		);
		return title.valid ? title : '';
	},
	namespace = (title: Title, config: Config): string => config.namespaces[title.ns]!,
	namespacee = (title: Title, config: Config): string => wfUrlencode(namespace(title, config)),
	dictHtml1 = {
		'"': '&#34;',
		'&': '&#38;',
		"'": '&#39;',
		'=': '&#61;',
		';': '&#59;',
		'!!': '&#33;!',
		__: '_#95;',
		'://': '&#58;//',
		'＿': '&#xFF3F;',
		'~~~': '~~&#126;',
		'\n!': '\n&#33;',
		'\n#': '\n&#35;',
		'\n*': '\n&#42;',
		'\n:': '\n&#58;',
		'\n----': '\n&#45;---',
		'ISBN ': 'ISBN&#32;',
		'PMID ': 'PMID&#32;',
		'RFC ': 'RFC&#32;',
	},
	dictHtml2 = {'+': '&#43;', '-': '&#45;', _: '&#95;', '~': '&#126;'},
	dictHtml3 = {_: '&#95;', '~': '&#126;'},
	wfEscapeWikiText = (text: string, config: Config): string => {
		if (!text) {
			return '';
		}
		let output = `\n${text}`.replace(
			/["&'=;＿]|!!|__|:\/\/|~{3}|\n(?:[!#*:]|-{4})|(?:ISBN|PMID|RFC) /gu,
			m => dictHtml1[m as keyof typeof dictHtml1],
		).slice(1);
		output = output.charAt(0).replace(/[+_~-]/u, m => dictHtml2[m as keyof typeof dictHtml2])
			+ output.slice(1);
		output = output.slice(0, -1)
			+ output.at(-1)!.replace(/[_~]/u, m => dictHtml3[m as keyof typeof dictHtml3]);
		const re = new RegExp(
			String.raw`\b(${
				config.protocol.split('|')
					.filter(p => p.endsWith(':'))
					.map(p => p.slice(0, -1))
					.join('|')
			}):`,
			'giu',
		);
		return output.replace(re, '$1&#58;');
	},
	pagenamee = (page: string): string => encodeURI(page.replaceAll(' ', '_')),
	fullpagename = (title: Title, config: Config): string => wfEscapeWikiText(title.prefix + title.main, config),
	fullpagenamee = (title: Title, config: Config): string =>
		wfEscapeWikiText(pagenamee(title.prefix + title.main), config),
	subpagename = (target: string, config: Config): string => {
		const title = makeTitle(target, config);
		if (!title) {
			return '';
		}
		const {main} = title;
		return main.slice(main.lastIndexOf('/') + 1);
	},
	language = (() => {
		try {
			return navigator.language; // eslint-disable-line n/no-unsupported-features/node-builtins
		} catch {
			return new Intl.DateTimeFormat().resolvedOptions().locale;
		}
	})(),
	dir = (lang = language): 'ltr' | 'rtl' => {
		try {
			return (new Intl.Locale(lang) as Locale).getTextInfo().direction;
		} catch {
			return 'ltr';
		}
	},
	pad = ([arg0, arg1, arg2 = '0']: [string, ...string[]], method: 'padStart' | 'padEnd'): string =>
		arg0.includes('\0') ? arg0 : arg0[method](Number(arg1), strip(arg2)),
	anchorencode = replaceEntities(),
	special = (target: string, config: Config): string => {
		const title = makeTitle(target, config, -1);
		return title && title.ns === -1 ? title.prefix + title.main : 'Special:Badtitle';
	},
	contentmodels: Record<string, string> = {js: 'JavaScript', css: 'CSS', json: 'JSON', vue: 'Vue'},
	cmp = (x: string, y: string, decode?: boolean): boolean => {
		const a = decode ? decodeHtml(x) : x,
			b = decodeHtml(y);
		return a === b || Boolean(a && b) && Number(a) === Number(b);
	},
	isError = (s: string): boolean =>
		/<(?:strong|span|p|div)\s+(?:[^\s>]+\s+)*?class="\s*(?:[^"\s>]+\s+)*?error(?:\s[^">]*)?"/u.test(s),
	splitArg = (arg: string): [string, string] | false => {
		const i = arg.indexOf('=');
		return i !== -1 && [arg.slice(0, i).trim(), arg.slice(i + 1).trim()];
	},
	isKnown = (s: string): boolean => !/\0\d+[tm]\x7F/u.test(s);

/**
 * 展开魔术字
 * @param name 魔术字名称
 * @param args 参数
 * @param page 当前页面标题
 * @param config
 * @param now 当前时间
 * @param accum
 * @throws `RangeError` 不支持的魔术字名称
 */
export const expandMagicWord = (
	name: MagicWord,
	args: string[],
	page = '',
	config = Parser.getConfig(),
	now = Parser.now,
	accum?: Token[],
): string | false => {
	const arg0 = args[0]!,
		target = args[0] ?? page;
	switch (name) {
		case 'currentyear':
			return String(now.getUTCFullYear());
		case 'currentmonth':
			return currentMonth1(now).padStart(2, '0');
		case 'currentmonth1':
			return currentMonth1(now);
		case 'currentmonthname':
		case 'currentmonthnamegen':
			return now.toLocaleString(undefined, {month: 'long', timeZone: 'UTC'});
		case 'currentmonthabbrev':
			return now.toLocaleString(undefined, {month: 'short', timeZone: 'UTC'});
		case 'currentday':
			return currentDay(now);
		case 'currentday2':
			return currentDay(now).padStart(2, '0');
		case 'currentdow':
			return String(now.getUTCDay());
		case 'currentdayname':
			return now.toLocaleString(undefined, {weekday: 'long', timeZone: 'UTC'});
		case 'currenttime':
			return `${currentHour(now)}:${String(now.getUTCMinutes()).padStart(2, '0')}`;
		case 'currenthour':
			return currentHour(now);
		case 'currentweek':
			return currentWeek(now, new Date(Date.UTC(now.getUTCFullYear(), 0, 1)));
		case 'currenttimestamp':
			return now.toISOString().slice(0, 19).replace(/[-:T]/gu, '');
		case 'localyear':
			return localYear(now);
		case 'localmonth':
			return localMonth(now);
		case 'localmonth1':
			return localMonth1(now);
		case 'localmonthname':
		case 'localmonthnamegen':
			return now.toLocaleString(undefined, {month: 'long'});
		case 'localmonthabbrev':
			return now.toLocaleString(undefined, {month: 'short'});
		case 'localday':
			return localDay(now);
		case 'localday2':
			return localDay2(now);
		case 'localdow':
			return String(now.getDay());
		case 'localdayname':
			return now.toLocaleString(undefined, {weekday: 'long'});
		case 'localtime':
			return `${localHour(now)}:${localMinute(now)}`;
		case 'localhour':
			return localHour(now);
		case 'localweek':
			return currentWeek(now, new Date(now.getFullYear(), 0, 1));
		case 'localtimestamp':
			return localYear(now) + localMonth(now) + localDay2(now) + localHour(now) + localMinute(now)
				+ String(now.getSeconds()).padStart(2, '0');
		case 'articlepath':
			return config.articlePath ?? false;
		case 'server': {
			const [url, offset] = parseUrl(config);
			return url?.origin.slice(offset) ?? false;
		}
		case 'servername': {
			const [url] = parseUrl(config);
			return url?.hostname ?? false;
		}
		case 'directionmark':
			return dir() === 'ltr' ? '\u200E' : '\u200F';
		case 'contentlanguage':
		case 'pagelanguage':
		case 'userlanguage':
			return language;
		case 'revisionsize':
		case 'numberofarticles':
		case 'numberoffiles':
		case 'numberofusers':
		case 'numberofactiveusers':
		case 'numberofpages':
		case 'numberofadmins':
		case 'numberofedits':
		case 'numberingroup':
		case 'pagesincategory':
		case 'pagesize':
		case 'pageid':
			return '0';
		case 'ns':
			return ns(config, args);
		case 'nse':
			return wfUrlencode(ns(config, args));
		case 'urlencode': {
			const s = strip(arg0);
			switch (args[1]) {
				case 'WIKI':
					return wfUrlencode(s);
				case 'PATH':
					return encodeURIComponent(s);
				default:
					return encodeURIComponent(s).replaceAll('%20', '+');
			}
		}
		case 'lcfirst': {
			const value = arg0,
				[first] = value;
			return value && first!.toLowerCase() + value.slice(first!.length);
		}
		case 'ucfirst': {
			const value = arg0,
				[first] = value;
			return value && first!.toUpperCase() + value.slice(first!.length);
		}
		case 'lc':
			return arg0.toLowerCase();
		case 'uc':
			return arg0.toUpperCase();
		case 'localurl':
			return localurl(config, args);
		case 'localurle':
			return escape(localurl(config, args));
		case 'fullurl':
			return fullurl(config, args);
		case 'fullurle': {
			const url = fullurl(config, args);
			return url && escape(url);
		}
		case 'canonicalurl':
			return canonicalurl(config, args);
		case 'canonicalurle': {
			const url = canonicalurl(config, args);
			return url && escape(url);
		}
		case 'gender':
			return args[3] ?? args[1] ?? '';
		case 'formal':
			return arg0;
		case 'displaytitle':
		case 'defaultsort':
		case 'revisionid':
		case 'revisionday':
		case 'revisionday2':
		case 'revisionmonth':
		case 'revisionmonth1':
		case 'revisionyear':
		case 'revisiontimestamp':
		case 'revisionuser':
		case 'translation':
			return '';
		case 'namespace': {
			const title = makeTitle(target, config);
			return title && namespace(title, config);
		}
		case 'namespacee': {
			const title = makeTitle(target, config);
			return title && namespacee(title, config);
		}
		case 'namespacenumber': {
			const title = makeTitle(target, config);
			return title && String(title.ns);
		}
		case 'talkspace': {
			const title = makeTitle(target, config);
			return title && namespace(title.toTalkPage(), config);
		}
		case 'talkspacee': {
			const title = makeTitle(target, config);
			return title && namespacee(title.toTalkPage(), config);
		}
		case 'subjectspace': {
			const title = makeTitle(target, config);
			return title && namespace(title.toSubjectPage(), config);
		}
		case 'subjectspacee': {
			const title = makeTitle(target, config);
			return title && namespacee(title.toSubjectPage(), config);
		}
		case 'pagename': {
			const title = makeTitle(target, config);
			return title && wfEscapeWikiText(title.main, config);
		}
		case 'pagenamee': {
			const title = makeTitle(target, config);
			return title && wfEscapeWikiText(pagenamee(title.main), config);
		}
		case 'fullpagename': {
			const title = makeTitle(target, config);
			return title && fullpagename(title, config);
		}
		case 'fullpagenamee': {
			const title = makeTitle(target, config);
			return title && fullpagenamee(title, config);
		}
		case 'subpagename':
			return wfEscapeWikiText(subpagename(target, config), config);
		case 'subpagenamee':
			return wfEscapeWikiText(pagenamee(subpagename(target, config)), config);
		case 'rootpagename': {
			const title = makeTitle(target, config);
			return title && wfEscapeWikiText(title.toRootPage().main, config);
		}
		case 'rootpagenamee': {
			const title = makeTitle(target, config);
			return title && wfEscapeWikiText(pagenamee(title.toRootPage().main), config);
		}
		case 'basepagename': {
			const title = makeTitle(target, config);
			return title && wfEscapeWikiText(title.toBasePage().main, config);
		}
		case 'basepagenamee': {
			const title = makeTitle(target, config);
			return title && wfEscapeWikiText(pagenamee(title.toBasePage().main), config);
		}
		case 'talkpagename': {
			const title = makeTitle(target, config);
			return title && fullpagename(title.toTalkPage(), config);
		}
		case 'talkpagenamee': {
			const title = makeTitle(target, config);
			return title && fullpagenamee(title.toTalkPage(), config);
		}
		case 'subjectpagename': {
			const title = makeTitle(target, config);
			return title && fullpagename(title.toSubjectPage(), config);
		}
		case 'subjectpagenamee': {
			const title = makeTitle(target, config);
			return title && fullpagenamee(title.toSubjectPage(), config);
		}
		case 'language':
			try {
				return new Intl.DisplayNames(args[1] || args[0], {type: 'language'}).of(args[0] || language) ?? '';
			} catch {
				return '';
			}
		case 'dir':
			return dir(args[0]);
		case 'padleft':
			return pad(args as [string, ...string[]], 'padStart');
		case 'padright':
			return pad(args as [string, ...string[]], 'padEnd');
		case 'anchorencode':
			return anchorencode(getId(
				strip(arg0).replace(
					/\[\[([^[]+?)\]\]/gu,
					(_, p: string) => {
						const i = p.indexOf('|');
						return i <= 0 || i === p.length - 1 ? p : p.slice(i + 1);
					},
				),
			)).replace(/%(?=[\da-f]{2})/giu, '%25');
		case 'special':
			return special(target, config);
		case 'speciale':
			return wfUrlencode(special(target, config));
		case 'contentmodel': {
			if (args.length === 0) {
				return 'wikitext';
			} else if (arg0 !== 'local' && arg0 !== 'canonical') {
				return '';
			}
			const title = makeTitle(args[1] ?? page, config);
			if (!title) {
				return '';
			}
			const {ns: n, main, extension} = title,
				isSubpage = main.includes('/');
			if (isSubpage && (n === 10 || n === 828) && extension === 'css') {
				return 'sanitized-css';
			} else if (n === 828) {
				if (extension === 'json') {
					return 'JSON';
				}
				return main.endsWith('/doc') ? 'wikitext' : 'Scribunto';
			}
			return (n === 8 || n === 2 && isSubpage) && extension && extension in contentmodels
				? contentmodels[extension]!
				: 'wikitext';
		}
		case 'tag': {
			const tagName = strip(arg0).toLowerCase(),
				[, inner, ...attrs] = args,
				attributes = new Map<string, string>();
			for (const arg of attrs) {
				const splitted = splitArg(arg);
				if (!splitted) {
					continue;
				}
				const [key] = splitted;
				if (key.includes('\0')) {
					continue;
				}
				let value = strip(splitted[1]).trim();
				const mt = /^(?:["'](.+)["']|""|'')$/su.exec(value);
				if (mt) {
					value = mt[1] ?? '';
				}
				attributes.set(key, value);
			}
			const tag = `<${tagName} ${
				[...attributes].map(([key, value]) => `${sanitizeId(key)}="${sanitizeId(value)}"`).join(' ')
			}${inner === undefined ? '/>' : `>${inner}</${tagName}>`}`;
			return accum ? new Token(tag, config, accum).parseOnce(0).firstChild!.toString() : tag;
		}
		case 'rel2abs': {
			const to = !arg0 || arg0.startsWith('/') ? `.${arg0}` : arg0,
				from = /^\.{1,2}(?:$|\/)/u.test(to) ? args[1] || page : '',
				abs = posix.join(from, to);
			return abs === '.' || /^\.\.(?:$|\/)/u.test(abs)
				? '<strong class="error">'
				+ 'Error: Invalid depth in path (tried to access a node above the root node).'
				+ '</strong>'
				: abs.replace(/\/$/u, '');
		}
		case 'titleparts': {
			const title = makeTitle(arg0, config, 0, true);
			if (!title) {
				return arg0;
			}
			const parts = Number(args[1]) || NaN;
			let offset = Number(args[2]) || 0;
			if (offset > 0) {
				offset--;
			}
			const end = parts < 0 ? parts : offset + parts || undefined,
				bits = (title.prefix + title.main).split('/');
			if (bits.length > 25) {
				bits[24] = bits.slice(24).join('/');
				bits.length = 25;
			}
			return bits.slice(offset, end).join('/');
		}
		case 'len':
			return String([...strip(arg0)].length);
		case 'pos': {
			const i = strip(arg0).indexOf(strip(args[1] ?? '') || ' ', Number(args[2]));
			return i === -1 ? '' : String(i);
		}
		case 'rpos':
			return String(strip(arg0).lastIndexOf(strip(args[1] ?? '') || ' '));
		case 'sub': {
			const inLength = Number(args[2]);
			return strip(arg0)[inLength < 0 ? 'slice' : 'substr'](Number(args[1]) || 0, inLength || undefined);
		}
		case 'count':
			return String(strip(arg0).split(strip(args[1] ?? '') || ' ').length - 1);
		case 'replace': {
			const from = strip(args[1] ?? '') || ' ',
				to = strip(args[2] ?? ''),
				bits = strip(arg0).split(from),
				limit = Number(args[3]);
			return Number.isNaN(limit) || limit < 0 || limit >= bits.length - 1
				? bits.join(to)
				: bits.slice(0, limit + 1).join(to) + from + bits.slice(limit + 1).join(from);
		}
		case 'explode': {
			const [, arg1 = '', arg2 = 0] = args,
				inPos = Number(arg2);
			if (arg2 === '' || Number.isNaN(inPos)) {
				return '';
			}
			const inDiv = strip(arg1) || ' ',
				bits = strip(arg0).split(inDiv),
				inLim = Number(args[3]);
			if (inLim > 0 && bits.length > inLim) {
				bits[inLim - 1] = bits.slice(inLim - 1).join(inDiv);
				bits.length = inLim;
			}
			return bits.at(inPos) ?? '';
		}
		case 'urldecode':
			return decodeURIComponent(strip(arg0).replaceAll('+', ' '));
		case 'ifeq':
			return args.length < 3
				? ''
				: isKnown(arg0) && isKnown(args[1]!) && (args[cmp(arg0, args[1]!, true) ? 2 : 3] ?? '');
		case 'if':
		case 'iferror':
			if (args.length === 1) {
				return '';
			}
			return (name === 'if' ? strip : isError)(decodeHtml(arg0)) ? args[1]! : isKnown(arg0) && (args[2] ?? '');
		case 'ifexist': {
			if (args.length === 1) {
				return '';
			} else if (!isKnown(arg0)) {
				return false;
			}
			const {valid, interwiki} = Parser.normalizeTitle(
				decodeHtml(arg0),
				0,
				false,
				config,
				{halfParsed: true, temporary: true, page: ''},
			);
			return args[valid && !interwiki ? 1 : 2] ?? '';
		}
		case 'switch': {
			const {length} = args;
			if (length === 1) {
				return '';
			} else if (!isKnown(arg0)) {
				return false;
			}
			const v = decodeHtml(arg0);
			let defaultVal = '',
				j = 1,

				/**
				 * - `1` 表示默认值
				 * - `2` 表示匹配值
				 * - `3` 表示未知值
				 */
				found = 0;
			for (; j < length; j++) {
				const arg = args[j]!,
					splitted = splitArg(arg);
				if (splitted) {
					const [key, value] = splitted,
						known = isKnown(key);
					if (found === 2 || known && cmp(v, key)) { // 第一个匹配值
						return value;
					} else if (!known || found === 3) { // 不支持复杂参数
						return false;
					} else if (found === 1 || key.toLowerCase() === '#default') { // 更新默认值
						defaultVal = value;
						found = 0;
					}
				} else if (j === length - 1) { // 位于最后的匿名参数是默认值
					return arg;
				} else if (!isKnown(arg)) { // 不支持复杂参数
					found = 3;
				} else if (cmp(v, arg)) { // 下一个命名参数视为匹配值
					found = 2;
				} else if (arg === '#default' && found < 2) { // 下一个命名参数视为默认值
					found = 1;
				}
			}
			return defaultVal;
		}
		case 'plural': {
			if (args.length < 3) {
				return args[1] ?? '';
			}
			const n = Number(arg0);
			return args[n === 1 || n === -1 ? 1 : 2] ?? '';
		}
		case 'expr':
			return !Number.isNaN(Number(arg0)) && arg0;
		default:
			throw new RangeError(`Unsupported magic word: ${name as string}`);
	}
};

parsers['expandMagicWord'] = __filename;
