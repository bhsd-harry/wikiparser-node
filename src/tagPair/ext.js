'use strict';
const lint_1 = require('../../util/lint');
const {generateForSelf} = lint_1;
const base_1 = require('../../util/base');
const {del} = base_1;
const attributesParent = require('../../mixin/attributesParent');
const Parser = require('../../index');
const Token = require('..');
const TagPairToken = require('.');
const AttributesToken = require('../attributes');

/**
 * 扩展标签
 * @classdesc `{childNodes: [AttributesToken, Token]}`
 */
class ExtToken extends attributesParent(TagPairToken) {
	type = 'ext';
	/** @override */
	get closed() {
		return true;
	}

	/**
	 * @browser
	 * @param name 标签名
	 * @param attr 标签属性
	 * @param inner 内部wikitext
	 * @param closed 是否封闭
	 */
	constructor(name, attr = '', inner = '', closed = undefined, config = Parser.getConfig(), accum = []) {
		const lcName = name.toLowerCase(),
			attrToken = new AttributesToken(!attr || attr.trimStart() !== attr ? attr : ` ${attr}`, 'ext-attrs', lcName, config, accum),
			newConfig = {...config, ext: del(config.ext, lcName), excludes: [...config.excludes ?? []]};
		let innerToken;
		switch (lcName) {
			case 'tab':
				newConfig.ext = del(newConfig.ext, 'tabs');
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
			case 'pre': {
				const PreToken = require('../pre');
				innerToken = new PreToken(inner, newConfig, accum);
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
			case 'references': {
				const NestedToken = require('../nested');
				innerToken = new NestedToken(inner, /<!--.*?(?:-->|$)|<(ref)(\s[^>]*)?>(.*?)<\/(ref\s*)>/gisu, ['ref'], newConfig, accum);
				break;
			}
			case 'choose': {
				const NestedToken = require('../nested');
				innerToken = new NestedToken(inner, /<(option|choicetemplate)(\s[^>]*)?>(.*?)<\/(\1)>/gsu, ['option', 'choicetemplate'], newConfig, accum);
				break;
			}
			case 'combobox': {
				const NestedToken = require('../nested');
				innerToken = new NestedToken(inner, /<(combooption)(\s[^>]*)?>(.*?)<\/(combooption\s*)>/gisu, ['combooption'], newConfig, accum);
				break;
			}
			case 'gallery': {
				const GalleryToken = require('../gallery');
				innerToken = new GalleryToken(inner, newConfig, accum);
				break;
			}
			case 'imagemap': {
				const ImagemapToken = require('../imagemap');
				innerToken = new ImagemapToken(inner, newConfig, accum);
				break;
			}
			// 更多定制扩展的代码示例：
			// ```
			// case 'extensionName': {
			//	const ExtensionToken: typeof import('../extension') = require('../extension');
			//	innerToken = new ExtensionToken(inner, newConfig, accum);
			//	break;
			// }
			// ```
			default: {
				const NowikiToken = require('../nowiki');
				innerToken = new NowikiToken(inner, newConfig);
			}
		}
		innerToken.setAttribute('name', lcName).type = 'ext-inner';
		super(name, attrToken, innerToken, closed, config, accum);
	}

	/**
	 * @override
	 * @browser
	 */
	lint(start = this.getAbsoluteIndex()) {
		const errors = super.lint(start);
		if (this.name !== 'nowiki' && this.closest('html-attrs, table-attrs')) {
			const root = this.getRootNode(),
				excerpt = String(root).slice(Math.max(0, start - 25), start + 25),
				rect = {start, ...root.posFromIndex(start)};
			errors.push({...generateForSelf(this, rect, 'extension tag in HTML tag attributes'), excerpt});
		}
		return errors;
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
