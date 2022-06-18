'use strict';

const fs = require('fs');

const /** @type {Parser} */ Parser = {
	warning: true,
	debugging: false,
	running: false,

	warn(msg, ...args) {
		if (this.warning) {
			console.warn('\x1b[33m%s\x1b[0m', msg, ...args);
		}
	},
	debug(msg, ...args) {
		if (this.debugging) {
			console.debug('\x1b[34m%s\x1b[0m', msg, ...args);
		}
	},
	error(msg, ...args) {
		console.error('\x1b[31m%s\x1b[0m', msg, ...args);
	},
	info(msg, ...args) {
		console.info('\x1b[32m%s\x1b[0m', msg, ...args);
	},

	classes: {},
	mixins: {},
	parsers: {},

	clearCache() {
		const entries = [
			...Object.entries(this.classes),
			...Object.entries(this.mixins),
			...Object.entries(this.parsers),
		];
		for (const [, path] of entries) {
			delete require.cache[require.resolve(path)];
		}
		for (const [name, path] of entries) {
			if (name in global) {
				global[name] = require(path);
			}
		}
	},

	aliases: [
		['String'],
		['CommentToken', 'ExtToken', 'IncludeToken', 'NoincludeToken'],
		['ArgToken', 'TranscludeToken', 'HeadingToken'],
		['HtmlToken'],
		['TableToken'],
		['HrToken', 'DoubleUnderscoreToken'],
		['LinkToken', 'FileToken', 'CategoryToken'],
		['QuoteToken'],
		['ExtLinkToken'],
		['MagicLinkToken'],
		['ListToken'],
		['ConversionToken'],
	],

	config: './config/default',

	getConfig() {
		return require(this.config);
	},

	isInterwiki(title) {
		this.running = true;
		const Token = require('./src'),
			result = new Token().isInterwiki(title);
		this.running = false;
		return result;
	},
	normalizeTitle(title, defaultNs = 0) {
		this.running = true;
		const Token = require('./src'),
			result = new Token().normalizeTitle(title, defaultNs);
		this.running = false;
		return result;
	},

	MAX_STAGE: 11,

	parse(wikitext, include = false, maxStage = this.MAX_STAGE, config = Parser.getConfig()) {
		this.running = true;
		const Token = require('./src');
		if (typeof wikitext === 'string') {
			wikitext = new Token(wikitext, config);
		} else if (!(wikitext instanceof Token)) {
			throw new TypeError('待解析的内容应为 String 或 Token！');
		}
		try {
			wikitext.parse(maxStage, include);
		} catch (e) {
			if (e instanceof Error) {
				fs.writeFileSync(
					`${__dirname}/errors/${new Date().toISOString()}`,
					`${e.stack}\n\n\n${wikitext.toString()}`,
				);
			}
			this.running = false;
			throw e;
		}
		this.running = false;
		return wikitext;
	},

	getTool() {
		delete require.cache[require.resolve('./tool')];
		return require('./tool');
	},
};

const /** @type {PropertyDescriptorMap} */ def = {};
for (const key in Parser) {
	if (['alises', 'MAX_STAGE'].includes(key)) {
		def[key] = {enumerable: false, writable: false};
	} else if (!['config', 'isInterwiki', 'normalizeTitle', 'parse', 'getTool'].includes(key)) {
		def[key] = {enumerable: false};
	}
}
Object.defineProperties(Parser, def);

module.exports = Parser;
