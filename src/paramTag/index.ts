import {generateForChild} from '../../util/lint';
import {singleLine} from '../../mixin/singleLine';
import {Parser} from '../../index';
import {Token} from '..';
import {AtomToken} from '../atom';
import type {LintError} from '../../index';
import type {AttributesToken, ExtToken} from '../../internal';

/**
 * `<dynamicpagelist>`
 * @classdesc `{childNodes: ...AtomToken}`
 */
export abstract class ParamTagToken extends Token {
	/** @browser */
	override readonly type = 'ext-inner';
	declare childNodes: AtomToken[];
	abstract override get children(): AtomToken[];
	abstract override get firstChild(): AtomToken | undefined;
	abstract override get firstElementChild(): AtomToken | undefined;
	abstract override get lastChild(): AtomToken | undefined;
	abstract override get lastElementChild(): AtomToken | undefined;
	abstract override get nextSibling(): undefined;
	abstract override get nextElementSibling(): undefined;
	abstract override get previousSibling(): AttributesToken;
	abstract override get previousElementSibling(): AttributesToken;
	abstract override get parentNode(): ExtToken | undefined;
	abstract override get parentElement(): ExtToken | undefined;

	/** @browser */
	constructor(wikitext?: string, config = Parser.getConfig(), accum: Token[] = [], acceptable: Acceptable = {}) {
		super(undefined, config, true, accum, {
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

	/**
	 * @override
	 * @browser
	 */
	override toString(selector?: string): string {
		return super.toString(selector, '\n');
	}

	/**
	 * @override
	 * @browser
	 */
	override text(): string {
		return super.text('\n');
	}

	/** @private */
	protected override getGaps(): number {
		return 1;
	}

	/**
	 * @override
	 * @browser
	 */
	override print(): string {
		return super.print({sep: '\n'});
	}

	/**
	 * @override
	 * @browser
	 */
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
	override cloneNode(this: this & {constructor: new (...args: any[]) => unknown}): this {
		const cloned = this.cloneChildNodes();
		return Parser.run(() => {
			const token = new this.constructor(undefined, this.getAttribute('config')) as this;
			token.append(...cloned);
			return token;
		});
	}
}

Parser.classes['ParamTagToken'] = __filename;
