import {hiddenToken} from '../../mixin/hidden';
import {TagToken} from './index';
import {SyntaxToken} from '../syntax';
import type {Config} from '../../base';
import type {Token} from '../../internal';

/**
 * `<tvar>`
 * @classdesc `{childNodes: [SyntaxToken]}`
 */
@hiddenToken()
export abstract class TvarToken extends TagToken {
	declare readonly childNodes: readonly [SyntaxToken];
	abstract override get firstChild(): SyntaxToken;
	abstract override get lastChild(): SyntaxToken;

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
}
