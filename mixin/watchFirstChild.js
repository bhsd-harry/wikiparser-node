'use strict';

const /** @type {Parser} */ Parser = require('..'),
	Token = require('../src/token');

/**
 * @template T
 * @param {T} constructor
 * @returns {T}
 */
const watchFirstChild = constructor => class extends constructor {
	constructor(...args) {
		super(...args);
		if (this instanceof Token) {
			const that = this,
				/** @type {AstListener} */ watchFirstChildListener = ({prevTarget}) => {
					if (prevTarget === that.firstChild) {
						that.setAttribute('name', prevTarget.text().trim());
					}
				};
			this.addEventListener('remove', watchFirstChildListener);
			this.addEventListener('insert', watchFirstChildListener);
			this.addEventListener('replace', watchFirstChildListener);
		}
	}
};

Parser.mixins.watchFirstChild = __filename;
module.exports = watchFirstChild;
