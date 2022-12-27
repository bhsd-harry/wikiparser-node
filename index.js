'use strict';

const /** @type {Parser} */ Parser = {
	running: false,

	run(callback) {
		const {running} = this;
		this.running = true;
		try {
			const result = callback();
			this.running = running;
			return result;
		} catch (e) {
			this.running = running;
			throw e;
		}
	},

	config: require('./config/default'),

	getConfig() {
		return this.config;
	},

	isInterwiki(title, {interwiki} = Parser.getConfig()) {
		title = String(title);
		return title.replaceAll('_', ' ').replace(/^\s*:?\s*/, '')
			.match(new RegExp(`^(${interwiki.join('|')})\\s*:`, 'i'));
	},

	/* eslint-disable-next-line no-unused-vars */
	normalizeTitle(title, defaultNs = 0, config = Parser.getConfig()) {
		const Title = require('./lib/title');
		return new Title(String(title), defaultNs, config);
	},

	MAX_STAGE: 11,

	parse(wikitext, include = false, maxStage = Parser.MAX_STAGE, config = Parser.getConfig()) {
		const Token = require('./src');
		let token;
		this.run(() => {
			if (typeof wikitext === 'string') {
				token = new Token(wikitext, config);
			} else if (wikitext instanceof Token) {
				token = wikitext;
				wikitext = token.toString();
			} else {
				throw new TypeError('待解析的内容应为 String 或 Token！');
			}
			token.parse(maxStage, include);
		});
		return token;
	},

	print(wikitext, include = false, config = Parser.getConfig()) {
		const token = this.parse(wikitext, include, this.MAX_STAGE, config);
		return `<div class="wikiparser">${token.print()}</div>`;
	},
};

const /** @type {PropertyDescriptorMap} */ def = {};
for (const key in Parser) {
	if (['MAX_STAGE'].includes(key)) {
		def[key] = {enumerable: false, writable: false};
	} else if (!['config', 'isInterwiki', 'normalizeTitle', 'parse', 'print'].includes(key)) {
		def[key] = {enumerable: false};
	}
}
Object.defineProperties(Parser, def);

globalThis.Parser = Parser;
module.exports = Parser;
