/* eslint-disable jsdoc/require-jsdoc */
import {escape} from '../util/string';
import {parsers} from '../util/constants';
import Parser from '../index';
import type {Config} from '../base';

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
	'revisionsize',
	'numberofarticles',
	'numberoffiles',
	'numberofusers',
	'numberofactiveusers',
	'numberofpages',
	'numberofadmins',
	'numberofedits',
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
		{halfParsed: true, decode: true, temporary: true},
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
	dict = {
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
	wfUrlencode = (s: string): string => encodeURIComponent(s).replace(
		/%(2[01489ACF]|3B|40|7E)/gu,
		(_, p) => dict[p as keyof typeof dict],
	),
	localurl = (config: Config, args: string[]): string => {
		const url = urlFunction(config, args, true);
		return typeof url === 'string' ? url : url.pathname + url.search;
	},
	fullurl = (config: Config, args: string[]): string => {
		const [url, protocol] = urlFunction(config, args);
		return url?.href.slice(protocol!.length) ?? '';
	},
	canonicalurl = (config: Config, args: string[]): string => {
		const [url] = urlFunction(config, args);
		return url?.href ?? '';
	};

/**
 * 展开魔术字
 * @param name 魔术字名称
 * @param args 参数
 * @param config
 * @param now 当前时间
 * @throws `RangeError` 不支持的魔术字名称
 */
export const expandMagicWord = (
	name: MagicWord,
	args: string[],
	config = Parser.getConfig(),
	now = Parser.now,
): string => {
	switch (name) {
		case 'currentyear':
			return String(now.getUTCFullYear());
		case 'currentmonth':
			return currentMonth1(now).padStart(2, '0');
		case 'currentmonth1':
			return currentMonth1(now);
		case 'currentmonthname':
		case 'currentmonthnamegen':
			return now.toLocaleString('default', {month: 'long', timeZone: 'UTC'});
		case 'currentmonthabbrev':
			return now.toLocaleString('default', {month: 'short', timeZone: 'UTC'});
		case 'currentday':
			return currentDay(now);
		case 'currentday2':
			return currentDay(now).padStart(2, '0');
		case 'currentdow':
			return String(now.getUTCDay());
		case 'currentdayname':
			return now.toLocaleString('default', {weekday: 'long', timeZone: 'UTC'});
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
			return now.toLocaleString('default', {month: 'long'});
		case 'localmonthabbrev':
			return now.toLocaleString('default', {month: 'short'});
		case 'localday':
			return localDay(now);
		case 'localday2':
			return localDay2(now);
		case 'localdow':
			return String(now.getDay());
		case 'localdayname':
			return now.toLocaleString('default', {weekday: 'long'});
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
			return config.articlePath ?? '';
		case 'server': {
			const [url, offset] = parseUrl(config);
			return url?.origin.slice(offset) ?? '';
		}
		case 'servername': {
			const [url] = parseUrl(config);
			return url?.hostname ?? '';
		}
		case 'revisionsize':
		case 'numberofarticles':
		case 'numberoffiles':
		case 'numberofusers':
		case 'numberofactiveusers':
		case 'numberofpages':
		case 'numberofadmins':
		case 'numberofedits':
			return '0';
		case 'ns':
			return ns(config, args);
		case 'nse':
			return wfUrlencode(ns(config, args).replaceAll(' ', '_'));
		case 'urlencode': {
			const s = args[0]!.replace(/\0\d+.\x7F/gu, '');
			switch (args[1]) {
				case 'WIKI':
					return wfUrlencode(s.replaceAll(' ', '_'));
				case 'PATH':
					return encodeURIComponent(s);
				default:
					return encodeURIComponent(s).replaceAll('%20', '+');
			}
		}
		case 'lcfirst': {
			const value = args[0]!,
				[first] = value;
			return value && first!.toLowerCase() + value.slice(first!.length);
		}
		case 'ucfirst': {
			const value = args[0]!,
				[first] = value;
			return value && first!.toUpperCase() + value.slice(first!.length);
		}
		case 'lc':
			return args[0]!.toLowerCase();
		case 'uc':
			return args[0]!.toUpperCase();
		case 'localurl':
			return localurl(config, args);
		case 'localurle':
			return escape(localurl(config, args));
		case 'fullurl':
			return fullurl(config, args);
		case 'fullurle':
			return escape(fullurl(config, args));
		case 'canonicalurl':
			return canonicalurl(config, args);
		case 'canonicalurle':
			return escape(canonicalurl(config, args));
		case 'gender':
			return args[3] ?? args[1] ?? '';
		default:
			throw new RangeError(`Unsupported magic word: ${name as string}`);
	}
};

parsers['expandMagicWord'] = __filename;
