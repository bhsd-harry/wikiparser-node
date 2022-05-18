'use strict';
const Token = require('./token'),
	AtomToken = require('./atomToken'),
	{removeComment, numberToString, typeError, fixToken} = require('./util');

/**
 * @content AtomToken
 * @content Token
 */
class ParameterToken extends fixToken(Token) {
	type = 'parameter';
	anon = false;
	name;
	/** @type {string} */ #value;

	/**
	 * @param {string|number|Token|TokenCollection} key
	 * @param {string|number|Token|(string|Token)[]} value
	 * @param {Object<string, any>} config
	 * @param {Token} parent
	 * @param {Token[]} accum
	 */
	constructor(key, value, config = require(Token.config), parent = null, accum = [], autofix = true) {
		if (!['string', 'number'].includes(typeof key)
			&& !(key instanceof Token) && !(key instanceof Token.$.TokenCollection)
		) {
			typeError('String', 'Number', 'Token', 'TokenCollection');
		}
		super(null, config, true, parent, accum, ['AtomToken', 'Token']);
		if (!autofix && typeof key === 'number') {
			this.anon = true;
			this.name = String(key);
		}
		new AtomToken(
			key,
			'parameter-key',
			this,
			accum,
			['String', 'CommentToken', 'ExtToken', 'ArgToken', 'TranscludeToken'],
		);
		const token = new Token(value, config, true, this, accum);
		token.type = 'parameter-value';
		token.set('stage', 2);
		this.seal();
	}

	toString() {
		return this.anon ? this.$children[1].toString() : this.$children.join('=');
	}

	getValue() {
		if (this.#value === undefined) {
			this.#value = removeComment(
				this.$children[1].toString(),
				!this.anon || this.parent()?.type !== 'template',
			);
		}
		return this.#value;
	}

	/** @param {string|number|Token|(string|Token)[]} value */
	setValue(value) {
		value = numberToString(value);
		const {anon} = this,
			/** @type {{$children: {0: TranscludeToken, length: number}}} */ {
				$children: {0: test, length},
			} = new Token(`{{:T|${anon ? '' : '1='}${value}}}`, this.get('config')).parse(2);
		if (length !== 1 || !test.is('template#T')
			|| test.$children.length !== 2 || test.$children[1].anon !== anon || test.$children[1].name !== '1'
		) {
			throw new SyntaxError(`Syntax error in template/magic-word argument value: ${
				value.toString().replaceAll('\n', '\\n')
			}`);
		}
		if (value.constructor.name !== 'Token') {
			[, [, value]] = test;
		} else {
			value.type = 'parameter-value';
		}
		this.$children[1].replaceWith(value);
		return this;
	}

	/**
	 * @param {string|number|Token|TokenCollection} key
	 * @param {boolean} force
	 */
	rename(key, force) {
		if (this.anon) {
			throw new Error(`匿名参数 ${this.name} 不能简单地更名！`);
		} else if (!['string', 'number'].includes(typeof key)
			&& !(key instanceof Token) && !(key instanceof Token.$.TokenCollection)
		) {
			typeError('String', 'Number', 'Token', 'TokenCollection');
		}
		key = String(key);
		const name = removeComment(key),
			{name: oldName} = this,
			parent = this.parent(),
			/** @type {Set<string>|undefined} */ keys = parent?.getKeys(); // 确保执行一次getKeys()
		if (oldName === name) {
			Token.warn(true, `ParameterToken.rename: 未改变实际参数名 ${name}！`);
		} else if (keys?.has(name)) {
			const msg = `参数更名造成重复参数：${name}`;
			if (force) {
				Token.warn(true, `ParameterToken.rename: ${msg}`);
			} else {
				throw new RangeError(msg);
			}
		}
		const /** @type [AtomToken] */ [paramKey] = this;
		paramKey.content(key);
		this.name = name;
		parent?.emit('childRenamed', this, oldName);
		return this;
	}
}

Token.classes.ParameterToken = ParameterToken;

module.exports = ParameterToken;
