import {generateForChild} from '../../util/lint';
import Parser from '../../index';
import {Token} from '../index';
import {AtomToken} from '../atom';
import type {LintError} from '../../base';
import type {AttributesToken, ExtToken} from '../../internal';

/**
 * `<dynamicpagelist>`
 * @classdesc `{childNodes: ...AtomToken}`
 */
export class ParamTagToken extends Token {
	override readonly type = 'ext-inner';
	declare name: string;

	declare childNodes: AtomToken[];
	// @ts-expect-error abstract method
	abstract override get firstChild(): AtomToken | undefined;
	// @ts-expect-error abstract method
	abstract override get lastChild(): AtomToken | undefined;
	// @ts-expect-error abstract method
	abstract override get nextSibling(): undefined;
	// @ts-expect-error abstract method
	abstract override get previousSibling(): AttributesToken;
	// @ts-expect-error abstract method
	abstract override get parentNode(): ExtToken | undefined;

	/** @class */
	constructor(wikitext?: string, config = Parser.getConfig(), accum: Token[] = [], acceptable: Acceptable = {}) {
		super(undefined, config, accum, {
		});
		if (wikitext) {
			const SingleLineAtomToken = AtomToken;
			this.append(
				...wikitext.split('\n').map(line => new SingleLineAtomToken(line, 'param-line', config, accum, {
				})),
			);
		}
	}

	/** @private */
	override toString(omit?: Set<string>): string {
		return super.toString(omit, '\n');
	}

	/** @override */
	override text(): string {
		return super.text('\n');
	}

	/** @private */
	protected override getGaps(): number {
		return 1;
	}

	/** @override */
	override lint(start = this.getAbsoluteIndex()): LintError[] {
		let rect: BoundingRect | undefined;
		return this.childNodes.filter(child => {
			const {childNodes} = child,
				i = childNodes.findIndex(({type}) => type !== 'text'),
				str = (i >= 0 ? childNodes.slice(0, i).map(String).join('') : String(child)).trim();
			return str && !(i >= 0 ? /^[a-z]+(?:\[\])?\s*(?:=|$)/iu : /^[a-z]+(?:\[\])?\s*=/iu).test(str);
		}).map(child => {
			rect ??= {start, ...this.getRootNode().posFromIndex(start)};
			return generateForChild(child, rect, Parser.msg('invalid parameter of $1', this.name));
		});
	}

	/** @override */
	override print(): string {
		return super.print({sep: '\n'});
	}
}
