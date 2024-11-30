import {generateForChild} from '../../util/lint';
import {BoundingRect} from '../../lib/rect';
import {parseCommentAndExt} from '../../parser/commentAndExt';
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
	declare readonly name: string;

	declare readonly childNodes: readonly AtomToken[];
	abstract override get firstChild(): AtomToken | undefined;
	abstract override get lastChild(): AtomToken | undefined;
	abstract override get nextSibling(): undefined;
	abstract override get previousSibling(): AttributesToken;
	abstract override get parentNode(): ExtToken | undefined;

	override get type(): 'ext-inner' {
		return 'ext-inner';
	}

	/** @class */
	constructor(
		include: boolean,
		wikitext?: string,
		config = Parser.getConfig(),
		accum: Token[] = [],
		acceptable?: Acceptable,
	) {
		super(undefined, config, accum, {
		});
		if (wikitext) {
			const SingleLineAtomToken = singleLine(!acceptable)(AtomToken);
			this.append(
				...wikitext.split('\n')
					.map(line => acceptable ? line : parseCommentAndExt(line, config, accum, include))
					.map(line => new SingleLineAtomToken(line, 'param-line', config, accum, {
					})),
			);
		}
		accum.splice(accum.indexOf(this), 1);
		accum.push(this);
	}

	/** @private */
	override toString(skip?: boolean): string {
		return super.toString(skip, '\n');
	}

	/** @private */
	override text(): string {
		return super.text('\n');
	}

	/** @private */
	override getGaps(): number {
		return 1;
	}

	/** @private */
	override lint(start = this.getAbsoluteIndex()): LintError[] {
		const rect = new BoundingRect(this, start),
			msg = Parser.msg('invalid parameter of <$1>', this.name),
			errors: LintError[] = [];
		for (const child of this.childNodes) {
			const grandChildren = child.childNodes
				.filter(({type}) => type !== 'comment' && type !== 'include' && type !== 'noinclude');
			if (grandChildren.some(({type}) => type === 'ext')) {
				errors.push(generateForChild(child, rect, 'no-ignored', msg));
			} else {
				const i = grandChildren.findIndex(({type}) => type !== 'text'),
					str = grandChildren.slice(0, i === -1 ? undefined : i).map(String).join('');
				if (str && !(i === -1 ? /^[a-z]+(?:\[\])?\s*=/iu : /^[a-z]+(?:\[\])?\s*(?:=|$)/iu).test(str)) {
					const e = generateForChild(child, rect, 'no-ignored', msg);
					e.suggestions = [
						{
							desc: 'remove',
							range: [e.startIndex, e.endIndex],
							text: '',
						},
					];
					errors.push(e);
				} else {
					errors.push(...child.lint(start, false));
				}
			}
			start += child.toString().length + 1;
		}
		return errors;
	}

	/** @private */
	override print(): string {
		return super.print({sep: '\n'});
	}
}
