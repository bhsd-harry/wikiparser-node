'use strict';

const {removeComment, text, decodeHtml} = require('../util/string'),
	{generateForChild} = require('../util/lint'),
	Parser = require('..'),
	Token = require('.'),
	ParameterToken = require('./parameter'),
	AtomToken = require('./atom'),
	SyntaxToken = require('./syntax');

/**
 * 模板或魔术字
 * @classdesc `{childNodes: [AtomToken|SyntaxToken, ...ParameterToken]}`
 */
class TranscludeToken extends Token {
	type = 'template';
	modifier = '';
	/** @type {Record<string, Set<ParameterToken>>} */ #args = {};
	#fragment;
	#valid = true;
	#raw = false;

	/**
	 * 设置引用修饰符
	 * @param {string} modifier 引用修饰符
	 * @complexity `n`
	 */
	setModifier(modifier = '') {
		const {parserFunction: [,, raw, subst]} = this.getAttribute('config'),
			lcModifier = removeComment(modifier).trim();
		if (modifier && !lcModifier.endsWith(':')) {
			return false;
		}
		const magicWord = lcModifier.slice(0, -1).toLowerCase(),
			isRaw = raw.includes(magicWord),
			isSubst = subst.includes(magicWord);
		if (isRaw || isSubst || modifier === '') {
			this.setAttribute('modifier', modifier);
			this.#raw = isRaw;
			return Boolean(modifier);
		}
		return false;
	}

	/**
	 * @param {string} title 模板标题或魔术字
	 * @param {[string, string|undefined][]} parts 参数各部分
	 * @param {accum} accum
	 * @complexity `n`
	 * @throws `SyntaxError` 非法的模板名称
	 */
	constructor(title, parts, config = Parser.getConfig(), accum = []) {
		super(undefined, config, true, accum, {
		});
		const {parserFunction: [insensitive, sensitive]} = config,
			argSubst = /^(?:\s|\0\d+c\x7F)*\0\d+s\x7F/u.exec(title)?.[0];
		if (argSubst) {
			this.setAttribute('modifier', argSubst);
			title = title.slice(argSubst.length);
		} else if (title.includes(':')) {
			const [modifier, ...arg] = title.split(':'),
				[mt] = /^(?:\s|\0\d+c\x7F)*/u.exec(arg[0] ?? '');
			if (this.setModifier(`${modifier}:${mt}`)) {
				title = arg.join(':').slice(mt.length);
			}
		}
		if (title.includes(':') || parts.length === 0 && !this.#raw) {
			const [magicWord, ...arg] = title.split(':'),
				cleaned = removeComment(magicWord),
				name = cleaned[arg.length > 0 ? 'trimStart' : 'trim'](),
				isSensitive = sensitive.includes(name),
				canonicalCame = insensitive[name.toLowerCase()];
			if (isSensitive || canonicalCame) {
				this.setAttribute('name', canonicalCame || name.toLowerCase()).type = 'magic-word';
				const pattern = new RegExp(`^\\s*${name}\\s*$`, isSensitive ? 'u' : 'iu'),
					token = new SyntaxToken(magicWord, pattern, 'magic-word-name', config, accum, {
					});
				this.insertAt(token);
				if (arg.length > 0) {
					parts.unshift([arg.join(':')]);
				}
				if (this.name === 'invoke') {
					for (let i = 0; i < 2; i++) {
						const part = parts.shift();
						if (!part) {
							break;
						}
						const invoke = new AtomToken(part.join('='), `invoke-${
							i ? 'function' : 'module'
						}`, config, accum, {
						});
						this.insertAt(invoke);
					}
				}
			}
		}
		if (this.type === 'template') {
			const name = removeComment(decodeHtml(title)).split('#')[0].trim();
			if (!name || /\0\d+[eh!+-]\x7F|[<>[\]{}\n]|%[\da-f]{2}/u.test(name)) {
				accum.pop();
				throw new SyntaxError(`非法的模板名称：${name}`);
			}
			const token = new AtomToken(title, 'template-name', config, accum, {
			});
			this.insertAt(token);
		}
		const templateLike = this.isTemplate();
		let i = 1;
		for (let j = 0; j < parts.length; j++) {
			const part = parts[j];
			if (!templateLike && !(this.name === 'switch' && j > 0)) {
				part[0] = part.join('=');
				part.length = 1;
			}
			if (part.length === 1) {
				part.unshift(i);
				i++;
			}
			this.insertAt(new ParameterToken(...part, config, accum));
		}
	}

	/** @override */
	afterBuild() {
		if (this.modifier.includes('\0')) {
			this.setAttribute('modifier', this.getAttribute('buildFromStr')(this.modifier, 'string'));
		}
		if (this.isTemplate()) {
			const isTemplate = this.type === 'template',
				titleObj = this.normalizeTitle(this.childNodes[isTemplate ? 0 : 1].text(), isTemplate ? 10 : 828);
			this.#fragment = titleObj.fragment;
			this.#valid = titleObj.valid;
		}
	}

	/**
	 * @override
	 */
	toString(selector) {
		const {childNodes, firstChild, modifier} = this;
		return `{{${modifier}${
			this.type === 'magic-word'
				? `${String(firstChild)}${childNodes.length > 1 ? ':' : ''}${childNodes.slice(1).map(String).join('|')}`
				: super.toString(selector, '|')
		}}}`;
	}

