'use strict';
const lint_1 = require('../../util/lint');
const {generateForSelf} = lint_1;
const debug_1 = require('../../util/debug');
const {undo} = debug_1;
const singleLine = require('../../mixin/singleLine');
const Parser = require('../../index');
const Token = require('..');
const FileToken = require('./file');

/** 图库图片 */
class GalleryImageToken extends singleLine(FileToken) {
	/** @browser */
	#invalid = false;

	/** 图片链接 */
	get link() {
		return this.type === 'imagemap-image' ? '' : super.link;
	}

	set link(value) {
		if (this.type !== 'imagemap-image') {
			super.link = value;
		}
	}

	/**
	 * @browser
	 * @param type 图片类型
	 * @param link 图片文件名
	 * @param text 图片参数
	 */
	constructor(type, link, text, config = Parser.getConfig(), accum = []) {
		let token;
		if (text !== undefined) {
			token = new Token(text, config, true, accum);
			token.type = 'plain';
			for (let n = 1; n < Parser.MAX_STAGE; n++) {
				token.parseOnce();
			}
			accum.splice(accum.indexOf(token), 1);
		}
		super(link, token?.toString(), config, accum);
		this.setAttribute('bracket', false).type = `${type}-image`;
	}

	/** @private */
	afterBuild() {
		const initImagemap = this.type === 'imagemap-image',
			titleObj = this.normalizeTitle(String(this.firstChild), initImagemap ? 0 : 6, true, !initImagemap);
		this.setAttribute('name', titleObj.title);
		this.#invalid = Boolean(titleObj.interwiki) || titleObj.ns !== 6; // 只用于gallery-image的首次解析
		const /** @implements */ linkListener = (e, data) => {
			const {prevTarget} = e;
			if (prevTarget?.type === 'link-target') {
				const name = String(prevTarget),
					imagemap = this.type === 'imagemap-image',
					{title, interwiki, ns, valid} = this.normalizeTitle(name, imagemap ? 0 : 6, true, !imagemap);
				if (!valid) {
					undo(e, data);
					throw new Error(`非法的图片文件名：${name}`);
				} else if (interwiki || ns !== 6) {
					undo(e, data);
					throw new Error(`图片链接不可更改命名空间：${name}`);
				}
				this.setAttribute('name', title);
				this.#invalid = false;
			}
		};
		this.addEventListener(['remove', 'insert', 'replace', 'text'], linkListener);
	}

	/** @private */
	getPadding() {
		return 0;
	}

	/**
	 * @override
	 * @browser
	 */
	lint(start = this.getAbsoluteIndex()) {
		const errors = super.lint(start);
		if (this.#invalid) {
			errors.push(generateForSelf(this, {start}, 'invalid gallery image'));
		}
		return errors;
	}

	/**
	 * @override
	 * @param link 链接目标
	 * @throws `SyntaxError` 非法的链接目标
	 */
	setTarget(link) {
		const include = this.getAttribute('include'),
			config = this.getAttribute('config'),
			root = Parser.parse(`<gallery>${link}</gallery>`, include, 1, config),
			{length, firstChild: ext} = root;
		if (length !== 1 || ext.type !== 'ext') {
			throw new SyntaxError(`非法的图库文件名：${link}`);
		}
		const {lastChild: gallery} = ext,
			{firstChild: image} = gallery;
		if (gallery.length !== 1 || image.type !== 'gallery-image') {
			throw new SyntaxError(`非法的图库文件名：${link}`);
		}
		const {firstChild} = image;
		image.destroy();
		this.firstChild.safeReplaceWith(firstChild);
	}
}
Parser.classes.GalleryImageToken = __filename;
module.exports = GalleryImageToken;
