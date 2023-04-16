'use strict';

const /** @type {import('.')} */ Parser = {
	config: './config/default',
	i18n: undefined,

	MAX_STAGE: 11,

	getConfig() {
		if (typeof this.config === 'string') {
			this.config = require(this.config);
			return this.getConfig();
		}
		return {...this.config, excludes: []};
	},

	msg(msg, arg) {
		if (typeof this.i18n === 'string') {
			this.i18n = require(this.i18n);
		}
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
		let token;
		if (!halfParsed) {
			const Token = require('./src');
			token = this.run(() => {
				const newToken = new Token(title, config),
					parseOnce = newToken.getAttribute('parseOnce');
				parseOnce(0, include);
				return parseOnce();
			});
			title = String(token.firstChild);
		}
		const Title = require('./lib/title');
		const titleObj = new Title(title, defaultNs, config, decode, selfLink);
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
	immutable = new Set(['MAX_STAGE']),
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
