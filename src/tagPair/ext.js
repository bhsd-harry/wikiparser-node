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
		const Token = require('..'),
			AttributeToken = require('../attribute');
		const lcName = name.toLowerCase(),
			attrToken = new AttributeToken(attr, 'ext-attr', config, accum),
			newConfig = JSON.parse(JSON.stringify(config)),
			ext = new Set(newConfig.ext);
		let /** @type {Token} */ innerToken;
		switch (lcName) {
			case 'indicator':
			case 'poem':
			case 'ref':
			case 'choose':
			case 'option':
			case 'tab':
			case 'tabs':
			case 'combobox':
			case 'combooption':
				ext.delete(lcName);
				newConfig.ext = [
					...ext,
					...lcName === 'choose' ? ['option'] : [],
					...lcName === 'combobox' ? ['combooption'] : [],
				];
				innerToken = new Token(inner, newConfig, true, accum);
				break;
			case 'gallery': {
				ext.delete(lcName);
				newConfig.ext = [...ext];
				const GalleryToken = require('../gallery');
				innerToken = new GalleryToken(inner, newConfig, accum);
				break;
			}
			case 'pre': {
				const PreToken = require('../pre');
				innerToken = new PreToken(inner, config, accum);
				break;
			}
			case 'references': {
				const ReferencesToken = require('../references');
				innerToken = new ReferencesToken(inner, config, accum);
				break;
			}

			/*
			 * 更多定制扩展的代码示例：
			 * ```
			 * case 'extensionName': {
			 * 	ext.delete(lcName);
			 * 	newConfig.ext = [...ext];
			 * 	const ExtensionToken = require('../extension');
			 * 	innerToken = new ExtensionToken(inner, newConfig, accum);
			 * 	break;
			 * }
			 * ```
			 */
			default: {
				const NowikiToken = require('../nowiki');
				innerToken = new NowikiToken(inner, config);
			}
		}
		innerToken.setAttribute('name', lcName).type = 'ext-inner';
		super(name, attrToken, innerToken, closed, config, accum);
	}
}

module.exports = ExtToken;
