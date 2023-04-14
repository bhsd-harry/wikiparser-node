'use strict';

const Parser = require('..');

/**
 * 子节点含有AttributesToken的类
 * @param {new (...args: *) => import('../src')} Constructor 基类
 * @param {number} i AttributesToken子节点的位置
 */
const attributesParent = (Constructor, i = 0) => class AttributesParent extends Constructor {
	/** AttributesToken子节点 */
	get attributesChild() {
		return /** @type {import('../src/attributes')} */ (this.childNodes.at(i));
	}

	/** getAttrs()方法的getter写法 */
	get attributes() {
		return this.getAttrs();
	}

	/** 以字符串表示的class属性 */
	get className() {
		const attr = this.getAttr('class');
		return typeof attr === 'string' ? attr : '';
	}

	set className(className) {
		this.setAttr('class', className);
	}

	/** 以Set表示的class属性 */
	get classList() {
		return new Set(this.className.split(/\s/u));
	}

	/** id属性 */
	get id() {
		const attr = this.getAttr('id');
		return typeof attr === 'string' ? attr : '';
	}

	set id(id) {
		this.setAttr('id', id);
	}

	/**
	 * AttributesToken子节点是否具有某属性
	 * @param {string} key 属性键
	 */
	hasAttr(key) {
		return this.attributesChild.hasAttr(key);
	}

	/**
	 * 获取AttributesToken子节点的属性
	 * @param {string} key 属性键
	 */
	getAttr(key) {
		return this.attributesChild.getAttr(key);
	}

	/** 列举AttributesToken子节点的属性键 */
	getAttrNames() {
		return this.attributesChild.getAttrNames();
	}

	/** AttributesToken子节点是否具有任意属性 */
	hasAttrs() {
		return this.attributesChild.hasAttrs();
	}

	/** 获取AttributesToken子节点的全部标签属性 */
	getAttrs() {
		return this.attributesChild.getAttrs();
	}

	/**
	 * 对AttributesToken子节点设置属性
	 * @param {string} key 属性键
	 * @param {string|boolean} value 属性值
	 */
	setAttr(key, value) {
		this.attributesChild.setAttr(key, value);
	}

	/**
	 * 移除AttributesToken子节点的某属性
	 * @param {string} key 属性键
	 */
	removeAttr(key) {
		this.attributesChild.removeAttr(key);
	}

	/**
	 * 开关AttributesToken子节点的某属性
	 * @param {string} key 属性键
	 * @param {boolean} force 强制开启或关闭
	 */
	toggleAttr(key, force) {
		this.attributesChild.toggleAttr(key, force);
	}
};

Parser.mixins.attributesParent = __filename;
module.exports = attributesParent;
