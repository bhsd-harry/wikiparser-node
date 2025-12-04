import {rawurldecode} from '@bhsd/common';
import {
	decodeHtml,
	trimLc,

	/* NOT FOR BROWSER */

	escapeRegExp,
	isInterwiki,
} from '../util/string';
import type {Config} from '../base';

/* NOT FOR BROWSER */

import {classes} from '../util/constants';

/* NOT FOR BROWSER END */

export interface TitleOptions {
	temporary?: boolean | undefined;
	decode?: boolean | undefined;
	selfLink?: boolean | undefined;
	halfParsed?: boolean | undefined;
	page?: string | undefined;
}

/**
 * 解析标题的路径
 * @param title 标题
 */
const resolve = (title: string): [number, string] => {
	const [, {length}, sub] = /^((?:\.\.\/)*)([\s\S]*)/u.exec(title) as unknown as [string, string, string];
	return [length / 3, sub];
};

/**
 * title object of a MediaWiki page
 *
 * MediaWiki页面标题对象
 */
export class Title {
	#main: string;
	readonly #namespaces;
	#path: string;
	#ns;
	#fragment;
	/** @private */
	page;
	readonly valid;
	/** @private */
	readonly encoded: boolean = false;

	/* NOT FOR BROWSER */

	#redirectFragment: string | undefined;
	interwiki = '';
	/** @private */
	conversionTable = new Map<string, string>();
	/** @private */
	redirects = new Map<string, string>();

	/* NOT FOR BROWSER END */

	/** namespace number / 命名空间 */
	get ns(): number {
		return this.#ns;
	}

	/** 片段标识符 */
	get fragment(): string | undefined {
		return this.#fragment;
	}

	/** main part without the namespace / 不含命名空间的标题主体部分 */
	get main(): string {
		return this.#main;
	}

	set main(title) {
		title = title.replace(/_/gu, ' ').trim();
		this.#main = title && title[0]!.toUpperCase() + title.slice(1);
	}

	/** namespace prefix / 命名空间前缀 */
	get prefix(): string {
		const namespace = this.#namespaces[this.ns]!;
		return namespace + (namespace && ':');
	}

	/** full title / 完整标题 */
	get title(): string {
		return this.getRedirection()[1];
	}

	/**
	 * file extension
	 *
	 * 扩展名
	 * @since v1.1.0
	 */
	get extension(): string | undefined {
		const {main} = this,
			i = main.lastIndexOf('.');
		return i === -1 ? undefined : main.slice(i + 1).toLowerCase();
	}

	/* NOT FOR BROWSER */

	set extension(extension) {
		extension ??= '';
		const {main} = this,
			i = main.lastIndexOf('.');
		this.main = (i === -1 ? main : main.slice(0, i)) + (extension && '.') + extension;
	}

