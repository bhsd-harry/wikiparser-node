import {decodeHtml, escapeRegExp} from '../util/string';
import Parser from '../index';

/** MediaWiki页面标题对象 */
export class Title {
	/** @browser */
	valid;
	/** @browser */
	ns;
	/** @browser */
	fragment;
	/** @browser */
	encoded = false;
	main;
	prefix;
	interwiki = '';
	conversionTable = new Map<string, string>();
	redirects = new Map<string, string>();

	/** 完整标题 */
	get title(): string {
		let title = `${this.interwiki && `${this.interwiki}:`}${this.prefix}${this.main.replaceAll(' ', '_')}`;
		const redirected = this.redirects.get(title);
		if (redirected) {
			return redirected;
		}
		this.autoConvert();
		title = `${this.interwiki && `${this.interwiki}:`}${this.prefix}${this.main.replaceAll(' ', '_')}`;
		return this.redirects.get(title) ?? title;
	}

	/**
	 * @browser
	 * @param str 标题（含或不含命名空间前缀）
	 * @param defaultNs 命名空间
	 * @param decode 是否需要解码
	 * @param selfLink 是否允许selfLink
	 */
	constructor(str: string, defaultNs = 0, config = Parser.getConfig(), decode = false, selfLink = false) {
		const {namespaces, nsid} = config;
		let namespace = namespaces[defaultNs]!,
			title = decodeHtml(str);
		if (decode && title.includes('%')) {
			try {
				const encoded = /%(?!21|3[ce]|5[bd]|7[b-d])[\da-f]{2}/iu.test(title);
				title = decodeURIComponent(title);
				this.encoded = encoded;
			} catch {}
		}
		title = title.replaceAll('_', ' ').trim();
		if (title.startsWith(':')) {
			namespace = '';
			title = title.slice(1).trim();
		}
		const iw = defaultNs ? null : Parser.isInterwiki(title, config);
		if (iw) {
			this.interwiki = iw[1].toLowerCase();
			title = title.slice(iw[0].length);
		}
		const m = title.split(':');
		if (m.length > 1) {
			const ns = nsid[m[0]!.trim().toLowerCase()],
				id = ns === undefined ? undefined : namespaces[ns];
			if (id !== undefined) {
				namespace = id;
				title = m.slice(1).join(':').trim();
			}
		}
		this.ns = nsid[namespace.toLowerCase()]!;
		const i = title.indexOf('#');
		let fragment: string | undefined;
		if (i !== -1) {
			fragment = title.slice(i + 1).trimEnd();
			if (fragment.includes('%')) {
				try {
					fragment = decodeURIComponent(fragment);
				} catch {}
			} else if (fragment.includes('.')) {
				try {
					fragment = decodeURIComponent(fragment.replaceAll('.', '%'));
				} catch {}
			}
			title = title.slice(0, i).trim();
		}
		this.valid = Boolean(title || selfLink && fragment !== undefined || this.interwiki)
			&& !/\0\d+[eh!+-]\x7F|[<>[\]{}|]|%[\da-f]{2}/iu.test(title);
		this.fragment = fragment;
		this.main = title && `${title[0]!.toUpperCase()}${title.slice(1)}`;
		this.prefix = `${namespace}${namespace && ':'}`;
	}

	/** 完整链接 */
	toString(): string {
		return `${this.title}${this.fragment === undefined ? '' : `#${this.fragment}`}`;
	}

	/**
	 * 转换
	 * @param conversionTable 单向转换表
	 */
	autoConvert(): void {
		const {conversionTable} = this;
		if (conversionTable.size > 0) {
			const regex = new RegExp([...conversionTable.keys()].sort().reverse().map(escapeRegExp).join('|'), 'gu');
			this.main = this.main.replace(regex, p => conversionTable.get(p)!);
		}
	}
}

Parser.classes['Title'] = __filename;
