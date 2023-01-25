'use strict';

const /** @type {Parser} */ Parser = {
	config: undefined,
	minConfig: require('./config/minimum'),

	MAX_STAGE: 11,

	getConfig() {
		return {...this.minConfig, ...this.config};
	},

	normalizeTitle(
		title, defaultNs = 0, include = false, config = Parser.getConfig(), halfParsed = false, decode = false,
	) {
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
		const titleObj = new Title(String(title), defaultNs, config, decode);
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
};

const /** @type {PropertyDescriptorMap} */ def = {},
	immutable = new Set(['MAX_STAGE', 'minConfig']),
	enumerable = new Set(['config', 'normalizeTitle', 'parse']);
for (const key in Parser) {
	if (immutable.has(key)) {
		def[key] = {enumerable: false, writable: false};
	} else if (!enumerable.has(key)) {
		def[key] = {enumerable: false};
	}
}
Object.defineProperties(Parser, def);

module.exports = Parser;
