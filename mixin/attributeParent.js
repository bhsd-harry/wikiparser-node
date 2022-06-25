'use strict';

const /** @type {Parser} */ Parser = require('..'),
	AttributeToken = require('../src/attribute'); // eslint-disable-line no-unused-vars

/**
 * @template T
 * @param {T} constructor
 * @returns {T}
 */
const attributeParent = (constructor, i = 0) => class extends constructor {
	/**
	 * @this {{children: AttributeToken[]}}
	 * @param {string} key
	 */
	hasAttr(key) {
		return this.children.at(i).hasAttr(key);
	}

	/**
	 * @this {{children: AttributeToken[]}}
	 * @param {string|undefined} key
	 */
	getAttr(key) {
		return this.children.at(i).getAttr(key);
	}

	/** @this {{children: AttributeToken[]}} */
	getAttrNames() {
		return this.children.at(i).getAttrNames();
	}

	/** @this {{children: AttributeToken[]}} */
	hasAttrs() {
		return this.children.at(i).hasAttrs();
	}

	/**
	 * @this {{children: AttributeToken[]}}
	 * @param {string} key
	 * @param {string|boolean} value
	 */
	setAttr(key, value) {
		this.children.at(i).setAttr(key, value);
	}

	/**
	 * @this {{children: AttributeToken[]}}
	 * @param {string} key
	 */
	removeAttr(key) {
		this.children.at(i).removeAttr(key);
	}

	/**
	 * @this {{children: AttributeToken[]}}
	 * @param {string} key
	 * @param {boolean|undefined} force
	 */
	toggleAttr(key, force) {
		this.children.at(i).toggleAttr(key, force);
	}
};

Parser.mixins.attributeParent = __filename;
module.exports = attributeParent;
