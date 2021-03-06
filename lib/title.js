'use strict';

const {ucfirst} = require('../util/string'),
	/** @type {Parser} */ Parser = require('..');

class Title {
	title = '';
	ns = 0;
	interwiki = '';
	fragment = '';
	valid = true;

	/** @param {string} title */
	constructor(title, defaultNs = 0, config = Parser.getConfig()) {
		const {namespaces, nsid} = config;
		let namespace = namespaces[defaultNs];
		title = title.replaceAll('_', ' ').trim();
		if (title[0] === ':') {
			namespace = '';
			title = title.slice(1).trim();
		}
		const iw = Parser.isInterwiki(title, config);
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
		this.title = `${iw ? `${this.interwiki}:` : ''}${namespace}${namespace && ':'}${ucfirst(title)}`;
		this.valid = !/\x00\d+[eh!+-]\x7f|[<>[\]{}|]/.test(this.title);
	}
}

Parser.classes.Title = __filename;
module.exports = Title;
