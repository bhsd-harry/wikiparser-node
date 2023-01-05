'use strict';

const fs = require('fs'),
	path = require('path'),
	{text} = require('./util/string');

const /** @type {Parser} */ Parser = {
	warning: true,
	debugging: false,
	running: false,

	config: './config/default',

	MAX_STAGE: 11,

	classes: {},
	mixins: {},
	parsers: {},

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
		['ConverterToken'],
	],
	typeAliases: {
		include: ['includeonly'],
		ext: ['extension'],
		'ext-attr': ['extension-attr'],
		'ext-inner': ['extension-inner'],
		arg: ['argument'],
		'arg-name': ['argument-name'],
		'arg-default': ['argument-default'],
		'magic-word': ['parser-function', 'parser-func'],
		'invoke-function': ['invoke-func', 'lua-function', 'lua-func', 'module-function', 'module-func'],
		'invoke-module': ['lua-module'],
		parameter: ['param'],
		'parameter-key': ['param-key'],
		'parameter-value': ['parameter-val', 'param-value', 'param-val'],
		heading: ['header'],
		'heading-title': ['header-title'],
		'heading-trail': ['header-trail'],
		'table-attr': ['tr-attr', 'table-row-attr', 'td-attr', 'table-cell-attr', 'table-data-attr'],
		tr: ['table-row'],
		td: ['table-cell', 'table-data'],
		'td-inner': ['table-cell-inner', 'table-data-inner'],
		'double-underscore': ['underscore', 'behavior-switch', 'behaviour-switch'],
		hr: ['horizontal'],
		category: ['category-link', 'cat', 'cat-link'],
		file: ['file-link', 'image', 'image-link', 'img', 'img-link'],
		'gallery-image': ['gallery-file', 'gallery-img'],
		'image-parameter': ['img-parameter', 'image-param', 'img-param'],
		quote: ['quotes', 'quot', 'apostrophe', 'apostrophes', 'apos'],
		'ext-link': ['external-link'],
		'ext-link-text': ['external-link-text'],
		'ext-link-url': ['external-link-url'],
		'free-ext-link': ['free-external-link', 'magic-link'],
		list: ['ol', 'ordered-list', 'ul', 'unordered-list', 'dl', 'description-list'],
		dd: ['indent', 'indentation'],
		converter: ['convert', 'conversion'],
		'converter-flags': ['convert-flags', 'conversion-flags'],
		'converter-flag': ['convert-flag', 'conversion-flag'],
		'converter-rule': ['convert-rule', 'conversion-rule'],
		'converter-rule-noconvert': ['convert-rule-noconvert', 'conversion-rule-noconvert'],
		'converter-rule-variant': ['convert-rule-variant', 'conversion-rule-variant'],
		'converter-rule-to': ['convert-rule-to', 'conversion-rule-to'],
		'converter-rule-from': ['convert-rule-from', 'conversion-rule-from'],
	},

	warn(msg, ...args) {
		if (this.warning) {
			console.warn('\x1B[33m%s\x1B[0m', msg, ...args);
		}
	},
	debug(msg, ...args) {
		if (this.debugging) {
			console.debug('\x1B[34m%s\x1B[0m', msg, ...args);
		}
	},
	error(msg, ...args) {
		console.error('\x1B[31m%s\x1B[0m', msg, ...args);
	},
	info(msg, ...args) {
		console.info('\x1B[32m%s\x1B[0m', msg, ...args);
	},

	log(f) {
		if (typeof f === 'function') {
			console.log(String(f));
		}
	},

	getConfig() {
		return require(this.config);
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

	clearCache() {
		const entries = [
			...Object.entries(this.classes),
			...Object.entries(this.mixins),
			...Object.entries(this.parsers),
		];
		for (const [, filePath] of entries) {
			delete require.cache[require.resolve(filePath)];
		}
		for (const [name, filePath] of entries) {
			if (name in global) {
				global[name] = require(filePath);
			}
		}
	},

	isInterwiki(title, {interwiki} = Parser.getConfig()) {
		title = String(title);
		return new RegExp(`^(${interwiki.join('|')})\\s*:`, 'iu')
			.exec(title.replaceAll('_', ' ').replace(/^\s*:?\s*/u, ''));
	},

	normalizeTitle(title, defaultNs = 0, include = false, config = Parser.getConfig(), halfParsed = false) {
		title = String(title);
		let /** @type {Token} */ token;
		if (!halfParsed) {
			const Token = require('./src');
			token = this.run(() => new Token(title, config).parseOnce(0, include).parseOnce());
			title = token.firstChild;
		}
		const Title = require('./lib/title');
		const titleObj = new Title(title, defaultNs, config);
		if (token) {
			/**
			 * 重建部分属性值
			 * @param {string[]} keys 属性键
			 */
			const build = keys => {
				for (const key of keys) {
					if (titleObj[key].includes('\0')) {
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

	parse(wikitext, include, maxStage = Parser.MAX_STAGE, config = Parser.getConfig()) {
		const Token = require('./src');
		let token;
		this.run(() => {
			if (typeof wikitext === 'string') {
				token = new Token(wikitext, config);
			} else if (wikitext instanceof Token) {
				token = wikitext;
				wikitext = String(token);
			} else {
				throw new TypeError('待解析的内容应为 String 或 Token！');
			}
			try {
				token.parse(maxStage, include);
			} catch (e) {
				if (e instanceof Error) {
					const file = path.join(__dirname, 'errors', new Date().toISOString()),
						stage = token.getAttribute('stage');
					fs.writeFileSync(file, stage === this.MAX_STAGE ? wikitext : String(token));
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
		const main = fs.readdirSync(path.join(__dirname, 'errors'))
			.find(name => name.startsWith(date) && name.at(-1) === 'Z');
		if (!main) {
			throw new RangeError(`找不到对应时间戳的错误记录：${date}`);
		}
		const file = path.join(__dirname, 'errors', main),
			wikitext = fs.readFileSync(file, 'utf8');
		const {stage, include, config} = require(`${file}.json`),
			Token = require('./src');
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
	if (['aliases', 'MAX_STAGE', 'typeAliases'].includes(key)) {
		def[key] = {enumerable: false, writable: false};
	} else if (!['config', 'isInterwiki', 'normalizeTitle', 'parse', 'getTool'].includes(key)) {
		def[key] = {enumerable: false};
	}
}
Object.defineProperties(Parser, def);

module.exports = Parser;
