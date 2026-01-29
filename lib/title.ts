import {rawurldecode} from '@bhsd/common';
import {
	decodeHtml,
	trimLc,
} from '../util/string';
import type {Config} from '../base';

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
			} catch /* c8 ignore next */ {}
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
				} catch /* c8 ignore next */ {}
			}
			this.#fragment = fragment.replace(/ /gu, '_');
			title = title.slice(0, i).trim();
		}
		const [level, sub] = subpage ? resolve(title) : [0, title];
		this.valid = Boolean(
			title
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
			} = this,
			pre =
				prefix,
			result = this.#getTitle(pre);
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
				/* c8 ignore next 3 */
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
							? `#${encodeURIComponent(
								// eslint-disable-next-line @stylistic/comma-dangle
								fragment
							)}`
							: ''
					),
				);
			}
			return fragment === undefined ? '' : `#${encodeURIComponent(fragment)}`;
		}
	}
}
