'use strict';
const Parser = require('../index');
const Token = require('.');
const GalleryImageToken = require('./link/galleryImage');
const HiddenToken = require('./hidden');

/**
 * gallery标签
 * @classdesc `{childNodes: ...(GalleryImageToken|HiddenToken|AstText)}`
 */
class GalleryToken extends Token {
	/** @browser */
	type = 'ext-inner';

	/** 所有图片 */
	get images() {
		return this.childNodes.filter(({type}) => type === 'gallery-image');
	}

	/**
	 * @browser
	 * @param inner 标签内部wikitext
	 */
	constructor(inner, config = Parser.getConfig(), accum = []) {
		super(undefined, config, true, accum, {
			AstText: ':', GalleryImageToken: ':', HiddenToken: ':',
		});
		for (const line of inner?.split('\n') ?? []) {
			const matches = /^([^|]+)(?:\|(.*))?/u.exec(line);
			if (!matches) {
				super.insertAt(line.trim()
					? new HiddenToken(line, config, [], {
						AstText: ':',
					})
					: line);
				continue;
			}
			const [, file, alt] = matches,
				title = this.normalizeTitle(file, 6, true, true);
			if (title.valid) {
				super.insertAt(new GalleryImageToken('gallery', file, alt, config, accum));
			} else {
				super.insertAt(new HiddenToken(line, config, [], {
					AstText: ':',
				}));
			}
		}
	}

	/**
	 * @override
	 * @browser
	 */
	toString(selector) {
		return super.toString(selector, '\n');
	}

	/**
	 * @override
	 * @browser
	 */
	text() {
		return super.text('\n').replace(/\n\s*\n/gu, '\n');
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
		return super.print({sep: '\n'});
	}

	/**
	 * @override
	 * @browser
	 */
	lint(start = this.getAbsoluteIndex()) {
		const {top, left} = this.getRootNode().posFromIndex(start),
			errors = [];
		for (let i = 0, startIndex = start; i < this.length; i++) {
			const child = this.childNodes[i],
				str = String(child),
				{length} = str,
				trimmed = str.trim(),
				startLine = top + i,
				startCol = i ? 0 : left;
			if (child.type === 'hidden' && trimmed && !/^<!--.*-->$/u.test(trimmed)) {
				errors.push({
					message: Parser.msg('invalid content in <$1>', 'gallery'),
					severity: 'error',
					startIndex,
					endIndex: startIndex + length,
					startLine,
					endLine: startLine,
					startCol,
					endCol: startCol + length,
					excerpt: String(child).slice(0, 50),
				});
			} else if (child.type !== 'hidden' && child.type !== 'text') {
				errors.push(...child.lint(startIndex));
			}
			startIndex += length + 1;
		}
		return errors;
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
	 * 插入图片
	 * @param file 图片文件名
	 * @param i 插入位置
	 * @throws `SyntaxError` 非法的文件名
	 */
	insertImage(file, i = this.length) {
		const title = this.normalizeTitle(file, 6, true, true);
		if (title.valid) {
			const token = Parser.run(
				() => new GalleryImageToken('gallery', file, undefined, this.getAttribute('config')),
			);
			return this.insertAt(token, i);
		}
		throw new SyntaxError(`非法的文件名：${file}`);
	}

	/** @ignore */
	insertAt(token, i = 0) {
		if (typeof token === 'string' && token.trim() || token instanceof HiddenToken) {
			throw new RangeError('请勿向图库中插入不可见内容！');
		}
		return super.insertAt(token, i);
	}
}
Parser.classes.GalleryToken = __filename;
module.exports = GalleryToken;
