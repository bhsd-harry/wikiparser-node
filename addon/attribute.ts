/* eslint @stylistic/operator-linebreak: [2, "before", {overrides: {"=": "after"}}] */

import {classes} from '../util/constants';
import {Shadow} from '../util/debug';
import {trimLc} from '../util/string';
import Parser from '../index';
import {loadCssLSP, EmbeddedCSSDocument} from '../lib/document';
import {AttributeToken, stages} from '../src/attribute';
import {AttributesToken, toAttributeType} from '../src/attributes';
import {AtomToken} from '../src/atom';

declare interface CSSNode {
	offset: number;
	length: number;
	getText(): string;
}
declare interface Declaration extends CSSNode {
	property: CSSNode;
	value: CSSNode;
}
declare interface RuleSet {
	declarations: {
		children?: Declaration[];
	};
}
declare interface StyleSheet extends CSSNode {
	children: [RuleSet];
}

AttributeToken.prototype.setValue =
	/** @implements */
	function(value): void {
		if (value === false) {
			this.remove();
			return;
		} else if (value === true) {
			this.setAttribute('equal', '');
			return;
		}
		const {type, lastChild} = this;
		/* c8 ignore next 6 */
		if (type === 'ext-attr' && value.includes('>')) {
			throw new RangeError('Attributes of an extension tag cannot contain ">"!');
		}
		if (value.includes('"') && value.includes(`'`)) {
			throw new RangeError('Attribute values cannot contain single and double quotes simultaneously!');
		}
		const {childNodes} = Parser.parseWithRef(value, this, stages[type] + 1);
		lastChild.safeReplaceChildren(childNodes);
		this.setAttribute('equal', this.isInside('parameter') ? '{{=}}' : '=');
		if (value.includes('"')) {
			this.setAttribute('quotes', [`'`, `'`] as const);
		} else if (value.includes(`'`) || !this.getAttribute('quotes')[0]) {
			this.setAttribute('quotes', ['"', '"'] as const);
		} else {
			this.close();
		}
	};

AttributeToken.prototype.rename =
	/** @implements */
	function(key): void {
		const {type, name, tag, firstChild} = this;
		/* c8 ignore next 3 */
		if (name === 'title' || name === 'alt' && tag === 'img') {
			throw new Error(`${name} attribute cannot be renamed!`);
		}
		const {childNodes} = Parser.parseWithRef(key, this, stages[type] + 1);
		firstChild.safeReplaceChildren(childNodes);
	};

AttributeToken.prototype.css =
	/** @implements */
	function(key, value): string | undefined {
		const {name, lastChild} = this;
		/* c8 ignore next 6 */
		if (name !== 'style') {
			throw new Error('Not a style attribute!');
		}
		if (lastChild.length > 1 || lastChild.length === 1 && lastChild.firstChild!.type !== 'text') {
			throw new Error('Complex style attribute!');
		}
		const cssLSP = loadCssLSP();
		/* c8 ignore next 3 */
		if (!cssLSP) {
			throw new Error('CSS language service is not available!');
		}
		const doc = new EmbeddedCSSDocument(this.getRootNode(), lastChild),
			styleSheet = doc.styleSheet as StyleSheet,
			{children: [{declarations: {children}}]} = styleSheet,
			declaration = children?.filter(({property}) => property.getText() === key) ?? [];
		if (value === undefined) {
			return declaration.at(-1)?.value.getText();
		} else if (typeof value === 'number') {
			value = String(value);
		}
		const style = styleSheet.getText().slice(0, -1);
		if (!value) {
			if (declaration.length === children?.length) {
				this.setValue('');
			} else if (declaration.length > 0) {
				let output = '',
					start = doc.pre.length;
				for (const {offset, length} of declaration) {
					output += style.slice(start, offset);
					start = offset + length;
				}
				output += style.slice(start);
				this.setValue(output.replace(/^\s*;\s*|;\s*(?=;)/gu, ''));
			}
			return undefined;
		}
		const hasQuote = value.includes('"'),
			[quot] = this.getAttribute('quotes');
		/* c8 ignore start */
		if (quot && value.includes(quot) || hasQuote && value.includes(`'`)) {
			const quote = quot || '"';
			throw new RangeError(
				`Please consider replacing \`${quote}\` with \`${quote === '"' ? `'` : '"'}\`!`,
			);
		}
		/* c8 ignore stop */
		if (declaration.length > 0) {
			const {offset, length} = declaration.at(-1)!.value;
			this.setValue(style.slice(doc.pre.length, offset) + value + style.slice(offset + length));
		} else {
			this.setValue(
				`${style.slice(doc.pre.length)}${
					!children?.length || /;\s*$/u.test(style) ? '' : '; '
				}${key}: ${value}`,
			);
		}
		return undefined;
	};

AttributesToken.prototype.sanitize =
	/** @implements */
	function(): void {
		const type = toAttributeType(this.type);
		let dirty = false;
		for (let i = this.length - 1; i >= 0; i--) {
			const child = this.childNodes[i]!;
			if (child instanceof AtomToken && child.text().trim()) {
				dirty = true;
				if (child.previousSibling?.is<AttributeToken>(type) && child.nextSibling?.is<AttributeToken>(type)) {
					child.replaceChildren(' ');
				} else {
					this.removeAt(i);
				}
			}
		}
		if (!Shadow.running && dirty) {
			Parser.warn('AttributesToken.sanitize will remove invalid attributes!');
		}
	};

AttributesToken.prototype.setAttr =
	/** @implements */
	function(keyOrProp: string | Record<string, string | boolean>, value?: string | boolean): void {
		if (typeof keyOrProp === 'object') {
			for (const [key, val] of Object.entries(keyOrProp)) {
				this.setAttr(key, val);
			}
			return;
		}
		const {type, name} = this;
		/* c8 ignore next 3 */
		if (type === 'ext-attrs' && typeof value === 'string' && value.includes('>')) {
			throw new RangeError('Attributes of an extension tag cannot contain ">"!');
		}
		const key = trimLc(keyOrProp),
			attr = this.getAttrToken(key);
		if (attr) {
			attr.setValue(value!);
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

AttributesToken.prototype.toggleAttr =
	/** @implements */
	function(key, force): void {
		key = trimLc(key);
		const attr = this.getAttrToken(key);
		/* c8 ignore next 3 */
		if (attr && attr.getValue() !== true) {
			throw new RangeError(`${key} attribute is not Boolean!`);
		}
		if (attr) {
			attr.setValue(force === true);
		} else if (force !== false) {
			this.setAttr(key, true);
		}
	};

AttributesToken.prototype.css =
	/** @implements */
	function(key, value): string | undefined {
		let attr = this.getAttrToken('style');
		if (!attr) {
			// @ts-expect-error abstract class
			const token = Shadow.run((): AttributeToken => new AttributeToken(
				toAttributeType(this.type),
				this.name,
				'style',
				[],
				this.getAttribute('config'),
			));
			attr = this.insertAt(token);
		}
		return attr.css(key, value);
	};

classes['ExtendedAttributeToken'] = __filename;
