'use strict';

const {text} = require('./util/string');

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

	config: './config/default',

	getConfig() {
		return require(this.config);
	},

	isInterwiki(title, {interwiki} = Parser.getConfig()) {
		title = String(title);
		return title.replaceAll('_', ' ').replace(/^\s*:?\s*/, '')
			.match(new RegExp(`^(${interwiki.join('|')})\\s*:`, 'i'));
	},

	normalizeTitle(title, defaultNs = 0, include = false, config = Parser.getConfig(), halfParsed = false) {
		title = String(title);
		let /** @type {Token} */ token;
		if (!halfParsed) {
			const Token = require('./src');
			token = this.run(() => new Token(title, config).parseOnce(0, include).parseOnce());
			title = token.firstChild;
		}
		const Title = require('./lib/title'),
			titleObj = new Title(title, defaultNs, config);
		if (token) {
			const build = /** @param {string[]} keys */ keys => {
				for (const key of keys) {
					if (titleObj[key].includes('\x00')) {
						titleObj[key] = text(token.buildFromStr(titleObj[key]));
					}
				}
			};
			this.run(() => {
				build(['title', 'fragment']);
			});
		}
		return titleObj;
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
};

const /** @type {PropertyDescriptorMap} */ def = {};
for (const key in Parser) {
	if (['MAX_STAGE'].includes(key)) {
		def[key] = {enumerable: false, writable: false};
	} else if (!['config', 'isInterwiki', 'normalizeTitle', 'parse'].includes(key)) {
		def[key] = {enumerable: false};
	}
}
Object.defineProperties(Parser, def);

module.exports = Parser;
