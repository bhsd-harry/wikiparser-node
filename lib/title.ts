import {decodeHtml} from '../util/string';
import * as Parser from '../index';

/** MediaWiki页面标题对象 */
export class Title {
	valid;
	ns;
	fragment;
	encoded = false;

	/**
	 * @param title 标题（含或不含命名空间前缀）
	 * @param defaultNs 命名空间
	 * @param decode 是否需要解码
	 * @param selfLink 是否允许selfLink
	 */
	constructor(title: string, defaultNs = 0, config = Parser.getConfig(), decode = false, selfLink = false) {
		const {namespaces, nsid} = config;
		let namespace = namespaces[defaultNs] ?? '';
		title = decodeHtml(title);
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
			title = title.slice(0, i).trim();
		}
		this.valid = Boolean(title || selfLink && fragment !== undefined)
			&& !/\0\d+[eh!+-]\x7F|[<>[\]{}|]|%[\da-f]{2}/iu.test(title);
		this.fragment = fragment;
	}
}
