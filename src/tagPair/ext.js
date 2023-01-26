'use strict';

const {generateForSelf} = require('../../util/lint'),
	Parser = require('../..'),
	Token = require('..'),
	TagPairToken = require('.'),
	AttributesToken = require('../attributes');

/**
 * 扩展标签
 * @classdesc `{childNodes: [AttributesToken, NowikiToken|Token]}`
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
		attr = !attr || /^\s/u.test(attr) ? attr : ` ${attr}`;
		const lcName = name.toLowerCase(),
			attrToken = new AttributesToken(attr, 'ext-attrs', lcName, config, accum),
			newConfig = JSON.parse(JSON.stringify(config)),
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
			case 'inputbox':
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
					/** @type {typeof NestedToken} */ NestedExtToken = require(`../nested/${lcName}`);
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

	/**
	 * @override
	 * @param {number} start 起始位置
	 */
	lint(start = 0) {
		const errors = super.lint(start);
		if (this.closest('html-attrs, table-attrs')) {
			errors.push(generateForSelf(this, {start}, 'HTML标签属性中的扩展标签'));
		}
		return errors;
	}

	/** @override */
	print() {
		return super.print({class: this.closest('html-attrs, table-attrs') && 'ext wpb-error'});
	}
}

module.exports = ExtToken;
