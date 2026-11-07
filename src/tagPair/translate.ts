import {Token} from '../index';
import {TagPairToken} from './index';
import {SyntaxToken} from '../syntax';
import {TvarToken} from '../tag/tvar';
import type {Config} from '../../base';

/* NOT FOR BROWSER */

import {Shadow} from '../../util/debug';

/* NOT FOR BROWSER END */

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

	/* NOT FOR BROWSER */

	abstract override get children(): [SyntaxToken, Token];

	/* NOT FOR BROWSER END */

	override get type(): 'translate' {
		return 'translate';
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
	}

	/** @private */
	override toString(skip?: boolean): string {
		return skip ? this.lastChild.toString(true) : super.toString();
	}

	/** @private */
	override text(): string {
		return this.lastChild.text();
	}

	/* NOT FOR BROWSER */

	override cloneNode(): this {
		const inner = this.lastChild.cloneNode();
		return Shadow.run(() => {
			// @ts-expect-error abstract class
			const token: this = new TranslateToken(
				this.firstChild.toString() || undefined,
				undefined,
				this.getAttribute('config'),
			);
			token.lastChild.safeReplaceWith(inner);
			return token;
		});
	}

	/** @private */
	override toHtmlOrPlain(_: unknown, method: Method, opt?: HtmlOpt): string {
		const inner = this.lastChild,
			{firstChild, lastChild} = inner;
		if (firstChild?.type === 'text' && firstChild.data.startsWith('\n')) {
			firstChild.deleteData(0, 1);
		}
		if (lastChild?.type === 'text' && lastChild.data.endsWith('\n')) {
			lastChild.deleteData(-1);
		}
		for (const {innerText, nextSibling} of this.querySelectorAll('comment')) {
			if (
				nextSibling?.type === 'text' && /^T:[^_/\n<>~]+$/u.test(innerText) && /^[\n ]/u.test(nextSibling.data)
			) {
				nextSibling.deleteData(0, 1);
			}
		}
		return inner[method](opt);
	}
}
