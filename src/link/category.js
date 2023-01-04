'use strict';

const Parser = require('../..'),
	LinkToken = require('.'),
	Token = require('..');

/**
 * 分类
 * @classdesc `{childNodes: [AtomToken, ?Token]}`
 */
class CategoryToken extends LinkToken {
	type = 'category';
	sortkey = '';

	setLangLink = undefined;
	setFragment = undefined;
	asSelfLink = undefined;
	pipeTrick = undefined;

	/**
	 * @param {string} link 分类名
	 * @param {string|undefined} text 排序关键字
	 * @param {Title} title 分类页面标题对象
	 * @param {accum} accum
	 */
	constructor(link, text, title, config = Parser.getConfig(), accum = []) {
		super(link, text, title, config, accum);
		this.seal(['sortkey', 'setFragment', 'asSelfLink', 'pipeTrick']);
	}

	/** @override */
	afterBuild() {
		super.afterBuild();
		this.#updateSortkey();
		const /** @type {AstListener} */ categoryListener = ({prevTarget}) => {
			if (prevTarget?.type === 'link-text') {
				this.#updateSortkey();
			}
		};
		this.addEventListener(['remove', 'insert', 'replace', 'text'], categoryListener);
		return this;
	}

	/** 更新排序关键字 */
	#updateSortkey() {
		this.setAttribute('sortkey', this.children[1]?.text()
			?.replaceAll(/&#(\d+);/gu, /** @param {string} p */ (_, p) => String.fromCodePoint(Number(p)))
			?.replaceAll(/&#x([\da-f]+);/giu, /** @param {string} p */ (_, p) => String.fromCodePoint(parseInt(p, 16)))
			?.replaceAll('\n', '') ?? '');
	}

	/**
	 * @override
	 * @param {number} i 子节点位置
	 */
	removeAt(i) {
		if (i === 1) {
			this.setAttribute('sortkey', '');
		}
		return super.removeAt(i);
	}

	/**
	 * @override
	 * @template {string|Token} T
	 * @param {T} token 待插入的子节点
	 * @param {number} i 插入位置
	 */
	insertAt(token, i) {
		super.insertAt(token, i);
		if (i === 1 && !Parser.running) {
			this.#updateSortkey();
		}
		return token;
	}

	/**
	 * 设置排序关键字
	 * @param {string} text 排序关键字
	 */
	setSortkey(text) {
		this.setLinkText(text);
	}
}

Parser.classes.CategoryToken = __filename;
module.exports = CategoryToken;
