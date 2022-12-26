'use strict';

const /** @type {Parser} */ Parser = require('..');

class Title {
	ns = 0;
	interwiki = '';
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
		let fragment;
		if (i !== -1) {
			fragment = title.slice(i + 1).trimEnd();
			title = title.slice(0, i).trim();
		}
		this.valid = Boolean(title || fragment) && !/\x00\d+[eh!+-]\x7f|[<>[\]{}|]/.test(title);
	}
}

module.exports = Title;