	/**
	 * @override
	 * @returns {string}
	 * @complexity `n`
	 */
	text() {
		const {childNodes, firstChild, modifier, type, name} = this;
		return type === 'magic-word' && name === 'vardefine'
			? ''
			: `{{${modifier}${
				this.type === 'magic-word'
					? `${firstChild.text()}${childNodes.length > 1 ? ':' : ''}${text(childNodes.slice(1), '|')}`
					: super.text('|')
			}}}`;
	}

	/** @override */
	getPadding() {
		return this.modifier.length + 2;
	}

	/** @override */
	getGaps() {
		return 1;
	}

	/**
	 * @override
	 * @param {number} start 起始位置
	 */
	lint(start) {
		const errors = super.lint(start),
			{type, childNodes} = this;
		let rect;
		if (!this.isTemplate()) {
			return errors;
		} else if (this.#fragment !== undefined) {
			rect = {start, ...this.getRootNode().posFromIndex(start)};
			errors.push(generateForChild(childNodes[type === 'template' ? 0 : 1], rect, 'useless fragment'));
		}
		if (!this.#valid) {
			rect = {start, ...this.getRootNode().posFromIndex(start)};
			errors.push(generateForChild(childNodes[1], rect, 'illegal module name'));
		}
		const duplicatedArgs = this.getDuplicatedArgs();
		if (duplicatedArgs.length > 0) {
			rect ||= {start, ...this.getRootNode().posFromIndex(start)};
			errors.push(...duplicatedArgs.flatMap(([, args]) => args).map(
				arg => generateForChild(arg, rect, 'duplicated parameter'),
			));
		}
		return errors;
	}

	/** 是否是模板 */
	isTemplate() {
		return this.type === 'template' || this.type === 'magic-word' && this.name === 'invoke';
	}

	/**
	 * 处理匿名参数更改
	 * @param {number|ParameterToken} addedToken 新增的参数
	 * @complexity `n`
	 */
	#handleAnonArgChange(addedToken) {
		const args = this.getAnonArgs(),
			j = args.indexOf(addedToken);
		for (let i = j; i < args.length; i++) {
			const token = args[i],
				{name} = token,
				newName = String(i + 1);
			if (name !== newName) {
				this.getArgs(newName, false, false).add(token.setAttribute('name', newName));
			}
		}
	}

	/**
	 * @override
	 * @param {ParameterToken} token 待插入的子节点
	 * @param {number} i 插入位置
	 * @complexity `n`
	 */
	insertAt(token, i = this.length) {
		super.insertAt(token, i);
		if (token.anon) {
			this.#handleAnonArgChange(token);
		} else if (token.name) {
			this.getArgs(token.name, false, false).add(token);
		}
		return token;
	}

	/**
	 * 获取所有参数
	 * @returns {ParameterToken[]}
	 * @complexity `n`
	 */
	getAllArgs() {
		return this.childNodes.filter(child => child instanceof ParameterToken);
	}

	/**
	 * 获取匿名参数
	 * @complexity `n`
	 */
	getAnonArgs() {
		return this.getAllArgs().filter(({anon}) => anon);
	}

	/**
	 * 获取指定参数
	 * @param {string|number} key 参数名
	 * @param {boolean} exact 是否匹配匿名性
	 * @param {boolean} copy 是否返回一个备份
	 * @complexity `n`
	 */
	getArgs(key, exact, copy = true) {
		const keyStr = String(key).replace(/^[ \t\n\0\v]+|(?<=[^ \t\n\0\v])[ \t\n\0\v]+$/gu, '');
		let args;
		if (Object.hasOwn(this.#args, keyStr)) {
			args = this.#args[keyStr];
		} else {
			args = new Set(this.getAllArgs().filter(({name}) => keyStr === name));
			this.#args[keyStr] = args;
		}
		return args;
	}

	/**
	 * 获取重名参数
	 * @complexity `n`
	 * @returns {[string, ParameterToken[]][]}
	 */
	getDuplicatedArgs() {
		if (this.isTemplate()) {
			return Object.entries(this.#args).filter(([, {size}]) => size > 1)
				.map(([key, args]) => [key, [...args]]);
		}
		return [];
	}

	/**
	 * 对特定魔术字获取可能的取值
	 * @this {ParameterToken}}
	 * @throws `Error` 不是可接受的魔术字
	 */
	getPossibleValues() {
		const {type, name, childNodes, constructor: {name: cName}} = this;
		if (type === 'template') {
			throw new Error(`${cName}.getPossibleValues 方法仅供特定魔术字使用！`);
		}
		let start;
		switch (name) {
			case 'if':
			case 'ifexist':
			case 'ifexpr':
			case 'iferror':
				start = 2;
				break;
			case 'ifeq':
				start = 3;
				break;
			default:
				throw new Error(`${cName}.getPossibleValues 方法仅供特定魔术字使用！`);
		}
		const /** @type {Token[]} */ queue = childNodes.slice(start, start + 2).map(({childNodes: [, value]}) => value);
		for (let i = 0; i < queue.length;) {
			/** @type {Token[] & {0: TranscludeToken}} */
			const {length, 0: first} = queue[i].childNodes.filter(child => child.text().trim());
			if (length === 0) {
				queue.splice(i, 1);
			} else if (length > 1 || first.type !== 'magic-word') {
				i++;
			} else {
				try {
					const possibleValues = first.getPossibleValues();
					queue.splice(i, 1, ...possibleValues);
					i += possibleValues.length;
				} catch {
					i++;
				}
			}
		}
		return queue;
	}
}

module.exports = TranscludeToken;
