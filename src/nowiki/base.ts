import {Shadow} from '../../util/debug';
import {classes} from '../../util/constants';
import {fixedToken} from '../../mixin/fixed';
import {Token} from '../index';
import type {Config} from '../../base';
import type {AstText} from '../../lib/text';

declare type NowikiTypes = 'ext-inner'
| 'comment'
| 'dd'
| 'double-underscore'
| 'hr'
| 'list'
| 'noinclude'
| 'quote';

/**
 * 纯文字Token，不会被解析
 * @classdesc `{childNodes: [AstText]}`
 */
@fixedToken
export abstract class NowikiBaseToken extends Token {
	declare type: NowikiTypes;

	declare readonly childNodes: readonly [AstText];
	abstract override get firstChild(): AstText;
	abstract override get lastChild(): AstText;

	/* NOT FOR BROWSER */

	abstract override get children(): [];
	abstract override get firstElementChild(): undefined;
	abstract override get lastElementChild(): undefined;

	/* NOT FOR BROWSER END */

	/** 纯文本部分 */
	get innerText(): string {
		return this.firstChild.data;
	}

	/** @param wikitext default: `''` */
	constructor(wikitext = '', config?: Config, accum?: Token[]) {
		super(wikitext, config, accum);
	}

	/* NOT FOR BROWSER */

	/** @override */
	override cloneNode(this: this & {constructor: new (...args: any[]) => unknown}): this {
		const {constructor, firstChild: {data}, type} = this;
		return Shadow.run(() => {
			const token = new constructor(data, this.getAttribute('config')) as this;
			token.type = type;
			return token;
		});
	}

	/**
	 * @override
	 * @param str 新文本
	 */
	override setText(str: string): string {
		return super.setText(str, 0);
	}
}

classes['NowikiBaseToken'] = __filename;
