import {generateForChild} from '../../util/lint';
import {Shadow} from '../../util/debug';
import {classes} from '../../util/constants';
import {singleLine} from '../../mixin/singleLine';
import * as Parser from '../../index';
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
	declare readonly name: string;

	declare readonly childNodes: AtomToken[];
	// @ts-expect-error abstract method
	abstract override get children(): AtomToken[];
	// @ts-expect-error abstract method
	abstract override get firstChild(): AtomToken | undefined;
	// @ts-expect-error abstract method
	abstract override get firstElementChild(): AtomToken | undefined;
	// @ts-expect-error abstract method
	abstract override get lastChild(): AtomToken | undefined;
	// @ts-expect-error abstract method
	abstract override get lastElementChild(): AtomToken | undefined;
	// @ts-expect-error abstract method
	abstract override get nextSibling(): undefined;
	// @ts-expect-error abstract method
	abstract override get nextElementSibling(): undefined;
	// @ts-expect-error abstract method
	abstract override get previousSibling(): AttributesToken;
	// @ts-expect-error abstract method
	abstract override get previousElementSibling(): AttributesToken;
	// @ts-expect-error abstract method
	abstract override get parentNode(): ExtToken | undefined;
	// @ts-expect-error abstract method
	abstract override get parentElement(): ExtToken | undefined;

	/** @class */
	constructor(wikitext?: string, config = Parser.getConfig(), accum: Token[] = [], acceptable: Acceptable = {}) {
		super(undefined, config, accum, {
			SingleLineAtomToken: ':',
		});
		if (wikitext) {
			const SingleLineAtomToken = singleLine(AtomToken);
			this.append(
				...wikitext.split('\n').map(line => new SingleLineAtomToken(line, 'param-line', config, accum, {
					AstText: ':', ...acceptable,
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
	override getGaps(): number {
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
			rect ??= {start, ...this.getRootNode().posFromIndex(start)!};
			return generateForChild(child, rect, Parser.msg('invalid parameter of $1', this.name));
		});
	}

	/** @override */
	override print(): string {
		return super.print({sep: '\n'});
	}

	/* NOT FOR BROWSER */

	/** @override */
	override cloneNode(this: this & {constructor: new (...args: any[]) => unknown}): this {
		const cloned = this.cloneChildNodes();
		return Shadow.run(() => {
			const token = new this.constructor(undefined, this.getAttribute('config')) as this;
			token.append(...cloned);
			return token;
		});
	}
}

classes['ParamTagToken'] = __filename;
