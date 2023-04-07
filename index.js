'use strict';
const fs = require('fs');
const path = require('path');

/**
 * 从根路径require
 * @param file 文件名
 * @param dir 子路径
 */
const rootRequire = (file, dir = '') => require(`${file.includes('/') ? '' : `./${dir}`}${file}`);
const Parser = {
	config: 'default',
	i18n: undefined,
	MAX_STAGE: 11,
	warning: true,
	debugging: false,
	running: false,
	classes: {},
	mixins: {},
	parsers: {},
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
		comment: undefined,
		ext: ['extension'],
		'ext-attrs': ['extension-attrs', 'ext-attributes', 'extension-attributes'],
		'ext-attr-dirty': ['extension-attr-dirty', 'ext-attribute-dirty', 'extension-attribute-dirty'],
		'ext-attr': ['extension-attr', 'ext-attribute', 'extension-attribute'],
		'attr-key': ['attribute-key'],
		'attr-value': ['attribute-value', 'attr-val', 'attribute-val'],
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
		template: undefined,
		'template-name': undefined,
		parameter: ['param'],
		'parameter-key': ['param-key'],
		'parameter-value': ['parameter-val', 'param-value', 'param-val'],
		// heading
		heading: ['header'],
		'heading-title': ['header-title'],
		'heading-trail': ['header-trail'],
		// html
		html: undefined,
		'html-attrs': ['html-attributes'],
		'html-attr-dirty': ['html-attribute-dirty'],
		'html-attr': ['html-attribute'],
		// table
		table: undefined,
		tr: ['table-row'],
		td: ['table-cell', 'table-data'],
		'table-syntax': undefined,
		'table-attrs': ['tr-attrs', 'td-attrs', 'table-attributes', 'tr-attributes', 'td-attributes'],
		'table-attr-dirty': ['tr-attr-dirty', 'td-attr-dirty', 'table-attribute-dirty', 'tr-attribute-dirty', 'td-attribute-dirty'],
		'table-attr': ['tr-attr', 'td-attr', 'table-attribute', 'tr-attribute', 'td-attribute'],
		'table-inter': undefined,
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
		'charinsert-line': undefined,
		'imagemap-link': ['image-map-link'],
	},
	promises: [Promise.resolve()],
	/** @implements */
	getConfig() {
		if (typeof this.config === 'string') {
			this.config = rootRequire(this.config, 'config/');
			return this.getConfig();
		}
		return {...this.config, excludes: []};
	},
	/** @implements */
	msg(msg, arg = '') {
		if (typeof this.i18n === 'string') {
			this.i18n = rootRequire(this.i18n, 'i18n/');
			return this.msg(msg, arg);
		}
		return (this.i18n?.[msg] ?? msg).replace('$1', arg);
	},
	/** @implements */
	normalizeTitle(title, defaultNs = 0, include = false, config = Parser.getConfig(), halfParsed = false, decode = false, selfLink = false) {
		const Title = require('./lib/title');
		if (halfParsed) {
			return new Title(title, defaultNs, config, decode, selfLink);
		}
		const Token = require('./src');
		const token = this.run(() => new Token(title, config).parseOnce(0, include).parseOnce()),
			titleObj = new Title(String(token.firstChild), defaultNs, config, decode, selfLink);

		/**
		 * 重建部分属性值
		 * @param keys 属性键
		 */
		const build = keys => {
			for (const key of keys) {
				if (titleObj[key]?.includes('\0')) {
					titleObj[key] = token.buildFromStr(titleObj[key], 'text');
				}
			}
		};
		this.run(() => {
			build(['title', 'main', 'fragment']);
		});
		return titleObj;
	},
	/** @implements */
	parse(wikitext, include, maxStage = Parser.MAX_STAGE, config = Parser.getConfig()) {
		if (typeof wikitext !== 'string') {
			throw new TypeError('待解析的内容应为 String！');
		}
		const Token = require('./src');
		let token;
		this.run(() => {
			token = new Token(wikitext, config);
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
				restored = token.print().replace(/<[^<]+?>|&([lg]t|amp);/gu, (_, s) => s ? entities[s] : '');
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
	/** @implements */
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
	/** @implements */
	warn(msg, ...args) {
		if (this.warning) {
			console.warn('\x1B[33m%s\x1B[0m', msg, ...args);
		}
	},
	/** @implements */
	debug(msg, ...args) {
		if (this.debugging) {
			console.debug('\x1B[34m%s\x1B[0m', msg, ...args);
		}
	},
	/** @implements */
	error(msg, ...args) {
		console.error('\x1B[31m%s\x1B[0m', msg, ...args);
	},
	/** @implements */
	info(msg, ...args) {
		console.info('\x1B[32m%s\x1B[0m', msg, ...args);
	},
	/** @implements */
	log(f) {
		if (typeof f === 'function') {
			console.log(String(f));
		}
	},
	/** @implements */
	clearCache() {
		const entries = [
			...Object.entries(this.classes),
			...Object.entries(this.mixins),
			...Object.entries(this.parsers),
		];
		for (const [, filePath] of entries) {
			try {
				delete require.cache[require.resolve(filePath)];
			} catch {}
		}
		for (const [name, filePath] of entries) {
			if (name in global) {
				// @ts-expect-error noImplicitAny
				global[name] = require(filePath);
			}
		}
	},
	/** @implements */
	isInterwiki(title, {interwiki} = Parser.getConfig()) {
		return new RegExp(`^(${interwiki.join('|')})\\s*:`, 'iu')
			.exec(title.replaceAll('_', ' ').replace(/^\s*:?\s*/u, ''));
	},
	/** @implements */
	reparse(date) {
		const main = fs.readdirSync(path.join(__dirname, 'errors'))
			.find(name => name.startsWith(date) && name.endsWith('Z'));
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
};
const def = {},
	immutable = new Set(['MAX_STAGE', 'aliases', 'typeAliases', 'promises']),
	enumerable = new Set(['config', 'normalizeTitle', 'parse', 'isInterwiki']);
for (const key in Parser) {
	if (immutable.has(key)) {
		def[key] = {enumerable: false, writable: false};
	} else if (!enumerable.has(key)) {
		def[key] = {enumerable: false};
	}
}
Object.defineProperties(Parser, def);
module.exports = Parser;
