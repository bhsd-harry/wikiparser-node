import {
	decodeHtml,

	/* NOT FOR BROWSER */

	escapeRegExp,
} from '../util/string';
import {classes} from '../util/constants';
import Parser from '../index';

/** MediaWiki页面标题对象 */
export class Title {
	#main: string;
	readonly #namespaces;
	ns;
	fragment;
	interwiki = '';
	readonly valid;
	/** @private */
	readonly encoded: boolean = false;

	/* NOT FOR BROWSER */

	/** @private */
	conversionTable = new Map<string, string>();
	/** @private */
	redirects = new Map<string, string>();

	/* NOT FOR BROWSER END */

	/** 不含命名空间的标题主体部分 */
	get main(): string {
		return this.#main;
	}

	set main(title) {
		title = title.replace(/_/gu, ' ').trim();
		this.#main = title && `${title[0]!.toUpperCase()}${title.slice(1)}`;
	}

	/** 命名空间前缀 */
	get prefix(): string {
		const namespace = this.#namespaces[this.ns]!;
		return `${namespace}${namespace && ':'}`;
	}

	/** 完整标题 */
	get title(): string {
		const prefix = `${this.interwiki}${this.interwiki && ':'}${this.prefix}`;
		let title = `${prefix}${this.main}`.replace(/ /gu, '_');

		/* NOT FOR BROWSER */

		let redirected = this.redirects.get(title);
		if (redirected) {
			return redirected;
		}
		this.autoConvert();
		title = `${prefix}${this.main}`.replace(/ /gu, '_');
		redirected = this.redirects.get(title);
		if (redirected) {
			return redirected;
		}

		/* NOT FOR BROWSER END */

		return title;
	}

	/** 扩展名 */
	get extension(): string | undefined {
		const {main} = this,
			i = main.lastIndexOf('.');
		return i === -1 ? undefined : main.slice(i + 1).toLowerCase();
	}

	/* NOT FOR BROWSER */

	set extension(extension) {
		const {main} = this,
			i = main.lastIndexOf('.');
		this.main = `${i === -1 ? main : main.slice(0, i)}.${extension}`;
	}

	/* NOT FOR BROWSER END */

	/**
	 * @see MediaWikiTitleCodec::splitTitleString
	 *
	 * @param title 标题（含或不含命名空间前缀）
	 * @param defaultNs 命名空间
	 * @param decode 是否需要解码
	 * @param selfLink 是否允许selfLink
	 */
	constructor(title: string, defaultNs = 0, config = Parser.getConfig(), decode = false, selfLink = false) {
		title = decodeHtml(title);
		if (decode && title.includes('%')) {
			try {
				const encoded = /%(?!21|3[ce]|5[bd]|7[b-d])[\da-f]{2}/iu.test(title);
				title = decodeURIComponent(title);
				this.encoded = encoded;
			} catch {}
		}
		title = title.replace(/_/gu, ' ').trim();
		let ns = defaultNs;
		if (title.startsWith(':')) {
			ns = 0;
			title = title.slice(1).trim();
		}

		/* NOT FOR BROWSER */

		const iw = defaultNs ? null : Parser.isInterwiki(title, config);
		if (iw) {
			this.interwiki = iw[1]!.toLowerCase();
			title = title.slice(iw.indices![0]![1]);
		}

		/* NOT FOR BROWSER END */

		const m = title.split(':');
		if (m.length > 1) {
			const id = config.nsid[m[0]!.trim().toLowerCase()];
			if (id) {
				ns = id;
				title = m.slice(1).join(':').trim();
			}
		}
		this.ns = ns;
		const i = title.indexOf('#');
		if (i !== -1) {
			let fragment = title.slice(i + 1).trimEnd();
			if (fragment.includes('%')) {
				try {
					fragment = decodeURIComponent(fragment);
				} catch {}
			}
			this.fragment = fragment;
			title = title.slice(0, i).trim();
		}
		this.valid = Boolean(title || this.interwiki || selfLink && ns === 0 && this.fragment !== undefined)
			&& !/^:|\0\d+[eh!+-]\x7F|[^\w\x80-\xFF %!"$&'()*,./:;=?@\\^`~+-]|%[\da-f]{2}|(?:^|\/)\.{1,2}(?:$|\/)/iu
				.test(title);
		this.main = title;
		Object.defineProperties(this, {
			encoded: {enumerable: false, writable: false},

			/* NOT FOR BROWSER */

			valid: {writable: false},
			conversionTable: {enumerable: false},
			redirects: {enumerable: false},
		});
		this.#namespaces = config.namespaces;
	}

	/** @private */
	toString(): string {
		return `${this.title}${this.fragment === undefined ? '' : `#${this.fragment}`}`;
	}

	/* NOT FOR BROWSER */

	/** 执行单向转换 */
	autoConvert(): void {
		const {conversionTable} = this;
		if (conversionTable.size > 0) {
			const regex = new RegExp([...conversionTable.keys()].sort().reverse().map(escapeRegExp).join('|'), 'gu');
			this.main = this.main.replace(regex, p => conversionTable.get(p)!);
		}
	}

	/** 转换为主页面 */
	toSubjectPage(): void {
		if (this.isTalkPage()) {
			this.ns--;
		}
	}

	/** 转换为讨论页面 */
	toTalkPage(): void {
		if (!this.isTalkPage()) {
			this.ns++;
		}
	}

	/** 是否是讨论页 */
	isTalkPage(): boolean {
		return this.ns % 2 === 1;
	}

	/** 转换为上一级页面 */
	toBasePage(): void {
		this.main = this.main.replace(/\/[^/]*$/u, '');
	}

	/** 转换为根页面 */
	toRootPage(): void {
		this.main = this.main.replace(/\/.*/u, '');
	}
}

classes['Title'] = __filename;
