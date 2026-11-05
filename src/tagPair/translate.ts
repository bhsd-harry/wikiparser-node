import {Token} from '../index';
import {TagPairToken} from './index';
import {SyntaxToken} from '../syntax';
import {TvarToken} from '../tag/tvar';
import type {Config} from '../../base';

/**
 * `<translate>`
 * @classdesc `{childNodes: [SyntaxToken, Token]}`
 */
export abstract class TranslateToken extends TagPairToken {
	declare name: 'translate';
	declare closed: true;

	declare readonly childNodes: readonly [SyntaxToken, Token];
	abstract override get firstChild(): SyntaxToken;
	abstract override get lastChild(): Token;
	abstract override get innerText(): string;

	override get type(): 'translate' {
		return 'translate';
	}

	override get selfClosing(): false {
		return false;
	}

	/**
	 * @param attr 标签属性
	 * @param inner 内部wikitext
	 */
	constructor(attr?: string, inner?: string, config?: Config, accum: Token[] = []) {
		const attrToken = new SyntaxToken(
			attr,
			'translate-attr',
			config,
			accum,
		);
		if (inner) {
			let result = '',
				lastIndex = 0,
				i: number,
				j: number,
				k: number,
				index: number;
			const update = /** @ignore */ (): [number, number, number] => {
				i = inner!.indexOf('<tvar|', lastIndex);
				index = i + 6;
				j = inner!.indexOf('>', index);
				k = inner!.indexOf('</>', j + 1);
				return [i, j === index ? -1 : j, k];
			};
			for ([i, j, k] = update(); i !== -1 && j !== -1 && k !== -1; [i, j, k] = update()) {
				result += inner.slice(lastIndex, i);
				lastIndex = k + 3;
				// @ts-expect-error abstract class
				new TvarToken('tvar', inner.slice(index - 1, j), false, config, accum);
				// @ts-expect-error abstract class
				new TvarToken('', '', true, config, accum);
				result += `\0${accum.length - 2}n\x7F${inner.slice(j + 1, k)}\0${accum.length}n\x7F`;
			}
			inner = result + inner.slice(lastIndex);
			result = '';
			lastIndex = 0;
			const start = /<(tvar)(\s+name\s*=)/giu,
				end = /<\/(tvar)(\s*)>/giu;
			for (let mt = start.exec(inner); mt; mt = start.exec(inner)) {
				i = inner.indexOf('>', start.lastIndex);
				const name = inner.slice(start.lastIndex, i);
				if (i === -1 || !/^(?:\s*(?:(["']).*?\1|[^"'\s>]+))?\s*$/su.test(name)) {
					break;
				}
				end.lastIndex = i + 1;
				const mt2 = end.exec(inner);
				if (!mt2) {
					break;
				}
				// @ts-expect-error abstract class
				new TvarToken(mt[1], mt[2] + name, false, config, accum);
				// @ts-expect-error abstract class
				new TvarToken(mt2[1], mt2[2], true, config, accum);
				result += `${inner.slice(lastIndex, mt.index)}\0${accum.length - 2}n\x7F${
					inner.slice(i + 1, mt2.index)
				}\0${accum.length}n\x7F`;
				({lastIndex} = end);
				start.lastIndex = lastIndex;
			}
			inner = result + inner.slice(lastIndex);
		}
		const innerToken = new Token(inner, config, accum);
		innerToken.type = 'translate-inner';
		super('translate', attrToken, innerToken, 'translate', config, accum);

		/* PRINT ONLY */

		this.seal('closed', true);
	}

	/** @private */
	override toString(skip?: boolean): string {
		return skip ? this.lastChild.toString(true) : super.toString();
	}

	/** @private */
	override text(): string {
		return this.lastChild.text();
	}

	/* PRINT ONLY */

	/** 是否有nowrap属性 */
	#isNowrap(): boolean {
		PRINT: return this.firstChild.toString() === ' nowrap';
	}

	/** @private */
	override print(): string {
		PRINT: return `<span class="wpb-ext">&lt;translate${
			this.#isNowrap()
				? '<span class="wpb-ext-attrs"> <span class="wpb-ext-attr">'
				+ '<span class="wpb-attr-key">nowrap</span>'
				+ '</span></span>'
				: ''
		}&gt;${this.lastChild.print({class: 'ext-inner'})}&lt;/translate&gt;</span>`;
	}
}
