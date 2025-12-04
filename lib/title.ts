import {rawurldecode} from '@bhsd/common';
import {
	decodeHtml,
	trimLc,
} from '../util/string';
import type {Config} from '../base';

export interface TitleOptions {
	temporary?: boolean | undefined;
	decode?: boolean | undefined;
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
	#ns;
	readonly valid;

	/** namespace number / 命名空间 */
	get ns(): number {
		return this.#ns;
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
		// @ts-expect-error unused property
		{temporary, decode, selfLink, page}: TitleOptions = {},
	) {
		const trimmed = title.trim(),
			subpage = trimmed.startsWith('../');
		if (decode && title.includes('%')) {
			try {
				title = rawurldecode(title);
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
			title = title.slice(0, i).trim();
		}
		const [level, sub] = subpage ? resolve(title) : [0, title];
		this.valid = Boolean(
			// eslint-disable-next-line @stylistic/comma-dangle
			title
		)
		&& decodeHtml(title) === title
		&& !/^:|\0\d+[eh!+-]\x7F|[<>[\]{}|\n]|%[\da-f]{2}|(?:^|\/)\.{1,2}(?:$|\/)/iu.test(sub);
		this.main = title;
		this.#namespaces = config.namespaces;
	}

	/**
	 * 生成标题
	 * @param prefix 前缀
	 */
	#getTitle(prefix: string): [boolean, string] {
		let title = (prefix + this.main).replace(/ /gu, '_');
		if (title.startsWith('/')) {
			title = title.replace(/(.)\/$/u, '$1');
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
}
