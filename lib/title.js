'use strict';

const Parser = require('..');

/** MediaWiki页面标题对象 */
class Title {
	title = '';
	main = '';
	prefix = '';
	ns = 0;
	interwiki = '';
	fragment = '';
	valid = true;

	/**
	 * @param {string} title 标题（含或不含命名空间前缀）
	 * @param {number} defaultNs 命名空间
	 */
	constructor(title, defaultNs = 0, config = Parser.getConfig()) {
		const {namespaces, nsid} = config;
		let namespace = namespaces[defaultNs];
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
		if (i !== -1) {
			const fragment = title.slice(i + 1).trimEnd();
			if (fragment.includes('%')) {
				try {
					this.fragment = decodeURIComponent(fragment);
				} catch {}
			} else if (fragment.includes('.')) {
				try {
					this.fragment = decodeURIComponent(fragment.replaceAll('.', '%'));
				} catch {}
			}
			this.fragment ||= fragment;
			title = title.slice(0, i).trim();
		}
		this.main = title && `${title[0].toUpperCase()}${title.slice(1)}`;
		this.prefix = `${namespace}${namespace && ':'}`;
		this.title = `${iw ? `${this.interwiki}:` : ''}${this.prefix}${this.main}`;
		this.valid = Boolean(this.main || this.fragment) && !/\0\d+[eh!+-]\x7F|[<>[\]{}|]/u.test(this.title);
	}

	/** @override */
	toString() {
		return `${this.title}${this.fragment && '#'}${this.fragment}`;
	}
}

Parser.classes.Title = __filename;
module.exports = Title;