	/** @throws `RangeError` undefined namespace */
	set ns(ns) {
		/* istanbul ignore if */
		if (!(this.ns in this.#namespaces)) {
			throw new RangeError('Undefined namespace!');
		}
		this.#ns = Number(ns);
	}

	set fragment(fragment) {
		if (fragment === undefined) {
			this.#fragment = undefined;
		} else {
			if (fragment.includes('%')) {
				try {
					fragment = rawurldecode(fragment);
				} catch {}
			}
			this.#fragment = decodeHtml(fragment).replace(/[_ ]+/gu, ' ').trimEnd()
				.replaceAll(' ', '_');
		}
	}

	/**
	 * display title
	 *
	 * 用于显示的标题
	 * @since v1.22.0
	 */
	get displayTitle(): string {
		return this.title.replaceAll('_', ' ');
	}

	/* NOT FOR BROWSER END */

	/**
	 * @see MediaWikiTitleCodec::splitTitleString
	 *
	 * @param title 标题（含或不含命名空间前缀）
	 * @param defaultNs 命名空间
	 * @param config
	 * @param opt 选项
	 * @param opt.temporary 是否是临时标题
	 * @param opt.decode 是否需要解码
	 * @param opt.selfLink 是否允许selfLink
	 * @param opt.page 当前页面标题
	 */
	constructor(
		title: string,
		defaultNs: number,
		config: Config,
		{temporary, decode, selfLink, page}: TitleOptions = {},
	) {
		this.page = page;
		const trimmed = title.trim(),
			subpage = trimmed.startsWith('../');
		if (decode && title.includes('%')) {
			try {
				const encoded = /%(?!21|3[ce]|5[bd]|7[b-d])[\da-f]{2}/iu.test(title);
				title = rawurldecode(title);
				this.encoded = encoded;
			} catch {}
		}
		title = decodeHtml(title).replace(/[_ ]+/gu, ' ').trim();
		if (subpage || page && trimmed.startsWith('/')) {
			this.#ns = 0;
		} else {
			let ns = defaultNs;
			if (title.startsWith(':')) {
				ns = 0;
				title = title.slice(1).trim();
			}

			/* NOT FOR BROWSER */

			const iw = defaultNs ? null : isInterwiki(title, config);
			if (iw) {
				this.interwiki = iw[1]!.toLowerCase();
				title = title.slice(iw.indices![0]![1]);
			}

			/* NOT FOR BROWSER END */

			const m = title.split(':');
			if (m.length > 1) {
				const k = trimLc(m[0]!),
					id = Object.prototype.hasOwnProperty.call(config.nsid, k) && config.nsid[k];
				if (id) {
					ns = id;
					title = m.slice(1).join(':').trim();
				}
			}
			this.#ns = ns;
		}
		const i = title.indexOf('#');
		if (i !== -1) {
			let fragment = title.slice(i).trim().slice(1);
			if (fragment.includes('%')) {
				try {
					fragment = rawurldecode(fragment);
				} catch {}
			}
			this.#fragment = fragment.replace(/ /gu, '_');
			title = title.slice(0, i).trim();
		}
		const [level, sub] = subpage ? resolve(title) : [0, title];
		this.valid = Boolean(
			title
			|| this.interwiki
			|| selfLink && this.ns === 0 && this.#fragment !== undefined,
		)
		&& decodeHtml(title) === title
		&& (level === 0 || page === undefined || page.split('/', level + 1).length > level)
		&& !/^:|\0\d+[eh!+-]\x7F|[<>[\]{}|\n]|%[\da-f]{2}|(?:^|\/)\.{1,2}(?:$|\/)/iu.test(sub);
		this.main = title;
		this.#namespaces = config.namespaces;
		this.#path = config.articlePath || '/wiki/$1';
		if (!this.#path.includes('$1')) {
			this.#path += `${this.#path.endsWith('/') ? '' : '/'}$1`;
		}

		/* PRINT ONLY */

		if (!temporary) {
			Object.defineProperties(this, {
				encoded: {enumerable: false, writable: false},

				/* NOT FOR BROWSER */

				valid: {writable: false},
				conversionTable: {enumerable: false},
				redirects: {enumerable: false},
			});
		}
	}

	/**
	 * 生成标题
	 * @param prefix 前缀
	 */
	#getTitle(prefix: string): [boolean, string] {
		let title = (prefix + this.main).replace(/ /gu, '_');
		if (title.startsWith('/')) {
			title = (this.page ?? '') + title.replace(/(.)\/$/u, '$1');
		} else if (title.startsWith('../') && this.page?.includes('/')) {
			const [level, sub] = resolve(title),
				dirs = this.page.split('/');
			if (dirs.length > level) {
				title = dirs.slice(0, -level).join('/') + (sub && '/') + sub;
			}
		}

		/* NOT FOR BROWSER */

		const media = title.startsWith('Media:');
		let redirected = this.redirects.get(media ? `File:${title.slice(6)}` : title);
		if (redirected) {
			const hash = redirected.indexOf('#');
			this.#redirectFragment = hash === -1 ? undefined : redirected.slice(hash + 1);
			redirected = hash === -1 ? redirected : redirected.slice(0, hash);
			return [true, media ? redirected.replace(/^File:/u, 'Media:') : redirected];
		}

		/* NOT FOR BROWSER */

		return [false, title];
	}

	/**
	 * Check if the title is a redirect
	 *
	 * 检测是否是重定向
	 * @since v1.12.2
	 */
	getRedirection(): [boolean, string] {
		const {
				prefix,

				/* NOT FOR BROWSER */

				main,
				interwiki,
			} = this,
			pre =
				interwiki + (interwiki && ':') + // eslint-disable-line @stylistic/operator-linebreak
				prefix,
			result = this.#getTitle(pre);

		/* NOT FOR BROWSER */

		if (result[0]) {
			return result;
		}
		this.autoConvert();
		if (this.main !== main) {
			return this.#getTitle(pre);
		}

		/* NOT FOR BROWSER END */

		return result;
	}

