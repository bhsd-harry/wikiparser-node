'use strict';

const {generateForChild} = require('../util/lint'),
	Parser = require('..'),
	Token = require('.');

/**
 * 自由外链
 * @classdesc `{childNodes: [...AstText|CommentToken|IncludeToken|NoincludeToken]}`
 */
class MagicLinkToken extends Token {
	type = 'free-ext-link';
	#protocolRegex;

	/** 协议 */
	get protocol() {
		return this.#protocolRegex.exec(this.text())?.[0];
	}

	set protocol(value) {
		if (typeof value !== 'string') {
			this.typeError('protocol', 'String');
		} else if (!new RegExp(`${this.#protocolRegex.source}$`, 'iu').test(value)) {
			throw new RangeError(`非法的外链协议：${value}`);
		}
		const {link} = this;
		if (!this.#protocolRegex.test(link)) {
			throw new Error(`特殊外链无法更改协议！${link}`);
		}
		this.replaceChildren(link.replace(this.#protocolRegex, value));
	}

	/** 和内链保持一致 */
	get link() {
		return this.text();
	}

	set link(url) {
		this.setTarget(url);
	}

	/**
	 * @override
	 * @param {number} start 起始位置
	 */
	lint(start = this.getAbsoluteIndex()) {
		const errors = super.lint(start),
			source = `[，；。：！？（）]+${this.type === 'ext-link-url' ? '|\\|+' : ''}`,
			regex = new RegExp(source, 'u'),
			regexGlobal = new RegExp(source, 'gu');
		let /** @type {{top: number, left: number}} */ rect;
		for (const child of this.childNodes) {
			const str = String(child);
			if (child.type !== 'text' || !regex.test(str)) {
				continue;
			}
			rect ||= {start, ...this.getRootNode().posFromIndex(start)};
			const refError = generateForChild(child, rect, '', 'warning');
			errors.push(...[...str.matchAll(regexGlobal)].map(({index, 0: {0: char, length}}) => {
				const lines = str.slice(0, index).split('\n'),
					{length: top} = lines,
					{length: left} = lines.at(-1),
					startIndex = start + index,
					startLine = refError.startLine + top - 1,
					startCol = (top > 1 ? 0 : refError.startCol) + left;
				return {
					...refError,
					message: Parser.msg('$1 in URL', char === '|' ? '"|"' : Parser.msg('full-width punctuation')),
					startIndex,
					endIndex: startIndex + length,
					startLine,
					endLine: startLine,
					startCol,
					endCol: startCol + length,
					excerpt: str.slice(Math.max(0, index - 25), index + 25),
				};
			}));
		}
		return errors;
	}

	/**
	 * @param {string} url 网址
	 * @param {boolean} doubleSlash 是否接受"//"作为协议
	 * @param {Token} accum
	 */
	constructor(url, doubleSlash, config = Parser.getConfig(), accum = []) {
		super(url, config, true, accum, {
			'Stage-1': ':', '!ExtToken': '',
		});
		if (doubleSlash) {
			this.type = 'ext-link-url';
		}
		this.#protocolRegex = new RegExp(`^(?:${config.protocol}${doubleSlash ? '|//' : ''})`, 'iu');
	}

	/** @override */
	cloneNode() {
		const cloned = this.cloneChildNodes();
		return Parser.run(() => {
			const token = new MagicLinkToken(undefined, this.type === 'ext-link-url', this.getAttribute('config'));
			token.append(...cloned);
			token.afterBuild();
			return token;
		});
	}

	/**
	 * 获取网址
	 * @throws `Error` 非标准协议
	 */
	getUrl() {
		let url = this.text();
		if (url.startsWith('//')) {
			url = `https:${url}`;
		}
		try {
			return new URL(url);
		} catch (e) {
			if (e instanceof TypeError && e.message === 'Invalid URL') {
				throw new Error(`非标准协议的外部链接：${url}`);
			}
			throw e;
		}
	}

	/**
	 * 设置外链目标
	 * @param {string|URL} url 含协议的网址
	 * @throws `SyntaxError` 非法的自由外链目标
	 */
	setTarget(url) {
		url = String(url);
		const root = Parser.parse(url, this.getAttribute('include'), 9, this.getAttribute('config')),
			{length, firstChild: freeExtLink} = root;
		if (length !== 1 || freeExtLink.type !== 'free-ext-link') {
			throw new SyntaxError(`非法的自由外链目标：${url}`);
		}
		this.replaceChildren(...freeExtLink.childNodes);
	}

	/** 是否是模板或魔术字参数 */
	isParamValue() {
		const /** @type {ParameterToken} */ parameter = this.closest('parameter');
		return parameter?.getValue() === this.text();
	}
}

Parser.classes.MagicLinkToken = __filename;
module.exports = MagicLinkToken;
