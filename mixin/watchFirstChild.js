'use strict';

const {externalUse} = require('../util/debug'),
	/** @type {Parser} */ Parser = require('..'),
	Token = require('../src/token'); // eslint-disable-line no-unused-vars

const ucfirst = /** @param {string} str */ str => `${str[0].toUpperCase()}${str.slice(1)}`;

/**
 * @template T
 * @param {T} constructor
 * @returns {T}
 */
const watchFirstChild = constructor => class extends constructor {
	/** @this {Token & {firstChild: Token}} */
	constructor(...args) {
		super(...args);
		const that = this,
			/** @type {AstListener} */ watchFirstChildListener = ({prevTarget}) => {
				if (prevTarget === that.firstChild) {
					const name = prevTarget.text().trim();
					let standardname;
					if (that.type === 'template') {
						standardname = that.normalizeTitle(name, 10);
					} else if (['link', 'file', 'category'].includes(that.type)) {
						standardname = that.normalizeTitle(name);
						if ((that.type === 'file' && !standardname.startsWith('File:')
							|| that.type === 'category' && !standardname.startsWith('Category:'))
							&& externalUse('build')
						) {
							Parser.error(`${that.type === 'file' ? '文件' : '分类'}链接不可更改名字空间！`, name);
							const prefix = `${ucfirst(that.type)}:`;
							that.firstChild.prepend(prefix);
							standardname = `${prefix}${standardname}`;
						}
						if (that.type === 'link') {
							if (standardname) {
								delete that.selfLink;
							} else {
								that.selfLink = true;
							}
							if (name.includes('#')) {
								const fragment = name.split('#').slice(1).join('#').trimEnd().replaceAll(' ', '_');
								that.fragment = fragment.includes('%') ? decodeURIComponent(fragment) : fragment;
							} else {
								delete that.fragment;
							}
						}
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