	/** @private */
	setFragment(fragment: string): void {
		this.#fragment = fragment;
	}

	/**
	 * Get the URL of the title
	 *
	 * 生成URL
	 * @param articlePath article path / 条目路径
	 * @since v1.10.0
	 */
	getUrl(articlePath?: string): string {
		LSP: {
			if (typeof articlePath === 'string') {
				this.#path = articlePath;
				/* istanbul ignore if */
				if (!this.#path.includes('$1')) {
					this.#path += `${this.#path.endsWith('/') ? '' : '/'}$1`;
				}
			}
			const {title, fragment} = this;
			if (title) {
				return this.#path.replace(
					'$1',
					encodeURIComponent(title)
					+ (
						fragment
						|| this.#redirectFragment
							? `#${encodeURIComponent(
								fragment
								|| this.#redirectFragment!,
							)}`
							: ''
					),
				);
			}
			return fragment === undefined ? '' : `#${encodeURIComponent(fragment)}`;
		}
	}

	/* NOT FOR BROWSER */

	/**
	 * Get the URL of the file
	 *
	 * 生成文件URL
	 * @param width width / 宽度
	 * @param height height / 高度
	 * @since v1.32.0
	 * @throws `RangeError` invalid width or height
	 * @throws `Error` not a file
	 */
	getFileUrl(width?: number | false, height?: number | false): string {
		/* istanbul ignore if */
		if (
			typeof width === 'number' && (width <= 0 || !Number.isInteger(width))
			|| typeof height === 'number' && (height <= 0 || !Number.isInteger(height))
		) {
			throw new RangeError('Width and height must be positive integers or omitted!');
		}
		const {main, valid, ns, interwiki} = this;
		if (!valid || ns !== 6 || interwiki) {
			throw new Error('Title.getFileUrl method is only for files!');
		}
		const {expandMagicWord}: typeof import('../render/magicWords') = require('../render/magicWords');
		if (height) {
			width ||= 1e4;
		}
		return expandMagicWord('filepath', [main, `${width || ''}${height ? `x${height}` : ''}`]) as string;
	}

	/** @private */
	toString(display?: boolean): string {
		return (display ? this.displayTitle : this.title) + (
			this.#fragment === undefined && this.#redirectFragment === undefined
				? ''
				: `#${this.#fragment ?? this.#redirectFragment}`
		);
	}

	/**
	 * Perform unidirectional language conversion
	 *
	 * 执行单向转换
	 */
	autoConvert(): void {
		const {conversionTable} = this;
		if (conversionTable.size > 0) {
			const regex = new RegExp(
				[...conversionTable.keys()].sort((a, b) => b.localeCompare(a)).map(escapeRegExp).join('|'),
				'gu',
			);
			this.main = this.main.replace(regex, p => conversionTable.get(p)!);
		}
	}

	/**
	 * Get the title of its subject page
	 *
	 * 转换为主页面
	 * @since v1.1.0
	 */
	toSubjectPage(): this {
		if (this.isTalkPage()) {
			this.#ns--;
		}
		return this;
	}

	/**
	 * Get the title of its talk page
	 *
	 * 转换为讨论页面
	 * @since v1.1.0
	 */
	toTalkPage(): this {
		if (!this.isTalkPage()) {
			this.#ns++;
		}
		return this;
	}

	/**
	 * Check if the title is a talk page
	 *
	 * 是否是讨论页
	 * @since v1.1.0
	 */
	isTalkPage(): boolean {
		return this.ns % 2 === 1;
	}

	/**
	 * Get the title of its base page
	 *
	 * 转换为上一级页面
	 * @since v1.1.0
	 */
	toBasePage(): this {
		this.main = this.main.replace(/\/[^/]*$/u, '');
		return this;
	}

	/**
	 * Get the title of its root page
	 *
	 * 转换为根页面
	 * @since v1.1.0
	 */
	toRootPage(): this {
		this.main = this.main.replace(/\/.*/u, '');
		return this;
	}

	/** @private */
	getTitleAttr(): string {
		return this.title.replace(/^Media:/u, '')
			.replace(/["_]/gu, p => p === '"' ? '&quot;' : ' ');
	}
}

classes['Title'] = __filename;
