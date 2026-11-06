/* eslint @stylistic/operator-linebreak: [2, "before", {overrides: {"=": "after"}}] */

import {Shadow} from '../util/debug';
import {trimLc} from '../util/string';
import Parser from '../index';
import {AttributeToken, stages} from '../src/attribute';
import {AttributesToken, toAttributeType} from '../src/attributes';

AttributeToken.prototype.setValue =
	/** @implements */
	function(value): void {
		if (value === false) {
			this.removeInternal();
			return;
		} else if (value === true) {
			this.setAttribute('equal', '');
			return;
		}
		const {type, lastChild} = this;
		lastChild.safeReplaceChildren(Parser.parseWithRef(value, lastChild, stages[type] + 1).childNodes);
		this.setAttribute('equal', this.isInside('parameter') ? '{{=}}' : '=');
		if (value.includes('"')) {
			this.setAttribute('quotes', [`'`, `'`] as const);
		} else if (value.includes(`'`) || !this.getAttribute('quotes')[0]) {
			this.setAttribute('quotes', ['"', '"'] as const);
		} else {
			this.close();
		}
	};

AttributesToken.prototype.setAttr =
	/** @implements */
	function(key: string, value: string | boolean): void {
		const {type, name} = this;
		key = trimLc(key);
		const attr = this.getAttrToken(key);
		if (attr) {
			attr.setValue(value);
			return;
		} else if (value === false) {
			return;
		}
		// @ts-expect-error abstract class
		const token = Shadow.run((): AttributeToken => new AttributeToken(
			toAttributeType(type),
			name,
			key,
			['"', '"'],
			this.getAttribute('config'),
			value === true ? '' : '=',
			value === true ? '' : value,
		));
		this.insertAt(token);
	};
