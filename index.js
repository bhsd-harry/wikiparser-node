'use strict';

const fs = require('fs');

const /** @type {Parser} */ Parser = {
	warning: true,
	debugging: false,

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

	classes: {},
	mixins: {},
	defaultPaths: {
		Token: './src/token',
		ExtToken: '../src/tagPairToken/extToken',
		CommentToken: './src/nowikiToken/commentToken',
		HeadingToken: '../src/headingToken',
		ArgToken: '../src/argToken',
		TranscludeToken: './src/transcludeToken',
		HtmlToken: './src/htmlToken',
	},

	aliases: [
		['String'],
		['CommentToken', 'ExtToken', 'IncludeToken', 'NoincludeToken'],
		['ArgToken', 'TranscludeToken', 'HeadingToken'],
		['HtmlToken'],
		['TableToken', 'TdToken'],
	],

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

	config: './config/default',

	getConfig() {
		return require(this.config);
	},

	normalizeTitle(title, defaultNs = 0) {
		const Token = require('./src/token');
		return new Token().normalizeTitle(title, defaultNs);
	},

	MAX_STAGE: 11,

	parse(wikitext, include = false, maxStage = this.MAX_STAGE, config = Parser.getConfig()) {
		const Token = require('./src/token');
		if (typeof wikitext === 'string') {
			wikitext = new Token(wikitext, config);
		}
		try {
			return wikitext.parse(maxStage, include);
		} catch (e) {
			fs.writeFileSync(`${__dirname}/errors/${new Date().toISOString()}`, wikitext.toString());
			throw e;
		}
	},

	create(className, ...args) {
		let /** @type {ObjectConstructor} */ Token;
		if (className in this.classes) {
			Token = require(this.classes[className]);
		} else if (className in this.defaultPaths) {
			Token = require(this.defaultPaths[className]);
		}
		return new Token(...args);
	},

	getTool() {
		delete require.cache[require.resolve('./tool')];
		return require('./tool');
	},
};
const hidden = {enumerable: false};
Object.defineProperties(Parser, {
	warning: hidden, debugging: hidden, warn: hidden, debug: hidden, error: hidden,
	classes: hidden, mixins: hidden, defaultPaths: hidden, aliases: hidden, clearCache: hidden, getConfig: hidden,
	MAX_STAGE: {...hidden, writable: false}, create: hidden,
});

module.exports = Parser;
