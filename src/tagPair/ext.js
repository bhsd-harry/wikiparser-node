'use strict';

const /** @type {Parser} */ Parser = require('../..'),
	TagPairToken = require('.');

/**
 * 扩展标签
 * @classdesc `{childNodes: [AttributeToken, NowikiToken|Token]}`
 */
class ExtToken extends TagPairToken {
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
		let innerToken;
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
				innerToken = new Token(inner, newConfig, false, accum);
				break;
			}
			default: {
				const NowikiToken = require('../nowiki');
				innerToken = new NowikiToken(inner, config);
			}
		}
		innerToken.type = 'ext-inner';
		if (lcName === 'pre') {
			innerToken.setAttribute('stage', Parser.MAX_STAGE - 1);
		}
		super(name, attrToken, innerToken, closing, config, accum);
		Object.defineProperty(this, 'closed', {value: true, enumerable: false, writable: false, configurable: false});
	}
}

module.exports = ExtToken;
