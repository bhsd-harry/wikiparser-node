import {
	decodeHtml,
	rawurldecode,
} from '../util/string';
import type {Config} from '../base';

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

	/** 不含命名空间的标题主体部分 */
	get main(): string {
		return this.#main;
	}

	set main(title) {
		title = title.replace(/_/gu, ' ').trim();
		this.#main = title && title[0]!.toUpperCase() + title.slice(1);
	}

	/** 命名空间前缀 */
	get prefix(): string {
		const namespace = this.#namespaces[this.ns]!;
		return namespace + (namespace && ':');
	}

	/** 完整标题 */
	get title(): string {
		const prefix = this.interwiki + (this.interwiki && ':') + this.prefix;
		let title = (prefix + this.main).replace(/ /gu, '_');
		return title;
	}

	/** 扩展名 */
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
	 * @param decode 是否需要解码
	 * @param selfLink 是否允许selfLink
	 */
	constructor(title: string, defaultNs: number, config: Config, decode: boolean, selfLink: boolean) {
		const subpage = title.trim().startsWith('../');
		title = decodeHtml(title);
		if (decode && title.includes('%')) {
			try {
				const encoded = /%(?!21|3[ce]|5[bd]|7[b-d])[\da-f]{2}/iu.test(title);
				title = rawurldecode(title);
				this.encoded = encoded;
			} catch {}
		}
		title = title.replace(/[_ ]+/gu, ' ').trim();
		if (subpage) {
			this.ns = 0;
		} else {
			let ns = defaultNs;
			if (title.startsWith(':')) {
				ns = 0;
				title = title.slice(1).trim();
			}
			const m = title.split(':');
			if (m.length > 1) {
				const id = config.nsid[m[0]!.trim().toLowerCase()];
				if (id) {
					ns = id;
					title = m.slice(1).join(':').trim();
				}
			}
			this.ns = ns;
		}
		const i = title.indexOf('#');
		if (i !== -1) {
			let fragment = title.slice(i + 1).trimEnd();
			if (fragment.includes('%')) {
				try {
					fragment = rawurldecode(fragment);
				} catch {}
			}
			this.fragment = fragment;
			title = title.slice(0, i).trim();
		}
		this.valid = Boolean(title || this.interwiki || selfLink && this.ns === 0 && this.fragment !== undefined)
		&& !/^:|\0\d+[eh!+-]\x7F|[<>[\]{}|\n]|%[\da-f]{2}|(?:^|\/)\.{1,2}(?:$|\/)/iu.test(
			subpage ? /^(?:\.\.\/)+(.*)/u.exec(title)![1]! : title,
		);
		this.main = title;
		Object.defineProperties(this, {
			encoded: {enumerable: false, writable: false},
		});
		this.#namespaces = config.namespaces;
	}

	/** @private */
	toString(): string {
		return `${this.title}${
			this.fragment === undefined
				? ''
				: `#${
					this.fragment
				}`
		}`;
	}
}
