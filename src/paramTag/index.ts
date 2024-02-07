import {generateForChild} from '../../util/lint';
import {Shadow} from '../../util/debug';
import {classes} from '../../util/constants';
import {singleLine} from '../../mixin/singleLine';
import Parser from '../../index';
import {Token} from '../index';
import {AtomToken} from '../atom';
import type {LintError} from '../../base';
import type {AttributesToken, ExtToken} from '../../internal';

/**
 * `<dynamicpagelist>`
 * @classdesc `{childNodes: ...AtomToken}`
 */
export abstract class ParamTagToken extends Token {
	override readonly type = 'ext-inner';
	declare readonly name: string;

	declare readonly childNodes: readonly AtomToken[];
	abstract override get firstChild(): AtomToken | undefined;
	abstract override get lastChild(): AtomToken | undefined;
	abstract override get nextSibling(): undefined;
	abstract override get previousSibling(): AttributesToken;
	abstract override get parentNode(): ExtToken | undefined;

	/* NOT FOR BROWSER */

	abstract override get children(): AtomToken[];
	abstract override get firstElementChild(): AtomToken | undefined;
	abstract override get lastElementChild(): AtomToken | undefined;
	abstract override get nextElementSibling(): undefined;
	abstract override get previousElementSibling(): AttributesToken;
	abstract override get parentElement(): ExtToken | undefined;

	/* NOT FOR BROWSER END */

	/** @class */
	constructor(wikitext?: string, config = Parser.getConfig(), accum: Token[] = [], acceptable: Acceptable = {}) {
		super(undefined, config, accum, {
			AtomToken: ':',
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
	override toString(): string {
		return super.toString('\n');
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
			return generateForChild(child, rect, 'no-ignored', Parser.msg('invalid parameter of <$1>', this.name));
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
