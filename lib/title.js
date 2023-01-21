'use strict';

const Parser = require('..');

/** MediaWiki页面标题对象 */
class Title {
	valid = true;
	ns = 0;
	title = '';
	main = '';
	prefix = '';
	interwiki = '';
	fragment = '';

	/**
	 * @param {string} title 标题（含或不含命名空间前缀）
	 * @param {number} defaultNs 命名空间
	 * @param {boolean} decode 是否需要解码
	 */
	constructor(title, defaultNs = 0, config = Parser.getConfig(), decode = false) {
		const {namespaces, nsid} = config;
		let namespace = namespaces[defaultNs];
		if (decode && title.includes('%')) {
			try {
				title = decodeURIComponent(title);
			} catch {}
		}
		title = title.replaceAll('_', ' ').trim();
		if (title[0] === ':') {
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
			const id = namespaces[nsid[m[0].trim().toLowerCase()]];
			if (id !== undefined) {
				namespace = id;
				title = m.slice(1).join(':').trim();
			}
		}
		this.ns = nsid[namespace.toLowerCase()];
		const i = title.indexOf('#');
		let fragment = '';
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
		this.valid = Boolean(title || fragment) && !/\0\d+[eh!+-]\x7F|[<>[\]{}|]/u.test(title);
		this.main = title && `${title[0].toUpperCase()}${title.slice(1)}`;
		this.prefix = `${namespace}${namespace && ':'}`;
		this.title = `${iw ? `${this.interwiki}:` : ''}${this.prefix}${this.main.replaceAll(' ', '_')}`;
		this.fragment = fragment;
	}

	/** @override */
	toString() {
		return `${this.title}${this.fragment && '#'}${this.fragment}`;
	}
}

Parser.classes.Title = __filename;
module.exports = Title;
