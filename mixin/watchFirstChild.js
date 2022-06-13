'use strict';

const /** @type {Parser} */ Parser = require('..'),
	Token = require('../src/token'); // eslint-disable-line no-unused-vars

/**
 * @template T
 * @param {T} constructor
 * @returns {T}
 */
const watchFirstChild = constructor => class extends constructor {
	/** @this {Token} */
	constructor(...args) {
		super(...args);
		const that = this,
			/** @type {AstListener} */ watchFirstChildListener = ({prevTarget}) => {
				if (prevTarget === that.firstChild) {
					const name = prevTarget.text().trim();
					let standardname;
					if (that.type === 'template') {
						standardname = that.normalizeTitle(name, 10);
					} else if (that.type === 'magic-word') {
						standardname = name.toLowerCase().replace(/^#/, '');
					} else {
						standardname = name;
					}
					that.setAttribute('name', standardname);
				}
			};
		this.addEventListener(['remove', 'insert', 'replace', 'text'], watchFirstChildListener);
	}
};

Parser.mixins.watchFirstChild = __filename;
module.exports = watchFirstChild;
