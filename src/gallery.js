'use strict';

const Parser = require('..'),
	Token = require('.'),
	GalleryImageToken = require('./link/galleryImage'),
	HiddenToken = require('./atom/hidden');

/**
 * gallery标签
 * @classdesc `{childNodes: ...(GalleryImageToken|HiddenToken|AstText)}`
 */
class GalleryToken extends Token {
	type = 'ext-inner';
	name = 'gallery';

	/** 所有图片 */
	get images() {
		return this.childNodes.filter(({type}) => type === 'gallery-image');
	}

	/**
	 * @param {string} inner 标签内部wikitext
	 * @param {accum} accum
	 */
	constructor(inner, config = Parser.getConfig(), accum = []) {
		super(undefined, config, true, accum, {AstText: ':', GalleryImageToken: ':', HiddenToken: ':'});
		const newConfig = structuredClone(config);
		newConfig.img = Object.fromEntries(Object.entries(config.img).filter(([, param]) => param !== 'width'));
		for (const line of inner?.split('\n') ?? []) {
			const matches = /^([^|]+)(?:\|(.*))?/u.exec(line);
			if (!matches) {
				super.insertAt(line.trim() ? new HiddenToken(line, undefined, config, [], {AstText: ':'}) : line);
				continue;
			}
			const [, file, alt] = matches;
			let title;
			try {
				title = this.normalizeTitle(decodeURIComponent(file), 6, true);
			} catch {
				title = this.normalizeTitle(file, 6, true);
			}
			if (title.valid) {
				super.insertAt(new GalleryImageToken(file, alt, title, newConfig, accum));
			} else {
				super.insertAt(new HiddenToken(line, undefined, config, [], {AstText: ':'}));
			}
		}
	}

	/** @override */
	cloneNode() {
		const cloned = this.cloneChildNodes();
		return Parser.run(() => {
			const token = new GalleryToken(undefined, this.getAttribute('config'));
			token.append(...cloned);
			return token;
		});
	}

	/**
	 * @override
	 * @param {string} selector
	 */
	toString(selector) {
		return super.toString(selector, '\n');
	}

	/** @override */
	getGaps() {
		return 1;
	}

	/** @override */
	print() {
		return super.print({sep: '\n'});
	}

	/** @override */
	text() {
		return super.text('\n').replaceAll(/\n\s*\n/gu, '\n');
	}

	/**
	 * 插入图片
	 * @param {string} file 图片文件名
	 * @param {number} i 插入位置
	 * @throws `SyntaxError` 非法的文件名
	 */
	insertImage(file, i = this.childNodes.length) {
		let title;
		try {
			title = this.normalizeTitle(decodeURIComponent(file), 6, true);
		} catch {
			title = this.normalizeTitle(file, 6, true);
		}
		if (title.valid) {
			const token = Parser.run(() => new GalleryImageToken(file, undefined, title, this.getAttribute('config')));
			return this.insertAt(token, i);
		}
		throw new SyntaxError(`非法的文件名：${file}`);
	}

	/**
	 * @override
	 * @param {number} start 起始位置
	 */
	lint(start = 0) {
		const {top, left} = this.getRootNode().posFromIndex(start),
			/** @type {LintError[]} */ errors = [];
		for (let i = 0, cur = start; i < this.childNodes.length; i++) {
			const child = this.childNodes[i],
				str = String(child),
				trimmed = str.trim();
			if (child.type === 'hidden' && trimmed && !/^<!--.*-->$/u.test(trimmed)) {
				errors.push({
					message: '图库中的无效内容',
					startLine: top + i,
					endLine: top + i,
					startCol: i ? 0 : left,
					endCol: i ? str.length : left + str.length,
				});
			} else if (child.type !== 'hidden' && child.type !== 'text') {
				errors.push(...child.lint(cur));
			}
			cur += str.length + 1;
		}
		return errors;
	}

	/**
	 * @override
	 * @template {string|Token} T
	 * @param {T} token 待插入的节点
	 * @param {number} i 插入位置
	 * @throws `RangeError` 插入不可见内容
	 */
	insertAt(token, i = 0) {
		if (typeof token === 'string' && token.trim() || token instanceof HiddenToken) {
			throw new RangeError('请勿向图库中插入不可见内容！');
		}
		return super.insertAt(token, i);
	}
}

Parser.classes.GalleryToken = __filename;
module.exports = GalleryToken;
