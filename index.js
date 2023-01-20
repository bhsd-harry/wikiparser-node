'use strict';

const /** @type {Parser} */ Parser = {
	config: undefined,
	minConfig: require('./config/minimum'),

	MAX_STAGE: 11,

	getConfig() {
		return {...this.minConfig, ...this.config};
	},

	normalizeTitle(title, defaultNs = 0, include = false, config = Parser.getConfig(), halfParsed = false) {
		let /** @type {Token} */ token;
		if (!halfParsed) {
			const Token = require('./src');
			token = this.run(() => {
				const newToken = new Token(String(title), config),
					parseOnce = newToken.getAttribute('parseOnce');
				parseOnce(0, include);
				return parseOnce();
			});
			title = token.firstChild;
		}
		const Title = require('./lib/title');
		const titleObj = new Title(String(title), defaultNs, config);
		return titleObj;
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

	run(callback) {
		return callback();
	},

	lint(wikitext, include = false, config = Parser.getConfig()) {
		const token = this.parse(wikitext, include, this.MAX_STAGE, config);
		return token.lint();
	},
};

const /** @type {PropertyDescriptorMap} */ def = {};
for (const key in Parser) {
	if (['MAX_STAGE', 'minConfig'].includes(key)) {
		def[key] = {enumerable: false, writable: false};
	} else if (!['config', 'normalizeTitle', 'parse', 'lint'].includes(key)) {
		def[key] = {enumerable: false};
	}
}
Object.defineProperties(Parser, def);

if (typeof window === 'object') {
	window.Parser = Parser;
}
module.exports = Parser;
