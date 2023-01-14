'use strict';

const attributeParent = require('../../mixin/attributeParent'),
	Parser = require('../..'),
	TagPairToken = require('.');

/**
 * 扩展标签
 * @classdesc `{childNodes: [AttributeToken, NowikiToken|Token]}`
 */
class ExtToken extends attributeParent(TagPairToken) {
	type = 'ext';

	/** @override */
	get closed() {
		return super.closed;
	}

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
			attrToken = new AttributeToken(attr, 'ext-attr', lcName, config, accum),
			newConfig = structuredClone(config),
			ext = new Set(newConfig.ext);
		let /** @type {Token} */ innerToken;
		ext.delete(lcName);
		newConfig.ext = [...ext];
		switch (lcName) {
			case 'indicator':
			case 'poem':
			case 'ref':
			case 'option':
			case 'combooption':
			case 'tab':
			case 'tabs':
				innerToken = new Token(inner, newConfig, true, accum);
				break;
			case 'gallery': {
				const GalleryToken = require('../gallery');
				innerToken = new GalleryToken(inner, newConfig, accum);
				break;
			}
			case 'pre': {
				const PreToken = require('../pre');
				innerToken = new PreToken(inner, newConfig, accum);
				break;
			}
			case 'references': {
				const ReferencesToken = require('../nested/references');
				innerToken = new ReferencesToken(inner, newConfig, accum);
				break;
			}
			case 'choose': {
				const ChooseToken = require('../nested/choose');
				innerToken = new ChooseToken(inner, newConfig, accum);
				break;
			}
			case 'combobox': {
				const ComboboxToken = require('../nested/combobox');
				innerToken = new ComboboxToken(inner, newConfig, accum);
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

	/** @override */
	cloneNode() {
		const inner = this.lastChild.cloneNode(),
			tags = this.getAttribute('tags'),
			config = this.getAttribute('config'),
			attr = String(this.firstChild),
			token = Parser.run(() => new ExtToken(tags[0], attr, '', this.selfClosing ? undefined : tags[1], config));
		token.lastChild.safeReplaceWith(inner);
		return token;
	}
}

Parser.classes.ExtToken = __filename;
module.exports = ExtToken;
