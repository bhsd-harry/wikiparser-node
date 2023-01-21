'use strict';

const Parser = require('..');

/** MediaWiki页面标题对象 */
class Title {
	valid = true;
	ns = 0;

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
		title = title.replace(/_/gu, ' ').trim();
		if (title[0] === ':') {
			namespace = '';
			title = title.slice(1).trim();
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
			fragment = title.slice(i + 1).trim();
			title = title.slice(0, i).trim();
		}
		this.valid = Boolean(title || fragment) && !/\0\d+[eh!+-]\x7F|[<>[\]{}|]/u.test(title);
	}
}

module.exports = Title;
