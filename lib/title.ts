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
}

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
	 */
	constructor(title: string, defaultNs: number, config: Config, {temporary, decode, selfLink}: TitleOptions = {}) {
		const subpage = title.trim().startsWith('../');
		if (decode && title.includes('%')) {
			try {
				const encoded = /%(?!21|3[ce]|5[bd]|7[b-d])[\da-f]{2}/iu.test(title);
				title = rawurldecode(title);
				this.encoded = encoded;
			} catch {}
		}
		title = decodeHtml(title).replace(/[_ ]+/gu, ' ').trim();
		if (subpage) {
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
				} catch {}
			}
			this.#fragment = fragment.replace(/ /gu, '_');
			title = title.slice(0, i).trim();
		}
		this.valid = Boolean(
			title
			|| selfLink && this.ns === 0 && this.#fragment !== undefined,
		)
		&& decodeHtml(title) === title
		&& !/^:|\0\d+[eh!+-]\x7F|[<>[\]{}|\n]|%[\da-f]{2}|(?:^|\/)\.{1,2}(?:$|\/)/iu.test(
			subpage ? /^(?:\.\.\/)+(.*)/u.exec(title)![1]! : title,
		);
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
			});
		}
	}

	/**
	 * Check if the title is a redirect
	 *
	 * 检测是否是重定向
	 * @since v1.12.2
	 */
	getRedirection(): [boolean, string] {
		// eslint-disable-next-line @typescript-eslint/prefer-destructuring
		const prefix =
			this.prefix;
		// eslint-disable-next-line prefer-const
		let title = (prefix + this.main).replace(/ /gu, '_');
		return [false, title];
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
	 * @throws `Error` only available in the LSP version
	 * @since v1.10.0
	 */
	getUrl(articlePath?: string): string {
		LSP: { // eslint-disable-line no-unused-labels
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
		throw new Error('Title.getUrl method is only available in the LSP version!');
	}
}
