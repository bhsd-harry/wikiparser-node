import {generateForChild} from '../../util/lint';
import {BoundingRect} from '../../lib/rect';
import {parseCommentAndExt} from '../../parser/commentAndExt';
import {multiLine} from '../../mixin/multiLine';
import Parser from '../../index';
import {Token} from '../index';
import {AtomToken} from '../atom';
import type {LintError} from '../../base';
import type {AttributesToken, ExtToken} from '../../internal';

/**
 * `<dynamicpagelist>`
 * @classdesc `{childNodes: AtomToken[]}`
 */
@multiLine
export abstract class ParamTagToken extends Token {
	declare readonly name: string;

	declare readonly childNodes: readonly AtomToken[];
	abstract override get firstChild(): AtomToken | undefined;
	abstract override get lastChild(): AtomToken | undefined;
	abstract override get nextSibling(): undefined;
	abstract override get previousSibling(): AttributesToken | undefined;
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
			const SingleLineAtomToken = AtomToken;
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
	override lint(start = this.getAbsoluteIndex()): LintError[] {
		const rect = new BoundingRect(this, start),
			msg = Parser.msg('invalid parameter of <$1>', this.name),
			errors: LintError[] = [];
		for (const child of this.childNodes) {
			child.setAttribute('aIndex', start);
			const grandChildren = child.childNodes
				.filter(({type}) => type !== 'comment' && type !== 'include' && type !== 'noinclude');
			if (grandChildren.some(({type}) => type === 'ext')) {
				errors.push(generateForChild(child, rect, 'no-ignored', msg));
			} else {
				const i = grandChildren.findIndex(({type}) => type !== 'text'),
					str = grandChildren.slice(0, i === -1 ? undefined : i).map(String).join('');
				if (str && !(i === -1 ? /^[a-z]+(?:\[\])?\s*=/iu : /^[a-z]+(?:\[\])?\s*(?:=|$)/iu).test(str)) {
					const e = generateForChild(child, rect, 'no-ignored', msg);
					e.suggestions = [{desc: 'remove', range: [e.startIndex, e.endIndex], text: ''}];
					errors.push(e);
				} else {
					const childErrors = child.lint(start, false);
					if (childErrors.length > 0) {
						errors.push(...childErrors);
					}
				}
			}
			start += child.toString().length + 1;
		}
		return errors;
	}
}
