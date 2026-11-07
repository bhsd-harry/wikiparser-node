/* eslint @stylistic/operator-linebreak: [2, "before", {overrides: {"=": "after"}}] */

import {Shadow} from '../util/debug';
import Parser from '../index';
import {AttributeToken, stages} from '../src/attribute';
import {AttributesToken, toAttributeType} from '../src/attributes';

AttributeToken.prototype.setValue =
	/** @implements */
	function(value): void {
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
	function(keyOrProp, value): void {
		const {type, name} = this;
		const key = keyOrProp,
			attr = this.getAttrToken(key);
		if (attr) {
			// eslint-disable-next-line @typescript-eslint/no-unnecessary-type-assertion
			attr.setValue(value!);
			return;
		}
		// @ts-expect-error abstract class
		const token = Shadow.run((): AttributeToken => new AttributeToken(
			toAttributeType(type),
			name,
			key,
			['"', '"'],
			this.getAttribute('config'),
			'=',
			value,
		));
		this.insertAt(token);
	};
