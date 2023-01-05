'use strict';

const attributeParent = require('../../mixin/attributeParent'),
	/** @type {Parser} */ Parser = require('../..'),
	TagPairToken = require('.');

/**
 * 扩展标签
 * @classdesc `{childNodes: [AttributeToken, NowikiToken|Token]}`
 */
class ExtToken extends attributeParent(TagPairToken) {
	type = 'ext';

	/**
	 * @param {string} name 标签名
	 * @param {string} attr 标签属性
	 * @param {string} inner 内部wikitext
	 * @param {string|undefined} closing 是否封闭
	 * @param {accum} accum
	 */
	constructor(name, attr = '', inner = '', closing = undefined, config = Parser.getConfig(), accum = []) {
		attr = !attr || attr.trimStart() !== attr ? attr : ` ${attr}`;
		const AttributeToken = require('../attribute');
		const lcName = name.toLowerCase(),
			attrToken = new AttributeToken(attr, 'ext-attr', lcName, config, accum),
			newConfig = structuredClone(config),
			ext = new Set(newConfig.ext);
		let /** @type {acceptable} */ acceptable, /** @type {Token} */ innerToken;
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
				acceptable = {AttributeToken: 0, Token: 1};
				innerToken = new Token(inner, newConfig, true, accum);
				break;
			}
			case 'gallery': {
				ext.delete(lcName);
				newConfig.ext = [...ext];
				const GalleryToken = require('../gallery');
				acceptable = {AttributeToken: 0, GalleryToken: 1};
				innerToken = new GalleryToken(inner, newConfig, accum);
				break;
			}

			/*
			 * 更多定制扩展的代码示例：
			 * ```
			 * case 'extensionName': {
			 * 	ext.delete(lcName);
			 * 	newConfig.ext = [...ext];
			 * 	const ExtensionToken = require('../extension');
			 * 	acceptable = {AttributeToken: 0, ExtensionToken: 1};
			 * 	innerToken = new ExtensionToken(inner, newConfig, accum);
			 * 	break;
			 * }
			 * ```
			 */
			default: {
				const NowikiToken = require('../nowiki');
				acceptable = {AttributeToken: 0, NowikiToken: 1};
				innerToken = new NowikiToken(inner, config);
			}
		}
		innerToken.type = 'ext-inner';
		innerToken.setAttribute('name', lcName);
		if (lcName === 'pre') {
			innerToken.setAttribute('stage', Parser.MAX_STAGE - 1);
		}
		super(name, attrToken, innerToken, closing, config, accum, acceptable);
		Object.defineProperty(this, 'closed', {value: true, writable: false, configurable: false});
	}

	/** @override */
	cloneNode() {
		const inner = this.lastElementChild.cloneNode(),
			tags = this.getAttribute('tags'),
			config = this.getAttribute('config'),
			attr = String(this.firstElementChild),
			token = Parser.run(() => new ExtToken(tags[0], attr, '', this.selfClosing ? undefined : tags[1], config));
		token.lastElementChild.safeReplaceWith(inner);
		return token;
	}
}

Parser.classes.ExtToken = __filename;
module.exports = ExtToken;
