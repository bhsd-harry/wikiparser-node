'use strict';

const /** @type {Parser} */ Parser = {
	running: false,

	config: require('./config/default'),

	MAX_STAGE: 11,

	getConfig() {
		return this.config;
	},

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

	normalizeTitle(title, defaultNs = 0, config = Parser.getConfig(), halfParsed = false) {
		let /** @type {Token} */ token;
		if (!halfParsed) {
			const Token = require('./src');
			token = this.run(() => {
				const newToken = new Token(String(title), config),
					parseOnce = newToken.getAttribute('parseOnce');
				parseOnce();
				return parseOnce();
			});
			title = token.firstChild;
		}
		const Title = require('./lib/title');
		return new Title(String(title), defaultNs, config);
	},

	parse(wikitext, include, maxStage = Parser.MAX_STAGE, config = Parser.getConfig()) {
		const Token = require('./src');
		let /** @type {Token} */ token;
		this.run(() => {
			if (typeof wikitext === 'string') {
				token = new Token(wikitext, config);
			} else if (wikitext instanceof Token) {
				token = wikitext;
				wikitext = String(token);
			}
			token.parse(maxStage, include);
		});
		return token;
	},

	print(wikitext, include = false, config = Parser.getConfig()) {
		const token = this.parse(wikitext, include, this.MAX_STAGE, config);
		return `<div class="wikiparser">${token.print()} </div>`;
	},
};

const /** @type {PropertyDescriptorMap} */ def = {};
for (const key in Parser) {
	if (['MAX_STAGE'].includes(key)) {
		def[key] = {enumerable: false, writable: false};
	} else if (!['config', 'normalizeTitle', 'parse', 'print'].includes(key)) {
		def[key] = {enumerable: false};
	}
}
Object.defineProperties(Parser, def);

globalThis.Parser = Parser;
module.exports = Parser;
