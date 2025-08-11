import {noEscape} from '../../mixin/noEscape';
import {Token} from '../index';
import type {Config} from '../../base';
import type {AstText} from '../../lib/text';

/* NOT FOR BROWSER */

import {Shadow} from '../../util/debug';
import {classes} from '../../util/constants';
import {fixedToken} from '../../mixin/fixed';

/* NOT FOR BROWSER END */

declare type NowikiTypes = 'ext-inner'
	| 'comment'
	| 'dd'
	| 'double-underscore'
	| 'hr'
	| 'list'
	| 'noinclude'
	| 'quote';

/**
 * text-only token that will not be parsed
 *
 * 纯文字Token，不会被解析
 * @classdesc `{childNodes: [AstText]}`
 */
@fixedToken
@noEscape
export abstract class NowikiBaseToken extends Token {
	abstract override get type(): NowikiTypes;
	declare readonly childNodes: readonly [AstText];
	abstract override get firstChild(): AstText;
	abstract override get lastChild(): AstText;

	/* NOT FOR BROWSER */

	abstract override get children(): [];
	abstract override get firstElementChild(): undefined;
	abstract override get lastElementChild(): undefined;

	/* NOT FOR BROWSER END */

	/** text content / 纯文本部分 */
	get innerText(): string {
		return this.firstChild.data;
	}

	/** @param wikitext default: `''` */
	constructor(wikitext = '', config?: Config, accum?: Token[]) {
		super(wikitext, config, accum);
	}

	/* NOT FOR BROWSER */

	override cloneNode(): this {
		return Shadow.run(() => {
			const C = this.constructor as new (...args: any[]) => this,
				token = new C(this.innerText, this.getAttribute('config'));
			if (this.name && !token.name) {
				token.setAttribute('name', this.name);
			}
			return token;
		});
	}

	/**
	 * @override
	 * @param str new text / 新文本
	 */
	override setText(str: string): string {
		return super.setText(str);
	}
}

classes['NowikiBaseToken'] = __filename;
