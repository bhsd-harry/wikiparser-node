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

	clearCache() {
		const entries = [...Object.entries(this.classes), ...Object.entries(this.mixins)];
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
		const Token = require('./src/token'),
			result = new Token().isInterwiki(title);
		this.running = false;
		return result;
	},
	normalizeTitle(title, defaultNs = 0) {
		this.running = true;
		const Token = require('./src/token'),
			result = new Token().normalizeTitle(title, defaultNs);
		this.running = false;
		return result;
	},

	MAX_STAGE: 11,

	parse(wikitext, include = false, maxStage = this.MAX_STAGE, config = Parser.getConfig()) {
		this.running = true;
		const Token = require('./src/token');
		if (typeof wikitext === 'string') {
			wikitext = new Token(wikitext, config);
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
const hidden = {enumerable: false};
Object.defineProperties(Parser, {
	warning: hidden, debugging: hidden, running: hidden,
	warn: hidden, debug: hidden, error: hidden, info: hidden,
	classes: hidden, mixins: hidden, aliases: {...hidden, writable: false}, MAX_STAGE: {...hidden, writable: false},
	clearCache: hidden, getConfig: hidden,
});

module.exports = Parser;
