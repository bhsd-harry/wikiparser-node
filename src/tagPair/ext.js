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
	 * @param {string} name
	 * @param {string|undefined} closing
	 * @param {accum} accum
	 */
	constructor(name, attr = '', inner = '', closing = undefined, config = Parser.getConfig(), accum = []) {
		attr = !attr || /^\s/.test(attr) ? attr : ` ${attr}`;
		const lcName = name.toLowerCase(),
			AttributeToken = require('../attribute'),
			attrToken = new AttributeToken(attr, 'ext-attr', lcName, config, accum),
			newConfig = structuredClone(config),
			ext = new Set(newConfig.ext);
		let /** @type {acceptable} */ acceptable, innerToken;
		switch (lcName) {
			case 'choose':
				ext.add('option');
				// fall through
			case 'ref':
			case 'option':
			case 'poem':
			case 'indicator':
			case 'tab':
			case 'tabs':
			case 'pre': {
				ext.delete(lcName);
				newConfig.ext = [...ext];
				const Token = require('..');
				acceptable = {AttributeToken: 0, Token: 1};
				innerToken = new Token(inner, newConfig, false, accum);
				break;
			}
			/*
			 * 更多定制扩展的代码示例：
			 * ```
			 * case 'extensionName': {
			 * 	ext.delete(this.name);
			 * 	newConfig.ext = [...ext];
			 * 	const ExtensionToken = require('../extension');
			 * 	acceptable = {AttributeToken: 0, ExtensionToken: 1};
			 * 	innerToken = new ExtensionToken(extInner, newConfig, false, accum);
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
		Object.defineProperty(this, 'closed', {value: true, enumerable: false, writable: false, configurable: false});
	}

	cloneNode() {
		const inner = this.lastElementChild.cloneNode(),
			tags = this.getAttribute('tags'),
			config = this.getAttribute('config'),
			attr = this.firstElementChild.toString(),
			token = Parser.run(() => new ExtToken(tags[0], attr, '', this.selfClosing ? undefined : tags[1], config));
		token.lastElementChild.safeReplaceWith(inner);
		return token;
	}

	get innerText() {
		return this.selfClosing ? '' : this.lastElementChild.text();
	}
}

Parser.classes.ExtToken = __filename;
module.exports = ExtToken;
