'use strict';
const string_1 = require('../util/string');
const {text, noWrap} = string_1;
const lint_1 = require('../util/lint');
const {generateForSelf, generateForChild} = lint_1;
const Parser = require('../index');
const Token = require('.');
const AtomToken = require('./atom');
const HiddenToken = require('./hidden');

/**
 * `{{{}}}`包裹的参数
 * @classdesc `{childNodes: [AtomToken, ?Token, ...HiddenToken]}`
 */
class ArgToken extends Token {
	/** @browser */
	type = 'arg';

	/**
	 * 预设值
	 * @browser
	 */
	get default() {
		return this.childNodes[1]?.text() ?? false;
	}

	/**
	 * @browser
	 * @param parts 以'|'分隔的各部分
	 */
	constructor(parts, config = Parser.getConfig(), accum = []) {
		super(undefined, config, true, accum, {
			AtomToken: 0, Token: 1, HiddenToken: '2:',
		});
		for (let i = 0; i < parts.length; i++) {
			if (i === 0) {
				const token = new AtomToken(parts[i], 'arg-name', config, accum, {
					'Stage-2': ':', '!HeadingToken': '',
				});
				super.insertAt(token);
			} else if (i > 1) {
				const token = new HiddenToken(parts[i], config, accum, {
					'Stage-2': ':', '!HeadingToken': '',
				});
				super.insertAt(token);
			} else {
				const token = new Token(parts[i], config, true, accum);
				token.type = 'arg-default';
				super.insertAt(token.setAttribute('stage', 2));
			}
		}
		this.protectChildren(0);
	}

	/**
	 * @override
	 * @browser
	 */
	toString(selector) {
		return selector && this.matches(selector) ? '' : `{{{${super.toString(selector, '|')}}}}`;
	}

	/**
	 * @override
	 * @browser
	 */
	text() {
		return `{{{${text(this.childNodes.slice(0, 2), '|')}}}}`;
	}

	/** @private */
	getPadding() {
		return 3;
	}

	/** @private */
	getGaps() {
		return 1;
	}

	/**
	 * @override
	 * @browser
	 */
	print() {
		return super.print({pre: '{{{', post: '}}}', sep: '|'});
	}

	/**
	 * @override
	 * @browser
	 */
	lint(start = this.getAbsoluteIndex()) {
		if (!this.getAttribute('include')) {
			return [generateForSelf(this, {start}, 'unexpected template argument')];
		}
		const {childNodes: [argName, argDefault, ...rest]} = this,
			errors = argName.lint(start + 3);
		if (argDefault) {
			errors.push(...argDefault.lint(start + 4 + String(argName).length));
		}
		if (rest.length > 0) {
			const rect = {start, ...this.getRootNode().posFromIndex(start)};
			errors.push(...rest.map(child => {
				const error = generateForChild(child, rect, 'invisible content inside triple brackets'),
					{startIndex, startCol, excerpt} = error;
				return {...error, startIndex: startIndex - 1, startCol: startCol - 1, excerpt: `|${excerpt}`};
			}));
		}
		return errors;
	}

	/** @override */
	cloneNode() {
		const [name, ...cloned] = this.cloneChildNodes();
		return Parser.run(() => {
			const token = new ArgToken([''], this.getAttribute('config'));
			token.firstChild.safeReplaceWith(name);
			token.append(...cloned);
			token.afterBuild();
			return token;
		});
	}

	/** @private */
	afterBuild() {
		this.setAttribute('name', this.firstChild.text().trim());
		const /** @implements */ argListener = ({prevTarget}) => {
			if (prevTarget === this.firstChild) {
				this.setAttribute('name', prevTarget.text().trim());
			}
		};
		this.addEventListener(['remove', 'insert', 'replace', 'text'], argListener);
	}

	/** 移除无效部分 */
	removeRedundant() {
		Parser.run(() => {
			for (let i = this.length - 1; i > 1; i--) {
				super.removeAt(i);
			}
		});
	}

	/**
	 * @override
	 * @param i 移除位置
	 */
	removeAt(i) {
		if (i === 1) {
			this.removeRedundant();
		}
		return super.removeAt(i);
	}

	/**
	 * @override
	 * @param token 待插入的子节点
	 * @param i 插入位置
	 * @throws `RangeError` 不可插入多余子节点
	 * @throws `TypeError` 不可插入文本节点
	 */
	insertAt(token, i = this.length) {
		const j = i < 0 ? i + this.length : i;
		if (j > 1) {
			throw new RangeError(`${this.constructor.name} 不可插入多余的子节点！`);
		} else if (typeof token === 'string') {
			throw new TypeError(`${this.constructor.name} 不可插入文本节点！`);
		}
		super.insertAt(token, i);
		if (j === 1) {
			token.type = 'arg-default';
		}
		return token;
	}

	/**
	 * 设置参数名
	 * @param name 新参数名
	 * @throws `SyntaxError` 非法的参数名
	 */
	setName(name) {
		const root = Parser.parse(`{{{${name}}}}`, this.getAttribute('include'), 2, this.getAttribute('config')),
			{length, firstChild: arg} = root;
		if (length !== 1 || arg.type !== 'arg' || arg.length !== 1) {
			throw new SyntaxError(`非法的参数名称：${noWrap(name)}`);
		}
		const {firstChild} = arg;
		arg.destroy();
		this.firstChild.safeReplaceWith(firstChild);
	}

	/**
	 * 设置预设值
	 * @param value 预设值
	 * @throws `SyntaxError` 非法的参数预设值
	 */
	setDefault(value) {
		const root = Parser.parse(`{{{|${value}}}}`, this.getAttribute('include'), 2, this.getAttribute('config')),
			{length, firstChild: arg} = root;
		if (length !== 1 || arg.type !== 'arg' || arg.length !== 2) {
			throw new SyntaxError(`非法的参数预设值：${noWrap(value)}`);
		}
		const {childNodes: [, oldDefault]} = this,
			{lastChild} = arg;
		arg.destroy();
		if (oldDefault) {
			oldDefault.safeReplaceWith(lastChild);
		} else {
			this.insertAt(lastChild);
		}
	}
}
Parser.classes.ArgToken = __filename;
module.exports = ArgToken;
