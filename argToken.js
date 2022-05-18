'use strict';
const Token = require('./token'),
	AtomToken = require('./atomToken'),
	{numberToString, removeComment} = require('./util');

/**
 * @content AtomToken
 * @content ?Token
 * @content ?AtomToken
 */
class ArgToken extends Token {
	type = 'arg';
	/** @type {string} */ name;

	/**
	 * @param {string[]} parts
	 * @param {Object<string, any>} config
	 * @param {Token[]} accum
	 */
	constructor(parts, config = require(Token.config), accum = []) {
		super(null, config, true, null, accum, ['AtomToken', 'Token']);
		parts.forEach((part, i) => {
			if (i === 0 || i > 1) {
				new AtomToken(
					part,
					i === 0 ? 'arg-name' : 'arg-redundant',
					this,
					accum,
					['String', 'CommentToken', 'ExtToken', 'ArgToken', 'TranscludeToken'],
				);
			} else {
				const token = new Token(part, config, true, this, accum);
				token.type = 'arg-default';
				token.set('stage', 2);
			}
		});
		const that = this;
		this.freeze('type').keepChildrenOrder().unremovableChild(0).on(
			'childDetached',
			/** @param {number} i */
			function arg(_, i) {
				if (i === 1 && that.$children.length > 1) {
					Token.warn(true, 'ArgToken存在冗余子节点时删除arg-default节点！');
					that.children().detach(); // 使用UniqueCollection.detach以避免抛出错误
				}
			},
		);
	}

	toString() {
		return `{{{${this.$children.join('|')}}}}`;
	}

	/**
	 * @param {Token|Token[]} args
	 * @param {number} i
	 */
	insert(args, i = this.$children.length) {
		if (i !== 1 || Array.isArray(args) && args.length > 1) {
			throw new RangeError('ArgToken不可插入arg-name或arg-redundant子节点！');
		}
		const arg = Array.isArray(args) ? args[0] : args;
		if (!(arg instanceof Token)) {
			throw new TypeError('arg-default子节点应为Token！');
		}
		arg.type = 'arg-default';
		return super.insert(arg, i);
	}

	/** @param {...number|string|Token} args */
	delete(...args) {
		const {Ranges} = require('./range'),
			indices = new Ranges(args.filter(i => ['number', 'string'].includes(typeof i))).applyTo(this),
			/** @type {Token[]} */ tokens = args.filter(token => token instanceof Token);
		if (indices.includes(0) || tokens.includes(this.$children[0])) {
			throw new RangeError('ArgToken不能删除arg-name子节点！');
		} else if (indices.includes(1) || tokens.includes(this.$children[1])) {
			return super.delete('1:');
		}
		return super.delete(...tokens, ...indices);
	}

	/** @param {string|number|Token} name */
	rename(name) {
		name = numberToString(name);
		/** @type {{$children: {0: ArgToken, length: number}}} */
		const {$children: {0: test, length}} = new Token(`{{{${name.toString()}}}}`, this.get('config')).parse(2);
		if (length !== 1 || test.type !== 'arg' || test.$children.length !== 1) {
			throw new SyntaxError(`Syntax error in triple-brace argument name: ${
				name.toString().replaceAll('\n', '\\n')
			}`);
		} else if (name.constructor.name !== 'AtomToken') {
			[name] = test;
		} else {
			name.type = 'arg-name';
		}
		this.$children[0].replaceWith(name);
		this.name = removeComment(name.toString());
		return this;
	}

	/** @param {Token|string|number} token */
	setDefault(str) {
		str = numberToString(str);
		/** @type {{$children: {0: ArgToken, length: number}}} */
		const {$children: {0: test, length}} = new Token(`{{{|${str.toString()}}}}`, this.get('config')).parse(2);
		if (length !== 1 || test.type !== 'arg' || test.$children.length !== 2) {
			throw new SyntaxError(`Syntax error in triple-brace argument default: ${
				str.toString().replaceAll('\n', '\\n')
			}`);
		} else if (str.constructor.name !== 'Token') {
			[, str] = test;
		} else {
			str.type = 'arg-default';
		}
		if (this.$children.length > 1) {
			this.$children[1].replaceWith(str);
			return this;
		}
		return this.append(str);
	}

	removeRedundant() {
		this.children().slice(2).detach();
		return this;
	}
}

Token.ArgToken = ArgToken;

module.exports = ArgToken;
