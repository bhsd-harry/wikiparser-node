'use strict';

const path = require('path'),
	attributeParent = require('../../mixin/attributeParent'),
	Parser = require('../..'),
	TagPairToken = require('.'),
	Token = require('..'),
	AttributeToken = require('../attribute');

/**
 * 扩展标签
 * @classdesc `{childNodes: [AttributeToken, NowikiToken|Token]}`
 */
class ExtToken extends attributeParent(TagPairToken) {
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
		const lcName = name.toLowerCase(),
			attrToken = new AttributeToken(attr, 'ext-attr', lcName, config, accum),
			newConfig = structuredClone(config),
			ext = new Set(newConfig.ext);
		let /** @type {Token} */ innerToken;
		ext.delete(lcName);
		newConfig.ext = [...ext];
		switch (lcName) {
			case 'tab':
				ext.delete('tabs');
				newConfig.ext = [...ext];
				// fall through
			case 'indicator':
			case 'poem':
			case 'ref':
			case 'option':
			case 'combooption':
			case 'tabs':
			case 'poll':
			case 'seo':
				innerToken = new Token(inner, newConfig, true, accum);
				break;
			case 'gallery': {
				const GalleryToken = require('../gallery');
				innerToken = new GalleryToken(inner, newConfig, accum);
				break;
			}
			case 'pre': {
				const PreToken = require('../hasNowiki/pre');
				innerToken = new PreToken(inner, newConfig, accum);
				break;
			}
			case 'charinsert': {
				const CharinsertToken = require('../charinsert');
				innerToken = new CharinsertToken(inner, newConfig, accum);
				break;
			}
			case 'references':
			case 'choose':
			case 'combobox': {
				const NestedToken = require('../nested'),
					/** @type {typeof NestedToken} */ NestedExtToken = require(path.join('..', 'nested', lcName));
				innerToken = new NestedExtToken(inner, newConfig, accum);
				break;
			}
			case 'imagemap': {
				const ImagemapToken = require('../imagemap');
				innerToken = new ImagemapToken(inner, config, accum);
				break;
			}
			case 'dynamicpagelist': {
				const ParamTagToken = require('../paramTag');
				innerToken = new ParamTagToken(inner, newConfig, accum);
				break;
			}
			case 'inputbox': {
				const InputboxToken = require('../paramTag/inputbox');
				innerToken = new InputboxToken(inner, newConfig, accum);
				break;
			}

			/*
			 * 更多定制扩展的代码示例：
			 * ```
			 * case 'extensionName': {
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
			attr = String(this.firstChild);
		return Parser.run(() => {
			const token = new ExtToken(tags[0], attr, '', this.selfClosing ? undefined : tags[1], config);
			token.lastChild.safeReplaceWith(inner);
			return token;
		});
	}
}

Parser.classes.ExtToken = __filename;
module.exports = ExtToken;
