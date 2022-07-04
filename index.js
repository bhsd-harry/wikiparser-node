'use strict';

const fs = require('fs'),
	{text} = require('./util/string');

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
	info(msg, ...args) {
		console.info('\x1b[32m%s\x1b[0m', msg, ...args);
	},

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

	log(f) {
		if (typeof f === 'function') {
			console.log(f.toString());
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
		['ListToken', 'DdToken'],
	],

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
			try {
				token.parse(maxStage, include);
			} catch (e) {
				if (e instanceof Error) {
					const file = `${__dirname}/errors/${new Date().toISOString()}`,
						stage = token.getAttribute('stage');
					fs.writeFileSync(file, stage === this.MAX_STAGE ? wikitext : token.toString());
					fs.writeFileSync(`${file}.err`, e.stack);
					fs.writeFileSync(`${file}.json`, JSON.stringify({
						stage, include: token.getAttribute('include'), config: this.config,
					}, null, '\t'));
				}
				throw e;
			}
		});
		return token;
	},

	reparse(date) {
		const path = `${__dirname}/errors/`,
			main = fs.readdirSync(path).find(name => name.startsWith(date) && name.endsWith('Z'));
		if (!main) {
			throw new RangeError(`找不到对应时间戳的错误记录：${date}`);
		}
		const Token = require('./src'),
			file = `${path}${main}`,
			wikitext = fs.readFileSync(file, 'utf8'),
			{stage, include, config} = require(`${file}.json`);
		this.config = config;
		return this.run(() => {
			const halfParsed = stage < this.MAX_STAGE,
				token = new Token(wikitext, this.getConfig(), halfParsed);
			if (halfParsed) {
				token.setAttribute('stage', stage).parseOnce(stage, include);
			} else {
				token.parse(undefined, include);
			}
			fs.unlinkSync(file);
			fs.unlinkSync(`${file}.err`);
			fs.unlinkSync(`${file}.json`);
			return token;
		});
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
