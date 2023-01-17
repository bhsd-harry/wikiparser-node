'use strict';

const fs = require('fs'),
	path = require('path'),
	{text} = require('./util/string');

const /** @type {Parser} */ Parser = {
	config: './config/default',

	MAX_STAGE: 11,

	warning: true,
	debugging: false,
	running: false,

	classes: {},
	mixins: {},
	parsers: {},
	tool: {},

	aliases: [
		['AstText'],
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
		text: ['string', 'str'],
		plain: ['regular', 'normal'],
		// comment and extension
		onlyinclude: ['only-include'],
		noinclude: ['no-include'],
		include: ['includeonly', 'include-only'],
		comment: [],
		ext: ['extension'],
		'ext-attr': ['extension-attr'],
		'ext-inner': ['extension-inner'],
		// triple brackets
		arg: ['argument'],
		'arg-name': ['argument-name'],
		'arg-default': ['argument-default'],
		hidden: ['arg-redundant'],
		// double brackets
		'magic-word': ['parser-function', 'parser-func'],
		'magic-word-name': ['parser-function-name', 'parser-func-name'],
		'invoke-function': ['invoke-func', 'lua-function', 'lua-func', 'module-function', 'module-func'],
		'invoke-module': ['lua-module'],
		template: [],
		'template-name': [],
		parameter: ['param'],
		'parameter-key': ['param-key'],
		'parameter-value': ['parameter-val', 'param-value', 'param-val'],
		// heading
		heading: ['header'],
		'heading-title': ['header-title'],
		'heading-trail': ['header-trail'],
		// html
		html: [],
		'html-attr': [],
		// table
		table: [],
		tr: ['table-row'],
		td: ['table-cell', 'table-data'],
		'table-syntax': [],
		'table-attr': ['tr-attr', 'table-row-attr', 'td-attr', 'table-cell-attr', 'table-data-attr'],
		'table-inter': [],
		'td-inner': ['table-cell-inner', 'table-data-inner'],
		// hr and double-underscore
		hr: ['horizontal'],
		'double-underscore': ['underscore', 'behavior-switch', 'behaviour-switch'],
		// link
		link: ['wikilink'],
		'link-target': ['wikilink-target'],
		'link-text': ['wikilink-text'],
		category: ['category-link', 'cat', 'cat-link'],
		file: ['file-link', 'image', 'image-link', 'img', 'img-link'],
		'gallery-image': ['gallery-file', 'gallery-img'],
		'imagemap-image': ['imagemap-file', 'imagemap-img', 'image-map-image', 'image-map-file', 'image-map-img'],
		'image-parameter': ['img-parameter', 'image-param', 'img-param'],
		// quotes
		quote: ['quotes', 'quot', 'apostrophe', 'apostrophes', 'apos'],
		// external link
		'ext-link': ['external-link'],
		'ext-link-text': ['external-link-text'],
		'ext-link-url': ['external-link-url'],
		// magic link
		'free-ext-link': ['free-external-link', 'magic-link'],
		// list
		list: ['ol', 'ordered-list', 'ul', 'unordered-list', 'dl', 'description-list'],
		dd: ['indent', 'indentation'],
		// converter
		converter: ['convert', 'conversion'],
		'converter-flags': ['convert-flags', 'conversion-flags'],
		'converter-flag': ['convert-flag', 'conversion-flag'],
		'converter-rule': ['convert-rule', 'conversion-rule'],
		'converter-rule-noconvert': ['convert-rule-noconvert', 'conversion-rule-noconvert'],
		'converter-rule-variant': ['convert-rule-variant', 'conversion-rule-variant'],
		'converter-rule-to': ['convert-rule-to', 'conversion-rule-to'],
		'converter-rule-from': ['convert-rule-from', 'conversion-rule-from'],
		// specific extensions
		'param-line': ['parameter-line'],
		'charinsert-line': [],
		'imagemap-link': ['image-map-link'],
	},

	promises: [Promise.resolve()],

	getConfig() {
		return require(this.config);
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
		if (token) {
			/**
			 * 重建部分属性值
			 * @param {string[]} keys 属性键
			 */
			const build = keys => {
				for (const key of keys) {
					if (titleObj[key].includes('\0')) {
						titleObj[key] = text(token.getAttribute('buildFromStr')(titleObj[key]));
					}
				}
			};
			this.run(() => {
				build(['title', 'main', 'fragment']);
			});
		}
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
		if (this.debugging) {
			let restored = String(token),
				process = '解析';
			if (restored === wikitext) {
				const entities = {lt: '<', gt: '>', amp: '&'};
				restored = token.print().replaceAll(
					/<[^<]+?>|&([lg]t|amp);/gu,
					/** @param {string} s */ (_, s) => s ? entities[s] : '',
				);
				process = '渲染HTML';
			}
			if (restored !== wikitext) {
				const diff = require('./util/diff');
				const {promises: {0: cur, length}} = this;
				this.promises.unshift((async () => {
					await cur;
					this.error(`${process}过程中不可逆地修改了原始文本！`);
					return diff(wikitext, restored, length);
				})());
			}
		}
		return token;
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

	clearCache() {
		const entries = [
			...Object.entries(this.classes),
			...Object.entries(this.mixins),
			...Object.entries(this.parsers),
			...Object.entries(this.tool),
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
				token.setAttribute('stage', stage).getAttribute('parseOnce')(stage, include);
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
	if (['MAX_STAGE', 'aliases', 'typeAliases', 'promises'].includes(key)) {
		def[key] = {enumerable: false, writable: false};
	} else if (!['config', 'normalizeTitle', 'parse', 'isInterwiki', 'getTool'].includes(key)) {
		def[key] = {enumerable: false};
	}
}
Object.defineProperties(Parser, def);

module.exports = Parser;
