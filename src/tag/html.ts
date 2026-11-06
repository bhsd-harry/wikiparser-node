import {attributesParent} from '../../mixin/attributesParent';
import {TagToken} from './index';
import type {
	Config,
} from '../../base';
import type {AttributesParentBase} from '../../mixin/attributesParent';
import type {Token, AttributesToken} from '../../internal';

/* NOT FOR BROWSER */

import {Shadow} from '../../util/debug';
import {getId, html, getTocData} from '../../util/html';
import {cached} from '../../mixin/cached';

/* NOT FOR BROWSER END */

export interface HtmlToken extends AttributesParentBase {}

/**
 * HTML tag
 *
 * HTML标签
 * @classdesc `{childNodes: [AttributesToken]}`
 */
@attributesParent()
export abstract class HtmlToken extends TagToken {
	declare readonly name: string;
	#selfClosing;

	declare readonly childNodes: readonly [AttributesToken];
	abstract override get firstChild(): AttributesToken;
	abstract override get lastChild(): AttributesToken;

	/* NOT FOR BROWSER */

	/** @private */
	declare tocData?: string;
	abstract override get children(): [AttributesToken];

	/* NOT FOR BROWSER END */

	override get type(): 'html' {
		return 'html';
	}

	/** whether to be self-closing / 是否自封闭 */
	get selfClosing(): boolean {
		return this.#selfClosing;
	}

	/* NOT FOR BROWSER */

	/** @private */
	override get closing(): boolean {
		return super.closing;
	}

	/* NOT FOR BROWSER END */

	/**
	 * @param name 标签名
	 * @param attr 标签属性
	 * @param closing 是否闭合
	 * @param selfClosing 是否自封闭
	 */
	constructor(
		name: string,
		attr: AttributesToken,
		closing: boolean,
		selfClosing: boolean,
		config?: Config,
		accum?: Token[],
	) {
		super(name, attr, closing, config, accum);
		this.setAttribute('name', name.toLowerCase());
		this.#selfClosing = selfClosing;
	}

	/** @private */
	override text(): string {
		const {closing, selfClosing, name} = this,
			[normalTags,, voidTags] = this.getAttribute('config').html;
		let slash: string;
		if (voidTags.includes(name)) {
			if (closing && name !== 'br') {
				return '';
			}
			slash = '/';
		} else {
			slash = selfClosing && !closing && !normalTags.includes(name) ? '/' : '';
		}
		return `<${closing && !slash ? '/' : ''}${name}${closing ? '' : super.text()}${slash}>`;
	}

	/* NOT FOR BROWSER */

	override cloneNode(): this {
		const [attr] = this.cloneChildNodes() as [AttributesToken];
		// @ts-expect-error abstract class
		return Shadow.run((): this => new HtmlToken(
			this.tag,
			attr,
			this.closing,
			this.#selfClosing,
			this.getAttribute('config'),
		));
	}

	/** @private */
	@cached()
	getTocLine(): [string, string] | undefined {
		if (this.closing || !/^h\d$/u.test(this.name)) {
			return undefined;
		}
		const matched = this.findMatchingTag();
		if (!matched) {
			return undefined;
		}
		const range = this.createRange();
		range.setStartAfter(this);
		range.setEndBefore(matched);
		const content = html(range.cloneContents(), '', {nocc: true});
		return [getId(content), content];
	}

	/** @private */
	@cached()
	override toHtmlInternal({render}: HtmlOpt = {}): string {
		const {closing, name, selfClosing} = this;
		if (!closing && /^h\d$/u.test(name)) {
			if (!this.id) {
				const id = this.getTocLine()?.[0];
				if (id !== undefined) {
					this.setAttr('id', id);
				}
			}
			this.classList.add('mw-html-heading');
		}
		const [, selfClosingTags, voidTags] = this.getAttribute('config').html,
			tag = name + (closing ? '' : super.toHtmlInternal({render}));
		if (voidTags.includes(name)) {
			return closing && name !== 'br' ? '' : `<${tag}>`;
		}
		return `${getTocData(this, render)}<${closing ? '/' : ''}${tag}>${
			selfClosing && !closing && selfClosingTags.includes(name) ? `</${name}>` : ''
		}`;
	}
}
