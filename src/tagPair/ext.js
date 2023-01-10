'use strict';

const Parser = require('../..'),
	TagPairToken = require('.');

/**
 * 扩展标签
 * @classdesc `{childNodes: [AttributeToken, NowikiToken|Token]}`
 */
class ExtToken extends TagPairToken {
	type = 'ext';
	closed = true;

	/**
	 * @param {string} name 标签名
	 * @param {string} attr 标签属性
	 * @param {string} inner 内部wikitext
	 * @param {string|undefined} closed 是否封闭
	 * @param {accum} accum
	 */
	constructor(name, attr = '', inner = '', closed = undefined, config = Parser.getConfig(), accum = []) {
		attr = !attr || attr.trimStart() !== attr ? attr : ` ${attr}`;
		const AttributeToken = require('../attribute');
		const lcName = name.toLowerCase(),
			attrToken = new AttributeToken(attr, 'ext-attr', config, accum),
			newConfig = JSON.parse(JSON.stringify(config)),
			ext = new Set(newConfig.ext);
		let /** @type {Token} */ innerToken;
		switch (lcName) {
			case 'choose':
			case 'option':
			case 'ref':
			case 'poem':
			case 'indicator':
			case 'tab':
			case 'tabs':
			case 'pre':
			case 'combobox':
			case 'combooption': {
				ext.delete(lcName);
				newConfig.ext = [
					...ext,
					...lcName === 'choose' ? ['option'] : [],
					...lcName === 'combobox' ? ['combooption'] : [],
				];
				const Token = require('..');
				innerToken = new Token(inner, newConfig, true, accum);
				break;
			}
			case 'gallery': {
				ext.delete(lcName);
				newConfig.ext = [...ext];
				const GalleryToken = require('../gallery');
				innerToken = new GalleryToken(inner, newConfig, accum);
				break;
			}
			default: {
				const NowikiToken = require('../nowiki');
				innerToken = new NowikiToken(inner, config);
			}
		}
		innerToken.setAttribute('name', lcName).type = 'ext-inner';
		if (lcName === 'pre') {
			innerToken.setAttribute('stage', Parser.MAX_STAGE - 1);
		}
		super(name, attrToken, innerToken, closed, config, accum);
	}
}

module.exports = ExtToken;
