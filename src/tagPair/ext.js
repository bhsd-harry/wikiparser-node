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
			/** @type {ParserConfig} */ newConfig = {...config, excludes: [...config.excludes]},
			ext = new Set(newConfig.ext);
		let /** @type {Token} */ innerToken;
		ext.delete(lcName);
		newConfig.ext = [...ext];
		newConfig.inExt = true;
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
				if (lcName === 'poem') {
					newConfig.excludes.push('heading');
				}
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
				newConfig.excludes.push('heading');
				const InputboxToken = require('../paramTag/inputbox');
				innerToken = new InputboxToken(inner, newConfig, accum);
				break;
			}
			// 更多定制扩展的代码示例：
			// ```
			// case 'extensionName': {
			// 	const ExtensionToken = require('../extension');
			// 	innerToken = new ExtensionToken(inner, newConfig, accum);
			// 	break;
			// }
			// ```
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
	lint(start) {
		const errors = super.lint(start);
		if (this.name !== 'nowiki' && this.closest('html-attrs, table-attrs')) {
			const root = this.getRootNode(),
				rect = {start, ...root.posFromIndex(start)};
			errors.push(generateForSelf(this, rect, 'extension tag in HTML tag attributes'));
		}
		return errors;
	}
}

module.exports = ExtToken;
