'use strict';

const /** @type {Parser} */ Parser = require('..'),
	AttributeToken = require('../src/attributeToken');

/**
 * @template T
 * @param {T} constructor
 * @returns {T}
 */
const attributeParent = constructor => class extends constructor {
	/** @param {string} key */
	hasAttr(key) {
		const attr = this.firstChild;
		if (attr instanceof AttributeToken) {
			return attr.hasAttr(key);
		}
		throw new Error(`${this.constructor.name} 没有 hasAttr 方法！`);
	}

	/** @param {string|undefined} key */
	getAttr(key) {
		const attr = this.firstChild;
		if (attr instanceof AttributeToken) {
			return attr.getAttr(key);
		}
		throw new Error(`${this.constructor.name} 没有 getAttr 方法！`);
	}

	getAttrNames() {
		const attr = this.firstChild;
		if (attr instanceof AttributeToken) {
			return attr.getAttrNames();
		}
		throw new Error(`${this.constructor.name} 没有 getAttrNames 方法！`);
	}

	hasAttrs() {
		const attr = this.firstChild;
		if (attr instanceof AttributeToken) {
			return attr.hasAttrs();
		}
		throw new Error(`${this.constructor.name} 没有 hasAttrs 方法！`);
	}

	/**
	 * @param {string} key
	 * @param {string|boolean} value
	 */
	setAttr(key, value) {
		const attr = this.firstChild;
		if (attr instanceof AttributeToken) {
			attr.setAttr(key, value);
			return this;
		}
		throw new Error(`${this.constructor.name} 没有 setAttr 方法！`);
	}

	/** @param {string} key */
	removeAttr(key) {
		const attr = this.firstChild;
		if (attr instanceof AttributeToken) {
			attr.removeAttr(key);
		}
		throw new Error(`${this.constructor.name} 没有 removeAttr 方法！`);
	}

	/**
	 * @param {string} key
	 * @param {boolean|undefined} force
	 */
	toggleAttr(key, force) {
		const attr = this.firstChild;
		if (attr instanceof AttributeToken) {
			attr.toggleAttr(key, force);
		}
		throw new Error(`${this.constructor.name} 没有 toggleAttr 方法！`);
	}
};

Parser.mixins.attributeParent = __filename;
module.exports = attributeParent;
