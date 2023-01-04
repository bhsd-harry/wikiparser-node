'use strict';

const Parser = require('..'),
	AttributeToken = require('../src/attribute');

/**
 * 子节点含有AttributeToken的类
 * @template T
 * @param {T} Constructor 基类
 * @param {number} i AttributeToken子节点的位置
 * @returns {T}
 */
const attributeParent = (Constructor, i = 0) => class extends Constructor {
	/**
	 * getAttr()方法的getter写法
	 * @returns {Record<string, string|true>}
	 */
	get attributes() {
		return this.getAttr();
	}

	/** 以字符串表示的class属性 */
	get className() {
		const attr = this.getAttr('class');
		return typeof attr === 'string' ? attr : '';
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

	/**
	 * AttributeToken子节点是否具有某属性
	 * @this {{children: AttributeToken[]}}
	 * @param {string} key 属性键
	 */
	hasAttr(key) {
		return this.children.at(i).hasAttr(key);
	}

	/**
	 * 获取AttributeToken子节点的属性
	 * @this {{children: AttributeToken[]}}
	 * @template {string|undefined} T
	 * @param {T} key 属性键
	 */
	getAttr(key) {
		return this.children.at(i).getAttr(key);
	}

	/**
	 * 列举AttributeToken子节点的属性键
	 * @this {{children: AttributeToken[]}}
	 */
	getAttrNames() {
		return this.children.at(i).getAttrNames();
	}

	/**
	 * AttributeToken子节点是否具有任意属性
	 * @this {{children: AttributeToken[]}}
	 */
	hasAttrs() {
		return this.children.at(i).hasAttrs();
	}

	/**
	 * 对AttributeToken子节点设置属性
	 * @this {{children: AttributeToken[]}}
	 * @param {string} key 属性键
	 * @param {string|boolean} value 属性值
	 */
	setAttr(key, value) {
		return this.children.at(i).setAttr(key, value);
	}

	/**
	 * 移除AttributeToken子节点的某属性
	 * @this {{children: AttributeToken[]}}
	 * @param {string} key 属性键
	 */
	removeAttr(key) {
		this.children.at(i).removeAttr(key);
	}

	/**
	 * 开关AttributeToken子节点的某属性
	 * @this {{children: AttributeToken[]}}
	 * @param {string} key 属性键
	 * @param {boolean|undefined} force 强制开启或关闭
	 */
	toggleAttr(key, force) {
		this.children.at(i).toggleAttr(key, force);
	}
};

Parser.mixins.attributeParent = __filename;
module.exports = attributeParent;
