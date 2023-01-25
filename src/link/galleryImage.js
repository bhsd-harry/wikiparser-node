'use strict';

const {generateForSelf} = require('../../util/lint'),
	{undo} = require('../../util/debug'),
	singleLine = require('../../mixin/singleLine'),
	Title = require('../../lib/title'),
	Parser = require('../..'),
	Token = require('..'),
	FileToken = require('./file');

/**
 * 图片
 * @classdesc `{childNodes: [AtomToken, ...ImageParameterToken]}`
 */
class GalleryImageToken extends singleLine(FileToken) {
	type = 'gallery-image';
	#invalid = false;

	/** 图片链接 */
	get link() {
		return this.type === 'imagemap-image' ? undefined : super.link;
	}

	set link(value) {
		super.link = value;
	}

	/**
	 * @param {string} link 图片文件名
	 * @param {string|undefined} text 图片参数
	 * @param {Title} title 图片文件标题对象
	 * @param {accum} accum
	 */
	constructor(link, text, title, config = Parser.getConfig(), accum = []) {
		let token;
		if (text !== undefined) {
			token = new Token(text, config, true, accum);
			token.type = 'temp';
			for (let n = 1; n < Parser.MAX_STAGE; n++) {
				token.getAttribute('parseOnce')();
			}
			accum.splice(accum.indexOf(token), 1);
		}
		super(link, token?.toString(), title, config, accum);
		this.setAttribute('bracket', false);
		if (!Object.values(config.img).includes('width')) {
			this.seal(['size', 'width', 'height'], true);
		}
	}

	/**
	 * @override
	 * @throws `Error` 非法的内链目标
	 * @throws `Error` 不可更改命名空间
	 */
	afterBuild() {
		const initImagemap = this.type === 'imagemap-image',
			{
				title: initTitle, interwiki: initInterwiki, ns: initNs,
			} = this.normalizeTitle(String(this.firstChild), initImagemap ? 0 : 6, true, !initImagemap);
		this.setAttribute('name', initTitle);
		this.#invalid = initInterwiki || initNs !== 6; // 只用于gallery-image的首次解析
		const /** @type {AstListener} */ linkListener = (e, data) => {
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
		return this;
	}

	/** @override */
	getPadding() {
		return 0;
	}

	/**
	 * @override
	 * @param {number} start 起始位置
	 */
	lint(start = 0) {
		const errors = super.lint(start);
		if (this.#invalid) {
			errors.push(generateForSelf(this, {start}, '无效的图库图片'));
		}
		return errors;
	}

	/**
	 * @override
	 * @param {string} link 链接目标
	 * @throws `SyntaxError` 非法的链接目标
	 */
	setTarget(link) {
		link = String(link);
		const include = this.getAttribute('include'),
			config = this.getAttribute('config'),
			root = Parser.parse(`<gallery>${link}</gallery>`, include, 1, config),
			{length, firstChild: gallery} = root,
			{type, lastChild: {length: galleryLength, firstChild: image}} = gallery;
		if (length !== 1 || type !== 'ext' || galleryLength !== 1 || image.type !== 'gallery-image') {
			throw new SyntaxError(`非法的图库文件名：${link}`);
		}
		const {firstChild} = image;
		image.destroy(true);
		this.firstChild.safeReplaceWith(firstChild);
	}
}

Parser.classes.GalleryImageToken = __filename;
module.exports = GalleryImageToken;
