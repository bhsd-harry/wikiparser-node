import {trimLc} from '../../util/string';
import {Token} from '../index';
import {TagPairToken} from './index';
import {SyntaxToken} from '../syntax';
import type {Config} from '../../base';
import type {AttributesParentBase} from '../../mixin/attributesParent';

/**
 * `<translate>`
 * @classdesc `{childNodes: [SyntaxToken, Token]}`
 */
export abstract class TranslateToken extends TagPairToken implements Omit<
	AttributesParentBase,
	'className' | 'classList' | 'id' | 'css'
> {
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
		super('translate', attrToken, innerToken, '</translate>', config, accum);
		this.seal('closed', true);
		this.seal('selfClosing', true);
	}

	/** 是否有nowrap属性 */
	#isNowrap(): boolean {
		return this.firstChild.toString() === ' nowrap';
	}

	/** @private */
	override toString(skip?: boolean): string {
		return skip ? this.lastChild.toString(true) : super.toString();
	}

	/** @private */
	override text(): string {
		return this.lastChild.text();
	}

	/** @implements */
	getAttr(key: string): true | undefined {
		return trimLc(key) === 'nowrap' && this.#isNowrap() || undefined;
	}
}
