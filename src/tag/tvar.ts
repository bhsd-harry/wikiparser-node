import {hiddenToken} from '../../mixin/hidden';
import {TagToken} from './index';
import {SyntaxToken} from '../syntax';
import type {Config} from '../../base';
import type {Token} from '../../internal';

/* NOT FOR BROWSER */

import {Shadow} from '../../util/debug';

/* NOT FOR BROWSER END */

/**
 * `<tvar>`
 * @classdesc `{childNodes: [SyntaxToken]}`
 */
@hiddenToken()
export abstract class TvarToken extends TagToken {
	declare readonly childNodes: readonly [SyntaxToken];
	abstract override get firstChild(): SyntaxToken;
	abstract override get lastChild(): SyntaxToken;

	/* NOT FOR BROWSER */

	abstract override get children(): [SyntaxToken];

	/* NOT FOR BROWSER END */

	override get type(): 'tvar' {
		return 'tvar';
	}

	/**
	 * @param tag 标签名
	 * @param attr 标签属性
	 * @param closing 是否闭合
	 */
	constructor(tag: string, attr: string, closing: boolean, config?: Config, accum?: Token[]) {
		const attrToken = new SyntaxToken(
			attr,
			'tvar-name',
			config,
			accum,
		);
		super(tag, attrToken, closing, config, accum);
	}

	/* NOT FOR BROWSER */

	override cloneNode(): this {
		// @ts-expect-error abstract class
		return Shadow.run((): this => new TvarToken(
			this.tag,
			this.firstChild.toString(),
			this.closing,
			this.getAttribute('config'),
		));
	}
}
