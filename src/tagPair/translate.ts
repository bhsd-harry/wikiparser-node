import {Token} from '../index';
import {TagPairToken} from './index';
import {SyntaxToken} from '../syntax';
import type {Config} from '../../base';

/**
 * `<translate>`
 * @classdesc `{childNodes: [SyntaxToken, Token]}`
 */
export abstract class TranslateToken extends TagPairToken {
	declare name: 'translate';
	declare closed: true;
	declare selfClosing: false;

	declare readonly childNodes: readonly [SyntaxToken, Token];
	abstract override get firstChild(): SyntaxToken;
	abstract override get lastChild(): Token;

	override get type(): 'translate' {
		return 'translate';
	}

	/**
	 * @param attr 标签属性
	 * @param inner 内部wikitext
	 */
	constructor(attr?: string, inner?: string, config?: Config, accum?: Token[]) {
		const attrToken = new SyntaxToken(
				attr,
				'translate-attr',
				config,
				accum,
			),
			innerToken = new Token(inner, config, accum);
		innerToken.type = 'translate-inner';
		super('translate', attrToken, innerToken, 'translate', config, accum);
		this.seal('closed', true);
		this.seal('selfClosing', true);
	}

	/** @private */
	override toString(skip?: boolean): string {
		return skip ? this.lastChild.toString(true) : super.toString();
	}

	/** @private */
	override text(): string {
		return this.lastChild.text();
	}
}
