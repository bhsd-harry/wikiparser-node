'use strict';

const {decodeHtml} = require('../util/string'),
	Parser = require('..');

/** MediaWiki页面标题对象 */
class Title {
	valid = true;
	ns = 0;
	fragment;
	encoded = false;
	title = '';
	main = '';
	prefix = '';
	interwiki = '';

	/**
	 * @param {string} title 标题（含或不含命名空间前缀）
	 * @param {number} defaultNs 命名空间
	 * @param {boolean} decode 是否需要解码
	 * @param {boolean} selfLink 是否允许selfLink
	 */
	constructor(title, defaultNs = 0, config = Parser.getConfig(), decode = false, selfLink = false) {
		const {namespaces, nsid} = config;
		let namespace = namespaces[defaultNs];
		title = decodeHtml(title);
		if (decode && title.includes('%')) {
			try {
				const encoded = /%(?!21|3[ce]|5[bd]|7[b-d])[\da-f]{2}/iu.test(title);
				title = decodeURIComponent(title);
				this.encoded = encoded;
			} catch {}
		}
		title = title.replaceAll('_', ' ').trim();
		if (title[0] === ':') {
			namespace = '';
			title = title.slice(1).trim();
		}
		const iw = defaultNs ? undefined : Parser.isInterwiki(title, config);
		if (iw) {
			this.interwiki = iw[1].toLowerCase();
			title = title.slice(iw[0].length);
		}
		const m = title.split(':');
		if (m.length > 1) {
			const id = namespaces[nsid[m[0].trim().toLowerCase()]];
			if (id !== undefined) {
				namespace = id;
				title = m.slice(1).join(':').trim();
			}
		}
		this.ns = nsid[namespace.toLowerCase()];
		const i = title.indexOf('#');
		let fragment;
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
		this.main = title && `${title[0].toUpperCase()}${title.slice(1)}`;
		this.prefix = `${namespace}${namespace && ':'}`;
		this.title = `${iw ? `${this.interwiki}:` : ''}${this.prefix}${this.main.replaceAll(' ', '_')}`;
	}

	/** @override */
	toString() {
		return `${this.title}${this.fragment === undefined ? '' : `#${this.fragment}`}`;
	}
}

Parser.classes.Title = __filename;
module.exports = Title;
