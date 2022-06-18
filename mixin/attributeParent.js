'use strict';

const /** @type {Parser} */ Parser = require('..'),
	AttributeToken = require('../src/attributeToken'); // eslint-disable-line no-unused-vars

/**
 * @template T
 * @param {T} constructor
 * @returns {T}
 */
const attributeParent = constructor => class extends constructor {
	/**
	 * @this {{firstChild: AttributeToken}}
	 * @param {string} key
	 */
	hasAttr(key) {
		return this.firstChild.hasAttr(key);
	}

	/**
	 * @this {{firstChild: AttributeToken}}
	 * @param {string|undefined} key
	 */
	getAttr(key) {
		return this.firstChild.getAttr(key);
	}

	/** @this {{firstChild: AttributeToken}} */
	getAttrNames() {
		return this.firstChild.getAttrNames();
	}

	/** @this {{firstChild: AttributeToken}} */
	hasAttrs() {
		return this.firstChild.hasAttrs();
	}

	/**
	 * @this {{firstChild: AttributeToken}}
	 * @param {string} key
	 * @param {string|boolean} value
	 */
	setAttr(key, value) {
		this.firstChild.setAttr(key, value);
	}

	/**
	 * @this {{firstChild: AttributeToken}}
	 * @param {string} key
	 */
	removeAttr(key) {
		this.firstChild.removeAttr(key);
	}

	/**
	 * @this {{firstChild: AttributeToken}}
	 * @param {string} key
	 * @param {boolean|undefined} force
	 */
	toggleAttr(key, force) {
		this.firstChild.toggleAttr(key, force);
	}
};

Parser.mixins.attributeParent = __filename;
module.exports = attributeParent;
