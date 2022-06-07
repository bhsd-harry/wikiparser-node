'use strict';
const Token = require('./token'),
	AtomToken = require('./atomToken'),
	ParameterToken = require('./parameterToken'),
	{removeComment, numberToString, typeError} = require('./util');

/** @param {string} name */
const legalTemplateName = name => !/\x00\d+e\x7f|[#<>[\]{}]/.test(name);

/**
 * @content AtomToken
 * @content ?ParameterToken
 */
class TranscludeToken extends Token {
	type = 'template';
	name;
	/** @type {Set<string>} */ #keys = new Set();
	/** @type {Map<string, UniqueCollection>} */ #args = new Map();

	/**
	 * @param {string} title
	 * @param {string[][]} parts
	 * @param {Object<string, any>} config
	 * @param {Token[]} accum
	 */
	constructor(title, parts, config = require(Token.config), accum = []) {
		super(null, config, true, null, accum, ['AtomToken', 'ParameterToken']);
		const /** @type {{parserFunction: string[][]}} */ {parserFunction: [sensitive, insensitive]} = config;
		/** @param {string} name */
		const legalMagicWord = name => sensitive.includes(name) || insensitive.includes(name.toLowerCase());
		if (parts.length === 0 || title.includes(':')) {
			const [magicWord, ...arg] = title.split(':'),
				name = removeComment(magicWord);
			if (legalMagicWord(name)) {
				this.name = name.toLowerCase().replace(/^#/, '');
				this.type = 'magic-word';
				new AtomToken(magicWord, 'magic-word-name', this, accum, ['String', 'CommentToken']);
				if (arg.length) {
					parts.unshift([arg.join(':')]);
				}
			}
		}
		if (this.type === 'template') {
			const name = removeComment(title);
			if (!legalTemplateName(name)) {
				throw new SyntaxError(`非法的模板名称：${name}`);
			}
			new AtomToken(
				title,
				'template-name',
				this,
				accum,
				['String', 'CommentToken', 'ArgToken', 'TranscludeToken'],
			);
		}
		let i = 1;
		parts.forEach(part => {
			if (part.length === 1) {
				part.unshift(this.type === 'magic-word' && this.name === 'invoke' ? i - 2 : i);
				i++;
			}
			new ParameterToken(...part, config, this, accum, false);
		});
		const /** @type {{type: string, $children: TokenCollection}} */ {type, $children} = this,
			that = this;
		this.keepChildrenOrder().unremovableChild(0).on(
			'childReplaced',
			/**
			 * @param {Token} oldChild
			 * @param {Token} newChild
			 * @param {number} index
			 */
			function transclude(oldChild, newChild, index) {
				if (index > 0) {
					const /** @type {{anon: boolean}} */ {anon} = oldChild;
					if (newChild.anon !== anon) {
						Token.warn(true, `${anon ? '匿名' : '命名'}参数变更为${anon ? '命名' : '匿名'}参数！`);
					}
					that.#handleReplacedArg(oldChild, newChild);
					return;
				}
				const name = removeComment(newChild.toString());
				// keepChildrenOrder使得魔术字和模板间不能互换
				if (type === 'magic-word' && !legalMagicWord(name)
					|| type === 'template' && !legalTemplateName(name)
				) {
					$children.splice(index, 1, oldChild);
					throw new SyntaxError(`${type === 'magic-word' ? '不存在的魔术字：' : '非法的模板名称：'}${name}`);
				}
			},
		).on(
			'childDetached',
			/** @param {Token} child */
			function transclude(child) {
				if (child.anon && (type === 'template' || that.name === 'invoke')) {
					Token.warn(true, '移除了一个匿名参数！');
				}
				that.#handleDeletedArg(child);
			},
		).on(
			'childRenamed',
			/**
			 * @param {ParameterToken} child
			 * @param {string} oldKey - 更名前的参数名
			 */
			function transclude(child, oldKey) {
				const /** @type {UniqueCollection} */ oldArgs = that.getArgs(oldKey).delete(child);
				if (oldArgs.length === 0) {
					that.#keys.delete(oldKey);
				}
				that.#keys.add(child.name);
				that.#args.get(child.name)?.push(child);
			},
		);
	}

	// ------------------------------ override superclass ------------------------------ //

	toString() {
		const {$children} = this;
		return this.type === 'magic-word'
			? `{{${$children[0]}${$children.length > 1 ? ':' : ''}${$children.slice(1).join('|')}}}`
			: `{{${$children.join('|')}}}`;
	}

	/**
	 * @param {ParameterToken|ParameterToken[]} args
	 * @param {number} i
	 */
	insert(args, i = this.$children.length) {
		args = Array.isArray(args) ? args : [args];
		if (i === 0) {
			throw new RangeError('TranscludeToken不可插入name子节点！');
		} else if (args.some(token => !(token instanceof ParameterToken))) {
			throw new TypeError('TranscludeToken仅可插入ParameterToken！');
		}
		const hasAnon = args.some(({anon}) => anon);
		super.insert(args, i);
		if (hasAnon) {
			if (this.type === 'template' && i < this.$children.length - args.length) {
				Token.warn(true, '新的匿名参数被插入中间！');
			}
			this.#handleAnonArgChange(true);
		}
		args.filter(({anon}) => !anon).forEach(token => {
			this.#handleAddedArg(token);
		});
		return this;
	}

	/** @param {...number|string|Token} args */
	delete(...args) {
		const {Ranges} = require('./range'),
			indices = new Ranges(args.filter(i => ['number', 'string'].includes(typeof i))).applyTo(this.$children),
			/** @type {Token[]} */ tokens = args.filter(token => token instanceof Token);
		if (indices.includes(0) || tokens.includes(this.$children[0])) {
			throw new RangeError('TranscludeToken不能删除name子节点！');
		}
		const /** @type {Token[]} */ allTokens = [...new Set(
				[...indices.map(i => this.$children[i]), ...tokens.filter(token => this.$children.includes(token))],
			)],
			hasAnon = allTokens.some(({anon}) => anon);
		super.delete(...allTokens);
		if (hasAnon) {
			if (this.type === 'template') {
				Token.warn(true, '部分匿名参数被删除！');
			}
			this.#handleAnonArgChange();
		}
		allTokens.filter(({anon}) => !anon).forEach(token => {
			this.#handleDeletedArg(token);
		});
		return this;
	}

	// ------------------------------ transclusion specifics ------------------------------ //

	#handleAnonArgChange(addingOnly = false) {
		this.getAnonArgs().forEach((token, i) => {
			token.name = String(this.type === 'magic-word' && this.name === 'invoke' ? i - 1 : i + 1);
			if (addingOnly) {
				this.#keys.add(token.name);
			}
		});
		if (!addingOnly) {
			this.#keys.clear();
		}
		this.#args.forEach((_, key) => {
			const number = Number(key);
			if (Number.isInteger(number) && number > 0) {
				this.#args.delete(key);
			}
		});
		return this;
	}

	/** @param {ParameterToken} arg */
	#handleAddedArg(arg) {
		if (arg.anon) {
			return this.#handleAnonArgChange(true);
		}
		this.#args.get(arg.name)?.push(arg);
		this.#keys.add(arg.name);
		return this;
	}

	/** @param {ParameterToken} arg */
	#handleDeletedArg(arg) {
		if (arg.anon) {
			return this.#handleAnonArgChange();
		}
		this.#args.get(arg.name)?.delete(arg);
		if (this.getArgs(arg.name).length === 0) {
			this.#keys.delete(arg.name);
		}
		return this;
	}

	/**
	 * @param {ParameterToken} oldArg
	 * @param {ParameterToken} newArg
	 */
	#handleReplacedArg(oldArg, newArg) {
		if (oldArg.anon && newArg.anon) {
			newArg.name = oldArg.name;
			this.#args.get(oldArg.name)?.delete(oldArg)?.push(newArg);
		} else if (!oldArg.anon && !newArg.anon && oldArg.name === newArg.name) {
			this.#args.get(oldArg.name)?.delete(oldArg)?.push(newArg);
		} else {
			this.#handleAddedArg(newArg).#handleDeletedArg(oldArg);
		}
		return this;
	}

	getAllArgs() {
		return Token.$.from(this.$children.slice(1));
	}

	/** @returns {UniqueCollection} */
	getAnonArgs() {
		return this.getAllArgs().filter(({anon}) => anon);
	}

	/** @param {string|number} key */
	getArgs(key) {
		if (!['string', 'number'].includes(typeof key)) {
			typeError('String', 'Number');
		}
		key = String(key);
		let args = this.#args.get(key);
		if (!args) {
			args = this.getAllArgs().filter(({name}) => key === name);
			this.#args.set(key, args);
		}
		return args;
	}

	/**
	 * @param {string|number} key
	 * @param {boolean} any
	 * @returns {ParameterToken|undefined}
	 */
	getArg(key, any) {
		const args = this.getArgs(key);
		return (any ? args : args.filter(({anon}) => typeof key === 'number' === anon)).at(-1);
	}

	getKeys() {
		if (this.#keys.size === 0) {
			const args = this.getAllArgs();
			if (args.length) {
				args.forEach(({name}) => {
					this.#keys.add(name);
				});
			}
		}
		return this.#keys;
	}

	/**
	 * @param {string|number} key
	 * @returns {string[]}
	 */
	getValues(key) {
		return this.getArgs(key).map(arg => arg.getValue());
	}

	/**
	 * @param {string|number|undefined} key
	 * @returns {string|undefined|Object<string, string>}
	 */
	getValue(key) {
		if (key !== undefined) {
			return this.getValues(key).at(-1);
		}
		return Object.fromEntries([...this.getKeys()].map(k => this.getValue(k)));
	}

	/** @param {string|number|Token} val */
	newAnonArg(val) {
		val = numberToString(val);
		/** @type {{$children: {0: TranscludeToken, length: number}}} */
		const {$children: {0: test, length}} = new Token(`{{:T|${val.toString()}}}`, this.get('config')).parse(2);
		if (length !== 1 || !test.is('template#T') || test.$children.length !== 2 || !test.$children[1].anon) {
			throw new SyntaxError(`Syntax error in ${this.type} anonymous argument value: ${
				val.toString().replaceAll('\n', '\\n')
			}`);
		} else if (val.constructor.name !== 'ParameterToken') {
			[, val] = test;
		} else {
			val.anon = true;
		}
		return this.append(val);
	}

	/**
	 * @param {string|number|undefined} key
	 * @param {string|number|Token} value
	 * @param {number} i
	 */
	setValue(key, value, i = this.$children.length) {
		if (key === undefined) {
			if (i < this.$children.length) {
				Token.warn(true, '插入匿名参数时忽略指定的位置参数！');
			}
			return this.newAnonArg(value);
		} else if (!['string', 'number'].includes(typeof key)) {
			typeError('String', 'Number');
		}
		let arg = this.getArg(key, true);
		if (arg) {
			arg.setValue(value);
			return this;
		}
		key = String(key);
		value = numberToString(value);
		i = Math.min(Math.max(i, 1), this.$children.length);
		const /** @type {{$children: {0: TranscludeToken, length: number}}} */ {
			$children: {0: test, length},
		} = new Token(`{{:T|${key}=${value.toString()}}}`, this.get('config')).parse(2);
		if (length !== 1 || !test.is('template#T')
			|| test.$children.length !== 2 || test.$children[1].name !== key
		) {
			throw new SyntaxError(`Syntax error in ${this.type} argument value: ${
				value.toString().replaceAll('\n', '\\n')
			}`);
		}
		[, arg] = test; // 总是改写成命名参数
		return this.insert(arg, i);
	}

	naming() {
		this.getAllArgs().filter(({anon}) => anon).forEach(arg => {
			arg.$children[0].content(arg.name);
			arg.anon = false;
		});
		return this;
	}

	/** @param {string|number} key */
	removeArg(key) {
		return this.delete(...this.getArgs(key));
	}

	/** @param {string|number|Token|TokenCollection} title */
	rename(title) {
		if (this.type === 'magic-word') {
			throw new Error('TranscludeToken.rename方法仅用于更换模板！');
		} else if (!['string', 'number'].includes(typeof title)
			&& !(title instanceof Token) && !(title instanceof Token.$.TokenCollection)
		) {
			typeError('String', 'Number', 'Token', 'TokenCollection');
		}
		const name = removeComment(title.toString());
		if (!legalTemplateName(name)) {
			throw new RangeError('非法的模板名！');
		}
		this.$children[0].content(title);
		this.name = this.type === 'magic-word' ? name.toLowerCase().replace(/^#/, '') : this.normalizeTitle(name, 10);
	}

	/**
	 * @param {string} module
	 * @param {string} func
	 */
	invoke(module, func) {
		if (this.type === 'magic-word') {
			throw new Error('TranscludeToken.invoke方法仅用于将模板替换为模块！');
		} else if (typeof module !== 'string' || typeof func !== 'string') {
			typeError('String');
		}
		Object.defineProperty(this, 'type', {value: 'magic-word', writable: false, configurable: true});
		this.$children[0].content('#invoke').set('accum', ['String', 'CommentToken']).type = 'magic-word-name';
		this.name = 'invoke'; // 必须先改名
		this.insert([
			new ParameterToken(-1, module, null, null, [], false),
			new ParameterToken(0, func, null, null, [], false),
		], 1);
	}
}

Token.classes.TranscludeToken = TranscludeToken;

module.exports = TranscludeToken;
