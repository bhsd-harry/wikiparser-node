'use strict';

const /** @type {Parser} */ Parser = {
	config: undefined,
	minConfig: require('./config/minimum'),
	i18n: undefined,

	MAX_STAGE: 11,

	getConfig() {
		return {...this.minConfig, ...this.config, excludes: []};
	},

	msg(msg, arg) {
		msg = this.i18n?.[msg] ?? msg;
		return msg.replace('$1', arg);
	},

	normalizeTitle(
		title,
		defaultNs = 0,
		include = false,
		config = Parser.getConfig(),
		halfParsed = false,
		decode = false,
		selfLink = false,
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
		const titleObj = new Title(String(title), defaultNs, config, decode, selfLink);
		return titleObj;
	},

	parse(wikitext, include, maxStage = Parser.MAX_STAGE, config = Parser.getConfig()) {
		if (typeof wikitext !== 'string') {
			throw new TypeError('待解析的内容应为 String！');
		}
		const Token = require('./src');
		let /** @type {Token} */ token;
		this.run(() => {
			token = new Token(wikitext, config);
			try {
				token.parse(maxStage, include);
			} catch {}
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

if (typeof self === 'object') {
	self.Parser = Parser;
}
module.exports = Parser;
